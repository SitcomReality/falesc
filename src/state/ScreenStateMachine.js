/**
 * Small screen registry. It knows nothing about the run model; it only shows
 * and hides registered DOM screens and reports phase changes to the app.
 */
export class ScreenStateMachine {
    constructor() {
        this.state = null;
        this.screens = new Map();
        this.activeScreen = null;
        this.listeners = [];
    }

    registerScreen(phase, screen) {
        this.screens.set(phase, screen);
    }

    onChange(listener) {
        this.listeners.push(listener);
    }

    setState(phase) {
        if (this.state === phase && this.activeScreen) return;
        if (this.activeScreen?.hide) this.activeScreen.hide();
        const previous = this.state;
        this.state = phase;
        this.activeScreen = this.screens.get(phase) || null;
        if (this.activeScreen?.show) this.activeScreen.show();
        for (const listener of this.listeners) listener(phase, previous);
    }
}
