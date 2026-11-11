/**
 * Owns the single pending turn timer. A token invalidates any callback that is
 * superseded by a cancel, so leaving the game, restarting, or ending a charter
 * can never be overridden by a stale timer.
 */
export class TurnScheduler {
    constructor() {
        this.timer = null;
        this.token = 0;
    }

    schedule(callback, delay = 1900) {
        this.cancel();
        const token = ++this.token;
        this.timer = setTimeout(() => {
            if (token !== this.token) return;
            this.timer = null;
            callback();
        }, delay);
        return token;
    }

    cancel() {
        this.token += 1;
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    get pending() {
        return this.timer !== null;
    }
}
