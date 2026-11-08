import { afterNextRender, Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicTrack } from '../../services/public-track';

@Component({
  selector: 'app-swv-slide',
  imports: [RouterLink, PublicTrack],
  templateUrl: './swv-slide.html',
  styleUrl: './swv-slide.scss',
})
export class SwvSlide {
  readonly active = input(true);
  readonly hero = input(false);
  // Mount once on the client. Visibility/rotation belong to the child scene;
  // tearing down its browsing context loses its clock, theme and user pause.
  readonly mounted = signal(false);

  constructor() {
    afterNextRender(() => this.mounted.set(true));
  }
}
