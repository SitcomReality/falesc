import { PROGRAM_BY_ID } from '../design/programs.js';
import { BuildingRenderer } from '../buildings/BuildingRenderer.js';

/**
 * Keyboard build cursor and the shared placement preview. Both are planning
 * views over the charter: this class never builds; confirming opens the normal
 * build dialog with a pending location.
 */
export class BuildCursor {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.cursor = null;
    }

    findGridTarget(x, y) {
        for (const sector of this.game.buildableSectors()) {
            const cell = sector.getGridCell(x, y);
            if (cell.u < 0 || cell.v < 0 || cell.u >= sector.gridSize || cell.v >= sector.gridSize) continue;
            return { sector, u: Math.floor(cell.u), v: Math.floor(cell.v) };
        }
        return null;
    }

    paint(target, program) {
        const world = this.game.world;
        const check = this.game.charter.services.canPlace(program.id, target.sector.id, target.u, target.v);
        const key = `${target.sector.id}:${target.u}:${target.v}:${program.id}:${check.ok}`;
        if (key === world.hoverCellKey) return;
        world.hoverCellKey = key;

        const width = program.footprint.w;
        const height = program.footprint.h;
        world.hoverG.clear();
        for (let dv = 0; dv < height; dv++) {
            for (let du = 0; du < width; du++) {
                this.drawCellHighlight(target.sector, target.u + du, target.v + dv, check.ok);
            }
        }

        world.hoverGhostG.clear();
        if (check.ok) {
            const center = target.sector._project(target.u + width / 2, target.v + height / 2);
            world.hoverGhost.position.set(center.x, center.y);
            BuildingRenderer.draw(world.hoverGhostG, {
                programId: program.id,
                blueprintId: program.id,
                state: 'PENDING'
            });
            world.hoverGhost.alpha = 0.34;
            world.hoverGhost.visible = true;
        } else {
            world.hoverGhost.visible = false;
        }
    }

    drawCellHighlight(sector, u, v, valid) {
        if (u < 0 || v < 0 || u >= sector.gridSize || v >= sector.gridSize) return;
        const corners = [
            sector._project(u, v),
            sector._project(u + 1, v),
            sector._project(u + 1, v + 1),
            sector._project(u, v + 1)
        ];
        const world = this.game.world;
        world.hoverG.beginFill(valid ? 0x59e3c2 : 0xff6b5e, valid ? 0.2 : 0.14);
        world.hoverG.lineStyle(2.5, 0x211225, 0.9);
        world.hoverG.moveTo(corners[0].x, corners[0].y);
        for (let index = 1; index < corners.length; index++) {
            world.hoverG.lineTo(corners[index].x, corners[index].y);
        }
        world.hoverG.closePath();
        world.hoverG.endFill();
    }

    toggle() {
        const game = this.game;
        if (!game.charter || game.screenStateMachine.state !== 'PLAYING' || game.hasBlockingModal()) return false;
        if (this.active) {
            this.clear();
            return false;
        }
        const home = game.world.homeSector;
        const program = PROGRAM_BY_ID[game.selectedProgramId];
        const maxU = Math.max(0, home.gridSize - (program?.footprint?.w || 1));
        const maxV = Math.max(0, home.gridSize - (program?.footprint?.h || 1));
        this.cursor = {
            sectorId: home.id,
            u: Math.min(maxU, Math.floor(home.gridSize / 2)),
            v: Math.min(maxV, Math.floor(home.gridSize / 2))
        };
        this.active = true;
        game.world.input.setCameraSuppressed(true);
        this.render();
        game.gameScreen.announceCursor('Build cursor on. Arrow keys move, G switches isle, Enter opens the build dialog, Escape leaves.');
        game.gameScreen.toast('Build cursor: arrows move, G switches isle, Enter opens, Esc leaves.', 'mint', 3200);
        return true;
    }

    move(dx, dy) {
        if (!this.active || !this.cursor) return false;
        const sectors = this.game.buildableSectors();
        const sector = sectors.find((entry) => entry.id === this.cursor.sectorId) || sectors[0];
        const program = PROGRAM_BY_ID[this.game.selectedProgramId];
        const maxU = Math.max(0, sector.gridSize - (program?.footprint?.w || 1));
        const maxV = Math.max(0, sector.gridSize - (program?.footprint?.h || 1));
        this.cursor.u = Math.max(0, Math.min(maxU, this.cursor.u + dx));
        this.cursor.v = Math.max(0, Math.min(maxV, this.cursor.v + dy));
        this.render();
        return true;
    }

    switchSector() {
        if (!this.active || !this.cursor) return false;
        const sectors = this.game.buildableSectors();
        if (sectors.length < 2) return false;
        const current = this.cursor.sectorId;
        const next = sectors.find((sector) => sector.id !== current) || sectors[0];
        const program = PROGRAM_BY_ID[this.game.selectedProgramId];
        this.cursor = {
            sectorId: next.id,
            u: Math.max(0, Math.min(next.gridSize - (program?.footprint?.w || 1), Math.floor(next.gridSize / 2))),
            v: Math.max(0, Math.min(next.gridSize - (program?.footprint?.h || 1), Math.floor(next.gridSize / 2)))
        };
        this.render();
        return true;
    }

    render() {
        const game = this.game;
        if (!this.active || !this.cursor || !game.charter) {
            game.world.clearHover();
            return;
        }
        const sector = game.buildableSectors().find((entry) => entry?.id === this.cursor.sectorId);
        if (!sector) {
            this.clear();
            return;
        }
        const program = PROGRAM_BY_ID[game.selectedProgramId];
        if (!program) {
            game.world.clearHover();
            return;
        }
        this.paint({ sector, u: this.cursor.u, v: this.cursor.v }, program);
        const check = game.charter.services.canPlace(program.id, sector.id, this.cursor.u, this.cursor.v);
        const isle = sector.garden ? 'garden isle' : sector.commons ? 'commons isle' : 'home shard';
        game.gameScreen.announceCursor(`Build cursor on the ${isle}, cell ${this.cursor.u}, ${this.cursor.v}. ${check.ok ? 'Plot is free.' : check.reason}`);
    }

    confirm() {
        const game = this.game;
        if (!this.active || !this.cursor || !game.charter) return false;
        const sector = game.buildableSectors().find((entry) => entry?.id === this.cursor.sectorId);
        if (!sector) return false;
        const u = this.cursor.u;
        const v = this.cursor.v;
        const existing = game.charter.services.serviceAt(sector.id, u, v);
        this.clear();
        if (existing) {
            if (existing.isTransit) {
                game.gameScreen.toast('The shuttle docks here. Build on the outer isle from the same dock.', 'mint', 2200);
            } else if (existing.id === game.charter.commons.serviceId) {
                game.showCommons();
            } else {
                game.serviceCard.show(existing);
            }
            return true;
        }
        const program = PROGRAM_BY_ID[game.selectedProgramId];
        if (!program) return false;
        const check = game.charter.services.canPlace(program.id, sector.id, u, v);
        if (!check.ok) {
            game.gameScreen.toast(check.reason, 'coral');
            return false;
        }
        const sharedCapital = sector.commons ? (game.charter.commons?.capital || 0) : 0;
        const affordable = game.charter.canBuild(program.id, 'comfortable', sharedCapital);
        if (!affordable.ok) {
            game.gameScreen.toast(affordable.reason, 'coral');
            return false;
        }
        game.pendingBuildLocation = { sectorId: sector.id, u, v };
        game.buildModal.show(program, { lumen: game.charter.lumen + sharedCapital, works: game.charter.works });
        return true;
    }

    clear() {
        this.game.gameScreen?.announceCursor?.('Build cursor off.');
        this.active = false;
        this.cursor = null;
        this.game.world.input.setCameraSuppressed(false);
        this.game.world.clearHover();
    }
}
