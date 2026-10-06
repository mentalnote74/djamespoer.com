import { Component } from '@angular/core';
import { Carousel } from '../carousel/carousel';
import { CarouselSlide } from '../carousel/carousel-slide';
import { Hero } from '../hero/hero';

@Component({
  imports: [Carousel, CarouselSlide, Hero],
  selector: 'app-home',
  templateUrl: './home.html',
})
export class Home {}
