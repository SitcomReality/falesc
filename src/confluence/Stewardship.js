/**
 * The winning chapter's governing promise. This is the epilogue choice: it
 * shapes how the commons is remembered, not the already-resolved day.
 */
export const STEWARDSHIP_POLICIES = [
    {
        id: 'universal_care',
        name: 'Universal Care',
        headline: 'A bed is not a reward.',
        copy: 'Every resident gets a bed, a meal and a door that opens by right, not by luck.',
        epilogue: 'The charter writes care into the ledger. Nobody has to earn a place to sleep.'
    },
    {
        id: 'open_table',
        name: 'The Open Table',
        headline: 'No one is a guest.',
        copy: 'The table grows, the kitchens stay warm, and the next arrival is expected.',
        epilogue: 'The table grows past the charter. The next ship is already expected.'
    },
    {
        id: 'commons_assembly',
        name: 'Commons Assembly',
        headline: 'The works belong to their users.',
        copy: 'Residents choose what gets built, what stays open, and what the chapter owes them.',
        epilogue: 'The works are argued over in public now. That is the point.'
    },
    {
        id: 'workshop_charter',
        name: 'Workshop Charter',
        headline: 'Work is infrastructure.',
        copy: 'A bench, a tool wall and a place to make what the chapter needs are written into the charter.',
        epilogue: 'The charter keeps a workshop in the void. Making things is scheduled like water.'
    },
    {
        id: 'garden_charter',
        name: 'Garden Charter',
        headline: 'Beauty is infrastructure.',
        copy: 'A garden, a bench and a view are written into the charter beside food and shelter.',
        epilogue: 'The charter keeps a garden in the void. Beauty is scheduled like water.'
    }
];

export const STEWARDSHIP_BY_ID = Object.fromEntries(
    STEWARDSHIP_POLICIES.map((policy) => [policy.id, policy])
);
