/**
 * Full-season Contest probe. Plays all 14 medium days with a simple, deterministic
 * player build plan, crosses the campaign, votes in the Confluence and records
 * the economy/population trajectory. This is a balance and regression scenario,
 * not a best-play demonstration.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const plan = ['canteen', 'tea_house', 'garden_dome', 'housing', 'housing', 'canteen', 'tea_house', 'garden_dome', 'housing'];
    const history = [];
    let planIndex = 0;

    const chooseCampaignIfOpen = async () => {
        const open = await page.evaluate("window.__falesc.app.campaignModal.isOpen === true");
        if (!open) return;
        const need = await page.evaluate("window.__falesc.snapshot().campaign.events[0].need");
        await page.evaluate(`document.querySelector('[data-testid=campaign-pledge-${need}]').click()`);
        await page.click('[data-testid=campaign-confirm]');
        await page.waitFor("window.__falesc.app.campaignModal.isOpen === false");
        await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    };

    const buildPlan = async () => {
        const built = await page.evaluate(`(() => {
            const app = window.__falesc.app;
            const plan = ${JSON.stringify(plan)};
            const out = [];
            let index = ${planIndex};
            for (let i=0; i<2; i++) {
                const programId = plan[index % plan.length];
                index = (index + 1) % plan.length;
                const cell = window.__falesc.findFreeCell(programId);
                if (!cell) { out.push({ programId, skipped: 'no plot' }); continue; }
                const result = app.charter.build({
                    programId, sectorId: cell.sectorId, u: cell.u, v: cell.v,
                    name: programId + ' ' + (app.charter.services.services.filter(s=>s.programId===programId).length + 1)
                });
                out.push({ programId, ok: result.ok, reason: result.reason || null });
                if (result.ok) app.syncViews();
            }
            return { out, nextIndex: index };
        })()`);
        planIndex = built.nextIndex;
        return built.out;
    };

    for (let day = 1; day <= 14; day++) {
        await chooseCampaignIfOpen();
        await page.evaluate("window.__falesc.app.bulletinModal.hide()");
        const built = await buildPlan();
        const before = await page.evaluate("window.__falesc.snapshot()");
        const daySnapshot = {
            day: before.day,
            built: built.filter((entry) => entry.ok).map((entry) => entry.programId),
            player: {
                population: before.population,
                housed: before.housedPopulation,
                devotion: before.devotion,
                flourishing: before.flourishing,
                lumen: before.lumen,
                works: before.works,
                services: before.services.length,
                active: before.services.filter((service) => service.state === 'ACTIVE' && !service.closed).length
            },
            chapters: before.chapters
        };
        await page.evaluate("window.__falesc.openDay()");
        await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
        await page.evaluate("window.__falesc.skipDay()");
        await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
        const report = await page.evaluate("window.__falesc.snapshot()");
        daySnapshot.report = {
            visits: report.report.visits,
            heartGain: report.report.heartsGained,
            contributions: report.report.contributions,
            upkeep: report.report.upkeep,
            flourishing: report.report.flourishing,
            event: report.report.campaignEvent?.title || null,
            outcome: report.report.outcome
        };
        history.push(daySnapshot);
        if (report.confluenceReady || report.ending) break;
        await page.evaluate("window.__falesc.app.beginNextDay()");
        await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    }

    log(JSON.stringify({ history }, null, 2).slice(0, 12000));
    const finalReport = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(finalReport.confluenceReady, true, 'the full season should reach the Confluence');
    await page.click('[data-testid=report-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'CONFLUENCE'");
    const need = await page.evaluate("window.__falesc.app.charter.campaign?.playerPledge || 'sustenance'");
    await page.evaluate(`document.querySelector('[data-testid=pledge-${need}]')?.click()`);
    await screenshot('season-confluence.png');
    await page.click('[data-testid=confluence-vote]');
    await page.waitFor("document.querySelector('[data-testid=confluence-result]') !== null");
    const result = await page.evaluate("window.__falesc.app.confluenceScreen.result ? { outcome: window.__falesc.app.charter.ending.outcome, counts: window.__falesc.app.confluenceScreen.result.standings.map(s => [s.id, s.votes, s.devotion]) } : null");
    log(JSON.stringify({ result }));
    await screenshot('season-result.png');
    await page.click('[data-testid=confluence-close]');
    const state = await page.evaluate("window.__falesc.snapshot().state");
    if (state === 'STEWARDSHIP') {
        await page.click('[data-testid=stewardship-confirm]');
    }
    await page.waitFor("window.__falesc.snapshot().state === 'END'");
    assert.ok(result);
}
