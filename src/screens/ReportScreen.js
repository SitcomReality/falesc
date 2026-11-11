import { NEEDS } from '../design/needs.js';
import { BALANCE } from '../design/balance.js';
import { COMMONS_POLICY_BY_ID } from '../commons/CommonsPolicies.js';
import { escapeHtml } from '../ui/chrome/escapeHtml.js';

/**
 * The evening broadsheet. This is the emotional payoff: visits, hearts,
 * contributions, upkeep, complaints and one or two human quotes.
 */
export class ReportScreen {
    constructor(game) {
        this.game = game;
        this.container = document.createElement('div');
        this.container.className = 'screen screen--report';
        this.container.dataset.testid = 'report-screen';
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
    }

    show() {
        const report = this.game.charter?.lastReport;
        if (!report) {
            this.container.style.display = 'none';
            return;
        }
        const ending = this.game.charter.ending;
        const confluence = Boolean(this.game.charter.confluenceReady && !ending);
        const title = ending
            ? ending.title
            : confluence ? report.message || 'The Confluence is called.' : report.message || 'The day is done.';
        const kicker = ending
            ? `Charter record · Day ${report.day}`
            : confluence ? `The Confluence · Day ${report.day}` : `Evening report · Day ${String(report.day).padStart(2, '0')}`;
        const visits = report.serviceVisits || {};
        const serviceRows = this.game.charter.allServices.map((service) => `
            <li>
                <span>${escapeHtml(service.chapter?.isPlayer || service.chapterId === 'commons' ? service.name : `${service.chapterName}'s ${service.name}`)}</span>
                <span>${visits[service.id] || 0} visits</span>
            </li>
        `).join('');
        const needsRows = NEEDS.map((need) => `
            <div class="report__need">
                <span>${need.name}</span>
                <span class="report__need-track"><i style="width:${Math.round(report.needs?.[need.id] || 0)}%;background:${need.color}"></i></span>
                <strong>${Math.round(report.needs?.[need.id] || 0)}</strong>
            </div>
        `).join('');
        const complaints = report.complaints?.length
            ? `<ul class="report__list">${report.complaints.slice(0, 5).map((complaint) => `<li><strong>${escapeHtml(complaint.residentName)}</strong> — ${escapeHtml(complaint.text)}</li>`).join('')}</ul>`
            : '<p class="report__quiet">No complaints recorded. Somebody must have made tea.</p>';
        const quotes = report.quotes?.length
            ? report.quotes.map((quote) => `<blockquote>“${escapeHtml(quote.text)}”<cite>${escapeHtml(quote.resident)}</cite></blockquote>`).join('')
            : '<blockquote>“A quiet day.”<cite>The square</cite></blockquote>';
        const contest = report.chapters?.length > 1;
        const standings = contest
            ? `<h2>Standings</h2><ul class="report__list report__list--services">${[...report.chapters].sort((a, b) => b.devotion - a.devotion).map((chapter) => `<li><span>${escapeHtml(chapter.name)}${chapter.isPlayer ? ' (you)' : ''}</span><span>${chapter.devotion.toFixed(1)} ♥ · ${chapter.visits} visits${Number.isFinite(chapter.residents) ? ` · ${chapter.residents} residents` : ''}</span></li>`).join('')}</ul>`
                + `<h2>Chapter ledgers</h2><ul class="report__list report__list--services">${report.chapters.map((chapter) => `<li><span>${escapeHtml(chapter.name)}</span><span>+${chapter.contributions ?? 0}${chapter.visitorFees ? ` +${chapter.visitorFees} visitor${chapter.visitorFees === 1 ? '' : 's'}` : ''} −${chapter.upkeep ?? 0} · ${chapter.lumen ?? 0} lumen</span></li>`).join('')}</ul>`
            : '';
        const arrivals = report.arrivals?.length
            ? `<h2>Arrivals</h2><ul class="report__list report__list--services">${report.arrivals.map((arrival) => `<li><span>${escapeHtml(arrival.name)}</span><span>${escapeHtml(arrival.chapterName ? `${arrival.chapterName} · new bed` : 'new bed')}</span></li>`).join('')}</ul>`
            : '';
        const departures = report.departures?.length
            ? `<h2>Departures</h2><ul class="report__list">${report.departures.map((departure) => `<li><strong>${escapeHtml(departure.name)}</strong> — ${escapeHtml(departure.reason)}</li>`).join('')}</ul>`
            : '';
        const closures = report.closures?.length
            ? `<p class="report__warning">Closed at dusk: ${report.closures.map((closure) => escapeHtml(closure.name)).join(', ')}. The upkeep ran short.</p>`
            : '';
        const worn = (this.game.charter?.services?.services || [])
            .filter((service) => service.condition < 60)
            .slice(0, 4);
        const wornNote = worn.length
            ? `<p class="report__warning report__warning--action">Worn: ${worn.map((service) => `${escapeHtml(service.name)} (${Math.round(service.condition)}%)`).join(', ')}. <button type="button" class="btn btn--tiny btn--paper" data-testid="report-repair-all">Repair all</button></p>`
            : '';
        const festival = report.campaignEvent
            ? `<p class="report__warning">Festival programme: <strong>${escapeHtml(report.campaignEvent.title)}</strong> — ${escapeHtml(report.campaignEvent.blurb)}</p>`
            : '';
        const dailyRequest = report.request
            ? `<p class="report__warning">Daily request: <strong>${escapeHtml(report.request.residentName)}</strong> asked for ${escapeHtml(report.request.needName)} — ${report.request.status === 'met' ? 'met.' : 'unmet.'}</p>`
            : '';
        const stayedVisitors = report.stayedVisitors || 0;
        const visitorsNote = report.visitors
            ? `<p class="report__warning">${report.visitors} day visitors left ${report.visitorFees ?? 0} lumen across the archipelago; your chapter earned ${report.playerVisitorFees ?? 0}.${stayedVisitors ? ` Of them, ${stayedVisitors} chose a bed and stayed.` : ''}</p>`
            : '';
        const liveVisitorIds = new Set((this.game.charter?.visitors || []).map((visitor) => visitor.id));
        const visitorRows = (report.visitorDetails || [])
            .filter((visitor) => liveVisitorIds.has(visitor.id))
            .map((visitor) => {
                const charmed = visitor.affinity >= BALANCE.visitors.stayAffinity;
                const canStay = charmed && (this.game.charter?.spareBeds || 0) > 0;
                const action = canStay
                    ? `<button type="button" class="btn btn--paper btn--tiny" data-testid="invite-visitor" data-visitor-id="${escapeHtml(visitor.id)}">Offer trial</button>`
                    : `<span class="report__visitor-note">${charmed ? 'no spare bed' : 'still a stranger'}</span>`;
                return `<li class="report__visitor"><span><button type="button" class="report__visitor-name" data-testid="visitor-open" data-visitor-id="${escapeHtml(visitor.id)}">${escapeHtml(visitor.name)}</button><small>${visitor.returned ? 'returning · ' : ''}${visitor.visits || 0} ${visitor.visits === 1 ? 'visit' : 'visits'} · ${visitor.wellbeing ?? 0} wellbeing</small></span>${action}</li>`;
            }).join('');
        const visitorsSection = visitorRows
            ? `<h2>Visitors</h2><ul class="report__list report__visitors">${visitorRows}</ul>`
            : '';
        const trials = this.game.charter?.trialVisitors || [];
        const trialNote = trials.length
            ? `<p class="report__warning">On trial: ${trials.map((visitor) => `${escapeHtml(visitor.name)} (${Math.round(visitor.wellbeing)} wellbeing)`).join(', ')}. They will stay or leave tomorrow.</p>`
            : '';
        const commonsVisits = report.patronageByChapter?.commons || 0;
        const commonsPolicy = COMMONS_POLICY_BY_ID[report.commons?.policy];
        const purseNote = report.commonsPurse !== undefined
            ? `<p class="report__warning">Commons purse ${report.commonsPurse} lumen · shared upkeep ${report.commonsUpkeep || 0}/day${report.commonsClosed?.length ? ` · closed: ${report.commonsClosed.map((entry) => escapeHtml(entry.name)).join(', ')}` : ''}.</p>`
            : '';
        const commonsNote = report.commons
            ? `<p class="report__warning">${report.commons.active ? `The Commons Beacon is lit: every need eases by ${report.commons.comfort} at night, and ${commonsVisits} visits found its door.${commonsPolicy ? ` The assembly chose ${commonsPolicy.name}.` : ' The first assembly is waiting.'}` : `Commons Beacon fund: ${report.commons.fund} / ${report.commons.target} lumen.`}</p>`
            : '';

        this.container.innerHTML = `
            <div class="report__sheet paper">
                <header class="report__head">
                    <div>
                        <p class="kicker" style="color:var(--wine)">${escapeHtml(kicker)}</p>
                        <h1 class="report__title" tabindex="-1">${escapeHtml(title)}</h1>
                    </div>
                    <span class="report__edition">FALESC · ${String(report.day).padStart(2, '0')}</span>
                </header>
                <div class="report__numbers">
                    <div><span class="kicker">Visits</span><strong>${report.visits}</strong></div>
                    <div><span class="kicker">Hearts gained</span><strong>${(report.heartsGained ?? report.hearts ?? 0).toFixed(1)}${report.heartsLost > 0 ? ` <span class="report__loss">−${report.heartsLost.toFixed(1)}</span>` : ''}</strong></div>
                    <div><span class="kicker">${contest ? 'Your income' : 'Contributions'}</span><strong>+${report.contributions}</strong></div>
                    <div><span class="kicker">${contest ? 'Your upkeep' : 'Upkeep'}</span><strong>−${report.upkeep}</strong></div>
                    <div><span class="kicker">${contest ? 'Your lumen' : 'Lumen'}</span><strong>${report.lumenAfter}</strong></div>
                    <div><span class="kicker">Flourishing</span><strong>${Math.round(report.flourishing)}</strong></div>
                </div>
                ${festival}
            ${dailyRequest}
                ${visitorsNote}
                ${trialNote}
                ${commonsNote}
                ${purseNote}
                ${closures}
            ${wornNote}
                <div class="report__columns">
                    <section>
                        <h2>Needs at dusk</h2>
                        <div class="report__needs">${needsRows}</div>
                        <h2>Doors and visits</h2>
                        <ul class="report__list report__list--services">${serviceRows || '<li>No services yet.</li>'}</ul>
                    </section>
                    <section>
                        <h2>Word of mouth</h2>
                        <div class="report__quotes">${quotes}</div>
                        ${visitorsSection}
                        ${standings}
                        ${arrivals}
                        ${departures}
                        <h2>Complaints</h2>
                        ${complaints}
                    </section>
                </div>
                <footer class="report__foot">
                    <p>${escapeHtml(report.message || '')}</p>
                    <button type="button" class="btn btn--primary" data-testid="report-continue">
                        ${ending ? 'Read the charter record' : confluence ? 'Convene the Confluence' : `Begin Day ${String(report.day + 1).padStart(2, '0')}`}
                        <span class="btn__arrow" aria-hidden="true">→</span>
                    </button>
                </footer>
            </div>
        `;
        this.container.querySelector('[data-testid=report-repair-all]')?.addEventListener('click', () => {
            const result = this.game.repairAllServices();
            if (result.ok) this.show();
        });
        this.container.querySelector('[data-testid=report-continue]').addEventListener('click', () => {
            if (ending) this.game.finishCharter();
            else if (confluence) this.game.showConfluence();
            else this.game.beginNextDay();
        });
        this.container.querySelectorAll('[data-testid=visitor-open]').forEach((button) => {
            button.addEventListener('click', () => this.game.showVisitor(button.dataset.visitorId));
        });
        this.container.querySelectorAll('[data-testid=invite-visitor]').forEach((button) => {
            button.addEventListener('click', () => {
                const result = this.game.inviteVisitor(button.dataset.visitorId);
                if (!result.ok) this.game.gameScreen.toast(result.reason, 'coral', 2200);
            });
        });
        this.container.style.display = 'flex';
        requestAnimationFrame(() => {
            this.container.querySelector('.report__title')?.focus({ preventScroll: true });
        });
    }

    hide() {
        this.container.style.display = 'none';
    }
}

