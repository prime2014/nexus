use std::{
    fs,
    sync::{Arc, Mutex},
};

use crate::types::UsbDevice;
use serde::Serialize;
use serde_json::Number;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager, Runtime, State};

use log::{error, info, warn};
use rusqlite::{params, Connection};
use rusqlite_migration::{Migrations, M};
use serde::Deserialize;

#[derive(Clone)]
pub struct Database(pub Arc<Mutex<Connection>>);

#[derive(Serialize)]
pub struct GlobalStats {
    pub avg_cancer: f64,
    pub avg_reference: f64,
}

#[derive(serde::Serialize)]
pub struct PatientRecord {
    pub id: i32,
    pub admission_no: String,
    pub national_id: Option<String>,
    pub firstname: String,
    pub lastname: String,
    pub location: Option<String>,
    pub test_type: Option<String>,
    pub contact_person: Option<String>,
    pub telephone_1: Option<String>,
    pub telephone_2: Option<String>,
    pub classification: String,
    pub doctor: Option<String>,
}

#[derive(serde::Serialize, Debug)]
pub struct AppSettings {
    pub theme: String,
    pub baud_rate_default: u32,
    pub auto_connect_enabled: bool,
    pub default_doctor_name: String,
    pub log_level: String,
    pub log_file_location: String,
    pub sqlite_file_path: String,
}

#[derive(serde::Serialize)]
pub struct AdmissionRecord {
    pub admission_id: i32,
    pub admission_no: String,
    pub doctor_in_charge: String,
    pub technician: Option<String>,
    pub diabetes_test: Option<f64>,
    pub reference: String,
    pub cancer_tests: String,
    pub timestamp: String,

    // Patient fields
    pub firstname: String,
    pub lastname: String,
    pub national_id: Option<String>,
    pub classification: String,
    pub patient_doctor: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct AdmissionPayload {
    pub admission_no: String,
    pub doctor_in_charge: String,
    pub technician: Option<String>,
    pub diabetes_test: Option<i32>, // Matches the SQLite INTEGER
    pub reference: String,          // JSON String
    pub cancer_tests: String,       // JSON String
}

/* ----------------------------------------
   LOG EVENT HELPER
----------------------------------------- */

fn log_event(conn: &Connection, message: &str) -> Result<(), rusqlite::Error> {
    conn.execute("INSERT INTO event_logs (message) VALUES (?1)", [message])?;
    Ok(())
}

pub fn init_database(app: &AppHandle) -> Result<Connection, Box<dyn std::error::Error>> {
    let base_dir = app.path().resolve("data", BaseDirectory::AppData)?;
    fs::create_dir_all(&base_dir)?;
    let db_path = base_dir.join("app.db");

    let mut conn = Connection::open(&db_path)?;

    // Define the migrations
    let migrations = Migrations::new(vec![
        // M0: Initial Database Setup
        M::up(
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
                location TEXT NULL,
                test_type TEXT NULL,
                contact_person TEXT,
                telephone_1 TEXT,
                telephone_2 TEXT,
                classification TEXT CHECK(classification IN ('inpatient', 'outpatient')),
                doctor TEXT
            );

            CREATE TABLE IF NOT EXISTS admissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admission_no TEXT NOT NULL,
                doctor_in_charge TEXT NOT NULL,
                technician TEXT,
                diabetes_test INTEGER,
                reference JSON DEFAULT '{}',
                cancer_tests JSON DEFAULT '{}',
                timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
                FOREIGN KEY (admission_no) REFERENCES patients(admission_no)
                    ON UPDATE CASCADE
                    ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS event_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message TEXT NOT NULL,
                timestamp DATETIME DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vid INTEGER NOT NULL,
                pid INTEGER NOT NULL,
                serial_number TEXT,
                product TEXT,
                custom_name TEXT,
                device_unit TEXT,
                last_seen DATETIME DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                default_theme TEXT NOT NULL DEFAULT 'system',
                default_baud_rate INTEGER NOT NULL DEFAULT 9600,
                auto_connect_enabled BOOLEAN NOT NULL DEFAULT 1,
                default_doctor_name TEXT NULL,
                default_log_level TEXT NULL DEFAULT 'info',
                log_file_location TEXT NULL,
                sqlite_file_path TEXT NULL,
                setup_complete BOOLEAN NOT NULL DEFAULT 0
                CHECK(id = 1) 
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_device_hardware 
                ON devices (vid, pid, serial_number);

            CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_custom_name 
                ON devices (custom_name) WHERE custom_name IS NOT NULL AND custom_name != '';
        ",
        ),
    ]);

    // Apply migrations to bring the database to the latest version
    migrations.to_latest(&mut conn)?;

    // Performance and safety pragmas
    conn.execute_batch(
        "
        PRAGMA journal_mode = WAL; 
        PRAGMA synchronous = NORMAL; 
        PRAGMA foreign_keys = ON;
    ",
    )?;

    log_event(
        &conn,
        "Application successfully connected and migrated database.",
    )?;

    Ok(conn)
}

/* ----------------------------------------
   STRUCTS FOR COMMAND INPUT
----------------------------------------- */

#[derive(Deserialize, serde::Serialize)]
pub struct PatientData {
    pub admission_no: String,
    pub national_id: Option<String>,
    pub firstname: String,
    pub lastname: String,
    pub contact_person: Option<String>,
    pub test_type: Option<String>,
    pub location: Option<String>,
    pub telephone_1: Option<String>,
    pub telephone_2: Option<String>,
    pub classification: String,
    pub doctor_in_charge: Option<String>,
    pub diabetes_test: Option<Number>,
    pub cancer_test: Option<CancerTest>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct CancerTest {
    pub voltage_off: Vec<f64>,
}

#[derive(Deserialize)]
pub struct AdmissionData {
    pub admission_no: String,
    pub doctor_in_charge: String,
    pub technician: Option<String>,
    pub diabetes_test: Option<i32>,

    // IMPORTANT: JSON string
    pub reference: String,
    pub cancer_tests: String,
}

/* ----------------------------------------
   SAVE PATIENT
----------------------------------------- */

#[tauri::command]
pub fn save_patient(db: State<'_, Database>, data: PatientData) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "
        INSERT INTO patients (
            admission_no, national_id, firstname, lastname,
            contact_person, telephone_1, telephone_2,
            classification, doctor
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        ON CONFLICT(admission_no) DO UPDATE SET
            national_id = excluded.national_id,
            firstname = excluded.firstname,
            lastname = excluded.lastname,
            contact_person = excluded.contact_person,
            telephone_1 = excluded.telephone_1,
            telephone_2 = excluded.telephone_2,
            classification = excluded.classification,
            doctor = excluded.doctor;
        ",
        params![
            data.admission_no,
            data.national_id,
            data.firstname,
            data.lastname,
            data.contact_person,
            data.telephone_1,
            data.telephone_2,
            data.classification,
            data.doctor_in_charge
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/* ----------------------------------------
   SAVE ADMISSION
----------------------------------------- */

// #[tauri::command]
// pub fn save_admission(db: State<'_, Database>, data: AdmissionData) -> Result<(), String> {
//     let conn = db.0.lock().map_err(|e| e.to_string())?;

//     conn.execute(
//         "
//         INSERT INTO admissions (
//             admission_no,
//             doctor_in_charge,
//             technician,
//             diabetes_test,
//             reference,          /* <--- NEW: Insert the reference column */
//             cancer_tests
//         )
//         VALUES (?1, ?2, ?3, ?4, ?5, ?6) /* <--- NEW: Added one parameter slot */
//         ",
//         params![
//             data.admission_no,
//             data.doctor_in_charge,
//             data.technician,
//             data.diabetes_test,
//             data.reference,     /* <--- NEW: Map data.reference to ?5 */
//             data.cancer_tests,  // <- Now mapped to ?6
//         ],
//     )
//     .map_err(|e| e.to_string())?;

//     Ok(())
// }

#[tauri::command]
pub async fn save_admission(db: State<'_, Database>, data: AdmissionPayload) -> Result<(), String> {
    // Get database connection from the Mutex inside your Database state
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO admissions (
            admission_no, 
            doctor_in_charge, 
            technician, 
            diabetes_test, 
            reference, 
            cancer_tests
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (
            &data.admission_no,
            &data.doctor_in_charge,
            &data.technician,
            &data.diabetes_test,
            &data.reference,
            &data.cancer_tests,
        ),
    )
    .map_err(|e| format!("Database Error: {}", e))?;

    Ok(())
}

/* ----------------------------------------
   LOG QUERIES
----------------------------------------- */

#[tauri::command]
pub fn get_logs(db: State<'_, Database>) -> Result<Vec<(String, String)>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT message, timestamp FROM event_logs ORDER BY id DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub fn log_event_command(db: State<'_, Database>, message: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    log_event(&conn, &message).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_patient_with_admission(
    db: State<'_, Database>,
    data: PatientData,
) -> Result<(), String> {
    println!("=== save_patient_with_admission CALLED ===");
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    // --- 1. Upsert patient ---
    conn.execute(
        "
        INSERT INTO patients (
            admission_no, national_id, firstname, lastname,
            contact_person, telephone_1, telephone_2,
            classification, doctor
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        ON CONFLICT(admission_no) DO UPDATE SET
            national_id = excluded.national_id,
            firstname = excluded.firstname,
            lastname = excluded.lastname,
            contact_person = excluded.contact_person,
            telephone_1 = excluded.telephone_1,
            telephone_2 = excluded.telephone_2,
            classification = excluded.classification,
            doctor = excluded.doctor;
        ",
        params![
            data.admission_no,
            data.national_id,
            data.firstname,
            data.lastname,
            data.contact_person,
            data.telephone_1,
            data.telephone_2,
            data.classification,
            data.doctor_in_charge
        ],
    )
    .map_err(|e| e.to_string())?;

    // --- 2. Serialize cancer_test to JSON ---
    let cancer_json = match &data.cancer_test {
        Some(ct) => serde_json::to_string(ct).map_err(|e| e.to_string())?,
        None => "{}".to_string(),
    };

    // --- 3. Convert diabetes_test to f64 for SQLite ---
    let diabetes_value: Option<f64> = data
        .diabetes_test
        .as_ref()
        .map(|n| n.as_f64().unwrap_or(0.0));

    // --- 4. Insert a new admission ---
    conn.execute(
        "
        INSERT INTO admissions (
            admission_no,
            doctor_in_charge,
            cancer_tests,
            diabetes_test
        )
        VALUES (?1, ?2, ?3, ?4)
        ",
        params![
            data.admission_no,
            data.doctor_in_charge,
            cancer_json,
            diabetes_value
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_all_patients(db: State<'_, Database>) -> Result<Vec<PatientRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "
            SELECT
                id, admission_no, national_id, firstname, lastname, test_type, location,
                contact_person, telephone_1, telephone_2,
                classification, doctor
            FROM patients
            ORDER BY id DESC
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(PatientRecord {
                id: row.get(0)?,
                admission_no: row.get(1)?,
                national_id: row.get(2)?,
                firstname: row.get(3)?,
                lastname: row.get(4)?,
                test_type: row.get(5)?,
                location: row.get(6)?,
                contact_person: row.get(7)?,
                telephone_1: row.get(8)?,
                telephone_2: row.get(9)?,
                classification: row.get(10)?,
                doctor: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub fn search_patients(
    db: State<'_, Database>,
    query: String,
) -> Result<Vec<PatientRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let like = format!("%{}%", query);

    let mut stmt = conn
        .prepare(
            "
            SELECT
                id, admission_no, national_id, firstname, lastname, test_type, location,
                contact_person, telephone_1, telephone_2,
                classification, doctor
            FROM patients
            WHERE
                admission_no LIKE ?1
                OR national_id LIKE ?1
                OR firstname LIKE ?1
                OR lastname LIKE ?1
            ORDER BY lastname ASC, firstname ASC
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([like], |row| {
            Ok(PatientRecord {
                id: row.get(0)?,
                admission_no: row.get(1)?,
                national_id: row.get(2)?,
                firstname: row.get(3)?,
                lastname: row.get(4)?,
                test_type: row.get(5)?,
                location: row.get(6)?,
                contact_person: row.get(7)?,
                telephone_1: row.get(8)?,
                telephone_2: row.get(9)?,
                classification: row.get(10)?,
                doctor: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub fn search_admissions_by_patient(
    db: State<'_, Database>,
    query: String,
    limit: u32,  // New parameter
    offset: u32, // New parameter
) -> Result<Vec<AdmissionRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let like = format!("%{}%", query);

    let mut stmt = conn
        .prepare(
            "
            SELECT 
                a.id, a.admission_no, a.doctor_in_charge, a.technician, 
                a.diabetes_test, a.reference, a.cancer_tests, a.timestamp,
                p.firstname, p.lastname, p.national_id, p.classification, p.doctor
            FROM admissions a
            INNER JOIN patients p ON a.admission_no = p.admission_no
            WHERE p.firstname LIKE ?1 OR p.lastname LIKE ?1 
               OR p.admission_no LIKE ?1 OR p.national_id LIKE ?1
            ORDER BY a.timestamp DESC
            LIMIT ?2 OFFSET ?3 -- Added Pagination
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([like, limit.to_string(), offset.to_string()], |row| {
            // ... (keep existing struct mapping)
            Ok(AdmissionRecord {
                admission_id: row.get(0)?,
                admission_no: row.get(1)?,
                doctor_in_charge: row.get(2)?,
                technician: row.get(3)?,
                diabetes_test: row.get(4)?,
                reference: row.get(5)?,
                cancer_tests: row.get(6)?,
                timestamp: row.get(7)?,
                firstname: row.get(8)?,
                lastname: row.get(9)?,
                national_id: row.get(10)?,
                classification: row.get(11)?,
                patient_doctor: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub fn get_admissions_count(db: State<'_, Database>, query: String) -> Result<u32, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let like = format!("%{}%", query);

    let count: u32 = conn
        .query_row(
            "SELECT COUNT(*) 
         FROM admissions a
         INNER JOIN patients p ON a.admission_no = p.admission_no
         WHERE p.firstname LIKE ?1 OR p.lastname LIKE ?1 
            OR p.admission_no LIKE ?1 OR p.national_id LIKE ?1",
            [like],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(count)
}

#[tauri::command]
// src/database.rs (FINAL MODIFIED COMMAND)

pub fn update_device_alias(
    db: State<'_, Database>,
    port_name: String,
    product: String,
    vid: i32,
    pid: i32,
    serial_number: Option<String>,
    new_alias: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    // Check if the alias is set to an empty string.
    // If so, we set the custom_name to NULL to let the partial index ignore it.
    let alias_to_save: Option<&str> = if new_alias.trim().is_empty() {
        None
    } else {
        Some(&new_alias)
    };

    let result = conn.execute(
        "
        INSERT INTO devices (
            product, vid, pid, serial_number, custom_name  -- 👈 PORT COLUMN REMOVED HERE
        ) 
        VALUES (
            ?1, ?2, ?3, ?4, ?5
        )
        -- Conflict Resolution uses the unique index on hardware identifiers
        ON CONFLICT(vid, pid, serial_number) DO UPDATE SET
            custom_name = excluded.custom_name,
            product = excluded.product,
            last_seen = CURRENT_TIMESTAMP;
        ",
        params![product, vid, pid, serial_number, alias_to_save,],
    );

    // --- Error Handling Remains the Same ---
    match result {
        Ok(_) => {
            log_event(
                &conn,
                &format!(
                    "Updated alias for device (VID:{}, PID:{}, SN:{}) to '{}'. Current port: {}",
                    vid,
                    pid,
                    serial_number.as_deref().unwrap_or("None"),
                    new_alias,
                    port_name
                ),
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(e) => {
            if e.to_string()
                .contains("UNIQUE constraint failed: devices.custom_name")
            {
                return Err(format!("The name '{}' is already in use by another device. Please choose a unique name.", new_alias));
            }
            log_event(
                &conn,
                &format!("Database error during device alias update: {}", e),
            )
            .unwrap_or_default();
            Err(e.to_string())
        }
    }
}

#[tauri::command]
// 🛑 CRITICAL FIX: Use the 'static lifetime to ensure type consistency across the production build.
pub fn fetch_all_known_devices<R: Runtime>(
    db: State<Database>,
    _app: AppHandle<R>,
) -> Result<Vec<UsbDevice>, String> {
    // New log added to confirm if the function is even entered
    info!("COMMAND INVOKED: fetch_all_known_devices. Attempting to acquire DB lock.");

    let conn = match db.0.lock() {
        Ok(guard) => {
            info!("DB Lock acquired successfully.");
            guard
        }
        Err(e) => {
            error!("Failed to acquire DB lock: {}", e);
            // This return should only happen if the lock fails, NOT if the state isn't managed.
            return Err(format!("Database Lock Error: {}", e.to_string()));
        }
    };

    info!("Preparing SQL statement to fetch devices.");

    let mut stmt = conn
        .prepare(
            "
        SELECT vid, pid, serial_number, product, custom_name, device_unit
        FROM devices
        ORDER BY last_seen DESC;
        ",
        )
        .map_err(|e| {
            error!("Failed to prepare SQL statement: {}", e);
            e.to_string()
        })?;

    info!("Executing query to map device results.");

    let device_iter = stmt
        .query_map(params![], |row| {
            Ok(UsbDevice {
                // ... (device field mapping remains the same)
                port: "N/A".to_string(),
                status: "disconnected".to_string(),
                vid: row.get(0)?,
                pid: row.get(1)?,
                serial_number: row.get(2)?,
                product: row.get(3)?,
                custom_name: row.get(4)?,
                device_unit: row.get(5)?,
                board_name: row.get(3).unwrap_or("N/A".to_string()),
            })
        })
        .map_err(|e| {
            error!("Failed during query mapping: {}", e);
            e.to_string()
        })?;

    info!("Collecting device results into Vec<UsbDevice>.");

    let devices: Result<Vec<UsbDevice>, rusqlite::Error> = device_iter.collect();

    match devices {
        Ok(d) => {
            info!("Successfully fetched {} known devices.", d.len());
            Ok(d)
        }
        Err(e) => {
            error!("Failed to collect final device list: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn get_patient_count(db: State<'_, Database>) -> Result<i32, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let count: i32 = conn
        .query_row("SELECT COUNT(id) FROM patients", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    Ok(count)
}

// src/database.rs

// ... (PatientRecord struct and other commands) ...

#[tauri::command]
pub fn get_patient_by_admission_no(
    db: State<'_, Database>,
    admission_no: String,
) -> Result<PatientRecord, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    conn.query_row(
        "
        SELECT 
            id, admission_no, national_id, firstname, lastname, test_type, location,
            contact_person, telephone_1, telephone_2, 
            classification, doctor
        FROM patients 
        WHERE admission_no = ?1
        ",
        params![admission_no],
        |row| {
            Ok(PatientRecord {
                id: row.get(0)?,
                admission_no: row.get(1)?,
                national_id: row.get(2)?,
                firstname: row.get(3)?,
                lastname: row.get(4)?,
                test_type: row.get(5)?,
                location: row.get(6)?,
                contact_person: row.get(7)?,
                telephone_1: row.get(8)?,
                telephone_2: row.get(9)?,
                classification: row.get(10)?,
                doctor: row.get(11)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

// src/database.rs

// ... (other commands) ...

#[tauri::command]
pub fn delete_patient_by_admission_no(
    db: State<'_, Database>,
    admission_no: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let count = conn
        .execute(
            "DELETE FROM patients WHERE admission_no = ?1",
            params![admission_no],
        )
        .map_err(|e| e.to_string())?;

    if count == 0 {
        return Err(format!(
            "No patient found with admission number: {}",
            admission_no
        ));
    }

    log_event(
        &conn,
        &format!(
            "Deleted patient and all associated admissions for admission_no: {}",
            admission_no
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn update_patient_data(db: State<'_, Database>, data: PatientData) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let result = conn
        .execute(
            "
        UPDATE patients SET
            national_id = ?2,
            firstname = ?3,
            lastname = ?4,
            location = ?5,
            test_type = ?6,
            contact_person = ?7,
            telephone_1 = ?8,
            telephone_2 = ?9,
            classification = ?10,
            doctor = ?11
        WHERE admission_no = ?1;
        ",
            params![
                data.admission_no,
                data.national_id,
                data.firstname,
                data.lastname,
                data.location,
                data.test_type,
                data.contact_person,
                data.telephone_1,
                data.telephone_2,
                data.classification,
                data.doctor_in_charge
            ],
        )
        .map_err(|e| e.to_string())?;

    if result == 0 {
        return Err(format!(
            "Patient with admission number '{}' not found for update.",
            data.admission_no
        ));
    }

    log_event(
        &conn,
        &format!(
            "Updated patient metadata for admission_no: {}",
            data.admission_no
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

// In src/database.rs

#[tauri::command]
pub fn upsert_patient_metadata(db: State<'_, Database>, data: PatientData) -> Result<(), String> {
    // 🚨 UNIQUE DEBUG LOG

    let conn = db.0.lock().map_err(|e| e.to_string())?;

    // --- 1. Upsert patient (This is the only necessary step) ---
    let result = conn.execute(
        "
        INSERT INTO patients (
            admission_no, national_id, firstname, lastname,
            contact_person, telephone_1, telephone_2,
            classification, doctor
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        ON CONFLICT(admission_no) DO UPDATE SET
            national_id = excluded.national_id,
            firstname = excluded.firstname,
            lastname = excluded.lastname,
            contact_person = excluded.contact_person,
            telephone_1 = excluded.telephone_1,
            telephone_2 = excluded.telephone_2,
            classification = excluded.classification,
            doctor = excluded.doctor;
        ",
        params![
            data.admission_no,
            data.national_id,
            data.firstname,
            data.lastname,
            data.contact_person,
            data.telephone_1,
            data.telephone_2,
            data.classification,
            data.doctor_in_charge // Maps to the 'doctor' column in the patients table
        ],
    );

    // Check for SQL errors
    result.map_err(|e| e.to_string())?;

    // Admission creation logic is explicitly omitted here.

    Ok(())
}

#[tauri::command]
pub fn create_patient(db: State<'_, Database>, data: PatientData) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let result = conn.execute(
        "
        INSERT INTO patients (
            admission_no,
            national_id,
            firstname,
            lastname,
            test_type,
            location,
            contact_person,
            telephone_1,
            telephone_2,
            classification,
            doctor
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        ",
        params![
            data.admission_no,
            data.national_id,
            data.firstname,
            data.lastname,
            data.test_type,
            data.location,
            data.contact_person,
            data.telephone_1,
            data.telephone_2,
            data.classification,
            data.doctor_in_charge
        ],
    );

    match result {
        Ok(_) => {
            log_event(
                &conn,
                &format!(
                    "Created new patient with admission_no '{}'",
                    data.admission_no
                ),
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(e) => {
            if e.to_string()
                .contains("UNIQUE constraint failed: patients.admission_no")
            {
                Err("Patient with this admission number already exists.".into())
            } else {
                Err(e.to_string())
            }
        }
    }
}

// #[tauri::command]
// pub fn get_app_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
//     use tauri::path::BaseDirectory;

//     let db_path = app
//         .path()
//         .resolve("data", BaseDirectory::AppData)
//         .map_err(|e| e.to_string())?
//         .join("app.db");

//     log::info!("Opening database at: {:?}", db_path);

//     if !db_path.exists() {
//         log::warn!("Database file does not exist yet - returning defaults");
//         return Ok(default_settings());
//     }

//     let conn = rusqlite::Connection::open(&db_path)
//         .map_err(|e| format!("Failed to open database: {}", e))?;

//     let test: i32 = conn
//         .query_row("SELECT 1", [], |row| row.get(0))
//         .map_err(|e| format!("Connection test failed: {}", e))?;

//     log::info!("Database connection successful (test query returned {})", test);

//     match conn.query_row(
//             "SELECT
//                 default_theme,
//                 default_baud_rate,
//                 auto_connect_enabled,
//                 default_doctor_name,
//                 default_log_level,
//                 log_file_location,
//                 sqlite_file_path
//                 FROM settings WHERE id = 1",
//         [],
//         |row| Ok(AppSettings {
//             theme: row.get(0)?,
//             baud_rate_default: row.get::<_, i32>(1)? as u32,
//             auto_connect_enabled: row.get::<_, i32>(2)? == 1,
//             default_doctor_name: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
//             log_level: row.get::<_, Option<String>>(4)?.unwrap_or_else(|| "info".to_string()),
//             log_file_location: row.get::<_, Option<String>>(5)?.unwrap_or_default(),
//             sqlite_file_path: row.get::<_, Option<String>>(6)?.unwrap_or_default(),
//         }),
//     ) {
//         Ok(settings) => {
//             log::info!("Settings loaded successfully from database");
//             Ok(settings)
//         }
//         Err(rusqlite::Error::QueryReturnedNoRows) => {
//             log::info!("No settings row found - returning defaults");
//             Ok(default_settings())
//         }
//         Err(e) => Err(format!("Database error: {}", e)),
//     }
// }

#[tauri::command]
pub fn get_app_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    use tauri::path::BaseDirectory;

    let db_path = app
        .path()
        .resolve("data", BaseDirectory::AppData)
        .map_err(|e| e.to_string())?
        .join("app.db");

    log::info!("Opening database at: {:?}", db_path);

    if !db_path.exists() {
        log::warn!("Database file does not exist yet - returning defaults");
        return Ok(default_settings());
    }

    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // Test connection
    conn.query_row("SELECT 1", [], |_| Ok(()))
        .map_err(|e| format!("Connection test failed: {}", e))?;

    log::info!("Database connection successful");

    // Now safely query the settings row
    let result = conn.query_row(
        "SELECT 
            default_theme,
            default_baud_rate,
            auto_connect_enabled,
            default_doctor_name,
            default_log_level,
            log_file_location,
            sqlite_file_path
         FROM settings 
         WHERE id = 1",
        [],
        |row| {
            let baud_rate: i64 = row.get(1)?; // Use i64 to safely handle large values
            Ok(AppSettings {
                theme: row.get(0)?,
                baud_rate_default: baud_rate as u32, // Safe cast after successful get
                auto_connect_enabled: row.get::<_, i64>(2)? == 1,
                default_doctor_name: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                log_level: row
                    .get::<_, Option<String>>(4)?
                    .unwrap_or("info".to_string()),
                log_file_location: row.get::<_, Option<String>>(5)?.unwrap_or_default(),
                sqlite_file_path: row.get::<_, Option<String>>(6)?.unwrap_or_default(),
            })
        },
    );

    match result {
        Ok(settings) => {
            log::info!("Settings loaded successfully from database");
            Ok(settings)
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            log::info!("No settings row found - returning defaults");
            Ok(default_settings())
        }
        Err(e) => Err(format!("Database error while loading settings: {}", e)),
    }
}

fn default_settings() -> AppSettings {
    AppSettings {
        theme: "system".to_string(),
        baud_rate_default: 9600,
        auto_connect_enabled: true,
        default_doctor_name: "".to_string(),
        log_level: "info".to_string(),
        log_file_location: "".to_string(),
        sqlite_file_path: "".to_string(),
    }
}

#[tauri::command]
pub fn get_global_admission_stats(
    db: State<'_, Database>,
    query: String,
) -> Result<GlobalStats, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let like = format!("%{}%", query);

    // We use SQLite's json_each to parse the "voltage_off" array inside the JSON strings
    // and calculate the average across ALL matching rows.
    let stats = conn.query_row(
        "SELECT 
            AVG(cancer_avg) as global_cancer,
            AVG(ref_avg) as global_ref
         FROM (
            SELECT 
                (SELECT AVG(value) FROM json_each(json_extract(a.cancer_tests, '$.voltage_off'))) as cancer_avg,
                (SELECT AVG(value) FROM json_each(json_extract(a.reference, '$.voltage_off'))) as ref_avg
            FROM admissions a
            INNER JOIN patients p ON a.admission_no = p.admission_no
            WHERE p.firstname LIKE ?1 OR p.lastname LIKE ?1 
               OR p.admission_no LIKE ?1 OR p.national_id LIKE ?1
         )",
        [like],
        |row| {
            Ok(GlobalStats {
                avg_cancer: row.get::<_, Option<f64>>(0)?.unwrap_or(0.0),
                avg_reference: row.get::<_, Option<f64>>(1)?.unwrap_or(0.0),
            })
        },
    ).map_err(|e| e.to_string())?;

    Ok(stats)
}

#[tauri::command]
pub fn get_latest_5_admissions(
    db: State<'_, Database>,
    query: String,
) -> Result<Vec<AdmissionRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let like = format!("%{}%", query);

    let mut stmt = conn
        .prepare(
            "SELECT a.*, p.firstname, p.lastname, p.national_id, p.classification, p.doctor
         FROM admissions a
         INNER JOIN patients p ON a.admission_no = p.admission_no
         WHERE p.firstname LIKE ?1 OR p.lastname LIKE ?1 
            OR p.admission_no LIKE ?1 OR p.national_id LIKE ?1
         ORDER BY a.timestamp DESC
         LIMIT 5",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([like], |row| {
            Ok(AdmissionRecord {
                admission_id: row.get("id")?,
                admission_no: row.get("admission_no")?,
                national_id: row.get("national_id")?,
                classification: row.get("classification")?,
                patient_doctor: row.get("doctor")?,
                doctor_in_charge: row.get("doctor")?,
                technician: row.get("technician")?,
                diabetes_test: row.get("diabetes_test")?,
                reference: row.get("reference")?,
                cancer_tests: row.get("cancer_tests")?,
                timestamp: row.get("timestamp")?,
                firstname: row.get("firstname")?,
                lastname: row.get("lastname")?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        // Convert the rusqlite::Error to String before using '?'
        results.push(row.map_err(|e| e.to_string())?);
    }

    Ok(results)
}
