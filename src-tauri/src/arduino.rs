use crate::types::UsbDevice;
use log::{debug, error, info, warn};
use once_cell::sync::Lazy;
use serde_json::json;
use serialport::{available_ports, SerialPortType};
use std::collections::{HashMap, HashSet};
use std::io::{BufRead, BufReader as StdBufReader};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::async_runtime::JoinHandle;
use tauri::{AppHandle, Emitter};

use crate::errordefs::AppError;
use serialport::SerialPort;

// === GLOBAL STATE ===
static POLLING_ACTIVE: AtomicBool = AtomicBool::new(false);
static PREV_DEVICES: Lazy<Mutex<Vec<UsbDevice>>> = Lazy::new(|| Mutex::new(Vec::new()));
static ACTIVE_READERS: Lazy<Mutex<HashMap<String, JoinHandle<()>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

// User clicked "Acquire" → we remember they want a measurement
// Removed on: success OR any error/timeout/disconnect → prevents infinite retry
static DESIRED_READING_PORTS: Lazy<Mutex<HashSet<String>>> =
    Lazy::new(|| Mutex::new(HashSet::new()));

// === ARDUINO DETECTION ===
fn is_arduino_board(device: &UsbDevice) -> bool {
    if device.vid == 0x2341 || device.vid == 9025 {
        return true;
    }
    if matches!(device.vid, 0x1A86 | 0x10C4 | 0x0403 | 0x239A) {
        return true;
    }
    let p = device.product.as_deref().unwrap_or("").to_lowercase();
    let s = device.serial_number.as_deref().unwrap_or("").to_lowercase();
    p.contains("arduino") || s.contains("arduino")
}

fn get_board_name(device: &UsbDevice) -> String {
    if device.vid == 0x2341 || device.vid == 9025 {
        return match device.pid {
            0x0042 | 0x0043 | 0x0242 | 0x0243 => "Arduino Uno".to_string(),
            0x0010 | 0x0044 => "Arduino Mega 2560".to_string(),
            0x0036 | 0x8036 | 0x0037 | 0x8037 => "Arduino Leonardo/Micro".to_string(),
            _ => "Arduino Board".to_string(),
        };
    }
    device
        .product
        .clone()
        .unwrap_or("Arduino-Compatible".to_string())
}

// === CORE HELPERS ===
fn get_current_devices_blocking() -> Result<Vec<UsbDevice>, AppError> {
    let ports = available_ports()?;
    let mut devices = Vec::new();

    for p in ports {
        if let SerialPortType::UsbPort(info) = p.port_type {
            let mut device = UsbDevice {
                port: p.port_name.clone(),
                vid: info.vid,
                pid: info.pid,
                serial_number: info.serial_number.clone(),
                product: info.product.clone(),
                status: "connected".to_string(),
                board_name: "".to_string(),
                device_unit: None,
                custom_name: None,
            };

            if is_arduino_board(&device) {
                device.board_name = get_board_name(&device);
                device.product = Some(format!("{} ({})", device.board_name, device.port));
                devices.push(device);
            }
        }
    }

    debug!("Found {} Arduino device(s)", devices.len());
    Ok(devices)
}

fn restart_stale_readers(app: &AppHandle, devices: &[UsbDevice]) -> Result<(), AppError> {
    let desired = DESIRED_READING_PORTS.lock()?;
    let mut active = ACTIVE_READERS.lock()?;

    for device in devices {
        let port = &device.port;

        if desired.contains(port) && !active.contains_key(port) {
            info!("Auto-restarting reader for {} (user requested)", port);

            let app_clone = app.clone();
            let port_clone = port.clone();

            let handle = tauri::async_runtime::spawn(async move {
                let _ = manual_read_loop(app_clone.clone(), port_clone.clone(), 9600).await;
                let _ = ACTIVE_READERS.lock().map(|mut m| m.remove(&port_clone));
                let _ = app_clone.emit("arduino-reading-stopped", json!({ "port": port_clone }));
            });

            active.insert(port.clone(), handle);
            let _ = app.emit("arduino-reading-started", json!({ "port": port }))?;
        }
    }
    Ok(())
}

fn scan_arduino_and_emit_core(
    app: &AppHandle,
    current: Vec<UsbDevice>,
) -> Result<(bool, Vec<UsbDevice>), AppError> {
    let mut prev_guard = PREV_DEVICES.lock()?;
    let mut desired_guard = DESIRED_READING_PORTS.lock()?;
    let mut readers = ACTIVE_READERS.lock()?;

    let added: Vec<UsbDevice> = current
        .iter()
        .filter(|d| !prev_guard.iter().any(|p| p.port == d.port))
        .cloned()
        .collect();

    let removed: Vec<UsbDevice> = prev_guard
        .iter()
        .filter(|p| !current.iter().any(|c| c.port == p.port))
        .cloned()
        .collect();

    let has_changed = !added.is_empty() || !removed.is_empty();

    if has_changed {
        info!(
            "DEVICE CHANGE: +{} added, -{} removed",
            added.len(),
            removed.len()
        );

        for device in &removed {
            desired_guard.remove(&device.port);
            if let Some(handle) = readers.remove(&device.port) {
                handle.abort();
                let _ = app.emit(
                    "arduino-reading-stopped",
                    json!({
                        "port": &device.port,
                        "reason": "Device removed"
                    }),
                );
            }
        }

        let _ = app.emit(
            "arduino-changed",
            json!({ "added": added, "removed": removed }),
        );
    }

    *prev_guard = current.clone();
    Ok((has_changed, current))
}

pub async fn manual_read_loop(
    app: AppHandle,
    port_name: String,
    baud_rate: u32,
) -> Result<(), AppError> {
    info!(
        "Opening and resetting Arduino on {} @ {} baud",
        port_name, baud_rate
    );

    let mut serial_port = match serialport::new(&port_name, baud_rate)
        .timeout(Duration::from_millis(1000))
        .open_native()
    {
        Ok(p) => p,
        Err(e) => {
            let msg = e.to_string();
            error!("Failed to open {}: {}", port_name, msg);
            let _ = app.emit(
                "arduino-disconnected",
                json!({
                    "port": &port_name,
                    "error": msg
                }),
            );
            let _ = DESIRED_READING_PORTS
                .lock()
                .map(|mut s| s.remove(&port_name));
            let _ = app.emit("arduino-reading-stopped", json!({ "port": &port_name }));
            return Err(e.into());
        }
    };

    // DTR reset
    let _ = serial_port.write_data_terminal_ready(true);
    std::thread::sleep(Duration::from_millis(250));
    let _ = serial_port.write_data_terminal_ready(false);

    info!(
        "Arduino reset complete on {}. Starting read loop...",
        port_name
    );

    let mut reader = StdBufReader::new(serial_port);
    let mut line = String::new();
    let timeout_duration = Duration::from_secs(10);
    let mut last_data_time = Instant::now();

    macro_rules! fail_and_forget {
        ($error_msg:expr, $toast_key:expr) => {{
            error!("{} on {}", $error_msg, port_name);
            let _ = app.emit("arduino-disconnected", json!({
                "port": &port_name,
                "error": $error_msg
            }));
            // Dedicated timeout event for nice toast
            let _ = app.emit($toast_key, json!({
                "port": &port_name,
                "message": $error_msg
            }));
            let _ = DESIRED_READING_PORTS.lock().map(|mut s| s.remove(&port_name));
            let _ = app.emit("arduino-reading-stopped", json!({ "port": &port_name }));
            break;
        }};
    }

    loop {
        line.clear();

        // 30-second timeout — user-friendly message
        if last_data_time.elapsed() > timeout_duration {
            fail_and_forget!(
                "No data received for 10 seconds. Measurement stopped.",
                "arduino-timeout"
            );
        }

        match reader.read_line(&mut line) {
            Ok(0) => fail_and_forget!("Connection lost unexpectedly", "arduino-error"),
            Ok(_) => {
                let data = line.trim().to_string();
                if data.is_empty() {
                    continue;
                }

                last_data_time = Instant::now();
                debug!("DATA: {}", data);

                let _ = app.emit(
                    "arduino-data",
                    json!({
                        "port": &port_name,
                        "data": data
                    }),
                );

                if data.contains("cycles completed") {
                    info!(
                        "Measurement successfully finished on {} (3 cycles)",
                        port_name
                    );
                    let _ = DESIRED_READING_PORTS
                        .lock()
                        .map(|mut s| s.remove(&port_name));
                    let _ = app.emit("arduino-cycle-complete", json!({ "port": &port_name }));
                    let _ = app.emit("arduino-reading-stopped", json!({ "port": &port_name }));
                    break;
                }
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => continue,
            Err(e) => {
                let msg = e.to_string();
                fail_and_forget!(msg, "arduino-error");
            }
        }

        std::thread::sleep(Duration::from_millis(10));
    }

    Ok(())
}

// ==============================================================================================
//                                      TAURI COMMANDS
// ==============================================================================================

#[tauri::command]
pub async fn start_arduino_watcher(app: AppHandle) -> Result<(), AppError> {
    if POLLING_ACTIVE
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::Relaxed)
        .is_err()
    {
        warn!("Arduino watcher already running");
        return Err(AppError::Internal("Watcher already running".into()));
    }

    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        // Initial scan
        if let Ok(Ok(current)) = tokio::task::spawn_blocking(get_current_devices_blocking).await {
            let _ = scan_arduino_and_emit_core(&app_clone, current.clone());
            let _ = app_clone.emit("arduino-scan-complete", current);
        }

        // Main polling loop
        while POLLING_ACTIVE.load(Ordering::Relaxed) {
            if let Ok(Ok(current)) = tokio::task::spawn_blocking(get_current_devices_blocking).await
            {
                let (_changed, final_devices) =
                    scan_arduino_and_emit_core(&app_clone, current.clone())
                        .unwrap_or((false, current.clone()));

                let _ = restart_stale_readers(&app_clone, &final_devices);

                // ALWAYS emit — fixes sleep/wake UI freeze
                let _ = app_clone.emit("arduino-scan-complete", final_devices);
            }

            tokio::time::sleep(Duration::from_secs(3)).await;
        }

        POLLING_ACTIVE.store(false, Ordering::Relaxed);
        info!("Arduino watcher stopped");
    });

    Ok(())
}

#[tauri::command]
pub fn stop_arduino_watcher() -> Result<(), AppError> {
    if !POLLING_ACTIVE.load(Ordering::Relaxed) {
        return Err(AppError::Internal("Watcher not running".into()));
    }
    POLLING_ACTIVE.store(false, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub async fn scan_arduino_now(app: AppHandle) -> Result<(), AppError> {
    let current = tokio::task::spawn_blocking(get_current_devices_blocking)
        .await
        .map_err(AppError::from)??;

    let (_, final_devices) = scan_arduino_and_emit_core(&app, current.clone())?;
    app.emit("arduino-scan-complete", final_devices)?;
    Ok(())
}

#[tauri::command]
pub async fn start_reading_from_port(
    app: AppHandle,
    port_name: String,
    baud_rate: u32,
) -> Result<(), AppError> {
    DESIRED_READING_PORTS.lock()?.insert(port_name.clone());

    let mut readers = ACTIVE_READERS.lock()?;
    if readers.contains_key(&port_name) {
        return Err(AppError::Resource(format!(
            "Already reading from {}",
            port_name
        )));
    }

    let app_clone = app.clone();
    let port_clone = port_name.clone();

    let handle = tauri::async_runtime::spawn(async move {
        let _ = manual_read_loop(app_clone.clone(), port_clone.clone(), baud_rate).await;
        let _ = ACTIVE_READERS.lock().map(|mut m| m.remove(&port_clone));
    });

    readers.insert(port_name.clone(), handle);
    app.emit("arduino-reading-started", json!({ "port": &port_name }))?;
    Ok(())
}

#[tauri::command]
pub async fn stop_reading_from_port(
    app: tauri::AppHandle,
    port_name: String,
) -> Result<(), AppError> {
    DESIRED_READING_PORTS.lock()?.remove(&port_name);

    let mut readers = ACTIVE_READERS.lock()?;
    if let Some(handle) = readers.remove(&port_name) {
        handle.abort();
        app.emit("arduino-reading-stopped", json!({ "port": port_name }))?;
        Ok(())
    } else {
        Err(AppError::Resource("Not reading from this port".into()))
    }
}
