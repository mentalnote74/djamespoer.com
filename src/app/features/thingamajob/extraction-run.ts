import { Component, computed, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import type { Proposal } from './workflow.models';
import { WorkflowApi } from './workflow-api';
export interface BaselineIssue {
  id: string;
  question: string;
  claimIds: string[];
  answer: { answer: string } | null;
  answeredAt?: number;
}
export interface ExtractionRun {
  baseline?: {
    evaluations: {
      candidateId: string;
      category: string;
      reasons: string[];
      policyVersion: string;
      recordedAt: number;
    }[];
    issues: BaselineIssue[];
  };
  runId: string;
  state: string;
  document: {
    claims: {
      id: string;
      text: string;
      sourceKey: string;
      sourceReference: { locator?: string; capturedAt?: string; originalSha256?: string };
      extractionConfidence: string;
      uncertainties: string[];
      conflictIds: string[];
      citations: { locationKey: string; quote: string }[];
    }[];
    questions: { question: string; claimIds: string[] }[];
    conflicts: { id: string; explanation: string; claimIds: string[] }[];
    sources: { key: string; sourceId: string; sha256: string }[];
  };
  proposals: { candidateId: string; proposalId: string; reviewDisposition: string }[];
}
const RUN = '1f96a7ab-1567-4678-bcef-15b840439cc7';
async function hash(file: File) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())),
    (v) => v.toString(16).padStart(2, '0'),
  ).join('');
}
@Component({
  selector: 'app-extraction-run',
  templateUrl: './extraction-run.html',
  styleUrl: './extraction-run.scss',
})
export class ExtractionRunPanel {
  private readonly api = inject(WorkflowApi);
  readonly reviewProposal = output<string>();
  readonly reviewed = output<void>();
  readonly run = signal<ExtractionRun | null>(null);
  readonly busy = signal(false);
  readonly message = signal('Load the Client #1 extraction run to review its candidates.');
  readonly selectedId = signal('');
  readonly pendingOnly = signal(true);
  readonly source = signal('');
  readonly questionsOpen = signal(false);
  readonly category = signal('attention');
  readonly challenge = signal(false);
  readonly issueId = signal('');
  readonly issueAnswer = signal('');
  readonly issueDecisions = signal<{ candidateId: string; statement: string; reject: boolean }[]>(
    [],
  );
  readonly openIssues = computed(() => this.run()?.baseline?.issues.filter((i) => !i.answer) ?? []);
  readonly selectedIssue = computed(() =>
    this.run()?.baseline?.issues.find((i) => i.id === this.issueId()),
  );
  readonly classification = computed(() =>
    this.run()?.baseline?.evaluations.find((e) => e.candidateId === this.selectedId()),
  );
  readonly classCounts = computed(() =>
    ['baseline', 'attention', 'qualified', 'invalid'].map((category) => ({
      category,
      count:
        this.run()?.baseline?.evaluations.filter(
          (e) =>
            e.category === category &&
            (category !== 'baseline' ||
              this.proposal(e.candidateId)?.reviewDisposition === 'proposed'),
        ).length ?? 0,
    })),
  );
  async chooseIssue(id: string) {
    if (this.busy()) return;
    this.issueId.set(id);
    this.issueAnswer.set('');
    const issue = this.run()?.baseline?.issues.find((i) => i.id === id);
    this.issueDecisions.set(
      (issue?.claimIds ?? []).map((candidateId) => ({
        candidateId,
        statement: this.run()?.document.claims.find((c) => c.id === candidateId)?.text ?? '',
        reject: false,
      })),
    );
    this.selectedId.set('');
    this.detail.set(null);
    this.questionsOpen.set(true);
  }
  editIssue(index: number, statement: string) {
    this.issueDecisions.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, statement } : row)),
    );
  }
  rejectIssue(index: number, reject: boolean) {
    this.issueDecisions.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, reject } : row)),
    );
  }
  claim(id: string) {
    return this.run()?.document.claims.find((c) => c.id === id);
  }
  async saveIssue() {
    if (this.busy() || !this.issueId() || !this.issueAnswer().trim()) return;
    this.busy.set(true);
    try {
      await this.api.resolveBaselineIssue(RUN, {
        issueId: this.issueId(),
        answer: this.issueAnswer(),
        decisions: this.issueDecisions(),
      });
      this.run.set(await this.api.extractionRun(RUN));
      this.reviewed.emit();
      this.message.set('Answer and explicit owner decisions saved. No unrelated claim changed.');
      this.busy.set(false);
      await this.chooseIssue(this.openIssues()[0]?.id ?? '');
    } catch (error) {
      this.failure(error);
    } finally {
      this.busy.set(false);
    }
  }
  readonly stay = signal(false);
  readonly correction = signal('');
  readonly detail = signal<Proposal | null>(null);
  readonly heading = viewChild<ElementRef<HTMLElement>>('claimHeading');
  readonly visible = computed(
    () =>
      this.run()?.document.claims.filter(
        (c) =>
          (!this.source() || c.sourceKey === this.source()) &&
          (!this.run()?.baseline ||
            !this.category() ||
            this.run()?.baseline?.evaluations.some(
              (e) => e.candidateId === c.id && e.category === this.category(),
            )) &&
          (!this.pendingOnly() || this.proposal(c.id)?.reviewDisposition === 'proposed'),
      ) ?? [],
  );
  readonly active = computed(() =>
    this.run()?.document.claims.find((c) => c.id === this.selectedId()),
  );
  readonly pending = computed(
    () =>
      this.run()?.proposals.filter(
        (p) =>
          p.reviewDisposition === 'proposed' &&
          (!this.run()?.baseline ||
            this.run()?.baseline?.evaluations.some(
              (e) => e.candidateId === p.candidateId && e.category === 'attention',
            )),
      ).length ?? 0,
  );
  readonly decisions = computed(() =>
    ['accepted', 'corrected', 'rejected'].map((state) => ({
      state,
      count: this.run()?.proposals.filter((p) => p.reviewDisposition === state).length ?? 0,
    })),
  );
  readonly linkedQuestions = computed(
    () =>
      this.run()?.document.questions.filter((q) => q.claimIds.includes(this.selectedId())) ?? [],
  );
  async select(id: string, focus = true) {
    if (this.busy()) return;
    this.selectedId.set(id);
    this.challenge.set(false);
    this.questionsOpen.set(false);
    this.detail.set(null);
    this.correction.set('');
    const proposal = this.proposal(id);
    if (!proposal) return;
    this.busy.set(true);
    try {
      this.detail.set(await this.api.proposal(proposal.proposalId));
    } catch (error) {
      this.failure(error);
    } finally {
      this.busy.set(false);
      if (focus) setTimeout(() => this.heading()?.nativeElement.focus());
    }
  }
  async navigate(delta: number) {
    const list = this.visible();
    const i = list.findIndex((c) => c.id === this.selectedId());
    const next = list[i + delta];
    if (next) await this.select(next.id);
  }
  async filter() {
    await this.select(this.visible()[0]?.id ?? '');
  }
  position() {
    return (this.run()?.document.claims.findIndex((c) => c.id === this.selectedId()) ?? -1) + 1;
  }
  atBoundary(delta: number) {
    const i = this.visible().findIndex((c) => c.id === this.selectedId());
    return !this.visible()[i + delta];
  }
  async decide(decision: 'accepted' | 'corrected' | 'rejected') {
    const p = this.detail();
    if (this.busy() || !p || p.reviewDisposition !== 'proposed') return;
    if (decision === 'corrected' && !this.correction().trim()) {
      this.message.set('Enter corrected wording before choosing Correct.');
      return;
    }
    this.busy.set(true);
    try {
      const saved = await this.api.review(p, decision, this.correction());
      this.detail.set(saved);
      const run = await this.api.extractionRun(RUN);
      this.run.set(run);
      this.message.set('Decision saved: ' + saved.reviewDisposition + '.');
      this.reviewed.emit();
      this.busy.set(false);
      if (!this.stay()) {
        const all = run.document.claims;
        const current = all.findIndex((c) => c.id === this.selectedId());
        const ordered = [...all.slice(current + 1), ...all.slice(0, current)];
        const next = ordered.find(
          (c) =>
            (!this.source() || c.sourceKey === this.source()) &&
            this.proposal(c.id)?.reviewDisposition === 'proposed' &&
            (!run.baseline ||
              run.baseline.evaluations.some(
                (e) => e.candidateId === c.id && e.category === 'attention',
              )),
        );
        if (next) await this.select(next.id);
        else this.message.set('Decision saved. No pending claims remain in this source/filter.');
      }
    } catch (error) {
      this.failure(error);
    } finally {
      this.busy.set(false);
    }
  }
  private files: File[] = [];
  choose(input: HTMLInputElement) {
    this.files = Array.from(input.files ?? []);
  }
  proposal(id: string) {
    return this.run()?.proposals.find((p) => p.candidateId === id);
  }
  private failure(error: unknown) {
    const status = error instanceof HttpErrorResponse ? error.status : undefined;
    if (status === 401 || status === 403 || status === 0) this.run.set(null);
    this.message.set(
      status === 403
        ? 'Access denied (403). This run is unavailable to this identity/workspace, or has not been imported.'
        : status === 409
          ? 'Conflict (409). No decision was retried. Reload the run before continuing.'
          : 'The action could not be completed. Saved decisions remain recorded and your current draft is preserved. Check the session; continue an interrupted question with the same answer and wording.',
    );
  }
  async load() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      this.run.set(await this.api.extractionRun(RUN));
      this.message.set(
        'Run loaded. Routine source-established facts need no approval. Review the focused exceptions.',
      );
    } catch (error) {
      this.failure(error);
    } finally {
      this.busy.set(false);
    }
    if (this.run()?.baseline) {
      this.questionsOpen.set(true);
      await this.chooseIssue(this.openIssues()[0]?.id ?? '');
    } else if (this.run()) await this.filter();
  }
  async import() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const manifestFile = this.files.find((f) => f.name === 'manifest.json');
      const templateFile = this.files.find((f) => f.name === 'import-template.json');
      if (
        !manifestFile ||
        !templateFile ||
        manifestFile.size > 100000 ||
        templateFile.size > 1000000
      )
        throw new Error('Package required');
      if (
        (await hash(manifestFile)) !==
        '3368e56becf45054c7b19807e123ed0ce699462146dc7ab0e3d9494dad8835e1'
      )
        throw new Error('Manifest changed');
      const manifest = JSON.parse(await manifestFile.text()) as {
        templateSha256: string;
        files: {
          key: string;
          file: string;
          sha256: string;
          attribution: string;
          sourceLocator: string;
        }[];
      };
      if ((await hash(templateFile)) !== manifest.templateSha256)
        throw new Error('Template changed');
      const document = JSON.parse(await templateFile.text()) as ExtractionRun['document'] & {
        extractionRunId: string;
      };
      if (
        document.extractionRunId !== RUN ||
        document.claims.length !== 65 ||
        document.questions.length !== 4
      )
        throw new Error('Wrong run');
      // Validate every local file before sending any source. Original evidence is never rewritten.
      for (const source of manifest.files) {
        const file = this.files.find((f) => f.name === source.file);
        if (!file || (await hash(file)) !== source.sha256) throw new Error('Source changed');
      }
      for (const source of manifest.files) {
        const file = this.files.find((f) => f.name === source.file)!;
        const saved = (await this.api.upload(
          new File([file], file.name, { type: 'text/plain' }),
          source.attribution,
          source.sourceLocator,
          'extraction-source-' + source.sha256,
        )) as { sourceId: string };
        const binding = document.sources.find((s) => s.key === source.key);
        if (!binding || !saved.sourceId) throw new Error('Source unavailable');
        binding.sourceId = saved.sourceId;
      }
      let result: ExtractionRun | undefined;
      for (let step = 0; step < 13; step++) {
        result = await this.api.stageExtractionRun(RUN, document);
        this.run.set(result);
        this.message.set(`Staged ${result.proposals.length}/65 candidates. No automatic approval.`);
        if (result.state === 'staged') break;
      }
      if (result?.state !== 'staged' || result.proposals.length !== 65)
        throw new Error('Incomplete import');
      this.message.set(
        '65/65 candidates staged. Four questions preserved. No candidate was automatically approved.',
      );
    } catch (error) {
      this.failure(error);
    } finally {
      this.busy.set(false);
    }
  }
}
