export class InputHandler {
    constructor() {
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            bomb: false,
            debug: false
        };

        window.addEventListener('keydown', (e) => this._onKeyDown(e));
        window.addEventListener('keyup', (e) => this._onKeyUp(e));
    }

    _onKeyDown(e) {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') this.keys.up = true;
        if (e.code === 'ArrowDown' || e.code === 'KeyS') this.keys.down = true;
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = true;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = true;
        if (e.code === 'Space') this.keys.bomb = true;
        if (e.code === 'F2') {
            e.preventDefault();
            this.keys.debug = !this.keys.debug;
        }
    }

    _onKeyUp(e) {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') this.keys.up = false;
        if (e.code === 'ArrowDown' || e.code === 'KeyS') this.keys.down = false;
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = false;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = false;
        if (e.code === 'Space') this.keys.bomb = false;
    }
}