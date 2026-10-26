import { TestBed } from '@angular/core/testing';
import { RigbyGreeting } from './rigby-greeting';
import { HiddenCookie } from './hidden-cookie';
import { RigbyPreferences } from '../cookie-preferences/rigby-preferences';
import { CookieHuntService } from './cookie-hunt.service';

describe('Rigby greeting choices', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('celebrates play once, announces the invitation, then closes', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(RigbyGreeting);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const dialog = root.querySelector('dialog')!;
    dialog.close = vi.fn();
    expect(root.querySelector('h2')?.textContent).toBe("Hi! I'm Rigby Decaf Poer!!!");
    const play = root.querySelector<HTMLButtonElement>('.play')!;
    expect(play.textContent).toContain('Do you want to play with me?');
    play.click();
    fixture.detectChanges();
    expect(TestBed.inject(RigbyPreferences).enabled()).toBe(true);
    expect(play.disabled).toBe(true);
    expect(root.querySelector('[role="status"]')?.textContent).toBe("Let's go find some cookies!");
    expect(root.querySelector('.hello-stage')?.classList.contains('excited')).toBe(true);
    expect(dialog.close).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1800);
    expect(dialog.close).toHaveBeenCalledOnce();
  });

  it('hides Rigby on Maybe later and cancels any pending celebration', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(RigbyGreeting);
    fixture.detectChanges();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    dialog.close = vi.fn();
    fixture.componentInstance.startPlaying();
    fixture.componentInstance.maybeLater();
    expect(TestBed.inject(RigbyPreferences).enabled()).toBe(false);
    expect(localStorage.getItem('rigby.enabled.v1')).toBe('off');
    vi.advanceTimersByTime(1800);
    expect(dialog.close).toHaveBeenCalledOnce();
  });

  it('keeps cookies available while hidden and reopens greeting without collecting or opting in', () => {
    const fixture = TestBed.createComponent(HiddenCookie);
    fixture.detectChanges();
    const rigby = TestBed.inject(RigbyPreferences);
    rigby.setEnabled(false);
    const cookie: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(cookie).toBeTruthy();
    cookie.click();
    expect(rigby.greetingRequest()).toBe(1);
    expect(rigby.enabled()).toBe(false);
    expect(TestBed.inject(CookieHuntService).count()).toBe(0);
  });
});
