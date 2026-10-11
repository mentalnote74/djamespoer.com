import { Algorithm } from '../contract';
import { drawParticles, particleChatter } from './particles';
export const vortex: Algorithm = {
  id: 'point-vortex',
  create(width, height, random) {
    const cores = Array.from({ length: 4 }, (_, i) => ({
      x: width * (0.25 + random() * 0.5),
      y: height * (0.25 + random() * 0.5),
      circulation: (i % 2 ? -1 : 1) * 2,
    }));
    const tracers = Array.from({ length: 160 }, () => ({
      x: random() * width,
      y: random() * height,
    }));
    const velocity = (x: number, y: number, excluded = -1) => {
      let vx = 0,
        vy = 0;
      cores.forEach((c, i) => {
        if (i === excluded) return;
        const dx = x - c.x,
          dy = y - c.y,
          f = c.circulation / (2 * Math.PI * (dx * dx + dy * dy + 4));
        vx -= dy * f;
        vy += dx * f;
      });
      return { x: vx, y: vy };
    };
    return {
      step() {
        // Simultaneous updates; softened cores avoid singular close encounters.
        const velocities = cores.map((c, i) => velocity(c.x, c.y, i));
        for (const p of tracers) {
          const v = velocity(p.x, p.y);
          p.x = (p.x + v.x * 3 + width) % width;
          p.y = (p.y + v.y * 3 + height) % height;
        }
        cores.forEach((c, i) => {
          c.x += velocities[i].x * 3;
          c.y += velocities[i].y * 3;
        });
      },
      draw(ctx) {
        drawParticles(ctx, tracers);
      },
      chatter() {
        return particleChatter(tracers, width, height);
      },
      destroy() {
        cores.length = tracers.length = 0;
      },
    };
  },
};
