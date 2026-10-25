import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { PublicAnalytics } from '../../services/public-analytics';
import { RigbyEncounter } from './rigby-encounter';

describe('Rigby first encounter', () => {
  let fixture: ComponentFixture<RigbyEncounter>;
  let rigby: RigbyEncounter;
  const track = vi.fn();
  beforeEach(async () => {
    sessionStorage.clear();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }));
    TestBed.configureTestingModule({
      imports: [RigbyEncounter],
      providers: [provideRouter([]), { provide: PublicAnalytics, useValue: { track } }],
    });
    fixture = TestBed.createComponent(RigbyEncounter);
    fixture.detectChanges();
    await fixture.whenStable();
    rigby = fixture.componentInstance;
    rigby.ready.set(true);
    rigby.inView.set(true);
    rigby.visible.set(true);
    rigby.reduced.set(false);
    rigby.forced.set(false);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    track.mockClear();
    sessionStorage.clear();
  });
  function advance(ms: number) {
    for (let i = 0; i < ms; i += 50) rigby.advance(50);
  }
  it('feeds once without navigation and settles after three bounded pogo bounces', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.feed')?.tagName).toBe('BUTTON');
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/case-studies/tcc');
    rigby.feed();
    advance(200);
    expect(rigby.pose()).toBe('reacting');
    expect(rigby.lift()).toBeLessThan(0);
    expect(rigby.frame()).toBe(1);
    advance(200);
    expect(rigby.frame()).toBe(2);
    advance(1700);
    expect(rigby.pose()).toBe('settled');
    expect(rigby.lift()).toBe(0);
    rigby.feed();
    expect(
      track.mock.calls.filter(([event, p]) => event === 'rigby_encounter' && p.action === 'fed'),
    ).toHaveLength(1);
    expect(sessionStorage.getItem('rigby.first-encounter.v1')).toBe('fed');
  });
  it('freezes pose and vertical position when paused, offscreen or hidden', () => {
    rigby.feed();
    advance(200);
    const before = rigby.elapsed();
    rigby.paused.set(true);
    advance(300);
    expect(rigby.elapsed()).toBe(before);
    rigby.paused.set(false);
    rigby.inView.set(false);
    advance(300);
    expect(rigby.elapsed()).toBe(before);
    rigby.inView.set(true);
    rigby.visible.set(false);
    advance(300);
    expect(rigby.elapsed()).toBe(before);
    rigby.visible.set(true);
    advance(100);
    expect(rigby.elapsed()).toBeGreaterThan(before);
  });
  it('offers the excited still and same feedback with reduced motion', () => {
    rigby.reduced.set(true);
    rigby.feed();
    fixture.detectChanges();
    expect(rigby.pose()).toBe('settled');
    expect(rigby.frame()).toBe(2);
    expect(rigby.lift()).toBe(0);
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toContain(
      'loved that biscuit',
    );
  });
  it('dismisses for this session and places focus on the remaining useful native link', () => {
    rigby.dismiss();
    fixture.detectChanges();
    expect(rigby.dismissed()).toBe(true);
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('a'));
    expect(sessionStorage.getItem('rigby.first-encounter.v1')).toBe('dismissed');
  });
  it('keeps forced-color feeding usable without loading hidden decorative art', () => {
    rigby.ready.set(false);
    rigby.forced.set(true);
    rigby.feed();
    expect(rigby.fed()).toBe(true);
    expect(rigby.pose()).toBe('settled');
    expect(rigby.lift()).toBe(0);
  });
  it('keeps a failed sprite inert while the evidence link remains available', () => {
    rigby.fail();
    rigby.feed();
    fixture.detectChanges();
    expect(rigby.fed()).toBe(false);
    expect(rigby.ready()).toBe(false);
    expect(fixture.nativeElement.querySelector('.feed').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('a')).not.toBeNull();
  });
});
