import { COMMONS_POLICY_BY_ID } from '../commons/CommonsPolicies.js';

/**
 * Live Devotion standings for the Contest preview. Hidden in First Light.
 */
export class StandingsCard {
    constructor({ onToggleFlows = null, onOpenCampaign = null, onOpenCommons = null } = {}) {
        this.onToggleFlows = onToggleFlows;
        this.onOpenCampaign = onOpenCampaign;
        this.onOpenCommons = onOpenCommons;
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
            <button class="standings-card__flows" type="button" data-testid="patronage-toggle" aria-pressed="false">Show flows</button>
            <div class="standings-card__campaign" data-role="campaign" hidden>
                <span class="kicker">Campaign</span>
                <strong data-role="campaign-name">Choose a promise</strong>
                <button type="button" data-testid="campaign-open">Open</button>
                <span class="standings-card__campaign-event" data-role="campaign-event" hidden></span>
            </div>
            <div class="standings-card__commons" data-role="commons" hidden>
                <span class="kicker">The Commons</span>
                <strong data-role="commons-name">Beacon 0 / 20</strong>
                <button type="button" data-testid="commons-open">Give</button>
            </div>
            <ol class="standings-list" data-role="list"></ol>
        `;
        this.listEl = this.element.querySelector('[data-role=list]');
        this.flowButton = this.element.querySelector('[data-testid=patronage-toggle]');
        this.flowButton.addEventListener('click', () => {
            if (this.onToggleFlows) this.onToggleFlows();
        });
        this.campaignRow = this.element.querySelector('[data-role=campaign]');
        this.campaignName = this.element.querySelector('[data-role=campaign-name]');
        this.campaignButton = this.element.querySelector('[data-testid=campaign-open]');
        this.campaignEvent = this.element.querySelector('[data-role=campaign-event]');
        this.campaignButton.addEventListener('click', () => {
            if (this.onOpenCampaign) this.onOpenCampaign();
        });
        this.commonsRow = this.element.querySelector('[data-role=commons]');
        this.commonsName = this.element.querySelector('[data-role=commons-name]');
        this.commonsButton = this.element.querySelector('[data-testid=commons-open]');
        this.commonsButton.addEventListener('click', () => {
            if (this.onOpenCommons) this.onOpenCommons();
        });
    }

    setFlows(visible) {
        this.flowButton.textContent = visible ? 'Hide flows' : 'Show flows';
        this.flowButton.setAttribute('aria-pressed', String(Boolean(visible)));
        this.flowButton.classList.toggle('is-on', Boolean(visible));
    }

    update(chapters = [], visible = false, campaign = null, day = 1, commons = null) {
        this.element.hidden = !visible;
        if (!visible) return;
        const campaignActive = Boolean(campaign?.active);
        this.campaignRow.hidden = !campaignActive;
        this.commonsRow.hidden = !commons;
        if (commons) {
            const stage = commons.assembly?.stage;
            this.commonsName.textContent = commons.active
                ? `Beacon lit${commons.policy
                    ? ` · ${COMMONS_POLICY_BY_ID[commons.policy]?.name || commons.policy}`
                    : stage === 'ballot' ? ' · ballot open' : ' · nominations'}`
                : `Beacon ${commons.fund} / ${commons.target}`;
            this.commonsButton.textContent = commons.active
                ? (commons.policy ? 'View' : stage === 'ballot' ? 'Vote' : 'Assemble')
                : 'Give';
        }
        if (campaignActive) {
            this.campaignName.textContent = campaign.playerPledgeName || 'Choose a promise';
            this.campaignButton.textContent = campaign.playerPledge ? 'View' : 'Open';
            const event = campaign.eventFor?.(day);
            this.campaignEvent.hidden = !event;
            this.campaignEvent.textContent = event ? `Festival: ${event.title}` : '';
        } else {
            this.campaignEvent.hidden = true;
        }
        const ordered = [...chapters].sort((a, b) => b.devotion - a.devotion || b.visits - a.visits);
        const signature = JSON.stringify([
            ordered.map((chapter) => [chapter.id, chapter.devotion, chapter.visits, chapter.residents, chapter.plan?.name || null]),
            campaignActive,
            campaign?.playerPledge || null,
            campaign?.eventFor?.(day)?.title || null,
            commons ? [commons.active, commons.fund, commons.target, commons.policy, commons.assembly?.stage] : null
        ]);
        if (signature === this.signature) return;
        this.signature = signature;
        this.listEl.innerHTML = ordered.map((chapter, index) => `
            <li class="standings-row${chapter.isPlayer ? ' is-player' : ''}">
                <span class="standings-row__rank">${index + 1}</span>
                <span class="standings-row__dot" style="background:${chapter.colour}"></span>
                <span class="standings-row__name">${escapeHtml(chapter.name)}${chapter.isPlayer ? ' (you)' : ''}</span>
                <strong class="standings-row__hearts">${chapter.devotion.toFixed(1)} ♥</strong>
                <span class="standings-row__visits">${chapter.residents} residents · ${chapter.visits} visits${chapter.plan ? ` · ${chapter.plan.saving ? 'saving for' : 'planning'} ${escapeHtml(chapter.plan.name)}` : ''}</span>
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
