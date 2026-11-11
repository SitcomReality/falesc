import { BUILDABLE_PROGRAMS } from '../../design/programs.js';
import { NEED_BY_ID } from '../../design/needs.js';
import { BALANCE } from '../../design/balance.js';
import { programIcon, ICONS } from '../../ui/chrome/icons.js';
import { StandingsCard } from '../../ui/chrome/StandingsCard.js';

/** Builds the planning HUD DOM, wires its controls and stores element refs on the screen. */
export function buildHudLayout(screen) {
        screen.container = document.createElement('div');
        screen.container.className = 'screen screen--hud';
        screen.container.dataset.testid = 'game-hud';

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
                <button type="button" class="btn btn--small btn--paper" data-testid="open-field-guide">Field guide</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="open-need-survey">Need survey</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="open-ledger">Ledger</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="open-journal">Journal</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="open-milestones">Milestones</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="open-service-roster">Service roster</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="open-grid-summary">Grid summary</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="open-commons-menu" hidden>The commons</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="save-return-menu">Save &amp; menu</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="open-departures" hidden>Past residents</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="sound-toggle" aria-pressed="false">Sound: off</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="motion-toggle" aria-pressed="false">Motion: full</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="contrast-toggle" aria-pressed="false">Contrast: normal</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="repair-all">Repair all</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="photo-mode">Photo mode</button>
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
            <p class="objective-card__motto" data-role="objective-motto" hidden></p>
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
            <button type="button" class="care-watch" data-role="care-watch" data-testid="care-watch" hidden></button>
            <button type="button" class="daily-request" data-role="daily-request" data-testid="daily-request" hidden></button>
        `;

        const hint = document.createElement('div');
        hint.className = 'hud__hint';
        hint.dataset.role = 'hint';
        hint.innerHTML = '<span data-role="hint-copy">Build a Canteen, then open the day and watch where people go.</span><button type="button" class="hud__hint-close" data-role="hint-dismiss" aria-label="Dismiss hint">×</button>';

        const cursorLive = document.createElement('p');
        cursorLive.className = 'visually-hidden';
        cursorLive.dataset.role = 'cursor-live';
        cursorLive.setAttribute('aria-live', 'polite');

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
        screen.programButtons = new Map();
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
                <span class="blueprint__count" data-role="count" hidden></span>
                <span class="blueprint__need">${need ? `${need.glyph} ${need.name}` : 'civic'}${secondary ? ` + ${secondary.name}` : ''} · ${program.durationText}</span>
                <span class="blueprint__meta">
                    <span class="blueprint__cost" data-role="cost">${program.cost} lumen</span>
                    <span data-role="upkeep">${program.upkeep} upkeep</span>
                </span>
            `;
            button.addEventListener('click', () => {
                if (button.disabled) return;
                if (screen.game.selectProgram(program.id)) {
                    screen.updateHud(true);
                }
            });
            screen.programButtons.set(program.id, button);
            blueprintList.appendChild(button);
        }

        const endDayBtn = dock.querySelector('[data-testid=end-turn]');
        endDayBtn.setAttribute('aria-keyshortcuts', 'E');
        endDayBtn.addEventListener('click', () => screen.game.openDay());
        bottom.append(chartSlot, dock);

        screen.standings = new StandingsCard({
            onToggleFlows: () => screen.game.togglePatronage(),
            onOpenCampaign: () => screen.game.showCampaign(),
            onOpenCommons: () => screen.game.showCommons(),
            onOpenChapter: (chapterId) => screen.game.showChapterDossier(chapterId)
        });
        screen.container.append(top, objective, screen.standings.element, hint, cursorLive, toast, bottom);
        document.body.appendChild(screen.container);
        screen.container.style.display = 'none';

        screen.turnDisplay = top.querySelector('[data-testid=turn-display]');
        screen.dayLimitEl = top.querySelector('[data-role=day-limit]');
        screen.lumenEl = top.querySelector('[data-role=lumen]');
        screen.worksEl = top.querySelector('[data-role=works]');
        screen.populationEl = top.querySelector('[data-role=population]');
        screen.devotionEl = top.querySelector('[data-role=devotion]');
        screen.projectionEl = top.querySelector('[data-role=projection]');
        screen.daysLeftEl = objective.querySelector('[data-role=days-left]');
        screen.objectiveKicker = objective.querySelector('.objective-card__head .kicker');
        screen.objectiveName = objective.querySelector('.objective-card__name');
        screen.objectiveMotto = objective.querySelector('[data-role=objective-motto]');
        screen.populationFill = objective.querySelector('[data-role=population-fill]');
        screen.populationProgress = objective.querySelector('[data-role=population-progress]');
        screen.flourishingLabel = objective.querySelector('[data-role=flourishing-label]');
        screen.flourishingFill = objective.querySelector('[data-role=flourishing-fill]');
        screen.populationTrack = objective.querySelector('[role=progressbar]');
        screen.flourishingTrack = objective.querySelectorAll('[role=progressbar]')[1];
        screen.goalCopy = objective.querySelector('[data-role=goal-copy]');
        screen.careWatch = objective.querySelector('[data-role=care-watch]');
        screen.careWatch.addEventListener('click', () => screen.game.openNeedSurvey());
        screen.dailyRequest = objective.querySelector('[data-role=daily-request]');
        screen.dailyRequest.addEventListener('click', () => {
            const request = screen.game.charter?.request;
            if (request) screen.game.openResident(request.residentId);
        });
        screen.hintEl = hint;
        screen.hintCopy = hint.querySelector('[data-role=hint-copy]');
        hint.querySelector('[data-role=hint-dismiss]').addEventListener('click', () => {
            screen.game.hintDismissed = true;
            screen.hintEl.classList.add('is-hidden');
        });
        screen.toastEl = toast;
        screen.cursorLive = cursorLive;
        screen.worksNote = dock.querySelector('[data-role=works-note]');
        screen.dockNote = dock.querySelector('[data-role=dock-note]');

        screen.pausePanel = top.querySelector('[data-testid=charter-menu]');
        screen.menuButton = top.querySelector('[data-testid=hud-menu]');
        screen._setPauseOpen = (open) => {
            screen.pausePanel.hidden = !open;
            screen.menuButton.setAttribute('aria-expanded', String(open));
            if (open) {
                screen.pausePanel.querySelector('[data-testid=resume-game]').focus({ preventScroll: true });
            } else {
                screen.abandonConfirm.hidden = true;
                screen.abandonBtn.hidden = false;
                screen.menuButton.focus({ preventScroll: true });
            }
        };
        screen.menuButton.addEventListener('click', () => screen._setPauseOpen(screen.pausePanel.hidden));
        screen.pausePanel.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') screen.game.overlays.trapTab(event, screen.pausePanel);
        });
        screen.pausePanel.querySelector('[data-testid=resume-game]').addEventListener('click', () => screen._setPauseOpen(false));
        screen.pausePanel.querySelector('[data-testid=open-bulletin]').addEventListener('click', () => {
            screen._setPauseOpen(false);
            screen.game.showBulletin();
        });
        screen.pausePanel.querySelector('[data-testid=open-residents]').addEventListener('click', () => {
            screen._setPauseOpen(false);
            screen.game.openResidentRoster();
        });
        screen.pausePanel.querySelector('[data-testid=open-field-guide]').addEventListener('click', () => {
            screen._setPauseOpen(false);
            screen.game.openFieldGuide();
        });
        screen.pausePanel.querySelector('[data-testid=open-need-survey]').addEventListener('click', () => {
            screen._setPauseOpen(false);
            screen.game.openNeedSurvey();
        });
        screen.pausePanel.querySelector('[data-testid=open-ledger]').addEventListener('click', () => {
            screen._setPauseOpen(false);
            screen.game.openLedger();
        });
        screen.pausePanel.querySelector('[data-testid=open-journal]').addEventListener('click', () => {
            screen._setPauseOpen(false);
            screen.game.openJournal();
        });
        screen.pausePanel.querySelector('[data-testid=open-milestones]').addEventListener('click', () => {
            screen._setPauseOpen(false);
            screen.game.openMilestones();
        });
        screen.pausePanel.querySelector('[data-testid=open-service-roster]').addEventListener('click', () => {
            screen._setPauseOpen(false);
            screen.game.openServiceRoster();
        });
        screen.pausePanel.querySelector('[data-testid=open-grid-summary]').addEventListener('click', () => {
            screen._setPauseOpen(false);
            screen.game.openGridSummary();
        });
        screen.pausePanel.querySelector('[data-testid=open-commons-menu]').addEventListener('click', () => {
            screen._setPauseOpen(false);
            screen.game.showCommons();
        });
        screen.pausePanel.querySelector('[data-testid=save-return-menu]').addEventListener('click', () => {
            screen._setPauseOpen(false);
            screen.game.returnToMenu();
        });
        screen.departuresButton = screen.pausePanel.querySelector('[data-testid=open-departures]');
        screen.departuresButton.addEventListener('click', () => {
            screen._setPauseOpen(false);
            screen.game.openDepartureArchive();
        });
        screen.soundButton = screen.pausePanel.querySelector('[data-testid=sound-toggle]');
        screen.soundButton.addEventListener('click', () => screen.game.toggleAudio());
        screen.motionButton = screen.pausePanel.querySelector('[data-testid=motion-toggle]');
        screen.motionButton.addEventListener('click', () => screen.game.toggleMotion());
        screen.contrastButton = screen.pausePanel.querySelector('[data-testid=contrast-toggle]');
        screen.contrastButton.addEventListener('click', () => screen.game.toggleContrast());
        screen.pausePanel.querySelector('[data-testid=photo-mode]').addEventListener('click', () => screen.game.togglePhotoMode());
        screen.pausePanel.querySelector('[data-testid=repair-all]').addEventListener('click', () => screen.game.repairAllServices());
        screen.abandonBtn = screen.pausePanel.querySelector('[data-testid=end-game]');
        screen.abandonConfirm = screen.pausePanel.querySelector('[data-role=abandon-confirm]');
        screen.abandonBtn.addEventListener('click', () => {
            screen.abandonConfirm.hidden = false;
            screen.abandonBtn.hidden = true;
            screen.pausePanel.querySelector('[data-testid=cancel-abandon]').focus({ preventScroll: true });
        });
        screen.pausePanel.querySelector('[data-testid=cancel-abandon]').addEventListener('click', () => {
            screen.abandonConfirm.hidden = true;
            screen.abandonBtn.hidden = false;
            screen.abandonBtn.focus({ preventScroll: true });
        });
        screen.pausePanel.querySelector('[data-testid=confirm-abandon]').addEventListener('click', () => {
            screen.pausePanel.hidden = true;
            screen.game.endCharter('abandon');
        });
}
