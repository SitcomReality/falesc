const SAVE_KEY = 'falesc.save.v2';
const SAVE_VERSION = 2;
const LEGACY_KEYS = ['falesc.save.v1'];

/**
 * Versioned localStorage persistence. Saves model data only: the seeded world
 * is rebuilt, while residents, services, needs, affinity and the day are stored.
 * Old Prism Tide saves are discarded rather than half-loaded.
 */
export class SaveManager {
    constructor(storage = null) {
        try {
            this.storage = storage || window.localStorage;
        } catch {
            this.storage = null;
        }
    }

    hasSave() {
        return this.read() !== null;
    }

    read() {
        if (!this.storage) return null;
        try {
            for (const key of LEGACY_KEYS) this.storage.removeItem(key);
            const raw = this.storage.getItem(SAVE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || data.version !== SAVE_VERSION) {
                this.clear();
                return null;
            }
            if (!data.charter || !Number.isInteger(data.charter.seed)) return null;
            return data;
        } catch {
            return null;
        }
    }

    write(payload) {
        if (!this.storage) return false;
        try {
            this.storage.setItem(SAVE_KEY, JSON.stringify({
                version: SAVE_VERSION,
                savedAt: Date.now(),
                ...payload
            }));
            return true;
        } catch {
            return false;
        }
    }

    clear() {
        if (!this.storage) return;
        try {
            this.storage.removeItem(SAVE_KEY);
            for (const key of LEGACY_KEYS) this.storage.removeItem(key);
        } catch {
            // Storage may be disabled or full; a failed clear is not fatal.
        }
    }
}
