import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';
import { Header } from './header';
import { ThemeState } from '../../services/theme-state';

describe('Header', () => {
  it('keeps Work restricted to employment history and makes project case studies available separately', () => {
    expect(component.work.map((link) => link.path)).toEqual([
      '/work/exl',
      '/work/ips',
      '/work/tcc',
      '/work/dr',
    ]);
    expect(component.caseStudies.map((link) => link.path)).toEqual([
      '/work/djamespoer',
      '/thingamajob',
      ...component.work.map((link) => link.path.replace('/work/', '/case-studies/')),
    ]);
  });
  it('offers Thingamajob under Case Studies with a current-page state', async () => {
    await TestBed.inject(Router).navigateByUrl('/thingamajob');
    fixture.detectChanges();
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '#case-studies-navigation a[href="/thingamajob"]',
    );
    expect(link?.textContent?.trim()).toBe('Thingamajob');
    expect(link?.getAttribute('aria-current')).toBe('page');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        'nav[aria-label="Primary"] > ul > li > a[href="/thingamajob"]',
      ),
    ).toBeNull();
  });
  it('offers global theme selection through the shared disclosure with an accessible current state', () => {
    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector<HTMLButtonElement>('[aria-controls="theme-navigation"]')!;
    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const list = root.querySelector<HTMLUListElement>('#theme-navigation')!;
    expect(list.hidden).toBe(false);
    const options = Array.from(list.querySelectorAll('button'));
    const state = TestBed.inject(ThemeState);
    expect(options.map((option) => option.textContent?.trim())).toEqual(
      state.availableThemes.map((theme) => theme.label),
    );
    expect(list.querySelector('[disabled]')).toBeNull();
    expect(options.every((option) => option.classList.contains('nav-menu-button'))).toBe(true);
    expect(trigger.classList.contains('nav-menu-button')).toBe(false);
    expect(options[0].getAttribute('aria-pressed')).toBe('true');
    options.forEach((option, index) => {
      if (list.hidden) {
        trigger.click();
        fixture.detectChanges();
      }
      option.click();
      fixture.detectChanges();
      expect(document.documentElement.getAttribute('data-theme')).toBe(
        state.availableThemes[index].id === 'dusk-to-dusk'
          ? 'tequila-sunset'
          : state.availableThemes[index].id,
      );
      expect(option.getAttribute('aria-pressed')).toBe('true');
      expect(list.hidden).toBe(true);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(trigger);
      expect(trigger.isContentEditable).not.toBe(true);
      expect(trigger.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(
        options.filter((button) => button.getAttribute('aria-pressed') === 'true'),
      ).toHaveLength(1);
    });
    options[0].click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('teetotaler');
    trigger.click();
    fixture.detectChanges();
    options[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(list.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
    expect(root.querySelector('[role="menu"]')).toBeNull();
  });
  it('orders About, Work and Perspectives and preserves About destinations', async () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(
      Array.from(root.querySelectorAll('.site-header__nav-list > li > button'), (button) =>
        button.textContent?.trim(),
      ),
    ).toEqual(['About', 'Work', 'Case Studies', 'Perspectives', 'Blognostisphere', 'Theme']);
    const about = root.querySelector<HTMLButtonElement>('[aria-controls="about-navigation"]')!;
    const list = root.querySelector<HTMLUListElement>('#about-navigation')!;
    expect(list.hidden).toBe(true);
    about.click();
    fixture.detectChanges();
    expect(about.getAttribute('aria-expanded')).toBe('true');
    expect(list.hidden).toBe(false);
    const links = Array.from(list.querySelectorAll('a'));
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'About',
      'Resume',
      'Contact',
      'LinkedIn',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/about',
      '/assets/resume/d-james-poer-resume.pdf',
      'mailto:djamespoer@djamespoer.com',
      'https://www.linkedin.com/in/djamespoer',
    ]);
    about.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(list.hidden).toBe(true);
    expect(document.activeElement).toBe(about);
    await TestBed.inject(Router).navigateByUrl('/about');
    fixture.detectChanges();
    expect(links[0].getAttribute('aria-current')).toBe('page');
  });
  it('places the current project first among case studies and keeps its destination consistent', async () => {
    await TestBed.inject(Router).navigateByUrl('/work/djamespoer');
    await fixture.whenStable();
    fixture.detectChanges();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>(
        '#case-studies-navigation a',
      ),
    );
    expect(links.map((link) => link.getAttribute('href')).slice(0, 2)).toEqual([
      '/work/djamespoer',
      '/thingamajob',
    ]);
    expect(links[0].textContent?.trim()).toBe('djamespoer.com');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/work/djamespoer',
      '/thingamajob',
      '/case-studies/exl',
      '/case-studies/ips',
      '/case-studies/tcc',
      '/case-studies/dr',
    ]);
    expect(links[0].getAttribute('aria-current')).toBe('page');
  });
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
    await TestBed.inject(Router).navigateByUrl('/work/tcc');
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
    expect(root.querySelector('[href="/work"]')).toBeNull();
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

  it('uses the ASCII Resume label for the existing download', () => {
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
      '#about-navigation a[href="https://www.linkedin.com/in/djamespoer"]',
    );

    expect(home?.textContent?.trim()).toBe('djamespoer.com');
    expect(home?.getAttribute('aria-label')).toBe('djamespoer.com — Home');
    expect(home?.getAttribute('href')).toBe('/');
    expect(compiled.querySelector('[aria-label="Pause living identity"]')).toBeNull();
    expect(navigation?.querySelector('a[href="/"]')).toBeNull();
    expect(home?.querySelector('app-bedlam')).not.toBeNull();
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
    expect(navigation?.contains(linkedin ?? null)).toBe(true);
    expect(linkedin?.getAttribute('target')).toBe('_blank');
    expect(linkedin?.getAttribute('rel')).toBe('noopener noreferrer');

    await TestBed.inject(Router).navigateByUrl('/engineering');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(home?.hasAttribute('aria-current')).toBe(false);
    expect(navigationLinks[0]?.getAttribute('aria-current')).toBe('page');
  });
});
