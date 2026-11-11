/** Which need a dual-need service leans toward. */
export const SERVICE_FOCUS = [
    { id: 'balanced', name: 'Both needs', note: 'No bonus; no trade-off.' },
    { id: 'primary', name: 'Primary need', note: 'A little better for the program’s first need.' },
    { id: 'secondary', name: 'Secondary need', note: 'A little better for the program’s second need.' }
];

export const SERVICE_FOCUS_BY_ID = Object.fromEntries(SERVICE_FOCUS.map((entry) => [entry.id, entry]));

export function focusFitFor(service, needId) {
    const focus = service?.policy?.focus || 'balanced';
    if (focus === 'balanced') return 1;
    const program = service.program;
    if (focus === 'primary' && program?.need === needId) return 1.05;
    if (focus === 'secondary' && program?.secondaryNeed === needId) return 1.05;
    return 0.98;
}
