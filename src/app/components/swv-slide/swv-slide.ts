import { afterNextRender, Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CarouselExposure } from '../../services/carousel-exposure';
import { PublicTrack } from '../../services/public-track';

@Component({
  selector: 'app-swv-slide',
  imports: [RouterLink, PublicTrack, CarouselExposure],
  templateUrl: './swv-slide.html',
  styleUrl: './swv-slide.scss',
})
export class SwvSlide {
  readonly active = input(true);
  readonly hero = input(false);
  // Mount once on the client. Visibility/rotation belong to the child scene;
  // tearing down its browsing context loses its clock, theme and user pause.
  readonly mounted = signal(false);

  readonly embedUrl = signal<SafeResourceUrl | null>(null);
  private readonly sanitizer = inject(DomSanitizer);
  constructor() {
    afterNextRender(() => {
      // Fixed public values only. Choose once; never navigate the live child on
      // consent, visibility or active-state changes.
      const surface = this.hero() ? 'project-hero' : 'home-carousel';
      this.embedUrl.set(
        this.sanitizer.bypassSecurityTrustResourceUrl(
          'https://shadywhitevan.rocks/?embed_source=djamespoer.com&embed_surface=' +
            surface +
            '#swv-embed-stage',
        ),
      );
      this.mounted.set(true);
    });
  }
}
