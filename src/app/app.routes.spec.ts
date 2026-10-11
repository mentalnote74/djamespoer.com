import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { firstValueFrom, filter } from 'rxjs';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('Work routes', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), provideLocationMocks()],
    }),
  );
  it('restores legitimate routes through back and forward history navigation', async () => {
    const harness = await RouterTestingHarness.create('/about');
    await harness.navigateByUrl('/work/tcc');
    const router = TestBed.inject(Router);
    router.setUpLocationChangeListener();
    const location = TestBed.inject(Location);
    const back = firstValueFrom(
      router.events.pipe(filter((event) => event instanceof NavigationEnd)),
    );
    location.back();
    await back;
    expect(router.url).toBe('/about');
    const forward = firstValueFrom(
      router.events.pipe(filter((event) => event instanceof NavigationEnd)),
    );
    location.forward();
    await forward;
    expect(router.url).toBe('/work/tcc');
  });
  it('keeps Home, Perspectives and case studies lazy with exact Work and last wildcard redirects', () => {
    expect(routes.find((route) => route.path === 'work')).toEqual({
      path: 'work',
      pathMatch: 'full',
      redirectTo: '',
    });
    expect(routes.at(-1)).toEqual({ path: '**', redirectTo: '' });
    expect(routes.filter((route) => route.path?.startsWith('work'))).toHaveLength(6);
    for (const route of routes.filter((route) => !route.redirectTo && route.redirectTo !== '')) {
      expect(route.loadComponent).toBeTypeOf('function');
      expect(route.component).toBeUndefined();
    }
    expect(routes.map((route) => route.path)).toEqual(
      expect.arrayContaining([
        '',
        'engineering',
        'ux-product',
        'accessibility',
        'ai',
        'creative',
        'impact',
      ]),
    );
  });
  it.each([
    ['djamespoer', 'djamespoer.com', 'Performance 92'],
    ['exl', 'EXL / LifePRO', 'roughly 150 lines of Sass'],
    ['tcc', 'TCC Software Solutions', 'During my final week at TCC'],
    ['dr', 'Dreyer & Reinbold', 'approximately 30 seconds'],
    ['ips', 'Indianapolis Public Schools', 'State of Indiana'],
  ])(
    'renders the authored /work/%s draft as semantic, indexable text',
    async (path, heading, fact) => {
      const harness = await RouterTestingHarness.create(`/work/${path}`);
      const root = harness.routeNativeElement!;
      expect(root.querySelectorAll('h1')).toHaveLength(1);
      expect(root.querySelector('h1')?.textContent).toBe(heading);
      expect(root.querySelector('article')).not.toBeNull();
      expect(root.querySelectorAll('section h2').length).toBeGreaterThan(5);
      expect(root.textContent).toContain(fact);
      expect(root.textContent).not.toContain('Content pending.');
    },
  );
});
