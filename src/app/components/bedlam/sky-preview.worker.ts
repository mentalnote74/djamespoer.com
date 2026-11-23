/// <reference lib="webworker" />
// SCRUM-219: the header sky's cloud field is computed here, off the main thread.
import { createSkyNoise, paintSky } from './sky-preview.kernel';

const noise = createSkyNoise();

addEventListener('message', ({ data }: MessageEvent) => {
  const { width, height, time, palette } = data;
  const pixels = new Uint8ClampedArray(width * height * 4);
  paintSky(pixels, width, height, time, palette, noise);
  // Transfer, don't copy: the frame moves back to the main thread for putImageData.
  postMessage({ width, height, pixels }, [pixels.buffer]);
});
