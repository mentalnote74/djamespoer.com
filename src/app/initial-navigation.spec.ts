import { ApplicationRef } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { App } from './app';
import { appConfig } from './app.config';
import { routes } from './app.routes';

describe('Initial application navigation', () => {
  it('bootstraps lazy Home inside a single set of landmarks', async () => {
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
    const homeRoute = routes.find((route) => route.path === '' && route.loadComponent)!;
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
    try {
      const bootstrapping = bootstrapApplication(App, {
        providers: [...appConfig.providers, provideHttpClientTesting()],
      }).then((ref) => {
        app = ref;
        return ref;
      });
      await started;
      releaseHome();
      app = await bootstrapping;
      await app.whenStable();
      app.tick();
      expect(host.querySelector('main app-home')).not.toBeNull();
      expect(host.querySelectorAll('header')).toHaveLength(1);
      expect(host.querySelectorAll('main')).toHaveLength(1);
      expect(host.querySelectorAll('footer')).toHaveLength(1);
      expect(host.querySelector('.skip-link')?.getAttribute('href')).toBe('#main-content');
      app.injector.get(HttpTestingController).verify();
      expect(
        routes
          .filter((route) => route.redirectTo === undefined)
          .every((route) => typeof (route.loadComponent ?? route.loadChildren) === 'function'),
      ).toBe(true);
    } finally {
      releaseHome();
      app?.destroy();
      loader.mockRestore();
      host.remove();
      vi.unstubAllGlobals();
    }
  });
});
