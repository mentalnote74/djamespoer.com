import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
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
  testsFor,
  type CoffeeErrorType,
  type CoffeeStrategy,
  type CoffeeTestSet,
  type CoffeeResponse,
  type CoffeeSite,
  type ScoreBand,
} from './coffee-contract';

type Phase = 'idle' | 'scanning' | 'result' | 'error';
type Side = 'visitor' | 'james';
/** One table cell: a score with its band and matchup mark, or null when that test failed. */
type ScoreCell = { value: number; band: ScoreBand; mark: 'won' | 'tie' | null } | null;
// SCRUM-218: no cutoff; we wait for Google. This only stops a spinner that would never end.
const CLIENT_SAFETY_MS = 300000;
const STILL_BREWING_AFTER = 30;
/** Phones get the mobile test; tablets, laptops and desktops get the desktop test. */
const PHONE = '(pointer: coarse) and (max-width: 48rem)';
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
  private readonly document = inject(DOCUMENT);
  private readonly analytics = inject(PublicAnalytics);
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  private readonly errorMessage = viewChild<ElementRef<HTMLElement>>('errorMessage');

  /** The tests the shown result ran, in display order. */
  readonly tests = computed(() =>
    COFFEE_STRATEGIES.filter((test) => this.result()?.tests.includes(test.id)),
  );
  readonly elapsed = signal(0);
  readonly scanning = signal<CoffeeTestSet>('desktop');
  readonly retestChoice = signal<CoffeeTestSet>('all');
  readonly retestOptions: readonly { id: CoffeeTestSet; label: string }[] = [
    { id: 'mobile', label: 'Mobile' },
    { id: 'desktop', label: 'Desktop' },
    { id: 'all', label: 'All four' },
  ];
  readonly clock = computed(() => {
    const s = this.elapsed();
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  });
  readonly brewingTest = computed(() =>
    this.scanning() === 'all' ? 'the mobile and desktop tests' : 'the ' + this.scanning() + ' test',
  );
  readonly phase = signal<Phase>('idle');
  readonly solo = signal(false);
  readonly invalid = signal(false);
  readonly error = signal<CoffeeErrorType | null>(null);
  readonly result = signal<CoffeeResponse | null>(null);
  readonly announcement = signal('');
  readonly draft = signal('');
  readonly tally = computed(() => {
    const result = this.result();
    return coffeeTally(result?.visitor ?? null, result?.james ?? null, result?.tests ?? []);
  });
  readonly verdict = computed(() =>
    this.result()?.mode === 'solo' ? 'solo' : coffeeVerdict(this.tally()),
  );
  readonly verdictHeading = computed(() => VERDICT_COPY[this.verdict()]);
  /** "I won 7 of 8 · you won 0 · 1 tied", naming how many matchups scored when a test failed. */
  readonly tallyText = computed(() => {
    const t = this.tally();
    const counts = `I won ${t.james} · you won ${t.visitor} · ${t.tied} tied`;
    const tests = this.tests();
    const name = tests.length === 1 ? `${tests[0].label} test head-to-head` : 'Head-to-head';
    return t.scored === t.total
      ? `${name}: I won ${t.james} of ${t.total} · you won ${t.visitor} · ${t.tied} tied.`
      : `${name}, ${t.scored} of ${t.total} matchups scored: ${counts}.`;
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
  private target: { url: string } | { mode: 'solo' } | null = null;
  private controller: AbortController | null = null;
  private canceled = false;
  private ticker: ReturnType<typeof setInterval> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.ticker));
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
    const set = this.deviceTest();
    this.analytics.track('coffee_submitted', {
      location: 'coffee-drawer',
      site_host: this.host,
      test_set: set,
    });
    void this.scan({ url: site.url }, set);
  }

  scanSolo(trigger: 'button' | 'own_url' = 'button'): void {
    if (this.phase() === 'scanning') return;
    this.invalid.set(false);
    this.host = '';
    this.solo.set(true);
    const set = this.deviceTest();
    this.analytics.track('coffee_solo_scan', { location: 'coffee-drawer', trigger, test_set: set });
    void this.scan({ mode: 'solo' }, set);
  }

  /** SCRUM-218: rerun the same site, or the solo scan, with the chosen tests. */
  runAgain(): void {
    if (!this.target || this.phase() === 'scanning') return;
    const set = this.retestChoice();
    this.analytics.track('coffee_retest', { location: 'coffee-drawer', test_set: set });
    void this.scan(this.target, set);
  }

  retry(event: Event): void {
    if (this.target && this.phase() !== 'scanning') void this.scan(this.target, this.scanning());
    else if (this.solo()) this.scanSolo('button');
    else this.submit(event);
  }

  /** Data choice, not presentation: it decides which Lighthouse test to request. */
  private deviceTest(): CoffeeStrategy {
    return this.document.defaultView?.matchMedia?.(PHONE).matches ? 'mobile' : 'desktop';
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

  private async scan(body: { url: string } | { mode: 'solo' }, set: CoffeeTestSet): Promise<void> {
    this.target = body;
    this.scanning.set(set);
    this.phase.set('scanning');
    this.error.set(null);
    this.result.set(null);
    this.canceled = false;
    const where = this.solo() ? 'djamespoer.com' : 'both sites';
    this.announcement.set(`Brewing. Lighthouse is running ${this.brewingTest()} on ${where}.`);
    this.elapsed.set(0);
    clearInterval(this.ticker);
    this.ticker = setInterval(() => {
      this.elapsed.update((s) => s + 1);
      // One extra announcement, never a per-second countdown.
      if (this.elapsed() === STILL_BREWING_AFTER)
        this.announcement.set("Still brewing. Google's taking its time. You can cancel any time.");
    }, 1000);
    const controller = new AbortController();
    this.controller = controller;
    const timer = setTimeout(() => controller.abort(), CLIENT_SAFETY_MS);
    let outcome: CoffeeResponse | CoffeeErrorType;
    try {
      const response = await fetch('/api/coffee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, tests: testsFor(set) }),
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
      clearInterval(this.ticker);
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
    // Offer the test that hasn't run yet; after all four, offer all four again.
    this.retestChoice.set(set === 'all' ? 'all' : set === 'mobile' ? 'desktop' : 'mobile');
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
        "Coffee's on me. Let's talk. djamespoer.com's scores are in the table.",
      );
      this.analytics.track('coffee_result', {
        location: 'coffee-drawer',
        verdict,
        test_set: this.scanning(),
        ...scores,
      });
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
        test_set: this.scanning(),
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
