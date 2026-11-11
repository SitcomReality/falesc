import { NEEDS } from '../design/needs.js';
import { TEMPERAMENT_BY_ID, STANDARD_BY_ID, RHYTHM_BY_ID } from '../design/traits.js';
import { needIcon } from './icons.js';
import { escapeHtml } from './html.js';

/**
 * The resident card is the player's window into a person: traits, needs, home,
 * devotion, and the last choice with the one-line "why".
 */
export class ResidentCardModal {
    constructor({ onClose, overlays, game }) {
        this.onClose = onClose;
        this.overlays = overlays;
        this.game = game;
        this.isOpen = false;
        this.index = 0;

        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'resident-modal-scrim';

        this.panel = document.createElement('section');
        this.panel.className = 'modal resident-card';
        this.panel.dataset.testid = 'resident-modal';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'resident-name');
        this.panel.innerHTML = `
            <div class="modal__head">
                <div class="resident-card__identity">
                    <span class="resident-card__avatar" data-role="avatar" aria-hidden="true">M</span>
                    <div>
                        <p class="kicker" style="color:var(--wine)">Resident record</p>
                        <h3 class="modal__title" id="resident-name" data-role="name" tabindex="-1">Mira</h3>
                    </div>
                </div>
                <button type="button" class="modal__close" data-testid="resident-close" aria-label="Close resident card">×</button>
            </div>
            <p class="resident-card__traits" data-role="traits"></p>
            <div class="resident-card__body">
                <div class="resident-card__needs" data-role="needs"></div>
                <div class="resident-card__meta" data-role="meta"></div>
            </div>
            <blockquote class="resident-card__why" data-role="why"></blockquote>
            <div class="resident-card__history" data-role="history" data-testid="resident-history"></div>
            <div class="resident-card__nav">
                <button type="button" class="btn btn--small btn--paper" data-testid="resident-prev">← Previous</button>
                <span class="resident-card__count" data-role="count">1 / 6</span>
                <button type="button" class="btn btn--small btn--paper" data-testid="resident-next">Next →</button>
            </div>
        `;

        this.nameEl = this.panel.querySelector('[data-role=name]');
        this.avatarEl = this.panel.querySelector('[data-role=avatar]');
        this.historyEl = this.panel.querySelector('[data-role=history]');
        this.traitsEl = this.panel.querySelector('[data-role=traits]');
        this.needsEl = this.panel.querySelector('[data-role=needs]');
        this.metaEl = this.panel.querySelector('[data-role=meta]');
        this.whyEl = this.panel.querySelector('[data-role=why]');
        this.countEl = this.panel.querySelector('[data-role=count]');

        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
        this.container.addEventListener('pointerdown', (event) => event.stopPropagation());
        this.container.addEventListener('click', (event) => {
            if (event.target === this.container) this.hide();
        });
        this.panel.querySelector('[data-testid=resident-close]').addEventListener('click', () => this.hide());
        this.panel.querySelector('[data-testid=resident-prev]').addEventListener('click', () => this.step(-1));
        this.panel.querySelector('[data-testid=resident-next]').addEventListener('click', () => this.step(1));
        this.container.addEventListener('keydown', (event) => this.onKeyDown(event));
    }

    get residents() {
        return this.game?.charter?.activeResidents || [];
    }

    show(resident, index = 0) {
        if (this.residents.length === 0) return;
        if (!this.isOpen) {
            this.isOpen = true;
            this.container.style.display = 'flex';
            this.container.classList.add('is-open');
            this.overlays.open(this, {
                panel: this.panel,
                initialFocus: () => this.panel.querySelector('[data-testid=resident-close]')
            });
        }
        this.index = Math.max(0, Math.min(this.residents.length - 1, index));
        const target = resident || this.residents[this.index];
        const actualIndex = Math.max(0, this.residents.findIndex((entry) => entry.id === target.id));
        this.index = actualIndex >= 0 ? actualIndex : this.index;
        this.render(this.residents[this.index]);
        requestAnimationFrame(() => {
            if (this.isOpen) this.panel.querySelector('[data-testid=resident-close]')?.focus({ preventScroll: true });
        });
    }

    step(direction) {
        const total = this.residents.length;
        if (total === 0) return;
        this.index = (this.index + direction + total) % total;
        this.render(this.residents[this.index]);
        requestAnimationFrame(() => this.nameEl?.focus?.({ preventScroll: true }));
    }

    render(resident) {
        const charter = this.game.charter;
        this.nameEl.textContent = resident.name;
        this.avatarEl.textContent = resident.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
        this.avatarEl.style.background = this.game.charter.chapterById(resident.favouriteChapterId)?.colour || 'var(--mint)';
        const temperament = TEMPERAMENT_BY_ID[resident.traits.temperament];
        const standard = STANDARD_BY_ID[resident.traits.standards];
        const rhythm = RHYTHM_BY_ID[resident.traits.rhythm];
        this.traitsEl.textContent = `${temperament?.name} · ${standard?.name} · ${rhythm?.name}`;
        this.needsEl.innerHTML = NEEDS.map((need) => {
            const value = Math.round(resident.needs[need.id]);
            const urgent = resident.favouriteNeed?.id === need.id;
            return `
                <div class="need-row${urgent ? ' is-urgent' : ''}">
                    <span class="need-row__icon" aria-hidden="true">${needIcon(need.id)}</span>
                    <span class="need-row__label">${need.name}</span>
                    <span class="need-row__track"><i style="width:${value}%;background:${need.color}"></i></span>
                    <span class="need-row__value">${value}</span>
                </div>
            `;
        }).join('');
        const home = charter.homeFor(resident);
        const homeName = home ? home.name : 'No bed — homeless';
        const favourite = charter.chapterById(resident.favouriteChapterId) || charter.playerChapter;
        const heartLine = charter.chapters.map((chapter) => `${chapter.name} ${resident.getAffinity(chapter.id).toFixed(1)}`).join(' · ');
        this.metaEl.innerHTML = `
            <p><span class="kicker">Home</span><strong>${escapeHtml(homeName)}${Number.isInteger(resident.homeFloor) ? ` · floor ${resident.homeFloor + 1}` : ''}</strong></p>
            <p><span class="kicker">Favourite</span><strong>${escapeHtml(favourite.name)}</strong></p>
            <p><span class="kicker">Devotion</span><strong>${resident.getAffinity('player').toFixed(1)} ♥</strong></p>
            <p><span class="kicker">All hearts</span><strong>${escapeHtml(heartLine)}</strong></p>
            <p><span class="kicker">Wellbeing</span><strong>${Math.round(resident.wellbeing)}</strong></p>
            <p class="resident-card__blurb">${escapeHtml(temperament?.blurb || '')} ${escapeHtml(standard?.blurb || '')} ${escapeHtml(rhythm?.blurb || '')}</p>
        `;
        const last = resident.memory.lastChoice;
        this.whyEl.innerHTML = last
            ? `<span class="kicker">Last choice · Day ${last.day} · ${last.phase}</span><p>“${escapeHtml(last.reason)}”</p>`
            : `<span class="kicker">Last choice</span><p>No choice recorded yet. Open the day and watch where they go.</p>`;
        const visits = (resident.memory.recentVisits || []).slice(-4).reverse();
        this.historyEl.innerHTML = visits.length
            ? `<span class="kicker">Recent visits</span><ol>${visits.map((visit) => `<li><span>Day ${visit.day}</span><strong>${escapeHtml(visit.serviceName || visit.serviceId)}</strong><small>${escapeHtml(visit.phase || '')} · ${escapeHtml(visit.reason || '')}</small></li>`).join('')}</ol>`
            : `<span class="kicker">Recent visits</span><p>No doors yet.</p>`;
        this.countEl.textContent = `${this.index + 1} / ${this.residents.length}`;
    }

    hide() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.container.style.display = 'none';
        this.container.classList.remove('is-open');
        this.overlays.close(this);
        if (this.onClose) this.onClose();
    }

    onKeyDown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            this.hide();
            return;
        }
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            this.step(-1);
            return;
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            this.step(1);
            return;
        }
        if (event.key !== 'Tab') return;
        this.overlays.trapTab(event, this.panel);
    }
}

