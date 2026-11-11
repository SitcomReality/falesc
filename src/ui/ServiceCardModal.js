import { programIcon } from './icons.js';
import { NEED_BY_ID } from '../design/needs.js';

/**
 * Service record: the same card is used for inspection, reopening a closed
 * service, and dismantling. It shows the things the day report talks about:
 * capacity, visits, hearts, upkeep and the last choice made here.
 */
export class ServiceCardModal {
    constructor({ onDemolish, onReopen, inputManager, game }) {
        this.onDemolish = onDemolish;
        this.onReopen = onReopen;
        this.inputManager = inputManager;
        this.game = game;
        this.isOpen = false;
        this.service = null;
        this.lastFocused = null;
        this.inertHud = null;

        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'structure-modal-scrim';

        this.panel = document.createElement('div');
        this.panel.className = 'modal';
        this.panel.dataset.testid = 'structure-modal';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'structure-modal-title');

        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">Service record</p>
                    <h3 class="modal__title" id="structure-modal-title" data-role="name">Canteen</h3>
                </div>
                <button type="button" class="modal__close" data-testid="structure-close" aria-label="Close service record">×</button>
            </div>
            <div class="blueprint-summary">
                <span class="blueprint-summary__icon" data-role="icon" aria-hidden="true"></span>
                <span class="blueprint-summary__body">
                    <span class="blueprint-summary__name" data-role="program">Canteen</span>
                    <span class="blueprint-summary__stats" data-role="stats"></span>
                </span>
            </div>
            <p class="modal__blurb" data-role="blurb"></p>
            <dl class="service-facts" data-role="facts"></dl>
            <p class="modal__note" data-role="note"></p>
            <p class="modal__error" data-role="error" aria-live="polite"></p>
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="structure-cancel">Keep it</button>
                <button type="button" class="btn btn--mint" data-testid="structure-reopen" hidden>Reopen</button>
                <button type="button" class="btn btn--danger" data-testid="structure-demolish">Dismantle</button>
            </div>
        `;

        this.nameEl = this.panel.querySelector('[data-role=name]');
        this.iconEl = this.panel.querySelector('[data-role=icon]');
        this.programEl = this.panel.querySelector('[data-role=program]');
        this.statsEl = this.panel.querySelector('[data-role=stats]');
        this.blurbEl = this.panel.querySelector('[data-role=blurb]');
        this.factsEl = this.panel.querySelector('[data-role=facts]');
        this.noteEl = this.panel.querySelector('[data-role=note]');
        this.errorEl = this.panel.querySelector('[data-role=error]');
        this.demolishBtn = this.panel.querySelector('[data-testid=structure-demolish]');
        this.reopenBtn = this.panel.querySelector('[data-testid=structure-reopen]');

        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';

        this.container.addEventListener('pointerdown', (event) => event.stopPropagation());
        this.container.addEventListener('click', (event) => {
            if (event.target === this.container) this.hide();
        });
        this.panel.querySelector('[data-testid=structure-close]').addEventListener('click', () => this.hide());
        this.panel.querySelector('[data-testid=structure-cancel]').addEventListener('click', () => this.hide());
        this.demolishBtn.addEventListener('click', () => this.demolish());
        this.reopenBtn.addEventListener('click', () => this.reopen());
        this.container.addEventListener('keydown', (event) => this.onKeyDown(event));
    }

    show(service) {
        if (this.isOpen) return;
        this.isOpen = true;
        this.service = service;
        this.lastFocused = document.activeElement;

        const program = service.program;
        const need = program?.need ? NEED_BY_ID[program.need] : null;
        const working = service.state === 'ACTIVE' && !service.closed;
        const upkeep = this.game?.charter?.services.upkeepFor(service) ?? program?.upkeep ?? 0;
        this.nameEl.textContent = service.name;
        this.iconEl.innerHTML = programIcon(service.programId);
        this.programEl.textContent = program?.name || 'Service';
        this.statsEl.innerHTML = `
            <span><strong>${working ? 'Working' : service.closed ? 'Closed' : 'Under construction'}</strong></span>
            <span>${service.capacity} capacity</span>
            <span>${upkeep} upkeep / day</span>
        `;
        this.blurbEl.textContent = program?.blurb || '';
        this.factsEl.innerHTML = `
            <div><dt>Serves</dt><dd>${need ? `${need.glyph} ${need.name}` : 'civic'}</dd></div>
            <div><dt>Visits</dt><dd>${service.visits}</dd></div>
            <div><dt>Hearts</dt><dd>${service.hearts.toFixed(1)}</dd></div>
            <div><dt>Door</dt><dd>${service.entrance ? `cell ${service.entrance.u}, ${service.entrance.v}` : '—'}</dd></div>
        `;
        const lastChoice = this.game?.charter?.activeResidents
            .map((resident) => resident.memory.lastChoice)
            .filter((choice) => choice?.serviceId === service.id)
            .pop();
        this.noteEl.textContent = lastChoice
            ? `Last word: “${lastChoice.reason}”`
            : service.closed
                ? `Closed after an upkeep shortfall. Reopening costs ${this.game?.charter?.services.reopenCost(service) || 1} lumen.`
                : 'The door is open. The day report will tell you who came through it.';
        this.errorEl.textContent = '';
        const refund = Math.max(1, Math.floor((program?.cost || 0) / 2));
        this.demolishBtn.textContent = `Dismantle · +${refund} lumen`;
        this.demolishBtn.disabled = Boolean(service.fixed);
        this.demolishBtn.title = service.fixed ? 'The Welcome Post is part of the charter.' : '';
        this.reopenBtn.hidden = !service.closed;
        this.reopenBtn.textContent = service.closed
            ? `Reopen · ${this.game?.charter?.services.reopenCost(service) || 1} lumen`
            : 'Reopen';

        this.container.style.display = 'flex';
        this.container.classList.add('is-open');
        this.container.setAttribute('aria-hidden', 'false');
        document.body.classList.add('has-modal');
        this.inertHud = document.querySelector('[data-testid=game-hud]');
        if (this.inertHud) this.inertHud.setAttribute('inert', '');
        if (this.inputManager?.setModalOpen) this.inputManager.setModalOpen(true);

        requestAnimationFrame(() => {
            if (this.isOpen) this.panel.querySelector('[data-testid=structure-cancel]')?.focus({ preventScroll: true });
        });
    }

    demolish() {
        if (!this.isOpen || !this.service) return;
        const result = this.onDemolish(this.service);
        if (result && result.ok === false) {
            this.errorEl.textContent = result.error || 'That service cannot be dismantled.';
            return;
        }
        this.hide(false);
    }

    reopen() {
        if (!this.isOpen || !this.service) return;
        const result = this.onReopen(this.service);
        if (result && result.ok === false) {
            this.errorEl.textContent = result.error || 'That service cannot reopen yet.';
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
        event.stopPropagation();
        const focusable = Array.from(
            this.panel.querySelectorAll('button:not(:disabled), [tabindex]:not([tabindex="-1"])')
        ).filter((element) => element.offsetParent !== null);
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

    hide() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.service = null;
        this.container.style.display = 'none';
        this.container.classList.remove('is-open');
        this.container.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('has-modal');
        if (this.inertHud) {
            this.inertHud.removeAttribute('inert');
            this.inertHud = null;
        }
        if (this.inputManager?.setModalOpen) this.inputManager.setModalOpen(false);
        if (this.lastFocused?.focus) this.lastFocused.focus({ preventScroll: true });
        this.lastFocused = null;
    }
}
