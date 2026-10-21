import { Component } from '@angular/core';
import { Thingamajob } from '../thingamajob/thingamajob';
import { ThingamajobSlide } from '../thingamajob-slide/thingamajob-slide';
@Component({
  selector: 'app-thingamajob-product',
  imports: [Thingamajob, ThingamajobSlide],
  templateUrl: './thingamajob-product.html',
  styleUrl: './thingamajob-product.scss',
})
export class ThingamajobProduct {}
