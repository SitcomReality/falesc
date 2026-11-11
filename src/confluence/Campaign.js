import { PLEDGE_BY_ID } from './Pledges.js';

/**
 * The final-days campaign. Rivals publish one promise each; the player chooses
 * one promise of their own. The promises persist to the Confluence vote.
 */
export class Campaign {
    constructor({ startedDay, dayLimit, rivalPledges = {}, playerPledge = null }) {
        this.startedDay = startedDay;
        this.dayLimit = dayLimit;
        this.rivalPledges = { ...rivalPledges };
        this.playerPledge = playerPledge;
    }

    get active() {
        return true;
    }

    get daysLeft() {
        return Math.max(0, this.dayLimit - this.startedDay + 1);
    }

    get playerPledgeName() {
        return PLEDGE_BY_ID[this.playerPledge]?.name || null;
    }

    setPlayerPledge(pledgeId) {
        if (!PLEDGE_BY_ID[pledgeId]) return false;
        this.playerPledge = pledgeId;
        return true;
    }

    pledgeFor(chapterId) {
        return PLEDGE_BY_ID[this.rivalPledges[chapterId]] || null;
    }

    toJSON() {
        return {
            startedDay: this.startedDay,
            dayLimit: this.dayLimit,
            rivalPledges: { ...this.rivalPledges },
            playerPledge: this.playerPledge
        };
    }

    static fromJSON(data) {
        if (!data) return null;
        return new Campaign({
            startedDay: data.startedDay,
            dayLimit: data.dayLimit,
            rivalPledges: data.rivalPledges || {},
            playerPledge: data.playerPledge || null
        });
    }
}
