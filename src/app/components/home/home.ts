import { DailyScrumBrief } from '../daily-scrum-brief/daily-scrum-brief';
import { PublicTrack } from '../../services/public-track';
import { Aside } from '../../layout/aside/aside';
import { Thingamajob } from '../thingamajob/thingamajob';
import { PerspectiveSlide } from '../perspective-slide/perspective-slide';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Carousel } from '../carousel/carousel';
import { CarouselSlide } from '../carousel/carousel-slide';
import { DeploymentHistory } from '../deployment-history/deployment-history';

@Component({
  imports: [
    DailyScrumBrief,
    PublicTrack,
    RouterLink,
    PerspectiveSlide,
    Aside,
    Thingamajob,
    Carousel,
    CarouselSlide,
    DeploymentHistory,
  ],
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
