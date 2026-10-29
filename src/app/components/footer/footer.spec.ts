import { ThemeState } from '../../services/theme-state';
import { livingFrame, livingLocalElapsed } from '../../services/living-theme-clock';
import { provideRouter } from '@angular/router';
import { PREFERENCE_COOKIE } from '../../features/cookie-preferences/preferences';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Footer } from './footer';

describe('Footer', () => {
  let component: Footer;
  let fixture: ComponentFixture<Footer>;

  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = PREFERENCE_COOKIE + '=; Path=/; Max-Age=0';
  });
  beforeEach(async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }));
    document.cookie = PREFERENCE_COOKIE + '=1.0; Path=/';
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Footer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('offers global theme selection beside Cookie Jar through the footer disclosure with an accessible current state', () => {
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
    expect(options.at(-1)?.getAttribute('aria-pressed')).toBe('true');
    options.forEach((option, index) => {
      if (list.hidden) {
        trigger.click();
        fixture.detectChanges();
      }
      option.click();
      fixture.detectChanges();
      expect(document.documentElement.getAttribute('data-theme')).toBe(
        state.availableThemes[index].id === 'dusk-to-dusk'
          ? livingFrame(livingLocalElapsed(new Date())).from
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
  it('preserves the native Accessibility disclosure with shared button styling', () => {
    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector<HTMLButtonElement>('button')!;
    expect(button.type).toBe('button');
    expect(button.textContent).toContain('Committed to Accessibility');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('#accessibility-statement')).not.toBeNull();
    button.click();
    fixture.detectChanges();
    expect(root.querySelector('#accessibility-statement')).toBeNull();
  });

  it('keeps persistent cookie controls in the shared footer', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.site-footer__cookies button')?.textContent?.trim()).toBe(
      'Cookie Jar',
    );
    expect(root.querySelector('.site-footer__cookies a')?.getAttribute('href')).toBe(
      '/cookie-policy',
    );
    // The app shell owns the immediate first-visit prompt independently of footer hydration.
    expect(root.querySelectorAll('app-cookie-preferences')).toHaveLength(0);
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('offers a native pause/play action outside the header', () => {
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    );
    const control = buttons.find(
      (button) => button.textContent?.trim() === 'Pause living identity',
    )!;
    expect(control.type).toBe('button');
    control.click();
    fixture.detectChanges();
    expect(component.identityPaused()).toBe(true);
    expect(control.textContent?.trim()).toBe('Play living identity');
    control.click();
    fixture.detectChanges();
    expect(component.identityPaused()).toBe(false);
  });
});
