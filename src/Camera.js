export class Camera {
    constructor(app, worldContainer, onWorldTap, inputManager) {
        this.app = app;
        this.world = worldContainer;
        this.onWorldTap = onWorldTap;
        this.input = inputManager;

        this.position = { x: app.screen.width / 2, y: app.screen.height / 2 };
        this.zoom = 1;
        this.minZoom = 0.2;
        this.maxZoom = 4.0;

        // Configuration
        this.panSpeed = 800; // Pixels per second

        // Input State
        this.pointers = new Map(); // id -> {x, y, startX, startY, startTime, isTap}
        this.isMousePanning = false; // Middle mouse drag

        // Multi-touch State
        this.lastTouchDist = 0;
        this.lastTouchCenter = null;

        this.init();
    }

    init() {
        const view = this.app.view;
        
        // Disable context menu for cleaner right/long clicks
        view.addEventListener('contextmenu', e => e.preventDefault());

        // Pointer Events (Mouse & Touch)
        view.addEventListener('pointerdown', e => this.onPointerDown(e));
        view.addEventListener('pointermove', e => this.onPointerMove(e));
        view.addEventListener('pointerup', e => this.onPointerUp(e));
        view.addEventListener('pointercancel', e => this.onPointerUp(e));
        view.addEventListener('pointerleave', e => this.onPointerUp(e));
        
        // Wheel Zoom
        view.addEventListener('wheel', e => this.onWheel(e), { passive: false });
    }

    update(dt) {
        // Keyboard / keybinding-based panning
        let dx = 0;
        let dy = 0;

        if (this.input && this.input.isActionActive('camera_pan_up')) dy -= 1;
        if (this.input && this.input.isActionActive('camera_pan_down')) dy += 1;
        if (this.input && this.input.isActionActive('camera_pan_left')) dx -= 1;
        if (this.input && this.input.isActionActive('camera_pan_right')) dx += 1;

        if (dx !== 0 || dy !== 0) {
            // Normalize diagonal speed
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len; dy /= len;
            
            // Move faster when zoomed out to cover ground
            const moveSpeed = this.panSpeed * dt / this.zoom;
            this.position.x += dx * moveSpeed;
            this.position.y += dy * moveSpeed;
            
            this.updateTransform();
        }
    }

    onWheel(e) {
        e.preventDefault();
        const zoomStep = 1.1;
        // Scroll up (negative delta) = Zoom In
        const factor = e.deltaY > 0 ? 1/zoomStep : zoomStep;
        this.zoomAt(e.clientX, e.clientY, factor);
    }

    zoomAt(screenX, screenY, factor) {
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
        if (newZoom === this.zoom) return;

        // Calculate world position under the pointer before zoom
        const worldPos = this.screenToWorld(screenX, screenY);
        
        this.zoom = newZoom;
        
        // Adjust camera position so that worldPos remains under screenX, screenY
        // Formula derived from screenToWorld inverse
        const cx = this.app.screen.width / 2;
        const cy = this.app.screen.height / 2;
        
        this.position.x = worldPos.x - (screenX - cx) / this.zoom;
        this.position.y = worldPos.y - (screenY - cy) / this.zoom;

        this.updateTransform();
    }

    screenToWorld(sx, sy) {
        const cx = this.app.screen.width / 2;
        const cy = this.app.screen.height / 2;
        return {
            x: this.position.x + (sx - cx) / this.zoom,
            y: this.position.y + (sy - cy) / this.zoom
        };
    }

    updateTransform() {
        // Apply to container
        this.world.scale.set(this.zoom);
        
        // Center the camera on this.position
        const cx = this.app.screen.width / 2;
        const cy = this.app.screen.height / 2;
        
        this.world.x = cx - this.position.x * this.zoom;
        this.world.y = cy - this.position.y * this.zoom;
    }

    onPointerDown(e) {
        // Track pointer
        this.pointers.set(e.pointerId, {
            x: e.clientX,
            y: e.clientY,
            startX: e.clientX,
            startY: e.clientY,
            startTime: performance.now(),
            isTap: true
        });

        // Check Middle Mouse Button for Desktop Pan
        if (e.pointerType === 'mouse' && e.button === 1) {
            this.isMousePanning = true;
            e.preventDefault();
        }

        // Reset multi-touch tracking on new press
        if (this.pointers.size >= 2) {
            // Cancel tap for all if multi-touch begins (avoids accidental taps during pinch)
            for(let p of this.pointers.values()) p.isTap = false;
            this.lastTouchDist = 0;
        }
    }

    onPointerMove(e) {
        const ptr = this.pointers.get(e.pointerId);
        if (!ptr) return;

        const prevX = ptr.x;
        const prevY = ptr.y;
        ptr.x = e.clientX;
        ptr.y = e.clientY;

        // Tap Threshold Check (if moved > 10px, it's not a tap)
        const distMoved = Math.hypot(ptr.x - ptr.startX, ptr.y - ptr.startY);
        if (distMoved > 10) ptr.isTap = false;

        // Interaction Logic
        if (e.pointerType === 'mouse') {
            if (this.isMousePanning) {
                const dx = e.clientX - prevX;
                const dy = e.clientY - prevY;
                this.position.x -= dx / this.zoom;
                this.position.y -= dy / this.zoom;
                this.updateTransform();
            }
        } else {
            // Touch Logic
            if (this.pointers.size === 1) {
                // 1-finger Pan
                const dx = e.clientX - prevX;
                const dy = e.clientY - prevY;
                this.position.x -= dx / this.zoom;
                this.position.y -= dy / this.zoom;
                this.updateTransform();
            } else if (this.pointers.size === 2) {
                // 2-finger Pinch/Pan
                const ptrs = Array.from(this.pointers.values());
                const p1 = ptrs[0];
                const p2 = ptrs[1];

                const currDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                const currCenter = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };

                if (this.lastTouchDist > 0) {
                    // Zoom
                    const scale = currDist / this.lastTouchDist;
                    this.zoomAt(currCenter.x, currCenter.y, scale);

                    // Pan (movement of the midpoint)
                    const dx = currCenter.x - this.lastTouchCenter.x;
                    const dy = currCenter.y - this.lastTouchCenter.y;
                    this.position.x -= dx / this.zoom;
                    this.position.y -= dy / this.zoom;
                    
                    this.updateTransform();
                }

                this.lastTouchDist = currDist;
                this.lastTouchCenter = currCenter;
            }
        }
    }

    onPointerUp(e) {
        const ptr = this.pointers.get(e.pointerId);
        if (ptr) {
            // Check for Tap
            // Conditions: labeled isTap, short duration, single touch (unless mouse)
            const isShort = (performance.now() - ptr.startTime) < 400;
            if (ptr.isTap && isShort) {
                // Ignore middle mouse clicks for tap
                if (e.button !== 1) {
                    // Only trigger if we aren't currently doing a multi-touch gesture
                    if (this.pointers.size === 1 && !this.isMousePanning) {
                        const worldPos = this.screenToWorld(ptr.x, ptr.y);
                        this.onWorldTap(worldPos.x, worldPos.y);
                    }
                }
            }
            this.pointers.delete(e.pointerId);
        }

        // End Mouse Pan
        if (e.pointerType === 'mouse' && e.button === 1) {
            this.isMousePanning = false;
        }

        // Reset multi-touch state if fingers drop below 2
        if (this.pointers.size < 2) {
            this.lastTouchDist = 0;
        }
    }
}