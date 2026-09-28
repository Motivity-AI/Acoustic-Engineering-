/* ============================================================
   Acoustic Engineering
   server/auth.js — Password Hashing, Sessions, Guards
   ============================================================ */

"use strict";

const bcrypt = require("bcryptjs");
const db = require("./database");

/* ---------------------------------------------------------
   Password
--------------------------------------------------------- */

function hashPassword(password) {
    return bcrypt.hashSync(password, 12);
}

function verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

/* ---------------------------------------------------------
   Register
--------------------------------------------------------- */

function registerUser({ name, phone, email, company, password }) {
    if (!name || !phone || !password) {
        throw new Error("الاسم ورقم الهاتف وكلمة المرور مطلوبة");
    }

    if (password.length < 6) {
        throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    }

    const exists = db
        .prepare("SELECT id FROM users WHERE phone = ?")
        .get(phone);

    if (exists) {
        throw new Error("رقم الهاتف مسجل بالفعل");
    }

    const passwordHash = hashPassword(password);
    const uid = "u_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);

    const result = db.prepare(`
        INSERT INTO users (uid, name, phone, email, company, password_hash)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(uid, name, phone, email || null, company || null, passwordHash);

    return db.prepare(`
        SELECT id, uid, name, phone, email, company, role, created_at
        FROM users WHERE id = ?
    `).get(result.lastInsertRowid);
}

/* ---------------------------------------------------------
   Login
--------------------------------------------------------- */

function loginUser(phone, password) {
    const user = db
        .prepare("SELECT * FROM users WHERE phone = ?")
        .get(phone);

    if (!user) {
        throw new Error("بيانات الدخول غير صحيحة");
    }

    if (!verifyPassword(password, user.password_hash)) {
        throw new Error("بيانات الدخول غير صحيحة");
    }

    delete user.password_hash;

    return user;
}

/* ---------------------------------------------------------
   Guards
--------------------------------------------------------- */

function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: "يجب تسجيل الدخول"
        });
    }

    next();
}

function requireAdmin(req, res, next) {
    if (
        !req.session ||
        !req.session.user ||
        req.session.user.role !== "admin"
    ) {
        return res.status(403).json({
            success: false,
            message: "صلاحيات الإدارة مطلوبة"
        });
    }

    next();
}

/* ---------------------------------------------------------
   Activity Log
--------------------------------------------------------- */

function logActivity(userId, action, description, metadata = {}) {
    try {
        db.prepare(`
            INSERT INTO activity (user_id, action, description, metadata)
            VALUES (?, ?, ?, ?)
        `).run(userId, action, description, JSON.stringify(metadata));
    } catch (error) {
        console.warn("[Activity log error]", error.message);
    }
}

module.exports = {
    hashPassword,
    verifyPassword,
    registerUser,
    loginUser,
    requireLogin,
    requireAdmin,
    logActivity
};