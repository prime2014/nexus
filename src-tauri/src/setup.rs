// src/setup.rs or wherever these commands are

use crate::database::Database;
use rusqlite::params;

use tauri::{AppHandle, Manager, State};

#[derive(serde::Deserialize, Debug)]
pub struct AppSettings {
    pub theme: String,
    pub baud_rate_default: u32,
    pub auto_connect_enabled: bool,
    pub default_doctor_name: String,
    pub log_level: String,
    pub log_file_location: Option<String>,
    pub sqlite_file_path: Option<String>,
}

#[derive(serde::Serialize)]
pub struct DefaultPaths {
    pub log_directory: String,
    pub database_directory: String,
}

/// Returns whether the initial setup wizard has been completed
#[tauri::command]
pub fn is_setup_complete(db: State<'_, Database>) -> bool {
    let conn = match db.0.lock() {
        Ok(guard) => guard,
        Err(_) => return false, // Mutex poisoned → assume not complete
    };

    let setup_complete: Result<i32, rusqlite::Error> = conn.query_row(
        "SELECT setup_complete FROM settings WHERE id = 1",
        [],
        |row| row.get(0),
    );

    matches!(setup_complete, Ok(1))
}

/// Marks the initial setup as complete
#[tauri::command]
pub fn set_setup_complete(db: State<'_, Database>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    // Update if row exists
    let updated = conn
        .execute("UPDATE settings SET setup_complete = 1 WHERE id = 1", [])
        .map_err(|e| e.to_string())?;

    // If no row was updated, insert the first row
    if updated == 0 {
        conn.execute(
            "INSERT INTO settings (id, setup_complete) VALUES (1, 1)",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn save_setup_settings(db: State<'_, Database>, settings: AppSettings) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let updated = conn
        .execute(
            "UPDATE settings SET 
            default_theme = ?1,
            default_baud_rate = ?2,
            auto_connect_enabled = ?3,
            default_doctor_name = ?4,
            default_log_level = ?5,
            log_file_location = ?6,
            sqlite_file_path = ?7,
            setup_complete = 1
        WHERE id = 1",
            params![
                &settings.theme,
                settings.baud_rate_default as i32,
                settings.auto_connect_enabled as i32,
                &settings.default_doctor_name,
                &settings.log_level,
                &settings.log_file_location,
                &settings.sqlite_file_path,
            ],
        )
        .map_err(|e| e.to_string())?;

    if updated == 0 {
        // Insert first row — now with correct number of columns and placeholders
        conn.execute(
            "INSERT INTO settings (
                id,
                default_theme,
                default_baud_rate,
                auto_connect_enabled,
                default_doctor_name,
                default_log_level,
                log_file_location,
                sqlite_file_path,
                setup_complete
            ) VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)",
            params![
                &settings.theme,
                settings.baud_rate_default as i32,
                settings.auto_connect_enabled as i32,
                &settings.default_doctor_name,
                &settings.log_level,
                &settings.log_file_location,
                &settings.sqlite_file_path,
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn get_default_paths(app: tauri::AppHandle) -> Result<DefaultPaths, String> {
    use std::path::PathBuf;

    let log_dir: PathBuf = app.path().app_log_dir().map_err(|e| e.to_string())?;

    let data_dir: PathBuf = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let db_path = data_dir.join("app.db");

    Ok(DefaultPaths {
        log_directory: log_dir.to_str().ok_or("Invalid log path")?.to_string(),
        database_directory: db_path.to_str().ok_or("Invalid DB path")?.to_string(),
    })
}
