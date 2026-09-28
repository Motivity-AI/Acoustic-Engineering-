/* ============================================================
   Acoustic Engineering
   js/backend.js
   
   ⭐ CORE UNIFICATION LAYER ⭐
   
   يكتشف تلقائياً أفضل مصدر بيانات:
   1. Firebase (إذا كان مُهيأ ومتصل)
   2. Express Server (إذا كان متاح)
   3. LocalStorage (احتياطي)
   ============================================================ */

(function () {
    "use strict";

    window.AcousticEngineering = window.AcousticEngineering || {};
    const AE = window.AcousticEngineering;

    /* ---------------------------------------------------------
       State
    --------------------------------------------------------- */

    const state = {
        mode: "detecting",   // "firebase" | "server" | "local" | "detecting"
        ready: false,
        firebaseAvailable: false,
        serverAvailable: false,
        listeners: []
    };

    /* ---------------------------------------------------------
       Event System
    --------------------------------------------------------- */

    function emit(name, detail = {}) {
        try {
            window.dispatchEvent(new CustomEvent(name, { detail }));
        } catch {}
    }

    /* ---------------------------------------------------------
       Detection
    --------------------------------------------------------- */

    async function detect() {
        state.mode = "detecting";

        emit("backend:detecting");

        /* 1. فحص Firebase */
        const firebase = AE.firebase || window.AcousticFirebase;
        const config = AE.config || window.AcousticConfig || {};

        if (firebase && typeof config.isFirebaseConfigured === "function") {
            try {
                const configured = config.isFirebaseConfigured();

                if (configured) {
                    // انتظر جاهزية firebase
                    if (!firebase.state?.initialized) {
                        if (typeof firebase.initialize === "function") {
                            await firebase.initialize();
                        }
                    }

                    if (firebase.state?.available && !firebase.state?.offline) {
                        state.firebaseAvailable = true;
                        state.mode = "firebase";
                        state.ready = true;

                        emit("backend:ready", {
                            mode: "firebase",
                            source: firebase
                        });

                        return "firebase";
                    }
                }
            } catch (error) {
                console.warn("[Backend] Firebase detection failed:", error);
            }
        }

        /* 2. فحص Express Server */
        const api = AE.api || window.AcousticAPI;

        if (api && typeof api.checkServer === "function") {
            try {
                const available = await api.checkServer();

                if (available) {
                    state.serverAvailable = true;
                    state.mode = "server";
                    state.ready = true;

                    emit("backend:ready", {
                        mode: "server",
                        source: api
                    });

                    return "server";
                }
            } catch (error) {
                console.warn("[Backend] Server detection failed:", error);
            }
        }

        /* 3. احتياطي: LocalStorage */
        state.mode = "local";
        state.ready = true;

        emit("backend:ready", {
            mode: "local",
            source: null
        });

        return "local";
    }

    /* ---------------------------------------------------------
       Mode info
    --------------------------------------------------------- */

    function getMode() {
        return state.mode;
    }

    function getModeLabel() {
        const labels = {
            firebase: "Firebase Cloud",
            server: "Local Server",
            local: "Local Storage",
            detecting: "Detecting..."
        };

        return labels[state.mode] || "Unknown";
    }

    function isReady() {
        return state.ready;
    }

    /* ---------------------------------------------------------
       Subscribe
    --------------------------------------------------------- */

    function onReady(callback) {
        if (typeof callback !== "function") return () => {};

        if (state.ready) {
            callback({ mode: state.mode });
            return () => {};
        }

        const handler = (event) => callback(event.detail);

        window.addEventListener("backend:ready", handler);

        return () => window.removeEventListener("backend:ready", handler);
    }

    /* ---------------------------------------------------------
       Auth Abstraction
    --------------------------------------------------------- */

    const auth = {
        async register(data) {
            const mode = state.mode;

            if (mode === "firebase") {
                const fb = AE.firebase;
                const result = await fb.register(data.email, data.password);

                if (result.success) {
                    await fb.saveUserProfile(result.user.uid, {
                        uid: result.user.uid,
                        name: data.name,
                        email: data.email,
                        phone: data.phone,
                        role: "user",
                        createdAt: Date.now()
                    });
                }

                return {
                    success: result.success,
                    user: result.user,
                    error: result.error
                };
            }

            if (mode === "server") {
                return await AE.api.auth.register({
                    name: data.name,
                    phone: data.phone,
                    email: data.email,
                    company: data.company,
                    password: data.password
                });
            }

            // Local
            const user = {
                uid: "local_" + Date.now(),
                name: data.name,
                email: data.email,
                phone: data.phone,
                role: "user",
                local: true
            };

            localStorage.setItem(
                "acoustic_engineering_user",
                JSON.stringify(user)
            );

            return { success: true, user };
        },

        async login(emailOrPhone, password) {
            const mode = state.mode;

            if (mode === "firebase") {
                const result = await AE.firebase.login(emailOrPhone, password);
                return {
                    success: result.success,
                    user: result.user,
                    error: result.error
                };
            }

            if (mode === "server") {
                return await AE.api.auth.login(emailOrPhone, password);
            }

            // Local
            const saved = localStorage.getItem("acoustic_engineering_user");

            if (saved) {
                const user = JSON.parse(saved);
                if (user.email === emailOrPhone || user.phone === emailOrPhone) {
                    return { success: true, user };
                }
            }

            throw new Error("Firebase غير متصل. قم بإنشاء حساب محلي أولاً.");
        },

        async logout() {
            const mode = state.mode;

            if (mode === "firebase") {
                await AE.firebase.logout();
            } else if (mode === "server") {
                await AE.api.auth.logout();
            }

            localStorage.removeItem("acoustic_engineering_user");

            return { success: true };
        },

        async getCurrentUser() {
            const mode = state.mode;

            if (mode === "firebase") {
                return AE.firebase.getCurrentUser();
            }

            if (mode === "server") {
                try {
                    const result = await AE.api.auth.me();
                    return result.user;
                } catch {
                    return null;
                }
            }

            const saved = localStorage.getItem("acoustic_engineering_user");
            return saved ? JSON.parse(saved) : null;
        }
    };

    /* ---------------------------------------------------------
       Projects Abstraction
    --------------------------------------------------------- */

    const projects = {
        async list() {
            const mode = state.mode;

            if (mode === "firebase") {
                try {
                    const result = await AE.firebase.get("projects");
                    if (!result.success || !result.data) return [];

                    return Object.values(result.data).filter(p =>
                        !p.ownerId ||
                        p.ownerId === AE.firebase.getCurrentUserId()
                    );
                } catch {
                    return [];
                }
            }

            if (mode === "server") {
                const result = await AE.api.projects.list();
                return result.projects || [];
            }

            // Local
            const raw = localStorage.getItem("acoustic_engineering_projects");
            return raw ? JSON.parse(raw) : [];
        },

        async get(id) {
            const mode = state.mode;

            if (mode === "firebase") {
                const result = await AE.firebase.get(`projects/${id}`);
                return result.success ? result.data : null;
            }

            if (mode === "server") {
                const result = await AE.api.projects.get(id);
                return result.project;
            }

            const all = await this.list();
            return all.find(p => String(p.id) === String(id)) || null;
        },

        async create(data) {
            const mode = state.mode;

            if (mode === "firebase") {
                const id = "p_" + Date.now().toString(36) +
                    "_" + Math.random().toString(36).slice(2, 8);

                const project = {
                    ...data,
                    id,
                    projectId: id,
                    ownerId: AE.firebase.getCurrentUserId(),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };

                await AE.firebase.set(`projects/${id}`, project);
                return project;
            }

            if (mode === "server") {
                const result = await AE.api.projects.create(data);
                return result.project;
            }

            // Local
            const projects = await this.list();

            const project = {
                ...data,
                id: "p_" + Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            projects.unshift(project);
            localStorage.setItem(
                "acoustic_engineering_projects",
                JSON.stringify(projects)
            );

            return project;
        },

        async update(id, data) {
            const mode = state.mode;

            if (mode === "firebase") {
                const updated = {
                    ...data,
                    id,
                    updatedAt: Date.now()
                };

                await AE.firebase.update(`projects/${id}`, updated);
                return updated;
            }

            if (mode === "server") {
                const result = await AE.api.projects.update(id, data);
                return result.project;
            }

            const projects = await this.list();
            const index = projects.findIndex(p => String(p.id) === String(id));

            if (index === -1) throw new Error("Project not found");

            projects[index] = {
                ...projects[index],
                ...data,
                updatedAt: Date.now()
            };

            localStorage.setItem(
                "acoustic_engineering_projects",
                JSON.stringify(projects)
            );

            return projects[index];
        },

        async delete(id) {
            const mode = state.mode;

            if (mode === "firebase") {
                await AE.firebase.remove(`projects/${id}`);
                return { success: true };
            }

            if (mode === "server") {
                return await AE.api.projects.delete(id);
            }

            const projects = await this.list();
            const filtered = projects.filter(p => String(p.id) !== String(id));

            localStorage.setItem(
                "acoustic_engineering_projects",
                JSON.stringify(filtered)
            );

            return { success: true };
        }
    };

    /* ---------------------------------------------------------
       Speakers Abstraction
    --------------------------------------------------------- */

    const speakers = {
        async list() {
            const mode = state.mode;

            if (mode === "firebase") {
                try {
                    const result = await AE.firebase.get("speakers");
                    if (result.success && result.data) {
                        return Object.values(result.data);
                    }
                } catch {}
            }

            if (mode === "server") {
                const result = await AE.api.speakers.list();
                return result.speakers || [];
            }

            // Local — use speaker.js database
            if (AE.speaker && typeof AE.speaker.getAll === "function") {
                return AE.speaker.getAll();
            }

            return [];
        }
    };

    /* ---------------------------------------------------------
       Reports Abstraction
    --------------------------------------------------------- */

    const reports = {
        async generate(data) {
            const mode = state.mode;

            if (mode === "firebase") {
                // Client-side HTML report
                if (AE.report && typeof AE.report.open === "function") {
                    AE.report.open();
                    return { success: true, mode: "html" };
                }
                return { success: false };
            }

            if (mode === "server") {
                const result = await AE.api.reports.generate(data);
                return { success: true, mode: "pdf", file: result.file };
            }

            // Local — HTML report
            if (AE.report && typeof AE.report.open === "function") {
                AE.report.open();
                return { success: true, mode: "html" };
            }

            return { success: false };
        }
    };

    /* ---------------------------------------------------------
       Public API
    --------------------------------------------------------- */

    const Backend = {
        state,
        detect,
        getMode,
        getModeLabel,
        isReady,
        onReady,
        auth,
        projects,
        speakers,
        reports
    };

    AE.backend = Backend;
    window.AcousticBackend = Backend;

    /* ---------------------------------------------------------
       Auto-detect on load
    --------------------------------------------------------- */

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            setTimeout(detect, 300);
        }, { once: true });
    } else {
        setTimeout(detect, 300);
    }
})();