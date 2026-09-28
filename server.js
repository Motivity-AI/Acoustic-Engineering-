/* ============================================================
   Acoustic Engineering
   server.js — Unified Entry Point
   
   يعمل بوضعين:
   • Full mode  : Express + SQLite + Static Files
   • Serve mode : Static Files فقط (Firebase PWA)
   
   Usage:
     node server.js              → Full mode
     node server.js --serve-only → Static only
     node server.js --port=8080  → Custom port
   ============================================================ */

"use strict";

const args = process.argv.slice(2);
const SERVE_ONLY = args.includes("--serve-only");
const PORT_ARG = args.find(a => a.startsWith("--port="));
const PORT = PORT_ARG
    ? Number(PORT_ARG.split("=")[1])
    : (process.env.PORT || 3000);

if (SERVE_ONLY) {
    startStaticOnly();
} else {
    startFull();
}

/* =========================================================
   وضع الخادم الكامل
========================================================= */

function startFull() {
    try {
        const app = require("./server/index.js");

        app.listen(PORT, () => {
            banner("FULL MODE (Express + SQLite)");
            console.log(`   Server   : http://localhost:${PORT}`);
            console.log(`   API      : http://localhost:${PORT}/api/health`);
            console.log(`   Admin    : http://localhost:${PORT}/admin.html`);
            console.log(`   Admin Ph : 0000000000`);
            console.log(`   Password : Admin123!`);
            line();
        });
    } catch (error) {
        console.error("\n❌ فشل تشغيل الخادم الكامل:");
        console.error("  ", error.message);
        console.log("\n💡 تأكد من تثبيت الحزم: npm install");
        console.log("💡 أو شغّل الوضع الثابت: node server.js --serve-only\n");
        process.exit(1);
    }
}

/* =========================================================
   وضع الخادم الثابت فقط
========================================================= */

function startStaticOnly() {
    const express = require("express");
    const path = require("path");

    const app = express();
    const PUBLIC = path.join(__dirname, "public");

    app.use(express.static(PUBLIC, {
        setHeaders: (res, filePath) => {
            if (filePath.endsWith("sw.js")) {
                res.setHeader("Service-Worker-Allowed", "/");
            }
        }
    }));

    app.get("*", (req, res) => {
        res.sendFile(path.join(PUBLIC, "index.html"));
    });

    app.listen(PORT, () => {
        banner("STATIC MODE (Firebase PWA)");
        console.log(`   Server   : http://localhost:${PORT}`);
        console.log(`   Note     : Firebase must be configured in js/config.js`);
        line();
    });
}

/* =========================================================
   عرض الشعار
========================================================= */

function banner(mode) {
    console.log("");
    console.log("╔══════════════════════════════════════════╗");
    console.log("║      ACOUSTIC ENGINEERING v1.0.0         ║");
    console.log("║  Unified Platform — Firebase + SQLite    ║");
    console.log("╚══════════════════════════════════════════╝");
    console.log("");
    console.log(`   Mode     : ${mode}`);
}

function line() {
    console.log("─".repeat(46));
    console.log("");
}