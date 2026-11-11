import { blueprintIcon } from './icons.js';
import { BLUEPRINT_BY_ID } from '../buildings/blueprints.js';

/**
 * Inspect/demolish dialog for an existing structure. Shares the visual language
 * and focus/accessibility contract of the build dialog.
 */
export class StructureModal {
    constructor({ onDemolish, inputManager }) {
        this.onDemolish = onDemolish;
        this.inputManager = inputManager;
        this.isOpen = false;
        this.building = null;
        this.lastFocused = null;
        this.inertHud = null;

        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'structure-modal-scrim';

        this.panel = document.createElement('div');
        this.panel.className = 'modal';
        this.panel.dataset.testid = 'structure-modal';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'structure-modal-title');

        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">Structure record</p>
                    <h3 class="modal__title" id="structure-modal-title" data-role="name">Prism Rig</h3>
                </div>
                <button type="button" class="modal__close" data-testid="structure-close" aria-label="Close structure dialog">×</button>
            </div>
            <div class="blueprint-summary">
                <span class="blueprint-summary__icon" data-role="icon" aria-hidden="true"></span>
                <span class="blueprint-summary__body">
                    <span class="blueprint-summary__name" data-role="blueprint">Prism Rig</span>
                    <span class="blueprint-summary__stats" data-role="stats"></span>
                </span>
            </div>
            <p class="modal__blurb" data-role="blurb"></p>
            <p class="modal__note" data-role="note"></p>
            <p class="modal__error" data-role="error" aria-live="polite"></p>
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="structure-cancel">Keep it</button>
                <button type="button" class="btn btn--danger" data-testid="structure-demolish">Dismantle</button>
            </div>
        `;

        this.nameEl = this.panel.querySelector('[data-role=name]');
        this.iconEl = this.panel.querySelector('[data-role=icon]');
        this.blueprintEl = this.panel.querySelector('[data-role=blueprint]');
        this.statsEl = this.panel.querySelector('[data-role=stats]');
        this.blurbEl = this.panel.querySelector('[data-role=blurb]');
        this.noteEl = this.panel.querySelector('[data-role=note]');
        this.errorEl = this.panel.querySelector('[data-role=error]');
        this.demolishBtn = this.panel.querySelector('[data-testid=structure-demolish]');

        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';

        this.container.addEventListener('pointerdown', (event) => event.stopPropagation());
        this.container.addEventListener('click', (event) => {
            if (event.target === this.container) this.hide();
        });
        this.panel.querySelector('[data-testid=structure-close]').addEventListener('click', () => this.hide());
        this.panel.querySelector('[data-testid=structure-cancel]').addEventListener('click', () => this.hide());
        this.demolishBtn.addEventListener('click', () => this.demolish());
        this.container.addEventListener('keydown', (event) => this.onKeyDown(event));
    }

    show(building, refund) {
        if (this.isOpen) return;
        this.isOpen = true;
        this.building = building;
        this.refund = refund;
        this.lastFocused = document.activeElement;

        const blueprint = BLUEPRINT_BY_ID[building.blueprintId];
        this.nameEl.textContent = building.name || blueprint?.name || 'Structure';
        this.iconEl.innerHTML = blueprintIcon(building.blueprintId);
        this.blueprintEl.textContent = blueprint?.name || 'Structure';
        this.statsEl.innerHTML = `
            <span><strong>${building.state === 'ACTIVE' ? 'Working' : 'Under construction'}</strong></span>
            ${building.income ? `<span>+${building.income} lumen / tide</span>` : ''}
            ${building.bonusIncome ? `<span>Crystal affinity +${building.bonusIncome}</span>` : ''}
        `;
        this.blurbEl.textContent = blueprint?.blurb || '';
        this.noteEl.textContent = `Dismantling returns ${refund} lumen. The plot becomes free again.`;
        this.errorEl.textContent = '';
        this.demolishBtn.textContent = `Dismantle · +${refund} lumen`;
        this.demolishBtn.disabled = false;

        this.container.style.display = 'flex';
        this.container.classList.add('is-open');
        this.container.setAttribute('aria-hidden', 'false');
        document.body.classList.add('has-modal');
        this.inertHud = document.querySelector('[data-testid=game-hud]');
        if (this.inertHud) this.inertHud.setAttribute('inert', '');
        if (this.inputManager?.setModalOpen) this.inputManager.setModalOpen(true);

        requestAnimationFrame(() => {
            if (this.isOpen) this.demolishBtn.focus({ preventScroll: true });
        });
    }

    demolish() {
        if (!this.isOpen || !this.building) return;
        const result = this.onDemolish(this.building);
        if (result && result.ok === false) {
            this.errorEl.textContent = result.error || 'That structure cannot be dismantled.';
            return;
        }
        this.hide(false);
    }

    onKeyDown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.hide();
            return;
        }
        if (event.key !== 'Tab') return;
        const focusable = Array.from(
            this.panel.querySelectorAll('button:not(:disabled), [tabindex]:not([tabindex="-1"])')
        ).filter((element) => element.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    hide() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.building = null;
        this.container.style.display = 'none';
        this.container.classList.remove('is-open');
        this.container.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('has-modal');
        if (this.inertHud) {
            this.inertHud.removeAttribute('inert');
            this.inertHud = null;
        }
        if (this.inputManager?.setModalOpen) this.inputManager.setModalOpen(false);
        if (this.lastFocused?.focus) this.lastFocused.focus({ preventScroll: true });
        this.lastFocused = null;
    }
}
