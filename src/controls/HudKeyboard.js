import { BUILDABLE_PROGRAMS } from '../design/programs.js';

/**
 * The planning HUD's document-level keyboard controller. It is installed once
 * by GameScreen and reads the screen's current pause state so it does not fight
 * modal or menu focus.
 */
export function installHudKeyboard(game, screen) {
    const onKey = (event) => {
        if (event.defaultPrevented) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (game.screenStateMachine.state !== 'PLAYING') return;
        if (game.hasBlockingModal?.()) return;
        if (screen.pausePanel && !screen.pausePanel.hidden && event.key !== 'Escape') return;
        if (game.keyboardCursorActive) {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                const dx = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
                const dy = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
                game.moveKeyboardCursor(dx, dy);
                return;
            }
            if (event.key === 'Enter') {
                event.preventDefault();
                game.confirmKeyboardCursor();
                return;
            }
            if (event.key === 'g' || event.key === 'G') {
                event.preventDefault();
                game.switchKeyboardSector();
                return;
            }
            if (event.key === 'Escape' || event.key === 'c' || event.key === 'C') {
                event.preventDefault();
                game.clearKeyboardCursor();
                return;
            }
        }
        if (event.key === 'c' || event.key === 'C') {
            event.preventDefault();
            game.toggleKeyboardCursor();
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            if (screen.pausePanel.hidden) screen.menuButton.click();
            else screen._setPauseOpen(false);
            return;
        }
        if (event.key === 'e' || event.key === 'E') {
            event.preventDefault();
            game.openDay();
            return;
        }
        if (event.key === 'b' || event.key === 'B') {
            event.preventDefault();
            game.showBulletin();
            return;
        }
        if (event.key === 'r' || event.key === 'R') {
            event.preventDefault();
            game.openResidentRoster();
            return;
        }
        if (event.key === 'p' || event.key === 'P') {
            event.preventDefault();
            game.togglePatronage();
            return;
        }
        const slot = Number(event.key);
        if (Number.isInteger(slot) && slot >= 1 && slot <= BUILDABLE_PROGRAMS.length) {
            const program = BUILDABLE_PROGRAMS[slot - 1];
            event.preventDefault();
            if (game.selectProgram(program.id)) screen.toast(`${program.name} armed — choose a plot.`, 'mint', 1600);
        }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
}
