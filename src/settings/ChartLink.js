/**
 * Shareable chart parameters live in the page URL. Only known sizes and modes
 * are accepted so a malformed link falls back to the lobby defaults.
 */
const SIZES = new Set(['small', 'medium', 'large']);
const MODES = new Set(['first-light', 'contest', 'open']);

export function readChartParams(search = typeof window !== 'undefined' ? window.location.search : '') {
    const params = new URLSearchParams(search || '');
    const seed = Number.parseInt(params.get('seed') ?? '', 10);
    const size = params.get('size');
    const mode = params.get('mode');
    return {
        seed: Number.isInteger(seed) ? seed : null,
        size: SIZES.has(size) ? size : null,
        mode: MODES.has(mode) ? mode : null
    };
}

export function chartShareUrl({ seed, size, mode }, base = typeof window !== 'undefined' ? window.location.href : 'http://localhost/') {
    const url = new URL(base);
    url.search = '';
    url.searchParams.set('seed', String(seed));
    url.searchParams.set('size', size);
    url.searchParams.set('mode', mode);
    return url.toString();
}
