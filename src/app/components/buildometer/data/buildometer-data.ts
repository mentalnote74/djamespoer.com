import { parseData } from './parse';
import { Injectable, signal } from '@angular/core';
import type { BuildometerData } from './contract';
@Injectable({ providedIn: 'root' })
export class BuildometerDataStore {
  readonly data = signal<BuildometerData | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  private pending: Promise<void> | null = null;
  private loadedAt = 0;
  load(force = false): Promise<void> {
    if (this.pending) return this.pending;
    if (!force && this.data() && Date.now() - this.loadedAt < 900000) return Promise.resolve();
    this.loading.set(true);
    this.error.set(false);
    this.pending = (async () => {
      try {
        const r = await fetch('/api/buildometer');
        if (!r.ok) throw Error('Buildometer unavailable');
        const d: unknown = await r.json();
        this.data.set(parseData(d));
        this.loadedAt = Date.now();
      } catch {
        this.error.set(true);
      } finally {
        this.loading.set(false);
        this.pending = null;
      }
    })();
    return this.pending;
  }
}
