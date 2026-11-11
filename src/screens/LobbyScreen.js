import { SIZE_DATA, MODE_DATA } from './lobby/LobbyOptions.js';
import { buildLobbyForm } from './lobby/LobbyForm.js';
import { buildLobbyChart, updateChart } from './lobby/LobbyChart.js';

export class LobbyScreen {
    constructor(screenStateMachine, game) {
        this.gsm = screenStateMachine;
        this.game = game;

        this.container = document.createElement('div');
        this.container.className = 'screen screen--lobby';
        this.container.dataset.testid = 'lobby-screen';

        const wrap = document.createElement('div');
        wrap.className = 'lobby__wrap';

        const sheet = document.createElement('section');
        sheet.className = 'lobby__sheet paper';
        sheet.innerHTML = `
            <p class="eyebrow" style="color:var(--wine)">Charter office · sheet no. 03</p>
            <h2 class="lobby__title">Choose your drift.</h2>
            <p class="lobby__lede">A charter begins with a seed, a shard, and one stubborn lamp. Pick the shape of your archipelago. In the Contest, the outer commons isle is also buildable; other islands are scenery for now.</p>
        `;
        sheet.appendChild(buildLobbyForm(this));

        const chart = buildLobbyChart(this);
        wrap.append(sheet, chart);
        this.container.append(wrap);
        document.body.appendChild(this.container);
        this.container.style.display = 'none';

        this._setSize(this.game.settings.mapSize, false);
    }

    _setMode(value) {
        const mode = MODE_DATA[value] ? value : 'first-light';
        this.game.settings.mode = mode;
        if (this.modeSelect) this.modeSelect.value = mode;
        if (this.modeHint) this.modeHint.textContent = MODE_DATA[mode].note;
        return MODE_DATA[mode];
    }

    _setSize(value) {
        const data = SIZE_DATA[value] || SIZE_DATA.medium;
        this.game.settings.mapSize = value;
        if (this.sizeInputs) {
            for (const [key, input] of this.sizeInputs) input.checked = key === value;
        }
        if (this.sizeSelect) this.sizeSelect.value = value;
        this._updateChart();
        return data;
    }

    _updateChart() {
        updateChart(this);
    }

    show() {
        this.container.style.display = 'flex';
        this.seedInput.value = this.game.settings.mapSeed;
        this.chapterInput.value = this.game.settings.chapterName || 'Home Chapter';
        this.mottoInput.value = this.game.settings.chapterMotto || '';
        this._setSize(this.game.settings.mapSize);
        this._setMode(this.game.settings.mode || 'first-light');
    }

    hide() {
        this.container.style.display = 'none';
    }
}
