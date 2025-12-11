export class BuildModal {
    constructor(onBuild, onCancel, inputManager) {
        this.onBuild = onBuild;
        this.onCancel = onCancel;
        this.inputManager = inputManager;
        
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #222;
            border: 2px solid #555;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            font-family: 'Noto Sans', sans-serif;
            color: #fff;
            z-index: 2000;
            min-width: 300px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Construct Building';
        title.style.margin = '0 0 8px 0';
        
        const label = document.createElement('label');
        label.textContent = 'Building Name:';
        
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.placeholder = 'My Structure';
        this.input.style.cssText = `
            padding: 8px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            font-family: inherit;
        `;
        
        const btnRow = document.createElement('div');
        btnRow.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 8px;
        `;
        
        const cancelBtn = this.createButton('Cancel', () => this.hide());
        cancelBtn.style.background = '#444';
        
        const buildBtn = this.createButton('Reserve', () => {
            const name = this.input.value || 'Untitled';
            this.onBuild(name);
            this.hide();
        });
        buildBtn.style.background = '#4ECDC4';
        buildBtn.style.color = '#000';
        
        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(buildBtn);
        
        this.container.appendChild(title);
        this.container.appendChild(label);
        this.container.appendChild(this.input);
        this.container.appendChild(btnRow);
        
        document.body.appendChild(this.container);
        this.container.style.display = 'none';
        
        // Prevent click propagation to game canvas
        this.container.addEventListener('pointerdown', e => e.stopPropagation());

        // Allow Enter to submit and Escape to cancel while typing
        this._onKey = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                buildBtn.click();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.hide();
            }
        };
    }
    
    createButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            padding: 8px 16px;
            border: none;
            cursor: pointer;
            font-weight: bold;
            font-family: inherit;
        `;
        btn.onclick = onClick;
        return btn;
    }
    
    show(targetName) {
        this.input.value = '';
        this.container.style.display = 'flex';
        // Tell input manager to ignore global key binds while modal open
        if (this.inputManager && typeof this.inputManager.setModalOpen === 'function') {
            this.inputManager.setModalOpen(true);
        }
        // Focus and listen for local key handling
        this.input.focus();
        this.input.addEventListener('keydown', this._onKey);
    }
    
    hide() {
        this.container.style.display = 'none';
        // Restore input manager behavior
        if (this.inputManager && typeof this.inputManager.setModalOpen === 'function') {
            this.inputManager.setModalOpen(false);
        }
        this.input.removeEventListener('keydown', this._onKey);
        if (this.onCancel) this.onCancel();
    }
}

