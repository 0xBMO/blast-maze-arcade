import { TILE_TYPES } from '../world/MapGenerator.js';

export class Player {
    constructor(tileX, tileY, tileSize) {
        this.tileSize = tileSize;
        this.x = tileX * tileSize + tileSize / 2;
        this.y = tileY * tileSize + tileSize / 2;
        this.radius = tileSize * 0.35;
        this.speed = 180;
        this.direction = 'down';

        this.maxBombs = 1;
        this.activeBombs = 0;
        this.bombRange = 1;
        this.lives = 3;
        this.isDead = false;
        this.hasShield = false;

        this.walkCycle = 0;
        this.isMoving = false;
        this.ghostTrails = [];
        this.trailTimer = 0;
    }

    get tileX() { return Math.floor(this.x / this.tileSize); }
    get tileY() { return Math.floor(this.y / this.tileSize); }

    update(deltaTime, input, grid) {
        if (this.isDead) return;

        let vx = 0;
        let vy = 0;

        if (input.keys.left) { vx -= 1; this.direction = 'left'; }
        if (input.keys.right) { vx += 1; this.direction = 'right'; }
        if (input.keys.up) { vy -= 1; this.direction = 'up'; }
        if (input.keys.down) { vy += 1; this.direction = 'down'; }

        this.isMoving = (vx !== 0 || vy !== 0);

        if (this.isMoving) {
            this.walkCycle += deltaTime * 12;
            if (vx !== 0 && vy !== 0) {
                vx *= 0.7071;
                vy *= 0.7071;
            }
        } else {
            this.walkCycle = 0;
        }

        const moveDist = this.speed * deltaTime;

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

        this.trailTimer -= deltaTime;
        if (this.isMoving && this.trailTimer <= 0) {
            this.ghostTrails.push({ x: this.x, y: this.y, alpha: 0.45 });
            this.trailTimer = 0.05;
        }

        for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
            this.ghostTrails[i].alpha -= deltaTime * 3.5;
            if (this.ghostTrails[i].alpha <= 0) this.ghostTrails.splice(i, 1);
        }
    }

    _collidesWithWorld(x, y, grid) {
        const checkPoints = [
            { x: x - this.radius, y: y - this.radius },
            { x: x + this.radius, y: y - this.radius },
            { x: x - this.radius, y: y + this.radius },
            { x: x + this.radius, y: y + this.radius }
        ];

        for (const pt of checkPoints) {
            const tx = Math.floor(pt.x / this.tileSize);
            const ty = Math.floor(pt.y / this.tileSize);

            if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[0].length) return true;
            const tile = grid[ty][tx];
            if (tile === TILE_TYPES.SOLID_WALL || tile === TILE_TYPES.DESTRUCTIBLE) return true;
        }
        return false;
    }

    draw(ctx, isDebug = false) {
        if (this.isDead) return;

        for (const t of this.ghostTrails) {
            ctx.save();
            ctx.globalAlpha = t.alpha;
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.arc(t.x, t.y, this.radius * 0.85, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        const bob = this.isMoving ? Math.sin(this.walkCycle) * 2.5 : 0;
        const footOffset = this.isMoving ? Math.sin(this.walkCycle) * 5 : 0;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 14, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        if (this.direction === 'left' || this.direction === 'right') {
            ctx.fillRect(-8 + footOffset, 10, 6, 5);
            ctx.fillRect(2 - footOffset, 10, 6, 5);
        } else {
            ctx.fillRect(-9, 10 + footOffset, 6, 5);
            ctx.fillRect(3, 10 - footOffset, 6, 5);
        }

        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.roundRect(-11, -8 + bob, 22, 18, 5);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, -9 + bob, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8;
        if (this.direction === 'down') {
            ctx.fillRect(-7, -8 + bob, 14, 5);
        } else if (this.direction === 'up') {
            ctx.fillStyle = '#475569';
            ctx.shadowBlur = 0;
            ctx.fillRect(-6, -12 + bob, 12, 4);
        } else if (this.direction === 'left') {
            ctx.fillRect(-10, -9 + bob, 7, 5);
        } else if (this.direction === 'right') {
            ctx.fillRect(3, -9 + bob, 7, 5);
        }
        ctx.shadowBlur = 0;

        if (this.hasShield) {
            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ec4899';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(0, bob, this.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.restore();

        if (isDebug) {
            ctx.strokeStyle = '#ef4444';
            ctx.strokeRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        }
    }
}