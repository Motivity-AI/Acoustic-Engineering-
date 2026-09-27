
Ibrahim Arabi <iaraby309@gmail.com>	Sun, Sep 27, 2026 at 3:30 PM
To: alkheirhajanah71@gmail.com
/* =========================================================
   Acoustic Engineering
   js/engine.js
   Engineering Calculation & Intelligent Design Engine
   Version 1.0
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       1. GLOBAL NAMESPACE
       ===================================================== */

    window.AcousticEngineering =
        window.AcousticEngineering || {};

    const AE = window.AcousticEngineering;

    /* =====================================================
       2. ENGINE STATE
       ===================================================== */

    const state = {
        version: "1.0",

        room: {
            width: 12,
            depth: 8,
            height: 3,

            listenerHeight: 1.2,

            wallMaterial: "standard",
            reflectionLevel: "medium"
        },

        stage: {
            enabled: false,

            width: 6,
            depth: 3,

            x: 3,
            y: 0,

            height: 0.6
        },

        audience: {
            count: 100,

            areaRatio: 0.75
        },

        target: {
            spl: 85,

            headroom: 10,

            coverage: 90,

            uniformity: 6
        },

        design: {
            mode: "intelligent",

            speakerId: null,

            mountingHeight: 2.5,

            preferredMounting: "wall",

            overlap: 0.15,

            edgeMargin: 0.5,

            maxSpacingFactor: 0.85,

            minSPL: 79,

            maxSPL: 105
        },

        speakers: [],

        coveragePoints: [],

        analysis: null,

        result: null
    };

    /* =====================================================
       3. BASIC UTILITIES
       ===================================================== */

    function num(value, fallback = 0) {
        const n = Number(value);

        return Number.isFinite(n)
            ? n
            : fallback;
    }

    function clamp(value, min, max) {
        return Math.min(
            Math.max(value, min),
            max
        );
    }

    function distance(x1, y1, x2, y2) {
        return Math.sqrt(
            Math.pow(x2 - x1, 2) +
            Math.pow(y2 - y1, 2)
        );
    }

    function radians(degrees) {
        return degrees * Math.PI / 180;
    }

    function degrees(radiansValue) {
        return radiansValue * 180 / Math.PI;
    }

    function round(value, digits = 2) {
        const factor =
            Math.pow(10, digits);

        return Math.round(
            value * factor
        ) / factor;
    }

    function average(values) {
        if (!values.length) {
            return 0;
        }

        return (
            values.reduce(
                (sum, value) =>
                    sum + value,
                0
            ) / values.length
        );
    }

    function min(values) {
        return values.length
            ? Math.min(...values)
            : 0;
    }

    function max(values) {
        return values.length
            ? Math.max(...values)
            : 0;
    }

    function median(values) {
        if (!values.length) {
            return 0;
        }

        const sorted =
            [...values].sort(
                (a, b) => a - b
            );

        const middle =
            Math.floor(
                sorted.length / 2
            );

        return sorted.length % 2
            ? sorted[middle]
            : (
                sorted[middle - 1] +
                sorted[middle]
            ) / 2;
    }

    /* =====================================================
       4. EVENT SYSTEM
       ===================================================== */

    function emit(
        name,
        detail = {}
    ) {
        window.dispatchEvent(
            new CustomEvent(
                name,
                {
                    detail
                }
            )
        );
    }

    /* =====================================================
       5. ROOM CONFIGURATION
       ===================================================== */

    function setRoom(data = {}) {

        state.room.width =
            Math.max(
                1,
                num(
                    data.width,
                    state.room.width
                )
            );

        state.room.depth =
            Math.max(
                1,
                num(
                    data.depth,
                    state.room.depth
                )
            );

        state.room.height =
            Math.max(
                1,
                num(
                    data.height,
                    state.room.height
                )
            );

        if (
            data.listenerHeight !==
            undefined
        ) {
            state.room.listenerHeight =
                Math.max(
                    0.5,
                    num(
                        data.listenerHeight,
                        1.2
                    )
                );
        }

        if (
            data.wallMaterial
        ) {
            state.room.wallMaterial =
                data.wallMaterial;
        }

        if (
            data.reflectionLevel
        ) {
            state.room.reflectionLevel =
                data.reflectionLevel;
        }

        emit(
            "engine:room-updated",
            {
                room:
                    getRoom()
            }
        );

        return getRoom();
    }

    function getRoom() {
        return {
            ...state.room
        };
    }

    function getRoomArea() {
        return (
            state.room.width *
            state.room.depth
        );
    }

    function getRoomVolume() {
        return (
            getRoomArea() *
            state.room.height
        );
    }

    /* =====================================================
       6. STAGE CONFIGURATION
       ===================================================== */

    function setStage(data = {}) {

        state.stage.enabled =
            data.enabled !== undefined
                ? Boolean(data.enabled)
                : state.stage.enabled;

        state.stage.width =
            Math.max(
                0.5,
                num(
                    data.width,
                    state.stage.width
                )
            );

        state.stage.depth =
            Math.max(
                0.5,
                num(
                    data.depth,
                    state.stage.depth
                )
            );

        state.stage.x =
            num(
                data.x,
                state.stage.x
            );

        state.stage.y =
            num(
                data.y,
                state.stage.y
            );

        state.stage.height =
            Math.max(
                0,
                num(
                    data.height,
                    state.stage.height
                )
            );

        return {
            ...state.stage
        };
    }

    /* =====================================================
       7. AUDIENCE
       ===================================================== */

    function setAudience(data = {}) {

        if (
            data.count !== undefined
        ) {
            state.audience.count =
                Math.max(
                    0,
                    Math.round(
                        num(
                            data.count,
                            state.audience.count
                        )
                    )
                );
        }

        if (
            data.areaRatio !== undefined
        ) {
            state.audience.areaRatio =
                clamp(
                    num(
                        data.areaRatio,
                        0.75
                    ),
                    0.1,
                    1
                );
        }

        return {
            ...state.audience
        };
    }

    /* =====================================================
       8. TARGET CONFIGURATION
       ===================================================== */

    function setTargets(data = {}) {

        if (
            data.spl !== undefined
        ) {
            state.target.spl =
                num(
                    data.spl,
                    state.target.spl
                );
        }

        if (
            data.headroom !== undefined
        ) {
            state.target.headroom =
                Math.max(
                    0,
                    num(
                        data.headroom,
                        state.target.headroom
                    )
                );
        }

        if (
            data.coverage !== undefined
        ) {
            state.target.coverage =
                clamp(
                    num(
                        data.coverage,
                        state.target.coverage
                    ),
                    1,
                    100
                );
        }

        if (
            data.uniformity !== undefined
        ) {
            state.target.uniformity =
                Math.max(
                    1,
                    num(
                        data.uniformity,
                        state.target.uniformity
                    )
                );
        }

        return {
            ...state.target
        };
    }

    /* =====================================================
       9. SPEAKER DATABASE ACCESS
       ===================================================== */

    function getSpeakerDatabase() {

        if (
            AE.speaker &&
            typeof AE.speaker.getAll ===
                "function"
        ) {
            return AE.speaker.getAll();
        }

        if (
            window.SpeakerDatabase &&
            typeof window.SpeakerDatabase.getAll ===
                "function"
        ) {
            return window.SpeakerDatabase.getAll();
        }

        return [];
    }

    function getSpeakerById(id) {

        if (
            AE.speaker &&
            typeof AE.speaker.get ===
                "function"
        ) {
            return AE.speaker.get(id);
        }

        return getSpeakerDatabase()
            .find(
                speaker =>
                    speaker.id === id
            ) || null;
    }

    /* =====================================================
       10. SPEAKER SELECTION
       ===================================================== */

    function selectSpeaker(
        speakerId
    ) {
        const speaker =
            getSpeakerById(
                speakerId
            );

        if (!speaker) {
            return null;
        }

        state.design.speakerId =
            speakerId;

        emit(
            "engine:speaker-selected",
            {
                speaker
            }
        );

        return speaker;
    }

    function recommendSpeaker(
        requirements = {}
    ) {

        if (
            AE.speaker &&
            typeof AE.speaker.recommend ===
                "function"
        ) {
            const results =
                AE.speaker.recommend(
                    requirements
                );

            return results.length
                ? results[0]
                : null;
        }

        const database =
            getSpeakerDatabase();

        if (!database.length) {
            return null;
        }

        let candidates =
            [...database];

        if (
            requirements.category
        ) {
            candidates =
                candidates.filter(
                    speaker =>
                        speaker.category ===
                        requirements.category
                );
        }

        if (
            requirements.minPower
        ) {
            candidates =
                candidates.filter(
                    speaker =>
                        num(
                            speaker.power?.rms
                        ) >=
                        requirements.minPower
                );
        }

        if (
            requirements.minSPL
        ) {
            candidates =
                candidates.filter(
                    speaker =>
                        num(
                            speaker.maxSPL
                        ) >=
                        requirements.minSPL
                );
        }

        candidates.sort(
            (a, b) =>
                num(
                    b.maxSPL
                ) -
                num(
                    a.maxSPL
                )
        );

        return candidates[0] || null;
    }

    /* =====================================================
       11. COVERAGE GEOMETRY
       ===================================================== */

    function getCoverageDimensions(
        speaker,
        mountingHeight =
            state.design.mountingHeight
    ) {

        if (!speaker) {
            return {
                width: 0,
                depth: 0,
                area: 0
            };
        }

        const listenerHeight =
            state.room.listenerHeight;

        const effectiveHeight =
            Math.max(
                0.5,
                mountingHeight -
                listenerHeight
            );

        const hAngle =
            clamp(
                num(
                    speaker.coverage
                        ?.horizontal,
                    90
                ),
                1,
                180
            );

        const vAngle =
            clamp(
                num(
                    speaker.coverage
                        ?.vertical,
                    60
                ),
                1,
                180
            );

        const width =
            2 *
            effectiveHeight *
            Math.tan(
                radians(
                    hAngle / 2
                )
            );

        const depth =
            2 *
            effectiveHeight *
            Math.tan(
                radians(
                    vAngle / 2
                )
            );

        return {
            width:
                Math.abs(width),

            depth:
                Math.abs(depth),

            area:
                Math.abs(
                    width * depth
                ),

            effectiveHeight,

            horizontalAngle:
                hAngle,

            verticalAngle:
                vAngle
        };
    }

    /* =====================================================
       12. SPL CALCULATIONS
       ===================================================== */

    function calculateDistanceLoss(
        distanceMeters
    ) {
        const d =
            Math.max(
                0.5,
                num(
                    distanceMeters,
                    1
                )
            );

        return (
            20 *
            Math.log10(d)
        );
    }

    function calculateSPL(
        speaker,
        distanceMeters,
        inputPower = null
    ) {

        if (!speaker) {
            return 0;
        }

        let sourceSPL =
            num(
                speaker.maxSPL,
                0
            );

        const rms =
            num(
                speaker.power?.rms,
                0
            );

        if (
            inputPower !== null &&
            rms > 0
        ) {

            const ratio =
                Math.max(
                    num(inputPower) /
                    rms,
                    0.001
                );

            sourceSPL +=
                10 *
                Math.log10(
                    ratio
                );
        }

        const loss =
            calculateDistanceLoss(
                distanceMeters
            );

        return (
            sourceSPL -
            loss
        );
    }

    function calculateRequiredPower(
        speaker,
        distanceMeters,
        targetSPL
    ) {

        if (!speaker) {
            return 0;
        }

        const rms =
            num(
                speaker.power?.rms,
                0
            );

        const maxSPL =
            num(
                speaker.maxSPL,
                0
            );

        if (
            rms <= 0 ||
            maxSPL <= 0
        ) {
            return 0;
        }

        const loss =
            calculateDistanceLoss(
                distanceMeters
            );

        const requiredSource =
            num(targetSPL) +
            loss;

        const gain =
            requiredSource -
            maxSPL;

        const ratio =
            Math.pow(
                10,
                gain / 10
            );

        return (
            rms *
            ratio
        );
    }

    /* =====================================================
       13. SPEAKER COVERAGE TEST
       ===================================================== */

    function isPointCovered(
        speakerObject,
        speaker,
        point
    ) {

        if (
            !speakerObject ||
            !speaker ||
            !point
        ) {
            return false;
        }

        const dx =
            point.x -
            speakerObject.x;

        const dy =
            point.y -
            speakerObject.y;

        const d =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        if (d < 0.01) {
            return true;
        }

        const bearing =
            degrees(
                Math.atan2(
                    dy,
                    dx
                )
            );

        let relativeAngle =
            bearing -
            num(
                speakerObject.rotation,
                0
            );

        while (
            relativeAngle > 180
        ) {
            relativeAngle -= 360;
        }

        while (
            relativeAngle < -180
        ) {
            relativeAngle += 360;
        }

        const horizontalLimit =
            num(
                speaker.coverage
                    ?.horizontal,
                90
            ) / 2;

        return (
            Math.abs(
                relativeAngle
            ) <=
            horizontalLimit
        );
    }

    /* =====================================================
       14. COVERAGE GRID
       ===================================================== */

    function createCoverageGrid(
        options = {}
    ) {

        const spacing =
            Math.max(
                0.5,
                num(
                    options.spacing,
                    1
                )
            );

        const width =
            num(
                options.width,
                state.room.width
            );

        const depth =
            num(
                options.depth,
                state.room.depth
            );

        const points = [];

        for (
            let y = spacing / 2;
            y < depth;
            y += spacing
        ) {

            for (
                let x = spacing / 2;
                x < width;
                x += spacing
            ) {

                points.push({
                    id:
                        `p_${points.length + 1}`,

                    x:
                        round(x, 3),

                    y:
                        round(y, 3),

                    spl: 0,

                    covered: false,

                    speakerCount: 0,

                    contributors: []
                });
            }
        }

        state.coveragePoints =
            points;

        return points;
    }

    /* =====================================================
       15. POINT SPL ANALYSIS
       ===================================================== */

    function calculatePointSPL(
        point,
        speakerObjects
    ) {

        if (
            !point ||
            !speakerObjects?.length
        ) {
            return {
                spl: 0,
                covered: false,
                speakerCount: 0,
                contributors: []
            };
        }

        const contributors = [];

        speakerObjects.forEach(
            object => {

                const speaker =
                    getSpeakerById(
                        object.speakerId
                    );

                if (!speaker) {
                    return;
                }

                if (
                    object.mute ||
                    object.enabled === false
                ) {
                    return;
                }

                const d =
                    Math.max(
                        0.5,
                        distance(
                            object.x,
                            object.y,
                            point.x,
                            point.y
                        )
                    );

                if (
                    !isPointCovered(
                        object,
                        speaker,
                        point
                    )
                ) {
                    return;
                }

                const spl =
                    calculateSPL(
                        speaker,
                        d,
                        object.power ||
                            speaker.power?.rms
                    ) +
                    num(
                        object.gain,
                        0
                    );

                contributors.push({
                    objectId:
                        object.id,

                    speakerId:
                        speaker.id,

                    model:
                        speaker.model,

                    distance:
                        d,

                    spl:
                        spl
                });
            }
        );

        if (!contributors.length) {
            return {
                spl: 0,
                covered: false,
                speakerCount: 0,
                contributors: []
            };
        }

        /*
         * Acoustic energy summation.
         *
         * dB values cannot simply be added.
         */

        const energy =
            contributors.reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    Math.pow(
                        10,
                        item.spl / 10
                    ),
                0
            );

        const totalSPL =
            10 *
            Math.log10(
                energy
            );

        return {
            spl:
                totalSPL,

            covered:
                totalSPL >=
                state.target.minSPL,

            speakerCount:
                contributors.length,

            contributors
        };
    }

    /* =====================================================
       16. COMPLETE COVERAGE ANALYSIS
       ===================================================== */

    function analyzeCoverage(
        speakerObjects = state.speakers,
        options = {}
    ) {

        const spacing =
            num(
                options.spacing,
                Math.max(
                    0.5,
                    Math.min(
                        1.5,
                        state.room.width /
                        10
                    )
                )
            );

        const points =
            createCoverageGrid({
                width:
                    state.room.width,

                depth:
                    state.room.depth,

                spacing
            });

        const results =
            points.map(
                point => {

                    const analysis =
                        calculatePointSPL(
                            point,
                            speakerObjects
                        );

                    return {
                        ...point,
                        ...analysis
                    };
                }
            );

        const splValues =
            results
                .map(
                    p => p.spl
                )
                .filter(
                    spl => spl > 0
                );

        const coveredCount =
            results.filter(
                p => p.spl >=
                    state.target.spl
            ).length;

        const targetCount =
            results.length;

        const coveragePercent =
            targetCount
                ? (
                    coveredCount /
                    targetCount
                ) *
                  100
                : 0;

        const avgSPL =
            average(
                splValues
            );

        const minSPL =
            min(
                splValues
            );

        const maxSPL =
            max(
                splValues
            );

        const medianSPL =
            median(
                splValues
            );

        const uniformity =
            maxSPL -
            minSPL;

        const averageSpeakers =
            average(
                results.map(
                    p =>
                        p.speakerCount
                )
            );

        const analysis = {

            points:
                results,

            totalPoints:
                results.length,

            coveredPoints:
                coveredCount,

            coveragePercent:
                round(
                    coveragePercent,
                    2
                ),

            averageSPL:
                round(
                    avgSPL,
                    2
                ),

            minimumSPL:
                round(
                    minSPL,
                    2
                ),

            maximumSPL:
                round(
                    maxSPL,
                    2
                ),

            medianSPL:
                round(
                    medianSPL,
                    2
                ),

            uniformity:
                round(
                    uniformity,
                    2
                ),

            averageSpeakerContribution:
                round(
                    averageSpeakers,
                    2
                ),

            targetSPL:
                state.target.spl,

            targetCoverage:
                state.target.coverage,

            uniformityTarget:
                state.target.uniformity
        };

        state.analysis =
            analysis;

        emit(
            "engine:coverage-analysis",
            analysis
        );

        return analysis;
    }

    /* =====================================================
       17. ROOM BOUNDARIES
       ===================================================== */

    function clampSpeakerPosition(
        x,
        y,
        speaker,
        margin =
            state.design.edgeMargin
    ) {

        const coverage =
            getCoverageDimensions(
                speaker
            );

        const halfWidth =
            Math.min(
                coverage.width / 2,
                state.room.width / 2
            );

        const halfDepth =
            Math.min(
                coverage.depth / 2,
                state.room.depth / 2
            );

        return {
            x:
                clamp(
                    x,
                    margin,
                    state.room.width -
                    margin
                ),

            y:
                clamp(
                    y,
                    margin,
                    state.room.depth -
                    margin
                ),

            halfWidth,
            halfDepth
        };
    }

    /* =====================================================
       18. DISTRIBUTED GRID DESIGN
       ===================================================== */

    function calculateDistributedLayout(
        speaker,
        options = {}
    ) {

        if (!speaker) {
            return [];
        }

        const mountingHeight =
            num(
                options.mountingHeight,
                state.design.mountingHeight
            );

        const dimensions =
            getCoverageDimensions(
                speaker,
                mountingHeight
            );

        const overlap =
            clamp(
                num(
                    options.overlap,
                    state.design.overlap
                ),
                0,
                0.5
            );

        const effectiveWidth =
            Math.max(
                1,
                dimensions.width *
                (
                    1 -
                    overlap
                )
            );

        const effectiveDepth =
            Math.max(
                1,
                dimensions.depth *
                (
                    1 -
                    overlap
                )
            );

        const edge =
            Math.max(
                0.25,
                num(
                    options.edgeMargin,
                    state.design.edgeMargin
                )
            );

        const availableWidth =
            Math.max(
                1,
                state.room.width -
                edge * 2
            );

        const availableDepth =
            Math.max(
                1,
                state.room.depth -
                edge * 2
            );

        let columns =
            Math.ceil(
                availableWidth /
                effectiveWidth
            );

        let rows =
            Math.ceil(
                availableDepth /
                effectiveDepth
            );

        columns =
            Math.max(
                1,
                columns
            );

        rows =
            Math.max(
                1,
                rows
            );

        /*
         * Avoid excessive density.
         */

        const maxSpeakers =
            num(
                options.maxSpeakers,
                100
            );

        while (
            columns *
            rows >
            maxSpeakers
        ) {

            if (
                columns >= rows
            ) {
                columns--;
            }
            else {
                rows--;
            }

            columns =
                Math.max(
                    1,
                    columns
                );

            rows =
                Math.max(
                    1,
                    rows
                );
        }

        const spacingX =
            availableWidth /
            columns;

        const spacingY =
            availableDepth /
            rows;

        const layout = [];

        for (
            let row = 0;
            row < rows;
            row++
        ) {

            for (
                let col = 0;
                col < columns;
                col++
            ) {

                const x =
                    edge +
                    spacingX *
                    (
                        col + 0.5
                    );

                const y =
                    edge +
                    spacingY *
                    (
                        row + 0.5
                    );

                let rotation = 0;

                /*
                 * Point speakers toward
                 * room center.
                 */

                if (
                    options.pointToCenter !==
                    false
                ) {

                    const centerX =
                        state.room.width /
                        2;

                    const centerY =
                        state.room.depth /
                        2;

                    rotation =
                        degrees(
                            Math.atan2(
                                centerY - y,
                                centerX - x
                            )
                        );
                }

                layout.push({

                    id:
                        createObjectId(),

                    type:
                        "speaker",

                    speakerId:
                        speaker.id,

                    model:
                        speaker.model,

                    x:
                        round(x, 3),

                    y:
                        round(y, 3),

                    z:
                        mountingHeight,

                    rotation:
                        round(
                            rotation,
                            2
                        ),

                    power:
                        speaker.power?.rms ||
                        0,

                    maxSPL:
                        speaker.maxSPL ||
                        0,

                    horizontalCoverage:
                        speaker.coverage
                            ?.horizontal ||
                        90,

                    verticalCoverage:
                        speaker.coverage
                            ?.vertical ||
                        60,

                    mountingHeight,

                    mounting:
                        options.mounting ||
                        state.design
                            .preferredMounting,

                    enabled:
                        true,

                    mute:
                        false,

                    gain:
                        0,

                    delay:
                        0
                });
            }
        }

        return layout;
    }

    /* =====================================================
       19. FRONT / STAGE MAIN SPEAKER DESIGN
       ===================================================== */

    function calculateFrontMainLayout(
        speaker,
        options = {}
    ) {

        if (!speaker) {
            return [];
        }

        const count =
            Math.max(
                1,
                Math.round(
                    num(
                        options.count,
                        2
                    )
                )
            );

        const stage =
            state.stage;

        const y =
            stage.enabled
                ? Math.max(
                    0.5,
                    stage.y -
                    0.8
                )
                : 0.8;

        const center =
            state.room.width /
            2;

        const spacing =
            Math.min(
                5,
                state.room.width /
                Math.max(
                    2,
                    count
                )
            );

        const layout = [];

        for (
            let i = 0;
            i < count;
            i++
        ) {

            let x;

            if (count === 1) {
                x = center;
            }
            else {
                x =
                    center +
                    (
                        i -
                        (
                            count - 1
                        ) /
                        2
                    ) *
                    spacing;
            }

            const rotation =
                degrees(
                    Math.atan2(
                        (
                            state.room.depth -
                            y
                        ) -
                        y,
                        center -
                        x
                    )
                );

            layout.push({

                id:
                    createObjectId(),

                type:
                    "speaker",

                speakerId:
                    speaker.id,

                model:
                    speaker.model,

                x:
                    round(x, 3),

                y:
                    round(y, 3),

                z:
                    num(
                        options.mountingHeight,
                        state.room.height *
                        0.7
                    ),

                rotation:
                    round(
                        rotation,
                        2
                    ),

                power:
                    speaker.power?.rms ||
                    0,

                maxSPL:
                    speaker.maxSPL ||
                    0,

                horizontalCoverage:
                    speaker.coverage
                        ?.horizontal ||
                    90,

                verticalCoverage:
                    speaker.coverage
                        ?.vertical ||
                    60,

                mountingHeight:
                    num(
                        options.mountingHeight,
                        state.room.height *
                        0.7
                    ),

                mounting:
                    options.mounting ||
                    "stand",

                enabled:
                    true,

                mute:
                    false,

                gain:
                    0,

                delay:
                    0
            });
        }

        return layout;
    }

    /* =====================================================
       20. DELAY FILL DESIGN
       ===================================================== */

    function calculateDelayFills(
        speaker,
        options = {}
    ) {

        if (!speaker) {
            return [];
        }

        const count =
            Math.max(
                0,
                Math.round(
                    num(
                        options.count,
                        0
                    )
                )
            );

        if (!count) {
            return [];
        }

        const layout = [];

        const startY =
            state.room.depth *
            0.55;

        const endY =
            state.room.depth *
            0.85;

        for (
            let i = 0;
            i < count;
            i++
        ) {

            const ratio =
                count === 1
                    ? 0.5
                    : i /
                      (
                        count - 1
                    );

            const x =
                state.room.width *
                0.1 +
                state.room.width *
                0.8 *
                ratio;

            const y =
                startY +
                (
                    endY -
                    startY
                ) *
                0.5;

            layout.push({

                id:
                    createObjectId(),

                type:
                    "delay",

                speakerId:
                    speaker.id,

                model:
                    speaker.model,

                x:
                    round(x, 3),

                y:
                    round(y, 3),

                z:
                    num(
                        options.mountingHeight,
                        state.design.mountingHeight
                    ),

                rotation:
                    -90,

                power:
                    speaker.power?.rms ||
                    0,

                maxSPL:
                    speaker.maxSPL ||
                    0,

                horizontalCoverage:
                    speaker.coverage
                        ?.horizontal ||
                    90,

                verticalCoverage:
                    speaker.coverage
                        ?.vertical ||
                    60,

                mountingHeight:
                    num(
                        options.mountingHeight,
                        state.design.mountingHeight
                    ),

                mounting:
                    "wall",

                enabled:
                    true,

                mute:
                    false,

                gain:
                    -3,

                delay:
                    num(
                        options.delay,
                        0
                    )
            });
        }

        return layout;
    }

    /* =====================================================
       21. INTELLIGENT DESIGN
       ===================================================== */

    function autoDesign(
        options = {}
    ) {

        const requestedSpeakerId =
            options.speakerId ||
            state.design.speakerId;

        let speaker =
            requestedSpeakerId
                ? getSpeakerById(
                    requestedSpeakerId
                )
                : null;

        /*
         * If no model is selected,
         * automatically recommend one.
         */

        if (!speaker) {

            speaker =
                recommendSpeaker({
                    category:
                        options.category ||
                        "fullrange",

                    minPower:
                        options.minPower ||
                        100,

                    minSPL:
                        options.minSPL ||
                        115,

                    mounting:
                        options.mounting ||
                        state.design
                            .preferredMounting
                });
        }

        if (!speaker) {

            const error =
                "No suitable speaker model found.";

            emit(
                "engine:error",
                {
                    message: error
                }
            );

            return {
                success: false,
                error
            };
        }

        state.design.speakerId =
            speaker.id;

        const mode =
            options.mode ||
            state.design.mode;

        let layout = [];

        if (
            mode ===
            "distributed"
        ) {

            layout =
                calculateDistributedLayout(
                    speaker,
                    options
                );
        }

        else if (
            mode ===
            "front"
        ) {

            layout =
                calculateFrontMainLayout(
                    speaker,
                    options
                );
        }

        else {

            /*
             * Intelligent mode.
             *
             * Start with distributed coverage,
             * then evaluate it.
             */

            layout =
                calculateDistributedLayout(
                    speaker,
                    options
                );

            /*
             * If the room is long,
             * reduce unnecessary front density.
             */

            if (
                state.room.depth >
                state.room.width *
                1.7
            ) {

                layout =
                    calculateDistributedLayout(
                        speaker,
                        {
                            ...options,
                            overlap:
                                Math.min(
                                    0.25,
                                    num(
                                        options.overlap,
                                        0.15
                                    )
                                )
                        }
                    );
            }
        }

        /*
         * Apply room boundaries.
         */

        layout =
            layout.map(
                object => {

                    const position =
                        clampSpeakerPosition(
                            object.x,
                            object.y,
                            speaker
                        );

                    return {
                        ...object,

                        x:
                            round(
                                position.x,
                                3
                            ),

                        y:
                            round(
                                position.y,
                                3
                            )
                    };
                }
            );

        /*
         * Calculate coverage.
         */

        const analysis =
            analyzeCoverage(
                layout,
                {
                    spacing:
                        options.gridSpacing ||
                        1
                }
            );

        /*
         * Calculate warnings.
         */

        const warnings =
            generateWarnings(
                layout,
                analysis,
                speaker
            );

        /*
         * Generate engineering
         * summary.
         */

        const summary =
            buildEngineeringSummary(
                layout,
                analysis,
                speaker,
                warnings
            );

        const result = {

            success:
                true,

            mode,

            speaker:
                speaker,

            layout,

            analysis,

            warnings,

            summary,

            timestamp:
                new Date()
                    .toISOString()
        };

        state.speakers =
            layout;

        state.analysis =
            analysis;

        state.result =
            result;

        emit(
            "engine:auto-design-complete",
            result
        );

        return result;
    }

    /* =====================================================
       22. OVERLAP ANALYSIS
       ===================================================== */

    function calculateOverlap(
        objects = state.speakers
    ) {

        const overlaps = [];

        for (
            let i = 0;
            i < objects.length;
            i++
        ) {

            const a =
                objects[i];

            const speakerA =
                getSpeakerById(
                    a.speakerId
                );

            if (!speakerA) {
                continue;
            }

            const coverageA =
                getCoverageDimensions(
                    speakerA,
                    a.mountingHeight
                );

            for (
                let j = i + 1;
                j < objects.length;
                j++
            ) {

                const b =
                    objects[j];

                const speakerB =
                    getSpeakerById(
                        b.speakerId
                    );

                if (!speakerB) {
                    continue;
                }

                const coverageB =
                    getCoverageDimensions(
                        speakerB,
                        b.mountingHeight
                    );

                const d =
                    distance(
                        a.x,
                        a.y,
                        b.x,
                        b.y
                    );

                const effectiveRadiusA =
                    Math.max(
                        coverageA.width,
                        coverageA.depth
                    ) / 2;

                const effectiveRadiusB =
                    Math.max(
                        coverageB.width,
                        coverageB.depth
                    ) / 2;

                const overlapDistance =
                    effectiveRadiusA +
                    effectiveRadiusB;

                if (
                    d <
                    overlapDistance
                ) {

                    const ratio =
                        1 -
                        d /
                        overlapDistance;

                    overlaps.push({

                        a:
                            a.id,

                        b:
                            b.id,

                        distance:
                            round(
                                d,
                                2
                            ),

                        overlapPercent:
                            round(
                                ratio *
                                100,
                                1
                            )
                    });
                }
            }
        }

        return overlaps;
    }

    /* =====================================================
       23. SPEAKER SPACING ANALYSIS
       ===================================================== */

    function analyzeSpacing(
        objects = state.speakers
    ) {

        if (
            objects.length <
            2
        ) {
            return {
                minimum: 0,
                maximum: 0,
                average: 0,
                distances: []
            };
        }

        const distances = [];

        for (
            let i = 0;
            i < objects.length;
            i++
        ) {

            for (
                let j = i + 1;
                j < objects.length;
                j++
            ) {

                distances.push(
                    distance(
                        objects[i].x,
                        objects[i].y,
                        objects[j].x,
                        objects[j].y
                    )
                );
            }
        }

        return {

            minimum:
                round(
                    min(distances),
                    2
                ),

            maximum:
                round(
                    max(distances),
                    2
                ),

            average:
                round(
                    average(distances),
                    2
                ),

            distances
        };
    }

    /* =====================================================
       24. DELAY CALCULATION
       ===================================================== */

    function calculateDelayForLayout(
        objects = state.speakers,
        referencePoint = null
    ) {

        if (
            !objects.length
        ) {
            return [];
        }

        const reference =
            referencePoint || {
                x:
                    state.room.width /
                    2,

                y:
                    state.room.depth *
                    0.25
            };

        const distances =
            objects.map(
                object =>
                    distance(
                        object.x,
                        object.y,
                        reference.x,
                        reference.y
                    )
            );

        const minimum =
            min(distances);

        return objects.map(
            (
                object,
                index
            ) => {

                const relative =
                    distances[index] -
                    minimum;

                return {

                    id:
                        object.id,

                    distance:
                        round(
                            distances[index],
                            2
                        ),

                    delayMs:
                        round(
                            relative /
                            343 *
                            1000,
                            2
                        )
                };
            }
        );
    }

    /* =====================================================
       25. WARNINGS
       ===================================================== */

    function generateWarnings(
        objects,
        analysis,
        speaker
    ) {

        const warnings = [];

        if (!objects.length) {

            warnings.push({
                level: "critical",
                code: "NO_SPEAKERS",
                message:
                    "لم يتم وضع أي سماعات في التصميم."
            });

            return warnings;
        }

        if (
            analysis.coveragePercent <
            state.target.coverage
        ) {

            warnings.push({
                level: "warning",

                code:
                    "LOW_COVERAGE",

                message:
                    `نسبة التغطية ${round(
                        analysis.coveragePercent,
                        1
                    )}% وهي أقل من الهدف ${state.target.coverage}%.`
            });
        }

        if (
            analysis.minimumSPL <
            state.target.spl
        ) {

            warnings.push({
                level: "warning",

                code:
                    "LOW_SPL",

                message:
                    `أقل SPL متوقع هو ${round(
                        analysis.minimumSPL,
                        1
                    )} dB، أقل من الهدف ${state.target.spl} dB.`
            });
        }

        if (
            analysis.uniformity >
            state.target.uniformity
        ) {

            warnings.push({
                level: "warning",

                code:
                    "LOW_UNIFORMITY",

                message:
                    `فرق التغطية ${round(
                        analysis.uniformity,
                        1
                    )} dB ويتجاوز الحد المستهدف ${state.target.uniformity} dB.`
            });
        }

        const overlaps =
            calculateOverlap(
                objects
            );

        const severeOverlaps =
            overlaps.filter(
                item =>
                    item.overlapPercent >
                    50
            );

        if (
            severeOverlaps.length
        ) {

            warnings.push({
                level: "warning",

                code:
                    "EXCESSIVE_OVERLAP",

                message:
                    `تم اكتشاف ${severeOverlaps.length} مناطق تداخل مرتفع بين السماعات.`
            });
        }

        const spacing =
            analyzeSpacing(
                objects
            );

        if (
            spacing.minimum > 0
        ) {

            const dimensions =
                getCoverageDimensions(
                    speaker,
                    state.design
                        .mountingHeight
                );

            const recommended =
                Math.min(
                    dimensions.width,
                    dimensions.depth
                ) *
                state.design
                    .maxSpacingFactor;

            if (
                spacing.minimum >
                recommended *
                2
            ) {

                warnings.push({
                    level: "warning",

                    code:
                        "LARGE_SPACING",

                    message:
                        `أقل مسافة بين السماعات ${spacing.minimum} m، وقد تكون المسافات غير متجانسة.`
                });
            }
        }

        if (
            state.room.height <
            state.design.mountingHeight
        ) {

            warnings.push({
                level: "critical",

                code:
                    "MOUNTING_HEIGHT",

                message:
                    "ارتفاع تركيب السماعة أكبر من ارتفاع الفراغ."
            });
        }

        /*
         * Reflection warning.
         */

        if (
            state.room.reflectionLevel ===
            "high"
        ) {

            warnings.push({
                level: "info",

                code:
                    "HIGH_REFLECTION",

                message:
                    "الفراغ عالي الانعكاس؛ يجب مراعاة المعالجة الصوتية وزمن الارتداد."
            });
        }

        /*
         * Large room warning.
         */

        if (
            getRoomVolume() >
            5000
        ) {

            warnings.push({
                level: "info",

                code:
                    "LARGE_VOLUME",

                message:
                    "حجم الفراغ كبير؛ قد يتطلب التصميم أنظمة Delay أو Line Array أو تقسيم مناطق."
            });
        }

        return warnings;
    }

    /* =====================================================
       26. ENGINEERING SUMMARY
       ===================================================== */

    function buildEngineeringSummary(
        objects,
        analysis,
        speaker,
        warnings
    ) {

        const spacing =
            analyzeSpacing(
                objects
            );

        const delay =
            calculateDelayForLayout(
                objects
            );

        const dimensions =
            getCoverageDimensions(
                speaker,
                state.design
                    .mountingHeight
            );

        const critical =
            warnings.filter(
                w =>
                    w.level ===
                    "critical"
            ).length;

        const warningCount =
            warnings.filter(
                w =>
                    w.level ===
                    "warning"
            ).length;

        let status =
            "acceptable";

        if (
            critical > 0
        ) {
            status =
                "critical";
        }
        else if (
            warningCount > 0
        ) {
            status =
                "review";
        }

        return {

            room: {

                width:
                    state.room.width,

                depth:
                    state.room.depth,

                height:
                    state.room.height,

                area:
                    round(
                        getRoomArea(),
                        2
                    ),

                volume:
                    round(
                        getRoomVolume(),
                        2
                    )
            },

            speaker: {

                id:
                    speaker.id,

                manufacturer:
                    speaker.manufacturer,

                model:
                    speaker.model,

                rms:
                    speaker.power?.rms ||
                    0,

                maxSPL:
                    speaker.maxSPL ||
                    0,

                horizontalCoverage:
                    speaker.coverage
                        ?.horizontal ||
                    0,

                verticalCoverage:
                    speaker.coverage
                        ?.vertical ||
                    0
            },

            quantity:
                objects.length,

            coverage: {

                percentage:
                    analysis.coveragePercent,

                averageSPL:
                    analysis.averageSPL,

                minimumSPL:
                    analysis.minimumSPL,

                maximumSPL:
                    analysis.maximumSPL,

                uniformity:
                    analysis.uniformity
            },

            footprint: {

                width:
                    round(
                        dimensions.width,
                        2
                    ),

                depth:
                    round(
                        dimensions.depth,
                        2
                    ),

                area:
                    round(
                        dimensions.area,
                        2
                    )
            },

            spacing,

            delay,

            warnings:
                warnings.length,

            criticalWarnings:
                critical,

            reviewWarnings:
                warningCount,

            status
        };
    }

    /* =====================================================
       27. DESIGN QUALITY SCORE
       ===================================================== */

    function calculateQuality(
        analysis = state.analysis
    ) {

        if (!analysis) {
            return 0;
        }

        let score = 100;

        /*
         * Coverage.
         */

        if (
            analysis.coveragePercent <
            state.target.coverage
        ) {

            score -=
                Math.min(
                    30,
                    (
                        state.target.coverage -
                        analysis.coveragePercent
                    ) *
                    0.7
                );
        }

        /*
         * SPL.
         */

        if (
            analysis.minimumSPL <
            state.target.spl
        ) {

            score -=
                Math.min(
                    25,
                    (
                        state.target.spl -
                        analysis.minimumSPL
                    ) *
                    1.2
                );
        }

        /*
         * Uniformity.
         */

        if (
            analysis.uniformity >
            state.target.uniformity
        ) {

            score -=
                Math.min(
                    25,
                    (
                        analysis.uniformity -
                        state.target.uniformity
                    ) *
                    1.5
                );
        }

        return round(
            clamp(
                score,
                0,
                100
            ),
            1
        );
    }

    /* =====================================================
       28. BOM GENERATION
       ===================================================== */

    function generateBOM(
        objects = state.speakers
    ) {

        const groups = {};

        objects.forEach(
            object => {

                const speaker =
                    getSpeakerById(
                        object.speakerId
                    );

                if (!speaker) {
                    return;
                }

                const key =
                    speaker.id;

                if (!groups[key]) {

                    groups[key] = {

                        speakerId:
                            speaker.id,

                        manufacturer:
                            speaker.manufacturer,

                        model:
                            speaker.model,

                        type:
                            speaker.type,

                        quantity:
                            0,

                        rms:
                            speaker.power
                                ?.rms ||
                            0,

                        maxSPL:
                            speaker.maxSPL ||
                            0,

                        coverage:
                            `${
                                speaker.coverage
                                    ?.horizontal ||
                                0
                            }° × ${
                                speaker.coverage
                                    ?.vertical ||
                                0
                            }°`
                    };
                }

                groups[key].quantity++;
            }
        );

        return Object.values(
            groups
        );
    }

    /* =====================================================
       29. COMPLETE DESIGN ANALYSIS
       ===================================================== */

    function analyzeDesign(
        objects = state.speakers,
        options = {}
    ) {

        const coverage =
            analyzeCoverage(
                objects,
                options
            );

        const overlaps =
            calculateOverlap(
                objects
            );

        const spacing =
            analyzeSpacing(
                objects
            );

        const delays =
            calculateDelayForLayout(
                objects,
                options.referencePoint
            );

        const bom =
            generateBOM(
                objects
            );

        const speaker =
            objects.length
                ? getSpeakerById(
                    objects[0].speakerId
                )
                : null;

        const warnings =
            speaker
                ? generateWarnings(
                    objects,
                    coverage,
                    speaker
                )
                : generateWarnings(
                    objects,
                    coverage,
                    null
                );

        const quality =
            calculateQuality(
                coverage
            );

        const result = {

            coverage,

            overlaps,

            spacing,

            delays,

            bom,

            warnings,

            quality,

            room:
                getRoom(),

            stage:
                {
                    ...state.stage
                },

            target:
                {
                    ...state.target
                },

            speakerCount:
                objects.length,

            timestamp:
                new Date()
                    .toISOString()
        };

        state.analysis =
            result;

        emit(
            "engine:design-analysis",
            result
        );

        return result;
    }

    /* =====================================================
       30. APPLY RESULT TO CANVAS
       ===================================================== */

    function applyToCanvas(
        result
    ) {

        if (!result) {
            return false;
        }

        /*
         * Preferred modern API.
         */

        if (
            window.AcousticCanvas
        ) {

            if (
                typeof
                window.AcousticCanvas
                    .loadDesign ===
                "function"
            ) {

                window.AcousticCanvas
                    .loadDesign(
                        result.layout ||
                        []
                    );

                return true;
            }

            if (
                typeof
                window.AcousticCanvas
                    .setObjects ===
                "function"
            ) {

                window.AcousticCanvas
                    .setObjects(
                        result.layout ||
                        []
                    );

                return true;
            }

            if (
                typeof
                window.AcousticCanvas
                    .render ===
                "function"
            ) {

                window.AcousticCanvas
                    .render();

                return true;
            }
        }

        /*
         * Generic fallback.
         */

        emit(
            "engine:apply-canvas",
            result
        );

        return true;
    }

    /* =====================================================
       31. AUTO DESIGN + APPLY
       ===================================================== */

    function designAndApply(
        options = {}
    ) {

        const result =
            autoDesign(
                options
            );

        if (
            result.success
        ) {
            applyToCanvas(
                result
            );
        }

        return result;
    }

    /* =====================================================
       32. MANUAL DESIGN
       ===================================================== */

    function setManualDesign(
        objects = []
    ) {

        state.design.mode =
            "manual";

        state.speakers =
            Array.isArray(objects)
                ? objects.map(
                    object => ({
                        ...object
                    })
                )
                : [];

        const analysis =
            analyzeDesign(
                state.speakers
            );

        const result = {

            success:
                true,

            mode:
                "manual",

            layout:
                state.speakers,

            analysis,

            bom:
                analysis.bom,

            warnings:
                analysis.warnings,

            quality:
                analysis.quality
        };

        state.result =
            result;

        emit(
            "engine:manual-design",
            result
        );

        return result;
    }

    /* =====================================================
       33. CREATE UNIQUE OBJECT ID
       ===================================================== */

    function createObjectId() {

        return (
            "spkobj_" +
            Date.now()
                .toString(36) +
            "_" +
            Math.random()
                .toString(36)
                .substring(
                    2,
                    8
                )
        );
    }

    /* =====================================================
       34. DESIGN DATA EXPORT
       ===================================================== */

    function getDesignData() {

        return {

            engineVersion:
                state.version,

            room:
                {
                    ...state.room
                },

            stage:
                {
                    ...state.stage
                },

            audience:
                {
                    ...state.audience
                },

            target:
                {
                    ...state.target
                },

            design:
                {
                    ...state.design
                },

            speakers:
                state.speakers.map(
                    object => ({
                        ...object
                    })
                ),

            analysis:
                state.analysis
                    ? JSON.parse(
                        JSON.stringify(
                            state.analysis
                        )
                    )
                    : null,

            result:
                state.result
                    ? JSON.parse(
                        JSON.stringify(
                            state.result
                        )
                    )
                    : null
        };
    }

    function loadDesign(
        data
    ) {

        if (!data) {
            return false;
        }

        if (data.room) {
            setRoom(
                data.room
            );
        }

        if (data.stage) {
            setStage(
                data.stage
            );
        }

        if (data.audience) {
            setAudience(
                data.audience
            );
        }

        if (data.target) {
            setTargets(
                data.target
            );
        }

        if (data.design) {
            state.design = {
                ...state.design,
                ...data.design
            };
        }

        if (
            Array.isArray(
                data.speakers
            )
        ) {
            state.speakers =
                data.speakers.map(
                    object => ({
                        ...object
                    })
                );
        }

        if (data.analysis) {
            state.analysis =
                data.analysis;
        }

        if (data.result) {
            state.result =
                data.result;
        }

        emit(
            "engine:design-loaded",
            getDesignData()
        );

        return true;
    }

    /* =====================================================
       35. RESET ENGINE
       ===================================================== */

    function reset() {

        state.speakers = [];

        state.coveragePoints = [];

        state.analysis = null;

        state.result = null;

        state.design.speakerId =
            null;

        emit(
            "engine:reset"
        );
    }

    /* =====================================================
       36. PUBLIC API
       ===================================================== */

    AE.engine = {

        state,

        init() {
            return true;
        },

        setRoom,

        getRoom,

        getRoomArea,

        getRoomVolume,

        setStage,

        setAudience,

        setTargets,

        getSpeakerDatabase,

        getSpeakerById,

        selectSpeaker,

        recommendSpeaker,

        getCoverageDimensions,

        calculateDistanceLoss,

        calculateSPL,

        calculateRequiredPower,

        isPointCovered,

        createCoverageGrid,

        calculatePointSPL,

        analyzeCoverage,

        calculateDistributedLayout,

        calculateFrontMainLayout,

        calculateDelayFills,

        autoDesign,

        designAndApply,

        calculateOverlap,

        analyzeSpacing,

        calculateDelayForLayout,

        generateWarnings,

        buildEngineeringSummary,

        calculateQuality,

        generateBOM,

        analyzeDesign,

        applyToCanvas,

        setManualDesign,

        getDesignData,

        loadDesign,

        reset
    };

    /* =====================================================
       37. BACKWARD COMPATIBILITY
       ===================================================== */

    window.AcousticEngine =
        AE.engine;

    window.Engine =
        AE.engine;

    /* =====================================================
       38. DOM INTEGRATION
       ===================================================== */

    function bindUI() {

        /*
         * Room inputs
         */

        const roomInputs = [
            "roomWidth",
            "roomDepth",
            "roomHeight"
        ];

        roomInputs.forEach(
            id => {

                const element =
                    document.getElementById(
                        id
                    );

                if (!element) {
                    return;
                }

                element.addEventListener(
                    "input",
                    () => {

                        setRoom({

                            width:
                                document.getElementById(
                                    "roomWidth"
                                )?.value,

                            depth:
                                document.getElementById(
                                    "roomDepth"
                                )?.value,

                            height:
                                document.getElementById(
                                    "roomHeight"
                                )?.value
                        });

                        emit(
                            "engine:input-change"
                        );
                    }
                );
            }
        );

        /*
         * Target SPL
         */

        const targetSPL =
            document.getElementById(
                "targetSPL"
            );

        if (targetSPL) {

            targetSPL.addEventListener(
                "input",
                () => {

                    setTargets({
                        spl:
                            targetSPL.value
                    });
                }
            );
        }

        /*
         * Mounting height
         */

        const mountingHeight =
            document.getElementById(
                "mountingHeight"
            );

        if (mountingHeight) {

            mountingHeight.addEventListener(
                "input",
                () => {

                    state.design
                        .mountingHeight =
                        Math.max(
                            0.5,
                            num(
                                mountingHeight
                                    .value,
                                2.5
                            )
                        );
                }
            );
        }

        /*
         * Intelligent design button.
         */

        const autoButtons =
            document.querySelectorAll(
                '[data-action="auto-design"], #autoDesignBtn'
            );

        autoButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const result =
                            designAndApply({
                                mode:
                                    document.getElementById(
                                        "designMode"
                                    )?.value ||
                                    "intelligent",

                                speakerId:
                                    state.design
                                        .speakerId,

                                mountingHeight:
                                    num(
                                        document.getElementById(
                                            "mountingHeight"
                                        )?.value,
                                        state.design
                                            .mountingHeight
                                    ),

                                overlap:
                                    state.design
                                        .overlap,

                                gridSpacing:
                                    1
                            });

                        updateAnalysisUI(
                            result
                        );
                    }
                );
            }
        );
    }

    /* =====================================================
       39. UI ANALYSIS UPDATE
       ===================================================== */

    function updateAnalysisUI(
        result
    ) {

        if (!result) {
            return;
        }

        const analysis =
            result.analysis ||
            result;

        const values = {

            metricSpeakerCount:
                result.layout
                    ?.length ||
                result.speakerCount ||
                0,

            metricCoverage:
                analysis.coveragePercent ??
                analysis.coverage
                    ?.coveragePercent ??
                0,

            metricSPL:
                analysis.averageSPL ??
                analysis.coverage
                    ?.averageSPL ??
                0,

            metricMaxDistance:
                analysis.spacing
                    ?.maximum ||
                0,

            metricUniformity:
                analysis.uniformity ??
                analysis.coverage
                    ?.uniformity ??
                0
        };

        Object.entries(
            values
        ).forEach(
            ([id, value]) => {

                const element =
                    document.getElementById(
                        id
                    );

                if (element) {
                    element.textContent =
                        typeof value ===
                            "number"
                            ? round(
                                value,
                                1
                            )
                            : value;
                }
            }
        );

        /*
         * Update BOM table.
         */

        const bomBody =
            document.getElementById(
                "bomTableBody"
            );

        const bom =
            result.bom ||
            result.analysis
                ?.bom;

        if (
            bomBody &&
            Array.isArray(bom)
        ) {

            bomBody.innerHTML =
                bom.map(
                    item => `
                    <tr>
                        <td>
                            ${escapeHTML(
                                item.manufacturer
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.model
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.type
                            )}
                        </td>

                        <td>
                            ${item.quantity}
                        </td>

                        <td>
                            ${item.rms} W
                        </td>

                        <td>
                            ${item.maxSPL} dB
                        </td>

                        <td>
                            ${item.coverage}
                        </td>
                    </tr>
                `
                ).join("");
        }

        /*
         * Update warnings.
         */

        const warningContainer =
            document.getElementById(
                "analysisWarnings"
            );

        const warnings =
            result.warnings ||
            result.analysis
                ?.warnings ||
            [];

        if (
            warningContainer
        ) {

            warningContainer.innerHTML =
                warnings.length
                    ? warnings.map(
                        warning => `
                            <div class="
                                analysis-warning
                                ${escapeHTML(
                                    warning.level
                                )}
                            ">
                                <i class="
                                    fa-solid
                                    ${
                                        warning.level ===
                                        "critical"
                                            ? "fa-circle-xmark"
                                            : warning.level ===
                                              "warning"
                                            ? "fa-triangle-exclamation"
                                            : "fa-circle-info"
                                    }
                                "></i>

                                <span>
                                    ${escapeHTML(
                                        warning.message
                                    )}
                                </span>
                            </div>
                        `
                    ).join("")
                    : `
                        <div class="
                            analysis-success
                        ">
                            <i class="
                                fa-solid
                                fa-circle-check
                            "></i>

                            <span>
                                لم يتم اكتشاف تحذيرات هندسية أساسية.
                            </span>
                        </div>
                    `;
        }

        emit(
            "engine:ui-updated",
            result
        );
    }

    function escapeHTML(
        value
    ) {

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
       40. INITIALIZATION
       ===================================================== */

    function initialize() {

        try {

            /*
             * Wait for speaker.js.
             */

            if (
                !AE.speaker &&
                !window.SpeakerDatabase
            ) {

                console.warn(
                    "speaker.js not detected. Engine will initialize with limited functionality."
                );
            }

            bindUI();

            emit(
                "engine:ready",
                {
                    version:
                        state.version
                }
            );

        }
        catch (error) {

            console.error(
                "Acoustic Engine initialization error:",
                error
            );

            emit(
                "engine:error",
                {
                    message:
                        error.message
                }
            );
        }
    }

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    }
    else {

        initialize();
    }

})();