import { TILE_TYPES } from '../world/MapGenerator.js';

export class Pathfinding {
    // Comprueba si una celda es transitable para un enemigo (solo suelo libre)
    static isWalkable(grid, x, y) {
        if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return false;
        return grid[y][x] === TILE_TYPES.FLOOR;
    }

    static getNeighbors(grid, node) {
        const directions = [
            { x: 0, y: -1 }, // Arriba
            { x: 0, y: 1 },  // Abajo
            { x: -1, y: 0 }, // Izquierda
            { x: 1, y: 0 }   // Derecha
        ];
        const neighbors = [];
        for (const dir of directions) {
            const nx = node.x + dir.x;
            const ny = node.y + dir.y;
            if (this.isWalkable(grid, nx, ny)) {
                neighbors.push({ x: nx, y: ny });
            }
        }
        return neighbors;
    }

    // 1. Algoritmo BFS
    static bfs(grid, start, target) {
        if (start.x === target.x && start.y === target.y) return [];

        const queue = [start];
        const visited = new Set([`${start.x},${start.y}`]);
        const cameFrom = new Map();

        while (queue.length > 0) {
            const current = queue.shift();

            if (current.x === target.x && current.y === target.y) {
                return this._reconstructPath(cameFrom, current);
            }

            for (const neighbor of this.getNeighbors(grid, current)) {
                const key = `${neighbor.x},${neighbor.y}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    cameFrom.set(key, current);
                    queue.push(neighbor);
                }
            }
        }
        return []; // No se encontró camino libre
    }

    // 2. Algoritmo A* con Heurística Manhattan
    static aStar(grid, start, target) {
        if (start.x === target.x && start.y === target.y) return [];

        const heuristic = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

        const openSet = [start];
        const cameFrom = new Map();

        const gScore = new Map();
        gScore.set(`${start.x},${start.y}`, 0);

        const fScore = new Map();
        fScore.set(`${start.x},${start.y}`, heuristic(start, target));

        while (openSet.length > 0) {
            // Obtener el nodo con menor fScore
            openSet.sort((a, b) => {
                const fa = fScore.get(`${a.x},${a.y}`) ?? Infinity;
                const fb = fScore.get(`${b.x},${b.y}`) ?? Infinity;
                return fa - fb;
            });
            const current = openSet.shift();

            if (current.x === target.x && current.y === target.y) {
                return this._reconstructPath(cameFrom, current);
            }

            for (const neighbor of this.getNeighbors(grid, current)) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                const tentativeG = (gScore.get(`${current.x},${current.y}`) ?? Infinity) + 1;

                if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeG);
                    fScore.set(neighborKey, tentativeG + heuristic(neighbor, target));

                    if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }
        return []; // Sin ruta disponible
    }

    static _reconstructPath(cameFrom, current) {
        const path = [current];
        let key = `${current.x},${current.y}`;
        while (cameFrom.has(key)) {
            current = cameFrom.get(key);
            key = `${current.x},${current.y}`;
            path.unshift(current);
        }
        path.shift(); // Quitar la celda inicial de donde ya está el enemigo
        return path;
    }
}