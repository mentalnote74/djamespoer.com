import { Algorithm, clamp } from '../contract';
import { field, sample, statistics } from './field';

export const physarum: Algorithm = {
  id: 'physarum',
  create(width, height, random) {
    let trail = new Float32Array(width * height),
      next = new Float32Array(trail.length);
    const agents = Array.from({ length: 160 }, () => ({
      x: random() * width,
      y: random() * height,
      angle: random() * Math.PI * 2,
    }));
    const raster = field(width, height);
    return {
      step() {
        for (const agent of agents) {
          const sense = (offset: number) =>
            sample(
              trail,
              width,
              height,
              agent.x + Math.cos(agent.angle + offset) * 4,
              agent.y + Math.sin(agent.angle + offset) * 4,
            );
          const front = sense(0),
            left = sense(-0.6),
            right = sense(0.6);
          if (front < Math.max(left, right)) agent.angle += left > right ? -0.25 : 0.25;
          else if (front === left && left === right) agent.angle += (random() - 0.5) * 0.2;
          agent.x = (agent.x + Math.cos(agent.angle) * 0.45 + width) % width;
          agent.y = (agent.y + Math.sin(agent.angle) * 0.45 + height) % height;
          const i = Math.floor(agent.y) * width + Math.floor(agent.x);
          trail[i] = clamp(trail[i] + 0.15);
        }
        for (let i = 0; i < trail.length; i++) {
          const x = i % width,
            y = Math.floor(i / width);
          next[i] =
            ((trail[i] * 4 +
              sample(trail, width, height, x - 1, y) +
              sample(trail, width, height, x + 1, y) +
              sample(trail, width, height, x, y - 1) +
              sample(trail, width, height, x, y + 1)) /
              8) *
            0.985;
        }
        [trail, next] = [next, trail];
      },
      draw(context) {
        raster.draw(context, (i) => trail[i]);
      },
      chatter() {
        return statistics(trail, width);
      },
      destroy() {
        agents.length = 0;
        trail = next = new Float32Array(0);
        raster.destroy();
      },
    };
  },
};
