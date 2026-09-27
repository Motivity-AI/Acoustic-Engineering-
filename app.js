/* =====================================================
   ACOUSTIC ENGINEERING
   Frontend Application
===================================================== */

const state = {

    user: null,

    projects: [],

    speakers: [],

    currentProject: null,

    currentMode: "manual",

    currentTool: "select",

    selectedElement: null,

    zoom: 1,

    gridSize: 1,

    designElements: [],

    analysis: null,

    aiDesign: null

};


/* =====================================================
   DOM HELPERS
===================================================== */

const $ = selector =>
    document.querySelector(selector);

const $$ = selector =>
    [...document.querySelectorAll(selector)];


function show(element) {

    if (typeof element === "string") {
        element = $(element);
    }

    if (element) {
        element.classList.remove("hidden");
    }

}


function hide(element) {

    if (typeof element === "string") {
        element = $(element);
    }

    if (element) {
        element.classList.add("hidden");
    }

}


function toast(message) {

    const el =
        $("#toast");

    el.textContent =
        message;

    el.classList.add("show");

    setTimeout(() => {
        el.classList.remove("show");
    }, 3000);
}


/* =====================================================
   API
===================================================== */

async function api(
    url,
    options = {}
) {

    const response =
        await fetch(
            url,
            {
                credentials: "include",
                ...options,
                headers: {
                    ...(options.body instanceof FormData
                        ? {}
                        : {
                            "Content-Type":
                                "application/json"
                        }),
                    ...(options.headers || {})
                }
            }
        );

    let data;

    try {
        data =
            await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {

        throw new Error(
            data.message ||
            "حدث خطأ في الاتصال بالخادم"
        );

    }

    return data;
}


/* =====================================================
   AUTH
===================================================== */

async function checkAuth() {

    try {

        const result =
            await api(
                "/api/auth/me"
            );

        if (
            result.success &&
            result.user
        ) {

            state.user =
                result.user;

            enterApplication();

        } else {

            showAuth();

        }

    } catch {

        showAuth();

    }

}


function showAuth() {

    show("#authScreen");
    hide("#appScreen");

}


function enterApplication() {

    hide("#authScreen");
    show("#appScreen");

    $("#currentUser").innerHTML =
        `<strong>${escapeHTML(
            state.user.name
        )}</strong><br>
         ${escapeHTML(
             state.user.phone
         )}`;

    if (
        state.user.role === "admin"
    ) {

        show("#adminNav");

    } else {

        hide("#adminNav");

    }

    loadAllData();

}


async function login() {

    const phone =
        $("#loginPhone").value.trim();

    const password =
        $("#loginPassword").value;

    try {

        const result =
            await api(
                "/api/auth/login",
                {
                    method: "POST",

                    body: JSON.stringify({
                        phone,
                        password
                    })
                }
            );

        state.user =
            result.user;

        $("#loginMessage").textContent =
            "";

        enterApplication();

        toast("تم تسجيل الدخول");

    } catch (error) {

        $("#loginMessage").textContent =
            error.message;

    }

}


async function register() {

    const body = {

        name:
            $("#registerName").value.trim(),

        phone:
            $("#registerPhone").value.trim(),

        email:
            $("#registerEmail").value.trim(),

        company:
            $("#registerCompany").value.trim(),

        password:
            $("#registerPassword").value

    };

    try {

        const result =
            await api(
                "/api/auth/register",
                {
                    method: "POST",

                    body:
                        JSON.stringify(
                            body
                        )
                }
            );

        state.user =
            result.user;

        enterApplication();

        toast(
            "تم إنشاء الحساب بنجاح"
        );

    } catch (error) {

        $("#registerMessage")
            .textContent =
            error.message;

    }

}


async function logout() {

    await api(
        "/api/auth/logout",
        {
            method: "POST"
        }
    );

    state.user = null;

    showAuth();

}


/* =====================================================
   NAVIGATION
===================================================== */

function openView(view) {

    $$(".view")
        .forEach(
            el =>
                el.classList.add(
                    "hidden"
                )
        );

    const target =
        $(`#view-${view}`);

    if (target) {
        target.classList.remove(
            "hidden"
        );
    }

    $$(".nav-item")
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.view === view
                );

            }
        );

    const titles = {

        dashboard: [
            "لوحة التحكم",
            "Acoustic Engineering Platform"
        ],

        projects: [
            "المشاريع",
            "Project Management"
        ],

        designer: [
            "المصمم الهندسي",
            "Intelligent Acoustic Design"
        ],

        speakers: [
            "مكتبة السماعات",
            "Global Speaker Database"
        ],

        reports: [
            "التقارير",
            "Engineering Reports"
        ],

        admin: [
            "الإدارة",
            "Administration"
        ]

    };

    const title =
        titles[view] ||
        titles.dashboard;

    $("#pageTitle")
        .textContent =
        title[0];

    $("#pageSubtitle")
        .textContent =
        title[1];

    if (view === "designer") {

        resizeCanvas();

        drawCanvas();

    }

}


/* =====================================================
   LOAD DATA
===================================================== */

async function loadAllData() {

    try {

        await Promise.all([
            loadProjects(),
            loadSpeakers()
        ]);

        updateDashboard();

    } catch (error) {

        toast(
            error.message
        );

    }

}


async function loadProjects() {

    const result =
        await api(
            "/api/projects"
        );

    state.projects =
        result.projects || [];

    renderProjects();

    populateProjectSelect();

}


async function loadSpeakers() {

    const result =
        await api(
            "/api/speakers"
        );

    state.speakers =
        result.speakers || [];

    renderSpeakers();

    populateSpeakerSelect();

}


function updateDashboard() {

    $("#statProjects")
        .textContent =
        state.projects.length;

    $("#statSpeakers")
        .textContent =
        state.speakers.length;

    const recent =
        state.projects.slice(
            0,
            6
        );

    $("#recentProjects")
        .innerHTML =
        recent
            .map(
                projectCardHTML
            )
            .join("");

}


function projectCardHTML(project) {

    return `
        <div
            class="project-card"
            data-project-id="${project.id}"
        >

            <div class="project-card-header">

                <h3>
                    ${escapeHTML(
                        project.name
                    )}
                </h3>

                <span class="project-type">
                    ${escapeHTML(
                        project.project_type
                    )}
                </span>

            </div>

            <div class="project-meta">

                <div>
                    <span>
                        Dimensions
                    </span>

                    <strong>
                        ${project.width} ×
                        ${project.length} ×
                        ${project.height} m
                    </strong>
                </div>

                <div>
                    <span>
                        Area
                    </span>

                    <strong>
                        ${Number(
                            project.area
                        ).toFixed(1)} m²
                    </strong>
                </div>

                <div>
                    <span>
                        Volume
                    </span>

                    <strong>
                        ${Number(
                            project.volume
                        ).toFixed(1)} m³
                    </strong>
                </div>

                <div>
                    <span>
                        Mode
                    </span>

                    <strong>
                        ${project.design_mode}
                    </strong>
                </div>

            </div>

        </div>
    `;

}


function renderProjects() {

    $("#projectsGrid")
        .innerHTML =
        state.projects.length
            ? state.projects
                .map(
                    projectCardHTML
                )
                .join("")
            : `
                <div class="project-card">
                    لا توجد مشاريع بعد.
                </div>
            `;

}


/* =====================================================
   PROJECT CREATION
===================================================== */

function openProjectModal() {

    show("#projectModal");

}


async function createProject() {

    const body = {

        name:
            $("#newProjectName")
                .value
                .trim(),

        project_type:
            $("#newProjectType")
                .value,

        width:
            Number(
                $("#newProjectWidth")
                    .value
            ),

        length:
            Number(
                $("#newProjectLength")
                    .value
            ),

        height:
            Number(
                $("#newProjectHeight")
                    .value
            ),

        description:
            $("#newProjectDescription")
                .value
                .trim(),

        design_mode:
            "manual",

        project_data: {

            elements: []

        }

    };

    if (!body.name) {

        toast(
            "أدخل اسم المشروع"
        );

        return;

    }

    try {

        const result =
            await api(
                "/api/projects",
                {
                    method: "POST",

                    body:
                        JSON.stringify(
                            body
                        )
                }
            );

        state.projects.unshift(
            result.project
        );

        hide("#projectModal");

        renderProjects();

        populateProjectSelect();

        updateDashboard();

        openProject(
            result.project.id
        );

        toast(
            "تم إنشاء المشروع"
        );

    } catch (error) {

        toast(
            error.message
        );

    }

}


async function openProject(id) {

    try {

        const result =
            await api(
                `/api/projects/${id}`
            );

        state.currentProject =
            result.project;

        const project =
            result.project;

        $("#designerProject")
            .value =
            String(project.id);

        $("#roomWidth")
            .value =
            project.width;

        $("#roomLength")
            .value =
            project.length;

        $("#roomHeight")
            .value =
            project.height;

        $("#projectType")
            .value =
            project.project_type;

        const data =
            project.project_data ||
            {};

        state.designElements =
            data.elements ||
            [];

        state.aiDesign =
            data.aiDesign ||
            null;

        state.analysis =
            data.analysis ||
            null;

        openView(
            "designer"
        );

        resizeCanvas();

        drawCanvas();

        updateAnalysisPanel();

    } catch (error) {

        toast(
            error.message
        );

    }

}


function populateProjectSelect() {

    const select =
        $("#designerProject");

    select.innerHTML =
        `
        <option value="">
            اختر مشروعاً
        </option>
        `;

    state.projects.forEach(
        project => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                project.id;

            option.textContent =
                project.name;

            select.appendChild(
                option
            );

        }
    );

}


/* =====================================================
   SPEAKERS
===================================================== */

function populateSpeakerSelect() {

    const select =
        $("#speakerSelect");

    select.innerHTML =
        "";

    state.speakers.forEach(
        speaker => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                speaker.id;

            option.textContent =
                `${speaker.manufacturer} — ${speaker.model}`;

            select.appendChild(
                option
            );

        }
    );

}


function renderSpeakers() {

    const search =
        (
            $("#speakerSearch")
                ?.value ||
            ""
        )
            .toLowerCase();

    const category =
        $("#speakerCategoryFilter")
            ?.value ||
        "";

    const filtered =
        state.speakers.filter(
            speaker => {

                const matchesSearch =
                    !search ||
                    `${speaker.manufacturer} ${speaker.model}`
                        .toLowerCase()
                        .includes(search);

                const matchesCategory =
                    !category ||
                    speaker.category ===
                    category;

                return (
                    matchesSearch &&
                    matchesCategory
                );

            }
        );

    $("#speakerLibrary")
        .innerHTML =
        filtered
            .map(
                speakerCardHTML
            )
            .join("");

}


function speakerCardHTML(speaker) {

    return `
        <div class="speaker-card">

            <div class="speaker-manufacturer">
                ${escapeHTML(
                    speaker.manufacturer
                )}
            </div>

            <h3>
                ${escapeHTML(
                    speaker.model
                )}
            </h3>

            <span class="project-type">
                ${escapeHTML(
                    speaker.category
                )}
            </span>

            <div class="speaker-specs">

                <div class="spec">
                    <span>RMS</span>
                    <strong>
                        ${speaker.rms_power} W
                    </strong>
                </div>

                <div class="spec">
                    <span>Max SPL</span>
                    <strong>
                        ${speaker.max_spl} dB
                    </strong>
                </div>

                <div class="spec">
                    <span>H Coverage</span>
                    <strong>
                        ${speaker.horizontal_coverage}°
                    </strong>
                </div>

                <div class="spec">
                    <span>V Coverage</span>
                    <strong>
                        ${speaker.vertical_coverage}°
                    </strong>
                </div>

                <div class="spec">
                    <span>Frequency</span>
                    <strong>
                        ${speaker.frequency_min}
                        -
                        ${speaker.frequency_max} Hz
                    </strong>
                </div>

                <div class="spec">
                    <span>Weight</span>
                    <strong>
                        ${speaker.weight} kg
                    </strong>
                </div>

            </div>

        </div>
    `;

}


async function submitSpeaker(form) {

    const formData =
        new FormData(form);

    try {

        const result =
            await api(
                "/api/speakers",
                {
                    method: "POST",
                    body: formData
                }
            );

        state.speakers.push(
            result.speaker
        );

        hide("#speakerModal");

        form.reset();

        renderSpeakers();

        populateSpeakerSelect();

        updateDashboard();

        toast(
            "تمت إضافة السماعة"
        );

    } catch (error) {

        toast(
            error.message
        );

    }

}


/* =====================================================
   CANVAS ENGINE
===================================================== */

const canvas =
    $("#designCanvas");

const ctx =
    canvas.getContext("2d");

let canvasRect = null;

function resizeCanvas() {

    if (!canvas) return;

    const container =
        $("#canvasContainer");

    if (!container) return;

    const rect =
        container.getBoundingClientRect();

    const dpr =
        window.devicePixelRatio ||
        1;

    canvas.width =
        rect.width * dpr;

    canvas.height =
        rect.height * dpr;

    canvas.style.width =
        `${rect.width}px`;

    canvas.style.height =
        `${rect.height}px`;

    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );

    canvasRect =
        rect;

}


function getRoomScale() {

    if (
        !state.currentProject
    ) {

        return 20;

    }

    const roomWidth =
        Number(
            $("#roomWidth").value
        );

    const roomLength =
        Number(
            $("#roomLength").value
        );

    const widthPx =
        canvas.clientWidth - 80;

    const heightPx =
        canvas.clientHeight - 80;

    return Math.min(
        widthPx / roomWidth,
        heightPx / roomLength
    ) * state.zoom;

}


function roomOrigin() {

    const roomWidth =
        Number(
            $("#roomWidth").value
        );

    const roomLength =
        Number(
            $("#roomLength").value
        );

    const scale =
        getRoomScale();

    const drawingWidth =
        roomWidth * scale;

    const drawingHeight =
        roomLength * scale;

    return {

        x:
            (
                canvas.clientWidth -
                drawingWidth
            ) / 2,

        y:
            (
                canvas.clientHeight -
                drawingHeight
            ) / 2

    };

}


function worldToScreen(x, y) {

    const scale =
        getRoomScale();

    const origin =
        roomOrigin();

    return {

        x:
            origin.x +
            x * scale,

        y:
            origin.y +
            y * scale

    };

}


function screenToWorld(x, y) {

    const scale =
        getRoomScale();

    const origin =
        roomOrigin();

    return {

        x:
            (x - origin.x) /
            scale,

        y:
            (y - origin.y) /
            scale

    };

}


function snap(value) {

    const size =
        Number(
            state.gridSize
        );

    return (
        Math.round(
            value / size
        ) * size
    );

}


function drawCanvas() {

    if (!canvas) return;

    const width =
        canvas.clientWidth;

    const height =
        canvas.clientHeight;

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    drawBackground();

    drawRoom();

    drawGrid();

    drawElements();

    if (
        state.aiDesign &&
        state.currentMode === "ai"
    ) {

        drawAIOverlay();

    }

}


function drawBackground() {

    const width =
        canvas.clientWidth;

    const height =
        canvas.clientHeight;

    const gradient =
        ctx.createRadialGradient(
            width / 2,
            height / 2,
            10,
            width / 2,
            height / 2,
            Math.max(
                width,
                height
            )
        );

    gradient.addColorStop(
        0,
        "#0b1522"
    );

    gradient.addColorStop(
        1,
        "#050911"
    );

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        width,
        height
    );

}


function drawGrid() {

    if (
        !state.currentProject
    ) return;

    const roomWidth =
        Number(
            $("#roomWidth").value
        );

    const roomLength =
        Number(
            $("#roomLength").value
        );

    const scale =
        getRoomScale();

    const origin =
        roomOrigin();

    const step =
        Number(
            state.gridSize
        ) * scale;

    ctx.save();

    ctx.strokeStyle =
        "rgba(56,189,248,0.07)";

    ctx.lineWidth = 1;

    for (
        let x = 0;
        x <= roomWidth;
        x += Number(state.gridSize)
    ) {

        const sx =
            origin.x +
            x * scale;

        ctx.beginPath();

        ctx.moveTo(
            sx,
            origin.y
        );

        ctx.lineTo(
            sx,
            origin.y +
            roomLength * scale
        );

        ctx.stroke();

    }

    for (
        let y = 0;
        y <= roomLength;
        y += Number(state.gridSize)
    ) {

        const sy =
            origin.y +
            y * scale;

        ctx.beginPath();

        ctx.moveTo(
            origin.x,
            sy
        );

        ctx.lineTo(
            origin.x +
            roomWidth * scale,
            sy
        );

        ctx.stroke();

    }

    ctx.restore();

}


function drawRoom() {

    const roomWidth =
        Number(
            $("#roomWidth").value
        );

    const roomLength =
        Number(
            $("#roomLength").value
        );

    const scale =
        getRoomScale();

    const origin =
        roomOrigin();

    const width =
        roomWidth * scale;

    const height =
        roomLength * scale;

    ctx.save();

    ctx.fillStyle =
        "#0c1725";

    ctx.fillRect(
        origin.x,
        origin.y,
        width,
        height
    );

    ctx.strokeStyle =
        "rgba(56,189,248,0.8)";

    ctx.lineWidth = 2;

    ctx.strokeRect(
        origin.x,
        origin.y,
        width,
        height
    );

    ctx.fillStyle =
        "rgba(255,255,255,0.45)";

    ctx.font =
        "11px Arial";

    ctx.textAlign =
        "center";

    ctx.fillText(
        `${roomWidth} m`,
        origin.x +
            width / 2,
        origin.y - 12
    );

    ctx.save();

    ctx.translate(
        origin.x - 14,
        origin.y +
            height / 2
    );

    ctx.rotate(
        -Math.PI / 2
    );

    ctx.fillText(
        `${roomLength} m`,
        0,
        0
    );

    ctx.restore();

    ctx.restore();

}


function drawElements() {

    state.designElements.forEach(
        element => {

            if (
                element.type ===
                "speaker"
            ) {

                drawSpeaker(
                    element
                );

            }

            if (
                element.type ===
                "stage"
            ) {

                drawStage(
                    element
                );

            }

            if (
                element.type ===
                "wall"
            ) {

                drawWall(
                    element
                );

            }

        }
    );

}


function drawSpeaker(element) {

    const point =
        worldToScreen(
            element.x,
            element.y
        );

    const scale =
        getRoomScale();

    const size =
        Math.max(
            8,
            Math.min(
                15,
                scale * 0.25
            )
        );

    const selected =
        state.selectedElement &&
        state.selectedElement.id ===
            element.id;

    ctx.save();

    ctx.translate(
        point.x,
        point.y
    );

    ctx.rotate(
        Number(
            element.angle || 0
        ) *
        Math.PI /
        180
    );

    ctx.beginPath();

    ctx.moveTo(
        size * 1.6,
        0
    );

    ctx.lineTo(
        -size,
        -size
    );

    ctx.lineTo(
        -size,
        size
    );

    ctx.closePath();

    ctx.fillStyle =
        selected
            ? "#ffffff"
            : "#38bdf8";

    ctx.fill();

    ctx.strokeStyle =
        "#0ea5e9";

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
        size * 1.5,
        0
    );

    ctx.lineTo(
        size * 4,
        0
    );

    ctx.strokeStyle =
        "rgba(56,189,248,0.18)";

    ctx.lineWidth = 3;

    ctx.stroke();

    ctx.restore();

}


function drawStage(element) {

    const p =
        worldToScreen(
            element.x,
            element.y
        );

    const scale =
        getRoomScale();

    const width =
        (element.width || 8) *
        scale;

    const height =
        (element.height || 3) *
        scale;

    ctx.save();

    ctx.fillStyle =
        "rgba(168,85,247,0.18)";

    ctx.strokeStyle =
        "#a855f7";

    ctx.lineWidth = 1;

    ctx.fillRect(
        p.x,
        p.y,
        width,
        height
    );

    ctx.strokeRect(
        p.x,
        p.y,
        width,
        height
    );

    ctx.fillStyle =
        "#d8b4fe";

    ctx.font =
        "10px Arial";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "STAGE",
        p.x +
            width / 2,
        p.y +
            height / 2
    );

    ctx.restore();

}


function drawWall(element) {

    const a =
        worldToScreen(
            element.x,
            element.y
        );

    const b =
        worldToScreen(
            element.x2,
            element.y2
        );

    ctx.save();

    ctx.strokeStyle =
        "#64748b";

    ctx.lineWidth = 5;

    ctx.beginPath();

    ctx.moveTo(
        a.x,
        a.y
    );

    ctx.lineTo(
        b.x,
        b.y
    );

    ctx.stroke();

    ctx.restore();

}


function drawAIOverlay() {

    if (
        !state.aiDesign ||
        !state.aiDesign.speakers
    ) {
        return;
    }

    ctx.save();

    state.aiDesign.speakers
        .forEach(
            item => {

                const point =
                    worldToScreen(
                        item.x,
                        item.y
                    );

                ctx.beginPath();

                ctx.arc(
                    point.x,
                    point.y,
                    20,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    "rgba(124,58,237,0.07)";

                ctx.fill();

                ctx.strokeStyle =
                    "rgba(167,139,250,0.3)";

                ctx.stroke();

            }
        );

    ctx.restore();

}


/* =====================================================
   CANVAS INTERACTION
===================================================== */

let dragging = false;

let dragOffset = {
    x: 0,
    y: 0
};


canvas.addEventListener(
    "mousedown",
    event => {

        const rect =
            canvas.getBoundingClientRect();

        const sx =
            event.clientX -
            rect.left;

        const sy =
            event.clientY -
            rect.top;

        const world =
            screenToWorld(
                sx,
                sy
            );

        if (
            state.currentTool ===
            "speaker"
        ) {

            addManualSpeaker(
                snap(world.x),
                snap(world.y)
            );

            return;

        }

        if (
            state.currentTool ===
            "stage"
        ) {

            addStage(
                snap(world.x),
                snap(world.y)
            );

            return;

        }

        if (
            state.currentTool ===
            "wall"
        ) {

            addWall(
                snap(world.x),
                snap(world.y)
            );

            return;

        }

        if (
            state.currentTool ===
            "erase"
        ) {

            const hit =
                findElementAt(
                    world.x,
                    world.y
                );

            if (hit) {

                state.designElements =
                    state.designElements
                        .filter(
                            element =>
                                element.id !==
                                hit.id
                        );

                state.selectedElement =
                    null;

                updateSelectionPanel();

                drawCanvas();

            }

            return;

        }

        const hit =
            findElementAt(
                world.x,
                world.y
            );

        if (hit) {

            state.selectedElement =
                hit;

            dragging = true;

            dragOffset.x =
                world.x -
                hit.x;

            dragOffset.y =
                world.y -
                hit.y;

            updateSelectionPanel();

            drawCanvas();

        } else {

            state.selectedElement =
                null;

            updateSelectionPanel();

            drawCanvas();

        }

    }
);


canvas.addEventListener(
    "mousemove",
    event => {

        if (
            !dragging ||
            !state.selectedElement
        ) {
            return;
        }

        const rect =
            canvas.getBoundingClientRect();

        const sx =
            event.clientX -
            rect.left;

        const sy =
            event.clientY -
            rect.top;

        const world =
            screenToWorld(
                sx,
                sy
            );

        state.selectedElement.x =
            snap(
                world.x -
                dragOffset.x
            );

        state.selectedElement.y =
            snap(
                world.y -
                dragOffset.y
            );

        updateSelectionPanel();

        drawCanvas();

    }
);


window.addEventListener(
    "mouseup",
    () => {

        dragging = false;

    }
);


function findElementAt(x, y) {

    for (
        let i =
            state.designElements.length -
            1;

        i >= 0;

        i--
    ) {

        const element =
            state.designElements[i];

        if (
            element.type ===
            "speaker"
        ) {

            const distance =
                Math.sqrt(
                    Math.pow(
                        element.x - x,
                        2
                    ) +
                    Math.pow(
                        element.y - y,
                        2
                    )
                );

            if (
                distance <
                Math.max(
                    0.8,
                    1.2 /
                    state.zoom
                )
            ) {

                return element;

            }

        }

        if (
            element.type ===
            "stage"
        ) {

            if (
                x >= element.x &&
                x <=
                    element.x +
                    (element.width || 8) &&
                y >= element.y &&
                y <=
                    element.y +
                    (element.height || 3)
            ) {

                return element;

            }

        }

    }

    return null;

}


function addManualSpeaker(
    x,
    y
) {

    const speakerId =
        Number(
            $("#speakerSelect")
                .value
        );

    const speaker =
        state.speakers.find(
            item =>
                item.id ===
                speakerId
        );

    if (!speaker) {

        toast(
            "اختر سماعة أولاً"
        );

        return;

    }

    const element = {

        id:
            `manual-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`,

        type:
            "speaker",

        speakerId:
            speaker.id,

        model:
            speaker.model,

        manufacturer:
            speaker.manufacturer,

        x,
        y,

        z:
            Number(
                $("#roomHeight").value
            ) - 1,

        angle:
            0

    };

    state.designElements.push(
        element
    );

    state.selectedElement =
        element;

    updateSelectionPanel();

    drawCanvas();

}


function addStage(x, y) {

    const element = {

        id:
            `stage-${Date.now()}`,

        type:
            "stage",

        x,
        y,

        width: 8,

        height: 3

    };

    state.designElements.push(
        element
    );

    state.selectedElement =
        element;

    updateSelectionPanel();

    drawCanvas();

}


function addWall(x, y) {

    const element = {

        id:
            `wall-${Date.now()}`,

        type:
            "wall",

        x,
        y,

        x2:
            x + 5,

        y2:
            y

    };

    state.designElements.push(
        element
    );

    drawCanvas();

}


/* =====================================================
   SELECTION
===================================================== */

function updateSelectionPanel() {

    const element =
        state.selectedElement;

    if (!element) {

        hide("#selectionPanel");

        return;

    }

    show("#selectionPanel");

    $("#selectedInfo")
        .textContent =
        element.type === "speaker"
            ? `${element.manufacturer} ${element.model}`
            : element.type;

    $("#selectedX")
        .value =
        Number(
            element.x || 0
        ).toFixed(2);

    $("#selectedY")
        .value =
        Number(
            element.y || 0
        ).toFixed(2);

    $("#selectedZ")
        .value =
        Number(
            element.z || 0
        ).toFixed(2);

    $("#selectedAngle")
        .value =
        Number(
            element.angle || 0
        );

}


function updateSelectedFromInputs() {

    const element =
        state.selectedElement;

    if (!element) return;

    element.x =
        Number(
            $("#selectedX").value
        );

    element.y =
        Number(
            $("#selectedY").value
        );

    element.z =
        Number(
            $("#selectedZ").value
        );

    element.angle =
        Number(
            $("#selectedAngle").value
        );

    drawCanvas();

}


/* =====================================================
   AI AUTO DESIGN
===================================================== */

async function runAutoDesign() {

    const speakerId =
        Number(
            $("#speakerSelect")
                .value
        );

    const speaker =
        state.speakers.find(
            item =>
                item.id ===
                speakerId
        );

    if (!speaker) {

        toast(
            "اختر السماعة أولاً"
        );

        return;

    }

    const room = {

        width:
            Number(
                $("#roomWidth").value
            ),

        length:
            Number(
                $("#roomLength").value
            ),

        height:
            Number(
                $("#roomHeight").value
            )

    };

    const application =
        $("#projectType").value;

    try {

        toast(
            "جاري إنشاء التصميم الهندسي..."
        );

        const result =
            await api(
                "/api/analysis/auto-design",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            room,
                            speaker,
                            application,
                            mountingPreference:
                                "auto"
                        })
                }
            );

        state.aiDesign =
            result.design;

        state.currentMode =
            "ai";

        $$(".mode-button")
            .forEach(
                button => {

                    button.classList.toggle(
                        "active",
                        button.dataset.mode ===
                            "ai"
                    );

                }
            );

        state.designElements =
            result.design.speakers
                .map(
                    item => ({
                        id:
                            `ai-${item.id}`,

                        type:
                            "speaker",

                        speakerId:
                            item.speakerId,

                        model:
                            item.model,

                        manufacturer:
                            item.manufacturer,

                        x:
                            item.x,

                        y:
                            item.y,

                        z:
                            item.z,

                        angle:
                            item.angle
                    })
                );

        drawCanvas();

        updateAnalysisPanel();

        $("#designSummary")
            .innerHTML =
            `
                <strong>
                    ${escapeHTML(
                        result.design.strategy
                    )}
                </strong>
                <br>
                عدد السماعات:
                ${result.design.speakers.length}
                <br>
                Score:
                ${Number(
                    result.design.score
                ).toFixed(1)}
            `;

        toast(
            "تم إنشاء التصميم الذكي"
        );

    } catch (error) {

        toast(
            error.message
        );

    }

}


/* =====================================================
   ANALYSIS
===================================================== */

async function analyzeCurrentDesign() {

    if (
        !state.currentProject
    ) {

        toast(
            "اختر مشروعاً أولاً"
        );

        return;

    }

    const room = {

        width:
            Number(
                $("#roomWidth").value
            ),

        length:
            Number(
                $("#roomLength").value
            ),

        height:
            Number(
                $("#roomHeight").value
            )

    };

    const acousticSpeakers =
        state.designElements
            .filter(
                element =>
                    element.type ===
                    "speaker"
            )
            .map(
                element => {

                    const speaker =
                        state.speakers.find(
                            item =>
                                item.id ===
                                Number(
                                    element.speakerId
                                )
                        );

                    return {

                        id:
                            element.id,

                        position: {

                            x:
                                element.x,

                            y:
                                element.y,

                            z:
                                element.z

                        },

                        angle:
                            element.angle,

                        speaker

                    };

                }
            )
            .filter(
                item =>
                    item.speaker
            );

    if (
        acousticSpeakers.length === 0
    ) {

        toast(
            "أضف سماعة واحدة على الأقل"
        );

        return;

    }

    try {

        const result =
            await api(
                "/api/analysis/analyze",
                {
                    method: "POST",

                    body:
                        JSON.stringify({

                            room,

                            speakers:
                                acousticSpeakers,

                            targetSPL:
                                85

                        })
                }
            );

        state.analysis =
            result.analysis;

        updateAnalysisPanel();

        drawHeatmap(
            result.analysis.heatmap
        );

        toast(
            "اكتمل التحليل الهندسي"
        );

    } catch (error) {

        toast(
            error.message
        );

    }

}


function updateAnalysisPanel() {

    const speakers =
        state.designElements
            .filter(
                element =>
                    element.type ===
                    "speaker"
            );

    $("#analysisSpeakerCount")
        .textContent =
        speakers.length;

    if (
        state.analysis
    ) {

        $("#analysisAverageSPL")
            .textContent =
            `${state.analysis.averageSPL} dB`;

        $("#analysisMinimumSPL")
            .textContent =
            `${state.analysis.minimumSPL} dB`;

        $("#analysisMaximumSPL")
            .textContent =
            `${state.analysis.maximumSPL} dB`;

        $("#analysisUniformity")
            .textContent =
            `${state.analysis.uniformity}%`;

        drawHeatmap(
            state.analysis.heatmap
        );

    }

}


function drawHeatmap(points = []) {

    const heatmap =
        $("#heatmapCanvas");

    if (!heatmap) return;

    const rect =
        heatmap.getBoundingClientRect();

    const dpr =
        window.devicePixelRatio ||
        1;

    heatmap.width =
        rect.width * dpr;

    heatmap.height =
        rect.height * dpr;

    const context =
        heatmap.getContext("2d");

    context.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );

    const width =
        rect.width;

    const height =
        rect.height;

    context.fillStyle =
        "#050a11";

    context.fillRect(
        0,
        0,
        width,
        height
    );

    if (
        !points ||
        !points.length
    ) {

        return;

    }

    const roomWidth =
        Number(
            $("#roomWidth").value
        );

    const roomLength =
        Number(
            $("#roomLength").value
        );

    const cellWidth =
        width /
        roomWidth;

    const cellHeight =
        height /
        roomLength;

    const min =
        Math.min(
            ...points.map(
                p => p.spl
            )
        );

    const max =
        Math.max(
            ...points.map(
                p => p.spl
            )
        );

    points.forEach(
        point => {

            const ratio =
                max === min
                    ? 0.5
                    :
                    (
                        point.spl -
                        min
                    ) /
                    (
                        max -
                        min
                    );

            const hue =
                240 -
                ratio * 240;

            context.fillStyle =
                `hsl(${hue}, 80%, 48%)`;

            context.fillRect(

                point.x *
                    cellWidth,

                point.y *
                    cellHeight,

                Math.max(
                    2,
                    cellWidth * 2
                ),

                Math.max(
                    2,
                    cellHeight * 2
                )

            );

        }
    );

}


/* =====================================================
   SAVE DESIGN
===================================================== */

async function saveDesign() {

    if (
        !state.currentProject
    ) {

        toast(
            "اختر مشروعاً"
        );

        return;

    }

    try {

        const result =
            await api(
                `/api/projects/${state.currentProject.id}`,
                {
                    method: "PUT",

                    body:
                        JSON.stringify({

                            name:
                                state.currentProject.name,

                            project_type:
                                $("#projectType")
                                    .value,

                            width:
                                Number(
                                    $("#roomWidth")
                                        .value
                                ),

                            length:
                                Number(
                                    $("#roomLength")
                                        .value
                                ),

                            height:
                                Number(
                                    $("#roomHeight")
                                        .value
                                ),

                            design_mode:
                                state.currentMode,

                            project_data: {

                                elements:
                                    state.designElements,

                                aiDesign:
                                    state.aiDesign,

                                analysis:
                                    state.analysis

                            }

                        })
                }
            );

        state.currentProject =
            result.project;

        await loadProjects();

        toast(
            "تم حفظ التصميم"
        );

    } catch (error) {

        toast(
            error.message
        );

    }

}


/* =====================================================
   REPORT
===================================================== */

async function generateReport() {

    if (
        !state.currentProject
    ) {

        toast(
            "اختر مشروعاً أولاً"
        );

        return;

    }

    if (
        !state.analysis
    ) {

        toast(
            "قم بتحليل التصميم أولاً"
        );

        return;

    }

    const room = {

        width:
            Number(
                $("#roomWidth").value
            ),

        length:
            Number(
                $("#roomLength").value
            ),

        height:
            Number(
                $("#roomHeight").value
            ),

        area:
            Number(
                $("#roomWidth").value
            ) *
            Number(
                $("#roomLength").value
            ),

        volume:
            Number(
                $("#roomWidth").value
            ) *
            Number(
                $("#roomLength").value
            ) *
            Number(
                $("#roomHeight").value
            )

    };

    const usedSpeakerIds =
        [
            ...new Set(
                state.designElements
                    .filter(
                        e =>
                            e.type ===
                            "speaker"
                    )
                    .map(
                        e =>
                            Number(
                                e.speakerId
                            )
                    )
            )
        ];

    const usedSpeakers =
        state.speakers.filter(
            speaker =>
                usedSpeakerIds.includes(
                    speaker.id
                )
        );

    try {

        const result =
            await api(
                "/api/reports/generate",
                {
                    method: "POST",

                    body:
                        JSON.stringify({

                            projectId:
                                state.currentProject.id,

                            room,

                            speakers:
                                usedSpeakers,

                            analysis:
                                state.analysis,

                            design:
                                state.aiDesign ||
                                {
                                    strategy:
                                        "Manual Design",

                                    score:
                                        0,

                                    speakers:
                                        state.designElements
                                }

                        })
                }
            );

        const url =
            result.file;

        window.open(
            url,
            "_blank"
        );

        toast(
            "تم إنشاء التقرير"
        );

    } catch (error) {

        toast(
            error.message
        );

    }

}


/* =====================================================
   ADMIN
===================================================== */

async function loadAdmin() {

    if (
        state.user?.role !==
        "admin"
    ) {
        return;
    }

    try {

        const stats =
            await api(
                "/api/admin/stats"
            );

        $("#adminStats")
            .innerHTML =
            `
            <div class="stat-card">
                <span>Users</span>
                <strong>
                    ${stats.stats.users}
                </strong>
            </div>

            <div class="stat-card">
                <span>Projects</span>
                <strong>
                    ${stats.stats.projects}
                </strong>
            </div>

            <div class="stat-card">
                <span>Speakers</span>
                <strong>
                    ${stats.stats.speakers}
                </strong>
            </div>

            <div class="stat-card">
                <span>Reports</span>
                <strong>
                    ${stats.stats.reports}
                </strong>
            </div>
            `;

        const users =
            await api(
                "/api/users"
            );

        $("#adminUsers")
            .innerHTML =
            `
            <table>

                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Company</th>
                        <th>Role</th>
                        <th>Created</th>
                    </tr>
                </thead>

                <tbody>

                    ${users.users
                        .map(
                            user => `
                            <tr>

                                <td>
                                    ${user.id}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        user.name
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        user.phone
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        user.company ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${user.role}
                                </td>

                                <td>
                                    ${user.created_at}
                                </td>

                            </tr>
                        `
                        )
                        .join("")}

                </tbody>

            </table>
            `;

        const projects =
            await api(
                "/api/admin/projects"
            );

        $("#adminProjects")
            .innerHTML =
            `
            <table>

                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Project</th>
                        <th>User</th>
                        <th>Type</th>
                        <th>Dimensions</th>
                    </tr>
                </thead>

                <tbody>

                    ${projects.projects
                        .map(
                            project => `
                            <tr>

                                <td>
                                    ${project.id}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        project.name
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        project.user_name
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        project.project_type
                                    )}
                                </td>

                                <td>
                                    ${project.width}
                                    ×
                                    ${project.length}
                                    ×
                                    ${project.height}
                                    m
                                </td>

                            </tr>
                        `
                        )
                        .join("")}

                </tbody>

            </table>
            `;

    } catch (error) {

        toast(
            error.message
        );

    }

}


/* =====================================================
   UTILITY
===================================================== */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =====================================================
   EVENTS
===================================================== */

document.addEventListener(
    "click",
    event => {

        const nav =
            event.target.closest(
                ".nav-item"
            );

        if (nav) {

            openView(
                nav.dataset.view
            );

            if (
                nav.dataset.view ===
                "admin"
            ) {
                loadAdmin();
            }

            return;

        }

        const targetView =
            event.target.closest(
                "[data-view-target]"
            );

        if (targetView) {

            openView(
                targetView.dataset.viewTarget
            );

            return;

        }

        const card =
            event.target.closest(
                ".project-card"
            );

        if (card) {

            const id =
                Number(
                    card.dataset.projectId
                );

            openProject(id);

            return;

        }

    }
);


/* AUTH */

$("#loginButton")
    .addEventListener(
        "click",
        login
    );

$("#registerButton")
    .addEventListener(
        "click",
        register
    );

$("#logoutButton")
    .addEventListener(
        "click",
        logout
    );


$("#showRegister")
    .addEventListener(
        "click",
        () => {

            hide("#loginPanel");
            show("#registerPanel");

        }
    );


$("#showLogin")
    .addEventListener(
        "click",
        () => {

            hide("#registerPanel");
            show("#loginPanel");

        }
    );


/* PROJECT */

$("#newProjectButton")
    .addEventListener(
        "click",
        openProjectModal
    );

$("#heroNewProject")
    .addEventListener(
        "click",
        openProjectModal
    );

$("#projectsNewButton")
    .addEventListener(
        "click",
        openProjectModal
    );

$("#createProjectButton")
    .addEventListener(
        "click",
        createProject
    );


/* SPEAKER */

$("#addSpeakerLibraryButton")
    .addEventListener(
        "click",
        () =>
            show("#speakerModal")
    );


$("#speakerForm")
    .addEventListener(
        "submit",
        event => {

            event.preventDefault();

            submitSpeaker(
                event.target
            );

        }
    );


$("#speakerSearch")
    .addEventListener(
        "input",
        renderSpeakers
    );


$("#speakerCategoryFilter")
    .addEventListener(
        "change",
        renderSpeakers
    );


/* DESIGNER */

$("#designerProject")
    .addEventListener(
        "change",
        event => {

            if (
                event.target.value
            ) {

                openProject(
                    Number(
                        event.target.value
                    )
                );

            }

        }
    );


$("#addSpeakerButton")
    .addEventListener(
        "click",
        () => {

            state.currentTool =
                "speaker";

            updateToolButtons();

            toast(
                "اضغط داخل المخطط لوضع السماعة"
            );

        }
    );


$("#autoDesignButton")
    .addEventListener(
        "click",
        runAutoDesign
    );


$("#analyzeButton")
    .addEventListener(
        "click",
        analyzeCurrentDesign
    );


$("#saveDesignButton")
    .addEventListener(
        "click",
        saveDesign
    );


$("#generateReportButton")
    .addEventListener(
        "click",
        generateReport
    );


$$(".mode-button")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    state.currentMode =
                        button.dataset.mode;

                    $$(".mode-button")
                        .forEach(
                            b =>
                                b.classList.toggle(
                                    "active",
                                    b === button
                                )
                        );

                    drawCanvas();

                }
            );

        }
    );


$$(".tool-button")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    state.currentTool =
                        button.dataset.tool;

                    updateToolButtons();

                }
            );

        }
    );


function updateToolButtons() {

    $$(".tool-button")
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.tool ===
                        state.currentTool
                );

            }
        );

}


/* ROOM */

[
    "#roomWidth",
    "#roomLength",
    "#roomHeight"
]
.forEach(
    selector => {

        $(selector)
            .addEventListener(
                "input",
                () => {

                    drawCanvas();

                }
            );

    }
);


/* GRID */

$("#gridSize")
    .addEventListener(
        "change",
        event => {

            state.gridSize =
                Number(
                    event.target.value
                );

            drawCanvas();

        }
    );


/* ZOOM */

$("#zoomIn")
    .addEventListener(
        "click",
        () => {

            state.zoom =
                Math.min(
                    3,
                    state.zoom + 0.1
                );

            $("#zoomValue")
                .textContent =
                `${Math.round(
                    state.zoom * 100
                )}%`;

            drawCanvas();

        }
    );


$("#zoomOut")
    .addEventListener(
        "click",
        () => {

            state.zoom =
                Math.max(
                    0.4,
                    state.zoom - 0.1
                );

            $("#zoomValue")
                .textContent =
                `${Math.round(
                    state.zoom * 100
                )}%`;

            drawCanvas();

        }
    );


$("#resetView")
    .addEventListener(
        "click",
        () => {

            state.zoom = 1;

            $("#zoomValue")
                .textContent =
                "100%";

            drawCanvas();

        }
    );


/* SELECTION */

[
    "#selectedX",
    "#selectedY",
    "#selectedZ",
    "#selectedAngle"
]
.forEach(
    selector => {

        $(selector)
            .addEventListener(
                "input",
                updateSelectedFromInputs
            );

    }
);


/* MODALS */

$$("[data-close]")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    hide(
                        `#${button.dataset.close}`
                    );

                }
            );

        }
    );


/* RESIZE */

window.addEventListener(
    "resize",
    () => {

        resizeCanvas();

        drawCanvas();

    }
);


/* =====================================================
   START
===================================================== */

checkAuth();