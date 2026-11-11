/**
 * Inline, hand-drawn SVG marks for the civic bulletin. Static markup only:
 * never feed user-provided text through these helpers.
 */
const svg = (body, viewBox = '0 0 64 56') => `
    <svg viewBox="${viewBox}" fill="none" aria-hidden="true" focusable="false">
        ${body}
    </svg>
`;

const INK = '#211225';

export const ICONS = {
    lumen: svg(`
        <path d="M32 4 52 23 32 52 12 23Z" fill="#59E3C2" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M32 4 38 23 32 52 26 23Z" fill="#A8F5DC" opacity=".9"/>
        <path d="M32 4 12 23 32 30 52 23Z" fill="#FFF2D8" opacity=".55"/>
        <path d="M32 30 38 23 32 52 26 23Z" fill="#36C6D9" opacity=".55"/>
    `),
    works: svg(`
        <path d="M14 46h36" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
        <path d="M22 46 32 12l10 34" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M18 32h28M24 22h16" stroke="#FFD36E" stroke-width="4" stroke-linecap="round"/>
        <path d="M10 46 6 50M54 46l4 4" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    `),
    population: svg(`
        <circle cx="24" cy="20" r="8" fill="#FFA07A" stroke="${INK}" stroke-width="2.5"/>
        <circle cx="43" cy="25" r="6" fill="#C9B6FF" stroke="${INK}" stroke-width="2.5"/>
        <path d="M10 48c0-9 6-15 14-15s14 6 14 15" fill="#FF6B5E" stroke="${INK}" stroke-width="2.5"/>
        <path d="M37 48c0-7 4-11 10-11s9 4 9 11" fill="#59E3C2" stroke="${INK}" stroke-width="2.5"/>
    `),
    devotion: svg(`
        <path d="M32 48C16 37 9 29 9 20c0-7 5-12 11-12 4 0 8 2 12 7 4-5 8-7 12-7 6 0 11 5 11 12 0 9-7 17-23 28Z" fill="#FF4F9A" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M32 42C21 34 16 28 16 22c0-4 3-7 7-7 3 0 6 2 9 6 3-4 6-6 9-6 4 0 7 3 7 7 0 6-5 12-16 20Z" fill="#FFD36E" opacity=".9"/>
    `),
    flourishing: svg(`
        <path d="M32 50C24 30 24 14 32 4c8 10 8 26 0 46Z" fill="#59E3C2" stroke="${INK}" stroke-width="2.5"/>
        <path d="M32 50C13 40 13 25 18 18c7 7 12 17 14 32Z" fill="#A8F5DC" stroke="${INK}" stroke-width="2.5"/>
        <path d="M32 50c19-10 19-25 14-32-7 7-12 17-14 32Z" fill="#36C6D9" stroke="${INK}" stroke-width="2.5"/>
    `),
    sustenance: svg(`
        <ellipse cx="32" cy="33" rx="21" ry="13" fill="#FFF2D8" stroke="${INK}" stroke-width="3"/>
        <path d="M15 33c3 10 10 15 17 15s14-5 17-15" fill="#FF6B5E" stroke="${INK}" stroke-width="2.5"/>
        <path d="M24 18c-3-5 0-8 3-11M36 18c-3-5 0-8 3-11" stroke="#FFD36E" stroke-width="3" stroke-linecap="round"/>
    `),
    rest: svg(`
        <path d="M44 36A16 16 0 0 1 24 10a17 17 0 1 0 20 26Z" fill="#C9B6FF" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M16 46h10M12 51h18" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
    `),
    company: svg(`
        <path d="M24 44c-9 0-15-6-15-15S15 14 24 14c5 0 8 2 11 5 3-3 6-5 11-5 7 0 12 5 12 12 0 7-6 12-13 12h-4l-7 8v-8Z" fill="#FF4F9A" stroke="${INK}" stroke-width="2.5"/>
    `),
    wonder: svg(`
        <path d="M32 4 38 22 56 22 41 33 47 52 32 40 17 52 23 33 8 22 26 22Z" fill="#59E3C2" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="32" cy="30" r="5" fill="#FFF2D8"/>
    `),
    housing: svg(`
        <path d="M8 49h48" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
        <path d="M15 47V26L32 13l17 13v21" fill="#FFF2D8" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M11 27 32 10l21 17" fill="#FF6B5E" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
        <rect x="27" y="32" width="10" height="15" fill="#211225"/>
        <circle cx="34" cy="40" r="1.6" fill="#FFD36E"/>
        <circle cx="47" cy="18" r="4" fill="#FFD36E" stroke="${INK}" stroke-width="2"/>
    `),
    canteen: svg(`
        <path d="M7 49h50" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
        <path d="M11 27h42v18H11Z" fill="#FFF2D8" stroke="${INK}" stroke-width="2.5"/>
        <path d="M8 27 14 13h36l6 14Z" fill="#FF6B5E" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M17 27v18M29 27v18M41 27v18" stroke="${INK}" stroke-width="1.5" opacity=".45"/>
        <path d="M19 35h6v10h-6Z" fill="#FFD36E" stroke="${INK}" stroke-width="2"/>
        <path d="M40 16c-2-4 1-6 3-8M48 16c-2-4 1-6 3-8" stroke="#FFD36E" stroke-width="2.5" stroke-linecap="round"/>
    `),
    tea_house: svg(`
        <path d="M7 49h50" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
        <path d="M13 48V28c0-8 8-14 19-14s19 6 19 14v20" fill="#FFF2D8" stroke="${INK}" stroke-width="2.5"/>
        <path d="M9 28c4-13 12-19 23-19s19 6 23 19" fill="#FF4F9A" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
        <rect x="27" y="33" width="10" height="15" fill="#211225"/>
        <circle cx="18" cy="35" r="3" fill="#FFD36E" stroke="${INK}" stroke-width="1.5"/>
        <circle cx="46" cy="35" r="3" fill="#FFD36E" stroke="${INK}" stroke-width="1.5"/>
        <path d="M31 8c-2-3 0-5 2-7" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    `),
    garden_dome: svg(`
        <path d="M6 49h52" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
        <path d="M10 47c0-16 10-28 22-28s22 12 22 28Z" fill="#A8F5DC" stroke="${INK}" stroke-width="2.5"/>
        <path d="M32 19v28M17 25c4 8 4 15 3 22M47 25c-4 8-4 15-3 22M10 38h44" stroke="${INK}" stroke-width="1.5" opacity=".5"/>
        <path d="M24 47c0-8 4-12 8-12s8 4 8 12" fill="#2F9E7F" stroke="${INK}" stroke-width="2"/>
        <path d="M30 47v-9M36 47v-7" stroke="#59E3C2" stroke-width="2"/>
        <rect x="27" y="41" width="10" height="7" fill="#FFD36E" stroke="${INK}" stroke-width="1.5"/>
    `),
    commons_beacon: svg(`
        <path d="M8 50h48" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
        <path d="M23 49 27 22h10l4 27Z" fill="#C9B6FF" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M27 22h10l-2-9h-6Z" fill="#59E3C2" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M32 5v5M20 12l4 4M44 12l-4 4" stroke="#FFD36E" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M30 30h4M29 38h6M28 45h8" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    `),
    compass: svg(`
        <circle cx="32" cy="28" r="20" stroke="currentColor" stroke-width="1.5"/>
        <path d="M32 8v5M32 43v5M12 28h5M47 28h5" stroke="currentColor" stroke-width="1.5"/>
        <path d="m32 16 4 12-4 12-4-12Z" fill="currentColor" opacity=".85"/>
    `)
};

export function programIcon(id) {
    return ICONS[id] || ICONS.housing;
}

export function needIcon(id) {
    return ICONS[id] || ICONS.flourishing;
}

export const blueprintIcon = programIcon;
