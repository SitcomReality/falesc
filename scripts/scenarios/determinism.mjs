/**
 * Determinism check: the same seed must generate the same islands, character
 * palettes/proportions, mineral variations, and spawn points across reloads.
 */
export default async function ({ page, assert, log }) {
    async function loadWorld(seed) {
        await page.evaluate("localStorage.removeItem('falesc.save.v1')");
        await page.reload();
        await page.click('[data-testid=menu-start]');
        await page.waitFor("document.querySelector('[data-testid=lobby-screen]') !== null");
        await page.evaluate(`(() => { const i = document.querySelector('[data-testid=lobby-seed]'); i.value='${seed}'; i.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
        await page.click('[data-testid=lobby-start]');
        await page.waitFor("window.__falesc.snapshot().state === 'PLAYING' && window.__falesc.snapshot().sectors > 0");
        return page.evaluate(`(() => {
            const g = window.__falesc.app;
            return {
                sectors: g.map.sectors.map((s) => ({ x: s.centerX, y: s.centerY, size: s.gridSize, shape: s.shape.map((p) => [p.x.toFixed(2), p.y.toFixed(2)]) })),
                characters: g.characters.map((c) => ({ palette: c.colors.name, variations: c.variations })),
                minerals: g.minerals.map((m) => ({ x: m.x.toFixed(2), y: m.y.toFixed(2), palette: m.paletteId, variation: m.variation }))
            };
        })()`);
    }

    const first = await loadWorld(777123);
    const second = await loadWorld(777123);
    const a = JSON.stringify(first);
    const b = JSON.stringify(second);
    log(`generated ${first.sectors.length} sectors, ${first.characters.length} characters, ${first.minerals.length} minerals twice`);
    if (a !== b) {
        let index = 0;
        while (index < a.length && a[index] === b[index]) index++;
        log(`first difference at ${index}: ...${a.slice(Math.max(0, index - 80), index + 120)}... vs ...${b.slice(Math.max(0, index - 80), index + 120)}...`);
    }
    assert.equal(a, b, 'same seed must produce the same generated world');
}
