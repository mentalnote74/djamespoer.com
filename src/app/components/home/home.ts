import { ARTICLES } from '../../content/public-pages';
import { PORTFOLIO_SLIDES, shufflePortfolioDeck } from '../../content/portfolio-slides';
import { SlideVisual } from '../slide-visual/slide-visual';
import { MobileDelivery } from '../../services/mobile-delivery';
import { BuildometerOverview } from '../buildometer-overview/buildometer-overview';
import { DailyScrumBrief } from '../daily-scrum-brief/daily-scrum-brief';
import { PublicTrack } from '../../services/public-track';
import { Aside } from '../../layout/aside/aside';
import { Thingamajob } from '../thingamajob/thingamajob';
import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Carousel } from '../carousel/carousel';
import { CarouselSlide } from '../carousel/carousel-slide';
import { HiddenCookie } from '../../features/cookie-hunt/hidden-cookie';

@Component({
  imports: [
    SlideVisual,
    BuildometerOverview,
    DailyScrumBrief,
    PublicTrack,
    RouterLink,
    Aside,
    Thingamajob,
    Carousel,
    CarouselSlide,
    HiddenCookie,
  ],
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  readonly articles = ARTICLES.slice(0, 3);
  readonly slides = PORTFOLIO_SLIDES.filter(
    (slide) => !['ips', 'buildometer', 'thingamajob', 'exl'].includes(slide.id),
  );
  readonly deck = signal(this.slides);
  readonly deckIds = computed(() => this.deck().map((slide) => slide.id));
  constructor() {
    afterNextRender(() => this.deck.set(shufflePortfolioDeck(this.slides)));
  }
  readonly delivery = inject(MobileDelivery);
}
