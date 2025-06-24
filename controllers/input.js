export default class InputHandler {
    constructor() {
        this.keys = {};
        this.prevKeys = {};
        this.justPressed = {};

        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) {
                this.keys[e.code] = true;
                this.justPressed[e.code] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    isKeyDown(code) {
        return !!this.keys[code];
    }

    isKeyJustPressed(code) {
        return !!this.keys[code] && !this.prevKeys[code];
    }

    setVirtualKeyDown(code) {
        if (!this.keys[code]) {
            this.keys[code] = true;
            this.justPressed[code] = true;
        }
    }

    setVirtualKeyUp(code) {
        this.keys[code] = false;
    }

    update() {
        this.prevKeys = { ...this.keys };
        this.justPressed = {};
    }
}