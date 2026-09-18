export const POWERUP_TYPES = {
    RANGE: 'range',         // Mayor alcance de fuego (+1)
    BOMBS: 'bombs',         // Más bombas simultáneas (+1)
    SPEED: 'speed',         // Mayor velocidad de desplazamiento
    SHIELD: 'shield'        // Escudo protector contra 1 impacto
};

export class PowerUp {
    constructor(tileX, tileY, tileSize, type) {
        this.tileX = tileX;
        this.tileY = tileY;
        this.tileSize = tileSize;
        this.type = type;

        this.x = tileX * tileSize + tileSize / 2;
        this.y = tileY * tileSize + tileSize / 2;
        this.radius = tileSize * 0.3;
        this.isCollected = false;

        this.pulse = 0;
        this._setupVisuals();
    }

    _setupVisuals() {
        switch (this.type) {
            case POWERUP_TYPES.RANGE:
                this.color = '#f59e0b'; // Amarillo fuego
                this.symbol = '🔥';
                break;
            case POWERUP_TYPES.BOMBS:
                this.color = '#3b82f6'; // Azul bomba
                this.symbol = '💣';
                break;
            case POWERUP_TYPES.SPEED:
                this.color = '#10b981'; // Verde patines
                this.symbol = '⚡';
                break;
            case POWERUP_TYPES.SHIELD:
                this.color = '#ec4899'; // Rosa escudo
                this.symbol = '🛡️';
                break;
        }
    }

    update(deltaTime) {
        this.pulse += deltaTime * 5;
    }

    draw(ctx) {
        if (this.isCollected) return;

        const bounce = Math.sin(this.pulse) * 3;

        // Base circular brillante
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bounce, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Icono / Símbolo representativo
        ctx.font = `${Math.floor(this.tileSize * 0.38)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, this.x, this.y + bounce);
    }

    touchesPlayer(player) {
        const dist = Math.hypot(this.x - player.x, this.y - player.y);
        return dist < (this.radius + player.radius);
    }

    applyEffect(player) {
        switch (this.type) {
            case POWERUP_TYPES.RANGE:
                player.bombRange += 1;
                break;
            case POWERUP_TYPES.BOMBS:
                player.maxBombs += 1;
                break;
            case POWERUP_TYPES.SPEED:
                player.speed = Math.min(player.speed + 35, 300); // Límite de velocidad
                break;
            case POWERUP_TYPES.SHIELD:
                player.hasShield = true;
                break;
        }
        this.isCollected = true;
    }
}