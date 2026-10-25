import { Component, input } from '@angular/core';
@Component({
  selector: 'app-cookie-sprite',
  template: `<span
    aria-hidden="true"
    [style.background-position]="-(index() % 4) * 40 + 'px ' + -Math.floor(index() / 4) * 40 + 'px'"
  ></span>`,
  styles: `
    :host {
      display: inline-block;
      inline-size: 40px;
      block-size: 40px;
      flex-shrink: 0;
    }
    span {
      display: block;
      inline-size: 40px;
      block-size: 40px;
      background-image: url('/assets/rigby/cookies.webp');
      background-size: 160px 160px;
      image-rendering: pixelated;
    }
    @media (forced-colors: active) {
      span {
        background: none;
      }
      span::after {
        content: '🍪';
      }
    }
  `,
})
export class CookieSprite {
  readonly index = input(0);
  readonly Math = Math;
}
