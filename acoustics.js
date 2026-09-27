const {
    distance3D,
    clamp,
    degToRad
} = require("./geometry");

function inverseSquareLoss(distance) {
    if (distance <= 1) return 0;

    return 20 * Math.log10(distance);
}

function estimateSPL({
    speaker,
    distance,
    powerRatio = 1
}) {
    const maxSpl = Number(speaker.max_spl || 0);

    if (!maxSpl || !distance) {
        return 0;
    }

    const loss = inverseSquareLoss(distance);

    const powerAdjustment =
        10 * Math.log10(
            Math.max(0.01, Number(powerRatio))
        );

    return maxSpl - loss + powerAdjustment;
}

function angularDifference(a, b) {
    let diff = Math.abs(
        Number(a) - Number(b)
    ) % 360;

    if (diff > 180) {
        diff = 360 - diff;
    }

    return diff;
}

function directivityFactor({
    speaker,
    speakerPosition,
    listenerPosition,
    speakerAngle = 0
}) {
    const dx =
        listenerPosition.x -
        speakerPosition.x;

    const dy =
        listenerPosition.y -
        speakerPosition.y;

    const listenerAngle =
        Math.atan2(dy, dx) *
        180 / Math.PI;

    const difference =
        angularDifference(
            listenerAngle,
            speakerAngle
        );

    const horizontal =
        Number(speaker.horizontal_coverage || 90);

    if (difference <= horizontal / 2) {
        return 1;
    }

    if (difference <= horizontal) {
        const normalized =
            (difference - horizontal / 2) /
            (horizontal / 2);

        return 1 - 0.6 * normalized;
    }

    return 0.25;
}

function calculateSpeakerCoverage({
    speaker,
    position,
    room,
    gridStep = 2,
    speakerAngle = 0
}) {
    const points = [];

    for (
        let y = gridStep / 2;
        y < room.length;
        y += gridStep
    ) {
        for (
            let x = gridStep / 2;
            x < room.width;
            x += gridStep
        ) {
            const listener = {
                x,
                y,
                z: 1.2
            };

            const distance =
                distance3D(
                    position,
                    listener
                );

            const direction =
                directivityFactor({
                    speaker,
                    speakerPosition: position,
                    listenerPosition: listener,
                    speakerAngle
                });

            const spl =
                estimateSPL({
                    speaker,
                    distance,
                    powerRatio: direction
                });

            points.push({
                x,
                y,
                spl,
                distance,
                coverage: direction
            });
        }
    }

    return points;
}

function analyzeDesign({
    speakers,
    room,
    targetSPL = 85
}) {
    const allPoints = [];

    for (const item of speakers) {
        const points =
            calculateSpeakerCoverage({
                speaker: item.speaker,
                position: item.position,
                room,
                gridStep: 2,
                speakerAngle: item.angle || 0
            });

        allPoints.push({
            speakerId: item.id,
            points
        });
    }

    const merged = [];

    for (
        let y = 1;
        y < room.length;
        y += 2
    ) {
        for (
            let x = 1;
            x < room.width;
            x += 2
        ) {
            let energy = 0;

            for (const speakerSet of allPoints) {
                const nearest =
                    speakerSet.points.reduce(
                        (best, point) => {
                            const distance =
                                Math.sqrt(
                                    Math.pow(
                                        point.x - x,
                                        2
                                    ) +
                                    Math.pow(
                                        point.y - y,
                                        2
                                    )
                                );

                            if (
                                !best ||
                                distance < best.distance
                            ) {
                                return {
                                    ...point,
                                    distance
                                };
                            }

                            return best;
                        },
                        null
                    );

                if (nearest) {
                    energy +=
                        Math.pow(
                            10,
                            nearest.spl / 10
                        );
                }
            }

            const combinedSPL =
                energy > 0
                    ? 10 * Math.log10(energy)
                    : 0;

            merged.push({
                x,
                y,
                spl: combinedSPL,
                target: targetSPL,
                difference:
                    combinedSPL - targetSPL
            });
        }
    }

    const valid = merged.filter(
        p => Number.isFinite(p.spl)
    );

    const average =
        valid.length
            ? valid.reduce(
                (sum, p) => sum + p.spl,
                0
            ) / valid.length
            : 0;

    const minimum =
        valid.length
            ? Math.min(
                ...valid.map(p => p.spl)
            )
            : 0;

    const maximum =
        valid.length
            ? Math.max(
                ...valid.map(p => p.spl)
            )
            : 0;

    const withinTarget =
        valid.filter(
            p =>
                p.spl >= targetSPL - 6 &&
                p.spl <= targetSPL + 6
        ).length;

    const uniformity =
        valid.length
            ? withinTarget / valid.length * 100
            : 0;

    return {
        heatmap: merged,
        averageSPL: Number(average.toFixed(2)),
        minimumSPL: Number(minimum.toFixed(2)),
        maximumSPL: Number(maximum.toFixed(2)),
        uniformity: Number(
            uniformity.toFixed(2)
        ),
        targetSPL
    };
}

module.exports = {
    inverseSquareLoss,
    estimateSPL,
    directivityFactor,
    calculateSpeakerCoverage,
    analyzeDesign
};
