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
        this.speed = 85; // Velocidad de desplazamiento

        this.currentPath = [];
        this.targetTile = null;
        this.recalculateTimer = 0;
        this.isDead = false;

        // Configuración específica de cada tipo
        this._setupColorsAndSpeed();
    }

    _setupColorsAndSpeed() {
        switch (this.type) {
            case ENEMY_TYPES.RANDOM:
                this.color = '#e11d48'; // Rosa oscuro
                this.name = 'Aleatorio';
                this.speed = 70;
                break;
            case ENEMY_TYPES.BFS:
                this.color = '#8b5cf6'; // Morado
                this.name = 'BFS';
                this.speed = 80;
                break;
            case ENEMY_TYPES.ASTAR:
                this.color = '#10b981'; // Verde esmeralda
                this.name = 'A* Hunter';
                this.speed = 90;
                break;
            case ENEMY_TYPES.PREDICTIVE:
                this.color = '#f97316'; // Naranja cobrizo
                this.name = 'Predictivo';
                this.speed = 95;
                break;
        }
    }

    get tileX() {
        return Math.floor(this.x / this.tileSize);
    }

    get tileY() {
        return Math.floor(this.y / this.tileSize);
    }

    update(deltaTime, grid, player) {
        if (this.isDead) return;

        this.recalculateTimer -= deltaTime;
        if (this.recalculateTimer <= 0) {
            this._decideNextMove(grid, player);
            this.recalculateTimer = 0.4; // Recalcular ruta cada 400ms
        }

        this._followPath(deltaTime);
    }

    _decideNextMove(grid, player) {
        const start = { x: this.tileX, y: this.tileY };
        const playerPos = { x: player.tileX, y: player.tileY };

        // Función auxiliar para patrullaje cuando no hay ruta hacia el jugador
        const doRandomStep = () => {
            if (this.currentPath.length === 0) {
                const neighbors = Pathfinding.getNeighbors(grid, start);
                if (neighbors.length > 0) {
                    this.currentPath = [neighbors[Math.floor(Math.random() * neighbors.length)]];
                }
            }
        };

        // 1. Enemigo Aleatorio
        if (this.type === ENEMY_TYPES.RANDOM) {
            doRandomStep();
            return;
        }

        // 2. Enemigo BFS
        if (this.type === ENEMY_TYPES.BFS) {
            const path = Pathfinding.bfs(grid, start, playerPos);
            if (path.length > 0) {
                this.currentPath = path;
            } else {
                doRandomStep(); // Patrulla si el camino está bloqueado por muros destruibles
            }
            return;
        }

        // 3. Enemigo A*
        if (this.type === ENEMY_TYPES.ASTAR) {
            const path = Pathfinding.aStar(grid, start, playerPos);
            if (path.length > 0) {
                this.currentPath = path;
            } else {
                doRandomStep();
            }
            return;
        }

        // 4. Enemigo Predictivo
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
            if (path.length > 0) {
                this.currentPath = path;
            } else {
                doRandomStep();
            }
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
            this.currentPath.shift(); // Llega a la celda y toma la siguiente
        } else {
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
        }
    }

    draw(ctx, isDebug = false) {
        if (this.isDead) return;

        // Dibujo de la ruta calculada sobre el mapa en Modo Debug
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

        // Cuerpo del enemigo
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Ojos amenazantes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 3, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 5, this.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 3, 1.5, 0, Math.PI * 2);
        ctx.arc(this.x + 5, this.y - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Hitbox en Modo Debug (F2)
        if (isDebug) {
            ctx.strokeStyle = '#ef4444';
            ctx.strokeRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
            ctx.fillStyle = '#f8fafc';
            ctx.font = '10px monospace';
            ctx.fillText(this.name, this.x - 18, this.y - this.radius - 4);
        }
    }

    // Comprueba colisión circular contra el jugador
    touchesPlayer(player) {
        const dist = Math.hypot(this.x - player.x, this.y - player.y);
        return dist < (this.radius + player.radius);
    }
}