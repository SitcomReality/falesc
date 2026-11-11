import { BUILDABLE_PROGRAMS, PROGRAM_BY_ID } from '../../design/programs.js';
import { BALANCE } from '../../design/balance.js';

/** Refreshes the HUD from the charter; the caller owns the screen element refs. */
export function updateHud(screen, force = false) {
        const charter = screen.game?.charter;
        if (!charter) return;
        const contest = Boolean(charter.contest);
        screen.container.classList.toggle('is-contest', contest);
        screen.container.classList.toggle('is-campaign', Boolean(charter.campaign?.active));
        const departed = charter.departedResidents?.length || 0;
        screen.pausePanel.querySelector('[data-testid=open-commons-menu]').hidden = !charter.commonsSector;
        const motion = screen.game.motion === 'reduced';
        screen.motionButton.textContent = motion ? 'Motion: reduced' : 'Motion: full';
        screen.motionButton.setAttribute('aria-pressed', String(motion));
        const contrast = screen.game.contrast === 'high';
        screen.contrastButton.textContent = contrast ? 'Contrast: high' : 'Contrast: normal';
        screen.contrastButton.setAttribute('aria-pressed', String(contrast));
        screen.departuresButton.hidden = departed === 0;
        screen.departuresButton.textContent = departed ? `Past residents · ${departed}` : 'Past residents';
        screen.standings.update(charter.standings(), contest, charter.campaign, charter.day, charter.commons);
        const dayLimit = charter.dayLimit || 14;
        const day = charter.day || 1;
        const daysLeft = Math.max(0, dayLimit - day + 1);
        const openCharter = charter.mode === 'open';
        const populationGoal = openCharter ? BALANCE.rosterSize : BALANCE.end.firstLightPopulation;
        const flourishingGoal = BALANCE.end.comfortableFlourishing;

        screen._setText(screen.turnDisplay, 'day', `Day ${String(day).padStart(2, '0')}`);
        screen._setText(screen.dayLimitEl, 'dayLimit', openCharter ? '/ open' : `/ ${dayLimit}`);
        screen._setText(screen.objectiveKicker, 'objectiveKicker', openCharter ? 'Open Charter' : 'First Light');
        screen._setText(screen.objectiveName, 'objectiveName', openCharter ? 'Build without a deadline' : 'House twelve Tidelanders');
        screen.objectiveMotto.hidden = !charter.motto;
        screen._setText(screen.objectiveMotto, 'objectiveMotto', charter.motto || '');
        screen._setText(screen.lumenEl, 'lumen', String(charter.lumen));
        screen._setText(screen.worksEl, 'works', String(charter.works));
        screen._setText(screen.populationEl, 'population', String(charter.population));
        screen._setText(screen.devotionEl, 'devotion', charter.devotion.toFixed(1));
        const net = charter.projectedNet;
        const projection = `${net >= 0 ? '+' : '−'}${Math.abs(net)} lumen / day`;
        screen._setText(screen.projectionEl, 'projection', projection);
        screen._setText(screen.daysLeftEl, 'daysLeft', openCharter ? 'No deadline' : daysLeft === 1 ? 'Last day' : `${daysLeft} days left`);

        const populationPercent = Math.min(100, (charter.housedPopulation / populationGoal) * 100);
        if (force || screen._cache.populationPercent !== populationPercent) {
            screen._cache.populationPercent = populationPercent;
            screen.populationFill.style.width = `${populationPercent}%`;
            screen.populationTrack?.setAttribute('aria-valuenow', String(charter.housedPopulation));
        }
        const flourishingPercent = Math.max(0, Math.min(100, charter.flourishing));
        if (force || screen._cache.flourishingPercent !== flourishingPercent) {
            screen._cache.flourishingPercent = flourishingPercent;
            screen.flourishingFill.style.width = `${flourishingPercent}%`;
            screen.flourishingTrack?.setAttribute('aria-valuenow', String(Math.round(charter.flourishing)));
        }
        screen._setText(screen.populationProgress, 'populationProgress', `${charter.housedPopulation} / ${populationGoal} residents`);
        screen._setText(screen.flourishingLabel, 'flourishingLabel', `Flourishing ${Math.round(charter.flourishing)}`);
        const goalsMet = openCharter ? false : charter.goalsMet;
        const watch = charter.careWatch();
        screen.careWatch.hidden = watch.count === 0;
        screen.careWatch.textContent = watch.count ? `${watch.count} resident${watch.count === 1 ? '' : 's'} need care · survey` : '';
        const request = charter.request;
        screen.dailyRequest.hidden = !request;
        screen.dailyRequest.textContent = request
            ? `Daily request · ${request.residentName}: ${request.needName}${request.status === 'met' ? ' · met' : request.status === 'missed' ? ' · missed' : ''}`
            : '';
        screen._setText(screen.goalCopy, 'goalCopy', openCharter
            ? (charter.housedPopulation >= BALANCE.rosterSize
                ? 'The whole roster is housed. Keep building; the charter is yours.'
                : `A full house is ${BALANCE.rosterSize} residents. No deadline; keep building.`)
            : goalsMet
                ? 'Both goals are met. Open the day to close the charter.'
                : `and reach a flourishing of ${flourishingGoal}.`);
        screen.container.classList.toggle('is-goals-met', goalsMet);

        for (const program of BUILDABLE_PROGRAMS) {
            const button = screen.programButtons.get(program.id);
            if (!button) continue;
            const unaffordable = program.cost > charter.lumen;
            const noWorks = charter.works <= 0;
            const disabled = unaffordable || noWorks;
            if (button.disabled !== disabled) button.disabled = disabled;
            const selected = screen.game.selectedProgramId === program.id;
            if (button.getAttribute('aria-pressed') !== String(selected)) {
                button.setAttribute('aria-pressed', String(selected));
            }
            let reason = '';
            if (noWorks) reason = 'No works left today';
            else if (unaffordable) reason = `Need ${program.cost - charter.lumen} more lumen`;
            button.title = reason || `${program.name} — ${program.blurb}`;
        }

        const selectedName = PROGRAM_BY_ID[screen.game.selectedProgramId]?.name || 'Service';
        const spare = charter.contest ? charter.totalSpareBeds : charter.spareBeds;
        screen._setText(screen.worksNote, 'worksNote', `${charter.works} ${charter.works === 1 ? 'work' : 'works'} left · ${spare} spare ${spare === 1 ? 'bed' : 'beds'}`);
        for (const [programId, button] of screen.programButtons) {
            const built = charter.services.services.filter((service) => service.programId === programId);
            const count = built.length;
            const worn = built.filter((service) => service.condition < 50).length;
            const badge = button.querySelector('[data-role=count]');
            if (!badge) continue;
            badge.hidden = count === 0;
            badge.textContent = count ? String(count) : '';
            badge.classList.toggle('is-worn', worn > 0);
            badge.title = count ? `${count} built${worn ? ` · ${worn} worn` : ''}` : '';
        }
        screen._setText(screen.dockNote, 'dockNote', charter.works > 0
            ? `${selectedName} armed${screen.game.selectedProgramId ? ' · choose a plot' : ''}`
            : 'No works left. Open the day.');
        screen.container.classList.toggle('is-out-of-actions', charter.works <= 0);

        const activePrograms = new Set(charter.services.activeServices.map((service) => service.programId));
        const pendingCanteen = charter.services.services.some((service) => service.programId === 'canteen' && service.state === 'PENDING');
        let nextHint = null;
        if (charter.works <= 0) nextHint = 'No works left. Open the day and watch where people go.';
        else if (!charter.services.services.some((service) => service.programId === 'canteen')) nextHint = 'Build a Canteen, then open the day and watch where people go.';
        else if (pendingCanteen) nextHint = 'The Canteen opens tomorrow. Open the day to finish the build.';
        else if (!activePrograms.has('tea_house')) nextHint = 'Company is the next gap. Raise a Tea House and give people a table.';
        else if (!activePrograms.has('garden_dome')) nextHint = 'Wonder is still unmet. A Garden Dome gives the shard somewhere green to look.';
        else if (!activePrograms.has('workshop')) nextHint = 'Purpose is a slower need. A Workshop gives people work worth doing.';
        else if (!activePrograms.has('clinic')) nextHint = 'Rest and sustenance can still fail together. A Clinic keeps the chapter on its feet.';
        else nextHint = 'Every need has a door. Open the day, read the report and decide what the chapter needs next.';
        const showHint = !screen.game.hintDismissed;
        screen.hintEl.classList.toggle('is-hidden', !showHint);
        screen.hintEl.hidden = !showHint;
        if (showHint) screen._setText(screen.hintCopy, 'hint', nextHint);
        screen._cache.force = force;
}
