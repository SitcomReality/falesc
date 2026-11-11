import { escapeHtml } from './escapeHtml.js';
/**
 * The charter journal: short, player-facing milestones. It is not a report or a
 * replay, just the decisions and arrivals worth remembering.
 */
export class CharterJournalModal {
    constructor({ game, overlays }) {
        this.game = game;
        this.overlays = overlays;
        this.isOpen = false;
        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'journal-scrim';
        this.panel = document.createElement('section');
        this.panel.className = 'modal charter-journal';
        this.panel.dataset.testid = 'journal';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'journal-title');
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
            initialFocus: () => this.panel.querySelector('[data-testid=journal-close]')
        });
    }

    render() {
        const entries = [...(this.game?.charter?.journal || [])].reverse();
        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">Charter journal · ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</p>
                    <h3 class="modal__title" id="journal-title">What happened here</h3>
                </div>
                <button type="button" class="modal__close" data-testid="journal-close" aria-label="Close charter journal">×</button>
            </div>
            ${entries.length
                ? `<ol class="charter-journal__list">${entries.map((entry) => `<li class="charter-journal__entry charter-journal__entry--${escapeHtml(entry.type)}"><span>Day ${entry.day}</span><small>${escapeHtml(entry.type)}</small><strong>${escapeHtml(entry.text)}</strong></li>`).join('')}</ol>`
                : '<p class="modal__note">Nothing written yet. Break ground, light the Beacon or welcome a visitor.</p>'}
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="journal-done">Back to planning</button>
            </div>
        `;
        this.panel.querySelectorAll('[data-testid^=journal-close], [data-testid=journal-done]').forEach((button) => button.addEventListener('click', () => this.hide()));
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

