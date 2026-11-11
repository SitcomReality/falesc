import { readArchive, clearArchive } from '../persistence/CharterArchive.js';
import { escapeHtml } from './html.js';

/**
 * Past charters, newest first. Read-only except for a deliberate clear.
 */
export class CharterArchiveModal {
    constructor({ overlays, onClear }) {
        this.overlays = overlays;
        this.onClear = onClear;
        this.isOpen = false;
        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'charter-archive-scrim';
        this.panel = document.createElement('section');
        this.panel.className = 'modal charter-archive';
        this.panel.dataset.testid = 'charter-archive';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'charter-archive-title');
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
            initialFocus: () => this.panel.querySelector('[data-testid=charter-archive-close]')
        });
    }

    render() {
        const records = readArchive();
        const rows = records.map((record) => `
            <li class="charter-archive__row charter-archive__row--${escapeHtml(record.outcome)}">
                <div>
                    <strong>${escapeHtml(record.chapterName || 'Home Chapter')}</strong>
                    ${record.motto ? `<em class="charter-archive__motto">${escapeHtml(record.motto)}</em>` : ''}
                    <span>${escapeHtml(labelFor(record))}</span>
                </div>
                <div class="charter-archive__stats">
                    <span>Day ${record.day}</span>
                    <span>${record.population} residents</span>
                    <span>${record.flourishing} flourishing</span>
                    ${record.stewardship ? `<span>${escapeHtml(record.stewardship)}</span>` : ''}
                </div>
            </li>
        `).join('');
        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">The drift remembers</p>
                    <h3 class="modal__title" id="charter-archive-title">Charter archive</h3>
                </div>
                <button type="button" class="modal__close" data-testid="charter-archive-close" aria-label="Close charter archive">×</button>
            </div>
            <p class="modal__blurb">The last ${records.length || 0} charter${records.length === 1 ? '' : 's'}, newest first. A victory records its stewardship; a defeat records what the chapter reached.</p>
            ${rows ? `<ol class="charter-archive__list">${rows}</ol>` : '<p class="modal__note">No charters have closed yet.</p>'}
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="charter-archive-done">Back to the menu</button>
                ${rows ? '<button type="button" class="btn btn--danger" data-testid="charter-archive-clear">Clear archive</button>' : ''}
            </div>
        `;
        this.panel.querySelectorAll('[data-testid^=charter-archive-close], [data-testid=charter-archive-done]').forEach((button) => button.addEventListener('click', () => this.hide()));
        this.panel.querySelector('[data-testid=charter-archive-clear]')?.addEventListener('click', () => {
            clearArchive();
            this.onClear?.();
            this.render();
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
        this.container.style.display = 'none';
        this.container.classList.remove('is-open');
        this.container.setAttribute('aria-hidden', 'true');
        this.overlays.close(this);
    }
}

function labelFor(record) {
    const mode = record.mode === 'contest' ? 'Contest' : 'First Light';
    const outcome = record.outcome === 'victory' ? 'victory' : record.outcome === 'defeat' ? 'defeat' : 'abandoned';
    return `${mode} · ${outcome}${record.commons === 'lit' ? ' · Beacon lit' : ''}`;
}

