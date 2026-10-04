import { Component } from '@angular/core';
import { BUILD_TIME } from '../../generated/build-info';

@Component({
  imports: [],
  selector: 'app-hero',
  styleUrl: './hero.scss',
  templateUrl: './hero.html',
})
export class Hero {
  readonly lastUpdated = new Date(BUILD_TIME).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
