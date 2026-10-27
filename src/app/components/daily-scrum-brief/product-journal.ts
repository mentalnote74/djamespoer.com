import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
  TransferState,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DailyScrumBrief } from './daily-scrum-brief';
import { Journal, journalPage, JOURNAL_STATE, PRERENDER_JOURNAL } from './journal.model';
@Component({
  selector: 'app-product-journal',
  imports: [RouterLink, DailyScrumBrief],
  templateUrl: './product-journal.html',
  styleUrl: './product-journal.scss',
})
export class ProductJournal {
  readonly date = input<string>();
  readonly journal = signal<Journal | null>(null);
  readonly error = signal(false);
  readonly selected = computed(() =>
    this.journal()?.entries.find((e) => e.date === (this.date() || this.journal()?.latestDate)),
  );
  private readonly abort = new AbortController();
  constructor() {
    const transfer = inject(TransferState);
    const history = inject(PRERENDER_JOURNAL, { optional: true });
    if (history) {
      const page = journalPage(history, inject(ActivatedRoute).snapshot.params['date']);
      this.journal.set(page);
      transfer.set(JOURNAL_STATE, page);
    } else {
      this.journal.set(transfer.get(JOURNAL_STATE, null));
      transfer.remove(JOURNAL_STATE);
    }
    inject(DestroyRef).onDestroy(() => this.abort.abort());
    afterNextRender(() => void this.load());
  }
  async load(): Promise<void> {
    this.error.set(false);
    try {
      const response = await fetch('/data/product-journal.json', { signal: this.abort.signal });
      if (!response.ok) throw Error('Journal unavailable');
      const data: unknown = await response.json();
      if (
        !data ||
        typeof data !== 'object' ||
        !('schemaVersion' in data) ||
        data.schemaVersion !== 1 ||
        !('entries' in data) ||
        !Array.isArray(data.entries) ||
        !('latestDate' in data) ||
        typeof data.latestDate !== 'string'
      )
        throw Error('Invalid journal');
      this.journal.set(data as Journal);
    } catch {
      if (!this.abort.signal.aborted) this.error.set(true);
    }
  }
}
