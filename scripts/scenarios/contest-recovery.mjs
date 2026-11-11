/**
 * Rival recovery: a service lost to an upkeep shortfall is reopened by the
 * rival AI when it can afford the reopen cost, and the next day it builds
 * again from need pressure.
 */
export default async function ({ page, assert, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const closed = await page.evaluate(`(() => {
        const rival = window.__falesc.app.charter.rivals[0];
        const service = rival.services.services.find((entry) => entry.programId === 'garden_dome');
        service.close();
        rival.lumen = 10;
        return { id: service.id, closed: service.closed, lumen: rival.lumen };
    })()`);
    assert.ok(closed.closed, 'the Garden Dome should start closed for the test');

    await page.evaluate("window.__falesc.app.charter.beginNextDay()");
    const afterReopen = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const rival = app.charter.rivals[0];
        const service = rival.services.services.find((entry) => entry.programId === 'garden_dome');
        return {
            closed: service.closed,
            state: service.state,
            move: app.charter.lastRivalMoves.find((entry) => entry.chapterId === rival.id),
            lumen: rival.lumen,
            day: app.charter.day
        };
    })()`);
    log(JSON.stringify({ afterReopen }));
    assert.equal(afterReopen.closed, false, 'the rival should reopen its closed service');
    assert.equal(afterReopen.move.action, 'reopened');

    await page.evaluate("window.__falesc.app.charter.beginNextDay()");
    const next = await page.evaluate("window.__falesc.snapshot()");
    const moves = await page.evaluate("window.__falesc.app.charter.lastRivalMoves");
    log(JSON.stringify({ next: { day: next.day, rivalMoves: moves, services: next.allServices } }));
    assert.ok(next.chapters.length === 3);
    assert.ok(moves.length > 0, 'rivals should resume building after recovery');
    await page.pause(400);
}
