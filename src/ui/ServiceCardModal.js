import { programIcon } from './icons.js';
import { serviceCardMarkup } from './serviceCard/ServiceCardMarkup.js';
import { buildServiceCardView } from './serviceCard/ServiceCardView.js';

/**
 * Service record: the same card is used for inspection, reopening a closed
 * service, and dismantling. It shows the things the day report talks about:
 * capacity, visits, hearts, upkeep and the last choice made here.
 */
export class ServiceCardModal {
    constructor({ onDemolish, onReopen, onRetrofit, onHours, onFloor, onVibe, onAccess, onFocus, onRepair, onInterior, onOpenResident, onRename, overlays, game }) {
        this.onDemolish = onDemolish;
        this.onRepair = onRepair;
        this.onInterior = onInterior;
        this.onOpenResident = onOpenResident;
        this.onRename = onRename;
        this.onReopen = onReopen;
        this.onRetrofit = onRetrofit;
        this.onHours = onHours;
        this.onFloor = onFloor;
        this.onVibe = onVibe;
        this.onAccess = onAccess;
        this.onFocus = onFocus;
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

        this.panel.innerHTML = serviceCardMarkup();

        this.nameEl = this.panel.querySelector('[data-role=name]');
        this.renameRow = this.panel.querySelector('[data-role=rename-row]');
        this.renameInput = this.panel.querySelector('[data-testid=service-name-input]');
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
        this.focusWrap = this.panel.querySelector('[data-role=focus-wrap]');
        this.focusSelect = this.panel.querySelector('[data-testid=service-focus]');
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
        this.panel.querySelector('[data-testid=service-interior-open]').addEventListener('click', () => this.onInterior?.(this.service));
        this.demolishBtn.addEventListener('click', () => this.demolish());
        this.repairBtn.addEventListener('click', () => this.repair());
        this.reopenBtn.addEventListener('click', () => this.reopen());
        this.upgradeBtn.addEventListener('click', () => this.requestRetrofit());
        this.floorBtn.addEventListener('click', () => this.addFloor());
        this.hoursSelect.addEventListener('change', () => this.changeHours(this.hoursSelect.value));
        this.vibeSelect.addEventListener('change', () => this.changeVibe(this.vibeSelect.value));
        this.accessSelect.addEventListener('change', () => this.changeAccess(this.accessSelect.value));
        this.focusSelect.addEventListener('change', () => this.changeFocus(this.focusSelect.value));
        this.panel.querySelector('[data-testid=service-rename]').addEventListener('click', () => this.startRename());
        this.panel.querySelector('[data-testid=service-name-save]').addEventListener('click', () => this.saveRename());
        this.panel.querySelector('[data-testid=service-name-cancel]').addEventListener('click', () => this.cancelRename());
        this.container.addEventListener('keydown', (event) => this.onKeyDown(event));
    }

    show(service) {
        if (this.isOpen) return;
        this.isOpen = true;
        this.service = service;

        const view = buildServiceCardView(service, this.game);
        this.nameEl.textContent = service.name;
        this.renameRow.hidden = true;
        this.iconEl.innerHTML = programIcon(service.programId);
        this.programEl.textContent = view.programName;
        this.statsEl.innerHTML = view.stats;
        this.blurbEl.textContent = view.blurb;
        this.factsEl.innerHTML = view.facts;
        this.noteEl.textContent = view.note;
        this.interiorEl.innerHTML = view.interior;
        this.regularsEl.hidden = !view.regulars;
        this.regularsEl.innerHTML = view.regulars;
        this.regularsEl.querySelectorAll('[data-resident-id]').forEach((button) => {
            button.addEventListener('click', () => this.onOpenResident?.(button.dataset.residentId));
        });
        this.errorEl.textContent = '';

        this.demolishBtn.textContent = view.demolish.text;
        this.demolishBtn.disabled = view.demolish.disabled;
        this.demolishBtn.title = view.demolish.title;
        this.repairBtn.textContent = view.repair.text;
        this.repairBtn.hidden = view.repair.hidden;
        this.repairBtn.disabled = view.repair.disabled;
        this.upgradeBtn.hidden = view.upgrade.hidden;
        this.upgradeBtn.disabled = view.upgrade.disabled;
        this.upgradeBtn.textContent = view.upgrade.text;
        this.upgradeBtn.title = view.upgrade.title;
        this.floorBtn.hidden = view.floor.hidden;
        this.floorBtn.disabled = view.floor.disabled;
        this.focusWrap.hidden = view.focus.hidden;
        if (!view.focus.hidden) {
            this.focusSelect.innerHTML = view.focus.options;
            this.focusSelect.value = view.focus.value;
        }
        this.hoursWrap.hidden = view.hours.hidden;
        this.hoursSelect.value = view.hours.value;
        this.vibeWrap.hidden = view.vibe.hidden;
        this.vibeSelect.value = view.vibe.value;
        this.vibeSelect.disabled = view.vibe.disabled;
        this.accessWrap.hidden = view.access.hidden;
        this.accessSelect.value = view.access.value;
        this.accessSelect.disabled = view.access.disabled;
        this.reopenBtn.hidden = view.reopen.hidden;
        this.reopenBtn.disabled = view.reopen.disabled;
        this.reopenBtn.textContent = view.reopen.text;

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

    startRename() {
        if (!this.isOpen || !this.service) return;
        this.renameRow.hidden = false;
        this.renameInput.value = this.service.name;
        this.renameInput.focus({ preventScroll: true });
        this.renameInput.select();
    }

    cancelRename() {
        if (!this.isOpen) return;
        this.renameRow.hidden = true;
    }

    saveRename() {
        if (!this.isOpen || !this.service) return;
        const service = this.service;
        const result = this.onRename(service, this.renameInput.value);
        if (result?.ok === false) {
            this.errorEl.textContent = result.error || 'That name cannot be saved.';
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

    changeFocus(focusId) {
        if (!this.isOpen || !this.service) return;
        const service = this.service;
        const result = this.onFocus(service, focusId);
        if (result?.ok === false) {
            this.errorEl.textContent = result.error || 'That focus cannot be set.';
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

