import { programIcon } from './icons.js';
import { NEED_BY_ID } from '../design/needs.js';
import { RETROFIT_BY_ID, RETROFIT_MIN_COST } from '../services/RetrofitModules.js';
import { SERVICE_HOURS, SERVICE_HOURS_BY_ID } from '../services/ServicePolicies.js';

/**
 * Service record: the same card is used for inspection, reopening a closed
 * service, and dismantling. It shows the things the day report talks about:
 * capacity, visits, hearts, upkeep and the last choice made here.
 */
export class ServiceCardModal {
    constructor({ onDemolish, onReopen, onRetrofit, onHours, overlays, game }) {
        this.onDemolish = onDemolish;
        this.onReopen = onReopen;
        this.onRetrofit = onRetrofit;
        this.onHours = onHours;
        this.overlays = overlays;
        this.game = game;
        this.isOpen = false;
        this.service = null;

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
            <label class="service-hours" data-role="hours-wrap" hidden>Hours
                <select data-testid="service-hours">${SERVICE_HOURS.map((entry) => `<option value="${entry.id}">${escapeHtml(entry.name)}</option>`).join('')}</select>
            </label>
            <p class="modal__note" data-role="note"></p>
            <p class="modal__error" data-role="error" aria-live="polite"></p>
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="structure-cancel">Keep it</button>
                <button type="button" class="btn btn--mint" data-testid="structure-upgrade" hidden>Retrofit</button>
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
        this.hoursWrap = this.panel.querySelector('[data-role=hours-wrap]');
        this.hoursSelect = this.panel.querySelector('[data-testid=service-hours]');
        this.noteEl = this.panel.querySelector('[data-role=note]');
        this.errorEl = this.panel.querySelector('[data-role=error]');
        this.demolishBtn = this.panel.querySelector('[data-testid=structure-demolish]');
        this.reopenBtn = this.panel.querySelector('[data-testid=structure-reopen]');
        this.upgradeBtn = this.panel.querySelector('[data-testid=structure-upgrade]');

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
        this.upgradeBtn.addEventListener('click', () => this.requestRetrofit());
        this.hoursSelect.addEventListener('change', () => this.changeHours(this.hoursSelect.value));
        this.container.addEventListener('keydown', (event) => this.onKeyDown(event));
    }

    show(service) {
        if (this.isOpen) return;
        this.isOpen = true;
        this.service = service;

        const program = service.program;
        const need = program?.need ? NEED_BY_ID[program.need] : null;
        const secondary = program?.secondaryNeed ? NEED_BY_ID[program.secondaryNeed] : null;
        const working = service.state === 'ACTIVE' && !service.closed;
        const upkeep = this.game?.charter?.services.upkeepFor(service) ?? program?.upkeep ?? 0;
        this.nameEl.textContent = service.name;
        this.iconEl.innerHTML = programIcon(service.programId);
        this.programEl.textContent = program?.name || 'Service';
        const shared = service.chapterId === 'commons';
        this.statsEl.innerHTML = `
            <span><strong>${working ? 'Working' : service.closed ? 'Closed' : 'Under construction'}</strong></span>
            <span>${escapeHtml(service.chapterName || 'Home Chapter')}</span>
            <span>${service.capacity} capacity</span>
            <span>${shared ? 'shared · purse-funded' : service.chapterId !== 'player' ? 'rival budget' : `${upkeep} upkeep / day`}</span>
        `;
        this.blurbEl.textContent = program?.blurb || '';
        this.factsEl.innerHTML = `
            <div><dt>Chapter</dt><dd>${escapeHtml(service.chapterName || 'Home Chapter')}</dd></div>
            ${service.builderChapterId ? `<div><dt>Built by</dt><dd>${escapeHtml(this.game?.charter?.chapterById(service.builderChapterId)?.name || 'A chapter')}</dd></div>` : ''}
            <div><dt>Serves</dt><dd>${need ? `${need.glyph} ${need.name}` : 'civic'}${secondary ? ` · ${secondary.glyph} ${secondary.name}` : ''}</dd></div>
            <div><dt>Visits</dt><dd>${service.visits}</dd></div>
            <div><dt>Hearts</dt><dd>${service.hearts.toFixed(1)}</dd></div>
            <div><dt>Condition</dt><dd>${service.level >= 2 ? `Retrofitted · ${escapeHtml(RETROFIT_BY_ID[service.retrofitId]?.name || 'custom finish')}` : 'As built'}${service.qualityBonus ? ` · +${service.qualityBonus.toFixed(2)} quality` : ''}</dd></div>
            <div><dt>Hours</dt><dd>${escapeHtml(SERVICE_HOURS_BY_ID[service.policy?.hours]?.name || 'As built')}</dd></div>
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
        const rivalService = service.chapterId && service.chapterId !== 'player';
        const refund = Math.max(1, Math.floor((program?.cost || 0) / 2));
        this.demolishBtn.textContent = shared
            ? 'Shared service'
            : rivalService
                ? 'Rival service'
                : `Dismantle · +${refund} lumen`;
        this.demolishBtn.disabled = Boolean(service.fixed) || rivalService;
        this.demolishBtn.title = shared
            ? 'A shared commons service belongs to every chapter.'
            : rivalService
                ? "A rival chapter's service cannot be dismantled."
                : service.fixed ? 'The Welcome Post is part of the charter.' : '';
        const canUpgrade = !rivalService && !service.fixed && working && service.level < 2;
        this.upgradeBtn.hidden = !canUpgrade;
        this.upgradeBtn.disabled = !canUpgrade || (this.game?.charter?.lumen || 0) < RETROFIT_MIN_COST;
        this.upgradeBtn.textContent = 'Retrofit →';
        this.upgradeBtn.title = canUpgrade ? 'Add two seats, better finish and one upkeep.' : '';
        const canSetHours = !rivalService && !service.fixed && service.programId !== 'housing' && working;
        this.hoursWrap.hidden = !canSetHours;
        this.hoursSelect.value = SERVICE_HOURS_BY_ID[service.policy?.hours] ? service.policy.hours : 'as_built';
        this.reopenBtn.hidden = !service.closed;
        this.reopenBtn.disabled = rivalService;
        this.reopenBtn.textContent = service.closed
            ? rivalService
                ? 'Rival service'
                : `Reopen · ${this.game?.charter?.services.reopenCost(service) || 1} lumen`
            : 'Reopen';

        this.container.style.display = 'flex';
        this.container.classList.add('is-open');
        this.container.setAttribute('aria-hidden', 'false');
        this.overlays.open(this, {
            panel: this.panel,
            initialFocus: () => this.panel.querySelector('[data-testid=structure-cancel]')
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

    changeHours(hoursId) {
        if (!this.isOpen || !this.service) return;
        const service = this.service;
        const result = this.onHours(service, hoursId);
        if (result?.ok === false) {
            this.errorEl.textContent = result.error || 'Those hours cannot be set.';
            return;
        }
        this.hide();
        this.show(service);
    }

    requestRetrofit() {
        if (!this.isOpen || !this.service) return;
        this.onRetrofit(this.service);
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
        this.overlays.trapTab(event, this.panel);
    }

    hide() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.service = null;
        this.container.style.display = 'none';
        this.container.classList.remove('is-open');
        this.container.setAttribute('aria-hidden', 'true');
        this.overlays.close(this);
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
