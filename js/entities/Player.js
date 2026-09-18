import { TILE_TYPES } from '../world/MapGenerator.js';

export class Player {
    constructor(tileX, tileY, tileSize) {
        this.tileSize = tileSize;
        // Posición en pixeles (centrado en la celda)
        this.x = tileX * tileSize + tileSize / 2;
        this.y = tileY * tileSize + tileSize / 2;
        
        this.radius = tileSize * 0.35; // Radio de colisión circular
        this.speed = 180; // Pixeles por segundo
        this.direction = 'down';

        // Estadísticas y progresión
        this.maxBombs = 1;
        this.activeBombs = 0;
        this.bombRange = 1;
        this.lives = 3;
        this.isDead = false;
        this.hasShield = false; //Power-Up
    }

    get tileX() {
        return Math.floor(this.x / this.tileSize);
    }

    get tileY() {
        return Math.floor(this.y / this.tileSize);
    }

    update(deltaTime, input, grid) {
        if (this.isDead) return;

        let vx = 0;
        let vy = 0;

        if (input.keys.left) { vx -= 1; this.direction = 'left'; }
        if (input.keys.right) { vx += 1; this.direction = 'right'; }
        if (input.keys.up) { vy -= 1; this.direction = 'up'; }
        if (input.keys.down) { vy += 1; this.direction = 'down'; }

        // Normalizar si se mueve en diagonal
        if (vx !== 0 && vy !== 0) {
            vx *= 0.7071;
            vy *= 0.7071;
        }

        const moveDist = this.speed * deltaTime;

        // Intentar mover por eje separando X e Y (evita bloqueos en esquinas)
        if (vx !== 0) {
            const nextX = this.x + vx * moveDist;
            if (!this._collidesWithWorld(nextX, this.y, grid)) {
                this.x = nextX;
            }
        }
        if (vy !== 0) {
            const nextY = this.y + vy * moveDist;
            if (!this._collidesWithWorld(this.x, nextY, grid)) {
                this.y = nextY;
            }
        }
    }

    _collidesWithWorld(x, y, grid) {
        // Puntos de chequeo alrededor del círculo del jugador
        const checkPoints = [
            { x: x - this.radius, y: y - this.radius },
            { x: x + this.radius, y: y - this.radius },
            { x: x - this.radius, y: y + this.radius },
            { x: x + this.radius, y: y + this.radius }
        ];

        for (const pt of checkPoints) {
            const tx = Math.floor(pt.x / this.tileSize);
            const ty = Math.floor(pt.y / this.tileSize);

            if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[0].length) {
                return true;
            }

            const tile = grid[ty][tx];
            // No transitable si es muro sólido o bloque rompible
            if (tile === TILE_TYPES.SOLID_WALL || tile === TILE_TYPES.DESTRUCTIBLE) {
                return true;
            }
        }
        return false;
    }

    draw(ctx, isDebug = false) {
        // Dibujo provisional del jugador
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#e0f2fe';
        ctx.stroke();

        // Pequeño visor para indicar la dirección
        ctx.fillStyle = '#ffffff';
        let eyeOffset = { x: 0, y: 0 };
        if (this.direction === 'up') eyeOffset.y = -5;
        if (this.direction === 'down') eyeOffset.y = 5;
        if (this.direction === 'left') eyeOffset.x = -5;
        if (this.direction === 'right') eyeOffset.x = 5;

        ctx.beginPath();
        ctx.arc(this.x + eyeOffset.x, this.y + eyeOffset.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Aura del Escudo si está activo
        if (this.hasShield) {
            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Visualización de Hitbox en Modo Debug (F2)
        if (isDebug) {
            ctx.strokeStyle = '#ef4444';
            ctx.strokeRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        }
    }
}