import * as PIXI from 'pixi.js';

export function generateShape(centerX, centerY, radius, rng) {
    // Create a smoother, less spiky island outline.
    // Steps:
    //   generate fewer base points with lowfrequency wobble
    //   clamp extreme radius deviations
    //   apply 2 passes of Chaikin smoothing to remove sharp corners / deep concaves

    const basePoints = 20 + rng.nextInt(0, 8); // slightly fewer points for simpler shapes
    const points = [];
    const aspect = 0.65; // isometric squash

    // Parameters to control wobble: low frequency, low amplitude
    const wobbleFreq = 1.2;
    const wobbleAmpFactor = 0.08; // fraction of radius
    const minRadiusFactor = 0.8; // Increased from 0.7 to ensure coverage
    const maxRadiusFactor = 1.2;

    for (let i = 0; i < basePoints; i++) {
        const angle = (i / basePoints) * Math.PI * 2;
        // Base radius with small random variation
        let r = radius * (minRadiusFactor + rng.next() * (maxRadiusFactor - minRadiusFactor));
        // Lowfrequency wobble
        const wobble = Math.sin(angle * wobbleFreq + rng.next() * Math.PI * 2) * radius * wobbleAmpFactor;
        r += wobble;

        // Clamp to prevent very deep concave or extreme spike
        const minR = radius * 0.7;
        const maxR = radius * 1.3;
        r = Math.max(minR, Math.min(maxR, r));

        points.push({ x: centerX + Math.cos(angle) * r, y: centerY + Math.sin(angle) * r * aspect });
    }

    // Chaikin smoothing function (subdivision)  preserves overall silhouette while softening corners
    const chaikin = (pts, iterations = 1) => {
        for (let iter = 0; iter < iterations; iter++) {
            const newPts = [];
            const n = pts.length;
            for (let i = 0; i < n; i++) {
                const p0 = pts[i];
                const p1 = pts[(i + 1) % n];
                // Q = 0.75*P0 + 0.25*P1, R = 0.25*P0 + 0.75*P1 (keeps shape tighter than equal split)
                const qx = p0.x * 0.75 + p1.x * 0.25;
                const qy = p0.y * 0.75 + p1.y * 0.25;
                const rx = p0.x * 0.25 + p1.x * 0.75;
                const ry = p0.y * 0.25 + p1.y * 0.75;
                newPts.push({ x: qx, y: qy });
                newPts.push({ x: rx, y: ry });
            }
            pts = newPts;
        }
        return pts;
    };

    // Apply two light smoothing passes
    let smooth = chaikin(points, 2);

    // Optionally reduce residual tiny spikes by clamping local curvature:
    // For each point, if it lies far outside the local average, pull it inward.
    const clampFactor = 0.18; // how strongly to clamp outliers (0=no clamp, 1=full clamp to avg)
    for (let i = 0; i < smooth.length; i++) {
        const prev = smooth[(i - 1 + smooth.length) % smooth.length];
        const next = smooth[(i + 1) % smooth.length];
        const avgX = (prev.x + next.x) / 2;
        const avgY = (prev.y + next.y) / 2;
        // Move the point slightly toward the local average to soften sharp protrusions
        smooth[i].x = smooth[i].x * (1 - clampFactor) + avgX * clampFactor;
        smooth[i].y = smooth[i].y * (1 - clampFactor) + avgY * clampFactor;
    }

    return smooth;
}