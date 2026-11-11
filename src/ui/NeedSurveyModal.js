import { NEEDS } from '../design/needs.js';
import { escapeHtml } from './html.js';

/**
 * A read-only demand snapshot for planning: how urgent each need is, how many
 * residents are already over the complaint threshold, and how much open service
 * capacity the chapter has for it.
 */
export class NeedSurveyModal {
    constructor({ game, overlays, onOpenResident = null }) {
        this.game = game;
        this.onOpenResident = onOpenResident;
        this.overlays = overlays;
        this.isOpen = false;
        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'need-survey-scrim';
        this.panel = document.createElement('section');
        this.panel.className = 'modal need-survey';
        this.panel.dataset.testid = 'need-survey';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'need-survey-title');
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
            initialFocus: () => this.panel.querySelector('[data-testid=need-survey-close]')
        });
    }

    render() {
        const survey = this.game?.charter?.needSurvey() || [];
        const residents = this.game?.charter?.activeResidents || [];
        const watch = this.game?.charter?.careWatch?.() || { count: 0, residents: [] };
        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">Planning · ${residents.length} residents</p>
                    <h3 class="modal__title" id="need-survey-title">What the chapter needs</h3>
                </div>
                <button type="button" class="modal__close" data-testid="need-survey-close" aria-label="Close need survey">×</button>
            </div>
            <p class="modal__blurb">Urgency is the average of the four needs. A resident is counted as urgent from 65. Capacity counts open seats that serve the need.</p>
            <div class="need-survey__rows">
                ${NEEDS.map((need) => {
                    const row = survey.find((entry) => entry.id === need.id) || { average: 0, urgent: 0, services: 0, capacity: 0 };
                    return `
                        <div class="need-survey__row">
                            <span class="need-survey__name"><i style="background:${need.color}"></i>${escapeHtml(need.name)}</span>
                            <span class="need-survey__track"><i style="width:${Math.round(row.average)}%;background:${need.color}"></i></span>
                            <strong>${Math.round(row.average)}</strong>
                            <span class="need-survey__meta">${row.urgent} urgent · ${row.services} service${row.services === 1 ? '' : 's'} / ${row.capacity} seats</span>
                        </div>
                    `;
                }).join('')}
            </div>
            ${watch.count ? `<div class="need-survey__watch"><span class="kicker">Residents needing care</span><ul>${watch.residents.map((resident) => `<li><button type="button" data-resident-id="${resident.id}">${escapeHtml(resident.name)}</button><span>${escapeHtml(careReason(resident))}</span></li>`).join('')}</ul></div>` : ''}
            <p class="modal__note">Housing is exempt from closure; every other service can close on a shortfall.</p>
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="need-survey-done">Back to planning</button>
            </div>
        `;
        this.panel.querySelectorAll('[data-testid^=need-survey-close], [data-testid=need-survey-done]').forEach((button) => button.addEventListener('click', () => this.hide()));
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

function careReason(resident) {
    if ((resident.memory?.homelessDays || 0) > 0) return 'no bed';
    if (resident.wellbeing < 30) return 'low wellbeing';
    const urgent = Object.entries(resident.needs || {}).sort((a, b) => b[1] - a[1])[0];
    return urgent ? `${urgent[0]} ${Math.round(urgent[1])}` : 'needs care';
}

