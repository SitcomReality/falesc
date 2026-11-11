export class EndScreen {
    constructor(gameStateManager, game) {
        this.gsm = gameStateManager;
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
            <h1 class="end__title" data-role="title">The light holds.</h1>
            <p class="end__copy" data-role="copy"></p>
            <div class="end__actions">
                <button type="button" class="btn btn--primary" data-testid="end-menu">Return to the water</button>
                <button type="button" class="btn btn--paper" data-testid="end-retry">New charter</button>
            </div>
        `;

        const aside = document.createElement('aside');
        aside.className = 'end__aside';
        aside.innerHTML = `
            <div>
                <p class="kicker">The settlement</p>
                <dl class="end__stats">
                    <div class="end__stat"><dt>Tides weathered</dt><dd data-role="days">1</dd></div>
                    <div class="end__stat"><dt>Structures</dt><dd data-role="structures">0</dd></div>
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
        this.daysEl = aside.querySelector('[data-role=days]');
        this.structuresEl = aside.querySelector('[data-role=structures]');
        this.lumenEl = aside.querySelector('[data-role=lumen]');
        this.medalEl = aside.querySelector('[data-role=medal]');

        main.querySelector('[data-testid=end-menu]').addEventListener('click', () => {
            this.gsm.setState('MENU');
        });
        main.querySelector('[data-testid=end-retry]').addEventListener('click', () => {
            this.gsm.setState('LOBBY');
        });
    }

    show() {
        const result = this.gsm.endResult || { outcome: 'abandon' };
        const outcome = result.outcome || 'abandon';
        const victory = outcome === 'victory';
        const defeat = outcome === 'defeat';
        const buildings = this.game?.buildingManager?.buildings || [];
        const active = buildings.filter((building) => building.state === 'ACTIVE');

        this.container.classList.remove('end--victory', 'end--defeat', 'end--abandon');
        this.container.classList.add(`end--${outcome}`);

        if (victory) {
            this.titleEl.textContent = 'The light holds.';
            this.copyEl.textContent = 'The Aurora Beacon is burning, the tide has turned, and for one more night the Glass Sea has a town on it. Your charter is complete.';
            this.medalEl.textContent = '✦';
        } else if (defeat) {
            this.titleEl.textContent = 'The tide took the light.';
            this.copyEl.textContent = `The water rose before the Beacon did. Day ${this.gsm.currentTurn} is the last entry in this charter — but the crystals will be back.`;
            this.medalEl.textContent = '≈';
        } else {
            this.titleEl.textContent = 'You leave the lamp burning.';
            this.copyEl.textContent = 'The charter is closed, but the settlement stands. Somewhere beyond the horizon, another Prism Tide is gathering.';
            this.medalEl.textContent = '◇';
        }

        this.daysEl.textContent = String(this.gsm.currentTurn || 1);
        this.structuresEl.textContent = `${active.length} / ${buildings.length}`;
        this.lumenEl.textContent = String(this.gsm.lumen || 0);
        this.container.style.display = 'flex';
    }

    hide() {
        this.container.style.display = 'none';
    }
}
