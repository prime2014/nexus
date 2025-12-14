// src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod arduino;
mod types;
mod logging;
mod setup;
mod errordefs;
mod user;
// mod reports;
use tauri::{Manager, AppHandle, Wry, State};
use std::sync::atomic::{AtomicBool, Ordering};
use once_cell::sync::Lazy; // Import Lazy for the global state
use errordefs::AppError;
use std::error::Error as StdError;

use database::{
    Database, 
    init_database, 
    get_logs, 
    log_event_command, 
    create_patient,
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

// GLOBAL GUARD: Prevents the CloseRequested handler from running repeatedly
static SHUTDOWN_IN_PROGRESS: Lazy<AtomicBool> = Lazy::new(|| AtomicBool::new(false));


fn main() {
    log::info!("=== TAURI SETUP RUNNING ===");
    // Safe duplicate prevention - only in dev, and only if watcher PID exists
    #[cfg(debug_assertions)]
    {
        if std::env::var("TAURI_DEV_WATCHER_PID").is_ok() {
            println!("Dev watcher detected - skipping backend instance");
            return;
        }
    }

    let _single_instance = tauri_plugin_single_instance::init(|app: &AppHandle<Wry>, argv, cwd| {
        log::warn!("Another instance is already running. Bringing it to front.");
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    });

    tauri::Builder::default()
        .setup(|app| {
            // 1. Initialize logger
            if let Err(e) = init_logger(&app.handle()) {
                eprintln!("Logger failed: {}", e);
            }

            // 2. Initialize database
            let conn = init_database(&app.handle()).expect("Database initialization failed");
            let db = Database(std::sync::Arc::new(std::sync::Mutex::new(conn)));
            app.manage(db);

            {
                let managed_state = app.state::<Database>();
                
                let lock_result = managed_state.0.lock();

                match lock_result {
                    Ok(_guard) => {
                        log::info!("Database pre-flight check passed: state managed and connection accessible.");
                    }
                    Err(e) => {
                        let app_error: AppError = e.into();
                        log::error!("Database pre-flight check FAILED: mutex poisoned - {}", app_error);
                        
                        let error_message = format!("Setup critical failure: Database mutex poisoned. {}", app_error);

                        // We use the simpler Box<dyn StdError> return type.
                        // return Err(Box::<dyn std::error::Error + Send + Sync>::from(error_message));
                        return Err(Box::new(app_error));
                    }
                }
            }

            // 3. Get window references
            let splashscreen = app.get_webview_window("splashscreen")
                .expect("Splashscreen window not found");
            let main_window = app.get_webview_window("main")
                .expect("Main window not found");

            // 4. Graceful shutdown on close request
            let shutdown_handle = app.handle().clone();
            main_window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    if SHUTDOWN_IN_PROGRESS.compare_exchange(
                        false,
                        true,
                        Ordering::SeqCst,
                        Ordering::Relaxed,
                    ).is_ok() {
                        api.prevent_close();

                        // Stop Arduino watcher gracefully
                        if let Err(e) = stop_arduino_watcher() {
                            log::debug!("Arduino watcher already stopped or error: {}", e);
                        }

                        // Exit the application
                        shutdown_handle.exit(0);
                    }
                }
            });

            // 5. Async initialization task
            let init_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Start Arduino device watcher (This starts the continuous background scan)
                if let Err(e) = start_arduino_watcher(init_handle).await {
                    log::error!("Failed to start Arduino watcher: {}", e);
                }

                // Optional: Ensure splashscreen is visible long enough for good UX
                // This delay should be just long enough for the watcher to start.
                tokio::time::sleep(tokio::time::Duration::from_millis(1200)).await;

                let _ = splashscreen.close();
                let _ = main_window.show();
                let _ = main_window.set_focus();

                // ❌ REMOVED: The frontend now triggers its own initial data load and scan
                /*
                let main_window_clone = main_window.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
                    let _ = main_window_clone.emit("app-ready", ());
                    log::info!("Emitted 'app-ready' event to frontend");
                });
                */
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_logs,
            log_event_command,
            create_patient,
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
        .expect("Error while running Tauri application");
}