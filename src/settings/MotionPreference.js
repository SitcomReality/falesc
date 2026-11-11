import { readPreference, writePreference, applyPreference } from './Preference.js';

/**
 * Reduced motion is a persisted display preference. It suppresses chrome
 * animation and resident idle drift; the simulation and day playback are
 * unchanged.
 */
export const MOTION_KEY = 'falesc.motion.v1';

export function readMotion() {
    return readPreference({
        key: MOTION_KEY,
        fallback: 'full',
        osQuery: '(prefers-reduced-motion: reduce)',
        osValue: 'reduced'
    });
}

export function writeMotion(mode) {
    const value = mode === 'reduced' ? 'reduced' : 'full';
    writePreference(MOTION_KEY, value);
    applyMotion(value);
    return value;
}

export function applyMotion(mode) {
    applyPreference('is-reduced-motion', 'motion', mode === 'reduced');
}
