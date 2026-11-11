import { NEEDS, clampNeed, wellbeingFromNeeds, mostUrgentNeed } from '../design/needs.js';
import { describeTraits } from '../design/traits.js';

/**
 * A Tidelander. Plain model data plus a small set of derived values; the visual
 * agent owns the Character instance so the model stays save-friendly.
 */
export class Resident {
    constructor({
        id,
        name,
        traits,
        needs,
        active = true,
        homeServiceId = null,
        affinity = 0.8,
        memory = null,
        paletteSeed = 1
    }) {
        this.id = id;
        this.name = name;
        this.traits = { ...traits };
        this.needs = {};
        for (const need of NEEDS) {
            this.needs[need.id] = clampNeed(needs?.[need.id] ?? 25);
        }
        this.active = active;
        this.homeServiceId = homeServiceId;
        this.affinity = { player: affinity };
        this.memory = {
            lastChoice: null,
            recentVisits: [],
            complaints: 0,
            unmetDays: {},
            ...(memory || {})
        };
        this.paletteSeed = paletteSeed;
        this.state = active ? 'idle' : 'waiting';
        this.position = null;
    }

    get wellbeing() {
        return wellbeingFromNeeds(this.needs);
    }

    get favouriteNeed() {
        return mostUrgentNeed(this.needs);
    }

    get traitSummary() {
        return describeTraits(this.traits);
    }

    get isHomeless() {
        return !this.homeServiceId;
    }

    adjustNeed(needId, amount) {
        if (!(needId in this.needs)) return this.needs[needId] ?? 0;
        this.needs[needId] = clampNeed(this.needs[needId] + amount);
        return this.needs[needId];
    }

    setNeed(needId, value) {
        if (!(needId in this.needs)) return;
        this.needs[needId] = clampNeed(value);
    }

    recordChoice(choice) {
        this.memory.lastChoice = choice;
        if (choice?.serviceId) {
            this.memory.recentVisits = [
                ...(this.memory.recentVisits || []),
                {
                    day: choice.day,
                    phase: choice.phase,
                    serviceId: choice.serviceId,
                    serviceName: choice.serviceName,
                    needId: choice.needId,
                    reason: choice.reason
                }
            ].slice(-8);
        }
    }

    recordComplaint(needId, day, text) {
        this.memory.complaints = (this.memory.complaints || 0) + 1;
        this.memory.lastComplaint = { day, needId, text };
    }

    /** Called once at dusk so "days unmet" means days, not phases. */
    updateUnmetDays(unmetNeeds = []) {
        this.memory.unmetDays = this.memory.unmetDays || {};
        for (const need of NEEDS) {
            const unmet = unmetNeeds.includes(need.id);
            this.memory.unmetDays[need.id] = unmet
                ? (this.memory.unmetDays[need.id] || 0) + 1
                : 0;
        }
    }

    clearUnmetDay(needId) {
        if (this.memory.unmetDays) this.memory.unmetDays[needId] = 0;
    }

    addAffinity(amount) {
        const next = Math.max(0, Math.min(5, (this.affinity.player || 0) + amount));
        this.affinity.player = Math.round(next * 100) / 100;
        return this.affinity.player;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            traits: { ...this.traits },
            needs: { ...this.needs },
            active: this.active,
            homeServiceId: this.homeServiceId,
            affinity: { ...this.affinity },
            memory: JSON.parse(JSON.stringify(this.memory)),
            paletteSeed: this.paletteSeed
        };
    }

    static fromJSON(data) {
        return new Resident(data);
    }
}
