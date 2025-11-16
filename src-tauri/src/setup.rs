// src/setup.rs
use tauri::{AppHandle, Manager, State};
use crate::database::Database;
use std::path::PathBuf;

/// Save a custom log directory path to the database
#[tauri::command]
pub fn save_log_directory(
    db: State<'_, Database>,
    app: AppHandle,
    path: Option<String>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    // TAURI 2.0: Use app.path() instead of tauri::api::path
    let default_path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("logs");

    let final_path = path.unwrap_or_else(|| default_path.to_string_lossy().to_string());

    // Ensure directory exists
    std::fs::create_dir_all(&default_path).ok();

    conn.execute(
        "INSERT INTO app_settings (key, value)
         VALUES ('log_dir', ?1)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [&final_path],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Mark the setup process as completed
#[tauri::command]
pub fn set_setup_complete(db: State<'_, Database>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO app_settings (key, value)
         VALUES ('setup_complete', 'true')
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}