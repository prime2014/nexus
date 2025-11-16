//src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod arduino;
mod types;
mod logging;
mod setup; // ← ADD THIS

use tauri::{Manager, Emitter};
use tokio::time::Duration;

use database::{Database, init_database, get_logs, log_event_command};
use arduino::{
    start_arduino_watcher,
    stop_arduino_watcher,
    scan_arduino_now,
    start_reading_from_port,
    stop_reading_from_port,
};
use logging::init_logger;
use setup::{save_log_directory, set_setup_complete}; // ← FROM setup.rs

fn main() {
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
        ])
        .run(tauri::generate_context!())
        .expect("Tauri app failed");
}
// src/main.rs
