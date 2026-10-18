import { InstrumentCluster } from './instrument-cluster';
import { afterNextRender, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { SKIN_OPTIONS, type InstrumentSkin } from './skins/skin.model';
import { RouterLink } from '@angular/router';
import { validateDeploymentSnapshot } from '../deployment-history/deployment-history-snapshot';
import {
  dashboardMetrics,
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
  imports: [RouterLink, InstrumentCluster],
  templateUrl: './buildometer.html',
  styleUrl: './buildometer.scss',
})
export class Buildometer {
  readonly skinOptions = SKIN_OPTIONS;
  readonly skin = signal<InstrumentSkin | null>(null);
  readonly skinError = signal(false);
  private skinRequest = 0;
  readonly metrics = computed(() =>
    dashboardMetrics(this.completion, this.shipping(), this.loading(), this.shippingError()),
  );
  changeSkin(event: Event): void {
    if (event.target instanceof HTMLSelectElement) void this.selectSkin(event.target.value);
  }
  async selectSkin(id: string): Promise<void> {
    const option = this.skinOptions.find((s) => s.id === id);
    if (!option) return;
    const request = ++this.skinRequest;
    this.skinError.set(false);
    try {
      const skin = await option.load();
      if (request === this.skinRequest) this.skin.set(skin);
    } catch {
      if (request === this.skinRequest) this.skinError.set(true);
    }
  }
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
    afterNextRender(() => {
      void this.selectSkin('night-driver');
      void this.load();
    });
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
