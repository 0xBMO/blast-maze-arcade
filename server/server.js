import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, '..');
const SCORES_FILE = path.join(__dirname, 'data', 'scores.json');

// Asegurar que exista la carpeta data y el archivo scores.json
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(SCORES_FILE)) {
    fs.writeFileSync(SCORES_FILE, JSON.stringify([], null, 2));
}

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // 1. Endpoint GET /api/scores
    if (req.url === '/api/scores' && req.method === 'GET') {
        try {
            const data = fs.readFileSync(SCORES_FILE, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([]));
        }
        return;
    }

    // 2. Endpoint POST /api/scores
    if (req.url === '/api/scores' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const newScore = JSON.parse(body);
                const current = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf-8') || '[]');
                current.push({
                    player: newScore.player || 'Bomber',
                    score: Number(newScore.score) || 0,
                    maxLevel: Number(newScore.maxLevel) || 1,
                    enemiesKilled: Number(newScore.enemiesKilled) || 0,
                    duration: Number(newScore.duration) || 0,
                    date: new Date().toLocaleDateString()
                });
                current.sort((a, b) => b.score - a.score);
                fs.writeFileSync(SCORES_FILE, JSON.stringify(current.slice(0, 10), null, 2));
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Datos invalidos' }));
            }
        });
        return;
    }

    // 3. Servir archivos estáticos
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';

    const safePath = path.normalize(path.join(PUBLIC_DIR, reqPath));
    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(safePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Archivo no encontrado');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Servidor de Blast Maze activo en: http://localhost:${PORT}`);
});