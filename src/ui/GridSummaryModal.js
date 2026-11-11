import { escapeHtml } from './escapeHtml.js';
/**
 * A readable grid summary for keyboard and assistive-tech players: one table
 * per buildable isle, every cell named and its occupant described. This is a
 * planning reference, not a second map.
 */
export class GridSummaryModal {
    constructor({ game, overlays }) {
        this.game = game;
        this.overlays = overlays;
        this.isOpen = false;
        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'grid-summary-scrim';
        this.panel = document.createElement('section');
        this.panel.className = 'modal grid-summary';
        this.panel.dataset.testid = 'grid-summary';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'grid-summary-title');
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
            initialFocus: () => this.panel.querySelector('[data-testid=grid-summary-close]')
        });
    }

    render() {
        const charter = this.game?.charter;
        if (!charter) return;
        const sectors = [this.game.world.homeSector, charter.commonsSector, charter.gardenSector].filter(Boolean);
        const sections = sectors.map((sector) => {
            const rows = [];
            for (let v = 0; v < sector.gridSize; v++) {
                const cells = [];
                for (let u = 0; u < sector.gridSize; u++) {
                    const service = this.serviceAt(charter, sector, u, v);
                    const label = this.describe(service);
                    cells.push(`<td class="${service ? 'is-occupied' : ''}" aria-label="cell ${u}, ${v}: ${escapeHtml(label)}">${service ? escapeHtml(service.isTransit ? '⇄' : initials(service.name)) : '·'}</td>`);
                }
                rows.push(`<tr><th scope="row">${v}</th>${cells.join('')}</tr>`);
            }
            const isle = sector.garden ? 'Garden isle' : sector.commons ? 'Commons isle' : 'Home shard';
            const columns = Array.from({ length: sector.gridSize }, (_, u) => `<th scope="col">${u}</th>`).join('');
            return `<section><h4>${isle} · ${sector.gridSize}×${sector.gridSize}</h4><table class="grid-summary__table"><caption>${isle} build grid</caption><thead><tr><th></th>${columns}</tr></thead><tbody>${rows.join('')}</tbody></table></section>`;
        }).join('');
        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">Planning reference</p>
                    <h3 class="modal__title" id="grid-summary-title">The build grid</h3>
                </div>
                <button type="button" class="modal__close" data-testid="grid-summary-close" aria-label="Close grid summary">×</button>
            </div>
            <p class="modal__blurb">A printable summary of every buildable cell. Dots are free, ⇄ is a shuttle gate, initials name the service. The tables are read row by row.</p>
            <div class="grid-summary__body">${sections}</div>
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="grid-summary-done">Back to planning</button>
            </div>
        `;
        this.panel.querySelectorAll('[data-testid^=grid-summary-close], [data-testid=grid-summary-done]').forEach((button) => button.addEventListener('click', () => this.hide()));
    }

    serviceAt(charter, sector, u, v) {
        const shared = sector.commons ? charter.commonsManager : charter.services;
        return shared?.serviceAt?.(sector.id, u, v) || null;
    }

    describe(service) {
        if (!service) return 'free';
        if (service.isTransit) return 'shuttle gate';
        return `${service.name} (${service.state.toLowerCase()}${service.closed ? ', closed' : ''})`;
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

