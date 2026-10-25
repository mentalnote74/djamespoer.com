import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { PublicAnalytics } from '../../services/public-analytics';
import { RigbyEncounter } from './rigby-encounter';
import { along, clearAt, routeBetween } from './rigby-space';

describe('Rigby whitespace loop', () => {
  let fixture: ComponentFixture<RigbyEncounter>, rigby: RigbyEncounter;
  const track = vi.fn();
  beforeEach(async () => {
    sessionStorage.clear();
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    TestBed.configureTestingModule({
      imports: [RigbyEncounter],
      providers: [provideRouter([]), { provide: PublicAnalytics, useValue: { track } }],
    });
    fixture = TestBed.createComponent(RigbyEncounter);
    fixture.detectChanges();
    await fixture.whenStable();
    rigby = fixture.componentInstance;
    rigby.ready.set(true);
    rigby.placed.set(true);
    rigby.visible.set(true);
    rigby.inView.set(true);
    rigby.reduced.set(false);
    rigby.forced.set(false);
    rigby.pose.set('begging');
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
  it('feeds repeatedly, completes exactly three bounces and never turns a biscuit into navigation', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.feed')?.tagName).toBe('BUTTON');
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/case-studies/tcc');
    rigby.feed();
    advance(200);
    expect(rigby.lift()).toBeLessThan(0);
    expect(rigby.frame()).toBe(1);
    advance(200);
    expect(rigby.frame()).toBe(2);
    advance(1700);
    expect(rigby.pose()).toBe('resting');
    expect(rigby.lift()).toBe(0);
    advance(900);
    expect(rigby.canFeed()).toBe(true);
    rigby.feed();
    expect(track.mock.calls.filter(([, p]) => p.action === 'fed')).toHaveLength(2);
    expect(rigby.offer()).toBe(true);
    expect(sessionStorage.getItem('rigby.first-encounter.v1')).toBeNull();
  });
  it('freezes nonessential clocks when paused, offscreen or hidden', () => {
    rigby.feed();
    advance(200);
    const time = rigby.elapsed();
    rigby.paused.set(true);
    advance(200);
    expect(rigby.elapsed()).toBe(time);
    rigby.paused.set(false);
    rigby.inView.set(false);
    advance(200);
    expect(rigby.elapsed()).toBe(time);
    rigby.inView.set(true);
    rigby.visible.set(false);
    advance(200);
    expect(rigby.elapsed()).toBe(time);
    rigby.visible.set(true);
    advance(100);
    expect(rigby.elapsed()).toBe(time + 100);
  });
  it('suppresses activity during form entry and open navigation menus', () => {
    const input = document.createElement('textarea');
    document.body.append(input);
    input.focus();
    rigby.refreshInteraction();
    expect(rigby.busy()).toBe(true);
    expect(rigby.canFeed()).toBe(false);
    input.remove();
    const header = document.createElement('header');
    header.innerHTML = '<button aria-expanded="true">Menu</button>';
    document.body.append(header);
    rigby.refreshInteraction();
    expect(rigby.busy()).toBe(true);
    header.remove();
    rigby.refreshInteraction();
    expect(rigby.busy()).toBe(false);
  });
  it('provides repeatable excited stills for reduced motion and forced colors without hidden-art readiness', () => {
    rigby.reduced.set(true);
    rigby.feed();
    expect(rigby.frame()).toBe(2);
    expect(rigby.lift()).toBe(0);
    expect(rigby.canFeed()).toBe(true);
    rigby.feed();
    expect(rigby.feedback()).toContain('Another biscuit');
    rigby.forced.set(true);
    rigby.ready.set(false);
    rigby.feed();
    expect(rigby.feedback()).toContain('loved');
  });
  it('keeps feeding repeatable as an excited still when motion is explicitly paused', () => {
    rigby.paused.set(true);
    rigby.feed();
    expect(rigby.pose()).toBe('begging');
    expect(rigby.frame()).toBe(2);
    expect(rigby.canFeed()).toBe(true);
    rigby.feed();
    expect(rigby.feedback()).toContain('Another biscuit');
  });
  it('keeps stable keyboard controls in the DOM and dismisses once for the session', () => {
    fixture.detectChanges();
    const pause: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.controls button[aria-pressed]',
    );
    pause.focus();
    rigby.refreshInteraction();
    expect(rigby.held()).toBe(false);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.controls button:last-of-type',
    );
    button.focus();
    rigby.dismiss();
    fixture.detectChanges();
    expect(document.activeElement).toBe(button);
    expect(rigby.canFeed()).toBe(false);
    expect(rigby.shown()).toBe(false);
    expect(sessionStorage.getItem('rigby.first-encounter.v1')).toBe('dismissed');
    rigby.dismiss();
    expect(track.mock.calls.filter(([, p]) => p.action === 'dismissed')).toHaveLength(1);
  });
  it('retains normal navigation when artwork cannot load', () => {
    rigby.fail();
    expect(rigby.canFeed()).toBe(false);
    expect(rigby.feedback()).toContain('could not load');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a')).not.toBeNull();
  });
  it('rejects spots covering text/controls or outside the page', () => {
    const blockers = [{ x: 100, y: 100, width: 80, height: 80 }];
    expect(clearAt({ x: 20, y: 20 }, blockers, 390)).toBe(false);
    expect(clearAt({ x: 200, y: 200 }, blockers, 390)).toBe(true);
    expect(clearAt({ x: 310, y: 200 }, blockers, 390)).toBe(false);
  });
  it('checks complete corridors, rejecting a path that cuts across content', () => {
    expect(
      routeBetween(
        { x: 10, y: 10 },
        { x: 210, y: 10 },
        [{ x: 110, y: 0, width: 20, height: 200 }],
        390,
      ),
    ).toBeNull();
    const path = routeBetween(
      { x: 10, y: 220 },
      { x: 210, y: 220 },
      [{ x: 110, y: 0, width: 20, height: 200 }],
      390,
    );
    expect(path).not.toBeNull();
    expect(along(path!, 1)).toEqual({ x: 210, y: 220 });
  });
});
