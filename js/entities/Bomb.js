export class Bomb {
    constructor(tileX, tileY, tileSize, range = 1, owner = null) {
        this.tileX = tileX;
        this.tileY = tileY;
        this.tileSize = tileSize;
        this.range = range;
        this.owner = owner;

        this.timer = 2.8;
        this.isExploded = false;
        
        this.x = tileX * tileSize + tileSize / 2;
        this.y = tileY * tileSize + tileSize / 2;
        this.radius = tileSize * 0.36;
        this.pulse = 0;
    }

    update(deltaTime, particleSystem) {
        this.timer -= deltaTime;
        const speedMultiplier = Math.max(1, (3 - this.timer) * 2.5);
        this.pulse += deltaTime * 6 * speedMultiplier;

        if (this.timer <= 0) {
            this.isExploded = true;
        }

        if (particleSystem && Math.random() < 0.6) {
            particleSystem.emit(this.x, this.y - this.radius - 4, '#fbbf24', 2, 30, 0.25);
        }
    }

    draw(ctx) {
        const scale = 1 + Math.sin(this.pulse) * 0.12;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, this.radius + 2, this.radius * 0.8, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(-this.radius * 0.35, -this.radius * 0.35, this.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#64748b';
        ctx.fillRect(-3, -this.radius - 3, 6, 4);

        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, -this.radius - 4, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}