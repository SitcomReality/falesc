import { SIZE_DATA } from './LobbyOptions.js';
import { chartShareUrl } from '../../settings/ChartLink.js';

/** Builds the charter form, wires its fields and stores their refs on the screen. */
export function buildLobbyForm(screen) {
        const form = document.createElement('form');
        form.className = 'lobby__form';
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            screen.game.startCharter();
        });

        const nameField = document.createElement('div');
        nameField.className = 'field';
        const nameLabel = document.createElement('label');
        nameLabel.className = 'field__label';
        nameLabel.htmlFor = 'lobby-chapter-name-field';
        nameLabel.textContent = 'Chapter name';
        screen.chapterInput = document.createElement('input');
        screen.chapterInput.className = 'input';
        screen.chapterInput.id = 'lobby-chapter-name-field';
        screen.chapterInput.type = 'text';
        screen.chapterInput.maxLength = 32;
        screen.chapterInput.placeholder = 'Home Chapter';
        screen.chapterInput.dataset.testid = 'lobby-chapter-name';
        screen.chapterInput.value = screen.game.settings.chapterName || 'Home Chapter';
        screen.chapterInput.addEventListener('change', () => {
            const next = screen.chapterInput.value.replace(/\s+/g, ' ').trim().slice(0, 32);
            screen.game.settings.chapterName = next || 'Home Chapter';
            screen.chapterInput.value = screen.game.settings.chapterName;
        });
        const nameHint = document.createElement('span');
        nameHint.className = 'field__hint';
        nameHint.textContent = 'The name the other chapters will read in the standings.';
        nameField.append(nameLabel, screen.chapterInput, nameHint);

        const mottoField = document.createElement('div');
        mottoField.className = 'field';
        const mottoLabel = document.createElement('label');
        mottoLabel.className = 'field__label';
        mottoLabel.htmlFor = 'lobby-chapter-motto-field';
        mottoLabel.textContent = 'Motto';
        screen.mottoInput = document.createElement('input');
        screen.mottoInput.className = 'input';
        screen.mottoInput.id = 'lobby-chapter-motto-field';
        screen.mottoInput.type = 'text';
        screen.mottoInput.maxLength = 60;
        screen.mottoInput.placeholder = 'A line the chapter lives by';
        screen.mottoInput.dataset.testid = 'lobby-chapter-motto';
        screen.mottoInput.value = screen.game.settings.chapterMotto || '';
        screen.mottoInput.addEventListener('change', () => {
            const next = screen.mottoInput.value.replace(/\s+/g, ' ').trim().slice(0, 60);
            screen.game.settings.chapterMotto = next;
            screen.mottoInput.value = next;
        });
        const mottoHint = document.createElement('span');
        mottoHint.className = 'field__hint';
        mottoHint.textContent = 'Optional. Appears in the charter record.';
        mottoField.append(mottoLabel, screen.mottoInput, mottoHint);

        const seedField = document.createElement('div');
        seedField.className = 'field';

        const seedLabel = document.createElement('label');
        seedLabel.className = 'field__label';
        seedLabel.htmlFor = 'lobby-seed-field';
        seedLabel.textContent = 'Chart seed';

        const seedRow = document.createElement('div');
        seedRow.className = 'seed-row';

        screen.seedInput = document.createElement('input');
        screen.seedInput.className = 'input';
        screen.seedInput.id = 'lobby-seed-field';
        screen.seedInput.type = 'number';
        screen.seedInput.inputMode = 'numeric';
        screen.seedInput.placeholder = 'e.g. 40421';
        screen.seedInput.value = screen.game.settings.mapSeed;
        screen.chapterInput.value = screen.game.settings.chapterName || 'Home Chapter';
        screen.mottoInput.value = screen.game.settings.chapterMotto || '';
        screen.seedInput.dataset.testid = 'lobby-seed';

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
                seed: screen.game.settings.mapSeed,
                size: screen.game.settings.mapSize,
                mode: screen.game.settings.mode || 'first-light',
                name: screen.game.settings.chapterName || '',
                motto: screen.game.settings.chapterMotto || ''
            });
            try {
                await navigator.clipboard.writeText(url);
                shareStatus.textContent = 'Chart link copied.';
            } catch {
                shareStatus.textContent = url;
            }
        });
        seedRow.append(screen.seedInput, randomBtn, shareBtn);

        const seedHint = document.createElement('span');
        seedHint.className = 'field__hint';
        seedHint.textContent = 'The same seed always raises the same islands — and the same fifteen Tidelanders.';

        seedField.append(seedLabel, seedRow, seedHint, shareStatus);

        const setSeed = (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isInteger(parsed)) return;
            screen.game.settings.mapSeed = parsed;
            screen.seedInput.value = parsed;
            screen._updateChart();
        };
        screen.seedInput.addEventListener('change', (event) => setSeed(event.target.value));
        randomBtn.addEventListener('click', () => {
            const next = Math.floor(Math.random() * 1000000);
            screen.game.settings.mapSeed = next;
            screen.seedInput.value = next;
            screen._updateChart();
            screen.seedInput.focus();
        });

        const sizeField = document.createElement('fieldset');
        sizeField.className = 'size-picker';
        const legend = document.createElement('legend');
        legend.className = 'field__label';
        legend.textContent = 'Chart size';
        legend.style.marginBottom = '8px';
        sizeField.appendChild(legend);

        screen.sizeInputs = new Map();
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
                if (input.checked) screen._setSize(value);
            });
            screen.sizeInputs.set(value, input);
            sizeField.appendChild(card);
        }

        screen.sizeSelect = document.createElement('select');
        screen.sizeSelect.className = 'visually-hidden';
        screen.sizeSelect.dataset.testid = 'lobby-size';
        screen.sizeSelect.tabIndex = -1;
        for (const value of Object.keys(SIZE_DATA)) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            screen.sizeSelect.appendChild(option);
        }
        screen.sizeSelect.addEventListener('change', (event) => screen._setSize(event.target.value));
        sizeField.appendChild(screen.sizeSelect);

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
        screen.modeSelect = modeField.querySelector('[data-testid=lobby-mode]');
        screen.modeHint = modeField.querySelector('[data-role=mode-hint]');
        screen.modeSelect.addEventListener('change', () => screen._setMode(screen.modeSelect.value));

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
        backBtn.addEventListener('click', () => screen.gsm.setState('MENU'));

        form.append(nameField, mottoField, seedField, sizeField, modeField, actions);
    return form;
}
