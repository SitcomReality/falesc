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
            if (!this.validate(data)) {
                this.clear();
                return null;
            }
            return data;
        } catch {
            return null;
        }
    }

    validate(data) {
        if (!data || data.version !== SAVE_VERSION) return false;
        const charter = data.charter;
        return Boolean(charter
            && Number.isInteger(charter.seed)
            && Array.isArray(charter.services)
            && Array.isArray(charter.residents)
            && charter.residents.length > 0
            && charter.residents.every((resident) => resident
                && typeof resident.id === 'string'
                && typeof resident.name === 'string'
                && resident.traits
                && resident.needs)
            && (!charter.rivals || (Array.isArray(charter.rivals) && charter.rivals.every((rival) => rival
                && typeof rival.id === 'string'
                && typeof rival.name === 'string'
                && Array.isArray(rival.services))))
            && charter.services.every((service) => service
                && typeof service.programId === 'string'
                && Number.isInteger(service.sectorId)
                && Number.isInteger(service.u)
                && Number.isInteger(service.v)
                && service.entrance
                && Number.isInteger(service.entrance.u)
                && Number.isInteger(service.entrance.v)));
    }

    exportText() {
        const data = this.read();
        return data ? JSON.stringify(data, null, 2) : null;
    }

    importText(text) {
        try {
            const data = JSON.parse(text);
            if (!this.validate(data)) return { ok: false, error: 'This is not a FALESC save file.' };
            const written = this.write({
                phase: data.phase,
                settings: data.settings,
                charter: data.charter,
                camera: data.camera
            });
            if (!written) return { ok: false, error: 'The save could not be stored.' };
            return { ok: true, data };
        } catch {
            return { ok: false, error: 'This is not a valid JSON save.' };
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
