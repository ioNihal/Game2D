/**
 * EventBus — minimal typed-ish event emitter.
 * Decouples systems: producers emit, consumers subscribe, nobody reaches into
 * another object's internals.
 */
export default class EventBus {
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this._handlers = new Map();
    }

    /**
     * Subscribe to an event.
     * @returns {() => void} unsubscribe function
     */
    on(event, handler) {
        if (!this._handlers.has(event)) this._handlers.set(event, new Set());
        this._handlers.get(event).add(handler);
        return () => this.off(event, handler);
    }

    /** Subscribe for a single emission, then auto-unsubscribe. */
    once(event, handler) {
        const unsub = this.on(event, (...args) => {
            unsub();
            handler(...args);
        });
        return unsub;
    }

    off(event, handler) {
        this._handlers.get(event)?.delete(handler);
    }

    emit(event, ...args) {
        this._handlers.get(event)?.forEach(handler => handler(...args));
    }

    clear() {
        this._handlers.clear();
    }
}
