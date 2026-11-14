import {
  Component,
  ElementRef,
  inject,
  InjectionToken,
  input,
  signal,
  computed,
  viewChild,
  DestroyRef,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PublicAnalytics } from '../../services/public-analytics';

export interface JdResult {
  evaluationId: string;
  state: 'complete';
  evaluatedAt: string;
  summary: string;
  /** SCRUM-195: structured pitch; absent from older Workers, so the summary stays the fallback. */
  card?: JdCard;
}
export interface JdCard {
  verdict: string;
  met: number;
  total: number;
  requiredMet: number;
  requiredTotal: number;
  strengths: string[];
  rampUp: string[];
  learnerNote: string;
  clarification?: string;
}
const isCard = (value: unknown): value is JdCard => {
  const card = value as Partial<JdCard> | null;
  return (
    !!card &&
    typeof card.verdict === 'string' &&
    [card.met, card.total, card.requiredMet, card.requiredTotal].every(Number.isInteger) &&
    [card.strengths, card.rampUp].every(
      (list) => Array.isArray(list) && list.every((item) => typeof item === 'string'),
    ) &&
    typeof card.learnerNote === 'string'
  );
};
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
  resume?: string;
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
  private readonly analytics = inject(PublicAnalytics);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private stopViewing: (() => void) | undefined;
  readonly showBackLink = input(true);
  readonly headingLevel = input(1);
  readonly jd = signal('');
  readonly mode = signal<'text' | 'url' | 'file'>('text');
  readonly url = signal('');
  readonly prepared = signal<PreparedJd | null>(null);
  private file: File | null = null;
  readonly fileName = signal('');
  readonly dropping = signal(false);
  readonly busy = signal(false);
  readonly result = signal<JdResult | null>(null);
  readonly status = signal('');
  readonly failed = signal(false);
  readonly resultHeading = viewChild<ElementRef<HTMLElement>>('resultHeading');
  readonly tailoring = signal(false);
  readonly resumeStatus = signal('');
  readonly resumeFailed = signal(false);
  readonly canTailor = computed(() => !!this.api.resume && !!this.result());
  private attemptHeaders: Record<string, string> = {};
  private reset() {
    this.stopViewing?.();
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
    if (method === this.mode()) return;
    if (this.api.public)
      this.analytics.track('evaluation_input_selected', {
        location: 'page-content',
        input_method: method,
      });
    this.mode.set(method);
    this.reset();
  }
  selectFile(event: Event) {
    this.useFile((event.target as HTMLInputElement).files?.[0] ?? null);
  }
  dragOver(event: DragEvent) {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    this.dropping.set(true);
  }
  /** Progressive enhancement: dropping a document on the paste box switches to file input. */
  drop(event: DragEvent) {
    const file = event.dataTransfer?.files[0];
    this.dropping.set(false);
    if (!file) return;
    event.preventDefault();
    this.choose('file');
    this.useFile(file);
  }
  /** Clear the answer and return focus to the paste box for the next job. */
  startOver() {
    this.reset();
    this.jd.set('');
    this.url.set('');
    this.useFile(null, false);
    this.resumeStatus.set('');
    this.mode.set('text');
    setTimeout(() => this.document.getElementById('job-description')?.focus());
  }
  private useFile(file: File | null, track = true) {
    this.file = file;
    this.fileName.set(file?.name ?? '');
    this.reset();
    if (!track) return;
    if (
      this.api.public &&
      this.file &&
      this.file.size <= 1000000 &&
      /\.(txt|md|markdown|html|htm|docx)$/i.test(this.file.name)
    )
      this.analytics.track('evaluation_file_selected', {
        location: 'page-content',
        input_method: 'file',
      });
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
        return 'That request was not accepted. Your job description is still here. Reload the page, then try again.';
      this.jd.set('');
      this.url.set('');
      this.useFile(null, false);
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
    this.stopViewing?.();
    const method = this.prepared()?.method ?? this.mode();
    const headers = this.api.public
      ? this.analytics.beginEvaluation(method)
      : { 'Idempotency-Key': crypto.randomUUID() };
    this.attemptHeaders = headers;
    this.resumeStatus.set('');
    this.resumeFailed.set(false);
    let stage: 'input' | 'evaluation' = this.prepared() ? 'evaluation' : 'input';
    try {
      if (!this.prepared()) {
        this.status.set('Reading the job…');
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
        this.prepared.set(
          await firstValueFrom(this.http.post<PreparedJd>(this.api.input, body, { headers })),
        );
      }
      if (stage === 'input' && this.api.public)
        this.analytics.track('evaluation_input_prepared', {
          location: 'page-content',
          input_method: method,
        });
      stage = 'evaluation';
      this.status.set('Matching it to James’s record. This can take up to a minute…');
      const result = await firstValueFrom(
        this.http.post<JdResult>(
          this.api.evaluate,
          { jobDescription: this.prepared()!.jobDescription },
          { headers },
        ),
      );
      if (
        result.state !== 'complete' ||
        typeof result.summary !== 'string' ||
        !result.summary.trim()
      )
        throw new Error('Incomplete result');
      if (!isCard(result.card)) delete result.card;
      this.result.set(result);
      if (this.api.public)
        this.analytics.track('evaluation_completed', {
          location: 'page-content',
          input_method: method,
        });
      this.status.set('Your answer is ready.');
      setTimeout(() => {
        if (this.destroyRef.destroyed || this.result() !== result) return;
        const heading = this.resultHeading()?.nativeElement;
        heading?.focus();
        if (!this.api.public || !heading) return;
        let viewed = false;
        const visible = () => {
          if (viewed || this.result() !== result || this.destroyRef.destroyed) return;
          const bounds = heading.getBoundingClientRect();
          if (
            this.document.visibilityState !== 'hidden' &&
            bounds.bottom > 0 &&
            bounds.top < (this.document.defaultView?.innerHeight ?? 0)
          ) {
            viewed = true;
            this.analytics.track('evaluation_result_viewed', {
              location: 'page-content',
              input_method: method,
            });
            this.stopViewing?.();
          }
        };
        const observer = new IntersectionObserver(visible);
        observer.observe(heading);
        this.document.addEventListener('visibilitychange', visible);
        this.stopViewing = () => {
          observer.disconnect();
          this.document.removeEventListener('visibilitychange', visible);
        };
        this.destroyRef.onDestroy(this.stopViewing);
      });
    } catch (error) {
      if (this.api.public)
        this.analytics.track('evaluation_failed', {
          location: 'page-content',
          input_method: method,
          failure_stage: stage,
        });
      this.failed.set(true);
      this.status.set(
        this.failure(
          error,
          'Thingamajob is busy right now. Your job description is still here. Please try again in a minute.',
        ),
      );
    } finally {
      this.busy.set(false);
    }
  }
  /** SCRUM-194: the server builds the PDF from the completed evaluation; the browser saves it. */
  async downloadResume() {
    if (!this.api.resume || this.tailoring()) return;
    this.tailoring.set(true);
    this.resumeFailed.set(false);
    this.resumeStatus.set('Building a résumé for this job from James’s verified experience…');
    try {
      const response = await firstValueFrom(
        this.http.post(
          this.api.resume,
          {},
          { headers: this.attemptHeaders, observe: 'response', responseType: 'blob' },
        ),
      );
      const name =
        /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ??
        'D-James-Poer-Resume.pdf';
      const url = URL.createObjectURL(response.body!);
      const link = this.document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      this.resumeStatus.set('Your tailored résumé has downloaded: ' + name);
    } catch {
      this.resumeFailed.set(true);
      this.resumeStatus.set('The résumé could not be built right now. Please try again in a minute.');
    } finally {
      this.tailoring.set(false);
    }
  }
}
