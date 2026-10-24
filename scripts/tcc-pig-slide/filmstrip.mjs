import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const root = 'tmp/evidence/pig-sprite',
  magick = 'C:/Program Files/ImageMagick-7.1.2-Q16-HDRI/magick.exe';
const rows = JSON.parse(await readFile(root + '/results-baseline-sprite-visual.json', 'utf8'));
await mkdir(root + '/review', { recursive: true });
for (const width of [1440, 390])
  for (const scenario of ['home', 'hero']) {
    const panels = [];
    for (const mode of ['baseline', 'sprite']) {
      const row = rows.find(
        (r) =>
          r.width === width &&
          r.profile === 'slow' &&
          r.scenario === scenario &&
          r.rep === 1 &&
          r.cache === 'cold' &&
          r.mode === mode,
      );
      if (!row) continue;
      const frames = JSON.parse(await readFile(`${root}/${row.id}/snapshots.json`, 'utf8'));
      const start = row.pig.arrival ?? row.pig.first;
      // Include the first visible state, partial-load state(s), and fully decoded state.
      const picks = [
        ...new Set([
          0,
          Math.floor(frames.length * 0.2),
          Math.floor(frames.length * 0.4),
          Math.floor(frames.length * 0.6),
          Math.max(0, frames.length - 2),
          frames.length - 1,
        ]),
      ].map((i) => frames[i]);
      const images = [];
      for (let n = 0; n < picks.length; n++) {
        const f = picks[n],
          at = f.at - start,
          r = row.sceneRect;
        const file = `${root}/review/${row.id}-${n}.jpg`;
        execFileSync(magick, [
          `${root}/${row.id}/${f.file}`,
          '-resize',
          `${width}x1000!`,
          '-crop',
          `${Math.ceil(r.width)}x${Math.ceil(r.height)}+${Math.floor(r.x)}+${Math.floor(r.y)}`,
          '+repage',
          '-resize',
          '480x160!',
          '-background',
          'white',
          '-fill',
          '#151515',
          '-font',
          'Arial',
          '-pointsize',
          '15',
          '-gravity',
          'south',
          '-splice',
          '0x26',
          '-annotate',
          '+0+5',
          `${mode} ${Math.round(at)} ms`,
          file,
        ]);
        images.push(file);
      }
      const file = `${root}/review/${width}-${scenario}-${mode}.jpg`;
      execFileSync(magick, [
        'montage',
        ...images,
        '-tile',
        `${images.length}x1`,
        '-geometry',
        '+3+3',
        '-background',
        '#dedede',
        file,
      ]);
      panels.push(file);
    }
    if (panels.length)
      execFileSync(magick, [
        ...panels,
        '-background',
        '#dedede',
        '-gravity',
        'west',
        '-append',
        `${root}/review/${width}-${scenario}-comparison.jpg`,
      ]);
  }
// Initial hero HTML may paint before the screenshot loop resumes from navigation.
// Retain the independently recorded CDP frames, including baseline face holes.
const timingRows = JSON.parse(await readFile(root + '/results-baseline-sprite.json', 'utf8'));
for (const width of [1440, 390]) {
  const panels = [];
  for (const mode of ['baseline', 'sprite']) {
    const row = timingRows.find(
      (r) =>
        r.width === width &&
        r.profile === 'slow' &&
        r.scenario === 'hero' &&
        r.rep === 1 &&
        r.cache === 'cold' &&
        r.mode === mode,
    );
    const frames = JSON.parse(await readFile(`${root}/${row.id}/frames.json`, 'utf8'));
    const targets = [row.pig.first, ...row.pig.states.slice(1).map((s) => s.at), row.pig.complete];
    const picks = [
      ...new Set(
        targets.map((t) =>
          frames.reduce(
            (best, f) =>
              Math.abs(f.time * 1000 - row.timeOrigin - t) <
              Math.abs(best.time * 1000 - row.timeOrigin - t)
                ? f
                : best,
            frames[0],
          ),
        ),
      ),
    ];
    const images = [];
    for (const [n, f] of picks.entries()) {
      const r = row.sceneRect,
        file = `${root}/review/${row.id}-cdp-${n}.jpg`,
        at = f.time * 1000 - row.timeOrigin - row.pig.first;
      execFileSync(magick, [
        `${root}/${row.id}/${f.file}`,
        '-crop',
        `${Math.ceil(r.width)}x${Math.ceil(r.height)}+${Math.floor(r.x)}+${Math.floor(r.y)}`,
        '+repage',
        '-resize',
        '480x160!',
        '-background',
        'white',
        '-fill',
        '#151515',
        '-font',
        'Arial',
        '-pointsize',
        '15',
        '-gravity',
        'south',
        '-splice',
        '0x26',
        '-annotate',
        '+0+5',
        `${mode} CDP ${Math.round(at)} ms`,
        file,
      ]);
      images.push(file);
    }
    const final = `${root}/review/${row.id}-assembled.jpg`,
      r = row.sceneRect;
    execFileSync(magick, [
      `${root}/${row.id}/complete.png`,
      '-resize',
      `${width}x1000!`,
      '-crop',
      `${Math.ceil(r.width)}x${Math.ceil(r.height)}+${Math.floor(r.x)}+${Math.floor(r.y)}`,
      '+repage',
      '-resize',
      '480x160!',
      '-background',
      'white',
      '-fill',
      '#151515',
      '-font',
      'Arial',
      '-pointsize',
      '15',
      '-gravity',
      'south',
      '-splice',
      '0x26',
      '-annotate',
      '+0+5',
      `${mode} assembled - later snapshot`,
      final,
    ]);
    images.push(final);
    const file = `${root}/review/${width}-hero-${mode}-cdp.jpg`;
    execFileSync(magick, [
      'montage',
      ...images,
      '-tile',
      `${images.length}x1`,
      '-geometry',
      '+3+3',
      '-background',
      '#dedede',
      file,
    ]);
    panels.push(file);
  }
  execFileSync(magick, [
    ...panels,
    '-background',
    '#dedede',
    '-gravity',
    'west',
    '-append',
    `${root}/review/${width}-hero-cdp.jpg`,
  ]);
}
await writeFile(
  root + '/review/README.txt',
  'Separate visual pass: actual browser screenshots sampled every ~80ms plus capture time, with 150ms latency/1.6Mbps/4x CPU. Labels are capture-start times relative to Next click (home) or first visible stage (hero). Screenshot overhead is excluded from the 96-navigation timing comparison. Frames bracket appearance, not exact compositor presentation. Full screenshots, CDP frames/timestamps and traces remain alongside the local runs.\n',
);
