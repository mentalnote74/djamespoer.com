import { afterNextRender, Component, input, linkedSignal } from '@angular/core';
import { chooseSlide, destinationSlides } from '../../content/portfolio-slides';
import { SlideVisual } from '../slide-visual/slide-visual';

@Component({
  selector: 'app-slide-hero',
  imports: [SlideVisual],
  templateUrl: './slide-hero.html',
  styleUrl: './slide-hero.scss',
})
export class SlideHero {
  readonly destination = input.required<string>();
  readonly selected = linkedSignal(() => destinationSlides(this.destination())[0]);

  constructor() {
    afterNextRender(() => {
      const variants = destinationSlides(this.destination());
      if (variants.length > 1) this.selected.set(chooseSlide(variants));
    });
  }
}
