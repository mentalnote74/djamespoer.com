import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  generateDailyReport,
  readReports,
  applyDailyHistory,
  reportDue,
  easternDate,
} from './daily-report.ts';
import { emptyData } from './derive.ts';
import { applyProject } from './project.ts';
import worker from './worker.ts';
const project = JSON.parse(
  await readFile(new URL('../../public/data/buildometer-project.json', import.meta.url)),
);
const first = Date.parse('2026-10-19T01:20:00Z');
class Bucket {
  value = null;
  version = 0;
  fail = false;
  async get() {
    const value = this.value,
      etag = String(this.version);
    return value === null ? null : { etag, json: async () => JSON.parse(value) };
  }
  async put(key, value, { onlyIf }) {
    if (this.fail) throw Error('write failure');
    if (
      (onlyIf.etagDoesNotMatch && this.value !== null) ||
      (onlyIf.etagMatches && onlyIf.etagMatches !== String(this.version))
    )
      return null;
    this.value = value;
    this.version++;
    return { etag: String(this.version) };
  }
}
const env = () => ({
  DAILY_REPORTS: new Bucket(),
  REPORT_GENERATION_TOKEN: 'fictional-test-token',
  CF_VERSION_METADATA: { id: 'test-version', timestamp: '2026-10-19T00:00:00Z' },
  ASSETS: {
    fetch: async (req) => {
      const path = new URL(req.url).pathname;
      if (path.endsWith('buildometer-project.json')) return Response.json(project);
      if (path.endsWith('buildometer-release.json'))
        return Response.json({ schemaVersion: 1, sha: 'a'.repeat(40) });
      if (path.endsWith('deployment-history.json'))
        return Response.json({ checkedAt: '2026-10-18T12:00:00Z' });
      return new Response('missing', { status: 404 });
    },
  },
});
const unavailable = {
  now: () => first,
  acquire: async () => {
    throw Error('unavailable');
  },
  deployments: async () => {
    throw Error('unavailable');
  },
};
test('production-model report preserves approved T0 and unavailable providers, without raw Jira payloads', async () => {
  const e = env(),
    { report } = await generateDailyReport(e, unavailable);
  assert.equal(report.date, '2026-10-18');
  assert.equal(report.project.total, 395);
  assert.equal(report.project.shipped, 152);
  assert.equal(report.project.remaining, 243);
  assert.equal(report.project.completion, 38.5);
  assert.equal(report.scopeChange.net, 0);
  assert.equal(report.jira.completed, null);
  assert.equal(report.jira.openBugLabelled, null);
  assert.equal(report.deployments.count, null);
  assert.equal(report.deployments.status, 'stale');
  assert.equal(report.windowStart, project.t0);
  assert.equal(JSON.stringify(report).includes('SCRUM-'), false);
});
test('same date and concurrent retry retain exactly one immutable record without repeating providers', async () => {
  const e = env();
  await Promise.all([generateDailyReport(e, unavailable), generateDailyReport(e, unavailable)]);
  const before = e.DAILY_REPORTS.value;
  const result = await generateDailyReport(e, {
    ...unavailable,
    acquire: async () => {
      throw Error('must not be called');
    },
  });
  assert.equal(result.existing, true);
  assert.equal((await readReports(e)).reports.length, 1);
  assert.equal(e.DAILY_REPORTS.value, before);
});
test('next real observation is linked, prior record survives write failure and later retry', async () => {
  const e = env();
  await generateDailyReport(e, unavailable);
  const before = e.DAILY_REPORTS.value;
  e.DAILY_REPORTS.fail = true;
  await assert.rejects(
    generateDailyReport(e, { ...unavailable, now: () => Date.parse('2026-10-19T14:00:00Z') }),
  );
  assert.equal(e.DAILY_REPORTS.value, before);
  e.DAILY_REPORTS.fail = false;
  await generateDailyReport(e, { ...unavailable, now: () => Date.parse('2026-10-19T14:00:00Z') });
  const archive = await readReports(e);
  assert.equal(archive.reports.length, 2);
  assert.deepEqual(archive.reports[0], JSON.parse(before).reports[0]);
  assert.equal(archive.reports[1].previousId, archive.reports[0].id);
  assert.equal(archive.reports[1].scopeChange.net, 0);
  const d = emptyData(new Date(first).toISOString());
  applyProject(d, project);
  applyDailyHistory(d, archive);
  assert.equal(d.series.burndown.length, 3);
  assert.equal(d.metrics.velocity.value, null);
});
test('existing completion replay counts explicit window; deployments use same boundary semantics', async () => {
  const e = env(),
    cutoff = new Date(first).toISOString();
  const i = {
    key: 'SCRUM-53',
    type: 'Story',
    subtask: false,
    status: 'done',
    category: 'done',
    created: '2026-10-18T00:00:00Z',
    updated: cutoff,
    resolved: null,
    resolution: null,
    parent: null,
    labels: ['bug'],
    components: [],
    points: 8,
    originalSeconds: null,
    remainingSeconds: null,
    sprintIds: [],
    historyComplete: true,
    history: [
      {
        at: cutoff,
        changes: [
          { field: 'status', from: 'open', to: 'done', fromString: 'To Do', toString: 'Done' },
        ],
      },
    ],
  };
  const facts = {
    fetchedAt: cutoff,
    issues: [i],
    statuses: { open: 'new', done: 'done' },
    fields: { points: 'points', sprint: null },
    sprints: [],
  };
  const r = (
    await generateDailyReport(e, {
      now: () => first,
      acquire: async () => facts,
      deployments: async () => [{ createdAt: project.t0 }, { createdAt: cutoff }],
    })
  ).report;
  assert.equal(r.jira.completed, 1);
  assert.equal(r.jira.openBugLabelled, 0);
  assert.equal(r.deployments.count, 1);
  assert.equal(r.project.shipped, 152);
});
test('scheduler handles Eastern DST and authenticated endpoint denies public generation', async () => {
  assert.equal(reportDue(Date.parse('2026-10-19T13:00:00Z')), false);
  assert.equal(reportDue(Date.parse('2026-10-19T14:00:00Z')), true);
  assert.equal(reportDue(Date.parse('2026-12-19T14:00:00Z')), false);
  assert.equal(reportDue(Date.parse('2026-12-19T15:00:00Z')), true);
  assert.equal(easternDate(first), '2026-10-18');
  const e = env(),
    r = await worker.fetch(
      new Request('https://example.com/api/buildometer/reports/generate', { method: 'POST' }),
      e,
    );
  assert.equal(r.status, 401);
  assert.equal(e.DAILY_REPORTS.value, null);
});
