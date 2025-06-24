export default class AssetLoader {
    constructor() {
        this.images = {};
    }
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

    loadImages(imageList) {
        const promises = imageList.map(item => this.loadImage(item.key, item.url));
        return Promise.all(promises);
    }

    getImage(key) {
        return this.images[key];
    }
}
