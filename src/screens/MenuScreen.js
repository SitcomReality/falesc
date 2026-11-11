import { readLegacy, describeLegacy, clearLegacy } from '../confluence/StewardshipLegacy.js';
import { readArchive } from '../persistence/CharterArchive.js';

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

        const legacy = document.createElement('aside');
        legacy.className = 'menu__legacy';
        legacy.dataset.testid = 'menu-legacy';
        legacy.hidden = true;
        legacy.innerHTML = `
            <p class="kicker">A previous charter remembered</p>
            <strong data-role="legacy-title"></strong>
            <span data-role="legacy-blurb"></span>
            <button type="button" class="menu__legacy-clear" data-testid="menu-clear-legacy">Let it go</button>
        `;
        this.legacyCard = legacy;
        this.legacyTitle = legacy.querySelector('[data-role=legacy-title]');
        this.legacyBlurb = legacy.querySelector('[data-role=legacy-blurb]');
        this.legacyClear = legacy.querySelector('[data-testid=menu-clear-legacy]');
        this.legacyClear.addEventListener('click', () => {
            clearLegacy();
            legacy.hidden = true;
        });

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

        const exportBtn = this.createButton('Export save', 'menu-export', () => {
            this.game?.exportSave();
        }, 'btn btn--paper');
        exportBtn.hidden = true;
        this.exportBtn = exportBtn;

        const importBtn = this.createButton('Import save', 'menu-import', () => {
            this.importInput.click();
        }, 'btn btn--paper');
        this.importBtn = importBtn;

        const guideBtn = this.createButton('How to play', 'menu-guide', () => {
            this.game?.openFieldGuide();
        }, 'btn btn--paper');
        actions.append(guideBtn);
        const archiveBtn = this.createButton('Charter archive', 'menu-archive', () => {
            this.game?.openCharterArchive();
        }, 'btn btn--paper');
        archiveBtn.hidden = true;
        this.archiveBtn = archiveBtn;
        actions.append(archiveBtn);
        this.importInput = document.createElement('input');
        this.importInput.type = 'file';
        this.importInput.accept = 'application/json,.json';
        this.importInput.dataset.testid = 'menu-import-file';
        this.importInput.hidden = true;
        this.importInput.addEventListener('change', async () => {
            const file = this.importInput.files?.[0];
            if (!file) return;
            const text = await file.text();
            const result = this.game?.importSave(text);
            if (result?.ok === false) window.alert(result.error || 'The save could not be imported.');
            this.importInput.value = '';
        });

        const joinBtn = this.createButton('Multiplayer', 'menu-join', () => {}, 'btn btn--ghost');
        joinBtn.disabled = true;
        joinBtn.title = 'Multiplayer is not implemented yet';
        joinBtn.insertAdjacentHTML('beforeend', '<span class="kicker" style="margin-left:4px;opacity:.7">later</span>');

        actions.append(startBtn, continueBtn, exportBtn, importBtn, joinBtn);
        inner.append(eyebrow, title, tagline, actions, legacy, this.importInput);

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
        if (this.continueBtn) {
            this.continueBtn.hidden = !canContinue;
            const save = canContinue ? this.game?.saveManager?.read() : null;
            this.continueBtn.textContent = save?.charter ? `Continue · Day ${save.charter.day}` : 'Continue charter';
        }
        if (this.exportBtn) this.exportBtn.hidden = !canContinue;
        if (this.archiveBtn) this.archiveBtn.hidden = readArchive().length === 0;
        const legacy = readLegacy();
        const effect = describeLegacy(legacy);
        this.legacyCard.hidden = !effect;
        if (effect) {
            this.legacyTitle.textContent = effect.title;
            this.legacyBlurb.textContent = `${effect.blurb}${legacy.day ? ` Left on day ${legacy.day}.` : ''}`;
        }
        const first = this.container.querySelector('[data-testid=menu-start]');
        if (first) first.focus({ preventScroll: true });
    }

    hide() {
        this.container.style.display = 'none';
    }
}
