// Build-time diagnostics only. This module is not shipped to the browser.
import { compileString } from 'sass';
import { fileURLToPath } from 'node:url';

export const themeCss = compileString("@use 'themes';", {
  loadPaths: [fileURLToPath(new URL('../src/styles', import.meta.url))],
  style: 'compressed',
}).css;
export const palettes = Object.fromEntries(
  [...themeCss.matchAll(/:root\[data-theme=([a-z-]+)\]\{([^{}]+)\}/g)].map((match) => [
    match[1],
    Object.fromEntries(
      [...match[2].matchAll(/--([a-z-]+):([^;]+);?/g)].map((m) => [m[1], m[2].trim()]),
    ),
  ]),
);
export function rgb(hex) {
  let value = hex.slice(1);
  if (value.length === 3) value = [...value].map((c) => c + c).join('');
  return value.match(/../g).map((v) => parseInt(v, 16));
}
export function contrast(a, b) {
  const luminance = (color) => {
    const c = color
      .map((v) => v / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
// Actual consumers: inherited prose/links/footer/grid, carousel, disclosures,
// native controls, selected states, kiosk body/screen and pagination status.
export const pairs = [
  ...['page-background', 'section-surface', 'panel-surface'].flatMap((bg) => [
    ['page-foreground', bg, 4.5],
    ['secondary-text', bg, 4.5],
    ['grid-disabled-text', bg, 4.5],
    ['grid-border', bg, 3],
  ]),
  ['control-foreground', 'control-background', 4.5],
  ['control-hover-foreground', 'control-hover-background', 4.5],
  ['control-active-foreground', 'control-active-background', 4.5],
  ['control-border', 'control-background', 3],
  ['control-border', 'page-background', 3],
  ['control-border', 'section-surface', 3],
  ['control-border', 'navigation-surface', 3],
  ['control-border', 'input-surface', 3],
  ['navigation-foreground', 'navigation-surface', 4.5],
  ['selected-foreground', 'selected-background', 4.5],
  ['component-text', 'component-surface', 4.5],
  ['component-text', 'input-surface', 4.5],
  ['component-border', 'component-surface', 3],
  ['component-border', 'input-surface', 3],
  ['input-text', 'input-surface', 4.5],
  ['panel-border', 'panel-surface', 3],
  ['panel-border', 'section-surface', 3],
];
export function evaluate(tokens) {
  return pairs.map(([fg, bg, required]) => ({
    fg,
    bg,
    required,
    ratio: contrast(rgb(tokens[fg]), rgb(tokens[bg])),
  }));
}
export function transition(from, to, steps = 1000) {
  const a = palettes[from],
    b = palettes[to];
  const minima = pairs.map(([fg, bg, required]) => ({ fg, bg, required, ratio: Infinity, at: 0 }));
  let firstUnsafe = null;
  let lastUnsafe = null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mix = (role) => rgb(a[role]).map((v, j) => v + (rgb(b[role])[j] - v) * t);
    minima.forEach((p) => {
      const ratio = contrast(mix(p.fg), mix(p.bg));
      if (ratio < p.required) {
        firstUnsafe ??= t;
        lastUnsafe = t;
      }
      if (ratio < p.ratio) {
        p.ratio = ratio;
        p.at = t;
      }
    });
  }
  return {
    from,
    to,
    polarityChange:
      contrast(rgb(a['page-foreground']), [0, 0, 0]) >
        contrast(rgb(a['page-background']), [0, 0, 0]) !==
      contrast(rgb(b['page-foreground']), [0, 0, 0]) >
        contrast(rgb(b['page-background']), [0, 0, 0]),
    firstUnsafe,
    lastUnsafe,
    minima,
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const anchors = Object.keys(palettes).filter((name) => name !== 'teetotaler');
  for (const name of anchors) {
    const rows = evaluate(palettes[name]);
    const text = rows.filter((p) => p.required === 4.5).sort((a, b) => a.ratio - b.ratio)[0];
    const ui = rows.filter((p) => p.required === 3).sort((a, b) => a.ratio - b.ratio)[0];
    console.log(
      `${name}: text ${text.ratio.toFixed(3)} (${text.fg}/${text.bg}); UI ${ui.ratio.toFixed(3)} (${ui.fg}/${ui.bg})`,
    );
  }
  const edges = anchors.slice(1).map((name, i) => [anchors[i], name]);
  if (anchors.includes('bloody-mary')) edges.push(['bloody-mary', 'tequila-sunrise']);
  for (const [from, to] of edges) {
    const r = transition(from, to);
    const body = r.minima.find((p) => p.fg === 'page-foreground' && p.bg === 'page-background');
    const text = r.minima.filter((p) => p.required === 4.5).sort((a, b) => a.ratio - b.ratio)[0];
    const ui = r.minima.filter((p) => p.required === 3).sort((a, b) => a.ratio - b.ratio)[0];
    console.log(
      `${r.from} -> ${r.to}: ${r.polarityChange ? 'POLARITY CROSSOVER' : text.ratio >= 4.5 && ui.ratio >= 3 ? 'SAFE' : 'UNSAFE'}; body ${body.ratio.toFixed(3)} @${body.at}; text ${text.ratio.toFixed(3)} @${text.at}; UI ${ui.ratio.toFixed(3)} @${ui.at}; failing samples ${r.firstUnsafe}..${r.lastUnsafe}`,
    );
  }
}
