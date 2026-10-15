import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import type { Workflow, Proposal } from './workflow.models';
import type { ExtractionRun, BaselineIssue } from './extraction-run';
import { WorkflowApi } from './workflow-api';
import { ThingamajobWorkflow } from './workflow';
type DraftEdit = { candidateId: string; statement: string; reject: boolean; editing: boolean };
type Fact = {
  id: string;
  proposalId: string;
  text: string;
  run?: ExtractionRun;
  candidateId?: string;
  reviewed?: boolean;
};
type Question = { run: ExtractionRun; issue: BaselineIssue };
type Screen = 'home' | 'record' | 'evidence' | 'review' | 'advanced';
export function clientWording(text: string) {
  return text
    .replace(/\bThe owner has\b/g, 'You have')
    .replace(/\bthe owner has\b/g, 'you have')
    .replace(/\bThe owner is\b/g, 'You are')
    .replace(/\bthe owner is\b/g, 'you are')
    .replace(/\bThe owner was\b/g, 'You were')
    .replace(/\bthe owner was\b/g, 'you were')
    .replace(/\bThe owner's\b/g, 'Your')
    .replace(/\bthe owner's\b/g, 'your')
    .replace(/\bThe owner\b/g, 'You')
    .replace(/\bthe owner\b/g, 'you');
}
export function careerGroup(text: string) {
  if (/\b(certificate|certification|certified|ITIL)\b/i.test(text)) return 'Certifications';
  if (/\b(degree|bachelor|master|associate of|education|school of)\b/i.test(text))
    return 'Education';
  if (/\b(website|site|project|wireframe|study|award|progressive web|application)\b/i.test(text))
    return 'Projects and accomplishments';
  if (/\b(skills?|technolog|HTML|CSS|Sass|Angular|WCAG|ARIA|training|trained)\b/i.test(text))
    return 'Skills and technologies';
  return 'Experience';
}
@Component({
  selector: 'app-career-record',
  imports: [ThingamajobWorkflow],
  templateUrl: './career-record.html',
  styleUrl: './career-record.scss',
})
export class CareerRecord implements OnInit {
  readonly api = inject(WorkflowApi);
  readonly workspace = signal<Workflow | null>(null);
  readonly runs = signal<ExtractionRun[]>([]);
  readonly screen = signal<Screen>('home');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly status = signal('Loading your career record.');
  readonly failed = signal(false);
  readonly heading = viewChild<ElementRef<HTMLElement>>('pageHeading');
  readonly notice = viewChild<ElementRef<HTMLElement>>('notice');
  readonly questionIndex = signal(0);
  readonly reviewTotal = signal(0);
  readonly answeredThisVisit = signal(0);
  readonly answer = signal('');
  readonly edits = signal<
    { candidateId: string; statement: string; reject: boolean; editing: boolean }[]
  >([]);
  readonly checked = signal(false);
  readonly sources = signal(new Map<string, Proposal>());
  readonly sourceErrors = signal(new Set<string>());
  readonly sourceBusy = signal(new Set<string>());
  readonly wording = clientWording;
  readonly facts = computed<Fact[]>(() => {
    const w = this.workspace();
    if (!w) return [];
    const baseline = (w.baselineClaims ?? []).map((c) => ({
      id: 'source-' + c.proposalId,
      proposalId: c.proposalId,
      text: c.statement,
      run: this.runs().find((r) => r.runId === c.runId),
      candidateId: c.candidateId,
    }));
    const reviewed = (
      w.reviewedClaims ??
      w.proposals.flatMap((p) => (p.claim ? [{ ...p.claim, proposalId: p.proposalId }] : []))
    ).map((c) => {
      const run = this.runs().find((r) => r.proposals.some((p) => p.proposalId === c.proposalId));
      return {
        id: c.claimId,
        reviewed: true,
        proposalId: c.proposalId,
        text: c.statement,
        run,
        candidateId: run?.proposals.find((p) => p.proposalId === c.proposalId)?.candidateId,
      };
    });
    return [...baseline, ...reviewed];
  });
  readonly established = computed(() => this.workspace()?.baselineClaims?.length ?? 0);
  readonly groups = computed(() =>
    [
      'Experience',
      'Projects and accomplishments',
      'Skills and technologies',
      'Education',
      'Certifications',
    ]
      .map((name) => ({ name, facts: this.facts().filter((f) => careerGroup(f.text) === name) }))
      .filter((g) => g.facts.length),
  );
  readonly questions = computed<Question[]>(() =>
    this.runs().flatMap((run) =>
      (run.baseline?.issues ?? [])
        .filter((issue) => !issue.answer)
        .map((issue) => ({ run, issue })),
    ),
  );
  readonly question = computed(() => this.questions()[this.questionIndex()]);
  readonly complete = computed(() =>
    this.runs().every(
      (r) => r.state === 'staged' && r.baseline?.evaluations.length === r.document.claims.length,
    ),
  );
  readonly notes = computed(() =>
    this.runs().flatMap((run) =>
      run.document.claims
        .filter((c) =>
          run.baseline?.evaluations.some(
            (e) => e.candidateId === c.id && e.category === 'qualified',
          ),
        )
        .map((c) => ({
          run,
          claim: c,
          context: run.baseline?.sourceContexts?.find((s) => s.candidateId === c.id),
          title: run.baseline?.rolePresentations?.find((s) => s.candidateId === c.id),
        })),
    ),
  );
  readonly selectedNote = signal(0);
  readonly category = signal('Experience');
  readonly activeGroup = computed(
    () => this.groups().find((g) => g.name === this.category()) ?? this.groups()[0],
  );
  private readonly drafts = new Map<
    string,
    { answer: string; edits: DraftEdit[]; checked: boolean }
  >();
  private reviewKey: string | undefined;
  async ngOnInit() {
    await this.load();
  }
  private focusHeading() {
    setTimeout(() => this.heading()?.nativeElement.focus());
  }
  go(screen: Screen) {
    if (this.screen() === 'review' && screen !== 'review') this.rememberDraft();
    this.screen.set(screen);
    this.focusHeading();
  }
  private rememberDraft() {
    if (this.screen() === 'review' && this.reviewKey && this.edits().length)
      this.drafts.set(this.reviewKey, {
        answer: this.answer(),
        edits: this.edits().map((e) => ({ ...e })),
        checked: this.checked(),
      });
  }
  private error(error: unknown) {
    const status = error instanceof HttpErrorResponse ? error.status : undefined;
    if (status === 401 || status === 403 || status === 0) {
      this.workspace.set(null);
      this.runs.set([]);
      this.sources.set(new Map());
      this.drafts.clear();
      this.answer.set('');
      this.edits.set([]);
      this.api.clear();
    }
    this.failed.set(true);
    this.status.set(
      status === 403
        ? 'Access denied (403). This account is not authorized to open these records.'
        : status === 401
          ? 'Your sign-in has expired (401). Reload this protected page to sign in again.'
          : status === 0
            ? 'Your connection or sign-in is unavailable. Reload this protected page to reconnect.'
            : status === 409
              ? 'This record changed (409). Your draft is preserved. Reload the record and check its current wording before saving again.'
              : 'Your career record could not be updated. Your draft is preserved; no completed action is claimed. Please try loading it again.',
    );
    setTimeout(() => this.notice()?.nativeElement.focus());
  }
  async load() {
    if (this.saving()) return;
    this.rememberDraft();
    this.loading.set(true);
    this.failed.set(false);
    try {
      const w = await this.api.overview();
      const runs: ExtractionRun[] = [];
      for (const group of this.chunks(w.extractionRuns ?? [], 3))
        runs.push(...(await Promise.all(group.map((r) => this.api.extractionRun(r.runId)))));
      if (this.workspace()?.workspaceId !== w.workspaceId) {
        this.drafts.clear();
        this.sources.set(new Map());
        this.reviewKey = undefined;
        this.answer.set('');
        this.edits.set([]);
        this.checked.set(false);
      }
      this.workspace.set(w);
      this.runs.set(runs);
      this.status.set('Career record loaded.');
      if (this.screen() === 'review') this.go('home');
    } catch (error) {
      this.error(error);
    } finally {
      this.loading.set(false);
    }
  }
  private chunks<T>(items: T[], size: number) {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
    return result;
  }
  candidate(f: Fact) {
    return f.run?.document.claims.find((c) => c.id === f.candidateId);
  }
  factContext(f: Fact) {
    return f.run?.baseline?.sourceContexts?.find((c) => c.candidateId === f.candidateId);
  }
  sourceName(run: ExtractionRun | undefined, key: string) {
    const id = run?.document.sources.find((s) => s.key === key)?.sourceId;
    return (
      this.workspace()?.evidence.find((e) => e.sourceId === id)?.filename ??
      'Your supporting document'
    );
  }
  async inspect(f: Fact, element: HTMLDetailsElement) {
    if (
      !element.open ||
      (this.candidate(f) && !f.reviewed) ||
      this.sources().has(f.id) ||
      this.sourceBusy().has(f.id)
    )
      return;
    this.sourceBusy.update((s) => new Set(s).add(f.id));
    this.sourceErrors.update((s) => {
      const next = new Set(s);
      next.delete(f.id);
      return next;
    });
    const workspaceId = this.workspace()?.workspaceId;
    try {
      const p = await this.api.proposal(f.proposalId);
      if (this.workspace()?.workspaceId === workspaceId)
        this.sources.update((m) => new Map(m).set(f.id, p));
    } catch (error) {
      this.sourceErrors.update((s) => new Set(s).add(f.id));
      if (this.workspace()?.workspaceId === workspaceId) this.error(error);
    } finally {
      this.sourceBusy.update((s) => {
        const next = new Set(s);
        next.delete(f.id);
        return next;
      });
    }
  }
  async startReview(index = 0, continuing = false) {
    if (this.saving()) return;
    this.rememberDraft();
    if (!continuing) {
      this.reviewTotal.set(this.questions().length);
      this.answeredThisVisit.set(0);
    }
    this.questionIndex.set(index);
    const q = this.question();
    if (!q) return;
    this.reviewKey = q.run.runId + ':' + q.issue.id;
    const draft = this.drafts.get(this.reviewKey);
    this.answer.set(draft?.answer ?? '');
    this.checked.set(draft?.checked ?? false);
    this.edits.set(
      draft?.edits ??
        q.issue.claimIds.map((candidateId) => ({
          candidateId,
          statement: q.run.document.claims.find((c) => c.id === candidateId)?.text ?? '',
          reject: false,
          editing: false,
        })),
    );
    this.go('review');
  }
  edit(index: number, changes: Partial<{ statement: string; reject: boolean; editing: boolean }>) {
    this.edits.update((rows) => rows.map((row, i) => (i === index ? { ...row, ...changes } : row)));
  }
  async save() {
    const q = this.question();
    if (this.saving() || !q || !this.answer().trim() || !this.checked()) return;
    if (this.edits().some((e) => !e.statement.trim())) {
      this.status.set('Please enter the wording you want to keep.');
      return;
    }
    let saved = false;
    this.saving.set(true);
    this.failed.set(false);
    try {
      await this.api.resolveBaselineIssue(q.run.runId, {
        issueId: q.issue.id,
        answer: this.answer(),
        decisions: this.edits().map(({ candidateId, statement, reject }) => ({
          candidateId,
          statement,
          reject,
        })),
      });
      saved = true;
      this.answeredThisVisit.update((n) => n + 1);
      const refreshed = await this.api.extractionRun(q.run.runId);
      this.runs.update((r) => r.map((item) => (item.runId === refreshed.runId ? refreshed : item)));
      this.workspace.set(await this.api.overview());
      this.status.set('Your answer and career-record wording have been saved.');
      this.saving.set(false);
      if (this.questions().length)
        await this.startReview(Math.min(this.questionIndex(), this.questions().length - 1), true);
      else this.go('home');
    } catch (error) {
      this.error(error);
      if (saved && this.workspace())
        this.status.set(
          'Your answer was saved, but the refreshed career record could not be loaded. Reload the record before continuing.',
        );
    } finally {
      this.saving.set(false);
    }
  }
  async leaveAdvanced() {
    await this.load();
    this.go('home');
  }
}
