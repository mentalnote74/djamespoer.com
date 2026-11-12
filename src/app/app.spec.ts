import { PREFERENCE_COOKIE } from './features/cookie-preferences/preferences';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { App } from './app';
import { By } from '@angular/platform-browser';
import { Bedlam } from './components/bedlam/bedlam';
import { routes } from './app.routes';
import { PageMetadataStrategy } from './services/page-metadata-strategy';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

const proofPages = [
  { path: '/engineering', heading: 'Engineering' },
  { path: '/ux-product', heading: 'UX & Product' },
  { path: '/accessibility', heading: 'Accessibility' },
  { path: '/ai', heading: 'AI & Innovation' },
  { path: '/creative', heading: 'Creative' },
  { path: '/impact', heading: 'Impact' },
] as const;

describe('App', () => {
  // Route/landmark tests model a returning visitor; first-visit dialog is browser-tested separately.
  beforeEach(() => {
    document.cookie = PREFERENCE_COOKIE + '=1.0; Path=/';
  });
  it.each(['/', '/thingamajob', '/about'])(
    'skips to the shared current main on %s without router navigation',
    async (path) => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const router = TestBed.inject(Router);
      await router.navigateByUrl(path);
      await fixture.whenStable();
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const main = root.querySelector<HTMLElement>('main#main-content')!;
      const focus = vi.spyOn(main, 'focus');
      const navigation = vi.spyOn(router, 'navigateByUrl');
      const click = new MouseEvent('click', { bubbles: true, cancelable: true });
      const skip = root.querySelector<HTMLAnchorElement>('.skip-link')!;
      skip.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(true);
      expect(focus).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(main);
      expect(router.url).toBe(path);
      expect(navigation).not.toHaveBeenCalled();
      expect(root.querySelectorAll('main')).toHaveLength(1);
      expect(root.querySelectorAll('#main-content')).toHaveLength(1);
      expect(skip.textContent?.trim()).toBe('Skip to main content');
    },
  );
  afterEach(() => {
    document.cookie = PREFERENCE_COOKIE + '=; Path=/; Max-Age=0';
    TestBed.inject(HttpTestingController)
      .match('/data/deployment-history.json')
      .forEach((request) => {
        request.flush(
          JSON.stringify({
            schemaVersion: 4,
            checkedAt: '2026-10-06T16:08:56.989Z',
            generatedAt: '2026-10-06T16:08:56.989Z',
            refreshStatus: 'ok',
            rows: [],
          }),
        );
      });
    TestBed.inject(HttpTestingController).verify();
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } satisfies MediaQueryList),
    );

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes, withComponentInputBinding()),
        { provide: TitleStrategy, useExisting: PageMetadataStrategy },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
  it('owns the shared editorial canvas across routes while Home stays independent', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    for (const path of ['/about', '/work/tcc', '/engineering', '/', '/about']) {
      await router.navigateByUrl(path);
      await fixture.whenStable();
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const canvas = root.querySelector('.page__content')!;
      expect(canvas.classList.contains('page__content--independent')).toBe(path === '/');
      expect(canvas.classList.contains('layout-container')).toBe(path !== '/');
      if (path !== '/') {
        expect(canvas.querySelector('.editorial-content')).not.toBeNull();
        expect(canvas.querySelector('.editorial-content.layout-container')).toBeNull();
      } else {
        expect(canvas.querySelector('app-home > app-carousel')).not.toBeNull();
      }
      expect(root.querySelectorAll('main')).toHaveLength(1);
    }
  });
  it('connects the footer motion control to the header identity', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const control = Array.from(root.querySelectorAll<HTMLButtonElement>('footer button')).find(
      (button) => button.textContent?.trim() === 'Pause living identity',
    )!;
    const identity = fixture.debugElement.query(By.directive(Bedlam)).componentInstance as Bedlam;
    control.click();
    fixture.detectChanges();
    expect(identity.paused()).toBe(true);
    control.click();
    fixture.detectChanges();
    expect(identity.paused()).toBe(false);
    expect(root.querySelector('header button[aria-label="Pause living identity"]')).toBeNull();
  });

  it('should render routed content inside the application landmarks', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const skipLink = compiled.querySelector<HTMLAnchorElement>('.skip-link');
    const main = compiled.querySelector('main');

    expect(skipLink?.getAttribute('href')).toBe('#main-content');
    expect(compiled.querySelectorAll('header')).toHaveLength(1);
    expect(compiled.querySelectorAll('main')).toHaveLength(1);
    expect(compiled.querySelectorAll('footer')).toHaveLength(1);
    expect(main?.id).toBe('main-content');
    expect(main?.getAttribute('tabindex')).toBe('-1');
    expect(main?.querySelector('app-home')).not.toBeNull();
    expect(main?.querySelector('app-home > h1')?.textContent).toBe('D. James Poer');
    expect(main?.querySelector('app-carousel')).not.toBeNull();
    expect(main?.querySelector('app-carousel .carousel__indicators')).toBeNull();
    expect(main?.querySelectorAll('app-carousel .carousel__controls button')).toHaveLength(3);
    const slides = Array.from(main?.querySelectorAll('.carousel__slide') ?? []);
    expect(slides.length).toBeGreaterThan(0);
    const positions = slides.map((slide) =>
      Number(slide.getAttribute('aria-label')?.match(/^Slide (\d+) of (\d+): \S/)?.[1]),
    );
    expect([...positions].sort((x, y) => x - y)).toEqual(slides.map((_, index) => index + 1));
    expect(main?.querySelector('.carousel')?.getAttribute('aria-label')).toBe(
      'Portfolio Perspectives',
    );
    for (const slide of slides) {
      expect(slide.querySelector('h1')).toBeNull();
    }
    main?.querySelectorAll('[aria-labelledby]').forEach((element) => {
      for (const id of element.getAttribute('aria-labelledby')!.split(/\s+/)) {
        expect(document.getElementById(id)).not.toBeNull();
      }
    });
    const ids = Array.from(compiled.querySelectorAll('[id]'), (element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(compiled.querySelector('app-page + app-footer')).not.toBeNull();
    expect(document.title).toContain('D. James Poer');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://djamespoer.com/',
    );
  });

  it('should return to Home and its metadata from the site-name link', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/engineering');
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLAnchorElement>('.site-header__home')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/');
    expect(compiled.querySelector('main app-carousel')).not.toBeNull();
    expect(compiled.querySelector('.site-header__home')?.getAttribute('aria-current')).toBe('page');
    expect(document.title).toContain('D. James Poer');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()).toBeTruthy();
  });

  it.each([
    { path: '/work/exl', heading: 'EXL / LifePRO' },
    { path: '/work/ips', heading: 'Indianapolis Public Schools' },
    { path: '/work/tcc', heading: 'TCC Software Solutions' },
    { path: '/work/dr', heading: 'Dreyer & Reinbold' },
    { path: '/about', heading: 'About' },
  ])('renders $path within the existing shell and applies metadata', async ({ path, heading }) => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl(path);
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('main')).toHaveLength(1);
    expect(root.querySelectorAll('header')).toHaveLength(1);
    expect(root.querySelectorAll('footer')).toHaveLength(1);
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelector('main h1')?.textContent?.trim()).toBeTruthy();
    expect(root.querySelector('.skip-link')?.getAttribute('href')).toBe('#main-content');
    expect(document.title).toContain('D. James Poer');
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `https://djamespoer.com${path}`,
    );
  });

  it('canonicalizes route content without tracking parameters or fragments across navigation', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/work/tcc?utm_source=test#impact');
    await fixture.whenStable();
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://djamespoer.com/work/tcc',
    );
    await router.navigateByUrl('/work/exl');
    await fixture.whenStable();
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://djamespoer.com/work/exl',
    );
  });

  it.each(proofPages)(
    'should render $path through the shared page shell',
    async ({ path, heading }) => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      await TestBed.inject(Router).navigateByUrl(path);
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const main = compiled.querySelector('main');
      const activeLink = compiled.querySelector<HTMLAnchorElement>(
        `.site-header__nav-link[href="${path}"]`,
      );

      expect(compiled.querySelectorAll('main')).toHaveLength(1);
      expect(main?.querySelectorAll('h1')).toHaveLength(1);
      expect(main?.querySelector('h1')?.textContent?.trim()).toBe(heading);
      expect(main?.querySelector('app-proof-page')).not.toBeNull();
      const artwork = main?.querySelector<HTMLImageElement>('app-proof-page img');
      if (path === '/engineering') {
        expect(main?.querySelector('app-perspective-slide h1')).not.toBeNull();
        expect(main?.querySelector('app-perspective-candidate')).toBeNull();
        expect(main?.querySelector('app-case-study [href="/work"]')).toBeNull();
        expect(main?.textContent).toContain('Build it. Test it. Ship it. Verify it.');
        expect(main?.querySelectorAll('h2').length).toBeGreaterThan(5);
      }
      if (path === '/ux-product') {
        expect(main?.querySelector('app-perspective-slide h1')).not.toBeNull();
        expect(main?.querySelector('app-perspective-candidate')).toBeNull();
        expect(main?.querySelector('app-case-study [href="/work"]')).toBeNull();
        expect(main?.textContent).toContain('The product carried the complexity.');
        expect(main?.querySelectorAll('h2')).toHaveLength(13);
        expect(main?.querySelectorAll('app-case-study p')).toHaveLength(77);
      }
      if (path === '/accessibility') {
        expect(main?.querySelector('app-perspective-slide h1')).not.toBeNull();
        expect(main?.querySelector('app-perspective-candidate')).toBeNull();
        expect(main?.querySelector('app-case-study [href="/work"]')).toBeNull();
        expect(main?.textContent).toContain('internal tcc-primeng library');
        expect(main?.querySelectorAll('h2')).toHaveLength(14);
        expect(main?.querySelectorAll('app-case-study p')).toHaveLength(94);
      }
      if (path === '/ai') {
        expect(main?.querySelector('app-perspective-slide h1')).not.toBeNull();
        expect(main?.querySelector('app-perspective-candidate')).toBeNull();
        expect(main?.querySelector('app-case-study [href="/work"]')).toBeNull();
        expect(main?.textContent).toContain(
          'It is human-directed, AI-amplified product development.',
        );
        expect(main?.querySelectorAll('h2')).toHaveLength(13);
        expect(main?.querySelectorAll('app-case-study p')).toHaveLength(114);
      }
      if (path === '/impact') {
        expect(main?.querySelector('app-perspective-slide h1')).not.toBeNull();
        expect(main?.querySelector('.candidate__copy')).toBeNull();
        expect(main?.querySelector('app-case-study [href="/work"]')).toBeNull();
        expect(main?.querySelectorAll('h2')).toHaveLength(6);
        expect(main?.textContent).toContain('More than twelve years later');
        expect(main?.textContent).toContain('Leave something better behind.');
      }
      if (path === '/creative') {
        expect(main?.querySelectorAll('h2')).toHaveLength(10);
        expect(main?.querySelectorAll('app-case-study p')).toHaveLength(44);
        expect(main?.textContent).toContain('Useful should not have to mean forgettable.');
        expect(main?.querySelector('app-case-study [href="/work"]')).toBeNull();
        expect(artwork?.alt?.trim()).toBeTruthy();
      } else {
        expect(artwork?.getAttribute('src')).toContain('/assets/perspectives/overnight/');
        expect(main?.querySelectorAll('h1')).toHaveLength(1);
        expect(main?.querySelector('app-perspective-slide a')).toBeNull();
      }
      expect(activeLink?.getAttribute('aria-current')).toBe('page');
      expect(document.title).toContain('D. James Poer');
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
        `https://djamespoer.com${path}`,
      );
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()).toBeTruthy();
    },
  );
});
