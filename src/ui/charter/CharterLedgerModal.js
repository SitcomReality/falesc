/**
 * The daily charter ledger: population, housing, flourishing, lumen, visits and
 * closures for every played day. A small sparkline makes the trajectory legible.
 */
export class CharterLedgerModal {
    constructor({ game, overlays }) {
        this.game = game;
        this.overlays = overlays;
        this.isOpen = false;
        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'ledger-scrim';
        this.panel = document.createElement('section');
        this.panel.className = 'modal charter-ledger';
        this.panel.dataset.testid = 'ledger';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'ledger-title');
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
            initialFocus: () => this.panel.querySelector('[data-testid=ledger-close]')
        });
    }

    render() {
        const history = this.game?.charter?.history || [];
        const rows = history.slice(-10).map((entry) => `
            <tr>
                <td>${entry.day}</td>
                <td>${entry.population}</td>
                <td>${entry.housed}</td>
                <td>${entry.flourishing}</td>
                <td>${entry.lumen}</td>
                <td class="${entry.net >= 0 ? 'is-positive' : 'is-negative'}">${entry.net >= 0 ? '+' : ''}${entry.net}</td>
                <td>${entry.visits}</td>
                <td>${entry.closures}</td>
            </tr>
        `).join('');
        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">Charter ledger · ${history.length} day${history.length === 1 ? '' : 's'}</p>
                    <h3 class="modal__title" id="ledger-title">The run so far</h3>
                </div>
                <button type="button" class="modal__close" data-testid="ledger-close" aria-label="Close charter ledger">×</button>
            </div>
            <p class="modal__blurb">Each row is a finished day. Flourishing is the trend line; lumen is end-of-day.</p>
            ${history.length ? sparkline(history) : ''}
            ${history.length
                ? `<div class="charter-ledger__table-wrap"><table class="charter-ledger__table">
                    <thead><tr><th>Day</th><th>Pop.</th><th>Housed</th><th>Flourish</th><th>Lumen</th><th>Net</th><th>Visits</th><th>Closed</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table></div>`
                : '<p class="modal__note">No finished days yet. Open the day to begin the ledger.</p>'}
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="ledger-done">Back to planning</button>
            </div>
        `;
        this.panel.querySelectorAll('[data-testid^=ledger-close], [data-testid=ledger-done]').forEach((button) => button.addEventListener('click', () => this.hide()));
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

function sparkline(history) {
    const values = history.slice(-20).map((entry) => entry.flourishing);
    if (values.length < 2) return '';
    const width = 320;
    const height = 54;
    const max = Math.max(100, ...values);
    const points = values.map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - (value / max) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<svg class="charter-ledger__spark" viewBox="0 0 ${width} ${height}" role="img" aria-label="Flourishing trend"><polyline points="${points}"/><line x1="0" y1="${height}" x2="${width}" y2="${height}"/></svg>`;
}
