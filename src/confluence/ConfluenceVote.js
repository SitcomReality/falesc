import { BALANCE } from '../design/balance.js';
import { SeededRandom } from '../map/SeededRandom.js';
import { PLEDGES, PLEDGE_BY_ID } from './Pledges.js';

/**
 * The public vote. Each resident votes for the chapter they trust most, with a
 * small deterministic tie-break and a bonus for the player's one festival
 * pledge when it speaks to that resident's most urgent need.
 */
export class ConfluenceVote {
    static get pledges() {
        return PLEDGES;
    }

    static tally(charter, pledgeId) {
        const pledge = PLEDGE_BY_ID[pledgeId] || PLEDGES[0];
        const campaign = charter.campaign?.active ? charter.campaign : null;
        const counts = charter.chapters.map((chapter) => ({ chapterId: chapter.id, chapterName: chapter.name, votes: 0 }));
        const votes = [];

        for (const resident of charter.activeResidents) {
            const need = resident.favouriteNeed;
            const scores = charter.chapters.map((chapter) => {
                const rng = new SeededRandom(
                    charter.seed
                    + hashString(resident.id) * 131
                    + hashString(chapter.id) * 17
                    + 4096
                );
                let score = resident.getAffinity(chapter.id);
                if (resident.homeChapterId === chapter.id) score += 0.6;
                if (resident.memory.lastChoice?.chapterId === chapter.id) score += 0.35;
                if (chapter.isPlayer && need?.id === pledge.need) score += 1.45;
                const rivalPledge = campaign?.rivalPledges?.[chapter.id];
                if (!chapter.isPlayer && rivalPledge && PLEDGE_BY_ID[rivalPledge]?.need === need?.id) score += 0.75;
                score += (campaign?.momentumFor?.(chapter.id) || 0) * 0.12;
                score += rng.next() * 0.45;
                return { chapter, score };
            });
            scores.sort((a, b) => b.score - a.score);
            const winner = scores[0].chapter;
            const count = counts.find((entry) => entry.chapterId === winner.id);
            if (count) count.votes += 1;
            votes.push({
                residentId: resident.id,
                residentName: resident.name,
                chapterId: winner.id,
                chapterName: winner.name,
                needId: need?.id || null,
                needName: need?.name || 'the commons',
                reason: reasonFor(resident, winner, pledge, need)
            });
        }

        const standings = charter.chapters.map((chapter) => ({
            id: chapter.id,
            name: chapter.name,
            colour: chapter.colour,
            isPlayer: Boolean(chapter.isPlayer),
            votes: counts.find((entry) => entry.chapterId === chapter.id)?.votes || 0,
            devotion: charter.devotionByChapter[chapter.id] || 0
        })).sort((a, b) => b.votes - a.votes || b.devotion - a.devotion);
        const winner = standings[0] || null;
        const tied = winner ? standings.filter((entry) => entry.votes === winner.votes).length > 1 : false;
        const survival = charter.flourishing >= BALANCE.end.sharedSurvival;
        let outcome = 'defeat';
        let title = 'No one wins the Confluence.';
        let message = `Shared flourishing is ${charter.flourishing}, below the ${BALANCE.end.sharedSurvival} survival line. The evacuation ships take everyone.`;

        if (survival && winner?.isPlayer) {
            outcome = 'victory';
            title = 'The Confluence chooses you.';
            message = tied
                ? `You tied on ${winner.votes} votes and took the Confluence on Devotion (${winner.devotion.toFixed(1)}). The archipelago asks your chapter to keep the commons.`
                : `You won ${winner.votes} of ${votes.length} votes. The archipelago asks your chapter to keep the commons.`;
        } else if (survival) {
            title = `${winner?.name || 'Another chapter'} takes the Confluence.`;
            message = tied
                ? `${winner?.name || 'Another chapter'} tied on ${winner?.votes || 0} votes and took the Confluence on Devotion. Your chapter keeps its own lamps, but not the commons.`
                : `${winner?.name || 'Another chapter'} won ${winner?.votes || 0} votes to your ${counts.find((entry) => entry.chapterId === 'player')?.votes || 0}. Your chapter keeps its own lamps, but not the commons.`;
        }

        const ending = {
            outcome,
            day: charter.day,
            title,
            message,
            confluence: {
                pledge: pledge.id,
                votes: counts.map((entry) => ({ ...entry })),
                winnerId: winner?.id || null
            }
        };
        return { pledge, votes, counts, standings, winner, tied, outcome, ending };
    }
}

function reasonFor(resident, winner, pledge, need) {
    if (winner.isPlayer && need?.id === pledge.need) {
        return `You pledged ${pledge.name.toLowerCase()} — that is what I need.`;
    }
    if (resident.memory.lastChoice?.chapterId === winner.id) {
        return `${winner.name} was the last door that made the day easier.`;
    }
    return `${winner.name} listened when ${need?.name?.toLowerCase() || 'the day'} was loudest.`;
}

function hashString(value) {
    let hash = 0;
    for (let index = 0; index < String(value).length; index++) {
        hash = (hash * 31 + String(value).charCodeAt(index)) % 2147483647;
    }
    return hash;
}
