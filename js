<<<<<<< SEARCH
             // Base tilt: slightly angled, mostly upright
             let tilt = (Math.random() - 0.5) * 0.08;

             if (!isMain) {
                 // Edge crystals lean away from the cluster center
                 const normX = Math.max(-1, Math.min(1, x / (baseSpread || 1)));
                 const lean = normX * edgeLeanFactor;
                 tilt += lean;
             }

             // Special-case: two-crystal cluster should visibly lean away from each other
             if (count === 2 && !isMain) {
                 // Ensure noticeable opposite tilts
                 tilt = Math.sign(x) * Math.abs(tilt || edgeLeanFactor * 1.5);
             }

             // Clamp final tilt
             if (tilt > maxLean) tilt = maxLean;
             if (tilt < -maxLean) tilt = -maxLean;
=======
             // Base tilt: small random wobble so nothing is perfectly straight
             let tilt = (Math.random() - 0.5) * 0.05;

             if (!isMain) {
                 // Edge crystals lean away from the cluster center more than central ones.
                 // Normalize X relative to the cluster spread and bias toward stronger lean on the edges.
                 const normX = Math.max(-1, Math.min(1, x / (baseSpread || 1))); // -1 .. 1
                 const edgeBias = Math.sign(normX) * Math.pow(Math.abs(normX), 1.5); // central ~0, edges closer to +/-1
                 const lean = edgeBias * edgeLeanFactor;
                 tilt += lean;
             }

             // Special-case: two-crystal cluster should visibly lean away from each other
             if (count === 2 && !isMain) {
                 // Force a strong opposing lean based on side
                 const side = Math.sign(x) || 1;
                 tilt = side * Math.min(maxLean * 0.85, Math.abs(tilt) + edgeLeanFactor);
             }

             // Clamp final tilt
             if (tilt > maxLean) tilt = maxLean;
             if (tilt < -maxLean) tilt = -maxLean;
>>>>>>> REPLACE

