import { easternDate, type ReportEnv } from './daily-report.ts';
export interface ScrumDispatchEnv extends ReportEnv {
  SCRUM_BRIEF_GITHUB_TOKEN?: string;
}
interface Receipt {
  date: string;
  state: 'dispatching' | 'accepted' | 'rejected' | 'uncertain';
  attemptedAt: string;
  httpStatus?: number;
  runId?: number;
  runUrl?: string;
}
const workflow =
  'https://api.github.com/repos/mentalnote74/djamespoer.com/actions/workflows/daily-scrum-brief.yml/dispatches';
/** Shared Cron/run-now bridge. Caller cannot select date, repository, branch or workflow. */
export async function dispatchScrumBrief(
  env: ScrumDispatchEnv,
  options: {
    now?: number;
    fetcher?: typeof fetch;
  } = {},
) {
  const now = options.now ?? Date.now();
  const date = easternDate(now);
  const journal = await env.ASSETS.fetch(
    new Request('https://djamespoer.com/data/product-journal.json'),
  );
  if (!journal.ok) throw Error('Scrum dispatch blocked: published journal unavailable');
  const content = (await journal.json()) as { entries?: { date: string }[] };
  if (!Array.isArray(content.entries)) throw Error('Scrum dispatch blocked: invalid journal');
  if (content.entries.some((e) => e.date === date))
    return { date, status: 'already-published' as const };
  if (!env.SCRUM_BRIEF_GITHUB_TOKEN)
    throw Error('Scrum dispatch blocked: SCRUM_BRIEF_GITHUB_TOKEN missing');
  const bucket = env.DAILY_REPORTS;
  if (!bucket) throw Error('Scrum dispatch blocked: durable receipt storage unavailable');
  const key = `scrum-brief-dispatch/${date}.json`;
  const prior = await bucket.get(key);
  const receipt = prior ? ((await prior.json()) as Receipt) : null;
  if (
    receipt &&
    (receipt.date !== date ||
      !['dispatching', 'accepted', 'rejected', 'uncertain'].includes(receipt.state))
  )
    throw Error('Scrum dispatch blocked: invalid receipt');
  if (receipt?.state === 'accepted') return { ...receipt, status: 'already-dispatched' as const };
  if (receipt && receipt.state !== 'rejected')
    throw Error('Scrum dispatch requires inspection: prior attempt in flight or outcome uncertain');
  const pending: Receipt = { date, state: 'dispatching', attemptedAt: new Date(now).toISOString() };
  const stored = await bucket.put(key, JSON.stringify(pending), {
    onlyIf: prior ? { etagMatches: prior.etag } : { etagDoesNotMatch: '*' },
    httpMetadata: { contentType: 'application/json' },
  });
  if (!stored) return { date, status: 'dispatch-in-flight' as const };
  const write = async (value: Receipt) => {
    const lock = await bucket.get(key);
    if (!lock) throw Error('Scrum dispatch receipt missing');
    const saved = await bucket.put(key, JSON.stringify(value), {
      onlyIf: { etagMatches: lock.etag },
      httpMetadata: { contentType: 'application/json' },
    });
    if (!saved) throw Error('Scrum dispatch receipt conflict');
  };
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(workflow, {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: 'Bearer ' + env.SCRUM_BRIEF_GITHUB_TOKEN,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'djamespoer-daily-scrum',
        'X-GitHub-Api-Version': '2026-03-10',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    });
  } catch {
    await write({ ...pending, state: 'uncertain' });
    throw Error('Scrum dispatch outcome uncertain; inspect GitHub runs before retrying');
  }
  if (![200, 204].includes(response.status)) {
    await write({ ...pending, state: 'rejected', httpStatus: response.status });
    throw Error('GitHub rejected Scrum dispatch: HTTP ' + response.status);
  }
  const accepted: Receipt = { ...pending, state: 'accepted', httpStatus: response.status };
  if (response.status === 200) {
    try {
      const run = (await response.json()) as { workflow_run_id?: unknown; html_url?: unknown };
      if (typeof run.workflow_run_id === 'number') accepted.runId = run.workflow_run_id;
      if (
        typeof run.html_url === 'string' &&
        /^https:\/\/github\.com\/mentalnote74\/djamespoer\.com\/actions\/runs\/\d+$/.test(
          run.html_url,
        )
      )
        accepted.runUrl = run.html_url;
    } catch {
      /* Acceptance is known; never repeat it because response metadata is absent. */
    }
  }
  await write(accepted);
  return { ...accepted, status: 'dispatched' as const };
}
