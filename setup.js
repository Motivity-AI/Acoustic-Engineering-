#!/usr/bin/env node
/* ============================================================
   Acoustic Engineering — Project Builder
   يبني المشروع كاملاً وينشئ ZIP تلقائياً
   Usage: node setup.js
   ============================================================ */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = "acoustic-engineering";

/* ----------------------------------------------------------
   Utilities
---------------------------------------------------------- */

function write(relPath, content) {
    const full = path.join(ROOT, relPath);
    const dir = path.dirname(full);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(full, content, "utf8");
    console.log(`  ✔ ${relPath}`);
}

function section(title) {
    console.log(`\n  ── ${title} ──`);
}

/* ----------------------------------------------------------
   Start
---------------------------------------------------------- */

console.log("\n╔══════════════════════════════════════════════╗");
console.log("║  ACOUSTIC ENGINEERING — PROJECT BUILDER      ║");
console.log("╚══════════════════════════════════════════════╝");

if (fs.existsSync(ROOT)) {
    console.log(`\n  ⚠  المجلد "${ROOT}" موجود — سيتم الحذف وإعادة الإنشاء`);
    fs.rmSync(ROOT, { recursive: true, force: true });
}

fs.mkdirSync(ROOT, { recursive: true });

/* ==========================================================
   1. package.json
========================================================== */
section("package.json");

write("package.json", JSON.stringify({
    name: "acoustic-engineering",
    version: "1.0.0",
    description: "Intelligent Acoustic & Sound System Design Platform",
    main: "server.js",
    scripts: {
        start: "node server.js",
        dev: "nodemon server.js"
    },
    dependencies: {
        "bcryptjs": "^2.4.3",
        "better-sqlite3": "^11.3.0",
        "cookie-parser": "^1.4.6",
        "cors": "^2.8.5",
        "dotenv": "^16.4.5",
        "express": "^4.21.0",
        "express-rate-limit": "^7.4.0",
        "jsonwebtoken": "^9.0.2",
        "multer": "^1.4.5-lts.1",
        "pdfkit": "^0.15.0"
    },
    devDependencies: {
        "nodemon": "^3.1.7"
    },
    engines: { node: ">=18.0.0" }
}, null, 2));

/* ==========================================================
   2. .env.example
========================================================== */
section(".env");

write(".env.example", `PORT=3000
NODE_ENV=production
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d
COOKIE_SECRET=another_long_random_string
DB_PATH=./db/acoustic.db
UPLOAD_DIR=./uploads
REPORT_DIR=./reports
MAX_FILE_SIZE_MB=20
ADMIN_PHONE=0900000000
ADMIN_PASSWORD=Admin@12345
ADMIN_NAME=System Administrator
`);

/* ==========================================================
   3. .gitignore
========================================================== */
section(".gitignore");

write(".gitignore", `node_modules/
.env
*.db
*.db-wal
*.db-shm
uploads/*
reports/*
!uploads/.gitkeep
!reports/.gitkeep
.DS_Store
`);

write("uploads/.gitkeep", "");
write("reports/.gitkeep", "");

/* ==========================================================
   4. server.js
========================================================== */
section("server.js");

write("server.js", `require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");

const { initDatabase } = require("./db/database");
const { errorHandler, notFound } = require("./utils/errors");

const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const speakerRoutes = require("./routes/speakers");
const analysisRoutes = require("./routes/analysis");
const reportRoutes = require("./routes/reports");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

[process.env.UPLOAD_DIR || "./uploads", process.env.REPORT_DIR || "./reports"]
    .forEach(dir => {
        const abs = path.resolve(dir);
        if (!fs.existsSync(abs)) fs.mkdirSync(abs, { recursive: true });
    });

initDatabase();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cookieParser(process.env.COOKIE_SECRET || "acoustic-cookie"));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, message: "تم تجاوز عدد المحاولات. حاول لاحقاً." }
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use("/uploads", express.static(path.resolve(process.env.UPLOAD_DIR || "./uploads")));
app.use("/reports", express.static(path.resolve(process.env.REPORT_DIR || "./reports")));
app.use(express.static(path.resolve(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/speakers", speakerRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        service: "Acoustic Engineering API",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    const indexFile = path.resolve(__dirname, "public", "index.html");
    if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
    res.status(404).send("Not Found");
});

app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
    console.log("");
    console.log("  ╔════════════════════════════════════════════╗");
    console.log("  ║   ACOUSTIC ENGINEERING — Backend Server    ║");
    console.log("  ╚════════════════════════════════════════════╝");
    console.log(\`  ▸ Environment : \${process.env.NODE_ENV || "development"}\`);
    console.log(\`  ▸ Port        : \${PORT}\`);
    console.log(\`  ▸ URL         : http://localhost:\${PORT}\`);
    console.log("");
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));

module.exports = app;
`);

/* ==========================================================
   5. db/database.js
========================================================== */
section("db/database.js");

write("db/database.js", `const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

let db = null;

function getDatabasePath() {
    const p = process.env.DB_PATH || "./db/acoustic.db";
    const abs = path.resolve(p);
    const dir = path.dirname(abs);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return abs;
}

function getDB() {
    if (!db) {
        db = new Database(getDatabasePath());
        db.pragma("journal_mode = WAL");
        db.pragma("foreign_keys = ON");
    }
    return db;
}

function initDatabase() {
    const database = getDB();

    database.exec(\`
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT    NOT NULL,
            phone         TEXT    NOT NULL UNIQUE,
            email         TEXT,
            company       TEXT,
            password_hash TEXT    NOT NULL,
            role          TEXT    NOT NULL DEFAULT 'user',
            created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

        CREATE TABLE IF NOT EXISTS projects (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL,
            name          TEXT    NOT NULL,
            project_type  TEXT    NOT NULL DEFAULT 'custom',
            description   TEXT,
            width         REAL    NOT NULL DEFAULT 20,
            length        REAL    NOT NULL DEFAULT 30,
            height        REAL    NOT NULL DEFAULT 6,
            area          REAL    NOT NULL DEFAULT 600,
            volume        REAL    NOT NULL DEFAULT 3600,
            design_mode   TEXT    NOT NULL DEFAULT 'manual',
            project_data  TEXT    NOT NULL DEFAULT '{}',
            created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

        CREATE TABLE IF NOT EXISTS speakers (
            id                   INTEGER PRIMARY KEY AUTOINCREMENT,
            manufacturer         TEXT    NOT NULL,
            model                TEXT    NOT NULL,
            category             TEXT    NOT NULL DEFAULT 'Point Source',
            rms_power            REAL    DEFAULT 0,
            peak_power           REAL    DEFAULT 0,
            max_spl              REAL    DEFAULT 0,
            sensitivity          REAL    DEFAULT 0,
            frequency_min        REAL    DEFAULT 0,
            frequency_max        REAL    DEFAULT 0,
            horizontal_coverage  REAL    DEFAULT 90,
            vertical_coverage    REAL    DEFAULT 60,
            impedance            REAL    DEFAULT 8,
            weight               REAL    DEFAULT 0,
            mounting_type        TEXT,
            datasheet_path       TEXT,
            created_by           INTEGER,
            created_at           TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS reports (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id    INTEGER NOT NULL,
            user_id       INTEGER NOT NULL,
            file_path     TEXT    NOT NULL,
            file_name     TEXT    NOT NULL,
            created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_reports_project ON reports(project_id);
    \`);

    const owner = database.prepare("SELECT id FROM users WHERE role = 'owner' LIMIT 1").get();

    if (!owner) {
        const phone = process.env.ADMIN_PHONE || "0900000000";
        const password = process.env.ADMIN_PASSWORD || "Admin@12345";
        const name = process.env.ADMIN_NAME || "System Administrator";
        const hash = bcrypt.hashSync(password, 10);

        database.prepare(\`
            INSERT INTO users (name, phone, email, password_hash, role)
            VALUES (?, ?, ?, ?, 'owner')
        \`).run(name, phone, "admin@acoustic.local", hash);

        console.log("");
        console.log("  ╔════════════════════════════════════════════╗");
        console.log("  ║         OWNER ACCOUNT CREATED              ║");
        console.log("  ╚════════════════════════════════════════════╝");
        console.log(\`  ▸ Phone    : \${phone}\`);
        console.log(\`  ▸ Password : \${password}\`);
        console.log("");
    }

    const count = database.prepare("SELECT COUNT(*) AS c FROM speakers").get();

    if (count.c === 0) {
        const stmt = database.prepare(\`
            INSERT INTO speakers
                (manufacturer, model, category, rms_power, peak_power,
                 max_spl, sensitivity, frequency_min, frequency_max,
                 horizontal_coverage, vertical_coverage, impedance,
                 weight, mounting_type)
            VALUES
                (@manufacturer, @model, @category, @rms_power, @peak_power,
                 @max_spl, @sensitivity, @frequency_min, @frequency_max,
                 @horizontal_coverage, @vertical_coverage, @impedance,
                 @weight, @mounting_type)
        \`);

        const defaults = [
            { manufacturer: "Generic", model: "Full Range 12", category: "Point Source", rms_power: 500, peak_power: 1000, max_spl: 128, sensitivity: 98, frequency_min: 50, frequency_max: 18000, horizontal_coverage: 90, vertical_coverage: 60, impedance: 8, weight: 20, mounting_type: "Wall / Stand" },
            { manufacturer: "Generic", model: "Column Array", category: "Column", rms_power: 120, peak_power: 240, max_spl: 115, sensitivity: 92, frequency_min: 90, frequency_max: 18000, horizontal_coverage: 100, vertical_coverage: 30, impedance: 8, weight: 6, mounting_type: "Wall" },
            { manufacturer: "Generic", model: "Ceiling 6", category: "Ceiling", rms_power: 6, peak_power: 12, max_spl: 105, sensitivity: 90, frequency_min: 90, frequency_max: 18000, horizontal_coverage: 100, vertical_coverage: 100, impedance: 8, weight: 1.5, mounting_type: "Ceiling" },
            { manufacturer: "Generic", model: "Line Array Element", category: "Line Array", rms_power: 700, peak_power: 1400, max_spl: 135, sensitivity: 101, frequency_min: 55, frequency_max: 20000, horizontal_coverage: 90, vertical_coverage: 10, impedance: 8, weight: 18, mounting_type: "Flown" },
            { manufacturer: "Generic", model: "Subwoofer 18", category: "Subwoofer", rms_power: 1000, peak_power: 2000, max_spl: 135, sensitivity: 98, frequency_min: 30, frequency_max: 120, horizontal_coverage: 180, vertical_coverage: 180, impedance: 8, weight: 50, mounting_type: "Floor" }
        ];

        const tx = database.transaction(items => items.forEach(i => stmt.run(i)));
        tx(defaults);
        console.log(\`  ▸ Seeded \${defaults.length} default speakers.\`);
    }

    return database;
}

module.exports = { getDB, initDatabase };
`);

/* ==========================================================
   6. middleware/auth.js
========================================================== */
section("middleware/auth.js");

write("middleware/auth.js", `const jwt = require("jsonwebtoken");
const { getDB } = require("../db/database");
const { AppError } = require("../utils/errors");

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

function signToken(user) {
    return jwt.sign({ uid: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    });
}

function setSessionCookie(res, token) {
    res.cookie("ae_session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
}

function clearSessionCookie(res) {
    res.clearCookie("ae_session");
}

function extractToken(req) {
    if (req.cookies && req.cookies.ae_session) return req.cookies.ae_session;
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) return header.slice(7);
    return null;
}

function loadUser(token) {
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const db = getDB();
        return db.prepare(\`
            SELECT id, name, phone, email, company, role, created_at
            FROM users WHERE id = ?
        \`).get(payload.uid) || null;
    } catch { return null; }
}

function requireAuth(req, res, next) {
    const token = extractToken(req);
    if (!token) return next(new AppError("يجب تسجيل الدخول أولاً.", 401));
    const user = loadUser(token);
    if (!user) return next(new AppError("جلسة غير صالحة.", 401));
    req.user = user;
    next();
}

function optionalAuth(req, res, next) {
    const token = extractToken(req);
    if (token) { const u = loadUser(token); if (u) req.user = u; }
    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) return next(new AppError("يجب تسجيل الدخول.", 401));
        if (req.user.role === "owner") return next();
        if (!roles.includes(req.user.role)) {
            return next(new AppError("ليس لديك صلاحية.", 403));
        }
        next();
    };
}

const requireAdmin = requireRole("admin", "owner");

function requireOwner(req, res, next) {
    if (!req.user || req.user.role !== "owner") {
        return next(new AppError("تتطلب صلاحيات المالك.", 403));
    }
    next();
}

module.exports = {
    signToken, setSessionCookie, clearSessionCookie,
    requireAuth, optionalAuth, requireRole, requireAdmin, requireOwner
};
`);

/* ==========================================================
   7. utils/errors.js
========================================================== */
section("utils/errors.js");

write("utils/errors.js", `class AppError extends Error {
    constructor(message, status = 400, code = null) {
        super(message);
        this.status = status;
        this.code = code;
        this.isOperational = true;
    }
}

function notFound(req, res, next) {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({ success: false, message: "المسار غير موجود." });
    }
    res.status(404).send("Not Found");
}

function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    const message = err.message || "حدث خطأ غير متوقع.";
    if (status >= 500) console.error("[ERROR]", err);
    res.status(status).json({ success: false, message, code: err.code || null });
}

module.exports = { AppError, notFound, errorHandler };
`);

/* ==========================================================
   8. utils/validators.js
========================================================== */
section("utils/validators.js");

write("utils/validators.js", `const { AppError } = require("./errors");

function isValidEmail(email) {
    return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(email || "").trim());
}

function isValidPhone(phone) {
    const c = String(phone || "").replace(/[\\s\\-().+]/g, "");
    return c.length >= 7 && c.length <= 18 && /^\\d+$/.test(c);
}

function normalizePhone(phone) {
    return String(phone || "").replace(/[\\s\\-().+]/g, "");
}

function isValidPassword(password) {
    return typeof password === "string" && password.length >= 6;
}

function requireString(value, fieldName, min = 1, max = 500) {
    if (value === undefined || value === null) {
        throw new AppError(\`الحقل "\${fieldName}" مطلوب.\`, 400);
    }
    const str = String(value).trim();
    if (str.length < min || str.length > max) {
        throw new AppError(\`الحقل "\${fieldName}" يجب أن يكون بين \${min} و \${max}.\`, 400);
    }
    return str;
}

function requireNumber(value, fieldName, min = -Infinity, max = Infinity) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
        throw new AppError(\`الحقل "\${fieldName}" يجب أن يكون رقماً.\`, 400);
    }
    if (n < min || n > max) {
        throw new AppError(\`الحقل "\${fieldName}" خارج النطاق.\`, 400);
    }
    return n;
}

function sanitizeText(value, max = 2000) {
    return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);
}

module.exports = {
    isValidEmail, isValidPhone, normalizePhone, isValidPassword,
    requireString, requireNumber, sanitizeText
};
`);

/* ==========================================================
   9. utils/geometry.js
========================================================== */
section("utils/geometry.js");

write("utils/geometry.js", `function calculateRoom(width, length, height) {
    const w = Number(width) || 0;
    const l = Number(length) || 0;
    const h = Number(height) || 0;
    return { width: w, length: l, height: h, area: w * l, volume: w * l * h };
}

function distance3D(a, b) {
    const dx = Number(a.x) - Number(b.x);
    const dy = Number(a.y) - Number(b.y);
    const dz = Number(a.z || 0) - Number(b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function distance2D(a, b) {
    const dx = Number(a.x) - Number(b.x);
    const dy = Number(a.y) - Number(b.y);
    return Math.sqrt(dx * dx + dy * dy);
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function degToRad(d) { return d * Math.PI / 180; }
function radToDeg(r) { return r * 180 / Math.PI; }

function normalizeAngle(angle) {
    let r = Number(angle) % 360;
    if (r < 0) r += 360;
    return r;
}

function angularDifference(a, b) {
    let diff = Math.abs(Number(a) - Number(b)) % 360;
    if (diff > 180) diff = 360 - diff;
    return diff;
}

module.exports = {
    calculateRoom, distance3D, distance2D, clamp,
    degToRad, radToDeg, normalizeAngle, angularDifference
};
`);

/* ==========================================================
   10. utils/acoustics.js
========================================================== */
section("utils/acoustics.js");

write("utils/acoustics.js", `const { distance3D, angularDifference } = require("./geometry");

function inverseSquareLoss(distance) {
    const d = Math.max(0.5, Number(distance) || 1);
    return 20 * Math.log10(d);
}

function estimateSPL({ speaker, distance, powerRatio = 1 }) {
    const maxSpl = Number(speaker.max_spl || 0);
    if (!maxSpl || !distance) return 0;
    const loss = inverseSquareLoss(distance);
    const powerAdjustment = 10 * Math.log10(Math.max(0.01, Number(powerRatio)));
    return maxSpl - loss + powerAdjustment;
}

function directivityFactor({ speaker, speakerPosition, listenerPosition, speakerAngle = 0 }) {
    const dx = listenerPosition.x - speakerPosition.x;
    const dy = listenerPosition.y - speakerPosition.y;
    const listenerAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    const difference = angularDifference(listenerAngle, speakerAngle);
    const horizontal = Number(speaker.horizontal_coverage || 90);

    if (difference <= horizontal / 2) return 1;
    if (difference <= horizontal) {
        const normalized = (difference - horizontal / 2) / (horizontal / 2);
        return 1 - 0.6 * normalized;
    }
    return 0.25;
}

function calculateSpeakerCoverage({ speaker, position, room, gridStep = 2, speakerAngle = 0 }) {
    const points = [];
    for (let y = gridStep / 2; y < room.length; y += gridStep) {
        for (let x = gridStep / 2; x < room.width; x += gridStep) {
            const listener = { x, y, z: 1.2 };
            const distance = distance3D(position, listener);
            const direction = directivityFactor({ speaker, speakerPosition: position, listenerPosition: listener, speakerAngle });
            const spl = estimateSPL({ speaker, distance, powerRatio: direction });
            points.push({ x, y, spl, distance, coverage: direction });
        }
    }
    return points;
}

function analyzeDesign({ speakers, room, targetSPL = 85, gridStep = 2 }) {
    const masterPoints = [];
    for (let y = gridStep / 2; y < room.length; y += gridStep) {
        for (let x = gridStep / 2; x < room.width; x += gridStep) {
            masterPoints.push({ x, y });
        }
    }

    const merged = masterPoints.map(({ x, y }) => {
        const listener = { x, y, z: 1.2 };
        let energy = 0;

        for (const item of speakers) {
            const distance = distance3D(item.position, listener);
            if (distance < 0.1) continue;
            const direction = directivityFactor({
                speaker: item.speaker,
                speakerPosition: item.position,
                listenerPosition: listener,
                speakerAngle: item.angle || 0
            });
            const spl = estimateSPL({ speaker: item.speaker, distance, powerRatio: direction });
            if (Number.isFinite(spl)) energy += Math.pow(10, spl / 10);
        }

        const combinedSPL = energy > 0 ? 10 * Math.log10(energy) : 0;
        return { x, y, spl: combinedSPL, target: targetSPL, difference: combinedSPL - targetSPL };
    });

    const valid = merged.filter(p => Number.isFinite(p.spl) && p.spl > 0);

    const average = valid.length ? valid.reduce((s, p) => s + p.spl, 0) / valid.length : 0;
    const minimum = valid.length ? Math.min(...valid.map(p => p.spl)) : 0;
    const maximum = valid.length ? Math.max(...valid.map(p => p.spl)) : 0;

    const withinTarget = valid.filter(p => p.spl >= targetSPL - 6 && p.spl <= targetSPL + 6).length;
    const uniformity = valid.length ? (withinTarget / valid.length) * 100 : 0;
    const coverage = valid.length ? (valid.filter(p => p.spl >= targetSPL - 6).length / valid.length) * 100 : 0;

    return {
        heatmap: merged,
        averageSPL: Number(average.toFixed(2)),
        minimumSPL: Number(minimum.toFixed(2)),
        maximumSPL: Number(maximum.toFixed(2)),
        uniformity: Number(uniformity.toFixed(2)),
        coveragePercent: Number(coverage.toFixed(2)),
        targetSPL,
        gridStep
    };
}

module.exports = {
    inverseSquareLoss, estimateSPL, directivityFactor,
    calculateSpeakerCoverage, analyzeDesign
};
`);

/* ==========================================================
   11. utils/autoLayout.js
========================================================== */
section("utils/autoLayout.js");

write("utils/autoLayout.js", `const { clamp, distance2D, normalizeAngle } = require("./geometry");

function getCoverageRadius(speaker, mountingHeight) {
    const horizontal = Number(speaker.horizontal_coverage || 90);
    const halfAngle = horizontal / 2;
    const height = Math.max(1, Number(mountingHeight || 4) - 1.2);
    const radius = height * Math.tan(halfAngle * Math.PI / 180);
    return Math.max(2, radius);
}

function createGridPositions(room, spacing, margin = 2) {
    const positions = [];
    const width = Number(room.width);
    const length = Number(room.length);
    const xStart = Math.min(margin, width / 2);
    const yStart = Math.min(margin, length / 2);

    for (let y = yStart; y <= length - yStart; y += spacing) {
        for (let x = xStart; x <= width - xStart; x += spacing) {
            positions.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
        }
    }
    return positions;
}

function wallMountLayout(room, speaker) {
    const height = Math.max(2.5, Math.min(Number(room.height) - 0.5, 5));
    const positions = [];
    const width = Number(room.width);
    const coverage = getCoverageRadius(speaker, height);
    const spacing = clamp(coverage * 1.4, 5, 15);

    for (let x = spacing / 2; x < width; x += spacing) {
        positions.push({ x: Number(x.toFixed(2)), y: 0.5, z: height, angle: 90 });
    }
    return positions;
}

function distributedCeilingLayout(room, speaker) {
    const height = Math.max(2.5, Number(room.height) - 0.3);
    const coverage = getCoverageRadius(speaker, height);
    const spacing = clamp(coverage * 1.35, 4, 10);
    return createGridPositions(room, spacing, Math.min(2, spacing / 3))
        .map(p => ({ ...p, z: height, angle: 0 }));
}

function mainPAArrayLayout(room) {
    const width = Number(room.width);
    const height = Math.max(3, Number(room.height) - 1);
    return [{ x: width / 2, y: 1, z: height, angle: 90 }];
}

function lineArrayLayout(room) {
    const width = Number(room.width);
    const height = Math.max(4, Number(room.height) - 1);
    return [
        { x: 1, y: 1, z: height, angle: 45 },
        { x: width - 1, y: 1, z: height, angle: 135 }
    ];
}

function subwooferLayout(room) {
    const width = Number(room.width);
    return [
        { x: Math.max(1, width * 0.35), y: 1, z: 1, angle: 90 },
        { x: Math.min(width - 1, width * 0.65), y: 1, z: 1, angle: 90 }
    ];
}

function scoreLayout(layout, room, speaker) {
    if (!layout.length) return -Infinity;
    const coverage = getCoverageRadius(speaker, room.height);
    let score = 100;

    for (let i = 0; i < layout.length; i++) {
        for (let j = i + 1; j < layout.length; j++) {
            const d = distance2D(layout[i], layout[j]);
            if (d > coverage * 2.2) score -= 5;
            if (d < coverage * 0.35) score -= 2;
        }
    }

    if (layout.length > 24) score -= (layout.length - 24) * 2;

    for (const p of layout) {
        if (p.x < 0 || p.x > room.width || p.y < 0 || p.y > room.length) {
            score -= 50;
        }
    }
    return score;
}

function autoLayout({ room, speaker, application = "general", mountingPreference = "auto" }) {
    const candidates = [];
    const type = String(speaker.category || "").toLowerCase();

    if (mountingPreference === "ceiling" || type.includes("ceiling")) {
        candidates.push({ name: "Distributed Ceiling", layout: distributedCeilingLayout(room, speaker) });
    }
    if (mountingPreference === "wall" || type.includes("column")) {
        candidates.push({ name: "Wall Distributed", layout: wallMountLayout(room, speaker) });
    }
    if (type.includes("line") || ["concert", "stadium", "theater"].includes(application)) {
        candidates.push({ name: "Main PA / Line Array", layout: lineArrayLayout(room) });
    }

    candidates.push({ name: "Main PA", layout: mainPAArrayLayout(room) });
    candidates.push({ name: "Distributed", layout: distributedCeilingLayout(room, speaker) });

    const scored = candidates.map(c => ({ ...c, score: scoreLayout(c.layout, room, speaker) }));
    scored.sort((a, b) => b.score - a.score);

    const selected = scored[0];

    const result = selected.layout.map((position, index) => ({
        id: \`SP-\${String(index + 1).padStart(2, "0")}\`,
        speakerId: speaker.id,
        model: speaker.model,
        manufacturer: speaker.manufacturer,
        ...position,
        angle: normalizeAngle(position.angle || 0)
    }));

    return {
        strategy: selected.name,
        score: Number(selected.score.toFixed(2)),
        alternatives: scored.map(c => ({
            strategy: c.name,
            score: Number(c.score.toFixed(2)),
            speakerCount: c.layout.length
        })),
        speakers: result
    };
}

function addSubwoofers({ room, speaker }) {
    return subwooferLayout(room).map((position, index) => ({
        id: \`SUB-\${String(index + 1).padStart(2, "0")}\`,
        speakerId: speaker.id,
        model: speaker.model,
        manufacturer: speaker.manufacturer,
        ...position
    }));
}

module.exports = { autoLayout, addSubwoofers, getCoverageRadius };
`);

/* ==========================================================
   12. utils/report.js — with Arabic support
========================================================== */
section("utils/report.js");

write("utils/report.js", `const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const FONT_CANDIDATES = {
    regular: [
        path.resolve(__dirname, "..", "fonts", "Cairo-Regular.ttf"),
        path.resolve(__dirname, "..", "fonts", "Amiri-Regular.ttf"),
        path.resolve(__dirname, "..", "fonts", "NotoNaskhArabic-Regular.ttf")
    ],
    bold: [
        path.resolve(__dirname, "..", "fonts", "Cairo-Bold.ttf"),
        path.resolve(__dirname, "..", "fonts", "Amiri-Bold.ttf"),
        path.resolve(__dirname, "..", "fonts", "NotoNaskhArabic-Bold.ttf")
    ]
};

let REGULAR_FONT = null;
let BOLD_FONT = null;

function findFont(paths) {
    for (const p of paths) if (fs.existsSync(p)) return p;
    return null;
}

function resolveFonts() {
    if (REGULAR_FONT === null) {
        REGULAR_FONT = findFont(FONT_CANDIDATES.regular) || "Helvetica";
    }
    if (BOLD_FONT === null) {
        BOLD_FONT = findFont(FONT_CANDIDATES.bold) || REGULAR_FONT;
    }
}

function safeText(value, fallback = "—") {
    const v = value ?? fallback;
    return String(v);
}

function addSectionTitle(doc, text) {
    doc.moveDown(0.6);
    doc.font(BOLD_FONT).fontSize(14).fillColor("#e60012").text(text);
    doc.moveTo(doc.page.margins.left, doc.y + 2)
       .lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
       .strokeColor("#e60012").lineWidth(1).stroke();
    doc.moveDown(0.4);
}

function addField(doc, label, value) {
    doc.font(REGULAR_FONT).fontSize(10).fillColor("#111827")
       .text(\`\${label}: \${safeText(value)}\`, { align: "right" });
}

function generateEngineeringReport({ project, user, room, speakers, analysis, design, outputPath }) {
    resolveFonts();

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                margin: 50,
                info: {
                    Title: \`تقرير هندسي — \${project.name}\`,
                    Author: "Acoustic Engineering"
                }
            });

            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            // COVER
            doc.font(BOLD_FONT).fontSize(24).fillColor("#0f172a")
               .text("هندسة صوتية", { align: "center" });
            doc.moveDown(0.3);
            doc.font(REGULAR_FONT).fontSize(12).fillColor("#64748b")
               .text("ACOUSTIC ENGINEERING PLATFORM", { align: "center" });
            doc.moveDown(3);
            doc.font(BOLD_FONT).fontSize(26).fillColor("#e60012")
               .text("التقرير الهندسي", { align: "center" });
            doc.moveDown(0.5);
            doc.font(REGULAR_FONT).fontSize(14).fillColor("#334155")
               .text("تصميم وتحليل النظام الصوتي", { align: "center" });
            doc.moveDown(4);
            doc.font(BOLD_FONT).fontSize(18).fillColor("#0f172a")
               .text(safeText(project.name), { align: "center" });
            doc.moveDown(6);
            doc.font(REGULAR_FONT).fontSize(10).fillColor("#64748b")
               .text(\`تاريخ الإنشاء: \${new Date().toLocaleString("ar")}\`, { align: "center" });

            doc.addPage();

            // 1. PROJECT INFO
            addSectionTitle(doc, "1. معلومات المشروع");
            addField(doc, "المشروع", project.name);
            addField(doc, "نوع المنشأة", project.project_type);
            addField(doc, "العميل", user.name);
            addField(doc, "رقم الهاتف", user.phone);
            addField(doc, "الشركة", user.company);

            // 2. ROOM
            addSectionTitle(doc, "2. بيانات الفراغ");
            addField(doc, "العرض", \`\${room.width} m\`);
            addField(doc, "الطول", \`\${room.length} m\`);
            addField(doc, "الارتفاع", \`\${room.height} m\`);
            addField(doc, "المساحة", \`\${Number(room.area).toFixed(2)} m²\`);
            addField(doc, "الحجم", \`\${Number(room.volume).toFixed(2)} m³\`);

            // 3. DESIGN
            addSectionTitle(doc, "3. طريقة التصميم");
            addField(doc, "وضع التصميم", project.design_mode);
            addField(doc, "الاستراتيجية", design?.strategy || "—");
            addField(doc, "مؤشر الجودة", design?.score ?? "—");

            // 4. ANALYSIS
            addSectionTitle(doc, "4. التحليل الصوتي");
            addField(doc, "متوسط SPL", \`\${safeText(analysis?.averageSPL, 0)} dB\`);
            addField(doc, "أدنى SPL", \`\${safeText(analysis?.minimumSPL, 0)} dB\`);
            addField(doc, "أقصى SPL", \`\${safeText(analysis?.maximumSPL, 0)} dB\`);
            addField(doc, "التجانس", \`\${safeText(analysis?.uniformity, 0)} %\`);
            addField(doc, "نسبة التغطية", \`\${safeText(analysis?.coveragePercent, 0)} %\`);

            // 5. EQUIPMENT
            addSectionTitle(doc, "5. المعدات");
            if (Array.isArray(speakers) && speakers.length) {
                speakers.forEach((sp, i) => {
                    doc.font(REGULAR_FONT).fontSize(10).fillColor("#0f172a")
                       .text(\`\${i + 1}. \${safeText(sp.manufacturer)} — \${safeText(sp.model)}\`);
                    doc.fontSize(9).fillColor("#475569")
                       .text(\`النوع: \${safeText(sp.category)} | RMS: \${safeText(sp.rms_power)} W | Max SPL: \${safeText(sp.max_spl)} dB\`);
                    doc.moveDown(0.3);
                });
            } else {
                doc.fontSize(10).text("لا توجد معدات مسجلة.");
            }

            // 6. LAYOUT
            addSectionTitle(doc, "6. توزيع السماعات");
            const placements = Array.isArray(design?.speakers) ? design.speakers : [];
            if (placements.length) {
                placements.forEach(item => {
                    doc.font(REGULAR_FONT).fontSize(9).fillColor("#334155")
                       .text(\`\${item.id} | \${safeText(item.model)} | X: \${Number(item.x).toFixed(2)} m | Y: \${Number(item.y).toFixed(2)} m | Z: \${Number(item.z || 0).toFixed(2)} m | ∠: \${Number(item.angle || 0).toFixed(1)}°\`);
                });
            } else {
                doc.fontSize(10).text("لا توجد بيانات توزيع.");
            }

            // 7. BOQ
            addSectionTitle(doc, "7. جدول الكميات");
            const counts = {};
            placements.forEach(item => {
                const key = \`\${item.manufacturer || ""} \${item.model || ""}\`.trim();
                counts[key] = (counts[key] || 0) + 1;
            });
            const entries = Object.entries(counts);
            if (entries.length) {
                entries.forEach(([model, quantity]) => {
                    doc.font(REGULAR_FONT).fontSize(10).text(\`\${model} — الكمية: \${quantity}\`);
                });
            } else {
                doc.fontSize(10).text("لا توجد بيانات.");
            }

            // 8. NOTES
            addSectionTitle(doc, "8. ملاحظات هندسية");
            doc.font(REGULAR_FONT).fontSize(10).fillColor("#334155")
               .text(
                   "هذا التقرير ناتج عن نموذج حسابي هندسي أولي يعتمد على بيانات الفراغ ومواصفات السماعات المدخلة. القيم المحسوبة هي تقديرات تصميمية، ويجب التحقق الميداني من الأداء النهائي عند التنفيذ.",
                   { align: "right", lineGap: 3 }
               );

            doc.moveDown(2);
            doc.font(REGULAR_FONT).fontSize(8).fillColor("#94a3b8")
               .text("Acoustic Engineering — منصة الهندسة الصوتية الذكية", { align: "center" });

            doc.end();
            stream.on("finish", () => resolve(outputPath));
            stream.on("error", reject);
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generateEngineeringReport };
`);

/* ==========================================================
   13. routes/auth.js
========================================================== */
section("routes/auth.js");

write("routes/auth.js", `const express = require("express");
const bcrypt = require("bcryptjs");
const { getDB } = require("../db/database");
const {
    signToken, setSessionCookie, clearSessionCookie, requireAuth
} = require("../middleware/auth");
const {
    isValidEmail, isValidPhone, normalizePhone,
    isValidPassword, requireString, sanitizeText
} = require("../utils/validators");
const { AppError } = require("../utils/errors");

const router = express.Router();

router.post("/register", (req, res, next) => {
    try {
        const name = requireString(req.body.name, "الاسم", 2, 100);
        const phone = normalizePhone(requireString(req.body.phone, "رقم الهاتف", 7, 25));
        const password = req.body.password;
        const email = req.body.email ? sanitizeText(req.body.email, 160) : null;
        const company = req.body.company ? sanitizeText(req.body.company, 150) : null;

        if (!isValidPhone(phone)) throw new AppError("رقم الهاتف غير صحيح.", 400);
        if (!isValidPassword(password)) throw new AppError("كلمة المرور قصيرة.", 400);
        if (email && !isValidEmail(email)) throw new AppError("بريد غير صحيح.", 400);

        const db = getDB();
        const existing = db.prepare("SELECT id FROM users WHERE phone = ?").get(phone);
        if (existing) throw new AppError("رقم الهاتف مسجل.", 409);

        const hash = bcrypt.hashSync(password, 10);
        const result = db.prepare(\`
            INSERT INTO users (name, phone, email, company, password_hash, role)
            VALUES (?, ?, ?, ?, ?, 'user')
        \`).run(name, phone, email, company, hash);

        const user = db.prepare(\`
            SELECT id, name, phone, email, company, role, created_at
            FROM users WHERE id = ?
        \`).get(result.lastInsertRowid);

        const token = signToken(user);
        setSessionCookie(res, token);
        res.status(201).json({ success: true, user });
    } catch (err) { next(err); }
});

router.post("/login", (req, res, next) => {
    try {
        const phone = normalizePhone(req.body.phone);
        const password = String(req.body.password || "");
        if (!phone || !password) throw new AppError("أدخل البيانات.", 400);

        const db = getDB();
        const user = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone);
        if (!user) throw new AppError("بيانات غير صحيحة.", 401);

        const ok = bcrypt.compareSync(password, user.password_hash);
        if (!ok) throw new AppError("بيانات غير صحيحة.", 401);

        const safe = {
            id: user.id, name: user.name, phone: user.phone,
            email: user.email, company: user.company,
            role: user.role, created_at: user.created_at
        };

        const token = signToken(safe);
        setSessionCookie(res, token);
        res.json({ success: true, user: safe });
    } catch (err) { next(err); }
});

router.post("/logout", (req, res) => {
    clearSessionCookie(res);
    res.json({ success: true });
});

router.get("/me", requireAuth, (req, res) => {
    res.json({ success: true, user: req.user });
});

router.put("/me", requireAuth, (req, res, next) => {
    try {
        const name = requireString(req.body.name || req.user.name, "الاسم", 2, 100);
        const email = req.body.email ? sanitizeText(req.body.email, 160) : null;
        const company = req.body.company ? sanitizeText(req.body.company, 150) : null;
        if (email && !isValidEmail(email)) throw new AppError("بريد غير صحيح.", 400);

        const db = getDB();
        db.prepare(\`
            UPDATE users SET name = ?, email = ?, company = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        \`).run(name, email, company, req.user.id);

        const updated = db.prepare(\`
            SELECT id, name, phone, email, company, role, created_at
            FROM users WHERE id = ?
        \`).get(req.user.id);

        res.json({ success: true, user: updated });
    } catch (err) { next(err); }
});

router.post("/change-password", requireAuth, (req, res, next) => {
    try {
        const current = String(req.body.currentPassword || "");
        const newPw = String(req.body.newPassword || "");
        if (!isValidPassword(newPw)) throw new AppError("كلمة المرور الجديدة قصيرة.", 400);

        const db = getDB();
        const user = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(req.user.id);
        const ok = bcrypt.compareSync(current, user.password_hash);
        if (!ok) throw new AppError("كلمة المرور الحالية خاطئة.", 401);

        const hash = bcrypt.hashSync(newPw, 10);
        db.prepare(\`
            UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        \`).run(hash, req.user.id);

        res.json({ success: true });
    } catch (err) { next(err); }
});

module.exports = router;
`);

/* ==========================================================
   14. routes/projects.js
========================================================== */
section("routes/projects.js");

write("routes/projects.js", `const express = require("express");
const { getDB } = require("../db/database");
const { requireAuth } = require("../middleware/auth");
const { requireString, requireNumber, sanitizeText } = require("../utils/validators");
const { AppError } = require("../utils/errors");
const { calculateRoom } = require("../utils/geometry");

const router = express.Router();
router.use(requireAuth);

function findProject(id, user) {
    const db = getDB();
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    if (!project) throw new AppError("المشروع غير موجود.", 404);
    if (user.role !== "owner" && user.role !== "admin" && project.user_id !== user.id) {
        throw new AppError("ليس لديك صلاحية.", 403);
    }
    return project;
}

function parseProject(p) {
    let data = {};
    try { data = JSON.parse(p.project_data || "{}"); } catch {}
    return { ...p, project_data: data };
}

router.get("/", (req, res) => {
    const db = getDB();
    const projects = db.prepare(\`
        SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC
    \`).all(req.user.id);
    res.json({ success: true, projects: projects.map(parseProject) });
});

router.get("/:id", (req, res, next) => {
    try {
        const p = findProject(req.params.id, req.user);
        res.json({ success: true, project: parseProject(p) });
    } catch (err) { next(err); }
});

router.post("/", (req, res, next) => {
    try {
        const name = requireString(req.body.name, "اسم المشروع", 2, 150);
        const project_type = req.body.project_type || "custom";
        const description = sanitizeText(req.body.description, 2000);
        const width = requireNumber(req.body.width, "العرض", 1, 500);
        const length = requireNumber(req.body.length, "الطول", 1, 500);
        const height = requireNumber(req.body.height, "الارتفاع", 1.5, 100);
        const room = calculateRoom(width, length, height);

        const project_data = typeof req.body.project_data === "object"
            ? JSON.stringify(req.body.project_data) : "{}";

        const db = getDB();
        const result = db.prepare(\`
            INSERT INTO projects
                (user_id, name, project_type, description,
                 width, length, height, area, volume, design_mode, project_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        \`).run(
            req.user.id, name, project_type, description,
            room.width, room.length, room.height, room.area, room.volume,
            "manual", project_data
        );

        const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(result.lastInsertRowid);
        res.status(201).json({ success: true, project: parseProject(project) });
    } catch (err) { next(err); }
});

router.put("/:id", (req, res, next) => {
    try {
        const existing = findProject(req.params.id, req.user);
        const name = req.body.name ? requireString(req.body.name, "الاسم", 2, 150) : existing.name;
        const project_type = req.body.project_type || existing.project_type;
        const description = req.body.description !== undefined ? sanitizeText(req.body.description, 2000) : existing.description;
        const width = req.body.width !== undefined ? requireNumber(req.body.width, "العرض", 1, 500) : existing.width;
        const length = req.body.length !== undefined ? requireNumber(req.body.length, "الطول", 1, 500) : existing.length;
        const height = req.body.height !== undefined ? requireNumber(req.body.height, "الارتفاع", 1.5, 100) : existing.height;
        const design_mode = req.body.design_mode || existing.design_mode;
        const room = calculateRoom(width, length, height);
        const project_data = req.body.project_data !== undefined ? JSON.stringify(req.body.project_data) : existing.project_data;

        const db = getDB();
        db.prepare(\`
            UPDATE projects SET
                name = ?, project_type = ?, description = ?,
                width = ?, length = ?, height = ?, area = ?, volume = ?,
                design_mode = ?, project_data = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        \`).run(
            name, project_type, description,
            room.width, room.length, room.height, room.area, room.volume,
            design_mode, project_data, existing.id
        );

        const updated = db.prepare("SELECT * FROM projects WHERE id = ?").get(existing.id);
        res.json({ success: true, project: parseProject(updated) });
    } catch (err) { next(err); }
});

router.delete("/:id", (req, res, next) => {
    try {
        const p = findProject(req.params.id, req.user);
        const db = getDB();
        db.prepare("DELETE FROM projects WHERE id = ?").run(p.id);
        res.json({ success: true });
    } catch (err) { next(err); }
});

module.exports = router;
`);

/* ==========================================================
   15. routes/speakers.js
========================================================== */
section("routes/speakers.js");

write("routes/speakers.js", `const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { getDB } = require("../db/database");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { requireString, sanitizeText } = require("../utils/validators");
const { AppError } = require("../utils/errors");

const router = express.Router();

const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./uploads", "datasheets");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const safe = file.originalname.replace(/[^\\w.\\-]+/g, "_");
        cb(null, \`\${Date.now()}_\${safe}\`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: (Number(process.env.MAX_FILE_SIZE_MB) || 20) * 1024 * 1024 }
});

router.get("/", (req, res) => {
    const db = getDB();
    const { search, category } = req.query;
    let sql = "SELECT * FROM speakers WHERE 1=1";
    const params = [];

    if (search) {
        sql += " AND (manufacturer LIKE ? OR model LIKE ?)";
        const like = \`%\${search}%\`;
        params.push(like, like);
    }
    if (category) { sql += " AND category = ?"; params.push(category); }

    sql += " ORDER BY manufacturer, model";
    res.json({ success: true, speakers: db.prepare(sql).all(...params) });
});

router.get("/:id", (req, res, next) => {
    try {
        const db = getDB();
        const sp = db.prepare("SELECT * FROM speakers WHERE id = ?").get(req.params.id);
        if (!sp) throw new AppError("السماعة غير موجودة.", 404);
        res.json({ success: true, speaker: sp });
    } catch (err) { next(err); }
});

router.post("/", requireAuth, upload.single("datasheet"), (req, res, next) => {
    try {
        const manufacturer = requireString(req.body.manufacturer, "الشركة", 1, 100);
        const model = requireString(req.body.model, "الموديل", 1, 100);
        const category = req.body.category || "Point Source";

        const toNum = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

        const datasheet_path = req.file ? \`/uploads/datasheets/\${req.file.filename}\` : null;

        const db = getDB();
        const result = db.prepare(\`
            INSERT INTO speakers
                (manufacturer, model, category, rms_power, peak_power,
                 max_spl, sensitivity, frequency_min, frequency_max,
                 horizontal_coverage, vertical_coverage, impedance,
                 weight, mounting_type, datasheet_path, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        \`).run(
            manufacturer, model, category,
            toNum(req.body.rms_power, 0), toNum(req.body.peak_power, 0),
            toNum(req.body.max_spl, 0), toNum(req.body.sensitivity, 0),
            toNum(req.body.frequency_min, 0), toNum(req.body.frequency_max, 0),
            toNum(req.body.horizontal_coverage, 90), toNum(req.body.vertical_coverage, 60),
            toNum(req.body.impedance, 8), toNum(req.body.weight, 0),
            req.body.mounting_type ? sanitizeText(req.body.mounting_type, 100) : null,
            datasheet_path, req.user.id
        );

        const speaker = db.prepare("SELECT * FROM speakers WHERE id = ?").get(result.lastInsertRowid);
        res.status(201).json({ success: true, speaker });
    } catch (err) { next(err); }
});

router.delete("/:id", requireAuth, requireAdmin, (req, res, next) => {
    try {
        const db = getDB();
        const sp = db.prepare("SELECT * FROM speakers WHERE id = ?").get(req.params.id);
        if (!sp) throw new AppError("السماعة غير موجودة.", 404);
        db.prepare("DELETE FROM speakers WHERE id = ?").run(sp.id);
        res.json({ success: true });
    } catch (err) { next(err); }
});

module.exports = router;
`);

/* ==========================================================
   16. routes/analysis.js
========================================================== */
section("routes/analysis.js");

write("routes/analysis.js", `const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getDB } = require("../db/database");
const { AppError } = require("../utils/errors");
const { calculateRoom } = require("../utils/geometry");
const { analyzeDesign } = require("../utils/acoustics");
const { autoLayout, addSubwoofers } = require("../utils/autoLayout");

const router = express.Router();
router.use(requireAuth);

function normalizeRoom(room) {
    return calculateRoom(
        Number(room?.width) || 20,
        Number(room?.length) || 30,
        Number(room?.height) || 6
    );
}

function normalizeSpeaker(speaker) {
    return {
        id: speaker?.id || null,
        manufacturer: speaker?.manufacturer || "Generic",
        model: speaker?.model || "Generic Speaker",
        category: speaker?.category || "Point Source",
        rms_power: Number(speaker?.rms_power) || 500,
        max_spl: Number(speaker?.max_spl) || 120,
        horizontal_coverage: Number(speaker?.horizontal_coverage) || 90,
        vertical_coverage: Number(speaker?.vertical_coverage) || 60
    };
}

router.post("/auto-design", (req, res, next) => {
    try {
        const room = normalizeRoom(req.body.room);
        const speaker = normalizeSpeaker(req.body.speaker);

        const design = autoLayout({
            room, speaker,
            application: req.body.application || "general",
            mountingPreference: req.body.mountingPreference || "auto"
        });

        if (req.body.includeSubwoofers && speaker.category === "Subwoofer") {
            design.speakers = design.speakers.concat(addSubwoofers({ room, speaker }));
        }

        res.json({ success: true, design });
    } catch (err) { next(err); }
});

router.post("/analyze", (req, res, next) => {
    try {
        const room = normalizeRoom(req.body.room);
        const targetSPL = Number(req.body.targetSPL) || 85;
        const items = Array.isArray(req.body.speakers) ? req.body.speakers : [];

        if (!items.length) throw new AppError("لا توجد سماعات.", 400);

        const normalized = items.map(item => ({
            id: item.id,
            position: {
                x: Number(item.position?.x) || 0,
                y: Number(item.position?.y) || 0,
                z: Number(item.position?.z) || 2.5
            },
            angle: Number(item.angle) || 0,
            speaker: normalizeSpeaker(item.speaker)
        }));

        const analysis = analyzeDesign({ speakers: normalized, room, targetSPL });
        res.json({ success: true, analysis });
    } catch (err) { next(err); }
});

router.post("/run/:projectId", (req, res, next) => {
    try {
        const db = getDB();
        const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.projectId);
        if (!project) throw new AppError("المشروع غير موجود.", 404);
        if (project.user_id !== req.user.id && req.user.role === "user") {
            throw new AppError("ليس لديك صلاحية.", 403);
        }

        let design = {};
        try { design = JSON.parse(project.project_data || "{}"); } catch {}
        const speakers = Array.isArray(design.elements) ? design.elements.filter(e => e.type === "speaker") : [];

        if (!speakers.length) throw new AppError("لا يوجد تصميم محفوظ.", 400);

        const room = calculateRoom(project.width, project.length, project.height);
        const targetSPL = Number(req.body.targetSPL) || 85;

        const normalized = speakers.map(item => ({
            id: item.id,
            position: {
                x: Number(item.x) || 0,
                y: Number(item.y) || 0,
                z: Number(item.z) || 2.5
            },
            angle: Number(item.angle) || 0,
            speaker: {
                max_spl: Number(item.maxSPL) || 120,
                horizontal_coverage: Number(item.horizontalCoverage) || 90,
                vertical_coverage: Number(item.verticalCoverage) || 60
            }
        }));

        const analysis = analyzeDesign({ speakers: normalized, room, targetSPL });
        res.json({ success: true, analysis });
    } catch (err) { next(err); }
});

module.exports = router;
`);

/* ==========================================================
   17. routes/reports.js
========================================================== */
section("routes/reports.js");

write("routes/reports.js", `const express = require("express");
const path = require("path");
const fs = require("fs");
const { getDB } = require("../db/database");
const { requireAuth } = require("../middleware/auth");
const { AppError } = require("../utils/errors");
const { calculateRoom } = require("../utils/geometry");
const { analyzeDesign } = require("../utils/acoustics");
const { generateEngineeringReport } = require("../utils/report");

const router = express.Router();
router.use(requireAuth);

router.post("/generate", async (req, res, next) => {
    try {
        const { projectId } = req.body;
        const db = getDB();

        const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
        if (!project) throw new AppError("المشروع غير موجود.", 404);
        if (project.user_id !== req.user.id && !["owner", "admin"].includes(req.user.role)) {
            throw new AppError("ليس لديك صلاحية.", 403);
        }

        const room = req.body.room
            ? calculateRoom(Number(req.body.room.width), Number(req.body.room.length), Number(req.body.room.height))
            : calculateRoom(project.width, project.length, project.height);

        const speakers = Array.isArray(req.body.speakers) ? req.body.speakers : [];
        let analysis = req.body.analysis;

        if (!analysis && Array.isArray(req.body.design?.speakers)) {
            analysis = analyzeDesign({
                speakers: req.body.design.speakers.map(item => ({
                    id: item.id,
                    position: { x: Number(item.x) || 0, y: Number(item.y) || 0, z: Number(item.z) || 2.5 },
                    angle: Number(item.angle) || 0,
                    speaker: item
                })),
                room,
                targetSPL: 85
            });
        }

        const reportDir = path.resolve(process.env.REPORT_DIR || "./reports");
        if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

        const fileName = \`report_\${projectId}_\${Date.now()}.pdf\`;
        const outputPath = path.join(reportDir, fileName);

        await generateEngineeringReport({
            project,
            user: req.user,
            room,
            speakers,
            analysis: analysis || {},
            design: req.body.design || {},
            outputPath
        });

        db.prepare(\`
            INSERT INTO reports (project_id, user_id, file_path, file_name)
            VALUES (?, ?, ?, ?)
        \`).run(projectId, req.user.id, \`/reports/\${fileName}\`, fileName);

        res.json({ success: true, file: \`/reports/\${fileName}\`, fileName });
    } catch (err) { next(err); }
});

router.get("/", (req, res) => {
    const db = getDB();
    const rows = ["owner", "admin"].includes(req.user.role)
        ? db.prepare(\`
            SELECT r.*, p.name AS project_name, u.name AS user_name
            FROM reports r
            JOIN projects p ON p.id = r.project_id
            JOIN users u ON u.id = r.user_id
            ORDER BY r.created_at DESC
        \`).all()
        : db.prepare(\`
            SELECT r.*, p.name AS project_name, u.name AS user_name
            FROM reports r
            JOIN projects p ON p.id = r.project_id
            JOIN users u ON u.id = r.user_id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        \`).all(req.user.id);

    res.json({ success: true, reports: rows });
});

router.delete("/:id", (req, res, next) => {
    try {
        const db = getDB();
        const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id);
        if (!report) throw new AppError("التقرير غير موجود.", 404);
        if (report.user_id !== req.user.id && !["owner", "admin"].includes(req.user.role)) {
            throw new AppError("ليس لديك صلاحية.", 403);
        }
        const abs = path.resolve(__dirname, "..", report.file_path.replace(/^\\//, ""));
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
        db.prepare("DELETE FROM reports WHERE id = ?").run(report.id);
        res.json({ success: true });
    } catch (err) { next(err); }
});

module.exports = router;
`);

/* ==========================================================
   18. routes/admin.js
========================================================== */
section("routes/admin.js");

write("routes/admin.js", `const express = require("express");
const { getDB } = require("../db/database");
const { requireAuth, requireAdmin, requireOwner } = require("../middleware/auth");
const { AppError } = require("../utils/errors");

const router = express.Router();
router.use(requireAuth);
router.use(requireAdmin);

router.get("/stats", (req, res) => {
    const db = getDB();
    res.json({
        success: true,
        stats: {
            users: db.prepare("SELECT COUNT(*) AS c FROM users").get().c,
            projects: db.prepare("SELECT COUNT(*) AS c FROM projects").get().c,
            speakers: db.prepare("SELECT COUNT(*) AS c FROM speakers").get().c,
            reports: db.prepare("SELECT COUNT(*) AS c FROM reports").get().c
        }
    });
});

router.get("/users", (req, res) => {
    const db = getDB();
    const users = db.prepare(\`
        SELECT id, name, phone, email, company, role, created_at
        FROM users ORDER BY created_at DESC
    \`).all();
    res.json({ success: true, users });
});

router.get("/projects", (req, res) => {
    const db = getDB();
    const projects = db.prepare(\`
        SELECT p.*, u.name AS user_name, u.phone AS user_phone
        FROM projects p JOIN users u ON u.id = p.user_id
        ORDER BY p.updated_at DESC
    \`).all();
    res.json({ success: true, projects });
});

router.put("/users/:id/role", requireOwner, (req, res, next) => {
    try {
        const { role } = req.body;
        const allowed = ["user", "engineer", "admin", "owner"];
        if (!allowed.includes(role)) throw new AppError("دور غير صالح.", 400);

        const db = getDB();
        const target = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
        if (!target) throw new AppError("المستخدم غير موجود.", 404);

        db.prepare(\`
            UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        \`).run(role, target.id);

        res.json({ success: true });
    } catch (err) { next(err); }
});

router.delete("/users/:id", requireOwner, (req, res, next) => {
    try {
        const db = getDB();
        const target = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
        if (!target) throw new AppError("المستخدم غير موجود.", 404);
        if (target.role === "owner") throw new AppError("لا يمكن حذف المالك.", 403);
        db.prepare("DELETE FROM users WHERE id = ?").run(target.id);
        res.json({ success: true });
    } catch (err) { next(err); }
});

module.exports = router;
`);

/* ==========================================================
   19. public/index.html (Frontend)
========================================================== */
section("public/index.html");

write("public/index.html", `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0b1220">
    <title>Acoustic Engineering | Intelligent Acoustic Design</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>

<div id="authScreen" class="auth-screen">
    <div class="auth-card">
        <div class="brand-mark">AE</div>
        <h1>Acoustic Engineering</h1>
        <p class="subtitle">Intelligent Acoustic & Sound System Design</p>

        <div id="loginPanel" class="auth-panel">
            <h2>تسجيل الدخول</h2>
            <label>رقم الهاتف</label>
            <input id="loginPhone" type="tel" placeholder="0900000000">
            <label>كلمة المرور</label>
            <input id="loginPassword" type="password" placeholder="••••••••">
            <button id="loginButton" class="primary-button">دخول</button>
            <button id="showRegister" class="link-button">إنشاء حساب جديد</button>
            <div id="loginMessage" class="message"></div>
        </div>

        <div id="registerPanel" class="auth-panel hidden">
            <h2>إنشاء حساب</h2>
            <label>الاسم</label>
            <input id="registerName" type="text">
            <label>رقم الهاتف</label>
            <input id="registerPhone" type="tel">
            <label>البريد الإلكتروني</label>
            <input id="registerEmail" type="email">
            <label>الشركة</label>
            <input id="registerCompany" type="text">
            <label>كلمة المرور</label>
            <input id="registerPassword" type="password">
            <button id="registerButton" class="primary-button">إنشاء الحساب</button>
            <button id="showLogin" class="link-button">لدي حساب</button>
            <div id="registerMessage" class="message"></div>
        </div>
    </div>
</div>

<div id="appScreen" class="app hidden">
    <aside class="sidebar">
        <div class="sidebar-brand">
            <div class="brand-mark small">AE</div>
            <div><strong>Acoustic</strong><span>Engineering</span></div>
        </div>
        <nav>
            <button class="nav-item active" data-view="dashboard"><span>⌂</span> لوحة التحكم</button>
            <button class="nav-item" data-view="projects"><span>▣</span> المشاريع</button>
            <button class="nav-item" data-view="designer"><span>◇</span> المصمم الهندسي</button>
            <button class="nav-item" data-view="speakers"><span>◈</span> مكتبة السماعات</button>
            <button class="nav-item" data-view="reports"><span>▤</span> التقارير</button>
            <button id="adminNav" class="nav-item hidden" data-view="admin"><span>⚙</span> الإدارة</button>
        </nav>
        <div class="sidebar-bottom">
            <div id="currentUser" class="current-user"></div>
            <button id="logoutButton" class="logout-button">تسجيل الخروج</button>
        </div>
    </aside>

    <main class="main">
        <header class="topbar">
            <div>
                <div id="pageTitle" class="page-title">لوحة التحكم</div>
                <div id="pageSubtitle" class="page-subtitle">Acoustic Engineering Platform</div>
            </div>
            <div class="topbar-actions">
                <button id="newProjectButton" class="primary-button compact">+ مشروع جديد</button>
            </div>
        </header>

        <section id="view-dashboard" class="view">
            <div class="hero">
                <div>
                    <div class="eyebrow">INTELLIGENT ACOUSTIC DESIGN</div>
                    <h1>صمّم نظامك الصوتي <span>هندسياً</span></h1>
                    <p>ارسم المساحة، اختر السماعات، أو دع محرك التصميم الذكي يقترح التوزيع الهندسي.</p>
                    <button id="heroNewProject" class="primary-button">ابدأ مشروعاً جديداً</button>
                </div>
                <div class="hero-graphic">
                    <div class="room-wireframe">
                        <div class="speaker-dot s1"></div>
                        <div class="speaker-dot s2"></div>
                        <div class="speaker-dot s3"></div>
                        <div class="speaker-dot s4"></div>
                        <div class="stage">STAGE</div>
                    </div>
                </div>
            </div>

            <div id="dashboardStats" class="stats-grid">
                <div class="stat-card"><span>المشاريع</span><strong id="statProjects">0</strong></div>
                <div class="stat-card"><span>السماعات</span><strong id="statSpeakers">0</strong></div>
                <div class="stat-card"><span>التقارير</span><strong id="statReports">0</strong></div>
                <div class="stat-card"><span>حالة النظام</span><strong class="online">ONLINE</strong></div>
            </div>

            <div class="section-header">
                <div><h2>أحدث المشاريع</h2><p>مشاريعك الأخيرة</p></div>
                <button class="link-button" data-view-target="projects">عرض الكل</button>
            </div>

            <div id="recentProjects" class="project-grid"></div>
        </section>

        <section id="view-projects" class="view hidden">
            <div class="section-header">
                <div><h2>المشاريع</h2><p>إدارة مشاريع التصميم الصوتي</p></div>
                <button class="primary-button" id="projectsNewButton">+ مشروع جديد</button>
            </div>
            <div id="projectsGrid" class="project-grid"></div>
        </section>

        <section id="view-designer" class="view hidden">
            <div class="designer-layout">
                <aside class="designer-panel">
                    <div class="panel-section">
                        <div class="panel-title">المشروع</div>
                        <select id="designerProject"><option value="">اختر مشروعاً</option></select>
                    </div>
                    <div class="panel-section">
                        <div class="panel-title">نوع التصميم</div>
                        <div class="mode-buttons">
                            <button class="mode-button active" data-mode="manual">يدوي</button>
                            <button class="mode-button" data-mode="ai">AI Auto</button>
                        </div>
                    </div>
                    <div class="panel-section">
                        <div class="panel-title">أبعاد الغرفة</div>
                        <div class="dimension-grid">
                            <label>العرض<input id="roomWidth" type="number" value="20" step="0.1"></label>
                            <label>الطول<input id="roomLength" type="number" value="30" step="0.1"></label>
                            <label>الارتفاع<input id="roomHeight" type="number" value="6" step="0.1"></label>
                        </div>
                    </div>
                    <div class="panel-section">
                        <div class="panel-title">نوع المنشأة</div>
                        <select id="projectType">
                            <option>قاعة اجتماعات</option>
                            <option>قاعة احتفالات</option>
                            <option>فندق</option>
                            <option>مطعم</option>
                            <option>مسجد</option>
                            <option>مسرح</option>
                            <option>استاد</option>
                            <option>Custom</option>
                        </select>
                    </div>
                    <div class="panel-section">
                        <div class="panel-title">السماعة</div>
                        <select id="speakerSelect"><option>تحميل...</option></select>
                        <button id="addSpeakerButton" class="secondary-button full">+ إضافة السماعة</button>
                    </div>
                    <div class="panel-section">
                        <div class="panel-title">أدوات الرسم</div>
                        <div class="tool-grid">
                            <button class="tool-button active" data-tool="select">تحديد</button>
                            <button class="tool-button" data-tool="speaker">سماعة</button>
                            <button class="tool-button" data-tool="stage">منصة</button>
                            <button class="tool-button" data-tool="wall">جدار</button>
                            <button class="tool-button" data-tool="erase">حذف</button>
                        </div>
                    </div>
                    <div class="panel-section">
                        <button id="autoDesignButton" class="ai-button full">✦ التوزيع الهندسي الذكي</button>
                        <button id="analyzeButton" class="secondary-button full">تحليل التصميم</button>
                        <button id="saveDesignButton" class="primary-button full">حفظ التصميم</button>
                        <button id="generateReportButton" class="secondary-button full">إنشاء التقرير PDF</button>
                    </div>
                </aside>

                <div class="designer-workspace">
                    <div class="workspace-toolbar">
                        <div class="toolbar-group">
                            <button id="zoomOut" class="icon-button">−</button>
                            <span id="zoomValue">100%</span>
                            <button id="zoomIn" class="icon-button">+</button>
                            <button id="resetView" class="icon-button">⟳</button>
                        </div>
                        <div class="toolbar-group">
                            <span>Grid:</span>
                            <select id="gridSize">
                                <option value="0.5">0.5m</option>
                                <option value="1" selected>1m</option>
                                <option value="2">2m</option>
                            </select>
                        </div>
                    </div>
                    <div id="canvasContainer" class="canvas-container">
                        <canvas id="designCanvas"></canvas>
                    </div>
                    <div id="selectionPanel" class="selection-panel hidden">
                        <div>
                            <strong>العنصر المحدد</strong>
                            <span id="selectedInfo"></span>
                        </div>
                        <div class="selection-controls">
                            <label>X<input id="selectedX" type="number" step="0.1"></label>
                            <label>Y<input id="selectedY" type="number" step="0.1"></label>
                            <label>Z<input id="selectedZ" type="number" step="0.1"></label>
                            <label>Angle<input id="selectedAngle" type="number" step="1"></label>
                        </div>
                    </div>
                </div>

                <aside class="analysis-panel">
                    <div class="analysis-header">
                        <h3>Engineering Analysis</h3>
                        <span class="status-dot">LIVE</span>
                    </div>
                    <div id="analysisCards" class="analysis-cards">
                        <div class="analysis-card"><span>Speaker Count</span><strong id="analysisSpeakerCount">0</strong></div>
                        <div class="analysis-card"><span>Average SPL</span><strong id="analysisAverageSPL">—</strong></div>
                        <div class="analysis-card"><span>Minimum SPL</span><strong id="analysisMinimumSPL">—</strong></div>
                        <div class="analysis-card"><span>Maximum SPL</span><strong id="analysisMaximumSPL">—</strong></div>
                        <div class="analysis-card"><span>Uniformity</span><strong id="analysisUniformity">—</strong></div>
                    </div>
                    <div class="heatmap-container">
                        <div class="panel-title">Coverage / SPL</div>
                        <canvas id="heatmapCanvas"></canvas>
                    </div>
                    <div class="design-summary">
                        <div class="panel-title">Design Summary</div>
                        <div id="designSummary" class="summary-content">لا يوجد تصميم بعد.</div>
                    </div>
                </aside>
            </div>
        </section>

        <section id="view-speakers" class="view hidden">
            <div class="section-header">
                <div><h2>Speaker Library</h2><p>قاعدة بيانات السماعات</p></div>
                <button id="addSpeakerLibraryButton" class="primary-button">+ إضافة سماعة</button>
            </div>
            <div class="filter-bar">
                <input id="speakerSearch" type="search" placeholder="ابحث...">
                <select id="speakerCategoryFilter">
                    <option value="">كل الأنواع</option>
                    <option>Point Source</option>
                    <option>Column</option>
                    <option>Ceiling</option>
                    <option>Line Array</option>
                    <option>Subwoofer</option>
                </select>
            </div>
            <div id="speakerLibrary" class="speaker-grid"></div>
        </section>

        <section id="view-reports" class="view hidden">
            <div class="section-header">
                <div><h2>التقارير</h2><p>Engineering Reports</p></div>
            </div>
            <div id="reportsList" class="report-list"></div>
        </section>

        <section id="view-admin" class="view hidden">
            <div class="section-header">
                <div><h2>لوحة الإدارة</h2><p>إدارة المنصة</p></div>
            </div>
            <div id="adminStats" class="stats-grid"></div>
            <div class="admin-section">
                <h3>المستخدمون</h3>
                <div id="adminUsers" class="table-container"></div>
            </div>
            <div class="admin-section">
                <h3>المشاريع</h3>
                <div id="adminProjects" class="table-container"></div>
            </div>
        </section>
    </main>
</div>

<div id="projectModal" class="modal hidden">
    <div class="modal-card">
        <div class="modal-header">
            <h2>إنشاء مشروع جديد</h2>
            <button class="close-modal" data-close="projectModal">×</button>
        </div>
        <div class="form-grid">
            <label>اسم المشروع<input id="newProjectName" type="text"></label>
            <label>نوع المنشأة<select id="newProjectType">
                <option>قاعة اجتماعات</option><option>قاعة احتفالات</option>
                <option>فندق</option><option>مسجد</option><option>مسرح</option>
                <option>استاد</option><option>Custom</option>
            </select></label>
            <label>العرض<input id="newProjectWidth" type="number" value="20" step="0.1"></label>
            <label>الطول<input id="newProjectLength" type="number" value="30" step="0.1"></label>
            <label>الارتفاع<input id="newProjectHeight" type="number" value="6" step="0.1"></label>
            <label class="full-width">وصف<textarea id="newProjectDescription" rows="4"></textarea></label>
        </div>
        <div class="modal-actions">
            <button class="secondary-button" data-close="projectModal">إلغاء</button>
            <button id="createProjectButton" class="primary-button">إنشاء</button>
        </div>
    </div>
</div>

<div id="speakerModal" class="modal hidden">
    <div class="modal-card large">
        <div class="modal-header">
            <h2>إضافة سماعة</h2>
            <button class="close-modal" data-close="speakerModal">×</button>
        </div>
        <form id="speakerForm">
            <div class="form-grid">
                <label>الشركة<input name="manufacturer" required></label>
                <label>الموديل<input name="model" required></label>
                <label>النوع<select name="category">
                    <option>Point Source</option><option>Column</option>
                    <option>Ceiling</option><option>Line Array</option>
                    <option>Subwoofer</option>
                </select></label>
                <label>RMS W<input name="rms_power" type="number" step="1"></label>
                <label>Peak W<input name="peak_power" type="number" step="1"></label>
                <label>Max SPL dB<input name="max_spl" type="number" step="0.1"></label>
                <label>Sensitivity dB<input name="sensitivity" type="number" step="0.1"></label>
                <label>Freq Min Hz<input name="frequency_min" type="number"></label>
                <label>Freq Max Hz<input name="frequency_max" type="number"></label>
                <label>H Coverage °<input name="horizontal_coverage" type="number" value="90"></label>
                <label>V Coverage °<input name="vertical_coverage" type="number" value="60"></label>
                <label>Impedance Ω<input name="impedance" type="number" value="8"></label>
                <label>Weight kg<input name="weight" type="number" step="0.1"></label>
                <label>Mounting<input name="mounting_type"></label>
                <label>Datasheet<input name="datasheet" type="file" accept=".pdf,.jpg,.jpeg,.png"></label>
            </div>
            <div class="modal-actions">
                <button type="button" class="secondary-button" data-close="speakerModal">إلغاء</button>
                <button type="submit" class="primary-button">حفظ</button>
            </div>
        </form>
    </div>
</div>

<div id="toast" class="toast"></div>

<script src="/app.js"></script>
</body>
</html>
`);

/* ==========================================================
   20. public/app.js
========================================================== */
section("public/app.js");

write("public/app.js", `/* =====================================================
   Acoustic Engineering — Frontend
===================================================== */

const state = {
    user: null,
    projects: [],
    speakers: [],
    currentProject: null,
    currentMode: "manual",
    currentTool: "select",
    selectedElement: null,
    zoom: 1,
    gridSize: 1,
    designElements: [],
    analysis: null,
    aiDesign: null
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function show(el) {
    if (typeof el === "string") el = $(el);
    if (el) el.classList.remove("hidden");
}
function hide(el) {
    if (typeof el === "string") el = $(el);
    if (el) el.classList.add("hidden");
}
function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 3000);
}

async function api(url, options = {}) {
    const res = await fetch(url, {
        credentials: "include",
        ...options,
        headers: {
            ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
            ...(options.headers || {})
        }
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data.message || "خطأ في الاتصال");
    return data;
}

async function checkAuth() {
    try {
        const r = await api("/api/auth/me");
        if (r.success && r.user) {
            state.user = r.user;
            enterApplication();
        } else showAuth();
    } catch { showAuth(); }
}

function showAuth() {
    show("#authScreen");
    hide("#appScreen");
}

function enterApplication() {
    hide("#authScreen");
    show("#appScreen");
    $("#currentUser").innerHTML = \`<strong>\${escapeHTML(state.user.name)}</strong><br>\${escapeHTML(state.user.phone)}\`;
    if (state.user.role === "admin" || state.user.role === "owner") {
        show("#adminNav");
    } else hide("#adminNav");
    loadAllData();
}

async function login() {
    try {
        const r = await api("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({
                phone: $("#loginPhone").value.trim(),
                password: $("#loginPassword").value
            })
        });
        state.user = r.user;
        enterApplication();
        toast("تم تسجيل الدخول");
    } catch (e) {
        $("#loginMessage").textContent = e.message;
    }
}

async function register() {
    try {
        const r = await api("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
                name: $("#registerName").value.trim(),
                phone: $("#registerPhone").value.trim(),
                email: $("#registerEmail").value.trim(),
                company: $("#registerCompany").value.trim(),
                password: $("#registerPassword").value
            })
        });
        state.user = r.user;
        enterApplication();
        toast("تم إنشاء الحساب");
    } catch (e) {
        $("#registerMessage").textContent = e.message;
    }
}

async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    state.user = null;
    showAuth();
}

function openView(view) {
    $$(".view").forEach(el => el.classList.add("hidden"));
    const target = $(`#view-${view}`);
    if (target) target.classList.remove("hidden");
    $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === view));
    const titles = {
        dashboard: ["لوحة التحكم", "Acoustic Engineering Platform"],
        projects: ["المشاريع", "Project Management"],
        designer: ["المصمم الهندسي", "Intelligent Design"],
        speakers: ["مكتبة السماعات", "Speaker Database"],
        reports: ["التقارير", "Engineering Reports"],
        admin: ["الإدارة", "Administration"]
    };
    const t = titles[view] || titles.dashboard;
    $("#pageTitle").textContent = t[0];
    $("#pageSubtitle").textContent = t[1];
    if (view === "designer") { resizeCanvas(); drawCanvas(); }
}

async function loadAllData() {
    try {
        await Promise.all([loadProjects(), loadSpeakers()]);
        updateDashboard();
    } catch (e) { toast(e.message); }
}

async function loadProjects() {
    const r = await api("/api/projects");
    state.projects = r.projects || [];
    renderProjects();
    populateProjectSelect();
}

async function loadSpeakers() {
    const r = await api("/api/speakers");
    state.speakers = r.speakers || [];
    renderSpeakers();
    populateSpeakerSelect();
}

function updateDashboard() {
    $("#statProjects").textContent = state.projects.length;
    $("#statSpeakers").textContent = state.speakers.length;
    $("#statReports").textContent = state.projects.length ? "—" : "0";
    $("#recentProjects").innerHTML = state.projects.slice(0, 6).map(projectCardHTML).join("");
}

function projectCardHTML(p) {
    return \`
        <div class="project-card" data-project-id="\${p.id}">
            <div class="project-card-header">
                <h3>\${escapeHTML(p.name)}</h3>
                <span class="project-type">\${escapeHTML(p.project_type)}</span>
            </div>
            <div class="project-meta">
                <div><span>Dimensions</span><strong>\${p.width} × \${p.length} × \${p.height} m</strong></div>
                <div><span>Area</span><strong>\${Number(p.area).toFixed(1)} m²</strong></div>
                <div><span>Volume</span><strong>\${Number(p.volume).toFixed(1)} m³</strong></div>
                <div><span>Mode</span><strong>\${p.design_mode}</strong></div>
            </div>
        </div>
    \`;
}

function renderProjects() {
    $("#projectsGrid").innerHTML = state.projects.length
        ? state.projects.map(projectCardHTML).join("")
        : '<div class="project-card">لا توجد مشاريع بعد.</div>';
}

function openProjectModal() { show("#projectModal"); }

async function createProject() {
    const body = {
        name: $("#newProjectName").value.trim(),
        project_type: $("#newProjectType").value,
        width: Number($("#newProjectWidth").value),
        length: Number($("#newProjectLength").value),
        height: Number($("#newProjectHeight").value),
        description: $("#newProjectDescription").value.trim(),
        design_mode: "manual",
        project_data: { elements: [] }
    };
    if (!body.name) { toast("أدخل اسم المشروع"); return; }
    try {
        const r = await api("/api/projects", { method: "POST", body: JSON.stringify(body) });
        state.projects.unshift(r.project);
        hide("#projectModal");
        renderProjects();
        populateProjectSelect();
        updateDashboard();
        openProject(r.project.id);
        toast("تم إنشاء المشروع");
    } catch (e) { toast(e.message); }
}

async function openProject(id) {
    try {
        const r = await api(\`/api/projects/\${id}\`);
        state.currentProject = r.project;
        const p = r.project;
        $("#designerProject").value = String(p.id);
        $("#roomWidth").value = p.width;
        $("#roomLength").value = p.length;
        $("#roomHeight").value = p.height;
        $("#projectType").value = p.project_type;
        const data = p.project_data || {};
        state.designElements = data.elements || [];
        state.aiDesign = data.aiDesign || null;
        state.analysis = data.analysis || null;
        openView("designer");
        resizeCanvas();
        drawCanvas();
        updateAnalysisPanel();
    } catch (e) { toast(e.message); }
}

function populateProjectSelect() {
    const sel = $("#designerProject");
    sel.innerHTML = '<option value="">اختر مشروعاً</option>';
    state.projects.forEach(p => {
        const o = document.createElement("option");
        o.value = p.id;
        o.textContent = p.name;
        sel.appendChild(o);
    });
}

function populateSpeakerSelect() {
    const sel = $("#speakerSelect");
    sel.innerHTML = "";
    state.speakers.forEach(s => {
        const o = document.createElement("option");
        o.value = s.id;
        o.textContent = \`\${s.manufacturer} — \${s.model}\`;
        sel.appendChild(o);
    });
}

function renderSpeakers() {
    const search = ($("#speakerSearch")?.value || "").toLowerCase();
    const cat = $("#speakerCategoryFilter")?.value || "";
    const filtered = state.speakers.filter(s => {
        const ms = !search || \`\${s.manufacturer} \${s.model}\`.toLowerCase().includes(search);
        const mc = !cat || s.category === cat;
        return ms && mc;
    });
    $("#speakerLibrary").innerHTML = filtered.map(speakerCardHTML).join("");
}

function speakerCardHTML(s) {
    return \`
        <div class="speaker-card">
            <div class="speaker-manufacturer">\${escapeHTML(s.manufacturer)}</div>
            <h3>\${escapeHTML(s.model)}</h3>
            <span class="project-type">\${escapeHTML(s.category)}</span>
            <div class="speaker-specs">
                <div class="spec"><span>RMS</span><strong>\${s.rms_power} W</strong></div>
                <div class="spec"><span>Max SPL</span><strong>\${s.max_spl} dB</strong></div>
                <div class="spec"><span>H Coverage</span><strong>\${s.horizontal_coverage}°</strong></div>
                <div class="spec"><span>V Coverage</span><strong>\${s.vertical_coverage}°</strong></div>
                <div class="spec"><span>Frequency</span><strong>\${s.frequency_min}-\${s.frequency_max} Hz</strong></div>
                <div class="spec"><span>Weight</span><strong>\${s.weight} kg</strong></div>
            </div>
        </div>
    \`;
}

async function submitSpeaker(form) {
    const fd = new FormData(form);
    try {
        const r = await api("/api/speakers", { method: "POST", body: fd });
        state.speakers.push(r.speaker);
        hide("#speakerModal");
        form.reset();
        renderSpeakers();
        populateSpeakerSelect();
        toast("تمت إضافة السماعة");
    } catch (e) { toast(e.message); }
}

/* =====================================================
   CANVAS
===================================================== */

let canvas, ctx;
let dragging = false;
let dragOffset = { x: 0, y: 0 };

function initCanvasRefs() {
    canvas = $("#designCanvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
}

function resizeCanvas() {
    if (!canvas) initCanvasRefs();
    if (!canvas) return;
    const c = $("#canvasContainer");
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getRoomScale() {
    if (!state.currentProject) return 20;
    const w = Number($("#roomWidth").value);
    const l = Number($("#roomLength").value);
    const wpx = canvas.clientWidth - 80;
    const hpx = canvas.clientHeight - 80;
    return Math.min(wpx / w, hpx / l) * state.zoom;
}

function roomOrigin() {
    const w = Number($("#roomWidth").value);
    const l = Number($("#roomLength").value);
    const s = getRoomScale();
    return {
        x: (canvas.clientWidth - w * s) / 2,
        y: (canvas.clientHeight - l * s) / 2
    };
}

function worldToScreen(x, y) {
    const s = getRoomScale();
    const o = roomOrigin();
    return { x: o.x + x * s, y: o.y + y * s };
}

function screenToWorld(x, y) {
    const s = getRoomScale();
    const o = roomOrigin();
    return { x: (x - o.x) / s, y: (y - o.y) / s };
}

function snap(v) {
    const s = Number(state.gridSize);
    return Math.round(v / s) * s;
}

function drawCanvas() {
    if (!canvas) initCanvasRefs();
    if (!canvas || !ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // Background
    const grad = ctx.createRadialGradient(w/2, h/2, 10, w/2, h/2, Math.max(w,h));
    grad.addColorStop(0, "#0b1522");
    grad.addColorStop(1, "#050911");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (!state.currentProject) return;

    drawRoom();
    drawGrid();
    drawElements();
}

function drawRoom() {
    const w = Number($("#roomWidth").value);
    const l = Number($("#roomLength").value);
    const s = getRoomScale();
    const o = roomOrigin();
    const rw = w * s;
    const rh = l * s;

    ctx.fillStyle = "#0c1725";
    ctx.fillRect(o.x, o.y, rw, rh);
    ctx.strokeStyle = "rgba(56,189,248,0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(o.x, o.y, rw, rh);

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(\`\${w} m\`, o.x + rw/2, o.y - 12);

    ctx.save();
    ctx.translate(o.x - 14, o.y + rh/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(\`\${l} m\`, 0, 0);
    ctx.restore();
}

function drawGrid() {
    const w = Number($("#roomWidth").value);
    const l = Number($("#roomLength").value);
    const s = getRoomScale();
    const o = roomOrigin();
    ctx.save();
    ctx.strokeStyle = "rgba(56,189,248,0.07)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= w; x += Number(state.gridSize)) {
        const sx = o.x + x * s;
        ctx.beginPath();
        ctx.moveTo(sx, o.y);
        ctx.lineTo(sx, o.y + l * s);
        ctx.stroke();
    }
    for (let y = 0; y <= l; y += Number(state.gridSize)) {
        const sy = o.y + y * s;
        ctx.beginPath();
        ctx.moveTo(o.x, sy);
        ctx.lineTo(o.x + w * s, sy);
        ctx.stroke();
    }
    ctx.restore();
}

function drawElements() {
    state.designElements.forEach(el => {
        if (el.type === "speaker") drawSpeaker(el);
        if (el.type === "stage") drawStage(el);
        if (el.type === "wall") drawWall(el);
    });
}

function drawSpeaker(el) {
    const p = worldToScreen(el.x, el.y);
    const s = getRoomScale();
    const size = Math.max(8, Math.min(15, s * 0.25));
    const selected = state.selectedElement && state.selectedElement.id === el.id;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Number(el.angle || 0) * Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(size * 1.6, 0);
    ctx.lineTo(-size, -size);
    ctx.lineTo(-size, size);
    ctx.closePath();
    ctx.fillStyle = selected ? "#ffffff" : "#38bdf8";
    ctx.fill();
    ctx.strokeStyle = "#0ea5e9";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size * 1.5, 0);
    ctx.lineTo(size * 4, 0);
    ctx.strokeStyle = "rgba(56,189,248,0.18)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
}

function drawStage(el) {
    const p = worldToScreen(el.x, el.y);
    const s = getRoomScale();
    const w = (el.width || 8) * s;
    const h = (el.height || 3) * s;

    ctx.save();
    ctx.fillStyle = "rgba(168,85,247,0.18)";
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 1;
    ctx.fillRect(p.x, p.y, w, h);
    ctx.strokeRect(p.x, p.y, w, h);
    ctx.fillStyle = "#d8b4fe";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText("STAGE", p.x + w/2, p.y + h/2);
    ctx.restore();
}

function drawWall(el) {
    const a = worldToScreen(el.x, el.y);
    const b = worldToScreen(el.x2, el.y2);
    ctx.save();
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
}

function findElementAt(x, y) {
    for (let i = state.designElements.length - 1; i >= 0; i--) {
        const el = state.designElements[i];
        if (el.type === "speaker") {
            const d = Math.sqrt(Math.pow(el.x - x, 2) + Math.pow(el.y - y, 2));
            if (d < Math.max(0.8, 1.2 / state.zoom)) return el;
        }
        if (el.type === "stage") {
            if (x >= el.x && x <= el.x + (el.width || 8) && y >= el.y && y <= el.y + (el.height || 3)) return el;
        }
    }
    return null;
}

function bindCanvasEvents() {
    if (!canvas) initCanvasRefs();
    if (!canvas) return;

    canvas.addEventListener("mousedown", e => {
        const rect = canvas.getBoundingClientRect();
        const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

        if (state.currentTool === "speaker") { addManualSpeaker(snap(world.x), snap(world.y)); return; }
        if (state.currentTool === "stage") { addStage(snap(world.x), snap(world.y)); return; }
        if (state.currentTool === "wall") { addWall(snap(world.x), snap(world.y)); return; }
        if (state.currentTool === "erase") {
            const hit = findElementAt(world.x, world.y);
            if (hit) {
                state.designElements = state.designElements.filter(el => el.id !== hit.id);
                state.selectedElement = null;
                updateSelectionPanel();
                drawCanvas();
            }
            return;
        }

        const hit = findElementAt(world.x, world.y);
        if (hit) {
            state.selectedElement = hit;
            dragging = true;
            dragOffset.x = world.x - hit.x;
            dragOffset.y = world.y - hit.y;
            updateSelectionPanel();
            drawCanvas();
        } else {
            state.selectedElement = null;
            updateSelectionPanel();
            drawCanvas();
        }
    });

    canvas.addEventListener("mousemove", e => {
        if (!dragging || !state.selectedElement) return;
        const rect = canvas.getBoundingClientRect();
        const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        state.selectedElement.x = snap(world.x - dragOffset.x);
        state.selectedElement.y = snap(world.y - dragOffset.y);
        updateSelectionPanel();
        drawCanvas();
    });

    window.addEventListener("mouseup", () => { dragging = false; });
}

function addManualSpeaker(x, y) {
    const id = Number($("#speakerSelect").value);
    const speaker = state.speakers.find(s => s.id === id);
    if (!speaker) { toast("اختر سماعة أولاً"); return; }
    const el = {
        id: \`manual-\${Date.now()}-\${Math.random().toString(36).slice(2)}\`,
        type: "speaker",
        speakerId: speaker.id,
        model: speaker.model,
        manufacturer: speaker.manufacturer,
        x, y,
        z: Number($("#roomHeight").value) - 1,
        angle: 0
    };
    state.designElements.push(el);
    state.selectedElement = el;
    updateSelectionPanel();
    drawCanvas();
}

function addStage(x, y) {
    const el = { id: \`stage-\${Date.now()}\`, type: "stage", x, y, width: 8, height: 3 };
    state.designElements.push(el);
    state.selectedElement = el;
    updateSelectionPanel();
    drawCanvas();
}

function addWall(x, y) {
    const el = { id: \`wall-\${Date.now()}\`, type: "wall", x, y, x2: x + 5, y2: y };
    state.designElements.push(el);
    drawCanvas();
}

function updateSelectionPanel() {
    const el = state.selectedElement;
    if (!el) { hide("#selectionPanel"); return; }
    show("#selectionPanel");
    $("#selectedInfo").textContent = el.type === "speaker"
        ? \`\${el.manufacturer} \${el.model}\` : el.type;
    $("#selectedX").value = Number(el.x || 0).toFixed(2);
    $("#selectedY").value = Number(el.y || 0).toFixed(2);
    $("#selectedZ").value = Number(el.z || 0).toFixed(2);
    $("#selectedAngle").value = Number(el.angle || 0);
}

function updateSelectedFromInputs() {
    const el = state.selectedElement;
    if (!el) return;
    el.x = Number($("#selectedX").value);
    el.y = Number($("#selectedY").value);
    el.z = Number($("#selectedZ").value);
    el.angle = Number($("#selectedAngle").value);
    drawCanvas();
}

/* =====================================================
   AI Auto Design
===================================================== */

async function runAutoDesign() {
    const id = Number($("#speakerSelect").value);
    const speaker = state.speakers.find(s => s.id === id);
    if (!speaker) { toast("اختر سماعة"); return; }

    const room = {
        width: Number($("#roomWidth").value),
        length: Number($("#roomLength").value),
        height: Number($("#roomHeight").value)
    };
    const application = $("#projectType").value;

    try {
        toast("جاري التصميم...");
        const r = await api("/api/analysis/auto-design", {
            method: "POST",
            body: JSON.stringify({ room, speaker, application, mountingPreference: "auto" })
        });
        state.aiDesign = r.design;
        state.currentMode = "ai";
        $$(".mode-button").forEach(b => b.classList.toggle("active", b.dataset.mode === "ai"));
        state.designElements = r.design.speakers.map(item => ({
            id: \`ai-\${item.id}\`,
            type: "speaker",
            speakerId: item.speakerId,
            model: item.model,
            manufacturer: item.manufacturer,
            x: item.x, y: item.y, z: item.z, angle: item.angle
        }));
        drawCanvas();
        updateAnalysisPanel();
        $("#designSummary").innerHTML = \`
            <strong>\${escapeHTML(r.design.strategy)}</strong><br>
            عدد السماعات: \${r.design.speakers.length}<br>
            Score: \${Number(r.design.score).toFixed(1)}
        \`;
        toast("تم التصميم");
    } catch (e) { toast(e.message); }
}

/* =====================================================
   Analysis
===================================================== */

async function analyzeCurrentDesign() {
    if (!state.currentProject) { toast("اختر مشروعاً"); return; }
    const room = {
        width: Number($("#roomWidth").value),
        length: Number($("#roomLength").value),
        height: Number($("#roomHeight").value)
    };
    const acSpeakers = state.designElements
        .filter(e => e.type === "speaker")
        .map(e => {
            const sp = state.speakers.find(s => s.id === Number(e.speakerId));
            return { id: e.id, position: { x: e.x, y: e.y, z: e.z }, angle: e.angle, speaker: sp };
        }).filter(i => i.speaker);

    if (!acSpeakers.length) { toast("أضف سماعة"); return; }

    try {
        const r = await api("/api/analysis/analyze", {
            method: "POST",
            body: JSON.stringify({ room, speakers: acSpeakers, targetSPL: 85 })
        });
        state.analysis = r.analysis;
        updateAnalysisPanel();
        drawHeatmap(r.analysis.heatmap);
        toast("اكتمل التحليل");
    } catch (e) { toast(e.message); }
}

function updateAnalysisPanel() {
    const sp = state.designElements.filter(e => e.type === "speaker");
    $("#analysisSpeakerCount").textContent = sp.length;
    if (state.analysis) {
        $("#analysisAverageSPL").textContent = state.analysis.averageSPL + " dB";
        $("#analysisMinimumSPL").textContent = state.analysis.minimumSPL + " dB";
        $("#analysisMaximumSPL").textContent = state.analysis.maximumSPL + " dB";
        $("#analysisUniformity").textContent = state.analysis.uniformity + "%";
        drawHeatmap(state.analysis.heatmap);
    }
}

function drawHeatmap(points = []) {
    const hm = $("#heatmapCanvas");
    if (!hm) return;
    const rect = hm.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    hm.width = rect.width * dpr;
    hm.height = rect.height * dpr;
    const c = hm.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = "#050a11";
    c.fillRect(0, 0, rect.width, rect.height);
    if (!points.length) return;

    const w = Number($("#roomWidth").value);
    const l = Number($("#roomLength").value);
    const cw = rect.width / w;
    const ch = rect.height / l;
    const min = Math.min(...points.map(p => p.spl));
    const max = Math.max(...points.map(p => p.spl));

    points.forEach(p => {
        const ratio = max === min ? 0.5 : (p.spl - min) / (max - min);
        c.fillStyle = \`hsl(\${240 - ratio * 240}, 80%, 48%)\`;
        c.fillRect(p.x * cw, p.y * ch, Math.max(2, cw * 2), Math.max(2, ch * 2));
    });
}

/* =====================================================
   Save / Report
===================================================== */

async function saveDesign() {
    if (!state.currentProject) { toast("اختر مشروعاً"); return; }
    try {
        const r = await api(\`/api/projects/\${state.currentProject.id}\`, {
            method: "PUT",
            body: JSON.stringify({
                name: state.currentProject.name,
                project_type: $("#projectType").value,
                width: Number($("#roomWidth").value),
                length: Number($("#roomLength").value),
                height: Number($("#roomHeight").value),
                design_mode: state.currentMode,
                project_data: {
                    elements: state.designElements,
                    aiDesign: state.aiDesign,
                    analysis: state.analysis
                }
            })
        });
        state.currentProject = r.project;
        await loadProjects();
        toast("تم الحفظ");
    } catch (e) { toast(e.message); }
}

async function generateReport() {
    if (!state.currentProject) { toast("اختر مشروعاً"); return; }
    if (!state.analysis) { toast("حلّل التصميم أولاً"); return; }

    const room = {
        width: Number($("#roomWidth").value),
        length: Number($("#roomLength").value),
        height: Number($("#roomHeight").value),
        area: Number($("#roomWidth").value) * Number($("#roomLength").value),
        volume: Number($("#roomWidth").value) * Number($("#roomLength").value) * Number($("#roomHeight").value)
    };

    const usedIds = [...new Set(state.designElements.filter(e => e.type === "speaker").map(e => Number(e.speakerId)))];
    const usedSpeakers = state.speakers.filter(s => usedIds.includes(s.id));

    try {
        const r = await api("/api/reports/generate", {
            method: "POST",
            body: JSON.stringify({
                projectId: state.currentProject.id,
                room,
                speakers: usedSpeakers,
                analysis: state.analysis,
                design: state.aiDesign || { strategy: "Manual", score: 0, speakers: state.designElements }
            })
        });
        window.open(r.file, "_blank");
        toast("تم إنشاء التقرير");
    } catch (e) { toast(e.message); }
}

/* =====================================================
   Admin
===================================================== */

async function loadAdmin() {
    if (!["admin", "owner"].includes(state.user?.role)) return;
    try {
        const stats = await api("/api/admin/stats");
        $("#adminStats").innerHTML = \`
            <div class="stat-card"><span>Users</span><strong>\${stats.stats.users}</strong></div>
            <div class="stat-card"><span>Projects</span><strong>\${stats.stats.projects}</strong></div>
            <div class="stat-card"><span>Speakers</span><strong>\${stats.stats.speakers}</strong></div>
            <div class="stat-card"><span>Reports</span><strong>\${stats.stats.reports}</strong></div>
        \`;
        const users = await api("/api/admin/users");
        $("#adminUsers").innerHTML = \`
            <table>
                <thead><tr><th>ID</th><th>Name</th><th>Phone</th><th>Company</th><th>Role</th><th>Created</th></tr></thead>
                <tbody>
                    \${users.users.map(u => \`
                        <tr>
                            <td>\${u.id}</td>
                            <td>\${escapeHTML(u.name)}</td>
                            <td>\${escapeHTML(u.phone)}</td>
                            <td>\${escapeHTML(u.company || "-")}</td>
                            <td>\${u.role}</td>
                            <td>\${u.created_at}</td>
                        </tr>
                    \`).join("")}
                </tbody>
            </table>
        \`;
        const projects = await api("/api/admin/projects");
        $("#adminProjects").innerHTML = \`
            <table>
                <thead><tr><th>ID</th><th>Project</th><th>User</th><th>Type</th><th>Dimensions</th></tr></thead>
                <tbody>
                    \${projects.projects.map(p => \`
                        <tr>
                            <td>\${p.id}</td>
                            <td>\${escapeHTML(p.name)}</td>
                            <td>\${escapeHTML(p.user_name)}</td>
                            <td>\${escapeHTML(p.project_type)}</td>
                            <td>\${p.width} × \${p.length} × \${p.height} m</td>
                        </tr>
                    \`).join("")}
                </tbody>
            </table>
        \`;
    } catch (e) { toast(e.message); }
}

/* =====================================================
   Utility
===================================================== */

function escapeHTML(v) {
    return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* =====================================================
   Events
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initCanvasRefs();
    bindCanvasEvents();

    document.addEventListener("click", e => {
        const nav = e.target.closest(".nav-item");
        if (nav) {
            openView(nav.dataset.view);
            if (nav.dataset.view === "admin") loadAdmin();
            return;
        }
        const tv = e.target.closest("[data-view-target]");
        if (tv) { openView(tv.dataset.viewTarget); return; }
        const card = e.target.closest(".project-card");
        if (card && card.dataset.projectId) {
            openProject(Number(card.dataset.projectId));
            return;
        }
    });

    $("#loginButton")?.addEventListener("click", login);
    $("#registerButton")?.addEventListener("click", register);
    $("#logoutButton")?.addEventListener("click", logout);
    $("#showRegister")?.addEventListener("click", () => { hide("#loginPanel"); show("#registerPanel"); });
    $("#showLogin")?.addEventListener("click", () => { hide("#registerPanel"); show("#loginPanel"); });

    $("#newProjectButton")?.addEventListener("click", openProjectModal);
    $("#heroNewProject")?.addEventListener("click", openProjectModal);
    $("#projectsNewButton")?.addEventListener("click", openProjectModal);
    $("#createProjectButton")?.addEventListener("click", createProject);

    $("#addSpeakerLibraryButton")?.addEventListener("click", () => show("#speakerModal"));
    $("#speakerForm")?.addEventListener("submit", e => { e.preventDefault(); submitSpeaker(e.target); });
    $("#speakerSearch")?.addEventListener("input", renderSpeakers);
    $("#speakerCategoryFilter")?.addEventListener("change", renderSpeakers);

    $("#designerProject")?.addEventListener("change", e => {
        if (e.target.value) openProject(Number(e.target.value));
    });

    $("#addSpeakerButton")?.addEventListener("click", () => {
        state.currentTool = "speaker";
        updateToolButtons();
        toast("اضغط داخل المخطط");
    });

    $("#autoDesignButton")?.addEventListener("click", runAutoDesign);
    $("#analyzeButton")?.addEventListener("click", analyzeCurrentDesign);
    $("#saveDesignButton")?.addEventListener("click", saveDesign);
    $("#generateReportButton")?.addEventListener("click", generateReport);

    $$(".mode-button").forEach(b => b.addEventListener("click", () => {
        state.currentMode = b.dataset.mode;
        $$(".mode-button").forEach(x => x.classList.toggle("active", x === b));
        drawCanvas();
    }));

    $$(".tool-button").forEach(b => b.addEventListener("click", () => {
        state.currentTool = b.dataset.tool;
        updateToolButtons();
    }));

    ["#roomWidth", "#roomLength", "#roomHeight"].forEach(sel => {
        $(sel)?.addEventListener("input", drawCanvas);
    });

    $("#gridSize")?.addEventListener("change", e => {
        state.gridSize = Number(e.target.value);
        drawCanvas();
    });

    $("#zoomIn")?.addEventListener("click", () => {
        state.zoom = Math.min(3, state.zoom + 0.1);
        $("#zoomValue").textContent = Math.round(state.zoom * 100) + "%";
        drawCanvas();
    });
    $("#zoomOut")?.addEventListener("click", () => {
        state.zoom = Math.max(0.4, state.zoom - 0.1);
        $("#zoomValue").textContent = Math.round(state.zoom * 100) + "%";
        drawCanvas();
    });
    $("#resetView")?.addEventListener("click", () => {
        state.zoom = 1;
        $("#zoomValue").textContent = "100%";
        drawCanvas();
    });

    ["#selectedX", "#selectedY", "#selectedZ", "#selectedAngle"].forEach(sel => {
        $(sel)?.addEventListener("input", updateSelectedFromInputs);
    });

    $$("[data-close]").forEach(b => b.addEventListener("click", () => hide(\`#\${b.dataset.close}\`)));

    window.addEventListener("resize", () => { resizeCanvas(); drawCanvas(); });
});

function updateToolButtons() {
    $$(".tool-button").forEach(b => b.classList.toggle("active", b.dataset.tool === state.currentTool));
}

/* Start */
checkAuth();
`);

/* ==========================================================
   21. public/styles.css
========================================================== */
section("public/styles.css");

write("public/styles.css", `:root {
    --bg: #070b12;
    --panel: #0d1420;
    --panel-2: #111b29;
    --panel-3: #162235;
    --border: rgba(255,255,255,0.08);
    --text: #eef4ff;
    --muted: #8b9ab0;
    --primary: #38bdf8;
    --primary-2: #0ea5e9;
    --success: #22c55e;
    --warning: #f59e0b;
    --danger: #ef4444;
    --radius: 14px;
    --shadow: 0 20px 60px rgba(0,0,0,0.35);
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; width: 100%; height: 100%; font-family: Inter, "Segoe UI", Tahoma, Arial, sans-serif; background: var(--bg); color: var(--text); }
body { overflow: hidden; }
button, input, select, textarea { font: inherit; }
button { cursor: pointer; }
.hidden { display: none !important; }

/* AUTH */
.auth-screen { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 20% 20%, rgba(56,189,248,0.12), transparent 30%), radial-gradient(circle at 80% 80%, rgba(14,165,233,0.08), transparent 30%), var(--bg); }
.auth-card { width: min(440px, calc(100% - 32px)); background: linear-gradient(180deg, rgba(17,27,41,0.98), rgba(9,14,23,0.98)); border: 1px solid var(--border); border-radius: 24px; padding: 38px; box-shadow: var(--shadow); }
.brand-mark { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; border-radius: 18px; background: linear-gradient(135deg, var(--primary), #6366f1); color: #00111c; font-weight: 900; font-size: 22px; margin-bottom: 20px; }
.brand-mark.small { width: 42px; height: 42px; border-radius: 12px; font-size: 15px; margin: 0; }
.auth-card h1 { margin: 0; font-size: 28px; }
.subtitle { color: var(--muted); margin: 8px 0 30px; }
.auth-panel h2 { font-size: 20px; margin-bottom: 20px; }
.auth-panel label, .form-grid label, .dimension-grid label, .selection-controls label { display: flex; flex-direction: column; gap: 7px; color: var(--muted); font-size: 13px; }
input, select, textarea { width: 100%; border: 1px solid var(--border); background: #09111d; color: var(--text); border-radius: 10px; padding: 12px 13px; outline: none; transition: border .2s, box-shadow .2s; }
input:focus, select:focus, textarea:focus { border-color: rgba(56,189,248,0.6); box-shadow: 0 0 0 3px rgba(56,189,248,0.08); }
.auth-panel { display: flex; flex-direction: column; gap: 12px; }
.primary-button, .secondary-button, .ai-button, .link-button, .logout-button { border: 0; border-radius: 10px; padding: 12px 16px; transition: transform .15s, opacity .15s, background .15s; }
.primary-button:hover, .secondary-button:hover, .ai-button:hover { transform: translateY(-1px); }
.primary-button { background: linear-gradient(135deg, var(--primary), var(--primary-2)); color: #02131e; font-weight: 800; }
.primary-button.compact { padding: 9px 14px; }
.secondary-button { background: var(--panel-3); color: var(--text); border: 1px solid var(--border); }
.ai-button { background: linear-gradient(135deg, #7c3aed, #2563eb); color: white; font-weight: 800; }
.full { width: 100%; }
.link-button { background: transparent; color: var(--primary); }
.message { min-height: 20px; color: var(--danger); font-size: 13px; }

/* APP */
.app { display: flex; width: 100%; height: 100vh; }
.sidebar { width: 250px; flex-shrink: 0; background: #09111d; border-left: 1px solid var(--border); display: flex; flex-direction: column; padding: 18px; }
.sidebar-brand { display: flex; align-items: center; gap: 11px; padding-bottom: 25px; border-bottom: 1px solid var(--border); }
.sidebar-brand strong { display: block; font-size: 15px; }
.sidebar-brand span { display: block; color: var(--muted); font-size: 11px; margin-top: 2px; }
.sidebar nav { display: flex; flex-direction: column; gap: 6px; margin-top: 25px; }
.nav-item { border: 0; background: transparent; color: var(--muted); text-align: right; padding: 12px; border-radius: 10px; display: flex; align-items: center; gap: 12px; }
.nav-item:hover { background: rgba(255,255,255,0.04); color: var(--text); }
.nav-item.active { background: rgba(56,189,248,0.12); color: var(--primary); box-shadow: inset 3px 0 0 var(--primary); }
.nav-item span { width: 20px; text-align: center; }
.sidebar-bottom { margin-top: auto; border-top: 1px solid var(--border); padding-top: 15px; }
.current-user { color: var(--muted); font-size: 12px; margin-bottom: 10px; line-height: 1.7; }
.logout-button { width: 100%; background: rgba(239,68,68,0.08); color: #fca5a5; }

.main { flex: 1; min-width: 0; overflow: auto; background: radial-gradient(circle at 80% 10%, rgba(56,189,248,0.04), transparent 25%), var(--bg); }
.topbar { height: 74px; position: sticky; top: 0; z-index: 20; background: rgba(7,11,18,0.88); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 28px; }
.page-title { font-size: 18px; font-weight: 800; }
.page-subtitle { color: var(--muted); font-size: 11px; margin-top: 3px; }
.view { padding: 28px; }

/* HERO */
.hero { min-height: 300px; display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 30px; align-items: center; padding: 38px; border: 1px solid var(--border); border-radius: 22px; background: radial-gradient(circle at 80% 50%, rgba(56,189,248,0.11), transparent 40%), linear-gradient(135deg, #0e1927, #0a101a); box-shadow: var(--shadow); }
.eyebrow { color: var(--primary); font-size: 11px; letter-spacing: 2px; font-weight: 800; margin-bottom: 12px; }
.hero h1 { font-size: clamp(30px, 4vw, 52px); line-height: 1.15; margin: 0 0 18px; }
.hero h1 span { color: var(--primary); }
.hero p { color: var(--muted); max-width: 650px; line-height: 1.9; margin-bottom: 25px; }
.hero-graphic { display: flex; align-items: center; justify-content: center; }
.room-wireframe { width: 310px; height: 200px; border: 1px solid rgba(56,189,248,0.45); transform: perspective(700px) rotateX(55deg) rotateZ(-3deg); position: relative; background: linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px); background-size: 25px 25px; box-shadow: 0 0 50px rgba(56,189,248,0.12); }
.speaker-dot { width: 13px; height: 13px; border-radius: 50%; background: var(--primary); box-shadow: 0 0 18px rgba(56,189,248,0.8); position: absolute; }
.s1 { top: 20px; left: 30px; }
.s2 { top: 20px; right: 30px; }
.s3 { bottom: 35px; left: 30px; }
.s4 { bottom: 35px; right: 30px; }
.stage { position: absolute; bottom: 25px; left: 50%; transform: translateX(-50%); width: 100px; height: 35px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); font-size: 9px; letter-spacing: 1px; }

/* STATS */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 20px; }
.stat-card { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
.stat-card span { display: block; color: var(--muted); font-size: 12px; margin-bottom: 10px; }
.stat-card strong { font-size: 27px; }
.online { color: var(--success); }

.section-header { display: flex; justify-content: space-between; align-items: center; margin: 30px 0 18px; }
.section-header h2 { margin: 0; font-size: 20px; }
.section-header p { margin: 5px 0 0; color: var(--muted); font-size: 12px; }

/* PROJECT CARDS */
.project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 15px; }
.project-card { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; cursor: pointer; transition: transform .2s, border .2s; }
.project-card:hover { transform: translateY(-3px); border-color: rgba(56,189,248,0.35); }
.project-card-header { display: flex; justify-content: space-between; align-items: flex-start; }
.project-card h3 { margin: 0; font-size: 15px; }
.project-type { color: var(--primary); font-size: 10px; background: rgba(56,189,248,0.08); padding: 5px 8px; border-radius: 20px; }
.project-meta { margin-top: 15px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.project-meta div { background: rgba(255,255,255,0.025); border-radius: 8px; padding: 9px; }
.project-meta span { display: block; color: var(--muted); font-size: 10px; }
.project-meta strong { display: block; margin-top: 3px; font-size: 12px; }

/* DESIGNER */
.designer-layout { height: calc(100vh - 130px); min-height: 650px; display: grid; grid-template-columns: 270px minmax(450px, 1fr) 285px; gap: 12px; }
.designer-panel, .analysis-panel { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; overflow-y: auto; }
.designer-panel { padding: 15px; }
.analysis-panel { padding: 15px; }
.panel-section { padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid var(--border); }
.panel-title { color: var(--muted); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 9px; }
.mode-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.mode-button, .tool-button { border: 1px solid var(--border); background: var(--panel-2); color: var(--muted); border-radius: 8px; padding: 9px; font-size: 11px; }
.mode-button.active, .tool-button.active { background: rgba(56,189,248,0.12); color: var(--primary); border-color: rgba(56,189,248,0.3); }
.dimension-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
.dimension-grid input { padding: 8px; font-size: 11px; }
.tool-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.designer-workspace { min-width: 0; background: #050a11; border: 1px solid var(--border); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; }
.workspace-toolbar { height: 48px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; background: #0a111c; border-bottom: 1px solid var(--border); color: var(--muted); font-size: 11px; }
.toolbar-group { display: flex; align-items: center; gap: 7px; }
.icon-button { width: 30px; height: 30px; border: 1px solid var(--border); background: var(--panel-2); color: var(--text); border-radius: 7px; }
.canvas-container { flex: 1; position: relative; overflow: hidden; background: #070c14; }
#designCanvas { width: 100%; height: 100%; display: block; cursor: crosshair; }
.selection-panel { background: #0c1624; border-top: 1px solid var(--border); padding: 10px; display: flex; align-items: center; justify-content: space-between; gap: 15px; }
.selection-panel strong { display: block; font-size: 11px; }
.selection-panel span { color: var(--muted); font-size: 10px; }
.selection-controls { display: flex; gap: 6px; }
.selection-controls input { width: 70px; padding: 6px; font-size: 10px; }

/* ANALYSIS */
.analysis-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; }
.analysis-header h3 { margin: 0; font-size: 14px; }
.status-dot { color: var(--success); font-size: 9px; }
.analysis-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; }
.analysis-card { background: rgba(255,255,255,0.025); border: 1px solid var(--border); border-radius: 9px; padding: 10px; }
.analysis-card span { display: block; color: var(--muted); font-size: 9px; }
.analysis-card strong { display: block; margin-top: 5px; font-size: 16px; }
.heatmap-container { margin-top: 20px; }
#heatmapCanvas { width: 100%; height: 170px; display: block; background: #060a10; border: 1px solid var(--border); border-radius: 9px; }
.design-summary { margin-top: 20px; }
.summary-content { color: var(--muted); font-size: 11px; line-height: 1.8; }

/* SPEAKERS */
.filter-bar { display: grid; grid-template-columns: 1fr 200px; gap: 10px; margin-bottom: 20px; }
.speaker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 15px; }
.speaker-card { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; }
.speaker-card h3 { margin: 0 0 5px; font-size: 15px; }
.speaker-manufacturer { color: var(--primary); font-size: 11px; }
.speaker-specs { margin-top: 15px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; }
.spec { background: rgba(255,255,255,0.025); padding: 8px; border-radius: 7px; }
.spec span { display: block; color: var(--muted); font-size: 9px; }
.spec strong { display: block; margin-top: 2px; font-size: 11px; }

/* TABLES */
.table-container { overflow: auto; background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); }
table { width: 100%; border-collapse: collapse; font-size: 11px; }
th, td { padding: 11px; text-align: right; border-bottom: 1px solid var(--border); }
th { color: var(--muted); font-weight: 700; }

/* MODALS */
.modal { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); padding: 20px; }
.modal-card { width: min(650px, 100%); max-height: calc(100vh - 40px); overflow: auto; background: #0c1522; border: 1px solid var(--border); border-radius: 18px; box-shadow: var(--shadow); padding: 22px; }
.modal-card.large { width: min(850px, 100%); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
.modal-header h2 { margin: 0; font-size: 18px; }
.close-modal { width: 34px; height: 34px; border: 0; background: rgba(255,255,255,0.05); color: var(--text); border-radius: 8px; font-size: 20px; }
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.full-width { grid-column: 1 / -1; }
.modal-actions { display: flex; justify-content: flex-start; gap: 8px; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--border); }

/* REPORT LIST */
.report-list { display: flex; flex-direction: column; gap: 10px; }
.report-item { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 15px; display: flex; align-items: center; justify-content: space-between; }

/* ADMIN */
.admin-section { margin-top: 25px; }
.admin-section h3 { font-size: 16px; }

/* TOAST */
.toast { position: fixed; left: 25px; bottom: 25px; z-index: 300; background: #132238; border: 1px solid rgba(56,189,248,0.25); color: var(--text); border-radius: 10px; padding: 12px 17px; box-shadow: var(--shadow); transform: translateY(100px); opacity: 0; transition: 0.25s; }
.toast.show { transform: translateY(0); opacity: 1; }

/* RESPONSIVE */
@media (max-width: 1200px) {
    .designer-layout { grid-template-columns: 240px minmax(400px, 1fr); }
    .analysis-panel { display: none; }
}
@media (max-width: 850px) {
    body { overflow: auto; }
    .app { height: auto; min-height: 100vh; }
    .sidebar { width: 72px; padding: 10px; }
    .sidebar-brand > div:last-child, .nav-item:not(:first-child) { font-size: 0; }
    .sidebar-brand { justify-content: center; }
    .nav-item { justify-content: center; }
    .nav-item span { font-size: 15px; }
    .designer-layout { height: auto; min-height: 800px; grid-template-columns: 1fr; }
    .designer-workspace { height: 650px; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .hero { grid-template-columns: 1fr; }
    .hero-graphic { display: none; }
}
@media (max-width: 600px) {
    .view { padding: 15px; }
    .topbar { padding: 0 15px; }
    .form-grid { grid-template-columns: 1fr; }
    .filter-bar { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .selection-panel { flex-direction: column; align-items: stretch; }
    .selection-controls { flex-wrap: wrap; }
}
`);

/* ==========================================================
   22. README.md
========================================================== */
section("README.md");

write("README.md", `# Acoustic Engineering

منصة هندسة صوتية ذكية — Backend + Frontend كامل.

## 🚀 التشغيل

\`\`\`bash
npm install
cp .env.example .env
npm start
\`\`\`

ثم افتح: http://localhost:3000

**بيانات الدخول الأولى (owner):**
- Phone: \`0900000000\`
- Password: \`Admin@12345\`

> ⚠️ **مهم:** غيّر كلمة مرور المالك فور أول دخول.

## 📁 البنية

\`\`\`
acoustic-engineering/
├── server.js              ← نقطة الدخول
├── db/database.js         ← SQLite + بذور السماعات
├── middleware/auth.js     ← JWT + cookies
├── routes/                ← 6 مسارات API
│   ├── auth.js
│   ├── projects.js
│   ├── speakers.js
│   ├── analysis.js
│   ├── reports.js
│   └── admin.js
├── utils/                 ← منطق هندسي
│   ├── geometry.js
│   ├── acoustics.js
│   ├── autoLayout.js
│   ├── report.js          ← PDF بدعم العربية
│   ├── validators.js
│   └── errors.js
├── public/                ← Frontend
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── uploads/               ← datasheets
├── reports/               ← PDFs مُولّدة
└── fonts/                 ← ضع هنا Cairo-Regular.ttf
\`\`\`

## 🌐 API Endpoints

| Method | Endpoint | الوصف |
|---|---|---|
| POST | /api/auth/register | تسجيل جديد |
| POST | /api/auth/login | تسجيل دخول |
| POST | /api/auth/logout | خروج |
| GET | /api/auth/me | بيانات المستخدم الحالي |
| GET | /api/projects | كل المشاريع |
| POST | /api/projects | إنشاء مشروع |
| PUT | /api/projects/:id | تعديل |
| DELETE | /api/projects/:id | حذف |
| GET | /api/speakers | مكتبة السماعات |
| POST | /api/speakers | إضافة سماعة |
| POST | /api/analysis/auto-design | توزيع ذكي |
| POST | /api/analysis/analyze | تحليل SPL |
| POST | /api/reports/generate | تقرير PDF |
| GET | /api/admin/stats | إحصائيات |
| PUT | /api/admin/users/:id/role | تعديل دور |

## 🎨 دعم PDF العربي

لوضع التقرير بدعم العربية:

1. حمّل **خط Cairo** من: https://fonts.google.com/specimen/Cairo
2. ضع \`Cairo-Regular.ttf\` و \`Cairo-Bold.ttf\` في مجلد \`fonts/\`
3. **بدون الخطوط:** التقرير سيُولّد بالإنجليزية فقط

## 🛠 المتطلبات

- Node.js ≥ 18
- npm ≥ 9

## 📝 الترخيص

MIT
`);

/* ==========================================================
   BUILD ZIP
========================================================== */
section("بناء ZIP");

function createZip() {
    const zipName = "acoustic-engineering.zip";
    if (fs.existsSync(zipName)) fs.rmSync(zipName);

    const platform = process.platform;

    try {
        if (platform === "win32") {
            execSync(
                `powershell -NoProfile -Command "Compress-Archive -Path '${ROOT}\\*' -DestinationPath '${zipName}' -Force"`,
                { stdio: "inherit" }
            );
        } else {
            execSync(`zip -rq ${zipName} ${ROOT}`, { stdio: "inherit" });
        }

        const stats = fs.statSync(zipName);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

        console.log(`\n  ✅ تم إنشاء الملف: ${zipName} (${sizeMB} MB)\n`);
    } catch (err) {
        console.log("\n  ⚠  تعذر إنشاء ZIP تلقائياً.");
        console.log("     استخدم يدوياً:");
        console.log(`     • Windows: Compress-Archive -Path "${ROOT}\\*" -DestinationPath "${zipName}"`);
        console.log(`     • Linux/Mac: zip -r ${zipName} ${ROOT}`);
        console.log("");
    }
}

createZip();

/* ----------------------------------------------------------
   Final summary
---------------------------------------------------------- */

console.log("╔══════════════════════════════════════════════════════╗");
console.log("║  ✅  تم بناء المشروع بنجاح                          ║");
console.log("╚══════════════════════════════════════════════════════╝");
console.log("");
console.log("  الخطوات التالية:");
console.log("");
console.log(`  1. cd ${ROOT}`);
console.log("  2. npm install");
console.log("  3. cp .env.example .env  (عدّل JWT_SECRET)");
console.log("  4. npm start");
console.log("");
console.log("  ▸ افتح: http://localhost:3000");
console.log("  ▸ Owner phone: 0900000000");
console.log("  ▸ Owner password: Admin@12345");
console.log("");
console.log("  💡 لدعم PDF العربي، ضع خط Cairo في مجلد fonts/");
console.log("");