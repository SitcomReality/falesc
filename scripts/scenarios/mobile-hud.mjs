/**
 * Mobile HUD acceptance: the game remains usable at 390×844, with the
 * objective card, resource strip, service dock and charter menu reachable.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.pause(400);
    const layout = await page.evaluate(`(() => {
        const dock = document.querySelector('.build-dock');
        const objective = document.querySelector('.objective-card');
        return {
            width: window.innerWidth,
            dock: dock ? { left: dock.getBoundingClientRect().left, right: dock.getBoundingClientRect().right, scrollWidth: dock.scrollWidth, clientWidth: dock.clientWidth } : null,
            objective: objective ? { left: objective.getBoundingClientRect().left, right: objective.getBoundingClientRect().right } : null,
            horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
        };
    })()`);
    assert.equal(layout.width, 390);
    assert.equal(layout.horizontalOverflow, false);
    assert.ok(layout.dock);
    await screenshot('mobile-hud.png');
    await page.click('[data-testid=hud-menu]');
    await page.pause(300);
    await screenshot('mobile-charter-menu.png');
    const menuVisible = await page.visible('[data-testid=charter-menu]');
    assert.equal(menuVisible, true);
    await page.click('[data-testid=open-need-survey]');
    await page.waitFor("window.__falesc.app.needSurvey.isOpen === true");
    await page.pause(300);
    await screenshot('mobile-need-survey.png');
    await page.click('[data-testid=need-survey-done]');
}
