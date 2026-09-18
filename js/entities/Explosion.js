import { TILE_TYPES } from '../world/MapGenerator.js';

export class Explosion {
    constructor(tileX, tileY, range, tileSize, grid, bombsList, particleSystem) {
        this.tileSize = tileSize;
        this.duration = 0.5;
        this.cells = [];
        this.destroyedBlocks = [];

        this._calculateSpread(tileX, tileY, range, grid, bombsList);

        if (particleSystem) {
            for (const c of this.cells) {
                particleSystem.emit(
                    c.x * tileSize + tileSize / 2,
                    c.y * tileSize + tileSize / 2,
                    '#ef4444',
                    4,
                    60,
                    0.35
                );
            }
        }
    }

    _calculateSpread(startX, startY, range, grid, bombsList) {
        this.cells.push({ x: startX, y: startY });

        const directions = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];

        for (const dir of directions) {
            for (let step = 1; step <= range; step++) {
                const tx = startX + dir.dx * step;
                const ty = startY + dir.dy * step;

                if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[0].length) break;
                const tile = grid[ty][tx];

                if (tile === TILE_TYPES.SOLID_WALL) break;

                this.cells.push({ x: tx, y: ty });

                const hitBomb = bombsList.find(b => !b.isExploded && b.tileX === tx && b.tileY === ty);
                if (hitBomb) hitBomb.timer = 0;

                if (tile === TILE_TYPES.DESTRUCTIBLE) {
                    grid[ty][tx] = TILE_TYPES.FLOOR;
                    this.destroyedBlocks.push({ x: tx, y: ty });
                    break;
                }
            }
        }
    }

    update(deltaTime) {
        this.duration -= deltaTime;
    }

    get isFinished() { return this.duration <= 0; }

    draw(ctx) {
        const progress = this.duration / 0.5;
        const alpha = Math.max(0, progress);

        ctx.save();
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 15;

        for (const cell of this.cells) {
            const cx = cell.x * this.tileSize + this.tileSize / 2;
            const cy = cell.y * this.tileSize + this.tileSize / 2;
            const size = (this.tileSize / 2) * (0.6 + (1 - progress) * 0.4);

            ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.85})`;
            ctx.beginPath();
            ctx.arc(cx, cy, size, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.65, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    hitsEntity(entity) {
        const innerRadius = entity.radius * 0.45;
        for (const cell of this.cells) {
            const minX = cell.x * this.tileSize;
            const maxX = minX + this.tileSize;
            const minY = cell.y * this.tileSize;
            const maxY = minY + this.tileSize;

            const closestX = Math.max(minX, Math.min(entity.x, maxX));
            const closestY = Math.max(minY, Math.min(entity.y, maxY));

            const distSq = (entity.x - closestX) ** 2 + (entity.y - closestY) ** 2;
            if (distSq < (innerRadius ** 2)) return true;
        }
        return false;
    }
}