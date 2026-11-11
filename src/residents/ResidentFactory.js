import { SeededRandom } from '../map/SeededRandom.js';
import { NEEDS } from '../design/needs.js';
import { TEMPERAMENTS, STANDARDS, RHYTHMS } from '../design/traits.js';
import { TIDELANDER_NAMES } from '../design/names.js';
import { BALANCE } from '../design/balance.js';
import { Resident } from './Resident.js';

/**
 * Seeded cast construction. The same charter seed produces the same fifteen
 * Tidelanders, with a deliberate mix of temperaments, standards and rhythms.
 * The first six are the founding residents; the rest wait for spare beds.
 */
export class ResidentFactory {
    static createRoster(seed, count = BALANCE.rosterSize) {
        const rng = new SeededRandom(seed + 731);
        const names = shuffle([...TIDELANDER_NAMES], rng).slice(0, count);
        const residents = [];

        for (let index = 0; index < count; index++) {
            const temperament = TEMPERAMENTS[index % TEMPERAMENTS.length];
            const standards = STANDARDS[(index + Math.floor(index / TEMPERAMENTS.length)) % STANDARDS.length];
            const rhythm = RHYTHMS[index % RHYTHMS.length];
            const needs = createStartingNeeds(rng, index, index < BALANCE.startingResidents);
            const active = index < BALANCE.startingResidents;

            residents.push(new Resident({
                id: `r${String(index + 1).padStart(2, '0')}`,
                name: names[index],
                traits: {
                    temperament: temperament.id,
                    standards: standards.id,
                    rhythm: rhythm.id
                },
                needs,
                active,
                affinity: BALANCE.devotion.startingAffinity,
                paletteSeed: seed + 9001 + index * 131
            }));
        }

        return residents;
    }

    static fromSave(entries) {
        if (!Array.isArray(entries)) return [];
        return entries.map((entry) => Resident.fromJSON(entry));
    }
}

function createStartingNeeds(rng, index, founding) {
    const needs = {};
    const urgentNeed = NEEDS[index % NEEDS.length];
    for (const need of NEEDS) {
        if (founding && need.id === urgentNeed.id) {
            needs[need.id] = 66 + rng.next() * 12;
        } else if (!founding && need.id === urgentNeed.id) {
            needs[need.id] = 52 + rng.next() * 16;
        } else {
            needs[need.id] = 16 + rng.next() * 26;
        }
    }
    return needs;
}

function shuffle(values, rng) {
    for (let index = values.length - 1; index > 0; index--) {
        const swap = rng.nextInt(0, index);
        [values[index], values[swap]] = [values[swap], values[index]];
    }
    return values;
}
