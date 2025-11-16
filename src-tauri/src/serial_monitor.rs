use std::io::{BufRead, BufReader, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::AppHandle;
use serialport::SerialPort;

#[derive(Clone)]
pub struct SerialConnection {
    port: Arc<Mutex<Box<dyn SerialPort>>>,
}

#[tauri::command]
pub fn connect_serial(app: AppHandle, port_name: String, baud_rate: u32) -> Result<(), String> {
    let port = serialport::new(port_name.clone(), baud_rate)
        .timeout(std::time::Duration::from_millis(100))
        .open()
        .map_err(|e| e.to_string())?;

    let reader = BufReader::new(port.try_clone().map_err(|e| e.to_string())?);
    let port_arc = Arc::new(Mutex::new(port));

    // Spawn thread to continuously read serial data
    let app_handle = app.clone();
    thread::spawn(move || {
        for line in reader.lines() {
            if let Ok(data) = line {
                app_handle.emit_all("serial-data", data).unwrap_or_default();
            }
        }
    });

    app.manage(SerialConnection { port: port_arc });
    Ok(())
}

#[tauri::command]
pub fn write_serial(app: AppHandle, message: String) -> Result<(), String> {
    let connection = app.state::<SerialConnection>();
    let mut port = connection.port.lock().unwrap();
    port.write_all(message.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}
