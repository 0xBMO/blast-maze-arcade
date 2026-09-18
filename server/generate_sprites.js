import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'sprites');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'spritesheet.png');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Estructura de 8 celdas de 32x32 píxeles (256x32 total):
// [0]: Suelo | [1]: Muro Sólido | [2]: Bloque Rompible | [3]: Salida
// [4]: Jugador | [5]: Enemigo BFS | [6]: Enemigo A* | [7]: Bomba
const W = 256;
const H = 32;

// Función pura para escribir un PNG sin dependencias externas
function createRawPNG(width, height, getPixel) {
    import('zlib').then(zlib => {
        const rowLength = width * 4 + 1;
        const rawBuffer = Buffer.alloc(height * rowLength);

        for (let y = 0; y < height; y++) {
            rawBuffer[y * rowLength] = 0; // Filtro None
            for (let x = 0; x < width; x++) {
                const rgba = getPixel(x, y);
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
                crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
            }
            return (crc ^ -1) >>> 0;
        }

        const table = [];
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[i] = c;
        }

        function createChunk(type, data) {
            const len = Buffer.alloc(4);
            len.writeUInt32BE(data.length, 0);
            const chunkType = Buffer.from(type, 'ascii');
            const body = Buffer.concat([chunkType, data]);
            const crcBuf = Buffer.alloc(4);
            crcBuf.writeUInt32BE(crc32(body), 0);
            return Buffer.concat([len, body, crcBuf]);
        }

        const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        const ihdr = Buffer.alloc(13);
        ihdr.writeUInt32BE(width, 0);
        ihdr.writeUInt32BE(height, 4);
        ihdr[8] = 8; // Bit depth
        ihdr[9] = 6; // RGBA
        ihdr[10] = 0; // Compression
        ihdr[11] = 0; // Filter
        ihdr[12] = 0; // Interlace

        const png = Buffer.concat([
            header,
            createChunk('IHDR', ihdr),
            createChunk('IDAT', compressed),
            createChunk('IEND', Buffer.alloc(0))
        ]);

        fs.writeFileSync(OUTPUT_FILE, png);
        console.log(`✅ Archivo físico generado con éxito: assets/sprites/spritesheet.png`);
    });
}

createRawPNG(W, H, (x, y) => {
    const tileIdx = Math.floor(x / 32);
    const lx = x % 32;
    const ly = y;

    // 0: Suelo
    if (tileIdx === 0) {
        if (lx === 0 || ly === 0) return [30, 41, 59, 255];
        if (lx === 31 || ly === 31) return [10, 15, 26, 255];
        return [15, 23, 42, 255];
    }
    // 1: Muro Sólido (Blindado)
    if (tileIdx === 1) {
        if (lx <= 2 || ly <= 2) return [100, 116, 139, 255];
        if (lx >= 29 || ly >= 29) return [30, 41, 59, 255];
        if (lx >= 12 && lx <= 19 && ly >= 12 && ly <= 19) return [56, 189, 248, 255];
        return [51, 65, 85, 255];
    }
    // 2: Bloque Rompible (Caja de Madera con clavos)
    if (tileIdx === 2) {
        if (lx === 0 || ly === 0 || lx === 31 || ly === 31) return [124, 45, 18, 255];
        if (Math.abs(lx - ly) <= 1 || Math.abs(lx - (31 - ly)) <= 1) return [154, 52, 18, 255];
        if ((lx === 4 && ly === 4) || (lx === 27 && ly === 4) || (lx === 4 && ly === 27) || (lx === 27 && ly === 27)) {
            return [253, 224, 71, 255];
        }
        return [194, 65, 12, 255];
    }
    // 3: Salida
    if (tileIdx === 3) {
        if (lx <= 1 || ly <= 1 || lx >= 30 || ly >= 30) return [4, 120, 87, 255];
        if (ly >= 10 && ly <= 22 && lx >= 12 && lx <= 20) return [236, 253, 245, 255];
        return [16, 185, 129, 255];
    }
    // 4: Jugador (Ciborg con Casco y Visor Cian)
    if (tileIdx === 4) {
        const dx = lx - 16;
        const dy = ly - 16;
        if (dx * dx + dy * dy < 120) {
            if (ly >= 12 && ly <= 18 && lx >= 10 && lx <= 22) return [6, 182, 212, 255]; // Visor
            return [2, 132, 199, 255]; // Traje
        }
        return [0, 0, 0, 0]; // Transparente
    }
    // 5: Enemigo Morado (BFS)
    if (tileIdx === 5) {
        if (lx >= 6 && lx <= 25 && ly >= 8 && ly <= 27) {
            if (ly >= 14 && ly <= 18 && (lx === 10 || lx === 21)) return [255, 255, 255, 255]; // Ojos
            return [139, 92, 246, 255];
        }
        return [0, 0, 0, 0];
    }
    // 6: Enemigo Verde (A*)
    if (tileIdx === 6) {
        if (ly >= 6 && ly <= 26 && lx >= (16 - (ly - 6) * 0.7) && lx <= (16 + (ly - 6) * 0.7)) {
            if (ly >= 16 && ly <= 20 && lx >= 13 && lx <= 19) return [250, 204, 21, 255];
            return [16, 185, 129, 255];
        }
        return [0, 0, 0, 0];
    }
    // 7: Bomba
    if (tileIdx === 7) {
        const dx = lx - 16;
        const dy = ly - 18;
        if (ly <= 7 && lx >= 14 && lx <= 17) return [245, 158, 11, 255]; // Mecha
        if (dx * dx + dy * dy < 110) return [15, 23, 42, 255]; // Cuerpo
        return [0, 0, 0, 0];
    }

    return [0, 0, 0, 0];
});