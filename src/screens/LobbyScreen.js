import { chartShareUrl } from '../settings/ChartLink.js';

const SIZE_DATA = {
    small: { islands: 4, shards: 46, days: 12, label: 'A quiet shard', note: 'Four islets, a short charter.' },
    medium: { islands: 6, shards: 64, days: 14, label: 'A working archipelago', note: 'Six islets, room for a commons.' },
    large: { islands: 7, shards: 82, days: 16, label: 'A wide drift', note: 'Seven islets, a longer light.' }
};

const MODE_DATA = {
    'first-light': { label: 'First Light', note: 'One chapter, one shard, a gentle tutorial.' },
    contest: { label: 'The Contest', note: 'Share the shard with two rival chapters.' },
    open: { label: 'Open Charter', note: 'One shard, no deadline and no ending. Abandon when you are done.' }
};

const ISLAND_PATHS = [
    'M70 92c22-28 63-34 91-14 22 16 21 43-3 55-29 14-70 10-88-11-12-14-9-22 0-30Z',
    'M224 58c30-18 70-7 80 20 8 22-11 39-38 42-32 4-62-12-60-33 1-11 8-22 18-29Z',
    'M366 106c28-24 73-16 85 12 11 25-15 49-50 50-32 1-59-15-57-34 1-10 8-20 22-28Z',
    'M126 190c26-21 68-19 83 6 13 22-9 43-40 44-33 1-62-12-60-29 1-8 7-16 17-21Z',
    'M286 204c30-26 79-17 91 13 10 25-17 46-51 44-36-2-63-20-58-38 2-7 8-13 18-19Z',
    'M428 214c18-17 46-12 54 7 7 17-12 33-35 32-22 0-39-10-37-22 1-6 8-12 18-17Z',
    'M34 212c15-14 38-10 44 6 6 15-10 28-29 27-19 0-33-8-32-18 0-5 7-10 17-15Z'
];

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

        const form = document.createElement('form');
        form.className = 'lobby__form';
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            this.game.startCharter();
        });

        const nameField = document.createElement('div');
        nameField.className = 'field';
        const nameLabel = document.createElement('label');
        nameLabel.className = 'field__label';
        nameLabel.htmlFor = 'lobby-chapter-name-field';
        nameLabel.textContent = 'Chapter name';
        this.chapterInput = document.createElement('input');
        this.chapterInput.className = 'input';
        this.chapterInput.id = 'lobby-chapter-name-field';
        this.chapterInput.type = 'text';
        this.chapterInput.maxLength = 32;
        this.chapterInput.placeholder = 'Home Chapter';
        this.chapterInput.dataset.testid = 'lobby-chapter-name';
        this.chapterInput.value = this.game.settings.chapterName || 'Home Chapter';
        this.chapterInput.addEventListener('change', () => {
            const next = this.chapterInput.value.replace(/\s+/g, ' ').trim().slice(0, 32);
            this.game.settings.chapterName = next || 'Home Chapter';
            this.chapterInput.value = this.game.settings.chapterName;
        });
        const nameHint = document.createElement('span');
        nameHint.className = 'field__hint';
        nameHint.textContent = 'The name the other chapters will read in the standings.';
        nameField.append(nameLabel, this.chapterInput, nameHint);

        const mottoField = document.createElement('div');
        mottoField.className = 'field';
        const mottoLabel = document.createElement('label');
        mottoLabel.className = 'field__label';
        mottoLabel.htmlFor = 'lobby-chapter-motto-field';
        mottoLabel.textContent = 'Motto';
        this.mottoInput = document.createElement('input');
        this.mottoInput.className = 'input';
        this.mottoInput.id = 'lobby-chapter-motto-field';
        this.mottoInput.type = 'text';
        this.mottoInput.maxLength = 60;
        this.mottoInput.placeholder = 'A line the chapter lives by';
        this.mottoInput.dataset.testid = 'lobby-chapter-motto';
        this.mottoInput.value = this.game.settings.chapterMotto || '';
        this.mottoInput.addEventListener('change', () => {
            const next = this.mottoInput.value.replace(/\s+/g, ' ').trim().slice(0, 60);
            this.game.settings.chapterMotto = next;
            this.mottoInput.value = next;
        });
        const mottoHint = document.createElement('span');
        mottoHint.className = 'field__hint';
        mottoHint.textContent = 'Optional. Appears in the charter record.';
        mottoField.append(mottoLabel, this.mottoInput, mottoHint);

        const seedField = document.createElement('div');
        seedField.className = 'field';

        const seedLabel = document.createElement('label');
        seedLabel.className = 'field__label';
        seedLabel.htmlFor = 'lobby-seed-field';
        seedLabel.textContent = 'Chart seed';

        const seedRow = document.createElement('div');
        seedRow.className = 'seed-row';

        this.seedInput = document.createElement('input');
        this.seedInput.className = 'input';
        this.seedInput.id = 'lobby-seed-field';
        this.seedInput.type = 'number';
        this.seedInput.inputMode = 'numeric';
        this.seedInput.placeholder = 'e.g. 40421';
        this.seedInput.value = this.game.settings.mapSeed;
        this.chapterInput.value = this.game.settings.chapterName || 'Home Chapter';
        this.mottoInput.value = this.game.settings.chapterMotto || '';
        this.seedInput.dataset.testid = 'lobby-seed';

        const randomBtn = document.createElement('button');
        randomBtn.type = 'button';
        randomBtn.className = 'btn btn--small btn--paper';
        randomBtn.dataset.testid = 'lobby-random-seed';
        randomBtn.textContent = 'Roll';
        randomBtn.title = 'Roll a new seed';

        const shareBtn = document.createElement('button');
        shareBtn.type = 'button';
        shareBtn.className = 'btn btn--small btn--paper';
        shareBtn.dataset.testid = 'lobby-share';
        shareBtn.textContent = 'Copy link';
        shareBtn.title = 'Copy a link to this chart';
        const shareStatus = document.createElement('span');
        shareStatus.className = 'field__hint';
        shareStatus.dataset.role = 'share-status';
        shareStatus.setAttribute('aria-live', 'polite');
        shareBtn.addEventListener('click', async () => {
            const url = chartShareUrl({
                seed: this.game.settings.mapSeed,
                size: this.game.settings.mapSize,
                mode: this.game.settings.mode || 'first-light',
                name: this.game.settings.chapterName || '',
                motto: this.game.settings.chapterMotto || ''
            });
            try {
                await navigator.clipboard.writeText(url);
                shareStatus.textContent = 'Chart link copied.';
            } catch {
                shareStatus.textContent = url;
            }
        });
        seedRow.append(this.seedInput, randomBtn, shareBtn);

        const seedHint = document.createElement('span');
        seedHint.className = 'field__hint';
        seedHint.textContent = 'The same seed always raises the same islands — and the same fifteen Tidelanders.';

        seedField.append(seedLabel, seedRow, seedHint, shareStatus);

        const setSeed = (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isInteger(parsed)) return;
            this.game.settings.mapSeed = parsed;
            this.seedInput.value = parsed;
            this._updateChart();
        };
        this.seedInput.addEventListener('change', (event) => setSeed(event.target.value));
        randomBtn.addEventListener('click', () => {
            const next = Math.floor(Math.random() * 1000000);
            this.game.settings.mapSeed = next;
            this.seedInput.value = next;
            this._updateChart();
            this.seedInput.focus();
        });

        const sizeField = document.createElement('fieldset');
        sizeField.className = 'size-picker';
        const legend = document.createElement('legend');
        legend.className = 'field__label';
        legend.textContent = 'Chart size';
        legend.style.marginBottom = '8px';
        sizeField.appendChild(legend);

        this.sizeInputs = new Map();
        for (const [value, data] of Object.entries(SIZE_DATA)) {
            const card = document.createElement('label');
            card.className = 'size-card';
            card.innerHTML = `
                <input type="radio" name="map-size" value="${value}">
                <span class="size-card__glyph" aria-hidden="true"><i></i><i></i><i></i></span>
                <span class="size-card__name">${value}</span>
                <span class="size-card__meta">${data.islands} islets</span>
            `;
            const input = card.querySelector('input');
            input.addEventListener('change', () => {
                if (input.checked) this._setSize(value);
            });
            this.sizeInputs.set(value, input);
            sizeField.appendChild(card);
        }

        this.sizeSelect = document.createElement('select');
        this.sizeSelect.className = 'visually-hidden';
        this.sizeSelect.dataset.testid = 'lobby-size';
        this.sizeSelect.tabIndex = -1;
        for (const value of Object.keys(SIZE_DATA)) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            this.sizeSelect.appendChild(option);
        }
        this.sizeSelect.addEventListener('change', (event) => this._setSize(event.target.value));
        sizeField.appendChild(this.sizeSelect);

        // Mode ------------------------------------------------------------
        const modeField = document.createElement('div');
        modeField.className = 'field';
        modeField.innerHTML = `
            <label class="field__label" for="lobby-mode-field">Charter mode</label>
            <select class="input" id="lobby-mode-field" data-testid="lobby-mode">
                <option value="first-light">First Light — solo</option>
                <option value="contest">The Contest — two rival chapters</option>
                <option value="open">Open Charter — no deadline</option>
            </select>
            <span class="field__hint" data-role="mode-hint">One chapter, one shard, a gentle tutorial. Open Charter removes the deadline and the ending.</span>
        `;
        this.modeSelect = modeField.querySelector('[data-testid=lobby-mode]');
        this.modeHint = modeField.querySelector('[data-role=mode-hint]');
        this.modeSelect.addEventListener('change', () => this._setMode(this.modeSelect.value));

        const actions = document.createElement('div');
        actions.className = 'lobby__actions';

        const startBtn = document.createElement('button');
        startBtn.type = 'submit';
        startBtn.className = 'btn btn--primary';
        startBtn.dataset.testid = 'lobby-start';
        startBtn.innerHTML = 'Sign the charter <span class="btn__arrow" aria-hidden="true">→</span>';

        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'btn btn--ghost';
        backBtn.style.color = 'var(--ink)';
        backBtn.dataset.testid = 'lobby-back';
        backBtn.textContent = 'Back to the drift';

        actions.append(startBtn, backBtn);
        backBtn.addEventListener('click', () => this.gsm.setState('MENU'));

        form.append(nameField, mottoField, seedField, sizeField, modeField, actions);
        sheet.appendChild(form);

        const chart = document.createElement('aside');
        chart.className = 'lobby__chart';
        chart.setAttribute('aria-hidden', 'true');
        chart.innerHTML = `
            <div class="lobby__chart-head">
                <div>
                    <p class="kicker">Survey sheet</p>
                    <p class="kicker" style="color:var(--paper);margin-top:3px">The Glass Sea</p>
                </div>
                <span class="chart-badge">FSC / 03</span>
            </div>
            <div class="chart-illustration"></div>
            <dl class="chart-readout">
                <div><dt>Islets</dt><dd data-chart="islands">6</dd></div>
                <div><dt>Shards</dt><dd data-chart="shards">64</dd></div>
                <div><dt>Day limit</dt><dd data-chart="days">14</dd></div>
                <div><dt>Seed</dt><dd data-chart="seed" style="font-family:var(--mono);font-size:16px">—</dd></div>
            </dl>
            <div class="chart-compass" aria-hidden="true">N</div>
        `;
        this.chartIllustration = chart.querySelector('.chart-illustration');

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
        const data = SIZE_DATA[this.game.settings.mapSize] || SIZE_DATA.medium;
        const seed = this.game.settings.mapSeed;
        const count = data.islands;
        const paths = ISLAND_PATHS.slice(0, count).map((path, index) => {
            const fill = index % 3 === 0 ? '#59E3C2' : index % 3 === 1 ? '#FFA07A' : '#C9B6FF';
            return `<path d="${path}" fill="${fill}" fill-opacity=".2" stroke="${fill}" stroke-width="1.5"/>`;
        }).join('');

        this.chartIllustration.innerHTML = `
            <svg viewBox="0 0 500 300" fill="none" aria-hidden="true">
                <defs>
                    <pattern id="chartGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M30 0H0V30" stroke="#FFF2D8" stroke-opacity=".1" stroke-width="1"/>
                    </pattern>
                </defs>
                <rect x="1" y="1" width="498" height="298" fill="url(#chartGrid)" stroke="#FFF2D8" stroke-opacity=".2"/>
                <circle cx="250" cy="150" r="118" stroke="#FFF2D8" stroke-opacity=".12" stroke-dasharray="3 7"/>
                <circle cx="250" cy="150" r="74" stroke="#FFF2D8" stroke-opacity=".1"/>
                <path d="M250 20v260M20 150h460" stroke="#FFF2D8" stroke-opacity=".08"/>
                ${paths}
                <path d="M250 150l38-38" stroke="#FF6B5E" stroke-width="1.5" stroke-dasharray="2 4"/>
                <circle cx="250" cy="150" r="4" fill="#FFD36E"/>
                <text x="264" y="142" fill="#FFF2D8" fill-opacity=".55" font-family="monospace" font-size="9">HOME SHARD</text>
                <text x="22" y="280" fill="#FFF2D8" fill-opacity=".4" font-family="monospace" font-size="9">DRIFT 18.46° S · NODE-05</text>
                <text x="472" y="34" fill="#FFF2D8" fill-opacity=".4" font-family="monospace" font-size="9" text-anchor="end">SHEET 03</text>
            </svg>
        `;

        for (const el of this.container.querySelectorAll('[data-chart]')) {
            const key = el.dataset.chart;
            if (key === 'seed') el.textContent = Number.isInteger(seed) ? String(seed) : '—';
            else if (key === 'islands') el.textContent = String(data.islands);
            else if (key === 'shards') el.textContent = String(data.shards);
            else if (key === 'days') el.textContent = String(data.days);
        }
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
