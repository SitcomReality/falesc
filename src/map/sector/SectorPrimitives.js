/* Shared drawing primitives for the island renderer. */
import { P } from './SectorPalette.js';
export function hash(a, b, c) {
    const value = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
    return value - Math.floor(value);
}


export function boundsOf(points) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        if (point.x < minX) minX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.x > maxX) maxX = point.x;
        if (point.y > maxY) maxY = point.y;
    }
    return { minX, minY, maxX, maxY };
}


export function traceShape(g, shape, centerX, centerY, scale, offsetX, offsetY) {
    g.moveTo(
        centerX + (shape[0].x - centerX) * scale + offsetX,
        centerY + (shape[0].y - centerY) * scale + offsetY
    );
    for (let i = 1; i < shape.length; i++) {
        g.lineTo(
            centerX + (shape[i].x - centerX) * scale + offsetX,
            centerY + (shape[i].y - centerY) * scale + offsetY
        );
    }
    g.closePath();
}


export function polygon(g, points, color, alpha, edgeColor, edgeWidth) {
    g.beginFill(color, alpha === undefined ? 1 : alpha);
    if (edgeColor === undefined || edgeColor === null) {
        g.lineStyle(0);
    } else {
        g.lineStyle(edgeWidth === undefined ? 1 : edgeWidth, edgeColor, 0.6);
    }
    g.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        g.lineTo(points[i][0], points[i][1]);
    }
    g.closePath();
    g.endFill();
}


export function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x;
        const yi = points[i].y;
        const xj = points[j].x;
        const yj = points[j].y;
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}


export function ellipseFits(x, y, rx, ry, shape) {
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        if (!pointInPolygon(x + Math.cos(angle) * rx, y + Math.sin(angle) * ry, shape)) {
            return false;
        }
    }
    return true;
}


export function inGridDiamond(x, y, centerX, centerY, halfW, halfH, margin) {
    const dx = Math.abs(x - centerX) / Math.max(1, halfW * margin);
    const dy = Math.abs(y - centerY) / Math.max(1, halfH * margin);
    return dx + dy <= 1;
}


export function contactShadow(g, x, y, rx, ry, alpha) {
    g.beginFill(P.plumDeep, alpha === undefined ? 0.2 : alpha);
    g.lineStyle(0);
    g.drawEllipse(x, y, rx, ry);
    g.endFill();
}


export function frontArc(shape, bounds) {
    const midY = (bounds.minY + bounds.maxY) / 2;
    const points = [];
    for (let i = 0; i < shape.length; i++) {
        if (shape[i].y >= midY - 2) points.push(shape[i]);
    }
    if (points.length < 3) {
        return shape.slice().sort((a, b) => a.x - b.x);
    }
    points.sort((a, b) => a.x - b.x);
    return points;
}


export function fillBand(g, arc, depths, t0, t1, color, alpha) {
    g.beginFill(color, alpha);
    g.lineStyle(0);
    for (let i = 0; i < arc.length; i++) {
        const point = arc[i];
        const y = point.y + depths[i] * t0;
        if (i === 0) g.moveTo(point.x, y);
        else g.lineTo(point.x, y);
    }
    for (let i = arc.length - 1; i >= 0; i--) {
        const point = arc[i];
        g.lineTo(point.x, point.y + depths[i] * t1);
    }
    g.closePath();
    g.endFill();
}

