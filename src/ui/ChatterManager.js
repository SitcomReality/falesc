import * as PIXI from 'pixi.js';
import { SeededRandom } from '../map/SeededRandom.js';

const LINES = [
    'The crystals are humming again.',
    'Lovely tide, isn\'t it?',
    'I found a shell shaped like the Beacon.',
    'Do you think it will be tall enough?',
    'Mind the edge — the sea is deep.',
    'I could use a cup of something warm.',
    'The light is doing the thing again.',
    'We are going to need more lanterns.',
    'I\'m not scared. You\'re scared.',
    'Another tide, another shard.',
    'The palms lean toward the sunset.',
    'Someone should paint this.',
    'I heard the Beacon sings at night.',
    'Just one more stone. Then sleep.'
];

/**
 * Occasional, decorative speech bubbles above Tidelanders. This is ambient
 * flavour, not simulation state; bubbles live in a world-space overlay and are
 * destroyed when the world is cleared.
 */
export class ChatterManager {
    constructor(layer, game) {
        this.layer = layer;
        this.game = game;
        this.rng = new SeededRandom((game.stateManager?.settings?.mapSeed || 1) + 13000);
        this.timer = 18 + this.rng.next() * 12;
        this.bubbles = [];
    }

    reseed(seed) {
        this.rng = new SeededRandom((seed || 1) + 13000);
        this.timer = 18 + this.rng.next() * 12;
    }

    update(dt) {
        if (!this.game || this.game.stateManager.state !== 'PLAYING') return;

        this.timer -= dt;
        if (this.timer <= 0) {
            this.spawn();
            this.timer = 22 + this.rng.next() * 18;
        }

        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const bubble = this.bubbles[i];
            bubble.life -= dt;
            bubble.age += dt;
            const character = bubble.character;
            bubble.container.position.set(
                character.x,
                character.y - 88 * (character.scale || 1) - bubble.container.height * 0.25
            );
            const fadeIn = Math.min(1, bubble.age / 0.32);
            const fadeOut = bubble.life < 0.7 ? Math.max(0, bubble.life / 0.7) : 1;
            bubble.container.alpha = fadeIn * fadeOut;
            if (bubble.life <= 0 || !character.graphics || !character.graphics.parent) {
                bubble.container.destroy({ children: true });
                this.bubbles.splice(i, 1);
            }
        }
    }

    spawn() {
        const characters = this.game?.characters?.filter((character) => character.graphics?.parent) || [];
        if (characters.length === 0 || this.bubbles.length >= 2) return;

        const character = characters[this.rng.nextInt(0, characters.length - 1)];
        const line = LINES[this.rng.nextInt(0, LINES.length - 1)];

        const text = new PIXI.Text(line, {
            fontFamily: 'Jost, sans-serif',
            fontSize: 28,
            fontWeight: '600',
            fill: 0x211225,
            align: 'center',
            wordWrap: true,
            wordWrapWidth: 300,
            lineHeight: 32
        });
        text.resolution = 2;

        const padX = 16;
        const padY = 10;
        const width = Math.ceil(text.width + padX * 2);
        const height = Math.ceil(text.height + padY * 2);

        text.position.set(-width / 2 + padX, -height + padY);

        const card = new PIXI.Graphics();
        card.beginFill(0xfff2d8, 0.97);
        card.lineStyle(2, 0x211225, 1);
        card.drawRoundedRect(-width / 2, -height, width, height, 7);
        card.endFill();
        card.beginFill(0xfff2d8, 0.97);
        card.lineStyle(2, 0x211225, 1);
        card.moveTo(-8, -1);
        card.lineTo(8, -1);
        card.lineTo(0, 12);
        card.closePath();
        card.endFill();

        const container = new PIXI.Container();
        container.addChild(card, text);
        container.alpha = 0;
        this.layer.addChild(container);
        this.bubbles.push({ container, character, life: 5.2, age: 0 });
    }

    clear() {
        for (const bubble of this.bubbles) bubble.container.destroy({ children: true });
        this.bubbles = [];
    }
}
