use serde::{Deserialize, Serialize};
use thiserror::Error;

/// The unified error enum for the entire application.
#[derive(Debug, Error, Serialize, Deserialize)]
#[serde(tag = "type", content = "details")] // Optional: Makes serialization cleaner
pub enum AppError {
    /// Errors related to the USB/Serial communication layer.
    #[error("Serial Port Error: {0}")]
    Serial(String),

    /// Errors related to file I/O operations.
    #[error("File System Error: {0}")]
    Io(String),

    /// Errors related to application state management (e.g., locking failed).
    #[error("Internal State Error: {0}")]
    Internal(String),

    /// Errors for Tauri-specific issues (e.g., event emission failure).
    #[error("Tauri Runtime Error: {0}")]
    Tauri(String),

    /// Errors when a resource is not found or is busy.
    #[error("Resource Not Available: {0}")]
    Resource(String),

    /// A generic catch-all error for unexpected problems.
    #[error("Unknown Error: {0}")]
    Unknown(String),
}

// Convert standard I/O errors
impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

// Convert serialport errors
impl From<serialport::Error> for AppError {
    fn from(err: serialport::Error) -> Self {
        // You can inspect the error kind for better classification
        AppError::Serial(err.to_string())
    }
}

// Convert Mutex Poisoning/Locking Errors
impl<T> From<std::sync::PoisonError<T>> for AppError {
    fn from(err: std::sync::PoisonError<T>) -> Self {
        AppError::Internal(format!("Mutex lock poisoned: {}", err))
    }
}

// Convert Tauri's event emission errors
impl From<tauri::Error> for AppError {
    fn from(err: tauri::Error) -> Self {
        AppError::Tauri(err.to_string())
    }
}

// Convert tokio's JoinError (from spawn_blocking or async task errors)
impl From<tokio::task::JoinError> for AppError {
    fn from(err: tokio::task::JoinError) -> Self {
        AppError::Internal(format!("Async task join error: {}", err))
    }
}
