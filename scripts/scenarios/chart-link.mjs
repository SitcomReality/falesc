/**
 * A chart link carries seed, size and mode into the lobby; the lobby can copy it.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.evaluate("history.replaceState(null, '', '/?seed=4242&size=large&mode=contest&name=The%20Long%20Table&motto=Every%20door%20open.')");
    await page.reload();
    await page.click('[data-testid=menu-start]');
    await page.waitFor("window.__falesc.snapshot().state === 'LOBBY'");
    const loaded = await page.evaluate("({ seed: document.querySelector('[data-testid=lobby-seed]').value, size: document.querySelector('[data-testid=lobby-size]').value, mode: document.querySelector('[data-testid=lobby-mode]').value })");
    assert.equal(loaded.seed, '4242');
    assert.equal(loaded.size, 'large');
    assert.equal(loaded.mode, 'contest');
    assert.equal(await page.evaluate("document.querySelector('[data-testid=lobby-chapter-name]').value"), 'The Long Table');
    assert.equal(await page.evaluate("document.querySelector('[data-testid=lobby-chapter-motto]').value"), 'Every door open.');
    await page.evaluate(`(() => {
        window.__copiedChart = null;
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.__copiedChart = text; } } });
    })()`);
    await page.pause(300);
    await screenshot('chart-link-lobby.png');
    await page.click('[data-testid=lobby-share]');
    await page.waitFor("window.__copiedChart !== null");
    const copied = await page.evaluate("window.__copiedChart");
    assert.ok(copied.includes('seed=4242'));
    assert.ok(copied.includes('size=large'));
    assert.ok(copied.includes('mode=contest'));
    assert.ok(copied.includes('name=The+Long+Table') || copied.includes('name=The%20Long%20Table'));
    assert.ok(copied.includes('motto=Every+door+open.') || copied.includes('motto=Every%20door%20open.'));
    assert.ok((await page.text('[data-role=share-status]')).includes('copied'));
}
