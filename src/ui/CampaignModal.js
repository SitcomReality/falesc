import { PLEDGES } from '../confluence/Pledges.js';

/**
 * Campaign promise chooser. Rivals publish their promises; the player picks
 * one of the same four needs. The promise persists into the Confluence vote.
 */
export class CampaignModal {
    constructor({ onChoose, overlays }) {
        this.onChoose = onChoose;
        this.overlays = overlays;
        this.isOpen = false;
        this.campaign = null;
        this.charter = null;

        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'campaign-modal-scrim';

        this.panel = document.createElement('section');
        this.panel.className = 'modal campaign-modal';
        this.panel.dataset.testid = 'campaign-modal';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'campaign-title');
        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">The Confluence · campaign</p>
                    <h3 class="modal__title" id="campaign-title">Make a promise.</h3>
                </div>
                <button type="button" class="modal__close" data-testid="campaign-close" aria-label="Close campaign">×</button>
            </div>
            <p class="modal__blurb">The rivals have published their promises. Choose what your chapter will be known for when the archipelago votes.</p>
            <h4 class="campaign-modal__label">Festival programme</h4>
            <ul class="campaign-events" data-role="events" data-testid="campaign-events"></ul>
            <h4 class="campaign-modal__label">Rival promises</h4>
            <ul class="campaign-rivals" data-role="rivals"></ul>
            <h4 class="campaign-modal__label">Your promise</h4>
            <div class="pledge-grid" data-role="pledges"></div>
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="campaign-later">Later</button>
                <button type="button" class="btn btn--primary" data-testid="campaign-confirm">Make the promise</button>
            </div>
        `;

        this.eventsEl = this.panel.querySelector('[data-role=events]');
        this.rivalsEl = this.panel.querySelector('[data-role=rivals]');
        this.pledgesEl = this.panel.querySelector('[data-role=pledges]');
        this.confirmBtn = this.panel.querySelector('[data-testid=campaign-confirm]');
        this.laterBtn = this.panel.querySelector('[data-testid=campaign-later]');
        this.closeBtn = this.panel.querySelector('[data-testid=campaign-close]');

        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';

        this.container.addEventListener('pointerdown', (event) => event.stopPropagation());
        this.container.addEventListener('click', (event) => {
            if (event.target === this.container) this.hide();
        });
        this.closeBtn.addEventListener('click', () => this.hide());
        this.laterBtn.addEventListener('click', () => this.hide());
        this.confirmBtn.addEventListener('click', () => this.choose());
        this.container.addEventListener('keydown', (event) => this.onKeyDown(event));
    }

    show(campaign, charter) {
        this.campaign = campaign;
        this.charter = charter;
        const rivalRows = charter.rivals.map((rival) => {
            const pledge = campaign.pledgeFor(rival.id);
            return `<li><span class="campaign-rivals__dot" style="background:${rival.colour}"></span><span>${escapeHtml(rival.name)}</span><strong>${escapeHtml(pledge?.name || 'No promise yet')}</strong></li>`;
        }).join('');
        this.eventsEl.innerHTML = (campaign.events || []).map((event) => `
            <li><span>Day ${event.day} · ${escapeHtml(event.session || 'Festival')}</span><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.blurb)}</small></li>
        `).join('');
        this.rivalsEl.innerHTML = rivalRows || '<li><span>No rival promises yet.</span></li>';
        const selected = campaign.playerPledge || PLEDGES[0].id;
        const locked = Boolean(campaign.playerPledge);
        this.confirmBtn.textContent = locked ? 'Keep the promise' : 'Make the promise';
        this.pledgesEl.innerHTML = PLEDGES.map((pledge) => `
            <label class="pledge-card${pledge.id === selected ? ' is-selected' : ''}${locked ? ' is-locked' : ''}">
                <input type="radio" name="campaign-pledge" value="${pledge.id}" data-testid="campaign-pledge-${pledge.id}" ${pledge.id === selected ? 'checked' : ''} ${locked ? 'disabled' : ''}>
                <span class="pledge-card__kicker">${escapeHtml(pledge.headline)}</span>
                <strong>${escapeHtml(pledge.name)}</strong>
                <span class="pledge-card__copy">${escapeHtml(pledge.copy)}</span>
            </label>
        `).join('');
        this.pledgesEl.querySelectorAll('input').forEach((input) => {
            input.addEventListener('change', () => {
                this.pledgesEl.querySelectorAll('.pledge-card').forEach((card) => {
                    card.classList.toggle('is-selected', card.querySelector('input').checked);
                });
            });
        });
        this.isOpen = true;
        this.container.style.display = 'flex';
        this.container.classList.add('is-open');
        this.container.setAttribute('aria-hidden', 'false');
        this.overlays.open(this, {
            panel: this.panel,
            initialFocus: () => this.confirmBtn
        });
    }

    choose() {
        const pledgeId = this.panel.querySelector('input[name=campaign-pledge]:checked')?.value;
        if (!pledgeId) return;
        const result = this.onChoose(pledgeId);
        if (result?.ok) this.hide();
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
