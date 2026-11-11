/**
 * End of charter. Victory, defeat and abandonment are distinct compositions on
 * the same paper, with the run's people and numbers in the record.
 */
export class EndScreen {
    constructor(screenStateMachine, game) {
        this.gsm = screenStateMachine;
        this.game = game;

        this.container = document.createElement('div');
        this.container.className = 'screen screen--end';
        this.container.dataset.testid = 'end-screen';

        const sheet = document.createElement('div');
        sheet.className = 'end__sheet paper';

        const main = document.createElement('div');
        main.className = 'end__main';
        main.innerHTML = `
            <p class="eyebrow" style="color:var(--wine)">Charter record</p>
            <h1 class="end__title" data-role="title">The commons holds.</h1>
            <p class="end__copy" data-role="copy"></p>
            <blockquote class="end__quote" data-role="quote"></blockquote>
            <div class="end__actions">
                <button type="button" class="btn btn--primary" data-testid="end-menu">Return to the drift</button>
                <button type="button" class="btn btn--paper" data-testid="end-retry">New charter</button>
            </div>
        `;

        const aside = document.createElement('aside');
        aside.className = 'end__aside';
        aside.innerHTML = `
            <div>
                <p class="kicker">The chapter</p>
                <dl class="end__stats">
                    <div class="end__stat"><dt>Days weathered</dt><dd data-role="days">1</dd></div>
                    <div class="end__stat"><dt>Peak residents</dt><dd data-role="peak-population">0</dd></div>
                    <div class="end__stat"><dt>Peak flourishing</dt><dd data-role="peak-flourishing">0</dd></div>
                    <div class="end__stat"><dt>Total visits</dt><dd data-role="total-visits">0</dd></div>
                    <div class="end__stat"><dt>Residents</dt><dd data-role="population">0</dd></div>
                    <div class="end__stat"><dt>Devotion</dt><dd data-role="devotion">0</dd></div>
                    <div class="end__stat"><dt>Flourishing</dt><dd data-role="flourishing">0</dd></div>
                    <div class="end__stat"><dt>Lumen in hand</dt><dd data-role="lumen">0</dd></div>
                    <div class="end__stat"><dt>Stewardship</dt><dd data-role="stewardship">—</dd></div>
                    <div class="end__stat" data-role="commons-stat" hidden><dt>Commons</dt><dd data-role="commons">—</dd></div>
                </dl>
            </div>
            <div class="end__medal" data-role="medal" aria-hidden="true">◇</div>
        `;

        sheet.append(main, aside);
        this.container.appendChild(sheet);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';

        this.titleEl = main.querySelector('[data-role=title]');
        this.copyEl = main.querySelector('[data-role=copy]');
        this.quoteEl = main.querySelector('[data-role=quote]');
        this.daysEl = aside.querySelector('[data-role=days]');
        this.peakPopulationEl = aside.querySelector('[data-role=peak-population]');
        this.peakFlourishingEl = aside.querySelector('[data-role=peak-flourishing]');
        this.totalVisitsEl = aside.querySelector('[data-role=total-visits]');
        this.populationEl = aside.querySelector('[data-role=population]');
        this.devotionEl = aside.querySelector('[data-role=devotion]');
        this.flourishingEl = aside.querySelector('[data-role=flourishing]');
        this.lumenEl = aside.querySelector('[data-role=lumen]');
        this.stewardshipEl = aside.querySelector('[data-role=stewardship]');
        this.commonsStat = aside.querySelector('[data-role=commons-stat]');
        this.commonsEl = aside.querySelector('[data-role=commons]');
        this.medalEl = aside.querySelector('[data-role=medal]');

        main.querySelector('[data-testid=end-menu]').addEventListener('click', () => this.gsm.setState('MENU'));
        main.querySelector('[data-testid=end-retry]').addEventListener('click', () => this.gsm.setState('LOBBY'));
    }

    show() {
        const charter = this.game.charter;
        const ending = charter?.ending || this.game.endResult || { outcome: 'abandon' };
        const outcome = ending.outcome || 'abandon';
        const stats = charter?.stats() || {};
        const commons = charter?.commons || null;
        this.commonsStat.hidden = !commons;
        if (commons) {
            this.commonsEl.textContent = commons.active ? 'Lit' : `${commons.fund} / ${commons.target}`;
        }
        this.container.classList.remove('end--victory', 'end--defeat', 'end--abandon');
        this.container.classList.add(`end--${outcome}`);

        if (outcome === 'victory') {
            this.titleEl.textContent = ending.title || 'The commons holds.';
            const commonsLine = commons?.active
                ? ` The Commons Beacon was lit by ${contributionLine(charter)}. Every resident still feels its ease at night.`
                : '';
            this.copyEl.textContent = `${ending.message || 'Twelve Tidelanders, a full larder, and a flourishing worth celebrating. The Confluence has done its work.'}${ending.stewardship ? ` ${ending.stewardship.epilogue}` : ''}${commonsLine}`;
            this.medalEl.textContent = '✦';
        } else if (outcome === 'defeat') {
            this.titleEl.textContent = ending.title || 'The lights go out.';
            this.copyEl.textContent = ending.message || 'The charter closed before the chapter found its rhythm. The islands will be here when you try again.';
            this.medalEl.textContent = '≈';
        } else {
            this.titleEl.textContent = 'You leave the lamps burning.';
            this.copyEl.textContent = 'The charter is closed, but the chapter stands. Somewhere in the drift, another light is gathering.';
            this.medalEl.textContent = '◇';
        }

        const quote = charter?.lastReport?.quotes?.[0];
        this.quoteEl.textContent = quote ? `“${quote.text}” — ${quote.resident}` : '“Somebody put the kettle on.” — the square';
        this.daysEl.textContent = String(stats.day || charter?.day || 1);
        this.peakPopulationEl.textContent = String(stats.peakPopulation ?? stats.population ?? 0);
        this.peakFlourishingEl.textContent = String(stats.peakFlourishing ?? Math.round(stats.flourishing ?? 0));
        this.totalVisitsEl.textContent = String(stats.totalVisits ?? 0);
        this.populationEl.textContent = String(stats.population ?? charter?.population ?? 0);
        this.devotionEl.textContent = (stats.devotion ?? charter?.devotion ?? 0).toFixed(1);
        this.flourishingEl.textContent = String(Math.round(stats.flourishing ?? charter?.flourishing ?? 0));
        this.lumenEl.textContent = String(stats.lumen ?? charter?.lumen ?? 0);
        this.stewardshipEl.textContent = ending.stewardship?.name || '—';
        this.container.style.display = 'flex';
        requestAnimationFrame(() => {
            this.container.querySelector('[data-testid=end-menu]')?.focus({ preventScroll: true });
        });
    }

    hide() {
        this.container.style.display = 'none';
    }
}

function contributionLine(charter) {
    const entries = Object.entries(charter?.commons?.contributors || {})
        .filter(([, value]) => value > 0)
        .sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return 'the archipelago';
    return entries.map(([id, value]) => {
        const chapter = charter.chapterById(id);
        return `${chapter?.name || id} (${value})`;
    }).join(', ');
}
