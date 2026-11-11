import { programIcon } from './icons.js';
import { NEED_BY_ID } from '../design/needs.js';
import { BUILDING_FINISHES, finishFor, finishCost } from '../services/BuildingFinishes.js';

/**
 * Build dialog for a service. Shares the paper-card language and the focus trap
 * contract of the rest of the overlays. `onBuild(name)` returns `{ok}`.
 */
export class BuildModal {
    constructor({ onBuild, onCancel, overlays }) {
        this.onBuild = onBuild;
        this.onCancel = onCancel;
        this.overlays = overlays;
        this.isOpen = false;
        this.program = null;

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
                    <p class="kicker" style="color:var(--wine)">Capital works · one work</p>
                    <h3 class="modal__title" id="build-modal-title">Raise a service</h3>
                </div>
                <button type="button" class="modal__close" data-testid="build-close" aria-label="Close build dialog">×</button>
            </div>
            <div class="blueprint-summary">
                <span class="blueprint-summary__icon" data-role="icon" aria-hidden="true"></span>
                <span class="blueprint-summary__body">
                    <span class="blueprint-summary__name" data-role="name">Canteen</span>
                    <span class="blueprint-summary__stats" data-role="stats"></span>
                </span>
            </div>
            <p class="modal__blurb" data-role="blurb"></p>
            <dl class="service-facts" data-role="facts"></dl>
            <p class="modal__label">Finish</p>
            <div class="finish-options" data-role="finish"></div>
            <label class="modal__label" for="build-name-input">Name this place</label>
            <input class="modal__input" id="build-name-input" data-testid="build-name" type="text" maxlength="40" autocomplete="off" spellcheck="false">
            <p class="modal__error" data-role="error" aria-live="polite"></p>
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="build-cancel">Cancel</button>
                <button type="button" class="btn btn--primary" data-testid="build-submit">Break ground</button>
            </div>
        `;

        this.iconEl = this.panel.querySelector('[data-role=icon]');
        this.nameEl = this.panel.querySelector('[data-role=name]');
        this.statsEl = this.panel.querySelector('[data-role=stats]');
        this.blurbEl = this.panel.querySelector('[data-role=blurb]');
        this.factsEl = this.panel.querySelector('[data-role=facts]');
        this.finishEl = this.panel.querySelector('[data-role=finish]');
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
        this.finishEl.addEventListener('click', (event) => {
            const button = event.target.closest('[data-finish]');
            if (!button) return;
            this.finish = button.dataset.finish;
            this.renderFinish();
        });
        this.input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.submit();
            }
        });
    }

    show(program, { lumen = 0, works = 0 } = {}) {
        if (this.isOpen) return;
        this.isOpen = true;
        this.program = program;
        this.lumen = lumen;
        this.works = works;
        this.finish = 'comfortable';

        this.renderFinish();
        this.input.value = '';
        this.input.placeholder = `Name your ${program.name}`;
        this.errorEl.textContent = '';

        this.container.style.display = 'flex';
        this.container.classList.add('is-open');
        this.container.setAttribute('aria-hidden', 'false');
        this.overlays.open(this, {
            panel: this.panel,
            initialFocus: () => this.input
        });
    }

    renderFinish() {
        const program = this.program;
        if (!program) return;
        const option = finishFor(this.finish);
        const cost = finishCost(program, this.finish);
        const capacity = Math.max(1, program.capacity + option.capacityDelta);
        const upkeep = program.upkeep + option.upkeepDelta;
        const need = NEED_BY_ID[program.need];
        const secondary = program.secondaryNeed ? NEED_BY_ID[program.secondaryNeed] : null;
        this.iconEl.innerHTML = programIcon(program.id);
        this.nameEl.textContent = program.name;
        this.statsEl.innerHTML = `
            <span><strong>${cost} lumen</strong></span>
            <span>${upkeep} upkeep / day</span>
            <span>1 work</span>
        `;
        this.blurbEl.textContent = `${program.blurb} ${option.blurb}`;
        this.factsEl.innerHTML = `
            <div><dt>Serves</dt><dd>${need ? `${need.glyph} ${need.name}` : 'civic'}${secondary ? ` · ${secondary.glyph} ${secondary.name}` : ''}</dd></div>
            <div><dt>Capacity</dt><dd>${capacity} at a time · ${program.durationText}</dd></div>
            <div><dt>Upkeep</dt><dd>${upkeep} lumen / day · ${option.name} finish</dd></div>
            <div><dt>Hours</dt><dd>${program.open.length ? program.open.join(' · ') : 'always'}</dd></div>
            <div><dt>Footprint</dt><dd>${program.footprint.w}×${program.footprint.h} cells</dd></div>
        `;
        this.finishEl.innerHTML = BUILDING_FINISHES.map((entry) => `
            <button type="button" class="finish-option${entry.id === this.finish ? ' is-selected' : ''}" data-finish="${entry.id}">
                <strong>${entry.name}</strong>
                <span>${entry.costDelta === 0 ? 'base cost' : `${entry.costDelta > 0 ? '+' : ''}${entry.costDelta} lumen`}</span>
                <span>${entry.capacityDelta === 0 ? 'same seats' : `${entry.capacityDelta > 0 ? '+' : ''}${entry.capacityDelta} seat`}</span>
            </button>
        `).join('');
        const error = this.works <= 0
            ? 'No works left today.'
            : this.lumen < cost
                ? `Need ${cost - this.lumen} more lumen.`
                : '';
        this.submitBtn.disabled = Boolean(error);
        this.submitBtn.textContent = error ? 'Not yet' : 'Break ground';
    }

    submit() {
        if (!this.isOpen || this.submitBtn.disabled) return;
        const raw = this.input.value.trim();
        const name = raw || this.program?.name || 'Untitled';
        const result = this.onBuild(name, this.finish);
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
            event.stopPropagation();
            this.hide();
            return;
        }
        if (event.key !== 'Tab') return;
        this.overlays.trapTab(event, this.panel);
    }

    hide(cancelled = true) {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.container.style.display = 'none';
        this.container.classList.remove('is-open');
        this.container.setAttribute('aria-hidden', 'true');
        this.overlays.close(this);
        if (cancelled && this.onCancel) this.onCancel();
    }
}
