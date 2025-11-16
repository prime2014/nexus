// src-tauri/src/arduino.rs
use tauri::{AppHandle, Emitter};
use serialport::{available_ports, SerialPortType, SerialPort};
use crate::types::UsbDevice;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use once_cell::sync::Lazy;
use serde_json::json;
use std::io::{BufRead, BufReader as StdBufReader};
use log::{info, warn, error, debug};  // Added `warn`
use tauri::async_runtime::JoinHandle;
use std::time::Duration;

// === GLOBAL STATE ===
static POLLING_ACTIVE: AtomicBool = AtomicBool::new(false);
static PREV_DEVICES: Lazy<Mutex<Vec<UsbDevice>>> = Lazy::new(|| Mutex::new(Vec::new()));
static ACTIVE_READERS: Lazy<Mutex<HashMap<String, JoinHandle<()>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

// === ARDUINO DETECTION ===

fn is_arduino_board(device: &UsbDevice) -> bool {
    if device.vid == 0x2341 { return true; }  // Official Arduino
    if matches!(device.vid, 0x1A86 | 0x10C4 | 0x0403) {
        let p = device.product.as_deref().unwrap_or("").to_lowercase();
        let s = device.serial_number.as_deref().unwrap_or("").to_lowercase();
        if p.contains("arduino") || s.contains("arduino") { return true; }
    }
    false
}

fn get_board_name(device: &UsbDevice) -> String {
    match (device.vid, device.pid) {
        (0x2341, 0x0043) => "Arduino Uno".to_string(),
        (0x2341, 0x0010) => "Arduino Mega 2560".to_string(),
        (0x2341, 0x8036) => "Arduino Leonardo".to_string(),
        (0x2341, 0x8037) => "Arduino Micro".to_string(),
        _ => device.product.clone().unwrap_or("Unknown Arduino".to_string()),
    }
}

// === CORE HELPERS ===

fn get_current_devices_blocking() -> Result<Vec<UsbDevice>, String> {
    let ports = available_ports().map_err(|e| format!("Failed to list ports: {}", e))?;
    let mut devices = Vec::new();

    for p in ports {
        if let SerialPortType::UsbPort(info) = p.port_type {
            let mut device = UsbDevice {
                port: p.port_name,
                vid: info.vid,
                pid: info.pid,
                serial_number: info.serial_number.clone(),
                product: info.product.clone(),
                status: "connected".to_string(),
                board_name: "".to_string(),
            };

            if is_arduino_board(&device) {
                device.board_name = get_board_name(&device);
                devices.push(device);
            }
        }
    }

    debug!("Found {} Arduino device(s)", devices.len());
    Ok(devices)
}

fn scan_arduino_and_emit_core(
    app: &AppHandle,
    current: Vec<UsbDevice>,
) -> Result<(bool, Vec<UsbDevice>), String> {
    let mut prev_guard = PREV_DEVICES.lock().map_err(|e| e.to_string())?;

    let added: Vec<UsbDevice> = current.iter()
        .filter(|d| !prev_guard.iter().any(|p| p.port == d.port))
        .cloned()
        .collect();

    let removed: Vec<UsbDevice> = prev_guard.iter()
        .filter(|p| !current.iter().any(|c| c.port == p.port))
        .cloned()
        .collect();

    let has_changed = !added.is_empty() || !removed.is_empty();

    if has_changed {
        info!("DEVICE CHANGE: +{} added, -{} removed", added.len(), removed.len());

        let mut readers = ACTIVE_READERS.lock().map_err(|e| e.to_string())?;
        for device in &removed {
            if let Some(handle) = readers.remove(&device.port) {
                handle.abort();
                let _ = app.emit("arduino-reading-stopped", json!({
                    "port": &device.port,
                    "reason": "Device physically removed"
                }));
            }
        }

        *prev_guard = current.clone();
        let _ = app.emit("arduino-changed", json!({ "added": added, "removed": removed }));
    }

    Ok((has_changed, current))
}


pub async fn manual_read_loop(
    app: AppHandle,
    port_name: String,
    baud_rate: u32,
) -> Result<(), String> {
    info!("Opening and resetting Arduino on {} @ {} baud", port_name, baud_rate);

    let mut serial_port = serialport::new(&port_name, baud_rate)
        .timeout(Duration::from_millis(1000))
        .open_native()
        .map_err(|e| format!("Failed to open {}: {}", port_name, e))?;

    serial_port
        .write_data_terminal_ready(true)
        .map_err(|e| format!("Failed to set DTR: {}", e))?;
    std::thread::sleep(Duration::from_millis(250));
    serial_port
        .write_data_terminal_ready(false)
        .map_err(|e| format!("Failed to clear DTR: {}", e))?;

    info!("Arduino reset complete. Starting read loop...");

    let mut reader = StdBufReader::new(serial_port);
    let mut line = String::new();

    loop {
        line.clear();
        match reader.read_line(&mut line) {
            Ok(0) => {
                // EOF – device probably unplugged
                let _ = app.emit("arduino-disconnected", json!({
                    "port": &port_name,
                    "error": "Connection lost (EOF)"
                }));
                break;
            }
            Ok(_) => {
                let data = line.trim().to_string();
                if data.is_empty() { continue; }

                debug!("DATA: {}", data);

                let _ = app.emit("arduino-data", json!({
                    "port": &port_name,
                    "data": data
                }));

                // **NEW EVENT** – tell UI a cycle finished, but keep reading
                if data.contains("cycles completed") {
                    info!("Cycle complete on {}. Stopping reader.", port_name);

                    // Emit cycle complete (toast)
                    // Emit cycle complete FIRST
                    let _ = app.emit("arduino-cycle-complete", json!({ "port": &port_name }));

                    // Emit STOPPED → UI will re-enable button
                    let _ = app.emit("arduino-reading-stopped", json!({ "port": &port_name }));

                    // Exit loop — stop reading
                    break;
                }
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => continue,
            Err(e) => {
                error!("Port error: {}", e);
                let _ = app.emit("arduino-disconnected", json!({
                    "port": &port_name,
                    "error": e.to_string()
                }));
                break;
            }
        }
    }

    // Only reached on error / disconnect – clean exit
    Ok(())
}


// === TAURI COMMANDS ===

#[tauri::command]
pub async fn start_arduino_watcher(app: AppHandle) -> Result<(), String> {
    if POLLING_ACTIVE.compare_exchange(false, true, Ordering::SeqCst, Ordering::Relaxed).is_err() {
        warn!("Arduino watcher already running");
        return Err("Watcher already running".into());
    }

    let app_clone = app.clone();

    tauri::async_runtime::spawn(async move {
        let first = tokio::task::spawn_blocking(|| get_current_devices_blocking())
            .await
            .map_err(|e| e.to_string())
            .and_then(|r| r);

        if let Ok(current) = first {
            let _ = scan_arduino_and_emit_core(&app_clone, current.clone());
            let _ = app_clone.emit("arduino-scan-complete", current);
        }

        while POLLING_ACTIVE.load(Ordering::Relaxed) {
            let scan = tokio::task::spawn_blocking(|| get_current_devices_blocking())
                .await
                .map_err(|e| e.to_string())
                .and_then(|r| r);

            if let Ok(current) = scan {
                let (changed, final_devices) = scan_arduino_and_emit_core(&app_clone, current.clone())
                    .unwrap_or((false, current.clone()));
                if changed {
                    let _ = app_clone.emit("arduino-scan-complete", final_devices);
                }
            }

            tokio::time::sleep(Duration::from_secs(3)).await;
        }

        POLLING_ACTIVE.store(false, Ordering::Relaxed);
    });

    Ok(())
}

#[tauri::command]
pub fn stop_arduino_watcher() -> Result<(), String> {
    if !POLLING_ACTIVE.load(Ordering::Relaxed) {
        return Err("Watcher not running".into());
    }
    POLLING_ACTIVE.store(false, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub async fn scan_arduino_now(app: AppHandle) -> Result<(), String> {
    let current = tokio::task::spawn_blocking(|| get_current_devices_blocking())
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e)?;

    let (_, final_devices) = scan_arduino_and_emit_core(&app, current.clone())?;
    app.emit("arduino-scan-complete", final_devices)
        .map_err(|e| e.to_string())?;
    Ok(())
}


#[tauri::command]
pub async fn start_reading_from_port(
    app: AppHandle,
    port_name: String,
    baud_rate: u32,
) -> Result<(), String> {
    let mut readers = ACTIVE_READERS.lock().map_err(|e| e.to_string())?;
    if readers.contains_key(&port_name) {
        return Err(format!("Already reading from port: {}", port_name));
    }

    let app_clone = app.clone();
    let port_clone = port_name.clone();

    let handle = tauri::async_runtime::spawn(async move {
        // Run the reader loop until it ends (error, disconnect, or manual stop)
        let result = manual_read_loop(app_clone.clone(), port_clone.clone(), baud_rate).await;

        // Clean up: remove from active readers
        if let Ok(mut map) = ACTIVE_READERS.lock() {
            map.remove(&port_clone);
        }

        // Only emit stopped if it wasn't already stopped manually
        let _ = app_clone.emit("arduino-reading-stopped", json!({ "port": &port_clone }));

        // Log any error
        if let Err(e) = result {
            error!("Reader failed for {}: {}", port_clone, e);
            let _ = app_clone.emit("arduino-read-error", json!({
                "port": port_clone,
                "error": e
            }));
        }
    });

    readers.insert(port_name.clone(), handle);
    app.emit("arduino-reading-started", json!({ "port": &port_name }))
        .map_err(|e| e.to_string())?;

    Ok(())
}



#[tauri::command]
pub async fn stop_reading_from_port(
    app: tauri::AppHandle,
    port_name: String,
) -> Result<(), String> {
    let mut readers = ACTIVE_READERS.lock().map_err(|e| e.to_string())?;
    if let Some(handle) = readers.remove(&port_name) {
        handle.abort();
        let _ = app.emit("arduino-reading-stopped", json!({ "port": port_name }));
        Ok(())
    } else {
        Err("Not reading from this port".into())
    }
}