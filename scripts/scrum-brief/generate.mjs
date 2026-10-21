import { readFile, writeFile, rename, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
export const destination = resolve(root, 'src/app/components/daily-scrum-brief/brief.generated.ts');
import {
  collectGitEvidence,
  easternDate,
  previousPublication,
  summarizeEvidence,
} from './evidence.mjs';
const isoDate = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value + 'T12:00:00Z')) &&
  new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
export function buildBrief(events, { date, head, after, cutoff, notes }) {
  if (
    !isoDate(date) ||
    !/^[a-f0-9]{40}$/.test(head) ||
    !Number.isFinite(Date.parse(after)) ||
    !Number.isFinite(Date.parse(cutoff)) ||
    Date.parse(after) >= Date.parse(cutoff) ||
    easternDate(cutoff) !== date
  )
    throw Error('Invalid dated reporting window or checkpoint');
  if (
    !Array.isArray(events) ||
    events.some(
      (event) =>
        !/^[a-f0-9]{40}$/.test(event.commit) ||
        !Number.isFinite(Date.parse(event.occurredAt)) ||
        !Array.isArray(event.paths) ||
        !event.paths.every((path) => typeof path === 'string'),
    )
  )
    throw Error('Invalid timestamped evidence');
  const window = events.filter(
    (event) =>
      Date.parse(event.occurredAt) > Date.parse(after) &&
      Date.parse(event.occurredAt) <= Date.parse(cutoff),
  );
  const paragraphs = summarizeEvidence(window, notes);
  const evidence = {
    after,
    cutoff,
    events: window,
    notes: notes.changes.filter((note) => window.some((event) => event.commit === note.commit)),
  };
  return {
    date,
    sections: [
      {
        heading: 'Since the previous brief',
        paragraphs: paragraphs.length
          ? paragraphs
          : [
              'No material product implementation change was found in the available Git evidence for this reporting window.',
            ],
      },
    ],
    provenance: {
      sourceCommit: window.at(-1)?.commit ?? head,
      generatorCommit: head,
      evidenceSha256: createHash('sha256').update(JSON.stringify(evidence)).digest('hex'),
      method:
        'Timestamped main-history changes grouped by public area; reviewed summaries require an in-window source commit. No reusable status prose, invented plans or impediments.',
      reportingWindow: { after, cutoff },
      evidence: window.map(({ commit, occurredAt }) => ({ commit, occurredAt })),
      sources: ['Git first-parent main history', 'Source-bound public change summaries'],
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
    (sameDay?.brief.provenance.evidenceSha256 ?? sameDay?.brief.provenance.statusSha256) ===
      (brief.provenance.evidenceSha256 ?? brief.provenance.statusSha256) &&
    sameDay?.brief.provenance.sourceCommit === brief.provenance.sourceCommit
      ? sameDay.brief
      : brief;
  const entry =
    sameDay?.brief === current
      ? sameDay
      : {
          ...(brief.provenance.reportingWindow
            ? { cutoff: brief.provenance.reportingWindow.cutoff }
            : {}),
          date: brief.date,
          generatedDate: brief.date,
          publishedDate: brief.date,
          brief: current,
        };
  const entries = [...history.entries.filter((e) => e.date !== brief.date), entry].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const journal = { ...history, schemaVersion: 1, latestDate: brief.date, entries };
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
  now = new Date(),
  path = destination,
  journalPath = journalDestination,
  publishedJournal,
} = {}) {
  const day = date ?? easternDate(now);
  if (!isoDate(day) || day !== easternDate(now))
    throw Error('Generation must use the current Eastern date');
  const history = JSON.parse(await readFile(journalPath, 'utf8'));
  if (history.latestDate > day) throw Error('Backdated generation refused');
  // Closed same-day content keeps its original cutoff and wording, including the
  // owner-corrected archive. Retries cannot pull afternoon work into a morning brief.
  const sameDay = history.entries.find((entry) => entry.date === day);
  if (sameDay) return savePublication(sameDay.brief, { snapshotPath: path, journalPath });
  // Publication passes the actual PROD read-back, not an unconfirmed Git candidate.
  if (!publishedJournal)
    throw Error('Published journal read-back required before advancing history');
  const previous = previousPublication(publishedJournal, day);
  if (!previous) throw Error('No confirmed prior publication cutoff; last valid brief retained');
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const notes = JSON.parse(
    await readFile(resolve(root, 'scripts/scrum-brief/status.json'), 'utf8'),
  );
  const cutoff = new Date(now).toISOString();
  const events = collectGitEvidence({ cwd: root, head, after: previous.cutoff, cutoff });
  const brief = buildBrief(events, { date: day, head, after: previous.cutoff, cutoff, notes });
  return savePublication(brief, { snapshotPath: path, journalPath });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const response = await fetch('https://djamespoer.com/data/product-journal.json', {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Error('Published journal unavailable');
    const brief = await generate({ publishedJournal: await response.json() });
    console.log('Validated public brief checkpoint: ' + brief.date);
  } catch (error) {
    console.error('Brief generation failed; last valid snapshot retained. ' + error.message);
    process.exitCode = 1;
  }
}
