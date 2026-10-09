/** Provisional visual directions, not claims about a particular employer/project. */
export const PERSPECTIVE_CANDIDATES = {
  engineering: {
    heading: 'Engineering',
    path: '/engineering',
    theme: 'blueprint',
    idea: 'Find the structure. Solve at the right layer.',
    note: 'A connected blueprint: slow, linked nodes suggest systems rather than isolated screens.',
    particles: {
      count: 28,
      color: '#8ab4d6',
      shape: 'circle',
      size: 2,
      links: true,
      speed: 0.25,
      direction: 'none',
      straight: false,
    },
  },
  ux: {
    heading: 'UX & Product',
    path: '/ux-product',
    theme: 'journey',
    idea: 'Make the next step clear.',
    note: 'A journey through decisions: horizontal particles carry attention between three waypoints.',
    particles: {
      count: 24,
      color: '#f1b074',
      shape: 'circle',
      size: 3,
      links: false,
      speed: 0.65,
      direction: 'right',
      straight: true,
    },
  },
  accessibility: {
    heading: 'Accessibility',
    path: '/accessibility',
    theme: 'open-door',
    idea: 'Build an entrance everyone can use.',
    note: 'An open doorway: a stationary constellation softly changes opacity; the path stays unobstructed.',
    particles: {
      count: 20,
      color: '#b5d9c0',
      shape: 'circle',
      size: 3,
      links: false,
      speed: 0,
      direction: 'none',
      straight: false,
    },
  },
  ai: {
    heading: 'AI & Innovation',
    path: '/ai',
    theme: 'signal',
    idea: 'Explore widely. Verify deliberately.',
    note: 'Signal and hypothesis: sparse triangular particles move diagonally around a fixed verification lens.',
    particles: {
      count: 18,
      color: '#cbb7eb',
      shape: 'triangle',
      size: 4,
      links: false,
      speed: 0.45,
      direction: 'top-right',
      straight: true,
    },
  },
  impact: {
    heading: 'Impact',
    path: '/impact',
    theme: 'outcomes',
    idea: 'Show what changed, and how we know.',
    note: 'Momentum toward evidence: a small stream of rising square particles beside a static, unnumbered outcome ladder.',
    particles: {
      count: 22,
      color: '#efd78d',
      shape: 'edge',
      size: 3,
      links: false,
      speed: 0.5,
      direction: 'top',
      straight: true,
    },
  },
} as const;

export type PerspectiveCandidateKey = keyof typeof PERSPECTIVE_CANDIDATES;

export function candidateParticleConfig(key: PerspectiveCandidateKey) {
  const design = PERSPECTIVE_CANDIDATES[key].particles;
  return {
    particles: {
      number: { value: design.count, density: { enable: false } },
      color: { value: design.color },
      shape: { type: design.shape },
      opacity: {
        value: 0.55,
        random: true,
        anim: { enable: key === 'accessibility', speed: 0.35, opacity_min: 0.15, sync: false },
      },
      size: { value: design.size, random: true },
      line_linked: {
        enable: design.links,
        distance: 110,
        color: design.color,
        opacity: 0.3,
        width: 1,
      },
      move: {
        enable: true,
        speed: design.speed,
        direction: design.direction,
        random: false,
        straight: design.straight,
        out_mode: 'out',
      },
    },
    // Resize is managed by the component. The library's global resize listener cannot be removed.
    interactivity: {
      events: { onhover: { enable: false }, onclick: { enable: false }, resize: false },
    },
    retina_detect: false,
  };
}
