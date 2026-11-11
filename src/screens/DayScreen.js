/**
 * Day playback controls. The world keeps rendering underneath; this overlay
 * only owns a slim top strip and the speed/skip controls.
 */
export class DayScreen {
    constructor(game) {
        this.game = game;
        this.container = document.createElement('div');
        this.container.className = 'screen screen--day';
        this.container.dataset.testid = 'day-screen';
        this.container.innerHTML = `
            <div class="day-strip">
                <div class="day-strip__now">
                    <span class="kicker">Opening the day</span>
                    <strong data-role="day">Day 01</strong>
                    <span class="day-strip__phase" data-role="phase">Morning</span>
                </div>
                <div class="day-strip__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Day playback progress">
                    <i data-role="progress"></i>
                </div>
                <div class="day-strip__controls">
                    <button type="button" class="btn btn--small btn--paper" data-testid="day-speed-1" data-speed="1">1×</button>
                    <button type="button" class="btn btn--small btn--paper" data-testid="day-speed-2" data-speed="2">2×</button>
                    <button type="button" class="btn btn--small btn--paper" data-testid="day-speed-4" data-speed="4">4×</button>
                    <button type="button" class="btn btn--small btn--mint" data-testid="day-skip">Skip →</button>
                </div>
            </div>
        `;
        this.dayEl = this.container.querySelector('[data-role=day]');
        this.phaseEl = this.container.querySelector('[data-role=phase]');
        this.progressEl = this.container.querySelector('[data-role=progress]');
        this.trackEl = this.container.querySelector('[role=progressbar]');
        this.speedButtons = [...this.container.querySelectorAll('[data-speed]')];

        for (const button of this.speedButtons) {
            button.addEventListener('click', () => {
                this.game.setPlaybackSpeed(Number(button.dataset.speed));
            });
        }
        this.container.querySelector('[data-testid=day-skip]').addEventListener('click', () => this.game.skipDay());
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
    }

    show() {
        this.container.style.display = 'block';
        this.setSpeed(this.game.playbackSpeed || 1);
    }

    update({ day, phase, progress }) {
        if (this.dayEl) this.dayEl.textContent = `Day ${String(day).padStart(2, '0')}`;
        if (this.phaseEl) this.phaseEl.textContent = phase;
        const percent = Math.max(0, Math.min(100, progress * 100));
        if (this.progressEl) this.progressEl.style.width = `${percent}%`;
        this.trackEl?.setAttribute('aria-valuenow', String(Math.round(percent)));
    }

    setSpeed(speed) {
        for (const button of this.speedButtons) {
            button.classList.toggle('is-active', Number(button.dataset.speed) === speed);
            button.setAttribute('aria-pressed', String(Number(button.dataset.speed) === speed));
        }
    }

    hide() {
        this.container.style.display = 'none';
    }
}
