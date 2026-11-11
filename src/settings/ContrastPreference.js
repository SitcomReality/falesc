import { readPreference, writePreference, applyPreference } from './Preference.js';

/**
 * High-contrast mode strengthens ink, paper and borders without changing the
 * palette's identity. It is persisted separately from motion.
 */
export const CONTRAST_KEY = 'falesc.contrast.v1';

export function readContrast() {
    return readPreference({
        key: CONTRAST_KEY,
        fallback: 'normal',
        osQuery: '(prefers-contrast: more)',
        osValue: 'high'
    });
}

export function writeContrast(mode) {
    const value = mode === 'high' ? 'high' : 'normal';
    writePreference(CONTRAST_KEY, value);
    applyContrast(value);
    return value;
}

export function applyContrast(mode) {
    applyPreference('is-high-contrast', 'contrast', mode === 'high');
}
