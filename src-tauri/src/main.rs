//src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod arduino;
mod types;
mod logging;
mod setup;
mod errordefs;
mod user;
// mod reports;
use tauri::{Manager, Emitter};
use tokio::time::Duration;
use std::sync::atomic::{AtomicBool, Ordering};
use once_cell::sync::Lazy; // Import Lazy for the global state

use database::{
    Database, 
    init_database, 
    get_logs, 
    log_event_command, 
    save_admission, 
    save_patient, 
    save_patient_with_admission,
    search_patients,
    get_all_patients,
    search_admissions_by_patient,
    update_device_alias,
    fetch_all_known_devices,
    get_patient_count,
    get_patient_by_admission_no,
    delete_patient_by_admission_no,
    update_patient_data,
     upsert_patient_metadata
};
use arduino::{
    start_arduino_watcher,
    stop_arduino_watcher,
    scan_arduino_now,
    start_reading_from_port,
    stop_reading_from_port,
};

use user::{
    get_current_user
};
use logging::init_logger;
use setup::{save_log_directory, set_setup_complete};

// 🚨 NEW GLOBAL GUARD: Prevents the CloseRequested handler from running repeatedly
static SHUTDOWN_IN_PROGRESS: Lazy<AtomicBool> = Lazy::new(|| AtomicBool::new(false));

fn main() {
     if std::env::var("TAURI_DEV").is_ok() && std::env::var("TAURI_DEV_WATCHER_PID").is_ok() {
         println!("Skipping duplicate backend instance (dev watcher)");
         return;
     }

    tauri::Builder::default()



        .setup(|app| {
            // === 1. INIT LOGGER ===
            if let Err(e) = init_logger(&app.handle()) {
                eprintln!("Logger failed: {}", e);
            }

            // === 2. DATABASE ===
            let conn = init_database(&app.handle()).expect("DB failed");
            let db = Database(std::sync::Arc::new(std::sync::Mutex::new(conn)));
            app.manage(db);

            // === 3. WINDOWS ===
            let splashscreen = app.get_webview_window("splashscreen").unwrap();
            let main_window = app.get_webview_window("main").unwrap();
            let app_handle = app.handle().clone();

            // Clone handles for use in the shutdown closure
            let close_app_handle = app.handle().clone();
            let close_main_window = main_window.clone();

            // 🚨 FINAL FIX: Use a global guard to ensure the shutdown logic executes only ONCE.
            main_window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    // Only proceed if SHUTDOWN_IN_PROGRESS is currently false.
                    if SHUTDOWN_IN_PROGRESS.compare_exchange(
                        false, 
                        true, 
                        Ordering::SeqCst, 
                        Ordering::Relaxed
                    ).is_ok() {
                        // 1. Prevent the default action
                        api.prevent_close(); 

                        // 2. Stop the watcher
                        if let Err(e) = arduino::stop_arduino_watcher() {
                            log::debug!("Arduino watcher stopped or was inactive: {}", e);
                        }

                        // 3. Immediately exit the application process (guaranteed termination)
                        close_app_handle.exit(0);
                    }
                    // If the check fails, the app is already exiting, and we ignore the cascading event.
                }
            });


            // === 4. ASYNC SETUP ===
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(Duration::from_secs(3)).await;

                let _ = start_arduino_watcher(app_handle.clone()).await;

                tokio::time::sleep(Duration::from_millis(500)).await;

                main_window.show().ok();
                main_window.set_focus().ok();
                splashscreen.close().ok();

                let _ = main_window.emit("app-ready", ());
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_logs,
            log_event_command,
            start_arduino_watcher,
            stop_arduino_watcher,
            scan_arduino_now,
            start_reading_from_port,
            stop_reading_from_port,
            save_log_directory,
            set_setup_complete,
            save_admission,
            save_patient,
            save_patient_with_admission,
            get_current_user,
            search_patients,
            get_all_patients,
            search_admissions_by_patient,
            update_device_alias,
            fetch_all_known_devices,
            get_patient_count,
            get_patient_by_admission_no,
            delete_patient_by_admission_no,
            update_patient_data,
            upsert_patient_metadata
        ])
        .run(tauri::generate_context!())
        .expect("Tauri app failed");
}

// src/main.rs
