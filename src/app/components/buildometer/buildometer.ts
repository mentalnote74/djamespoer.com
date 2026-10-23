import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BuildometerDashboard } from './buildometer-dashboard';
import { BuildometerDataStore } from './data/buildometer-data';
import { SlideHero } from '../slide-hero/slide-hero';
@Component({
  selector: 'app-buildometer',
  imports: [RouterLink, BuildometerDashboard, SlideHero],
  templateUrl: './buildometer.html',
  styleUrl: './buildometer.scss',
})
export class Buildometer {
  readonly store = inject(BuildometerDataStore);
}
