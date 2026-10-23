import { Component, input, output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { SlideHero } from './slide-hero';
import { SlideVisual } from '../slide-visual/slide-visual';
import { PortfolioSlideDefinition } from '../../content/portfolio-slides';
import { vi } from 'vitest';

@Component({ selector: 'app-slide-visual', template: '' })
class ArtStub {
  readonly slide = input.required<PortfolioSlideDefinition>();
  readonly hero = input(false);
  readonly ready = output<void>();
}

describe('destination hero composition', () => {
  afterEach(() => vi.restoreAllMocks());
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
      fixture.debugElement.query(By.directive(ArtStub)).componentInstance.ready.emit();
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      expect(fixture.componentInstance.selected().id).toBe(id);
      expect(root.querySelectorAll('h1')).toHaveLength(1);
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
