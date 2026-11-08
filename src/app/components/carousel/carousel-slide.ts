import { Directive, inject, input, TemplateRef } from '@angular/core';

@Directive({
  selector: 'ng-template[appCarouselSlide]',
})
export class CarouselSlide {
  readonly id = input('');
  /** Keep a live embed initialized at its real size before and between turns. */
  readonly preload = input(false);
  readonly label = input.required<string>();
  readonly template = inject(TemplateRef<unknown>);
}
