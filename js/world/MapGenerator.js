export const TILE_TYPES = {
    FLOOR: 0,
    SOLID_WALL: 1,
    DESTRUCTIBLE: 2,
    ENEMY: 3,
    POWERUP: 4,
    PLAYER: 5,
    EXIT: 6
};

export class MapGenerator {
    constructor(cols = 15, rows = 13) {
        // Deben ser números impares para el patrón clásico de bomberman
        this.cols = cols % 2 === 0 ? cols + 1 : cols;
        this.rows = rows % 2 === 0 ? rows + 1 : rows;
    }

    generate() {
        let validMap = false;
        let grid = [];
        let exitPos = { x: 0, y: 0 };

        while (!validMap) {
            grid = this._createRawGrid();
            exitPos = this._placeExit(grid);
            
            // Validar que exista ruta transitable entre jugador (1,1) y salida
            if (this._isSolvable(grid, 1, 1, exitPos.x, exitPos.y)) {
                validMap = true;
            }
        }

        return { grid, exitPos, cols: this.cols, rows: this.rows };
    }

    _createRawGrid() {
        const grid = [];
        for (let r = 0; r < this.rows; r++) {
            grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                // Muros perimetrales
                if (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1) {
                    grid[r][c] = TILE_TYPES.SOLID_WALL;
                } 
                // Pilares fijos intercalados
                else if (r % 2 === 0 && c % 2 === 0) {
                    grid[r][c] = TILE_TYPES.SOLID_WALL;
                } 
                // Bloques destruibles aleatorios
                else {
                    // Zona inicial segura del jugador (1,1), (1,2), (2,1)
                    const isSafeZone = (r === 1 && c === 1) || (r === 1 && c === 2) || (r === 2 && c === 1);
                    if (!isSafeZone && Math.random() < 0.65) {
                        grid[r][c] = TILE_TYPES.DESTRUCTIBLE;
                    } else {
                        grid[r][c] = TILE_TYPES.FLOOR;
                    }
                }
            }
        }
        return grid;
    }

    _placeExit(grid) {
        const destructibleTiles = [];
        for (let r = 1; r < this.rows - 1; r++) {
            for (let c = 1; c < this.cols - 1; c++) {
                if (grid[r][c] === TILE_TYPES.DESTRUCTIBLE) {
                    destructibleTiles.push({ x: c, y: r });
                }
            }
        }
        
        // Selecciona un bloque destruible al azar para ocultar la salida
        const choice = destructibleTiles[Math.floor(Math.random() * destructibleTiles.length)];
        return choice || { x: this.cols - 2, y: this.rows - 2 };
    }

    // BFS para validar que existe al menos una ruta posible
    _isSolvable(grid, startX, startY, targetX, targetY) {
        const visited = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
        const queue = [{ x: startX, y: startY }];
        visited[startY][startX] = true;

        const directions = [
            { x: 0, y: -1 }, { x: 0, y: 1 },
            { x: -1, y: 0 }, { x: 1, y: 0 }
        ];

        while (queue.length > 0) {
            const current = queue.shift();

            if (current.x === targetX && current.y === targetY) {
                return true;
            }

            for (const dir of directions) {
                const nx = current.x + dir.x;
                const ny = current.y + dir.y;

                if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                    // Se consideran transitables suelo y bloques destruibles (ya que se rompen con bombas)
                    const isWalkableOrBreakable = grid[ny][nx] !== TILE_TYPES.SOLID_WALL;

                    if (!visited[ny][nx] && isWalkableOrBreakable) {
                        visited[ny][nx] = true;
                        queue.push({ x: nx, y: ny });
                    }
                }
            }
        }
        return false;
    }
}