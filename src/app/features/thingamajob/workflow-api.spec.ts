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
});
