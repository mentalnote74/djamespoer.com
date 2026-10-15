import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { routes } from '../../app.routes';
import { ThingamajobWorkflow } from '../../features/thingamajob/workflow';
import { PortfolioReview } from './portfolio-review';
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
          ? 'Accept proposal'
          : decision === 'rejected'
            ? 'Reject proposal'
            : 'Correct proposal';
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
