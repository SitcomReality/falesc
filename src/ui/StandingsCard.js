/**
 * Live Devotion standings for the Contest preview. Hidden in First Light.
 */
export class StandingsCard {
    constructor() {
        this.signature = null;
        this.element = document.createElement('aside');
        this.element.className = 'standings-card';
        this.element.dataset.testid = 'standings-card';
        this.element.hidden = true;
        this.element.innerHTML = `
            <div class="standings-card__head">
                <span class="kicker">Devotion</span>
                <span class="standings-card__goal">most love by the last day</span>
            </div>
            <h3 class="standings-card__title">The Contest</h3>
            <ol class="standings-list" data-role="list"></ol>
        `;
        this.listEl = this.element.querySelector('[data-role=list]');
    }

    update(chapters = [], visible = false) {
        this.element.hidden = !visible;
        if (!visible) return;
        const ordered = [...chapters].sort((a, b) => b.devotion - a.devotion || b.visits - a.visits);
        const signature = JSON.stringify(ordered.map((chapter) => [chapter.id, chapter.devotion, chapter.visits, chapter.residents]));
        if (signature === this.signature) return;
        this.signature = signature;
        this.listEl.innerHTML = ordered.map((chapter, index) => `
            <li class="standings-row${chapter.isPlayer ? ' is-player' : ''}">
                <span class="standings-row__rank">${index + 1}</span>
                <span class="standings-row__dot" style="background:${chapter.colour}"></span>
                <span class="standings-row__name">${escapeHtml(chapter.name)}${chapter.isPlayer ? ' (you)' : ''}</span>
                <strong class="standings-row__hearts">${chapter.devotion.toFixed(1)} ♥</strong>
                <span class="standings-row__visits">${chapter.residents} residents · ${chapter.visits} visits</span>
            </li>
        `).join('');
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
