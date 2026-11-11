import { BLUEPRINTS, BLUEPRINT_BY_ID, BEACON_ID, effectiveCost } from '../buildings/blueprints.js';
import { blueprintIcon, ICONS } from '../ui/icons.js';

export class GameScreen {
    constructor(gameStateManager, game) {
        this.gsm = gameStateManager;
        this.game = game;
        this._cache = {};

        this.container = document.createElement('div');
        this.container.className = 'screen screen--hud';
        this.container.dataset.testid = 'game-hud';

        // Top bar ----------------------------------------------------------
        const top = document.createElement('div');
        top.className = 'hud__top';
        top.innerHTML = `
            <div class="brand" aria-label="FALESC — Prism Tide">
                <span class="brand__mark" aria-hidden="true">◇</span>
                <span>
                    <span class="brand__name">FALESC</span>
                    <span class="brand__sub">Prism Tide</span>
                </span>
            </div>
            <div class="tide-card">
                <span class="kicker">Tide</span>
                <span class="tide-card__day" data-testid="turn-display" aria-live="polite">Day 01</span>
                <span class="tide-card__limit" data-role="day-limit">/ 14</span>
            </div>
            <div class="resources">
                <div class="resource" title="Lumen — the currency of the Glass Sea">
                    <span class="resource__icon" aria-hidden="true">${ICONS.lumen}</span>
                    <span class="resource__meta">
                        <span class="resource__label">Lumen</span>
                        <span class="resource__income" data-role="income">+0 / tide</span>
                    </span>
                    <span class="resource__value" data-role="lumen" aria-live="polite">0</span>
                </div>
                <button type="button" class="hud__menu" data-testid="hud-menu" aria-label="Open charter menu" title="Charter menu" aria-expanded="false" aria-controls="charter-menu">☰</button>
            </div>
            <div class="charter-menu" id="charter-menu" data-testid="charter-menu" hidden>
                <p class="kicker">Charter menu</p>
                <button type="button" class="btn btn--small btn--paper" data-testid="resume-game">Return to the tide</button>
                <button type="button" class="btn btn--small btn--ghost charter-menu__abandon" data-testid="end-game">Abandon charter</button>
            </div>
        `;

        // Objective --------------------------------------------------------
        const objective = document.createElement('aside');
        objective.className = 'objective-card';
        objective.innerHTML = `
            <div class="objective-card__head">
                <span class="kicker">Charter</span>
                <span class="objective-card__days" data-role="days-left">14 days left</span>
            </div>
            <p class="objective-card__name">Raise the Aurora Beacon</p>
            <div class="objective-card__track" role="progressbar" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0" aria-label="Aurora Beacon progress">
                <div class="objective-card__fill" data-role="objective-fill"></div>
            </div>
            <div class="objective-card__foot">
                <span data-role="objective-meta">0 / 1 beacon</span>
                <span data-role="beacon-cost">12 lumen</span>
            </div>
        `;

        // Hint -------------------------------------------------------------
        const hint = document.createElement('div');
        hint.className = 'hud__hint';
        hint.dataset.role = 'hint';
        hint.textContent = 'Pick a blueprint, then tap a free plot to raise it.';

        const toast = document.createElement('div');
        toast.className = 'hud-toast';
        toast.dataset.role = 'toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.textContent = '';

        // Bottom -----------------------------------------------------------
        const bottom = document.createElement('div');
        bottom.className = 'hud__bottom';

        const chartSlot = document.createElement('div');
        chartSlot.className = 'chart-slot';
        chartSlot.dataset.minimapMount = '';

        const dock = document.createElement('div');
        dock.className = 'build-dock';
        dock.innerHTML = `
            <div class="build-dock__head">
                <span class="kicker">Blueprints</span>
                <span class="build-dock__note" data-role="actions-note">1 build / tide</span>
            </div>
            <div class="blueprints" role="group" aria-label="Blueprint palette"></div>
            <div class="build-dock__foot">
                <button type="button" class="btn btn--primary" data-testid="end-turn">
                    Let the tide turn <span class="btn__arrow" aria-hidden="true">→</span>
                </button>
            </div>
        `;

        const blueprintList = dock.querySelector('.blueprints');
        this.blueprintButtons = new Map();
        for (const blueprint of BLUEPRINTS) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `blueprint${blueprint.goal ? ' blueprint--goal' : ''}`;
            button.dataset.blueprint = blueprint.id;
            button.dataset.testid = blueprint.testid;
            button.setAttribute('aria-pressed', 'false');
            button.setAttribute('aria-keyshortcuts', String(BLUEPRINTS.indexOf(blueprint) + 1));
            button.title = `${blueprint.name} — ${blueprint.blurb}`;
            button.innerHTML = `
                <span class="blueprint__icon" aria-hidden="true">${blueprintIcon(blueprint.id)}</span>
                <span class="blueprint__name">${blueprint.name}</span>
                <span class="blueprint__meta">
                    <span class="blueprint__cost" data-role="cost">${blueprint.cost} lumen</span>
                    <span data-role="yield">${blueprint.income ? `+${blueprint.income} / tide` : blueprint.goal ? 'the charter' : ''}</span>
                </span>
            `;
            button.addEventListener('click', () => {
                if (button.disabled) return;
                this.game.selectBlueprint(blueprint.id);
                this.updateTurnDisplay(true);
            });
            this.blueprintButtons.set(blueprint.id, button);
            blueprintList.appendChild(button);
        }

        const endTurnBtn = dock.querySelector('[data-testid=end-turn]');
        endTurnBtn.setAttribute('aria-keyshortcuts', 'E');
        endTurnBtn.addEventListener('click', () => this.gsm.endTurn());

        bottom.append(chartSlot, dock);

        // Charter menu: deliberately quiet, and the only place the destructive
        // action lives.
        this.pausePanel = top.querySelector('[data-testid=charter-menu]');
        this.menuButton = top.querySelector('[data-testid=hud-menu]');
        const setPauseOpen = (open) => {
            this.pausePanel.hidden = !open;
            this.menuButton.setAttribute('aria-expanded', String(open));
            if (open) {
                this.pausePanel.querySelector('[data-testid=resume-game]').focus({ preventScroll: true });
            } else {
                this.menuButton.focus({ preventScroll: true });
            }
        };
        this._setPauseOpen = setPauseOpen;
        this.menuButton.addEventListener('click', () => setPauseOpen(this.pausePanel.hidden));
        this.pausePanel.querySelector('[data-testid=resume-game]').addEventListener('click', () => setPauseOpen(false));
        this.pausePanel.querySelector('[data-testid=end-game]').addEventListener('click', () => {
            this.pausePanel.hidden = true;
            this.gsm.endGame('abandon');
        });
        this._onPauseKey = (event) => {
            if (event.key === 'Escape' && !this.pausePanel.hidden) {
                event.preventDefault();
                setPauseOpen(false);
            }
        };
        document.addEventListener('keydown', this._onPauseKey);

        this.container.append(top, objective, hint, toast, bottom);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';

        this.turnDisplay = top.querySelector('[data-testid=turn-display]');
        this.dayLimit = top.querySelector('[data-role=day-limit]');
        this.lumenEl = top.querySelector('[data-role=lumen]');
        this.incomeEl = top.querySelector('[data-role=income]');
        this.daysLeftEl = objective.querySelector('[data-role=days-left]');
        this.objectiveFill = objective.querySelector('[data-role=objective-fill]');
        this.objectiveMeta = objective.querySelector('[data-role=objective-meta]');
        this.beaconCostEl = objective.querySelector('[data-role=beacon-cost]');
        this.objectiveTrack = objective.querySelector('[role=progressbar]');
        this.hintEl = hint;
        this.toastEl = toast;
        this._toastTimer = null;
        this.actionsNote = dock.querySelector('[data-role=actions-note]');
        this.dock = dock;

        // Number keys arm a blueprint; E ends the tide; Escape opens/closes the
        // charter menu. These shortcuts are inert while a text dialog is open.
        this._onShortcut = (event) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (this.gsm.state !== 'PLAYING' || this.game.buildModal.isOpen) return;
            if (this.pausePanel && !this.pausePanel.hidden && event.key !== 'Escape') return;
            if (event.key === 'Escape') {
                event.preventDefault();
                this.pausePanel.hidden ? this.menuButton.click() : this._setPauseOpen(false);
                return;
            }
            if (event.key === 'e' || event.key === 'E') {
                event.preventDefault();
                this.gsm.endTurn();
                return;
            }
            const slot = Number(event.key);
            if (Number.isInteger(slot) && slot >= 1 && slot <= BLUEPRINTS.length) {
                const blueprint = BLUEPRINTS[slot - 1];
                event.preventDefault();
                if (this.game.selectBlueprint(blueprint.id)) {
                    this.toast(`${blueprint.name} armed — click a free plot.`, 'mint', 1600);
                }
            }
        };
        document.addEventListener('keydown', this._onShortcut);
    }

    show() {
        this.container.style.display = 'block';
        this.updateTurnDisplay(true);
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

    updateTurnDisplay(force = false) {
        if (!this.game || !this.gsm) return;
        const state = this.gsm;
        const buildings = this.game.buildingManager ? this.game.buildingManager.buildings : [];
        const dayLimit = state.dayLimit || 14;
        const beacon = buildings.find((building) => building.blueprintId === BEACON_ID);
        const lumen = state.lumen || 0;
        const income = buildings.reduce((total, building) => {
            if (building.state !== 'ACTIVE') return total;
            return total + (building.income ?? (BLUEPRINT_BY_ID[building.blueprintId]?.income || 0));
        }, 0);
        const daysLeft = Math.max(0, dayLimit - state.currentTurn);
        const actions = state.actionsRemaining;

        this._setText(this.turnDisplay, 'day', `Day ${String(state.currentTurn).padStart(2, '0')}`);
        this._setText(this.dayLimit, 'dayLimit', `/ ${dayLimit}`);
        this._setText(this.lumenEl, 'lumen', String(lumen));
        this._setText(this.incomeEl, 'income', `+${income} / tide`);
        this._setText(this.daysLeftEl, 'daysLeft', daysLeft === 1 ? '1 day left' : `${daysLeft} days left`);
        const beaconActive = beacon?.state === 'ACTIVE';
        this._setText(
            this.objectiveMeta,
            'objectiveMeta',
            beaconActive ? 'Beacon alight' : beacon ? 'Beacon rising' : '0 / 1 beacon'
        );
        this._setText(this.beaconCostEl, 'beaconCost', `${effectiveCost(BLUEPRINT_BY_ID[BEACON_ID], buildings)} lumen`);

        const progress = beaconActive ? 100 : beacon ? 55 : 0;
        if (this._cache.progress !== progress) {
            this._cache.progress = progress;
            this.objectiveFill.style.width = `${progress}%`;
            this.objectiveTrack.setAttribute('aria-valuenow', beaconActive ? '1' : beacon ? '0.55' : '0');
        }

        // Blueprint affordances.
        const beaconBuilt = Boolean(beacon);
        for (const blueprint of BLUEPRINTS) {
            const button = this.blueprintButtons.get(blueprint.id);
            if (!button) continue;
            const uniqueBlocked = blueprint.unique && beaconBuilt;
            const cost = effectiveCost(blueprint, buildings);
            const unaffordable = cost > lumen;
            const blocked = actions <= 0 || uniqueBlocked || unaffordable;
            if (button.disabled !== blocked) button.disabled = blocked;
            if (blueprint.unique) {
                const costEl = button.querySelector('[data-role=cost]');
                if (costEl) this._setText(costEl, `cost-${blueprint.id}`, `${cost} lumen`);
            }
            const selected = state.selectedBlueprint === blueprint.id;
            if (button.getAttribute('aria-pressed') !== String(selected)) {
                button.setAttribute('aria-pressed', String(selected));
            }
            let reason = '';
            if (actions <= 0) reason = 'No builds left this tide';
            else if (uniqueBlocked) reason = 'The Beacon is already standing';
            else if (unaffordable) reason = `Need ${cost - lumen} more lumen`;
            button.title = reason || `${blueprint.name} — ${blueprint.blurb}`;
        }

        // Hint: present until the first structure is raised.
        const showHint = buildings.length === 0 && actions > 0 && !state.hintDismissed;
        this.hintEl.classList.toggle('is-hidden', !showHint);
        if (showHint) {
            const copy = state.selectedBlueprint
                ? `Tap a free plot to raise the ${BLUEPRINT_BY_ID[state.selectedBlueprint]?.name || 'structure'}.`
                : 'Pick a blueprint, then tap a free plot to raise it.';
            this._setText(this.hintEl, 'hint', copy);
        }

        const selectedName = BLUEPRINT_BY_ID[state.selectedBlueprint]?.name || 'Prism Rig';
        this._setText(
            this.actionsNote,
            'actions',
            actions > 0 ? `${selectedName} armed · 1 build / tide` : 'No builds left this tide'
        );

        this.container.classList.toggle('is-out-of-actions', actions <= 0);
        this._cache.force = force;
    }
}
