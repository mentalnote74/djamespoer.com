import { Routes } from '@angular/router';
import { PUBLIC_PAGES } from './content/public-pages';

export const routes: Routes = [
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
