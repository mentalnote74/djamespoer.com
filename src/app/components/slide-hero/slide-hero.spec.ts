import { Component, input, output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { SlideHero } from './slide-hero';
import { SlideVisual } from '../slide-visual/slide-visual';
import { PortfolioSlideDefinition } from '../../content/portfolio-slides';
import { vi } from 'vitest';
import { TccPigSlide } from '../tcc-pig-slide/tcc-pig-slide';

@Component({ selector: 'app-slide-visual', template: '' })
class ArtStub {
  readonly slide = input.required<PortfolioSlideDefinition>();
  readonly hero = input(false);
  readonly ready = output<void>();
}

@Component({ selector: 'app-tcc-pig-slide', template: '' })
class PigStub {
  readonly hero = input(false);
}

describe('destination hero composition', () => {
  afterEach(() => vi.restoreAllMocks());
  it('mounts the direct TCC hero eagerly without the deferred slide renderer', async () => {
    TestBed.configureTestingModule({ imports: [SlideHero] });
    TestBed.overrideComponent(SlideHero, {
      remove: { imports: [SlideVisual, TccPigSlide] },
      add: { imports: [ArtStub, PigStub] },
    });
    const fixture = TestBed.createComponent(SlideHero);
    fixture.componentRef.setInput('destination', '/case-studies/tcc');
    fixture.componentRef.setInput('heading', 'Beyond “Lipstick on the Pig”');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(PigStub)).componentInstance.hero()).toBe(true);
    expect(fixture.debugElement.query(By.directive(ArtStub))).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.hero-art').tagName).toBe('APP-TCC-PIG-SLIDE');
  });
  for (const [random, id] of [
    [0, 'djp-conservatory'],
    [0.45, 'djp-sunset'],
    [0.99, 'djp-moonlight'],
  ] as const) {
    it(`keeps one semantic heading and stable artwork/copy metadata for ${id}`, async () => {
      vi.spyOn(Math, 'random').mockReturnValue(random);
      TestBed.configureTestingModule({ imports: [SlideHero] });
      TestBed.overrideComponent(SlideHero, {
        remove: { imports: [SlideVisual] },
        add: { imports: [ArtStub] },
      });
      const fixture = TestBed.createComponent(SlideHero);
      fixture.componentRef.setInput('destination', '/work/djamespoer');
      fixture.componentRef.setInput('heading', 'djamespoer.com');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.componentInstance.selected().id).toBe('djp-conservatory');
      const initialArt = fixture.debugElement.query(By.directive(ArtStub)).nativeElement;
      fixture.debugElement.query(By.directive(ArtStub)).componentInstance.ready.emit();
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      expect(fixture.componentInstance.selected().id).toBe(id);
      expect(root.querySelectorAll('h1')).toHaveLength(1);
      expect(root.querySelectorAll('app-slide-visual')).toHaveLength(1);
      if (id !== 'djp-conservatory') {
        expect(root.contains(initialArt)).toBe(false);
      }
      expect(root.querySelector('.hero-copy h1')?.textContent).toBe('djamespoer.com');
      expect(root.querySelector('.slide-hero')?.getAttribute('data-slide-id')).toBe(id);
      expect(
        (root.querySelector('.slide-hero') as HTMLElement).style.getPropertyValue('--copy-width'),
      ).toBe('47%');
      const selected = fixture.componentInstance.selected();
      fixture.debugElement.query(By.directive(ArtStub)).componentInstance.ready.emit();
      fixture.detectChanges();
      expect(fixture.componentInstance.selected()).toBe(selected);
    });
  }
});
