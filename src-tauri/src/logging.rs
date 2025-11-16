// src/logging.rs
use chrono::{DateTime, Duration, Local};
use log::info;
use simplelog::{
    ColorChoice, CombinedLogger, ConfigBuilder, LevelFilter, TermLogger, TerminalMode,
    WriteLogger,
};
use std::fs::{self, OpenOptions};
use std::path::Path;
use tauri::{AppHandle, Manager}; // ← ADD Manager HERE
use time::format_description::FormatItem;
use time::macros::format_description;

// === TIME FORMAT: 2025-11-11 19:25:45.123 ===
pub static TIME_FORMAT: &[FormatItem<'static>] =
    format_description!("[year]-[month]-[day] [hour]:[minute]:[second].[subsecond digits:3]");

/// Initialize logger with daily rotation + auto-cleanup
pub fn init_logger(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let log_dir = app_handle
        .path() // ← NOW WORKS
        .app_log_dir()
        .map_err(|e| format!("Failed to get log directory: {}", e))?;

    fs::create_dir_all(&log_dir)?;

    // === CLEANUP OLD LOGS (>7 DAYS) ===
    cleanup_old_logs(&log_dir, 7)?;

    // === DAILY LOG FILE ===
    let today = Local::now().format("%Y-%m-%d").to_string();
    let log_file = log_dir.join(format!("app_{}.log", today));

    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .append(true)
        .open(&log_file)?;

    let config = ConfigBuilder::new()
        .set_time_offset_to_local()
        .map_err(|_| "Config error")?
        .set_time_format_custom(TIME_FORMAT)
        .build();

    CombinedLogger::init(vec![
        WriteLogger::new(LevelFilter::Warn, config.clone(), file),
        TermLogger::new(
            LevelFilter::Debug,
            config,
            TerminalMode::Mixed,
            ColorChoice::Auto,
        ),
    ])?;

    info!("Logger initialized: {}", log_dir.display());
    info!("Daily log: {}", log_file.display());
    info!("Old logs (>7 days) cleaned up.");
    Ok(())
}

/// Delete log files older than `days_to_keep`
pub fn cleanup_old_logs(log_dir: &Path, days_to_keep: u64) -> Result<(), Box<dyn std::error::Error>> {
    let cutoff = Local::now() - Duration::days(days_to_keep as i64);

    if let Ok(entries) = fs::read_dir(log_dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    if let Some(file_name) = entry.file_name().to_str() {
                        if file_name.starts_with("app_") && file_name.ends_with(".log") {
                            if let Ok(modified) = metadata.modified() {
                                let modified_time: DateTime<Local> = modified.into();
                                if modified_time < cutoff {
                                    let path = entry.path();
                                    if fs::remove_file(&path).is_ok() {
                                        info!("Deleted old log: {}", path.display());
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(())
}