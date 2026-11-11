/**
 * The morning bulletin: a paused paper card with three pieces of news — an
 * unmet need, an arrival or complaint, and a line of word of mouth.
 */
export class BulletinModal {
    constructor({ onClose, inputManager }) {
        this.onClose = onClose;
        this.inputManager = inputManager;
        this.isOpen = false;
        this.lastFocused = null;
        this.inertHud = null;

        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'bulletin-modal-scrim';

        this.panel = document.createElement('section');
        this.panel.className = 'modal bulletin';
        this.panel.dataset.testid = 'bulletin-modal';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'bulletin-title');
        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">Morning bulletin</p>
                    <h3 class="modal__title" id="bulletin-title">Day 01</h3>
                </div>
                <span class="bulletin__stamp" aria-hidden="true">FSC</span>
            </div>
            <div class="bulletin__items" data-role="items"></div>
            <div class="bulletin__foot">
                <p class="bulletin__note">Planning is paused. Read the room, then shape the day.</p>
                <button type="button" class="btn btn--primary" data-testid="bulletin-continue">Begin planning</button>
            </div>
        `;

        this.titleEl = this.panel.querySelector('#bulletin-title');
        this.itemsEl = this.panel.querySelector('[data-role=items]');
        this.continueBtn = this.panel.querySelector('[data-testid=bulletin-continue]');

        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
        this.container.addEventListener('pointerdown', (event) => event.stopPropagation());
        this.continueBtn.addEventListener('click', () => this.hide());
        this.container.addEventListener('keydown', (event) => this.onKeyDown(event));
    }

    show(bulletin) {
        if (!bulletin || this.isOpen) return;
        this.isOpen = true;
        this.lastFocused = document.activeElement;
        this.titleEl.textContent = `Day ${String(bulletin.day).padStart(2, '0')}`;
        this.itemsEl.innerHTML = bulletin.items.map((item, index) => `
            <article class="bulletin__item">
                <span class="bulletin__number">${String(index + 1).padStart(2, '0')}</span>
                <div>
                    <p class="kicker">${escapeHtml(item.kicker)}</p>
                    <h4>${escapeHtml(item.title)}</h4>
                    <p>${escapeHtml(item.text)}</p>
                </div>
            </article>
        `).join('');
        this.container.style.display = 'flex';
        this.container.classList.add('is-open');
        document.body.classList.add('has-modal');
        this.inertHud = document.querySelector('[data-testid=game-hud]');
        if (this.inertHud) this.inertHud.setAttribute('inert', '');
        if (this.inputManager?.setModalOpen) this.inputManager.setModalOpen(true);
        requestAnimationFrame(() => {
            if (this.isOpen) this.continueBtn.focus({ preventScroll: true });
        });
    }

    hide() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.container.style.display = 'none';
        this.container.classList.remove('is-open');
        document.body.classList.remove('has-modal');
        if (this.inertHud) {
            this.inertHud.removeAttribute('inert');
            this.inertHud = null;
        }
        if (this.inputManager?.setModalOpen) this.inputManager.setModalOpen(false);
        if (this.lastFocused?.focus) this.lastFocused.focus({ preventScroll: true });
        this.lastFocused = null;
        if (this.onClose) this.onClose();
    }

    onKeyDown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            this.hide();
            return;
        }
        if (event.key !== 'Tab') return;
        event.stopPropagation();
        const focusable = Array.from(this.panel.querySelectorAll('button:not(:disabled)'));
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
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
