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
import { NgTemplateOutlet } from '@angular/common';
import { LucideX } from '@lucide/angular';
import { PublicAnalytics, type CoffeeScoreParameter } from '../../services/public-analytics';
import { CoffeeDrawerService } from './coffee-drawer.service';
import {
  COFFEE_CATEGORIES,
  COFFEE_STRATEGIES,
  coffeeTally,
  coffeeVerdict,
  isSelfHost,
  normalizeSiteUrl,
  scoreBand,
  type CoffeeErrorType,
  type CoffeeResponse,
  type CoffeeSite,
  type ScoreBand,
} from './coffee-contract';

type Phase = 'idle' | 'scanning' | 'result' | 'error';
type Side = 'visitor' | 'james';
/** One table cell: a score with its band and matchup mark, or null when that test failed. */
type ScoreCell = { value: number; band: ScoreBand; mark: 'won' | 'tie' | null } | null;
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
  solo: "Coffee's on me. Let's talk.",
} as const;

@Component({
  selector: 'app-coffee-drawer',
  imports: [LucideX, NgTemplateOutlet],
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

  readonly tests = COFFEE_STRATEGIES;
  readonly phase = signal<Phase>('idle');
  readonly solo = signal(false);
  readonly invalid = signal(false);
  readonly error = signal<CoffeeErrorType | null>(null);
  readonly result = signal<CoffeeResponse | null>(null);
  readonly announcement = signal('');
  readonly draft = signal('');
  readonly tally = computed(() => {
    const result = this.result();
    return coffeeTally(result?.visitor ?? null, result?.james ?? null);
  });
  readonly verdict = computed(() =>
    this.result()?.mode === 'solo' ? 'solo' : coffeeVerdict(this.tally()),
  );
  readonly verdictHeading = computed(() => VERDICT_COPY[this.verdict()]);
  /** "I won 7 of 8 · you won 0 · 1 tied", naming how many matchups scored when a test failed. */
  readonly tallyText = computed(() => {
    const t = this.tally();
    const counts = `I won ${t.james} · you won ${t.visitor} · ${t.tied} tied`;
    return t.scored === t.total
      ? `Head-to-head: I won ${t.james} of ${t.total} · you won ${t.visitor} · ${t.tied} tied.`
      : `Head-to-head, ${t.scored} of ${t.total} matchups scored: ${counts}.`;
  });
  readonly sides = computed<Side[]>(() =>
    this.result()?.mode === 'solo' ? ['james'] : ['visitor', 'james'],
  );
  /** Four category rows; each holds a cell per site and test, keyed `side-test`. */
  readonly rows = computed(() => {
    const result = this.result();
    if (!result) return [];
    const challenge = result.mode === 'challenge';
    return COFFEE_CATEGORIES.map((category) => {
      const cells: Record<string, ScoreCell> = {};
      for (const test of COFFEE_STRATEGIES) {
        const mine = result.james?.[test.id]?.scores[category.id];
        const theirs = result.visitor?.[test.id]?.scores[category.id];
        const cell = (value: number | undefined, other: number | undefined): ScoreCell =>
          value === undefined
            ? null
            : {
                value,
                band: scoreBand(value),
                mark:
                  !challenge || other === undefined
                    ? null
                    : value === other
                      ? 'tie'
                      : value > other
                        ? 'won'
                        : null,
              };
        cells['james-' + test.id] = cell(mine, theirs);
        cells['visitor-' + test.id] = cell(theirs, mine);
      }
      return { id: category.id, label: category.label, cells };
    });
  });
  readonly errorCopy = computed(() => {
    const error = this.error();
    return error && error !== 'invalid_url' && error !== 'self_failed' ? ERROR_COPY[error] : '';
  });
  readonly bookHref = computed(
    () =>
      'mailto:djamespoer@djamespoer.com?subject=' +
      encodeURIComponent(
        this.verdict() === 'solo'
          ? 'Coffee? Let’s talk.'
          : 'Coffee? Lighthouse says: ' + this.verdictHeading(),
      ),
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

  site(side: Side): CoffeeSite | null {
    return this.result()?.[side] ?? null;
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
    // djamespoer.com against itself is simply the solo scan.
    if (isSelfHost(site.host)) return this.scanSolo('own_url');
    this.host = site.host;
    this.solo.set(false);
    this.analytics.track('coffee_submitted', { location: 'coffee-drawer', site_host: this.host });
    void this.scan({ url: site.url });
  }

  scanSolo(trigger: 'button' | 'own_url' = 'button'): void {
    if (this.phase() === 'scanning') return;
    this.invalid.set(false);
    this.host = '';
    this.solo.set(true);
    this.analytics.track('coffee_solo_scan', { location: 'coffee-drawer', trigger });
    void this.scan({ mode: 'solo' });
  }

  retry(event: Event): void {
    if (this.solo()) this.scanSolo('button');
    else this.submit(event);
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
      ...(this.host ? { site_host: this.host } : {}),
    });
  }

  private async scan(body: { url: string } | { mode: 'solo' }): Promise<void> {
    this.phase.set('scanning');
    this.error.set(null);
    this.result.set(null);
    this.canceled = false;
    this.announcement.set(
      this.solo()
        ? 'Brewing. Lighthouse is testing djamespoer.com on mobile and desktop.'
        : 'Brewing. Lighthouse is testing both sites on mobile and desktop.',
    );
    const controller = new AbortController();
    this.controller = controller;
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    let outcome: CoffeeResponse | CoffeeErrorType;
    try {
      const response = await fetch('/api/coffee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => null)) as CoffeeResponse | null;
      outcome =
        data?.mode && (data.visitor || data.james)
          ? data
          : (data?.error ?? (response.status === 429 ? 'rate_limited' : 'psi_down'));
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
    this.report(outcome);
    this.focusAfterRender(() => this.heading());
  }

  private report(outcome: CoffeeResponse): void {
    const scores: Partial<Record<CoffeeScoreParameter, number>> = {};
    for (const side of ['visitor', 'james'] as const)
      for (const test of COFFEE_STRATEGIES)
        for (const category of COFFEE_CATEGORIES) {
          const value = outcome[side]?.[test.id]?.scores[category.id];
          const key = `${side}_${test.id}_${category.psi.replace('-', '_')}` as CoffeeScoreParameter;
          if (value !== undefined) scores[key] = value;
        }
    const verdict = this.verdict();
    if (verdict === 'solo') {
      this.announcement.set(
        "Coffee's on me. Let's talk. djamespoer.com's mobile and desktop scores are in the table.",
      );
      this.analytics.track('coffee_result', { location: 'coffee-drawer', verdict, ...scores });
    } else if (verdict === 'no_verdict') {
      this.announcement.set(
        "No verdict this round. Your scores are in, but my own scans didn't come back.",
      );
      this.analytics.track('coffee_error', {
        location: 'coffee-drawer',
        error_type: 'self_failed',
        site_host: this.host,
      });
    } else {
      const t = this.tally();
      this.announcement.set(`${VERDICT_COPY[verdict]} ${this.tallyText()}`);
      this.analytics.track('coffee_result', {
        location: 'coffee-drawer',
        verdict,
        site_host: this.host,
        matchups_won_visitor: t.visitor,
        matchups_won_james: t.james,
        matchups_tied: t.tied,
        ...scores,
      });
    }
  }

  private fail(type: CoffeeErrorType): void {
    this.phase.set('error');
    this.error.set(type);
    this.invalid.set(type === 'invalid_url');
    this.announcement.set(type === 'invalid_url' ? "That address didn't work." : this.errorCopy());
    this.analytics.track('coffee_error', {
      location: 'coffee-drawer',
      error_type: type,
      ...(this.host && type !== 'invalid_url' ? { site_host: this.host } : {}),
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
