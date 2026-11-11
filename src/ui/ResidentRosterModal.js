import { NEEDS } from '../design/needs.js';

/**
 * A scannable roster of everyone currently present. The card remains the place
 * for one person's detail; this list is for finding who needs attention.
 */
export class ResidentRosterModal {
    constructor({ game, overlays, onOpenResident }) {
        this.game = game;
        this.overlays = overlays;
        this.onOpenResident = onOpenResident;
        this.isOpen = false;
        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'resident-roster-scrim';
        this.panel = document.createElement('section');
        this.panel.className = 'modal resident-roster';
        this.panel.dataset.testid = 'resident-roster';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'resident-roster-title');
        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
        this.container.addEventListener('pointerdown', (event) => event.stopPropagation());
        this.container.addEventListener('click', (event) => {
            if (event.target === this.container) this.hide();
        });
        this.container.addEventListener('keydown', (event) => this.onKeyDown(event));
    }

    show() {
        this.render();
        this.isOpen = true;
        this.container.style.display = 'flex';
        this.container.classList.add('is-open');
        this.container.setAttribute('aria-hidden', 'false');
        this.overlays.open(this, {
            panel: this.panel,
            initialFocus: () => this.panel.querySelector('[data-testid=resident-roster-close]')
        });
    }

    render() {
        const charter = this.game?.charter;
        if (!charter) return;
        const residents = charter.activeResidents;
        const trial = charter.trialVisitors || [];
        const care = new Set((charter.careWatch?.().residents || []).map((resident) => resident.id));
        const rows = residents.map((resident) => {
            const top = NEEDS.reduce((best, need) => ((resident.needs[need.id] || 0) > (best?.value || -1) ? { need, value: resident.needs[need.id] || 0 } : best), null);
            const home = charter.homeFor(resident);
            const temperament = resident.traits?.temperament || '';
            return `
                <li class="resident-roster__row${care.has(resident.id) ? ' is-at-risk' : ''}">
                    <button type="button" data-resident-id="${resident.id}">
                        <span class="resident-roster__avatar">${escapeHtml(initials(resident.name))}</span>
                        <span class="resident-roster__name">${escapeHtml(resident.name)}<small>${escapeHtml(temperament)}${home ? '' : ' · no bed'}</small></span>
                        <span class="resident-roster__need">${escapeHtml(top?.need.name || '—')} <strong>${Math.round(top?.value || 0)}</strong></span>
                        <span class="resident-roster__well">${Math.round(resident.wellbeing)}</span>
                    </button>
                </li>
            `;
        }).join('');
        const trialRows = trial.map((resident) => `<li class="resident-roster__row is-trial"><span class="resident-roster__trial">Trial · ${escapeHtml(resident.name)} · wellbeing ${Math.round(resident.wellbeing)}</span></li>`).join('');
        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">Resident roster · ${residents.length} active${trial.length ? ` · ${trial.length} trial` : ''}</p>
                    <h3 class="modal__title" id="resident-roster-title">Who is here</h3>
                </div>
                <button type="button" class="modal__close" data-testid="resident-roster-close" aria-label="Close resident roster">×</button>
            </div>
            <p class="modal__blurb">Highest current need and wellbeing. Red rows are in crisis; click a name for the full card.</p>
            <ol class="resident-roster__list">${rows || '<li class="modal__note">No active residents.</li>'}</ol>
            ${trialRows ? `<h4 class="campaign-modal__label">Trial guests</h4><ul class="resident-roster__trial-list">${trialRows}</ul>` : ''}
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="resident-roster-done">Back to planning</button>
            </div>
        `;
        this.panel.querySelectorAll('[data-testid^=resident-roster-close], [data-testid=resident-roster-done]').forEach((button) => button.addEventListener('click', () => this.hide()));
        this.panel.querySelectorAll('[data-resident-id]').forEach((button) => button.addEventListener('click', () => {
            this.hide();
            this.onOpenResident?.(button.dataset.residentId);
        }));
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
        this.container.style.display = 'none';
        this.container.classList.remove('is-open');
        this.container.setAttribute('aria-hidden', 'true');
        this.overlays.close(this);
    }
}

function initials(name) {
    return String(name || '?').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
