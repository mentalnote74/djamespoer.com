// [Larry] SCRUM-215: same-origin transport to the controlled Node/Chrome service.
export interface CoffeeJobEnv {
  COFFEE_RUNNER_URL?: string;
  COFFEE_RUNNER_KEY?: string;
  COFFEE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}
export async function handleCoffeeJob(
  request: Request,
  env: CoffeeJobEnv,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const u = new URL(request.url);
  const create = u.pathname === '/api/coffee';
  const job = /^\/api\/coffee\/jobs\/[0-9a-f-]{36}$/.test(u.pathname);
  const json = (error: string, status: number) =>
    Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!create && !job) return json('invalid_url', 404);
  if (create ? request.method !== 'POST' : !['GET', 'DELETE'].includes(request.method))
    return json('invalid_url', 405);
  if (request.method !== 'GET' && request.headers.get('Origin') !== u.origin)
    return json('invalid_url', 403);
  if (!env.COFFEE_RUNNER_URL || !env.COFFEE_RUNNER_KEY) return json('runner_unavailable', 503);
  if (
    create &&
    env.COFFEE_LIMITER &&
    !(
      await env.COFFEE_LIMITER.limit({
        key: 'coffee:' + (request.headers.get('CF-Connecting-IP') ?? 'unknown'),
      })
    ).success
  )
    return json('rate_limited', 429);
  let base: URL;
  try {
    base = new URL(env.COFFEE_RUNNER_URL);
    if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/')
      throw Error();
  } catch {
    return json('runner_unavailable', 503);
  }
  let body: string | undefined;
  if (create) {
    body = await request.text();
    if (body.length > 4096 || !request.headers.get('Content-Type')?.startsWith('application/json'))
      return json('invalid_url', 400);
  }
  try {
    const response = await fetcher(new URL(u.pathname, base), {
      method: request.method,
      headers: {
        Authorization: 'Bearer ' + env.COFFEE_RUNNER_KEY,
        'Content-Type': 'application/json',
      },
      ...(body ? { body } : {}),
      signal: request.signal,
      redirect: 'error',
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return json('runner_unavailable', 503);
  }
}
