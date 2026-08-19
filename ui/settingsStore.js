import EventBus from '../core/eventBus.js';

/** Defaults — kept as the single fallback when nothing is stored yet. */
const DEFAULT_SETTINGS = Object.freeze({
    masterVolume: 0.5,
    musicVolume: 0.5,
    sfxVolume: 0.5,
    muted: false,
    touchMode: 'auto',
    difficulty: 'normal',
});

/**
 * SettingsStore — single source of truth for persisted game settings.
 * Decoupled from the DOM: UI writes via update(), systems react via
 * onChange(). Every update persists to storage and emits 'settingsChanged'.
 */
export default class SettingsStore {
    /**
     * @param {{ storage?: Storage, key?: string, eventBus?: EventBus }} [opts]
     */
    constructor({ storage = window.localStorage, key = 'stickmanSettings', eventBus } = {}) {
        this._storage = storage;
        this._key = key;
        this._eventBus = eventBus ?? new EventBus();
        this._settings = { ...DEFAULT_SETTINGS, ...this._read() };
    }

    //  Accessors

    get masterVolume() { return this._settings.masterVolume; }
    get musicVolume() { return this._settings.musicVolume; }
    get sfxVolume() { return this._settings.sfxVolume; }
    get muted() { return this._settings.muted; }
    get touchMode() { return this._settings.touchMode; }
    get difficulty() { return this._settings.difficulty; }

    /** Snapshot of the current settings. */
    getAll() {
        return { ...this._settings };
    }

    //  Mutation

    /** Merge `partial` into settings, persist, and notify listeners. */
    update(partial) {
        this._settings = { ...this._settings, ...partial };
        this._persist();
        this._eventBus.emit('settingsChanged', this.getAll());
    }

    /** Restore defaults, persist, and notify listeners. */
    reset() {
        this._settings = { ...DEFAULT_SETTINGS };
        this._persist();
        this._eventBus.emit('settingsChanged', this.getAll());
    }

    /**
     * Subscribe to any settings change.
     * @returns {() => void} unsubscribe function
     */
    onChange(handler) {
        return this._eventBus.on('settingsChanged', handler);
    }

    //  Persistence

    _read() {
        try {
            const raw = this._storage?.getItem(this._key);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    _persist() {
        try {
            this._storage?.setItem(this._key, JSON.stringify(this._settings));
        } catch {
            /* storage unavailable — settings stay in-memory */
        }
    }
}
