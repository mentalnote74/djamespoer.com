import { readFile, writeFile, rename, mkdir, rm } from 'node:fs/promises';
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
export const journalDestination = resolve(root, 'public/data/product-journal.json');
export async function savePublication(
  brief,
  { journalPath = journalDestination, snapshotPath = destination } = {},
) {
  const before = await Promise.all(
    [journalPath, snapshotPath].map(async (path) => {
      try {
        return await readFile(path);
      } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
      }
    }),
  );
  const history = before[0]
    ? JSON.parse(before[0].toString('utf8'))
    : { schemaVersion: 1, latestDate: brief.date, entries: [] };
  if (
    history.schemaVersion !== 1 ||
    !Array.isArray(history.entries) ||
    history.entries.some((e) => !isoDate(e.date) || e.brief?.date !== e.date) ||
    new Set(history.entries.map((e) => e.date)).size !== history.entries.length ||
    history.entries.some((e) => e.date > brief.date)
  )
    throw Error('Invalid or newer journal; history retained');
  const sameDay = history.entries.find((e) => e.date === brief.date);
  const current =
    sameDay?.brief.provenance.statusSha256 === brief.provenance.statusSha256 &&
    sameDay?.brief.provenance.sourceCommit === brief.provenance.sourceCommit
      ? sameDay.brief
      : brief;
  const entry = {
    date: brief.date,
    generatedDate: brief.date,
    publishedDate: brief.date,
    brief: current,
  };
  const entries = [...history.entries.filter((e) => e.date !== brief.date), entry].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const journal = { schemaVersion: 1, latestDate: brief.date, entries };
  const contents = [
    JSON.stringify(journal, null, 2) + '\n',
    "// Generated snapshot. Do not edit dates independently.\nimport type { ScrumBrief } from './brief.model';\nexport const DAILY_SCRUM_BRIEF: ScrumBrief = " +
      JSON.stringify(current, null, 2) +
      ';\n',
  ];
  const paths = [journalPath, snapshotPath],
    temps = paths.map((p) => p + '.' + process.pid + '.tmp');
  try {
    for (let i = 0; i < paths.length; i++) {
      await mkdir(dirname(paths[i]), { recursive: true });
      await writeFile(temps[i], contents[i], { flag: 'wx' });
    }
    for (let i = 0; i < paths.length; i++) await rename(temps[i], paths[i]);
  } catch (error) {
    for (let i = 0; i < paths.length; i++) {
      if (before[i] === null) await rm(paths[i], { force: true });
      else await writeFile(paths[i], before[i]);
    }
    throw error;
  } finally {
    for (const temp of temps) await rm(temp, { force: true });
  }
  return current;
}
export async function generate({
  date,
  path = destination,
  journalPath = journalDestination,
} = {}) {
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
  return savePublication(brief, { snapshotPath: path, journalPath });
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
