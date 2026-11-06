import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  projectMeasurement,
  applyProject,
  sameSnapshot,
  assertAppendOnly,
  appendObservationText,
} from '../../server/buildometer/project.ts';
import { emptyData } from '../../server/buildometer/derive.ts';
const root = fileURLToPath(new URL('../../', import.meta.url));
const path = 'scripts/buildometer/project-ledger.json';
const file = new URL('./project-ledger.json', import.meta.url);
const ledgerRaw = await readFile(file, 'utf8');
const ledger = JSON.parse(ledgerRaw);
let appended = false;
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
  throw Error(
    'Committed ledger unavailable; cannot verify immutable history. Restore Git access before projecting.',
  );
}
if (old) assertAppendOnly(old, ledger);
const receipt = JSON.parse(
  await readFile(new URL('./release-evidence.json', import.meta.url), 'utf8'),
);
const release = receipt.release;
if (
  release?.environment !== 'production' ||
  release.status !== 'succeeded' ||
  release.stage !== 'deployed' ||
  !Number.isFinite(Date.parse(release.deployedAt)) ||
  Date.parse(release.deployedAt) > Date.now()
)
  throw Error('Invalid eligible production release receipt');
if (process.argv[2] === 'observe') {
  if (!process.argv[3] || !process.argv[4])
    throw Error(
      'Usage: npm run buildometer:observe -- candidate-members.json "approved change reason"',
    );
  const members = JSON.parse(await readFile(process.argv[3], 'utf8'));
  const validation = structuredClone(ledger);
  validation.observations.push({
    id: crypto.randomUUID(),
    observedAt: new Date().toISOString(),
    reason: process.argv[4],
    members,
  });
  projectMeasurement(validation);
  const reviewedNewRelease =
    process.argv[5] === '--verified-release-review' &&
    Date.parse(release.deployedAt) > Date.parse(ledger.observations.at(-1).observedAt);
  if (!sameSnapshot(ledger.observations.at(-1).members, members) || reviewedNewRelease) {
    ledger.observations.push({
      id: crypto.randomUUID(),
      observedAt: new Date().toISOString(),
      reason: process.argv[4],
      members,
    });
    appended = true;
  } else console.log('BOM reconciliation: unchanged evidence; no observation appended.');
}
const projection = projectMeasurement(ledger, release.deployedAt);
const output = new URL('../../public/data/buildometer-project.json', import.meta.url);
async function atomic(url, value) {
  const tmp = new URL(url.href + '.tmp');
  try {
    await writeFile(tmp, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
    await rename(tmp, url);
  } finally {
    await unlink(tmp).catch(() => {});
  }
}
if (appended) {
  await atomic(file, appendObservationText(ledgerRaw, ledger.observations.at(-1)));
}
await atomic(output, projection);
await writeFile(
  new URL('../../server/buildometer/project-members.generated.ts', import.meta.url),
  '// Generated from approved project membership. Server-only.\nexport const PROJECT_MEMBERS = ' +
    JSON.stringify(ledger.observations.at(-1).members.map((m) => m.key)) +
    ' as const;\n',
);
await atomic(new URL('../../public/data/buildometer-release.json', import.meta.url), {
  schemaVersion: 1,
  sha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
});
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
  latestEligibleReleaseAt: projection.latestEligibleReleaseAt,
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
