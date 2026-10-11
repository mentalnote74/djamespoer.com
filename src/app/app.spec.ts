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
  it('places the construction-site copy between carousel and history', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const section = root.querySelector('.home-construction')!;
    expect(section.previousElementSibling?.tagName).toBe('APP-CAROUSEL');
    expect(section.nextElementSibling?.classList.contains('home-history')).toBe(true);
    expect(section.querySelector('h2')?.textContent).toBe('Pardon the dust.');
    expect(
      Array.from(section.querySelectorAll('strong')).map((item) => item.textContent?.trim()),
    ).toEqual([
      "You're standing in the middle of a working construction site. On purpose.",
      "That's the point. You're not just looking at what I built. You're watching how I build.",
    ]);
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
    expect(main?.querySelector('app-hero')).not.toBeNull();
    expect(main?.querySelector('app-home > h1')?.textContent).toBe('D. James Poer');
    expect(main?.querySelectorAll('app-deployment-history')).toHaveLength(1);
    expect(
      main?.querySelector(
        'app-home > app-carousel + section.home-construction + section.home-history',
      ),
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
    expect(main?.querySelectorAll('.carousel__slide')).toHaveLength(7);
    const slides = Array.from(main?.querySelectorAll('.carousel__slide') ?? []);
    expect(slides.map((slide) => slide.getAttribute('aria-label'))).toEqual([
      'Slide 1 of 7: Under Construction / djamespoer.com',
      'Slide 2 of 7: Engineering',
      'Slide 3 of 7: UX & Product',
      'Slide 4 of 7: Accessibility',
      'Slide 5 of 7: AI & Innovation',
      'Slide 6 of 7: Creative',
      'Slide 7 of 7: Impact',
    ]);
    expect(main?.querySelector('app-home > app-hero')).toBeNull();
    expect(main?.querySelector('app-home > :last-child')?.classList.contains('home-history')).toBe(
      true,
    );
    expect(slides[0].querySelector('.hero__scene')?.getAttribute('src')).toBe(
      '/images/tiny/construction-master.webp',
    );
    expect(slides[0].querySelector('a[href="/"]')?.textContent?.trim()).toBe(
      'djamespoer.com — Home',
    );
    expect(main?.querySelector('.carousel__position')?.textContent?.trim()).toBe('Slide 1 of 7');
    expect(main?.querySelector('.carousel')?.getAttribute('aria-label')).toBe(
      'Portfolio Perspectives',
    );
    for (const slide of slides) {
      expect(slide.querySelector('h2')).not.toBeNull();
      expect(slide.querySelector('h3')).toBeNull();
    }
    main?.querySelectorAll('[aria-labelledby]').forEach((element) => {
      for (const id of element.getAttribute('aria-labelledby')!.split(/\s+/)) {
        expect(document.getElementById(id)).not.toBeNull();
      }
    });
    const creative = main?.querySelector<HTMLImageElement>('img.home-creative');
    expect(creative?.getAttribute('srcset')).toMatch(/creative-600\.webp\s+600w/);
    expect(creative?.getAttribute('sizes')).toContain('1152px');
    expect(creative?.getAttribute('loading')).toBe('lazy');
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
      if (path === '/ai') {
        expect(
          main?.querySelector('app-perspective-candidate [data-theme="signal"]'),
        ).not.toBeNull();
        expect(main?.querySelector('app-perspective-candidate .candidate__copy')).toBeNull();
        expect(main?.querySelector('app-case-study [href="/work"]')).toBeNull();
        expect(main?.textContent).toContain(
          'It is human-directed, AI-amplified product development.',
        );
        expect(main?.querySelectorAll('h2')).toHaveLength(13);
        expect(main?.querySelectorAll('app-case-study p')).toHaveLength(113);
      }
      if (path === '/impact') {
        expect(
          main?.querySelector('app-perspective-candidate [data-theme="outcomes"]'),
        ).not.toBeNull();
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
        expect(artwork?.getAttribute('src')).toBe('/assets/perspectives/creative-2172.webp');
        expect(artwork?.getAttribute('srcset')).toContain('creative-600.webp 600w');
        expect(artwork?.getAttribute('srcset')).toContain('creative-2172.webp 2172w');
        expect(artwork?.getAttribute('sizes')).toContain('1280px');
        expect(artwork?.getAttribute('fetchpriority')).toBe('high');
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
              : path === '/ai'
                ? 'AI & Innovation perspective'
                : path === '/creative'
                  ? 'Creative perspective'
                  : path === '/impact'
                    ? 'Impact perspective'
                    : `${heading} proof-of-value page`,
      );
    },
  );
});
