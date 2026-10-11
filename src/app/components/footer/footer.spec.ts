import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Footer } from './footer';

describe('Footer', () => {
  let component: Footer;
  let fixture: ComponentFixture<Footer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
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
