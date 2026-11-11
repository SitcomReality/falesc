import { ISLAND_PATHS, SIZE_DATA } from './LobbyOptions.js';

/** Builds the survey-chart aside and stores its illustration ref on the screen. */
export function buildLobbyChart(screen) {
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
        screen.chartIllustration = chart.querySelector('.chart-illustration');
}

/** Repaints the survey chart from the current size and seed. */
export function updateChart(screen) {
        const data = SIZE_DATA[screen.game.settings.mapSize] || SIZE_DATA.medium;
        const seed = screen.game.settings.mapSeed;
        const count = data.islands;
        const paths = ISLAND_PATHS.slice(0, count).map((path, index) => {
            const fill = index % 3 === 0 ? '#59E3C2' : index % 3 === 1 ? '#FFA07A' : '#C9B6FF';
            return `<path d="${path}" fill="${fill}" fill-opacity=".2" stroke="${fill}" stroke-width="1.5"/>`;
        }).join('');

        screen.chartIllustration.innerHTML = `
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

        for (const el of screen.container.querySelectorAll('[data-chart]')) {
            const key = el.dataset.chart;
            if (key === 'seed') el.textContent = Number.isInteger(seed) ? String(seed) : '—';
            else if (key === 'islands') el.textContent = String(data.islands);
            else if (key === 'shards') el.textContent = String(data.shards);
            else if (key === 'days') el.textContent = String(data.days);
        }
}
