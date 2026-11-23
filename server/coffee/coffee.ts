// SCRUM-47/216/218 Lighthouse coffee challenge: a narrow proxy to Google PageSpeed Insights.
// Google fetches the visitor's site; this Worker never does, so it is not an SSRF primitive.
import {
  COFFEE_CATEGORIES,
  COFFEE_SELF_URL,
  isSelfHost,
  normalizeSiteUrl,
  parseTests,
  type CoffeeCategory,
  type CoffeeErrorType,
  type CoffeeResponse,
  type CoffeeSite,
  type CoffeeStrategy,
  type CoffeeTest,
} from '../../src/app/features/coffee/coffee-contract.ts';

export interface CoffeeEnv {
  /** Worker secret, set by James with `npx wrangler secret put PAGESPEED_API_KEY`. */
  PAGESPEED_API_KEY?: string;
  /** Cloudflare Rate Limiting binding; absent in local tooling. */
  COFFEE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}
export interface CoffeeDeps {
  fetch: typeof fetch;
  cache: Pick<Cache, 'match' | 'put'> | null;
  timeoutMs: number;
}

const PSI = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const VISITOR_TTL = 1800;
const SELF_TTL = 600;
type ScanError = Exclude<CoffeeErrorType, 'self_failed' | 'invalid_url' | 'rate_limited'>;
const STATUS: Record<CoffeeErrorType, number> = {
  invalid_url: 400,
  unreachable: 422,
  rate_limited: 429,
  timeout: 504,
  psi_down: 503,
  self_failed: 200,
};

class CoffeeError extends Error {
  readonly type: ScanError;
  constructor(type: ScanError) {
    super(type);
    this.type = type;
  }
}

function reply(body: CoffeeResponse, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
function failure(
  type: CoffeeErrorType,
  mode: CoffeeResponse['mode'] = 'challenge',
  tests: CoffeeStrategy[] = [],
): Response {
  return reply({ mode, tests, visitor: null, james: null, error: type }, STATUS[type]);
}

function reportUrl(url: string, strategy: CoffeeStrategy): string {
  return (
    'https://pagespeed.web.dev/analysis?url=' + encodeURIComponent(url) + '&form_factor=' + strategy
  );
}

/** Keep only the four category scores and when they were measured. */
export function parsePsi(body: unknown, requested: string, strategy: CoffeeStrategy): CoffeeTest {
  const result = (body as { lighthouseResult?: Record<string, unknown> } | null)?.lighthouseResult;
  if (!result) throw new CoffeeError('psi_down');
  if ((result['runtimeError'] as { code?: string } | undefined)?.code)
    throw new CoffeeError('unreachable');
  const categories = (result['categories'] ?? {}) as Record<string, { score?: unknown }>;
  const scores = {} as Record<CoffeeCategory, number>;
  for (const category of COFFEE_CATEGORIES) {
    const score = categories[category.psi]?.score;
    // A null category score means Lighthouse could not audit the page.
    if (typeof score !== 'number' || !Number.isFinite(score)) throw new CoffeeError('unreachable');
    scores[category.id] = Math.max(0, Math.min(100, Math.round(score * 100)));
  }
  const fetchedAt =
    typeof result['fetchTime'] === 'string' && !Number.isNaN(Date.parse(result['fetchTime']))
      ? new Date(result['fetchTime']).toISOString()
      : new Date().toISOString();
  return { fetchedAt, reportUrl: reportUrl(requested, strategy), scores };
}

async function runPsi(
  url: string,
  strategy: CoffeeStrategy,
  env: CoffeeEnv,
  deps: CoffeeDeps,
): Promise<CoffeeTest> {
  const query = new URLSearchParams({ url, strategy });
  for (const category of COFFEE_CATEGORIES) query.append('category', category.psi);
  if (env.PAGESPEED_API_KEY) query.set('key', env.PAGESPEED_API_KEY);
  let response: Response;
  try {
    response = await deps.fetch(PSI + '?' + query, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(deps.timeoutMs),
    });
  } catch (error) {
    throw new CoffeeError(
      error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'psi_down',
    );
  }
  if (!response.ok) {
    // PSI reports a page Lighthouse could not load as a 400 or 500 whose message names the
    // Lighthouse error. Quota exhaustion (429) and other provider errors mean PSI is unavailable.
    const message = String(
      ((await response.json().catch(() => null)) as { error?: { message?: unknown } } | null)
        ?.error?.message ?? '',
    );
    const lighthouse =
      /Lighthouse returned error|DOCUMENT_REQUEST|DNS_FAILURE|NO_FCP|NOT_HTML|INVALID_URL|unable to (?:reliably )?load/i;
    throw new CoffeeError(
      response.status !== 429 && (response.status === 400 || lighthouse.test(message))
        ? 'unreachable'
        : 'psi_down',
    );
  }
  return parsePsi(await response.json().catch(() => null), url, strategy);
}

/** Serve one test from the edge cache, or run PSI and keep the result. The key names the test. */
async function score(
  url: string,
  strategy: CoffeeStrategy,
  ttl: number,
  env: CoffeeEnv,
  deps: CoffeeDeps,
): Promise<CoffeeTest> {
  const key = new Request(
    'https://coffee-cache.djamespoer.com/v2/' + strategy + '?u=' + encodeURIComponent(url),
  );
  const hit = await deps.cache?.match(key).catch(() => undefined);
  if (hit) {
    try {
      return (await hit.json()) as CoffeeTest;
    } catch {
      /* A damaged entry is replaced by a fresh run. */
    }
  }
  const fresh = await runPsi(url, strategy, env, deps);
  await deps.cache
    ?.put(key, Response.json(fresh, { headers: { 'Cache-Control': 'public, max-age=' + ttl } }))
    .catch(() => {});
  return fresh;
}

/** The requested tests in parallel. A failed or unrequested test is null; all failing throws. */
async function scanSite(
  url: string,
  host: string,
  ttl: number,
  tests: CoffeeStrategy[],
  env: CoffeeEnv,
  deps: CoffeeDeps,
): Promise<CoffeeSite> {
  const runs = await Promise.allSettled(tests.map((test) => score(url, test, ttl, env, deps)));
  const result = (test: CoffeeStrategy): CoffeeTest | null => {
    const run = runs[tests.indexOf(test)];
    return run?.status === 'fulfilled' ? run.value : null;
  };
  const mobile = result('mobile');
  const desktop = result('desktop');
  if (!mobile && !desktop) {
    const types = runs.map((run) =>
      run.status === 'rejected' && run.reason instanceof CoffeeError ? run.reason.type : 'psi_down',
    );
    const order: ScanError[] = ['unreachable', 'timeout', 'psi_down'];
    throw new CoffeeError(order.find((type) => types.includes(type)) ?? 'psi_down');
  }
  return { url, host, mobile, desktop };
}

export async function handleCoffee(
  request: Request,
  env: CoffeeEnv,
  deps: CoffeeDeps = {
    fetch: (input, init) => fetch(input, init),
    cache: typeof caches === 'undefined' ? null : (caches as unknown as { default: Cache }).default,
    // SCRUM-218: wait for Google. PSI's own API ceiling is 120 s; this only guards a hung socket.
    timeoutMs: 130000,
  },
): Promise<Response> {
  const origin = new URL(request.url).origin;
  if (request.method !== 'POST')
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  // The proxy spends James's PSI quota, so only this site's own pages may call it.
  if (request.headers.get('Origin') !== origin) return new Response('Forbidden', { status: 403 });
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') ?? ''))
    return new Response('Unsupported media type', { status: 415 });
  const raw = await request.text();
  if (raw.length > 4096) return failure('invalid_url');
  let body: { url?: unknown; mode?: unknown; tests?: unknown } | null;
  try {
    body = JSON.parse(raw) as { url?: unknown; mode?: unknown; tests?: unknown } | null;
  } catch {
    return failure('invalid_url');
  }
  let site: ReturnType<typeof normalizeSiteUrl> | null = null;
  if (body?.mode !== 'solo') {
    site = normalizeSiteUrl(body?.url);
    if (!site.ok) return failure('invalid_url');
  }
  // djamespoer.com against itself is the solo scan, not a self-match.
  const solo = !site || (site.ok && isSelfHost(site.host));
  const mode = solo ? 'solo' : 'challenge';
  // SCRUM-218: the browser asks for its device's test, or both. Older clients get both.
  const requested = parseTests(body?.tests);
  const tests: CoffeeStrategy[] = requested.length ? requested : ['mobile', 'desktop'];
  if (env.COFFEE_LIMITER) {
    // One scan is one unit, however many PSI calls it makes.
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { success } = await env.COFFEE_LIMITER.limit({ key: 'coffee:' + ip }).catch(() => ({
      success: true,
    }));
    if (!success) return failure('rate_limited', mode, tests);
  }
  const self = scanSite(COFFEE_SELF_URL, 'djamespoer.com', SELF_TTL, tests, env, deps);
  if (solo) {
    try {
      return reply({ mode, tests, visitor: null, james: await self });
    } catch (error) {
      return failure(error instanceof CoffeeError ? error.type : 'psi_down', mode, tests);
    }
  }
  const target = site as { ok: true; url: string; host: string };
  const [visitor, james] = await Promise.allSettled([
    scanSite(target.url, target.host, VISITOR_TTL, tests, env, deps),
    self,
  ]);
  if (visitor.status === 'rejected')
    return failure(
      visitor.reason instanceof CoffeeError ? visitor.reason.type : 'psi_down',
      mode,
      tests,
    );
  if (james.status === 'rejected')
    return reply({ mode, tests, visitor: visitor.value, james: null, error: 'self_failed' });
  return reply({ mode, tests, visitor: visitor.value, james: james.value });
}
