export class InputManager {
    constructor(target = window) {
        this.target = target;

        // Map of KeyboardEvent.code -> pressed boolean
        this.keyStates = new Map();

        // Map of actionName -> Set of KeyboardEvent.code
        this.bindings = new Map();

        // Modal flag: when true, keyboard input should be ignored (e.g. typing into UI)
        this.modalOpen = false;
        this.suppressCamera = false;

        // Default keybindings (can be reconfigured later)
        this._initDefaultBindings();

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onBlur = () => { this.keyStates.clear(); };
        this._onVisibilityChange = () => {
            if (document.hidden) this.keyStates.clear();
        };

        this._attachListeners();
    }

    _attachListeners() {
        this.target.addEventListener('keydown', this._onKeyDown);
        this.target.addEventListener('keyup', this._onKeyUp);
        this.target.addEventListener('blur', this._onBlur);
        document.addEventListener('visibilitychange', this._onVisibilityChange);
    }

    destroy() {
        this.target.removeEventListener('keydown', this._onKeyDown);
        this.target.removeEventListener('keyup', this._onKeyUp);
        this.target.removeEventListener('blur', this._onBlur);
        document.removeEventListener('visibilitychange', this._onVisibilityChange);
        this.keyStates.clear();
        this.bindings.clear();
    }

    _onKeyDown(e) {
        if (this.modalOpen) return; // Ignore global key handling while modal/text entry is active
        if (this.suppressCamera && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) return;
        this.keyStates.set(e.code, true);
    }

    _onKeyUp(e) {
        if (this.modalOpen) return;
        if (this.suppressCamera && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) return;
        this.keyStates.set(e.code, false);
    }

    setCameraSuppressed(suppressed) {
        this.suppressCamera = Boolean(suppressed);
        if (suppressed) {
            for (const code of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) this.keyStates.delete(code);
        }
    }

    _initDefaultBindings() {
        // Camera movement
        this.bindings.set('camera_pan_up', new Set(['KeyW', 'ArrowUp']));
        this.bindings.set('camera_pan_down', new Set(['KeyS', 'ArrowDown']));
        this.bindings.set('camera_pan_left', new Set(['KeyA', 'ArrowLeft']));
        this.bindings.set('camera_pan_right', new Set(['KeyD', 'ArrowRight']));
    }

    /**
     * Check if any key bound to this action is currently pressed.
     * @param {string} actionName
     * @returns {boolean}
     */
    isActionActive(actionName) {
        const codes = this.bindings.get(actionName);
        if (!codes) return false;
        for (const code of codes) {
            if (this.keyStates.get(code)) return true;
        }
        return false;
    }

    /**
     * Replace all bindings for an action.
     * @param {string} actionName
     * @param {string[]|Set<string>} codes
     */
    rebindAction(actionName, codes) {
        const set = codes instanceof Set ? codes : new Set(codes);
        this.bindings.set(actionName, set);
    }

    /**
     * Add a single key code to an action.
     * @param {string} actionName
     * @param {string} code
     */
    addBinding(actionName, code) {
        if (!this.bindings.has(actionName)) {
            this.bindings.set(actionName, new Set());
        }
        this.bindings.get(actionName).add(code);
    }

    /**
     * Toggle modal state so the input manager can ignore global key handling.
     * @param {boolean} open
     */
    setModalOpen(open) {
        this.modalOpen = !!open;
        if (this.modalOpen) {
            // clear transient key states to avoid stuck keys when modal opened
            this.keyStates.clear();
        }
    }

    /**
     * Remove a single key code from an action.
     * @param {string} actionName
     * @param {string} code
     */
    removeBinding(actionName, code) {
        const set = this.bindings.get(actionName);
        if (!set) return;
        set.delete(code);
    }

    /**
     * Get a read-only snapshot of the current bindings.
     * Useful for future UI display of keybinds.
     */
    getBindingsSnapshot() {
        const snapshot = {};
        for (const [action, codes] of this.bindings.entries()) {
            snapshot[action] = Array.from(codes);
        }
        return snapshot;
    }
}