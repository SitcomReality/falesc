/**
 * The charter can be signed under a chosen chapter name, kept in saves.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.click('[data-testid=menu-start]');
    await page.waitFor("window.__falesc.snapshot().state === 'LOBBY'");
    await page.evaluate(`(() => {
        const input = document.querySelector('[data-testid=lobby-chapter-name]');
        input.value = 'The Long Table';
        input.dispatchEvent(new Event('change', { bubbles: true }));
        const motto = document.querySelector('[data-testid=lobby-chapter-motto]');
        motto.value = 'Every door open.';
        motto.dispatchEvent(new Event('change', { bubbles: true }));
        return input.value;
    })()`);
    await page.pause(300);
    await screenshot('chapter-name-lobby.png');
    await page.click('[data-testid=lobby-start]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const named = await page.evaluate("window.__falesc.snapshot().chapters.find((chapter) => chapter.isPlayer).name");
    assert.equal(named, 'The Long Table');
    assert.equal(await page.evaluate("window.__falesc.app.charter.motto"), 'Every door open.');
    assert.equal(await page.text('[data-role=objective-motto]'), 'Every door open.');
    await page.pause(300);
    await screenshot('charter-motto-hud.png');
    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate("window.__falesc.snapshot().chapters.find((chapter) => chapter.isPlayer).name");
    assert.equal(restored, 'The Long Table');
    assert.equal(await page.evaluate("window.__falesc.app.charter.motto"), 'Every door open.');
    assert.equal(await page.text('[data-role=objective-motto]'), 'Every door open.');
}
