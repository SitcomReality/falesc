/**
 * Visual showcase: place one of each blueprint on the home island, mark them
 * active, and capture the illustrated buildings and HUD for design review.
 */
export default async function ({ page, screenshot, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v1')");
    await page.reload();
    await page.click('[data-testid=menu-start]');
    await page.waitFor("document.querySelector('[data-testid=lobby-screen]') !== null");
    await page.evaluate("(() => { const i = document.querySelector('[data-testid=lobby-seed]'); i.value='12345'; i.dispatchEvent(new Event('change',{bubbles:true})); return true; })()");
    await page.click('[data-testid=lobby-start]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");

    const placed = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.stateManager.lumen = 200;
        const ids = ['prism_rig', 'tide_garden', 'lantern_house', 'aurora_beacon'];
        const placed = [];
        for (const id of ids) {
            app.stateManager.actionsRemaining = 1;
            if (!app.selectBlueprint(id)) { placed.push({ id, error: 'select' }); continue; }
            const cell = window.__falesc.findFreeCell();
            app.onWorldTap(cell.x, cell.y);
            const result = app.finalizeBuild(id.replaceAll('_', ' '));
            app.buildModal.hide(false);
            placed.push({ id, result, cell });
        }
        for (const b of app.buildingManager.buildings) {
            b.state = 'ACTIVE';
            b.container.alpha = 1;
            b.updateGraphics();
        }
        app.stateManager.actionsRemaining = 1;
        app.stateManager.lumen = 42;
        app.stateManager.activeScreen.updateTurnDisplay(true);
        return { placed, buildings: app.buildingManager.buildings.map((b) => b.blueprintId) };
    })()`);
    log(JSON.stringify(placed));
    await page.pause(500);
    await screenshot('showcase.png');
}
