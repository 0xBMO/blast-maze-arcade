// Generador y caché de texturas y sprites estilo Pixel-Art en Canvas
export class SpriteAtlas {
    constructor(tileSize = 48) {
        this.tileSize = tileSize;
        this.cache = {};
        this._generateAll();
    }

    _createCanvas() {
        const c = document.createElement('canvas');
        c.width = this.tileSize;
        c.height = this.tileSize;
        return c;
    }

    _generateAll() {
        this.cache.floor = this._drawFloor();
        this.cache.solidWall = this._drawSolidWall();
        this.cache.destructible = this._drawDestructible();
        this.cache.exit = this._drawExit();
    }

    _drawFloor() {
        const c = this._createCanvas();
        const ctx = c.getContext('2d');
        const s = this.tileSize;

        // Baldosa base
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, s, s);

        // Borde biselado sutil
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, s, 2);
        ctx.fillRect(0, 0, 2, s);
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, s - 2, s, 2);
        ctx.fillRect(s - 2, 0, 2, s);

        // Textura central
        ctx.fillStyle = '#172033';
        ctx.fillRect(s / 4, s / 4, s / 2, s / 2);
        return c;
    }

    _drawSolidWall() {
        const c = this._createCanvas();
        const ctx = c.getContext('2d');
        const s = this.tileSize;

        // Placa exterior
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, 0, s, s);

        // Relieve 3D
        ctx.fillStyle = '#64748b';
        ctx.fillRect(0, 0, s, 4);
        ctx.fillRect(0, 0, 4, s);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, s - 4, s, 4);
        ctx.fillRect(s - 4, 0, 4, s);

        // Núcleo blindado
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(8, 8, s - 16, s - 16);

        // Luz de advertencia central
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(s / 2 - 4, s / 2 - 4, 8, 8);
        return c;
    }

    _drawDestructible() {
        const c = this._createCanvas();
        const ctx = c.getContext('2d');
        const s = this.tileSize;

        // Caja de suministro reforzada
        ctx.fillStyle = '#c2410c';
        ctx.fillRect(0, 0, s, s);

        // Bordes metálicos
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(0, 0, s, 3);
        ctx.fillRect(0, 0, 3, s);
        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(0, s - 3, s, 3);
        ctx.fillRect(s - 3, 0, 3, s);

        // Refuerzo en "X"
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#9a3412';
        ctx.beginPath();
        ctx.moveTo(6, 6);
        ctx.lineTo(s - 6, s - 6);
        ctx.moveTo(s - 6, 6);
        ctx.lineTo(6, s - 6);
        ctx.stroke();

        // Tornillos en esquinas
        ctx.fillStyle = '#fde047';
        ctx.fillRect(4, 4, 3, 3);
        ctx.fillRect(s - 7, 4, 3, 3);
        ctx.fillRect(4, s - 7, 3, 3);
        ctx.fillRect(s - 7, s - 7, 3, 3);
        return c;
    }

    _drawExit() {
        const c = this._createCanvas();
        const ctx = c.getContext('2d');
        const s = this.tileSize;

        ctx.fillStyle = '#047857';
        ctx.fillRect(0, 0, s, s);

        ctx.fillStyle = '#10b981';
        ctx.fillRect(4, 4, s - 8, s - 8);

        ctx.fillStyle = '#ecfdf5';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▼', s / 2, s / 2);
        return c;
    }

    // Render del Jugador con diseño cibernético
    drawPlayer(ctx, x, y, direction, isMoving) {
        ctx.save();
        ctx.translate(x, y);

        // Sombra suave en el suelo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 14, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cuerpo / Armadura
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.roundRect(-12, -10, 24, 22, 6);
        ctx.fill();

        // Cabeza / Casco
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, -8, 11, 0, Math.PI * 2);
        ctx.fill();

        // Visor luminoso según orientación
        ctx.fillStyle = '#06b6d4';
        if (direction === 'down') {
            ctx.fillRect(-7, -8, 14, 5);
        } else if (direction === 'up') {
            ctx.fillStyle = '#334155'; // Parte trasera del casco
            ctx.fillRect(-6, -11, 12, 4);
        } else if (direction === 'left') {
            ctx.fillRect(-10, -8, 8, 5);
        } else if (direction === 'right') {
            ctx.fillRect(2, -8, 8, 5);
        }

        // Mochila de explosivos trasera
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-6, 2, 12, 6);

        ctx.restore();
    }

    // Render de los 4 tipos de enemigos con formas robóticas distintas
    drawEnemy(ctx, x, y, type) {
        ctx.save();
        ctx.translate(x, y);

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 12, 13, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        switch (type) {
            case 'random': // Dron esfera espinado
                ctx.fillStyle = '#f43f5e';
                ctx.beginPath();
                ctx.arc(0, 0, 13, 0, Math.PI * 2);
                ctx.fill();
                // Ojo central ciclópeo
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#9f1239';
                ctx.beginPath();
                ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'bfs': // Rastreador con antenas de radar
                ctx.fillStyle = '#8b5cf6';
                ctx.fillRect(-11, -11, 22, 22);
                // Antena
                ctx.strokeStyle = '#c4b5fd';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -11);
                ctx.lineTo(0, -18);
                ctx.stroke();
                ctx.fillStyle = '#ec4899';
                ctx.fillRect(-2, -20, 4, 4);
                // Ojos duales
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-7, -4, 4, 6);
                ctx.fillRect(3, -4, 4, 6);
                break;

            case 'astar': // Caza con alas puntiagudas
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.moveTo(0, -14);
                ctx.lineTo(14, 10);
                ctx.lineTo(-14, 10);
                ctx.closePath();
                ctx.fill();
                // Núcleo de energía
                ctx.fillStyle = '#facc15';
                ctx.beginPath();
                ctx.arc(0, 2, 4, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'predictive': // Robot táctico acorazado
                ctx.fillStyle = '#f97316';
                ctx.beginPath();
                ctx.roundRect(-12, -12, 24, 24, 4);
                ctx.fill();
                // Franjas de advertencia
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(-8, -8, 16, 4);
                ctx.fillStyle = '#fef08a';
                ctx.fillRect(-8, 2, 16, 4);
                break;
        }

        ctx.restore();
    }
}