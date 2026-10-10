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
