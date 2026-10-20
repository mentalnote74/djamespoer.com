import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { WorkflowApi } from './workflow-api';

/** TEST host only. Access owns authentication; this stores no credentials or private drafts. */
@Injectable()
export class TestSession {
  private readonly http = inject(HttpClient);
  private readonly workflow = inject(WorkflowApi);
  readonly state = signal<'checking' | 'ready' | 'denied' | 'unavailable'>('checking');
  private revision = 0;
  private pending = false;

  denied() {
    this.workflow.clear();
    this.revision++;
    this.state.set('denied');
  }

  async check() {
    if (this.pending) return;
    this.pending = true;
    this.workflow.clear();
    const revision = ++this.revision;
    this.state.set('checking');
    try {
      const result = await firstValueFrom(
        this.http.get<{ authorized: boolean }>('/api/thingamajob/test/session'),
      );
      if (revision === this.revision)
        this.state.set(result.authorized === true ? 'ready' : 'unavailable');
    } catch (error) {
      if (revision === this.revision)
        this.state.set(
          error instanceof HttpErrorResponse && [401, 403].includes(error.status)
            ? 'denied'
            : 'unavailable',
        );
    } finally {
      this.pending = false;
    }
  }
}

export const testSessionInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/thingamajob/')) return next(request);
  const session = inject(TestSession);
  // Cloudflare returns an actionable 401 instead of a cross-origin login redirect on AJAX expiry.
  return next(request.clone({ setHeaders: { 'X-Requested-With': 'XMLHttpRequest' } })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) session.denied();
      return throwError(() => error);
    }),
  );
};
