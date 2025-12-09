export const GameState = {
    MENU: 'MENU',
    LOBBY: 'LOBBY',
    PLAYING: 'PLAYING',
    INTERSTITIAL: 'INTERSTITIAL',
    END: 'END'
};

export class GameStateManager {
    constructor(app) {
        this.app = app;
        // Start with no active state so the first setState call always runs
        this.state = null;
        this.currentTurn = 0;
        this.screens = new Map();
        this.activeScreen = null;
        
        // Game settings (will be configured in lobby)
        this.settings = {
            mapSeed: Math.random(),
            mapSize: 'medium',
            turnDuration: 0, // 0 = no timer
            initialResources: 100
        };
        
        // Player data
        this.players = [];
    }

    registerScreen(stateName, screen) {
        this.screens.set(stateName, screen);
    }

    setState(newState) {
        // If we're already in this state *and* have an active screen, do nothing
        if (this.state === newState && this.activeScreen) return;
        
        // Hide current screen
        if (this.activeScreen) {
            this.activeScreen.hide();
        }
        
        this.state = newState;
        
        // Show new screen
        this.activeScreen = this.screens.get(newState);
        if (this.activeScreen) {
            this.activeScreen.show();
        }
    }

    startGame() {
        this.currentTurn = 1;
        this.setState(GameState.PLAYING);
    }

    endTurn() {
        this.setState(GameState.INTERSTITIAL);
        
        // Simulate turn processing
        setTimeout(() => {
            this.currentTurn++;
            this.setState(GameState.PLAYING);
        }, 2000);
    }

    endGame() {
        this.setState(GameState.END);
    }
}