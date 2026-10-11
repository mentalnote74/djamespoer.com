import { Algorithm, clamp } from '../contract';
import { field, sample, statistics } from './field';

export const grayScott: Algorithm = {
  id: 'gray-scott',
  create(width, height, random) {
    let a = new Float32Array(width * height).fill(1),
      b = new Float32Array(a.length);
    let nextA = new Float32Array(a.length),
      nextB = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++)
      if (random() < 0.12) {
        a[i] = 0.5;
        b[i] = 0.25;
      }
    const raster = field(width, height);
    const laplacian = (v: Float32Array, x: number, y: number) =>
      sample(v, width, height, x - 1, y) +
      sample(v, width, height, x + 1, y) +
      sample(v, width, height, x, y - 1) +
      sample(v, width, height, x, y + 1) -
      4 * sample(v, width, height, x, y);
    return {
      step() {
        for (let i = 0; i < a.length; i++) {
          const x = i % width,
            y = Math.floor(i / width),
            reaction = a[i] * b[i] * b[i];
          nextA[i] = clamp(a[i] + 0.8 * (0.2 * laplacian(a, x, y) - reaction + 0.035 * (1 - a[i])));
          nextB[i] = clamp(
            b[i] + 0.8 * (0.1 * laplacian(b, x, y) + reaction - (0.035 + 0.062) * b[i]),
          );
        }
        [a, nextA] = [nextA, a];
        [b, nextB] = [nextB, b];
      },
      draw(context) {
        raster.draw(context, (i) => b[i] * 3);
      },
      chatter() {
        return statistics(b, width);
      },
      destroy() {
        a = b = nextA = nextB = new Float32Array(0);
        raster.destroy();
      },
    };
  },
};
