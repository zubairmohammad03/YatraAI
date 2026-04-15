const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'yatraai.db');

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      short_name TEXT NOT NULL UNIQUE,
      brand_color TEXT DEFAULT '#FF6B00',
      phone      TEXT,
      whatsapp   TEXT,
      plan       TEXT DEFAULT 'starter',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id     INTEGER NOT NULL,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT DEFAULT 'staff',
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id    INTEGER NOT NULL,
      type         TEXT NOT NULL,
      registration TEXT NOT NULL,
      capacity     INTEGER DEFAULT 4,
      status       TEXT DEFAULT 'available',
      rate_per_day REAL DEFAULT 0,
      rate_per_km  REAL DEFAULT 0,
      rate_airport REAL DEFAULT 0,
      rate_hourly  REAL DEFAULT 0,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id      INTEGER NOT NULL,
      booking_ref    TEXT NOT NULL UNIQUE,
      customer_name  TEXT NOT NULL,
      customer_phone TEXT,
      pickup         TEXT,
      dropoff        TEXT,
      vehicle_id     INTEGER,
      start_date     TEXT,
      end_date       TEXT,
      amount         REAL DEFAULT 0,
      status         TEXT DEFAULT 'pending',
      source         TEXT DEFAULT 'manual',
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id   INTEGER NOT NULL,
      name        TEXT NOT NULL,
      phone       TEXT,
      city        TEXT,
      total_trips INTEGER DEFAULT 0,
      total_spend REAL DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS tour_packages (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id     INTEGER NOT NULL,
      name          TEXT NOT NULL,
      description   TEXT,
      duration_days INTEGER DEFAULT 1,
      price         REAL DEFAULT 0,
      inclusions    TEXT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS call_sessions (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id        INTEGER NOT NULL,
      caller_number    TEXT,
      transcript       TEXT,
      extracted_intent TEXT,
      outcome          TEXT,
      duration_secs    INTEGER DEFAULT 0,
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS agent_config (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id          INTEGER NOT NULL UNIQUE,
      agent_name         TEXT DEFAULT 'Yatra',
      voice              TEXT DEFAULT 'female',
      languages          TEXT DEFAULT 'Hindi,English',
      greeting           TEXT DEFAULT 'Namaste! Main aapki yatra mein madad kar sakta hoon.',
      auto_confirm_below REAL DEFAULT 5000,
      created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );
  `);

  console.log('Database migrations completed.');
}

runMigrations();

module.exports = db;
