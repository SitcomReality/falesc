import { BUILDABLE_PROGRAMS, PROGRAM_BY_ID } from '../design/programs.js';

/**
 * The browser console surface. Kept out of the coordinator so the debug harness
 * can be read, tested and changed without growing FalescGame.
 */
export function installDebugApi(game) {
    window.__falesc = {
            app: game,
            get ready() {
                return window.__APP_READY__ === true;
            },
            snapshot() {
                const charter = game.charter;
                const services = charter?.services.services || [];
                const residents = charter?.activeResidents || [];
                const report = charter?.lastReport;
                return {
                    ready: window.__APP_READY__ === true,
                    frame: game.frameCount,
                    state: game.screenStateMachine.state,
                    day: charter?.day || 0,
                    turn: charter?.day || 0,
                    dayLimit: charter?.dayLimit || 0,
                    lumen: charter?.lumen || 0,
                    works: charter?.works || 0,
                    actionsRemaining: charter?.works || 0,
                    population: charter?.population || 0,
                    visitors: charter?.visitors?.length || 0,
                    housedPopulation: charter?.housedPopulation || 0,
                    housingCapacity: charter?.housingCapacity || 0,
                    spareBeds: charter?.spareBeds || 0,
                    flourishing: charter?.flourishing || 0,
                    devotion: charter?.devotion || 0,
                    projectedNet: charter?.projectedNet || 0,
                    projectedContributions: charter?.projectedContributions || 0,
                    projectedUpkeep: charter?.projectedUpkeep || 0,
                    selectedProgram: game.selectedProgramId,
                    selectedBlueprint: game.selectedProgramId,
                    seed: game.settings.mapSeed,
                    mapSize: game.settings.mapSize,
                    mode: game.charter?.mode || game.settings.mode,
                    rivalCount: game.charter?.rivals?.length || 0,
                    characters: game.crowd.agents.size,
                    sectors: game.world.map?.sectors.length || 0,
                    services: services.map((service) => ({
                        id: service.id,
                        name: service.name,
                        programId: service.programId,
                        blueprintId: service.programId,
                        state: service.state,
                        capacity: service.capacity,
                        visits: service.visits,
                        hearts: service.hearts,
                        closed: service.closed,
                        u: service.u,
                        v: service.v,
                        entrance: service.entrance
                    })),
                    buildings: services.length,
                    allServices: game.charter?.allServices?.length || services.length,
                    patronageVisible: Boolean(game.patronageFlow?.visible),
                    patronageLines: game.patronageFlow?.lineCount || 0,
                    buildingStates: services.map((service) => service.state),
                    buildingBlueprints: services.map((service) => service.programId),
                    residents: residents.map((resident) => ({
                        id: resident.id,
                        name: resident.name,
                        traits: { ...resident.traits },
                        needs: { ...resident.needs },
                        wellbeing: resident.wellbeing,
                        homeServiceId: resident.homeServiceId,
                        affinity: resident.affinity.player,
                        lastChoice: resident.memory.lastChoice
                    })),
                    report: report ? {
                        day: report.day,
                        visits: report.visits,
                        hearts: report.hearts,
                        heartsGained: report.heartsGained,
                        heartsLost: report.heartsLost,
                        contributions: report.contributions,
                        dividend: report.dividend || 0,
                        visitors: report.visitors || 0,
                        visitorFees: report.visitorFees || 0,
                        playerVisitorFees: report.playerVisitorFees || 0,
                        visitorDetails: (report.visitorDetails || []).map((visitor) => ({ ...visitor })),
                        stayedVisitors: report.stayedVisitors || 0,
                        visitorFeesByChapter: report.visitorFeesByChapter || {},
                        upkeep: report.upkeep,
                        net: report.net,
                        lumenAfter: report.lumenAfter,
                        flourishing: report.flourishing,
                        complaints: report.complaints?.length || 0,
                        arrivals: report.arrivals || [],
                        departures: report.departures || [],
                        patronageByChapter: report.patronageByChapter || {},
                        devotionByChapter: report.devotionByChapter || {},
                        chapters: report.chapters || [],
                        campaignEvent: report.campaignEvent || null,
                        request: report.request || null,
                        visitors: report.visitors || 0,
                        visitorFees: report.visitorFees || 0,
                        playerVisitorFees: report.playerVisitorFees || 0,
                        visitorDetails: (report.visitorDetails || []).map((visitor) => ({ ...visitor })),
                        stayedVisitors: report.stayedVisitors || 0,
                        commons: report.commons || null,
                        population: report.population,
                        quotes: report.quotes,
                        outcome: report.outcome || null
                    } : null,
                    ending: charter?.ending || null,
                    confluenceReady: Boolean(charter?.confluenceReady),
                    stewardship: charter?.stewardship || null,
                    campaign: charter?.campaign?.toJSON?.() || null,
                    commons: charter?.commons || null,
                    chapters: charter?.standings?.() || [],
                    devotionByChapter: charter?.devotionByChapter || {},
                    buildModalOpen: game.buildModal.isOpen,
                    bulletinOpen: game.bulletinModal.isOpen,
                    residentCardOpen: game.residentCard.isOpen,
                    playback: game.playback ? {
                        clock: game.playback.clock,
                        duration: game.playback.duration,
                        speed: game.playback.speed
                    } : null,
                    endResult: game.charter?.ending || game.endResult || null,
                    camera: {
                        x: game.world.camera.position.x,
                        y: game.world.camera.position.y,
                        zoom: game.world.camera.zoom
                    }
                };
            },
            findFreeCell(programId = null) {
                if (!game.charter || !game.world.map) return null;
                const program = PROGRAM_BY_ID[programId || game.selectedProgramId] || BUILDABLE_PROGRAMS[0];
                const sectors = [game.world.homeSector, game.charter.commonsSector, game.charter.gardenSector].filter(Boolean);
                for (const sector of sectors) {
                    for (let v = 0; v < sector.gridSize; v++) {
                        for (let u = 0; u < sector.gridSize; u++) {
                            const check = game.charter.services.canPlace(program.id, sector.id, u, v);
                            if (!check.ok) continue;
                            const pos = sector._project(u + 0.5, v + 0.5);
                            return { sectorId: sector.id, u, v, x: pos.x, y: pos.y, programId: program.id };
                        }
                    }
                }
                return null;
            },
            worldToScreen(x, y) {
                return game.world.worldToScreen(x, y);
            },
            selectProgram(id) {
                return game.selectProgram(id);
            },
            selectBlueprint(id) {
                return game.selectProgram(id);
            },
            openDay() {
                return game.openDay();
            },
            showConfluence() {
                return game.showConfluence();
            },
            showStewardship() {
                return game.showStewardship();
            },
            showCommons() {
                return game.showCommons();
            },
            showCampaign() {
                return game.showCampaign();
            },
            skipDay() {
                return game.skipDay();
            },
            beginNextDay() {
                return game.beginNextDay();
            },
            setPlaybackSpeed(speed) {
                game.setPlaybackSpeed(speed);
                return game.playbackSpeed;
            },
            showBulletin() {
                game.showBulletin();
                return game.bulletinModal.isOpen;
            },
            toggleAudio() {
                return game.toggleAudio();
            },
            togglePatronage() {
                return game.togglePatronage();
            },
            showResidents() {
                game.showResidentRoster();
                return game.residentCard.isOpen;
            },
            openResident(id) {
                game.openResident(id);
                return game.residentCard.isOpen;
            },
            saveGame() {
                return game.saveGame();
            },
            exportSave() {
                return game.exportSave();
            },
            importSave(text) {
                return game.importSave(text);
            },
            continueGame() {
                return game.continueCharter();
            },
            continueCharter() {
                return game.continueCharter();
            },
            endCharter(outcome = 'abandon') {
                game.endCharter(outcome);
            },
            serviceAt(sectorId, u, v) {
                return game.charter?.services.serviceAt(sectorId, u, v) || null;
            },
            startCharter(seed, size = 'medium', mode = null) {
                if (Number.isInteger(seed)) game.settings.mapSeed = seed;
                if (size) game.settings.mapSize = size;
                if (mode) game.settings.mode = mode;
                return game.startCharter();
            }
        };
}
