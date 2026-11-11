import { NEEDS } from '../design/needs.js';
import { BALANCE } from '../design/balance.js';
import { describeTraits } from '../design/traits.js';

/**
 * A visitor's own card. The report row is the invitation surface; this card is
 * the person behind it: traits, needs, the last door they used, and whether
 * they are ready to stay.
 */
export class VisitorCardModal {
    constructor({ onInvite, overlays }) {
        this.onInvite = onInvite;
        this.overlays = overlays;
        this.isOpen = false;
        this.visitor = null;

        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'visitor-card-scrim';

        this.panel = document.createElement('section');
        this.panel.className = 'modal visitor-card';
        this.panel.dataset.testid = 'visitor-card';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'visitor-card-title');

        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';

        this.container.addEventListener('pointerdown', (event) => event.stopPropagation());
        this.container.addEventListener('click', (event) => {
            if (event.target === this.container) this.hide();
        });
        this.container.addEventListener('keydown', (event) => this.onKeyDown(event));
    }

    show(visitor, { spareBeds = 0 } = {}) {
        this.visitor = visitor;
        this.spareBeds = spareBeds;
        this.render();
        this.isOpen = true;
        this.container.style.display = 'flex';
        this.container.classList.add('is-open');
        this.container.setAttribute('aria-hidden', 'false');
        this.overlays.open(this, {
            panel: this.panel,
            initialFocus: () => this.panel.querySelector('[data-testid=visitor-invite]:not(:disabled)') || this.panel.querySelector('[data-testid=visitor-close]')
        });
    }

    render() {
        const visitor = this.visitor;
        const charmed = visitor.getAffinity('player') >= BALANCE.visitors.stayAffinity;
        const canInvite = charmed && this.spareBeds > 0;
        const needs = NEEDS.map((need) => `
            <div class="visitor-card__need">
                <span>${need.name}</span>
                <span class="visitor-card__track"><i style="width:${Math.round(visitor.needs[need.id] || 0)}%;background:${need.color}"></i></span>
                <strong>${Math.round(visitor.needs[need.id] || 0)}</strong>
            </div>
        `).join('');
        const lastChoice = visitor.memory.lastChoice;
        this.panel.innerHTML = `
            <div class="modal__head">
                <div class="visitor-card__identity">
                    <span class="visitor-card__avatar" aria-hidden="true">${escapeHtml(initials(visitor.name))}</span>
                    <div>
                        <p class="kicker" style="color:var(--wine)">Day visitor${visitor.returned ? ' · returning' : ''}</p>
                        <h3 class="modal__title" id="visitor-card-title">${escapeHtml(visitor.name)}</h3>
                    </div>
                </div>
                <button type="button" class="modal__close" data-testid="visitor-close-x" aria-label="Close visitor card">×</button>
            </div>
            <p class="modal__blurb">${escapeHtml(visitor.traitSummary || describeTraits(visitor.traits))}</p>
            <div class="visitor-card__facts">
                <div><span class="kicker">Wellbeing</span><strong>${Math.round(visitor.wellbeing)}</strong></div>
                <div><span class="kicker">Visits</span><strong>${visitor.memory.recentVisits?.length || 0}</strong></div>
                <div><span class="kicker">Player affinity</span><strong>${visitor.getAffinity('player').toFixed(2)}</strong></div>
            </div>
            <h4 class="campaign-modal__label">Needs</h4>
            <div class="visitor-card__needs">${needs}</div>
            <p class="modal__note">${lastChoice ? `Last door: “${escapeHtml(lastChoice.reason)}”` : 'They kept to the square today.'}</p>
            <div class="visitor-card__history" data-testid="visitor-history">${(visitor.memory.recentVisits || []).slice(-3).reverse().map((visit) => `<p><span>Day ${visit.day}</span><strong>${escapeHtml(visit.serviceName || visit.serviceId)}</strong><small>${escapeHtml(visit.reason || '')}</small></p>`).join('') || '<p class="modal__note">No visits yet.</p>'}</div>
            <p class="modal__error" data-role="visitor-error" aria-live="polite"></p>
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="visitor-close">Keep them as a visitor</button>
                <button type="button" class="btn btn--primary" data-testid="visitor-invite" ${canInvite ? '' : 'disabled'}>Offer a trial stay</button>
            </div>
        `;
        this.panel.querySelectorAll('[data-testid^=visitor-close]').forEach((button) => button.addEventListener('click', () => this.hide()));
        this.panel.querySelector('[data-testid=visitor-invite]').addEventListener('click', () => this.invite());
    }

    invite() {
        const result = this.onInvite(this.visitor.id);
        if (!result?.ok) {
            this.panel.querySelector('[data-role=visitor-error]').textContent = result?.reason || 'They cannot stay right now.';
            return;
        }
        this.hide();
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
        this.visitor = null;
        this.container.style.display = 'none';
        this.container.classList.remove('is-open');
        this.container.setAttribute('aria-hidden', 'true');
        this.overlays.close(this);
    }
}

function initials(name) {
    return String(name || '?').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
