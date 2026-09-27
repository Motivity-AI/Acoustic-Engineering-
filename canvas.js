/* ============================================================
   ACOUSTIC ENGINEERING
   js/canvas.js
   Interactive Engineering Canvas
   Version 1.0
============================================================ */

(function () {

    "use strict";

    /* =========================================================
       GLOBAL OBJECT
    ========================================================== */

    const AcousticCanvas = {

        state: {

            initialized: false,

            tool: "select",

            zoom: 1,

            minZoom: 0.35,

            maxZoom: 4,

            panX: 0,

            panY: 0,

            gridVisible: true,

            snapEnabled: true,

            snapDistance: 0.25,

            selectedId: null,

            selectedType: null,

            dragging: false,

            drawing: false,

            measuring: false,

            panning: false,

            dragStart: null,

            measureStart: null,

            measureEnd: null,

            wallStart: null,

            currentPointer: null,

            objects: [],

            history: [],

            historyIndex: -1,

            room: {

                width: 12,

                depth: 8,

                height: 3

            },

            svg: null,

            container: null,

            roomRect: null,

            roomInnerRect: null,

            grid: null,

            speakersLayer: null,

            wallsLayer: null,

            zonesLayer: null,

            measurementLayer: null,

            coverageLayer: null,

            selectionLayer: null,

            cursorPoint: null,

            cursorCoordinates: null,

            viewBox: {

                x: 0,

                y: 0,

                width: 1200,

                height: 800

            },

            canvasScale: {

                x: 1,

                y: 1

            },

            pixelsPerMeter: 60

        },


        /* =====================================================
           INITIALIZATION
        ====================================================== */

        init: function () {

            if (this.state.initialized) {
                return;
            }

            this.cacheElements();

            if (!this.state.svg) {
                console.warn(
                    "AcousticCanvas: designSvg not found."
                );
                return;
            }

            this.state.initialized = true;

            this.bindEvents();

            this.updateRoom(
                this.state.room.width,
                this.state.room.depth,
                this.state.room.height
            );

            this.render();

            this.updateStatus(
                "لوحة الرسم الهندسي جاهزة"
            );

        },


        /* =====================================================
           CACHE DOM
        ====================================================== */

        cacheElements: function () {

            const s = this.state;

            s.svg =
                document.getElementById(
                    "designSvg"
                );

            s.container =
                document.getElementById(
                    "canvasContainer"
                );

            s.roomRect =
                document.getElementById(
                    "roomRect"
                );

            s.roomInnerRect =
                document.getElementById(
                    "roomInnerRect"
                );

            s.grid =
                document.getElementById(
                    "canvasGrid"
                );

            s.speakersLayer =
                document.getElementById(
                    "speakersLayer"
                );

            s.wallsLayer =
                document.getElementById(
                    "wallsLayer"
                );

            s.zonesLayer =
                document.getElementById(
                    "zonesLayer"
                );

            s.measurementLayer =
                document.getElementById(
                    "measurementLayer"
                );

            s.coverageLayer =
                document.getElementById(
                    "coverageLayer"
                );

            s.selectionLayer =
                document.getElementById(
                    "selectionLayer"
                );

            s.cursorPoint =
                document.getElementById(
                    "cursorPoint"
                );

            s.cursorCoordinates =
                document.getElementById(
                    "cursorCoordinates"
                );

        },


        /* =====================================================
           EVENTS
        ====================================================== */

        bindEvents: function () {

            const s = this.state;

            if (!s.svg) {
                return;
            }

            s.svg.addEventListener(
                "pointerdown",
                this.onPointerDown.bind(this)
            );

            s.svg.addEventListener(
                "pointermove",
                this.onPointerMove.bind(this)
            );

            s.svg.addEventListener(
                "pointerup",
                this.onPointerUp.bind(this)
            );

            s.svg.addEventListener(
                "pointercancel",
                this.onPointerUp.bind(this)
            );

            s.svg.addEventListener(
                "wheel",
                this.onWheel.bind(this),
                {
                    passive: false
                }
            );

            s.svg.addEventListener(
                "dblclick",
                this.onDoubleClick.bind(this)
            );

            window.addEventListener(
                "resize",
                this.refreshCanvas.bind(this)
            );

        },


        /* =====================================================
           TOOL
        ====================================================== */

        setTool: function (tool) {

            const validTools = [
                "select",
                "pan",
                "wall",
                "room",
                "speaker",
                "delay",
                "measure",
                "zone"
            ];

            if (tool === "room") {
                tool = "room";
            }

            if (tool === "delay") {
                tool = "speaker";
            }

            if (validTools.indexOf(tool) === -1) {
                tool = "select";
            }

            this.state.tool = tool;

            this.state.drawing = false;

            this.state.measuring = false;

            this.state.dragging = false;

            this.state.wallStart = null;

            this.state.measureStart = null;

            this.clearTemporaryGraphics();

            this.updateCursor();

            this.updateStatus(
                this.getToolLabel(tool)
            );

        },


        getToolLabel: function (tool) {

            const labels = {

                select: "وضع التحديد",

                wall: "رسم الجدران",

                speaker: "إضافة سماعة",

                measure: "وضع القياس",

                zone: "رسم منطقة"

            };

            return labels[tool] ||
                "وضع التصميم";

        },


        updateCursor: function () {

            const svg = this.state.svg;

            if (!svg) {
                return;
            }

            svg.classList.remove(
                "tool-select",
                "tool-wall",
                "tool-speaker",
                "tool-measure",
                "tool-zone"
            );

            svg.classList.add(
                "tool-" +
                this.state.tool
            );

        },


        /* =====================================================
           ROOM
        ====================================================== */

        updateRoom: function (
            width,
            depth,
            height
        ) {

            width =
                Number(width) || 12;

            depth =
                Number(depth) || 8;

            height =
                Number(height) || 3;

            this.state.room = {

                width: width,

                depth: depth,

                height: height

            };

            const roomRect =
                this.state.roomRect;

            if (!roomRect) {
                return;
            }

            const maxWidth = 900;

            const maxHeight = 540;

            const aspect =
                width / depth;

            let roomWidth;

            let roomHeight;

            if (
                aspect >=
                maxWidth / maxHeight
            ) {

                roomWidth =
                    maxWidth;

                roomHeight =
                    roomWidth / aspect;

            } else {

                roomHeight =
                    maxHeight;

                roomWidth =
                    roomHeight * aspect;

            }

            roomWidth =
                Math.max(
                    160,
                    Math.min(
                        maxWidth,
                        roomWidth
                    )
                );

            roomHeight =
                Math.max(
                    120,
                    Math.min(
                        maxHeight,
                        roomHeight
                    )
                );

            const x =
                600 -
                roomWidth / 2;

            const y =
                400 -
                roomHeight / 2;

            roomRect.setAttribute(
                "x",
                x
            );

            roomRect.setAttribute(
                "y",
                y
            );

            roomRect.setAttribute(
                "width",
                roomWidth
            );

            roomRect.setAttribute(
                "height",
                roomHeight
            );

            if (
                this.state.roomInnerRect
            ) {

                this.state.roomInnerRect
                    .setAttribute(
                        "x",
                        x + 10
                    );

                this.state.roomInnerRect
                    .setAttribute(
                        "y",
                        y + 10
                    );

                this.state.roomInnerRect
                    .setAttribute(
                        "width",
                        Math.max(
                            0,
                            roomWidth - 20
                        )
                    );

                this.state.roomInnerRect
                    .setAttribute(
                        "height",
                        Math.max(
                            0,
                            roomHeight - 20
                        )
                    );

            }

            const label =
                document.getElementById(
                    "roomLabel"
                );

            if (label) {

                label.setAttribute(
                    "x",
                    600
                );

                label.setAttribute(
                    "y",
                    y + 30
                );

                label.textContent =
                    width +
                    " × " +
                    depth +
                    " m";

            }

            this.state.pixelsPerMeter =
                roomWidth / width;

            this.render();

            this.updateCoordinates();

        },


        /* =====================================================
           COORDINATES
        ====================================================== */

        screenToSvg: function (
            event
        ) {

            const svg =
                this.state.svg;

            const point =
                svg.createSVGPoint();

            point.x =
                event.clientX;

            point.y =
                event.clientY;

            const matrix =
                svg.getScreenCTM();

            if (!matrix) {

                return {
                    x: 0,
                    y: 0
                };

            }

            const result =
                point.matrixTransform(
                    matrix.inverse()
                );

            return {

                x: result.x,

                y: result.y

            };

        },


        svgToMeters: function (
            point
        ) {

            const room =
                this.getRoomBounds();

            if (!room) {

                return {
                    x: 0,
                    y: 0
                };

            }

            const x =
                (
                    point.x -
                    room.x
                ) /
                room.width *
                this.state.room.width;

            const y =
                (
                    point.y -
                    room.y
                ) /
                room.height *
                this.state.room.depth;

            return {

                x: x,

                y: y

            };

        },


        metersToSvg: function (
            point
        ) {

            const room =
                this.getRoomBounds();

            if (!room) {

                return {
                    x: 0,
                    y: 0
                };

            }

            return {

                x:
                    room.x +
                    (
                        point.x /
                        this.state.room.width
                    ) *
                    room.width,

                y:
                    room.y +
                    (
                        point.y /
                        this.state.room.depth
                    ) *
                    room.height

            };

        },


        getRoomBounds: function () {

            const rect =
                this.state.roomRect;

            if (!rect) {
                return null;
            }

            return {

                x:
                    Number(
                        rect.getAttribute(
                            "x"
                        )
                    ),

                y:
                    Number(
                        rect.getAttribute(
                            "y"
                        )
                    ),

                width:
                    Number(
                        rect.getAttribute(
                            "width"
                        )
                    ),

                height:
                    Number(
                        rect.getAttribute(
                            "height"
                        )
                    )

            };

        },


        clampMeters: function (
            point,
            margin
        ) {

            margin =
                Number(margin) || 0;

            return {

                x:
                    Math.max(
                        margin,
                        Math.min(
                            this.state.room.width -
                            margin,
                            point.x
                        )
                    ),

                y:
                    Math.max(
                        margin,
                        Math.min(
                            this.state.room.depth -
                            margin,
                            point.y
                        )
                    )

            };

        },


        snapPoint: function (
            point
        ) {

            if (
                !this.state.snapEnabled
            ) {

                return point;

            }

            const distance =
                Number(
                    this.state.snapDistance
                ) ||
                Number(
                    window.AcousticApp
                        ?.settings
                        ?.snapDistance
                ) ||
                0.25;

            return {

                x:
                    Math.round(
                        point.x /
                        distance
                    ) *
                    distance,

                y:
                    Math.round(
                        point.y /
                        distance
                    ) *
                    distance

            };

        },


        updateCoordinates: function (
            event
        ) {

            if (!event) {

                if (
                    this.state.currentPointer
                ) {

                    event =
                        this.state.currentPointer;

                } else {

                    return;

                }

            }

            const svgPoint =
                this.screenToSvg(
                    event
                );

            let meterPoint =
                this.svgToMeters(
                    svgPoint
                );

            meterPoint =
                this.clampMeters(
                    meterPoint
                );

            if (
                this.state.cursorPoint
            ) {

                this.state.cursorPoint
                    .setAttribute(
                        "cx",
                        svgPoint.x
                    );

                this.state.cursorPoint
                    .setAttribute(
                        "cy",
                        svgPoint.y
                    );

                this.state.cursorPoint
                    .setAttribute(
                        "opacity",
                        "1"
                    );

            }

            if (
                this.state.cursorCoordinates
            ) {

                this.state.cursorCoordinates
                    .textContent =
                    "X: " +
                    meterPoint.x.toFixed(2) +
                    " m   Y: " +
                    meterPoint.y.toFixed(2) +
                    " m";

            }

        },


        /* =====================================================
           POINTER DOWN
        ====================================================== */

        onPointerDown: function (
            event
        ) {

            if (
                event.button !== 0 &&
                event.pointerType !== "touch"
            ) {
                return;
            }

            this.state.currentPointer =
                event;

            const svgPoint =
                this.screenToSvg(
                    event
                );

            const meterPoint =
                this.clampMeters(
                    this.svgToMeters(
                        svgPoint
                    )
                );

            const target =
                event.target;


            /* SHIFT = PAN */

            if (
                event.shiftKey
            ) {

                this.startPan(
                    event
                );

                return;

            }


            /* SELECT */

            if (
                this.state.tool ===
                "select"
            ) {

                const objectElement =
                    target.closest
                        ? target.closest(
                            "[data-object-id]"
                        )
                        : null;

                if (
                    objectElement
                ) {

                    this.selectObject(
                        objectElement
                            .getAttribute(
                                "data-object-id"
                            )
                    );

                    this.startDrag(
                        event
                    );

                } else {

                    this.clearSelection();

                }

                return;

            }


            /* ROOM */

            if (
                this.state.tool ===
                "room"
            ) {
                this.startRoomDrawing(meterPoint);
                return;
            }

            /* SPEAKER */

            if (
                this.state.tool ===
                "speaker"
            ) {

                this.addSpeakerAt(
                    meterPoint
                );

                return;

            }


            /* WALL */

            if (
                this.state.tool ===
                "wall"
            ) {

                this.startWall(
                    meterPoint
                );

                return;

            }


            /* MEASURE */

            if (
                this.state.tool ===
                "measure"
            ) {

                this.startMeasurement(
                    meterPoint
                );

                return;

            }


            /* ZONE */

            if (
                this.state.tool ===
                "zone"
            ) {

                this.startZone(
                    meterPoint
                );

            }

        },


        /* =====================================================
           POINTER MOVE
        ====================================================== */

        onPointerMove: function (
            event
        ) {

            this.state.currentPointer =
                event;

            this.updateCoordinates(
                event
            );


            if (
                this.state.dragging
            ) {

                this.dragSelectedObject(
                    event
                );

                return;

            }


            if (
                this.state.panning
            ) {

                this.panMove(
                    event
                );

                return;

            }


            if (
                this.state.drawing &&
                this.state.tool ===
                "room"
            ) {
                this.previewRoom(event);
                return;
            }

            if (
                this.state.drawing &&
                this.state.tool ===
                "wall"
            ) {

                this.previewWall(
                    event
                );

                return;

            }


            if (
                this.state.measuring
            ) {

                this.previewMeasurement(
                    event
                );

                return;

            }


            if (
                this.state.drawing &&
                this.state.tool ===
                "zone"
            ) {

                this.previewZone(
                    event
                );

            }

        },


        /* =====================================================
           POINTER UP
        ====================================================== */

        onPointerUp: function (
            event
        ) {

            if (
                this.state.dragging
            ) {

                this.finishDrag();

            }

            if (
                this.state.panning
            ) {

                this.finishPan();

            }

            if (
                this.state.drawing &&
                this.state.tool ===
                "room"
            ) {
                this.finishRoom(event);
            }

            if (
                this.state.drawing &&
                this.state.tool ===
                "wall"
            ) {

                this.finishWall(
                    event
                );

            }

            if (
                this.state.measuring
            ) {

                this.finishMeasurement(
                    event
                );

            }

            if (
                this.state.drawing &&
                this.state.tool ===
                "zone"
            ) {

                this.finishZone(
                    event
                );

            }

        },


        /* =====================================================
           ROOM DRAWING
        ====================================================== */

        startRoomDrawing: function (point) {
            this.state.drawing = true;
            this.state.wallStart = {
                x: point.x,
                y: point.y
            };
            this.updateStatus("اسحب لرسم حدود الغرفة");
        },

        previewRoom: function (event) {
            if (!this.state.wallStart) return;

            const svgPoint = this.screenToSvg(event);
            const point = this.clampMeters(
                this.svgToMeters(svgPoint),
                0.05
            );

            const start = this.state.wallStart;
            const width = Math.max(0.5, Math.abs(point.x - start.x));
            const depth = Math.max(0.5, Math.abs(point.y - start.y));

            const left = Math.min(start.x, point.x);
            const top = Math.min(start.y, point.y);

            this.state.roomPreview = {
                x: left,
                y: top,
                width,
                depth
            };

            this.renderRoomPreview();
        },

        finishRoom: function (event) {
            if (!this.state.wallStart) return;

            const svgPoint = this.screenToSvg(event);
            const point = this.clampMeters(
                this.svgToMeters(svgPoint),
                0.05
            );

            const start = this.state.wallStart;
            const width = Math.max(0.5, Math.abs(point.x - start.x));
            const depth = Math.max(0.5, Math.abs(point.y - start.y));

            this.pushHistory();

            this.state.room.width = Number(width.toFixed(2));
            this.state.room.depth = Number(depth.toFixed(2));

            this.state.drawing = false;
            this.state.wallStart = null;
            this.state.roomPreview = null;

            const widthInput = document.getElementById("roomWidth");
            const depthInput = document.getElementById("roomDepth");
            if (widthInput) widthInput.value = this.state.room.width;
            if (depthInput) depthInput.value = this.state.room.depth;

            const widthPanel = document.getElementById("roomWidthPanel");
            const depthPanel = document.getElementById("roomDepthPanel");
            if (widthPanel) widthPanel.value = this.state.room.width;
            if (depthPanel) depthPanel.value = this.state.room.depth;

            this.updateRoom(
                this.state.room.width,
                this.state.room.depth,
                this.state.room.height
            );

            this.emitChange();
            this.updateStatus("تم رسم الغرفة");
        },

        renderRoomPreview: function () {
            const preview = this.state.roomPreview;
            if (!preview) return;

            let el = document.getElementById("roomPreviewRect");

            if (!el) {
                el = this.createSvg("rect");
                el.id = "roomPreviewRect";
                el.setAttribute("fill", "rgba(56,189,248,.08)");
                el.setAttribute("stroke", "#38bdf8");
                el.setAttribute("stroke-width", "2");
                el.setAttribute("stroke-dasharray", "8 6");
                this.state.selectionLayer?.appendChild(el);
            }

            const a = this.metersToSvg({x: preview.x, y: preview.y});
            const b = this.metersToSvg({
                x: preview.x + preview.width,
                y: preview.y + preview.depth
            });

            el.setAttribute("x", Math.min(a.x,b.x));
            el.setAttribute("y", Math.min(a.y,b.y));
            el.setAttribute("width", Math.abs(b.x-a.x));
            el.setAttribute("height", Math.abs(b.y-a.y));
        },

        /* =====================================================
           DOUBLE CLICK
        ====================================================== */

        onDoubleClick: function (
            event
        ) {

            const target =
                event.target;

            const element =
                target.closest
                    ? target.closest(
                        "[data-object-id]"
                    )
                    : null;

            if (!element) {
                return;
            }

            const id =
                element.getAttribute(
                    "data-object-id"
                );

            const object =
                this.getObjectById(
                    id
                );

            if (!object) {
                return;
            }

            if (
                object.type ===
                "speaker"
            ) {

                this.rotateObject(
                    id,
                    15
                );

            }

        },


        /* =====================================================
           WHEEL ZOOM
        ====================================================== */

        onWheel: function (
            event
        ) {

            event.preventDefault();

            const direction =
                event.deltaY < 0
                    ? 1
                    : -1;

            const factor =
                direction > 0
                    ? 1.12
                    : 0.89;

            this.setZoom(
                this.state.zoom *
                factor
            );

        },


        /* =====================================================
           SELECTION
        ====================================================== */

        selectObject: function (
            id
        ) {

            const object =
                this.getObjectById(
                    id
                );

            if (!object) {
                return;
            }

            this.state.selectedId =
                id;

            this.state.selectedType =
                object.type;

            this.renderSelection();

            this.populateInspector(
                object
            );

            this.updateStatus(
                "تم تحديد: " +
                (
                    object.name ||
                    object.type
                )
            );

        },


        clearSelection: function () {

            this.state.selectedId =
                null;

            this.state.selectedType =
                null;

            this.renderSelection();

            this.clearInspector();

        },


        getSelectedObject: function () {

            if (
                !this.state.selectedId
            ) {
                return null;
            }

            return this.getObjectById(
                this.state.selectedId
            );

        },


        getObjectById: function (
            id
        ) {

            return this.state.objects.find(
                function (object) {

                    return object.id === id;

                }
            ) || null;

        },


        renderSelection: function () {

            const layer =
                this.state.selectionLayer;

            if (!layer) {
                return;
            }

            layer.innerHTML = "";

            const object =
                this.getSelectedObject();

            if (!object) {
                return;
            }

            if (
                object.type ===
                "speaker"
            ) {

                const point =
                    this.metersToSvg({
                        x: object.x,
                        y: object.y
                    });

                const circle =
                    this.createSvg(
                        "circle"
                    );

                circle.setAttribute(
                    "cx",
                    point.x
                );

                circle.setAttribute(
                    "cy",
                    point.y
                );

                circle.setAttribute(
                    "r",
                    32
                );

                circle.setAttribute(
                    "fill",
                    "none"
                );

                circle.setAttribute(
                    "stroke",
                    "#38bdf8"
                );

                circle.setAttribute(
                    "stroke-width",
                    "2"
                );

                circle.setAttribute(
                    "stroke-dasharray",
                    "6 4"
                );

                circle.setAttribute(
                    "class",
                    "selection-ring"
                );

                layer.appendChild(
                    circle
                );

            }


            if (
                object.type ===
                "wall"
            ) {

                const start =
                    this.metersToSvg({
                        x: object.x1,
                        y: object.y1
                    });

                const end =
                    this.metersToSvg({
                        x: object.x2,
                        y: object.y2
                    });

                const line =
                    this.createSvg(
                        "line"
                    );

                line.setAttribute(
                    "x1",
                    start.x
                );

                line.setAttribute(
                    "y1",
                    start.y
                );

                line.setAttribute(
                    "x2",
                    end.x
                );

                line.setAttribute(
                    "y2",
                    end.y
                );

                line.setAttribute(
                    "stroke",
                    "#38bdf8"
                );

                line.setAttribute(
                    "stroke-width",
                    "10"
                );

                line.setAttribute(
                    "stroke-opacity",
                    "0.35"
                );

                line.setAttribute(
                    "stroke-linecap",
                    "round"
                );

                layer.appendChild(
                    line
                );

            }

        },


        /* =====================================================
           INSPECTOR
        ====================================================== */

        populateInspector: function (
            object
        ) {

            const empty =
                document.getElementById(
                    "emptyInspector"
                );

            const speaker =
                document.getElementById(
                    "speakerInspector"
                );

            const typeBadge =
                document.getElementById(
                    "selectedObjectType"
                );

            if (
                object.type ===
                "speaker"
            ) {

                if (empty) {
                    empty.classList.add(
                        "hidden"
                    );
                }

                if (speaker) {
                    speaker.classList.remove(
                        "hidden"
                    );
                }

                if (typeBadge) {

                    typeBadge.textContent =
                        "SPEAKER";

                }

                this.setValue(
                    "selectedSpeakerName",
                    object.name ||
                    "Speaker"
                );

                this.setValue(
                    "selectedSpeakerId",
                    "ID: " +
                    object.id
                );

                this.setValue(
                    "speakerPower",
                    object.power || 0
                );

                this.setValue(
                    "speakerSPL",
                    object.maxSPL || 0
                );

                this.setValue(
                    "speakerHorizontal",
                    object.horizontal || 90
                );

                this.setValue(
                    "speakerVertical",
                    object.vertical || 60
                );

                this.setValue(
                    "speakerMountingHeight",
                    object.mountingHeight ||
                    2.5
                );

                this.setValue(
                    "speakerRotation",
                    object.rotation || 0
                );

                this.setValue(
                    "speakerRotationValue",
                    (
                        object.rotation ||
                        0
                    ) + "°"
                );

                this.setValue(
                    "speakerX",
                    (
                        object.x ||
                        0
                    ).toFixed(2)
                );

                this.setValue(
                    "speakerY",
                    (
                        object.y ||
                        0
                    ).toFixed(2)
                );

                this.populateSpeakerModelSelect(
                    object
                );

            } else {

                if (empty) {
                    empty.classList.remove(
                        "hidden"
                    );
                }

                if (speaker) {
                    speaker.classList.add(
                        "hidden"
                    );
                }

                if (typeBadge) {

                    typeBadge.textContent =
                        String(
                            object.type ||
                            "OBJECT"
                        ).toUpperCase();

                }

            }

        },


        clearInspector: function () {

            const empty =
                document.getElementById(
                    "emptyInspector"
                );

            const speaker =
                document.getElementById(
                    "speakerInspector"
                );

            const badge =
                document.getElementById(
                    "selectedObjectType"
                );

            if (empty) {

                empty.classList.remove(
                    "hidden"
                );

            }

            if (speaker) {

                speaker.classList.add(
                    "hidden"
                );

            }

            if (badge) {

                badge.textContent =
                    "لا يوجد تحديد";

            }

        },


        setValue: function (
            id,
            value
        ) {

            const element =
                document.getElementById(
                    id
                );

            if (!element) {
                return;
            }

            element.value =
                value;

            if (
                element.tagName ===
                "STRONG" ||
                element.tagName ===
                "SPAN"
            ) {

                element.textContent =
                    value;

            }

        },


        populateSpeakerModelSelect: function (
            object
        ) {

            const select =
                document.getElementById(
                    "speakerModel"
                );

            if (!select) {
                return;
            }

            const speakers =
                this.getSpeakerDatabase();

            select.innerHTML = "";

            if (
                speakers.length === 0
            ) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    object.name ||
                    "custom";

                option.textContent =
                    object.name ||
                    "Custom Speaker";

                select.appendChild(
                    option
                );

                return;

            }

            speakers.forEach(
                function (speaker) {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        speaker.id;

                    option.textContent =
                        speaker.name;

                    if (
                        speaker.id ===
                        object.speakerId
                    ) {

                        option.selected =
                            true;

                    }

                    select.appendChild(
                        option
                    );

                }
            );

        },


        /* =====================================================
           SPEAKER DATABASE
        ====================================================== */

        getSpeakerDatabase: function () {

            if (
                window.AcousticSpeakers &&
                Array.isArray(
                    window.AcousticSpeakers.database
                )
            ) {

                return window.AcousticSpeakers.database;

            }

            try {

                const raw =
                    localStorage.getItem(
                        "acousticSpeakerDatabase"
                    );

                if (raw) {

                    const data =
                        JSON.parse(
                            raw
                        );

                    if (
                        Array.isArray(data)
                    ) {

                        return data;

                    }

                }

            } catch (error) {

                console.warn(
                    "Speaker database read error",
                    error
                );

            }

            return [];

        },


        /* =====================================================
           ADD SPEAKER
        ====================================================== */

        addSpeakerAt: function (
            point
        ) {

            point =
                this.snapPoint(
                    point
                );

            point =
                this.clampMeters(
                    point,
                    0.15
                );

            const database =
                this.getSpeakerDatabase();

            let template =
                database[0] ||
                null;

            if (
                window.AcousticSpeakers &&
                typeof window.AcousticSpeakers
                    .getDefault ===
                    "function"
            ) {

                template =
                    window.AcousticSpeakers
                        .getDefault() ||
                    template;

            }

            const speaker = {

                id:
                    "SPK-" +
                    Date.now() +
                    "-" +
                    Math.floor(
                        Math.random() *
                        1000
                    ),

                type:
                    "speaker",

                name:
                    template?.name ||
                    "Speaker",

                speakerId:
                    template?.id ||
                    null,

                model:
                    template?.name ||
                    "Custom Speaker",

                speakerType:
                    template?.type ||
                    "point-source",

                x:
                    Number(
                        point.x.toFixed(3)
                    ),

                y:
                    Number(
                        point.y.toFixed(3)
                    ),

                rotation:
                    0,

                power:
                    Number(
                        template?.power
                    ) || 500,

                maxSPL:
                    Number(
                        template?.maxSPL
                    ) || 125,

                horizontal:
                    Number(
                        template?.horizontal
                    ) || 90,

                vertical:
                    Number(
                        template?.vertical
                    ) || 60,

                mountingHeight:
                    Number(
                        template?.mountingHeight
                    ) ||
                    Math.max(
                        2.2,
                        this.state.room.height -
                        0.2
                    ),

                weight:
                    Number(
                        template?.weight
                    ) || 0,

                frequency:
                    Number(
                        template?.frequency
                    ) || 50

            };

            this.pushHistory();

            this.state.objects.push(
                speaker
            );

            this.selectObject(
                speaker.id
            );

            this.render();

            this.updateMetrics();

            this.updateStatus(
                "تمت إضافة السماعة"
            );

            return speaker;

        },


        /* =====================================================
           UPDATE SPEAKER
        ====================================================== */

        updateSelectedSpeakerFromInspector:
            function () {

                const object =
                    this.getSelectedObject();

                if (
                    !object ||
                    object.type !==
                    "speaker"
                ) {
                    return;
                }

                this.pushHistory();

                const modelSelect =
                    document.getElementById(
                        "speakerModel"
                    );

                const modelId =
                    modelSelect
                        ? modelSelect.value
                        : null;

                const database =
                    this.getSpeakerDatabase();

                const model =
                    database.find(
                        function (speaker) {

                            return speaker.id ===
                                modelId;

                        }
                    );

                if (model) {

                    object.speakerId =
                        model.id;

                    object.name =
                        model.name;

                    object.model =
                        model.name;

                    object.power =
                        Number(
                            model.power
                        ) ||
                        object.power;

                    object.maxSPL =
                        Number(
                            model.maxSPL
                        ) ||
                        object.maxSPL;

                    object.horizontal =
                        Number(
                            model.horizontal
                        ) ||
                        object.horizontal;

                    object.vertical =
                        Number(
                            model.vertical
                        ) ||
                        object.vertical;

                }

                this.applyInspectorNumber(
                    "speakerPower",
                    object,
                    "power"
                );

                this.applyInspectorNumber(
                    "speakerSPL",
                    object,
                    "maxSPL"
                );

                this.applyInspectorNumber(
                    "speakerHorizontal",
                    object,
                    "horizontal"
                );

                this.applyInspectorNumber(
                    "speakerVertical",
                    object,
                    "vertical"
                );

                this.applyInspectorNumber(
                    "speakerMountingHeight",
                    object,
                    "mountingHeight"
                );

                this.render();

                this.populateInspector(
                    object
                );

                this.updateMetrics();

            },


        applyInspectorNumber: function (
            inputId,
            object,
            property
        ) {

            const input =
                document.getElementById(
                    inputId
                );

            if (!input) {
                return;
            }

            const value =
                Number(
                    input.value
                );

            if (
                Number.isFinite(value)
            ) {

                object[property] =
                    value;

            }

        },


        /* =====================================================
           ROTATION
        ====================================================== */

        setSelectedSpeakerRotation:
            function (
                value
            ) {

                const object =
                    this.getSelectedObject();

                if (
                    !object ||
                    object.type !==
                    "speaker"
                ) {
                    return;
                }

                object.rotation =
                    this.normalizeAngle(
                        Number(value)
                    );

                this.render();

                this.populateInspector(
                    object
                );

            },


        rotateObject: function (
            id,
            degrees
        ) {

            const object =
                this.getObjectById(
                    id
                );

            if (!object) {
                return;
            }

            if (
                object.type !==
                "speaker"
            ) {
                return;
            }

            this.pushHistory();

            object.rotation =
                this.normalizeAngle(
                    (
                        Number(
                            object.rotation
                        ) || 0
                    ) +
                    Number(degrees)
                );

            this.render();

            this.populateInspector(
                object
            );

        },


        rotateSelectedObject:
            function (
                degrees
            ) {

                if (
                    !this.state.selectedId
                ) {
                    return;
                }

                this.rotateObject(
                    this.state.selectedId,
                    degrees
                );

            },


        normalizeAngle: function (
            angle
        ) {

            angle =
                Number(angle) || 0;

            angle =
                angle % 360;

            if (angle < 0) {
                angle += 360;
            }

            return angle;

        },


        /* =====================================================
           POSITION
        ====================================================== */

        setSelectedSpeakerPosition:
            function (
                x,
                y
            ) {

                const object =
                    this.getSelectedObject();

                if (
                    !object ||
                    object.type !==
                    "speaker"
                ) {
                    return;
                }

                x =
                    Number(x);

                y =
                    Number(y);

                if (
                    !Number.isFinite(x) ||
                    !Number.isFinite(y)
                ) {
                    return;
                }

                this.pushHistory();

                const point =
                    this.clampMeters(
                        {
                            x: x,
                            y: y
                        },
                        0.15
                    );

                object.x =
                    Number(
                        point.x.toFixed(3)
                    );

                object.y =
                    Number(
                        point.y.toFixed(3)
                    );

                this.render();

                this.populateInspector(
                    object
                );

            },


        /* =====================================================
           DRAG
        ====================================================== */

        startDrag: function (
            event
        ) {

            const object =
                this.getSelectedObject();

            if (!object) {
                return;
            }

            this.state.dragging =
                true;

            this.state.dragStart = {

                eventX:
                    event.clientX,

                eventY:
                    event.clientY,

                objectX:
                    object.x,

                objectY:
                    object.y

            };

            try {

                this.state.svg
                    .setPointerCapture(
                        event.pointerId
                    );

            } catch (error) {}

        },


        dragSelectedObject:
            function (
                event
            ) {

                const object =
                    this.getSelectedObject();

                const start =
                    this.state.dragStart;

                if (
                    !object ||
                    !start
                ) {
                    return;
                }

                const current =
                    this.screenToSvg(
                        event
                    );

                const startPoint =
                    this.screenToSvg({
                        clientX:
                            start.eventX,

                        clientY:
                            start.eventY
                    });

                const currentMeters =
                    this.svgToMeters(
                        current
                    );

                const startMeters =
                    this.svgToMeters(
                        startPoint
                    );

                let dx =
                    currentMeters.x -
                    startMeters.x;

                let dy =
                    currentMeters.y -
                    startMeters.y;

                let newPoint = {

                    x:
                        start.objectX +
                        dx,

                    y:
                        start.objectY +
                        dy

                };

                newPoint =
                    this.clampMeters(
                        newPoint,
                        0.15
                    );

                if (
                    this.state.snapEnabled
                ) {

                    newPoint =
                        this.snapPoint(
                            newPoint
                        );

                    newPoint =
                        this.clampMeters(
                            newPoint,
                            0.15
                        );

                }

                object.x =
                    Number(
                        newPoint.x.toFixed(3)
                    );

                object.y =
                    Number(
                        newPoint.y.toFixed(3)
                    );

                this.render();

                this.populateInspector(
                    object
                );

            },


        finishDrag: function () {

            if (
                this.state.dragging
            ) {

                this.pushHistory();

            }

            this.state.dragging =
                false;

            this.state.dragStart =
                null;

            this.updateStatus(
                "تم تحديث موضع العنصر"
            );

        },


        /* =====================================================
           WALLS
        ====================================================== */

        startWall: function (
            point
        ) {

            point =
                this.snapPoint(
                    point
                );

            point =
                this.clampMeters(
                    point
                );

            this.state.wallStart =
                point;

            this.state.drawing =
                true;

            this.updateStatus(
                "حدد نقطة نهاية الجدار"
            );

        },


        previewWall: function (
            event
        ) {

            const start =
                this.state.wallStart;

            if (!start) {
                return;
            }

            const svgPoint =
                this.screenToSvg(
                    event
                );

            let end =
                this.svgToMeters(
                    svgPoint
                );

            end =
                this.snapPoint(
                    end
                );

            end =
                this.clampMeters(
                    end
                );

            const layer =
                this.state.wallsLayer;

            if (!layer) {
                return;
            }

            let preview =
                document.getElementById(
                    "temporaryWall"
                );

            if (!preview) {

                preview =
                    this.createSvg(
                        "line"
                    );

                preview.id =
                    "temporaryWall";

                preview.setAttribute(
                    "stroke",
                    "#38bdf8"
                );

                preview.setAttribute(
                    "stroke-width",
                    "5"
                );

                preview.setAttribute(
                    "stroke-dasharray",
                    "10 6"
                );

                preview.setAttribute(
                    "stroke-linecap",
                    "round"
                );

                layer.appendChild(
                    preview
                );

            }

            const startSvg =
                this.metersToSvg(
                    start
                );

            const endSvg =
                this.metersToSvg(
                    end
                );

            preview.setAttribute(
                "x1",
                startSvg.x
            );

            preview.setAttribute(
                "y1",
                startSvg.y
            );

            preview.setAttribute(
                "x2",
                endSvg.x
            );

            preview.setAttribute(
                "y2",
                endSvg.y
            );

            const distance =
                this.distance(
                    start,
                    end
                );

            this.updateStatus(
                "طول الجدار: " +
                distance.toFixed(2) +
                " m"
            );

        },


        finishWall: function (
            event
        ) {

            if (
                !this.state.wallStart
            ) {
                return;
            }

            const svgPoint =
                this.screenToSvg(
                    event
                );

            let end =
                this.svgToMeters(
                    svgPoint
                );

            end =
                this.snapPoint(
                    end
                );

            end =
                this.clampMeters(
                    end
                );

            const start =
                this.state.wallStart;

            const distance =
                this.distance(
                    start,
                    end
                );

            if (
                distance < 0.05
            ) {

                this.cancelWall();

                return;

            }

            this.pushHistory();

            const wall = {

                id:
                    "WALL-" +
                    Date.now() +
                    "-" +
                    Math.floor(
                        Math.random() *
                        1000
                    ),

                type:
                    "wall",

                x1:
                    Number(
                        start.x.toFixed(3)
                    ),

                y1:
                    Number(
                        start.y.toFixed(3)
                    ),

                x2:
                    Number(
                        end.x.toFixed(3)
                    ),

                y2:
                    Number(
                        end.y.toFixed(3)
                    ),

                height:
                    this.state.room.height,

                thickness:
                    0.15

            };

            this.state.objects.push(
                wall
            );

            this.cancelWall();

            this.render();

            this.updateStatus(
                "تم رسم جدار بطول " +
                distance.toFixed(2) +
                " m"
            );

        },


        cancelWall: function () {

            const preview =
                document.getElementById(
                    "temporaryWall"
                );

            if (preview) {

                preview.remove();

            }

            this.state.wallStart =
                null;

            this.state.drawing =
                false;

        },


        /* =====================================================
           MEASUREMENT
        ====================================================== */

        startMeasurement: function (
            point
        ) {

            point =
                this.clampMeters(
                    point
                );

            this.state.measureStart =
                point;

            this.state.measuring =
                true;

            this.updateStatus(
                "حدد نقطة القياس الثانية"
            );

        },


        previewMeasurement: function (
            event
        ) {

            const start =
                this.state.measureStart;

            if (!start) {
                return;
            }

            const svgPoint =
                this.screenToSvg(
                    event
                );

            let end =
                this.svgToMeters(
                    svgPoint
                );

            end =
                this.clampMeters(
                    end
                );

            const layer =
                this.state.measurementLayer;

            if (!layer) {
                return;
            }

            let line =
                document.getElementById(
                    "temporaryMeasurement"
                );

            let text =
                document.getElementById(
                    "temporaryMeasurementText"
                );

            if (!line) {

                line =
                    this.createSvg(
                        "line"
                    );

                line.id =
                    "temporaryMeasurement";

                line.setAttribute(
                    "stroke",
                    "#f59e0b"
                );

                line.setAttribute(
                    "stroke-width",
                    "3"
                );

                line.setAttribute(
                    "stroke-dasharray",
                    "8 5"
                );

                layer.appendChild(
                    line
                );

            }

            if (!text) {

                text =
                    this.createSvg(
                        "text"
                    );

                text.id =
                    "temporaryMeasurementText";

                text.setAttribute(
                    "fill",
                    "#f59e0b"
                );

                text.setAttribute(
                    "font-size",
                    "14"
                );

                text.setAttribute(
                    "font-family",
                    "Cairo, sans-serif"
                );

                text.setAttribute(
                    "text-anchor",
                    "middle"
                );

                layer.appendChild(
                    text
                );

            }

            const startSvg =
                this.metersToSvg(
                    start
                );

            const endSvg =
                this.metersToSvg(
                    end
                );

            line.setAttribute(
                "x1",
                startSvg.x
            );

            line.setAttribute(
                "y1",
                startSvg.y
            );

            line.setAttribute(
                "x2",
                endSvg.x
            );

            line.setAttribute(
                "y2",
                endSvg.y
            );

            const distance =
                this.distance(
                    start,
                    end
                );

            text.setAttribute(
                "x",
                (
                    startSvg.x +
                    endSvg.x
                ) / 2
            );

            text.setAttribute(
                "y",
                (
                    startSvg.y +
                    endSvg.y
                ) / 2 -
                10
            );

            text.textContent =
                distance.toFixed(2) +
                " m";

        },


        finishMeasurement: function (
            event
        ) {

            const start =
                this.state.measureStart;

            if (!start) {
                return;
            }

            const svgPoint =
                this.screenToSvg(
                    event
                );

            let end =
                this.svgToMeters(
                    svgPoint
                );

            end =
                this.clampMeters(
                    end
                );

            const distance =
                this.distance(
                    start,
                    end
                );

            this.removeTemporaryMeasurement();

            this.state.measureStart =
                null;

            this.state.measuring =
                false;

            this.updateStatus(
                "المسافة: " +
                distance.toFixed(2) +
                " m"
            );

        },


        removeTemporaryMeasurement:
            function () {

                [
                    "temporaryMeasurement",
                    "temporaryMeasurementText"
                ].forEach(
                    function (id) {

                        const element =
                            document.getElementById(
                                id
                            );

                        if (element) {

                            element.remove();

                        }

                    }
                );

            },


        /* =====================================================
           ZONES
        ====================================================== */

        startZone: function (
            point
        ) {

            point =
                this.clampMeters(
                    point
                );

            this.state.zoneStart =
                point;

            this.state.drawing =
                true;

            this.updateStatus(
                "حدد الزاوية المقابلة للمنطقة"
            );

        },


        previewZone: function (
            event
        ) {

            const start =
                this.state.zoneStart;

            if (!start) {
                return;
            }

            const svgPoint =
                this.screenToSvg(
                    event
                );

            let end =
                this.svgToMeters(
                    svgPoint
                );

            end =
                this.clampMeters(
                    end
                );

            const startSvg =
                this.metersToSvg(
                    start
                );

            const endSvg =
                this.metersToSvg(
                    end
                );

            let rect =
                document.getElementById(
                    "temporaryZone"
                );

            if (!rect) {

                rect =
                    this.createSvg(
                        "rect"
                    );

                rect.id =
                    "temporaryZone";

                rect.setAttribute(
                    "fill",
                    "rgba(56,189,248,0.08)"
                );

                rect.setAttribute(
                    "stroke",
                    "#38bdf8"
                );

                rect.setAttribute(
                    "stroke-width",
                    "2"
                );

                rect.setAttribute(
                    "stroke-dasharray",
                    "8 5"
                );

                this.state.zonesLayer
                    .appendChild(
                        rect
                    );

            }

            rect.setAttribute(
                "x",
                Math.min(
                    startSvg.x,
                    endSvg.x
                )
            );

            rect.setAttribute(
                "y",
                Math.min(
                    startSvg.y,
                    endSvg.y
                )
            );

            rect.setAttribute(
                "width",
                Math.abs(
                    endSvg.x -
                    startSvg.x
                )
            );

            rect.setAttribute(
                "height",
                Math.abs(
                    endSvg.y -
                    startSvg.y
                )
            );

        },


        finishZone: function (
            event
        ) {

            const start =
                this.state.zoneStart;

            if (!start) {
                return;
            }

            const svgPoint =
                this.screenToSvg(
                    event
                );

            let end =
                this.svgToMeters(
                    svgPoint
                );

            end =
                this.clampMeters(
                    end
                );

            const width =
                Math.abs(
                    end.x -
                    start.x
                );

            const depth =
                Math.abs(
                    end.y -
                    start.y
                );

            if (
                width < 0.1 ||
                depth < 0.1
            ) {

                this.cancelZone();

                return;

            }

            this.pushHistory();

            const zone = {

                id:
                    "ZONE-" +
                    Date.now(),

                type:
                    "zone",

                name:
                    "منطقة صوتية",

                x:
                    Math.min(
                        start.x,
                        end.x
                    ),

                y:
                    Math.min(
                        start.y,
                        end.y
                    ),

                width:
                    width,

                depth:
                    depth

            };

            this.state.objects.push(
                zone
            );

            this.cancelZone();

            this.render();

            this.selectObject(
                zone.id
            );

        },


        cancelZone: function () {

            const rect =
                document.getElementById(
                    "temporaryZone"
                );

            if (rect) {

                rect.remove();

            }

            this.state.zoneStart =
                null;

            this.state.drawing =
                false;

        },


        /* =====================================================
           PAN
        ====================================================== */

        startPan: function (
            event
        ) {

            this.state.panning =
                true;

            this.state.panStart = {

                x:
                    event.clientX,

                y:
                    event.clientY,

                panX:
                    this.state.panX,

                panY:
                    this.state.panY

            };

        },


        panMove: function (
            event
        ) {

            const start =
                this.state.panStart;

            if (!start) {
                return;
            }

            const dx =
                event.clientX -
                start.x;

            const dy =
                event.clientY -
                start.y;

            this.state.panX =
                start.panX +
                dx;

            this.state.panY =
                start.panY +
                dy;

            this.applyTransform();

        },


        finishPan: function () {

            this.state.panning =
                false;

            this.state.panStart =
                null;

        },


        /* =====================================================
           ZOOM
        ====================================================== */

        setZoom: function (
            zoom
        ) {

            zoom =
                Number(zoom) || 1;

            zoom =
                Math.max(
                    this.state.minZoom,
                    Math.min(
                        this.state.maxZoom,
                        zoom
                    )
                );

            this.state.zoom =
                zoom;

            this.applyTransform();

            const label =
                document.getElementById(
                    "zoomLabel"
                );

            if (label) {

                label.textContent =
                    Math.round(
                        zoom * 100
                    ) +
                    "%";

            }

        },


        zoomIn: function () {

            this.setZoom(
                this.state.zoom *
                1.15
            );

        },


        zoomOut: function () {

            this.setZoom(
                this.state.zoom *
                0.87
            );

        },


        resetZoom: function () {

            this.state.zoom =
                1;

            this.state.panX =
                0;

            this.state.panY =
                0;

            this.applyTransform();

            const label =
                document.getElementById(
                    "zoomLabel"
                );

            if (label) {

                label.textContent =
                    "100%";

            }

        },


        fitToRoom: function () {

            this.state.zoom =
                1;

            this.state.panX =
                0;

            this.state.panY =
                0;

            this.applyTransform();

            const label =
                document.getElementById(
                    "zoomLabel"
                );

            if (label) {

                label.textContent =
                    "100%";

            }

        },


        applyTransform: function () {

            const svg =
                this.state.svg;

            if (!svg) {
                return;
            }

            const scale =
                this.state.zoom;

            const tx =
                this.state.panX;

            const ty =
                this.state.panY;

            svg.style.transformOrigin =
                "center center";

            svg.style.transform =
                "translate(" +
                tx +
                "px, " +
                ty +
                "px) scale(" +
                scale +
                ")";

        },


        /* =====================================================
           RENDER
        ====================================================== */

        render: function () {

            this.renderWalls();

            this.renderZones();

            this.renderSpeakers();

            this.renderCoverage();

            this.renderSelection();

            this.updateMetrics();

            this.updateEmptyState();

        },


        /* =====================================================
           RENDER WALLS
        ====================================================== */

        renderWalls: function () {

            const layer =
                this.state.wallsLayer;

            if (!layer) {
                return;
            }

            layer.innerHTML = "";

            const walls =
                this.state.objects.filter(
                    function (object) {

                        return object.type ===
                            "wall";

                    }
                );

            walls.forEach(
                function (wall) {

                    const start =
                        this.metersToSvg({
                            x: wall.x1,
                            y: wall.y1
                        });

                    const end =
                        this.metersToSvg({
                            x: wall.x2,
                            y: wall.y2
                        });

                    const group =
                        this.createSvg(
                            "g"
                        );

                    group.setAttribute(
                        "data-object-id",
                        wall.id
                    );

                    group.style.cursor =
                        "pointer";

                    const line =
                        this.createSvg(
                            "line"
                        );

                    line.setAttribute(
                        "x1",
                        start.x
                    );

                    line.setAttribute(
                        "y1",
                        start.y
                    );

                    line.setAttribute(
                        "x2",
                        end.x
                    );

                    line.setAttribute(
                        "y2",
                        end.y
                    );

                    line.setAttribute(
                        "stroke",
                        "#64748b"
                    );

                    line.setAttribute(
                        "stroke-width",
                        "8"
                    );

                    line.setAttribute(
                        "stroke-linecap",
                        "round"
                    );

                    line.setAttribute(
                        "data-object-id",
                        wall.id
                    );

                    group.appendChild(
                        line
                    );

                    const distance =
                        this.distance(
                            {
                                x: wall.x1,
                                y: wall.y1
                            },
                            {
                                x: wall.x2,
                                y: wall.y2
                            }
                        );

                    const label =
                        this.createSvg(
                            "text"
                        );

                    label.setAttribute(
                        "x",
                        (
                            start.x +
                            end.x
                        ) / 2
                    );

                    label.setAttribute(
                        "y",
                        (
                            start.y +
                            end.y
                        ) / 2 -
                        8
                    );

                    label.setAttribute(
                        "fill",
                        "rgba(255,255,255,0.45)"
                    );

                    label.setAttribute(
                        "font-size",
                        "11"
                    );

                    label.setAttribute(
                        "font-family",
                        "Cairo, sans-serif"
                    );

                    label.setAttribute(
                        "text-anchor",
                        "middle"
                    );

                    label.textContent =
                        distance.toFixed(2) +
                        " m";

                    group.appendChild(
                        label
                    );

                    layer.appendChild(
                        group
                    );

                }.bind(this)
            );

        },


        /* =====================================================
           RENDER ZONES
        ====================================================== */

        renderZones: function () {

            const layer =
                this.state.zonesLayer;

            if (!layer) {
                return;
            }

            layer.innerHTML = "";

            const zones =
                this.state.objects.filter(
                    function (object) {

                        return object.type ===
                            "zone";

                    }
                );

            zones.forEach(
                function (zone) {

                    const topLeft =
                        this.metersToSvg({
                            x: zone.x,
                            y: zone.y
                        });

                    const bottomRight =
                        this.metersToSvg({
                            x:
                                zone.x +
                                zone.width,

                            y:
                                zone.y +
                                zone.depth
                        });

                    const group =
                        this.createSvg(
                            "g"
                        );

                    group.setAttribute(
                        "data-object-id",
                        zone.id
                    );

                    const rect =
                        this.createSvg(
                            "rect"
                        );

                    rect.setAttribute(
                        "x",
                        topLeft.x
                    );

                    rect.setAttribute(
                        "y",
                        topLeft.y
                    );

                    rect.setAttribute(
                        "width",
                        Math.abs(
                            bottomRight.x -
                            topLeft.x
                        )
                    );

                    rect.setAttribute(
                        "height",
                        Math.abs(
                            bottomRight.y -
                            topLeft.y
                        )
                    );

                    rect.setAttribute(
                        "fill",
                        "rgba(56,189,248,0.07)"
                    );

                    rect.setAttribute(
                        "stroke",
                        "rgba(56,189,248,0.45)"
                    );

                    rect.setAttribute(
                        "stroke-width",
                        "2"
                    );

                    rect.setAttribute(
                        "stroke-dasharray",
                        "8 5"
                    );

                    rect.setAttribute(
                        "data-object-id",
                        zone.id
                    );

                    group.appendChild(
                        rect
                    );

                    const text =
                        this.createSvg(
                            "text"
                        );

                    text.setAttribute(
                        "x",
                        (
                            topLeft.x +
                            bottomRight.x
                        ) / 2
                    );

                    text.setAttribute(
                        "y",
                        (
                            topLeft.y +
                            bottomRight.y
                        ) / 2
                    );

                    text.setAttribute(
                        "fill",
                        "rgba(255,255,255,0.6)"
                    );

                    text.setAttribute(
                        "font-family",
                        "Cairo, sans-serif"
                    );

                    text.setAttribute(
                        "font-size",
                        "13"
                    );

                    text.setAttribute(
                        "text-anchor",
                        "middle"
                    );

                    text.textContent =
                        zone.name;

                    group.appendChild(
                        text
                    );

                    layer.appendChild(
                        group
                    );

                }.bind(this)
            );

        },


        /* =====================================================
           RENDER SPEAKERS
        ====================================================== */

        renderSpeakers: function () {

            const layer =
                this.state.speakersLayer;

            if (!layer) {
                return;
            }

            layer.innerHTML = "";

            const speakers =
                this.state.objects.filter(
                    function (object) {

                        return object.type ===
                            "speaker";

                    }
                );

            speakers.forEach(
                function (speaker) {

                    this.renderSpeaker(
                        layer,
                        speaker
                    );

                }.bind(this)
            );

        },


        renderSpeaker: function (
            layer,
            speaker
        ) {

            const point =
                this.metersToSvg({
                    x: speaker.x,
                    y: speaker.y
                });

            const group =
                this.createSvg(
                    "g"
                );

            group.setAttribute(
                "data-object-id",
                speaker.id
            );

            group.setAttribute(
                "class",
                "canvas-speaker"
            );

            group.style.cursor =
                "pointer";

            group.setAttribute(
                "transform",
                "translate(" +
                point.x +
                "," +
                point.y +
                ") rotate(" +
                (
                    speaker.rotation ||
                    0
                ) +
                ")"
            );


            /* COVERAGE */

            const coverage =
                this.createSvg(
                    "path"
                );

            const coverageRadius =
                this.calculateVisualCoverage(
                    speaker
                );

            const h =
                Math.max(
                    15,
                    Math.min(
                        160,
                        coverageRadius
                    )
                );

            const spread =
                Math.max(
                    20,
                    Math.min(
                        150,
                        Number(
                            speaker.horizontal
                        ) ||
                        90
                    )
                );

            const half =
                spread / 2;

            const radians =
                Math.PI / 180;

            const x1 =
                Math.sin(
                    -half *
                    radians
                ) *
                h;

            const y1 =
                -Math.cos(
                    -half *
                    radians
                ) *
                h;

            const x2 =
                Math.sin(
                    half *
                    radians
                ) *
                h;

            const y2 =
                -Math.cos(
                    half *
                    radians
                ) *
                h;

            const largeArc =
                spread > 180
                    ? 1
                    : 0;

            const path =
                "M 0 0 " +
                "L " +
                x1 +
                " " +
                y1 +
                " A " +
                h +
                " " +
                h +
                " 0 " +
                largeArc +
                " 1 " +
                x2 +
                " " +
                y2 +
                " Z";

            coverage.setAttribute(
                "d",
                path
            );

            coverage.setAttribute(
                "fill",
                "url(#coverageGradient)"
            );

            coverage.setAttribute(
                "pointer-events",
                "none"
            );

            group.appendChild(
                coverage
            );


            /* SPEAKER BODY */

            const body =
                this.createSvg(
                    "rect"
                );

            body.setAttribute(
                "x",
                "-15"
            );

            body.setAttribute(
                "y",
                "-11"
            );

            body.setAttribute(
                "width",
                "30"
            );

            body.setAttribute(
                "height",
                "22"
            );

            body.setAttribute(
                "rx",
                "4"
            );

            body.setAttribute(
                "fill",
                "url(#speakerGradient)"
            );

            body.setAttribute(
                "stroke",
                "#e0f2fe"
            );

            body.setAttribute(
                "stroke-width",
                "1.5"
            );

            body.setAttribute(
                "data-object-id",
                speaker.id
            );

            group.appendChild(
                body
            );


            /* SPEAKER CONE */

            const cone =
                this.createSvg(
                    "path"
                );

            cone.setAttribute(
                "d",
                "M 0 -7 L 8 8 L -8 8 Z"
            );

            cone.setAttribute(
                "fill",
                "rgba(255,255,255,0.85)"
            );

            cone.setAttribute(
                "pointer-events",
                "none"
            );

            group.appendChild(
                cone
            );


            /* DIRECTION LINE */

            const direction =
                this.createSvg(
                    "line"
                );

            direction.setAttribute(
                "x1",
                "0"
            );

            direction.setAttribute(
                "y1",
                "-11"
            );

            direction.setAttribute(
                "x2",
                "0"
            );

            direction.setAttribute(
                "y2",
                "-27"
            );

            direction.setAttribute(
                "stroke",
                "#38bdf8"
            );

            direction.setAttribute(
                "stroke-width",
                "2"
            );

            direction.setAttribute(
                "marker-end",
                "url(#arrowMarker)"
            );

            direction.setAttribute(
                "pointer-events",
                "none"
            );

            group.appendChild(
                direction
            );


            /* LABEL */

            const label =
                this.createSvg(
                    "text"
                );

            label.setAttribute(
                "x",
                "0"
            );

            label.setAttribute(
                "y",
                "42"
            );

            label.setAttribute(
                "fill",
                "#e2e8f0"
            );

            label.setAttribute(
                "font-size",
                "11"
            );

            label.setAttribute(
                "font-family",
                "Cairo, sans-serif"
            );

            label.setAttribute(
                "text-anchor",
                "middle"
            );

            label.setAttribute(
                "pointer-events",
                "none"
            );

            label.textContent =
                speaker.name ||
                "Speaker";

            group.appendChild(
                label
            );


            /* ID */

            const idLabel =
                this.createSvg(
                    "text"
                );

            idLabel.setAttribute(
                "x",
                "0"
            );

            idLabel.setAttribute(
                "y",
                "55"
            );

            idLabel.setAttribute(
                "fill",
                "rgba(255,255,255,0.35)"
            );

            idLabel.setAttribute(
                "font-size",
                "8"
            );

            idLabel.setAttribute(
                "font-family",
                "Arial, sans-serif"
            );

            idLabel.setAttribute(
                "text-anchor",
                "middle"
            );

            idLabel.setAttribute(
                "pointer-events",
                "none"
            );

            idLabel.textContent =
                speaker.id;

            group.appendChild(
                idLabel
            );


            layer.appendChild(
                group
            );

        },


        calculateVisualCoverage:
            function (
                speaker
            ) {

                const h =
                    Number(
                        speaker.mountingHeight
                    ) || 2.5;

                const v =
                    Number(
                        speaker.vertical
                    ) || 60;

                const radians =
                    (
                        v / 2
                    ) *
                    Math.PI /
                    180;

                const radius =
                    h *
                    Math.tan(
                        radians
                    );

                return Math.max(
                    40,
                    Math.min(
                        220,
                        radius *
                        this.state.pixelsPerMeter
                    )
                );

            },


        /* =====================================================
           COVERAGE
        ====================================================== */

        renderCoverage: function () {

            const layer =
                this.state.coverageLayer;

            if (!layer) {
                return;
            }

            layer.innerHTML = "";

            const speakers =
                this.state.objects.filter(
                    function (object) {

                        return object.type ===
                            "speaker";

                    }
                );

            speakers.forEach(
                function (speaker) {

                    const point =
                        this.metersToSvg({
                            x: speaker.x,
                            y: speaker.y
                        });

                    const circle =
                        this.createSvg(
                            "circle"
                        );

                    const radius =
                        this.calculateVisualCoverage(
                            speaker
                        );

                    circle.setAttribute(
                        "cx",
                        point.x
                    );

                    circle.setAttribute(
                        "cy",
                        point.y
                    );

                    circle.setAttribute(
                        "r",
                        radius
                    );

                    circle.setAttribute(
                        "fill",
                        "url(#coverageGradient)"
                    );

                    circle.setAttribute(
                        "pointer-events",
                        "none"
                    );

                    layer.appendChild(
                        circle
                    );

                }.bind(this)
            );

        },


        /* =====================================================
           EMPTY STATE
        ====================================================== */

        updateEmptyState: function () {

            const empty =
                document.getElementById(
                    "canvasEmptyState"
                );

            if (!empty) {
                return;
            }

            const count =
                this.state.objects.length;

            empty.classList.toggle(
                "hidden",
                count > 0
            );

        },


        /* =====================================================
           DELETE
        ====================================================== */

        deleteSelected: function () {

            const id =
                this.state.selectedId;

            if (!id) {
                return;
            }

            const index =
                this.state.objects.findIndex(
                    function (object) {

                        return object.id === id;

                    }
                );

            if (
                index === -1
            ) {
                return;
            }

            this.pushHistory();

            const removed =
                this.state.objects.splice(
                    index,
                    1
                )[0];

            this.state.selectedId =
                null;

            this.state.selectedType =
                null;

            this.render();

            this.clearInspector();

            this.updateStatus(
                "تم حذف " +
                (
                    removed.name ||
                    removed.type
                )
            );

        },


        /* =====================================================
           CLEAR
        ====================================================== */

        clear: function () {

            this.pushHistory();

            this.state.objects = [];

            this.state.selectedId =
                null;

            this.state.selectedType =
                null;

            this.render();

            this.clearInspector();

        },


        /* =====================================================
           HISTORY
        ====================================================== */

        pushHistory: function () {

            const snapshot =
                JSON.stringify(
                    this.state.objects
                );

            if (
                this.state.historyIndex <
                this.state.history.length - 1
            ) {

                this.state.history =
                    this.state.history.slice(
                        0,
                        this.state.historyIndex + 1
                    );

            }

            this.state.history.push(
                snapshot
            );

            this.state.historyIndex =
                this.state.history.length - 1;

            if (
                this.state.history.length >
                50
            ) {

                this.state.history.shift();

                this.state.historyIndex--;

            }

        },


        undo: function () {

            if (
                this.state.historyIndex <=
                0
            ) {

                return;

            }

            this.state.historyIndex--;

            const snapshot =
                this.state.history[
                    this.state.historyIndex
                ];

            try {

                this.state.objects =
                    JSON.parse(
                        snapshot
                    );

            } catch (error) {

                console.error(
                    error
                );

                return;

            }

            this.state.selectedId =
                null;

            this.render();

            this.clearInspector();

            this.updateStatus(
                "تم التراجع"
            );

        },


        redo: function () {

            if (
                this.state.historyIndex >=
                this.state.history.length - 1
            ) {

                return;

            }

            this.state.historyIndex++;

            const snapshot =
                this.state.history[
                    this.state.historyIndex
                ];

            try {

                this.state.objects =
                    JSON.parse(
                        snapshot
                    );

            } catch (error) {

                console.error(
                    error
                );

                return;

            }

            this.render();

            this.updateStatus(
                "تمت إعادة العملية"
            );

        },


        /* =====================================================
           METRICS
        ====================================================== */

        updateMetrics: function () {

            const speakers =
                this.state.objects.filter(
                    function (object) {

                        return object.type ===
                            "speaker";

                    }
                );

            const totalPower =
                speakers.reduce(
                    function (
                        total,
                        speaker
                    ) {

                        return total +
                            (
                                Number(
                                    speaker.power
                                ) || 0
                            );

                    },
                    0
                );

            const footerCount =
                document.getElementById(
                    "footerSpeakerCount"
                );

            const metricCount =
                document.getElementById(
                    "metricSpeakerCount"
                );

            const metricPower =
                document.getElementById(
                    "metricTotalPower"
                );

            const reportCount =
                document.getElementById(
                    "reportSpeakerCount"
                );

            const reportPower =
                document.getElementById(
                    "reportTotalPower"
                );

            if (footerCount) {
                footerCount.textContent =
                    speakers.length;
            }

            if (metricCount) {
                metricCount.textContent =
                    speakers.length;
            }

            if (metricPower) {
                metricPower.textContent =
                    totalPower.toFixed(0) +
                    " W";
            }

            if (reportCount) {
                reportCount.textContent =
                    speakers.length;
            }

            if (reportPower) {
                reportPower.textContent =
                    totalPower.toFixed(0) +
                    " W";
            }

            if (
                window.AcousticApp
            ) {

                window.AcousticApp
                    .canvasMetrics = {

                        speakerCount:
                            speakers.length,

                        totalPower:
                            totalPower

                    };

            }

        },


        /* =====================================================
           DISTANCE
        ====================================================== */

        distance: function (
            a,
            b
        ) {

            const dx =
                b.x -
                a.x;

            const dy =
                b.y -
                a.y;

            return Math.sqrt(
                dx * dx +
                dy * dy
            );

        },


        /* =====================================================
           SVG FACTORY
        ====================================================== */

        createSvg: function (
            tag
        ) {

            return document.createElementNS(
                "http://www.w3.org/2000/svg",
                tag
            );

        },


        /* =====================================================
           CLEAR TEMPORARY
        ====================================================== */

        clearTemporaryGraphics:
            function () {

                [
                    "temporaryWall",
                    "temporaryMeasurement",
                    "temporaryMeasurementText",
                    "temporaryZone"
                ].forEach(
                    function (id) {

                        const element =
                            document.getElementById(
                                id
                            );

                        if (element) {

                            element.remove();

                        }

                    }
                );

            },


        /* =====================================================
           ADD SPEAKER API
        ====================================================== */

        addSpeaker: function (spec = {}) {
            const x = Number.isFinite(Number(spec.x))
                ? Number(spec.x)
                : this.state.room.width / 2;

            const y = Number.isFinite(Number(spec.y))
                ? Number(spec.y)
                : this.state.room.depth / 2;

            const speaker = {
                ...spec,
                id: spec.id || ("SPK-" + Date.now() + "-" + Math.floor(Math.random()*1000)),
                type: "speaker",
                x,
                y
            };

            const existing = this.state.objects.find(o => o.id === speaker.id);
            if (existing) {
                Object.assign(existing, speaker);
                this.selectObject(existing.id);
                this.render();
                return existing;
            }

            this.pushHistory();
            this.state.objects.push(speaker);
            this.selectObject(speaker.id);
            this.render();
            this.updateMetrics();
            this.updateStatus("تمت إضافة السماعة");
            this.emitChange();

            return speaker;
        },

        /* =====================================================
           REMOVE SELECTED
        ====================================================== */

        removeSelected: function () {

            this.deleteSelected();

        },


        /* =====================================================
           GRID
        ====================================================== */

        setGridVisible: function (
            visible
        ) {

            this.state.gridVisible =
                Boolean(visible);

            if (
                this.state.grid
            ) {

                this.state.grid.style.display =
                    visible
                        ? ""
                        : "none";

            }

        },


        setSnapEnabled: function (
            enabled
        ) {

            this.state.snapEnabled =
                Boolean(enabled);

        },


        toggleGrid: function (visible) {
            if (typeof visible === "boolean") {
                this.setGridVisible(visible);
            } else {
                this.setGridVisible(!this.state.gridVisible);
            }
        },

        toggleSnap: function (enabled) {
            if (typeof enabled === "boolean") {
                this.setSnapEnabled(enabled);
            } else {
                this.setSnapEnabled(!this.state.snapEnabled);
            }
        },

        /* =====================================================
           REFRESH
        ====================================================== */

        refreshCanvas: function () {

            this.render();

        },


        /* =====================================================
           STATUS
        ====================================================== */

        updateStatus: function (
            message
        ) {

            const status =
                document.getElementById(
                    "statusMessage"
                );

            if (status) {

                status.textContent =
                    message;

            }

        },


        /* =====================================================
           DATA EXPORT
        ====================================================== */

        getDesignData: function () {

            return {

                version:
                    "1.0",

                room:
                    JSON.parse(
                        JSON.stringify(
                            this.state.room
                        )
                    ),

                objects:
                    JSON.parse(
                        JSON.stringify(
                            this.state.objects
                        )
                    ),

                speakers:
                    JSON.parse(
                        JSON.stringify(
                            this.state.objects.filter(function (o) {
                                return o.type === "speaker";
                            })
                        )
                    ),

                settings: {

                    zoom:
                        this.state.zoom,

                    snapEnabled:
                        this.state.snapEnabled,

                    gridVisible:
                        this.state.gridVisible

                }

            };

        },


        /* =====================================================
           LOAD DATA
        ====================================================== */

        loadDesign: function (
            data
        ) {

            if (!data) {
                return;
            }

            if (data.room) {

                this.updateRoom(
                    data.room.width,
                    data.room.depth,
                    data.room.height
                );

            }

            if (Array.isArray(data.objects)) {
                this.state.objects = JSON.parse(JSON.stringify(data.objects));
            } else if (Array.isArray(data.speakers)) {
                this.state.objects = JSON.parse(JSON.stringify(data.speakers));
            }

            if (data.settings) {

                if (
                    data.settings.zoom
                ) {

                    this.state.zoom =
                        data.settings.zoom;

                }

                if (
                    typeof data.settings
                        .snapEnabled ===
                    "boolean"
                ) {

                    this.state.snapEnabled =
                        data.settings
                            .snapEnabled;

                }

                if (
                    typeof data.settings
                        .gridVisible ===
                    "boolean"
                ) {

                    this.setGridVisible(
                        data.settings
                            .gridVisible
                    );

                }

            }

            this.render();

            this.updateStatus(
                "تم تحميل التصميم"
            );

        },


        /* =====================================================
           SERIALIZE
        ====================================================== */

        serialize: function () {

            return JSON.stringify(
                this.getDesignData()
            );

        },


        /* =====================================================
           DESERIALIZE
        ====================================================== */

        deserialize: function (
            json
        ) {

            try {

                const data =
                    JSON.parse(
                        json
                    );

                this.loadDesign(
                    data
                );

            } catch (error) {

                console.error(
                    "Design JSON error:",
                    error
                );

                this.updateStatus(
                    "تعذر قراءة بيانات التصميم"
                );

            }

        }

    };


    /* =========================================================
       GLOBAL BRIDGE
    ========================================================== */

    window.AcousticCanvas =
        AcousticCanvas;


    /* =========================================================
       GLOBAL FUNCTIONS USED BY app.html
    ========================================================== */

    window.initAcousticCanvas =
        function () {

            AcousticCanvas.init();

        };


    window.setTool =
        function (
            tool
        ) {

            AcousticCanvas.setTool(
                tool
            );

        };


    window.updateCanvasRoom =
        function (
            width,
            depth,
            height
        ) {

            AcousticCanvas.updateRoom(
                width,
                depth,
                height
            );

        };


    window.setGridVisible =
        function (
            enabled
        ) {

            AcousticCanvas.setGridVisible(
                enabled
            );

        };


    window.setSnapEnabled =
        function (
            enabled
        ) {

            AcousticCanvas.setSnapEnabled(
                enabled
            );

        };


    window.canvasZoomIn =
        function () {

            AcousticCanvas.zoomIn();

        };


    window.canvasZoomOut =
        function () {

            AcousticCanvas.zoomOut();

        };


    window.canvasResetZoom =
        function () {

            AcousticCanvas.resetZoom();

        };


    window.fitCanvasToRoom =
        function () {

            AcousticCanvas.fitToRoom();

        };


    window.clearDesignCanvas =
        function () {

            AcousticCanvas.clear();

        };


    window.deleteSelectedCanvasObject =
        function () {

            AcousticCanvas.deleteSelected();

        };


    window.rotateSelectedObject =
        function (
            degrees
        ) {

            AcousticCanvas.rotateSelectedObject(
                degrees
            );

        };


    window.setSelectedSpeakerRotation =
        function (
            value
        ) {

            AcousticCanvas
                .setSelectedSpeakerRotation(
                    value
                );

        };


    window.setSelectedSpeakerPosition =
        function (
            x,
            y
        ) {

            AcousticCanvas
                .setSelectedSpeakerPosition(
                    x,
                    y
                );

        };


    window.updateSelectedSpeakerFromInspector =
        function () {

            AcousticCanvas
                .updateSelectedSpeakerFromInspector();

        };


    window.getDesignData =
        function () {

            return AcousticCanvas
                .getDesignData();

        };


    window.loadDesignData =
        function (
            data
        ) {

            AcousticCanvas
                .loadDesign(
                    data
                );

        };


    window.canvasUndo =
        function () {

            AcousticCanvas.undo();

        };


    window.canvasRedo =
        function () {

            AcousticCanvas.redo();

        };


    window.refreshCanvas =
        function () {

            AcousticCanvas.refreshCanvas();

        };


    /* =========================================================
       AUTO INITIALIZATION
    ========================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            function () {

                AcousticCanvas.init();

            }
        );

    } else {

        AcousticCanvas.init();

    }

})();