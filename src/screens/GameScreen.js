export class GameScreen {
    constructor(gameStateManager) {
        this.gsm = gameStateManager;
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            z-index: 100;
        `;
        
        this.turnDisplay = document.createElement('div');
        this.turnDisplay.style.cssText = `
            padding: 12px 24px;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            font-family: 'Noto Sans', sans-serif;
            font-size: 16px;
            text-align: center;
        `;
        
        const endTurnBtn = this.createButton('End Turn', () => {
            this.gsm.endTurn();
        });
        endTurnBtn.dataset.testid = 'end-turn';
        
        const endGameBtn = this.createButton('End Game', () => {
            this.gsm.endGame();
        });
        endGameBtn.dataset.testid = 'end-game';
        endGameBtn.style.background = '#555';
        
        this.turnDisplay.dataset.testid = 'turn-display';
        this.container.dataset.testid = 'game-hud';
        this.container.appendChild(this.turnDisplay);
        this.container.appendChild(endTurnBtn);
        this.container.appendChild(endGameBtn);
        
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
    }

    createButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            padding: 16px 32px;
            font-size: 16px;
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
        this.updateTurnDisplay();
    }

    hide() {
        this.container.style.display = 'none';
    }

    updateTurnDisplay() {
        const text = `Turn ${this.gsm.currentTurn} | Builds: ${this.gsm.actionsRemaining}`;
        if (this.turnDisplay.textContent !== text) {
            this.turnDisplay.textContent = text;
        }
    }
}

