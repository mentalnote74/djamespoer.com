import { Route, Routes } from '@angular/router';

const loadProofPage = () =>
  import('./components/proof-page/proof-page').then(({ ProofPage }) => ProofPage);

const createProofRoute = (path: string, heading: string): Route => ({
  path,
  title: `${heading} | D. James Poer`,
  data: {
    heading,
    description: `${heading} proof-of-value page for D. James Poer. Portfolio evidence will be added in a future content phase.`,
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
  createProofRoute('engineering', 'Engineering'),
  createProofRoute('ux-product', 'UX & Product'),
  createProofRoute('accessibility', 'Accessibility'),
  createProofRoute('ai', 'AI & Innovation'),
  createProofRoute('creative', 'Creative'),
  createProofRoute('impact', 'Impact'),
];
