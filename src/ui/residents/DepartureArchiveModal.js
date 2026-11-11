import { TEMPERAMENT_BY_ID } from '../../design/traits.js';
import { escapeHtml } from '../chrome/escapeHtml.js';

/**
 * The residents who left the charter. A small paper memorial, not a management
 * screen: who they were, when they left, why, and the last door they chose.
 */
export class DepartureArchiveModal {
    constructor({ game, overlays }) {
        this.game = game;
        this.overlays = overlays;
        this.isOpen = false;
        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'departure-archive-scrim';
        this.panel = document.createElement('section');
        this.panel.className = 'modal departure-archive';
        this.panel.dataset.testid = 'departure-archive';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'departure-title');
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
            initialFocus: () => this.panel.querySelector('[data-testid=departure-close]')
        });
    }

    render() {
        const departed = this.game?.charter?.departedResidents || [];
        const entries = departed.map((resident) => {
            const temperament = TEMPERAMENT_BY_ID[resident.traits.temperament];
            const last = resident.memory?.lastChoice;
            const departure = resident.memory?.departure;
            return `
                <li>
                    <span class="departure-archive__avatar">${escapeHtml(initials(resident.name))}</span>
                    <div>
                        <strong>${escapeHtml(resident.name)}</strong>
                        <span>${escapeHtml(temperament?.name || '')} · left day ${departure?.day ?? '—'}</span>
                        <small>${escapeHtml(departure?.reason || 'No reason recorded.')}</small>
                        ${last ? `<small>Last door: ${escapeHtml(last.serviceName || 'none')} · day ${last.day}</small>` : ''}
                    </div>
                </li>
            `;
        }).join('');
        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">Charter record</p>
                    <h3 class="modal__title" id="departure-title">The ones who left</h3>
                </div>
                <button type="button" class="modal__close" data-testid="departure-close" aria-label="Close departure archive">×</button>
            </div>
            <p class="modal__blurb">Every departure is kept here: the day, the reason and the last door they chose.</p>
            ${entries ? `<ol class="departure-archive__list">${entries}</ol>` : '<p class="modal__note">Nobody has left this charter.</p>'}
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="departure-done">Back to the shard</button>
            </div>
        `;
        this.panel.querySelectorAll('[data-testid^=departure-close], [data-testid=departure-done]').forEach((button) => button.addEventListener('click', () => this.hide()));
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

