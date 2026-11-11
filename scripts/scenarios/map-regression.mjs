/**
 * Map packing regression: sample many seeds and assert the generated islands
 * do not intersect, stay inside their world rectangle, and are deterministic.
 */
export default async function ({ page, assert, log }) {
    const result = await page.evaluate(`(async () => {
        const { MapGenerator } = await import('/src/map/MapGenerator.js');
        const sizes = ['small', 'medium', 'large'];
        const expected = { small: 4, medium: 6, large: 7 };
        const failures = [];
        let tested = 0;
        let minGap = Infinity;

        const boundsOf = (shape) => {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of shape) {
                minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
            }
            return { minX, minY, maxX, maxY };
        };

        for (const size of sizes) {
            for (let i = 0; i < 24; i++) {
                const seed = i * 7919 + 123;
                const map = new MapGenerator(seed, size, 1280, 720);
                tested++;
                if (map.sectors.length !== expected[size]) {
                    failures.push({ seed, size, reason: 'sector count', got: map.sectors.length });
                }

                const boxes = map.sectors.map((sector) => boundsOf(sector.shape));
                for (let a = 0; a < boxes.length; a++) {
                    const A = boxes[a];
                    if (A.minX < map.bounds.minX - 0.01 || A.minY < map.bounds.minY - 0.01 ||
                        A.maxX > map.bounds.maxX + 0.01 || A.maxY > map.bounds.maxY + 0.01) {
                        failures.push({ seed, size, reason: 'outside world', sector: a });
                    }
                    for (let b = a + 1; b < boxes.length; b++) {
                        const B = boxes[b];
                        const gapX = Math.max(A.minX - B.maxX, B.minX - A.maxX);
                        const gapY = Math.max(A.minY - B.maxY, B.minY - A.maxY);
                        const gap = Math.max(gapX, gapY);
                        minGap = Math.min(minGap, gap);
                        if (gap < 0) {
                            failures.push({ seed, size, reason: 'AABB overlap', a, b, gap });
                        }
                    }
                }

                const repeat = new MapGenerator(seed, size, 1280, 720);
                for (let s = 0; s < map.sectors.length; s++) {
                    const a = map.sectors[s];
                    const b = repeat.sectors[s];
                    if (a.centerX !== b.centerX || a.centerY !== b.centerY || a.gridSize !== b.gridSize) {
                        failures.push({ seed, size, reason: 'non-deterministic layout', sector: s });
                        break;
                    }
                }
                map.destroy();
                repeat.destroy();
                if (failures.length > 20) break;
            }
        }

        return { tested, failures, minGap };
    })()`);

    log(`tested ${result.tested} maps; min inter-island gap ${result.minGap.toFixed(1)}px; failures ${result.failures.length}`);
    if (result.failures.length) log(JSON.stringify(result.failures.slice(0, 5)));
    assert.equal(result.failures.length, 0);
}
