import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { PageMetadataStrategy } from './services/page-metadata-strategy';

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
    expect(main?.querySelector('app-carousel')).not.toBeNull();
    expect(main?.querySelectorAll('.carousel__slide')).toHaveLength(6);
    expect(compiled.querySelector('app-page + app-footer')).not.toBeNull();
    expect(document.title).toBe('D. James Poer | UX Engineer & Front-End Architect');
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
      expect(activeLink?.getAttribute('aria-current')).toBe('page');
      expect(document.title).toBe(`${heading} | D. James Poer`);
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
        `${heading} proof-of-value page`,
      );
    },
  );
});
