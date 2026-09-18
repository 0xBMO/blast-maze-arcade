export class AssetManager {
    constructor() {
        this.images = {};
        this.toLoad = 0;
        this.loaded = 0;
    }

    loadImage(key, src) {
        this.toLoad++;
        const img = new Image();
        img.src = src;
        img.onload = () => {
            this.loaded++;
            this.images[key] = img;
        };
        img.onerror = () => {
            console.error(`No se pudo cargar la imagen en: ${src}`);
        };
    }

    isReady() {
        return this.toLoad > 0 && this.loaded === this.toLoad;
    }

    get(key) {
        return this.images[key];
    }
}