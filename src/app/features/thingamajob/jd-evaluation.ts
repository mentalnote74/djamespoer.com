import {
  Component,
  ElementRef,
  inject,
  InjectionToken,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
interface Requirement {
  id: string;
  requirement: string;
  jdQuote: string;
  importance: 'required' | 'preferred' | 'unspecified';
  outcome: 'MET' | 'NOT MET' | 'UNKNOWN';
  basis?: string;
  reasoning: string;
  question: string | null;
  evidence: {
    truthId: string;
    statement: string;
    state: string;
    qualifications: string[];
    relation: string;
  }[];
}
export interface JdResult {
  evaluationId: string;
  state: 'complete';
  evaluatedAt: string;
  canonicalTruthCount: number;
  evaluationContext?: { professionalInventory: 'complete' | 'unconfirmed' };
  requirements: Requirement[];
}
export interface PreparedJd {
  method: 'text' | 'url' | 'file';
  sourceLabel: string;
  jobDescription: string;
  notices: string[];
  removedLines: number;
  originalCharacters: number;
}
/** Host-supplied transport addresses; the evaluator and intake UX stay identical. */
export const JD_EVALUATION_API = new InjectionToken<{ input: string; evaluate: string }>(
  'JD_EVALUATION_API',
  {
    providedIn: 'root',
    factory: () => ({
      input: '/api/thingamajob/test/jd-input',
      evaluate: '/api/thingamajob/test/evaluations',
    }),
  },
);
@Component({
  selector: 'app-jd-evaluation',
  imports: [RouterLink],
  templateUrl: './jd-evaluation.html',
  styleUrl: './jd-evaluation.scss',
})
export class JdEvaluation {
  private readonly http = inject(HttpClient);
  private readonly api = inject(JD_EVALUATION_API);
  readonly showBackLink = input(true);
  readonly jd = signal('');
  readonly mode = signal<'text' | 'url' | 'file'>('text');
  readonly url = signal('');
  readonly preparing = signal(false);
  readonly prepared = signal<PreparedJd | null>(null);
  readonly normalized = signal('');
  readonly previewHeading = viewChild<ElementRef<HTMLElement>>('previewHeading');
  private file: File | null = null;
  readonly busy = signal(false);
  readonly result = signal<JdResult | null>(null);
  readonly status = signal('');
  readonly failed = signal(false);
  readonly resultHeading = viewChild<ElementRef<HTMLElement>>('resultHeading');
  readonly outcomes = ['MET', 'NOT MET', 'UNKNOWN'] as const;
  count(outcome: string) {
    return this.result()?.requirements.filter((r) => r.outcome === outcome).length ?? 0;
  }
  edit(event: Event) {
    this.jd.set((event.target as HTMLTextAreaElement).value);
    this.prepared.set(null);
    this.result.set(null);
    this.status.set('');
  }
  choose(method: 'text' | 'url' | 'file') {
    this.mode.set(method);
    this.prepared.set(null);
    this.result.set(null);
    this.status.set('');
    this.failed.set(false);
  }
  selectFile(event: Event) {
    this.file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.prepared.set(null);
    this.result.set(null);
  }
  editUrl(event: Event) {
    this.url.set((event.target as HTMLInputElement).value);
    this.prepared.set(null);
    this.result.set(null);
  }
  editPreview(event: Event) {
    this.normalized.set((event.target as HTMLTextAreaElement).value);
    this.result.set(null);
  }
  async prepare(event: Event) {
    event.preventDefault();
    if (this.busy() || this.preparing()) return;
    this.preparing.set(true);
    this.failed.set(false);
    this.result.set(null);
    this.prepared.set(null);
    this.status.set('Reading the job description.');
    try {
      let body: object;
      if (this.mode() === 'file') {
        if (!this.file) throw new Error('Choose a file.');
        const form = new FormData();
        form.set('file', this.file);
        body = form;
      } else
        body =
          this.mode() === 'url'
            ? { method: 'url', url: this.url() }
            : { method: 'text', text: this.jd() };
      const prepared = await firstValueFrom(this.http.post<PreparedJd>(this.api.input, body));
      this.prepared.set(prepared);
      this.normalized.set(prepared.jobDescription);
      this.status.set('Job description read. Review the text, then evaluate.');
      setTimeout(() => this.previewHeading()?.nativeElement.focus());
    } catch (error) {
      this.failed.set(true);
      this.status.set(this.failure(error, 'The input could not be read. Try Paste text instead.'));
    } finally {
      this.preparing.set(false);
    }
  }
  private failure(error: unknown, fallback: string) {
    if (error instanceof HttpErrorResponse && error.status === 403) {
      this.jd.set('');
      this.url.set('');
      this.normalized.set('');
      this.file = null;
      this.prepared.set(null);
      return 'Your session no longer has access. Sign in again.';
    }
    if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string')
      return (
        error.error.error +
        (typeof error.error.evaluationId === 'string'
          ? ' Reference: ' + error.error.evaluationId
          : '')
      );
    return fallback;
  }
  async evaluate(event: Event) {
    event.preventDefault();
    if (this.busy() || this.preparing() || !this.prepared()) return;
    this.busy.set(true);
    this.failed.set(false);
    this.result.set(null);
    this.status.set('Evaluating this job description against your canonical Library of Truth.');
    try {
      const result = await firstValueFrom(
        this.http.post<JdResult | { state: string; error: string }>(
          this.api.evaluate,
          { jobDescription: this.normalized() },
          { headers: { 'Idempotency-Key': crypto.randomUUID() } },
        ),
      );
      if (
        result.state !== 'complete' ||
        !('requirements' in result) ||
        !Array.isArray(result.requirements)
      )
        throw new Error('Pending');
      this.result.set(result as JdResult);
      this.status.set('Evaluation complete. Your Library of Truth was not changed.');
      setTimeout(() => this.resultHeading()?.nativeElement.focus());
    } catch (error) {
      this.failed.set(true);
      this.status.set(
        this.failure(
          error,
          'The evaluation did not complete. Your supplied description and editable preview are retained. Check your connection; if the problem continues, report the time of the attempt before retrying. Your Library of Truth was not changed.',
        ),
      );
    } finally {
      this.busy.set(false);
    }
  }
}
