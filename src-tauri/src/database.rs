// src/database.rs
use std::{fs, sync::{Arc, Mutex}};
use tauri::{AppHandle, Manager, State};
use tauri::path::BaseDirectory;
use rusqlite::Connection;

#[derive(Clone)]
pub struct Database(pub Arc<Mutex<Connection>>);

fn log_event(conn: &Connection, message: &str) -> Result<(), rusqlite::Error> {
    conn.execute("INSERT INTO event_logs (message) VALUES (?1)", [message])?;
    Ok(())
}

pub fn init_database(app: &AppHandle) -> Result<Connection, Box<dyn std::error::Error>> {
    // Resolve database path
    let base_dir = app.path().resolve("data", BaseDirectory::AppData)?;
    fs::create_dir_all(&base_dir)?;
    let db_path = base_dir.join("app.db");

    // Log the path to the console
    println!("Database path: {:?}", db_path);

    // Check if database already exists
    let db_exists = db_path.exists();

    // Open the connection (SQLite will create the file if missing)
    let conn = Connection::open(&db_path)?;

    // Only create table & log event if database is new
    
    conn.execute_batch(
        "
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admission_no TEXT UNIQUE NOT NULL,
                national_id TEXT,
                firstname TEXT NOT NULL,
                lastname TEXT NOT NULL,
                contact_person TEXT NULL,
                telephone_1 TEXT, 
                telephone_2 TEXT NULL,
                classification TEXT CHECK(classification IN ('inpatient', 'outpatient')),
                doctor TEXT NULL
            );

            CREATE TABLE IF NOT EXISTS admissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admission_no TEXT NOT NULL,
                doctor_in_charge TEXT,
                technician TEXT NULL,
                diabetes_test INTEGER NULL,
                cancer_test TEXT, -- JSON array of floats NULL
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admission_no) REFERENCES patients(admission_no)
                    ON UPDATE CASCADE
                    ON DELETE CASCADE
            );


            CREATE TABLE IF NOT EXISTS event_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vid INTEGER NOT NULL,
                pid INTEGER NOT NULL,
                serial_number TEXT,
                product TEXT,
                custom_name TEXT,
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
            );


            ",
    )?;

    
    if !db_exists {
        log_event(&conn, "Database created and initialized.")?;
    }

    // Log that app connected successfully
    log_event(&conn, "Application has successfully connected to the database.")?;
    
    Ok(conn)
}





#[tauri::command]
pub fn get_logs(db: State<'_, Database>) -> Result<Vec<(String, String)>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT message, timestamp FROM event_logs ORDER BY id DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn log_event_command(db: State<'_, Database>, message: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    log_event(&conn, &message).map_err(|e| e.to_string())?;
    Ok(())
}