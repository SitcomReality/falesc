/**
 * One tuning table for the First Light slice. Balance changes should land here,
 * not as scattered literals in the simulation.
 */
export const BALANCE = {
    startingLumen: 10,
    worksPerDay: 2,
    campaign: {
        days: 3
    },
    visitors: {
        min: 2,
        max: 3,
        fee: 1,
        stayAffinity: 0.15
    },
    commons: {
        target: 20,
        rivalDaily: 1,
        minRivalLumen: 6,
        comfort: 3
    },
    contest: {
        startingLumen: 15,
        civicDividend: 1,
        rivalWorksPerDay: 1,
        startingResidentsPerChapter: 3
    },
    rosterSize: 15,
    startingResidents: 6,
    dayLimits: { small: 12, medium: 14, large: 16 },

    needs: {
        // A resident with no service available starts complaining at this level.
        complaintThreshold: 62,
        // The world report calls out the most urgent need above this.
        bulletinThreshold: 55,
        // A resident leaves after this many consecutive days at/above departureNeed.
        leaveAfterUnmetDays: 3,
        departureNeed: 92
    },

    services: {
        primaryEffect: 34,
        secondaryEffect: 15,
        queuePenalty: 0.7,
        maxQueue: 3,
        visitAffinity: 0.09,
        urgentVisitAffinity: 0.07,
        serviceHeart: 0.1
    },

    housing: {
        restRecovery: 38,
        homelessRestPenalty: 12,
        homelessNightsBeforeLeaving: 2,
        housedAffinity: 0.04
    },

    devotion: {
        startingAffinity: 0.8,
        maxAffinity: 5,
        minAffinity: 0,
        decayTowardNeutral: 0.02
    },

    economy: {
        contributionHigh: 2,
        contributionNeutral: 1,
        contributionLow: 0,
        highWellbeing: 65,
        lowWellbeing: 35,
        closureOrder: ['wonder', 'company', 'sustenance', 'rest']
    },

    arrivals: {
        perDay: 2,
        minFlourishing: 20
    },

    end: {
        minPopulation: 4,
        comfortableFlourishing: 62,
        firstLightPopulation: 12,
        sharedSurvival: 25
    },

    playback: {
        phaseSeconds: 5,
        travelSpeed: 1100,
        minTravel: 0.45,
        maxTravel: 1.9
    }
};

export const DAY_PHASES = [
    { id: 'morning', name: 'Morning', blurb: 'The lamps come up. Breakfast first.' },
    { id: 'afternoon', name: 'Afternoon', blurb: 'Errands, tea, the quiet trade.' },
    { id: 'evening', name: 'Evening', blurb: 'The social peak. Doors glow.' },
    { id: 'night', name: 'Night', blurb: 'Beds, small hours, the last light.' }
];
