import { escapeHtml } from './html.js';
import { FLOOR_PLAN_BY_ID } from '../services/FloorPlans.js';

/**
 * A room-by-room view of an open service. The service record shows the stack;
 * stepping inside shows what each floor is for and who is using it.
 */
export class ServiceInteriorModal {
    constructor({ overlays }) {
        this.overlays = overlays;
        this.isOpen = false;
        this.service = null;
        this.game = null;
        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'service-interior-scrim';

        this.panel = document.createElement('div');
        this.panel.className = 'modal service-interior';
        this.panel.dataset.testid = 'service-interior';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-label', 'Inside the service');
        this.panel.hidden = true;
        this.panel.addEventListener('click', (event) => {
            if (event.target.closest('[data-testid=service-interior-done]')) this.hide();
        });
        this.container.appendChild(this.panel);
        this.container.addEventListener('pointerdown', (event) => event.stopPropagation());
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isOpen && this.overlays.isTop(this)) {
                event.preventDefault();
                this.hide();
            }
        });
    }

    show(service, game) {
        if (!service) return;
        this.service = service;
        this.game = game;
        this.isOpen = true;
        this.render();
        this.panel.hidden = false;
        document.body.appendChild(this.container);
        this.container.style.display = 'flex';
        this.container.setAttribute('aria-hidden', 'false');
        this.overlays.open(this, { panel: this.panel, initialFocus: () => this.panel.querySelector('[data-testid=service-interior-done]') });
        this.panel.querySelector('[data-testid=service-interior-done]')?.focus();
    }

    hide() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.panel.hidden = true;
        this.container.style.display = 'none';
        this.container.setAttribute('aria-hidden', 'true');
        this.overlays.close(this);
    }

    moveHouse(residentId) {
        const selected = this.panel.querySelector('[data-testid=house-target]')?.value;
        const target = this.otherHomes?.find((home) => home.id === selected) || this.otherHomes?.[0];
        if (!target) return;
        const result = this.game?.charter?.moveResidentHome?.(residentId, target.id);
        if (!result?.ok) return;
        this.game.saveGame?.();
        this.render();
    }

    moveResident(residentId, floor) {
        if (!this.housing || !this.game?.charter) return;
        const resident = this.game.charter.activeResidents.find((entry) => entry.id === residentId);
        const rooms = this.floors || [];
        const target = rooms[floor];
        if (!resident || !target) return;
        if (target.occupants.length >= target.seats) return;
        resident.homeFloor = floor;
        this.render();
        this.game.saveGame?.();
    }

    render() {
        const service = this.service;
        const program = service.program;
        const housing = program?.need === 'rest' && program?.id === 'housing';
        const floors = [
            { label: 'Ground', plan: null, seats: Math.max(0, service.capacity - (service.floorPlans || []).reduce((sum, id) => sum + (housing ? (FLOOR_PLAN_BY_ID[id]?.housingCapacity || 0) : (FLOOR_PLAN_BY_ID[id]?.serviceCapacity || 0)), 0)) },
            ...(service.floorPlans || []).map((id, index) => {
                const plan = FLOOR_PLAN_BY_ID[id];
                return {
                    label: index === 0 ? 'First floor' : 'Second floor',
                    plan,
                    seats: housing ? (plan?.housingCapacity || 0) : (plan?.serviceCapacity || 0)
                };
            })
        ];
        const residents = this.game?.charter?.activeResidents || [];
        const here = residents.filter((resident) => housing
            ? resident.homeServiceId === service.id
            : resident.memory?.lastChoice?.serviceId === service.id);
        floors.forEach((floor, index) => {
            floor.index = index;
            floor.occupants = housing
                ? here.filter((resident) => resident.homeFloor === index)
                : [];
        });
        this.floors = floors;
        this.housing = housing;
        const roster = this.game?.charter?.roster || [];
        this.otherHomes = housing
            ? (this.game?.charter?.services?.housingServices || []).filter((home) => home.id !== service.id && roster.filter((resident) => resident.active && resident.homeServiceId === home.id).length < home.capacity)
            : [];
        const canStaff = !housing && service.chapterId === 'player' && service.state === 'ACTIVE' && !service.closed;
        const staffOptions = residents.map((resident) => `<option value="${escapeHtml(resident.id)}" ${service.staffId === resident.id ? 'selected' : ''}>${escapeHtml(resident.name)}${resident.workServiceId && resident.workServiceId !== service.id ? ' · elsewhere' : ''}</option>`).join('');
        const people = here.length
            ? here.slice(0, 8).map((resident) => `<li><strong>${escapeHtml(resident.name)}</strong><span>${escapeHtml(resident.lastChoice || 'a familiar face')}</span></li>`).join('')
            : '<li class="service-interior__empty">No one is inside just now.</li>';
        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker">Inside the door · ${escapeHtml(service.chapterName || service.chapterId)}</p>
                    <h2 class="modal__title">${escapeHtml(service.name)}</h2>
                </div>
                <button type="button" class="modal__close" data-testid="service-interior-close" aria-label="Close">×</button>
            </div>
            <p class="modal__blurb">${escapeHtml(program?.blurb || 'A room built for a need.')}</p>
            <div class="service-interior__rooms">
                ${floors.map((floor) => `
                    <article class="interior-room">
                        <span class="kicker">${floor.label}</span>
                        <strong>${escapeHtml(floor.plan?.name || program?.name || 'Service')}</strong>
                        <span>${floor.seats} ${housing ? 'beds' : 'seats'}${floor.plan ? ` · +${(floor.plan.quality || 0).toFixed(2)} quality` : ''}</span>
                        ${floor.occupants.length ? `<span class="interior-room__people">${floor.occupants.map((resident) => `${escapeHtml(resident.name)}${housing ? ` <button type="button" class="interior-room__move" data-move-resident="${escapeHtml(resident.id)}" data-move-floor="${floor.index + 1}" data-move-direction="up" aria-label="Move ${escapeHtml(resident.name)} up" ${floor.index + 1 >= floors.length || (floors[floor.index + 1]?.occupants.length || 0) >= (floors[floor.index + 1]?.seats || 0) ? 'disabled' : ''}>↑</button><button type="button" class="interior-room__move" data-move-resident="${escapeHtml(resident.id)}" data-move-floor="${floor.index - 1}" data-move-direction="down" aria-label="Move ${escapeHtml(resident.name)} down" ${floor.index === 0 || (floors[floor.index - 1]?.occupants.length || 0) >= (floors[floor.index - 1]?.seats || 0) ? 'disabled' : ''}>↓</button>${this.otherHomes.length ? `<button type="button" class="interior-room__move" data-move-house="${escapeHtml(resident.id)}" aria-label="Move ${escapeHtml(resident.name)} to another house">→</button>` : ''}` : ''}`).join(', ')}</span>` : ''}
                    </article>
                `).join('')}
            </div>
            <h3 class="service-interior__label">Who is here</h3>
            <ul class="service-interior__people">${people}</ul>
            ${housing && this.otherHomes.length ? `<label class="service-interior__staff">Move to
                <select data-testid="house-target">${this.otherHomes.map((home) => `<option value="${escapeHtml(home.id)}">${escapeHtml(home.name)}</option>`).join('')}</select>
            </label>` : ''}
            ${canStaff ? `<label class="service-interior__staff">Staff
                <select data-testid="service-staff" data-staff-select>
                    <option value="">Nobody yet</option>
                    ${staffOptions}
                </select>
            </label>` : ''}
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="service-interior-done">Back to the record</button>
            </div>
        `;
        this.panel.querySelector('[data-staff-select]')?.addEventListener('change', (event) => {
            const result = this.game?.charter?.assignStaff?.(service, event.target.value || null);
            if (!result?.ok) return;
            this.game.saveGame?.();
            this.render();
        });
        this.panel.querySelectorAll('[data-move-house]').forEach((button) => button.addEventListener('click', (event) => {
            event.stopPropagation();
            this.moveHouse(button.dataset.moveHouse);
        }));
        this.panel.querySelectorAll('[data-move-resident]').forEach((button) => button.addEventListener('click', (event) => {
            event.stopPropagation();
            this.moveResident(button.dataset.moveResident, Number(button.dataset.moveFloor));
        }));
        this.panel.querySelector('[data-testid=service-interior-close]')?.addEventListener('click', (event) => {
            event.stopPropagation();
            this.hide();
        });
        this.panel.querySelector('[data-testid=service-interior-done]')?.addEventListener('click', (event) => {
            event.stopPropagation();
            this.hide();
        });
    }
}
