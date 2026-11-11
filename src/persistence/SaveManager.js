const SAVE_KEY = 'falesc.save.v1';
const SAVE_VERSION = 1;

/**
 * Versioned localStorage persistence. Saves model data only: the world is
 * rebuildable from its seed, so a save is small and cannot pin stale Pixi
 * objects. Corrupt or old saves are discarded rather than half-loaded.
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
            const raw = this.storage.getItem(SAVE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || data.version !== SAVE_VERSION) {
                this.clear();
                return null;
            }
            if (!data.settings || !Number.isInteger(data.settings.mapSeed)) return null;
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
        } catch {
            // Storage can be disabled or full; a failed clear is not fatal.
        }
    }
}
