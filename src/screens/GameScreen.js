import { BUILDABLE_PROGRAMS, PROGRAM_BY_ID } from '../design/programs.js';
import { NEED_BY_ID } from '../design/needs.js';
import { BALANCE } from '../design/balance.js';
import { programIcon, ICONS } from '../ui/icons.js';
import { StandingsCard } from '../ui/StandingsCard.js';

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

        this.container = document.createElement('div');
        this.container.className = 'screen screen--hud';
        this.container.dataset.testid = 'game-hud';

        const top = document.createElement('div');
        top.className = 'hud__top';
        top.innerHTML = `
            <div class="brand" aria-label="FALESC — The Confluence">
                <span class="brand__mark" aria-hidden="true">◇</span>
                <span>
                    <span class="brand__name">FALESC</span>
                    <span class="brand__sub">The Confluence</span>
                </span>
            </div>
            <div class="tide-card">
                <span class="kicker">Day</span>
                <span class="tide-card__day" data-testid="turn-display" aria-live="polite">Day 01</span>
                <span class="tide-card__limit" data-role="day-limit">/ 14</span>
            </div>
            <div class="resources">
                <div class="resource" title="Lumen — civic energy held in common">
                    <span class="resource__icon" aria-hidden="true">${ICONS.lumen}</span>
                    <span class="resource__meta">
                        <span class="resource__label">Lumen</span>
                        <span class="resource__income" data-role="projection">+0 / day</span>
                    </span>
                    <span class="resource__value" data-role="lumen" aria-live="polite">0</span>
                </div>
                <div class="resource resource--compact" title="Works — build actions left today">
                    <span class="resource__icon" aria-hidden="true">${ICONS.works}</span>
                    <span class="resource__meta">
                        <span class="resource__label">Works</span>
                    </span>
                    <span class="resource__value" data-role="works">2</span>
                </div>
                <div class="resource resource--compact" title="Population — Tidelanders living in the chapter">
                    <span class="resource__icon" aria-hidden="true">${ICONS.population}</span>
                    <span class="resource__meta">
                        <span class="resource__label">People</span>
                    </span>
                    <span class="resource__value" data-role="population">6</span>
                </div>
                <div class="resource resource--compact" title="Devotion — accumulated love">
                    <span class="resource__icon" aria-hidden="true">${ICONS.devotion}</span>
                    <span class="resource__meta">
                        <span class="resource__label">Devotion</span>
                    </span>
                    <span class="resource__value" data-role="devotion">0.0</span>
                </div>
                <button type="button" class="hud__menu" data-testid="hud-menu" aria-label="Open charter menu" title="Charter menu" aria-expanded="false" aria-controls="charter-menu">☰</button>
            </div>
            <div class="charter-menu" id="charter-menu" data-testid="charter-menu" hidden>
                <p class="kicker">Charter menu</p>
                <button type="button" class="btn btn--small btn--paper" data-testid="resume-game">Return to planning</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="open-bulletin">Morning bulletin</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="open-residents">Residents</button>
                <button type="button" class="btn btn--small btn--ghost charter-menu__abandon" data-testid="end-game">Abandon charter</button>
                <div class="charter-menu__confirm" data-role="abandon-confirm" hidden>
                    <p>Abandon this charter? The save will be cleared.</p>
                    <button type="button" class="btn btn--small btn--danger" data-testid="confirm-abandon">Yes, abandon</button>
                    <button type="button" class="btn btn--small btn--paper" data-testid="cancel-abandon">Keep playing</button>
                </div>
            </div>
        `;

        const objective = document.createElement('aside');
        objective.className = 'objective-card';
        objective.innerHTML = `
            <div class="objective-card__head">
                <span class="kicker">First Light</span>
                <span class="objective-card__days" data-role="days-left">14 days left</span>
            </div>
            <p class="objective-card__name">House twelve Tidelanders</p>
            <div class="objective-card__track" role="progressbar" aria-valuemin="0" aria-valuemax="15" aria-valuenow="6" aria-label="Residents housed">
                <div class="objective-card__fill" data-role="population-fill"></div>
            </div>
            <div class="objective-card__foot">
                <span data-role="population-progress">6 / 12 residents</span>
                <span data-role="flourishing-label">Flourishing 62</span>
            </div>
            <div class="objective-card__track objective-card__track--flourishing" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="62" aria-label="Flourishing">
                <div class="objective-card__fill objective-card__fill--mint" data-role="flourishing-fill"></div>
            </div>
            <p class="objective-card__goal" data-role="goal-copy">and reach a flourishing of ${BALANCE.end.comfortableFlourishing}.</p>
        `;

        const hint = document.createElement('div');
        hint.className = 'hud__hint';
        hint.dataset.role = 'hint';
        hint.innerHTML = '<span data-role="hint-copy">Build a Canteen, then open the day and watch where people go.</span><button type="button" class="hud__hint-close" data-role="hint-dismiss" aria-label="Dismiss hint">×</button>';

        const toast = document.createElement('div');
        toast.className = 'hud-toast';
        toast.dataset.role = 'toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.textContent = '';

        const bottom = document.createElement('div');
        bottom.className = 'hud__bottom';

        const chartSlot = document.createElement('div');
        chartSlot.className = 'chart-slot';
        chartSlot.dataset.minimapMount = '';

        const dock = document.createElement('div');
        dock.className = 'build-dock';
        dock.innerHTML = `
            <div class="build-dock__head">
                <span class="kicker">Services</span>
                <span class="build-dock__note" data-role="works-note">2 works / day</span>
            </div>
            <div class="blueprints" role="group" aria-label="Service palette"></div>
            <div class="build-dock__foot">
                <span class="build-dock__cost" data-role="dock-note">One door at a time.</span>
                <button type="button" class="btn btn--primary" data-testid="end-turn">
                    Open the day <span class="btn__arrow" aria-hidden="true">→</span>
                </button>
            </div>
        `;
        const blueprintList = dock.querySelector('.blueprints');
        this.programButtons = new Map();
        for (const program of BUILDABLE_PROGRAMS) {
            const need = program.need ? NEED_BY_ID[program.need] : null;
            const secondary = program.secondaryNeed ? NEED_BY_ID[program.secondaryNeed] : null;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'blueprint';
            button.dataset.program = program.id;
            button.dataset.testid = program.testid;
            button.setAttribute('aria-pressed', 'false');
            button.setAttribute('aria-keyshortcuts', String(BUILDABLE_PROGRAMS.indexOf(program) + 1));
            button.title = `${program.name} — ${program.blurb}`;
            button.innerHTML = `
                <span class="blueprint__icon" aria-hidden="true">${programIcon(program.id)}</span>
                <span class="blueprint__name">${program.name}</span>
                <span class="blueprint__need">${need ? `${need.glyph} ${need.name}` : 'civic'}${secondary ? ` + ${secondary.name}` : ''} · ${program.durationText}</span>
                <span class="blueprint__meta">
                    <span class="blueprint__cost" data-role="cost">${program.cost} lumen</span>
                    <span data-role="upkeep">${program.upkeep} upkeep</span>
                </span>
            `;
            button.addEventListener('click', () => {
                if (button.disabled) return;
                if (this.game.selectProgram(program.id)) {
                    this.updateHud(true);
                }
            });
            this.programButtons.set(program.id, button);
            blueprintList.appendChild(button);
        }

        const endDayBtn = dock.querySelector('[data-testid=end-turn]');
        endDayBtn.setAttribute('aria-keyshortcuts', 'E');
        endDayBtn.addEventListener('click', () => this.game.openDay());
        bottom.append(chartSlot, dock);

        this.standings = new StandingsCard({
            onToggleFlows: () => this.game.togglePatronage(),
            onOpenCampaign: () => this.game.showCampaign()
        });
        this.container.append(top, objective, this.standings.element, hint, toast, bottom);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';

        this.turnDisplay = top.querySelector('[data-testid=turn-display]');
        this.dayLimitEl = top.querySelector('[data-role=day-limit]');
        this.lumenEl = top.querySelector('[data-role=lumen]');
        this.worksEl = top.querySelector('[data-role=works]');
        this.populationEl = top.querySelector('[data-role=population]');
        this.devotionEl = top.querySelector('[data-role=devotion]');
        this.projectionEl = top.querySelector('[data-role=projection]');
        this.daysLeftEl = objective.querySelector('[data-role=days-left]');
        this.populationFill = objective.querySelector('[data-role=population-fill]');
        this.populationProgress = objective.querySelector('[data-role=population-progress]');
        this.flourishingLabel = objective.querySelector('[data-role=flourishing-label]');
        this.flourishingFill = objective.querySelector('[data-role=flourishing-fill]');
        this.populationTrack = objective.querySelector('[role=progressbar]');
        this.flourishingTrack = objective.querySelectorAll('[role=progressbar]')[1];
        this.goalCopy = objective.querySelector('[data-role=goal-copy]');
        this.hintEl = hint;
        this.hintCopy = hint.querySelector('[data-role=hint-copy]');
        hint.querySelector('[data-role=hint-dismiss]').addEventListener('click', () => {
            this.game.hintDismissed = true;
            this.hintEl.classList.add('is-hidden');
        });
        this.toastEl = toast;
        this.worksNote = dock.querySelector('[data-role=works-note]');
        this.dockNote = dock.querySelector('[data-role=dock-note]');

        this.pausePanel = top.querySelector('[data-testid=charter-menu]');
        this.menuButton = top.querySelector('[data-testid=hud-menu]');
        this._setPauseOpen = (open) => {
            this.pausePanel.hidden = !open;
            this.menuButton.setAttribute('aria-expanded', String(open));
            if (open) {
                this.pausePanel.querySelector('[data-testid=resume-game]').focus({ preventScroll: true });
            } else {
                this.abandonConfirm.hidden = true;
                this.abandonBtn.hidden = false;
                this.menuButton.focus({ preventScroll: true });
            }
        };
        this.menuButton.addEventListener('click', () => this._setPauseOpen(this.pausePanel.hidden));
        this.pausePanel.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') this.game.overlays.trapTab(event, this.pausePanel);
        });
        this.pausePanel.querySelector('[data-testid=resume-game]').addEventListener('click', () => this._setPauseOpen(false));
        this.pausePanel.querySelector('[data-testid=open-bulletin]').addEventListener('click', () => {
            this._setPauseOpen(false);
            this.game.showBulletin();
        });
        this.pausePanel.querySelector('[data-testid=open-residents]').addEventListener('click', () => {
            this._setPauseOpen(false);
            this.game.showResidentRoster();
        });
        this.abandonBtn = this.pausePanel.querySelector('[data-testid=end-game]');
        this.abandonConfirm = this.pausePanel.querySelector('[data-role=abandon-confirm]');
        this.abandonBtn.addEventListener('click', () => {
            this.abandonConfirm.hidden = false;
            this.abandonBtn.hidden = true;
            this.pausePanel.querySelector('[data-testid=cancel-abandon]').focus({ preventScroll: true });
        });
        this.pausePanel.querySelector('[data-testid=cancel-abandon]').addEventListener('click', () => {
            this.abandonConfirm.hidden = true;
            this.abandonBtn.hidden = false;
            this.abandonBtn.focus({ preventScroll: true });
        });
        this.pausePanel.querySelector('[data-testid=confirm-abandon]').addEventListener('click', () => {
            this.pausePanel.hidden = true;
            this.game.endCharter('abandon');
        });

        this._onKey = (event) => {
            if (event.defaultPrevented) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (this.gsm.state !== 'PLAYING') return;
            if (this.game.hasBlockingModal?.()) return;
            if (this.pausePanel && !this.pausePanel.hidden && event.key !== 'Escape') return;
            if (event.key === 'Escape') {
                event.preventDefault();
                this.pausePanel.hidden ? this.menuButton.click() : this._setPauseOpen(false);
                return;
            }
            if (event.key === 'e' || event.key === 'E') {
                event.preventDefault();
                this.game.openDay();
                return;
            }
            if (event.key === 'b' || event.key === 'B') {
                event.preventDefault();
                this.game.showBulletin();
                return;
            }
            if (event.key === 'r' || event.key === 'R') {
                event.preventDefault();
                this.game.showResidentRoster();
                return;
            }
            if (event.key === 'p' || event.key === 'P') {
                event.preventDefault();
                this.game.togglePatronage();
                return;
            }
            const slot = Number(event.key);
            if (Number.isInteger(slot) && slot >= 1 && slot <= BUILDABLE_PROGRAMS.length) {
                const program = BUILDABLE_PROGRAMS[slot - 1];
                event.preventDefault();
                if (this.game.selectProgram(program.id)) this.toast(`${program.name} armed — choose a plot.`, 'mint', 1600);
            }
        };
        document.addEventListener('keydown', this._onKey);
    }

    show() {
        this.container.style.display = 'block';
        this.updateHud(true);
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
        const charter = this.game?.charter;
        if (!charter) return;
        const contest = Boolean(charter.contest);
        this.container.classList.toggle('is-contest', contest);
        this.container.classList.toggle('is-campaign', Boolean(charter.campaign?.active));
        this.standings.update(charter.standings(), contest, charter.campaign);
        const dayLimit = charter.dayLimit || 14;
        const day = charter.day || 1;
        const daysLeft = Math.max(0, dayLimit - day + 1);
        const populationGoal = BALANCE.end.firstLightPopulation;
        const flourishingGoal = BALANCE.end.comfortableFlourishing;

        this._setText(this.turnDisplay, 'day', `Day ${String(day).padStart(2, '0')}`);
        this._setText(this.dayLimitEl, 'dayLimit', `/ ${dayLimit}`);
        this._setText(this.lumenEl, 'lumen', String(charter.lumen));
        this._setText(this.worksEl, 'works', String(charter.works));
        this._setText(this.populationEl, 'population', String(charter.population));
        this._setText(this.devotionEl, 'devotion', charter.devotion.toFixed(1));
        const net = charter.projectedNet;
        const projection = `${net >= 0 ? '+' : '−'}${Math.abs(net)} lumen / day`;
        this._setText(this.projectionEl, 'projection', projection);
        this._setText(this.daysLeftEl, 'daysLeft', daysLeft === 1 ? 'Last day' : `${daysLeft} days left`);

        const populationPercent = Math.min(100, (charter.housedPopulation / populationGoal) * 100);
        if (force || this._cache.populationPercent !== populationPercent) {
            this._cache.populationPercent = populationPercent;
            this.populationFill.style.width = `${populationPercent}%`;
            this.populationTrack?.setAttribute('aria-valuenow', String(charter.housedPopulation));
        }
        const flourishingPercent = Math.max(0, Math.min(100, charter.flourishing));
        if (force || this._cache.flourishingPercent !== flourishingPercent) {
            this._cache.flourishingPercent = flourishingPercent;
            this.flourishingFill.style.width = `${flourishingPercent}%`;
            this.flourishingTrack?.setAttribute('aria-valuenow', String(Math.round(charter.flourishing)));
        }
        this._setText(this.populationProgress, 'populationProgress', `${charter.housedPopulation} / ${populationGoal} residents`);
        this._setText(this.flourishingLabel, 'flourishingLabel', `Flourishing ${Math.round(charter.flourishing)}`);
        const goalsMet = charter.goalsMet;
        this._setText(this.goalCopy, 'goalCopy', goalsMet
            ? 'Both goals are met. Open the day to close the charter.'
            : `and reach a flourishing of ${flourishingGoal}.`);
        this.container.classList.toggle('is-goals-met', goalsMet);

        for (const program of BUILDABLE_PROGRAMS) {
            const button = this.programButtons.get(program.id);
            if (!button) continue;
            const unaffordable = program.cost > charter.lumen;
            const noWorks = charter.works <= 0;
            const disabled = unaffordable || noWorks;
            if (button.disabled !== disabled) button.disabled = disabled;
            const selected = this.game.selectedProgramId === program.id;
            if (button.getAttribute('aria-pressed') !== String(selected)) {
                button.setAttribute('aria-pressed', String(selected));
            }
            let reason = '';
            if (noWorks) reason = 'No works left today';
            else if (unaffordable) reason = `Need ${program.cost - charter.lumen} more lumen`;
            button.title = reason || `${program.name} — ${program.blurb}`;
        }

        const selectedName = PROGRAM_BY_ID[this.game.selectedProgramId]?.name || 'Service';
        const spare = charter.contest ? charter.totalSpareBeds : charter.spareBeds;
        this._setText(this.worksNote, 'worksNote', `${charter.works} ${charter.works === 1 ? 'work' : 'works'} left · ${spare} spare ${spare === 1 ? 'bed' : 'beds'}`);
        this._setText(this.dockNote, 'dockNote', charter.works > 0
            ? `${selectedName} armed${this.game.selectedProgramId ? ' · choose a plot' : ''}`
            : 'No works left. Open the day.');
        this.container.classList.toggle('is-out-of-actions', charter.works <= 0);

        const showHint = !charter.services.activeServices.some((service) => service.programId === 'canteen')
            && charter.works > 0
            && !this.game.hintDismissed;
        this.hintEl.classList.toggle('is-hidden', !showHint);
        if (showHint) {
            this._setText(this.hintCopy, 'hint', this.game.selectedProgramId
                ? `Tap a free plot to raise the ${selectedName}.`
                : 'Build a Canteen, then open the day and watch where people go.');
        }
        this._cache.force = force;
    }

    updateTurnDisplay(force = false) {
        this.updateHud(force);
    }
}
