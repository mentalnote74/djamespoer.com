import { afterRenderEffect, Component, ElementRef, inject, OnInit, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TestSession } from './test-session';
@Component({
  selector: 'app-thingamajob-test',
  imports: [RouterOutlet],
  templateUrl: './test-host.html',
  styleUrl: './test-host.scss',
  host: { '(window:pageshow)': 'restore($event)' },
})
export class ThingamajobTestHost implements OnInit {
  readonly session = inject(TestSession);
  readonly recovery = viewChild<ElementRef<HTMLElement>>('recovery');
  constructor() {
    afterRenderEffect(() => {
      if (['denied', 'unavailable'].includes(this.session.state()))
        this.recovery()?.nativeElement.focus();
    });
  }
  ngOnInit() {
    void this.session.check();
  }
  restore(event: PageTransitionEvent) {
    // A browser Back restoration must recheck authority, not revive stale private UI.
    if (event.persisted) void this.session.check();
  }
  get signInUrl() {
    const view = location.hash.startsWith('#/evaluate')
      ? 'evaluate'
      : location.hash.startsWith('#/admin')
        ? 'admin'
        : 'home';
    return '/api/thingamajob/test/sign-in?view=' + view;
  }
  skip(event: Event) {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
  }
}
