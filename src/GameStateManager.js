import { TurnScheduler } from './game/TurnScheduler.js';
import { DEFAULT_BLUEPRINT_ID } from './buildings/blueprints.js';

export const GameState = {
    MENU: 'MENU',
    LOBBY: 'LOBBY',
    PLAYING: 'PLAYING',
    INTERSTITIAL: 'INTERSTITIAL',
    END: 'END'
};

const TIDE_LIMITS = {
    small: 12,
    medium: 14,
    large: 16
};

const STARTING_LUMEN = 8;

export class GameStateManager {
    constructor(app) {
        this.app = app;
        // Start with no active state so the first setState call always runs.
        this.state = null;
        this.currentTurn = 0;
        this.actionsRemaining = 0;
        this.lumen = 0;
        this.dayLimit = TIDE_LIMITS.medium;
        this.selectedBlueprint = DEFAULT_BLUEPRINT_ID;
        this.hintDismissed = false;
        this.endResult = null;
        this.lastTideSummary = null;
        this.screens = new Map();
        this.activeScreen = null;
        this.scheduler = new TurnScheduler();
        this.onTideResolve = null;

        // Game settings (configured in the lobby).
        this.settings = {
            mapSeed: Math.floor(Math.random() * 1000000),
            mapSize: 'medium',
            turnDuration: 0,
            initialResources: STARTING_LUMEN
        };

        this.players = [];
    }

    registerScreen(stateName, screen) {
        this.screens.set(stateName, screen);
    }

    setState(newState) {
        if (this.state === newState && this.activeScreen) return;

        if (this.activeScreen) this.activeScreen.hide();

        this.state = newState;
        this.activeScreen = this.screens.get(newState);
        if (this.activeScreen) this.activeScreen.show();
    }

    startGame() {
        this.cancelPendingTurn();
        this.currentTurn = 1;
        this.actionsRemaining = 1;
        this.lumen = STARTING_LUMEN;
        this.dayLimit = TIDE_LIMITS[this.settings.mapSize] || TIDE_LIMITS.medium;
        this.selectedBlueprint = DEFAULT_BLUEPRINT_ID;
        this.hintDismissed = false;
        this.endResult = null;
        this.lastTideSummary = null;
        this.setState(GameState.PLAYING);
    }

    endTurn() {
        if (this.state !== GameState.PLAYING) return;
        if (this.scheduler.pending) return;

        this.lastTideSummary = {
            income: 0,
            active: this.screens.get(GameState.PLAYING)?.game?.buildingManager?.buildings?.filter((b) => b.state === 'ACTIVE').length || 0,
            message: 'The lamps are lit. The water is moving.'
        };
        this.setState(GameState.INTERSTITIAL);

        this.scheduler.schedule(() => {
            const summary = typeof this.onTideResolve === 'function' ? this.onTideResolve() : {};
            this.lastTideSummary = summary || {};
            this.currentTurn += 1;
            this.actionsRemaining = 1;

            if (summary && summary.outcome) {
                this.endGame(summary.outcome);
                return;
            }

            this.setState(GameState.PLAYING);
        }, 1900);
    }

    addLumen(amount) {
        this.lumen = Math.max(0, this.lumen + Math.trunc(amount || 0));
        return this.lumen;
    }

    spendLumen(amount) {
        const cost = Math.trunc(amount || 0);
        if (cost > this.lumen) return false;
        this.lumen -= cost;
        return true;
    }

    endGame(outcome = 'abandon') {
        this.cancelPendingTurn();
        this.endResult = {
            outcome,
            day: this.currentTurn,
            lumen: this.lumen
        };
        this.setState(GameState.END);
    }

    cancelPendingTurn() {
        this.scheduler.cancel();
    }

    get canAct() {
        return this.state === GameState.PLAYING && this.actionsRemaining > 0;
    }
}
