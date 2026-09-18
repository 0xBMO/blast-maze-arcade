import { MapGenerator, TILE_TYPES } from './world/MapGenerator.js';
import { InputHandler } from './core/InputHandler.js';
import { Player } from './entities/Player.js';
import { Bomb } from './entities/Bomb.js';
import { Explosion } from './entities/Explosion.js';
import { Enemy, ENEMY_TYPES } from './entities/Enemy.js';
import { PowerUp, POWERUP_TYPES } from './entities/PowerUp.js';
import { ParticleSystem } from './core/ParticleSystem.js';
import { FXManager } from './core/FXManager.js';
import { ApiClient } from './services/ApiClient.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 48;
const mapGen = new MapGenerator(17, 13);

const GAME_STATES = { PLAYING: 'playing', GAMEOVER: 'gameover' };
let currentState = GAME_STATES.PLAYING;

let currentLevelData = null;
let currentLevelNumber = 1;
let score = 0;
let totalEnemiesKilled = 0;
let sessionStartTime = Date.now();
let levelTimer = 120;

const input = new InputHandler();
const particles = new ParticleSystem();
const fx = new FXManager();
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
    fx.addFloatingText(canvas.width / 2, canvas.height / 2, `¡NIVEL ${currentLevelNumber}!`, '#38bdf8');
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
                if (distToPlayer > 4) emptyTiles.push({ x: c, y: r });
            }
        }
    }

    emptyTiles.sort(() => Math.random() - 0.5);
    const count = Math.min(types.length + (currentLevelNumber - 1), emptyTiles.length);
    for (let i = 0; i < count; i++) {
        const spot = emptyTiles[i] || { x: currentLevelData.cols - 2, y: currentLevelData.rows - 2 };
        enemies.push(new Enemy(spot.x, spot.y, TILE_SIZE, types[i % types.length]));
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
            fx.addShockwave(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2, 25, '#38bdf8');
        }
    }
}

function spawnPowerUpAt(tileX, tileY) {
    if (tileX === exitTile.x && tileY === exitTile.y) {
        exitTile.revealed = true;
        fx.addFloatingText(tileX * TILE_SIZE + TILE_SIZE / 2, tileY * TILE_SIZE, '¡PORTAL HALLADO!', '#10b981');
        return;
    }

    if (Math.random() < 0.35) {
        const pTypes = [POWERUP_TYPES.RANGE, POWERUP_TYPES.BOMBS, POWERUP_TYPES.SPEED, POWERUP_TYPES.SHIELD];
        const selected = pTypes[Math.floor(Math.random() * pTypes.length)];
        powerUps.push(new PowerUp(tileX, tileY, TILE_SIZE, selected));
    }
}

function damagePlayer() {
    if (player.hasShield) {
        player.hasShield = false;
        fx.triggerShake(12, 0.4);
        fx.addFloatingText(player.x, player.y - 20, '¡ESCUDO ROTO!', '#ec4899');
        particles.emit(player.x, player.y, '#ec4899', 15, 90, 0.5);
        return;
    }

    player.lives -= 1;
    fx.triggerShake(18, 0.6);
    particles.emit(player.x, player.y, '#ef4444', 20, 110, 0.6);

    if (player.lives <= 0) {
        player.isDead = true;
        currentState = GAME_STATES.GAMEOVER;
        onGameOver();
    } else {
        player.x = 1 * TILE_SIZE + TILE_SIZE / 2;
        player.y = 1 * TILE_SIZE + TILE_SIZE / 2;
        fx.addFloatingText(player.x, player.y - 20, '-1 VIDA', '#ef4444');
    }
}

async function onGameOver() {
    if (scoreSubmitted) return;
    scoreSubmitted = true;
    const totalSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
    const playerName = prompt('¡GAME OVER! Ingresa tu nombre:', 'P1') || 'Bomber';

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

    if (input.keys.bomb && !spacePressedLastFrame) tryDropBomb();
    spacePressedLastFrame = input.keys.bomb;

    player.update(deltaTime, input, currentLevelData.grid);
    particles.update(deltaTime);
    fx.update(deltaTime);

    // Bombas
    for (const bomb of bombs) {
        bomb.update(deltaTime, particles);
        if (bomb.isExploded) {
            const exp = new Explosion(bomb.tileX, bomb.tileY, bomb.range, TILE_SIZE, currentLevelData.grid, bombs, particles);
            explosions.push(exp);
            fx.triggerShake(10, 0.35);
            fx.addShockwave(bomb.x, bomb.y, bomb.range * TILE_SIZE * 1.2, '#f97316');

            for (const blk of exp.destroyedBlocks) {
                spawnPowerUpAt(blk.x, blk.y);
                particles.emit(blk.x * TILE_SIZE + TILE_SIZE / 2, blk.y * TILE_SIZE + TILE_SIZE / 2, '#ea580c', 12, 100, 0.45);
            }
        }
    }
    bombs = bombs.filter(b => !b.isExploded);

    // Explosiones
    for (const exp of explosions) {
        exp.update(deltaTime);
        if (exp.hitsEntity(player)) damagePlayer();

        for (const enemy of enemies) {
            if (!enemy.isDead && exp.hitsEntity(enemy)) {
                enemy.isDead = true;
                totalEnemiesKilled += 1;
                score += 200;
                fx.addFloatingText(enemy.x, enemy.y - 15, '+200', '#facc15');
                particles.emit(enemy.x, enemy.y, enemy.color, 25, 120, 0.6);
            }
        }
    }
    explosions = explosions.filter(e => !e.isFinished);
    enemies = enemies.filter(e => !e.isDead);

    // Enemigos
    for (const enemy of enemies) {
        enemy.update(deltaTime, currentLevelData.grid, player);
        if (enemy.touchesPlayer(player)) damagePlayer();
    }

    // Power-ups
    for (const p of powerUps) {
        p.update(deltaTime);
        if (!p.isCollected && p.touchesPlayer(player)) {
            p.applyEffect(player);
            score += 50;
            fx.addFloatingText(p.x, p.y - 15, `+50 ${p.type.toUpperCase()}`, p.color);
            particles.emit(p.x, p.y, p.color, 14, 75, 0.4);
        }
    }
    powerUps = powerUps.filter(p => !p.isCollected);

    // Portal
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

            ctx.fillStyle = '#0a0e17';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#151c2c';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);

            if (tile === TILE_TYPES.SOLID_WALL) {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                ctx.fillStyle = '#334155';
                ctx.fillRect(px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE - 12);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(px + TILE_SIZE / 2 - 3, py + TILE_SIZE / 2 - 3, 6, 6);
            } else if (tile === TILE_TYPES.DESTRUCTIBLE) {
                ctx.fillStyle = '#7c2d12';
                ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                ctx.fillStyle = '#c2410c';
                ctx.fillRect(px + 5, py + 5, TILE_SIZE - 10, TILE_SIZE - 10);
                ctx.strokeStyle = '#9a3412';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(px + 6, py + 6);
                ctx.lineTo(px + TILE_SIZE - 6, py + TILE_SIZE - 6);
                ctx.moveTo(px + TILE_SIZE - 6, py + 6);
                ctx.lineTo(px + 6, py + TILE_SIZE - 6);
                ctx.stroke();
            }

            if (exitTile.revealed && exitTile.x === c && exitTile.y === r) {
                ctx.fillStyle = enemies.length === 0 ? '#10b981' : '#475569';
                ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('PORTAL', px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 4);
            }
        }
    }
}

function drawLighting() {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 8, 15, 0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'lighter';

    // Luz del jugador
    const pGrad = ctx.createRadialGradient(player.x, player.y, 10, player.x, player.y, 120);
    pGrad.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
    pGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 120, 0, Math.PI * 2);
    ctx.fill();

    // Luz de bombas
    for (const b of bombs) {
        const bGrad = ctx.createRadialGradient(b.x, b.y, 5, b.x, b.y, 90);
        bGrad.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
        bGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 90, 0, Math.PI * 2);
        ctx.fill();
    }

    // Luz de explosiones
    for (const exp of explosions) {
        for (const c of exp.cells) {
            const cx = c.x * TILE_SIZE + TILE_SIZE / 2;
            const cy = c.y * TILE_SIZE + TILE_SIZE / 2;
            const expGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 70);
            expGrad.addColorStop(0, 'rgba(239, 68, 68, 0.55)');
            expGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
            ctx.fillStyle = expGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, 70, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

function drawHUD() {
    ctx.fillStyle = 'rgba(11, 15, 25, 0.92)';
    ctx.fillRect(0, 0, canvas.width, 36);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`NIVEL ${currentLevelNumber} | PTS: ${score} | VIDAS: ${player.lives} | TIEMPO: ${Math.ceil(levelTimer)}s`, 15, 18);

    const statusText = enemies.length === 0 ? '¡PORTAL ABIERTO!' : `ENEMIGOS: ${enemies.length}`;
    ctx.fillStyle = enemies.length === 0 ? '#4ade80' : '#f87171';
    ctx.fillText(statusText, canvas.width - 200, 18);
}

function drawGameOverOverlay() {
    ctx.fillStyle = 'rgba(10, 14, 23, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, 70);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '15px monospace';
    ctx.fillText(`PUNTUACIÓN: ${score} | NIVEL MÁXIMO: ${currentLevelNumber}`, canvas.width / 2, 105);
    ctx.fillText('Presiona [R] para reiniciar', canvas.width / 2, 130);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('🏆 SALÓN DE LA FAMA (TOP 10) 🏆', canvas.width / 2, 175);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    const startY = 210;
    const colX = canvas.width / 2 - 180;

    if (highScores.length === 0) {
        ctx.fillText('Sin registros aún.', colX, startY);
    } else {
        highScores.forEach((e, idx) => {
            ctx.fillText(`${idx + 1}. ${e.player.padEnd(10)} - ${e.score} pts (Nivel ${e.maxLevel})`, colX, startY + idx * 26);
        });
    }
}

function gameLoop(currentTimestamp) {
    const deltaTime = (currentTimestamp - lastTimestamp) / 1000;
    lastTimestamp = currentTimestamp;

    updateGame(deltaTime);

    ctx.save();
    fx.applyCameraShake(ctx);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap(currentLevelData.grid);

    for (const p of powerUps) p.draw(ctx);
    for (const b of bombs) b.draw(ctx);
    for (const exp of explosions) exp.draw(ctx);
    particles.draw(ctx);
    for (const enemy of enemies) enemy.draw(ctx, input.keys.debug);
    if (!player.isDead) player.draw(ctx, input.keys.debug);

    drawLighting();
    fx.draw(ctx);

    ctx.restore();

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
    if (e.key === 'r' || e.key === 'R') restartGame();
});

requestAnimationFrame(gameLoop);