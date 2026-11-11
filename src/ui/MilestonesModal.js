/**
 * A short checklist of firsts and civic milestones. It is guidance and a record,
 * not a second objective system or a source of rewards.
 */
export class MilestonesModal {
    constructor({ game, overlays }) {
        this.game = game;
        this.overlays = overlays;
        this.isOpen = false;
        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'milestones-scrim';
        this.panel = document.createElement('section');
        this.panel.className = 'modal milestones';
        this.panel.dataset.testid = 'milestones';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'milestones-title');
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
            initialFocus: () => this.panel.querySelector('[data-testid=milestones-close]')
        });
    }

    render() {
        const entries = this.game?.charter?.milestones() || [];
        const done = entries.filter((entry) => entry.done).length;
        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">Charter milestones · ${done} / ${entries.length}</p>
                    <h3 class="modal__title" id="milestones-title">Firsts and foundations</h3>
                </div>
                <button type="button" class="modal__close" data-testid="milestones-close" aria-label="Close milestones">×</button>
            </div>
            <p class="modal__blurb">Optional landmarks for a charter. They grant no lumen; they are a way to see how far the chapter has come.</p>
            <ol class="milestones__list">
                ${entries.map((entry) => `<li class="${entry.done ? 'is-done' : ''}"><span aria-hidden="true">${entry.done ? '✓' : '○'}</span><strong>${escapeHtml(entry.label)}</strong></li>`).join('')}
            </ol>
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="milestones-done">Back to planning</button>
            </div>
        `;
        this.panel.querySelectorAll('[data-testid^=milestones-close], [data-testid=milestones-done]').forEach((button) => button.addEventListener('click', () => this.hide()));
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

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
