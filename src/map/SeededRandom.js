/** 
 * Simple seeded pseudo-random number generator (LCG) 
 * Provides deterministic random values from a seed
 */
export class SeededRandom {
    constructor(seed) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }

    next() {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }

    nextRange(min, max) {
        return min + this.next() * (max - min);
    }

    nextInt(min, max) {
        return Math.floor(this.nextRange(min, max + 1));
    }

    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}