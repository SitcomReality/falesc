import { ConfluenceVote } from '../confluence/ConfluenceVote.js';

/**
 * The final public vote. The player makes one pledge to the archipelago, then
 * every active resident votes. The result becomes the charter's ending.
 */
export class ConfluenceScreen {
    constructor(game) {
        this.game = game;
        this.container = document.createElement('div');
        this.container.className = 'screen screen--confluence';
        this.container.dataset.testid = 'confluence-screen';
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
        this.result = null;
    }

    show() {
        const charter = this.game.charter;
        if (!charter?.confluenceReady) {
            this.container.style.display = 'none';
            return;
        }
        this.result = null;
        const standings = [...charter.standings()].sort((a, b) => b.devotion - a.devotion);
        const pledges = ConfluenceVote.pledges;
        const rows = standings.map((chapter) => `
            <li class="confluence-standing${chapter.isPlayer ? ' is-player' : ''}">
                <span class="confluence-standing__dot" style="background:${chapter.colour}"></span>
                <span>${escapeHtml(chapter.name)}${chapter.isPlayer ? ' (you)' : ''}</span>
                <strong>${chapter.devotion.toFixed(1)} ♥</strong>
                <small>${chapter.residents} residents · ${chapter.visits} visits</small>
            </li>
        `).join('');
        const pledgeCards = pledges.map((pledge, index) => `
            <label class="pledge-card${index === 0 ? ' is-selected' : ''}">
                <input type="radio" name="confluence-pledge" value="${pledge.id}" data-testid="pledge-${pledge.id}" ${index === 0 ? 'checked' : ''}>
                <span class="pledge-card__kicker">${escapeHtml(pledge.headline)}</span>
                <strong>${escapeHtml(pledge.name)}</strong>
                <span class="pledge-card__copy">${escapeHtml(pledge.copy)}</span>
            </label>
        `).join('');

        this.container.innerHTML = `
            <div class="confluence__sheet paper">
                <header class="confluence__head">
                    <div>
                        <p class="kicker" style="color:var(--wine)">The Confluence · Day ${charter.day}</p>
                        <h1 class="confluence__title">The archipelago votes.</h1>
                        <p class="confluence__lede">Every resident carries their own heart. Make one pledge to the commons, then call the vote.</p>
                    </div>
                    <div class="confluence__commons">
                        <span class="kicker">Shared flourishing</span>
                        <strong>${Math.round(charter.flourishing)}</strong>
                        <small>${charter.activeResidents.length} voters · survival ${25}</small>
                    </div>
                </header>
                <div class="confluence__columns">
                    <section>
                        <h2>At dusk</h2>
                        <ul class="confluence-standings">${rows}</ul>
                        <p class="confluence__note">Devotion is affection. Votes are trust. A pledge can move the second without erasing the first.</p>
                    </section>
                    <section>
                        <h2>Your pledge</h2>
                        <div class="pledge-grid">${pledgeCards}</div>
                        <button type="button" class="btn btn--primary confluence__vote" data-testid="confluence-vote">
                            Call the vote <span class="btn__arrow" aria-hidden="true">→</span>
                        </button>
                    </section>
                </div>
            </div>
        `;
        this.container.style.display = 'flex';
        this.container.querySelectorAll('input[name=confluence-pledge]').forEach((input) => {
            input.addEventListener('change', () => {
                this.container.querySelectorAll('.pledge-card').forEach((card) => {
                    card.classList.toggle('is-selected', card.querySelector('input').checked);
                });
            });
        });
        this.container.querySelector('[data-testid=confluence-vote]').addEventListener('click', () => this.vote());
        requestAnimationFrame(() => {
            this.container.querySelector('[data-testid=confluence-vote]')?.focus({ preventScroll: true });
        });
    }

    vote() {
        const charter = this.game.charter;
        if (!charter || !charter.confluenceReady) return;
        const pledgeId = this.container.querySelector('input[name=confluence-pledge]:checked')?.value;
        const result = ConfluenceVote.tally(charter, pledgeId);
        this.result = result;
        charter.confluenceReady = false;
        charter.ending = result.ending;
        this.renderResult(result);
    }

    renderResult(result) {
        const counts = result.standings.map((chapter) => `
            <li class="confluence-result__count${chapter.isPlayer ? ' is-player' : ''}">
                <span class="confluence-standing__dot" style="background:${chapter.colour}"></span>
                <span>${escapeHtml(chapter.name)}</span>
                <strong>${chapter.votes}</strong>
                <small>${chapter.devotion.toFixed(1)} ♥</small>
            </li>
        `).join('');
        const votes = [...result.votes].sort((a, b) => a.residentName.localeCompare(b.residentName)).map((vote) => `
            <li class="confluence-vote">
                <strong>${escapeHtml(vote.residentName)}</strong>
                <span>→ ${escapeHtml(vote.chapterName)}</span>
                <small>${escapeHtml(vote.reason)}</small>
            </li>
        `).join('');
        this.container.innerHTML = `
            <div class="confluence__sheet paper confluence__sheet--result" data-testid="confluence-result">
                <header class="confluence__head">
                    <div>
                        <p class="kicker" style="color:var(--wine)">The Confluence · result</p>
                        <h1 class="confluence__title">${escapeHtml(result.ending.title)}</h1>
                        <p class="confluence__lede">${escapeHtml(result.ending.message)}</p>
                    </div>
                    <div class="confluence__commons">
                        <span class="kicker">Pledge</span>
                        <strong>${escapeHtml(result.pledge.name)}</strong>
                        <small>${result.votes.length} votes cast</small>
                    </div>
                </header>
                <div class="confluence__columns">
                    <section>
                        <h2>The vote</h2>
                        <ul class="confluence-result__counts">${counts}</ul>
                        <p class="confluence__note">The commons is a promise, not a prize. Whoever holds it must keep the doors open.</p>
                        <button type="button" class="btn btn--primary" data-testid="confluence-close">
                            Accept the Confluence <span class="btn__arrow" aria-hidden="true">→</span>
                        </button>
                    </section>
                    <section>
                        <h2>How they voted</h2>
                        <ul class="confluence-votes">${votes}</ul>
                    </section>
                </div>
            </div>
        `;
        this.container.querySelector('[data-testid=confluence-close]').addEventListener('click', () => this.game.finishCharter());
        requestAnimationFrame(() => {
            this.container.querySelector('[data-testid=confluence-close]')?.focus({ preventScroll: true });
        });
    }

    hide() {
        this.container.style.display = 'none';
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
