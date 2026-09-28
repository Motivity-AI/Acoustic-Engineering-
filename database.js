/* ============================================================
   Acoustic Engineering
   server/database.js — SQLite Schema & Seeding
   ============================================================ */

"use strict";

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const dataDir = path.join(__dirname, "..", "data");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "acoustic-engineering.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/* ---------------------------------------------------------
   Schema
--------------------------------------------------------- */

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    company TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_uid TEXT UNIQUE,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    project_type TEXT NOT NULL,
    description TEXT,
    width REAL NOT NULL DEFAULT 20,
    length REAL NOT NULL DEFAULT 30,
    height REAL NOT NULL DEFAULT 5,
    area REAL DEFAULT 0,
    volume REAL DEFAULT 0,
    design_mode TEXT DEFAULT 'manual',
    project_data TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS speakers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manufacturer TEXT NOT NULL,
    model TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Point Source',
    rms_power REAL DEFAULT 0,
    peak_power REAL DEFAULT 0,
    max_spl REAL DEFAULT 0,
    sensitivity REAL DEFAULT 0,
    frequency_min REAL DEFAULT 0,
    frequency_max REAL DEFAULT 0,
    horizontal_coverage REAL DEFAULT 90,
    vertical_coverage REAL DEFAULT 60,
    impedance REAL DEFAULT 8,
    weight REAL DEFAULT 0,
    mounting_type TEXT DEFAULT 'Wall / Stand',
    datasheet TEXT,
    image TEXT,
    polar_data TEXT,
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    description TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_project ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity(user_id);
`);

/* ---------------------------------------------------------
   Seed Admin
--------------------------------------------------------- */

function seedAdmin() {
    const adminPhone = "0000000000";
    const exists = db
        .prepare("SELECT id FROM users WHERE phone = ?")
        .get(adminPhone);

    if (!exists) {
        const hash = bcrypt.hashSync("Admin123!", 12);

        db.prepare(`
            INSERT INTO users (name, phone, email, company, password_hash, role)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            "System Administrator",
            adminPhone,
            "admin@acoustic-engineering.local",
            "Acoustic Engineering",
            hash,
            "admin"
        );

        console.log("✓ Admin user seeded (0000000000 / Admin123!)");
    }
}

/* ---------------------------------------------------------
   Seed Speakers
--------------------------------------------------------- */

function seedSpeakers() {
    const count = db
        .prepare("SELECT COUNT(*) AS count FROM speakers")
        .get().count;

    if (count > 0) return;

    const speakers = [
        ["Generic", "Point Source 12", "Point Source",
            500, 1000, 125, 96, 55, 18000, 90, 60, 8, 15, "Stand / Wall"],
        ["Generic", "Point Source 15", "Point Source",
            800, 1600, 128, 98, 50, 18000, 90, 50, 8, 20, "Stand / Wall"],
        ["Generic", "Column Speaker", "Column",
            150, 300, 112, 94, 80, 16000, 120, 30, 8, 8, "Wall"],
        ["Generic", "Ceiling 6W", "Ceiling",
            6, 12, 96, 88, 100, 16000, 90, 90, 8, 1, "Ceiling"],
        ["Generic", "Line Array", "Line Array",
            1000, 2000, 135, 100, 45, 20000, 100, 10, 8, 30, "Fly / Ground"],
        ["Generic", "Subwoofer 18", "Subwoofer",
            1200, 2400, 132, 99, 35, 150, 100, 60, 8, 45, "Ground"]
    ];

    const stmt = db.prepare(`
        INSERT INTO speakers (
            manufacturer, model, category, rms_power, peak_power,
            max_spl, sensitivity, frequency_min, frequency_max,
            horizontal_coverage, vertical_coverage, impedance,
            weight, mounting_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
        speakers.forEach(s => stmt.run(...s));
    });

    tx();
    console.log(`✓ ${speakers.length} speakers seeded`);
}

/* ---------------------------------------------------------
   Initialize
--------------------------------------------------------- */

function initialize() {
    seedAdmin();
    seedSpeakers();
}

initialize();

module.exports = db;