import { Component, input, linkedSignal } from '@angular/core';
import { chooseSlide, destinationSlides } from '../../content/portfolio-slides';
import { SlideVisual } from '../slide-visual/slide-visual';
import { TccPigSlide } from '../tcc-pig-slide/tcc-pig-slide';
import { SlideVisualReady } from '../slide-visual/slide-visual-ready';

@Component({
  selector: 'app-slide-hero',
  imports: [SlideVisual, TccPigSlide, SlideVisualReady],
  templateUrl: './slide-hero.html',
  styleUrl: './slide-hero.scss',
})
export class SlideHero {
  readonly destination = input.required<string>();
  readonly heading = input.required<string>();
  readonly eyebrow = input('');
  readonly subheading = input('');
  readonly selected = linkedSignal(() => destinationSlides(this.destination())[0]);

  private initializedDestination: string | undefined;
  selectVariant(): void {
    if (this.initializedDestination === this.destination()) return;
    this.initializedDestination = this.destination();
    // Changing an unhydrated @defer/@switch branch can retain the server view.
    // Wait for the real child view, then replace the keyed hero view once. Its
    // entire old deferred artwork is destroyed, rather than reused across variants.
    const variants = destinationSlides(this.destination());
    if (variants.length > 1) this.selected.set(chooseSlide(variants));
  }
}
