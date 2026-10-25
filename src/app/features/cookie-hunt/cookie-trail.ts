import { PORTFOLIO_SLIDES } from '../../content/portfolio-slides';

// Add placements here; the jar total follows this list, with no ten-cookie cap.
export const COOKIE_FLAVORS = [
  'Chocolate Chip',
  'Snickerdoodle',
  'Peanut Butter',
  'Sugar Cookie',
  'Oatmeal Raisin',
  'Shortbread',
  'Ginger Snap',
  'White Chocolate Macadamia',
  'Double Chocolate',
  'Molasses',
  'Thumbprint',
  'Lemon Cookie',
  'Rigby’s Biscuit',
] as const;
const priorityStops = [
  {
    id: 'home',
    path: '/',
    label: 'Home',
    flavor: 0,
    clue: 'Start where the portfolio introduces itself.',
  },
  {
    id: 'about',
    path: '/about',
    label: 'About',
    flavor: 1,
    clue: 'Get to know the person behind the work.',
  },
  {
    id: 'engineering',
    path: '/engineering',
    label: 'Engineering',
    flavor: 2,
    clue: 'Follow the architecture and frontend engineering evidence.',
  },
  {
    id: 'ux',
    path: '/ux-product',
    label: 'UX & Product',
    flavor: 3,
    clue: 'Look where research becomes product decisions.',
  },
  {
    id: 'accessibility',
    path: '/accessibility',
    label: 'Accessibility',
    flavor: 4,
    clue: 'Find the work that makes interfaces usable by more people.',
  },
  {
    id: 'ai',
    path: '/ai',
    label: 'AI & Innovation',
    flavor: 5,
    clue: 'See how human direction and AI work together.',
  },
  {
    id: 'impact',
    path: '/impact',
    label: 'Impact',
    flavor: 6,
    clue: 'Look for the lasting effect of the work.',
  },
  {
    id: 'portfolio',
    path: '/work/djamespoer',
    label: 'Building this portfolio',
    flavor: 7,
    clue: 'The portfolio itself is a piece of the evidence.',
  },
  {
    id: 'exl',
    path: '/case-studies/exl',
    label: 'EXL / LifePRO case study',
    flavor: 8,
    clue: 'Explore the EXL / LifePRO project in depth.',
  },
  {
    id: 'tcc',
    path: '/case-studies/tcc',
    label: 'TCC case study',
    flavor: 9,
    clue: 'Follow the TCC story from research to product.',
  },
] as const;
export interface CookieStop {
  id: string;
  path: string;
  label: string;
  flavor: number;
  clue: string;
}
const seen = new Set(priorityStops.map((stop) => stop.path as string));
const additionalStops: CookieStop[] = [];
for (const slide of PORTFOLIO_SLIDES) {
  if (seen.has(slide.destination)) continue;
  seen.add(slide.destination);
  additionalStops.push({
    id: 'slide-' + slide.id,
    path: slide.destination,
    label: slide.label,
    flavor: (priorityStops.length + additionalStops.length) % COOKIE_FLAVORS.length,
    clue: 'Follow the ' + slide.label + ' slide into its story.',
  });
}
// Existing IDs remain stable, so expanding the trail preserves saved jars.
export const COOKIE_TRAIL: readonly CookieStop[] = [...priorityStops, ...additionalStops];
const INLINE_PATHS = new Set([
  '/',
  '/about',
  '/engineering',
  '/ux-product',
  '/accessibility',
  '/ai',
  '/creative',
  '/impact',
  '/work/djamespoer',
  '/case-studies/exl',
  '/case-studies/tcc',
  '/case-studies/ips',
]);
export function cookiePlacement(path: string): 'inline' | 'page-end' {
  return INLINE_PATHS.has(path) ? 'inline' : 'page-end';
}
