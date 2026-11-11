/* Program footprints and storey heights used by the service art. */
export const PROGRAM_FALLBACK = 'housing';
export const PROGRAMS = {
    housing: {
        hw: 124,
        hh: 54,
        guide: [
            { x: -116, y: -100 },
            { x: 0, y: -186 },
            { x: 116, y: -100 }
        ]
    },
    canteen: {
        hw: 132,
        hh: 58,
        guide: [
            { x: -110, y: -70 },
            { x: 0, y: -122 },
            { x: 110, y: -70 }
        ]
    },
    tea_house: {
        hw: 122,
        hh: 52,
        guide: [
            { x: -118, y: -92 },
            { x: 0, y: -202 },
            { x: 118, y: -92 }
        ]
    },
    garden_dome: {
        hw: 224,
        hh: 96,
        guide: [
            { x: -172, y: 10 },
            { x: 0, y: -226 },
            { x: 172, y: 10 }
        ]
    },
    clinic: {
        hw: 112,
        hh: 48,
        guide: [
            { x: -104, y: -86 },
            { x: 0, y: -144 },
            { x: 104, y: -86 }
        ]
    },
    creche: {
        hw: 112,
        hh: 48,
        guide: [
            { x: -104, y: -96 },
            { x: 0, y: -166 },
            { x: 104, y: -96 }
        ]
    },
    observatory: {
        hw: 112,
        hh: 48,
        guide: [
            { x: -104, y: -96 },
            { x: 0, y: -166 },
            { x: 104, y: -96 }
        ]
    },
    amphitheatre: {
        hw: 184,
        hh: 78,
        guide: [
            { x: -158, y: -62 },
            { x: 0, y: -112 },
            { x: 158, y: -62 }
        ]
    },
    bathhouse: {
        hw: 158,
        hh: 66,
        guide: [
            { x: -122, y: 8 },
            { x: 0, y: -104 },
            { x: 122, y: 8 }
        ]
    },
    commons_beacon: {
        hw: 158,
        hh: 66,
        guide: [
            { x: -40, y: -262 },
            { x: 0, y: -296 },
            { x: 40, y: -262 }
        ]
    }
};

export function storeyTop(programId) {
    const heights = {
        housing: 112,
        canteen: 78,
        tea_house: 96,
        bathhouse: 96,
        garden_dome: 150,
        commons_beacon: 160,
        clinic: 112
    };
    return heights[programId] || 96;
}

