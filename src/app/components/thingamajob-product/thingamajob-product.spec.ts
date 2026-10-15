import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { routes } from '../../app.routes';
import { ThingamajobWorkflow } from '../../features/thingamajob/workflow';
import { PortfolioReview } from '../../features/thingamajob/portfolio-review';
async function start() {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
  });
  const harness = await RouterTestingHarness.create('/thingamajob');
  const widget = harness.routeDebugElement!.query(By.directive(ThingamajobWorkflow))
    .componentInstance as ThingamajobWorkflow;
  await vi.waitFor(() => expect(widget.proposal()).not.toBeNull());
  harness.detectChanges();
  return { harness, widget, root: harness.routeNativeElement! };
}
describe('Thingamajob case study and real workflow component', () => {
  it('explains the durable evidence-led product and clearly labels the separate public demo', async () => {
    const { root } = await start();
    const overview = root.querySelector('.product-introduction')!;
    expect(overview.textContent).toContain('A career assistant built around verified evidence');
    expect(overview.textContent).toContain('The person decides.');
    expect(overview.textContent).toContain('fictional, tab-local data');
    const study = root.querySelector('.case-study')!;
    for (const heading of [
      'The problem',
      'The Library of Truth',
      'Provenance matters',
      'The first proof',
      'From evidence to job evaluation',
      'Human control',
      'Multi-client by design',
      'Designed for failure too',
      'Active product',
    ]) {
      expect(study.textContent).toContain(heading);
    }
    expect(study.textContent).not.toContain('not wired into');
    expect(root.querySelector('app-thingamajob-workflow')?.textContent).toContain(
      'not the Thingamajob evaluator',
    );
    expect(root.querySelector('a[href*="api"], iframe')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
  it('compares job text with fictional evidence without inventing fit or approving a claim', async () => {
    const { widget, harness, root } = await start();
    const form = root.querySelector<HTMLFormElement>('app-thingamajob-workflow form')!;
    widget.compareJobDescription(new Event('submit'), form);
    harness.detectChanges();
    expect(widget.jobComparison()?.matched).toEqual(['Accessibility', 'Workshops', 'Facilitation']);
    expect(widget.claims()).toHaveLength(0);
    expect(widget.proposal()?.reviewDisposition).toBe('proposed');
    expect(root.querySelector('#job-task-heading')?.textContent).toBe(
      'Before: phrase-overlap demo',
    );
    expect(root.textContent).toContain('not a fit score');
    widget.jobDescription.set('SQL database administration');
    harness.detectChanges();
    widget.compareJobDescription(new Event('submit'), form);
    harness.detectChanges();
    expect(widget.jobComparison()?.matched).toEqual([]);
    expect(widget.claims()).toHaveLength(0);
    await widget.resetSample();
    expect(widget.jobComparison()).toBeNull();
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('surfaces missing correction wording without claiming success', async () => {
    const { widget, harness, root } = await start();
    await widget.review('corrected');
    harness.detectChanges();
    expect(root.querySelector('.notice')?.textContent).toContain('Enter corrected wording');
    expect(widget.proposal()?.reviewDisposition).toBe('proposed');
    expect(widget.claims()).toHaveLength(0);
  });
  it('embeds the existing controller with no private API or identifiers and one page heading', async () => {
    const { root, widget } = await start();
    expect(widget.portfolio).not.toBeNull();
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelector('app-thingamajob-workflow')).not.toBeNull();
    expect(root.querySelector('main,iframe,input[type=file]')).toBeNull();
    expect(root.textContent).toContain('fictional sample');
    expect(root.textContent).toContain('Daily Job Dredge');
    expect(root.textContent).not.toMatch(
      /UNKNOWN|VERIFIED|ASSERTED|REVIEWING|TEST|LIVE|sample-proposal|sample-claim|fictional-portfolio|api-test/,
    );
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
  it.each(['accepted', 'rejected', 'corrected'] as const)(
    'runs the real component review handler for %s and preserves original history',
    async (decision) => {
      const { harness, widget, root } = await start();
      const original = widget.proposal()!.statement;
      if (decision === 'corrected') {
        widget.correction.set('Morgan facilitated three workshops for a sample team.');
        harness.detectChanges();
      }
      const label =
        decision === 'accepted'
          ? 'Use this statement'
          : decision === 'rejected'
            ? 'Do not use'
            : 'Use corrected wording';
      [...root.querySelectorAll<HTMLButtonElement>('button')]
        .find((b) => b.textContent?.trim() === label)!
        .click();
      await vi.waitFor(() => expect(widget.proposal()?.reviewDisposition).toBe(decision));
      harness.detectChanges();
      expect(widget.proposal()!.statement).toBe(original);
      expect(widget.proposal()!.history).toHaveLength(2);
      expect(widget.claims()).toHaveLength(decision === 'rejected' ? 0 : 1);
      await widget.resetSample();
      harness.detectChanges();
      expect(widget.proposal()?.reviewDisposition).toBe('proposed');
      expect(widget.claims()).toHaveLength(0);
      TestBed.inject(HttpTestingController).expectNone(() => true);
    },
  );
  it('escapes corrected text rather than executing content', async () => {
    const { widget, harness, root } = await start();
    widget.correction.set('<img src=x onerror=attack()>');
    await widget.review('corrected');
    harness.detectChanges();
    expect(root.querySelector('app-thingamajob-workflow img')).toBeNull();
    expect(root.textContent).toContain('<img src=x onerror=attack()>');
  });
  it('rejects stale local decisions and never exposes unsupported upload or private operations', async () => {
    const api = new PortfolioReview();
    const proposal = (await api.overview()).proposals[0];
    await api.review(proposal, 'accepted');
    await expect(api.review(proposal, 'rejected')).rejects.toMatchObject({ status: 409 });
    await expect(api.upload()).rejects.toThrow('No uploads');
    await expect(api.unknown()).rejects.toThrow('Not offered');
  });
});
