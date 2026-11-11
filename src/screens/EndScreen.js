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
                    <div class="end__stat"><dt>Residents</dt><dd data-role="population">0</dd></div>
                    <div class="end__stat"><dt>Devotion</dt><dd data-role="devotion">0</dd></div>
                    <div class="end__stat"><dt>Flourishing</dt><dd data-role="flourishing">0</dd></div>
                    <div class="end__stat"><dt>Lumen in hand</dt><dd data-role="lumen">0</dd></div>
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
        this.populationEl = aside.querySelector('[data-role=population]');
        this.devotionEl = aside.querySelector('[data-role=devotion]');
        this.flourishingEl = aside.querySelector('[data-role=flourishing]');
        this.lumenEl = aside.querySelector('[data-role=lumen]');
        this.medalEl = aside.querySelector('[data-role=medal]');

        main.querySelector('[data-testid=end-menu]').addEventListener('click', () => this.gsm.setState('MENU'));
        main.querySelector('[data-testid=end-retry]').addEventListener('click', () => this.gsm.setState('LOBBY'));
    }

    show() {
        const charter = this.game.charter;
        const ending = charter?.ending || this.game.endResult || { outcome: 'abandon' };
        const outcome = ending.outcome || 'abandon';
        const stats = charter?.stats() || {};
        this.container.classList.remove('end--victory', 'end--defeat', 'end--abandon');
        this.container.classList.add(`end--${outcome}`);

        if (outcome === 'victory') {
            this.titleEl.textContent = 'The commons holds.';
            this.copyEl.textContent = ending.message || 'Twelve Tidelanders, a full larder, and a flourishing worth celebrating. The Confluence has done its work.';
            this.medalEl.textContent = '✦';
        } else if (outcome === 'defeat') {
            this.titleEl.textContent = 'The lights go out.';
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
        this.populationEl.textContent = String(stats.population ?? charter?.population ?? 0);
        this.devotionEl.textContent = (stats.devotion ?? charter?.devotion ?? 0).toFixed(1);
        this.flourishingEl.textContent = String(Math.round(stats.flourishing ?? charter?.flourishing ?? 0));
        this.lumenEl.textContent = String(stats.lumen ?? charter?.lumen ?? 0);
        this.container.style.display = 'flex';
    }

    hide() {
        this.container.style.display = 'none';
    }
}
