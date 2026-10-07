import { ApplicationRef } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { App } from './app';
import { appConfig } from './app.config';
import { routes } from './app.routes';

describe('Initial application navigation', () => {
  it('waits for lazy Home before creating the shell and renders Home during bootstrap', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    const host = document.createElement('app-root');
    document.body.appendChild(host);
    const homeRoute = routes[0]!;
    const { Home } = await import('./components/home/home');
    let releaseHome!: () => void;
    let loaderStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      loaderStarted = resolve;
    });
    const pendingHome = new Promise<typeof Home>((resolve) => {
      releaseHome = () => resolve(Home);
    });
    const loader = vi.spyOn(homeRoute, 'loadComponent').mockImplementation(() => {
      loaderStarted();
      return pendingHome;
    });
    let app: ApplicationRef | undefined;
    let bootstrapCompleted = false;
    try {
      const bootstrapping = bootstrapApplication(App, {
        providers: [...appConfig.providers, provideHttpClientTesting()],
      }).then((ref) => {
        app = ref;
        bootstrapCompleted = true;
        return ref;
      });
      await started;
      expect(bootstrapCompleted).toBe(false);
      expect(host.querySelector('header, main, footer')).toBeNull();
      releaseHome();
      app = await bootstrapping;
      app.tick();
      expect(host.querySelector('main app-home app-hero')).not.toBeNull();
      expect(host.querySelectorAll('header')).toHaveLength(1);
      expect(host.querySelectorAll('main')).toHaveLength(1);
      expect(host.querySelectorAll('footer')).toHaveLength(1);
      expect(host.querySelector('.skip-link')?.getAttribute('href')).toBe('#main-content');
      const http = app.injector.get(HttpTestingController);
      http.expectOne('/data/deployment-history.json').flush(
        JSON.stringify({
          schemaVersion: 4,
          checkedAt: '2026-10-06T16:08:56.989Z',
          generatedAt: '2026-10-06T16:08:56.989Z',
          refreshStatus: 'ok',
          rows: [],
        }),
      );
      http.verify();
      expect(routes.every((route) => typeof route.loadComponent === 'function')).toBe(true);
    } finally {
      releaseHome();
      app?.destroy();
      loader.mockRestore();
      host.remove();
      vi.unstubAllGlobals();
    }
  });
});
