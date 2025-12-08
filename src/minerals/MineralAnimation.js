export class MineralAnimation {
    constructor(structure) {
        this.structure = structure;
        this.time = Math.random() * 100; // Random offset for phase
    }

    update(dt) {
        // Only sway if enabled (crystals)
        if (!this.structure.variation.hasSway) return;

        this.time += dt;

        const swaySpeed = 1.5;
        const swayAmp = 0.03; // Subtle sway in radians

        // Apply sway to cluster children
        if (this.structure.clusterContainers) {
            this.structure.clusterContainers.forEach((child, index) => {
                // Offset phase by index so they don't move in unison
                const phase = this.time * swaySpeed + index * 1.2;
                // Calculate sway rotation
                const sway = Math.sin(phase) * swayAmp;
                // Apply on top of base rotation (tilt)
                child.rotation = child.baseRotation + sway;
            });
        }
    }
}