/**
 * Reduced motion is a persisted display preference. It suppresses chrome
 * animation and transitions; the simulation and day playback are unchanged.
 */
export const MOTION_KEY = 'falesc.motion.v1';

export function readMotion() {
    try {
        const stored = localStorage.getItem(MOTION_KEY);
        if (stored === 'reduced' || stored === 'full') return stored;
    } catch {
        // Fall through to the operating-system preference.
    }
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
        return 'reduced';
    }
    return 'full';
}

export function writeMotion(mode) {
    const value = mode === 'reduced' ? 'reduced' : 'full';
    try {
        localStorage.setItem(MOTION_KEY, value);
    } catch {
        // Storage can be unavailable; the current page still applies the mode.
    }
    applyMotion(value);
    return value;
}

export function applyMotion(mode) {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('is-reduced-motion', mode === 'reduced');
    document.documentElement.dataset.motion = mode === 'reduced' ? 'reduced' : 'full';
}
