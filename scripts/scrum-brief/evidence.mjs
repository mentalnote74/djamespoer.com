import { execFileSync } from 'node:child_process';

export const easternDate = (now) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now));

// Fixed public descriptions of *changes*, not reusable claims of accomplishment.
// A topic appears only when its implementation actually changed inside the window.
const topics = [
  [
    'thingamajob',
    /^(src\/app\/components\/thingamajob|src\/app\/thingamajob)/,
    'Thingamajob’s public experience changed during this reporting period.',
  ],
  [
    'themes',
    /^(public\/assets\/theme-icons\/|src\/app\/components\/header\/|src\/styles\/themes\/|src\/app\/services\/(theme|living-theme))/,
    'The theme and navigation presentation changed during this reporting period.',
  ],
  [
    'buildometer',
    /^(src\/app\/components\/buildometer|server\/buildometer\/|scripts\/buildometer\/|public\/data\/buildometer-project\.json)/,
    'Buildometer’s measurement or presentation implementation changed during this reporting period.',
  ],
  [
    'home',
    /^src\/app\/components\/home\//,
    'The homepage composition changed during this reporting period.',
  ],
  [
    'deployment-history',
    /^src\/app\/components\/(deployment-history|smart-grid)\//,
    'The deployment-history and shared-grid presentation changed during this reporting period.',
  ],
  [
    'bedlam',
    /^src\/app\/components\/bedlam\//,
    'The living-logo implementation changed during this reporting period.',
  ],
  [
    'perspectives',
    /^src\/app\/components\/(perspective|carousel)/,
    'The perspective and carousel presentation changed during this reporting period.',
  ],
  [
    'scrum',
    /^(scripts\/scrum-brief\/|\.github\/workflows\/daily-scrum-brief\.yml)/,
    'The Daily Scrum Brief generation or publication implementation changed during this reporting period.',
  ],
  [
    'presentation',
    /^(src\/app\/|src\/styles|public\/assets\/)/,
    'Other public portfolio presentation changed during this reporting period.',
  ],
  [
    'delivery',
    /^(package(-lock)?\.json|angular\.json|wrangler\.jsonc|scripts\/|\.github\/workflows\/)/,
    'The project’s build or delivery configuration changed during this reporting period.',
  ],
];

const incidental = (path) =>
  /(^|\/)([^/]+\.(spec|test)\.[^/]+|README\.md)$/.test(path) ||
  /^src\/app\/generated\//.test(path) ||
  path === 'src/app/components/daily-scrum-brief/brief.generated.ts' ||
  [
    'public/data/product-journal.json',
    'public/data/deployment-history.json',
    'public/data/buildometer-release.json',
  ].includes(path);

export function summarizeEvidence(events, notes) {
  if (notes.schemaVersion !== 2 || !Array.isArray(notes.changes))
    throw Error('Invalid dated change summaries');
  const summaries = [],
    covered = new Set();
  for (const note of notes.changes) {
    if (
      !/^[a-f0-9]{40}$/.test(note.commit) ||
      typeof note.summary !== 'string' ||
      !note.summary.trim() ||
      note.summary.length > 2000 ||
      /[<>\x00-\x1f]/.test(note.summary)
    )
      throw Error('Invalid source-bound change summary');
    // No matching in-window source commit means no prose, even if the note is true.
    if (!events.some((event) => event.commit === note.commit)) continue;
    if (covered.has(note.commit)) throw Error('Duplicate change summary');
    covered.add(note.commit);
    summaries.push(note.summary);
  }
  const grouped = new Set();
  for (const event of events) {
    if (covered.has(event.commit)) continue;
    for (const path of event.paths.filter((path) => !incidental(path))) {
      const topic = topics.find(([, match]) => match.test(path));
      if (topic) grouped.add(topic[0]);
    }
  }
  for (const [id, , summary] of topics) if (grouped.has(id)) summaries.push(summary);
  return [...new Set(summaries)];
}

/** Main's first-parent history, filtered by exact commit timestamps, never date labels. */
export function collectGitEvidence({ cwd, head, after, cutoff }) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const lower = Date.parse(after),
    upper = Date.parse(cutoff);
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower >= upper)
    throw Error('Invalid reporting window');
  return git('log', '--first-parent', '--format=%H%x09%cI', head)
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [commit, occurredAt] = line.split('\t');
      return { commit, occurredAt };
    })
    .filter(
      (event) => Date.parse(event.occurredAt) > lower && Date.parse(event.occurredAt) <= upper,
    )
    .reverse()
    .map((event) => ({
      ...event,
      paths: [
        ...new Set(
          git(
            'diff-tree',
            '--root',
            '--first-parent',
            '-m',
            '--no-commit-id',
            '--name-only',
            '-r',
            event.commit,
          )
            .split('\n')
            .filter(Boolean),
        ),
      ],
    }));
}

/** Reconstructed dates are not successful publications and cannot advance the window. */
export function previousPublication(journal, date) {
  return journal.entries
    .filter((entry) => entry.date < date && entry.cutoff && !entry.reconstructed)
    .sort((a, b) => b.cutoff.localeCompare(a.cutoff))[0];
}
