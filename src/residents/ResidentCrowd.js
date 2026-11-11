import { Character } from '../Character.js';
import { SeededRandom } from '../map/SeededRandom.js';
import { ResidentAgent } from './ResidentAgent.js';

/**
 * Owns the visible Tidelanders. During planning they idle at their door; during
 * a day playback they walk the precomputed timeline, enter services and emerge.
 */
export class ResidentCrowd {
    constructor({ objectLayer, shadowLayer }) {
        this.objectLayer = objectLayer;
        this.shadowLayer = shadowLayer;
        this.agents = new Map();
        this.charter = null;
    }

    setCharter(charter) {
        this.charter = charter;
    }

    sync() {
        if (!this.charter) return;
        const activeIds = new Set(this.charter.activeResidents.map((resident) => resident.id));
        for (const [id, agent] of this.agents) {
            if (!activeIds.has(id)) {
                agent.destroy();
                this.agents.delete(id);
            }
        }
        for (const resident of this.charter.activeResidents) {
            if (!this.agents.has(resident.id)) this.createAgent(resident);
        }
        this.placeAtHomes();
    }

    createAgent(resident) {
        const character = new Character(0, 0, new SeededRandom(resident.paletteSeed));
        character.residentId = resident.id;
        character.scale = 0.9;
        this.objectLayer.addChild(character.graphics);
        this.shadowLayer.addChild(character.shadow);
        const agent = new ResidentAgent({
            resident,
            character,
            homePoint: { x: 0, y: 0 }
        });
        this.agents.set(resident.id, agent);
        return agent;
    }

    homePointFor(resident, index) {
        const home = this.charter?.services.housingFor(resident);
        const cell = home?.entrance || this.charter?.commonsCell;
        const sector = this.charter?.homeSector;
        if (!cell || !sector) return { x: sector?.centerX || 0, y: sector?.centerY || 0 };
        const point = sector._project(cell.u + 0.5, cell.v + 0.5);
        const angle = (index / Math.max(1, this.agents.size)) * Math.PI * 2;
        return {
            x: point.x + Math.cos(angle) * 18,
            y: point.y + Math.sin(angle) * 8
        };
    }

    placeAtHomes() {
        if (!this.charter) return;
        this.charter.activeResidents.forEach((resident, index) => {
            const agent = this.agents.get(resident.id);
            if (!agent) return;
            const point = this.homePointFor(resident, index);
            agent.setHomePoint(point);
            if (!agent.events.length) {
                agent.character.x = point.x;
                agent.character.y = point.y;
                agent.setHidden(false);
            }
        });
    }

    preparePlayback(events) {
        if (!this.charter) return;
        const byResident = new Map();
        for (const event of events) {
            if (!byResident.has(event.residentId)) byResident.set(event.residentId, []);
            byResident.get(event.residentId).push(event);
        }
        this.placeAtHomes();
        for (const resident of this.charter.activeResidents) {
            const agent = this.agents.get(resident.id);
            if (!agent) continue;
            agent.setHidden(false);
            agent.setEvents(byResident.get(resident.id) || []);
            agent.character.x = agent.homePoint.x;
            agent.character.y = agent.homePoint.y;
        }
    }

    updatePlayback(clock, dt) {
        for (const agent of this.agents.values()) {
            agent.updatePlayback(clock);
            agent.character.update(dt);
            agent.character.graphics.zIndex = agent.hidden ? -1000000 : agent.character.y;
        }
    }

    updateAmbient(dt) {
        for (const agent of this.agents.values()) {
            agent.updateAmbient(dt);
            agent.character.update(dt);
            agent.character.graphics.zIndex = agent.character.y;
        }
    }

    resetToPlanningPositions() {
        for (const agent of this.agents.values()) {
            agent.setEvents([]);
            agent.setHidden(false);
            agent.character.x = agent.homePoint.x;
            agent.character.y = agent.homePoint.y;
            agent.character.state = 'IDLE';
        }
        this.placeAtHomes();
    }

    nearestResident(x, y, maxDistance = 72) {
        let best = null;
        for (const [id, agent] of this.agents) {
            if (agent.hidden) continue;
            const distance = Math.hypot(agent.character.x - x, agent.character.y - y);
            if (distance <= maxDistance && (!best || distance < best.distance)) {
                best = { id, distance, resident: agent.resident };
            }
        }
        return best;
    }

    getAgent(residentId) {
        return this.agents.get(residentId) || null;
    }

    clear() {
        for (const agent of this.agents.values()) agent.destroy();
        this.agents.clear();
    }
}
