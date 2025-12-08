export class Random {
    constructor(seed = 12345) {
        this.seed = seed;
    }

    // Simple Linear Congruential Generator
    next() {
        this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
        return this.seed / 4294967296;
    }

    range(min, max) {
        return min + this.next() * (max - min);
    }
}