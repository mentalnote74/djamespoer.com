import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';
import { Header } from './header';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter(routes)],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the approved primary navigation and utility link', async () => {
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const navigation = compiled.querySelector<HTMLElement>('nav[aria-label="Primary"]');
    const home = compiled.querySelector<HTMLAnchorElement>('.site-header__home');
    const navigationLinks = Array.from(
      navigation?.querySelectorAll<HTMLAnchorElement>('.site-header__nav-link') ?? [],
    );
    const linkedin = compiled.querySelector<HTMLAnchorElement>(
      '.site-header__utility a[href="https://www.linkedin.com/in/djamespoer"]',
    );

    expect(home?.textContent?.trim()).toBe('D. James Poer');
    expect(home?.getAttribute('href')).toBe('/');
    expect(home?.getAttribute('aria-current')).toBe('page');
    expect(navigation?.contains(home ?? null)).toBe(false);
    expect(navigationLinks.map((link) => link.textContent?.trim())).toEqual([
      'Engineering',
      'UX & Product',
      'Accessibility',
      'AI & Innovation',
      'Creative',
      'Impact',
    ]);
    expect(navigationLinks.map((link) => link.getAttribute('href'))).toEqual([
      '/engineering',
      '/ux-product',
      '/accessibility',
      '/ai',
      '/creative',
      '/impact',
    ]);
    expect(linkedin).not.toBeNull();
    expect(navigation?.contains(linkedin ?? null)).toBe(false);
    expect(linkedin?.getAttribute('target')).toBe('_blank');
    expect(linkedin?.getAttribute('rel')).toBe('noopener noreferrer');

    await TestBed.inject(Router).navigateByUrl('/engineering');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(home?.hasAttribute('aria-current')).toBe(false);
    expect(navigationLinks[0]?.getAttribute('aria-current')).toBe('page');
  });
});
