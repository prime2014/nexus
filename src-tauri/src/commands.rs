// src-tauri/src/commands.rs
use tauri::{AppHandle, Manager};
use serialport::{available_ports, SerialPortType, UsbPortInfo};
use crate::types::UsbDevice;

#[tauri::command]
pub async fn scan_arduino_now(app: AppHandle) -> Result<(), String> {
    // -----------------------------------------------------------------
    // 1. Enumerate **all** serial ports
    // -----------------------------------------------------------------
    let ports = available_ports().map_err(|e| e.to_string())?;

    // -----------------------------------------------------------------
    // 2. Keep only USB ports and turn them into a nice struct
    // -----------------------------------------------------------------
    let devices: Vec<UsbDevice> = ports
        .into_iter()
        .filter_map(|p| {
            if let SerialPortType::UsbPort(UsbPortInfo {
                vid,
                pid,
                product,
                ..
            }) = p.port_type
            {
                // Build a printable line for the terminal (optional)
                let printable = format!(
                    "{} (0x{:04X}:0x{:04X})",
                    product.as_deref().unwrap_or(&p.port_name),
                    vid,
                    pid
                );
                println!("Detected USB device: {}", printable);

                Some(UsbDevice {
                    port: p.port_name,
                    vid,
                    pid,
                    product,
                })
            } else {
                None
            }
        })
        .collect();

    println!("Total USB devices found: {}", devices.len());

    // -----------------------------------------------------------------
    // 3. **Emit** the payload to the frontend
    // -----------------------------------------------------------------
    app.emit_all("arduino-scan-complete", devices)
        .map_err(|e| e.to_string())?;

    Ok(())
}