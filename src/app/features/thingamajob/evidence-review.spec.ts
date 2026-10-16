import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { EvidenceReview } from './evidence-review';
import { WorkflowApi } from './workflow-api';
import type { Proposal, Workflow } from './workflow.models';

async function setup() {
  const p: Proposal = {
    proposalId: 'fictional-p',
    statement: 'Contributed fictional interfaces.',
    version: 1,
    reviewDisposition: 'proposed',
    claim: null,
    evidence: [{ sourceId: 'fictional-source', locator: 'Text lines v1: line 1' }],
  };
  const api = {
    sourceCandidates: vi
      .fn()
      .mockResolvedValue({
        source: { filename: 'fictional.txt' },
        method: 'text-lines-v1',
        candidates: [
          { statement: p.statement, excerpt: p.statement, locator: p.evidence![0].locator },
        ],
      }),
    stageTextCandidate: vi.fn().mockResolvedValue(p),
    review: vi
      .fn()
      .mockResolvedValue({
        ...p,
        reviewDisposition: 'accepted',
        claim: {
          claimId: 'fictional-claim',
          statement: p.statement,
          reviewDisposition: 'accepted',
        },
      }),
    evidenceUrl: (id: string) => '/fictional/' + id,
  };
  await TestBed.configureTestingModule({
    imports: [EvidenceReview],
    providers: [{ provide: WorkflowApi, useValue: api }],
  }).compileComponents();
  const fixture = TestBed.createComponent(EvidenceReview);
  fixture.componentRef.setInput('workspace', {
    workspaceId: 'fictional',
    evidence: [],
    proposals: [],
    unknowns: [],
    limit: 100,
  } satisfies Workflow);
  fixture.detectChanges();
  return { fixture, api };
}

it('keeps source preview separate from persisted proposals and explicit approval', async () => {
  const { fixture, api } = await setup();
  const c = fixture.componentInstance;
  await c.openSource('fictional-source');
  expect(api.stageTextCandidate).not.toHaveBeenCalled();
  expect(api.review).not.toHaveBeenCalled();
  await c.openCandidate(0);
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Contributed fictional interfaces.');
  expect(c.proposal()?.claim).toBeNull();
  await c.decide('accepted');
  expect(api.review).toHaveBeenCalledWith(
    expect.objectContaining({ proposalId: 'fictional-p' }),
    'accepted',
    'Contributed fictional interfaces.',
  );
  expect(c.proposal()?.claim?.claimId).toBe('fictional-claim');
});

it('clears private review content and stops further actions after denied access', async () => {
  const { fixture, api } = await setup();
  const c = fixture.componentInstance;
  await c.openSource('fictional-source');
  api.stageTextCandidate.mockRejectedValue(new HttpErrorResponse({ status: 403 }));
  await c.openCandidate(0);
  fixture.detectChanges();
  expect(c.candidates()).toEqual([]);
  expect(c.proposal()).toBeNull();
  expect(fixture.nativeElement.textContent).toContain('access denied');
  await c.openSource('another-source');
  expect(api.sourceCandidates).toHaveBeenCalledTimes(1);
});
