import { blueprintIcon } from './icons.js';
import { effectiveCost } from '../buildings/blueprints.js';

/**
 * Themed build prompt with a focus trap and a real backdrop.
 *
 * `onBuild(name)` returns `{ ok: true }` or `{ ok: false, error }`; the modal
 * only closes on success.
 */
export class BuildModal {
    constructor({ onBuild, onCancel, inputManager }) {
        this.onBuild = onBuild;
        this.onCancel = onCancel;
        this.inputManager = inputManager;
        this.isOpen = false;
        this.lastFocused = null;
        this.blueprint = null;
        this.inertHud = null;

        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'build-modal-scrim';

        this.panel = document.createElement('div');
        this.panel.className = 'modal';
        this.panel.dataset.testid = 'build-modal';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'build-modal-title');

        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">Build · one per tide</p>
                    <h3 class="modal__title" id="build-modal-title">Raise a structure</h3>
                </div>
                <button type="button" class="modal__close" data-testid="build-close" aria-label="Close build dialog">×</button>
            </div>
            <div class="blueprint-summary">
                <span class="blueprint-summary__icon" data-role="icon" aria-hidden="true"></span>
                <span class="blueprint-summary__body">
                    <span class="blueprint-summary__name" data-role="name">Prism Rig</span>
                    <span class="blueprint-summary__stats" data-role="stats"></span>
                </span>
            </div>
            <p class="modal__blurb" data-role="blurb"></p>
            <label class="modal__label" for="build-name-input">Name this structure</label>
            <input class="modal__input" id="build-name-input" data-testid="build-name" type="text" maxlength="40" autocomplete="off" spellcheck="false">
            <p class="modal__error" data-role="error" aria-live="polite"></p>
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="build-cancel">Cancel</button>
                <button type="button" class="btn btn--primary" data-testid="build-submit">Reserve</button>
            </div>
        `;

        this.iconEl = this.panel.querySelector('[data-role=icon]');
        this.nameEl = this.panel.querySelector('[data-role=name]');
        this.statsEl = this.panel.querySelector('[data-role=stats]');
        this.blurbEl = this.panel.querySelector('[data-role=blurb]');
        this.input = this.panel.querySelector('[data-testid=build-name]');
        this.errorEl = this.panel.querySelector('[data-role=error]');
        this.submitBtn = this.panel.querySelector('[data-testid=build-submit]');
        this.cancelBtn = this.panel.querySelector('[data-testid=build-cancel]');
        this.closeBtn = this.panel.querySelector('[data-testid=build-close]');

        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';

        this.container.addEventListener('pointerdown', (event) => event.stopPropagation());
        this.container.addEventListener('click', (event) => {
            if (event.target === this.container) this.hide();
        });

        this.closeBtn.addEventListener('click', () => this.hide());
        this.cancelBtn.addEventListener('click', () => this.hide());
        this.submitBtn.addEventListener('click', () => this.submit());

        this.container.addEventListener('keydown', (event) => this.onKeyDown(event));
        this.input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.submit();
            }
        });
    }

    show(blueprint, lumen, buildings = []) {
        if (this.isOpen) return;
        this.isOpen = true;
        this.blueprint = blueprint;
        this.buildings = buildings;
        this.lumen = lumen;
        this.lastFocused = document.activeElement;

        const cost = effectiveCost(blueprint, buildings);
        this.iconEl.innerHTML = blueprintIcon(blueprint.id);
        this.nameEl.textContent = blueprint.name;
        this.statsEl.innerHTML = `
            <span><strong>${cost} lumen</strong></span>
            ${blueprint.income ? `<span>+${blueprint.income} lumen / tide</span>` : ''}
            ${blueprint.beaconDiscount ? `<span>Beacon −${blueprint.beaconDiscount}</span>` : ''}
            ${blueprint.unique ? '<span>Charter structure</span>' : ''}
        `;
        this.blurbEl.textContent = blueprint.blurb;
        this.input.value = '';
        this.input.placeholder = `Name your ${blueprint.name}`;
        this.errorEl.textContent = '';
        this.submitBtn.disabled = Number(lumen) < cost;
        this.submitBtn.textContent = this.submitBtn.disabled ? 'Not enough lumen' : 'Reserve plot';

        this.container.style.display = 'flex';
        this.container.classList.add('is-open');
        this.container.setAttribute('aria-hidden', 'false');
        document.body.classList.add('has-modal');

        // Keep assistive technology inside the dialog. The scrim blocks the
        // pointer, but `inert` also removes the HUD from the tab/reading order.
        this.inertHud = document.querySelector('[data-testid=game-hud]');
        if (this.inertHud) this.inertHud.setAttribute('inert', '');

        if (this.inputManager && typeof this.inputManager.setModalOpen === 'function') {
            this.inputManager.setModalOpen(true);
        }

        // Defer focus until the scrim is painted; helps Safari and avoids a
        // scroll jump on some mobile browsers.
        requestAnimationFrame(() => {
            if (this.isOpen) this.input.focus({ preventScroll: true });
        });
    }

    updateAffordability(lumen) {
        if (!this.isOpen || !this.blueprint) return;
        this.lumen = lumen;
        const cost = effectiveCost(this.blueprint, this.buildings || []);
        this.submitBtn.disabled = Number(lumen) < cost;
        this.submitBtn.textContent = this.submitBtn.disabled ? 'Not enough lumen' : 'Reserve plot';
    }

    submit() {
        if (!this.isOpen) return;
        if (this.submitBtn.disabled) return;
        const raw = this.input.value.trim();
        const name = raw || this.blueprint?.name || 'Untitled';
        const result = this.onBuild(name);
        if (result && result.ok === false) {
            this.errorEl.textContent = result.error || 'That plot cannot be built on.';
            this.input.focus({ preventScroll: true });
            return;
        }
        this.hide(false);
    }

    onKeyDown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.hide();
            return;
        }
        if (event.key !== 'Tab') return;
        const focusable = Array.from(
            this.panel.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])')
        ).filter((el) => el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    hide(cancelled = true) {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.container.style.display = 'none';
        this.container.classList.remove('is-open');
        this.container.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('has-modal');
        if (this.inertHud) {
            this.inertHud.removeAttribute('inert');
            this.inertHud = null;
        }

        if (this.inputManager && typeof this.inputManager.setModalOpen === 'function') {
            this.inputManager.setModalOpen(false);
        }

        if (this.lastFocused && typeof this.lastFocused.focus === 'function') {
            this.lastFocused.focus({ preventScroll: true });
        }
        this.lastFocused = null;

        if (cancelled && this.onCancel) this.onCancel();
    }
}
