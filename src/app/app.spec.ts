import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { App } from './app';
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
  afterEach(() => {
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
    expect(main?.querySelector('app-hero')).not.toBeNull();
    expect(main?.querySelector('.hero .visually-hidden')?.firstElementChild?.tagName).toBe('H1');
    expect(main?.querySelectorAll('app-deployment-history')).toHaveLength(1);
    expect(
      main?.querySelector('app-home > app-hero + section.home-history + app-carousel'),
    ).not.toBeNull();
    expect(main?.querySelector('app-hero app-deployment-history')).toBeNull();
    expect(main?.querySelector('.hero__updated')?.textContent).toContain('Last updated:');
    expect(main?.querySelector('.home-history')?.getAttribute('aria-labelledby')).toBe(
      'build-deployment-history-heading',
    );
    expect(main?.querySelector('#build-deployment-history-heading')?.textContent).toBe(
      'Build & Deployment History',
    );
    const request = TestBed.inject(HttpTestingController).expectOne(
      '/data/deployment-history.json',
    );
    request.flush(
      JSON.stringify({
        schemaVersion: 4,
        checkedAt: '2026-10-06T16:08:56.989Z',
        generatedAt: '2026-10-06T16:08:56.989Z',
        refreshStatus: 'ok',
        rows: [],
      }),
    );
    fixture.detectChanges();
    expect(main?.querySelector('caption')?.textContent?.trim()).toBe('Pipeline attempts');
    expect(main?.querySelector('app-carousel')).not.toBeNull();
    expect(main?.querySelector('app-carousel .carousel__indicators')).toBeNull();
    expect(main?.querySelectorAll('app-carousel .carousel__controls button')).toHaveLength(3);
    expect(main?.querySelectorAll('.carousel__slide')).toHaveLength(6);
    expect(compiled.querySelector('app-page + app-footer')).not.toBeNull();
    expect(document.title).toBe('D. James Poer | UX Engineer & Front-End Architect');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://djamespoer.com/',
    );
  });

  it('should return to the Hero and Home metadata from the site-name link', async () => {
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
    expect(compiled.querySelector('main app-hero')).not.toBeNull();
    expect(compiled.querySelector('main app-carousel')).not.toBeNull();
    expect(compiled.querySelector('.site-header__home')?.getAttribute('aria-current')).toBe('page');
    expect(document.title).toBe('D. James Poer | UX Engineer & Front-End Architect');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
      'UX Engineer and Front-End Architect',
    );
  });

  it.each([
    { path: '/work', heading: 'Work' },
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
    expect(root.querySelector('main h1')?.textContent).toBe(heading);
    expect(root.querySelector('.skip-link')?.getAttribute('href')).toBe('#main-content');
    expect(document.title).toBe(`${heading} | D. James Poer`);
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
        expect(main?.querySelector('app-perspective-candidate')).not.toBeNull();
        expect(main?.querySelector('app-perspective-candidate .candidate__copy')).toBeNull();
        expect(main?.querySelector('app-case-study [href="/work"]')).toBeNull();
        expect(main?.textContent).toContain('Build it. Test it. Ship it. Verify it.');
        expect(main?.querySelectorAll('h2').length).toBeGreaterThan(5);
      }
      if (path === '/ux-product') {
        expect(
          main?.querySelector('app-perspective-candidate [data-theme="journey"]'),
        ).not.toBeNull();
        expect(main?.querySelector('app-perspective-candidate .candidate__copy')).toBeNull();
        expect(main?.querySelector('app-case-study [href="/work"]')).toBeNull();
        expect(main?.textContent).toContain('The product carried the complexity.');
        expect(main?.querySelectorAll('h2')).toHaveLength(13);
        expect(main?.querySelectorAll('app-case-study p')).toHaveLength(76);
      }
      if (path === '/accessibility') {
        expect(
          main?.querySelector('app-perspective-candidate [data-theme="open-door"]'),
        ).not.toBeNull();
        expect(main?.querySelector('app-perspective-candidate .candidate__copy')).toBeNull();
        expect(main?.querySelector('app-case-study [href="/work"]')).toBeNull();
        expect(main?.textContent).toContain('internal tcc-primeng library');
        expect(main?.querySelectorAll('h2')).toHaveLength(14);
        expect(main?.querySelectorAll('app-case-study p')).toHaveLength(93);
      }
      if (path === '/creative') {
        expect(artwork?.getAttribute('src')).toBe('/assets/perspectives/SCRUM-64-Larry-V2-C.png');
        expect(artwork?.width).toBe(2172);
        expect(artwork?.height).toBe(724);
        expect(artwork?.alt).toContain('interconnected autobiographical scenes');
      } else {
        expect(artwork).toBeNull();
      }
      expect(activeLink?.getAttribute('aria-current')).toBe('page');
      expect(document.title).toBe(`${heading} | D. James Poer`);
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
        `https://djamespoer.com${path}`,
      );
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
        path === '/engineering'
          ? 'Engineering perspective'
          : path === '/ux-product'
            ? 'UX & Product perspective'
            : path === '/accessibility'
              ? 'Accessibility perspective'
              : `${heading} proof-of-value page`,
      );
    },
  );
});
