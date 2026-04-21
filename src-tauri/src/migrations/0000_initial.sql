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