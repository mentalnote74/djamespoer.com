// SCRUM-47/216/218: shared by the browser and the Worker, so the URL rules and verdict stay identical.
// Dependency-free on purpose: the Worker imports this file directly.

export const COFFEE_SELF_URL = 'https://djamespoer.com/';
export const COFFEE_URL_MAX = 2048;

export type CoffeeCategory = 'performance' | 'accessibility' | 'bestPractices' | 'seo';
export const COFFEE_CATEGORIES: readonly { id: CoffeeCategory; label: string; psi: string }[] = [
  { id: 'performance', label: 'Performance', psi: 'performance' },
  { id: 'accessibility', label: 'Accessibility', psi: 'accessibility' },
  { id: 'bestPractices', label: 'Best Practices', psi: 'best-practices' },
  { id: 'seo', label: 'SEO', psi: 'seo' },
];

export type CoffeeStrategy = 'mobile' | 'desktop';
export const COFFEE_STRATEGIES: readonly {
  id: CoffeeStrategy;
  label: string;
  caption: string;
}[] = [
  { id: 'mobile', label: 'Mobile', caption: 'Lighthouse, mobile test (simulated slow 4G), just now' },
  { id: 'desktop', label: 'Desktop', caption: 'Lighthouse, desktop test, just now' },
];
/** SCRUM-218: which tests a scan runs. `all` is both, the SCRUM-216 four-score view. */
export type CoffeeTestSet = CoffeeStrategy | 'all';
export function testsFor(set: CoffeeTestSet): CoffeeStrategy[] {
  return set === 'all' ? ['mobile', 'desktop'] : [set];
}
/** Accept only known tests, deduplicated, in display order; empty or invalid means none. */
export function parseTests(input: unknown): CoffeeStrategy[] {
  if (!Array.isArray(input)) return [];
  return COFFEE_STRATEGIES.map((t) => t.id).filter((id) => input.includes(id));
}

/** One Lighthouse run: the four category scores for one site on one test. */
export interface CoffeeTest {
  fetchedAt: string;
  reportUrl: string;
  scores: Record<CoffeeCategory, number>;
}
/** A site's mobile and desktop runs; a failed test is null, never a zero. */
export interface CoffeeSite {
  url: string;
  host: string;
  mobile: CoffeeTest | null;
  desktop: CoffeeTest | null;
}
export type CoffeeErrorType =
  | 'invalid_url'
  | 'unreachable'
  | 'rate_limited'
  | 'timeout'
  | 'psi_down'
  | 'self_failed';
export type CoffeeVerdict = 'visitor_buys' | 'james_buys' | 'tie' | 'no_verdict';
export interface CoffeeResponse {
  mode: 'challenge' | 'solo';
  /** The tests this scan ran. A test absent here was not requested, not failed. */
  tests: CoffeeStrategy[];
  visitor: CoffeeSite | null;
  james: CoffeeSite | null;
  error?: CoffeeErrorType;
}

/** djamespoer.com entered as the visitor's site runs the solo scan instead of a self-match. */
export function isSelfHost(host: string): boolean {
  return host === 'djamespoer.com' || host === 'www.djamespoer.com';
}

export interface CoffeeTally {
  visitor: number;
  james: number;
  tied: number;
  scored: number;
  total: number;
}
/** Head-to-head: same category, same test. Only matchups with both scores count. No averages. */
export function coffeeTally(
  visitor: CoffeeSite | null,
  james: CoffeeSite | null,
  tests: readonly CoffeeStrategy[] = ['mobile', 'desktop'],
): CoffeeTally {
  // Matchups exist only for the tests that ran: 4 for one test, 8 for both.
  const tally = {
    visitor: 0,
    james: 0,
    tied: 0,
    scored: 0,
    total: tests.length * COFFEE_CATEGORIES.length,
  };
  for (const test of tests)
    for (const category of COFFEE_CATEGORIES) {
      const mine = james?.[test]?.scores[category.id];
      const theirs = visitor?.[test]?.scores[category.id];
      if (mine === undefined || theirs === undefined) continue;
      tally.scored++;
      if (mine === theirs) tally.tied++;
      else if (mine > theirs) tally.james++;
      else tally.visitor++;
    }
  return tally;
}

/** Whoever wins fewer matchups buys; equal wins is a tie. */
export function coffeeVerdict(tally: CoffeeTally): CoffeeVerdict {
  if (!tally.scored) return 'no_verdict';
  if (tally.visitor === tally.james) return 'tie';
  return tally.visitor < tally.james ? 'visitor_buys' : 'james_buys';
}

// Names that only resolve on private networks, or are reserved and never resolve publicly.
const PRIVATE_SUFFIXES = [
  'localhost',
  'local',
  'internal',
  'intranet',
  'lan',
  'home',
  'corp',
  'private',
  'test',
  'example',
  'invalid',
  'onion',
  'arpa',
  'localdomain',
  'home.arpa',
];
const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

export type SiteUrlResult = { ok: true; url: string; host: string } | { ok: false };

/** Normalize a visitor's address, or reject it. Hostname names only: never IPs, ports or logins. */
export function normalizeSiteUrl(input: unknown): SiteUrlResult {
  if (typeof input !== 'string') return { ok: false };
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > COFFEE_URL_MAX || /\s/.test(trimmed)) return { ok: false };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : 'https://' + trimmed;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false };
  if (url.username || url.password || url.port) return { ok: false };
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  // IPv6 literals keep brackets; WHATWG URL turns every IPv4 spelling into dotted decimal.
  if (host.startsWith('[') || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return { ok: false };
  const labels = host.split('.');
  if (labels.length < 2 || host.length > 253 || !labels.every((label) => LABEL.test(label)))
    return { ok: false };
  const tld = labels.at(-1)!;
  if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/.test(tld)) return { ok: false };
  if (PRIVATE_SUFFIXES.some((suffix) => host === suffix || host.endsWith('.' + suffix)))
    return { ok: false };
  url.hash = '';
  url.hostname = host;
  const href = url.href;
  if (href.length > COFFEE_URL_MAX) return { ok: false };
  return { ok: true, url: href, host };
}

export type ScoreBand = 'Poor' | 'Needs work' | 'Good';
export function scoreBand(score: number): ScoreBand {
  return score >= 90 ? 'Good' : score >= 50 ? 'Needs work' : 'Poor';
}

/**
 * SCRUM-218 v2: pick the first test from the visitor's connection, not their device.
 * Reads the Network Information API shape. Returns null when the browser doesn't say
 * (Safari, Firefox, every iPhone), so the caller asks instead of guessing.
 */
export function connectionTest(connection: unknown): CoffeeStrategy | null {
  if (!connection || typeof connection !== 'object') return null;
  const c = connection as { type?: unknown; effectiveType?: unknown; saveData?: unknown };
  if (c.saveData === true) return 'mobile';
  if (c.type === 'cellular') return 'mobile';
  if (c.type === 'wifi' || c.type === 'ethernet') return 'desktop';
  if (c.effectiveType === 'slow-2g' || c.effectiveType === '2g' || c.effectiveType === '3g')
    return 'mobile';
  if (c.effectiveType === '4g') return 'desktop';
  return null;
}

/** SCRUM-220: the exact tested URL, as shown and as sent to GA: host, path and query, no scheme. */
export function displayUrl(url: string): string {
  const u = new URL(url);
  return u.host + (u.pathname === '/' ? '' : u.pathname) + u.search;
}
