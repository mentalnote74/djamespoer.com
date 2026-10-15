import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { describe, it, expect, vi } from 'vitest';
import { CareerRecord, clientWording, careerGroup } from './career-record';
import { WorkflowApi } from './workflow-api';
import type { Workflow } from './workflow.models';
import type { ExtractionRun } from './extraction-run';
function data(count = 0) {
  const run: ExtractionRun = {
    runId: 'fictional-career-run',
    state: 'staged',
    document: {
      sources: [{ key: 'resume', sourceId: 'source', sha256: 'fictional' }],
      claims: Array.from({ length: 46 + count }, (_, i) => ({
        id: 'c' + i,
        text:
          i < 46
            ? 'The owner maintained fictional forms ' + i
            : 'The owner completed fictional project ' + i,
        sourceKey: 'resume',
        sourceReference: { locator: 'Fictional paragraph' },
        extractionConfidence: 'high',
        uncertainties: [],
        conflictIds: [],
        citations: [{ locationKey: 'p' + i, quote: '<script>Fictional source ' + i + '</script>' }],
      })),
      questions: [],
      conflicts: [],
    },
    proposals: Array.from({ length: 46 + count }, (_, i) => ({
      candidateId: 'c' + i,
      proposalId: 'p' + i,
      reviewDisposition: 'proposed',
    })),
    baseline: {
      evaluations: Array.from({ length: 46 + count }, (_, i) => ({
        candidateId: 'c' + i,
        category: i < 46 ? 'baseline' : 'attention',
        reasons: ['Fictional source context'],
        policyVersion: 'fictional',
        recordedAt: 1,
      })),
      issues: Array.from({ length: count }, (_, i) => ({
        id: 'q' + i,
        question: 'Which fictional date is accurate ' + i + '?',
        claimIds: ['c' + (46 + i)],
        answer: null,
      })),
    },
  };
  const workspace: Workflow = {
    workspaceId: 'fictional-workspace',
    evidence: [
      {
        sourceId: 'source',
        filename: 'fictional.txt',
        attribution: 'Fictional source',
        sourceLocator: 'fixture',
      },
    ],
    proposals: [],
    unknowns: [],
    limit: 100,
    baselineClaims: run.document.claims.slice(0, 46).map((c, i) => ({
      candidateId: c.id,
      proposalId: 'p' + i,
      statement: c.text,
      runId: run.runId,
      establishedAt: 1,
      basis: 'source_baseline',
      policyVersion: 'fictional',
    })),
    reviewedClaims: [],
    extractionRuns: [{ runId: run.runId, createdAt: 1 }],
  };
  return { workspace, run };
}
async function setup(count = 0) {
  const { workspace, run } = data(count);
  const api = {
    overview: vi.fn().mockImplementation(async () => structuredClone(workspace)),
    extractionRun: vi.fn().mockImplementation(async () => structuredClone(run)),
    evidenceUrl: vi.fn().mockReturnValue('/fictional-source'),
    clear: vi.fn(),
    review: vi.fn(),
    proposal: vi.fn(),
    resolveBaselineIssue: vi
      .fn()
      .mockImplementation(async (_id: string, body: { issueId: string; answer: string }) => {
        run.baseline!.issues.find((q) => q.id === body.issueId)!.answer = { answer: body.answer };
        return { saved: true };
      }),
  };
  TestBed.configureTestingModule({
    imports: [CareerRecord],
    providers: [{ provide: WorkflowApi, useValue: api }],
  });
  const fixture = TestBed.createComponent(CareerRecord);
  fixture.detectChanges();
  await fixture.whenStable();
  return { api, run, workspace, fixture };
}
describe('human-first private career record', () => {
  it('lands on a useful zero-question record summary with no internal review/import dump', async () => {
    const { fixture, api } = await setup();
    await fixture.componentInstance.load();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Your career record is ready');
    expect(root.textContent).toContain('46');
    expect(root.textContent).toContain('0 things need your attention');
    expect(root.textContent).not.toMatch(
      /candidate run|pending proposal|independent UNKNOWN|import package/i,
    );
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(api.resolveBaselineIssue).not.toHaveBeenCalled();
    expect(api.extractionRun).toHaveBeenCalledWith('fictional-career-run');
  });
  it('groups facts, keeps evidence collapsed and renders untrusted citations as data', async () => {
    const { fixture, api } = await setup();
    const c = fixture.componentInstance;
    await c.load();
    c.go('record');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Experience');
    expect(root.querySelectorAll('script')).toHaveLength(0);
    expect(root.querySelector('details')?.open).toBe(false);
    expect(api.review).not.toHaveBeenCalled();
    expect(api.resolveBaselineIssue).not.toHaveBeenCalled();
    expect(clientWording('The owner was a fictional designer.')).toBe(
      'You were a fictional designer.',
    );
    expect(careerGroup('Bachelor of Science in a fictional field')).toBe('Education');
  });
  it('answers one genuine question through existing grouped review and returns to completion', async () => {
    const { fixture, api } = await setup(1);
    const c = fixture.componentInstance;
    await c.load();
    await c.startReview();
    fixture.detectChanges();
    expect(c.edits()).toHaveLength(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Thing 1 of 1');
    c.answer.set('The source date is correct');
    await c.save();
    expect(api.resolveBaselineIssue).not.toHaveBeenCalled();
    c.checked.set(true);
    await c.save();
    expect(api.resolveBaselineIssue).toHaveBeenCalledWith('fictional-career-run', {
      issueId: 'q0',
      answer: 'The source date is correct',
      decisions: [
        {
          candidateId: 'c46',
          statement: 'The owner completed fictional project 46',
          reject: false,
        },
      ],
    });
    expect(c.screen()).toBe('home');
    expect(c.questions()).toHaveLength(0);
    expect(api.review).not.toHaveBeenCalled();
  });
  it('advances several questions without reusing prior wording or resetting visit progress', async () => {
    const { fixture } = await setup(3);
    const c = fixture.componentInstance;
    await c.load();
    await c.startReview();
    c.answer.set('First answer');
    c.checked.set(true);
    await c.save();
    expect(c.questions()).toHaveLength(2);
    expect(c.reviewTotal()).toBe(3);
    expect(c.answeredThisVisit()).toBe(1);
    expect(c.answer()).toBe('');
    expect(c.edits()[0].candidateId).toBe('c47');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Thing 2 of 3');
  });
  it('keeps a clarification draft when backing out and on a stale decision', async () => {
    const { fixture, api } = await setup(1);
    const c = fixture.componentInstance;
    await c.load();
    await c.startReview();
    c.answer.set('Draft answer');
    c.edit(0, { statement: 'Corrected fictional wording' });
    c.go('home');
    await c.startReview();
    expect(c.answer()).toBe('Draft answer');
    expect(c.edits()[0].statement).toBe('Corrected fictional wording');
    c.checked.set(true);
    api.resolveBaselineIssue.mockRejectedValueOnce(new HttpErrorResponse({ status: 409 }));
    await c.save();
    expect(c.screen()).toBe('review');
    expect(c.answer()).toBe('Draft answer');
    expect(c.status()).toContain('409');
  });
  it('clears private records on denied access and never masks authorization failure', async () => {
    const { fixture, api } = await setup();
    const c = fixture.componentInstance;
    await c.load();
    api.overview.mockRejectedValueOnce(new HttpErrorResponse({ status: 403 }));
    await c.load();
    fixture.detectChanges();
    expect(c.workspace()).toBeNull();
    expect(c.runs()).toHaveLength(0);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Access denied (403)');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('fictional forms');
  });
  it('supports an independent empty client without importing another client facts', async () => {
    const { fixture, workspace } = await setup();
    workspace.workspaceId = 'other-fictional-client';
    workspace.baselineClaims = [];
    workspace.extractionRuns = [];
    workspace.evidence = [];
    const c = fixture.componentInstance;
    await c.load();
    fixture.detectChanges();
    expect(c.facts()).toHaveLength(0);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No career facts have been established',
    );
    expect((fixture.nativeElement as HTMLElement).textContent).not.toMatch(
      /James|Erica|fictional forms/,
    );
  });
});
