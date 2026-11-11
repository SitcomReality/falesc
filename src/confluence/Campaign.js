import { PLEDGE_BY_ID } from './Pledges.js';
import { SeededRandom } from '../map/SeededRandom.js';

/**
 * The final-days campaign. Rivals publish one promise each; the player chooses
 * one. A deterministic three-day festival programme gives each promise a day
 * when its need is in the air, making campaign choices matter in the simulation.
 */
export class Campaign {
    constructor({ startedDay, dayLimit, rivalPledges = {}, playerPledge = null, sponsored = null, events = null, seed = 0 }) {
        this.startedDay = startedDay;
        this.dayLimit = dayLimit;
        this.seed = seed;
        this.rivalPledges = { ...rivalPledges };
        this.playerPledge = playerPledge;
        this.sponsored = sponsored ? { ...sponsored } : null;
        this.events = Array.isArray(events) && events.length
            ? events.map((event) => ({ ...event }))
            : buildEvents(startedDay, dayLimit, seed);
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

    sponsor(need, day) {
        if (!EVENT_COPY[need] || this.sponsored) return null;
        const event = {
            day,
            need,
            session: 'Sponsored bell',
            title: `A bell for ${need}`,
            blurb: 'Your chapter paid for this bell. The need is on the day’s programme.',
            source: 'player'
        };
        this.events.push(event);
        this.sponsored = event;
        return event;
    }

    setPlayerPledge(pledgeId) {
        if (!PLEDGE_BY_ID[pledgeId]) return false;
        this.playerPledge = pledgeId;
        return true;
    }

    pledgeFor(chapterId) {
        if (chapterId === 'player') return PLEDGE_BY_ID[this.playerPledge] || null;
        return PLEDGE_BY_ID[this.rivalPledges[chapterId]] || null;
    }

    eventsFor(day) {
        return this.events.filter((event) => event.day === day);
    }

    eventFor(day) {
        return this.events.find((event) => event.day === day) || null;
    }

    appealFor(chapterId, day) {
        const pledge = this.pledgeFor(chapterId);
        if (!pledge) return 1;
        const matches = this.eventsFor(day).filter((event) => event.need === pledge.need).length;
        return matches === 0 ? 1 : Math.min(1.12, 1 + matches * 0.06);
    }

    momentumFor(chapterId) {
        const pledge = this.pledgeFor(chapterId);
        if (!pledge) return 0;
        return this.events.filter((event) => event.need === pledge.need).length;
    }

    toJSON() {
        return {
            startedDay: this.startedDay,
            dayLimit: this.dayLimit,
            seed: this.seed,
            rivalPledges: { ...this.rivalPledges },
            playerPledge: this.playerPledge,
            sponsored: this.sponsored ? { ...this.sponsored } : null,
            events: this.events.map((event) => ({ ...event }))
        };
    }

    static fromJSON(data, fallbackSeed = 0) {
        if (!data) return null;
        return new Campaign({
            startedDay: data.startedDay,
            dayLimit: data.dayLimit,
            seed: data.seed ?? fallbackSeed,
            rivalPledges: data.rivalPledges || {},
            playerPledge: data.playerPledge || null,
            sponsored: data.sponsored || null,
            events: data.events || null
        });
    }
}

const EVENT_COPY = {
    sustenance: {
        title: 'The Empty Larder',
        blurb: 'A cold week has emptied the kitchens. Hot food is the whole argument.'
    },
    rest: {
        title: 'The Long Night',
        blurb: 'The lamps burn late and everyone is tired. A quiet bed is the whole argument.'
    },
    company: {
        title: 'The Homecoming',
        blurb: 'Cousins and strangers arrive at once. A seat at the table is the whole argument.'
    },
    wonder: {
        title: 'Lanterns in the Void',
        blurb: 'The sky fills with festival lights. Something strange and green is the whole argument.'
    }
};

function buildEvents(startedDay, dayLimit, seed) {
    const days = Math.max(1, dayLimit - startedDay + 1);
    const order = new SeededRandom((seed || 1) + 9173).shuffle(['sustenance', 'rest', 'company', 'wonder']);
    const events = [];
    for (let index = 0; index < Math.min(3, days); index++) {
        const first = order[(index * 2) % order.length];
        const second = order[(index * 2 + 1) % order.length];
        events.push({
            day: startedDay + index,
            need: first,
            session: 'First bell',
            ...EVENT_COPY[first]
        });
        events.push({
            day: startedDay + index,
            need: second,
            session: 'Second bell',
            ...EVENT_COPY[second]
        });
    }
    return events;
}
