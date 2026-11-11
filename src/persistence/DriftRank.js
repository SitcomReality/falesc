import { readArchive } from './CharterArchive.js';

/**
 * The drift remembers how many charters have closed. A small starting lumen
 * bonus is the visible reward for continuing to begin again.
 */
export const DRIFT_RANKS = [
    { rank: 0, at: 0, bonus: 0, label: 'Unwritten' },
    { rank: 1, at: 3, bonus: 1, beds: 0, commons: 0, label: 'Remembered' },
    { rank: 2, at: 6, bonus: 2, beds: 1, commons: 0, label: 'Kept' },
    { rank: 3, at: 8, bonus: 3, beds: 1, commons: 5, label: 'Written in' }
];

export function readDriftRank() {
    const records = readArchive();
    const charters = records.length;
    const victories = records.filter((record) => record.outcome === 'victory').length;
    const current = [...DRIFT_RANKS].reverse().find((entry) => charters >= entry.at) || DRIFT_RANKS[0];
    const next = DRIFT_RANKS.find((entry) => entry.at > charters) || null;
    return {
        rank: current.rank,
        label: current.label,
        bonus: current.bonus,
        beds: current.beds || 0,
        commons: current.commons || 0,
        charters,
        victories,
        nextAt: next?.at ?? null,
        nextLabel: next?.label ?? null
    };
}
