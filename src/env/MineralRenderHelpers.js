import * as PIXI from 'pixi.js';

// --- CRYSTAL HELPERS ---

function buildCrystalShardPoints(opts) {
    const {
        x = 0,        // local x offset inside cluster
        baseY = 0,    // normally 0
        baseWidth,    // ~0.4–0.9
        height,       // ~1.5–4.0
        taper,        // 0.4–0.8
        lean,         // -0.2..0.2 (top horizontal shift)
    } = opts;

    const h  = height;
    const bw = baseWidth;
    const tw = bw * taper;

    const topX = x + lean * h;
    const baseLeft  = x - bw / 2;
    const baseRight = x + bw / 2;
    const topLeft   = topX - tw / 2;
    const topRight  = topX + tw / 2;

    const BL  = { x: baseLeft,  y: baseY };
    const BR  = { x: baseRight, y: baseY };
    const TL1 = { x: topLeft  - bw * 0.10, y: baseY - h * 0.35 };
    const TR1 = { x: topRight + bw * 0.10, y: baseY - h * 0.45 };
    const TL2 = { x: topLeft,  y: baseY - h };
    const TR2 = { x: topRight, y: baseY - h * 0.95 };

    const silhouette = [BL, TL1, TL2, TR2, TR1, BR];

    // Light facet along left edge
    const lightFacet = [BL, TL1, TL2, { x: (topX + topLeft) / 2, y: baseY - h * 0.85 }];

    // Dark facet along right edge
    const darkFacet = [
        BR, TR1, TR2,
        { x: (topX + topRight) / 2, y: baseY - h * 0.7 },
    ];

    return { silhouette, lightFacet, darkFacet };
}

function drawCrystalShard(g, palette, opts) {
    const { silhouette, lightFacet, darkFacet } = buildCrystalShardPoints(opts);

    // Outer silhouette with outline + mid fill
    g.lineStyle(2, palette.outline, 1, 0.5); 
    g.beginFill(palette.mid);

    g.moveTo(silhouette[0].x, silhouette[0].y);
    for (let i = 1; i < silhouette.length; i++) {
        g.lineTo(silhouette[i].x, silhouette[i].y);
    }
    g.closePath();
    g.endFill();

    // Light facet
    g.lineStyle(0);
    g.beginFill(palette.light);
    g.moveTo(lightFacet[0].x, lightFacet[0].y);
    for (let i = 1; i < lightFacet.length; i++) {
        g.lineTo(lightFacet[i].x, lightFacet[i].y);
    }
    g.closePath();
    g.endFill();

    // Dark facet
    g.beginFill(palette.dark);
    g.moveTo(darkFacet[0].x, darkFacet[0].y);
    for (let i = 1; i < darkFacet.length; i++) {
        g.lineTo(darkFacet[i].x, darkFacet[i].y);
    }
    g.closePath();
    g.endFill();

    // Optional: thin highlight line on the lit edge
    g.lineStyle(1.2, 0xffffff, 0.35, 0.5);
    g.moveTo(lightFacet[1].x, lightFacet[1].y);
    g.lineTo(lightFacet[2].x, lightFacet[2].y);
}

export function drawCrystalClusterBody(bodyG, palette, params, rng) {
    const {
        numMainShards = 3,
        numSmallShards = 5,
        baseRadius = 0.7,
        heightRange = [2.0, 4.0],
        leanRange = [-0.15, 0.15],
        taperRange = [0.4, 0.75],
    } = params;

    const shards = [];

    const spawnShard = (radiusScale, heightScale, jitterY = 0) => {
        const angle = rng.range(-Math.PI * 0.12, Math.PI * 0.12); // slight fan
        const dist  = baseRadius * radiusScale;
        const x     = Math.cos(angle) * dist;
        const y     = jitterY;

        const height = rng.range(heightRange[0], heightRange[1]) * heightScale;
        const baseWidth = height * rng.range(0.18, 0.32);
        const taper = rng.range(taperRange[0], taperRange[1]);
        const lean  = rng.range(leanRange[0], leanRange[1]);

        shards.push({
            baseY: y,
            drawOpts: { x, baseY: y, baseWidth, height, taper, lean },
        });
    };

    for (let i = 0; i < numMainShards; i++) {
        spawnShard(1 + rng.range(-0.2, 0.2), 1 + rng.range(-0.15, 0.25), rng.range(-0.1, 0.1));
    }
    for (let i = 0; i < numSmallShards; i++) {
        spawnShard(0.4 + rng.range(-0.3, 0.3), 0.4 + rng.range(-0.3, 0.2), rng.range(0.0, 0.15));
    }

    // draw back-to-front by baseY
    shards.sort((a, b) => a.baseY - b.baseY);

    for (const s of shards) {
        drawCrystalShard(bodyG, palette, s.drawOpts);
    }
}

// --- ROCK HELPERS ---

function buildRockChunkPoints(opts) {
    const {
        x = 0,
        baseY = 0,
        width,     // ~1.0–2.2
        height,    // ~0.8–1.6
        tilt = 0,  // slight horizontal lean
        roughness = 0.3,
    } = opts;

    const w = width;
    const h = height;

    const baseLeft  = x - w / 2;
    const baseRight = x + w / 2;

    // top ridge is shifted by tilt
    const topX = x + tilt * h;
    const topY = baseY - h;

    const TL = {
        x: topX - w * (0.25 + roughness * 0.3),
        y: topY + h * (0.12 * roughness),
    };
    const TM = {
        x: topX,
        y: topY,
    };
    const TR = {
        x: topX + w * (0.28 + roughness * 0.25),
        y: topY + h * (0.18 * roughness),
    };

    // mid “shoulders”
    const ML = {
        x: baseLeft + w * (0.15 + roughness * 0.15),
        y: baseY - h * (0.5 + roughness * 0.2),
    };
    const MR = {
        x: baseRight - w * (0.18 + roughness * 0.2),
        y: baseY - h * (0.4 + roughness * 0.2),
    };

    const BL = { x: baseLeft,  y: baseY };
    const BR = { x: baseRight, y: baseY };

    const silhouette = [BL, ML, TL, TM, TR, MR, BR];

    // Light facet (left plane)
    const lightFacet = [BL, ML, TL, TM];

    // Dark facet (right plane)
    const darkFacet = [TM, TR, MR, BR];

    return { silhouette, lightFacet, darkFacet };
}

function drawRockChunk(g, palette, opts) {
    const { silhouette, lightFacet, darkFacet } = buildRockChunkPoints(opts);

    // Outer silhouette
    g.lineStyle(2, palette.outline, 1, 0.5);
    g.beginFill(palette.mid);
    g.moveTo(silhouette[0].x, silhouette[0].y);
    for (let i = 1; i < silhouette.length; i++) {
        g.lineTo(silhouette[i].x, silhouette[i].y);
    }
    g.closePath();
    g.endFill();

    // Light face
    g.lineStyle(0);
    g.beginFill(palette.light);
    g.moveTo(lightFacet[0].x, lightFacet[0].y);
    for (let i = 1; i < lightFacet.length; i++) {
        g.lineTo(lightFacet[i].x, lightFacet[i].y);
    }
    g.closePath();
    g.endFill();

    // Dark face
    g.beginFill(palette.dark);
    g.moveTo(darkFacet[0].x, darkFacet[0].y);
    for (let i = 1; i < darkFacet.length; i++) {
        g.lineTo(darkFacet[i].x, darkFacet[i].y);
    }
    g.closePath();
    g.endFill();

    // Optional cracks
    g.lineStyle(1.2, palette.dark, 0.5, 0.5);
    g.moveTo(lightFacet[1].x, lightFacet[1].y);
    g.lineTo(lightFacet[2].x, lightFacet[2].y);
}

export function drawRockClusterBody(bodyG, palette, params, rng) {
    const {
        numLargeChunks = 2,
        numSmallChunks = 4,
        baseRadius = 1.2,
        widthRange = [1.0, 2.0],
        heightRange = [0.8, 1.4],
    } = params;

    const chunks = [];

    const spawnChunk = (radiusScale, sizeScale) => {
        const angle = rng.range(-Math.PI * 0.12, Math.PI * 0.12);
        const dist  = baseRadius * radiusScale;
        const x     = Math.cos(angle) * dist;
        const y     = rng.range(-0.05, 0.05); // slight staggering

        const height = rng.range(heightRange[0], heightRange[1]) * sizeScale;
        const width  = rng.range(widthRange[0], widthRange[1]) * sizeScale;
        const tilt   = rng.range(-0.15, 0.15);
        const rough  = rng.range(0.15, 0.45);

        chunks.push({
            baseY: y,
            drawOpts: { x, baseY: y, width, height, tilt, roughness: rough },
        });
    };

    for (let i = 0; i < numLargeChunks; i++) {
        spawnChunk(1 + rng.range(-0.2, 0.2), 1 + rng.range(-0.2, 0.2));
    }
    for (let i = 0; i < numSmallChunks; i++) {
        spawnChunk(0.4 + rng.range(-0.25, 0.25), 0.4 + rng.range(-0.3, 0.1));
    }

    chunks.sort((a, b) => a.baseY - b.baseY);
    for (const c of chunks) {
        drawRockChunk(bodyG, palette, c.drawOpts);
    }
}

// --- SHADOW HELPERS ---

export function drawShadowEllipse(shadowG, palette, approxRadius) {
    shadowG.clear();
    shadowG.beginFill(palette.shadow, 0.35);
    shadowG.drawEllipse(0, 0, approxRadius, approxRadius * 0.45);
    shadowG.endFill();
}