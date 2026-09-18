import { TILE_TYPES } from '../world/MapGenerator.js';

export class Explosion {
    constructor(tileX, tileY, range, tileSize, grid, bombsList) {
        this.tileSize = tileSize;
        this.duration = 0.45;
        this.cells = [];
        this.destroyedBlocks = []; // Guarda las coordenadas de los bloques rotos

        this._calculateSpread(tileX, tileY, range, grid, bombsList);
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

                if (tile === TILE_TYPES.SOLID_WALL) {
                    break;
                }

                this.cells.push({ x: tx, y: ty });

                const hitBomb = bombsList.find(b => !b.isExploded && b.tileX === tx && b.tileY === ty);
                if (hitBomb) {
                    hitBomb.timer = 0;
                }

                // Si impacta un bloque rompible, registrarlo y destruirlo
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

    get isFinished() {
        return this.duration <= 0;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.duration / 0.45);
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.85})`;

        for (const cell of this.cells) {
            const px = cell.x * this.tileSize;
            const py = cell.y * this.tileSize;

            ctx.fillRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);

            ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
            ctx.fillRect(px + 12, py + 12, this.tileSize - 24, this.tileSize - 24);
            ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.85})`;
        }
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
            if (distSq < (innerRadius ** 2)) {
                return true;
            }
        }
        return false;
    }
}