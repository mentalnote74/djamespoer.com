import { Routes } from '@angular/router';
import { PUBLIC_PAGES } from './content/public-pages';
import { isDevMode } from '@angular/core';

export const routes: Routes = [
  ...(isDevMode()
    ? ([
        {
          path: 'demo/dusk-to-dusk',
          title: 'Dusk-to-Dusk theme demo',
          data: { layout: 'independent', robots: 'noindex, nofollow' },
          loadComponent: () => import('./features/theme-demo/theme-demo').then((m) => m.ThemeDemo),
        },
      ] satisfies Routes)
    : []),
  {
    path: '',
    pathMatch: 'full',
    title: PUBLIC_PAGES[0].title,
    data: {
      layout: 'independent',
      description: PUBLIC_PAGES[0].description,
    },
    loadComponent: () => import('./components/home/home').then(({ Home }) => Home),
  },
  {
    path: '',
    loadChildren: () =>
      import('./app.routes.interior').then(({ interiorRoutes }) => interiorRoutes),
  },
];
