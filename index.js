const express = require("express");
const session = require("express-session");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("./database");

const {
    registerUser,
    loginUser,
    requireLogin,
    requireAdmin
} = require("./auth");

const {
    calculateRoom
} = require("./engine/geometry");

const {
    analyzeDesign
} = require("./engine/acoustics");

const {
    autoLayout,
    addSubwoofers
} = require("./engine/autoLayout");

const {
    generateEngineeringReport
} = require("./engine/report");

const app = express();

const PORT =
    process.env.PORT || 3000;

const ROOT =
    path.join(__dirname, "..");

const PUBLIC =
    path.join(ROOT, "public");

const UPLOADS =
    path.join(ROOT, "uploads");

const REPORTS =
    path.join(ROOT, "reports");

[
    UPLOADS,
    REPORTS
].forEach(directory => {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(
            directory,
            { recursive: true }
        );
    }
});

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "ACOUSTIC_ENGINEERING_CHANGE_THIS_SECRET",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge:
                1000 * 60 * 60 * 24 * 7
        }
    })
);

app.use(
    express.static(PUBLIC)
);

const storage =
    multer.diskStorage({
        destination:
            (req, file, cb) => {
                cb(null, UPLOADS);
            },

        filename:
            (req, file, cb) => {
                const ext =
                    path.extname(
                        file.originalname
                    );

                const name =
                    `${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2)}`;

                cb(
                    null,
                    `${name}${ext}`
                );
            }
    });

const upload =
    multer({
        storage,
        limits: {
            fileSize:
                15 * 1024 * 1024
        }
    });

/* =========================
   AUTH
========================= */

app.post(
    "/api/auth/register",
    (req, res) => {
        try {
            const user =
                registerUser(
                    req.body
                );

            req.session.user =
                user;

            res.json({
                success: true,
                user
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message:
                    error.message
            });
        }
    }
);

app.post(
    "/api/auth/login",
    (req, res) => {
        try {
            const user =
                loginUser(
                    req.body.phone,
                    req.body.password
                );

            req.session.user =
                user;

            res.json({
                success: true,
                user
            });
        } catch (error) {
            res.status(401).json({
                success: false,
                message:
                    error.message
            });
        }
    }
);

app.post(
    "/api/auth/logout",
    (req, res) => {
        req.session.destroy(
            () => {
                res.json({
                    success: true
                });
            }
        );
    }
);

app.get(
    "/api/auth/me",
    (req, res) => {
        res.json({
            success: true,
            user:
                req.session?.user ||
                null
        });
    }
);

/* =========================
   USERS
========================= */

app.get(
    "/api/users",
    requireLogin,
    requireAdmin,
    (req, res) => {
        const users =
            db.prepare(`
                SELECT
                    id,
                    name,
                    phone,
                    email,
                    company,
                    role,
                    created_at
                FROM users
                ORDER BY id DESC
            `).all();

        res.json({
            success: true,
            users
        });
    }
);

/* =========================
   SPEAKERS
========================= */

app.get(
    "/api/speakers",
    requireLogin,
    (req, res) => {
        const speakers =
            db.prepare(`
                SELECT *
                FROM speakers
                ORDER BY manufacturer, model
            `).all();

        res.json({
            success: true,
            speakers
        });
    }
);

app.post(
    "/api/speakers",
    requireLogin,
    upload.single("datasheet"),
    (req, res) => {
        try {
            const body =
                req.body;

            const datasheet =
                req.file
                    ? `/uploads/${req.file.filename}`
                    : null;

            const result =
                db.prepare(`
                    INSERT INTO speakers (
                        manufacturer,
                        model,
                        category,
                        rms_power,
                        peak_power,
                        max_spl,
                        sensitivity,
                        frequency_min,
                        frequency_max,
                        horizontal_coverage,
                        vertical_coverage,
                        impedance,
                        weight,
                        mounting_type,
                        datasheet,
                        created_by
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    body.manufacturer,
                    body.model,
                    body.category ||
                        "Point Source",
                    Number(
                        body.rms_power || 0
                    ),
                    Number(
                        body.peak_power || 0
                    ),
                    Number(
                        body.max_spl || 0
                    ),
                    Number(
                        body.sensitivity || 0
                    ),
                    Number(
                        body.frequency_min || 0
                    ),
                    Number(
                        body.frequency_max || 0
                    ),
                    Number(
                        body.horizontal_coverage ||
                        90
                    ),
                    Number(
                        body.vertical_coverage ||
                        60
                    ),
                    Number(
                        body.impedance || 8
                    ),
                    Number(
                        body.weight || 0
                    ),
                    body.mounting_type ||
                        "Wall / Stand",
                    datasheet,
                    req.session.user.id
                );

            const speaker =
                db.prepare(
                    "SELECT * FROM speakers WHERE id = ?"
                ).get(
                    result.lastInsertRowid
                );

            res.json({
                success: true,
                speaker
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message:
                    error.message
            });
        }
    }
);

/* =========================
   PROJECTS
========================= */

app.get(
    "/api/projects",
    requireLogin,
    (req, res) => {
        const projects =
            db.prepare(`
                SELECT *
                FROM projects
                WHERE user_id = ?
                ORDER BY updated_at DESC
            `).all(
                req.session.user.id
            );

        res.json({
            success: true,
            projects
        });
    }
);

app.post(
    "/api/projects",
    requireLogin,
    (req, res) => {
        try {
            const body =
                req.body;

            const room =
                calculateRoom(
                    body.width,
                    body.length,
                    body.height
                );

            const result =
                db.prepare(`
                    INSERT INTO projects (
                        user_id,
                        name,
                        project_type,
                        description,
                        width,
                        length,
                        height,
                        area,
                        volume,
                        design_mode,
                        project_data
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    req.session.user.id,
                    body.name,
                    body.project_type ||
                        "Custom",
                    body.description ||
                        "",
                    room.width,
                    room.length,
                    room.height,
                    room.area,
                    room.volume,
                    body.design_mode ||
                        "manual",
                    JSON.stringify(
                        body.project_data ||
                        {}
                    )
                );

            const project =
                db.prepare(
                    "SELECT * FROM projects WHERE id = ?"
                ).get(
                    result.lastInsertRowid
                );

            res.json({
                success: true,
                project
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message:
                    error.message
            });
        }
    }
);

app.get(
    "/api/projects/:id",
    requireLogin,
    (req, res) => {
        const project =
            db.prepare(`
                SELECT *
                FROM projects
                WHERE id = ?
                AND user_id = ?
            `).get(
                req.params.id,
                req.session.user.id
            );

        if (!project) {
            return res.status(404).json({
                success: false,
                message:
                    "Project not found"
            });
        }

        project.project_data =
            JSON.parse(
                project.project_data ||
                "{}"
            );

        res.json({
            success: true,
            project
        });
    }
);

app.put(
    "/api/projects/:id",
    requireLogin,
    (req, res) => {
        const existing =
            db.prepare(`
                SELECT *
                FROM projects
                WHERE id = ?
                AND user_id = ?
            `).get(
                req.params.id,
                req.session.user.id
            );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message:
                    "Project not found"
            });
        }

        const body =
            req.body;

        const width =
            Number(
                body.width ??
                existing.width
            );

        const length =
            Number(
                body.length ??
                existing.length
            );

        const height =
            Number(
                body.height ??
                existing.height
            );

        const room =
            calculateRoom(
                width,
                length,
                height
            );

        db.prepare(`
            UPDATE projects
            SET
                name = ?,
                project_type = ?,
                description = ?,
                width = ?,
                length = ?,
                height = ?,
                area = ?,
                volume = ?,
                design_mode = ?,
                project_data = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            AND user_id = ?
        `).run(
            body.name ??
                existing.name,

            body.project_type ??
                existing.project_type,

            body.description ??
                existing.description,

            room.width,
            room.length,
            room.height,
            room.area,
            room.volume,

            body.design_mode ??
                existing.design_mode,

            JSON.stringify(
                body.project_data ??
                JSON.parse(
                    existing.project_data ||
                    "{}"
                )
            ),

            req.params.id,
            req.session.user.id
        );

        const updated =
            db.prepare(
                "SELECT * FROM projects WHERE id = ?"
            ).get(
                req.params.id
            );

        res.json({
            success: true,
            project: updated
        });
    }
);

app.delete(
    "/api/projects/:id",
    requireLogin,
    (req, res) => {
        const result =
            db.prepare(`
                DELETE FROM projects
                WHERE id = ?
                AND user_id = ?
            `).run(
                req.params.id,
                req.session.user.id
            );

        res.json({
            success:
                result.changes > 0
        });
    }
);

/* =========================
   AI AUTO DESIGN
========================= */

app.post(
    "/api/analysis/auto-design",
    requireLogin,
    (req, res) => {
        try {
            const {
                room,
                speaker,
                application,
                mountingPreference,
                includeSubwoofer,
                subwoofer
            } = req.body;

            if (
                !room ||
                !speaker
            ) {
                throw new Error(
                    "Room and speaker data are required"
                );
            }

            const result =
                autoLayout({
                    room,
                    speaker,
                    application:
                        application ||
                        "general",
                    mountingPreference:
                        mountingPreference ||
                        "auto"
                });

            let subwoofers =
                [];

            if (
                includeSubwoofer &&
                subwoofer
            ) {
                subwoofers =
                    addSubwoofers({
                        room,
                        speaker:
                            subwoofer
                    });
            }

            res.json({
                success: true,
                design: {
                    ...result,
                    subwoofers
                }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message:
                    error.message
            });
        }
    }
);

/* =========================
   ACOUSTIC ANALYSIS
========================= */

app.post(
    "/api/analysis/analyze",
    requireLogin,
    (req, res) => {
        try {
            const {
                room,
                speakers,
                targetSPL
            } = req.body;

            if (
                !room ||
                !Array.isArray(
                    speakers
                )
            ) {
                throw new Error(
                    "Invalid analysis data"
                );
            }

            const result =
                analyzeDesign({
                    room,
                    speakers,
                    targetSPL:
                        Number(
                            targetSPL || 85
                        )
                });

            res.json({
                success: true,
                analysis: result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message:
                    error.message
            });
        }
    }
);

/* =========================
   REPORT
========================= */

app.post(
    "/api/reports/generate",
    requireLogin,
    async (req, res) => {
        try {
            const {
                projectId,
                room,
                speakers,
                analysis,
                design
            } = req.body;

            const project =
                db.prepare(`
                    SELECT *
                    FROM projects
                    WHERE id = ?
                    AND user_id = ?
                `).get(
                    projectId,
                    req.session.user.id
                );

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Project not found"
                });
            }

            const fileName =
                `AE-Report-${project.id}-${Date.now()}.pdf`;

            const outputPath =
                path.join(
                    REPORTS,
                    fileName
                );

            await generateEngineeringReport({
                project,
                user:
                    req.session.user,
                room,
                speakers,
                analysis,
                design,
                outputPath
            });

            db.prepare(`
                INSERT INTO reports (
                    project_id,
                    user_id,
                    file_name
                )
                VALUES (?, ?, ?)
            `).run(
                project.id,
                req.session.user.id,
                fileName
            );

            res.json({
                success: true,
                file:
                    `/reports/${fileName}`
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    error.message
            });
        }
    }
);

/* =========================
   ADMIN DASHBOARD
========================= */

app.get(
    "/api/admin/stats",
    requireLogin,
    requireAdmin,
    (req, res) => {
        const users =
            db.prepare(
                "SELECT COUNT(*) AS count FROM users"
            ).get().count;

        const projects =
            db.prepare(
                "SELECT COUNT(*) AS count FROM projects"
            ).get().count;

        const speakers =
            db.prepare(
                "SELECT COUNT(*) AS count FROM speakers"
            ).get().count;

        const reports =
            db.prepare(
                "SELECT COUNT(*) AS count FROM reports"
            ).get().count;

        res.json({
            success: true,
            stats: {
                users,
                projects,
                speakers,
                reports
            }
        });
    }
);

app.get(
    "/api/admin/projects",
    requireLogin,
    requireAdmin,
    (req, res) => {
        const projects =
            db.prepare(`
                SELECT
                    projects.*,
                    users.name AS user_name,
                    users.phone AS user_phone
                FROM projects
                JOIN users
                    ON users.id =
                    projects.user_id
                ORDER BY
                    projects.updated_at DESC
            `).all();

        res.json({
            success: true,
            projects
        });
    }
);

app.use(
    "/uploads",
    express.static(UPLOADS)
);

app.use(
    "/reports",
    express.static(REPORTS)
);

app.get(
    "*",
    (req, res) => {
        res.sendFile(
            path.join(
                PUBLIC,
                "index.html"
            )
        );
    }
);

app.listen(
    PORT,
    () => {
        console.log("");
        console.log(
            "=========================================="
        );
        console.log(
            "       ACOUSTIC ENGINEERING v1.0"
        );
        console.log(
            "=========================================="
        );
        console.log(
            `Server: http://localhost:${PORT}`
        );
        console.log(
            "Admin phone: 0000000000"
        );
        console.log(
            "Admin password: Admin123!"
        );
        console.log(
            "=========================================="
        );
        console.log("");
    }
);
