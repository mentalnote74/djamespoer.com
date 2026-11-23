// SCRUM-47 Lighthouse coffee challenge: a narrow proxy to Google PageSpeed Insights.
// Google fetches the visitor's site; this Worker never does, so it is not an SSRF primitive.
import {
  COFFEE_CATEGORIES,
  COFFEE_SELF_URL,
  coffeeOverall,
  normalizeSiteUrl,
  type CoffeeCategory,
  type CoffeeErrorType,
  type CoffeeResponse,
  type CoffeeSiteScore,
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
const STATUS: Record<CoffeeErrorType, number> = {
  invalid_url: 400,
  unreachable: 422,
  rate_limited: 429,
  timeout: 504,
  psi_down: 503,
  self_failed: 200,
};

class CoffeeError extends Error {
  readonly type: Exclude<CoffeeErrorType, 'self_failed' | 'invalid_url'>;
  constructor(type: CoffeeError['type']) {
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
function failure(type: CoffeeErrorType): Response {
  return reply({ visitor: null, james: null, error: type }, STATUS[type]);
}

/** Keep only the four scores and identifying metadata from a PSI result. */
export function parsePsi(body: unknown, requested: string): CoffeeSiteScore {
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
  const final = normalizeSiteUrl(result['finalDisplayedUrl'] ?? result['finalUrl']);
  const url = final.ok ? final.url : requested;
  const fetchedAt =
    typeof result['fetchTime'] === 'string' && !Number.isNaN(Date.parse(result['fetchTime']))
      ? new Date(result['fetchTime']).toISOString()
      : new Date().toISOString();
  return {
    url,
    host: new URL(url).hostname,
    fetchedAt,
    reportUrl:
      'https://pagespeed.web.dev/analysis?url=' + encodeURIComponent(requested) + '&form_factor=mobile',
    scores,
    overall: coffeeOverall(scores),
  };
}

async function runPsi(url: string, env: CoffeeEnv, deps: CoffeeDeps): Promise<CoffeeSiteScore> {
  const query = new URLSearchParams({ url, strategy: 'mobile' });
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
  return parsePsi(await response.json().catch(() => null), url);
}

/** Serve one site's score from the edge cache, or run PSI and keep the result. */
async function score(
  url: string,
  ttl: number,
  env: CoffeeEnv,
  deps: CoffeeDeps,
): Promise<CoffeeSiteScore> {
  const key = new Request('https://coffee-cache.djamespoer.com/v1?u=' + encodeURIComponent(url));
  const hit = await deps.cache?.match(key).catch(() => undefined);
  if (hit) {
    try {
      return (await hit.json()) as CoffeeSiteScore;
    } catch {
      /* A damaged entry is replaced by a fresh run. */
    }
  }
  const fresh = await runPsi(url, env, deps);
  await deps.cache
    ?.put(
      key,
      Response.json(fresh, { headers: { 'Cache-Control': 'public, max-age=' + ttl } }),
    )
    .catch(() => {});
  return fresh;
}

export async function handleCoffee(
  request: Request,
  env: CoffeeEnv,
  deps: CoffeeDeps = {
    fetch: (input, init) => fetch(input, init),
    cache: typeof caches === 'undefined' ? null : (caches as unknown as { default: Cache }).default,
    timeoutMs: 75000,
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
  let input: unknown;
  try {
    input = (JSON.parse(raw) as { url?: unknown } | null)?.url;
  } catch {
    return failure('invalid_url');
  }
  const site = normalizeSiteUrl(input);
  if (!site.ok) return failure('invalid_url');
  if (env.COFFEE_LIMITER) {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { success } = await env.COFFEE_LIMITER.limit({ key: 'coffee:' + ip }).catch(() => ({
      success: true,
    }));
    if (!success) return failure('rate_limited');
  }
  const [visitor, james] = await Promise.allSettled([
    score(site.url, VISITOR_TTL, env, deps),
    score(COFFEE_SELF_URL, SELF_TTL, env, deps),
  ]);
  if (visitor.status === 'rejected')
    return failure(visitor.reason instanceof CoffeeError ? visitor.reason.type : 'psi_down');
  if (james.status === 'rejected') return reply({ visitor: visitor.value, james: null, error: 'self_failed' });
  return reply({ visitor: visitor.value, james: james.value });
}
