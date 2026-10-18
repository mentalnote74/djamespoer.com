import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BuildometerDashboard } from './buildometer-dashboard';
import { BuildometerDataStore } from './data/buildometer-data';
@Component({
  selector: 'app-buildometer',
  imports: [RouterLink, BuildometerDashboard],
  templateUrl: './buildometer.html',
  styleUrl: './buildometer.scss',
})
export class Buildometer {
  readonly store = inject(BuildometerDataStore);
}
