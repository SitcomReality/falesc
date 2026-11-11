/**
 * Who a service is tuned for. This is a welcome policy, not an exclusion:
 * everyone can still enter, but the room reads better to one audience.
 */
export const SERVICE_ACCESS = [
    {
        id: 'open',
        name: 'Open door',
        blurb: 'Everyone gets the same welcome. No bonus, no penalty.'
    },
    {
        id: 'chapter',
        name: 'Chapter first',
        blurb: 'The owning chapter’s residents feel most at home: +4% fit; visitors −2%.'
    },
    {
        id: 'visitors',
        name: 'Visitors first',
        blurb: 'Day guests are welcomed warmly: +6% visitor fit; residents −2%.'
    }
];

export const SERVICE_ACCESS_BY_ID = Object.fromEntries(SERVICE_ACCESS.map((entry) => [entry.id, entry]));

export function accessFitFor(service, resident) {
    const access = service?.policy?.access || 'open';
    if (access === 'chapter') {
        if (resident?.visitor) return 0.98;
        return resident?.homeChapterId === service.chapterId ? 1.04 : 0.98;
    }
    if (access === 'visitors') {
        return resident?.visitor ? 1.06 : 0.98;
    }
    return 1;
}
