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
        this.canvas.setAttribute('aria-label', 'Survey chart of the archipelago');
        this.canvas.setAttribute('role', 'img');

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
        const map = this.game.map;
        const width = this.resolution;
        const height = this.resolution;
        const scale = width / this.size;
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.clearRect(0, 0, this.size, this.size);

        // Deep water.
        const water = ctx.createLinearGradient(0, 0, 0, this.size);
        water.addColorStop(0, '#3a163c');
        water.addColorStop(0.55, '#561a49');
        water.addColorStop(1, '#2a1034');
        ctx.fillStyle = water;
        ctx.fillRect(0, 0, this.size, this.size);

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
            ctx.fillStyle = 'rgba(255, 248, 234, 0.55)';
            ctx.font = '700 9px "Space Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('NO SURVEY', this.size / 2, this.size / 2);
            return;
        }

        if (this.seedEl && this.lastSeed !== this.game.stateManager?.settings?.mapSeed) {
            this.lastSeed = this.game.stateManager?.settings?.mapSeed;
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
        const project = (x, y) => ({ x: x * fit + offsetX, y: y * fit + offsetY });

        // Islands: a tinted fill, an ink coast and a second highlight stroke.
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
            ctx.fillStyle = 'rgba(89, 227, 194, 0.22)';
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

        // Buildings.
        for (const building of this.game.buildingManager.buildings) {
            const position = project(building.container.x, building.container.y);
            if (building.state === 'ACTIVE') {
                ctx.fillStyle = '#ffd36e';
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

        // The Beacon gets a little halo.
        const beacon = this.game.buildingManager.buildings.find((building) => building.blueprintId === 'aurora_beacon');
        if (beacon) {
            const p = project(beacon.container.x, beacon.container.y);
            ctx.strokeStyle = 'rgba(201, 182, 255, 0.9)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Camera viewport.
        const camera = this.game.camera;
        const screen = this.game.app.screen;
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
}
