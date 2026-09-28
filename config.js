/* ============================================================
   Acoustic Engineering
   js/config.js
   Global Application Configuration
   ============================================================ */

(function () {
    "use strict";

    window.AcousticEngineering = window.AcousticEngineering || {};
    const AE = window.AcousticEngineering;

    /* ---------------------------------------------------------
       Application
    --------------------------------------------------------- */

    const APP = {
        name: "هندسة صوتية",
        nameEn: "Acoustic Engineering",
        shortName: "Acoustic Engineering",
        version: "1.0.0",
        build: "2026.1",
        environment: "production",
        language: "ar",
        fallbackLanguage: "en",
        direction: "rtl",
        unit: "metric",
        currency: "SDG",
        country: "SD",
        timezone: "Africa/Khartoum"
    };

    /* ---------------------------------------------------------
       URLs / Pages
    --------------------------------------------------------- */

    const ROUTES = {
        home: "index.html",
        register: "register.html",
        app: "app.html",
        admin: "admin.html",
        report: "report.html"
    };

    /* ---------------------------------------------------------
       Firebase
    --------------------------------------------------------- */

    const FIREBASE = {
        enabled: true,
        initialized: false,
        config: {
            apiKey: "",
            authDomain: "",
            databaseURL: "",
            projectId: "",
            storageBucket: "",
            messagingSenderId: "",
            appId: "",
            measurementId: ""
        },
        services: {
            authentication: true,
            realtimeDatabase: true,
            storage: true,
            analytics: false,
            firestore: false,
            functions: false
        },
        auth: {
            persistence: "local",
            allowEmailPassword: true,
            allowGoogle: false,
            requireEmailVerification: false
        },
        database: {
            root: "acousticEngineering",
            users: "users",
            projects: "projects",
            registrations: "registrations",
            speakers: "speakers",
            reports: "reports",
            activity: "activity",
            settings: "settings"
        },
        storage: {
            root: "acoustic-engineering",
            datasheets: "datasheets",
            projectFiles: "projects",
            reports: "reports",
            userFiles: "users"
        }
    };

    /* ---------------------------------------------------------
       User Roles
    --------------------------------------------------------- */

    const ROLES = {
        visitor: "visitor",
        user: "user",
        engineer: "engineer",
        admin: "admin",
        owner: "owner"
    };

    /* ---------------------------------------------------------
       Permissions
    --------------------------------------------------------- */

    const PERMISSIONS = {
        visitor: ["view_public"],
        user: [
            "view_app", "create_project", "edit_project", "delete_project",
            "save_project", "generate_report", "download_report", "upload_datasheet"
        ],
        engineer: [
            "view_app", "create_project", "edit_project", "delete_project",
            "save_project", "generate_report", "download_report", "upload_datasheet",
            "engineering_design", "auto_design", "advanced_analysis"
        ],
        admin: [
            "view_app", "create_project", "edit_project", "delete_project",
            "save_project", "generate_report", "download_report", "upload_datasheet",
            "engineering_design", "auto_design", "advanced_analysis",
            "view_users", "view_registrations", "view_projects",
            "manage_users", "manage_settings"
        ],
        owner: ["*"]
    };

    /* ---------------------------------------------------------
       Engineering Defaults
    --------------------------------------------------------- */

    const ENGINEERING = {
        defaults: {
            room: { width: 12, depth: 8, height: 3 },
            stage: { width: 6, depth: 2, x: 3, y: 0.5 },
            audience: { size: 100 },
            target: { spl: 95, coverage: 90, headroom: 6 },
            mounting: { height: 2.8 }
        },
        profiles: {
            speech: {
                name: "Speech / Conference",
                targetSPL: 85, coverageTarget: 90, headroom: 6, preferredUniformity: 6
            },
            meeting: {
                name: "Meeting Room",
                targetSPL: 88, coverageTarget: 90, headroom: 6, preferredUniformity: 6
            },
            banquet: {
                name: "Banquet / Event",
                targetSPL: 95, coverageTarget: 90, headroom: 6, preferredUniformity: 6
            },
            music: {
                name: "Music / Live Event",
                targetSPL: 100, coverageTarget: 90, headroom: 10, preferredUniformity: 6
            },
            theater: {
                name: "Theater",
                targetSPL: 92, coverageTarget: 95, headroom: 8, preferredUniformity: 4
            },
            worship: {
                name: "Worship / Mosque",
                targetSPL: 88, coverageTarget: 95, headroom: 6, preferredUniformity: 4
            },
            stadium: {
                name: "Stadium",
                targetSPL: 100, coverageTarget: 90, headroom: 10, preferredUniformity: 6
            },
            gym: {
                name: "Gym / Sports",
                targetSPL: 95, coverageTarget: 90, headroom: 8, preferredUniformity: 6
            }
        }
    };

    /* ---------------------------------------------------------
       Venue Types
    --------------------------------------------------------- */

    const VENUE_TYPES = [
        { id: "hotel", ar: "فندق", en: "Hotel" },
        { id: "garden", ar: "حديقة", en: "Garden" },
        { id: "meeting", ar: "قاعة اجتماعات", en: "Meeting Room" },
        { id: "banquet", ar: "قاعة مناسبات", en: "Banquet Hall" },
        { id: "event", ar: "قاعة فعاليات", en: "Event Hall" },
        { id: "gym", ar: "صالة رياضية", en: "Gym" },
        { id: "office", ar: "مكاتب", en: "Office" },
        { id: "theater", ar: "مسرح", en: "Theater" },
        { id: "stadium", ar: "ملعب", en: "Stadium" },
        { id: "mosque", ar: "مسجد", en: "Mosque" },
        { id: "school", ar: "مدرسة", en: "School" },
        { id: "hospital", ar: "مستشفى", en: "Hospital" },
        { id: "restaurant", ar: "مطعم", en: "Restaurant" },
        { id: "warehouse", ar: "مستودع", en: "Warehouse" },
        { id: "outdoor", ar: "مساحة خارجية", en: "Outdoor" },
        { id: "custom", ar: "مبنى مخصص", en: "Custom Building" }
    ];

    /* ---------------------------------------------------------
       Room Materials
    --------------------------------------------------------- */

    const ROOM_MATERIALS = {
        low: { name: "Low Reflection", absorption: 0.55, description: "مواد ماصة للصوت" },
        medium: { name: "Medium Reflection", absorption: 0.30, description: "مواد متوسطة الانعكاس" },
        high: { name: "High Reflection", absorption: 0.12, description: "رخام / زجاج / أسطح صلبة" },
        custom: { name: "Custom", absorption: 0.30, description: "إعداد مخصص" }
    };

    /* ---------------------------------------------------------
       Speaker Defaults
    --------------------------------------------------------- */

    const SPEAKER_DEFAULTS = {
        power: 500, rms: 500, maxSPL: 125,
        horizontalCoverage: 90, verticalCoverage: 60,
        frequencyLow: 50, frequencyHigh: 20000,
        mountingHeight: 2.8, mounting: "Wall / Ceiling"
    };

    /* ---------------------------------------------------------
       Canvas Settings
    --------------------------------------------------------- */

    const CANVAS = {
        minZoom: 0.25, maxZoom: 5, defaultZoom: 1,
        gridSize: 0.5, majorGridEvery: 5,
        snap: true, grid: true,
        background: "#0b0f14", engineeringGrid: true,
        showCoverage: true, showDimensions: true, showLabels: true
    };

    /* ---------------------------------------------------------
       Report Settings
    --------------------------------------------------------- */

    const REPORT = {
        title: "تقرير التصميم الهندسي للنظام الصوتي",
        titleEn: "Acoustic System Engineering Report",
        company: "", engineer: "",
        footer: "Generated by Acoustic Engineering",
        include: {
            projectInfo: true, room: true, stage: true, audience: true,
            manualDesign: true, automaticDesign: true, speakers: true,
            bom: true, calculations: true, analysis: true,
            coverage: true, warnings: true
        }
    };

    /* ---------------------------------------------------------
       File Upload Limits
    --------------------------------------------------------- */

    const FILES = {
        maxDatasheetSize: 20 * 1024 * 1024,
        maxProjectSize: 10 * 1024 * 1024,
        maxReportSize: 20 * 1024 * 1024,
        allowedDatasheetTypes: [
            "application/pdf", "image/png", "image/jpeg", "image/webp",
            "text/plain",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel"
        ],
        allowedExtensions: [
            ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".xlsx", ".xls"
        ]
    };

    /* ---------------------------------------------------------
       Security
    --------------------------------------------------------- */

    const SECURITY = {
        sessionTimeout: 24 * 60 * 60 * 1000,
        registrationRequired: true,
        requireLoginForProjects: true,
        requireLoginForReports: true,
        adminPageRequiresRole: true,
        preventAnonymousAdmin: true,
        sanitizeUserInput: true,
        maxProjectNameLength: 150,
        maxClientNameLength: 150,
        maxLocationLength: 250,
        maxPhoneLength: 30
    };

    /* ---------------------------------------------------------
       Local Storage
    --------------------------------------------------------- */

    const LOCAL_STORAGE = {
        prefix: "acoustic_engineering_",
        keys: {
            settings: "settings", session: "session", user: "user",
            projects: "projects", activeProject: "active_project",
            language: "language", theme: "theme"
        }
    };

    /* ---------------------------------------------------------
       UI
    --------------------------------------------------------- */

    const UI = {
        theme: "dark", defaultView: "overview", sidebar: true,
        animations: true, notifications: true,
        toastDuration: 3500, loadingText: "جاري المعالجة..."
    };

    /* ---------------------------------------------------------
       Services
    --------------------------------------------------------- */

    const SERVICES = {
        firebase: true, localStorage: true, cloudStorage: true,
        datasheetParsing: false, aiDesign: false,
        externalAI: false, maps: false
    };

    /* ---------------------------------------------------------
       Features
    --------------------------------------------------------- */

    const FEATURES = {
        registration: true, authentication: true, projectManagement: true,
        speakerLibrary: true, datasheetUpload: true, manualDesign: true,
        automaticDesign: true, engineeringAnalysis: true, coverageMap: true,
        heatmap: true, bom: true, report: true, reportHTML: true,
        reportJSON: true, printReport: true, firebaseSync: true,
        offlineMode: true, adminDashboard: true, multilingual: true,
        threeD: false, aiAssistant: false
    };

    /* ---------------------------------------------------------
       Messages
    --------------------------------------------------------- */

    const MESSAGES = {
        ar: {
            loading: "جاري المعالجة...",
            saved: "تم حفظ المشروع بنجاح",
            loaded: "تم تحميل المشروع",
            error: "حدث خطأ غير متوقع",
            loginRequired: "يجب تسجيل الدخول أولاً",
            registrationRequired: "يرجى إنشاء حساب أولاً",
            adminRequired: "ليس لديك صلاحية الدخول إلى لوحة الإدارة",
            noProject: "لا يوجد مشروع محدد",
            noSpeakers: "لم تتم إضافة أي سماعات",
            noAnalysis: "لم يتم إجراء التحليل الهندسي بعد",
            invalidFile: "نوع الملف غير مدعوم",
            fileTooLarge: "حجم الملف أكبر من الحد المسموح"
        },
        en: {
            loading: "Processing...",
            saved: "Project saved successfully",
            loaded: "Project loaded",
            error: "An unexpected error occurred",
            loginRequired: "Please sign in first",
            registrationRequired: "Please create an account first",
            adminRequired: "You do not have permission to access the admin panel",
            noProject: "No project selected",
            noSpeakers: "No speakers have been added",
            noAnalysis: "Engineering analysis has not been performed yet",
            invalidFile: "Unsupported file type",
            fileTooLarge: "File size exceeds the allowed limit"
        }
    };

    /* ---------------------------------------------------------
       Utility Functions
    --------------------------------------------------------- */

    function getFirebaseConfig() {
        return { ...FIREBASE.config };
    }

    function isFirebaseConfigured() {
        const config = FIREBASE.config;
        return !!(
            config.apiKey &&
            config.authDomain &&
            config.projectId &&
            config.appId
        );
    }

    function isFeatureEnabled(feature) {
        return !!FEATURES[feature];
    }

    function getMessage(key, language = APP.language) {
        return (
            MESSAGES[language]?.[key] ||
            MESSAGES.en[key] ||
            key
        );
    }

    function getVenue(id) {
        return VENUE_TYPES.find(venue => venue.id === id) || null;
    }

    function getEngineeringProfile(id) {
        return (
            ENGINEERING.profiles[id] ||
            ENGINEERING.profiles.balanced || {
                targetSPL: 95,
                coverageTarget: 90,
                headroom: 6
            }
        );
    }

    function getPermissions(role) {
        return PERMISSIONS[role] || PERMISSIONS.visitor;
    }

    function hasPermission(role, permission) {
        const permissions = getPermissions(role);
        return permissions.includes("*") || permissions.includes(permission);
    }

    function sanitizeText(value, maxLength = 500) {
        if (value === undefined || value === null) return "";

        return String(value)
            .replace(/[<>]/g, "")
            .trim()
            .slice(0, maxLength);
    }

    function isValidPhone(value) {
        const phone = String(value || "").trim();
        if (!phone) return false;

        return /^[+]?[0-9\s\-()]{7,30}$/.test(phone);
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            String(value || "").trim()
        );
    }

    function isAllowedFile(file) {
        if (!file) return false;
        if (file.size > FILES.maxDatasheetSize) return false;
        if (FILES.allowedDatasheetTypes.includes(file.type)) return true;

        const name = file.name.toLowerCase();

        return FILES.allowedExtensions.some(extension =>
            name.endsWith(extension)
        );
    }

    /* ---------------------------------------------------------
       Public Configuration Object
    --------------------------------------------------------- */

    const CONFIG = {
        app: APP,
        routes: ROUTES,
        firebase: FIREBASE,
        roles: ROLES,
        permissions: PERMISSIONS,
        engineering: ENGINEERING,
        venueTypes: VENUE_TYPES,
        roomMaterials: ROOM_MATERIALS,
        speakerDefaults: SPEAKER_DEFAULTS,
        canvas: CANVAS,
        report: REPORT,
        files: FILES,
        security: SECURITY,
        localStorage: LOCAL_STORAGE,
        ui: UI,
        services: SERVICES,
        features: FEATURES,
        messages: MESSAGES,
        getFirebaseConfig,
        isFirebaseConfigured,
        isFeatureEnabled,
        getMessage,
        getVenue,
        getEngineeringProfile,
        getPermissions,
        hasPermission,
        sanitizeText,
        isValidPhone,
        isValidEmail,
        isAllowedFile
    };

    AE.config = CONFIG;
    window.AcousticConfig = CONFIG;
    window.ACOUSTIC_CONFIG = CONFIG;

    if (APP.environment === "development") {
        console.log("Acoustic Engineering Config:", CONFIG);
    }

})();