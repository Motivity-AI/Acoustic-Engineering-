/* ============================================================
   server/engine/geometry.js
   Shared geometry mathematics
   ============================================================ */

"use strict";

function calculateRoom(width, length, height) {
    const w = Number(width) || 0;
    const l = Number(length) || 0;
    const h = Number(height) || 0;

    const area = w * l;
    const volume = area * h;

    return {
        width: w,
        length: l,
        depth: l,
        height: h,
        area,
        volume,
        perimeter: 2 * (w + l),
        diagonal: Math.sqrt(w * w + l * l)
    };
}

function distance3D(a, b) {
    const dx = Number(a.x) - Number(b.x);
    const dy = Number(a.y) - Number(b.y);
    const dz = Number(a.z || 0) - Number(b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
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
    if (result < 0) result += 360;
    return result;
}

function bearing(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return normalizeAngle(Math.atan2(dy, dx) * 180 / Math.PI);
}

module.exports = {
    calculateRoom,
    distance3D,
    distance2D,
    clamp,
    degToRad,
    radToDeg,
    normalizeAngle,
    bearing
};