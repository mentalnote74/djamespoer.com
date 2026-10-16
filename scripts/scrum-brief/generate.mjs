import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
export const destination = resolve(root, 'src/app/components/daily-scrum-brief/brief.generated.ts');
const isoDate = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
const text = (value) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.length <= 400 &&
  !/[<>\x00-\x1f]/.test(value);
export function buildBrief(status, { date, head, verifyCommit }) {
  if (
    !isoDate(date) ||
    !isoDate(status.verifiedOn) ||
    !isoDate(status.validThrough) ||
    status.verifiedOn > date ||
    status.validThrough < date ||
    status.validThrough < status.verifiedOn ||
    (Date.parse(status.validThrough) - Date.parse(status.verifiedOn)) / 86400000 > 7
  )
    throw Error('Status verification window invalid or expired');
  if (
    status.schemaVersion !== 1 ||
    !/^[a-f0-9]{40}$/.test(status.sourceCommit) ||
    !/^[a-f0-9]{40}$/.test(head) ||
    !verifyCommit(status.sourceCommit)
  )
    throw Error('Unverified checkpoint lineage');
  for (const [key, min, max] of [
    ['recentlyShipped', 2, 4],
    ['currentFocus', 1, 3],
  ]) {
    const values = status[key];
    if (
      !Array.isArray(values) ||
      values.length < min ||
      values.length > max ||
      !values.every(text) ||
      new Set(values).size !== values.length
    )
      throw Error('Invalid concise status items');
  }
  if (!text(status.next)) throw Error('One next gate required');
  return {
    date,
    sections: [
      { heading: 'Recently shipped', items: status.recentlyShipped },
      { heading: 'Current focus', items: status.currentFocus },
      { heading: 'Next', paragraph: status.next },
    ],
    provenance: {
      sourceCommit: status.sourceCommit,
      generatorCommit: head,
      statusSha256: createHash('sha256').update(JSON.stringify(status)).digest('hex'),
      method:
        'Explicit public status metadata; checkpoint ancestry verified; no commit-message inference',
    },
  };
}
export async function saveBrief(brief, path = destination) {
  const content =
    "// Generated snapshot. Do not edit dates independently.\nimport type { ScrumBrief } from './brief.model';\nexport const DAILY_SCRUM_BRIEF: ScrumBrief = " +
    JSON.stringify(brief, null, 2) +
    ';\n';
  await mkdir(dirname(path), { recursive: true });
  const temp = path + '.' + process.pid + '.tmp';
  await writeFile(temp, content, { flag: 'wx' });
  await rename(temp, path);
}
export async function generate({ date, path = destination } = {}) {
  const status = JSON.parse(
    await readFile(resolve(root, 'scripts/scrum-brief/status.json'), 'utf8'),
  );
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const brief = buildBrief(status, {
    date:
      date ??
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()),
    head,
    verifyCommit: (sha) => {
      try {
        execFileSync('git', ['merge-base', '--is-ancestor', sha, 'HEAD'], {
          cwd: root,
          stdio: 'ignore',
        });
        return true;
      } catch {
        return false;
      }
    },
  });
  await saveBrief(brief, path);
  return brief;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const brief = await generate();
    console.log('Validated public brief checkpoint: ' + brief.date);
  } catch {
    console.error(
      'Brief generation failed; last valid snapshot retained. Check structured status validity and checkpoint lineage.',
    );
    process.exitCode = 1;
  }
}
