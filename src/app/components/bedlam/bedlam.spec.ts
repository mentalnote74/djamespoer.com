import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Bedlam } from './bedlam';
import { bedlamThemePalette, createBedlam } from './engine';

describe('masked field recipe', () => {
  it('is deterministic and preserves independent seed/configuration choices', () => {
    const a = createBedlam(bedlamThemePalette, 'one');
    expect(createBedlam(bedlamThemePalette, 'one')).toEqual(a);
    expect(createBedlam(bedlamThemePalette, 'two').noiseSeed).not.toBe(a.noiseSeed);
    expect(createBedlam(bedlamThemePalette, 'one', { scale: 2, strength: 0 })).not.toEqual(a);
  });
  it('bounds work and numerical inputs without particles or lifetimes', () => {
    const recipe = createBedlam(bedlamThemePalette, 42, {
      detail: 10000,
      scale: Infinity,
      strength: NaN,
    });
    expect(recipe.detail).toBe(3);
    expect(JSON.stringify(recipe)).not.toMatch(/NaN|Infinity/);
    expect(createBedlam(bedlamThemePalette, 42, { speed: 0 }).moving).toBe(false);
  });
  it('rejects non-color CSS payloads', () => {
    expect(() =>
      createBedlam({ ...bedlamThemePalette, primary: 'url(https://example.com)' }, 1),
    ).toThrow();
  });
});
describe('Bedlam field presentation', () => {
  it('uses the canonical silhouette, a single filter and persistent noise instead of emitted objects', () => {
    const f = TestBed.createComponent(Bedlam);
    f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    expect(root.querySelector('canvas')).toBeNull();
    expect(root.querySelectorAll('.bedlam__layer').length).toBe(0);
    expect(root.querySelectorAll('filter').length).toBe(1);
    expect(root.querySelectorAll('feTurbulence').length).toBe(2);
    expect(root.querySelector('rect')).not.toBeNull();
    expect(root.querySelector('feMorphology')).toBeNull();
    expect(root.querySelector('image')).toBeNull();
    expect(root.querySelector('.bedlam')?.getAttribute('aria-hidden')).toBe('true');
    f.componentInstance.paused.set(true);
    f.detectChanges();
    expect(f.componentInstance.motion()).toBe('paused');
    f.destroy();
  });
  it('keeps instance recipes independent and the static identity available when disabled', () => {
    const a = TestBed.createComponent(Bedlam),
      b = TestBed.createComponent(Bedlam);
    a.detectChanges();
    b.detectChanges();
    const original = b.componentInstance.recipe();
    a.componentRef.setInput('seed', 'independent');
    a.componentRef.setInput('config', { enabled: false });
    a.detectChanges();
    b.detectChanges();
    expect(a.componentInstance.recipe().enabled).toBe(false);
    expect(a.nativeElement.querySelector('.bedlam__containment').hidden).toBe(true);
    expect(a.nativeElement.querySelector('.bedlam__mask')).not.toBeNull();
    expect(b.componentInstance.recipe()).toBe(original);
    a.destroy();
    b.destroy();
  });
});
