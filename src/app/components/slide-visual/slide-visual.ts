import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicTrack } from '../../services/public-track';
import { SlideVisualReady } from './slide-visual-ready';
import type { PortfolioSlideDefinition } from '../../content/portfolio-slides';
import { PerspectiveSlide } from '../perspective-slide/perspective-slide';
import { ThingamajobSlide } from '../thingamajob-slide/thingamajob-slide';
import { ExlLifeproSlide } from '../exl-lifepro-slide/exl-lifepro-slide';
import { BuildometerSlide } from '../buildometer-slide/buildometer-slide';
import { IpsSlide } from '../ips-slide/ips-slide';
import { PortfolioSlide } from '../portfolio-slide/portfolio-slide';
import { DjpSunsetSlide } from '../djp-sunset-slide/djp-sunset-slide';
import { DjpMoonlightSlide } from '../djp-moonlight-slide/djp-moonlight-slide';
import { BlognostisphereSlide } from '../blognostisphere-slide/blognostisphere-slide';
import { TccPigSlide } from '../tcc-pig-slide/tcc-pig-slide';
import { BigDumbBassSlide } from '../big-dumb-bass-slide/big-dumb-bass-slide';
@Component({
  selector: 'app-slide-visual',
  imports: [
    RouterLink,
    PublicTrack,
    SlideVisualReady,
    PerspectiveSlide,
    ThingamajobSlide,
    ExlLifeproSlide,
    BuildometerSlide,
    IpsSlide,
    PortfolioSlide,
    DjpSunsetSlide,
    DjpMoonlightSlide,
    BlognostisphereSlide,
    TccPigSlide,
    BigDumbBassSlide,
  ],
  templateUrl: './slide-visual.html',
  styleUrl: './slide-visual.scss',
})
export class SlideVisual {
  readonly ready = output<void>();
  readonly slide = input.required<PortfolioSlideDefinition>();
  readonly active = input(true);
  readonly hero = input(false);
  readonly priority = input(false);
}
