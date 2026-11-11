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
    assert.equal(opened.campaign.events.length, 6, 'the campaign should publish two events for each of three days');
    assert.ok(opened.campaign.events.some((event) => event.need === 'purpose'));
    assert.equal(new Set(opened.campaign.events.map((event) => event.day)).size, 3);
    assert.ok(Object.keys(opened.campaign.rivalPledges).length === 2, 'both rivals should publish a promise');
    const firstNeed = opened.campaign.events[0].need;
    const firstEvent = opened.campaign.events[0];
    assert.ok(await page.visible('[data-testid=campaign-modal]'));
    await screenshot('campaign-modal.png');
    await page.evaluate("window.__falesc.app.charter.player.lumen = 30; window.__falesc.app.gameScreen.updateHud(true)");
    await page.click('[data-testid=campaign-sponsor-company]');
    await page.waitFor("Boolean(window.__falesc.app.charter.campaign.sponsored)");
    const sponsored = await page.evaluate("({ events: window.__falesc.app.charter.campaign.events.length, need: window.__falesc.app.charter.campaign.sponsored?.need, lumen: window.__falesc.app.charter.player.lumen })");
    log(JSON.stringify({ sponsored }));
    assert.equal(sponsored.events, 7);
    assert.equal(sponsored.need, 'company');
    assert.equal(sponsored.lumen, 25);

    await page.evaluate(`document.querySelector('[data-testid=campaign-pledge-${firstNeed}]').click()`);
    await page.click('[data-testid=campaign-confirm]');
    await page.waitFor("window.__falesc.app.campaignModal.isOpen === false");
    await page.pause(200);
    const chosen = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(chosen.campaign.playerPledge, firstNeed);
    assert.equal(await page.evaluate(`window.__falesc.app.charter.campaign.qualityBonusFor('player', ${JSON.stringify(firstNeed)})`), 0.05);
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const campaignLabel = await page.evaluate("document.querySelector('[data-role=campaign-name]').textContent");
    assert.ok(campaignLabel.length > 0, 'the HUD should show the chosen promise');
    const campaignEvent = await page.evaluate("document.querySelector('[data-role=campaign-event]').textContent");
    assert.ok(campaignEvent.includes(firstEvent.title), 'the HUD should show the current festival event');
    log(JSON.stringify({ hud: { promise: campaignLabel, event: campaignEvent } }));
    await screenshot('campaign.png');
    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restoredCampaign = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(restoredCampaign.campaign.playerPledge, firstNeed, 'the campaign promise should survive a reload');

    // The bulletin carries the campaign item.
    await page.evaluate("window.__falesc.showBulletin()");
    const bulletin = await page.text('[data-testid=bulletin-modal]');
    assert.ok(bulletin.includes('Campaign'), 'the bulletin should carry the campaign');
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    // The event is consumed by the day simulation and appears in the report.
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const dayTwelve = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(dayTwelve.report.campaignEvent.title, firstEvent.title);
    await page.evaluate("window.__falesc.app.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
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
    const locked = await page.evaluate(`(() => ({ disabled: document.querySelector('[data-testid=pledge-${firstNeed}]').disabled, checked: document.querySelector('[data-testid=pledge-${firstNeed}]').checked }))()`);
    assert.equal(locked.disabled, true);
    assert.equal(locked.checked, true);
    await page.click('[data-testid=confluence-vote]');
    await page.waitFor("document.querySelector('[data-testid=confluence-result]') !== null");
    const result = await page.evaluate("(() => { const app=window.__falesc.app; return { outcome: app.charter.ending.outcome, pledge: app.confluenceScreen.result.pledge.id, votes: app.confluenceScreen.result.votes.length }; })()");
    log(JSON.stringify({ result }));
    assert.equal(result.pledge, firstNeed);
    assert.ok(result.votes > 0);
    await screenshot('campaign-result.png');
    await page.click('[data-testid=confluence-close]');
    await page.waitFor("window.__falesc.snapshot().state === 'STEWARDSHIP'");
    await page.evaluate("document.querySelector('[data-testid=stewardship-commons_assembly]').click()");
    await page.click('[data-testid=stewardship-confirm]');
    await page.waitFor("window.__falesc.snapshot().state === 'END'");
    const stored = await page.evaluate("JSON.parse(localStorage.getItem('falesc.legacy.v1'))");
    log(JSON.stringify({ stored }));
    assert.equal(stored.policyId, 'commons_assembly');
    await page.evaluate("window.__falesc.startCharter(777, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const legacy = await page.evaluate("({ policy: window.__falesc.app.charter.legacy?.policyId, fund: window.__falesc.app.charter.commons.fund, purse: window.__falesc.app.charter.commons.purse })");
    log(JSON.stringify({ legacy }));
    assert.equal(legacy.policy, 'commons_assembly');
    assert.ok(legacy.fund >= 5);
    assert.ok(legacy.purse >= 5);
}
