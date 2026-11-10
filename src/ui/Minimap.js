/**
 * Small 2D minimap.
 *
 * It shows the generated island sectors, buildings, and the camera viewport.
 * Besides being useful for orientation on the 5x map, it gives the browser test
 * harness a Canvas2D surface it can sample (the main Pixi canvas is WebGL).
 */
export class Minimap {
    constructor(game) {
        this.game = game;
        this.size = 160;

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'minimap';
        this.canvas.dataset.testid = 'minimap';
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.canvas.style.cssText = `
            position: fixed;
            left: 16px;
            bottom: 16px;
            width: ${this.size}px;
            height: ${this.size}px;
            background: rgba(10, 14, 28, 0.78);
            border: 1px solid rgba(255, 255, 255, 0.25);
            border-radius: 4px;
            z-index: 100;
            pointer-events: none;
        `;

        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
    }

    update() {
        const ctx = this.ctx;
        const size = this.size;
        ctx.clearRect(0, 0, size, size);

        // Panel background.
        ctx.fillStyle = 'rgba(10, 14, 28, 0.78)';
        ctx.fillRect(0, 0, size, size);

        const map = this.game.map;
        if (!map || map.sectors.length === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.font = '600 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('FALESC', size / 2, size / 2);
            return;
        }

        // Fit every island into the panel.
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

        const padding = 8;
        const contentSize = size - padding * 2;
        const worldWidth = Math.max(1, maxX - minX);
        const worldHeight = Math.max(1, maxY - minY);
        const scale = Math.min(contentSize / worldWidth, contentSize / worldHeight);
        const offsetX = padding + (contentSize - worldWidth * scale) / 2 - minX * scale;
        const offsetY = padding + (contentSize - worldHeight * scale) / 2 - minY * scale;
        const project = (x, y) => ({ x: x * scale + offsetX, y: y * scale + offsetY });

        // Islands.
        for (const sector of map.sectors) {
            ctx.beginPath();
            const first = project(sector.shape[0].x, sector.shape[0].y);
            ctx.moveTo(first.x, first.y);
            for (let i = 1; i < sector.shape.length; i++) {
                const point = project(sector.shape[i].x, sector.shape[i].y);
                ctx.lineTo(point.x, point.y);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(90, 125, 105, 0.75)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(220, 205, 170, 0.7)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Buildings, coloured by lifecycle state.
        for (const building of this.game.buildingManager.buildings) {
            const position = project(building.container.x, building.container.y);
            ctx.fillStyle = building.state === 'ACTIVE'
                ? 'rgba(240, 240, 240, 0.95)'
                : 'rgba(150, 210, 255, 0.9)';
            ctx.fillRect(position.x - 1.5, position.y - 1.5, 3, 3);
        }

        // Camera viewport.
        const camera = this.game.camera;
        const screen = this.game.app.screen;
        const topLeft = camera.screenToWorld(0, 0);
        const bottomRight = camera.screenToWorld(screen.width, screen.height);
        const viewTopLeft = project(topLeft.x, topLeft.y);
        const viewBottomRight = project(bottomRight.x, bottomRight.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            viewTopLeft.x,
            viewTopLeft.y,
            viewBottomRight.x - viewTopLeft.x,
            viewBottomRight.y - viewTopLeft.y
        );
    }
}
