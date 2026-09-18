import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, '..');
const SCORES_FILE = path.join(__dirname, 'data', 'scores.json');

// Crear scores.json si no existe
if (!fs.existsSync(SCORES_FILE)) {
    fs.writeFileSync(SCORES_FILE, JSON.stringify([]));
}

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
    // API REST - Obtener puntajes
    if (req.url === '/api/scores' && req.method === 'GET') {
        const data = fs.readFileSync(SCORES_FILE, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(data);
    }

    // API REST - Guardar puntaje completo
    if (req.url === '/api/scores' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const newScore = JSON.parse(body);
                // Estructura esperada: { player, score, maxLevel, enemiesKilled, duration }
                const currentScores = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf-8'));
                currentScores.push({
                    player: newScore.player || 'Jugador Anónimo',
                    score: Number(newScore.score) || 0,
                    maxLevel: Number(newScore.maxLevel) || 1,
                    enemiesKilled: Number(newScore.enemiesKilled) || 0,
                    duration: Number(newScore.duration) || 0,
                    date: new Date().toLocaleDateString()
                });
                currentScores.sort((a, b) => b.score - a.score);
                fs.writeFileSync(SCORES_FILE, JSON.stringify(currentScores.slice(0, 10), null, 2));
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Datos invalidos' }));
            }
        });
        return;
    }

    // Servidor de archivos estáticos (HTML, CSS, JS, Assets)
    let safeSuffix = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(PUBLIC_DIR, safeSuffix === '/' || safeSuffix === '\\' ? 'index.html' : safeSuffix);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Archivo no encontrado');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Servidor de Blast Maze activo en: http://localhost:${PORT}`);
});