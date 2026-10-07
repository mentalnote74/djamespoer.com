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

  it('uses native disclosure buttons, exclusive sections and Escape focus recovery', () => {
    const root = fixture.nativeElement as HTMLElement;
    const work = root.querySelector<HTMLButtonElement>('[aria-controls="work-navigation"]')!;
    const perspectives = root.querySelector<HTMLButtonElement>(
      '[aria-controls="perspectives-navigation"]',
    )!;
    const list = root.querySelector<HTMLUListElement>('#work-navigation')!;
    expect(list.hidden).toBe(true);
    work.click();
    fixture.detectChanges();
    expect(work.getAttribute('aria-expanded')).toBe('true');
    expect(list.hidden).toBe(false);
    perspectives.click();
    fixture.detectChanges();
    expect(list.hidden).toBe(true);
    perspectives.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(component.openSection()).toBeNull();
    expect(document.activeElement).toBe(perspectives);
    expect(root.querySelector('[role="menu"]')).toBeNull();
  });

  it('closes a disclosure when focus leaves navigation', () => {
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('[aria-controls="work-navigation"]')!.click();
    fixture.detectChanges();
    root.querySelector('nav')!.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: root.querySelector('.site-header__home'),
      }),
    );
    fixture.detectChanges();
    expect(component.openSection()).toBeNull();
  });

  it('supports mobile menu state and nested disclosure without viewport JavaScript', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const menu = root.querySelector<HTMLButtonElement>('.site-header__menu')!;
    menu.click();
    fixture.detectChanges();
    expect(menu.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('nav')?.classList.contains('site-header__nav--open')).toBe(true);
    root.querySelector<HTMLButtonElement>('[aria-controls="work-navigation"]')!.click();
    fixture.detectChanges();
    expect(component.openSection()).toBe('work');
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(component.mobileOpen()).toBe(true);
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(component.mobileOpen()).toBe(false);
    expect(document.activeElement).toBe(menu);
    menu.click();
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/work');
    fixture.detectChanges();
    expect(component.mobileOpen()).toBe(false);
  });

  it('has unique control targets and marks the exact Work route current', async () => {
    await TestBed.inject(Router).navigateByUrl('/work/exl');
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const ids = Array.from(root.querySelectorAll('[id]'), (element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    root.querySelectorAll('[aria-controls]').forEach((button) => {
      expect(root.querySelector(`#${button.getAttribute('aria-controls')}`)).not.toBeNull();
    });
    expect(root.querySelector('[href="/work/exl"]')?.getAttribute('aria-current')).toBe('page');
    expect(root.querySelector('[href="/work"]')?.hasAttribute('aria-current')).toBe(false);
  });

  it('names the icon-only menu toggle and hides the decorative SVG from assistive technology', () => {
    const root = fixture.nativeElement as HTMLElement;
    const menu = root.querySelector<HTMLButtonElement>('.site-header__menu')!;
    expect(menu.getAttribute('aria-label')).toBe('Menu');
    expect(menu.textContent?.trim()).toBe('');
    expect(menu.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(menu.querySelector('svg')?.getAttribute('focusable')).toBe('false');
    expect(root.querySelectorAll('#primary-navigation')).toHaveLength(1);
  });

  it('uses the plain ASCII Resume label for the existing download', () => {
    const root = fixture.nativeElement as HTMLElement;
    const resume = root.querySelector<HTMLAnchorElement>('a[download]');
    expect(resume?.textContent?.trim()).toBe('Resume');
    expect(resume?.getAttribute('href')).toBe('/assets/resume/d-james-poer-resume.pdf');
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
      navigation?.querySelectorAll<HTMLAnchorElement>('#perspectives-navigation a') ?? [],
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
