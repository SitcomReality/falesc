import { installHudKeyboard } from '../controls/HudKeyboard.js';
import { buildHudLayout } from './gameScreen/HudLayout.js';
import { updateHud as presentHud } from './gameScreen/HudPresenter.js';

/**
 * The planning HUD: a civic bulletin strip, First Light progress, the survey
 * chart and the service dock. It reads the charter; it never owns it.
 */
export class GameScreen {
    constructor(screenStateMachine, game) {
        this.gsm = screenStateMachine;
        this.game = game;
        this._cache = {};
        this._toastTimer = null;
        buildHudLayout(this);
        this._onKey = installHudKeyboard(this.game, this);
    }

    setPhotoMode(on) {
        if (!this.photoExit) {
            this.photoExit = document.createElement('button');
            this.photoExit.type = 'button';
            this.photoExit.className = 'photo-exit';
            this.photoExit.dataset.testid = 'photo-exit';
            this.photoExit.textContent = 'Exit photo · Esc';
            this.photoExit.addEventListener('click', () => this.game.togglePhotoMode());
            document.body.appendChild(this.photoExit);
        }
        this.photoExit.hidden = !on;
    }

    announceCursor(text) {
        if (this.cursorLive) this.cursorLive.textContent = text;
    }

    show() {
        this.container.style.display = 'block';
        this.setSound(Boolean(this.game.audio?.enabled));
        this.updateHud(true);
    }

    setSound(enabled) {
        if (!this.soundButton) return;
        this.soundButton.textContent = enabled ? 'Sound: on' : 'Sound: off';
        this.soundButton.setAttribute('aria-pressed', String(Boolean(enabled)));
    }

    hide() {
        this.container.style.display = 'none';
        if (this.pausePanel) this.pausePanel.hidden = true;
        if (this.menuButton) this.menuButton.setAttribute('aria-expanded', 'false');
        if (this._toastTimer) {
            clearTimeout(this._toastTimer);
            this._toastTimer = null;
        }
        if (this.toastEl) this.toastEl.classList.remove('is-visible');
    }

    toast(message, tone = 'mint', duration = 3000) {
        if (!this.toastEl || !message) return;
        if (this._toastTimer) clearTimeout(this._toastTimer);
        this.toastEl.textContent = message;
        this.toastEl.dataset.tone = tone;
        this.toastEl.classList.add('is-visible');
        this._toastTimer = setTimeout(() => {
            this.toastEl.classList.remove('is-visible');
            this._toastTimer = null;
        }, duration);
    }

    _setText(element, key, value) {
        if (!element) return;
        if (this._cache[key] === value) return;
        this._cache[key] = value;
        element.textContent = value;
    }

    setPatronageState(visible) {
        this.standings.setFlows(visible);
    }

    updateHud(force = false) {
        presentHud(this, force);
    }
}
