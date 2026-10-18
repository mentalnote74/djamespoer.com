import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { validateDeploymentSnapshot } from '../deployment-history/deployment-history-snapshot';
import {
  BUG_PENDING,
  DELIVERY_PENDING,
  deriveCompletion,
  deriveShipping,
  parseJournal,
  type Completion,
  type JournalEntry,
  type ShippingSignal,
} from './buildometer.model';

@Component({
  selector: 'app-buildometer',
  imports: [RouterLink],
  templateUrl: './buildometer.html',
  styleUrl: './buildometer.scss',
})
export class Buildometer {
  readonly completion: Completion | null = deriveCompletion(null);
  readonly deliveryPending = DELIVERY_PENDING;
  readonly bugPending = BUG_PENDING;
  readonly shipping = signal<ShippingSignal | null>(null);
  readonly journal = signal<readonly JournalEntry[] | null>(null);
  readonly shippingError = signal(false);
  readonly journalError = signal(false);
  readonly loading = signal(true);
  private readonly abort = new AbortController();
  constructor() {
    inject(DestroyRef).onDestroy(() => this.abort.abort());
    afterNextRender(() => void this.load());
  }
  formatDate(value: string, compact = false): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      ...(compact ? {} : { year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }),
    }).format(new Date(value));
  }
  async load(): Promise<void> {
    this.loading.set(true);
    this.shippingError.set(false);
    this.journalError.set(false);
    const get = async (url: string): Promise<unknown> => {
      const r = await fetch(url, { signal: this.abort.signal, cache: 'no-cache' });
      if (!r.ok) throw Error('Source unavailable');
      return r.json();
    };
    await Promise.all([
      get('/data/deployment-history.json')
        .then((value) => {
          const result = validateDeploymentSnapshot(value);
          if (!result.ok) throw Error('Invalid deployment snapshot');
          this.shipping.set(deriveShipping(result.snapshot, Date.now()));
        })
        .catch(() => {
          if (!this.abort.signal.aborted) this.shippingError.set(true);
        }),
      get('/data/product-journal.json')
        .then((value) => this.journal.set(parseJournal(value)))
        .catch(() => {
          if (!this.abort.signal.aborted) this.journalError.set(true);
        }),
    ]);
    if (!this.abort.signal.aborted) this.loading.set(false);
  }
}
