import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, startWith } from 'rxjs';
import { BuildDeploymentHistoryRow } from './deployment-history-row';
import {
  DeploymentHistoryFreshness,
  validateDeploymentSnapshot,
} from './deployment-history-snapshot';

export type DeploymentHistoryLoadState =
  | { readonly status: 'loading' }
  | {
      readonly status: 'ready';
      readonly records: readonly BuildDeploymentHistoryRow[];
      readonly freshness: DeploymentHistoryFreshness;
    }
  | { readonly status: 'error'; readonly reason: 'load' | 'invalid-snapshot' };

@Injectable({ providedIn: 'root' })
export class DeploymentHistoryLoader {
  private readonly http = inject(HttpClient);

  /** Cold request: subscribing starts loading; unsubscribing cancels it. No automatic polling. */
  load(): Observable<DeploymentHistoryLoadState> {
    return this.http.get('/data/deployment-history.json', { responseType: 'text' }).pipe(
      map((text): DeploymentHistoryLoadState => {
        let input: unknown;
        try {
          input = JSON.parse(text);
        } catch {
          return { status: 'error', reason: 'invalid-snapshot' };
        }
        const result = validateDeploymentSnapshot(input);
        if (!result.ok) return { status: 'error', reason: 'invalid-snapshot' };
        const { rows, checkedAt, generatedAt, refreshStatus } = result.snapshot;
        return {
          status: 'ready',
          records: rows,
          freshness: { checkedAt, generatedAt, refreshStatus },
        };
      }),
      catchError(() => of<DeploymentHistoryLoadState>({ status: 'error', reason: 'load' })),
      startWith<DeploymentHistoryLoadState>({ status: 'loading' }),
    );
  }
}
