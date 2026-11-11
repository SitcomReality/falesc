export function drawSectorGraphics(graphics, shape, centerX, centerY, gridSize, tileWidth, tileHeight) {
    graphics.clear();
    if (!shape || shape.length === 0) return;

    const depth = 54;
    const shadowOffset = { x: 24, y: 42 };
    const foam = 0x59e3c2;
    const foamLight = 0xa8f5dc;
    const sand = 0xffe8bd;
    const sandLight = 0xfff5d8;
    const sandWarm = 0xf0c98f;
    const cliff = 0x7d2148;
    const cliffDark = 0x3a163c;
    const ink = 0x5b3a3d;

    const trace = (offsetX = 0, offsetY = 0, scale = 1) => {
        graphics.moveTo(
            centerX + (shape[0].x - centerX) * scale + offsetX,
            centerY + (shape[0].y - centerY) * scale + offsetY
        );
        for (let i = 1; i < shape.length; i++) {
            graphics.lineTo(
                centerX + (shape[i].x - centerX) * scale + offsetX,
                centerY + (shape[i].y - centerY) * scale + offsetY
            );
        }
        graphics.closePath();
    };

    // 1. A soft drop shadow in the water, offset toward the light direction.
    graphics.beginFill(0x1c0d24, 0.24);
    graphics.lineStyle(0);
    trace(shadowOffset.x, shadowOffset.y, 1.01);
    graphics.endFill();

    // 2. Foam halo: stacked strokes give the island a wet, living edge.
    graphics.lineStyle(26, foam, 0.1);
    trace(0, 6, 1.05);
    graphics.lineStyle(14, foamLight, 0.16);
    trace(0, 3, 1.025);
    graphics.lineStyle(5, 0xffffff, 0.26);
    trace(0, 1, 1.008);

    // 3. Cliff/underside: bottom lid plus walls.
    graphics.beginFill(cliffDark, 1);
    graphics.lineStyle(0);
    trace(0, depth + 14, 0.985);
    graphics.endFill();

    graphics.beginFill(cliff, 1);
    graphics.lineStyle(0);
    for (let i = 0; i < shape.length; i++) {
        const curr = shape[i];
        const next = shape[(i + 1) % shape.length];
        graphics.moveTo(curr.x, curr.y + 2);
        graphics.lineTo(next.x, next.y + 2);
        graphics.lineTo(next.x, next.y + depth);
        graphics.lineTo(curr.x, curr.y + depth);
    }
    graphics.endFill();

    // A lighter lip at the top of the cliff catches the sunset.
    graphics.lineStyle(5, 0xd85763, 0.65);
    trace(0, 4, 1.0);
    graphics.lineStyle(0);

    // 4. Sand top.
    graphics.beginFill(sand, 1);
    graphics.lineStyle(3, ink, 0.55);
    trace(0, 0, 1);
    graphics.endFill();

    // Sun-bleached inner plateau; no outline so it reads as a soft grade.
    graphics.beginFill(sandLight, 0.42);
    graphics.lineStyle(0);
    trace(-6, -10, 0.86);
    graphics.endFill();

    // A warm scrape near the cliff edge.
    graphics.beginFill(sandWarm, 0.28);
    graphics.lineStyle(0);
    trace(10, 14, 0.94);
    graphics.endFill();

    // 5. A coral beach line just inside the coast.
    graphics.lineStyle(2, 0xff8f7f, 0.32);
    trace(0, -4, 0.965);
    graphics.lineStyle(0);

    // 6. Build grid: warm ink, not graph paper. Corner brackets frame it.
    drawGrid(graphics, centerX, centerY, gridSize, tileWidth, tileHeight);

    // 7. Shore dressing outside the grid.
    dressShore(graphics, shape, centerX, centerY, gridSize, tileWidth, tileHeight);
}

function drawGrid(graphics, centerX, centerY, gridSize, tileWidth, tileHeight) {
    const N = gridSize;
    const halfW = tileWidth / 2;
    const halfH = tileHeight / 2;
    const lineColor = 0x7d5a44;
    const alpha = 0.32;

    graphics.lineStyle(1.5, lineColor, alpha);

    const project = (u, v) => {
        const cu = u - N / 2;
        const cv = v - N / 2;
        return {
            x: centerX + (cu - cv) * halfW,
            y: centerY + (cu + cv) * halfH
        };
    };

    for (let v = 0; v <= N; v++) {
        const start = project(0, v);
        const end = project(N, v);
        graphics.moveTo(start.x, start.y);
        graphics.lineTo(end.x, end.y);
    }
    for (let u = 0; u <= N; u++) {
        const start = project(u, 0);
        const end = project(u, N);
        graphics.moveTo(start.x, start.y);
        graphics.lineTo(end.x, end.y);
    }

    // Boundary has a slightly stronger line and little corner ticks.
    const corners = [project(0, 0), project(N, 0), project(N, N), project(0, N)];
    graphics.lineStyle(2, 0x5b3a3d, 0.42);
    graphics.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) graphics.lineTo(corners[i].x, corners[i].y);
    graphics.closePath();

    graphics.lineStyle(2.5, 0x7d5a44, 0.5);
    for (let i = 0; i < corners.length; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % 4];
        const tx = (b.x - a.x) * 0.08;
        const ty = (b.y - a.y) * 0.08;
        graphics.moveTo(a.x - tx, a.y - ty);
        graphics.lineTo(a.x + tx, a.y + ty);
    }

    // A small cardinal diamond at the centre of the buildable area.
    const c = project(N / 2, N / 2);
    graphics.lineStyle(1.5, 0x7d5a44, 0.34);
    graphics.moveTo(c.x, c.y - 14);
    graphics.lineTo(c.x + 22, c.y);
    graphics.lineTo(c.x, c.y + 14);
    graphics.lineTo(c.x - 22, c.y);
    graphics.closePath();
    graphics.moveTo(c.x, c.y - 7);
    graphics.lineTo(c.x, c.y + 7);
}

function hash(a, b, c) {
    let value = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
    return value - Math.floor(value);
}

function dressShore(graphics, shape, centerX, centerY, gridSize, tileWidth, tileHeight) {
    const count = shape.length;
    const gridHalf = (gridSize * tileWidth) / 2;
    const innerRadius = gridHalf * 0.95;
    const props = [];

    for (let i = 0; i < count; i += 2) {
        const point = shape[i];
        const towardCenter = 0.1 + hash(centerX, i, 1) * 0.14;
        const x = point.x + (centerX - point.x) * towardCenter;
        const y = point.y + (centerY - point.y) * towardCenter;
        const dist = Math.hypot(x - centerX, y - centerY * 1.0);
        if (dist < innerRadius * 0.8) continue;
        props.push({ x, y, roll: hash(centerX + i, centerY, 7), i });
    }

    // A few palms, always outside the buildable grid.
    for (const prop of props.filter((entry) => entry.roll > 0.8).slice(0, 4)) {
        drawPalm(graphics, prop.x, prop.y, 0.7 + prop.roll * 0.5, prop.i);
    }

    for (const prop of props) {
        const roll = prop.roll;
        if (roll > 0.8) continue;
        if (roll > 0.58) {
            drawGrass(graphics, prop.x, prop.y, 0.7 + roll * 0.5);
        } else if (roll > 0.42) {
            drawPebble(graphics, prop.x, prop.y, 0.8 + roll * 0.5);
        } else if (roll > 0.28) {
            drawFlower(graphics, prop.x, prop.y, roll);
        }
    }
}

function drawPalm(graphics, x, y, scale, seed) {
    const height = 108 * scale;
    const lean = (hash(seed, 2, 4) - 0.5) * 34 * scale;

    // Shadow on the sand.
    graphics.beginFill(0x6b4a3a, 0.18);
    graphics.lineStyle(0);
    graphics.drawEllipse(x + 16 * scale, y + 6, 32 * scale, 10 * scale);
    graphics.endFill();

    // Trunk.
    graphics.lineStyle(9 * scale, 0x5b3a3d, 0.95);
    graphics.moveTo(x, y);
    graphics.quadraticCurveTo(x + lean * 0.3, y - height * 0.55, x + lean, y - height);
    graphics.lineStyle(5 * scale, 0xc98b55, 1);
    graphics.moveTo(x, y);
    graphics.quadraticCurveTo(x + lean * 0.3, y - height * 0.55, x + lean, y - height);

    // Fronds.
    const topX = x + lean;
    const topY = y - height;
    const fronds = [
        { dx: -52, dy: -18, sway: -8 },
        { dx: -34, dy: -42, sway: 6 },
        { dx: 4, dy: -52, sway: 12 },
        { dx: 42, dy: -38, sway: 8 },
        { dx: 54, dy: -12, sway: 4 },
        { dx: 20, dy: 2, sway: -6 }
    ];
    for (const frond of fronds) {
        graphics.lineStyle(4 * scale, 0x2c1134, 0.75);
        graphics.moveTo(topX, topY);
        graphics.quadraticCurveTo(
            topX + frond.dx * 0.55 * scale,
            topY + frond.dy * 0.45 * scale + frond.sway,
            topX + frond.dx * scale,
            topY + frond.dy * scale
        );
        graphics.lineStyle(8 * scale, 0x2f9e7f, 1);
        graphics.moveTo(topX, topY);
        graphics.quadraticCurveTo(
            topX + frond.dx * 0.55 * scale,
            topY + frond.dy * 0.45 * scale + frond.sway,
            topX + frond.dx * scale,
            topY + frond.dy * scale
        );
        graphics.lineStyle(3 * scale, 0x59e3c2, 0.85);
        graphics.moveTo(topX, topY);
        graphics.quadraticCurveTo(
            topX + frond.dx * 0.55 * scale,
            topY + frond.dy * 0.45 * scale - 2,
            topX + frond.dx * scale,
            topY + frond.dy * scale - 2
        );
    }

    // Coconut cluster.
    graphics.beginFill(0x6b3f2a, 1);
    graphics.lineStyle(1.5, 0x2c1134, 0.9);
    graphics.drawCircle(topX - 4, topY + 6, 4.5);
    graphics.drawCircle(topX + 6, topY + 8, 4);
    graphics.endFill();
}

function drawGrass(graphics, x, y, scale) {
    graphics.lineStyle(2.5, 0x2f9e7f, 0.9);
    const blades = [
        [-8, -18], [-3, -24], [4, -20], [9, -14]
    ];
    for (const [dx, dy] of blades) {
        graphics.moveTo(x, y);
        graphics.quadraticCurveTo(x + dx * 0.4 * scale, y + dy * 0.6 * scale, x + dx * scale, y + dy * scale);
    }
    graphics.lineStyle(1.5, 0x59e3c2, 0.6);
    graphics.moveTo(x, y);
    graphics.quadraticCurveTo(x + 3, y - 12, x + 9, y - 22);
}

function drawPebble(graphics, x, y, scale) {
    graphics.beginFill(0x8e6b63, 0.9);
    graphics.lineStyle(1.5, 0x5b3a3d, 0.9);
    graphics.drawEllipse(x, y, 9 * scale, 5 * scale);
    graphics.endFill();
    graphics.beginFill(0xfff2d8, 0.3);
    graphics.lineStyle(0);
    graphics.drawEllipse(x - 2, y - 2, 4 * scale, 2 * scale);
    graphics.endFill();
}

function drawFlower(graphics, x, y, roll) {
    const colors = [0xff4f9a, 0xffd36e, 0xc9b6ff];
    const color = colors[Math.floor(roll * colors.length) % colors.length];
    graphics.lineStyle(1.5, 0x2f9e7f, 0.8);
    graphics.moveTo(x, y);
    graphics.lineTo(x, y - 9);
    graphics.beginFill(color, 0.95);
    graphics.lineStyle(1, 0x5b3a3d, 0.8);
    graphics.drawCircle(x, y - 11, 4);
    graphics.endFill();
    graphics.beginFill(0xfff8ea, 1);
    graphics.lineStyle(0);
    graphics.drawCircle(x, y - 11, 1.5);
    graphics.endFill();
}
