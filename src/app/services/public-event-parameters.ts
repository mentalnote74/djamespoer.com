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
};

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
