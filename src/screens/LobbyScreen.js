export class LobbyScreen {
    constructor(gameStateManager) {
        this.gsm = gameStateManager;
        this.fieldCounter = 0;
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
        
        // Map Settings Form
        const settingsContainer = document.createElement('div');
        settingsContainer.style.cssText = `
            margin-bottom: 40px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            min-width: 300px;
        `;
        
        // Map Seed Input
        const seedGroup = this.createInputGroup('Map Seed:', 'number', this.gsm.settings.mapSeed, (value) => {
            const parsed = Number.parseInt(value, 10);
            if (Number.isInteger(parsed)) this.gsm.settings.mapSeed = parsed;
        });
        seedGroup.input.dataset.testid = 'lobby-seed';
        
        // Random Seed Button
        const randomSeedBtn = this.createButton('Random', () => {
            const newSeed = Math.floor(Math.random() * 1000000);
            this.gsm.settings.mapSeed = newSeed;
            seedGroup.input.value = newSeed;
        }, true);
        randomSeedBtn.dataset.testid = 'lobby-random-seed';
        randomSeedBtn.style.marginLeft = '10px';
        seedGroup.container.appendChild(randomSeedBtn);
        
        // Map Size Select
        const sizeGroup = this.createSelectGroup('Map Size:', 
            ['small', 'medium', 'large'], 
            this.gsm.settings.mapSize,
            (value) => {
                this.gsm.settings.mapSize = value;
            }
        );
        sizeGroup.querySelector('select').dataset.testid = 'lobby-size';
        
        settingsContainer.appendChild(seedGroup.container);
        settingsContainer.appendChild(sizeGroup);
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 12px;
        `;
        
        const startBtn = this.createButton('Start Game', () => {
            this.gsm.startGame();
        });
        startBtn.dataset.testid = 'lobby-start';
        
        const backBtn = this.createButton('Back', () => {
            this.gsm.setState('MENU');
        });
        backBtn.dataset.testid = 'lobby-back';
        
        buttonContainer.appendChild(startBtn);
        buttonContainer.appendChild(backBtn);
        
        this.container.dataset.testid = 'lobby-screen';
        this.container.appendChild(title);
        this.container.appendChild(settingsContainer);
        this.container.appendChild(buttonContainer);
        
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
    }

    createInputGroup(label, type, defaultValue, onChange) {
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
        `;
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            font-size: 16px;
            margin-right: 12px;
        `;
        
        const input = document.createElement('input');
        input.type = type;
        input.id = `lobby-field-${this.fieldCounter++}`;
        labelEl.htmlFor = input.id;
        input.value = defaultValue;
        input.style.cssText = `
            padding: 8px 12px;
            font-size: 14px;
            font-family: 'Noto Sans', sans-serif;
            background: #2a2a2a;
            color: #fff;
            border: 1px solid #444;
            width: 120px;
        `;
        
        input.addEventListener('change', (e) => onChange(e.target.value));
        
        container.appendChild(labelEl);
        container.appendChild(input);
        
        return { container, input };
    }

    createSelectGroup(label, options, defaultValue, onChange) {
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
        `;
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            font-size: 16px;
            margin-right: 12px;
        `;
        
        const select = document.createElement('select');
        select.id = `lobby-field-${this.fieldCounter++}`;
        labelEl.htmlFor = select.id;
        select.style.cssText = `
            padding: 8px 12px;
            font-size: 14px;
            font-family: 'Noto Sans', sans-serif;
            background: #2a2a2a;
            color: #fff;
            border: 1px solid #444;
            cursor: pointer;
        `;
        
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
            option.selected = opt === defaultValue;
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => onChange(e.target.value));
        
        container.appendChild(labelEl);
        container.appendChild(select);
        
        return container;
    }

    createButton(text, onClick, small = false) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            padding: ${small ? '8px 16px' : '16px 48px'};
            font-size: ${small ? '14px' : '18px'};
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

