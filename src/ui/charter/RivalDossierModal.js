import { escapeHtml } from '../chrome/escapeHtml.js';
/**
 * A rival chapter's public dossier: doctrine, plan, residents, Devotion and the
 * services it currently operates. Read-only.
 */
export class RivalDossierModal {
    constructor({ game, overlays }) {
        this.game = game;
        this.overlays = overlays;
        this.isOpen = false;
        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'rival-dossier-scrim';
        this.panel = document.createElement('section');
        this.panel.className = 'modal rival-dossier';
        this.panel.dataset.testid = 'rival-dossier';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'rival-dossier-title');
        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
        this.container.addEventListener('pointerdown', (event) => event.stopPropagation());
        this.container.addEventListener('click', (event) => {
            if (event.target === this.container) this.hide();
        });
        this.container.addEventListener('keydown', (event) => this.onKeyDown(event));
    }

    show(chapter) {
        if (!chapter) return;
        this.render(chapter);
        this.isOpen = true;
        this.container.style.display = 'flex';
        this.container.classList.add('is-open');
        this.container.setAttribute('aria-hidden', 'false');
        this.overlays.open(this, {
            panel: this.panel,
            initialFocus: () => this.panel.querySelector('[data-testid=rival-dossier-close]')
        });
    }

    render(chapter) {
        const charter = this.game?.charter;
        const residents = charter?.activeResidents.filter((resident) => resident.homeChapterId === chapter.id) || [];
        const devotion = charter?.devotionByChapter?.[chapter.id] || 0;
        const visits = charter?.lastReport?.patronageByChapter?.[chapter.id] || 0;
        const services = chapter.services?.services || [];
        const plan = chapter.plan;
        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:${chapter.colour}">Rival dossier</p>
                    <h3 class="modal__title" id="rival-dossier-title">${escapeHtml(chapter.name)}</h3>
                </div>
                <button type="button" class="modal__close" data-testid="rival-dossier-close" aria-label="Close rival dossier">×</button>
            </div>
            <p class="modal__blurb">${escapeHtml(chapter.blurb || doctrineLine(chapter.doctrine))}</p>
            <dl class="rival-dossier__stats">
                <div><dt>Devotion</dt><dd>${devotion.toFixed(1)} ♥</dd></div>
                <div><dt>Residents</dt><dd>${residents.length}</dd></div>
                <div><dt>Visits today</dt><dd>${visits}</dd></div>
                <div><dt>Lumen</dt><dd>${chapter.lumen}</dd></div>
                <div><dt>Works</dt><dd>${chapter.works}</dd></div>
                <div><dt>Upkeep</dt><dd>${chapter.services?.totalUpkeep?.() || 0}</dd></div>
            </dl>
            <p class="rival-dossier__plan">${plan ? `${plan.saving ? 'Saving for' : 'Planning'} <strong>${escapeHtml(plan.name)}</strong> · need ${escapeHtml(plan.need || '')}` : 'No long-term plan announced.'}</p>
            <h4 class="campaign-modal__label">Services</h4>
            ${services.length
                ? `<ul class="rival-dossier__services">${services.map((service) => `<li><strong>${escapeHtml(service.name)}</strong><span>${escapeHtml(service.program?.name || service.programId)} · ${service.state.toLowerCase()}${service.closed ? ' · closed' : ''} · ${service.visits} visits</span></li>`).join('')}</ul>`
                : '<p class="modal__note">No services yet.</p>'}
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="rival-dossier-done">Back to the Contest</button>
            </div>
        `;
        this.panel.querySelectorAll('[data-testid^=rival-dossier-close], [data-testid=rival-dossier-done]').forEach((button) => button.addEventListener('click', () => this.hide()));
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

function doctrineLine(doctrine) {
    return doctrine === 'wonder'
        ? 'Builds gardens and quiet rooms.'
        : doctrine === 'company'
            ? 'Builds tables, lamps and noise.'
            : 'A chapter with a balanced doctrine.';
}

