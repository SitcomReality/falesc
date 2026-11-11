/**
 * A door next to another chapter's door makes a more generous street: the
 * service gains a small quality bonus from its mixed neighbours.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.charter.player.lumen = 30;
        app.charter.works = 3;
        const charter = app.charter;
        for (const rival of charter.rivals) {
            for (const service of rival.services.services) {
                for (const cell of service.cells) {
                    for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const u = cell.u + du;
                        const v = cell.v + dv;
                        if (!charter.services.canPlace('canteen', rival.services.map.homeSector.id, u, v).ok) continue;
                        const result = charter.build({ programId: 'canteen', sectorId: rival.services.map.homeSector.id, u, v, name: 'Neighbour Canteen' });
                        if (!result.ok) continue;
                        return {
                            ok: true,
                            id: result.service.id,
                            bonus: result.service.adjacencyBonus,
                            neighbours: result.service.adjacencyNeighbours,
                            chapters: result.service.adjacencyChapters,
                            rivalId: rival.id
                        };
                    }
                }
            }
        }
        return { ok: false };
    })()`);
    log(JSON.stringify({ built }));
    assert.equal(built.ok, true, 'a free cell beside a rival service should exist');
    assert.ok(built.bonus >= 0.04, 'a mixed neighbour adds the chapter bonus');
    assert.ok(built.neighbours >= 1);
    assert.ok(built.chapters.includes(built.rivalId));
    await page.evaluate(`(() => { const app = window.__falesc.app; const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)}); app.serviceCard.show(service); })()`);
    await page.waitFor("window.__falesc.app.serviceCard.isOpen === true");
    const card = await page.text('[data-testid=structure-modal]');
    assert.ok(card.includes('Neighbours'));
    await page.pause(300);
    await screenshot('service-adjacency-card.png');
    await page.click('[data-testid=structure-close]');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate(`(() => { const service = window.__falesc.app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)}); return { bonus: service?.adjacencyBonus, neighbours: service?.adjacencyNeighbours }; })()`);
    assert.equal(restored.bonus, built.bonus);
    assert.equal(restored.neighbours, built.neighbours);
    await page.pause(400);
}
