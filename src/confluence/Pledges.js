/**
 * The five festival promises. A pledge speaks to one resident need; the same
 * list is used by the player's campaign, rival campaigns and the final vote.
 */
export const PLEDGES = [
    {
        id: 'sustenance',
        need: 'sustenance',
        name: 'A night kitchen',
        headline: 'Hot food at every hour.',
        copy: 'No queue, no questions, a plate kept warm through the small hours.'
    },
    {
        id: 'rest',
        need: 'rest',
        name: "A room of one's own",
        headline: 'A quiet bed for everyone who asks.',
        copy: 'Not a bunk in a hall, but a door that closes and a window that opens.'
    },
    {
        id: 'company',
        need: 'company',
        name: 'The long table',
        headline: 'A seat kept open at every table.',
        copy: 'A place to linger, argue, listen and be known by name.'
    },
    {
        id: 'purpose',
        need: 'purpose',
        name: "A bench of one's own",
        headline: 'Work worth doing, close to home.',
        copy: 'A workshop, a tool wall, a place where what you make is needed.'
    },
    {
        id: 'wonder',
        need: 'wonder',
        name: 'A garden in the void',
        headline: 'Something strange and green within walking distance.',
        copy: 'A dome, a path, a bench under leaves that should not grow here.'
    }
];

export const PLEDGE_BY_ID = Object.fromEntries(PLEDGES.map((pledge) => [pledge.id, pledge]));
