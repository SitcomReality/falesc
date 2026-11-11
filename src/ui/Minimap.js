/**
 * Framed survey chart (2D minimap).
 *
 * The Pixi canvas is WebGL, so this Canvas2D surface is also what the browser
 * harness samples for "did something paint?".
 */
export class Minimap {
    constructor(game) {
        this.game = game;
        this.size = 176;
        this.resolution = 352;

        const mount = document.querySelector('[data-minimap-mount]') || document.body;

        this.wrapper = document.createElement('div');
        this.wrapper.className = 'chart';
        this.wrapper.innerHTML = `
            <div class="chart__head">
                <span class="kicker">Survey</span>
                <span class="chart__seed" data-role="seed">SEED —</span>
            </div>
        `;

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'minimap';
        this.canvas.dataset.testid = 'minimap';
        this.canvas.width = this.resolution;
        this.canvas.height = this.resolution;
        this.canvas.setAttribute('aria-label', 'Survey chart of the archipelago. Click to move the camera.');
        this.canvas.setAttribute('role', 'img');
        this.canvas.title = 'Click the chart to move the camera';
        this.canvas.addEventListener('click', (event) => this.onClick(event));
        this.projection = null;

        this.wrapper.appendChild(this.canvas);
        mount.appendChild(this.wrapper);
        if (!mount.closest('.hud__bottom')) {
            this.wrapper.style.position = 'fixed';
            this.wrapper.style.left = '16px';
            this.wrapper.style.bottom = '16px';
            this.wrapper.style.zIndex = '100';
            this.wrapper.style.pointerEvents = 'none';
        }

        this.ctx = this.canvas.getContext('2d');
        this.seedEl = this.wrapper.querySelector('[data-role=seed]');
        this.lastSeed = null;
    }

    update() {
        const ctx = this.ctx;
        const map = this.game.world?.map;
        const width = this.resolution;
        const height = this.resolution;
        const scale = width / this.size;
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.clearRect(0, 0, this.size, this.size);

        // Warm void, not water.
        const voidGradient = ctx.createRadialGradient(this.size * 0.62, this.size * 0.42, 8, this.size * 0.5, this.size * 0.5, this.size * 0.8);
        voidGradient.addColorStop(0, '#4f1a49');
        voidGradient.addColorStop(0.55, '#341436');
        voidGradient.addColorStop(1, '#1c0d24');
        ctx.fillStyle = voidGradient;
        ctx.fillRect(0, 0, this.size, this.size);

        // Stars.
        ctx.fillStyle = 'rgba(255, 242, 216, 0.42)';
        for (let index = 0; index < 34; index++) {
            const x = (index * 73) % this.size;
            const y = (index * 41 + 13) % this.size;
            ctx.fillRect(x, y, 0.8, 0.8);
        }

        // Chart graticule.
        ctx.strokeStyle = 'rgba(255, 242, 216, 0.09)';
        ctx.lineWidth = 0.7;
        for (let i = 1; i < 8; i++) {
            const p = (this.size / 8) * i;
            ctx.beginPath();
            ctx.moveTo(p, 0);
            ctx.lineTo(p, this.size);
            ctx.moveTo(0, p);
            ctx.lineTo(this.size, p);
            ctx.stroke();
        }

        // Compass tick in the corner.
        ctx.strokeStyle = 'rgba(255, 242, 216, 0.3)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(this.size - 16, 16, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.size - 16, 6);
        ctx.lineTo(this.size - 16, 10);
        ctx.stroke();

        if (!map || map.sectors.length === 0) {
            this.projection = null;
            ctx.fillStyle = 'rgba(255, 248, 234, 0.55)';
            ctx.font = '700 9px "Space Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('NO SURVEY', this.size / 2, this.size / 2);
            return;
        }

        if (this.seedEl && this.lastSeed !== this.game.settings?.mapSeed) {
            this.lastSeed = this.game.settings?.mapSeed;
            this.seedEl.textContent = `SEED ${this.lastSeed}`;
        }

        // Fit every island into the chart.
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const sector of map.sectors) {
            for (const point of sector.shape) {
                if (point.x < minX) minX = point.x;
                if (point.y < minY) minY = point.y;
                if (point.x > maxX) maxX = point.x;
                if (point.y > maxY) maxY = point.y;
            }
        }

        const padding = 13;
        const contentSize = this.size - padding * 2;
        const worldWidth = Math.max(1, maxX - minX);
        const worldHeight = Math.max(1, maxY - minY);
        const fit = Math.min(contentSize / worldWidth, contentSize / worldHeight);
        const offsetX = padding + (contentSize - worldWidth * fit) / 2 - minX * fit;
        const offsetY = padding + (contentSize - worldHeight * fit) / 2 - minY * fit;
        this.projection = { scale: fit, offsetX, offsetY };
        const project = (x, y) => ({ x: x * fit + offsetX, y: y * fit + offsetY });

        // Islands: a dusty fill, an ink coast and a second highlight stroke.
        for (const sector of map.sectors) {
            if (!sector.shape.length) continue;
            ctx.beginPath();
            const first = project(sector.shape[0].x, sector.shape[0].y);
            ctx.moveTo(first.x, first.y);
            for (let i = 1; i < sector.shape.length; i++) {
                const point = project(sector.shape[i].x, sector.shape[i].y);
                ctx.lineTo(point.x, point.y);
            }
            ctx.closePath();
            ctx.fillStyle = sector === map.homeSector ? 'rgba(255, 160, 122, 0.36)' : 'rgba(201, 182, 255, 0.2)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 242, 216, 0.75)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.save();
            ctx.translate(0, 1);
            ctx.strokeStyle = 'rgba(255, 107, 94, 0.45)';
            ctx.lineWidth = 0.6;
            ctx.stroke();
            ctx.restore();
        }

        // Services.
        const services = this.game.charter?.services.services || [];
        for (const service of services) {
            const position = project(service.container.x, service.container.y);
            if (service.state === 'ACTIVE' && !service.closed) {
                ctx.fillStyle = service.programId === 'housing' ? '#ffa07a' : '#ffd36e';
                ctx.fillRect(position.x - 2, position.y - 2, 4, 4);
                ctx.strokeStyle = 'rgba(33, 18, 37, 0.85)';
                ctx.lineWidth = 0.7;
                ctx.strokeRect(position.x - 2, position.y - 2, 4, 4);
            } else {
                ctx.strokeStyle = '#fff2d8';
                ctx.lineWidth = 1;
                ctx.strokeRect(position.x - 1.5, position.y - 1.5, 3, 3);
            }
        }

        // Residents as tiny warm dots.
        if (this.game.crowd) {
            ctx.fillStyle = 'rgba(255, 79, 154, 0.85)';
            for (const agent of this.game.crowd.agents.values()) {
                if (agent.hidden) continue;
                const position = project(agent.character.x, agent.character.y);
                ctx.fillRect(position.x - 1, position.y - 1, 2, 2);
            }
        }

        // Camera viewport.
        const camera = this.game.world.camera;
        const screen = this.game.world.app.screen;
        const topLeft = camera.screenToWorld(0, 0);
        const bottomRight = camera.screenToWorld(screen.width, screen.height);
        const viewTopLeft = project(topLeft.x, topLeft.y);
        const viewBottomRight = project(bottomRight.x, bottomRight.y);
        const viewWidth = Math.min(this.size - 4, viewBottomRight.x - viewTopLeft.x);
        const viewHeight = Math.min(this.size - 4, viewBottomRight.y - viewTopLeft.y);
        ctx.strokeStyle = 'rgba(255, 107, 94, 0.95)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(
            Math.max(2, Math.min(this.size - 3, viewTopLeft.x)),
            Math.max(2, Math.min(this.size - 3, viewTopLeft.y)),
            viewWidth,
            viewHeight
        );
    }

    onClick(event) {
        if (!this.projection || !this.game.world?.map) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * this.size;
        const y = ((event.clientY - rect.top) / rect.height) * this.size;
        const worldX = (x - this.projection.offsetX) / this.projection.scale;
        const worldY = (y - this.projection.offsetY) / this.projection.scale;
        this.game.world.camera.position.x = worldX;
        this.game.world.camera.position.y = worldY;
        this.game.world.camera.updateTransform();
    }
}
