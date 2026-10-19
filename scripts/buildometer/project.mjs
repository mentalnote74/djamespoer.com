import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { projectMeasurement, applyProject } from '../../server/buildometer/project.ts';
import { emptyData } from '../../server/buildometer/derive.ts';
const root = fileURLToPath(new URL('../../', import.meta.url));
const path = 'scripts/buildometer/project-ledger.json';
const file = new URL('./project-ledger.json', import.meta.url);
const ledger = JSON.parse(await readFile(file, 'utf8'));
let old;
try {
  old = JSON.parse(
    execFileSync('git', ['show', 'HEAD:' + path], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }),
  );
} catch {
  /* First baseline is new. */
}
if (old) {
  const { observations: a, ...headerA } = old,
    { observations: b, ...headerB } = ledger;
  if (
    JSON.stringify(headerA) !== JSON.stringify(headerB) ||
    b.length < a.length ||
    a.some((o, i) => JSON.stringify(o) !== JSON.stringify(b[i]))
  )
    throw Error('Prior baseline/observations are immutable; append only');
}
if (process.argv[2] === 'observe') {
  if (!process.argv[3] || !process.argv[4])
    throw Error(
      'Usage: npm run buildometer:observe -- candidate-members.json "approved change reason"',
    );
  const members = JSON.parse(await readFile(process.argv[3], 'utf8'));
  ledger.observations.push({
    id: crypto.randomUUID(),
    observedAt: new Date().toISOString(),
    reason: process.argv[4],
    members,
  });
}
const projection = projectMeasurement(ledger);
const output = new URL('../../public/data/buildometer-project.json', import.meta.url);
async function atomic(url, value) {
  const tmp = new URL(url.href + '.tmp');
  try {
    await writeFile(tmp, JSON.stringify(value, null, 2) + '\n');
    await rename(tmp, url);
  } finally {
    await unlink(tmp).catch(() => {});
  }
}
if (process.argv[2] === 'observe') await atomic(file, ledger);
await atomic(output, projection);
// Same validated calculation as the API; Home needs no provider or dashboard request.
const data = emptyData(projection.observedAt);
applyProject(data, projection);
const current = projection.observations.at(-1);
const summary = {
  percent: data.metrics.completion.value,
  total: current.total,
  shipped: current.shipped,
  remaining: current.remaining,
  observedAt: projection.observedAt,
};
await writeFile(
  new URL('../../src/app/generated/buildometer-summary.ts', import.meta.url),
  '// Generated from the approved Buildometer ledger. Do not edit.\nexport const BUILDOMETER_SUMMARY = ' +
    JSON.stringify(summary) +
    ' as const;\n',
);
console.log(
  JSON.stringify({
    baseline: projection.baselineId,
    ...projection.observations.at(-1),
    observations: projection.observations.length,
  }),
);
