import { LivingParticle, Point } from '../types/canvas';

export class LivingInkSimulator {
  private particles: LivingParticle[] = [];
  private gravity = 0.08;
  private surfaceTension = 0.985;
  private repulsionRadius = 60;
  private repulsionForce = 0.35;

  public spawnParticles(x: number, y: number, color: string, count = 3) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 1.2;
      const maxLife = 90 + Math.random() * 60;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife,
        maxLife,
        color,
        size: 2.5 + Math.random() * 2.5,
      });
    }

    // Limit maximum particles for fluid 60fps performance
    if (this.particles.length > 500) {
      this.particles.splice(0, this.particles.length - 500);
    }
  }

  public update(cursorPos?: Point) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Gravity
      p.vy += this.gravity;

      // Surface tension / air resistance drag
      p.vx *= this.surfaceTension;
      p.vy *= this.surfaceTension;

      // Interactive cursor repulsion/attraction
      if (cursorPos) {
        const dx = p.x - cursorPos.x;
        const dy = p.y - cursorPos.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0 && dist < this.repulsionRadius) {
          const force = (1 - dist / this.repulsionRadius) * this.repulsionForce;
          p.vx += (dx / dist) * force * 5;
          p.vy += (dy / dist) * force * 5;
        }
      }

      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;

      // Clean up dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (this.particles.length === 0) return;

    ctx.save();
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = p.color;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  public clear() {
    this.particles = [];
  }

  public get count(): number {
    return this.particles.length;
  }
}
