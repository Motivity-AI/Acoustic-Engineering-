/* ============================================================
   Acoustic Engineering
   js/storage.js
   Local Storage / Firebase Storage / Project Persistence
   ============================================================ */

(function () {
    "use strict";

    /* ---------------------------------------------------------
       Namespace
    --------------------------------------------------------- */

    window.AcousticEngineering =
        window.AcousticEngineering || {};

    const AE =
        window.AcousticEngineering;

    const CONFIG =
        AE.config ||
        window.AcousticConfig ||
        {};

    const Firebase =
        AE.firebase ||
        window.AcousticFirebase ||
        null;

    const Auth =
        AE.auth ||
        window.AcousticAuth ||
        null;

    /* ---------------------------------------------------------
       State
    --------------------------------------------------------- */

    const state = {

        initialized:
            false,

        currentProjectId:
            null,

        currentProject:
            null,

        projects:
            [],

        loading:
            false,

        saving:
            false,

        lastSavedAt:
            null,

        dirty:
            false,

        offline:
            false
    };

    /* ---------------------------------------------------------
       Configuration
    --------------------------------------------------------- */

    const STORAGE_CONFIG = {

        prefix:
            CONFIG.localStorage?.prefix ||
            "acoustic_engineering_",

        keys: {

            projects:
                CONFIG.localStorage?.keys
                    ?.projects ||
                "projects",

            activeProject:
                CONFIG.localStorage?.keys
                    ?.activeProject ||
                "active_project",

            user:
                CONFIG.localStorage?.keys
                    ?.user ||
                "user",

            settings:
                CONFIG.localStorage?.keys
                    ?.settings ||
                "settings"
        }
    };

    /* ---------------------------------------------------------
       Utility
    --------------------------------------------------------- */

    function now() {

        return Date.now();
    }

    function generateId(
        prefix = "project"
    ) {

        return (
            prefix +
            "_" +
            Date.now().toString(36) +
            "_" +
            Math.random()
                .toString(36)
                .slice(2, 8)
        );
    }

    function storageKey(
        key
    ) {

        return (
            STORAGE_CONFIG.prefix +
            key
        );
    }

    function localSet(
        key,
        value
    ) {

        try {

            localStorage.setItem(
                storageKey(key),
                JSON.stringify(value)
            );

            return true;

        } catch (error) {

            console.warn(
                "LocalStorage set failed:",
                error
            );

            return false;
        }
    }

    function localGet(
        key,
        fallback = null
    ) {

        try {

            const raw =
                localStorage.getItem(
                    storageKey(key)
                );

            if (
                raw === null
            ) {
                return fallback;
            }

            return JSON.parse(
                raw
            );

        } catch (error) {

            console.warn(
                "LocalStorage read failed:",
                error
            );

            return fallback;
        }
    }

    function localRemove(
        key
    ) {

        try {

            localStorage.removeItem(
                storageKey(key)
            );

            return true;

        } catch (error) {

            return false;
        }
    }

    function emit(
        eventName,
        detail = {}
    ) {

        try {

            window.dispatchEvent(
                new CustomEvent(
                    eventName,
                    {
                        detail
                    }
                )
            );

        } catch (error) {}
    }

    /* ---------------------------------------------------------
       Current User
    --------------------------------------------------------- */

    function getUserId() {

        if (
            Auth &&
            typeof Auth.getCurrentUser ===
            "function"
        ) {

            const user =
                Auth.getCurrentUser();

            if (
                user?.uid
            ) {
                return user.uid;
            }
        }

        if (
            Firebase &&
            typeof Firebase.getCurrentUserId ===
            "function"
        ) {

            return Firebase.getCurrentUserId();
        }

        return null;
    }

    /* ---------------------------------------------------------
       Project Normalization
    --------------------------------------------------------- */

    function normalizeProject(
        project = {}
    ) {

        const currentUserId =
            getUserId();

        const id =
            project.id ||
            project.projectId ||
            generateId();

        return {

            id,

            projectId:
                id,

            projectName:
                project.projectName ||
                project.name ||
                "مشروع صوتي جديد",

            name:
                project.name ||
                project.projectName ||
                "مشروع صوتي جديد",

            clientName:
                project.clientName ||
                "",

            projectLocation:
                project.projectLocation ||
                "",

            venueType:
                project.venueType ||
                "custom",

            description:
                project.description ||
                "",

            ownerId:
                project.ownerId ||
                currentUserId ||
                null,

            createdAt:
                project.createdAt ||
                now(),

            updatedAt:
                now(),

            version:
                project.version ||
                "1.0.0",

            room:
                project.room ||
                {
                    width:
                        CONFIG.engineering
                            ?.defaults
                            ?.room
                            ?.width ||
                        12,

                    depth:
                        CONFIG.engineering
                            ?.defaults
                            ?.room
                            ?.depth ||
                        8,

                    height:
                        CONFIG.engineering
                            ?.defaults
                            ?.room
                            ?.height ||
                        3
                },

            stage:
                project.stage ||
                {
                    width:
                        6,

                    depth:
                        2,

                    x:
                        3,

                    y:
                        0.5
                },

            audience:
                project.audience ||
                {
                    size:
                        100
                },

            target:
                project.target ||
                {
                    spl:
                        95,

                    coverage:
                        90,

                    headroom:
                        6
                },

            design:
                project.design ||
                {},

            speakers:
                Array.isArray(
                    project.speakers
                )
                    ? project.speakers
                    : [],

            analysis:
                project.analysis ||
                null,

            bom:
                Array.isArray(
                    project.bom
                )
                    ? project.bom
                    : [],

            settings:
                project.settings ||
                {},

            metadata:
                project.metadata ||
                {}
        };
    }

    /* ---------------------------------------------------------
       Project Validation
    --------------------------------------------------------- */

    function validateProject(
        project
    ) {

        if (
            !project ||
            typeof project !==
            "object"
        ) {

            return {
                valid:
                    false,

                errors: [
                    "Invalid project object."
                ]
            };
        }

        const errors = [];

        if (
            !project.id
        ) {

            errors.push(
                "Project ID is missing."
            );
        }

        if (
            !project.projectName
        ) {

            errors.push(
                "Project name is missing."
            );
        }

        if (
            project.room
        ) {

            const width =
                Number(
                    project.room.width
                );

            const depth =
                Number(
                    project.room.depth
                );

            const height =
                Number(
                    project.room.height
                );

            if (
                width <= 0 ||
                depth <= 0 ||
                height <= 0
            ) {

                errors.push(
                    "Room dimensions must be greater than zero."
                );
            }
        }

        return {

            valid:
                errors.length === 0,

            errors
        };
    }

    /* ---------------------------------------------------------
       Get Local Projects
    --------------------------------------------------------- */

    function getLocalProjects() {

        const projects =
            localGet(
                STORAGE_CONFIG.keys.projects,
                []
            );

        if (
            !Array.isArray(
                projects
            )
        ) {
            return [];
        }

        return projects;
    }

    /* ---------------------------------------------------------
       Save Project Locally
    --------------------------------------------------------- */

    function saveLocalProject(
        project
    ) {

        const normalized =
            normalizeProject(
                project
            );

        const validation =
            validateProject(
                normalized
            );

        if (
            !validation.valid
        ) {

            return {

                success:
                    false,

                errors:
                    validation.errors
            };
        }

        let projects =
            getLocalProjects();

        const index =
            projects.findIndex(
                item =>
                    item.id ===
                    normalized.id
            );

        if (
            index >= 0
        ) {

            projects[index] =
                normalized;

        } else {

            projects.unshift(
                normalized
            );
        }

        /*
         * Keep a practical local
         * history limit.
         */

        if (
            projects.length >
            100
        ) {

            projects =
                projects.slice(
                    0,
                    100
                );
        }

        const saved =
            localSet(
                STORAGE_CONFIG.keys.projects,
                projects
            );

        if (
            saved
        ) {

            localSet(
                STORAGE_CONFIG.keys.activeProject,
                normalized.id
            );

            state.projects =
                projects;

            state.currentProject =
                normalized;

            state.currentProjectId =
                normalized.id;

            state.lastSavedAt =
                now();

            state.dirty =
                false;
        }

        return {

            success:
                saved,

            project:
                normalized,

            local:
                true
        };
    }

    /* ---------------------------------------------------------
       Get Local Project
    --------------------------------------------------------- */

    function getLocalProject(
        projectId
    ) {

        const projects =
            getLocalProjects();

        return (
            projects.find(
                project =>
                    project.id ===
                    projectId
            ) ||
            null
        );
    }

    /* ---------------------------------------------------------
       Delete Local Project
    --------------------------------------------------------- */

    function deleteLocalProject(
        projectId
    ) {

        let projects =
            getLocalProjects();

        const originalLength =
            projects.length;

        projects =
            projects.filter(
                project =>
                    project.id !==
                    projectId
            );

        const removed =
            projects.length !==
            originalLength;

        localSet(
            STORAGE_CONFIG.keys.projects,
            projects
        );

        if (
            state.currentProjectId ===
            projectId
        ) {

            state.currentProjectId =
                null;

            state.currentProject =
                null;

            localRemove(
                STORAGE_CONFIG.keys.activeProject
            );
        }

        state.projects =
            projects;

        return {
            success:
                removed
        };
    }

    /* ---------------------------------------------------------
       Save Project
       Main Public Method
    --------------------------------------------------------- */

    async function saveProject(
        project,
        options = {}
    ) {

        state.saving =
            true;

        try {

            const normalized =
                normalizeProject(
                    project
                );

            const validation =
                validateProject(
                    normalized
                );

            if (
                !validation.valid
            ) {

                return {

                    success:
                        false,

                    errors:
                        validation.errors
                };
            }

            /*
             * Always save locally first.
             * This gives the application
             * offline capability.
             */

            const localResult =
                saveLocalProject(
                    normalized
                );

            if (
                !localResult.success
            ) {

                return localResult;
            }

            let cloudResult =
                null;

            const shouldSync =
                options.sync !== false;

            if (
                shouldSync &&
                Firebase &&
                !Firebase.state?.offline &&
                Firebase.saveProject
            ) {

                cloudResult =
                    await Firebase.saveProject(
                        normalized.id,
                        normalized
                    );

                if (
                    !cloudResult.success
                ) {

                    console.warn(
                        "Cloud save failed; local copy preserved.",
                        cloudResult.error
                    );
                }
            }

            state.saving =
                false;

            state.dirty =
                false;

            state.lastSavedAt =
                now();

            emit(
                "storage:project-saved",
                {
                    project:
                        normalized,

                    local:
                        true,

                    cloud:
                        !!cloudResult?.success
                }
            );

            return {

                success:
                    true,

                project:
                    normalized,

                local:
                    true,

                cloud:
                    !!cloudResult?.success,

                cloudError:
                    cloudResult &&
                    !cloudResult.success
                        ? cloudResult.error
                        : null
            };

        } catch (error) {

            state.saving =
                false;

            return {

                success:
                    false,

                error:
                    error.message ||
                    "Failed to save project."
            };
        } finally {

            state.saving =
                false;
        }
    }

    /* ---------------------------------------------------------
       Load Project
    --------------------------------------------------------- */

    async function loadProject(
        projectId,
        options = {}
    ) {

        state.loading =
            true;

        try {

            if (
                !projectId
            ) {

                return {

                    success:
                        false,

                    error:
                        "Project ID is required."
                };
            }

            let project =
                null;

            /*
             * Prefer cloud when available.
             */

            if (
                options.cloud !== false &&
                Firebase &&
                !Firebase.state?.offline &&
                Firebase.getProject
            ) {

                const cloud =
                    await Firebase.getProject(
                        projectId
                    );

                if (
                    cloud.success &&
                    cloud.data
                ) {

                    project =
                        normalizeProject(
                            cloud.data
                        );

                    /*
                     * Update local cache.
                     */

                    saveLocalProject(
                        project
                    );
                }
            }

            /*
             * Fallback to local.
             */

            if (
                !project
            ) {

                project =
                    getLocalProject(
                        projectId
                    );
            }

            if (
                !project
            ) {

                return {

                    success:
                        false,

                    error:
                        "Project not found."
                };
            }

            state.currentProject =
                project;

            state.currentProjectId =
                project.id;

            state.dirty =
                false;

            state.lastSavedAt =
                project.updatedAt ||
                null;

            localSet(
                STORAGE_CONFIG.keys.activeProject,
                project.id
            );

            emit(
                "storage:project-loaded",
                {
                    project
                }
            );

            return {

                success:
                    true,

                project
            };

        } catch (error) {

            return {

                success:
                    false,

                error:
                    error.message ||
                    "Failed to load project."
            };

        } finally {

            state.loading =
                false;
        }
    }

    /* ---------------------------------------------------------
       Load All Projects
    --------------------------------------------------------- */

    async function loadProjects(
        options = {}
    ) {

        state.loading =
            true;

        try {

            /*
             * Local projects are always
             * immediately available.
             */

            let projects =
                getLocalProjects();

            /*
             * Firebase Realtime Database
             * does not expose a generic
             * list method in our wrapper,
             * so local cache is the default
             * project list.
             */

            if (
                !Array.isArray(
                    projects
                )
            ) {

                projects = [];
            }

            projects.sort(
                (
                    a,
                    b
                ) =>
                    Number(
                        b.updatedAt || 0
                    ) -
                    Number(
                        a.updatedAt || 0
                    )
            );

            state.projects =
                projects;

            return {

                success:
                    true,

                projects
            };

        } finally {

            state.loading =
                false;
        }
    }

    /* ---------------------------------------------------------
       Delete Project
    --------------------------------------------------------- */

    async function deleteProject(
        projectId,
        options = {}
    ) {

        if (
            !projectId
        ) {

            return {

                success:
                    false,

                error:
                    "Project ID is required."
            };
        }

        const localResult =
            deleteLocalProject(
                projectId
            );

        let cloudResult =
            null;

        if (
            options.cloud !== false &&
            Firebase &&
            !Firebase.state?.offline &&
            Firebase.deleteProject
        ) {

            cloudResult =
                await Firebase.deleteProject(
                    projectId
                );
        }

        emit(
            "storage:project-deleted",
            {
                projectId,

                local:
                    localResult.success,

                cloud:
                    !!cloudResult?.success
            }
        );

        return {

            success:
                localResult.success ||
                !!cloudResult?.success,

            local:
                localResult.success,

            cloud:
                !!cloudResult?.success
        };
    }

    /* ---------------------------------------------------------
       Create New Project
    --------------------------------------------------------- */

    function createProject(
        data = {}
    ) {

        const project =
            normalizeProject({

                ...data,

                id:
                    data.id ||
                    generateId(
                        "project"
                    ),

                createdAt:
                    data.createdAt ||
                    now(),

                updatedAt:
                    now()
            });

        state.currentProject =
            project;

        state.currentProjectId =
            project.id;

        state.dirty =
            true;

        return project;
    }

    /* ---------------------------------------------------------
       Get Current Project
    --------------------------------------------------------- */

    function getCurrentProject() {

        return state.currentProject;
    }

    function getCurrentProjectId() {

        return state.currentProjectId;
    }

    /* ---------------------------------------------------------
       Set Current Project
    --------------------------------------------------------- */

    function setCurrentProject(
        project
    ) {

        if (
            !project
        ) {

            state.currentProject =
                null;

            state.currentProjectId =
                null;

            return;
        }

        state.currentProject =
            normalizeProject(
                project
            );

        state.currentProjectId =
            state.currentProject.id;

        state.dirty =
            true;
    }

    /* ---------------------------------------------------------
       Update Current Project
    --------------------------------------------------------- */

    function updateCurrentProject(
        changes = {}
    ) {

        if (
            !state.currentProject
        ) {

            state.currentProject =
                createProject(
                    changes
                );

            return state.currentProject;
        }

        state.currentProject =
            normalizeProject({

                ...state.currentProject,

                ...changes,

                id:
                    state.currentProject.id,

                createdAt:
                    state.currentProject.createdAt
            });

        state.dirty =
            true;

        emit(
            "storage:project-changed",
            {
                project:
                    state.currentProject
            }
        );

        return state.currentProject;
    }

    /* ---------------------------------------------------------
       Mark Dirty
    --------------------------------------------------------- */

    function markDirty(
        value = true
    ) {

        state.dirty =
            !!value;

        emit(
            "storage:dirty",
            {
                dirty:
                    state.dirty
            }
        );
    }

    /* ---------------------------------------------------------
       Active Project
    --------------------------------------------------------- */

    function getActiveProjectId() {

        return localGet(
            STORAGE_CONFIG.keys.activeProject,
            null
        );
    }

    async function restoreActiveProject() {

        const projectId =
            getActiveProjectId();

        if (
            !projectId
        ) {

            return {

                success:
                    false,

                project:
                    null
            };
        }

        return loadProject(
            projectId
        );
    }

    /* ---------------------------------------------------------
       Project Export
    --------------------------------------------------------- */

    function exportProjectJSON(
        project =
            state.currentProject
    ) {

        if (
            !project
        ) {
            return null;
        }

        const normalized =
            normalizeProject(
                project
            );

        return JSON.stringify(
            normalized,
            null,
            2
        );
    }

    function downloadProjectJSON(
        project =
            state.currentProject
    ) {

        const json =
            exportProjectJSON(
                project
            );

        if (
            !json
        ) {
            return false;
        }

        const blob =
            new Blob(
                [json],
                {
                    type:
                        "application/json;charset=utf-8"
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                "a"
            );

        link.href =
            url;

        link.download =
            (
                project?.projectName ||
                "acoustic-project"
            )
                .replace(
                    /[^\w\u0600-\u06FF-]+/g,
                    "_"
                ) +
            ".json";

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(
            url
        );

        return true;
    }

    /* ---------------------------------------------------------
       Project Import
    --------------------------------------------------------- */

    function importProjectJSON(
        json
    ) {

        try {

            const parsed =
                typeof json ===
                "string"
                    ? JSON.parse(json)
                    : json;

            const project =
                normalizeProject(
                    parsed
                );

            const validation =
                validateProject(
                    project
                );

            if (
                !validation.valid
            ) {

                return {

                    success:
                        false,

                    errors:
                        validation.errors
                };
            }

            state.currentProject =
                project;

            state.currentProjectId =
                project.id;

            state.dirty =
                true;

            return {

                success:
                    true,

                project
            };

        } catch (error) {

            return {

                success:
                    false,

                error:
                    "Invalid project JSON."
            };
        }
    }

    /* ---------------------------------------------------------
       Datasheet Upload
    --------------------------------------------------------- */

    function validateFile(
        file
    ) {

        if (!file) {

            return {

                valid:
                    false,

                error:
                    "لم يتم اختيار ملف."
            };
        }

        if (
            typeof CONFIG.isAllowedFile ===
            "function"
        ) {

            if (
                !CONFIG.isAllowedFile(
                    file
                )
            ) {

                return {

                    valid:
                        false,

                    error:
                        "نوع الملف غير مدعوم أو حجمه أكبر من الحد المسموح."
                };
            }

        } else {

            const max =
                CONFIG.files
                    ?.maxDatasheetSize ||
                20 * 1024 * 1024;

            if (
                file.size >
                max
            ) {

                return {

                    valid:
                        false,

                    error:
                        "حجم الملف أكبر من الحد المسموح."
                };
            }
        }

        return {
            valid:
                true
        };
    }

    async function uploadDatasheet(
        file,
        speakerId = null
    ) {

        const validation =
            validateFile(
                file
            );

        if (
            !validation.valid
        ) {

            return {

                success:
                    false,

                error:
                    validation.error
            };
        }

        const uid =
            getUserId() ||
            "anonymous";

        const projectId =
            state.currentProjectId ||
            "unassigned";

        const safeName =
            String(
                file.name ||
                "datasheet"
            )
                .replace(
                    /[^a-zA-Z0-9._\-\u0600-\u06FF]/g,
                    "_"
                );

        const path =
            [
                "datasheets",
                uid,
                projectId,
                speakerId ||
                    "general",
                Date.now() +
                    "_" +
                    safeName
            ].join("/");

        /*
         * Firebase upload
         */

        if (
            Firebase &&
            !Firebase.state?.offline &&
            Firebase.uploadFile
        ) {

            const result =
                await Firebase.uploadFile(
                    path,
                    file,
                    {
                        contentType:
                            file.type ||
                            "application/octet-stream",

                        customMetadata: {

                            projectId:
                                projectId,

                            speakerId:
                                speakerId ||
                                "",

                            uploadedBy:
                                uid
                        }
                    }
                );

            if (
                result.success
            ) {

                return {

                    success:
                        true,

                    url:
                        result.url,

                    path:
                        result.path,

                    name:
                        file.name,

                    size:
                        file.size,

                    type:
                        file.type
                };
            }
        }

        /*
         * Local browser mode.
         *
         * We cannot persist the raw File
         * permanently in LocalStorage.
         * We therefore preserve metadata
         * and inform the caller that the
         * file itself needs cloud storage.
         */

        return {

            success:
                false,

            local:
                true,

            error:
                "رفع ملفات Datasheet يحتاج إلى تفعيل Firebase Storage."
        };
    }

    /* ---------------------------------------------------------
       Settings
    --------------------------------------------------------- */

    function saveSettings(
        settings
    ) {

        const current =
            getSettings();

        const merged = {

            ...current,

            ...(settings || {}),

            updatedAt:
                now()
        };

        localSet(
            STORAGE_CONFIG.keys.settings,
            merged
        );

        emit(
            "storage:settings-changed",
            {
                settings:
                    merged
            }
        );

        return merged;
    }

    function getSettings() {

        return localGet(
            STORAGE_CONFIG.keys.settings,
            {}
        );
    }

    /* ---------------------------------------------------------
       Clear All Local Data

       لا تستخدم هذه الوظيفة إلا من
       إعدادات المستخدم أو إعادة ضبط التطبيق.
    --------------------------------------------------------- */

    function clearLocalData(
        options = {}
    ) {

        const preserveUser =
            options.preserveUser !==
            false;

        const user =
            preserveUser
                ? localGet(
                    STORAGE_CONFIG.keys.user,
                    null
                )
                : null;

        Object.values(
            STORAGE_CONFIG.keys
        ).forEach(
            key => {
                localRemove(
                    key
                );
            }
        );

        if (
            preserveUser &&
            user
        ) {

            localSet(
                STORAGE_CONFIG.keys.user,
                user
            );
        }

        state.projects =
            [];

        state.currentProject =
            null;

        state.currentProjectId =
            null;

        state.dirty =
            false;

        emit(
            "storage:cleared",
            {}
        );

        return true;
    }

    /* ---------------------------------------------------------
       Backup
    --------------------------------------------------------- */

    function createBackup() {

        const backup = {

            application:
                CONFIG.app?.name ||
                "Acoustic Engineering",

            version:
                CONFIG.app?.version ||
                "1.0.0",

            createdAt:
                now(),

            projects:
                getLocalProjects(),

            settings:
                getSettings()
        };

        return backup;
    }

    function downloadBackup() {

        const backup =
            createBackup();

        const blob =
            new Blob(
                [
                    JSON.stringify(
                        backup,
                        null,
                        2
                    )
                ],
                {
                    type:
                        "application/json;charset=utf-8"
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                "a"
            );

        link.href =
            url;

        link.download =
            "acoustic-engineering-backup-" +
            new Date()
                .toISOString()
                .slice(
                    0,
                    10
                ) +
            ".json";

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(
            url
        );

        return true;
    }

    /* ---------------------------------------------------------
       Restore Backup
    --------------------------------------------------------- */

    function restoreBackup(
        backup
    ) {

        try {

            if (
                typeof backup ===
                "string"
            ) {

                backup =
                    JSON.parse(
                        backup
                    );
            }

            if (
                !backup ||
                typeof backup !==
                "object"
            ) {

                throw new Error(
                    "Invalid backup."
                );
            }

            if (
                Array.isArray(
                    backup.projects
                )
            ) {

                const normalized =
                    backup.projects.map(
                        project =>
                            normalizeProject(
                                project
                            )
                    );

                localSet(
                    STORAGE_CONFIG.keys.projects,
                    normalized
                );

                state.projects =
                    normalized;
            }

            if (
                backup.settings
            ) {

                localSet(
                    STORAGE_CONFIG.keys.settings,
                    backup.settings
                );
            }

            emit(
                "storage:backup-restored",
                {
                    backup
                }
            );

            return {

                success:
                    true,

                projects:
                    state.projects
            };

        } catch (error) {

            return {

                success:
                    false,

                error:
                    error.message ||
                    "Could not restore backup."
            };
        }
    }

    /* ---------------------------------------------------------
       Initialization
    --------------------------------------------------------- */

    async function initialize() {

        if (
            state.initialized
        ) {
            return state;
        }

        state.initialized =
            true;

        state.offline =
            !!(
                Firebase?.state?.offline
            );

        state.projects =
            getLocalProjects();

        const activeId =
            getActiveProjectId();

        if (
            activeId
        ) {

            const active =
                getLocalProject(
                    activeId
                );

            if (
                active
            ) {

                state.currentProject =
                    active;

                state.currentProjectId =
                    active.id;
            }
        }

        emit(
            "storage:ready",
            {
                projects:
                    state.projects,

                currentProject:
                    state.currentProject
            }
        );

        return state;
    }

    /* ---------------------------------------------------------
       Public API
    --------------------------------------------------------- */

    const StorageAPI = {

        state,

        initialize,

        generateId,

        normalizeProject,

        validateProject,

        createProject,

        saveProject,

        loadProject,

        loadProjects,

        deleteProject,

        getLocalProjects,

        getLocalProject,

        saveLocalProject,

        deleteLocalProject,

        getCurrentProject,

        getCurrentProjectId,

        setCurrentProject,

        updateCurrentProject,

        markDirty,

        getActiveProjectId,

        restoreActiveProject,

        exportProjectJSON,

        downloadProjectJSON,

        importProjectJSON,

        uploadDatasheet,

        validateFile,

        saveSettings,

        getSettings,

        clearLocalData,

        createBackup,

        downloadBackup,

        restoreBackup
    };

    /* ---------------------------------------------------------
       Expose
    --------------------------------------------------------- */

    AE.storage =
        StorageAPI;

    window.AcousticStorage =
        StorageAPI;

    window.ProjectStorage =
        StorageAPI;

    /* ---------------------------------------------------------
       Auto Boot
    --------------------------------------------------------- */

    function boot() {

        initialize()
            .catch(
                function (error) {

                    console.error(
                        "Acoustic Storage initialization error:",
                        error
                    );
                }
            );
    }

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            boot,
            {
                once:
                    true
            }
        );

    } else {

        boot();
    }

})();