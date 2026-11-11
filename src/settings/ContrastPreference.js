/**
 * High-contrast mode strengthens ink, paper and borders without changing the
 * palette's identity. It is persisted separately from motion.
 */
export const CONTRAST_KEY = 'falesc.contrast.v1';

export function readContrast() {
    try {
        return localStorage.getItem(CONTRAST_KEY) === 'high' ? 'high' : 'normal';
    } catch {
        return 'normal';
    }
}

export function writeContrast(mode) {
    const value = mode === 'high' ? 'high' : 'normal';
    try {
        localStorage.setItem(CONTRAST_KEY, value);
    } catch {
        // Storage can be unavailable; the current page still applies the mode.
    }
    applyContrast(value);
    return value;
}

export function applyContrast(mode) {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('is-high-contrast', mode === 'high');
    document.documentElement.dataset.contrast = mode === 'high' ? 'high' : 'normal';
}
