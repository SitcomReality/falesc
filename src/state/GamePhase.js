/**
 * Screen phases for the refined loop.
 *
 * PLAYING is paused planning. DAY is the deterministic playback. REPORT is the
 * evening broadsheet. Menus and end screens are DOM overlays around them.
 */
export const GamePhase = {
    MENU: 'MENU',
    LOBBY: 'LOBBY',
    PLAYING: 'PLAYING',
    DAY: 'DAY',
    REPORT: 'REPORT',
    END: 'END'
};
