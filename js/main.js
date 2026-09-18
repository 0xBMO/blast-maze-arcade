import { MapGenerator, TILE_TYPES } from './world/MapGenerator.js';
import { InputHandler } from './core/InputHandler.js';
import { Player } from './entities/Player.js';
import { Bomb } from './entities/Bomb.js';
import { Explosion } from './entities/Explosion.js';
import { Enemy, ENEMY_TYPES } from './entities/Enemy.js';
import { PowerUp, POWERUP_TYPES } from './entities/PowerUp.js';
import { ApiClient } from './services/ApiClient.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 48;
const mapGen = new MapGenerator(17, 13);

// Estados de juego
const GAME_STATES = { PLAYING: 'playing', GAMEOVER: 'gameover' };
let currentState = GAME_STATES.PLAYING;

let currentLevelData = null;
let currentLevelNumber = 1;
let score = 0;
let totalEnemiesKilled = 0;
let sessionStartTime = Date.now();
let levelTimer = 120;

const input = new InputHandler();
let player = new Player(1, 1, TILE_SIZE);

let bombs = [];
let explosions = [];
let enemies = [];
let powerUps = [];
let exitTile = { x: 0, y: 0, revealed: false };

let spacePressedLastFrame = false;
let lastTimestamp = performance.now();
let highScores = [];
let scoreSubmitted = false;

async function loadScores() {
    highScores = await ApiClient.getScores();
}
loadScores();

function initLevel(levelNumber) {
    currentLevelNumber = levelNumber;
    currentLevelData = mapGen.generate();

    canvas.width = currentLevelData.cols * TILE_SIZE;
    canvas.height = currentLevelData.rows * TILE_SIZE;

    player.x = 1 * TILE_SIZE + TILE_SIZE / 2;
    player.y = 1 * TILE_SIZE + TILE_SIZE / 2;

    bombs = [];
    explosions = [];
    powerUps = [];
    levelTimer = Math.max(60, 130 - currentLevelNumber * 10);

    exitTile = {
        x: currentLevelData.exitPos.x,
        y: currentLevelData.exitPos.y,
        revealed: false
    };

    spawnEnemies();
}

function spawnEnemies() {
    enemies = [];
    const types = [
        ENEMY_TYPES.RANDOM,
        ENEMY_TYPES.BFS,
        ENEMY_TYPES.ASTAR,
        ENEMY_TYPES.PREDICTIVE
    ];

    const emptyTiles = [];
    for (let r = 1; r < currentLevelData.rows - 1; r++) {
        for (let c = 1; c < currentLevelData.cols - 1; c++) {
            if (currentLevelData.grid[r][c] === TILE_TYPES.FLOOR) {
                const distToPlayer = Math.hypot(c - 1, r - 1);
                if (distToPlayer > 4) {
                    emptyTiles.push({ x: c, y: r });
                }
            }
        }
    }

    emptyTiles.sort(() => Math.random() - 0.5);
    const count = Math.min(types.length + (currentLevelNumber - 1), emptyTiles.length);
    for (let i = 0; i < count; i++) {
        const spot = emptyTiles[i] || { x: currentLevelData.cols - 2, y: currentLevelData.rows - 2 };
        const enemyType = types[i % types.length];
        enemies.push(new Enemy(spot.x, spot.y, TILE_SIZE, enemyType));
    }
}

function tryDropBomb() {
    if (player.isDead || currentState !== GAME_STATES.PLAYING) return;

    if (bombs.filter(b => b.owner === player && !b.isExploded).length < player.maxBombs) {
        const tx = player.tileX;
        const ty = player.tileY;
        const cellOccupied = bombs.some(b => !b.isExploded && b.tileX === tx && b.tileY === ty);
        if (!cellOccupied) {
            bombs.push(new Bomb(tx, ty, TILE_SIZE, player.bombRange, player));
        }
    }
}

function spawnPowerUpAt(tileX, tileY) {
    if (tileX === exitTile.x && tileY === exitTile.y) {
        exitTile.revealed = true;
        return;
    }

    if (Math.random() < 0.35) {
        const pTypes = [
            POWERUP_TYPES.RANGE,
            POWERUP_TYPES.BOMBS,
            POWERUP_TYPES.SPEED,
            POWERUP_TYPES.SHIELD
        ];
        const selected = pTypes[Math.floor(Math.random() * pTypes.length)];
        powerUps.push(new PowerUp(tileX, tileY, TILE_SIZE, selected));
    }
}

function damagePlayer() {
    if (player.hasShield) {
        player.hasShield = false;
        return;
    }

    player.lives -= 1;
    if (player.lives <= 0) {
        player.isDead = true;
        currentState = GAME_STATES.GAMEOVER;
        onGameOver();
    } else {
        player.x = 1 * TILE_SIZE + TILE_SIZE / 2;
        player.y = 1 * TILE_SIZE + TILE_SIZE / 2;
    }
}

async function onGameOver() {
    if (scoreSubmitted) return;
    scoreSubmitted = true;

    const totalSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
    const playerName = prompt('¡Game Over! Ingresa tus iniciales o nombre:', 'P1') || 'Bomber';

    await ApiClient.saveScore({
        player: playerName,
        score: score,
        maxLevel: currentLevelNumber,
        enemiesKilled: totalEnemiesKilled,
        duration: totalSeconds
    });

    await loadScores();
}

function updateGame(deltaTime) {
    if (currentState !== GAME_STATES.PLAYING) return;

    levelTimer -= deltaTime;
    if (levelTimer <= 0) {
        damagePlayer();
        levelTimer = 90;
    }

    if (input.keys.bomb && !spacePressedLastFrame) {
        tryDropBomb();
    }
    spacePressedLastFrame = input.keys.bomb;

    player.update(deltaTime, input, currentLevelData.grid);

    // Bombas
    for (const bomb of bombs) {
        bomb.update(deltaTime);
        if (bomb.isExploded) {
            const exp = new Explosion(bomb.tileX, bomb.tileY, bomb.range, TILE_SIZE, currentLevelData.grid, bombs);
            explosions.push(exp);

            for (const blk of exp.destroyedBlocks) {
                spawnPowerUpAt(blk.x, blk.y);
            }
        }
    }
    bombs = bombs.filter(b => !b.isExploded);

    // Explosiones
    for (const exp of explosions) {
        exp.update(deltaTime);

        if (exp.hitsEntity(player)) {
            damagePlayer();
        }

        for (const enemy of enemies) {
            if (!enemy.isDead && exp.hitsEntity(enemy)) {
                enemy.isDead = true;
                totalEnemiesKilled += 1;
                score += 200;
            }
        }
    }
    explosions = explosions.filter(e => !e.isFinished);
    enemies = enemies.filter(e => !e.isDead);

    // Enemigos
    for (const enemy of enemies) {
        enemy.update(deltaTime, currentLevelData.grid, player);
        if (enemy.touchesPlayer(player)) {
            damagePlayer();
        }
    }

    // Power-ups
    for (const p of powerUps) {
        p.update(deltaTime);
        if (!p.isCollected && p.touchesPlayer(player)) {
            p.applyEffect(player);
            score += 50;
        }
    }
    powerUps = powerUps.filter(p => !p.isCollected);

    // Salida
    if (exitTile.revealed && enemies.length === 0) {
        if (player.tileX === exitTile.x && player.tileY === exitTile.y) {
            score += 1000 + Math.floor(levelTimer) * 10;
            initLevel(currentLevelNumber + 1);
        }
    }
}

function drawMap(grid) {
    for (let r = 0; r < currentLevelData.rows; r++) {
        for (let c = 0; c < currentLevelData.cols; c++) {
            const tile = grid[r][c];
            const px = c * TILE_SIZE;
            const py = r * TILE_SIZE;

            if (tile === TILE_TYPES.SOLID_WALL) {
                ctx.fillStyle = '#1e293b';
            } else if (tile === TILE_TYPES.DESTRUCTIBLE) {
                ctx.fillStyle = '#b45309';
            } else {
                ctx.fillStyle = '#0f172a';
            }

            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#334155';
            ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);

            if (exitTile.revealed && exitTile.x === c && exitTile.y === r) {
                ctx.fillStyle = enemies.length === 0 ? '#22c55e' : '#64748b';
                ctx.fillRect(px + 8, py + 8, TILE_SIZE - 16, TILE_SIZE - 16);
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('SALIDA', px + TILE_SIZE / 2, py + TILE_SIZE / 2);
            }
        }
    }
}

function drawHUD() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, canvas.width, 36);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`NIVEL: ${currentLevelNumber} | PUNTOS: ${score} | VIDAS: ${player.lives} | TIEMPO: ${Math.ceil(levelTimer)}s`, 15, 18);

    const statusText = enemies.length === 0 ? '¡SALIDA HABILITADA!' : `ENEMIGOS: ${enemies.length}`;
    ctx.fillStyle = enemies.length === 0 ? '#4ade80' : '#f87171';
    ctx.fillText(statusText, canvas.width - 220, 18);
}

function drawGameOverOverlay() {
    ctx.fillStyle = 'rgba(11, 15, 25, 0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, 70);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px monospace';
    ctx.fillText(`PUNTUACIÓN FINAL: ${score} | NIVEL: ${currentLevelNumber}`, canvas.width / 2, 105);
    ctx.fillText('Presiona [R] para volver a jugar', canvas.width / 2, 130);

    // Dibujar Ranking Top 10
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('🏆 SALÓN DE LA FAMA (TOP 10) 🏆', canvas.width / 2, 175);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';

    const startY = 210;
    const colX = canvas.width / 2 - 200;

    if (highScores.length === 0) {
        ctx.fillText('Sin puntuaciones registradas aún.', colX, startY);
    } else {
        highScores.forEach((entry, idx) => {
            const y = startY + idx * 26;
            ctx.fillText(`${idx + 1}. ${entry.player.padEnd(12)} - ${entry.score} pts (Nivel ${entry.maxLevel})`, colX, y);
        });
    }
}

function gameLoop(currentTimestamp) {
    const deltaTime = (currentTimestamp - lastTimestamp) / 1000;
    lastTimestamp = currentTimestamp;

    updateGame(deltaTime);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap(currentLevelData.grid);

    for (const p of powerUps) p.draw(ctx);
    for (const b of bombs) b.draw(ctx);
    for (const exp of explosions) exp.draw(ctx);
    for (const enemy of enemies) enemy.draw(ctx, input.keys.debug);
    if (!player.isDead) player.draw(ctx, input.keys.debug);

    drawHUD();

    if (currentState === GAME_STATES.GAMEOVER) {
        drawGameOverOverlay();
    }

    requestAnimationFrame(gameLoop);
}

function restartGame() {
    score = 0;
    totalEnemiesKilled = 0;
    sessionStartTime = Date.now();
    scoreSubmitted = false;
    player = new Player(1, 1, TILE_SIZE);
    currentState = GAME_STATES.PLAYING;
    initLevel(1);
}

initLevel(1);

window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        restartGame();
    }
});

requestAnimationFrame(gameLoop);