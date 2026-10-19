import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchScrumBrief } from './scrum-dispatch.ts';
import worker from './worker.ts';
const now = Date.parse('2026-10-19T15:00:00Z');
class Bucket {
  value = null;
  version = 0;
  async get() {
    return this.value === null
      ? null
      : { etag: String(this.version), json: async () => JSON.parse(this.value) };
  }
  async put(key, value, { onlyIf }) {
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
const env = (dates = []) => ({
  DAILY_REPORTS: new Bucket(),
  SCRUM_BRIEF_GITHUB_TOKEN: 'fictional-token',
  REPORT_GENERATION_TOKEN: 'fictional-owner',
  ASSETS: { fetch: async () => Response.json({ entries: dates.map((date) => ({ date })) }) },
});
test('published date and missing credential never dispatch', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return new Response(null, { status: 204 });
  };
  assert.equal(
    (await dispatchScrumBrief(env(['2026-10-19']), { now, fetcher })).status,
    'already-published',
  );
  const e = env();
  delete e.SCRUM_BRIEF_GITHUB_TOKEN;
  await assert.rejects(dispatchScrumBrief(e, { now, fetcher }), /missing/);
  assert.equal(calls, 0);
  assert.equal(e.DAILY_REPORTS.value, null);
});
test('production contract targets only the existing main workflow and stores its actual run receipt once', async () => {
  const e = env();
  let calls = 0;
  const fetcher = async (url, options) => {
    calls++;
    assert.match(url, /daily-scrum-brief.yml\/dispatches$/);
    assert.deepEqual(JSON.parse(options.body), { ref: 'main' });
    assert.equal(options.redirect, 'manual');
    return Response.json({
      workflow_run_id: 123,
      html_url: 'https://github.com/mentalnote74/djamespoer.com/actions/runs/123',
    });
  };
  const result = await dispatchScrumBrief(e, { now, fetcher });
  assert.equal(result.status, 'dispatched');
  assert.equal(result.httpStatus, 200);
  assert.equal(result.runId, 123);
  assert.equal((await dispatchScrumBrief(e, { now, fetcher })).status, 'already-dispatched');
  assert.equal(calls, 1);
  assert.doesNotMatch(e.DAILY_REPORTS.value, /fictional-token/);
});
test('concurrent calls send at most one workflow request and legacy 204 is accepted', async () => {
  const e = env();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return new Response(null, { status: 204 });
  };
  const results = await Promise.all([
    dispatchScrumBrief(e, { now, fetcher }),
    dispatchScrumBrief(e, { now, fetcher }),
  ]);
  assert.equal(calls, 1);
  assert.ok(results.some((r) => r.status === 'dispatched'));
});
test('a concrete GitHub rejection can retry after configuration repair; an uncertain request cannot duplicate', async () => {
  const e = env();
  await assert.rejects(
    dispatchScrumBrief(e, { now, fetcher: async () => new Response('', { status: 403 }) }),
    /HTTP 403/,
  );
  assert.equal(JSON.parse(e.DAILY_REPORTS.value).state, 'rejected');
  assert.equal(
    (await dispatchScrumBrief(e, { now, fetcher: async () => new Response(null, { status: 204 }) }))
      .status,
    'dispatched',
  );
  const uncertain = env();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    throw Error('network');
  };
  await assert.rejects(dispatchScrumBrief(uncertain, { now, fetcher }), /uncertain/);
  await assert.rejects(dispatchScrumBrief(uncertain, { now, fetcher }), /inspection/);
  assert.equal(calls, 1);
});
test('run-now endpoint requires existing owner secret and refuses branch/date parameters', async () => {
  const e = env();
  assert.equal(
    (
      await worker.fetch(
        new Request('https://djamespoer.com/api/buildometer/reports/dispatch-brief', {
          method: 'POST',
        }),
        e,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request('https://djamespoer.com/api/buildometer/reports/dispatch-brief?ref=evil', {
          method: 'POST',
          headers: { Authorization: 'Bearer fictional-owner' },
        }),
        e,
      )
    ).status,
    400,
  );
});

test('an empty POST stream reaches the credential check rather than failing parameter validation', async () => {
  const e = env();
  delete e.SCRUM_BRIEF_GITHUB_TOKEN;
  const response = await worker.fetch(
    new Request('https://djamespoer.com/api/buildometer/reports/dispatch-brief', {
      method: 'POST',
      body: '',
      headers: { Authorization: 'Bearer fictional-owner' },
    }),
    e,
  );
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /SCRUM_BRIEF_GITHUB_TOKEN missing/);
});
