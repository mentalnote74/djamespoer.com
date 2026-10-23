import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { buildBrief, generate, savePublication, readJiraBrief } from './generate.mjs';
import { collectGitEvidence, previousPublication } from './evidence.mjs';
const cwd = fileURLToPath(new URL('../../', import.meta.url));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim();
const notes = JSON.parse(await readFile(new URL('./status.json', import.meta.url), 'utf8'));
const archive = JSON.parse(
  await readFile(new URL('../../public/data/product-journal.json', import.meta.url), 'utf8'),
);
const historical = {
  ...archive,
  latestDate: '2026-10-21',
  entries: archive.entries.filter((e) => e.date <= '2026-10-21'),
};
const options = {
  date: '2026-10-21',
  head,
  after: '2026-10-20T14:01:21.000Z',
  cutoff: '2026-10-21T14:01:36.000Z',
  notes,
};
const actual = (opts) => buildBrief(collectGitEvidence({ cwd, ...opts }), opts);
const prose = (brief) => brief.sections.flatMap((s) => s.paragraphs ?? []).join(' ');

test('October 20 actual Git window stays sparse, with no recycled status accomplishments', () => {
  const brief = actual({
    ...options,
    date: '2026-10-20',
    after: '2026-10-19T16:07:05.000Z',
    cutoff: '2026-10-20T14:01:21.000Z',
  });
  assert.equal(brief.sections[0].paragraphs.length, 1);
  assert.match(prose(brief), /No material product implementation change/);
  assert.doesNotMatch(prose(brief), /Bedlam|perspective|borders|reconciled|Buildometer/);
});

test('October 21 actual Git window reports evaluator and sprite, excluding afternoon telemetry', () => {
  const brief = actual(options);
  assert.equal(brief.sections[0].paragraphs.length, 2);
  assert.match(prose(brief), /unfinished Text\/URL\/File evaluator/);
  assert.match(prose(brief), /SVG sprite/);
  assert.doesNotMatch(prose(brief), /Buildometer|deployment.grid|reconciled|travelling light/);
  assert(
    !brief.provenance.evidence.some((e) => e.commit === '30f6001f3f67fa27dcfeb1e7ff1ddb055c1d7653'),
  );
  assert.deepEqual(brief.provenance.reportingWindow, {
    after: options.after,
    cutoff: options.cutoff,
  });
});

test('window is exclusive at the start, inclusive at cutoff; future evidence/notes cannot change content or evidence digest', () => {
  const event = (digit, occurredAt) => ({
    commit: digit.repeat(40),
    occurredAt,
    paths: ['src/app/components/home/home.html'],
  });
  const events = [
    event('a', options.after),
    event('b', options.cutoff),
    event('c', '2026-10-21T18:00:00Z'),
  ];
  const dated = {
    schemaVersion: 2,
    changes: [
      { commit: 'a'.repeat(40), summary: 'Old work.' },
      { commit: 'b'.repeat(40), summary: 'In-window work.' },
      { commit: 'c'.repeat(40), summary: 'Later work.' },
    ],
  };
  const brief = buildBrief(events, { ...options, notes: dated });
  assert.equal(prose(brief), 'In-window work.');
  assert.deepEqual(
    brief.provenance.evidence.map((e) => e.commit),
    ['b'.repeat(40)],
  );
  const withoutFuture = buildBrief(events.slice(0, 2), {
    ...options,
    notes: { ...dated, changes: dated.changes.slice(0, 2) },
  });
  assert.deepEqual(brief, withoutFuture);
});

test('unannotated real changes roll up by public area, not a commit-message list; incidental publication does not create activity', () => {
  const event = (digit, paths) => ({ commit: digit.repeat(40), occurredAt: options.cutoff, paths });
  const brief = buildBrief(
    [
      event('a', ['src/app/components/home/home.html', 'AI_HANDOFF.md']),
      event('b', ['src/app/components/home/home.scss']),
      event('c', [
        'public/data/product-journal.json',
        'src/app/components/daily-scrum-brief/brief.generated.ts',
      ]),
      event('d', ['src/app/components/home/home.spec.ts']),
    ],
    { ...options, notes: { schemaVersion: 2, changes: [] } },
  );
  assert.equal(brief.sections[0].paragraphs.length, 1);
  assert.match(prose(brief), /homepage composition changed/);
});

test('old reusable-status schema, malformed evidence and invalid reporting windows fail closed', () => {
  assert.throws(() =>
    buildBrief([], { ...options, notes: { schemaVersion: 1, recentlyShipped: ['Old fact.'] } }),
  );
  for (const overrides of [
    { date: '2026-02-30' },
    { after: options.cutoff },
    { head: 'not-a-sha' },
    { cutoff: '2026-10-22T14:00:00Z' },
  ])
    assert.throws(() => buildBrief([], { ...options, ...overrides }));
  assert.throws(() =>
    buildBrief([{ commit: 'bad', occurredAt: options.cutoff, paths: [] }], options),
  );
  assert.throws(() =>
    buildBrief([], {
      ...options,
      notes: { schemaVersion: 2, changes: [{ commit: head, summary: '<unsafe>' }] },
    }),
  );
});

test('reconstructed October 18 cannot replace the last successful publication cutoff', () => {
  const prior = previousPublication(
    {
      entries: historical.entries.map((e) =>
        e.date === '2026-10-18' ? { ...e, cutoff: '2026-10-18T14:00:00Z' } : e,
      ),
    },
    '2026-10-19',
  );
  assert.equal(prior.date, '2026-10-17');
});

test('corrected archive has one entry per supplied day and one correction note; October 18 is explicit', () => {
  assert.equal(historical.entries.length, 20);
  assert.equal(new Set(historical.entries.map((e) => e.date)).size, 20);
  assert.equal(historical.entries.at(-1).date, '2026-10-02');
  assert.match(historical.correctionNote, /reusable project-status metadata/);
  const reconstructed = historical.entries.find((e) => e.date === '2026-10-18');
  assert.equal(reconstructed.reconstructed, true);
  assert.match(prose(reconstructed.brief), /RECONSTRUCTED/);
});

async function withPublication(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'scrum-window-'));
  const journalPath = join(dir, 'journal.json'),
    path = join(dir, 'brief.ts');
  try {
    await writeFile(journalPath, JSON.stringify(historical, null, 2) + '\n');
    await writeFile(path, 'last valid snapshot');
    await fn({ journalPath, path });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Synthetic Jira transport fixture; never stored as a real journal entry.
const payload = {
  author: 'ChatGPT',
  date: '2026-10-22',
  sections: [
    {
      heading: 'Recently shipped',
      paragraphs: ['Exact authored wording: a tested outcome, not a generated digest.'],
    },
    { heading: 'Next', items: ["Keep the author's words unchanged."] },
  ],
};
const jiraComment = (id = '12345', data = payload) => ({
  id,
  created: '2026-10-22T13:00:00.000Z',
  updated: '2026-10-22T13:00:00.000Z',
  body: {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'heading',
        content: [{ type: 'text', text: 'Daily Executive Scrum Brief - 2026-10-22' }],
      },
      {
        type: 'codeBlock',
        attrs: { language: 'json' },
        content: [{ type: 'text', text: JSON.stringify(data) }],
      },
    ],
  },
});
const jira = (comments = [jiraComment()]) => ({
  config: { JIRA_EMAIL: 'fixture@example.test', JIRA_API_TOKEN: 'test-only' },
  fetcher: async (url) => {
    assert.equal(new URL(url).pathname, '/rest/api/3/issue/SCRUM-57/comment');
    return Response.json({ comments, total: comments.length });
  },
});

test('Jira-authored publication copies exact sections through existing history/snapshot and freezes same-day retries', async () => {
  await withPublication(async ({ journalPath, path }) => {
    const generated = await generate({
      now: new Date('2026-10-22T14:00:00Z'),
      journalPath,
      path,
      publishedJournal: historical,
      jira: jira(),
    });
    assert.equal(generated.provenance.reportingWindow.after, '2026-10-21T14:01:36.000Z');
    assert.deepEqual(generated.sections, payload.sections);
    assert.match(generated.provenance.sources[0], /SCRUM-57.*12345/);
    const bytes = await readFile(journalPath, 'utf8');
    const next = JSON.parse(bytes);
    assert.deepEqual(next.entries.slice(1), historical.entries);
    assert.equal(next.correctionNote, historical.correctionNote);
    await generate({
      now: new Date('2026-10-22T23:00:00Z'),
      journalPath,
      path,
      publishedJournal: historical,
    });
    assert.equal(await readFile(journalPath, 'utf8'), bytes);
    await assert.rejects(
      savePublication(historical.entries[0].brief, { journalPath, snapshotPath: path }),
    );
    assert.equal(await readFile(journalPath, 'utf8'), bytes);
  });
});

test('missing published evidence leaves the last valid snapshot and journal bytes unchanged', async () => {
  await withPublication(async ({ journalPath, path }) => {
    const before = await readFile(journalPath, 'utf8');
    await assert.rejects(generate({ now: new Date('2026-10-22T14:00:00Z'), journalPath, path }));
    assert.equal(await readFile(journalPath, 'utf8'), before);
    assert.equal(await readFile(path, 'utf8'), 'last valid snapshot');
  });
});

test('same-day retry retains Coach-corrected morning copy rather than ingesting later work', async () => {
  await withPublication(async ({ journalPath, path }) => {
    const before = await readFile(journalPath, 'utf8');
    const brief = await generate({ now: new Date('2026-10-21T23:00:00Z'), journalPath, path });
    assert.deepEqual(brief, historical.entries[0].brief);
    assert.equal(await readFile(journalPath, 'utf8'), before);
  });
});

test('missing, duplicate or incomplete Jira handoffs leave existing journal and snapshot unchanged', async () => {
  for (const comments of [
    [],
    [jiraComment(), jiraComment('12346')],
    [jiraComment('12345', { ...payload, sections: [] })],
  ]) {
    await withPublication(async ({ journalPath, path }) => {
      const before = await readFile(journalPath, 'utf8');
      await assert.rejects(
        generate({
          now: new Date('2026-10-22T14:00:00Z'),
          journalPath,
          path,
          publishedJournal: historical,
          jira: jira(comments),
        }),
        /Missing|Ambiguous|Incomplete/,
      );
      assert.equal(await readFile(journalPath, 'utf8'), before);
      assert.equal(await readFile(path, 'utf8'), 'last valid snapshot');
    });
  }
});

test('Jira reader follows pagination without rewriting and fails on provider/configuration errors', async () => {
  const seen = [];
  const result = await readJiraBrief({
    date: payload.date,
    now: new Date('2026-10-22T14:00:00Z'),
    ...jira(),
    fetcher: async (url) => {
      seen.push(new URL(url).searchParams.get('startAt'));
      return Response.json({
        total: 2,
        comments:
          seen.length === 1
            ? [
                {
                  body: {
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Not a publication payload.' }],
                      },
                    ],
                  },
                },
              ]
            : [jiraComment()],
      });
    },
  });
  assert.deepEqual(seen, ['0', '1']);
  assert.deepEqual(result.sections, payload.sections);
  await assert.rejects(
    readJiraBrief({ date: payload.date, now: new Date('2026-10-22T14:00:00Z'), config: {} }),
    /JIRA_EMAIL/,
  );
  await assert.rejects(
    readJiraBrief({
      date: payload.date,
      now: new Date('2026-10-22T14:00:00Z'),
      ...jira(),
      fetcher: async () => new Response('', { status: 401 }),
    }),
    /HTTP 401/,
  );
});
