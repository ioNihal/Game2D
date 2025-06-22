export default class AssetLoader {
    constructor() {
        this.images = {};
    }

    /**
     * load a single image
     * @param {string} key unique key to identify this image
     * @param {string} url URL or path to image file.
     * @returns Promise that resolves when loaded or rejects on error,
     */
    loadImage(key, url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = () => {
                this.images[key] = img;
                resolve(img);
            };
            img.onerror = (e) => {
                console.error(`Failed to load image ${url}`);
                reject(new Error(`Failed to load image ${url}`));
            };
        });
    }

    /**
   * Load multiple images given an array of { key, url }.
   * @param {Array<{key: string, url: string}>} imageList
   * @returns Promise that resolves when all images loaded.
   */
    loadImages(imageList) {
        const promises = imageList.map(item => this.loadImage(item.key, item.url));
        return Promise.all(promises);
    }


    /**
   * Retrieve a loaded image by its key.
   * @param {string} key
   * @returns HTMLImageElement
   */
    getImage(key) {
        return this.images[key];
    }
}
