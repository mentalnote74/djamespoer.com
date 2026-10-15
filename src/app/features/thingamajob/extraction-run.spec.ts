import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ExtractionRunPanel, type ExtractionRun } from './extraction-run';
import { WorkflowApi } from './workflow-api';
function data(): ExtractionRun {
  return {
    runId: 'run',
    state: 'staged',
    document: {
      questions: [{ question: 'Confirm dates?', claimIds: ['a'] }],
      conflicts: [{ id: 'conflict', explanation: 'Different dates', claimIds: ['a', 'b'] }],
      sources: [{ key: 'resume', sourceId: 's', sha256: 'hash' }],
      claims: ['a', 'b', 'c'].map((id) => ({
        id,
        text: id === 'a' ? '<script>not markup</script>' : 'Claim ' + id,
        sourceKey: 'resume',
        sourceReference: { locator: 'fictional source' },
        extractionConfidence: 'medium',
        uncertainties: ['Dates uncertain'],
        conflictIds: ['conflict'],
        citations: [{ locationKey: 'section 1', quote: 'Fictional evidence ' + id }],
      })),
    },
    proposals: ['a', 'b', 'c'].map((id) => ({
      candidateId: id,
      proposalId: id,
      reviewDisposition: 'proposed',
    })),
  };
}
function setup() {
  const run = data();
  const api = {
    extractionRun: vi.fn().mockImplementation(async () => structuredClone(run)),
    stageExtractionRun: vi.fn(),
    upload: vi.fn(),
    proposal: vi
      .fn()
      .mockImplementation(async (id: string) => ({
        proposalId: id,
        statement: 'Claim ' + id,
        version: 1,
        reviewDisposition: run.proposals.find((p) => p.proposalId === id)!.reviewDisposition,
        claim: null,
      })),
    review: vi.fn().mockImplementation(async (p: { proposalId: string }, decision: string) => {
      run.proposals.find((i) => i.proposalId === p.proposalId)!.reviewDisposition = decision;
      return { ...p, reviewDisposition: decision };
    }),
  };
  TestBed.configureTestingModule({
    imports: [ExtractionRunPanel],
    providers: [{ provide: WorkflowApi, useValue: api }],
  });
  return { api, run, fixture: TestBed.createComponent(ExtractionRunPanel) };
}
describe('bounded owner extraction review', () => {
  it('renders only one claim, preserves untrusted citations as data and exposes linked questions', async () => {
    const { fixture } = setup();
    await fixture.componentInstance.load();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('article')).toHaveLength(1);
    expect(el.textContent).toContain('Claim 1 of 3');
    expect(el.textContent).not.toContain('Fictional evidence b');
    expect(el.textContent).toContain('Confirm dates?');
    expect(el.textContent).toContain('Different dates');
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('article details')?.hasAttribute('open')).toBe(false);
    await fixture.componentInstance.navigate(1);
    fixture.detectChanges();
    expect(el.textContent).toContain('Claim 2 of 3');
    expect(el.textContent).not.toContain('Fictional evidence a');
  });
  it('saves through the existing versioned review API and advances to next pending', async () => {
    const { fixture, api } = setup();
    const c = fixture.componentInstance;
    await c.load();
    await c.decide('accepted');
    expect(api.review).toHaveBeenCalledWith(
      expect.objectContaining({ proposalId: 'a', version: 1 }),
      'accepted',
      '',
    );
    expect(c.selectedId()).toBe('b');
    expect(c.pending()).toBe(2);
    expect(c.decisions().find((d) => d.state === 'accepted')?.count).toBe(1);
  });
  it('honors stay, requires corrected wording and preserves drafts on stale failure', async () => {
    const { fixture, api } = setup();
    const c = fixture.componentInstance;
    await c.load();
    await c.decide('corrected');
    expect(api.review).not.toHaveBeenCalled();
    c.correction.set('Accurate wording');
    api.review.mockRejectedValueOnce(new HttpErrorResponse({ status: 409 }));
    await c.decide('corrected');
    expect(c.selectedId()).toBe('a');
    expect(c.correction()).toBe('Accurate wording');
    expect(c.message()).toContain('Conflict (409)');
    c.stay.set(true);
    await c.decide('corrected');
    expect(c.selectedId()).toBe('a');
    expect(c.pending()).toBe(2);
  });
  it('filters reviewed items without losing access to decisions and questions', async () => {
    const { fixture } = setup();
    const c = fixture.componentInstance;
    await c.load();
    await c.decide('rejected');
    expect(c.visible()).toHaveLength(2);
    c.pendingOnly.set(false);
    await c.filter();
    expect(c.visible()).toHaveLength(3);
    expect(c.selectedId()).toBe('a');
    expect(c.linkedQuestions()).toHaveLength(1);
  });
  it('denies unavailable identity and rejects missing packages before mutation', async () => {
    const { api, fixture } = setup();
    api.extractionRun.mockRejectedValue(new HttpErrorResponse({ status: 403 }));
    await fixture.componentInstance.load();
    expect(fixture.componentInstance.run()).toBeNull();
    expect(fixture.componentInstance.message()).toContain('Access denied (403)');
    await fixture.componentInstance.import();
    expect(api.upload).not.toHaveBeenCalled();
    expect(api.stageExtractionRun).not.toHaveBeenCalled();
  });
});
