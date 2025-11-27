import GUI from 'lil-gui'; 
import { ANIMATION_STATES } from './constants.js';

export class SandboxUI {
    constructor(game) {
        this.game = game;
        this.gui = new GUI({ title: 'Sandbox Controls' });

        // Setup Params Object linked to GUI
        const params = {
            state: ANIMATION_STATES.WALK,
            speed: 1.0,
            scale: 1.0,
            addOne: () => game.addCharacter(
                Math.random() * (game.app.screen.width - 100) + 50,
                Math.random() * (game.app.screen.height - 100) + 50
            ),
            addTen: () => {
                for(let i=0; i<10; i++) params.addOne();
            },
            removeOne: () => game.removeCharacters(1),
            clear: () => game.clearAll(),
            randomizeColors: () => game.randomizeAllColors(),
            count: 0, // Display only
            useAI: false
        };

        // Animation Controls
        const folderAnim = this.gui.addFolder('Animation');
        
        folderAnim.add(params, 'useAI').name('Enable AI').onChange(v => {
            game.settings.useAI = v;
        });

        folderAnim.add(params, 'state', Object.values(ANIMATION_STATES)).name('Action (Manual)').onChange(v => {
            game.settings.animationState = v;
        });
        folderAnim.add(params, 'speed', 0, 3).name('Speed (Manual)').onChange(v => {
            game.settings.globalSpeed = v;
        });
        
        // Rotation Control
        params.rotation = 90; 
        folderAnim.add(params, 'rotation', 0, 360).name('Rotation (Manual)').onChange(v => {
            game.settings.globalRotation = v * (Math.PI / 180);
        });

        // Appearance Controls
        const folderLook = this.gui.addFolder('Appearance');
        folderLook.add(params, 'scale', 0.5, 3.0).name('Scale').onChange(v => {
            game.settings.globalScale = v;
        });
        folderLook.add(params, 'randomizeColors').name('Randomize Colors');

        // Population Controls
        const folderPop = this.gui.addFolder('Population');
        folderPop.add(params, 'addOne').name('Add Character (Tap)');
        folderPop.add(params, 'addTen').name('Add 10');
        folderPop.add(params, 'removeOne').name('Remove 1');
        folderPop.add(params, 'clear').name('Remove All');        

        // Live Count Monitor
        folderPop.add(game.settings, 'count').name('Count').listen().disable();

        // Default open
        folderAnim.open();
    }
}