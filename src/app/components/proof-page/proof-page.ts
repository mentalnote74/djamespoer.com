import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-proof-page',
  styleUrl: './proof-page.scss',
  templateUrl: './proof-page.html',
})
export class ProofPage {
  readonly heading = input.required<string>();
}
