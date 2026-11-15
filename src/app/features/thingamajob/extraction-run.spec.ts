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
    resolveBaselineIssue: vi.fn().mockResolvedValue({ saved: true }),
    upload: vi.fn(),
    proposal: vi.fn().mockImplementation(async (id: string) => ({
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
  it('makes questions the primary queue and baseline inspection approval-free', async () => {
    const { fixture, run, api } = setup();
    run.baseline = {
      evaluations: run.document.claims.map((c, i) => ({
        candidateId: c.id,
        category: i === 0 ? 'baseline' : i === 1 ? 'attention' : 'qualified',
        reasons: ['Fictional source vetting'],
        policyVersion: 'fictional',
        recordedAt: 1,
      })),
      issues: [{ id: 'q', question: 'Canonical title?', claimIds: ['b'], answer: null }],
    };
    const c = fixture.componentInstance;
    await c.load();
    fixture.detectChanges();
    expect(c.selectedIssue()?.question).toBe('Canonical title?');
    expect(c.active()).toBeUndefined();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Review 1 items that need your attention',
    );
    c.category.set('baseline');
    c.pendingOnly.set(false);
    await c.filter();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('no approval required');
    expect(
      Array.from(el.querySelectorAll('article button')).some(
        (b) => b.textContent?.trim() === 'Accept',
      ),
    ).toBe(false);
    expect(api.review).not.toHaveBeenCalled();
  });
  it('saves one question and related statements in one explicit action, preserving answer draft on conflict', async () => {
    const { fixture, run, api } = setup();
    run.baseline = {
      evaluations: [],
      issues: [{ id: 'q', question: 'Canonical title?', claimIds: ['a', 'b'], answer: null }],
    };
    const c = fixture.componentInstance;
    await c.load();
    c.issueAnswer.set('Canonical title confirmed');
    c.editIssue(0, 'Accurate title');
    api.resolveBaselineIssue.mockRejectedValueOnce(new HttpErrorResponse({ status: 409 }));
    await c.saveIssue();
    expect(c.issueAnswer()).toBe('Canonical title confirmed');
    expect(c.issueDecisions()[0].statement).toBe('Accurate title');
    expect(c.message()).toContain('Conflict (409)');
    await c.saveIssue();
    expect(api.resolveBaselineIssue).toHaveBeenLastCalledWith(expect.any(String), {
      issueId: 'q',
      answer: 'Canonical title confirmed',
      decisions: [
        { candidateId: 'a', statement: 'Accurate title', reject: false },
        { candidateId: 'b', statement: 'Claim b', reject: false },
      ],
    });
  });
  it('keeps source title variants informational without selecting a canonical title or asking the original question again', async () => {
    const { fixture, run, api } = setup();
    run.baseline = {
      evaluations: run.document.claims.map((c) => ({
        candidateId: c.id,
        category: 'qualified',
        reasons: ['Source-specific presentation'],
        policyVersion: 'fictional-v2',
        recordedAt: 2,
      })),
      issues: [],
      titleHistory: [
        {
          issueId: 'old-title',
          question: 'Which title is correct?',
          reason: 'Wording alone is not a conflict',
          policyVersion: 'fictional-v2',
        },
      ],
      rolePresentations: [
        {
          candidateId: 'a',
          roleKey: 'same-role',
          sourceId: 'fictional',
          presentedTitle: 'Fictional tailored title',
          canonicalTitle: null,
          associationBasis: 'Compatible employer, dates and responsibilities',
        },
      ],
    };
    const c = fixture.componentInstance;
    await c.load();
    expect(c.openIssues()).toHaveLength(0);
    c.category.set('qualified');
    c.pendingOnly.set(false);
    await c.filter();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(c.linkedQuestions()).toHaveLength(0);
    expect(root.textContent).toContain('Source-presented title: Fictional tailored title');
    expect(root.textContent).toContain('Canonical employer title has not been selected');
    expect(root.textContent).toContain('Presentation and context history (informational)');
    expect(root.querySelector('article')?.textContent).not.toContain('Conflict:');
    expect(api.review).not.toHaveBeenCalled();
  });
  it('shows no review obligation for source-date summaries and preserves existing owner clarification', async () => {
    const { fixture, run } = setup();
    run.baseline = {
      evaluations: run.document.claims.map((c) => ({
        candidateId: c.id,
        category: 'qualified',
        reasons: ['Source context retained'],
        policyVersion: 'fictional-v3',
        recordedAt: 3,
      })),
      issues: [],
      sourceContexts: [
        {
          candidateId: 'a',
          kind: 'duration_summary',
          display: 'Historical summary only; not canonical duration',
          documentDate: null,
          dateBasis: 'Date unknown; capture time is separate',
          ownerAnswer: { answer: 'Accurate at that time' },
        },
      ],
    };
    const c = fixture.componentInstance;
    await c.load();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No questions currently require your attention',
    );
    c.category.set('qualified');
    c.pendingOnly.set(false);
    await c.filter();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Accurate at that time');
    expect(text).toContain('Historical summary only');
    expect(c.openIssues()).toHaveLength(0);
  });
});
