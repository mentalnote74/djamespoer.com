// SCRUM-47: shared by the browser and the Worker, so the URL rules and verdict stay identical.
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

export interface CoffeeSiteScore {
  url: string;
  host: string;
  fetchedAt: string;
  reportUrl: string;
  scores: Record<CoffeeCategory, number>;
  overall: number;
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
  visitor: CoffeeSiteScore | null;
  james: CoffeeSiteScore | null;
  error?: CoffeeErrorType;
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

/** Overall is the rounded mean of the four Lighthouse categories. */
export function coffeeOverall(scores: Record<CoffeeCategory, number>): number {
  return Math.round(
    COFFEE_CATEGORIES.reduce((sum, category) => sum + scores[category.id], 0) /
      COFFEE_CATEGORIES.length,
  );
}

/** The lower overall score buys. */
export function coffeeVerdict(response: Pick<CoffeeResponse, 'visitor' | 'james'>): CoffeeVerdict {
  const { visitor, james } = response;
  if (!visitor || !james) return 'no_verdict';
  if (visitor.overall === james.overall) return 'tie';
  return visitor.overall < james.overall ? 'visitor_buys' : 'james_buys';
}

export type ScoreBand = 'Poor' | 'Needs work' | 'Good';
export function scoreBand(score: number): ScoreBand {
  return score >= 90 ? 'Good' : score >= 50 ? 'Needs work' : 'Poor';
}
