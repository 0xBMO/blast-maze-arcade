import { Pathfinding } from '../ai/Pathfinding.js';

export const ENEMY_TYPES = {
    RANDOM: 'random',
    BFS: 'bfs',
    ASTAR: 'astar',
    PREDICTIVE: 'predictive'
};

export class Enemy {
    constructor(tileX, tileY, tileSize, type = ENEMY_TYPES.RANDOM) {
        this.tileSize = tileSize;
        this.type = type;

        this.x = tileX * tileSize + tileSize / 2;
        this.y = tileY * tileSize + tileSize / 2;
        this.radius = tileSize * 0.35;
        this.speed = 85;

        this.currentPath = [];
        this.recalculateTimer = 0;
        this.isDead = false;
        this.animTime = Math.random() * 10;

        this._setupColorsAndSpeed();
    }

    _setupColorsAndSpeed() {
        switch (this.type) {
            case ENEMY_TYPES.RANDOM:
                this.color = '#f43f5e';
                this.name = 'Aleatorio';
                this.speed = 70;
                break;
            case ENEMY_TYPES.BFS:
                this.color = '#8b5cf6';
                this.name = 'BFS';
                this.speed = 80;
                break;
            case ENEMY_TYPES.ASTAR:
                this.color = '#10b981';
                this.name = 'A* Hunter';
                this.speed = 90;
                break;
            case ENEMY_TYPES.PREDICTIVE:
                this.color = '#ea580c';
                this.name = 'Predictivo';
                this.speed = 95;
                break;
        }
    }

    get tileX() { return Math.floor(this.x / this.tileSize); }
    get tileY() { return Math.floor(this.y / this.tileSize); }

    update(deltaTime, grid, player) {
        if (this.isDead) return;

        this.animTime += deltaTime * 5;
        this.recalculateTimer -= deltaTime;
        if (this.recalculateTimer <= 0) {
            this._decideNextMove(grid, player);
            this.recalculateTimer = 0.4;
        }

        this._followPath(deltaTime);
    }

    _decideNextMove(grid, player) {
        const start = { x: this.tileX, y: this.tileY };
        const playerPos = { x: player.tileX, y: player.tileY };

        const doRandomStep = () => {
            if (this.currentPath.length === 0) {
                const neighbors = Pathfinding.getNeighbors(grid, start);
                if (neighbors.length > 0) {
                    this.currentPath = [neighbors[Math.floor(Math.random() * neighbors.length)]];
                }
            }
        };

        if (this.type === ENEMY_TYPES.RANDOM) {
            doRandomStep();
            return;
        }

        if (this.type === ENEMY_TYPES.BFS) {
            const path = Pathfinding.bfs(grid, start, playerPos);
            if (path.length > 0) this.currentPath = path;
            else doRandomStep();
            return;
        }

        if (this.type === ENEMY_TYPES.ASTAR) {
            const path = Pathfinding.aStar(grid, start, playerPos);
            if (path.length > 0) this.currentPath = path;
            else doRandomStep();
            return;
        }

        if (this.type === ENEMY_TYPES.PREDICTIVE) {
            let offset = { x: 0, y: 0 };
            if (player.direction === 'up') offset.y = -2;
            if (player.direction === 'down') offset.y = 2;
            if (player.direction === 'left') offset.x = -2;
            if (player.direction === 'right') offset.x = 2;

            let predTarget = { x: playerPos.x + offset.x, y: playerPos.y + offset.y };
            if (!Pathfinding.isWalkable(grid, predTarget.x, predTarget.y)) {
                predTarget = playerPos;
            }

            const path = Pathfinding.aStar(grid, start, predTarget);
            if (path.length > 0) this.currentPath = path;
            else doRandomStep();
        }
    }

    _followPath(deltaTime) {
        if (this.currentPath.length === 0) return;

        const nextTile = this.currentPath[0];
        const targetPixelX = nextTile.x * this.tileSize + this.tileSize / 2;
        const targetPixelY = nextTile.y * this.tileSize + this.tileSize / 2;

        const dx = targetPixelX - this.x;
        const dy = targetPixelY - this.y;
        const dist = Math.hypot(dx, dy);
        const step = this.speed * deltaTime;

        if (dist <= step) {
            this.x = targetPixelX;
            this.y = targetPixelY;
            this.currentPath.shift();
        } else {
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
        }
    }

    draw(ctx, isDebug = false) {
        if (this.isDead) return;

        if (isDebug && this.currentPath.length > 0) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            for (const node of this.currentPath) {
                const nx = node.x * this.tileSize + this.tileSize / 2;
                const ny = node.y * this.tileSize + this.tileSize / 2;
                ctx.lineTo(nx, ny);
            }
            ctx.stroke();
            ctx.lineWidth = 1;
        }

        ctx.save();
        const floatY = Math.sin(this.animTime) * 3;
        ctx.translate(this.x, this.y + floatY);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 14 - floatY, 13, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;

        switch (this.type) {
            case ENEMY_TYPES.RANDOM:
                ctx.fillStyle = '#f43f5e';
                ctx.beginPath();
                ctx.arc(0, 0, 13, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#881337';
                ctx.beginPath();
                ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
                ctx.fill();
                break;

            case ENEMY_TYPES.BFS:
                ctx.fillStyle = '#8b5cf6';
                ctx.beginPath();
                ctx.roundRect(-11, -11, 22, 22, 4);
                ctx.fill();
                const sway = Math.sin(this.animTime * 1.5) * 3;
                ctx.strokeStyle = '#c4b5fd';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -11);
                ctx.lineTo(sway, -19);
                ctx.stroke();
                ctx.fillStyle = '#ec4899';
                ctx.fillRect(sway - 2, -21, 4, 4);
                ctx.fillStyle = '#22d3ee';
                ctx.fillRect(-7, -4, 4, 5);
                ctx.fillRect(3, -4, 4, 5);
                break;

            case ENEMY_TYPES.ASTAR:
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.moveTo(0, -15);
                ctx.lineTo(13, 10);
                ctx.lineTo(-13, 10);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#facc15';
                ctx.beginPath();
                ctx.arc(0, 1, 3.5 + Math.sin(this.animTime * 2) * 1.5, 0, Math.PI * 2);
                ctx.fill();
                break;

            case ENEMY_TYPES.PREDICTIVE:
                ctx.fillStyle = '#ea580c';
                ctx.beginPath();
                ctx.roundRect(-12, -12, 24, 24, 6);
                ctx.fill();
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(-8, -6, 16, 4);
                ctx.fillStyle = '#facc15';
                ctx.fillRect(-8, 2, 16, 4);
                break;
        }

        ctx.restore();

        if (isDebug) {
            ctx.strokeStyle = '#ef4444';
            ctx.strokeRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
            ctx.fillStyle = '#f8fafc';
            ctx.font = '10px monospace';
            ctx.fillText(this.name, this.x - 18, this.y - this.radius - 4);
        }
    }

    touchesPlayer(player) {
        const dist = Math.hypot(this.x - player.x, this.y - player.y);
        return dist < (this.radius + player.radius);
    }
}