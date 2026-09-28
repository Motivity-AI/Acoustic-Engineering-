/* ============================================================
   server/routes/auth.js
   ============================================================ */

"use strict";

const express = require("express");
const router = express.Router();

const {
    registerUser,
    loginUser,
    requireLogin,
    logActivity
} = require("../auth");

/* POST /api/auth/register */
router.post("/register", (req, res) => {
    try {
        const user = registerUser(req.body);

        req.session.user = user;

        logActivity(user.id, "register", "إنشاء حساب جديد", {
            phone: user.phone
        });

        res.json({ success: true, user });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/* POST /api/auth/login */
router.post("/login", (req, res) => {
    try {
        const user = loginUser(req.body.phone, req.body.password);

        req.session.user = user;

        logActivity(user.id, "login", "تسجيل دخول", {
            phone: user.phone
        });

        res.json({ success: true, user });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
});

/* POST /api/auth/logout */
router.post("/logout", (req, res) => {
    const user = req.session?.user;

    if (user) {
        logActivity(user.id, "logout", "تسجيل خروج", {});
    }

    req.session.destroy(() => {
        res.json({ success: true });
    });
});

/* GET /api/auth/me */
router.get("/me", (req, res) => {
    res.json({
        success: true,
        user: req.session?.user || null
    });
});

/* POST /api/auth/reset-password — placeholder */
router.post("/reset-password", requireLogin, (req, res) => {
    res.status(501).json({
        success: false,
        message: "Password reset is not available in local mode"
    });
});

module.exports = router;