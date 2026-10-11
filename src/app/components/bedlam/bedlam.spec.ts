import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Bedlam } from './bedlam';
import { Algorithm, bounded, presentation, select } from './contract';
import { pool } from './pool';
import { startBedlam } from './runtime';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BEDLAM cartridges and slots', () => {
  it('selects exactly three distinct entries with each ordered arrangement reachable', () => {
    const arrangements = new Set<string>();
    for (let a = 0; a < 5; a++)
      for (let b = 0; b < 4; b++)
        for (let c = 0; c < 3; c++) {
          const values = [(a + 0.1) / 5, (b + 0.1) / 4, (c + 0.1) / 3];
          const selected = select(pool, () => values.shift()!);
          expect(new Set(selected.map((item) => item.id)).size).toBe(3);
          arrangements.add(selected.map((item) => item.id).join(','));
        }
    expect(arrangements.size).toBe(60);
  });
  it('supports removing, replacing and extending cartridges without changing slots', () => {
    const replacement: Algorithm = { ...pool[0], id: 'replacement' };
    expect(select([replacement, ...pool.slice(2)], () => 0).map((item) => item.id)).toEqual([
      'replacement',
      pool[2].id,
      pool[3].id,
    ]);
    expect(() => select(pool.slice(0, 2))).toThrow();
    expect(() => select([pool[0], pool[0], pool[1]])).toThrow();
  });
  it('routes mask channels by slot and clamps hostile numerical chatter', () => {
    expect(bounded({ x: NaN, y: -5, energy: Infinity })).toEqual({ x: 0, y: 0, energy: 0 });
    const raw = { x: 2, y: -1, energy: 5 };
    expect(presentation('A', raw)['--mask-color']).toBeDefined();
    expect(presentation('A', raw)['--mask-opacity']).toBeUndefined();
    expect(presentation('B', raw)['--mask-opacity']).toBe('1');
    expect(presentation('C', raw)['--mask-depth']).toBe('4px');
    expect(presentation('B', { x: 0, y: 0, energy: 0 })['--mask-opacity']).toBe('0.9');
  });
  it('keeps every canvas slot transparent at both energy bounds', () => {
    for (const slot of ['A', 'B', 'C'] as const) {
      expect(presentation(slot, { x: 0.5, y: 0.5, energy: 0 })['--layer-opacity']).toBe('0.1');
      expect(presentation(slot, { x: 0.5, y: 0.5, energy: 1 })['--layer-opacity']).toBe('0.2');
    }
  });
  for (const algorithm of pool) {
    it(`${algorithm.id} evolves independently with bounded chatter`, () => {
      let seed = 21;
      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      const first = algorithm.create(24, 12, random),
        second = algorithm.create(24, 12, random);
      const untouched = second.chatter();
      for (let i = 0; i < 100; i++) first.step();
      expect(second.chatter()).toEqual(untouched);
      for (const value of Object.values(first.chatter())) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      first.destroy();
      second.destroy();
    });
  }
});

describe('BEDLAM lifecycle', () => {
  it('forwards live pause and speed changes to an initialized runtime and tears down', async () => {
    const configure = vi.fn(),
      destroy = vi.fn();
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const fixture = TestBed.createComponent(Bedlam);
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(Reflect.get(fixture.componentInstance, 'runtime')).toBeDefined());
    // Replace the initialized platform boundary, not ES-module exports.
    Reflect.set(fixture.componentInstance, 'runtime', { configure, destroy });
    fixture.componentInstance.paused.set(true);
    fixture.componentRef.setInput('speed', 0.01);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(configure).toHaveBeenLastCalledWith(0.01, true);
    fixture.destroy();
    expect(destroy).toHaveBeenCalledOnce();
  });
  function setup(reduced = false) {
    let callback: FrameRequestCallback | undefined;
    let intersection: IntersectionObserverCallback | undefined;
    const media = new EventTarget();
    Object.defineProperty(media, 'matches', { value: reduced, writable: true });
    vi.stubGlobal('matchMedia', () => media);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((fn: FrameRequestCallback) => {
        callback = fn;
        return 1;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(fn: IntersectionObserverCallback) {
          intersection = fn;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    const created = Array.from({ length: 5 }, () => ({
      step: vi.fn(),
      draw: vi.fn(),
      chatter: () => ({ x: 0.4, y: 0.6, energy: 0.5 }),
      destroy: vi.fn(),
    }));
    const registry = created.map((cartridge, i) => ({
      id: `test-${i}`,
      create: vi.fn(() => cartridge),
    }));
    const canvases = Array.from({ length: 3 }, () => {
      const canvas = document.createElement('canvas');
      vi.spyOn(canvas, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
      return canvas;
    });
    const runtime = startBedlam(document.createElement('span'), canvases, registry);
    return {
      runtime,
      created,
      registry,
      media,
      disconnect,
      tick: (time: number) => callback?.(time),
      hide: () =>
        intersection?.(
          [{ isIntersecting: false }] as IntersectionObserverEntry[],
          {} as IntersectionObserver,
        ),
    };
  }
  it('initializes only three, advances only selected cartridges and destroys all active state', () => {
    const s = setup();
    expect(s.registry.filter((item) => item.create.mock.calls.length)).toHaveLength(3);
    s.runtime.configure(1, false);
    s.tick(100);
    s.tick(200);
    s.tick(300);
    s.tick(400);
    expect(s.created.filter((item) => item.step.mock.calls.length)).toHaveLength(3);
    s.runtime.configure(0, true);
    s.runtime.destroy();
    expect(s.created.filter((item) => item.destroy.mock.calls.length)).toHaveLength(3);
    expect(s.disconnect).toHaveBeenCalled();
  });
  it('does not schedule motion for reduced-motion users', () => {
    const s = setup(true);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    s.runtime.destroy();
  });
  it('cancels motion on pause, invisibility and changed reduced-motion preference', () => {
    const s = setup();
    s.runtime.configure(0.01, true);
    expect(cancelAnimationFrame).toHaveBeenCalled();
    s.runtime.configure(0.12, false);
    s.hide();
    (s.media as unknown as { matches: boolean }).matches = true;
    s.media.dispatchEvent(new Event('change'));
    s.runtime.destroy();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
  it('renders three decorative layers with the static identity preserved', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
    const fixture = TestBed.createComponent(Bedlam);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('canvas')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('.bedlam').getAttribute('aria-hidden')).toBe('true');
    expect(fixture.nativeElement.querySelector('.bedlam__anchor')).not.toBeNull();
    fixture.destroy();
  });
});
