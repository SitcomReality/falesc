import { BALANCE } from '../design/balance.js';

/**
 * Shared Commons Beacon fund. Every chapter can put lumen into the same civic
 * project; when it is funded, the tower becomes a passive shared comfort for
 * every resident, not a private service.
 */
export class CommonsModal {
    constructor({ onContribute, overlays }) {
        this.onContribute = onContribute;
        this.overlays = overlays;
        this.isOpen = false;
        this.charter = null;

        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'commons-modal-scrim';

        this.panel = document.createElement('section');
        this.panel.className = 'modal commons-modal';
        this.panel.dataset.testid = 'commons-modal';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'commons-title');

        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';

        this.container.addEventListener('pointerdown', (event) => event.stopPropagation());
        this.container.addEventListener('click', (event) => {
            if (event.target === this.container) this.hide();
        });
        this.container.addEventListener('keydown', (event) => this.onKeyDown(event));
    }

    show(charter) {
        this.charter = charter;
        this.render();
        this.isOpen = true;
        this.container.style.display = 'flex';
        this.container.classList.add('is-open');
        this.container.setAttribute('aria-hidden', 'false');
        this.overlays.open(this, {
            panel: this.panel,
            initialFocus: () => this.panel.querySelector('[data-testid=commons-give-5]') || this.panel.querySelector('[data-testid=commons-close]')
        });
    }

    render() {
        const commons = this.charter.commons;
        if (!commons) return;
        const contributors = Object.entries(commons.contributors || {})
            .filter(([, value]) => value > 0)
            .map(([id, value]) => {
                const chapter = this.charter.chapterById(id);
                return `<li><span>${escapeHtml(chapter?.name || id)}</span><strong>${value}</strong></li>`;
            }).join('');
        if (commons.active) {
            this.panel.innerHTML = `
                <div class="modal__head">
                    <div>
                        <p class="kicker" style="color:var(--wine)">The Commons · shared project</p>
                        <h3 class="modal__title" id="commons-title">The Beacon is lit.</h3>
                    </div>
                    <button type="button" class="modal__close" data-testid="commons-close-x" aria-label="Close commons">×</button>
                </div>
                <p class="modal__blurb">The fund is full. The Beacon gives every resident a little more room to be well: each night it eases every need by ${BALANCE.commons.comfort}.</p>
                <ul class="commons-contributors">${contributors || '<li><span>The commons</span><strong>—</strong></li>'}</ul>
                <div class="modal__actions">
                    <button type="button" class="btn btn--primary" data-testid="commons-close">Close</button>
                </div>
            `;
        } else {
            const player = this.charter.player;
            const canGive5 = player.lumen >= 5;
            const canGive10 = player.lumen >= 10;
            this.panel.innerHTML = `
                <div class="modal__head">
                    <div>
                        <p class="kicker" style="color:var(--wine)">The Commons · shared project</p>
                        <h3 class="modal__title" id="commons-title">Raise the Commons Beacon.</h3>
                    </div>
                    <button type="button" class="modal__close" data-testid="commons-close-x" aria-label="Close commons">×</button>
                </div>
                <p class="modal__blurb">A shared tower of prism glass, funded by every chapter. When it is lit, every resident sleeps a little easier: each night it eases every need.</p>
                <div class="commons-progress">
                    <div class="commons-progress__track"><i style="width:${Math.min(100, Math.round(commons.fund / commons.target * 100))}%"></i></div>
                    <strong>${commons.fund} / ${commons.target} lumen</strong>
                </div>
                <h4 class="campaign-modal__label">Given so far</h4>
                <ul class="commons-contributors">${contributors || '<li><span>Nobody yet</span><strong>0</strong></li>'}</ul>
                <p class="modal__note">The whole archipelago shares the Beacon. Rivals give a little each day when they can.</p>
                <div class="modal__actions">
                    <button type="button" class="btn btn--paper" data-testid="commons-give-5" ${canGive5 ? '' : 'disabled'}>Give 5</button>
                    <button type="button" class="btn btn--primary" data-testid="commons-give-10" ${canGive10 ? '' : 'disabled'}>Give 10</button>
                </div>
            `;
        }
        this.panel.querySelectorAll('[data-testid^=commons-close]').forEach((button) => button.addEventListener('click', () => this.hide()));
        this.panel.querySelector('[data-testid=commons-give-5]')?.addEventListener('click', () => this.give(5));
        this.panel.querySelector('[data-testid=commons-give-10]')?.addEventListener('click', () => this.give(10));
    }

    give(amount) {
        const result = this.onContribute(amount);
        if (!result?.ok) return;
        this.render();
        requestAnimationFrame(() => {
            this.panel.querySelector('[data-testid=commons-close]')?.focus({ preventScroll: true });
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

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
