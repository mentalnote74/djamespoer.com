import { Algorithm } from '../contract';
import { field, sample, statistics } from './field';

export const cyclic: Algorithm = {
  id: 'cyclic',
  create(width, height, random) {
    let cells = Uint8Array.from({ length: width * height }, () => Math.floor(random() * 8));
    let next = new Uint8Array(cells.length);
    const raster = field(width, height);
    return {
      step() {
        for (let i = 0; i < cells.length; i++) {
          const target = (cells[i] + 1) % 8;
          let neighbors = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              if (
                (dx || dy) &&
                sample(cells, width, height, (i % width) + dx, Math.floor(i / width) + dy) ===
                  target
              )
                neighbors++;
            }
          next[i] = neighbors >= 1 ? target : cells[i];
        }
        [cells, next] = [next, cells];
      },
      draw(context) {
        raster.draw(context, (i) => cells[i] / 7);
      },
      chatter() {
        return statistics(cells, width, 7);
      },
      destroy() {
        cells = next = new Uint8Array(0);
        raster.destroy();
      },
    };
  },
};
