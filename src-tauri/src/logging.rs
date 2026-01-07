// src/logging.rs
use chrono::{Duration, Local};
use log::info;
use simplelog::{
    ColorChoice, CombinedLogger, ConfigBuilder, LevelFilter, TermLogger, TerminalMode, WriteLogger,
};
use std::fs::{self, OpenOptions};
use std::path::Path;
use tauri::{AppHandle, Manager};
use time::format_description::FormatItem;
use time::macros::format_description;

pub static TIME_FORMAT: &[FormatItem<'static>] =
    format_description!("[year]-[month]-[day] [hour]:[minute]:[second].[subsecond digits:3]");

pub fn init_logger(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let log_dir = app_handle
        .path()
        .app_log_dir()
        .map_err(|e| format!("Failed to get log directory: {}", e))?;

    fs::create_dir_all(&log_dir)?;
    cleanup_old_logs(&log_dir, 7)?;

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
        .set_location_level(LevelFilter::Error) // ← ADD THIS LINE
        .set_target_level(LevelFilter::Error) // ← ADD THIS LINE
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

pub fn cleanup_old_logs(
    log_dir: &Path,
    days_to_keep: u64,
) -> Result<(), Box<dyn std::error::Error>> {
    let cutoff = Local::now() - Duration::days(days_to_keep as i64);

    for entry in fs::read_dir(log_dir)?.flatten() {
        if let Ok(meta) = entry.metadata() {
            if meta.is_file() {
                if let Some(name) = entry.file_name().to_str() {
                    if name.starts_with("app_") && name.ends_with(".log") {
                        if let Ok(modified) = meta.modified() {
                            let modified_time = chrono::DateTime::<Local>::from(modified);
                            if modified_time < cutoff {
                                let path = entry.path();
                                fs::remove_file(&path)?;
                                info!("Deleted old log: {}", path.display());
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(())
}
