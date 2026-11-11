export class MenuScreen {
    constructor(screenStateMachine, game = null) {
        this.gsm = screenStateMachine;
        this.game = game;

        this.container = document.createElement('div');
        this.container.className = 'screen screen--menu';
        this.container.dataset.testid = 'menu-screen';

        const inner = document.createElement('div');
        inner.className = 'menu__inner';

        const eyebrow = document.createElement('p');
        eyebrow.className = 'eyebrow menu__eyebrow';
        eyebrow.textContent = 'FALESC · The Confluence · A civic chronicle';

        const title = document.createElement('h1');
        title.className = 'menu__title';
        title.setAttribute('aria-label', 'FALESC');
        title.innerHTML = 'FALESC<span class="prism" aria-hidden="true">.</span>';

        const tagline = document.createElement('p');
        tagline.className = 'menu__tagline';
        tagline.innerHTML = 'Fully automated luxury egalitarian space communism. <em>Somebody has to do the dishes.</em>';

        const actions = document.createElement('div');
        actions.className = 'menu__actions';

        const startBtn = this.createButton('New charter', 'menu-start', () => {
            this.gsm.setState('LOBBY');
        }, 'btn btn--primary');
        startBtn.insertAdjacentHTML('beforeend', '<span class="btn__arrow" aria-hidden="true">→</span>');

        const continueBtn = this.createButton('Continue charter', 'menu-continue', () => {
            this.game?.continueCharter();
        }, 'btn btn--paper');
        continueBtn.hidden = true;
        this.continueBtn = continueBtn;

        const joinBtn = this.createButton('Multiplayer', 'menu-join', () => {}, 'btn btn--ghost');
        joinBtn.disabled = true;
        joinBtn.title = 'Multiplayer is not implemented yet';
        joinBtn.insertAdjacentHTML('beforeend', '<span class="kicker" style="margin-left:4px;opacity:.7">later</span>');

        actions.append(startBtn, continueBtn, joinBtn);
        inner.append(eyebrow, title, tagline, actions);

        const aside = document.createElement('aside');
        aside.className = 'menu__aside paper';
        aside.setAttribute('aria-hidden', 'true');
        aside.innerHTML = `
            <span class="menu__aside-stamp">◇</span>
            <p class="kicker">Field note 001</p>
            <p>Read needs. Shape places. Watch people choose. Earn love. Reinvest.</p>
            <p class="menu__aside-small">First Light: house twelve Tidelanders and reach a flourishing of 62.</p>
        `;

        const meta = document.createElement('div');
        meta.className = 'menu__meta';
        meta.innerHTML = `
            <span>Bundled offline · no signals</span>
            <span class="menu__version">v0.3 — First Light</span>
        `;

        this.container.append(inner, aside, meta);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
    }

    createButton(text, testid, onClick, className) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = className;
        btn.textContent = text;
        btn.dataset.testid = testid;
        btn.addEventListener('click', onClick);
        return btn;
    }

    show() {
        this.container.style.display = 'flex';
        const canContinue = Boolean(this.game?.saveManager?.hasSave());
        if (this.continueBtn) this.continueBtn.hidden = !canContinue;
        const first = this.container.querySelector('[data-testid=menu-start]');
        if (first) first.focus({ preventScroll: true });
    }

    hide() {
        this.container.style.display = 'none';
    }
}
