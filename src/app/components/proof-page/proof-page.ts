import { Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

@Component({
  imports: [NgOptimizedImage],
  selector: 'app-proof-page',
  styleUrl: './proof-page.scss',
  templateUrl: './proof-page.html',
})
export class ProofPage {
  readonly heading = input.required<string>();
  readonly artwork = input<{ src: string; alt: string; width: number; height: number }>();
}
