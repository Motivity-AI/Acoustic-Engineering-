/* ============================================================
   Acoustic Engineering
   server/index.js — Express Application
   ============================================================ */

"use strict";

const express = require("express");
const session = require("express-session");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

/* ---------------------------------------------------------
   Paths
--------------------------------------------------------- */

const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const UPLOADS = path.join(ROOT, "uploads");
const REPORTS = path.join(ROOT, "reports");
const DATA = path.join(ROOT, "data");

[UPLOADS, REPORTS, DATA].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

/* ---------------------------------------------------------
   Middleware
--------------------------------------------------------- */

app.use(cors({ origin: true, credentials: true }));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(session({
    secret: process.env.SESSION_SECRET ||
        "ACOUSTIC_ENGINEERING_CHANGE_THIS_SECRET",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        sameSite: "lax"
    },
    name: "ae.sid"
}));

/* ---------------------------------------------------------
   Static Files
--------------------------------------------------------- */

app.use(express.static(PUBLIC, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith("sw.js")) {
            res.setHeader("Service-Worker-Allowed", "/");
        }
    }
}));

app.use("/uploads", express.static(UPLOADS));
app.use("/reports", express.static(REPORTS));

/* ---------------------------------------------------------
   API Routes
--------------------------------------------------------- */

app.use("/api/health", require("./routes/health"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/speakers", require("./routes/speakers"));
app.use("/api/reports", require("./routes/reports"));

/* ---------------------------------------------------------
   SPA Fallback
--------------------------------------------------------- */

app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({
            success: false,
            message: "API endpoint not found"
        });
    }

    res.sendFile(path.join(PUBLIC, "index.html"));
});

/* ---------------------------------------------------------
   Error Handler
--------------------------------------------------------- */

app.use((error, req, res, next) => {
    console.error("[Server Error]", error);

    res.status(error.status || 500).json({
        success: false,
        message: error.message || "Internal server error"
    });
});

module.exports = app;