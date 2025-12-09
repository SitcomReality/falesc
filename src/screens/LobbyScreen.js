export class LobbyScreen {
    constructor(gameStateManager) {
        this.gsm = gameStateManager;
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #1a1a1a;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: 'Noto Sans', sans-serif;
            color: #fff;
            z-index: 1000;
        `;
        
        const title = document.createElement('h2');
        title.textContent = 'Game Lobby';
        title.style.cssText = `
            font-size: 36px;
            margin-bottom: 40px;
        `;
        
        const settings = document.createElement('div');
        settings.style.cssText = `
            margin-bottom: 40px;
            text-align: center;
        `;
        settings.innerHTML = `
            <p style="margin: 8px 0;">Map Seed: ${this.gsm.settings.mapSeed.toFixed(4)}</p>
            <p style="margin: 8px 0;">Map Size: ${this.gsm.settings.mapSize}</p>
            <p style="margin: 8px 0;">Turn Timer: ${this.gsm.settings.turnDuration || 'None'}</p>
        `;
        
        const startBtn = this.createButton('Start Game', () => {
            this.gsm.startGame();
        });
        
        const backBtn = this.createButton('Back', () => {
            this.gsm.setState('MENU');
        });
        
        this.container.appendChild(title);
        this.container.appendChild(settings);
        this.container.appendChild(startBtn);
        this.container.appendChild(backBtn);
        
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
    }

    createButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            padding: 16px 48px;
            margin: 12px;
            font-size: 18px;
            font-family: 'Noto Sans', sans-serif;
            background: #fff;
            color: #1a1a1a;
            border: none;
            cursor: pointer;
            transition: transform 0.1s;
        `;
        btn.onmouseenter = () => btn.style.transform = 'scale(1.05)';
        btn.onmouseleave = () => btn.style.transform = 'scale(1)';
        btn.onclick = onClick;
        return btn;
    }

    show() {
        this.container.style.display = 'flex';
    }

    hide() {
        this.container.style.display = 'none';
    }
}

