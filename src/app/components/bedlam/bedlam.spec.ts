import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Bedlam } from './bedlam';
import { bedlamThemePalette, createBedlam } from './engine';
describe('seeded Bedlam recipe', () => {
  it('repeats identical inputs and distinguishes seeds and instance configurations', () => {
    const a = createBedlam(bedlamThemePalette, 'one');
    expect(createBedlam(bedlamThemePalette, 'one')).toEqual(a);
    expect(createBedlam(bedlamThemePalette, 'two')).not.toEqual(a);
    expect(
      createBedlam(bedlamThemePalette, 'one', { symmetry: 1, density: 1, depth: 0 }),
    ).not.toEqual(a);
    expect(a.some((layer) => layer.kind === 'particles')).toBe(false);
  });
  it('toggles modules without changing retained slots and bounds particles/numerical inputs', () => {
    const a = createBedlam(bedlamThemePalette, 42);
    expect(createBedlam(bedlamThemePalette, 42, { layers: { rings: false } })).toEqual(
      a.filter((x) => x.kind !== 'rings'),
    );
    const extreme = createBedlam(bedlamThemePalette, 42, {
      particles: true,
      particleCount: 10000,
      density: 100,
      scale: Infinity,
      turbulence: NaN,
      positionX: 900,
    });
    expect(extreme.filter((x) => x.kind === 'particles')).toHaveLength(24);
    expect(JSON.stringify(extreme)).not.toMatch(/NaN|Infinity/);
    expect(extreme.length).toBeLessThanOrEqual(32);
  });
  it('accepts distinct palettes while rejecting non-color CSS payloads', () => {
    expect(
      createBedlam({ primary: '#ff9900', secondary: '#33bbff', accent: '#fff' }, 1),
    ).not.toEqual(createBedlam(bedlamThemePalette, 1));
    expect(() =>
      createBedlam({ ...bedlamThemePalette, primary: 'url(https://example.com)' }, 1),
    ).toThrow();
  });
});
describe('Bedlam presentation', () => {
  it('renders decorative 2D layers and preserves the canonical identity without canvas', () => {
    const f = TestBed.createComponent(Bedlam);
    f.detectChanges();
    expect(f.nativeElement.querySelector('canvas')).toBeNull();
    expect(f.nativeElement.querySelectorAll('.bedlam__layer').length).toBe(6);
    expect(f.nativeElement.querySelector('.bedlam').getAttribute('aria-hidden')).toBe('true');
    expect(f.nativeElement.querySelector('.bedlam__mask')).not.toBeNull();
    f.componentInstance.paused.set(true);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.bedlam').style.getPropertyValue('--bedlam-motion')).toBe(
      'paused',
    );
    f.destroy();
  });
  it('keeps instances independent and regenerates only for recipe input changes', () => {
    const a = TestBed.createComponent(Bedlam),
      b = TestBed.createComponent(Bedlam);
    a.detectChanges();
    b.detectChanges();
    const original = b.componentInstance.layers();
    a.componentRef.setInput('seed', 'independent');
    a.componentRef.setInput('config', { particles: true, particleCount: 3 });
    a.detectChanges();
    expect(a.componentInstance.layers()).not.toEqual(original);
    expect(b.componentInstance.layers()).toBe(original);
    b.componentInstance.paused.set(true);
    b.detectChanges();
    expect(b.componentInstance.layers()).toBe(original);
    a.destroy();
    b.destroy();
  });
});
