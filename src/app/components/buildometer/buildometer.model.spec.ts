import { describe, it, expect } from 'vitest';
import { deriveCompletion, deriveShipping, parseJournal } from './buildometer.model';
import type { DeploymentHistorySnapshot } from '../deployment-history/deployment-history-snapshot';

describe('Buildometer evidence derivation', () => {
  it('does not turn absent or empty scope into zero percent complete', () => {
    expect(deriveCompletion(null)).toBeNull();
    expect(deriveCompletion({ scopeVersion: 'v1', items: [] })).toBeNull();
  });
  it('uses only committed items and preserves the scope version', () => {
    expect(
      deriveCompletion({
        scopeVersion: 'release-1',
        items: [
          { id: '1', disposition: 'committed', state: 'done' },
          { id: '2', disposition: 'committed', state: 'open' },
          { id: '3', disposition: 'backlog', state: 'open' },
          { id: '4', disposition: 'cancelled', state: 'open' },
          { id: '5', disposition: 'superseded', state: 'done' },
        ],
      }),
    ).toEqual({ percent: 50, completed: 1, remaining: 1, scopeVersion: 'release-1' });
  });
  it('rejects ambiguous duplicate work item IDs', () => {
    expect(
      deriveCompletion({
        scopeVersion: 'v1',
        items: [
          { id: '1', disposition: 'committed', state: 'done' },
          { id: '1', disposition: 'committed', state: 'open' },
        ],
      }),
    ).toBeNull();
  });
  const row = (id: string, createdAt: string) => ({
    id,
    createdAt,
    environment: 'production' as const,
    status: 'succeeded' as const,
    stage: 'deployed' as const,
  });
  const snapshot: DeploymentHistorySnapshot = {
    schemaVersion: 4,
    refreshStatus: 'ok',
    checkedAt: '2026-10-18T12:00:00.000Z',
    generatedAt: '2026-10-18T12:00:00.000Z',
    rows: [
      row('old', '2026-10-11T12:00:00.000Z'),
      row('a', '2026-10-12T12:00:00.000Z'),
      row('a', '2026-10-12T12:00:00.000Z'),
      row('b', '2026-10-18T12:00:00.000Z'),
      row('future', '2026-10-18T12:00:00.001Z'),
      { ...row('preview', '2026-10-18T11:00:00.000Z'), environment: 'preview' },
      { ...row('failed', '2026-10-18T11:00:00.000Z'), status: 'failed' },
      { ...row('build', '2026-10-18T11:00:00.000Z'), stage: undefined },
    ],
  };
  it('counts only unique retained activations inside the exact seven-day window', () => {
    const signal = deriveShipping(snapshot, Date.parse(snapshot.checkedAt));
    expect(signal.count).toBe(2);
    expect(signal.days.map((d) => d.count)).toEqual([1, 0, 0, 0, 0, 0, 1]);
    expect(signal.stale).toBe(false);
  });
  it('anchors counts to source time and marks stale evidence rather than relabeling it today', () => {
    const signal = deriveShipping(snapshot, Date.parse(snapshot.checkedAt) + 2 * 86400000);
    expect(signal.count).toBe(2);
    expect(signal.stale).toBe(true);
    expect(signal.checkedAt).toBe(snapshot.checkedAt);
  });
  it('keeps missing journal different from a valid empty journal', () => {
    expect(() => parseJournal({ entries: [] })).toThrow();
    expect(parseJournal({ schemaVersion: 1, entries: [] })).toEqual([]);
    expect(() => parseJournal({ schemaVersion: 1, entries: [{ date: '2026-10-18' }] })).toThrow();
  });
});
