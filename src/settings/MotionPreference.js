/**
 * Reduced motion is a persisted display preference. It suppresses chrome
 * animation and transitions; the simulation and day playback are unchanged.
 */
export const MOTION_KEY = 'falesc.motion.v1';

export function readMotion() {
    try {
        return localStorage.getItem(MOTION_KEY) === 'reduced' ? 'reduced' : 'full';
    } catch {
        return 'full';
    }
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
