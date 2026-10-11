import { Chatter, clamp } from '../contract';

/** Small shared raster helper; algorithm state remains owned by each cartridge. */
export function field(width: number, height: number) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  let image: ImageData | undefined;
  const set = (index: number, target: number): void => {
    pixels[index] = image
      ? pixels[index] + Math.max(-2, Math.min(2, target - pixels[index]))
      : target;
  };
  return {
    draw(context: CanvasRenderingContext2D, value: (i: number) => number): void {
      for (let i = 0; i < width * height; i++) {
        const v = clamp(value(i));
        // Slew-limited state-driven raster changes without per-pixel allocations.
        set(i * 4, 50 + v * 160);
        set(i * 4 + 1, 90 + (1 - v) * 150);
        set(i * 4 + 2, 230);
        set(i * 4 + 3, v * 180);
      }
      image ??= context.createImageData(width, height);
      image.data.set(pixels);
      context.putImageData(image, 0, 0);
    },
    destroy(): void {
      image = undefined;
    },
  };
}

export function sample(
  values: Float32Array | Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  return values[
    (((Math.floor(y) % height) + height) % height) * width +
      (((Math.floor(x) % width) + width) % width)
  ];
}

export function statistics(values: Float32Array | Uint8Array, width: number, scale = 1): Chatter {
  let mass = 0,
    x = 0,
    y = 0;
  const height = values.length / width;
  for (let i = 0; i < values.length; i++) {
    const v = values[i] / scale;
    mass += v;
    x += (i % width) * v;
    y += Math.floor(i / width) * v;
  }
  return {
    x: mass ? x / mass / width : 0.5,
    y: mass ? y / mass / height : 0.5,
    energy: mass / values.length,
  };
}
