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
import { runCoffeeJob } from './coffee-job';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { LucideX } from '@lucide/angular';
import { PublicAnalytics, type CoffeeScoreParameter } from '../../services/public-analytics';
import { CoffeeDrawerService } from './coffee-drawer.service';
import {
  COFFEE_CATEGORIES,
  COFFEE_STRATEGIES,
  coffeeTally,
  coffeeVerdict,
  displayUrl,
  isSelfHost,
  normalizeSiteUrl,
  scoreBand,
  testsFor,
  type CoffeeErrorType,
  type CoffeeTestSet,
  type CoffeeResponse,
  type CoffeeSite,
  type ScoreBand,
} from './coffee-contract';

type Phase = 'idle' | 'choose' | 'scanning' | 'result' | 'error';
type TestSource = 'connection' | 'prompt';
type Side = 'visitor' | 'james';
/** One table cell: a score with its band and matchup mark, or null when that test failed. */
type ScoreCell = { value: number; band: ScoreBand; mark: 'won' | 'tie' | null } | null;
// Bound the complete job, including host startup; API requests themselves are short.
const CLIENT_SAFETY_MS = 420000;
const STILL_BREWING_AFTER = 30;
const ERROR_COPY: Record<Exclude<CoffeeErrorType, 'invalid_url' | 'self_failed'>, string> = {
  unreachable:
    "Lighthouse couldn't load that site. Check the address. Some sites block automated tests.",
  rate_limited: "That's a lot of coffee. Try again in a minute.",
  timeout: 'That took too long to brew. Lighthouse may still be busy, so try again.',
  psi_down: 'The browser test could not finish. Please try again.',
  runner_unavailable: 'The browser test could not finish. Please try again.',
  test_mismatch: 'Matching Lighthouse versions and settings could not be verified.',
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
  private readonly choiceHeading = viewChild<ElementRef<HTMLElement>>('choiceHeading');
  private readonly errorMessage = viewChild<ElementRef<HTMLElement>>('errorMessage');

  /** The tests the shown result ran, in display order. */
  readonly tests = computed(() =>
    COFFEE_STRATEGIES.filter((test) => this.result()?.tests.includes(test.id)),
  );
  readonly elapsed = signal(0);
  readonly runnerState = signal('queued');
  readonly scanning = signal<CoffeeTestSet>('desktop');
  readonly source = signal<TestSource>('connection');
  /** One shared mode per pair: a challenge tests two sites. */
  readonly choices = computed(() => {
    const sites = this.solo() ? 1 : 2;
    const tests = (n: number) => n + (n === 1 ? ' test' : ' tests');
    return [
      { id: 'mobile' as const, label: `Mobile (${tests(sites)})` },
      { id: 'desktop' as const, label: `Desktop (${tests(sites)})` },
    ];
  });
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
    this.result()?.mode === 'solo'
      ? 'solo'
      : this.result()?.comparable === false
        ? 'no_verdict'
        : coffeeVerdict(this.tally()),
  );
  readonly verdictHeading = computed(() => VERDICT_COPY[this.verdict()]);
  /** "I won 7 of 8 · you won 0 · 1 tied", naming how many matchups scored when a test failed. */
  readonly tallyText = computed(() => {
    const t = this.tally();
    const counts = `I won ${t.james} · you won ${t.visitor} · ${t.tied} tied`;
    const tests = this.tests();
    const test = tests.length === 1 ? `${tests[0].label} test head-to-head` : 'Head-to-head';
    const name = `${test}, ${this.visitorLabel()} vs djamespoer.com`;
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
    const challenge = result.mode === 'challenge' && result.comparable !== false;
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
  /** SCRUM-220: the full tested URL for GA (James's decision). Empty for solo scans. */
  private siteUrl = '';
  /** The visitor's exact tested URL, as shown in the table, key and banner. */
  readonly visitorLabel = computed(() => {
    const url = this.result()?.visitor?.url;
    return url ? displayUrl(url) : this.siteUrl;
  });
  private target: { url: string } | { mode: 'solo' } | null = null;
  private trigger: 'button' | 'own_url' = 'button';
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
      this.analytics.track('coffee_error', {
        location: 'coffee-drawer',
        error_type: 'invalid_url',
      });
      this.field()?.nativeElement.focus();
      return;
    }
    this.invalid.set(false);
    // djamespoer.com against itself is simply the solo scan.
    if (isSelfHost(site.host)) return this.scanSolo('own_url');
    this.host = site.host;
    this.siteUrl = displayUrl(site.url);
    this.solo.set(false);
    this.target = { url: site.url };
    this.begin();
  }

  scanSolo(trigger: 'button' | 'own_url' = 'button'): void {
    if (this.phase() === 'scanning') return;
    this.invalid.set(false);
    this.host = '';
    this.siteUrl = '';
    this.solo.set(true);
    this.target = { mode: 'solo' };
    this.trigger = trigger;
    this.begin();
  }

  /** The visitor picked a test in the prompt: before the first scan, or to run again. */
  choose(set: CoffeeTestSet): void {
    if (!this.target || this.phase() === 'scanning') return;
    if (this.phase() === 'result') {
      this.analytics.track('coffee_retest', {
        location: 'coffee-drawer',
        test_set: set,
        ...(this.siteUrl ? { site_url: this.siteUrl } : {}),
      });
      this.source.set('prompt');
      void this.scan(this.target, set);
    } else this.start(set, 'prompt');
  }

  /** Match a manually selected Lighthouse mode; connection speed does not select the test. */
  private begin(): void {
    this.error.set(null);
    this.phase.set('choose');
    this.announcement.set('Choose the same Lighthouse test you want to compare manually.');
    this.focusAfterRender(() => this.choiceHeading());
  }

  private start(set: CoffeeTestSet, source: TestSource): void {
    this.source.set(source);
    if (this.solo())
      this.analytics.track('coffee_solo_scan', {
        location: 'coffee-drawer',
        trigger: this.trigger,
        test_set: set,
        test_source: source,
      });
    else
      this.analytics.track('coffee_submitted', {
        location: 'coffee-drawer',
        site_host: this.host,
        site_url: this.siteUrl,
        test_set: set,
        test_source: source,
      });
    void this.scan(this.target!, set);
  }

  retry(event: Event): void {
    if (this.target && this.phase() !== 'scanning') void this.scan(this.target, this.scanning());
    else if (this.solo()) this.scanSolo('button');
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
      ...(this.host ? { site_host: this.host, site_url: this.siteUrl } : {}),
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
    this.runnerState.set('queued');
    clearInterval(this.ticker);
    this.ticker = setInterval(() => {
      this.elapsed.update((s) => s + 1);
      // One extra announcement, never a per-second countdown.
      if (this.elapsed() === STILL_BREWING_AFTER)
        this.announcement.set('The comparison is still in progress. You can cancel any time.');
    }, 1000);
    const controller = new AbortController();
    this.controller = controller;
    const timer = setTimeout(() => controller.abort(), CLIENT_SAFETY_MS);
    let outcome: CoffeeResponse | CoffeeErrorType;
    try {
      outcome = await runCoffeeJob(
        {
          ...body,
          tests: testsFor(set),
          internal:
            this.document.defaultView?.localStorage.getItem('portfolio.analytics.internal') === '1',
        },
        controller.signal,
        (state) => this.runnerState.set(state),
      );
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
          const key =
            `${side}_${test.id}_${category.psi.replace('-', '_')}` as CoffeeScoreParameter;
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
        test_source: this.source(),
        ...scores,
      });
    } else if (verdict === 'no_verdict') {
      this.announcement.set(
        'No verdict this round. The scans are incomplete or their settings could not be matched. Available scores are in the table.',
      );
      this.analytics.track('coffee_error', {
        location: 'coffee-drawer',
        error_type: outcome.error ?? 'psi_down',
        site_host: this.host,
        site_url: this.siteUrl,
      });
    } else {
      const t = this.tally();
      this.announcement.set(`${VERDICT_COPY[verdict]} ${this.tallyText()}`);
      this.analytics.track('coffee_result', {
        location: 'coffee-drawer',
        verdict,
        test_set: this.scanning(),
        test_source: this.source(),
        site_host: this.host,
        site_url: this.siteUrl,
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
      ...(this.host && type !== 'invalid_url'
        ? { site_host: this.host, site_url: this.siteUrl }
        : {}),
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
