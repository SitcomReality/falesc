/**
 * Service atmosphere. Residents have temperaments that prefer one vibe over
 * another; the player can tune the room without changing its hours or seats.
 */
export const SERVICE_VIBES = [
    {
        id: 'cosy',
        name: 'Cosy',
        blurb: 'Warm lamps, corner seats and a low hum. Cosy residents settle in.'
    },
    {
        id: 'lively',
        name: 'Lively',
        blurb: 'A full table, a little noise and gossip in the queue. Social residents bloom.'
    },
    {
        id: 'curious',
        name: 'Curious',
        blurb: 'Odd objects, a long view and something to ask about. Curious residents linger.'
    },
    {
        id: 'efficient',
        name: 'Efficient',
        blurb: 'Bright, quick and legible. Good for a rushed day, less so for a long one.'
    }
];

export const SERVICE_VIBE_BY_ID = Object.fromEntries(SERVICE_VIBES.map((entry) => [entry.id, entry]));

export function serviceVibeFor(service) {
    return SERVICE_VIBE_BY_ID[service?.policy?.vibe] || null;
}
