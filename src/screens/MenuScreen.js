export class MenuScreen {
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
        
        const title = document.createElement('h1');
        title.textContent = 'FALESC';
        title.style.cssText = `
            font-size: 64px;
            margin-bottom: 60px;
            letter-spacing: 8px;
        `;
        
        const startBtn = this.createButton('Start Game', () => {
            this.gsm.setState('LOBBY');
        });
        startBtn.dataset.testid = 'menu-start';
        
        const joinBtn = this.createButton('Join Multiplayer', () => {
            alert('Multiplayer not yet implemented');
        });
        joinBtn.dataset.testid = 'menu-join';
        
        this.container.dataset.testid = 'menu-screen';
        this.container.appendChild(title);
        this.container.appendChild(startBtn);
        this.container.appendChild(joinBtn);
        
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

