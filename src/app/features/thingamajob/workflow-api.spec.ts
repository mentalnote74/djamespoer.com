import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkflowApi } from './workflow-api';
describe('Thingamajob service boundary', () => {
  let api: WorkflowApi, http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WorkflowApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(WorkflowApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  async function initialize(workspaceId = 'fixture-one') {
    const request = api.overview();
    http
      .expectOne('/api/thingamajob/test/workflow')
      .flush({ workspaceId, evidence: [], proposals: [], unknowns: [], limit: 100 });
    await request;
  }
  it('rejects mutation before authoritative own-workspace discovery', async () => {
    await expect(api.createUnknown('Fictional', 'Fictional', '')).rejects.toThrow(
      'Workspace unavailable',
    );
    http.expectNone((r) => r.method === 'POST');
  });
  it('changed decision changes idempotency key; identical retries reuse it', async () => {
    await initialize();
    const p = {
      proposalId: 'p-one',
      statement: 'Fictional',
      version: 1,
      reviewDisposition: 'proposed' as const,
      claim: null,
    };
    let request = api.review(p, 'accepted');
    let req = http.expectOne((r) => r.method === 'POST');
    const key = req.request.headers.get('Idempotency-Key');
    req.flush(p);
    await request;
    request = api.review(p, 'accepted');
    req = http.expectOne((r) => r.method === 'POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe(key);
    req.flush(p);
    await request;
    request = api.review(p, 'rejected');
    req = http.expectOne((r) => r.method === 'POST');
    expect(req.request.headers.get('Idempotency-Key')).not.toBe(key);
    req.flush(p);
    await request;
  });
  it('record identifiers cannot inject another endpoint or origin', async () => {
    await initialize();
    expect(() => api.evidenceUrl('https://hostile.invalid')).toThrow();
    expect(() => api.proposal('../fixture-two')).toThrow();
    http.expectNone((r) => r.url.includes('hostile'));
  });
  it('uses the server-selected workspace and does not send actor/role headers', async () => {
    await initialize('fixture-two');
    const request = api.createUnknown('Fictional', 'Fictional', '');
    const req = http.expectOne('/api/thingamajob/workspaces/fixture-two/unknowns');
    expect(req.request.body).toEqual({ question: 'Fictional', reason: 'Fictional', context: '' });
    expect(req.request.headers.has('X-Actor-Id')).toBe(false);
    expect(req.request.headers.has('X-Role')).toBe(false);
    req.flush({});
    await request;
  });
  it('post-approval correction has an explicit target and never sends owner or execution authority', async () => {
    await initialize();
    const request = api.createCorrection(
      { claimId: 'old-claim', statement: 'Fictional', reviewDisposition: 'accepted' },
      'Accurate fictional correction',
      'Fictional owner',
      'source-one',
      '',
      'Correct this fact',
    );
    const req = http.expectOne(
      '/api/thingamajob/workspaces/fixture-one/claims/old-claim/corrections',
    );
    expect(req.request.body).toEqual({
      statement: 'Accurate fictional correction',
      proposerAttribution: 'Fictional owner',
      evidence: [{ sourceId: 'source-one', locator: '' }],
      correctionReason: 'Correct this fact',
    });
    expect(req.request.headers.has('X-Role')).toBe(false);
    req.flush({});
    await request;
  });
  it('explicit supersession sends only replacement, expected versions and reason with stable retry key', async () => {
    await initialize();
    const old = {
      claimId: 'old-claim',
      statement: 'Fictional',
      reviewDisposition: 'accepted' as const,
    };
    const first = api.supersede(old, 'replacement', 'Correct this fact');
    const req = http.expectOne(
      '/api/thingamajob/workspaces/fixture-one/claims/old-claim/supersede',
    );
    const key = req.request.headers.get('Idempotency-Key');
    expect(req.request.body).toEqual({
      replacementClaimId: 'replacement',
      expectedObsoleteVersion: 1,
      expectedReplacementVersion: 1,
      reason: 'Correct this fact',
    });
    req.flush({});
    await first;
    const retry = api.supersede(old, 'replacement', 'Correct this fact');
    const again = http.expectOne(
      '/api/thingamajob/workspaces/fixture-one/claims/old-claim/supersede',
    );
    expect(again.request.headers.get('Idempotency-Key')).toBe(key);
    again.flush({});
    await retry;
  });
});
