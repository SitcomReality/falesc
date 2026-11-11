export class InterstitialScreen {
    constructor(gameStateManager) {
        this.gsm = gameStateManager;

        this.container = document.createElement('div');
        this.container.className = 'screen screen--interstitial';
        this.container.dataset.testid = 'interstitial-screen';

        const panel = document.createElement('div');
        panel.className = 'tide-panel';
        panel.innerHTML = `
            <p class="kicker">The tide turns</p>
            <h2 class="tide-panel__title" data-role="title">Day 02 begins</h2>
            <p class="tide-panel__copy" data-role="copy">The lamps are lit. The water is moving.</p>
            <dl class="tide-summary">
                <div><dt>Lumen gathered</dt><dd data-role="income">+0</dd></div>
                <div><dt>Structures working</dt><dd data-role="active">0</dd></div>
                <div><dt>Builds this tide</dt><dd data-role="actions">1</dd></div>
            </dl>
            <div class="tide-panel__progress" aria-hidden="true"><i></i><i></i><i></i></div>
        `;

        this.container.appendChild(panel);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';

        this.titleEl = panel.querySelector('[data-role=title]');
        this.copyEl = panel.querySelector('[data-role=copy]');
        this.incomeEl = panel.querySelector('[data-role=income]');
        this.activeEl = panel.querySelector('[data-role=active]');
        this.actionsEl = panel.querySelector('[data-role=actions]');
    }

    show() {
        const summary = this.gsm.lastTideSummary;
        const nextDay = (this.gsm.currentTurn || 1) + 1;
        const limit = this.gsm.dayLimit || 14;

        if (this.titleEl) {
            this.titleEl.textContent = nextDay > limit ? 'The last tide' : `Day ${String(nextDay).padStart(2, '0')} begins`;
        }
        if (this.copyEl) {
            this.copyEl.textContent = nextDay > limit
                ? 'The water is at the door. One more look at the light.'
                : summary?.message || 'The lamps are lit. The water is moving.';
        }
        if (this.incomeEl) this.incomeEl.textContent = `+${summary?.income ?? 0}`;
        if (this.activeEl) this.activeEl.textContent = String(summary?.active ?? 0);
        if (this.actionsEl) this.actionsEl.textContent = '1';
        this.container.style.display = 'flex';
    }

    hide() {
        this.container.style.display = 'none';
    }
}
