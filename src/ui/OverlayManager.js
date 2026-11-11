/**
 * Shared overlay stack for modal dialogs.
 *
 * It owns the body scrim class, the HUD `inert` state, the input-manager modal
 * lock, focus restore and Tab trapping. Modals keep their own DOM and Escape
 * behaviour; they register with this stack when they open.
 */
export class OverlayManager {
    constructor({ inputManager = null, hudSelector = '[data-testid=game-hud]' } = {}) {
        this.inputManager = inputManager;
        this.hudSelector = hudSelector;
        this.stack = [];
    }

    get isOpen() {
        return this.stack.length > 0;
    }

    get size() {
        return this.stack.length;
    }

    get hud() {
        return document.querySelector(this.hudSelector);
    }

    isTop(owner) {
        return this.stack.length > 0 && this.stack[this.stack.length - 1].owner === owner;
    }

    open(owner, { panel, initialFocus = null, restoreFocus = null } = {}) {
        if (!panel || this.stack.some((entry) => entry.owner === owner)) return false;
        this.stack.push({
            owner,
            panel,
            restoreFocus: restoreFocus || document.activeElement
        });
        document.body.classList.add('has-modal');
        const hud = this.hud;
        if (hud) hud.setAttribute('inert', '');
        this.inputManager?.setModalOpen?.(true);
        requestAnimationFrame(() => {
            if (!this.isTop(owner)) return;
            const target = initialFocus?.() || firstFocusable(panel);
            target?.focus?.({ preventScroll: true });
        });
        return true;
    }

    close(owner, { restoreFocus = true } = {}) {
        const index = this.stack.findIndex((entry) => entry.owner === owner);
        if (index === -1) return null;
        const [entry] = this.stack.splice(index, 1);
        if (this.stack.length === 0) {
            document.body.classList.remove('has-modal');
            this.hud?.removeAttribute('inert');
            this.inputManager?.setModalOpen?.(false);
            if (restoreFocus) entry.restoreFocus?.focus?.({ preventScroll: true });
        } else {
            const top = this.stack[this.stack.length - 1];
            if (restoreFocus) firstFocusable(top.panel)?.focus?.({ preventScroll: true });
        }
        return entry;
    }

    closeAll() {
        while (this.stack.length > 0) {
            this.close(this.stack[this.stack.length - 1].owner);
        }
    }

    /** Shared Tab trap. Call only for the top modal's Tab keydown. */
    trapTab(event, panel) {
        if (event.key !== 'Tab' || !panel) return;
        const focusable = focusableElements(panel);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            event.stopPropagation();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            event.stopPropagation();
            first.focus();
        }
    }
}

function focusableElements(panel) {
    return Array.from(
        panel.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')
    ).filter((element) => element.offsetParent !== null);
}

function firstFocusable(panel) {
    return focusableElements(panel)[0] || null;
}
