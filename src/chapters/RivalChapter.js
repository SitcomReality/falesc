import { ServiceManager } from '../services/ServiceManager.js';

/**
 * A rival administrator's chapter. In the Contest preview it owns services,
 * works and a construction budget on the shared shard; its residents are the
 * same shared Tidelanders as everyone else's.
 */
export class RivalChapter {
    constructor({ id, name, colour, doctrine, programs = [], lumen = 18, works = 1, lastMove = null, map, parentContainer, occupancy }) {
        this.id = id;
        this.name = name;
        this.colour = colour;
        this.doctrine = doctrine;
        this.programs = [...programs];
        this.isPlayer = false;
        this.lumen = lumen;
        this.works = works;
        this.lastMove = lastMove;
        this.services = new ServiceManager({
            map,
            parentContainer,
            chapter: this,
            occupancy,
            idPrefix: id
        });
    }

    get activeServices() {
        return this.services.activeServices;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            colour: this.colour,
            doctrine: this.doctrine,
            programs: [...this.programs],
            lumen: this.lumen,
            works: this.works,
            lastMove: this.lastMove,
            services: this.services.serialize()
        };
    }
}
