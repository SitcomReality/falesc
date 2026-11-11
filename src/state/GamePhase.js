/**
 * Screen phases for the refined loop.
 *
 * PLAYING is paused planning. DAY is the deterministic playback. REPORT is the
 * evening broadsheet. The Confluence is the final vote screen; menus and end
 * screens are DOM overlays around them.
 */
export const GamePhase = {
    MENU: 'MENU',
    LOBBY: 'LOBBY',
    PLAYING: 'PLAYING',
    DAY: 'DAY',
    REPORT: 'REPORT',
    CONFLUENCE: 'CONFLUENCE',
    END: 'END'
};
