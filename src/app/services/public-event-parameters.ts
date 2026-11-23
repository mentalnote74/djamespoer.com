import { COOKIE_TRAIL } from '../features/cookie-hunt/cookie-trail';
import { PORTFOLIO_SLIDES } from '../content/portfolio-slides';
import type { EventParameters } from './public-analytics';

const locations = [
  'primary-navigation',
  'hero',
  'home-thingamajob',
  'page-content',
  'footer',
  'carousel',
  'rigby',
  'coffee-drawer',
];
const sources = [
  'navigation',
  'homepage',
  'work',
  'case-study',
  'carousel',
  'hero',
  'page-content',
  'footer',
];
const employers = ['djamespoer', 'exl', 'ips', 'tcc', 'dr'];
const methods = ['text', 'url', 'file'];
const testSets = ['mobile', 'desktop', 'all'];
const testSources = ['connection', 'prompt'];
const rules: Record<keyof EventParameters, Record<string, readonly string[]>> = {
  rigby_encounter: {
    action: ['shown', 'fed', 'dismissed', 'enabled', 'brought_back', 'saved_off'],
  },
  rigby_play: { action: ['play', 'sit', 'shake', 'beg', 'roll', 'meet'] },
  rigby_cookie: { action: ['collected', 'fed'], cookie_id: COOKIE_TRAIL.map((stop) => stop.id) },
  resume_download: {
    asset_name: ['public-current', 'public-comprehensive'],
    resume_id: ['public-current', 'public-comprehensive'],
  },
  contact_click: { contact_method: ['email'] },
  thingamajob_open: { source: sources, destination_path: ['/thingamajob'] },
  case_study_open: { employer: employers, source: sources },
  work_open: { employer: employers, source: sources },
  carousel_exposure: { slide: ['shady-white-van'] },
  external_project_click: { project: ['shady-white-van'] },
  carousel_cta_click: { slide: PORTFOLIO_SLIDES.map((slide) => slide.id) },
  navigation_click: {},
  cookie_settings_open: {},
  external_profile_click: { profile: ['linkedin', 'github', 'x', 'facebook', 'bluesky'] },
  evaluation_input_selected: { input_method: methods },
  evaluation_file_selected: { input_method: ['file'] },
  evaluation_input_prepared: { input_method: methods },
  evaluation_submitted: { input_method: methods },
  evaluation_completed: { input_method: methods },
  evaluation_failed: { input_method: methods },
  evaluation_result_viewed: { input_method: methods },
  evaluation_job_details: {},
  evaluation_job_text: {},
  evidence_view: {
    evidence: [
      'engineering',
      'ux-product',
      'accessibility',
      'ai',
      'creative',
      'impact',
      'buildometer',
    ],
  },
  case_study_view: { employer: employers },
  coffee_open: {},
  coffee_submitted: { test_set: testSets, test_source: testSources },
  coffee_solo_scan: { trigger: ['button', 'own_url'], test_set: testSets, test_source: testSources },
  coffee_retest: { test_set: testSets },
  coffee_result: {
    verdict: ['visitor_buys', 'james_buys', 'tie', 'solo'],
    test_set: testSets,
    test_source: testSources,
  },
  coffee_error: {
    error_type: ['invalid_url', 'unreachable', 'rate_limited', 'timeout', 'psi_down', 'self_failed'],
  },
  coffee_book_click: { verdict: ['visitor_buys', 'james_buys', 'tie', 'no_verdict', 'solo'] },
};
const coffeeScores = ['visitor', 'james'].flatMap((side) =>
  ['mobile', 'desktop'].flatMap((test) =>
    ['performance', 'accessibility', 'best_practices', 'seo'].map((c) => `${side}_${test}_${c}`),
  ),
);
const coffeeMatchups = ['matchups_won_visitor', 'matchups_won_james', 'matchups_tied'];
// A bare lowercase hostname: no scheme, path, query, fragment, port or credentials can pass.
const siteHost = /^(?=.{4,253}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;

/** SCRUM-197: GA must never receive personal data (James's rule and Google's policy). Job text
 * loses contact lines, email addresses, links and phone numbers before it leaves the browser. */
export function withoutPersonalData(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) =>
      /\b(recruiter|recruiting contact|hiring manager|contact|reach out|questions\?|apply to|send (your )?(resume|cv))\b/i.test(
        line,
      )
        ? '[contact line removed]'
        : line,
    )
    .join('\n')
    .replace(/[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/gi, '[email]')
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[link]')
    .replace(/(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[phone]');
}

/** Runtime boundary: copy only finite known fields, never spread caller data into GA. */
export function publicEventParameters(
  event: keyof EventParameters,
  value: unknown,
  publicPath: (path: string) => string,
): Record<string, string | number> | null {
  if (!Object.hasOwn(rules, event) || !value || typeof value !== 'object' || Array.isArray(value))
    return null;
  const input = value as Record<string, unknown>;
  if (typeof input['location'] !== 'string' || !locations.includes(input['location'])) return null;
  const output: Record<string, string | number> = { location: input['location'] };
  for (const [key, allowed] of Object.entries(rules[event])) {
    const field = input[key];
    if (typeof field !== 'string' || !allowed.includes(field)) return null;
    output[key] = field;
  }
  if (event === 'rigby_cookie') {
    const stop = COOKIE_TRAIL.find((stop) => stop.id === input['cookie_id']);
    if (!stop || input['cookie_flavor'] !== stop.flavor) return null;
    output['cookie_flavor'] = stop.flavor;
  }
  if (event === 'rigby_encounter' && input['surface'] !== undefined) {
    if (!['encounter', 'companion', 'greeting'].includes(String(input['surface']))) return null;
    output['surface'] = String(input['surface']);
  }
  if (event === 'evaluation_failed' && input['failure_stage'] !== undefined) {
    if (!['input', 'evaluation'].includes(String(input['failure_stage']))) return null;
    output['failure_stage'] = String(input['failure_stage']);
  }
  if (event === 'evaluation_job_details' || event === 'evaluation_job_text') {
    const id = input['evaluation_id'];
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
    output['evaluation_id'] = id;
    const texts = event === 'evaluation_job_text' ? ['job_text'] : ['job_title', 'company'];
    const counts =
      event === 'evaluation_job_text'
        ? ['chunk_index', 'chunk_count']
        : ['met', 'total', 'required_met', 'required_total'];
    for (const key of texts) {
      const text = input[key];
      // GA rejects parameter values over 100 characters.
      if (typeof text !== 'string' || text.length > 100) return null;
      output[key] = text;
    }
    for (const key of counts) {
      const count = input[key];
      if (!Number.isInteger(count) || (count as number) < 0) return null;
      output[key] = count as number;
    }
  }
  // site_host: required for a challenge, absent for a solo scan, optional on errors and bookings.
  if (['coffee_submitted', 'coffee_result', 'coffee_error', 'coffee_book_click'].includes(event)) {
    const host = input['site_host'];
    const solo = input['verdict'] === 'solo';
    const required = event === 'coffee_submitted' || (event === 'coffee_result' && !solo);
    if (host === undefined ? required : solo || typeof host !== 'string' || !siteHost.test(host))
      return null;
    if (host !== undefined) output['site_host'] = host as string;
  }
  if (event === 'coffee_result') {
    const solo = input['verdict'] === 'solo';
    for (const key of coffeeMatchups) {
      const count = input[key];
      if (count === undefined && solo) continue;
      if (solo || !Number.isInteger(count) || (count as number) < 0 || (count as number) > 8)
        return null;
      output[key] = count as number;
    }
    for (const key of coffeeScores) {
      const score = input[key];
      if (score === undefined) continue; // a failed test sends no score, never a zero
      if (!Number.isInteger(score) || (score as number) < 0 || (score as number) > 100) return null;
      output[key] = score as number;
    }
  }
  const destination =
    event === 'carousel_cta_click'
      ? 'destination'
      : event === 'navigation_click'
        ? 'destination_path'
        : null;
  if (destination) {
    const path = input[destination];
    if (typeof path !== 'string' || path === '/other' || publicPath(path) !== path) return null;
    output[destination] = path;
  }
  return output;
}
