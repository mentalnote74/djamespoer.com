import { Component, inject, makeStateKey, signal, TransferState } from '@angular/core';
import { RigbyGuide } from '../../features/cookie-hunt/rigby-guide';
import { HiddenCookie } from '../../features/cookie-hunt/hidden-cookie';
import { RouterOutlet } from '@angular/router';

const INITIAL_LAYOUT = makeStateKey<boolean>('page-independent-layout');

@Component({
  imports: [RouterOutlet, RigbyGuide, HiddenCookie],
  selector: 'app-page',
  styleUrl: './page.scss',
  templateUrl: './page.html',
})
export class Page {
  private readonly transferState = inject(TransferState);
  readonly independentLayout = signal(this.transferState.get(INITIAL_LAYOUT, false));
  setLayout(layout: unknown): void {
    const independent = layout === 'independent';
    this.independentLayout.set(independent);
    this.transferState.set(INITIAL_LAYOUT, independent);
  }
}
