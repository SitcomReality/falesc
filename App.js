        // Update active game screen if in PLAYING state
        if (this.stateManager.state === GameState.PLAYING && this.stateManager.activeScreen) {
            this.stateManager.activeScreen.updateTurnDisplay();
        }

        // Containers (Layers)
        this.mapLayer = new PIXI.Container();
        this.shadowLayer = new PIXI.Container();
        this.characterLayer = new PIXI.Container();
        // ...
        this.buildingManager = new BuildingManager(this.app, null, this.characterLayer);

<<<<<<< SEARCH
        // Input / Controls System
        this.inputManager = new InputManager(window);
        
        // Building System
        this.buildingManager = new BuildingManager(this.app, null, this.characterLayer);
=======

        // Containers (Layers)
        this.mapLayer = new PIXI.Container();
        // ...
        this.worldContainer.addChild(this.characterLayer);

        // AI System
        this.crowdManager = new CrowdManager(this.app);

        // Input / Controls System
        this.inputManager = new InputManager(window);

