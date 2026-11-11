/**
 * Campaign: the final days open with rival promises and a player promise; the
 * promise is locked into the Confluence screen and the final vote.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    // Play the day before the campaign window, then cross into the campaign
    // through the real report-to-next-day flow.
    await page.evaluate("window.__falesc.app.charter.day = window.__falesc.app.charter.dayLimit - 3");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.click('[data-testid=report-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.waitFor("window.__falesc.app.campaignModal.isOpen === true");
    const opened = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ opened: { day: opened.day, campaign: opened.campaign } }));
    assert.equal(opened.campaign.startedDay, 12);
    assert.ok(Object.keys(opened.campaign.rivalPledges).length === 2, 'both rivals should publish a promise');
    assert.ok(await page.visible('[data-testid=campaign-modal]'));
    await screenshot('campaign-modal.png');

    await page.evaluate("document.querySelector('[data-testid=campaign-pledge-wonder]').click()");
    await page.click('[data-testid=campaign-confirm]');
    await page.waitFor("window.__falesc.app.campaignModal.isOpen === false");
    const chosen = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(chosen.campaign.playerPledge, 'wonder');
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const campaignLabel = await page.text('[data-role=campaign-name]');
    assert.ok(campaignLabel.includes('garden'), 'the HUD should show the chosen promise');
    await screenshot('campaign.png');
    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restoredCampaign = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(restoredCampaign.campaign.playerPledge, 'wonder', 'the campaign promise should survive a reload');

    // The bulletin carries the campaign item.
    await page.evaluate("window.__falesc.showBulletin()");
    const bulletin = await page.text('[data-testid=bulletin-modal]');
    assert.ok(bulletin.includes('Campaign'), 'the bulletin should carry the campaign');
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    // Jump to the limit and convene the vote with the campaign promise locked.
    await page.evaluate("window.__falesc.app.charter.day = window.__falesc.app.charter.dayLimit");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.click('[data-testid=report-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'CONFLUENCE'");
    const locked = await page.evaluate("(() => ({ disabled: document.querySelector('[data-testid=pledge-wonder]').disabled, checked: document.querySelector('[data-testid=pledge-wonder]').checked }))()");
    assert.equal(locked.disabled, true);
    assert.equal(locked.checked, true);
    await page.click('[data-testid=confluence-vote]');
    await page.waitFor("document.querySelector('[data-testid=confluence-result]') !== null");
    const result = await page.evaluate("(() => { const app=window.__falesc.app; return { outcome: app.charter.ending.outcome, pledge: app.confluenceScreen.result.pledge.id, votes: app.confluenceScreen.result.votes.length }; })()");
    log(JSON.stringify({ result }));
    assert.equal(result.pledge, 'wonder');
    assert.ok(result.votes > 0);
    await screenshot('campaign-result.png');
    await page.click('[data-testid=confluence-close]');
    await page.waitFor("window.__falesc.snapshot().state === 'END'");
}
