import { provideRouter } from '@angular/router';
import { PREFERENCE_COOKIE } from '../../features/cookie-preferences/preferences';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Footer } from './footer';

describe('Footer', () => {
  let component: Footer;
  let fixture: ComponentFixture<Footer>;

  afterEach(() => {
    document.cookie = PREFERENCE_COOKIE + '=; Path=/; Max-Age=0';
  });
  beforeEach(async () => {
    document.cookie = PREFERENCE_COOKIE + '=1.0; Path=/';
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Footer);
    component = fixture.componentInstance;
    await fixture.whenStable();
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
      'Cookie settings',
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
