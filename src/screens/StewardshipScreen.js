import { STEWARDSHIP_POLICIES } from '../confluence/Stewardship.js';
import { PLEDGE_BY_ID } from '../confluence/Pledges.js';
import { escapeHtml } from '../ui/escapeHtml.js';

/**
 * The winning chapter chooses how to govern the commons. This is the epilogue
 * decision; it does not re-open the resolved day.
 */
export class StewardshipScreen {
    constructor(game) {
        this.game = game;
        this.container = document.createElement('div');
        this.container.className = 'screen screen--stewardship';
        this.container.dataset.testid = 'stewardship-screen';
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
    }

    show() {
        const charter = this.game.charter;
        const ending = charter?.ending;
        if (!charter || ending?.outcome !== 'victory') {
            this.container.style.display = 'none';
            return;
        }
        const voteRows = (ending.confluence?.votes || [])
            .map((entry) => `<li><span>${escapeHtml(entry.chapterName)}</span><strong>${entry.votes}</strong></li>`)
            .join('');
        const cards = STEWARDSHIP_POLICIES.map((policy, index) => `
            <label class="stewardship-card${index === 0 ? ' is-selected' : ''}">
                <input type="radio" name="stewardship" value="${policy.id}" data-testid="stewardship-${policy.id}" ${index === 0 ? 'checked' : ''}>
                <span class="stewardship-card__kicker">${escapeHtml(policy.headline)}</span>
                <strong>${escapeHtml(policy.name)}</strong>
                <span class="stewardship-card__copy">${escapeHtml(policy.copy)}</span>
            </label>
        `).join('');

        this.container.innerHTML = `
            <div class="stewardship__sheet paper">
                <header class="stewardship__head">
                    <div>
                        <p class="kicker" style="color:var(--wine)">The Confluence · stewardship</p>
                        <h1 class="stewardship__title">The commons is yours to keep.</h1>
                        <p class="stewardship__lede">The vote is counted. Now choose what the winning charter promises the archipelago.</p>
                    </div>
                    <div class="stewardship__score">
                        <span class="kicker">The vote</span>
                        <ul>${voteRows}</ul>
                        <small>${escapeHtml(PLEDGE_BY_ID[ending.confluence?.pledge]?.name || 'No pledge')} · ${Math.round(charter.flourishing)} flourishing</small>
                    </div>
                </header>
                <h2 class="stewardship__label">Your stewardship</h2>
                <div class="stewardship-grid">${cards}</div>
                <footer class="stewardship__foot">
                    <p class="stewardship__note">The stewardship changes the record, not the day's result. Choose the promise you can keep.</p>
                    <button type="button" class="btn btn--primary" data-testid="stewardship-confirm">
                        Take stewardship <span class="btn__arrow" aria-hidden="true">→</span>
                    </button>
                </footer>
            </div>
        `;
        this.container.querySelectorAll('input[name=stewardship]').forEach((input) => {
            input.addEventListener('change', () => {
                this.container.querySelectorAll('.stewardship-card').forEach((card) => {
                    card.classList.toggle('is-selected', card.querySelector('input').checked);
                });
            });
        });
        this.container.querySelector('[data-testid=stewardship-confirm]').addEventListener('click', () => {
            const policyId = this.container.querySelector('input[name=stewardship]:checked')?.value;
            if (policyId) this.game.chooseStewardship(policyId);
        });
        this.container.style.display = 'flex';
        requestAnimationFrame(() => {
            (this.container.querySelector('input[name=stewardship]:not(:disabled)') || this.container.querySelector('[data-testid=stewardship-confirm]'))?.focus({ preventScroll: true });
        });
    }

    hide() {
        this.container.style.display = 'none';
    }
}

