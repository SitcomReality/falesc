import { NPCController } from './NPCController.js';

export class CrowdManager {
    constructor(app) {
        this.app = app;
        this.controllers = new Map(); // Map<Character, NPCController>
    }

    register(character) {
        if (!this.controllers.has(character)) {
            const controller = new NPCController(character, this.app.screen);
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
        for (const controller of this.controllers.values()) {
            controller.update(dt);
        }
    }
}