import { Component, input } from '@angular/core';
import type { ProgressPresentation } from './data/progress';
@Component({
  selector: 'app-progress-observation',
  templateUrl: './progress-observation.html',
  styleUrl: './progress-observation.scss',
})
export class ProgressObservation {
  readonly progress = input.required<ProgressPresentation>();
}
