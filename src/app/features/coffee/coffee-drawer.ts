import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { LucideX } from '@lucide/angular';
import { PublicAnalytics } from '../../services/public-analytics';
import { CoffeeDrawerService } from './coffee-drawer.service';
import {
  COFFEE_CATEGORIES,
  coffeeVerdict,
  normalizeSiteUrl,
  scoreBand,
  type ScoreBand,
  type CoffeeErrorType,
  type CoffeeResponse,
  type CoffeeSiteScore,
} from './coffee-contract';

type Phase = 'idle' | 'scanning' | 'result' | 'error';
type ScoreCell = { value: number; band: ScoreBand; higher: boolean } | null;
const CLIENT_TIMEOUT_MS = 90000;
const ERROR_COPY: Record<Exclude<CoffeeErrorType, 'invalid_url' | 'self_failed'>, string> = {
  unreachable:
    "Lighthouse couldn't load that site. Check the address. Some sites block automated tests.",
  rate_limited: "That's a lot of coffee. Try again in a minute.",
  timeout: 'That took too long to brew. Lighthouse may still be busy, so try again.',
  psi_down: "Google PageSpeed Insights isn't answering right now. Try again in a little while.",
};
const VERDICT_COPY = {
  visitor_buys: "Coffee's on you.",
  james_buys: "Coffee's on me.",
  tie: 'Dead heat. We go Dutch.',
  no_verdict: 'No verdict this round.',
} as const;

@Component({
  selector: 'app-coffee-drawer',
  imports: [LucideX],
  templateUrl: './coffee-drawer.html',
  styleUrl: './coffee-drawer.scss',
})
export class CoffeeDrawer {
  readonly drawer = inject(CoffeeDrawerService);
  private readonly analytics = inject(PublicAnalytics);
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  private readonly errorMessage = viewChild<ElementRef<HTMLElement>>('errorMessage');

  readonly phase = signal<Phase>('idle');
  readonly invalid = signal(false);
  readonly error = signal<CoffeeErrorType | null>(null);
  readonly result = signal<CoffeeResponse | null>(null);
  readonly announcement = signal('');
  readonly draft = signal('');
  readonly verdict = computed(() => {
    const result = this.result();
    return result ? coffeeVerdict(result) : 'no_verdict';
  });
  readonly verdictHeading = computed(() => VERDICT_COPY[this.verdict()]);
  /** Four category rows plus Overall; the higher score in each row is marked in text. */
  readonly rows = computed(() => {
    const result = this.result();
    if (!result?.visitor) return [];
    const { visitor, james } = result;
    const cell = (value: number | null, other: number | null): ScoreCell =>
      value === null
        ? null
        : { value, band: scoreBand(value), higher: other !== null && value > other };
    const row = (id: string, label: string, pick: (site: CoffeeSiteScore) => number) => {
      const mine = james ? pick(james) : null;
      return { id, label, visitor: cell(pick(visitor), mine), james: cell(mine, pick(visitor)) };
    };
    return [
      ...COFFEE_CATEGORIES.map((c) => row(c.id, c.label, (site) => site.scores[c.id])),
      row('overall', 'Overall', (site) => site.overall),
    ];
  });
  readonly errorCopy = computed(() => {
    const error = this.error();
    return error && error !== 'invalid_url' && error !== 'self_failed' ? ERROR_COPY[error] : '';
  });
  readonly bookHref = computed(
    () =>
      'mailto:djamespoer@djamespoer.com?subject=' +
      encodeURIComponent('Coffee? Lighthouse says: ' + this.verdictHeading()),
  );
  private host = '';
  private controller: AbortController | null = null;
  private canceled = false;

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;
      if (this.drawer.opened()) {
        if (!dialog.open) {
          dialog.showModal();
          this.heading()?.nativeElement.focus();
        }
      } else if (dialog.open) dialog.close();
    });
  }

  close(event?: Event): void {
    event?.preventDefault();
    this.drawer.close();
  }

  submit(event: Event): void {
    event.preventDefault();
    if (this.phase() === 'scanning') return;
    const site = normalizeSiteUrl(this.draft());
    if (!site.ok) {
      this.invalid.set(true);
      this.error.set('invalid_url');
      this.announcement.set("That doesn't look like a public website address.");
      this.analytics.track('coffee_error', { location: 'coffee-drawer', error_type: 'invalid_url' });
      this.field()?.nativeElement.focus();
      return;
    }
    this.invalid.set(false);
    this.host = site.host;
    void this.scan(site.url);
  }

  cancel(): void {
    this.canceled = true;
    this.controller?.abort();
  }

  tryAnother(): void {
    this.phase.set('idle');
    this.result.set(null);
    this.error.set(null);
    this.announcement.set('');
    this.focusAfterRender(() => this.field());
  }

  booked(): void {
    this.analytics.track('coffee_book_click', {
      location: 'coffee-drawer',
      verdict: this.verdict(),
      site_host: this.host,
    });
  }


  private async scan(url: string): Promise<void> {
    this.phase.set('scanning');
    this.error.set(null);
    this.result.set(null);
    this.canceled = false;
    this.announcement.set(
      'Brewing. Lighthouse is testing both sites. This usually takes 15 to 40 seconds.',
    );
    this.analytics.track('coffee_submitted', { location: 'coffee-drawer', site_host: this.host });
    const controller = new AbortController();
    this.controller = controller;
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    let outcome: CoffeeResponse | CoffeeErrorType;
    try {
      const response = await fetch('/api/coffee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as CoffeeResponse | null;
      outcome = body?.visitor
        ? body
        : (body?.error ?? (response.status === 429 ? 'rate_limited' : 'psi_down'));
    } catch {
      // A visitor's own cancel is handled below; any other abort is the client timeout.
      outcome = controller.signal.aborted ? 'timeout' : 'psi_down';
    } finally {
      clearTimeout(timer);
      if (this.controller === controller) this.controller = null;
    }
    if (this.canceled) {
      this.phase.set('idle');
      this.announcement.set('Scan canceled.');
      this.focusAfterRender(() => this.field());
      return;
    }
    if (typeof outcome === 'string') return this.fail(outcome);
    this.result.set(outcome);
    this.phase.set('result');
    const { visitor, james } = outcome;
    const verdict = coffeeVerdict(outcome);
    if (verdict === 'no_verdict' || !visitor || !james) {
      this.announcement.set(
        `No verdict this round. Your site scored ${visitor?.overall} overall, but my own scan didn't come back.`,
      );
      this.analytics.track('coffee_error', {
        location: 'coffee-drawer',
        error_type: 'self_failed',
        site_host: this.host,
      });
    } else {
      this.announcement.set(
        `${VERDICT_COPY[verdict]} Overall score: your site ${visitor.overall}, mine ${james.overall}.`,
      );
      this.analytics.track('coffee_result', {
        location: 'coffee-drawer',
        site_host: this.host,
        verdict,
        visitor_score: visitor.overall,
        james_score: james.overall,
        visitor_performance: visitor.scores.performance,
        visitor_accessibility: visitor.scores.accessibility,
        visitor_best_practices: visitor.scores.bestPractices,
        visitor_seo: visitor.scores.seo,
      });
    }
    this.focusAfterRender(() => this.heading());
  }

  private fail(type: CoffeeErrorType): void {
    this.phase.set('error');
    this.error.set(type);
    this.invalid.set(type === 'invalid_url');
    this.announcement.set(type === 'invalid_url' ? "That address didn't work." : this.errorCopy());
    this.analytics.track('coffee_error', {
      location: 'coffee-drawer',
      error_type: type,
      ...(type === 'invalid_url' ? {} : { site_host: this.host }),
    });
    this.focusAfterRender(() => (type === 'invalid_url' ? this.field() : this.errorMessage()));
  }

  private focusAfterRender(target: () => ElementRef<HTMLElement> | undefined): void {
    afterNextRender(
      () => {
        if (this.dialog()?.nativeElement.open) target()?.nativeElement.focus();
      },
      { injector: this.injector },
    );
  }
}
