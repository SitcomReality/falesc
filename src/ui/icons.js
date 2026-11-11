/**
 * Inline, hand-drawn SVG marks for the UI. Static markup only: never feed
 * user-provided text through these helpers.
 */

const svg = (body, viewBox = '0 0 64 56') => `
    <svg viewBox="${viewBox}" fill="none" aria-hidden="true" focusable="false">
        ${body}
    </svg>
`;

export const ICONS = {
    lumen: svg(`
        <path d="M32 3 52 23 32 53 12 23Z" fill="#59E3C2" stroke="#211225" stroke-width="3" stroke-linejoin="round"/>
        <path d="M32 3 38 23 32 53 26 23Z" fill="#A8F5DC" opacity=".9"/>
        <path d="M32 3 12 23 32 30 52 23Z" fill="#FFF2D8" opacity=".55"/>
        <path d="M32 30 38 23 32 53 26 23Z" fill="#36C6D9" opacity=".55"/>
    `),

    prism_rig: svg(`
        <path d="M10 47h44" stroke="#211225" stroke-width="3" stroke-linecap="round"/>
        <path d="M18 47 31 15l13 32" stroke="#211225" stroke-width="3" stroke-linejoin="round"/>
        <path d="M31 15 38 34 31 47 24 34Z" fill="#59E3C2" stroke="#211225" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M31 15 35 34 31 47 27 34Z" fill="#A8F5DC"/>
        <path d="M18 47 9 51M44 47l9 4" stroke="#211225" stroke-width="2" stroke-linecap="round"/>
        <path d="M21 39h20" stroke="#C73D61" stroke-width="3" stroke-linecap="round"/>
    `),

    tide_garden: svg(`
        <path d="M6 48h52" stroke="#211225" stroke-width="3" stroke-linecap="round"/>
        <path d="M10 46c2-10 9-14 14-14s7 4 7 8-4 6-8 6" fill="#36C6D9" stroke="#211225" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M54 46c-2-9-8-13-13-13s-7 4-7 8 3 5 7 5" fill="#A8F5DC" stroke="#211225" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M24 32c-2-9 1-15 7-19 5 5 7 12 5 19" fill="#59E3C2" stroke="#211225" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M36 32c3-7 8-10 14-9-1 7-5 11-12 12" fill="#C9B6FF" stroke="#211225" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="32" cy="43" r="2.5" fill="#FF4F9A" stroke="#211225" stroke-width="1.5"/>
    `),

    lantern_house: svg(`
        <path d="M8 49h48" stroke="#211225" stroke-width="3" stroke-linecap="round"/>
        <path d="M17 48V27l15-12 15 12v21" fill="#FFF2D8" stroke="#211225" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M12 27 32 11l20 16" fill="#FF6B5E" stroke="#211225" stroke-width="2.5" stroke-linejoin="round"/>
        <rect x="27" y="33" width="10" height="15" fill="#211225"/>
        <circle cx="32" cy="39" r="2" fill="#FFD36E"/>
        <path d="M25 33h14" stroke="#211225" stroke-width="2"/>
        <circle cx="47" cy="20" r="5" fill="#FFD36E" stroke="#211225" stroke-width="2"/>
        <path d="M47 12v-4M47 32v-4M39 20h-4M59 20h-4" stroke="#FFD36E" stroke-width="2.5" stroke-linecap="round"/>
    `),

    aurora_beacon: svg(`
        <path d="M10 50h44" stroke="#211225" stroke-width="3" stroke-linecap="round"/>
        <path d="M23 49 27 22h10l4 27Z" fill="#C9B6FF" stroke="#211225" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M27 22h10l-2-9h-6Z" fill="#59E3C2" stroke="#211225" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M32 5v5M20 12l4 4M44 12l-4 4" stroke="#FFD36E" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M30 30h4M29 38h6M28 45h8" stroke="#211225" stroke-width="2" stroke-linecap="round"/>
        <path d="M39 47c5-2 8-6 8-11M25 47c-5-2-8-6-8-11" stroke="#36C6D9" stroke-width="2" stroke-linecap="round"/>
    `),

    compass: svg(`
        <circle cx="32" cy="28" r="20" stroke="currentColor" stroke-width="1.5"/>
        <path d="M32 8v5M32 43v5M12 28h5M47 28h5" stroke="currentColor" stroke-width="1.5"/>
        <path d="m32 16 4 12-4 12-4-12Z" fill="currentColor" opacity=".85"/>
    `)
};

export function blueprintIcon(id) {
    return ICONS[id] || ICONS.prism_rig;
}
