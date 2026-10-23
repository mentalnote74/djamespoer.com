export type SlideVisualKind =
  | 'perspective'
  | 'creative'
  | 'thingamajob'
  | 'exl'
  | 'buildometer'
  | 'ips'
  | 'conservatory'
  | 'sunset'
  | 'moonlight'
  | 'blognostisphere'
  | 'tcc-pig';
export interface HeroCopyZone {
  width: number;
  alignment: 'start' | 'center' | 'end';
  mobileWidth: number;
  mobileAlignment: 'start' | 'center' | 'end';
  ink?: 'dark';
  shade?: boolean;
}
const LEFT: HeroCopyZone = {
  width: 47,
  alignment: 'center',
  mobileWidth: 66,
  mobileAlignment: 'start',
};
const HERO_COPY: Record<SlideVisualKind, HeroCopyZone> = {
  perspective: LEFT,
  creative: {
    ...LEFT,
    width: 58,
    alignment: 'end',
    mobileWidth: 75,
    mobileAlignment: 'end',
    shade: true,
  },
  thingamajob: LEFT,
  exl: LEFT,
  buildometer: LEFT,
  ips: LEFT,
  conservatory: { ...LEFT, mobileWidth: 65 },
  sunset: { ...LEFT, mobileWidth: 65, mobileAlignment: 'end' },
  moonlight: { ...LEFT, mobileWidth: 65, mobileAlignment: 'end' },
  blognostisphere: {
    ...LEFT,
    width: 65,
    alignment: 'end',
    mobileWidth: 78,
    mobileAlignment: 'end',
  },
  'tcc-pig': { ...LEFT, mobileWidth: 47, mobileAlignment: 'center', ink: 'dark' },
};
export interface PortfolioSlideDefinition {
  id: string;
  label: string;
  destination: string;
  visual: SlideVisualKind;
  perspective?: 'engineering' | 'ux' | 'accessibility' | 'ai' | 'impact';
  family?: 'djp';
  heroCopy?: HeroCopyZone;
}

// Shared carousel/destination relationship. Rejected old TCC and D&R art stays excluded.
// The static-render fallback is also a djp.c anchor; runtime randomization follows hydration.
const definitions: readonly PortfolioSlideDefinition[] = [
  {
    id: 'djp-conservatory',
    label: 'djamespoer.com',
    destination: '/work/djamespoer',
    visual: 'conservatory',
    family: 'djp',
  },
  {
    id: 'engineering',
    label: 'Engineering',
    destination: '/engineering',
    visual: 'perspective',
    perspective: 'engineering',
  },
  {
    id: 'ux',
    label: 'UX & Product',
    destination: '/ux-product',
    visual: 'perspective',
    perspective: 'ux',
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    destination: '/accessibility',
    visual: 'perspective',
    perspective: 'accessibility',
  },
  {
    id: 'ai',
    label: 'AI & Innovation',
    destination: '/ai',
    visual: 'perspective',
    perspective: 'ai',
  },
  { id: 'creative', label: 'Creative Town', destination: '/creative', visual: 'creative' },
  {
    id: 'impact',
    label: 'Impact',
    destination: '/impact',
    visual: 'perspective',
    perspective: 'impact',
  },
  { id: 'thingamajob', label: 'Thingamajob', destination: '/thingamajob', visual: 'thingamajob' },
  { id: 'exl', label: 'EXL LifePRO', destination: '/case-studies/exl', visual: 'exl' },
  { id: 'buildometer', label: 'Buildometer', destination: '/buildometer', visual: 'buildometer' },
  { id: 'ips', label: 'IPS / PowerSchool', destination: '/case-studies/ips', visual: 'ips' },
  {
    id: 'djp-sunset',
    label: 'djamespoer.com — Sunset beach',
    destination: '/work/djamespoer',
    visual: 'sunset',
    family: 'djp',
  },
  {
    id: 'djp-moonlight',
    label: 'djamespoer.com — Moonlit beach',
    destination: '/work/djamespoer',
    visual: 'moonlight',
    family: 'djp',
  },
  {
    id: 'blognostisphere',
    label: 'Blognostisphere',
    destination: '/blognostisphere',
    visual: 'blognostisphere',
  },
  {
    id: 'tcc-ux-pig',
    label: 'TCC — UX philosophy',
    destination: '/case-studies/tcc',
    visual: 'tcc-pig',
  },
];
export const PORTFOLIO_SLIDES: readonly PortfolioSlideDefinition[] = definitions.map(
  (slide): PortfolioSlideDefinition => ({ ...slide, heroCopy: HERO_COPY[slide.visual] }),
);

export function destinationSlides(destination: string): readonly PortfolioSlideDefinition[] {
  return PORTFOLIO_SLIDES.filter((slide) => slide.destination === destination);
}

export function chooseSlide(
  slides: readonly PortfolioSlideDefinition[],
  random = Math.random,
): PortfolioSlideDefinition {
  return slides[Math.floor(random() * slides.length)];
}

export function shufflePortfolioDeck(
  slides: readonly PortfolioSlideDefinition[],
  random = Math.random,
): PortfolioSlideDefinition[] {
  const anchors = slides.filter((slide) => slide.family === 'djp');
  if (!anchors.length) throw new Error('Portfolio deck requires a djp.c anchor.');
  const opening = chooseSlide(anchors, random);
  const remainder = slides.filter((slide) => slide.id !== opening.id);
  // Fisher–Yates: every remaining slide, including the other djp.c variants, is ordinary deck content.
  for (let i = remainder.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [remainder[i], remainder[j]] = [remainder[j], remainder[i]];
  }
  return [opening, ...remainder];
}
