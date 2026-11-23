/// <reference lib="webworker" />
// SCRUM-219: the chameleon's pigment shader runs here, off the main thread.
import { paintChameleon, prepareMapping } from './living-chameleon.kernel';

let src: Uint8ClampedArray | undefined;
let map: Float32Array | undefined;

addEventListener('message', ({ data }: MessageEvent) => {
  if (data.type === 'prepare') {
    src = data.src as Uint8ClampedArray;
    map = prepareMapping(src, data.width, data.height);
    postMessage({ type: 'ready', id: data.id });
  } else if (data.type === 'paint' && src && map) {
    const dst = new Uint8ClampedArray(src.length);
    paintChameleon(src, dst, map, data.t);
    // Transfer, don't copy: the frame buffer moves back to the main thread for putImageData.
    postMessage({ type: 'frame', id: data.id, dst }, [dst.buffer]);
  }
});
