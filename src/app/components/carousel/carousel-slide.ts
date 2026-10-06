import { Directive, inject, input, TemplateRef } from '@angular/core';

@Directive({
  selector: 'ng-template[appCarouselSlide]',
})
export class CarouselSlide {
  readonly label = input.required<string>();
  readonly template = inject(TemplateRef<unknown>);
}
