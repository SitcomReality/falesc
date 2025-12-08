# Character System Overview

This document briefly explains how procedural characters are constructed, animated, rendered, and integrated with the rest of the sandbox so you (artist/developer) can build compatible environment and object systems.

## High-level anatomy
- Character is a data-driven object (src/Character.js) that contains:
  - Position: x, y
  - Visuals: scale, facing (radians), colors (palette)
  - Procedural variations: arm/leg/body length multipliers
  - Runtime animation state: state, frame, speed, bobOffset, torsoTilt, angles (limbs)
  - Pixi objects: graphics Container, Graphics for limbs/body/head, and a shadow Graphics

## Rendering pipeline
- Static geometry is drawn once at "unit scale" by CharacterRenderer (src/character/CharacterRenderer.js) into the pre-created Graphics objects (leftArm, rightArm, leftLeg, rightLeg, bodyG, headG, shadow).
- Per-frame updates use transforms only (position, rotation, scale) on those Graphics to animate limbs and body; the renderer avoids re-drawing geometry each frame for performance.
- A single global scale is applied to the character container (graphics.scale and shadow.scale) so geometry remains authored at scale 1.

## Animation
- CharacterAnimation (src/character/CharacterAnimation.js) computes procedural poses for states (IDLE, WALK, RUN, BEND).
- It writes bobOffset, torsoTilt, and limb angles to the Character, and supports short cross-fade blends between states.
- Animation timing is driven by `frame` and `speed` values on the Character; the animation update is called with delta time in seconds.

## Colors & palettes
- Palettes are defined in src/constants.js (PALETTES).
- Each character stores a colors object and the renderer caches geometry per-palette to avoid unnecessary re-draws.

## Layers, sorting & shadows
- Characters are added to world-layer containers:
  - shadowLayer: simple ellipses (Graphics) drawn once
  - characterLayer: each character has a graphics Container with sortableChildren enabled
- Sorting is performed by groundY/zIndex (renderer computes a shadow offset), and the main loop throttles full sorting for performance.
- Within a character, zIndex is used to order limbs, body, and head to simulate depth as the character rotates.

## Integration points for other graphics (recommended conventions)
- Author assets at "unit scale" where 1 = default character geometry scale. Apply final sizing using container.scale so systems remain interoperable.
- Use Pixi Containers per logical object and enable sortableChildren when the object needs internal z-ordering.
- If asset visuals are mostly static, draw once into Graphics or a RenderTexture and animate using transforms (position, rotation, scale) rather than redrawing shapes each frame.
- Provide a simple local reference point (hip/anchor) used for attaching children (limbs, equipment, lights). For characters this is the hip (body pivot) and helps place attachments consistently.
- Expose a small API: update(dtSeconds), setPosition(x,y), setScale(s), setFacing(rad), and a draw/refresh or init method to (re)create cached geometry when palette or major variations change.
- Use a palette/signature string to detect when cached geometry must be rebuilt (like CharacterRenderer.getPaletteSignature()).
- Compute and expose a stable "groundY" or "zIndex" per object so the world layer can sort by depth without inspecting internals.

## Tips for environment & object artists
- Favor simple geometric shadows (flattened ellipses) that can be scaled/translated based on object height; this matches the character shadow approach and keeps depth consistent.
- Keep attachment points in local coordinates (e.g., hip, hand, head) so items like hats, tools, and environmental props can be positioned by code without per-instance reauthoring.
- If you need multiple LODs or variants, keep them as separate RenderTextures or Graphics and switch references rather than rebuilding geometry procedurally each frame.

## Where to look in the code
- Character creation and Pixi setup: src/Character.js
- Static geometry caching and transform-based drawing: src/character/CharacterRenderer.js
- Pose and blend animation logic: src/character/CharacterAnimation.js
- Palette constants and shared shape metrics: src/constants.js
- Layering, world integration, camera & game loop: src/App.js and src/Camera.js

This should give you the patterns to author new assets or systems that plug into the existing renderer/animation flow: unit-scaled geometry, cached drawing, transform-driven animation, palette-aware rebuilding, and a shared ground/zIndex depth model.

