import { programIcon } from './icons.js';
import { NEED_BY_ID } from '../design/needs.js';
import { RETROFIT_BY_ID, RETROFIT_MIN_COST } from '../services/RetrofitModules.js';
import { SERVICE_HOURS, SERVICE_HOURS_BY_ID } from '../services/ServicePolicies.js';
import { SERVICE_VIBES, SERVICE_VIBE_BY_ID } from '../services/ServiceVibes.js';
import { SERVICE_ACCESS, SERVICE_ACCESS_BY_ID } from '../services/ServiceAccess.js';
import { FLOOR_PLAN_BY_ID } from '../services/FloorPlans.js';
import { finishCost } from '../services/BuildingFinishes.js';
import { escapeHtml } from './html.js';

/**
 * Service record: the same card is used for inspection, reopening a closed
 * service, and dismantling. It shows the things the day report talks about:
 * capacity, visits, hearts, upkeep and the last choice made here.
 */
export class ServiceCardModal {
    constructor({ onDemolish, onReopen, onRetrofit, onHours, onFloor, onVibe, onAccess, onRepair, onOpenResident, overlays, game }) {
        this.onDemolish = onDemolish;
        this.onRepair = onRepair;
        this.onOpenResident = onOpenResident;
        this.onReopen = onReopen;
        this.onRetrofit = onRetrofit;
        this.onHours = onHours;
        this.onFloor = onFloor;
        this.onVibe = onVibe;
        this.onAccess = onAccess;
        this.overlays = overlays;
        this.game = game;
        this.isOpen = false;
        this.service = null;

        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'structure-modal-scrim';

        this.panel = document.createElement('div');
        this.panel.className = 'modal service-card';
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
            <div class="service-policy-row">
                <label class="service-hours" data-role="hours-wrap" hidden>Hours
                    <select data-testid="service-hours">${SERVICE_HOURS.map((entry) => `<option value="${entry.id}">${escapeHtml(entry.name)}</option>`).join('')}</select>
                </label>
                <label class="service-hours" data-role="vibe-wrap" hidden>Atmosphere
                    <select data-testid="service-vibe">${SERVICE_VIBES.map((entry) => `<option value="${entry.id}">${escapeHtml(entry.name)}</option>`).join('')}</select>
                </label>
                <label class="service-hours" data-role="access-wrap" hidden>Welcome
                    <select data-testid="service-access">${SERVICE_ACCESS.map((entry) => `<option value="${entry.id}">${escapeHtml(entry.name)}</option>`).join('')}</select>
                </label>
            </div>
            <div class="service-interior" data-role="interior"></div>
            <div class="service-regulars" data-role="regulars" hidden></div>
            <p class="modal__note" data-role="note"></p>
            <p class="modal__error" data-role="error" aria-live="polite"></p>
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="structure-cancel">Keep it</button>
                <button type="button" class="btn btn--mint" data-testid="structure-upgrade" hidden>Retrofit</button>
                <button type="button" class="btn btn--paper" data-testid="structure-floor" hidden>Add a floor · 4</button>
                <button type="button" class="btn btn--mint" data-testid="structure-reopen" hidden>Reopen</button>
                <button type="button" class="btn btn--mint" data-testid="structure-repair" hidden>Repair · 3</button>
                <button type="button" class="btn btn--danger" data-testid="structure-demolish">Dismantle</button>
            </div>
        `;

        this.nameEl = this.panel.querySelector('[data-role=name]');
        this.iconEl = this.panel.querySelector('[data-role=icon]');
        this.programEl = this.panel.querySelector('[data-role=program]');
        this.statsEl = this.panel.querySelector('[data-role=stats]');
        this.blurbEl = this.panel.querySelector('[data-role=blurb]');
        this.factsEl = this.panel.querySelector('[data-role=facts]');
        this.regularsEl = this.panel.querySelector('[data-role=regulars]');
        this.interiorEl = this.panel.querySelector('[data-role=interior]');
        this.hoursWrap = this.panel.querySelector('[data-role=hours-wrap]');
        this.hoursSelect = this.panel.querySelector('[data-testid=service-hours]');
        this.vibeWrap = this.panel.querySelector('[data-role=vibe-wrap]');
        this.vibeSelect = this.panel.querySelector('[data-testid=service-vibe]');
        this.accessWrap = this.panel.querySelector('[data-role=access-wrap]');
        this.accessSelect = this.panel.querySelector('[data-testid=service-access]');
        this.noteEl = this.panel.querySelector('[data-role=note]');
        this.errorEl = this.panel.querySelector('[data-role=error]');
        this.demolishBtn = this.panel.querySelector('[data-testid=structure-demolish]');
        this.repairBtn = this.panel.querySelector('[data-testid=structure-repair]');
        this.reopenBtn = this.panel.querySelector('[data-testid=structure-reopen]');
        this.upgradeBtn = this.panel.querySelector('[data-testid=structure-upgrade]');
        this.floorBtn = this.panel.querySelector('[data-testid=structure-floor]');

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
        this.repairBtn.addEventListener('click', () => this.repair());
        this.reopenBtn.addEventListener('click', () => this.reopen());
        this.upgradeBtn.addEventListener('click', () => this.requestRetrofit());
        this.floorBtn.addEventListener('click', () => this.addFloor());
        this.hoursSelect.addEventListener('change', () => this.changeHours(this.hoursSelect.value));
        this.vibeSelect.addEventListener('change', () => this.changeVibe(this.vibeSelect.value));
        this.accessSelect.addEventListener('change', () => this.changeAccess(this.accessSelect.value));
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
            <div><dt>Finish</dt><dd>${escapeHtml(service.finish || 'comfortable')}</dd></div>
            <div><dt>Floors</dt><dd>${service.floors || 1} / 3${(service.floorPlans || []).length ? ` · ${(service.floorPlans || []).map((id) => escapeHtml(FLOOR_PLAN_BY_ID[id]?.name || id)).join(', ')}` : ''}</dd></div>
            ${service.adjacencyBonus ? `<div><dt>Neighbours</dt><dd>+${service.adjacencyBonus.toFixed(2)} quality · ${service.adjacencyNeighbours || 0} door${service.adjacencyNeighbours === 1 ? '' : 's'}</dd></div>` : ''}
            ${service.districtName ? `<div><dt>District</dt><dd>${escapeHtml(service.districtName)} · +${service.districtBonus.toFixed(2)} quality · ${service.districtSize} doors</dd></div>` : ''}
            <div><dt>Condition</dt><dd>${service.retrofits?.length ? `Retrofitted · ${service.retrofits.map((id) => escapeHtml(RETROFIT_BY_ID[id]?.name || id)).join(' + ')}` : 'As built'}${service.qualityBonus ? ` · +${service.qualityBonus.toFixed(2)} quality` : ''}</dd></div>
            <div><dt>Wear</dt><dd>${Math.round(service.condition ?? 100)}%</dd></div>
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
        const housing = service.programId === 'housing';
        const floorPlans = (service.floorPlans || []).map((id) => FLOOR_PLAN_BY_ID[id]).filter(Boolean);
        const upperSeats = floorPlans.reduce((sum, plan) => sum + (housing ? (plan.housingCapacity || 0) : (plan.serviceCapacity || 0)), 0);
        const floorRows = [
            { label: 'Ground', name: program?.name || 'Service', detail: `${Math.max(0, service.capacity - upperSeats)} ${housing ? 'beds' : 'seats'}` },
            ...(service.floorPlans || []).map((id, index) => {
                const plan = FLOOR_PLAN_BY_ID[id];
                const seats = housing ? (plan?.housingCapacity || 0) : (plan?.serviceCapacity || 0);
                return {
                    label: index === 0 ? 'First floor' : 'Second floor',
                    name: plan?.name || id,
                    detail: seats ? `+${seats} ${housing ? 'beds' : 'seats'} · +${(plan?.quality || 0).toFixed(2)} quality` : `no new seats · +${(plan?.quality || 0).toFixed(2)} quality`
                };
            })
        ];
        this.interiorEl.innerHTML = `<span class="kicker">The interior</span>${floorRows.map((row) => `<div class="service-interior__floor"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.detail)}</small></div>`).join('')}`;
        const regulars = (this.game?.charter?.activeResidents || [])
            .filter((resident) => housing
                ? resident.homeServiceId === service.id
                : resident.memory?.lastChoice?.serviceId === service.id)
            .slice(0, 4);
        this.regularsEl.hidden = regulars.length === 0;
        this.regularsEl.innerHTML = regulars.length
            ? `<span class="kicker">${housing ? 'Residents here' : 'Last seen here'}</span>${regulars.map((resident) => `<button type="button" class="service-regulars__person" data-resident-id="${escapeHtml(resident.id)}">${escapeHtml(resident.name)}</button>`).join('')}`
            : '';
        this.regularsEl.querySelectorAll('[data-resident-id]').forEach((button) => {
            button.addEventListener('click', () => this.onOpenResident?.(button.dataset.residentId));
        });
        this.errorEl.textContent = '';
        const rivalService = service.chapterId && service.chapterId !== 'player';
        const refund = Math.max(1, Math.floor(finishCost(program, service.finish) / 2));
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
        const canRepair = !rivalService && working && (service.condition ?? 100) < 100;
        this.repairBtn.hidden = !canRepair;
        this.repairBtn.disabled = !canRepair || (this.game?.charter?.lumen || 0) < 3;
        const canUpgrade = !rivalService && !service.fixed && working && (service.retrofits?.length || 0) < 2;
        this.upgradeBtn.hidden = !canUpgrade;
        this.upgradeBtn.disabled = !canUpgrade || (this.game?.charter?.lumen || 0) < RETROFIT_MIN_COST;
        this.upgradeBtn.textContent = (service.retrofits?.length || 0) === 1 ? 'Add a second module →' : 'Add a module →';
        this.upgradeBtn.title = canUpgrade ? 'Add a permanent module: seats, quality or a later kitchen.' : '';
        const canFloor = !rivalService && !service.fixed && working && (service.floors || 1) < 3;
        this.floorBtn.hidden = !canFloor;
        this.floorBtn.disabled = !canFloor || (this.game?.charter?.lumen || 0) < 4;
        const canSetHours = !rivalService && !service.fixed && service.programId !== 'housing' && working;
        this.hoursWrap.hidden = !canSetHours;
        this.hoursSelect.value = SERVICE_HOURS_BY_ID[service.policy?.hours] ? service.policy.hours : 'as_built';
        const canSetVibe = !rivalService && !service.fixed && working;
        this.vibeWrap.hidden = !canSetVibe;
        this.vibeSelect.value = SERVICE_VIBE_BY_ID[service.policy?.vibe] ? service.policy.vibe : (program?.vibe || 'cosy');
        this.vibeSelect.disabled = !canSetVibe;
        const canSetAccess = !rivalService && !service.fixed && working;
        this.accessWrap.hidden = !canSetAccess;
        this.accessSelect.value = SERVICE_ACCESS_BY_ID[service.policy?.access] ? service.policy.access : 'open';
        this.accessSelect.disabled = !canSetAccess;
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

    repair() {
        if (!this.isOpen || !this.service) return;
        const service = this.service;
        const result = this.onRepair(service);
        if (result?.ok) {
            this.hide();
            this.show(service);
        }
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

    changeAccess(accessId) {
        if (!this.isOpen || !this.service) return;
        const service = this.service;
        const result = this.onAccess(service, accessId);
        if (result?.ok === false) {
            this.errorEl.textContent = result.error || 'That access policy cannot be set.';
            return;
        }
        this.hide();
        this.show(service);
    }

    changeVibe(vibeId) {
        if (!this.isOpen || !this.service) return;
        const service = this.service;
        const result = this.onVibe(service, vibeId);
        if (result?.ok === false) {
            this.errorEl.textContent = result.error || 'That atmosphere cannot be set.';
            return;
        }
        this.hide();
        this.show(service);
    }

    addFloor() {
        if (!this.isOpen || !this.service) return;
        const result = this.onFloor(this.service);
        if (result?.ok === false) this.errorEl.textContent = result.error || 'That floor cannot be added.';
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

