// src/settings.rs
use rusqlite::params;
use tauri::{AppHandle, Manager};                     // ← Manager gives you .state() and .path()
use tauri_plugin_shell::ShellExt;                    // ← THIS IS THE MISSING IMPORT!
use crate::errordefs::{AppError, LogErrorExt};
use crate::database::{Database, AppSettings};

#[tauri::command]
pub fn load_settings(app: AppHandle) -> Result<AppSettings, AppError> {
    let db = app.state::<Database>();
    let conn = db.0.lock()
        .map_err(AppError::from)
        .log_error("Failed to lock database (load_settings)")?;

    let mut stmt = conn.prepare("SELECT * FROM settings WHERE id = 1")
        .map_err(AppError::from)
        .log_error("Failed to prepare settings query")?;

    let settings = stmt.query_row([], |row| {
        Ok(AppSettings {
            default_baud_rate: row.get(1)?,
            default_log_level: row.get(2)?,
            default_theme: row.get(3)?,
            auto_connect_enabled: row.get(4)?,
            default_doctor_name: row.get(5)?,
            log_file_location: row.get(6)?,
            sqlite_file_location: row.get(7)?,
        })
    })
    .map_err(AppError::from)
    .log_error("Failed to read settings row")?;

    log::debug!("Settings loaded: {:?}", settings);
    Ok(settings)
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), AppError> {
    let db = app.state::<Database>();
    let conn = db.0.lock()
        .map_err(AppError::from)
        .log_error("Failed to lock database (save_settings)")?;

    conn.execute(
        "UPDATE settings SET
            default_baud_rate = ?1,
            default_log_level = ?2,
            default_theme = ?3,
            auto_connect_enabled = ?4,
            default_doctor_name = ?5
         WHERE id = 1",
        params![
            settings.default_baud_rate,
            settings.default_log_level,
            settings.default_theme,
            settings.auto_connect_enabled,
            settings.default_doctor_name,
        ],
    )
    .map_err(AppError::from)
    .log_error("Failed to save settings")?;

    log::info!("Settings saved successfully");
    Ok(())
}

#[tauri::command]
pub fn open_data_directory(app: AppHandle) -> Result<(), AppError> {
    let path = app.path()
        .app_data_dir()
        .map_err(AppError::from)
        .log_error("Failed to resolve app data directory")?;

    let path_str = path.to_string_lossy();

    // This line now works because of `use tauri_plugin_shell::ShellExt;`
    app.shell()
        .open(&path_str, None)
        .map_err(AppError::from)
        .log_error(&format!("Failed to open folder: {path_str}"))?;

    log::info!("Opened data directory: {path_str}");
    Ok(())
}


