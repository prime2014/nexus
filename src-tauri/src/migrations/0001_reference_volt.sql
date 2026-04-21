CREATE TABLE IF NOT EXISTS global_references (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Ensures only one row exists
    voltage REAL NOT NULL,
    technician TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)