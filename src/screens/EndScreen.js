export class EndScreen {
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
        title.textContent = 'Game Over';
        title.style.cssText = `
            font-size: 48px;
            margin-bottom: 30px;
        `;
        
        this.stats = document.createElement('div');
        this.stats.style.cssText = `
            margin-bottom: 40px;
            text-align: center;
        `;
        
        const menuBtn = this.createButton('Return to Menu', () => {
            this.gsm.setState('MENU');
        });
        
        this.container.appendChild(title);
        this.container.appendChild(this.stats);
        this.container.appendChild(menuBtn);
        
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
    }

    createButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            padding: 16px 48px;
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
        this.stats.innerHTML = `
            <p style="font-size: 24px; margin: 12px 0;">Total Turns: ${this.gsm.currentTurn}</p>
            <p style="font-size: 18px; opacity: 0.7;">Thanks for playing!</p>
        `;
        this.container.style.display = 'flex';
    }

    hide() {
        this.container.style.display = 'none';
    }
}

