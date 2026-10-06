import { Component } from '@angular/core';
import { Carousel } from '../carousel/carousel';
import { CarouselSlide } from '../carousel/carousel-slide';
import { DeploymentHistory } from '../deployment-history/deployment-history';
import { Hero } from '../hero/hero';

@Component({
  imports: [Carousel, CarouselSlide, Hero, DeploymentHistory],
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
