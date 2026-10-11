import { Algorithm } from '../contract';
import { drawParticles, particleChatter } from './particles';
export const curl: Algorithm = {
  id: 'curl-noise',
  create(width, height, random) {
    const particles = Array.from({ length: 180 }, () => ({
      x: random() * width,
      y: random() * height,
    }));
    const noise = Float32Array.from({ length: 256 }, random);
    let time = random() * 100;
    const smooth = (v: number) => v * v * (3 - 2 * v);
    const potential = (x: number, y: number) => {
      const ix = Math.floor(x),
        iy = Math.floor(y),
        fx = smooth(x - ix),
        fy = smooth(y - iy);
      const at = (a: number, b: number) =>
        noise[(((a % 16) + 16) % 16) + (((b % 16) + 16) % 16) * 16];
      return (
        (at(ix, iy) * (1 - fx) + at(ix + 1, iy) * fx) * (1 - fy) +
        (at(ix, iy + 1) * (1 - fx) + at(ix + 1, iy + 1) * fx) * fy
      );
    };
    return {
      step() {
        time += 0.001;
        for (const p of particles) {
          const x = p.x / 12 + time,
            y = p.y / 12,
            e = 0.01;
          // Curl of a scalar streamfunction: (dψ/dy, -dψ/dx).
          const vx = (potential(x, y + e) - potential(x, y - e)) / (2 * e);
          const vy = -(potential(x + e, y) - potential(x - e, y)) / (2 * e);
          p.x = (p.x + vx * 0.35 + width) % width;
          p.y = (p.y + vy * 0.35 + height) % height;
        }
      },
      draw(ctx) {
        drawParticles(ctx, particles);
      },
      chatter() {
        return particleChatter(particles, width, height);
      },
      destroy() {
        particles.length = 0;
        noise.fill(0);
      },
    };
  },
};
