export class Bomb {
    constructor(tileX, tileY, tileSize, range = 1, owner = null) {
        this.tileX = tileX;
        this.tileY = tileY;
        this.tileSize = tileSize;
        this.range = range;
        this.owner = owner;

        this.timer = 2.8; // Segundos antes de detonar
        this.isExploded = false;
        
        // Coordenadas en píxeles (centro del tile)
        this.x = tileX * tileSize + tileSize / 2;
        this.y = tileY * tileSize + tileSize / 2;
        this.radius = tileSize * 0.38;

        // Efecto visual de pulsación
        this.pulse = 0;
    }

    update(deltaTime) {
        this.timer -= deltaTime;
        this.pulse += deltaTime * 6;

        if (this.timer <= 0) {
            this.isExploded = true;
        }
    }

    draw(ctx) {
        const scale = 1 + Math.sin(this.pulse) * 0.08;
        
        // Cuerpo de la bomba
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ef4444';
        ctx.stroke();

        // Mecha / Centro encendido
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, -this.radius * 0.4, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}