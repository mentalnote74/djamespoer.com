import { afterNextRender, Component, ElementRef, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NOT_FOUND } from '../../content/not-found';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  readonly copy = NOT_FOUND;
  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus({ preventScroll: true }));
  }
}
