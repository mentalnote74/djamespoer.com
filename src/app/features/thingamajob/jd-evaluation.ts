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

export interface JdResult {
  evaluationId: string;
  state: 'complete';
  evaluatedAt: string;
  summary: string;
}
export interface PreparedJd {
  method: 'text' | 'url' | 'file';
  sourceLabel: string;
  jobDescription: string;
  notices: string[];
  removedLines: number;
  originalCharacters: number;
}
export const JD_EVALUATION_API = new InjectionToken<{
  input: string;
  evaluate: string;
  public?: boolean;
}>('JD_EVALUATION_API', {
  providedIn: 'root',
  factory: () => ({
    input: '/api/thingamajob/test/jd-input',
    evaluate: '/api/thingamajob/test/evaluations',
  }),
});
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
  readonly headingLevel = input(1);
  readonly clientLabel = input('your');
  readonly jd = signal('');
  readonly mode = signal<'text' | 'url' | 'file'>('text');
  readonly url = signal('');
  readonly prepared = signal<PreparedJd | null>(null);
  private file: File | null = null;
  readonly busy = signal(false);
  readonly result = signal<JdResult | null>(null);
  readonly status = signal('');
  readonly failed = signal(false);
  readonly resultHeading = viewChild<ElementRef<HTMLElement>>('resultHeading');
  private reset() {
    this.prepared.set(null);
    this.result.set(null);
    this.status.set('');
    this.failed.set(false);
  }
  edit(event: Event) {
    this.jd.set((event.target as HTMLTextAreaElement).value);
    this.reset();
  }
  choose(method: 'text' | 'url' | 'file') {
    this.mode.set(method);
    this.reset();
  }
  selectFile(event: Event) {
    this.file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.reset();
  }
  editUrl(event: Event) {
    this.url.set((event.target as HTMLInputElement).value);
    this.reset();
  }
  useText() {
    const extracted = this.prepared()?.jobDescription;
    if (extracted) this.jd.set(extracted);
    this.choose('text');
  }
  private failure(error: unknown, fallback: string) {
    if (error instanceof HttpErrorResponse && error.status === 403) {
      if (this.api.public)
        return 'The request was not accepted. Your input is retained. Reload the page before trying again.';
      this.jd.set('');
      this.url.set('');
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
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    this.result.set(null);
    try {
      if (!this.prepared()) {
        this.status.set('Reading the job description…');
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
        this.prepared.set(await firstValueFrom(this.http.post<PreparedJd>(this.api.input, body)));
      }
      this.status.set('Evaluating the job against canonical career evidence…');
      const result = await firstValueFrom(
        this.http.post<JdResult>(
          this.api.evaluate,
          { jobDescription: this.prepared()!.jobDescription },
          { headers: { 'Idempotency-Key': crypto.randomUUID() } },
        ),
      );
      if (
        result.state !== 'complete' ||
        typeof result.summary !== 'string' ||
        !result.summary.trim()
      )
        throw new Error('Incomplete result');
      this.result.set(result);
      this.status.set('Evaluation complete. The Library of Truth was not changed.');
      setTimeout(() => this.resultHeading()?.nativeElement.focus());
    } catch (error) {
      this.failed.set(true);
      this.status.set(
        this.failure(
          error,
          'Evaluation is temporarily unavailable. Your input is retained. Please try again later; no automatic retry was made. The Library of Truth was not changed.',
        ),
      );
    } finally {
      this.busy.set(false);
    }
  }
}
