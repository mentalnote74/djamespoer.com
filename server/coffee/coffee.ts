// [Larry] SCRUM-215: direct Lighthouse on the existing Cloudflare browser service. No PSI.
import type { ReportBucket } from '../buildometer/daily-report';
import { browserScript } from './browser-script';
import {
  normalizeSiteUrl,
  isSelfHost,
  parseTests,
  matchingCoffeeTests,
  type CoffeeResponse,
} from '../../src/app/features/coffee/coffee-contract';
export interface BrowserBinding {
  limits?(): Promise<{ usedBrowserTimeSeconds: number }>;
  acquire(options: { keepAlive: number }): Promise<{ sessionId: string }>;
  script(
    code: string,
    options: { sessionId: string; library: 'puppeteer'; timeout: number },
  ): Promise<Response>;
  closeSession(id: string): Promise<unknown>;
}
export interface CoffeeEnv {
  DAILY_REPORTS?: ReportBucket;
  BROWSER?: BrowserBinding;
  COFFEE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}
export async function handleCoffee(request: Request, env: CoffeeEnv): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    Response.json(body, {
      status,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  const failure = (error: string, status: number) => json({ error }, status);
  const report = /^\/api\/coffee\/results\/([0-9a-f-]{36})$/.exec(new URL(request.url).pathname);
  if (report) {
    if (request.method !== 'GET') return failure('invalid_url', 405);
    const saved = await env.DAILY_REPORTS?.get('coffee-results/' + report[1] + '.json');
    return saved ? json(await saved.json()) : failure('invalid_url', 404);
  }
  if (request.method !== 'POST') return failure('invalid_url', 405);
  if (request.headers.get('Origin') !== new URL(request.url).origin)
    return failure('invalid_url', 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    return failure('invalid_url', 415);
  const raw = await request.text();
  if (raw.length > 4096) return failure('invalid_url', 413);
  let body: { url?: unknown; mode?: unknown; tests?: unknown; internal?: unknown } | null;
  try {
    body = JSON.parse(raw);
  } catch {
    return failure('invalid_url', 400);
  }
  if (!body || typeof body !== 'object') return failure('invalid_url', 400);
  const parsed = body.mode === 'solo' ? null : normalizeSiteUrl(body.url);
  if (parsed && !parsed.ok) return failure('invalid_url', 400);
  const tests = parseTests(body.tests);
  if (tests.length !== 1) return failure('invalid_url', 400);
  if (!env.BROWSER) return failure('runner_unavailable', 503);
  if (
    env.COFFEE_LIMITER &&
    !(
      await env.COFFEE_LIMITER.limit({
        key: 'coffee:' + (request.headers.get('CF-Connecting-IP') ?? 'unknown'),
      })
    ).success
  )
    return failure('rate_limited', 429);
  // This deployment uses Workers Free: quota failures must reach the manual fallback.
  // Reading capacity does not acquire Chrome or consume browser time.
  if (env.BROWSER.limits) {
    try {
      if ((await env.BROWSER.limits()).usedBrowserTimeSeconds >= 600)
        return failure('browser_quota', 429);
    } catch {
      /* Let the actual acquire report an unavailable capacity service. */
    }
  }
  let id: string | undefined,
    closed = false;
  const close = async () => {
    if (id && !closed) {
      closed = true;
      await env.BROWSER!.closeSession(id).catch(() => {});
    }
  };
  const cancel = () => {
    void close();
  };
  try {
    ({ sessionId: id } = await env.BROWSER.acquire({ keepAlive: 30000 }));
    request.signal.addEventListener('abort', cancel, { once: true });
    if (request.signal.aborted) {
      await close();
      return failure('timeout', 408);
    }
    const response = await env.BROWSER.script(
      browserScript({
        url: parsed?.ok && !isSelfHost(parsed.host) ? parsed.url : null,
        test: tests[0],
        internal: body.internal === true,
      }),
      { sessionId: id!, library: 'puppeteer', timeout: 110000 },
    );
    if (!response.ok) {
      const text = await response.text();
      return failure(
        response.status === 429
          ? /browser time|today|daily/i.test(text)
            ? 'browser_quota'
            : 'rate_limited'
          : response.status === 408
            ? 'timeout'
            : 'runner_unavailable',
        response.status === 429 ? 429 : 503,
      );
    }
    const payload = (await response.json()) as { success?: boolean; result?: CoffeeResponse };
    const result = payload.result;
    if (!result || (!result.visitor && !result.james)) return failure('runner_unavailable', 503);
    result.comparable =
      result.mode === 'solo'
        ? !!result.james
        : !!(
            result.visitor &&
            result.james &&
            matchingCoffeeTests(result.visitor, result.james, tests)
          );
    if (result.mode === 'challenge' && !result.comparable)
      result.error = result.error ?? 'test_mismatch';
    if (env.DAILY_REPORTS) {
      const reportId = crypto.randomUUID();
      for (const side of ['visitor', 'james'] as const)
        for (const test of tests) {
          const run = result[side]?.[test];
          if (run) run.reportUrl = '/api/coffee/results/' + reportId;
        }
      await env.DAILY_REPORTS.put('coffee-results/' + reportId + '.json', JSON.stringify(result), {
        onlyIf: { etagDoesNotMatch: '*' },
        httpMetadata: { contentType: 'application/json' },
      });
    }
    return json(result);
  } catch (error) {
    const detail = error as { status?: number; message?: string };
    return failure(
      detail.status === 429
        ? /browser time|today|daily/i.test(detail.message ?? '')
          ? 'browser_quota'
          : 'rate_limited'
        : 'runner_unavailable',
      detail.status === 429 ? 429 : 503,
    );
  } finally {
    request.signal.removeEventListener('abort', cancel);
    await close();
  }
}
