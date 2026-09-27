/* =========================================================
   Acoustic Engineering
   js/speaker.js
   Generic Speaker Database & Engineering Utilities
   Version: 1.0
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       1. GLOBAL NAMESPACE
       ===================================================== */

    window.AcousticEngineering = window.AcousticEngineering || {};

    const AE = window.AcousticEngineering;

    /* =====================================================
       2. DEFAULT SPEAKER DATABASE
       Brand-agnostic examples
       ===================================================== */

    const DEFAULT_SPEAKERS = [
        {
            id: "spk_fullrange_8",
            category: "fullrange",
            type: "Full Range",
            model: "Generic Full Range 8",
            manufacturer: "Generic",
            description: "8-inch full range loudspeaker",
            power: {
                rms: 150,
                program: 300,
                peak: 600
            },
            sensitivity: 95,
            maxSPL: 120,
            impedance: 8,
            frequency: {
                low: 70,
                high: 18000
            },
            coverage: {
                horizontal: 90,
                vertical: 60
            },
            dimensions: {
                width: 0.28,
                height: 0.45,
                depth: 0.25
            },
            weight: 8,
            mounting: [
                "wall",
                "stand",
                "bracket"
            ],
            recommendedHeight: 2.5,
            indoor: true,
            outdoor: false
        },

        {
            id: "spk_fullrange_12",
            category: "fullrange",
            type: "Full Range",
            model: "Generic Full Range 12",
            manufacturer: "Generic",
            description: "12-inch professional full range loudspeaker",
            power: {
                rms: 500,
                program: 1000,
                peak: 2000
            },
            sensitivity: 98,
            maxSPL: 128,
            impedance: 8,
            frequency: {
                low: 50,
                high: 18000
            },
            coverage: {
                horizontal: 90,
                vertical: 60
            },
            dimensions: {
                width: 0.38,
                height: 0.65,
                depth: 0.38
            },
            weight: 20,
            mounting: [
                "floor",
                "stand",
                "wall",
                "bracket"
            ],
            recommendedHeight: 2.5,
            indoor: true,
            outdoor: true
        },

        {
            id: "spk_column",
            category: "column",
            type: "Column",
            model: "Generic Column Array",
            manufacturer: "Generic",
            description: "Column loudspeaker for distributed speech/music",
            power: {
                rms: 120,
                program: 240,
                peak: 480
            },
            sensitivity: 92,
            maxSPL: 115,
            impedance: 8,
            frequency: {
                low: 90,
                high: 18000
            },
            coverage: {
                horizontal: 100,
                vertical: 30
            },
            dimensions: {
                width: 0.12,
                height: 0.8,
                depth: 0.15
            },
            weight: 6,
            mounting: [
                "wall",
                "pole",
                "bracket"
            ],
            recommendedHeight: 2.5,
            indoor: true,
            outdoor: true
        },

        {
            id: "spk_ceiling_6",
            category: "ceiling",
            type: "Ceiling Speaker",
            model: "Generic Ceiling 6",
            manufacturer: "Generic",
            description: "6-inch ceiling loudspeaker",
            power: {
                rms: 6,
                program: 12,
                peak: 24
            },
            sensitivity: 90,
            maxSPL: 105,
            impedance: 8,
            frequency: {
                low: 90,
                high: 18000
            },
            coverage: {
                horizontal: 100,
                vertical: 100
            },
            dimensions: {
                width: 0.22,
                height: 0.22,
                depth: 0.1
            },
            weight: 1.5,
            mounting: [
                "ceiling"
            ],
            recommendedHeight: 2.8,
            indoor: true,
            outdoor: false
        },

        {
            id: "spk_linearray",
            category: "linearray",
            type: "Line Array",
            model: "Generic Line Array",
            manufacturer: "Generic",
            description: "Professional line-array element",
            power: {
                rms: 700,
                program: 1400,
                peak: 2800
            },
            sensitivity: 101,
            maxSPL: 135,
            impedance: 8,
            frequency: {
                low: 55,
                high: 20000
            },
            coverage: {
                horizontal: 90,
                vertical: 10
            },
            dimensions: {
                width: 0.6,
                height: 0.25,
                depth: 0.4
            },
            weight: 18,
            mounting: [
                "fly",
                "ground",
                "array"
            ],
            recommendedHeight: 6,
            indoor: true,
            outdoor: true
        },

        {
            id: "spk_sub18",
            category: "subwoofer",
            type: "Subwoofer",
            model: "Generic Subwoofer 18",
            manufacturer: "Generic",
            description: "18-inch subwoofer",
            power: {
                rms: 1000,
                program: 2000,
                peak: 4000
            },
            sensitivity: 98,
            maxSPL: 135,
            impedance: 8,
            frequency: {
                low: 30,
                high: 120
            },
            coverage: {
                horizontal: 180,
                vertical: 180
            },
            dimensions: {
                width: 0.6,
                height: 0.8,
                depth: 0.7
            },
            weight: 50,
            mounting: [
                "floor"
            ],
            recommendedHeight: 0.5,
            indoor: true,
            outdoor: true
        }
    ];

    /* =====================================================
       3. INTERNAL STATE
       ===================================================== */

    const state = {
        speakers: [],
        selectedId: null,
        customSpeakers: [],
        version: "1.0"
    };

    /* =====================================================
       4. UTILITY FUNCTIONS
       ===================================================== */

    function generateId(prefix = "spk") {
        return (
            prefix +
            "_" +
            Date.now().toString(36) +
            "_" +
            Math.random().toString(36).substring(2, 8)
        );
    }

    function number(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function normalizeSpeaker(data = {}) {
        return {
            id: data.id || generateId(),

            category: data.category || "fullrange",

            type: data.type || "Loudspeaker",

            model: data.model || "Unnamed Speaker",

            manufacturer: data.manufacturer || "Generic",

            description: data.description || "",

            power: {
                rms: number(data.power?.rms, 0),
                program: number(data.power?.program, 0),
                peak: number(data.power?.peak, 0)
            },

            sensitivity: number(data.sensitivity, 0),

            maxSPL: number(data.maxSPL, 0),

            impedance: number(data.impedance, 8),

            frequency: {
                low: number(data.frequency?.low, 0),
                high: number(data.frequency?.high, 0)
            },

            coverage: {
                horizontal: number(
                    data.coverage?.horizontal,
                    90
                ),

                vertical: number(
                    data.coverage?.vertical,
                    60
                )
            },

            dimensions: {
                width: number(data.dimensions?.width, 0),
                height: number(data.dimensions?.height, 0),
                depth: number(data.dimensions?.depth, 0)
            },

            weight: number(data.weight, 0),

            mounting: Array.isArray(data.mounting)
                ? [...data.mounting]
                : ["stand"],

            recommendedHeight: number(
                data.recommendedHeight,
                2.5
            ),

            indoor:
                data.indoor !== undefined
                    ? Boolean(data.indoor)
                    : true,

            outdoor:
                data.outdoor !== undefined
                    ? Boolean(data.outdoor)
                    : false,

            source: data.source || "local",

            datasheetUrl:
                data.datasheetUrl || "",

            notes:
                data.notes || "",

            createdAt:
                data.createdAt ||
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString()
        };
    }

    /* =====================================================
       5. INITIALIZATION
       ===================================================== */

    function init(options = {}) {
        if (state.speakers.length === 0) {
            state.speakers = DEFAULT_SPEAKERS.map(
                normalizeSpeaker
            );
        }

        if (
            Array.isArray(options.speakers) &&
            options.speakers.length
        ) {
            state.speakers = options.speakers.map(
                normalizeSpeaker
            );
        }

        renderLibrary();

        return getAllSpeakers();
    }

    /* =====================================================
       6. DATABASE FUNCTIONS
       ===================================================== */

    function getAllSpeakers() {
        return deepClone(state.speakers);
    }

    function getSpeaker(id) {
        return state.speakers.find(
            speaker => speaker.id === id
        ) || null;
    }

    function findByModel(model) {
        const query = String(model || "")
            .trim()
            .toLowerCase();

        return state.speakers.filter(speaker =>
            speaker.model
                .toLowerCase()
                .includes(query)
        );
    }

    function filterSpeakers(filters = {}) {
        return state.speakers.filter(speaker => {

            if (
                filters.category &&
                speaker.category !== filters.category
            ) {
                return false;
            }

            if (
                filters.manufacturer &&
                speaker.manufacturer !==
                    filters.manufacturer
            ) {
                return false;
            }

            if (
                filters.mounting &&
                !speaker.mounting.includes(
                    filters.mounting
                )
            ) {
                return false;
            }

            if (
                filters.minPower &&
                speaker.power.rms <
                    Number(filters.minPower)
            ) {
                return false;
            }

            if (
                filters.maxPower &&
                speaker.power.rms >
                    Number(filters.maxPower)
            ) {
                return false;
            }

            return true;
        });
    }

    /* =====================================================
       7. ADD / UPDATE / DELETE
       ===================================================== */

    function addSpeaker(data) {
        const speaker = normalizeSpeaker(data);

        state.speakers.push(speaker);

        renderLibrary();

        dispatchEvent(
            "speaker:added",
            speaker
        );

        return deepClone(speaker);
    }

    function updateSpeaker(id, changes = {}) {
        const index = state.speakers.findIndex(
            speaker => speaker.id === id
        );

        if (index === -1) {
            return null;
        }

        const updated = normalizeSpeaker({
            ...state.speakers[index],
            ...changes,

            power: {
                ...state.speakers[index].power,
                ...(changes.power || {})
            },

            frequency: {
                ...state.speakers[index].frequency,
                ...(changes.frequency || {})
            },

            coverage: {
                ...state.speakers[index].coverage,
                ...(changes.coverage || {})
            },

            dimensions: {
                ...state.speakers[index].dimensions,
                ...(changes.dimensions || {})
            }
        });

        state.speakers[index] = updated;

        renderLibrary();

        dispatchEvent(
            "speaker:updated",
            updated
        );

        return deepClone(updated);
    }

    function deleteSpeaker(id) {
        const index = state.speakers.findIndex(
            speaker => speaker.id === id
        );

        if (index === -1) {
            return false;
        }

        const removed = state.speakers.splice(
            index,
            1
        )[0];

        if (state.selectedId === id) {
            state.selectedId = null;
        }

        renderLibrary();

        dispatchEvent(
            "speaker:deleted",
            removed
        );

        return true;
    }

    /* =====================================================
       8. IMPORT / EXPORT
       ===================================================== */

    function importSpeaker(data) {
        if (!data) {
            throw new Error(
                "Speaker data is empty."
            );
        }

        return addSpeaker({
            ...data,
            id: data.id || generateId()
        });
    }

    function importSpeakers(list = []) {
        if (!Array.isArray(list)) {
            throw new Error(
                "Speaker list must be an array."
            );
        }

        return list.map(importSpeaker);
    }

    function exportSpeakers() {
        return JSON.stringify(
            state.speakers,
            null,
            2
        );
    }

    function exportSpeaker(id) {
        const speaker = getSpeaker(id);

        if (!speaker) {
            return null;
        }

        return JSON.stringify(
            speaker,
            null,
            2
        );
    }

    /* =====================================================
       9. ENGINEERING CALCULATIONS
       ===================================================== */

    /**
     * Calculate SPL at distance.
     *
     * Simplified free-field formula:
     *
     * SPL2 =
     * SPL1 - 20 log10(distance2 / distance1)
     *
     * This is an engineering estimate, not a room-acoustic
     * simulation.
     */

    function calculateSPLAtDistance(
        speaker,
        distance,
        inputPower = null
    ) {
        if (!speaker) {
            return 0;
        }

        distance = Math.max(
            number(distance, 1),
            0.5
        );

        const maxSPL = number(
            speaker.maxSPL,
            0
        );

        let spl = maxSPL;

        if (
            inputPower !== null &&
            speaker.power.rms > 0
        ) {
            const ratio =
                Math.max(
                    inputPower /
                        speaker.power.rms,
                    0.0001
                );

            const powerGain =
                10 *
                Math.log10(ratio);

            spl += powerGain;
        }

        const distanceLoss =
            20 *
            Math.log10(distance);

        return spl - distanceLoss;
    }

    /**
     * Calculate maximum theoretical distance
     * for a target SPL.
     */

    function calculateMaxDistance(
        speaker,
        targetSPL,
        inputPower = null
    ) {
        if (!speaker) {
            return 0;
        }

        let sourceSPL =
            number(
                speaker.maxSPL,
                0
            );

        if (
            inputPower !== null &&
            speaker.power.rms > 0
        ) {
            const ratio =
                Math.max(
                    inputPower /
                        speaker.power.rms,
                    0.0001
                );

            sourceSPL +=
                10 *
                Math.log10(ratio);
        }

        const difference =
            sourceSPL -
            number(targetSPL, 85);

        return Math.pow(
            10,
            difference / 20
        );
    }

    /**
     * Estimate required speaker count
     * based on room area and coverage.
     */

    function estimateCoverageArea(
        speaker,
        mountingHeight,
        listenerHeight = 1.2
    ) {
        if (!speaker) {
            return 0;
        }

        const horizontalAngle =
            clamp(
                speaker.coverage.horizontal,
                1,
                180
            );

        const verticalAngle =
            clamp(
                speaker.coverage.vertical,
                1,
                180
            );

        const verticalDistance =
            Math.max(
                mountingHeight -
                    listenerHeight,
                0.5
            );

        const horizontalRadius =
            verticalDistance *
            Math.tan(
                (
                    horizontalAngle / 2
                ) *
                    Math.PI /
                    180
            );

        const verticalRadius =
            verticalDistance *
            Math.tan(
                (
                    verticalAngle / 2
                ) *
                    Math.PI /
                    180
            );

        return (
            Math.PI *
            Math.abs(horizontalRadius) *
            Math.abs(verticalRadius)
        );
    }

    function estimateSpeakerCount(
        speaker,
        roomWidth,
        roomDepth,
        mountingHeight,
        coverageFactor = 0.65
    ) {
        const roomArea =
            number(roomWidth) *
            number(roomDepth);

        if (
            roomArea <= 0 ||
            !speaker
        ) {
            return 0;
        }

        const coverage =
            estimateCoverageArea(
                speaker,
                mountingHeight
            );

        if (coverage <= 0) {
            return 0;
        }

        const effectiveCoverage =
            coverage *
            clamp(
                coverageFactor,
                0.25,
                1
            );

        return Math.max(
            1,
            Math.ceil(
                roomArea /
                    effectiveCoverage
            )
        );
    }

    /**
     * Estimate spacing between distributed speakers.
     */

    function estimateSpeakerSpacing(
        speaker,
        mountingHeight,
        listenerHeight = 1.2
    ) {
        if (!speaker) {
            return 0;
        }

        const verticalDistance =
            Math.max(
                mountingHeight -
                    listenerHeight,
                0.5
            );

        const angle =
            clamp(
                speaker.coverage.horizontal,
                1,
                180
            );

        return (
            2 *
            verticalDistance *
            Math.tan(
                (
                    angle / 2
                ) *
                    Math.PI /
                    180
            )
        );
    }

    /**
     * Estimate delay based on distance.
     *
     * Speed of sound ≈ 343 m/s.
     */

    function calculateDelay(
        distanceMeters,
        referenceDistance = 0
    ) {
        const delta =
            Math.max(
                0,
                number(distanceMeters) -
                    number(referenceDistance)
            );

        return (
            (delta / 343) *
            1000
        );
    }

    /**
     * Estimate coverage footprint dimensions.
     */

    function calculateCoverageFootprint(
        speaker,
        mountingHeight,
        listenerHeight = 1.2
    ) {
        if (!speaker) {
            return {
                width: 0,
                depth: 0,
                area: 0
            };
        }

        const h =
            Math.max(
                mountingHeight -
                    listenerHeight,
                0.5
            );

        const width =
            2 *
            h *
            Math.tan(
                (
                    speaker.coverage
                        .horizontal /
                        2
                ) *
                    Math.PI /
                    180
            );

        const depth =
            2 *
            h *
            Math.tan(
                (
                    speaker.coverage
                        .vertical /
                        2
                ) *
                    Math.PI /
                    180
            );

        return {
            width: Math.abs(width),
            depth: Math.abs(depth),
            area:
                Math.abs(width * depth)
        };
    }

    /* =====================================================
       10. SPEAKER VALIDATION
       ===================================================== */

    function validateSpeaker(data) {
        const errors = [];
        const warnings = [];

        if (!data.model) {
            errors.push(
                "Speaker model is required."
            );
        }

        if (
            !data.power ||
            number(data.power.rms) <= 0
        ) {
            errors.push(
                "RMS power must be greater than zero."
            );
        }

        if (
            number(data.maxSPL) <= 0
        ) {
            warnings.push(
                "Maximum SPL is not defined."
            );
        }

        if (
            number(
                data.coverage?.horizontal
            ) <= 0
        ) {
            warnings.push(
                "Horizontal coverage is missing."
            );
        }

        if (
            number(
                data.coverage?.vertical
            ) <= 0
        ) {
            warnings.push(
                "Vertical coverage is missing."
            );
        }

        if (
            number(
                data.frequency?.low
            ) <= 0
        ) {
            warnings.push(
                "Low frequency limit is missing."
            );
        }

        if (
            number(
                data.frequency?.high
            ) <= 0
        ) {
            warnings.push(
                "High frequency limit is missing."
            );
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /* =====================================================
       11. DATASHEET PARSER
       Basic parser for manually extracted text.
       More advanced PDF parsing can be added later.
       ===================================================== */

    function parseDatasheetText(text = "") {
        const source =
            String(text)
                .replace(/\r/g, " ")
                .replace(/\n+/g, " ");

        const result = {};

        function findNumber(
            patterns
        ) {
            for (const pattern of patterns) {
                const match =
                    source.match(pattern);

                if (match) {
                    return number(
                        match[1],
                        null
                    );
                }
            }

            return null;
        }

        const rms =
            findNumber([
                /(?:RMS|AES|continuous)[^\d]{0,20}(\d+(?:\.\d+)?)\s*W/i,
                /(\d+(?:\.\d+)?)\s*W[^\d]*(?:RMS|AES)/i
            ]);

        const peak =
            findNumber([
                /(?:peak|maximum)[^\d]{0,20}(\d+(?:\.\d+)?)\s*W/i,
                /(\d+(?:\.\d+)?)\s*W[^\d]*(?:peak)/i
            ]);

        const maxSPL =
            findNumber([
                /(?:max\.?\s*SPL|max\s*SPL|maximum\s*SPL)[^\d]{0,20}(\d+(?:\.\d+)?)\s*dB/i
            ]);

        const horizontal =
            findNumber([
                /(?:horizontal|H)[^\d]{0,10}(\d+(?:\.\d+)?)\s*°/i
            ]);

        const vertical =
            findNumber([
                /(?:vertical|V)[^\d]{0,10}(\d+(?:\.\d+)?)\s*°/i
            ]);

        const low =
            findNumber([
                /(?:frequency|freq)[^\d]{0,20}(\d+(?:\.\d+)?)\s*Hz\s*[-–]\s*\d+/i,
                /(\d+(?:\.\d+)?)\s*Hz\s*[-–]/i
            ]);

        const high =
            findNumber([
                /Hz\s*[-–]\s*(\d+(?:\.\d+)?)\s*k?Hz/i
            ]);

        if (rms !== null) {
            result.power = {
                rms
            };
        }

        if (peak !== null) {
            result.power = {
                ...(result.power || {}),
                peak
            };
        }

        if (maxSPL !== null) {
            result.maxSPL = maxSPL;
        }

        if (
            horizontal !== null ||
            vertical !== null
        ) {
            result.coverage = {
                horizontal:
                    horizontal || 90,
                vertical:
                    vertical || 60
            };
        }

        if (
            low !== null ||
            high !== null
        ) {
            result.frequency = {
                low: low || 0,
                high:
                    high
                        ? high * (
                            high < 1000
                                ? 1000
                                : 1
                        )
                        : 0
            };
        }

        return result;
    }

    /* =====================================================
       12. UI LIBRARY
       ===================================================== */

    function renderLibrary(
        containerId = "speakerLibrary"
    ) {
        const container =
            document.getElementById(
                containerId
            );

        if (!container) {
            return;
        }

        container.innerHTML = "";

        const speakers =
            state.speakers;

        if (!speakers.length) {
            container.innerHTML = `
                <div class="empty-library">
                    <i class="fa-solid fa-volume-high"></i>
                    <span>لا توجد سماعات في المكتبة</span>
                </div>
            `;

            return;
        }

        speakers.forEach(
            speaker => {
                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "speaker-library-item";

                item.dataset.id =
                    speaker.id;

                item.innerHTML = `
                    <div class="speaker-library-icon">
                        <i class="fa-solid fa-volume-high"></i>
                    </div>

                    <div class="speaker-library-info">

                        <strong>
                            ${escapeHTML(
                                speaker.model
                            )}
                        </strong>

                        <small>
                            ${escapeHTML(
                                speaker.type
                            )}
                        </small>

                        <div class="speaker-library-specs">
                            <span>
                                ${speaker.power.rms} W RMS
                            </span>

                            <span>
                                ${speaker.maxSPL || "--"} dB
                            </span>

                            <span>
                                ${speaker.coverage.horizontal}°
                            </span>
                        </div>

                    </div>
                `;

                item.addEventListener(
                    "click",
                    () => {
                        selectSpeaker(
                            speaker.id
                        );
                    }
                );

                container.appendChild(
                    item
                );
            }
        );
    }

    function selectSpeaker(id) {
        const speaker =
            getSpeaker(id);

        if (!speaker) {
            return null;
        }

        state.selectedId = id;

        document
            .querySelectorAll(
                ".speaker-library-item"
            )
            .forEach(item => {
                item.classList.toggle(
                    "selected",
                    item.dataset.id === id
                );
            });

        populateInspector(
            speaker
        );

        dispatchEvent(
            "speaker:selected",
            speaker
        );

        return deepClone(speaker);
    }

    function populateInspector(
        speaker
    ) {
        if (!speaker) {
            return;
        }

        setValue(
            "speakerModel",
            speaker.model
        );

        setValue(
            "speakerPower",
            speaker.power.rms
        );

        setValue(
            "speakerSPL",
            speaker.maxSPL
        );

        setValue(
            "speakerH",
            speaker.coverage.horizontal
        );

        setValue(
            "speakerV",
            speaker.coverage.vertical
        );

        setValue(
            "speakerFreqLow",
            speaker.frequency.low
        );

        setValue(
            "speakerFreqHigh",
            speaker.frequency.high
        );

        setValue(
            "speakerWeight",
            speaker.weight
        );

        setValue(
            "speakerMount",
            speaker.mounting?.[0] ||
                "stand"
        );
    }

    function setValue(
        id,
        value
    ) {
        const element =
            document.getElementById(id);

        if (!element) {
            return;
        }

        element.value =
            value ?? "";
    }

    /* =====================================================
       13. SPEAKER OBJECT FOR CANVAS
       ===================================================== */

    function createCanvasSpeaker(
        speakerId,
        x = 0,
        y = 0,
        rotation = 0,
        options = {}
    ) {
        const speaker =
            getSpeaker(speakerId);

        if (!speaker) {
            throw new Error(
                "Speaker not found: " +
                speakerId
            );
        }

        return {
            id: generateId("obj"),

            type: "speaker",

            speakerId:
                speaker.id,

            model:
                speaker.model,

            manufacturer:
                speaker.manufacturer,

            x: number(x),

            y: number(y),

            z:
                number(
                    options.z,
                    speaker.recommendedHeight
                ),

            rotation:
                number(rotation),

            power:
                speaker.power.rms,

            maxSPL:
                speaker.maxSPL,

            horizontalCoverage:
                speaker.coverage.horizontal,

            verticalCoverage:
                speaker.coverage.vertical,

            mountingHeight:
                number(
                    options.mountingHeight,
                    speaker.recommendedHeight
                ),

            mounting:
                options.mounting ||
                speaker.mounting[0] ||
                "stand",

            enabled:
                options.enabled !== false,

            delay:
                number(
                    options.delay,
                    0
                ),

            gain:
                number(
                    options.gain,
                    0
                ),

            mute:
                Boolean(
                    options.mute
                ),

            label:
                options.label ||
                speaker.model
        };
    }

    /* =====================================================
       14. ENGINEERING PROFILE
       ===================================================== */

    function getEngineeringProfile(
        speaker
    ) {
        if (!speaker) {
            return null;
        }

        const coverage =
            calculateCoverageFootprint(
                speaker,
                speaker.recommendedHeight
            );

        const spacing =
            estimateSpeakerSpacing(
                speaker,
                speaker.recommendedHeight
            );

        const maxDistance =
            calculateMaxDistance(
                speaker,
                85
            );

        return {
            model:
                speaker.model,

            rmsPower:
                speaker.power.rms,

            maxSPL:
                speaker.maxSPL,

            coverageHorizontal:
                speaker.coverage.horizontal,

            coverageVertical:
                speaker.coverage.vertical,

            coverageWidth:
                coverage.width,

            coverageDepth:
                coverage.depth,

            coverageArea:
                coverage.area,

            recommendedSpacing:
                spacing,

            estimatedMaxDistance:
                maxDistance,

            recommendedHeight:
                speaker.recommendedHeight,

            frequencyRange: {
                low:
                    speaker.frequency.low,

                high:
                    speaker.frequency.high
            }
        };
    }

    /* =====================================================
       15. SERIALIZATION
       ===================================================== */

    function serialize() {
        return {
            version:
                state.version,

            speakers:
                getAllSpeakers()
        };
    }

    function load(data) {
        if (!data) {
            return false;
        }

        if (
            Array.isArray(data)
        ) {
            state.speakers =
                data.map(
                    normalizeSpeaker
                );
        }
        else if (
            Array.isArray(
                data.speakers
            )
        ) {
            state.speakers =
                data.speakers.map(
                    normalizeSpeaker
                );
        }
        else {
            return false;
        }

        state.selectedId =
            null;

        renderLibrary();

        dispatchEvent(
            "speaker:database-loaded",
            serialize()
        );

        return true;
    }

    /* =====================================================
       16. EVENTS
       ===================================================== */

    function dispatchEvent(
        name,
        detail
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
        }
        catch (error) {
            console.warn(
                "Event dispatch failed:",
                error
            );
        }
    }

    /* =====================================================
       17. HTML ESCAPE
       ===================================================== */

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
       18. FILE DATASHEET HANDLING
       ===================================================== */

    async function readDatasheetFile(
        file
    ) {
        if (!file) {
            throw new Error(
                "No file selected."
            );
        }

        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();

        if (
            extension === "txt" ||
            extension === "csv"
        ) {
            const text =
                await file.text();

            return {
                type: extension,
                name: file.name,
                text,
                parsed:
                    parseDatasheetText(
                        text
                    )
            };
        }

        if (
            extension === "json"
        ) {
            const text =
                await file.text();

            const data =
                JSON.parse(text);

            return {
                type: "json",
                name: file.name,
                data,
                parsed:
                    normalizeSpeaker(
                        data
                    )
            };
        }

        return {
            type: extension,
            name: file.name,
            message:
                "PDF/image parsing can be connected to the document extraction engine."
        };
    }

    /* =====================================================
       19. AUTOMATIC SPEAKER SELECTION
       ===================================================== */

    function recommendSpeakers(
        requirements = {}
    ) {
        let candidates =
            getAllSpeakers();

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
                        speaker.power.rms >=
                        requirements.minPower
                );
        }

        if (
            requirements.minSPL
        ) {
            candidates =
                candidates.filter(
                    speaker =>
                        speaker.maxSPL >=
                        requirements.minSPL
                );
        }

        if (
            requirements.mounting
        ) {
            candidates =
                candidates.filter(
                    speaker =>
                        speaker.mounting.includes(
                            requirements.mounting
                        )
                );
        }

        candidates.sort(
            (a, b) => {

                const scoreA =
                    calculateSpeakerScore(
                        a,
                        requirements
                    );

                const scoreB =
                    calculateSpeakerScore(
                        b,
                        requirements
                    );

                return (
                    scoreB -
                    scoreA
                );
            }
        );

        return candidates;
    }

    function calculateSpeakerScore(
        speaker,
        requirements = {}
    ) {
        let score = 0;

        if (
            requirements.minPower
        ) {
            score +=
                Math.min(
                    speaker.power.rms /
                        requirements.minPower,
                    2
                ) *
                20;
        }

        if (
            requirements.minSPL
        ) {
            score +=
                Math.min(
                    speaker.maxSPL /
                        requirements.minSPL,
                    1.2
                ) *
                30;
        }

        if (
            requirements.horizontalCoverage
        ) {
            const difference =
                Math.abs(
                    speaker.coverage.horizontal -
                        requirements.horizontalCoverage
                );

            score +=
                Math.max(
                    0,
                    30 -
                        difference / 3
                );
        }

        if (
            requirements.verticalCoverage
        ) {
            const difference =
                Math.abs(
                    speaker.coverage.vertical -
                        requirements.verticalCoverage
                );

            score +=
                Math.max(
                    0,
                    20 -
                        difference / 3
                );
        }

        return score;
    }

    /* =====================================================
       20. GLOBAL API
       ===================================================== */

    AE.speaker = {
        state,

        init,

        getAll:
            getAllSpeakers,

        get:
            getSpeaker,

        findByModel,

        filter:
            filterSpeakers,

        add:
            addSpeaker,

        update:
            updateSpeaker,

        delete:
            deleteSpeaker,

        import:
            importSpeaker,

        importMany:
            importSpeakers,

        export:
            exportSpeakers,

        exportOne:
            exportSpeaker,

        validate:
            validateSpeaker,

        parseDatasheet:
            parseDatasheetText,

        readDatasheet:
            readDatasheetFile,

        createCanvasObject:
            createCanvasSpeaker,

        select:
            selectSpeaker,

        engineeringProfile:
            getEngineeringProfile,

        calculateSPL:
            calculateSPLAtDistance,

        calculateMaxDistance,

        estimateCoverageArea,

        estimateSpeakerCount,

        estimateSpacing:
            estimateSpeakerSpacing,

        calculateDelay,

        calculateCoverageFootprint,

        recommend:
            recommendSpeakers,

        serialize,

        load,

        renderLibrary
    };

    /* =====================================================
       21. BACKWARD COMPATIBILITY
       ===================================================== */

    window.SpeakerDatabase =
        AE.speaker;

    window.SpeakerEngine =
        AE.speaker;

    /* =====================================================
       22. AUTO INITIALIZATION
       ===================================================== */

    function autoInit() {
        try {
            init();
        }
        catch (error) {
            console.error(
                "Speaker module initialization failed:",
                error
            );
        }
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            autoInit
        );
    }
    else {
        autoInit();
    }

})();