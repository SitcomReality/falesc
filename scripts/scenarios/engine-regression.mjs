/**
 * Engine regression: residents stay on the home shard while walking to doors,
 * the camera clamps to the world, the survey chart pans, and leaving during a
 * day playback cancels it cleanly.
 */
export default async function ({ page, assert, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.selectProgram('canteen');
        const cell = window.__falesc.findFreeCell('canteen');
        app.onWorldTap(cell.x, cell.y);
        app.finalizeBuild('Engine Canteen');
        app.buildModal.hide(false);
        return true;
    })()`);

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.evaluate("window.__falesc.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");

    const walkCheck = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const sector = app.world.homeSector;
        const bad = [];
        const seen = { walking: 0, inside: 0, visible: 0 };
        for (let step = 0; step <= 80; step++) {
            const clock = (app.playback.duration / 80) * step;
            app.crowd.updatePlayback(clock, 1 / 60);
            for (const agent of app.crowd.agents.values()) {
                if (agent.hidden) { seen.inside++; continue; }
                seen.visible++;
                if (agent.character.state === 'WALK') seen.walking++;
                const onLand = sector.containsPoint(agent.character.x, agent.character.y);
                if (!onLand) bad.push({ id: agent.resident.id, x: agent.character.x, y: agent.character.y, onLand });
            }
        }
        return { bad, seen };
    })()`);
    log(JSON.stringify(walkCheck));
    assert.equal(walkCheck.bad.length, 0, 'visible residents must stay on the home shard while walking');
    assert.ok(walkCheck.seen.walking + walkCheck.seen.inside > 0, 'playback should move or hide residents');

    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.evaluate("window.__falesc.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const moved = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const camera = app.world.camera;
        const before = { x: camera.position.x, y: camera.position.y };
        const canvas = document.querySelector('#minimap');
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            clientX: rect.left + rect.width * 0.18,
            clientY: rect.top + rect.height * 0.82
        }));
        return Math.hypot(camera.position.x - before.x, camera.position.y - before.y);
    })()`);
    log(`survey chart moved camera ${moved.toFixed(1)}px`);
    assert.ok(moved > 1, 'clicking the survey chart should move the camera');

    const camera = await page.evaluate(`(() => {
        const c = window.__falesc.app.world.camera;
        const bounds = window.__falesc.app.world.map.bounds;
        c.position.x = 1e9; c.position.y = -1e9; c.updateTransform();
        const far = { x: c.position.x, y: c.position.y };
        c.position.x = -1e9; c.position.y = 1e9; c.updateTransform();
        const near = { x: c.position.x, y: c.position.y };
        return { far, near, bounds };
    })()`);
    log(`camera clamp: far=(${camera.far.x.toFixed(0)},${camera.far.y.toFixed(0)}) near=(${camera.near.x.toFixed(0)},${camera.near.y.toFixed(0)})`);
    assert.ok(camera.far.x > camera.bounds.minX && camera.far.y < camera.bounds.maxY, 'camera should clamp to world');
    assert.ok(camera.near.x < camera.bounds.maxX && camera.near.y > camera.bounds.minY, 'camera should clamp to world');

    await page.evaluate("window.__falesc.app.screenStateMachine.setState('MENU')");
    await page.pause(2300);
    const stateAfter = await page.evaluate("window.__falesc.snapshot().state");
    log(`state after leaving the day playback: ${stateAfter}`);
    assert.equal(stateAfter, 'MENU');
}
