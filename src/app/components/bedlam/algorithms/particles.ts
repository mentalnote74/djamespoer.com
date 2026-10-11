import { Chatter } from '../contract';
export interface Particle {
  x: number;
  y: number;
}
export function drawParticles(ctx: CanvasRenderingContext2D, particles: readonly Particle[]): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = 'rgba(120,240,220,0.7)';
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}
export function particleChatter(
  particles: readonly Particle[],
  width: number,
  height: number,
): Chatter {
  let x = 0,
    y = 0,
    energy = 0;
  for (const p of particles) {
    x += p.x / width;
    y += p.y / height;
    energy += Math.abs(p.x / width - 0.5);
  }
  const n = Math.max(1, particles.length);
  return { x: x / n, y: y / n, energy: (energy * 2) / n };
}
