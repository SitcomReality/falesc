import { NEED_BY_ID } from '../../design/needs.js';
import { RETROFIT_BY_ID, RETROFIT_MIN_COST } from '../../services/RetrofitModules.js';
import { SERVICE_HOURS_BY_ID } from '../../services/ServicePolicies.js';
import { SERVICE_VIBE_BY_ID } from '../../services/ServiceVibes.js';
import { SERVICE_ACCESS_BY_ID } from '../../services/ServiceAccess.js';
import { SERVICE_FOCUS } from '../../services/ServiceFocus.js';
import { FLOOR_PLAN_BY_ID } from '../../services/FloorPlans.js';
import { finishCost } from '../../services/BuildingFinishes.js';
import { escapeHtml } from '../escapeHtml.js';

/**
 * Everything the service card shows for one service: the fact rows, the
 * interior/regulars copy and the enabled state of each action button.
 */
export function buildServiceCardView(service, game) {
    const program = service.program;
    const need = program?.need ? NEED_BY_ID[program.need] : null;
    const secondary = program?.secondaryNeed ? NEED_BY_ID[program.secondaryNeed] : null;
    const working = service.state === 'ACTIVE' && !service.closed;
    const upkeep = game?.charter?.services.upkeepFor(service) ?? program?.upkeep ?? 0;
    const shared = service.chapterId === 'commons';

    const stats = `
            <span><strong>${working ? 'Working' : service.closed ? 'Closed' : 'Under construction'}</strong></span>
            <span>${escapeHtml(service.chapterName || 'Home Chapter')}</span>
            <span>${service.totalCapacity} capacity</span>
            <span>${shared ? 'shared · purse-funded' : service.chapterId !== 'player' ? 'rival budget' : `${upkeep} upkeep / day`}</span>
        `;
    const staff = service.staffId ? (game?.charter?.roster || []).find((resident) => resident.id === service.staffId) : null;
    const facts = `
            <div><dt>Chapter</dt><dd>${escapeHtml(service.chapterName || 'Home Chapter')}</dd></div>
            ${service.builderChapterId ? `<div><dt>Built by</dt><dd>${escapeHtml(game?.charter?.chapterById(service.builderChapterId)?.name || 'A chapter')}</dd></div>` : ''}
            <div><dt>Serves</dt><dd>${need ? `${need.glyph} ${need.name}` : 'civic'}${secondary ? ` · ${secondary.glyph} ${secondary.name}` : ''}</dd></div>
            ${staff ? `<div><dt>Staff</dt><dd>${escapeHtml(staff.name)}</dd></div>` : ''}
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
    const lastChoice = game?.charter?.activeResidents
        .map((resident) => resident.memory.lastChoice)
        .filter((choice) => choice?.serviceId === service.id)
        .pop();
    const note = lastChoice
        ? `Last word: “${lastChoice.reason}”`
        : service.closed
            ? `Closed after an upkeep shortfall. Reopening costs ${game?.charter?.services.reopenCost(service) || 1} lumen.`
            : 'The door is open. The day report will tell you who came through it.';

    const housing = service.programId === 'housing';
    const floorPlans = (service.floorPlans || []).map((id) => FLOOR_PLAN_BY_ID[id]).filter(Boolean);
    const upperSeats = floorPlans.reduce((sum, plan) => sum + (housing ? (plan.housingCapacity || 0) : (plan.serviceCapacity || 0)), 0);
    const floorRows = [
        { label: 'Ground', name: program?.name || 'Service', detail: `${Math.max(0, service.totalCapacity - upperSeats)} ${housing ? 'beds' : 'seats'}` },
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
    const interior = `<span class="kicker">The interior</span>${floorRows.map((row) => `<div class="service-interior__floor"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.detail)}</small></div>`).join('')}`;

    const regulars = (game?.charter?.activeResidents || [])
        .filter((resident) => housing
            ? resident.homeServiceId === service.id
            : resident.memory?.lastChoice?.serviceId === service.id)
        .slice(0, 4);
    const regularsHtml = regulars.length
        ? `<span class="kicker">${housing ? 'Residents here' : 'Last seen here'}</span>${regulars.map((resident) => `<button type="button" class="service-regulars__person" data-resident-id="${escapeHtml(resident.id)}">${escapeHtml(resident.name)}</button>`).join('')}`
        : '';

    const rivalService = service.chapterId && service.chapterId !== 'player';
    const refund = Math.max(1, Math.floor(finishCost(program, service.finish) / 2));
    const repairCost = game?.charter?.repairCost?.(service) ?? 3;
    const canRepair = !rivalService && working && (service.condition ?? 100) < 100;
    const canUpgrade = !rivalService && !service.fixed && working && (service.retrofits?.length || 0) < 2;
    const canFloor = !rivalService && !service.fixed && working && (service.floors || 1) < 3;
    const canSetFocus = !rivalService && working && Boolean(program?.secondaryNeed);
    const canSetHours = !rivalService && !service.fixed && service.programId !== 'housing' && working;
    const canSetVibe = !rivalService && !service.fixed && working;
    const canSetAccess = !rivalService && !service.fixed && working;
    const currentFocus = service.policy?.focus || 'balanced';
    const focusOptions = [
        `<option value="balanced">Both needs</option>`,
        `<option value="primary">${escapeHtml(need ? `${need.name} first` : 'Primary need')}</option>`,
        `<option value="secondary">${escapeHtml(secondary ? `${secondary.name} first` : 'Secondary need')}</option>`
    ].join('');

    return {
        programName: program?.name || 'Service',
        blurb: program?.blurb || '',
        stats,
        facts,
        note,
        interior,
        regulars: regularsHtml,
        demolish: {
            text: shared
                ? 'Shared service'
                : rivalService
                    ? 'Rival service'
                    : `Dismantle · +${refund} lumen`,
            disabled: Boolean(service.fixed) || rivalService,
            title: shared
                ? 'A shared commons service belongs to every chapter.'
                : rivalService
                    ? "A rival chapter's service cannot be dismantled."
                    : service.fixed ? 'The Welcome Post is part of the charter.' : ''
        },
        repair: {
            text: `Repair · ${repairCost}`,
            hidden: !canRepair,
            disabled: !canRepair || (game?.charter?.lumen || 0) < repairCost
        },
        upgrade: {
            hidden: !canUpgrade,
            disabled: !canUpgrade || (game?.charter?.lumen || 0) < RETROFIT_MIN_COST,
            text: (service.retrofits?.length || 0) === 1 ? 'Add a second module →' : 'Add a module →',
            title: canUpgrade ? 'Add a permanent module: seats, quality or a later kitchen.' : ''
        },
        floor: {
            hidden: !canFloor,
            disabled: !canFloor || (game?.charter?.lumen || 0) < 4
        },
        focus: {
            hidden: !canSetFocus,
            options: focusOptions,
            value: SERVICE_FOCUS.some((entry) => entry.id === currentFocus) ? currentFocus : 'balanced'
        },
        hours: {
            hidden: !canSetHours,
            value: SERVICE_HOURS_BY_ID[service.policy?.hours] ? service.policy.hours : 'as_built'
        },
        vibe: {
            hidden: !canSetVibe,
            value: SERVICE_VIBE_BY_ID[service.policy?.vibe] ? service.policy.vibe : (program?.vibe || 'cosy'),
            disabled: !canSetVibe
        },
        access: {
            hidden: !canSetAccess,
            value: SERVICE_ACCESS_BY_ID[service.policy?.access] ? service.policy.access : 'open',
            disabled: !canSetAccess
        },
        reopen: {
            hidden: !service.closed,
            disabled: rivalService,
            text: service.closed
                ? rivalService
                    ? 'Rival service'
                    : `Reopen · ${game?.charter?.services.reopenCost(service) || 1} lumen`
                : 'Reopen'
        }
    };
}
