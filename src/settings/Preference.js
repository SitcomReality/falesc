/**
 * Small shared helpers for persisted display preferences. Each preference keeps
 * its own key and class; only storage and matchMedia plumbing is common.
 */
export function readPreference({ key, fallback, osQuery = null, osValue = null }) {
    try {
        const stored = localStorage.getItem(key);
        if (stored) return stored;
    } catch {
        // Fall through to the operating-system preference.
    }
    if (osQuery && typeof window !== 'undefined' && window.matchMedia?.(osQuery)?.matches) return osValue;
    return fallback;
}

export function writePreference(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Storage can be unavailable; the current page still applies the value.
    }
}

export function applyPreference(className, dataAttribute, value) {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle(className, Boolean(value));
    document.documentElement.dataset[dataAttribute] = value ? 'on' : 'off';
}
