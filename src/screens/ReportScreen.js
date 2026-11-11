import { NEEDS } from '../design/needs.js';

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
                <span>${escapeHtml(service.chapter?.isPlayer ? service.name : `${service.chapterName}'s ${service.name}`)}</span>
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
                + `<h2>Chapter ledgers</h2><ul class="report__list report__list--services">${report.chapters.map((chapter) => `<li><span>${escapeHtml(chapter.name)}</span><span>+${chapter.contributions ?? 0} −${chapter.upkeep ?? 0} · ${chapter.lumen ?? 0} lumen</span></li>`).join('')}</ul>`
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
        const festival = report.campaignEvent
            ? `<p class="report__warning">Festival programme: <strong>${escapeHtml(report.campaignEvent.title)}</strong> — ${escapeHtml(report.campaignEvent.blurb)}</p>`
            : '';
        const commonsVisits = report.patronageByChapter?.commons || 0;
        const commonsNote = report.commons
            ? `<p class="report__warning">${report.commons.active ? `The Commons Beacon is lit: every need eases by ${report.commons.comfort} at night, and ${commonsVisits} visits found its door.` : `Commons Beacon fund: ${report.commons.fund} / ${report.commons.target} lumen.`}</p>`
            : '';

        this.container.innerHTML = `
            <div class="report__sheet paper">
                <header class="report__head">
                    <div>
                        <p class="kicker" style="color:var(--wine)">${escapeHtml(kicker)}</p>
                        <h1 class="report__title">${escapeHtml(title)}</h1>
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
                ${commonsNote}
                ${closures}
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
        this.container.querySelector('[data-testid=report-continue]').addEventListener('click', () => {
            if (ending) this.game.finishCharter();
            else if (confluence) this.game.showConfluence();
            else this.game.beginNextDay();
        });
        this.container.style.display = 'flex';
        requestAnimationFrame(() => {
            this.container.querySelector('[data-testid=report-continue]')?.focus({ preventScroll: true });
        });
    }

    hide() {
        this.container.style.display = 'none';
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
