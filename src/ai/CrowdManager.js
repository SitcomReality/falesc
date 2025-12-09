import { NPCController } from './NPCController.js';

export class CrowdManager {
    constructor(app) {
        this.app = app;
        this.controllers = new Map(); // Map<Character, NPCController>
        this.worldBounds = { width: app.screen.width, height: app.screen.height };
    }

    setWorldBounds(width, height) {
        this.worldBounds = { width, height };
        // If we have existing controllers, update their bounds reference if needed
        for(const controller of this.controllers.values()) {
            controller.setBounds(this.worldBounds);
        }
    }

    register(character) {
        if (!this.controllers.has(character)) {
            const controller = new NPCController(character, this.worldBounds);
            this.controllers.set(character, controller);
        }
    }

    unregister(character) {
        if (this.controllers.has(character)) {
            this.controllers.delete(character);
        }
    }

    clear() {
        this.controllers.clear();
    }

    update(dt) {
        // Update all active AI controllers
        // dt is now in seconds (game ticker delta converted in App)
        for (const controller of this.controllers.values()) {
            controller.update(dt);
        }
    }
}