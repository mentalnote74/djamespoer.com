import { Component, input } from '@angular/core';
@Component({ selector: 'app-aside', templateUrl: './aside.html', styleUrl: './aside.scss' })
export class Aside {
  readonly label = input.required<string>();
}
