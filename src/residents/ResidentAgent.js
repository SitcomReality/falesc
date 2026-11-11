import * as PIXI from 'pixi.js';
import { ANIMATION_STATES } from '../constants.js';

/**
 * The visual side of one resident. It owns the chibi Character, walks a
 * precomputed path during day playback, disappears through the door while using
 * a service, and emerges with a small need glyph.
 */
export class ResidentAgent {
    constructor({ resident, character, homePoint }) {
        this.resident = resident;
        this.character = character;
        this.homePoint = { ...homePoint };
        this.events = [];
        this.hidden = false;
        this.bubble = null;
        this.bubbleTimer = 0;
        this.currentEvent = null;
        this.character.x = homePoint.x;
        this.character.y = homePoint.y;
        this.character.state = ANIMATION_STATES.IDLE;
        this.character.speed = 0.07;
        this.createBubble();
    }

    createBubble() {
        const text = new PIXI.Text('', {
            fontFamily: 'Jost, sans-serif',
            fontSize: 26,
            fontWeight: '700',
            fill: 0x211225,
            stroke: 0xfff2d8,
            strokeThickness: 6,
            align: 'center'
        });
        text.resolution = 2;
        text.visible = false;
        text.anchor.set(0.5, 1);
        text.y = -78;
        this.bubble = text;
        this.character.graphics.addChild(text);
    }

    setHomePoint(point) {
        this.homePoint = { ...point };
        if (!this.currentEvent) {
            this.character.x = point.x;
            this.character.y = point.y;
        }
    }

    setEvents(events) {
        this.events = [...events].sort((a, b) => a.departTime - b.departTime);
        this.currentEvent = null;
    }

    showBubble(glyph) {
        if (!this.bubble) return;
        this.bubble.text = glyph;
        this.bubble.visible = true;
        this.bubbleTimer = 1.4;
    }

    updatePlayback(clock) {
        let event = null;
        for (const candidate of this.events) {
            if (clock < candidate.returnTime) {
                event = candidate;
                break;
            }
        }

        if (!event) {
            this.showAtHome();
            this.updateBubble(0);
            return;
        }

        if (clock < event.departTime) {
            const previous = this.events[this.events.indexOf(event) - 1];
            const point = previous ? pointAlong(previous.returnPath, 1) : this.homePoint;
            this.placeAt(point, false);
            this.updateBubble(0);
            return;
        }

        if (clock < event.arriveTime) {
            const span = Math.max(0.01, event.arriveTime - event.departTime);
            const progress = Math.max(0, Math.min(1, (clock - event.departTime) / span));
            const point = pointAlong(event.path, progress);
            this.placeAt(point, true);
            this.updateBubble(0);
            return;
        }

        if (clock < event.enterTime) {
            this.placeAt(event.queuePoint || pointAlong(event.path, 1), false);
            this.updateBubble(0);
            return;
        }

        if (clock < event.exitTime) {
            this.setHidden(true);
            this.updateBubble(0);
            return;
        }

        if (clock < event.returnTime) {
            const span = Math.max(0.01, event.returnTime - event.exitTime);
            const progress = Math.max(0, Math.min(1, (clock - event.exitTime) / span));
            const point = pointAlong(event.returnPath, progress);
            this.placeAt(point, true);
            if (this.hidden) {
                this.setHidden(false);
                const glyph = glyphForNeed(event.needId);
                this.showBubble(glyph);
            }
            this.updateBubble(1 / 60);
            return;
        }

        this.showAtHome();
        this.updateBubble(0);
    }

    showAtHome() {
        this.setHidden(false);
        this.placeAt(this.homePoint, false);
    }

    placeAt(point, walking) {
        const dx = point.x - this.character.x;
        const dy = point.y - this.character.y;
        if (walking) {
            this.character.facing = Math.atan2(dx, dy);
            this.character.state = ANIMATION_STATES.WALK;
            this.character.speed = 0.3;
        } else {
            this.character.state = ANIMATION_STATES.IDLE;
            this.character.speed = 0.07;
        }
        this.character.x = point.x;
        this.character.y = point.y;
        this.currentEvent = walking ? this.currentEvent : null;
    }

    setHidden(hidden) {
        if (this.hidden === hidden) return;
        this.hidden = hidden;
        this.character.graphics.visible = !hidden;
        this.character.shadow.visible = !hidden;
        this.character.graphics.zIndex = hidden ? -1000000 : this.character.y;
    }

    updateBubble(dt) {
        if (!this.bubble) return;
        if (this.bubbleTimer > 0) {
            this.bubbleTimer -= dt;
            this.bubble.alpha = Math.min(1, this.bubbleTimer * 2);
            if (this.bubbleTimer <= 0) this.bubble.visible = false;
        }
    }

    updateAmbient(dt) {
        this.character.state = ANIMATION_STATES.IDLE;
        this.character.speed = 0.07;
        this.character.x += Math.sin(this.character.frame + dt) * 0.002;
        this.character.y += Math.cos(this.character.frame + dt) * 0.002;
        this.updateBubble(dt);
    }

    destroy() {
        this.character.destroy();
    }
}

function pointAlong(points, t) {
    if (!points || points.length === 0) return { x: 0, y: 0 };
    if (points.length === 1) return { ...points[0] };
    const lengths = [];
    let total = 0;
    for (let index = 1; index < points.length; index++) {
        const length = Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
        lengths.push(length);
        total += length;
    }
    let remaining = Math.max(0, Math.min(1, t)) * total;
    for (let index = 1; index < points.length; index++) {
        const segment = lengths[index - 1];
        if (remaining <= segment || index === points.length - 1) {
            const local = segment === 0 ? 0 : Math.max(0, Math.min(1, remaining / segment));
            return {
                x: points[index - 1].x + (points[index].x - points[index - 1].x) * local,
                y: points[index - 1].y + (points[index].y - points[index - 1].y) * local
            };
        }
        remaining -= segment;
    }
    return { ...points[points.length - 1] };
}

function glyphForNeed(needId) {
    switch (needId) {
        case 'sustenance': return '◒';
        case 'rest': return '☾';
        case 'company': return '♡';
        case 'wonder': return '✦';
        default: return '♥';
    }
}

export { pointAlong, glyphForNeed };
