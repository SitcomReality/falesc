/**
 * Three connected services become a named district with a small shared quality
 * bonus, shown in every member's service record.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.charter.player.lumen = 60;
        app.charter.works = 4;
        const sector = app.world.homeSector;
        const programs = ['canteen', 'tea_house', 'canteen'];
        for (let v = 0; v < sector.gridSize; v++) {
            for (let u = 0; u + 2 < sector.gridSize; u++) {
                const cells = programs.map((programId, index) => ({ programId, u: u + index, v }));
                if (!cells.every((cell) => app.charter.services.canPlace(cell.programId, sector.id, cell.u, cell.v).ok)) continue;
                const built = [];
                for (const cell of cells) {
                    const result = app.charter.build({ programId: cell.programId, sectorId: sector.id, u: cell.u, v: cell.v, name: cell.programId === 'tea_house' ? 'District Tea' : 'District Canteen' });
                    if (!result.ok) return { ok: false, reason: result.reason };
                    built.push(result.service);
                }
                app.syncViews();
                const sample = built[0];
                return { ok: true, ids: built.map((service) => service.id), district: sample.districtName, size: sample.districtSize, bonus: sample.districtBonus };
            }
        }
        return { ok: false, reason: 'no contiguous row for three services' };
    })()`);
    log(JSON.stringify({ built }));
    assert.equal(built.ok, true, built.reason);
    assert.ok(built.district, 'a district should be named');
    assert.ok(built.size >= 3);
    assert.ok(built.bonus >= 0.02);
    await page.evaluate(`(() => { const app = window.__falesc.app; const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.ids[0])}); app.serviceCard.show(service); })()`);
    await page.waitFor("window.__falesc.app.serviceCard.isOpen === true");
    const card = await page.text('[data-testid=structure-modal]');
    assert.ok(card.includes('District'));
    assert.ok(card.includes(built.district));
    await page.pause(300);
    await screenshot('service-district-card.png');
    await page.click('[data-testid=structure-close]');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate(`(() => { const service = window.__falesc.app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.ids[0])}); return { district: service?.districtName, size: service?.districtSize, bonus: service?.districtBonus }; })()`);
    assert.equal(restored.district, built.district);
    assert.ok(restored.size >= 3);
    assert.equal(restored.bonus, built.bonus);
    await page.pause(400);
}
