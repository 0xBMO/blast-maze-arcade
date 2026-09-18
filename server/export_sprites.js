import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPRITES_DIR = path.join(__dirname, '..', 'assets', 'sprites');

if (!fs.existsSync(SPRITES_DIR)) {
    fs.mkdirSync(SPRITES_DIR, { recursive: true });
}

// Generador manual de formato PNG nativo en Node.js (RGBA 8-bit)
function savePNG(filename, width, height, drawPixelFn) {
    const rowLength = width * 4 + 1;
    const rawBuffer = Buffer.alloc(height * rowLength);

    for (let y = 0; y < height; y++) {
        rawBuffer[y * rowLength] = 0; // Filter: None
        for (let x = 0; x < width; x++) {
            const rgba = drawPixelFn(x, y);
            const offset = y * rowLength + 1 + x * 4;
            rawBuffer[offset] = rgba[0];
            rawBuffer[offset + 1] = rgba[1];
            rawBuffer[offset + 2] = rgba[2];
            rawBuffer[offset + 3] = rgba[3];
        }
    }

    const compressed = zlib.deflateSync(rawBuffer);

    function crc32(buf) {
        let crc = 0 ^ -1;
        for (let i = 0; i < buf.length; i++) {
            crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
        }
        return (crc ^ -1) >>> 0;
    }

    const crcTable = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crcTable[i] = c;
    }

    function chunk(type, data) {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length, 0);
        const typeBuf = Buffer.from(type, 'ascii');
        const body = Buffer.concat([typeBuf, data]);
        const crcBuf = Buffer.alloc(4);
        crcBuf.writeUInt32BE(crc32(body), 0);
        return Buffer.concat([len, body, crcBuf]);
    }

    const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // RGBA
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace

    const png = Buffer.concat([
        header,
        chunk('IHDR', ihdr),
        chunk('IDAT', compressed),
        chunk('IEND', Buffer.alloc(0))
    ]);

    fs.writeFileSync(path.join(SPRITES_DIR, filename), png);
    console.log(`✅ Imagen exportada: assets/sprites/${filename}`);
}

// -------------------------------------------------------------
// Definición exacta de cada elemento del juego en 48x48 píxeles
// -------------------------------------------------------------

function renderPlayer(x, y) {
    const cx = 24, cy = 24;
    const dx = x - cx, dy = y - cy;

    // Sombra inferior
    if ((dx * dx) / 144 + ((y - 38) * (y - 38)) / 25 <= 1) return [0, 0, 0, 90];

    // Pies
    if (y >= 34 && y <= 40 && ((x >= 15 && x <= 21) || (x >= 27 && x <= 33))) return [15, 23, 42, 255];

    // Torso blindado azul
    if (x >= 13 && x <= 35 && y >= 16 && y <= 34) return [2, 132, 199, 255];

    // Casco esférico blanco
    const headDist = Math.hypot(dx, y - 15);
    if (headDist <= 11) {
        // Visor cian neón
        if (y >= 12 && y <= 18 && x >= 17 && x <= 31) return [6, 182, 212, 255];
        return [248, 250, 252, 255];
    }
    return [0, 0, 0, 0];
}

function renderSolidWall(x, y) {
    // Borde exterior oscuro
    if (x < 2 || x >= 46 || y < 2 || y >= 46) return [10, 14, 23, 255];
    // Relieve metálico
    if (x < 6 || x >= 42 || y < 6 || y >= 42) return [30, 41, 59, 255];
    // Placa central blindada
    if (x < 21 || x > 27 || y < 21 || y > 27) return [51, 65, 85, 255];
    // Luz LED cian activa en el centro
    return [56, 189, 248, 255];
}

function renderDestructible(x, y) {
    // Borde marrón exterior
    if (x < 2 || x >= 46 || y < 2 || y >= 46) return [124, 45, 18, 255];
    // Cruz de refuerzo metálica interior
    if (Math.abs(x - y) <= 2 || Math.abs(x - (47 - y)) <= 2) return [154, 52, 18, 255];
    // Pernos dorados en las 4 esquinas
    const isCorner = (x >= 6 && x <= 9 && (y >= 6 && y <= 9 || y >= 38 && y <= 41)) ||
                     (x >= 38 && x <= 41 && (y >= 6 && y <= 9 || y >= 38 && y <= 41));
    if (isCorner) return [253, 224, 71, 255];
    // Caja metálica naranja
    return [194, 65, 12, 255];
}

function renderBomb(x, y) {
    const cx = 24, cy = 27;
    const dist = Math.hypot(x - cx, y - cy);

    // Mecha superior chispeante
    if (y >= 6 && y <= 11 && x >= 22 && x <= 26) return [245, 158, 11, 255];
    if (Math.hypot(x - 24, y - 5) <= 3) return [251, 191, 36, 255];

    // Cuello de mecha metálico
    if (y >= 11 && y <= 15 && x >= 21 && x <= 27) return [100, 116, 139, 255];

    // Cuerpo esférico oscuro
    if (dist <= 15) {
        // Brillo metálico blanco/gris
        if (Math.hypot(x - 19, y - 22) <= 5) return [51, 65, 85, 255];
        return [15, 23, 42, 255];
    }
    return [0, 0, 0, 0];
}

function renderEnemyRandom(x, y) {
    // Dron rosa con ojo
    const dist = Math.hypot(x - 24, y - 24);
    if (dist <= 14) {
        if (dist <= 3) return [136, 19, 55, 255]; // Pupila oscura
        if (dist <= 6) return [255, 255, 255, 255]; // Globo ocular
        return [244, 63, 94, 255]; // Cuerpo rosa
    }
    return [0, 0, 0, 0];
}

function renderEnemyBFS(x, y) {
    // Robot morado con antena
    if (y <= 13 && x >= 22 && x <= 25) return [196, 181, 253, 255]; // Mástil antena
    if (y <= 7 && x >= 21 && x <= 26) return [236, 72, 153, 255]; // Luz rosa antena
    if (x >= 12 && x <= 36 && y >= 14 && y <= 38) {
        // Visores cian
        if (y >= 20 && y <= 25 && ((x >= 16 && x <= 21) || (x >= 27 && x <= 32))) return [34, 211, 238, 255];
        return [139, 92, 246, 255];
    }
    return [0, 0, 0, 0];
}

function renderEnemyAStar(x, y) {
    // Caza triangular verde
    if (y >= 10 && y <= 38) {
        const span = (y - 10) * 0.55;
        if (x >= 24 - span && x <= 24 + span) {
            // Núcleo amarillo
            if (Math.hypot(x - 24, y - 26) <= 4.5) return [250, 204, 21, 255];
            return [16, 185, 129, 255];
        }
    }
    return [0, 0, 0, 0];
}

function renderEnemyPredictive(x, y) {
    // Tanque táctico naranja
    if (x >= 11 && x <= 37 && y >= 11 && y <= 37) {
        // Ranuras de advertencia
        if (y >= 18 && y <= 22 && x >= 15 && x <= 33) return [30, 41, 59, 255];
        if (y >= 27 && y <= 31 && x >= 15 && x <= 33) return [250, 204, 21, 255];
        return [234, 88, 12, 255];
    }
    return [0, 0, 0, 0];
}

function renderPortal(x, y) {
    if (x < 3 || x >= 45 || y < 3 || y >= 45) return [4, 120, 87, 255];
    if (x >= 12 && x <= 36 && y >= 12 && y <= 36) return [236, 253, 245, 255];
    return [16, 185, 129, 255];
}

// 1. Exportar imágenes individuales
const sprites = [
    { name: 'player.png', fn: renderPlayer },
    { name: 'wall_solid.png', fn: renderSolidWall },
    { name: 'wall_destructible.png', fn: renderDestructible },
    { name: 'bomb.png', fn: renderBomb },
    { name: 'enemy_random.png', fn: renderEnemyRandom },
    { name: 'enemy_bfs.png', fn: renderEnemyBFS },
    { name: 'enemy_astar.png', fn: renderEnemyAStar },
    { name: 'enemy_predictive.png', fn: renderEnemyPredictive },
    { name: 'portal_exit.png', fn: renderPortal }
];

console.log('--- EXPORTANDO IMÁGENES PNG ---');
for (const s of sprites) {
    savePNG(s.name, 48, 48, s.fn);
}

// 2. Exportar el Sprite Sheet unificado completo (9 columnas de 48px = 432x48)
console.log('--- GENERANDO SPRITESHEET COMPLETO ---');
savePNG('spritesheet.png', 48 * sprites.length, 48, (x, y) => {
    const index = Math.floor(x / 48);
    const localX = x % 48;
    return sprites[index].fn(localX, y);
});

console.log('✨ Proceso terminado. Todos los archivos PNG están disponibles en assets/sprites/');