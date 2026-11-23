import { afterNextRender, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CarouselExposure } from '../../services/carousel-exposure';
import { PublicTrack } from '../../services/public-track';

/** Homepage only: warm the scene this long after load, well before its turn in the rotation. */
const WARM_AFTER_LOAD_MS = 15000;
const INTERACTIONS = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const;

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
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = signal(false);

  constructor() {
    afterNextRender(() => {
      this.browser.set(true);
      // SCRUM-219: on the homepage this slide is last in the rotation, so a third-party 3D site
      // must not load during our first paint. Mount on the first of: the slide becoming active,
      // the visitor's first interaction, or an idle moment 15 s after load. The case-study hero
      // still mounts at once.
      if (this.hero()) return this.mount();
      const view = this.document.defaultView;
      if (!view) return this.mount();
      const warm = () => this.mount();
      for (const type of INTERACTIONS)
        view.addEventListener(type, warm, { once: true, passive: true, capture: true });
      const timer = view.setTimeout(() => {
        if ('requestIdleCallback' in view) view.requestIdleCallback(warm, { timeout: 5000 });
        else warm();
      }, WARM_AFTER_LOAD_MS);
      this.destroyRef.onDestroy(() => {
        view.clearTimeout(timer);
        for (const type of INTERACTIONS) view.removeEventListener(type, warm, { capture: true });
      });
    });
    effect(() => {
      if (this.browser() && this.active()) this.mount();
    });
  }

  private mount(): void {
    if (this.mounted()) return;
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
  }
}
