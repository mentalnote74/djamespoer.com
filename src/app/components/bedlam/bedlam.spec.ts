import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Bedlam } from './bedlam';
import { bedlamThemePalette, createBedlam } from './engine';
describe('seeded moving material', () => {
  it('is deterministic and distinguishes independent seeds and configuration', () => {
    const a = createBedlam(bedlamThemePalette, 'one');
    expect(createBedlam(bedlamThemePalette, 'one')).toEqual(a);
    expect(createBedlam(bedlamThemePalette, 'two')).not.toEqual(a);
    expect(createBedlam(bedlamThemePalette, 'one', { scale: 2, speed: 2 })).not.toEqual(a);
  });
  it('bounds work and numerical controls and exposes a static fallback', () => {
    const planes = createBedlam(bedlamThemePalette, 42, {
      planes: 100,
      scale: Infinity,
      contrast: NaN,
    });
    expect(planes.length).toBe(3);
    expect(JSON.stringify(planes)).not.toMatch(/NaN|Infinity/);
    expect(createBedlam(bedlamThemePalette, 42, { enabled: false })).toEqual([]);
    expect(new Set(planes.map((p) => p.style['--bedlam-duration'])).size).toBe(3);
  });
  it('rejects non-color CSS payloads', () => {
    expect(() =>
      createBedlam({ ...bedlamThemePalette, primary: 'url(https://example.com)' }, 1),
    ).toThrow();
  });
});
describe('masked material presentation', () => {
  it('renders decorative planes without canvas, SVG filters or generated object geometry', () => {
    const f = TestBed.createComponent(Bedlam);
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('.bedlam__plane').length).toBe(3);
    expect(f.nativeElement.querySelector('canvas, svg')).toBeNull();
    expect(f.nativeElement.querySelector('.bedlam').getAttribute('aria-hidden')).toBe('true');
    expect(f.nativeElement.querySelector('.bedlam__mask')).not.toBeNull();
    expect(f.nativeElement.querySelectorAll('.bedlam__field .bedlam__plane').length).toBe(3);
    expect(f.nativeElement.querySelector('.bedlam__identity .bedlam__plane')).toBeNull();
    f.componentInstance.paused.set(true);
    f.detectChanges();
    expect(f.componentInstance.motion()).toBe('paused');
    f.destroy();
  });
  it('keeps instances independent and recipes stable when only playback pauses', () => {
    const a = TestBed.createComponent(Bedlam),
      b = TestBed.createComponent(Bedlam);
    a.detectChanges();
    b.detectChanges();
    const original = b.componentInstance.layers();
    a.componentRef.setInput('seed', 'independent');
    a.componentRef.setInput('config', { planes: 1 });
    a.detectChanges();
    expect(a.componentInstance.layers().length).toBe(1);
    expect(b.componentInstance.layers()).toBe(original);
    b.componentInstance.paused.set(true);
    b.detectChanges();
    expect(b.componentInstance.layers()).toBe(original);
    a.destroy();
    b.destroy();
  });
});
