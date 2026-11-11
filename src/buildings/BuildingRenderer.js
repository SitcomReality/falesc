import { BLUEPRINT_BY_ID } from './blueprints.js';

const INK = 0x211225;
const CREAM = 0xfff2d8;
const PAPER = 0xffe4b5;
const CORAL = 0xff6b5e;
const CORAL_DARK = 0xc73d61;
const MINT = 0x59e3c2;
const MINT_LIGHT = 0xa8f5dc;
const CYAN = 0x36c6d9;
const LAVENDER = 0xc9b6ff;
const SUN = 0xffd36e;
const WINE = 0x7d2148;
const SAND = 0xf3d9ae;

/**
 * Draws every blueprint as a small illustrated object rather than a grey box.
 * Under-construction states are the same silhouette, ghosted and scaffolded, so
 * the player can read what is coming before it finishes.
 */
export class BuildingRenderer {
    static draw(graphics, building) {
        graphics.clear();
        const blueprint = BLUEPRINT_BY_ID[building.blueprintId] || BLUEPRINT_BY_ID.prism_rig;
        const active = building.state === 'ACTIVE';
        const ghost = !active;

        BuildingRenderer.drawShadow(graphics, ghost);

        switch (blueprint.id) {
            case 'tide_garden':
                BuildingRenderer.drawTideGarden(graphics, ghost, active);
                break;
            case 'lantern_house':
                BuildingRenderer.drawLanternHouse(graphics, ghost, active);
                break;
            case 'aurora_beacon':
                BuildingRenderer.drawBeacon(graphics, ghost, active);
                break;
            case 'prism_rig':
            default:
                BuildingRenderer.drawPrismRig(graphics, ghost, active);
                break;
        }

        if (building.bonusIncome > 0) BuildingRenderer.drawAffinityCluster(graphics);

        if (ghost) BuildingRenderer.drawScaffold(graphics, building.state === 'PENDING');
    }

    static drawAffinityCluster(graphics) {
        // A small living-crystal outcrop marks a structure with crystal affinity.
        graphics.beginFill(MINT, 0.16);
        graphics.lineStyle(0);
        graphics.drawCircle(-88, 50, 24);
        graphics.endFill();

        const shards = [
            { x: -104, y: 52, w: 9, h: 30 },
            { x: -92, y: 58, w: 7, h: 21 },
            { x: -113, y: 58, w: 6, h: 17 }
        ];
        for (const shard of shards) {
            graphics.beginFill(shard.h === 30 ? MINT : MINT_LIGHT, 0.95);
            graphics.lineStyle(2, INK, 1);
            graphics.moveTo(shard.x, shard.y - shard.h);
            graphics.lineTo(shard.x + shard.w, shard.y - shard.h * 0.35);
            graphics.lineTo(shard.x + shard.w / 2, shard.y + 4);
            graphics.lineTo(shard.x - shard.w / 2, shard.y - shard.h * 0.35);
            graphics.closePath();
            graphics.endFill();
        }
    }

    static outline(graphics, color = INK, width = 3, alpha = 1) {
        graphics.lineStyle(width, color, alpha);
    }

    static isoDiamond(graphics, cx, cy, halfW, halfH, fill, alpha = 1, stroke = INK, lineWidth = 3) {
        graphics.beginFill(fill, alpha);
        graphics.lineStyle(lineWidth, stroke, 1);
        graphics.moveTo(cx, cy - halfH);
        graphics.lineTo(cx + halfW, cy);
        graphics.lineTo(cx, cy + halfH);
        graphics.lineTo(cx - halfW, cy);
        graphics.closePath();
        graphics.endFill();
    }

    static face(graphics, points, fill, alpha = 1, stroke = INK, lineWidth = 3) {
        graphics.beginFill(fill, alpha);
        graphics.lineStyle(lineWidth, stroke, 1);
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            graphics.lineTo(points[i].x, points[i].y);
        }
        graphics.closePath();
        graphics.endFill();
    }

    static limb(graphics, points, color, width = 7, alpha = 1) {
        graphics.lineStyle(width, INK, alpha);
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) graphics.lineTo(points[i].x, points[i].y);
        graphics.lineStyle(Math.max(2, width - 3), color, alpha);
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) graphics.lineTo(points[i].x, points[i].y);
    }

    static drawShadow(graphics, ghost) {
        // Flat SE shadow, aligned with the isometric grid.
        graphics.beginFill(INK, ghost ? 0.12 : 0.22);
        graphics.lineStyle(0);
        graphics.moveTo(64, 0);
        graphics.lineTo(206, 52);
        graphics.lineTo(140, 94);
        graphics.lineTo(-12, 42);
        graphics.closePath();
        graphics.endFill();
    }

    static drawScaffold(graphics, pending) {
        const alpha = pending ? 0.58 : 0.4;
        graphics.lineStyle(2, CREAM, alpha);
        graphics.moveTo(-126, -12);
        graphics.lineTo(0, -208);
        graphics.lineTo(126, -12);
        graphics.moveTo(-92, 46);
        graphics.lineTo(0, -150);
        graphics.lineTo(92, 46);
        graphics.lineStyle(1.5, MINT, alpha * 0.9);
        graphics.moveTo(-126, -112);
        graphics.lineTo(126, -112);
        graphics.moveTo(-70, -76);
        graphics.lineTo(70, -76);
    }

    /* ------------------------------------------------------------------ */
    /* Prism Rig                                                           */
    /* ------------------------------------------------------------------ */
    static drawPrismRig(graphics, ghost, active) {
        const base = active ? PAPER : 0x6a5260;
        const baseDark = active ? SAND : 0x4b3548;
        const beam = active ? CORAL : 0x8f7b88;
        const crystal = active ? MINT : 0x9bcfc4;

        // Platform
        BuildingRenderer.isoDiamond(graphics, 0, 12, 128, 54, baseDark, 1);
        BuildingRenderer.isoDiamond(graphics, 0, 0, 116, 48, base, 1);
        graphics.beginFill(0xffffff, active ? 0.18 : 0.05);
        graphics.lineStyle(0);
        graphics.moveTo(-74, -18);
        graphics.lineTo(0, 0);
        graphics.lineTo(74, -18);
        graphics.lineTo(0, -36);
        graphics.closePath();
        graphics.endFill();

        // Winch
        graphics.lineStyle(4, INK, 1);
        graphics.beginFill(active ? WINE : 0x5c4554, 1);
        graphics.drawCircle(0, 4, 16);
        graphics.endFill();
        graphics.beginFill(active ? SUN : 0xb7a99d, 1);
        graphics.drawCircle(0, 4, 6);
        graphics.endFill();

        // Derrick legs
        BuildingRenderer.limb(graphics, [{ x: -106, y: 24 }, { x: -8, y: -156 }, { x: 0, y: -176 }], beam, 8);
        BuildingRenderer.limb(graphics, [{ x: 106, y: 24 }, { x: 8, y: -156 }, { x: 0, y: -176 }], beam, 8);
        BuildingRenderer.limb(graphics, [{ x: 0, y: 54 }, { x: 0, y: -176 }], beam, 6);
        BuildingRenderer.limb(graphics, [{ x: -74, y: 38 }, { x: 74, y: 38 }], beam, 4);
        BuildingRenderer.limb(graphics, [{ x: -42, y: -48 }, { x: 42, y: -48 }], beam, 3);

        // A small platform at the working height.
        BuildingRenderer.isoDiamond(graphics, 0, -98, 42, 18, active ? CORAL : 0x7d6674, 1);

        // Glow + crystal.
        graphics.beginFill(active ? MINT_LIGHT : 0xbfe4dd, active ? 0.16 : 0.08);
        graphics.lineStyle(0);
        graphics.drawCircle(0, -214, 58);
        graphics.endFill();

        graphics.beginFill(crystal, 1);
        graphics.lineStyle(3, INK, 1);
        graphics.moveTo(0, -268);
        graphics.lineTo(30, -214);
        graphics.lineTo(0, -168);
        graphics.lineTo(-30, -214);
        graphics.closePath();
        graphics.endFill();

        graphics.beginFill(active ? 0xffffff : 0xd8ede9, active ? 0.62 : 0.2);
        graphics.lineStyle(0);
        graphics.moveTo(0, -268);
        graphics.lineTo(30, -214);
        graphics.lineTo(0, -202);
        graphics.lineTo(-12, -214);
        graphics.closePath();
        graphics.endFill();

        if (active) {
            graphics.lineStyle(2, CREAM, 0.8);
            graphics.moveTo(-11, -228);
            graphics.lineTo(0, -250);
            graphics.lineTo(11, -228);
            graphics.lineStyle(0);
        }

        // Flag.
        BuildingRenderer.limb(graphics, [{ x: 12, y: -176 }, { x: 12, y: -206 }], CREAM, 3);
        BuildingRenderer.face(graphics, [{ x: 13, y: -204 }, { x: 41, y: -196 }, { x: 13, y: -188 }], active ? CORAL : 0x8f7b88, 1, INK, 2);
    }

    /* ------------------------------------------------------------------ */
    /* Tide Garden                                                         */
    /* ------------------------------------------------------------------ */
    static drawTideGarden(graphics, ghost, active) {
        const stone = active ? PAPER : 0x6a5260;
        const stoneDark = active ? 0xd5b98e : 0x4b3548;
        const water = active ? CYAN : 0x7c9da3;
        const waterLight = active ? MINT_LIGHT : 0x9fb8bb;
        const leaf = active ? 0x2f9e7f : 0x6c8077;
        const leafLight = active ? MINT : 0x9bb2a8;

        // Lower terrace.
        BuildingRenderer.isoDiamond(graphics, 0, 24, 138, 58, stoneDark, 1);
        BuildingRenderer.isoDiamond(graphics, 0, 12, 126, 52, stone, 1);
        BuildingRenderer.isoDiamond(graphics, 0, 12, 96, 38, water, 1, INK, 2);
        graphics.beginFill(waterLight, active ? 0.65 : 0.2);
        graphics.lineStyle(0);
        graphics.moveTo(-52, 2);
        graphics.lineTo(8, 14);
        graphics.lineTo(52, 4);
        graphics.lineTo(-8, -8);
        graphics.closePath();
        graphics.endFill();

        // Upper terrace, offset toward the back.
        BuildingRenderer.isoDiamond(graphics, -18, -44, 84, 36, stoneDark, 1);
        BuildingRenderer.isoDiamond(graphics, -18, -54, 74, 31, stone, 1);
        BuildingRenderer.isoDiamond(graphics, -18, -54, 54, 22, water, 1, INK, 2);
        graphics.beginFill(waterLight, active ? 0.6 : 0.2);
        graphics.lineStyle(0);
        graphics.moveTo(-48, -60);
        graphics.lineTo(-18, -52);
        graphics.lineTo(10, -60);
        graphics.lineTo(-18, -68);
        graphics.closePath();
        graphics.endFill();

        // Spill between terraces.
        graphics.lineStyle(5, active ? waterLight : 0x9fb8bb, active ? 0.9 : 0.3);
        graphics.moveTo(26, -38);
        graphics.quadraticCurveTo(34, -18, 24, -2);
        graphics.lineStyle(2, INK, 0.6);
        graphics.moveTo(29, -38);
        graphics.quadraticCurveTo(37, -18, 27, -2);

        // Leaves and fronds.
        const fronds = [
            { x: -80, y: 14, rot: -0.75 },
            { x: 76, y: 20, rot: 0.7 },
            { x: 44, y: -70, rot: 0.35 },
            { x: -58, y: -84, rot: -0.4 }
        ];
        for (const frond of fronds) {
            graphics.save?.();
            const tipX = frond.x + Math.sin(frond.rot) * 54;
            const tipY = frond.y - 72;
            graphics.lineStyle(7, INK, 1);
            graphics.moveTo(frond.x, frond.y);
            graphics.quadraticCurveTo(frond.x + frond.rot * 18, frond.y - 36, tipX, tipY);
            graphics.lineStyle(4, leaf, 1);
            graphics.moveTo(frond.x, frond.y);
            graphics.quadraticCurveTo(frond.x + frond.rot * 18, frond.y - 36, tipX, tipY);

            graphics.beginFill(leafLight, 1);
            graphics.lineStyle(2.5, INK, 1);
            graphics.drawEllipse(tipX + 10, tipY + 4, 17, 7);
            graphics.endFill();
            graphics.beginFill(leaf, 1);
            graphics.drawEllipse(tipX - 9, tipY + 12, 16, 7);
            graphics.endFill();
            graphics.restore?.();
        }

        // Little flowers.
        const flowers = [
            { x: -96, y: 36, color: active ? CORAL : 0x8f7b88 },
            { x: 104, y: 34, color: active ? LAVENDER : 0x8f7b88 },
            { x: 12, y: 48, color: active ? SUN : 0x8f7b88 }
        ];
        for (const flower of flowers) {
            graphics.beginFill(flower.color, 1);
            graphics.lineStyle(1.5, INK, 1);
            graphics.drawCircle(flower.x, flower.y, 4);
            graphics.endFill();
        }
    }

    /* ------------------------------------------------------------------ */
    /* Lantern House                                                       */
    /* ------------------------------------------------------------------ */
    static drawLanternHouse(graphics, ghost, active) {
        const wall = active ? CREAM : 0x77616f;
        const wallShade = active ? SAND : 0x56424f;
        const roof = active ? CORAL : 0x8f7b88;
        const roofShade = active ? CORAL_DARK : 0x6a5965;
        const glow = active ? SUN : 0xc0b4a8;

        // Plinth.
        BuildingRenderer.isoDiamond(graphics, 0, 26, 118, 50, wallShade, 1);
        BuildingRenderer.isoDiamond(graphics, 0, 14, 106, 45, wall, 1);

        // Walls (iso box).
        const topY = -124;
        const bottomRight = { x: 86, y: 44 };
        const bottomLeft = { x: -86, y: 44 };
        const bottomFront = { x: 0, y: 86 };
        const bottomBack = { x: 0, y: 2 };

        BuildingRenderer.face(graphics, [
            { x: -86, y: 44 }, { x: 0, y: 86 }, { x: 0, y: topY + 30 }, { x: -86, y: topY - 12 }
        ], wallShade, 1);
        BuildingRenderer.face(graphics, [
            { x: 0, y: 86 }, { x: 86, y: 44 }, { x: 86, y: topY - 12 }, { x: 0, y: topY + 30 }
        ], wall, 1);

        // Roof: a hipped prism with a heavy ink line.
        BuildingRenderer.face(graphics, [
            { x: -100, y: topY - 10 }, { x: 0, y: topY + 34 }, { x: 0, y: topY - 46 }
        ], roof, 1);
        BuildingRenderer.face(graphics, [
            { x: 0, y: topY + 34 }, { x: 100, y: topY - 10 }, { x: 0, y: topY - 46 }
        ], roofShade, 1);
        BuildingRenderer.face(graphics, [
            { x: -100, y: topY - 10 }, { x: 0, y: topY - 46 }, { x: 100, y: topY - 10 }, { x: 0, y: topY - 60 }
        ], active ? CORAL : 0x9b8794, 1);

        // Chimney.
        BuildingRenderer.face(graphics, [
            { x: 42, y: topY - 44 }, { x: 58, y: topY - 38 }, { x: 58, y: topY - 78 }, { x: 42, y: topY - 84 }
        ], active ? PAPER : 0x8f7b88, 1);
        graphics.beginFill(INK, 1);
        graphics.lineStyle(0);
        graphics.moveTo(42, topY - 84);
        graphics.lineTo(58, topY - 78);
        graphics.lineTo(50, topY - 90);
        graphics.closePath();
        graphics.endFill();

        // Door and windows on the two visible faces.
        BuildingRenderer.face(graphics, [
            { x: -16, y: 48 }, { x: 10, y: 62 }, { x: 10, y: 8 }, { x: -16, y: -6 }
        ], active ? WINE : 0x4b3548, 1, INK, 2);
        graphics.beginFill(glow, active ? 1 : 0.4);
        graphics.lineStyle(1.5, INK, 1);
        graphics.moveTo(-10, 42);
        graphics.lineTo(4, 50);
        graphics.lineTo(4, 30);
        graphics.lineTo(-10, 22);
        graphics.closePath();
        graphics.endFill();

        graphics.beginFill(glow, active ? 0.95 : 0.3);
        graphics.lineStyle(2, INK, 1);
        graphics.moveTo(26, 50);
        graphics.lineTo(48, 38);
        graphics.lineTo(48, 8);
        graphics.lineTo(26, 20);
        graphics.closePath();
        graphics.endFill();
        graphics.lineStyle(1.5, INK, 1);
        graphics.moveTo(37, 44);
        graphics.lineTo(37, 14);
        graphics.moveTo(26, 35);
        graphics.lineTo(48, 23);

        // A lantern on a post, the house's little signature.
        const lx = 86;
        const ly = 16;
        BuildingRenderer.limb(graphics, [{ x: lx, y: ly }, { x: lx, y: -46 }, { x: lx + 22, y: -52 }], active ? INK : 0x5c4554, 3);
        graphics.beginFill(glow, active ? 1 : 0.35);
        graphics.lineStyle(2, INK, 1);
        graphics.drawCircle(lx + 23, -49, 7);
        graphics.endFill();
        if (active) {
            graphics.beginFill(SUN, 0.14);
            graphics.lineStyle(0);
            graphics.drawCircle(lx + 23, -49, 24);
            graphics.endFill();
        }

        // Bunting from the roof to the lantern.
        graphics.lineStyle(1.5, INK, active ? 0.8 : 0.3);
        graphics.moveTo(60, topY - 30);
        graphics.quadraticCurveTo(92, topY - 6, lx + 10, -34);
        const flags = [0xff4f9a, MINT, SUN];
        for (let i = 0; i < 4; i++) {
            const t = (i + 1) / 5;
            const fx = 60 + (lx + 10 - 60) * t;
            const fy = topY - 30 + (2 - topY) * t + Math.sin(t * Math.PI) * 16;
            graphics.beginFill(flags[i % 3], active ? 1 : 0.35);
            graphics.lineStyle(1, INK, 0.8);
            graphics.moveTo(fx, fy);
            graphics.lineTo(fx + 7, fy + 3);
            graphics.lineTo(fx + 2, fy + 10);
            graphics.closePath();
            graphics.endFill();
        }
    }

    /* ------------------------------------------------------------------ */
    /* Aurora Beacon                                                       */
    /* ------------------------------------------------------------------ */
    static drawBeacon(graphics, ghost, active) {
        const base = active ? PAPER : 0x77616f;
        const baseShade = active ? SAND : 0x56424f;
        const glass = active ? LAVENDER : 0x8f7b95;
        const glassLight = active ? MINT_LIGHT : 0xb0a3ae;
        const band = active ? MINT : 0x8f7b95;

        // Stepped base.
        BuildingRenderer.isoDiamond(graphics, 0, 36, 142, 60, baseShade, 1);
        BuildingRenderer.isoDiamond(graphics, 0, 22, 128, 54, base, 1);
        BuildingRenderer.isoDiamond(graphics, 0, 6, 96, 40, baseShade, 1);
        BuildingRenderer.isoDiamond(graphics, 0, -6, 84, 35, base, 1);

        // Tapered tower: two visible faces.
        const bottomLeft = { x: -62, y: 18 };
        const bottomFront = { x: 0, y: 56 };
        const bottomRight = { x: 62, y: 18 };
        const topLeft = { x: -30, y: -250 };
        const topFront = { x: 0, y: -232 };
        const topRight = { x: 30, y: -250 };

        BuildingRenderer.face(graphics, [bottomLeft, bottomFront, topFront, topLeft], glassLight, 1);
        BuildingRenderer.face(graphics, [bottomFront, bottomRight, topRight, topFront], glass, 1);

        // Vertical glass facets.
        graphics.lineStyle(1.5, INK, 0.35);
        graphics.moveTo(-30, 22);
        graphics.lineTo(-14, -246);
        graphics.moveTo(-38, -64);
        graphics.lineTo(38, -64);
        graphics.moveTo(-34, -130);
        graphics.lineTo(34, -130);
        graphics.moveTo(-31, -196);
        graphics.lineTo(31, -196);

        // Mint bands.
        for (const y of [-64, -130, -196]) {
            BuildingRenderer.limb(graphics, [{ x: -38, y }, { x: 0, y: y + 18 }, { x: 38, y }], band, 5);
        }

        // Lit windows.
        const windows = [
            { x: -14, y: -112 }, { x: 12, y: -96 }, { x: -20, y: -178 }, { x: 8, y: -160 }
        ];
        for (const w of windows) {
            graphics.beginFill(SUN, active ? 0.95 : 0.3);
            graphics.lineStyle(1.5, INK, 1);
            graphics.moveTo(w.x, w.y);
            graphics.lineTo(w.x + 8, w.y + 4);
            graphics.lineTo(w.x + 8, w.y + 16);
            graphics.lineTo(w.x, w.y + 12);
            graphics.closePath();
            graphics.endFill();
        }

        // Crown and lens.
        BuildingRenderer.isoDiamond(graphics, 0, -254, 42, 18, active ? MINT : 0x8f7b95, 1);
        graphics.beginFill(active ? SUN : 0xb0a3ae, active ? 0.95 : 0.3);
        graphics.lineStyle(3, INK, 1);
        graphics.drawCircle(0, -278, 18);
        graphics.endFill();
        graphics.beginFill(CREAM, active ? 1 : 0.4);
        graphics.lineStyle(0);
        graphics.drawCircle(0, -282, 8);
        graphics.endFill();

        if (active) {
            // Soft light beams; kept cheap and behind the silhouette.
            graphics.beginFill(SUN, 0.12);
            graphics.lineStyle(0);
            graphics.moveTo(0, -278);
            graphics.lineTo(-170, -360);
            graphics.lineTo(-92, -248);
            graphics.closePath();
            graphics.moveTo(0, -278);
            graphics.lineTo(170, -360);
            graphics.lineTo(92, -248);
            graphics.closePath();
            graphics.endFill();

            graphics.beginFill(MINT_LIGHT, 0.1);
            graphics.lineStyle(0);
            graphics.drawCircle(0, -278, 56);
            graphics.endFill();

            // Star sparkle.
            graphics.lineStyle(3, CREAM, 0.95);
            graphics.moveTo(0, -314);
            graphics.lineTo(0, -330);
            graphics.moveTo(-16, -306);
            graphics.lineTo(-24, -314);
            graphics.moveTo(16, -306);
            graphics.lineTo(24, -314);
        }
    }
}
