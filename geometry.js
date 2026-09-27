function calculateRoom(width, length, height) {
    const area = Number(width) * Number(length);
    const volume = area * Number(height);

    return {
        width: Number(width),
        length: Number(length),
        height: Number(height),
        area,
        volume
    };
}

function distance3D(a, b) {
    const dx = Number(a.x) - Number(b.x);
    const dy = Number(a.y) - Number(b.y);
    const dz = Number(a.z || 0) - Number(b.z || 0);

    return Math.sqrt(
        dx * dx +
        dy * dy +
        dz * dz
    );
}

function distance2D(a, b) {
    const dx = Number(a.x) - Number(b.x);
    const dy = Number(a.y) - Number(b.y);

    return Math.sqrt(dx * dx + dy * dy);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

function radToDeg(radians) {
    return radians * 180 / Math.PI;
}

function normalizeAngle(angle) {
    let result = Number(angle) % 360;

    if (result < 0) {
        result += 360;
    }

    return result;
}

module.exports = {
    calculateRoom,
    distance3D,
    distance2D,
    clamp,
    degToRad,
    radToDeg,
    normalizeAngle
};