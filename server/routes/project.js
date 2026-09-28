/* ============================================================
   server/routes/projects.js
   ============================================================ */

"use strict";

const express = require("express");
const router = express.Router();

const db = require("../database");
const { requireLogin, requireAdmin, logActivity } = require("../auth");
const { calculateRoom } = require("../engine/geometry");

/* GET /api/projects — list user projects */
router.get("/", requireLogin, (req, res) => {
    const projects = db.prepare(`
        SELECT * FROM projects
        WHERE user_id = ?
        ORDER BY updated_at DESC
    `).all(req.session.user.id);

    projects.forEach(p => {
        try { p.project_data = JSON.parse(p.project_data || "{}"); }
        catch { p.project_data = {}; }
    });

    res.json({ success: true, projects });
});

/* GET /api/projects/all — admin only */
router.get("/all", requireLogin, requireAdmin, (req, res) => {
    const projects = db.prepare(`
        SELECT p.*, u.name AS user_name, u.phone AS user_phone
        FROM projects p
        JOIN users u ON u.id = p.user_id
        ORDER BY p.updated_at DESC
    `).all();

    projects.forEach(p => {
        try { p.project_data = JSON.parse(p.project_data || "{}"); }
        catch { p.project_data = {}; }
    });

    res.json({ success: true, projects });
});

/* POST /api/projects */
router.post("/", requireLogin, (req, res) => {
    try {
        const body = req.body;

        const room = calculateRoom(
            body.width, body.length, body.height
        );

        const uid = "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);

        const result = db.prepare(`
            INSERT INTO projects (
                project_uid, user_id, name, project_type, description,
                width, length, height, area, volume, design_mode, project_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            uid,
            req.session.user.id,
            body.name,
            body.project_type || "Custom",
            body.description || "",
            room.width, room.length, room.height,
            room.area, room.volume,
            body.design_mode || "manual",
            JSON.stringify(body.project_data || {})
        );

        const project = db.prepare(
            "SELECT * FROM projects WHERE id = ?"
        ).get(result.lastInsertRowid);

        project.project_data = JSON.parse(project.project_data || "{}");

        logActivity(req.session.user.id, "project_create",
            `إنشاء مشروع: ${project.name}`, { projectId: project.id });

        res.json({ success: true, project });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

/* GET /api/projects/:id */
router.get("/:id", requireLogin, (req, res) => {
    const project = db.prepare(`
        SELECT * FROM projects WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.session.user.id);

    if (!project) {
        return res.status(404).json({
            success: false,
            message: "Project not found"
        });
    }

    try { project.project_data = JSON.parse(project.project_data || "{}"); }
    catch { project.project_data = {}; }

    res.json({ success: true, project });
});

/* PUT /api/projects/:id */
router.put("/:id", requireLogin, (req, res) => {
    const existing = db.prepare(`
        SELECT * FROM projects WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.session.user.id);

    if (!existing) {
        return res.status(404).json({
            success: false,
            message: "Project not found"
        });
    }

    const body = req.body;

    const width = Number(body.width ?? existing.width);
    const length = Number(body.length ?? existing.length);
    const height = Number(body.height ?? existing.height);

    const room = calculateRoom(width, length, height);

    let projectData;
    try {
        projectData = body.project_data ??
            JSON.parse(existing.project_data || "{}");
    } catch {
        projectData = {};
    }

    db.prepare(`
        UPDATE projects SET
            name = ?, project_type = ?, description = ?,
            width = ?, length = ?, height = ?,
            area = ?, volume = ?, design_mode = ?,
            project_data = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
    `).run(
        body.name ?? existing.name,
        body.project_type ?? existing.project_type,
        body.description ?? existing.description,
        room.width, room.length, room.height,
        room.area, room.volume,
        body.design_mode ?? existing.design_mode,
        JSON.stringify(projectData),
        req.params.id,
        req.session.user.id
    );

    const updated = db.prepare(
        "SELECT * FROM projects WHERE id = ?"
    ).get(req.params.id);

    try { updated.project_data = JSON.parse(updated.project_data || "{}"); }
    catch { updated.project_data = {}; }

    logActivity(req.session.user.id, "project_update",
        `تحديث مشروع: ${updated.name}`, { projectId: updated.id });

    res.json({ success: true, project: updated });
});

/* DELETE /api/projects/:id */
router.delete("/:id", requireLogin, (req, res) => {
    const result = db.prepare(`
        DELETE FROM projects WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.session.user.id);

    if (result.changes > 0) {
        logActivity(req.session.user.id, "project_delete",
            `حذف مشروع رقم ${req.params.id}`, {});
    }

    res.json({ success: result.changes > 0 });
});

module.exports = router;