import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const archive = 'artwork/tcc-pig-slide/';
const temp = 'tmp/tcc-pig/';
const target = 'public/assets/tcc-pig/';
await mkdir(temp, { recursive: true });
await mkdir(target, { recursive: true });
const magick = process.env.IMAGEMAGICK ?? 'C:/Program Files/ImageMagick-7.1.2-Q16-HDRI/magick.exe';
const run = (...args) => execFileSync(magick, args, { stdio: 'pipe' });
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`;

// All registration uses the original 2172 x 724 photograph. The kiss reference is
// 2171 px wide; normalize that single pixel before taking its local mouth patch.
for (const pose of ['rest', 'wink', 'kiss']) {
  run(archive + pose + '-master.png', '-resize', '2172x724!', temp + pose + '.png');
}
const boxes = {
  eye: { x: 1410, y: 185, w: 185, h: 165, small: 96, large: 185 },
  mouth: { x: 1500, y: 415, w: 400, h: 200, small: 192, large: 400 },
};
// Remove the resting features from the runtime base. Every pose fills the same
// holes with generous opaque overlap, so replacement never doubles a feature.
await writeFile(
  temp + 'holes.svg',
  svg(
    2172,
    724,
    '<rect width="2172" height="724" fill="white"/>' +
      Object.values(boxes)
        .map(
          ({ x, y, w, h }) =>
            `<rect x="${x + 16}" y="${y + 16}" width="${w - 32}" height="${h - 32}" rx="14" fill="black"/>`,
        )
        .join(''),
  ),
);
run(
  temp + 'rest.png',
  temp + 'holes.svg',
  '-alpha',
  'off',
  '-compose',
  'CopyOpacity',
  '-composite',
  temp + 'base.png',
);

const layers = [{ name: 'base', w: 2172, h: 724, small: 768, large: 1440, q: 48 }];
for (const [name, pose, region] of [
  ['eye-open', 'rest', 'eye'],
  ['eye-wink', 'wink', 'eye'],
  ['mouth-rest', 'rest', 'mouth'],
  ['mouth-kiss', 'kiss', 'mouth'],
]) {
  const box = boxes[region];
  await writeFile(
    temp + region + '-alpha.svg',
    svg(
      box.w,
      box.h,
      `<rect x="6" y="6" width="${box.w - 12}" height="${box.h - 12}" rx="16" fill="white"/>`,
    ),
  );
  run(
    temp + region + '-alpha.svg',
    '-background',
    'black',
    '-alpha',
    'remove',
    '-blur',
    '0x3',
    temp + region + '-alpha.png',
  );
  run(
    temp + pose + '.png',
    '-crop',
    `${box.w}x${box.h}+${box.x}+${box.y}`,
    '+repage',
    temp + region + '-alpha.png',
    '-alpha',
    'off',
    '-compose',
    'CopyOpacity',
    '-composite',
    temp + name + '-crop.png',
  );
  run(
    '-size',
    '2172x724',
    'xc:none',
    temp + name + '-crop.png',
    '-geometry',
    '+' + box.x + '+' + box.y,
    '-compose',
    'Over',
    '-composite',
    temp + name + '.png',
  );
  layers.push({ name, ...box, q: 66 });
}
