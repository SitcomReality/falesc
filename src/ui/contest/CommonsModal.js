import { BALANCE } from '../../design/balance.js';
import { COMMONS_POLICIES, COMMONS_POLICY_BY_ID, commonsComfortFor } from '../../commons/CommonsPolicies.js';
import { escapeHtml } from '../chrome/escapeHtml.js';

/**
 * Shared Commons Beacon fund. Every chapter can put lumen into the same civic
 * project; when it is funded, the tower becomes a passive shared comfort for
 * every resident, not a private service.
 */
export class CommonsModal {
    constructor({ onContribute, onPurse, onCapital, onNominate, onVote, onSecondReading, onAnnex, overlays }) {
        this.onContribute = onContribute;
        this.onPurse = onPurse;
        this.onCapital = onCapital;
        this.onNominate = onNominate;
        this.onVote = onVote;
        this.onSecondReading = onSecondReading;
        this.onAnnex = onAnnex;
        this.overlays = overlays;
        this.isOpen = false;
        this.charter = null;

        this.container = document.createElement('div');
        this.container.className = 'modal-scrim';
        this.container.dataset.testid = 'commons-modal-scrim';

        this.panel = document.createElement('section');
        this.panel.className = 'modal commons-modal';
        this.panel.dataset.testid = 'commons-modal';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', 'commons-title');

        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';

        this.container.addEventListener('pointerdown', (event) => event.stopPropagation());
        this.container.addEventListener('click', (event) => {
            if (event.target === this.container) this.hide();
        });
        this.container.addEventListener('keydown', (event) => this.onKeyDown(event));
    }

    show(charter) {
        this.charter = charter;
        this.render();
        this.isOpen = true;
        this.container.style.display = 'flex';
        this.container.classList.add('is-open');
        this.container.setAttribute('aria-hidden', 'false');
        this.overlays.open(this, {
            panel: this.panel,
            initialFocus: () => this.panel.querySelector('[data-testid=commons-give-5]') || this.panel.querySelector('[data-testid=commons-close]')
        });
    }

    render() {
        const commons = this.charter.commons;
        if (!commons) return;
        const player = this.charter.player;
        const sharedWorks = (this.charter.commonsManager?.services || [])
            .filter((service) => service.chapterId === 'commons' && service.id !== commons.serviceId && service.state === 'ACTIVE').length;
        const purse = commons.purse || 0;
        const capital = commons.capital || 0;
        const upkeep = this.charter.sharedUpkeepTotal(true);
        const contributors = Object.entries(commons.contributors || {})
            .filter(([, value]) => value > 0)
            .map(([id, value]) => {
                const chapter = this.charter.chapterById(id);
                return `<li><span>${escapeHtml(chapter?.name || id)}</span><strong>${value}</strong></li>`;
            }).join('');
        if (commons.active) {
            const service = this.charter.commonsManager?.findById(this.charter.commons.serviceId);
            const visits = service?.visits || 0;
            const policy = COMMONS_POLICY_BY_ID[commons.policy];
            const assembly = commons.assembly || { stage: 'nominations', nominations: {}, finalists: [] };
            const inSecondReading = Boolean(policy && assembly.stage !== 'resolved');
            const stage = inSecondReading ? assembly.stage : policy ? 'resolved' : assembly.stage;
            const petitionPolicy = COMMONS_POLICY_BY_ID[assembly.petition?.policyId];
            const petitionNote = petitionPolicy && stage === 'nominations'
                ? `<p class="commons-petition">Residents' petition: <strong>${escapeHtml(petitionPolicy.name)}</strong> · ${assembly.petition.signatures} signatures. It will join the ballot.</p>`
                : '';
            const voteTally = policy && assembly.counts && stage === 'resolved'
                ? `<h4 class="campaign-modal__label">The vote</h4><ul class="commons-contributors">${Object.entries(assembly.counts).map(([policyId, count]) => `<li><span>${escapeHtml(COMMONS_POLICY_BY_ID[policyId]?.name || policyId)}</span><strong>${count}</strong></li>`).join('')}</ul>`
                : '';
            const ballotHtml = `<p class="commons-assembly-copy">Nominations are in. Every resident now chooses among the finalist policies.</p>
                <ul class="commons-finalists">${assembly.finalists.map((policyId) => {
                    const entry = COMMONS_POLICY_BY_ID[policyId];
                    if (!entry) return '';
                    const backers = Object.entries(assembly.nominations || {})
                        .filter(([, nominated]) => nominated === policyId)
                        .map(([chapterId]) => this.charter.chapterById(chapterId)?.name || chapterId);
                    if (assembly.petition?.policyId === policyId) backers.push(`Residents' petition (${assembly.petition.signatures})`);
                    return `<li><span class="kicker">${escapeHtml(backers.join(' · ') || 'The commons')}</span><strong>${escapeHtml(entry.name)}</strong><span>${escapeHtml(entry.detail)}</span></li>`;
                }).join('')}</ul>
                <div class="modal__actions"><button type="button" class="btn btn--primary" data-testid="commons-call-vote">Call the vote</button></div>`;
            const nominationsHtml = `<p class="commons-assembly-copy">${inSecondReading ? 'The first reading still stands while the commons considers an amendment. Each chapter nominates one alternative; residents sign a petition; the residents then choose.' : 'The Beacon is lit. Each chapter nominates one shared policy; residents are also signing a petition. The residents then choose among the finalists.'}</p>
                ${petitionNote}
                <div class="commons-policies">${COMMONS_POLICIES.map((entry) => `
                    <button type="button" class="commons-policy" data-testid="commons-policy-${entry.id}" data-policy="${entry.id}">
                        <span class="kicker">${escapeHtml(entry.kicker)}</span>
                        <strong>${escapeHtml(entry.name)}</strong>
                        <span>${escapeHtml(entry.detail)}</span>
                        <span class="commons-policy__action">Nominate →</span>
                    </button>
                `).join('')}</div>`;
            const canSecondReading = policy && !inSecondReading && (assembly.reading || 1) < 2 && this.charter.day > (commons.chosenDay || this.charter.day);
            const secondReadingButton = canSecondReading
                ? `<div class="modal__actions"><button type="button" class="btn btn--paper" data-testid="commons-second-reading">Call a second reading</button></div>`
                : '';
            const assemblyHtml = inSecondReading
                ? (stage === 'ballot' ? ballotHtml : nominationsHtml)
                : policy
                    ? `<div class="commons-policy-chosen"><p class="kicker">Assembly policy</p><strong>${escapeHtml(policy.name)}</strong><span>${escapeHtml(policy.detail)}</span></div>${voteTally}${secondReadingButton}`
                    : (stage === 'ballot' ? ballotHtml : nominationsHtml);
            this.panel.innerHTML = `
                <div class="modal__head">
                    <div>
                        <p class="kicker" style="color:var(--wine)">The Commons · shared project</p>
                        <h3 class="modal__title" id="commons-title">${inSecondReading ? 'The second reading.' : policy ? 'The assembly has spoken.' : stage === 'ballot' ? 'The ballot is open.' : 'The Beacon is lit.'}</h3>
                    </div>
                    <button type="button" class="modal__close" data-testid="commons-close-x" aria-label="Close commons">×</button>
                </div>
                <p class="modal__blurb">The fund is full. The Beacon is a shared place for every resident: it eases every need by ${commonsComfortFor(this.charter)} each night${policy?.restRecovery ? ' and gives one more Rest back in bed' : ''}, and its door is open for ${visits} visits so far. ${sharedWorks} shared work${sharedWorks === 1 ? '' : 's'} stand on the outer commons isle.</p>
                <p class="commons-purse">Commons purse <strong>${purse}</strong> lumen · shared upkeep <strong>${upkeep}</strong> / day · capital budget <strong>${capital}</strong>. Every chapter gives ${BALANCE.commons.levyPerChapter} when shared works stand.</p>
                ${(commons.level || 1) < BALANCE.commons.annexMax ? `<button type="button" class="btn btn--mint" data-testid="commons-annex" ${capital >= BALANCE.commons.annexCost ? '' : 'disabled'}>Add an annex · ${BALANCE.commons.annexCost} capital</button>` : ''}
                ${assemblyHtml}
                <h4 class="campaign-modal__label">Given so far</h4>
                <ul class="commons-contributors">${contributors || '<li><span>The commons</span><strong>—</strong></li>'}</ul>
                <div class="modal__actions">
                    <button type="button" class="btn btn--paper" data-testid="commons-purse-5" ${player.lumen >= 5 ? '' : 'disabled'}>Give 5 to the purse</button>
                    <button type="button" class="btn btn--paper" data-testid="commons-purse-10" ${player.lumen >= 10 ? '' : 'disabled'}>Give 10 to the purse</button>
                    <button type="button" class="btn btn--paper" data-testid="commons-capital-5" ${player.lumen >= 5 ? '' : 'disabled'}>Give 5 to capital</button>
                    <button type="button" class="btn btn--paper" data-testid="commons-capital-10" ${player.lumen >= 10 ? '' : 'disabled'}>Give 10 to capital</button>
                    <button type="button" class="btn btn--primary" data-testid="commons-close">Close</button>
                </div>
            `;
        } else {
            const player = this.charter.player;
            const canGive5 = player.lumen >= 5;
            const canGive10 = player.lumen >= 10;
            this.panel.innerHTML = `
                <div class="modal__head">
                    <div>
                        <p class="kicker" style="color:var(--wine)">The Commons · shared project</p>
                        <h3 class="modal__title" id="commons-title">Raise the Commons Beacon.</h3>
                    </div>
                    <button type="button" class="modal__close" data-testid="commons-close-x" aria-label="Close commons">×</button>
                </div>
                <p class="modal__blurb">A shared tower of prism glass, funded by every chapter. When it is lit, every resident sleeps a little easier: each night it eases every need. ${sharedWorks} shared work${sharedWorks === 1 ? '' : 's'} already stand on the outer commons isle.</p>
                <p class="commons-purse">Commons purse <strong>${purse}</strong> lumen · shared upkeep <strong>${upkeep}</strong> / day · capital budget <strong>${capital}</strong>. Every chapter gives ${BALANCE.commons.levyPerChapter} when shared works stand.</p>
                <div class="commons-progress">
                    <div class="commons-progress__track"><i style="width:${Math.min(100, Math.round(commons.fund / commons.target * 100))}%"></i></div>
                    <strong>${commons.fund} / ${commons.target} lumen</strong>
                </div>
                <h4 class="campaign-modal__label">Given so far</h4>
                <ul class="commons-contributors">${contributors || '<li><span>Nobody yet</span><strong>0</strong></li>'}</ul>
                <p class="modal__note">The whole archipelago shares the Beacon. Rivals give a little each day when they can.</p>
                <div class="modal__actions">
                    <button type="button" class="btn btn--paper" data-testid="commons-give-5" ${canGive5 ? '' : 'disabled'}>Give 5 to the Beacon</button>
                    <button type="button" class="btn btn--primary" data-testid="commons-give-10" ${canGive10 ? '' : 'disabled'}>Give 10 to the Beacon</button>
                </div>
                <div class="modal__actions">
                    <button type="button" class="btn btn--paper" data-testid="commons-purse-5" ${canGive5 ? '' : 'disabled'}>Give 5 to the purse</button>
                    <button type="button" class="btn btn--paper" data-testid="commons-purse-10" ${canGive10 ? '' : 'disabled'}>Give 10 to the purse</button>
                </div>
                <div class="modal__actions">
                    <button type="button" class="btn btn--paper" data-testid="commons-capital-5" ${canGive5 ? '' : 'disabled'}>Give 5 to capital</button>
                    <button type="button" class="btn btn--paper" data-testid="commons-capital-10" ${canGive10 ? '' : 'disabled'}>Give 10 to capital</button>
                </div>
            `;
        }
        this.panel.querySelector('[data-testid=commons-annex]')?.addEventListener('click', () => this.annex());
        this.panel.querySelectorAll('[data-testid^=commons-close]').forEach((button) => button.addEventListener('click', () => this.hide()));
        this.panel.querySelector('[data-testid=commons-give-5]')?.addEventListener('click', () => this.give(5));
        this.panel.querySelector('[data-testid=commons-give-10]')?.addEventListener('click', () => this.give(10));
        this.panel.querySelector('[data-testid=commons-purse-5]')?.addEventListener('click', () => this.givePurse(5));
        this.panel.querySelector('[data-testid=commons-purse-10]')?.addEventListener('click', () => this.givePurse(10));
        this.panel.querySelector('[data-testid=commons-capital-5]')?.addEventListener('click', () => this.giveCapital(5));
        this.panel.querySelector('[data-testid=commons-capital-10]')?.addEventListener('click', () => this.giveCapital(10));
        this.panel.querySelector('[data-testid=commons-second-reading]')?.addEventListener('click', () => this.callSecondReading());
        this.panel.querySelectorAll('[data-testid^=commons-policy-]').forEach((button) => {
            button.addEventListener('click', () => this.nominate(button.dataset.policy));
        });
        this.panel.querySelector('[data-testid=commons-call-vote]')?.addEventListener('click', () => this.vote());
    }

    callSecondReading() {
        const result = this.onSecondReading();
        if (!result?.ok) return;
        this.render();
    }

    giveCapital(amount) {
        const result = this.onCapital(amount);
        if (!result?.ok) return;
        this.render();
    }

    givePurse(amount) {
        const result = this.onPurse(amount);
        if (!result?.ok) return;
        this.render();
    }

    give(amount) {
        const result = this.onContribute(amount);
        if (!result?.ok) return;
        this.render();
        requestAnimationFrame(() => {
            this.panel.querySelector('[data-testid=commons-close]')?.focus({ preventScroll: true });
        });
    }

    nominate(policyId) {
        const result = this.onNominate?.(policyId);
        if (!result?.ok) return;
        this.render();
        requestAnimationFrame(() => this.panel.querySelector('[data-testid=commons-call-vote]')?.focus({ preventScroll: true }));
    }

    vote() {
        const result = this.onVote?.();
        if (!result?.ok) return;
        this.render();
        requestAnimationFrame(() => this.panel.querySelector('[data-testid=commons-close]')?.focus({ preventScroll: true }));
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

    annex() {
        const result = this.onAnnex?.();
        if (result?.ok) this.render();
        return result;
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

