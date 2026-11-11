import { NEEDS } from '../design/needs.js';
import { PROGRAMS } from '../design/programs.js';
import { SERVICE_HOURS } from '../services/ServicePolicies.js';
import { SERVICE_VIBES } from '../services/ServiceVibes.js';
import { SERVICE_ACCESS } from '../services/ServiceAccess.js';
import { FLOOR_PLANS } from '../services/FloorPlans.js';
import { escapeHtml } from './escapeHtml.js';

/**
 * The paper almanac. A read-only reference for every system that is easy to
 * forget between charters; no rules live here.
 */
export class FieldGuideModal {
    constructor({ overlays }) {
        this.overlays = overlays;
        this.isOpen = false;
        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'field-guide-scrim';
        this.panel = document.createElement('section');
        this.panel.className = 'modal field-guide';
        this.panel.dataset.testid = 'field-guide';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'field-guide-title');
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
            initialFocus: () => this.panel.querySelector('[data-testid=field-guide-close]')
        });
    }

    render() {
        const programs = PROGRAMS.filter((program) => program.buildable);
        this.panel.innerHTML = `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">The Tidelander almanac</p>
                    <h3 class="modal__title" id="field-guide-title">How a charter works</h3>
                </div>
                <button type="button" class="modal__close" data-testid="field-guide-close" aria-label="Close field guide">×</button>
            </div>
            <p class="modal__blurb">Plan in daylight, open the day, watch it play, then read the report. Nothing here is a rule the game does not already use.</p>
            <div class="field-guide__body">
                <section>
                    <h4>The five needs</h4>
                    ${NEEDS.map((need) => `<p><strong>${escapeHtml(need.name)}.</strong> ${escapeHtml(need.blurb)}</p>`).join('')}
                </section>
                <section>
                    <h4>The day</h4>
                    <p>Place services, set works and make promises in <strong>planning</strong>. <strong>Open the day</strong> precomputes visits, queues and the ledger. Playback is only a view of that finished day, at 1×, 2×, 4× or Skip. The <strong>report</strong> shows who came, what was missed and what the night cost.</p>
                </section>
                <section>
                    <h4>Services</h4>
                    ${programs.map((program) => `<p><strong>${escapeHtml(program.name)}</strong> · ${escapeHtml(program.category)} · ${program.footprint.w}×${program.footprint.h} · ${program.capacity} seats · ${program.cost} lumen / ${program.upkeep} upkeep.</p>`).join('')}
                </section>
                <section>
                    <h4>Rooms and hours</h4>
                    <p><strong>Hours:</strong> ${SERVICE_HOURS.map((entry) => escapeHtml(entry.name)).join(', ')}.</p>
                    <p><strong>Atmosphere:</strong> ${SERVICE_VIBES.map((entry) => escapeHtml(entry.name)).join(', ')}. Matches a resident temperament.</p>
                    <p><strong>Welcome:</strong> ${SERVICE_ACCESS.map((entry) => escapeHtml(entry.name)).join(', ')}. A fit trade-off, never a locked door.</p>
                    <p><strong>Upper floors:</strong> ${FLOOR_PLANS.map((entry) => escapeHtml(entry.name)).join(', ')}. Two extra floors at most.</p>
                </section>
                <section>
                    <h4>The commons</h4>
                    <p>In the Contest, the shared <strong>Commons Beacon</strong> costs 20 lumen from every chapter. Once lit it seats six for every need. The Commons Assembly can pass one policy after a petition, nominations and a ballot; one second reading can amend it after a full day.</p>
                </section>
                <section>
                    <h4>Care and repair</h4>
                    <p>One resident asks for one need each planning day; meeting it earns affinity. The objective card flags residents in crisis. Working services wear with visits; a repair costs 3 lumen. Charmed visitors may return or recommend a friend.</p>
                </section>
                <section>
                    <h4>Display</h4>
                    <p>The pause menu offers <strong>Motion</strong> and <strong>Contrast</strong>; both persist and follow your operating-system preference on a first visit.</p>
                </section>
                <section>
                    <h4>The Contest</h4>
                    <p>Three chapters share one roster. Residents choose doors by fit, distance and queue. The last three days are a <strong>festival</strong> with two bells per day; the player can sponsor one extra bell for 5 lumen. At the day limit the Confluence votes on the promises and care record. Visitors arrive each day, pay for visits and may return or be invited to a trial stay.</p>
                </section>
                <section>
                    <h4>Controls</h4>
                    <p><strong>WASD / arrows</strong> pan · <strong>wheel</strong> zoom · <strong>1–9</strong> select a service · <strong>C</strong> build cursor · <strong>arrows</strong> move it · <strong>G</strong> switch isle · <strong>Enter</strong> open the build dialog · <strong>E</strong> open the day · <strong>B</strong> bulletin · <strong>R</strong> residents · <strong>P</strong> patronage · <strong>Esc</strong> pause.</p>
                </section>
            </div>
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="field-guide-done">Back to the shard</button>
            </div>
        `;
        this.panel.querySelectorAll('[data-testid^=field-guide-close], [data-testid=field-guide-done]').forEach((button) => button.addEventListener('click', () => this.hide()));
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

