export class FXManager {
    constructor() {
        this.shakeTime = 0;
        this.shakeIntensity = 0;
        this.shockwaves = [];
        this.floatingTexts = [];
    }

    triggerShake(intensity = 8, duration = 0.3) {
        this.shakeIntensity = intensity;
        this.shakeTime = duration;
    }

    addShockwave(x, y, maxRadius = 70, color = '#f59e0b') {
        this.shockwaves.push({
            x, y,
            radius: 5,
            maxRadius,
            life: 1.0,
            color
        });
    }

    addFloatingText(x, y, text, color = '#38bdf8') {
        this.floatingTexts.push({
            x, y,
            text,
            color,
            vy: -40,
            alpha: 1.0,
            scale: 1.3
        });
    }

    update(deltaTime) {
        if (this.shakeTime > 0) {
            this.shakeTime -= deltaTime;
            if (this.shakeTime <= 0) this.shakeIntensity = 0;
        }

        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += (sw.maxRadius - sw.radius) * deltaTime * 12;
            sw.life -= deltaTime * 2.5;
            if (sw.life <= 0) this.shockwaves.splice(i, 1);
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy * deltaTime;
            ft.alpha -= deltaTime * 1.2;
            ft.scale = Math.max(1.0, ft.scale - deltaTime * 1.5);
            if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
        }
    }

    applyCameraShake(ctx) {
        if (this.shakeTime > 0) {
            const ox = (Math.random() - 0.5) * this.shakeIntensity * 2;
            const oy = (Math.random() - 0.5) * this.shakeIntensity * 2;
            ctx.translate(ox, oy);
        }
    }

    draw(ctx) {
        ctx.save();

        for (const sw of this.shockwaves) {
            ctx.strokeStyle = sw.color;
            ctx.lineWidth = Math.max(1, sw.life * 6);
            ctx.globalAlpha = Math.max(0, sw.life);
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        for (const ft of this.floatingTexts) {
            ctx.save();
            ctx.translate(ft.x, ft.y);
            ctx.scale(ft.scale, ft.scale);
            ctx.globalAlpha = Math.max(0, ft.alpha);
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 15px monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 8;
            ctx.fillText(ft.text, 0, 0);
            ctx.restore();
        }

        ctx.restore();
    }
}