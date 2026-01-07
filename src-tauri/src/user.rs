#[tauri::command]
pub fn get_current_user() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERNAME").map_err(|_| "Could not read USERNAME on Windows".to_string())
    }

    #[cfg(target_os = "macos")]
    {
        std::env::var("USER").map_err(|_| "Could not read USER on macOS".to_string())
    }

    #[cfg(target_os = "linux")]
    {
        // On Linux, try LOGNAME first (more reliable in sudo/su scenarios)
        std::env::var("LOGNAME")
            .or_else(|_| std::env::var("USER"))
            .map_err(|_| "Could not read user on Linux".to_string())
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported OS".to_string())
    }
}
