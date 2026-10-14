import { vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ThingamajobWorkflow } from './workflow';
import type { Workflow, UnknownDetail, Proposal } from './workflow.models';
const overview: Workflow = {
  workspaceId: 'fictional-one',
  evidence: [],
  proposals: [],
  unknowns: [],
  limit: 100,
};
const pending: Proposal = {
  proposalId: 'proposal-one',
  statement: 'Fictional proposal',
  version: 1,
  reviewDisposition: 'proposed',
  claim: null,
  history: [{ version: 1, operation: 'proposed', statement: 'Fictional proposal' }],
};
const open: UnknownDetail = {
  unknownId: 'unknown-one',
  question: 'Fictional question',
  reason: 'Fictional gap',
  context: '',
  version: 3,
  state: 'open',
  answers: [],
  proposals: [],
  resolution: null,
  history: [],
};
describe('protected Thingamajob workflow', () => {
  let fixture: ComponentFixture<ThingamajobWorkflow>, http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ThingamajobWorkflow],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(ThingamajobWorkflow);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  async function start(data: Workflow = overview) {
    fixture.detectChanges();
    http.expectOne('/api/thingamajob/test/workflow').flush(data);
    await vi.waitFor(() => expect(fixture.componentInstance.busy()).toBe(false));
    fixture.detectChanges();
  }
  it('valid empty evidence/LoT has no client-specific facts or owner actions', async () => {
    await start();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('An empty LoT is valid');
    expect(root.textContent).not.toMatch(/James|Erica/);
    expect(root.querySelector('main')).toBeNull();
    expect(root.querySelector('h1')).not.toBeNull();
  });
  it('renders untrusted evidence/proposal markup as text without executable elements', async () => {
    await start({
      ...overview,
      evidence: [
        {
          sourceId: 'source-one',
          filename: '<script>attack()</script>',
          attribution: '<img src=x onerror=attack()>',
          sourceLocator: 'javascript:attack()',
        },
      ],
      proposals: [{ ...pending, statement: '<script>attack()</script>' }],
    });
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('<img src=x onerror=attack()>');
    expect(root.querySelector('script,img')).toBeNull();
    expect(root.querySelector('a')?.getAttribute('href')).toBe(
      '/api/thingamajob/workspaces/fictional-one/evidence/source-one/original',
    );
  });
  it('Accept sends only server version/decision and preserves independent open UNKNOWN after refresh', async () => {
    await start({ ...overview, proposals: [pending], unknowns: [open] });
    fixture.componentInstance.proposal.set(pending);
    fixture.componentInstance.unknown.set(open);
    fixture.detectChanges();
    const action = fixture.componentInstance.review('accepted');
    const req = http.expectOne(
      '/api/thingamajob/workspaces/fictional-one/assertions/proposal-one/review',
    );
    expect(req.request.body).toEqual({ decision: 'accepted', expectedVersion: 1 });
    expect(req.request.headers.has('Idempotency-Key')).toBe(true);
    const accepted = {
      ...pending,
      version: 2,
      reviewDisposition: 'accepted',
      claim: { claimId: 'claim-one', statement: 'Fictional claim', reviewDisposition: 'accepted' },
    };
    req.flush(accepted);
    (await vi.waitFor(() => http.expectOne('/api/thingamajob/test/workflow'))).flush({
      ...overview,
      proposals: [accepted],
      unknowns: [open],
    });
    (
      await vi.waitFor(() =>
        http.expectOne('/api/thingamajob/workspaces/fictional-one/assertions/proposal-one'),
      )
    ).flush(accepted);
    (
      await vi.waitFor(() =>
        http.expectOne('/api/thingamajob/workspaces/fictional-one/unknowns/unknown-one'),
      )
    ).flush(open);
    await action;
    fixture.detectChanges();
    expect(fixture.componentInstance.unknown()?.state).toBe('open');
    expect(fixture.componentInstance.message()).toContain('does not resolve');
    expect((fixture.nativeElement as HTMLElement).querySelector('[role=status]')).toBe(
      document.activeElement,
    );
  });
  it('blank Correct does not send a request', async () => {
    await start({ ...overview, proposals: [pending] });
    fixture.componentInstance.proposal.set(pending);
    await fixture.componentInstance.review('corrected');
    expect(fixture.componentInstance.message()).toContain('Enter corrected wording');
    http.expectNone((r) => r.method === 'POST');
  });
  it('a replayed proposal request reports its current reviewed state rather than inventing new pending truth', async () => {
    await start();
    const form = document.createElement('form');
    for (const [name, value] of Object.entries({
      statement: 'Fictional statement',
      attribution: 'Fictional author',
      source: 'source-one',
      locator: '',
    })) {
      const input = document.createElement('input');
      input.name = name;
      input.value = value;
      form.append(input);
    }
    const action = fixture.componentInstance.propose(new Event('submit'), form);
    const accepted = {
      ...pending,
      version: 2,
      reviewDisposition: 'accepted' as const,
      claim: {
        claimId: 'claim-one',
        statement: 'Fictional reviewed claim',
        reviewDisposition: 'accepted' as const,
      },
    };
    http
      .expectOne('/api/thingamajob/workspaces/fictional-one/assertions')
      .flush({ ...accepted, replayed: true });
    (await vi.waitFor(() => http.expectOne('/api/thingamajob/test/workflow'))).flush({
      ...overview,
      proposals: [accepted],
    });
    await action;
    expect(fixture.componentInstance.workspace()?.proposals[0].reviewDisposition).toBe('accepted');
    expect(fixture.componentInstance.message()).not.toContain('recorded as pending');
  });
  it('opening a linked proposal moves keyboard focus to its loaded detail heading', async () => {
    await start({ ...overview, proposals: [pending] });
    const action = fixture.componentInstance.selectProposal(pending.proposalId, true);
    http
      .expectOne('/api/thingamajob/workspaces/fictional-one/assertions/proposal-one')
      .flush(pending);
    await action;
    fixture.detectChanges();
    await vi.waitFor(() =>
      expect(document.activeElement?.textContent).toContain('Selected proposal: proposed'),
    );
  });
  it('denied review clears private presentation and surfaces 403 without claiming success', async () => {
    await start({ ...overview, proposals: [pending] });
    fixture.componentInstance.proposal.set(pending);
    const action = fixture.componentInstance.review('accepted');
    http
      .expectOne((r) => r.method === 'POST')
      .flush({ error: 'Access denied' }, { status: 403, statusText: 'Forbidden' });
    await action;
    expect(fixture.componentInstance.workspace()).toBeNull();
    expect(fixture.componentInstance.proposal()).toBeNull();
    expect(fixture.componentInstance.message()).toContain('403');
  });
  it('stale review is visible and never retried automatically', async () => {
    await start({ ...overview, proposals: [pending] });
    fixture.componentInstance.proposal.set(pending);
    const action = fixture.componentInstance.review('rejected');
    http
      .expectOne((r) => r.method === 'POST')
      .flush({ error: 'Review conflict' }, { status: 409, statusText: 'Conflict' });
    await action;
    expect(fixture.componentInstance.message()).toContain('Conflict (409)');
    http.expectNone((r) => r.method === 'POST');
  });
  it('only linked accepted/corrected claims qualify, and confirmation is native-required', async () => {
    const claim = {
      claimId: 'claim-one',
      statement: 'Fictional corrected claim',
      reviewDisposition: 'corrected' as const,
    };
    await start({
      ...overview,
      proposals: [{ ...pending, reviewDisposition: 'corrected', claim }],
    });
    fixture.componentInstance.unknown.set({
      ...open,
      proposals: [
        {
          answerId: 'answer-one',
          proposalId: 'proposal-one',
          statement: 'Fictional original',
          reviewDisposition: 'corrected',
          claimId: 'claim-one',
          reviewHistory: [],
        },
      ],
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.qualifying()).toEqual([claim]);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('input[type=checkbox][required]')).not.toBeNull();
    fixture.componentInstance.unknown.set({ ...open, proposals: [] });
    expect(fixture.componentInstance.qualifying()).toEqual([]);
  });
  it('initial denial does not provision or borrow another workspace', async () => {
    fixture.detectChanges();
    http
      .expectOne('/api/thingamajob/test/workflow')
      .flush({ error: 'Access denied' }, { status: 403, statusText: 'Forbidden' });
    await vi.waitFor(() => expect(fixture.componentInstance.busy()).toBe(false));
    expect(fixture.componentInstance.workspace()).toBeNull();
    expect(fixture.componentInstance.message()).toContain('Access denied');
    http.expectNone((r) => r.method === 'POST');
  });
  it('superseded approval is audit history only, while its active replacement qualifies as current truth', async () => {
    const replacement = {
      claimId: 'replacement',
      statement: 'Accurate fictional correction',
      reviewDisposition: 'corrected' as const,
    };
    await start({
      ...overview,
      proposals: [
        { ...pending, proposalId: 'old-proposal', reviewDisposition: 'accepted', claim: null },
        {
          ...pending,
          proposalId: 'replacement-proposal',
          reviewDisposition: 'corrected',
          claim: replacement,
        },
      ],
    });
    fixture.componentInstance.proposal.set({
      ...pending,
      reviewDisposition: 'accepted',
      claim: null,
      historicalClaim: {
        claimId: 'old-claim',
        statement: 'Historical false fictional claim',
        reviewDisposition: 'accepted',
        lifecycleState: 'superseded',
      },
      supersession: {
        eventId: 'event',
        replacementClaimId: 'replacement',
        replacementProposalId: 'replacement-proposal',
        replacementReviewId: 'review',
        reason: 'Correct this fact',
        recordedAt: 1,
        executionContext: 'owner_access',
        authorizationReference: '',
      },
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.claims()).toEqual([replacement]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Historical claim');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'excluded from active LoT',
    );
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('form:has(select[name=replacement])'),
    ).toBeNull();
  });
  it('visible LoT audit button reads the owner-scoped proposal and renders review provenance without a mutation', async () => {
    const active = {
      ...pending,
      proposalId: 'reviewed-proposal',
      reviewDisposition: 'accepted' as const,
      claim: {
        claimId: 'claim-audit',
        statement: 'Fictional approved claim',
        reviewDisposition: 'accepted' as const,
      },
    };
    await start({ ...overview, proposals: [active] });
    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector<HTMLButtonElement>('#claims-heading + p + ul button');
    expect(button?.textContent?.trim()).toBe('View history / audit');
    button!.click();
    const request = http.expectOne(
      '/api/thingamajob/workspaces/fictional-one/assertions/reviewed-proposal',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      ...active,
      proposedAt: 100,
      proposerActorId: 'fictional-actor',
      review: {
        reviewId: 'review-audit',
        decision: 'accepted',
        ownerActorId: 'fictional-actor',
        reviewedAt: 200,
        correctedStatement: '',
        expectedVersion: 1,
        resultingVersion: 2,
      },
    });
    await vi.waitFor(() => expect(fixture.componentInstance.busy()).toBe(false));
    fixture.detectChanges();
    expect(root.textContent).toContain('Original owner review');
    expect(root.textContent).toContain('review-audit');
    expect(root.textContent).toContain('fictional-actor');
    expect(root.textContent).toContain('1970-01-01 00:03:20 UTC');
    http.expectNone((r) => r.method === 'POST');
  });
});
