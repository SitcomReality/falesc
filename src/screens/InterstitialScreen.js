export class InterstitialScreen {
    constructor(gameStateManager) {
        this.gsm = gameStateManager;
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: 'Noto Sans', sans-serif;
            color: #fff;
            z-index: 500;
        `;
        
        this.message = document.createElement('h2');
        this.message.style.cssText = `
            font-size: 32px;
            margin-bottom: 20px;
        `;
        
        this.details = document.createElement('p');
        this.details.style.cssText = `
            font-size: 18px;
            opacity: 0.7;
        `;
        
        this.container.appendChild(this.message);
        this.container.appendChild(this.details);
        
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
    }

    show() {
        this.message.textContent = `Turn ${this.gsm.currentTurn} Complete`;
        this.details.textContent = 'Processing actions...';
        this.container.style.display = 'flex';
    }

    hide() {
        this.container.style.display = 'none';
    }
}

