/**
 * AssetLoader — loads and caches HTMLImageElement instances by key.
 */
export default class AssetLoader {
    constructor() {
        /** @type {Map<string, HTMLImageElement>} */
        this._images = new Map();
    }

    /**
     * Loads a single image and caches it under `key`.
     * @param {string} key
     * @param {string} url
     * @returns {Promise<HTMLImageElement>}
     */
    loadImage(key, url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload  = () => { this._images.set(key, img); resolve(img); };
            img.onerror = () => reject(new Error(`[AssetLoader] Failed to load: ${url}`));
            img.src = url;
        });
    }

    /**
     * Loads multiple images in parallel.
     * @param {{ key: string, url: string }[]} list
     * @returns {Promise<HTMLImageElement[]>}
     */
    loadImages(list) {
        return Promise.all(list.map(({ key, url }) => this.loadImage(key, url)));
    }

    /**
     * Returns a cached image or undefined if not loaded.
     * @param {string} key
     * @returns {HTMLImageElement|undefined}
     */
    getImage(key) {
        return this._images.get(key);
    }
}
