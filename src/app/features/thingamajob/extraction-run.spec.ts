import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ExtractionRunPanel, type ExtractionRun } from './extraction-run';
import { WorkflowApi } from './workflow-api';
function setup() {
  const api = { extractionRun: vi.fn(), stageExtractionRun: vi.fn(), upload: vi.fn() };
  TestBed.configureTestingModule({
    imports: [ExtractionRunPanel],
    providers: [{ provide: WorkflowApi, useValue: api }],
  });
  return { api, fixture: TestBed.createComponent(ExtractionRunPanel) };
}
describe('owner extraction run panel', () => {
  it('renders citations, uncertainty, questions and emits the existing proposal review selection as data', async () => {
    const { api, fixture } = setup();
    api.extractionRun.mockResolvedValue({
      runId: 'run',
      state: 'staged',
      document: {
        questions: [{ question: 'Confirm dates?', claimIds: ['a'] }],
        conflicts: [],
        sources: [],
        claims: [
          {
            id: 'a',
            text: '<script>not markup</script>',
            sourceKey: 'fictional',
            sourceReference: { locator: 'fictional source' },
            extractionConfidence: 'medium',
            uncertainties: ['Dates uncertain'],
            conflictIds: [],
            citations: [{ locationKey: 'section 1', quote: 'Fictional quoted evidence' }],
          },
        ],
      },
      proposals: [{ candidateId: 'a', proposalId: 'p', reviewDisposition: 'proposed' }],
    } satisfies ExtractionRun);
    await fixture.componentInstance.load();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Confirm dates?');
    expect(element.textContent).toContain('Dates uncertain');
    expect(element.textContent).toContain('Fictional quoted evidence');
    expect(element.querySelector('script')).toBeNull();
    const selected = vi.fn();
    fixture.componentInstance.reviewProposal.subscribe(selected);
    Array.from(element.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Review this claim'))!
      .click();
    expect(selected).toHaveBeenCalledWith('p');
    expect(api.stageExtractionRun).not.toHaveBeenCalled();
  });
  it('clears run data and reports authorization denial honestly', async () => {
    const { api, fixture } = setup();
    api.extractionRun.mockRejectedValue(new HttpErrorResponse({ status: 403 }));
    await fixture.componentInstance.load();
    expect(fixture.componentInstance.run()).toBeNull();
    expect(fixture.componentInstance.message()).toContain('Access denied (403)');
  });
  it('rejects missing packages before uploads or staging', async () => {
    const { api, fixture } = setup();
    await fixture.componentInstance.import();
    expect(api.upload).not.toHaveBeenCalled();
    expect(api.stageExtractionRun).not.toHaveBeenCalled();
  });
});
