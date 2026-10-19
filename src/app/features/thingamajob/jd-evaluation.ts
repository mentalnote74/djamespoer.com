import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
interface Requirement {
  id: string;
  requirement: string;
  jdQuote: string;
  importance: 'required' | 'preferred' | 'unspecified';
  outcome: 'MET' | 'NOT MET' | 'UNKNOWN';
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
  requirements: Requirement[];
}
@Component({
  selector: 'app-jd-evaluation',
  imports: [RouterLink],
  templateUrl: './jd-evaluation.html',
  styleUrl: './jd-evaluation.scss',
})
export class JdEvaluation {
  private readonly http = inject(HttpClient);
  readonly jd = signal('');
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
    this.result.set(null);
    this.status.set('');
  }
  async evaluate(event: Event) {
    event.preventDefault();
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    this.result.set(null);
    this.status.set('Evaluating this job description against your canonical Library of Truth.');
    try {
      const result = await firstValueFrom(
        this.http.post<JdResult | { state: string; error: string }>(
          '/api/thingamajob/test/evaluations',
          { jobDescription: this.jd() },
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
      if (error instanceof HttpErrorResponse && error.status === 403) {
        this.jd.set('');
        this.status.set('Your session no longer has access. Sign in again.');
      } else if (error instanceof HttpErrorResponse && error.status === 409)
        this.status.set(
          'An evaluation is running or your Library of Truth changed. Wait for it to finish, then submit again.',
        );
      else
        this.status.set(
          'The evaluation did not complete. Your description is retained; submit again to retry. Your Library of Truth was not changed.',
        );
    } finally {
      this.busy.set(false);
    }
  }
}
