import { SeededRandom } from '../map/SeededRandom.js';
import { NEEDS } from '../design/needs.js';
import { TEMPERAMENTS, STANDARDS, RHYTHMS } from '../design/traits.js';
import { TIDELANDER_NAMES } from '../design/names.js';
import { BALANCE } from '../design/balance.js';
import { Resident } from './Resident.js';

/**
 * Day-trippers from the outer isles. Visitors are transient Resident models:
 * they have needs and make service choices, but no bed, no vote and no save
 * entry. They leave when the day report is read.
 */
export class VisitorFactory {
    static countFor(seed, day) {
        const rng = new SeededRandom(seed + day * 92821 + 4001);
        return rng.nextInt(BALANCE.visitors.min, BALANCE.visitors.max);
    }

    static restore(entries = []) {
        return entries.map((entry) => {
            const visitor = Resident.fromJSON(entry);
            visitor.visitor = true;
            visitor.active = true;
            return visitor;
        });
    }

    static create(seed, day, count = VisitorFactory.countFor(seed, day)) {
        const rng = new SeededRandom(seed + day * 92821 + 4001);
        const names = shuffle([...TIDELANDER_NAMES], rng).slice(0, count);
        const visitors = [];
        for (let index = 0; index < count; index++) {
            const temperament = TEMPERAMENTS[(day + index) % TEMPERAMENTS.length];
            const standards = STANDARDS[(day + index * 2) % STANDARDS.length];
            const rhythm = RHYTHMS[(day + index) % RHYTHMS.length];
            const needs = {};
            const urgent = NEEDS[(day + index) % NEEDS.length];
            for (const need of NEEDS) {
                needs[need.id] = need.id === urgent.id
                    ? 48 + rng.next() * 20
                    : 24 + rng.next() * 30;
            }
            visitors.push(new Resident({
                id: `v${String(day).padStart(2, '0')}-${index + 1}`,
                name: names[index],
                traits: {
                    temperament: temperament.id,
                    standards: standards.id,
                    rhythm: rhythm.id
                },
                needs,
                active: true,
                homeChapterId: 'visitor',
                affinity: { player: 0.1 },
                paletteSeed: seed + day * 1471 + index * 173,
                visitor: true
            }));
        }
        return visitors;
    }
}

function shuffle(values, rng) {
    for (let index = values.length - 1; index > 0; index--) {
        const swap = rng.nextInt(0, index);
        [values[index], values[swap]] = [values[swap], values[index]];
    }
    return values;
}
