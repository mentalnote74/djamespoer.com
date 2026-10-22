import { MobileDelivery } from '../../services/mobile-delivery';
import { BuildometerOverview } from '../buildometer-overview/buildometer-overview';
import { DailyScrumBrief } from '../daily-scrum-brief/daily-scrum-brief';
import { PublicTrack } from '../../services/public-track';
import { Aside } from '../../layout/aside/aside';
import { Thingamajob } from '../thingamajob/thingamajob';
import { PerspectiveSlide } from '../perspective-slide/perspective-slide';
import { ThingamajobSlide } from '../thingamajob-slide/thingamajob-slide';
import { ExlLifeproSlide } from '../exl-lifepro-slide/exl-lifepro-slide';
import { BuildometerSlide } from '../buildometer-slide/buildometer-slide';
import { IpsSlide } from '../ips-slide/ips-slide';
import { PortfolioSlide } from '../portfolio-slide/portfolio-slide';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Carousel } from '../carousel/carousel';
import { CarouselSlide } from '../carousel/carousel-slide';

@Component({
  imports: [
    BuildometerOverview,
    DailyScrumBrief,
    PublicTrack,
    RouterLink,
    PerspectiveSlide,
    ThingamajobSlide,
    ExlLifeproSlide,
    BuildometerSlide,
    IpsSlide,
    PortfolioSlide,
    Aside,
    Thingamajob,
    Carousel,
    CarouselSlide,
  ],
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  readonly delivery = inject(MobileDelivery);
}
