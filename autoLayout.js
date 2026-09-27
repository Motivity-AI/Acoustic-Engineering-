const {
    clamp,
    distance2D,
    normalizeAngle
} = require("./geometry");

function getCoverageRadius(speaker, mountingHeight) {
    const horizontal =
        Number(speaker.horizontal_coverage || 90);

    const halfAngle =
        horizontal / 2;

    const height =
        Math.max(
            1,
            Number(mountingHeight || 4) - 1.2
        );

    const radius =
        height *
        Math.tan(
            halfAngle * Math.PI / 180
        );

    return Math.max(2, radius);
}

function createGridPositions(room, spacing, margin = 2) {
    const positions = [];

    const width =
        Number(room.width);

    const length =
        Number(room.length);

    const xStart =
        Math.min(margin, width / 2);

    const yStart =
        Math.min(margin, length / 2);

    for (
        let y = yStart;
        y <= length - yStart;
        y += spacing
    ) {
        for (
            let x = xStart;
            x <= width - xStart;
            x += spacing
        ) {
            positions.push({
                x: Number(x.toFixed(2)),
                y: Number(y.toFixed(2))
            });
        }
    }

    return positions;
}

function wallMountLayout(room, speaker) {
    const height =
        Math.max(
            2.5,
            Math.min(
                Number(room.height) - 0.5,
                5
            )
        );

    const positions = [];

    const width = Number(room.width);
    const length = Number(room.length);

    const coverage =
        getCoverageRadius(
            speaker,
            height
        );

    const spacing =
        clamp(
            coverage * 1.4,
            5,
            15
        );

    for (
        let x = spacing / 2;
        x < width;
        x += spacing
    ) {
        positions.push({
            x: Number(x.toFixed(2)),
            y: 0.5,
            z: height,
            angle: 90
        });
    }

    return positions;
}

function distributedCeilingLayout(room, speaker) {
    const height =
        Math.max(
            2.5,
            Number(room.height) - 0.3
        );

    const coverage =
        getCoverageRadius(
            speaker,
            height
        );

    const spacing =
        clamp(
            coverage * 1.35,
            4,
            10
        );

    return createGridPositions(
        room,
        spacing,
        Math.min(2, spacing / 3)
    ).map(position => ({
        ...position,
        z: height,
        angle: 0
    }));
}

function mainPAArrayLayout(room, speaker) {
    const positions = [];

    const width = Number(room.width);
    const length = Number(room.length);

    const height =
        Math.max(
            3,
            Number(room.height) - 1
        );

    const centerX =
        width / 2;

    positions.push({
        x: centerX,
        y: 1,
        z: height,
        angle: 90
    });

    return positions;
}

function lineArrayLayout(room, speaker) {
    const width = Number(room.width);
    const height =
        Math.max(
            4,
            Number(room.height) - 1
        );

    return [
        {
            x: 1,
            y: 1,
            z: height,
            angle: 45
        },
        {
            x: width - 1,
            y: 1,
            z: height,
            angle: 135
        }
    ];
}

function subwooferLayout(room, speaker) {
    const width = Number(room.width);

    return [
        {
            x: Math.max(1, width * 0.35),
            y: 1,
            z: 1,
            angle: 90
        },
        {
            x: Math.min(width - 1, width * 0.65),
            y: 1,
            z: 1,
            angle: 90
        }
    ];
}

function scoreLayout(layout, room, speaker) {
    if (!layout.length) {
        return -Infinity;
    }

    const coverage =
        getCoverageRadius(
            speaker,
            room.height
        );

    let score = 100;

    // Penalize excessive spacing
    for (let i = 0; i < layout.length; i++) {
        for (let j = i + 1; j < layout.length; j++) {
            const distance =
                distance2D(
                    layout[i],
                    layout[j]
                );

            if (
                distance >
                coverage * 2.2
            ) {
                score -= 5;
            }

            if (
                distance <
                coverage * 0.35
            ) {
                score -= 2;
            }
        }
    }

    // Penalize designs with too many speakers
    if (layout.length > 24) {
        score -=
            (layout.length - 24) * 2;
    }

    return score;
}

function autoLayout({
    room,
    speaker,
    application = "general",
    mountingPreference = "auto"
}) {
    const candidates = [];

    const type =
        String(
            speaker.category || ""
        ).toLowerCase();

    if (
        mountingPreference === "ceiling" ||
        type.includes("ceiling")
    ) {
        candidates.push({
            name: "Distributed Ceiling",
            layout:
                distributedCeilingLayout(
                    room,
                    speaker
                )
        });
    }

    if (
        mountingPreference === "wall" ||
        type.includes("column")
    ) {
        candidates.push({
            name: "Wall Distributed",
            layout:
                wallMountLayout(
                    room,
                    speaker
                )
        });
    }

    if (
        type.includes("line") ||
        application === "concert" ||
        application === "stadium" ||
        application === "theater"
    ) {
        candidates.push({
            name: "Main PA / Line Array",
            layout:
                lineArrayLayout(
                    room,
                    speaker
                )
        });
    }

    candidates.push({
        name: "Main PA",
        layout:
            mainPAArrayLayout(
                room,
                speaker
            )
    });

    candidates.push({
        name: "Distributed",
        layout:
            distributedCeilingLayout(
                room,
                speaker
            )
    });

    const scored =
        candidates.map(candidate => ({
            ...candidate,
            score:
                scoreLayout(
                    candidate.layout,
                    room,
                    speaker
                )
        }));

    scored.sort(
        (a, b) =>
            b.score - a.score
    );

    const selected =
        scored[0];

    const result =
        selected.layout.map(
            (position, index) => ({
                id:
                    `SP-${String(
                        index + 1
                    ).padStart(2, "0")}`,
                speakerId:
                    speaker.id,
                model:
                    speaker.model,
                manufacturer:
                    speaker.manufacturer,
                ...position,
                angle:
                    normalizeAngle(
                        position.angle || 0
                    )
            })
        );

    return {
        strategy: selected.name,
        score: selected.score,
        alternatives: scored.map(
            candidate => ({
                strategy:
                    candidate.name,
                score:
                    Number(
                        candidate.score.toFixed(2)
                    ),
                speakerCount:
                    candidate.layout.length
            })
        ),
        speakers: result
    };
}

function addSubwoofers({
    room,
    speaker
}) {
    return subwooferLayout(
        room,
        speaker
    ).map(
        (position, index) => ({
            id:
                `SUB-${String(
                    index + 1
                ).padStart(2, "0")}`,
            speakerId:
                speaker.id,
            model:
                speaker.model,
            manufacturer:
                speaker.manufacturer,
            ...position
        })
    );
}

module.exports = {
    autoLayout,
    addSubwoofers,
    getCoverageRadius
};