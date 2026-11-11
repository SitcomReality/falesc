import { RETROFIT_MODULES } from '../services/RetrofitModules.js';

/**
 * Retrofit choice: one module per service, with a real trade between seats,
 * quality and upkeep.
 */
export class RetrofitModal {
    constructor({ onChoose, onDone, game, overlays }) {
        this.onChoose = onChoose;
        this.onDone = onDone;
        this.game = game;
        this.overlays = overlays;
        this.isOpen = false;
        this.service = null;

        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'retrofit-modal-scrim';

        this.panel = document.createElement('section');
        this.panel.className = 'modal retrofit-modal';
        this.panel.dataset.testid = 'retrofit-modal';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'retrofit-title');

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
            initialFocus: () => this.panel.querySelector('[data-testid^=retrofit-]:not(:disabled)') || this.panel.querySelector('[data-testid=retrofit-close]')
        });
    }

    render() {
        const service = this.service;
        const lumen = this.game?.charter?.lumen || 0;
        const installed = service.retrofits || [];
        const options = RETROFIT_MODULES.map((module) => {
            const already = installed.includes(module.id);
            const affordable = !already && lumen >= module.cost;
            const effects = [
                module.capacity ? `+${module.capacity} capacity` : null,
                module.quality ? `+${module.quality.toFixed(2)} quality` : null,
                `+${module.upkeep} upkeep`
            ].filter(Boolean).join(' · ');
            return `
                <button type="button" class="retrofit-option${already ? ' is-installed' : ''}" data-testid="retrofit-${module.id}" data-module="${module.id}" ${affordable ? '' : 'disabled'}>
                    <span class="kicker">${already ? 'Installed' : escapeHtml(module.kicker)}</span>
                    <strong>${escapeHtml(module.name)}</strong>
                    <span>${escapeHtml(module.blurb)}</span>
                    <span class="retrofit-option__stats">${escapeHtml(effects)} · ${module.cost} lumen</span>
                </button>
            `;
        }).join('');
        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">Service retrofit</p>
                    <h3 class="modal__title" id="retrofit-title">Add a module to ${escapeHtml(service.name)}.</h3>
                </div>
                <button type="button" class="modal__close" data-testid="retrofit-close-x" aria-label="Close retrofit">×</button>
            </div>
            <p class="modal__blurb">A retrofit is permanent and a service can hold two modules. ${installed.length === 1 ? 'One module is already installed; choose a second.' : 'More seats, a finer room, or a later kitchen — the choice changes the service record and the day.'}</p>
            <div class="retrofit-options">${options}</div>
            <p class="modal__error" data-role="retrofit-error" aria-live="polite"></p>
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="retrofit-close">Keep it as built</button>
            </div>
        `;
        this.panel.querySelectorAll('[data-testid^=retrofit-close]').forEach((button) => button.addEventListener('click', () => this.hide()));
        this.panel.querySelectorAll('[data-module]').forEach((button) => {
            button.addEventListener('click', () => this.choose(button.dataset.module));
        });
    }

    choose(moduleId) {
        const result = this.onChoose(this.service, moduleId);
        if (!result?.ok) {
            this.panel.querySelector('[data-role=retrofit-error]').textContent = result?.error || 'That retrofit could not be installed.';
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

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
