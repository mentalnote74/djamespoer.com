import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { firstValueFrom, filter } from 'rxjs';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { interiorRoutes } from './app.routes.interior';
import { EXL_WORK_HISTORY } from './components/case-study/exl-work.content';
import { IPS_WORK_HISTORY } from './components/case-study/ips-work.content';
import { TCC_WORK_HISTORY } from './components/case-study/tcc-work.content';
import { DR_WORK_HISTORY } from './components/case-study/dr-work.content';
import { DJAMESPOER_CASE_STUDY } from './components/case-study/djamespoer.content';
import { Title } from '@angular/platform-browser';

const workPages = [
  ['exl', EXL_WORK_HISTORY],
  ['ips', IPS_WORK_HISTORY],
  ['tcc', TCC_WORK_HISTORY],
  ['dr', DR_WORK_HISTORY],
  ['djamespoer', DJAMESPOER_CASE_STUDY],
] as const;

const normalizedText = (text: string) => text.replace(/\s+/g, ' ').trim();

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
  it('keeps route boundaries lazy, the Work alias, and a non-redirecting not-found fallback', async () => {
    expect(routes[0].loadComponent).toBeTypeOf('function');
    expect(routes[0].component).toBeUndefined();
    expect(routes[0].pathMatch).toBe('full');
    expect(routes[1].loadChildren).toBeTypeOf('function');
    expect(await routes[1].loadChildren!()).toBe(interiorRoutes);
    expect(interiorRoutes.find((route) => route.path === 'work')).toEqual({
      path: 'work',
      pathMatch: 'full',
      redirectTo: '',
    });
    expect(interiorRoutes.at(-1)).toMatchObject({
      path: '**',
      title: 'Page not found | D. James Poer',
      data: { robots: 'noindex, nofollow' },
    });
    expect(interiorRoutes.at(-1)?.redirectTo).toBeUndefined();
    expect(interiorRoutes.filter((route) => route.path?.startsWith('work'))).toHaveLength(6);
    for (const route of interiorRoutes.filter((route) => route.redirectTo === undefined)) {
      expect(route.loadComponent).toBeTypeOf('function');
      expect(route.component).toBeUndefined();
    }
    expect(interiorRoutes.map((route) => route.path)).toEqual(
      expect.arrayContaining([
        'engineering',
        'ux-product',
        'accessibility',
        'ai',
        'creative',
        'impact',
      ]),
    );
  });
  it.each(['/missing-page', '/work/missing/nested?source=test#details'])(
    'retains %s and offers real recovery links instead of redirecting Home',
    async (url) => {
      const harness = await RouterTestingHarness.create(url);
      const root = harness.routeNativeElement!;
      expect(TestBed.inject(Router).url).toBe(url);
      expect(root.querySelectorAll('h1')).toHaveLength(1);
      expect(root.querySelector('h1')?.textContent).toBe('Page not found');
      expect(root.querySelector('h1')?.getAttribute('tabindex')).toBe('-1');
      expect(root.querySelectorAll('main')).toHaveLength(0);
      expect(TestBed.inject(Title).getTitle()).toBe('Page not found | D. James Poer');
      expect(root.querySelector('a[href="/"]')?.textContent).toContain('Return to Home');
      expect(root.querySelector('a[href="/engineering"]')).not.toBeNull();
      await harness.navigateByUrl('/about');
      expect(TestBed.inject(Router).url).toBe('/about');
      expect(harness.routeNativeElement?.textContent).not.toContain('Page not found');
    },
  );
  it.each(workPages)('renders approved /work/%s context after its heading', async (path, study) => {
    const harness = await RouterTestingHarness.create(`/work/${path}`);
    const heading = harness.routeNativeElement!.querySelector('h1')!;
    const article = harness.routeNativeElement!.querySelector('article.case-study')!;
    const context = Array.from(article.children).filter((element) => element.tagName === 'P');
    const introduction =
      typeof study.introduction === 'string' ? [study.introduction] : (study.introduction ?? []);
    const text = normalizedText(context.map((paragraph) => paragraph.textContent).join(' '));
    for (const paragraph of introduction) {
      expect(text).toContain(normalizedText(paragraph));
    }
    expect(context.length).toBeGreaterThan(0);
    expect(
      heading.compareDocumentPosition(context[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(text).not.toMatch(/[\uFFFD\u00C2\u00C3]/);
  });
  it.each(workPages)(
    'renders the current authored /work/%s document with one heading and its sections in order',
    async (path, study) => {
      const harness = await RouterTestingHarness.create(`/work/${path}`);
      const root = harness.routeNativeElement!;
      expect(root.querySelectorAll('h1')).toHaveLength(1);
      expect(root.querySelector('h1')?.textContent).toBe(study.title);
      expect(root.querySelector('article')).not.toBeNull();
      expect(
        Array.from(
          root.querySelectorAll('article.case-study > section > h2'),
          (h) => h.textContent,
        ),
      ).toEqual(study.sections.map((section) => section.heading));
      expect(root.textContent).not.toContain('Content pending.');
    },
  );
});
