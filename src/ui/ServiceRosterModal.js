import { escapeHtml } from './html.js';

/**
 * A compact list of every player service with its state, condition and visits.
 * Rows open the full service record.
 */
export class ServiceRosterModal {
    constructor({ game, overlays, onOpenService, onRepairService, onRepairAll }) {
        this.game = game;
        this.overlays = overlays;
        this.onOpenService = onOpenService;
        this.onRepairService = onRepairService;
        this.onRepairAll = onRepairAll;
        this.isOpen = false;
        this.showAll = false;
        this.wornOnly = false;
        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'service-roster-scrim';
        this.panel = document.createElement('section');
        this.panel.className = 'modal service-roster';
        this.panel.dataset.testid = 'service-roster';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'service-roster-title');
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
            initialFocus: () => this.panel.querySelector('[data-testid=service-roster-close]')
        });
    }

    render() {
        const all = this.showAll
            ? (this.game?.charter?.allServices || [])
            : (this.game?.charter?.services?.services || []);
        const services = this.wornOnly ? all.filter((service) => service.condition < 100) : all;
        const rows = services.map((service) => `
            <div class="service-roster__row" data-service-id="${escapeHtml(service.id)}" role="button" tabindex="0">
                <span class="service-roster__name">${escapeHtml(service.name)}</span>
                <span class="service-roster__meta">${escapeHtml(service.program?.name || service.programId)} · ${escapeHtml(service.chapterName || service.chapterId)} · ${escapeHtml(service.state.toLowerCase())}${service.closed ? ' · closed' : ''}</span>
                <span class="service-roster__numbers">${service.capacity} capacity · ${service.visits} visits</span>
                <span class="service-roster__wear${service.condition < 50 ? ' is-worn' : ''}">${Math.round(service.condition ?? 100)}% wear</span>
                ${service.chapterId === 'player' && service.condition < 100 ? `<button type="button" class="service-roster__repair" data-repair-id="${escapeHtml(service.id)}">Repair · ${this.game?.charter?.repairCost?.(service) || 3}</button>` : ''}
            </div>
        `).join('');
        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">The chapter's doors</p>
                    <h3 class="modal__title" id="service-roster-title">Service roster</h3>
                </div>
                <button type="button" class="modal__close" data-testid="service-roster-close" aria-label="Close service roster">×</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="service-roster-worn" aria-pressed="${this.wornOnly}">${this.wornOnly ? 'All services' : 'Worn only'}</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="service-roster-all">${this.showAll ? 'Mine only' : 'All chapters'}</button>
            </div>
            <p class="modal__blurb">Every player service in one place. Open a row for hours, focus, floors, repairs and the people who use it.</p>
            <div class="service-roster__list">${rows || `<p class="report__quiet">${this.wornOnly ? 'No worn services.' : 'No player services yet.'}</p>`}</div>
            <div class="modal__actions">
                ${this.showAll ? '' : `<button type="button" class="btn btn--mint" data-testid="service-roster-repair-all" ${services.some((service) => service.condition < 100) ? '' : 'disabled'}>Repair all</button>`}
                <button type="button" class="btn btn--paper" data-testid="service-roster-done">Back to planning</button>
            </div>
        `;
        this.panel.querySelectorAll('[data-testid^=service-roster-close], [data-testid=service-roster-done]').forEach((button) => button.addEventListener('click', () => this.hide()));
        this.panel.querySelector('[data-testid=service-roster-worn]')?.addEventListener('click', () => {
            this.wornOnly = !this.wornOnly;
            this.render();
        });
        this.panel.querySelector('[data-testid=service-roster-all]')?.addEventListener('click', () => {
            this.showAll = !this.showAll;
            this.render();
        });
        this.panel.querySelector('[data-testid=service-roster-repair-all]')?.addEventListener('click', () => {
            const result = this.onRepairAll?.();
            if (result?.ok) this.render();
        });
        this.panel.querySelectorAll('[data-service-id]').forEach((row) => {
            const open = () => {
                const service = services.find((entry) => entry.id === row.dataset.serviceId);
                if (!service) return;
                this.hide();
                this.onOpenService?.(service);
            };
            row.addEventListener('click', (event) => {
                if (event.target.closest('[data-repair-id]')) return;
                open();
            });
            row.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    open();
                }
            });
        });
        this.panel.querySelectorAll('[data-repair-id]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const service = services.find((entry) => entry.id === button.dataset.repairId);
                if (!service) return;
                const result = this.onRepairService?.(service);
                if (result?.ok) this.render();
            });
        });
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
        this.showAll = false;
        this.wornOnly = false;
        this.container.style.display = 'none';
        this.container.classList.remove('is-open');
        this.container.setAttribute('aria-hidden', 'true');
        this.overlays.close(this);
    }
}
