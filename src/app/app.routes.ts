import { Route, Routes } from '@angular/router';

const loadProofPage = () =>
  import('./components/proof-page/proof-page').then(({ ProofPage }) => ProofPage);

const createProofRoute = (path: string, heading: string): Route => ({
  path,
  title: `${heading} | D. James Poer`,
  data: {
    heading,
    description: `${heading} proof-of-value page for D. James Poer. Portfolio evidence will be added in a future content phase.`,
    ...(path === 'creative'
      ? {
          artwork: {
            src: '/assets/perspectives/SCRUM-64-Larry-V2-C.png',
            alt: 'A densely illustrated town of interconnected autobiographical scenes and visual Easter eggs.',
            width: 2172,
            height: 724,
          },
        }
      : {}),
  },
  ...(path === 'engineering'
    ? {
        data: {
          heading,
          composition: 'engineering',
          description:
            'Engineering perspective: Angular architecture, reusable components, accessibility, testing, performance and production delivery.',
        },
        resolve: {
          content: () =>
            import('./components/proof-page/engineering.content').then(
              ({ ENGINEERING_CONTENT }) => ENGINEERING_CONTENT,
            ),
        },
      }
    : {}),
  ...(path === 'ux-product'
    ? {
        data: {
          heading,
          composition: 'ux',
          description:
            'UX & Product perspective: user research, usability testing, workflow design, accessibility and iterative product delivery.',
        },
        resolve: {
          content: () =>
            import('./components/proof-page/ux-product.content').then(
              ({ UX_PRODUCT_CONTENT }) => UX_PRODUCT_CONTENT,
            ),
        },
      }
    : {}),
  ...(path === 'accessibility'
    ? {
        data: {
          heading,
          composition: 'accessibility',
          description:
            'Accessibility perspective: semantic HTML, Section 508, WCAG, reusable component architecture and human validation.',
        },
        resolve: {
          content: () =>
            import('./components/proof-page/accessibility.content').then(
              ({ ACCESSIBILITY_CONTENT }) => ACCESSIBILITY_CONTENT,
            ),
        },
      }
    : {}),
  ...(path === 'ai'
    ? {
        data: {
          heading,
          composition: 'ai',
          description:
            'AI & Innovation perspective: agent orchestration, human-directed product development, evidence and production verification.',
        },
        resolve: {
          content: () =>
            import('./components/proof-page/ai.content').then(({ AI_CONTENT }) => AI_CONTENT),
        },
      }
    : {}),
  loadComponent: loadProofPage,
});

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'D. James Poer | UX Engineer & Front-End Architect',
    data: {
      description:
        'D. James Poer is a UX Engineer and Front-End Architect specializing in Angular, TypeScript, accessible enterprise applications, UX/UI, design systems, Section 508, WCAG, and AI-enabled product development.',
    },
    loadComponent: () => import('./components/home/home').then(({ Home }) => Home),
  },
  {
    path: 'work',
    title: 'Work | D. James Poer',
    data: {
      description: 'Case studies and supporting portfolio evidence.',
    },
    loadComponent: () => import('./components/work/work').then(({ Work }) => Work),
  },
  ...(
    [
      ['djamespoer', 'djamespoer.com'],
      ['exl', 'EXL / LifePRO'],
      ['ips', 'Indianapolis Public Schools'],
      ['tcc', 'TCC Software Solutions'],
      ['dr', 'Dreyer & Reinbold'],
    ] as const
  ).map(([path, heading]): Route => ({
    path: `work/${path}`,
    title: `${heading} | D. James Poer`,
    data: {
      description:
        path === 'dr'
          ? 'Dreyer & Reinbold case study: dealership digital operations, vehicle photography and month-end commission reporting within an existing intranet.'
          : path === 'ips'
            ? 'Indianapolis Public Schools case study: dynamic PowerSchool forms, conditional validation and state reporting requirements.'
            : `${heading} case study and supporting evidence.`,
    },
    resolve: {
      study: () =>
        import('./components/case-study/case-study.content').then(
          ({ CASE_STUDIES }) => CASE_STUDIES[path],
        ),
    },
    loadComponent: () =>
      import('./components/case-study/case-study').then(({ CaseStudy }) => CaseStudy),
  })),
  {
    path: 'about',
    title: 'About | D. James Poer',
    data: { description: 'About D. James Poer.' },
    loadComponent: () => import('./components/about/about').then(({ About }) => About),
  },
  createProofRoute('engineering', 'Engineering'),
  createProofRoute('ux-product', 'UX & Product'),
  createProofRoute('accessibility', 'Accessibility'),
  createProofRoute('ai', 'AI & Innovation'),
  createProofRoute('creative', 'Creative'),
  createProofRoute('impact', 'Impact'),
];
