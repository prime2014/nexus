// src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod arduino;
mod database;
mod errordefs;
mod logging;
mod setup;
mod types;
mod user;

use once_cell::sync::Lazy;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager, State, Wry};
use tauri_plugin_dialog::init;

use tauri::Listener;

use arduino::{
    scan_arduino_now, start_arduino_watcher, start_reading_from_port, stop_arduino_watcher,
    stop_reading_from_port,
};
use database::{
    create_patient, delete_patient_by_admission_no, fetch_all_known_devices, get_admissions_count,
    get_all_patients, get_app_settings, get_global_admission_stats, get_latest_5_admissions,
    get_logs, get_patient_by_admission_no, get_patient_count, init_database, log_event_command,
    save_admission, save_patient, save_patient_with_admission, search_admissions_by_patient,
    search_patients, update_device_alias, update_patient_data, upsert_patient_metadata, Database,
};
use logging::init_logger;
use setup::{get_default_paths, save_setup_settings, set_setup_complete};
use user::get_current_user;

static SHUTDOWN_IN_PROGRESS: Lazy<AtomicBool> = Lazy::new(|| AtomicBool::new(false));

fn main() {
    log::info!("=== TAURI SETUP RUNNING ===");

    #[cfg(debug_assertions)]
    {
        if std::env::var("TAURI_DEV_WATCHER_PID").is_ok() {
            println!("Dev watcher detected - skipping backend instance");
            return;
        }
    }

    let _single_instance =
        tauri_plugin_single_instance::init(|app: &AppHandle<Wry>, _argv, _cwd| {
            log::warn!("Another instance is already running. Bringing it to front.");
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        });

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 1. Initialize logger
            if let Err(e) = init_logger(&app.handle()) {
                eprintln!("Logger failed: {}", e);
            }

            // 2. Initialize database
            let conn = init_database(&app.handle()).expect("Database initialization failed");
            let db = Database(std::sync::Arc::new(std::sync::Mutex::new(conn)));
            app.manage(db);

            // Pre-flight check
            {
                let managed_state = app.state::<Database>();
                if managed_state.0.lock().is_err() {
                    log::error!("Database mutex poisoned during setup");
                    return Err("Critical setup failure: Database mutex poisoned.".into());
                }
                log::info!("Database pre-flight check passed.");
            }

            // 3. Get window references
            let splashscreen = app
                .get_webview_window("splashscreen")
                .expect("Splashscreen not found");
            let main_window = app
                .get_webview_window("main")
                .expect("Main window not found");
            let setup_window = app
                .get_webview_window("setupwizard")
                .expect("Setup wizard not found");

            // 4. Graceful shutdown
            let shutdown_handle = app.handle().clone();
            main_window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    if SHUTDOWN_IN_PROGRESS
                        .compare_exchange(false, true, Ordering::SeqCst, Ordering::Relaxed)
                        .is_ok()
                    {
                        api.prevent_close();
                        let _ = stop_arduino_watcher();
                        shutdown_handle.exit(0);
                    }
                }
            });

            // 5. Async initialization
            let init_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_millis(1200)).await;

                let db: State<'_, Database> = init_handle.state();

                let setup_complete = {
                    let conn = db.0.lock().unwrap();
                    conn.query_row(
                        "SELECT setup_complete FROM settings WHERE id = 1",
                        [],
                        |row| row.get::<_, i32>(0),
                    )
                    .map(|v| v == 1)
                    .unwrap_or(false)
                };

                let _ = splashscreen.close();

                if setup_complete {
                    let _ = main_window.show();
                    let _ = main_window.set_focus();

                    if let Err(e) = start_arduino_watcher(init_handle.clone()).await {
                        log::error!("Failed to start Arduino watcher: {}", e);
                    }
                } else {
                    let _ = setup_window.show();

                    // Listen for the frontend event
                    let main_w = main_window.clone();
                    let handle_clone = init_handle.clone();

                    init_handle.listen("setup-finished", move |event| {
                        log::info!("Setup event received: {:?}", event.payload());

                        // Show the hidden main window
                        let _ = main_w.show();
                        let _ = main_w.set_focus();

                        // Start background services (like Arduino) now that we have settings
                        let h = handle_clone.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = start_arduino_watcher(h).await;
                        });
                    });
                }
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
            save_setup_settings,
            update_patient_data,
            upsert_patient_metadata,
            get_default_paths,
            get_app_settings,
            get_admissions_count,
            get_global_admission_stats,
            get_latest_5_admissions
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Tauri application");
}
