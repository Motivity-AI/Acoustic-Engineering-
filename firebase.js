/* ============================================================
   Acoustic Engineering
   js/firebase.js
   Firebase Core / Authentication / Realtime Database / Storage
   ============================================================ */

(function () {
    "use strict";

    /* ---------------------------------------------------------
       Namespace
    --------------------------------------------------------- */

    window.AcousticEngineering =
        window.AcousticEngineering || {};

    const AE = window.AcousticEngineering;

    const CONFIG =
        AE.config || window.AcousticConfig || {};

    /* ---------------------------------------------------------
       Firebase CDN Configuration

       يتم تحميل Firebase من CDN هنا حتى لا نحتاج إلى Bundler.
    --------------------------------------------------------- */

    const FIREBASE_VERSION = "10.14.1";

    const FIREBASE_CDN =
        "https://www.gstatic.com/firebasejs/" +
        FIREBASE_VERSION +
        "/";

    /* ---------------------------------------------------------
       Internal State
    --------------------------------------------------------- */

    const state = {

        available: false,

        initialized: false,

        configured: false,

        offline: false,

        app: null,

        auth: null,

        database: null,

        storage: null,

        currentUser: null,

        authReady: false,

        initializationError: null
    };

    /* ---------------------------------------------------------
       Firebase SDK Loader
    --------------------------------------------------------- */

    function loadScript(src) {

        return new Promise(
            function (resolve, reject) {

                const existing =
                    document.querySelector(
                        `script[src="${src}"]`
                    );

                if (existing) {

                    if (
                        existing.dataset.loaded ===
                        "true"
                    ) {
                        resolve();
                        return;
                    }

                    existing.addEventListener(
                        "load",
                        resolve,
                        {
                            once: true
                        }
                    );

                    existing.addEventListener(
                        "error",
                        reject,
                        {
                            once: true
                        }
                    );

                    return;
                }

                const script =
                    document.createElement(
                        "script"
                    );

                script.src = src;

                script.async = true;

                script.defer = true;

                script.onload =
                    function () {

                        script.dataset.loaded =
                            "true";

                        resolve();
                    };

                script.onerror =
                    function () {

                        reject(
                            new Error(
                                "Failed to load Firebase SDK: " +
                                src
                            )
                        );
                    };

                document.head.appendChild(
                    script
                );
            }
        );
    }

    async function loadFirebaseSDK() {

        if (
            window.firebase &&
            window.firebase.initializeApp
        ) {
            return true;
        }

        try {

            await loadScript(
                FIREBASE_CDN +
                "firebase-app-compat.js"
            );

            await loadScript(
                FIREBASE_CDN +
                "firebase-auth-compat.js"
            );

            await loadScript(
                FIREBASE_CDN +
                "firebase-database-compat.js"
            );

            await loadScript(
                FIREBASE_CDN +
                "firebase-storage-compat.js"
            );

            return true;

        } catch (error) {

            console.error(
                "Firebase SDK loading failed:",
                error
            );

            state.initializationError =
                error;

            return false;
        }
    }

    /* ---------------------------------------------------------
       Configuration Check
    --------------------------------------------------------- */

    function isConfigured() {

        if (
            CONFIG.firebase &&
            typeof CONFIG.isFirebaseConfigured ===
            "function"
        ) {
            return CONFIG.isFirebaseConfigured();
        }

        const config =
            CONFIG.firebase?.config || {};

        return !!(
            config.apiKey &&
            config.authDomain &&
            config.projectId &&
            config.appId
        );
    }

    /* ---------------------------------------------------------
       Local Fallback
    --------------------------------------------------------- */

    function enableOfflineMode() {

        state.available =
            false;

        state.initialized =
            true;

        state.configured =
            false;

        state.offline =
            true;

        state.authReady =
            true;

        console.warn(
            "Acoustic Engineering: Firebase is not configured. Local mode enabled."
        );

        dispatchEvent(
            "firebase:offline",
            {
                reason:
                    "Firebase configuration unavailable"
            }
        );
    }

    /* ---------------------------------------------------------
       Custom Application Events
    --------------------------------------------------------- */

    function dispatchEvent(
        name,
        detail = {}
    ) {

        try {

            window.dispatchEvent(
                new CustomEvent(
                    name,
                    {
                        detail
                    }
                )
            );

        } catch (error) {

            console.warn(
                "Could not dispatch event:",
                name
            );
        }
    }

    /* ---------------------------------------------------------
       Initialize Firebase
    --------------------------------------------------------- */

    async function initialize() {

        if (
            state.initialized
        ) {
            return state;
        }

        state.configured =
            isConfigured();

        /*
         * Firebase not configured:
         * Do not create fake credentials.
         * Application continues locally.
         */

        if (
            !state.configured
        ) {

            enableOfflineMode();

            return state;
        }

        const sdkLoaded =
            await loadFirebaseSDK();

        if (!sdkLoaded) {

            enableOfflineMode();

            return state;
        }

        if (
            !window.firebase
        ) {

            enableOfflineMode();

            return state;
        }

        try {

            const firebaseConfig =
                CONFIG.firebase.config;

            /*
             * Avoid initializing twice.
             */

            if (
                window.firebase.apps &&
                window.firebase.apps.length
            ) {

                state.app =
                    window.firebase.app();

            } else {

                state.app =
                    window.firebase.initializeApp(
                        firebaseConfig
                    );
            }

            state.auth =
                window.firebase.auth();

            state.database =
                window.firebase.database();

            state.storage =
                window.firebase.storage();

            state.available =
                true;

            state.initialized =
                true;

            state.offline =
                false;

            state.authReady =
                false;

            configureAuthPersistence();

            setupAuthObserver();

            dispatchEvent(
                "firebase:ready",
                {
                    app:
                        state.app
                }
            );

            return state;

        } catch (error) {

            console.error(
                "Firebase initialization error:",
                error
            );

            state.initializationError =
                error;

            enableOfflineMode();

            return state;
        }
    }

    /* ---------------------------------------------------------
       Authentication Persistence
    --------------------------------------------------------- */

    async function configureAuthPersistence() {

        if (
            !state.auth
        ) {
            return false;
        }

        try {

            const persistence =
                CONFIG.firebase?.auth
                    ?.persistence ||
                "local";

            if (
                persistence ===
                "session"
            ) {

                await state.auth.setPersistence(
                    firebase.auth.Auth.Persistence
                        .SESSION
                );

            } else {

                await state.auth.setPersistence(
                    firebase.auth.Auth.Persistence
                        .LOCAL
                );
            }

            return true;

        } catch (error) {

            console.warn(
                "Firebase persistence configuration failed:",
                error
            );

            return false;
        }
    }

    /* ---------------------------------------------------------
       Authentication Observer
    --------------------------------------------------------- */

    function setupAuthObserver() {

        if (
            !state.auth
        ) {
            state.authReady =
                true;

            return;
        }

        state.auth.onAuthStateChanged(
            function (user) {

                state.currentUser =
                    user || null;

                state.authReady =
                    true;

                dispatchEvent(
                    "auth:changed",
                    {
                        user:
                            user || null,

                        authenticated:
                            !!user
                    }
                );
            }
        );
    }

    /* ---------------------------------------------------------
       Auth Helpers
    --------------------------------------------------------- */

    async function register(
        email,
        password
    ) {

        if (
            !state.auth
        ) {

            return {
                success:
                    false,

                offline:
                    true,

                user:
                    null,

                error:
                    "Firebase Authentication is not available."
            };
        }

        try {

            const result =
                await state.auth
                    .createUserWithEmailAndPassword(
                        String(email)
                            .trim()
                            .toLowerCase(),
                        String(password)
                    );

            return {
                success:
                    true,

                user:
                    result.user,

                error:
                    null
            };

        } catch (error) {

            return {
                success:
                    false,

                user:
                    null,

                error:
                    normalizeFirebaseError(
                        error
                    ),

                code:
                    error.code || null
            };
        }
    }

    async function login(
        email,
        password
    ) {

        if (
            !state.auth
        ) {

            return {
                success:
                    false,

                offline:
                    true,

                user:
                    null,

                error:
                    "Firebase Authentication is not available."
            };
        }

        try {

            const result =
                await state.auth
                    .signInWithEmailAndPassword(
                        String(email)
                            .trim()
                            .toLowerCase(),
                        String(password)
                    );

            return {
                success:
                    true,

                user:
                    result.user,

                error:
                    null
            };

        } catch (error) {

            return {
                success:
                    false,

                user:
                    null,

                error:
                    normalizeFirebaseError(
                        error
                    ),

                code:
                    error.code || null
            };
        }
    }

    async function logout() {

        if (
            !state.auth
        ) {

            state.currentUser =
                null;

            return {
                success:
                    true,

                offline:
                    true
            };
        }

        try {

            await state.auth.signOut();

            return {
                success:
                    true
            };

        } catch (error) {

            return {
                success:
                    false,

                error:
                    normalizeFirebaseError(
                        error
                    )
            };
        }
    }

    async function resetPassword(
        email
    ) {

        if (
            !state.auth
        ) {

            return {
                success:
                    false,

                error:
                    "Firebase Authentication is not available."
            };
        }

        try {

            await state.auth.sendPasswordResetEmail(
                String(email)
                    .trim()
                    .toLowerCase()
            );

            return {
                success:
                    true
            };

        } catch (error) {

            return {
                success:
                    false,

                error:
                    normalizeFirebaseError(
                        error
                    ),

                code:
                    error.code || null
            };
        }
    }

    async function sendEmailVerification() {

        if (
            !state.currentUser
        ) {

            return {
                success:
                    false,

                error:
                    "No authenticated user."
            };
        }

        try {

            await state.currentUser
                .sendEmailVerification();

            return {
                success:
                    true
            };

        } catch (error) {

            return {
                success:
                    false,

                error:
                    normalizeFirebaseError(
                        error
                    )
            };
        }
    }

    /* ---------------------------------------------------------
       Current User
    --------------------------------------------------------- */

    function getCurrentUser() {

        return (
            state.currentUser ||
            (
                state.auth
                    ? state.auth.currentUser
                    : null
            )
        );
    }

    function isAuthenticated() {

        return !!getCurrentUser();
    }

    function getCurrentUserId() {

        const user =
            getCurrentUser();

        return user
            ? user.uid
            : null;
    }

    /* ---------------------------------------------------------
       Realtime Database Helpers
    --------------------------------------------------------- */

    function databaseRef(
        path = ""
    ) {

        if (
            !state.database
        ) {
            return null;
        }

        const root =
            CONFIG.firebase?.database
                ?.root ||
            "acousticEngineering";

        const cleanPath =
            String(path)
                .replace(
                    /^\/+/,
                    ""
                );

        const finalPath =
            cleanPath
                ? `${root}/${cleanPath}`
                : root;

        return state.database.ref(
            finalPath
        );
    }

    async function set(
        path,
        data
    ) {

        const ref =
            databaseRef(path);

        if (!ref) {

            return {
                success:
                    false,

                offline:
                    true,

                error:
                    "Database is unavailable."
            };
        }

        try {

            await ref.set(
                data
            );

            return {
                success:
                    true,

                error:
                    null
            };

        } catch (error) {

            return {
                success:
                    false,

                error:
                    normalizeFirebaseError(
                        error
                    ),

                code:
                    error.code || null
            };
        }
    }

    async function update(
        path,
        data
    ) {

        const ref =
            databaseRef(path);

        if (!ref) {

            return {
                success:
                    false,

                offline:
                    true,

                error:
                    "Database is unavailable."
            };
        }

        try {

            await ref.update(
                data
            );

            return {
                success:
                    true
            };

        } catch (error) {

            return {
                success:
                    false,

                error:
                    normalizeFirebaseError(
                        error
                    ),

                code:
                    error.code || null
            };
        }
    }

    async function push(
        path,
        data
    ) {

        const ref =
            databaseRef(path);

        if (!ref) {

            return {
                success:
                    false,

                offline:
                    true,

                key:
                    null,

                error:
                    "Database is unavailable."
            };
        }

        try {

            const pushed =
                ref.push();

            await pushed.set(
                data
            );

            return {
                success:
                    true,

                key:
                    pushed.key
            };

        } catch (error) {

            return {
                success:
                    false,

                key:
                    null,

                error:
                    normalizeFirebaseError(
                        error
                    ),

                code:
                    error.code || null
            };
        }
    }

    async function get(
        path
    ) {

        const ref =
            databaseRef(path);

        if (!ref) {

            return {
                success:
                    false,

                offline:
                    true,

                data:
                    null,

                error:
                    "Database is unavailable."
            };
        }

        try {

            const snapshot =
                await ref.once(
                    "value"
                );

            return {
                success:
                    true,

                exists:
                    snapshot.exists(),

                data:
                    snapshot.val()
            };

        } catch (error) {

            return {
                success:
                    false,

                data:
                    null,

                error:
                    normalizeFirebaseError(
                        error
                    ),

                code:
                    error.code || null
            };
        }
    }

    async function remove(
        path
    ) {

        const ref =
            databaseRef(path);

        if (!ref) {

            return {
                success:
                    false,

                offline:
                    true
            };
        }

        try {

            await ref.remove();

            return {
                success:
                    true
            };

        } catch (error) {

            return {
                success:
                    false,

                error:
                    normalizeFirebaseError(
                        error
                    ),

                code:
                    error.code || null
            };
        }
    }

    /* ---------------------------------------------------------
       User Data Helpers
    --------------------------------------------------------- */

    function userPath(
        uid,
        section = ""
    ) {

        const cleanUid =
            String(
                uid || ""
            ).trim();

        const base =
            `users/${cleanUid}`;

        return section
            ? `${base}/${section}`
            : base;
    }

    async function saveUserProfile(
        uid,
        profile
    ) {

        if (!uid) {

            return {
                success:
                    false,

                error:
                    "User ID is required."
            };
        }

        const cleanProfile =
            {
                ...profile,

                uid,

                updatedAt:
                    Date.now()
            };

        return update(
            userPath(uid),
            cleanProfile
        );
    }

    async function getUserProfile(
        uid
    ) {

        if (!uid) {

            return {
                success:
                    false,

                data:
                    null
            };
        }

        return get(
            userPath(uid)
        );
    }

    /* ---------------------------------------------------------
       Project Helpers
    --------------------------------------------------------- */

    function projectPath(
        projectId
    ) {

        return (
            `projects/${projectId}`
        );
    }

    async function saveProject(
        projectId,
        project
    ) {

        if (!projectId) {

            return {
                success:
                    false,

                error:
                    "Project ID is required."
            };
        }

        const uid =
            getCurrentUserId();

        const payload =
            {
                ...project,

                id:
                    projectId,

                ownerId:
                    project.ownerId ||
                    uid ||
                    null,

                updatedAt:
                    Date.now()
            };

        return set(
            projectPath(
                projectId
            ),
            payload
        );
    }

    async function getProject(
        projectId
    ) {

        if (!projectId) {

            return {
                success:
                    false,

                data:
                    null
            };
        }

        return get(
            projectPath(
                projectId
            )
        );
    }

    async function deleteProject(
        projectId
    ) {

        if (!projectId) {

            return {
                success:
                    false
            };
        }

        return remove(
            projectPath(
                projectId
            )
        );
    }

    /* ---------------------------------------------------------
       Registration Data

       هذه البيانات تستخدم لاحقاً في صفحة Admin.
    --------------------------------------------------------- */

    async function saveRegistration(
        registration
    ) {

        const payload =
            {
                ...registration,

                createdAt:
                    registration.createdAt ||
                    Date.now(),

                updatedAt:
                    Date.now()
            };

        return push(
            "registrations",
            payload
        );
    }

    /* ---------------------------------------------------------
       Reports
    --------------------------------------------------------- */

    async function saveReport(
        reportId,
        report
    ) {

        if (!reportId) {

            return {
                success:
                    false
            };
        }

        return set(
            `reports/${reportId}`,
            {
                ...report,

                id:
                    reportId,

                updatedAt:
                    Date.now()
            }
        );
    }

    /* ---------------------------------------------------------
       Firebase Storage
    --------------------------------------------------------- */

    function storageRef(
        path = ""
    ) {

        if (
            !state.storage
        ) {
            return null;
        }

        const root =
            CONFIG.firebase?.storage
                ?.root ||
            "acoustic-engineering";

        const cleanPath =
            String(path)
                .replace(
                    /^\/+/,
                    ""
                );

        const finalPath =
            cleanPath
                ? `${root}/${cleanPath}`
                : root;

        return state.storage.ref(
            finalPath
        );
    }

    async function uploadFile(
        path,
        file,
        metadata = {}
    ) {

        const ref =
            storageRef(path);

        if (!ref) {

            return {
                success:
                    false,

                offline:
                    true,

                error:
                    "Firebase Storage is unavailable."
            };
        }

        if (!file) {

            return {
                success:
                    false,

                error:
                    "No file supplied."
            };
        }

        try {

            const snapshot =
                await ref.put(
                    file,
                    metadata
                );

            const url =
                await snapshot.ref
                    .getDownloadURL();

            return {
                success:
                    true,

                url,

                path:
                    snapshot.ref.fullPath,

                metadata:
                    snapshot.metadata
            };

        } catch (error) {

            return {
                success:
                    false,

                url:
                    null,

                error:
                    normalizeFirebaseError(
                        error
                    ),

                code:
                    error.code || null
            };
        }
    }

    async function deleteFile(
        path
    ) {

        const ref =
            storageRef(path);

        if (!ref) {

            return {
                success:
                    false,

                offline:
                    true
            };
        }

        try {

            await ref.delete();

            return {
                success:
                    true
            };

        } catch (error) {

            return {
                success:
                    false,

                error:
                    normalizeFirebaseError(
                        error
                    )
            };
        }
    }

    /* ---------------------------------------------------------
       Error Normalization
    --------------------------------------------------------- */

    function normalizeFirebaseError(
        error
    ) {

        if (!error) {
            return "Unknown Firebase error.";
        }

        const code =
            error.code || "";

        const messages = {

            "auth/email-already-in-use":
                "البريد الإلكتروني مستخدم بالفعل.",

            "auth/invalid-email":
                "البريد الإلكتروني غير صحيح.",

            "auth/weak-password":
                "كلمة المرور ضعيفة.",

            "auth/user-not-found":
                "لم يتم العثور على المستخدم.",

            "auth/wrong-password":
                "كلمة المرور غير صحيحة.",

            "auth/invalid-credential":
                "بيانات تسجيل الدخول غير صحيحة.",

            "auth/too-many-requests":
                "تم تجاوز عدد المحاولات. حاول لاحقاً.",

            "auth/network-request-failed":
                "تعذر الاتصال بالشبكة.",

            "auth/user-disabled":
                "هذا الحساب معطل.",

            "auth/requires-recent-login":
                "يرجى تسجيل الدخول مرة أخرى.",

            "permission-denied":
                "ليس لديك صلاحية تنفيذ هذه العملية.",

            "storage/unauthorized":
                "ليس لديك صلاحية رفع هذا الملف.",

            "storage/canceled":
                "تم إلغاء رفع الملف.",

            "storage/quota-exceeded":
                "تم تجاوز مساحة التخزين."
        };

        return (
            messages[code] ||
            error.message ||
            "حدث خطأ في Firebase."
        );
    }

    /* ---------------------------------------------------------
       Public API
    --------------------------------------------------------- */

    const FirebaseAPI = {

        state,

        initialize,

        loadFirebaseSDK,

        isConfigured,

        isAuthenticated,

        getCurrentUser,

        getCurrentUserId,

        register,

        login,

        logout,

        resetPassword,

        sendEmailVerification,

        databaseRef,

        set,

        update,

        push,

        get,

        remove,

        saveUserProfile,

        getUserProfile,

        saveProject,

        getProject,

        deleteProject,

        saveRegistration,

        saveReport,

        storageRef,

        uploadFile,

        deleteFile,

        normalizeFirebaseError
    };

    /* ---------------------------------------------------------
       Expose API
    --------------------------------------------------------- */

    AE.firebase =
        FirebaseAPI;

    window.AcousticFirebase =
        FirebaseAPI;

    /* ---------------------------------------------------------
       Auto Initialization
    --------------------------------------------------------- */

    function boot() {

        initialize()
            .catch(
                function (error) {

                    console.error(
                        "Acoustic Engineering Firebase boot error:",
                        error
                    );

                    enableOfflineMode();
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
                once: true
            }
        );

    } else {

        boot();
    }

})();