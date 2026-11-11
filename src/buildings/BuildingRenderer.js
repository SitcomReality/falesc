import { PROGRAMS, PROGRAM_FALLBACK, storeyTop } from './BuildingMetrics.js';
import { drawShadow, drawScaffold } from './BuildingPrimitives.js';
import { drawHousing } from './art/HousingArt.js';
import { drawCanteen, drawTeaHouse } from './art/FoodArt.js';
import { drawClinic, drawBathhouse, drawWorkshop, drawAmphitheatre, drawCreche } from './art/CareArt.js';
import { drawGardenDome, drawObservatory, drawCommonsBeacon } from './art/CivicArt.js';

/**
 * Dispatching facade for the illustrated service silhouettes. The drawing
 * code lives in art/, the metrics in BuildingMetrics.js.
 */
export class BuildingRenderer {
    static draw(graphics, building) {
        graphics.clear();

        const state = BuildingRenderer.stateOf(building);
        const program = BuildingRenderer.programOf(building);
        const metrics = PROGRAMS[program];

        drawShadow(graphics, metrics, state);

        switch (program) {
            case 'canteen':
                drawCanteen(graphics, state);
                break;
            case 'tea_house':
                drawTeaHouse(graphics, state);
                break;
            case 'garden_dome':
                drawGardenDome(graphics, state);
                break;
            case 'bathhouse':
                drawBathhouse(graphics, state);
                break;
            case 'amphitheatre':
                drawAmphitheatre(graphics, state);
                break;
            case 'observatory':
                drawObservatory(graphics, state);
                break;
            case 'creche':
                drawCreche(graphics, state);
                break;
            case 'festival_kitchen':
                drawCanteen(graphics, state);
                break;
            case 'workshop':
                drawWorkshop(graphics, state);
                break;
            case 'clinic':
                drawClinic(graphics, state);
                break;
            case 'commons_beacon':
                drawCommonsBeacon(graphics, state);
                break;
            case 'housing':
            default:
                drawHousing(graphics, state);
                break;
        }

        if (state.ghost) drawScaffold(graphics, metrics, state);
    }

    static programOf(building) {
        const candidate = building.programId || building.blueprintId || PROGRAM_FALLBACK;
        if (Object.prototype.hasOwnProperty.call(PROGRAMS, candidate)) return candidate;
        return PROGRAM_FALLBACK;
    }

    static stateOf(building) {
        const active = building.state === 'ACTIVE';
        return {
            active,
            pending: building.state === 'PENDING',
            ghost: !active
        };
    }

    static storeyTop(programId) {
        return storeyTop(programId);
    }
}
