/**
 * createStateMachine — a tiny generic finite state machine.
 *
 * States: Record<name, { enter?(ctx, ...args), update?(ctx, ...args), exit?(ctx) }>
 *
 * - setState() runs exit on the old state, then enter on the new one.
 * - update() delegates to the current state's update; if that function
 *   returns a state name string, the machine transitions to it.
 *
 * Shared by Fighter (Phase 2) and AIController (Phase 5).
 */
export function createStateMachine(states, initialState, ctx) {
    let current = initialState;

    const machine = {
        get state() { return current; },

        setState(next, ...args) {
            if (next === current || !states[next]) return;
            states[current]?.exit?.(ctx);
            current = next;
            states[current]?.enter?.(ctx, ...args);
        },

        update(...args) {
            const fn = states[current]?.update;
            if (!fn) return;
            const next = fn(ctx, ...args);
            if (typeof next === 'string' && next !== current) {
                machine.setState(next);
            }
        },
    };

    return machine;
}
