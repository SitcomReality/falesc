import { FLOOR_PLANS } from '../services/FloorPlans.js';
import { escapeHtml } from './escapeHtml.js';

/**
 * Floor-plan choice: the shell above a service can sleep, host or open to the
 * sky. All three cost the same; the trade is seats versus quality.
 */
export class FloorPlanModal {
    constructor({ onChoose, onDone, game, overlays }) {
        this.onChoose = onChoose;
        this.onDone = onDone;
        this.game = game;
        this.overlays = overlays;
        this.isOpen = false;
        this.service = null;

        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'floor-plan-scrim';
        this.panel = document.createElement('section');
        this.panel.className = 'modal retrofit-modal';
        this.panel.dataset.testid = 'floor-plan-modal';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'floor-plan-title');
        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
        this.container.addEventListener('pointerdown', (event) => event.stopPropagation());
        this.container.addEventListener('click', (event) => {
            if (event.target === this.container) this.hide();
        });
        this.container.addEventListener('keydown', (event) => this.onKeyDown(event));
    }

    show(service) {
        this.service = service;
        this.render();
        this.isOpen = true;
        this.container.style.display = 'flex';
        this.container.classList.add('is-open');
        this.container.setAttribute('aria-hidden', 'false');
        this.overlays.open(this, {
            panel: this.panel,
            initialFocus: () => this.panel.querySelector('[data-testid^=floor-plan-]:not(:disabled)') || this.panel.querySelector('[data-testid=floor-plan-close]')
        });
    }

    render() {
        const service = this.service;
        const lumen = this.game?.charter?.lumen || 0;
        const options = FLOOR_PLANS.map((plan) => {
            const affordable = lumen >= plan.cost;
            const effects = [
                plan.housingCapacity && service.programId === 'housing' ? `+${plan.housingCapacity} beds` : null,
                plan.serviceCapacity && service.programId !== 'housing' ? `+${plan.serviceCapacity} capacity` : null,
                plan.quality ? `+${plan.quality.toFixed(2)} quality` : null,
                `+${plan.upkeep} upkeep`
            ].filter(Boolean).join(' · ');
            return `
                <button type="button" class="retrofit-option" data-testid="floor-plan-${plan.id}" data-plan="${plan.id}" ${affordable ? '' : 'disabled'}>
                    <span class="kicker">${escapeHtml(plan.kicker)}</span>
                    <strong>${escapeHtml(plan.name)}</strong>
                    <span>${escapeHtml(plan.blurb)}</span>
                    <span class="retrofit-option__stats">${escapeHtml(effects)} · ${plan.cost} lumen</span>
                </button>
            `;
        }).join('');
        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">Upper floor</p>
                    <h3 class="modal__title" id="floor-plan-title">What goes above ${escapeHtml(service.name)}?</h3>
                </div>
                <button type="button" class="modal__close" data-testid="floor-plan-close-x" aria-label="Close floor plan">×</button>
            </div>
            <p class="modal__blurb">A floor is permanent. Sleep more people, make the room finer, or put a garden on the roof.</p>
            <div class="retrofit-options">${options}</div>
            <p class="modal__error" data-role="floor-error" aria-live="polite"></p>
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="floor-plan-close">Keep the roof</button>
            </div>
        `;
        this.panel.querySelectorAll('[data-testid^=floor-plan-close]').forEach((button) => button.addEventListener('click', () => this.hide()));
        this.panel.querySelectorAll('[data-plan]').forEach((button) => {
            button.addEventListener('click', () => this.choose(button.dataset.plan));
        });
    }

    choose(planId) {
        const result = this.onChoose(this.service, planId);
        if (!result?.ok) {
            this.panel.querySelector('[data-role=floor-error]').textContent = result?.error || 'That floor could not be added.';
            return;
        }
        const service = this.service;
        this.hide();
        this.onDone?.(service);
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

