export const PALETTES = [
    { name: "Neon Pop", head: 0xFF6B6B, body: 0x4ECDC4, legs: 0xFFE66D, arms: 0x4ECDC4 },
    { name: "Royal", head: 0x6A4C93, body: 0xF8B500, legs: 0xF9F9F9, arms: 0xF8B500 },
    { name: "Sunset", head: 0xFF9A8B, body: 0xFF6A88, legs: 0xFF4D6D, arms: 0xFF6A88 },
    { name: "Forest", head: 0x2A9D8F, body: 0x264653, legs: 0xE9C46A, arms: 0x264653 },
    { name: "Monochrome", head: 0x333333, body: 0x888888, legs: 0xDDDDDD, arms: 0x888888 }
];

export const SHAPES = {
    HEAD_RADIUS: 12,
    BODY_WIDTH: 20,
    BODY_HEIGHT: 28,
    LIMB_WIDTH: 10,
    LIMB_HEIGHT: 24,
    OUTLINE_THICKNESS: 3
};

export const ANIMATION_STATES = {
    IDLE: 'IDLE',
    WALK: 'WALK',
    RUN: 'RUN',
    BEND: 'BEND'
};

export const MINERAL_TYPES = {
    ROCK: 'ROCK',
    CRYSTAL: 'CRYSTAL'
};

export const MINERAL_PALETTES = [
    // Rocks
    { id: 'ROCK_GREY', name: "Slate", base: 0x888888, dark: 0x555555, light: 0xAAAAAA },
    { id: 'ROCK_BROWN', name: "Sandstone", base: 0x8B5A2B, dark: 0x5D3A1A, light: 0xB98E5F },
    // Crystals
    { id: 'CRYSTAL_BLUE', name: "Ice", base: 0x4ECDC4, dark: 0x2AB7CA, light: 0xA8E6CF },
    { id: 'CRYSTAL_PURPLE', name: "Amethyst", base: 0x9B59B6, dark: 0x8E44AD, light: 0xD2B4DE },
    { id: 'CRYSTAL_GREEN', name: "Emerald", base: 0x2ECC71, dark: 0x27AE60, light: 0x82E0AA }
];