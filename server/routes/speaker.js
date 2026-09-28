/* ============================================================
   server/routes/speakers.js
   ============================================================ */

"use strict";

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../database");
const { requireLogin } = require("../auth");

/* Multer setup */
const UPLOADS = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `spk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, name);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }
});

/* GET /api/speakers */
router.get("/", requireLogin, (req, res) => {
    const speakers = db.prepare(`
        SELECT * FROM speakers
        ORDER BY manufacturer, model
    `).all();

    res.json({ success: true, speakers });
});

/* GET /api/speakers/:id */
router.get("/:id", requireLogin, (req, res) => {
    const speaker = db.prepare(
        "SELECT * FROM speakers WHERE id = ?"
    ).get(req.params.id);

    if (!speaker) {
        return res.status(404).json({
            success: false,
            message: "Speaker not found"
        });
    }

    res.json({ success: true, speaker });
});

/* POST /api/speakers */
router.post("/", requireLogin, upload.single("datasheet"), (req, res) => {
    try {
        const body = req.body;
        const datasheet = req.file
            ? `/uploads/${req.file.filename}`
            : null;

        const result = db.prepare(`
            INSERT INTO speakers (
                manufacturer, model, category, rms_power, peak_power,
                max_spl, sensitivity, frequency_min, frequency_max,
                horizontal_coverage, vertical_coverage, impedance,
                weight, mounting_type, datasheet, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            body.manufacturer,
            body.model,
            body.category || "Point Source",
            Number(body.rms_power || 0),
            Number(body.peak_power || 0),
            Number(body.max_spl || 0),
            Number(body.sensitivity || 0),
            Number(body.frequency_min || 0),
            Number(body.frequency_max || 0),
            Number(body.horizontal_coverage || 90),
            Number(body.vertical_coverage || 60),
            Number(body.impedance || 8),
            Number(body.weight || 0),
            body.mounting_type || "Wall / Stand",
            datasheet,
            req.session.user.id
        );

        const speaker = db.prepare(
            "SELECT * FROM speakers WHERE id = ?"
        ).get(result.lastInsertRowid);

        res.json({ success: true, speaker });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/* DELETE /api/speakers/:id — admin only */
router.delete("/:id", requireLogin, (req, res) => {
    if (req.session.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Admin required"
        });
    }

    const result = db.prepare(
        "DELETE FROM speakers WHERE id = ?"
    ).run(req.params.id);

    res.json({ success: result.changes > 0 });
});

module.exports = router;