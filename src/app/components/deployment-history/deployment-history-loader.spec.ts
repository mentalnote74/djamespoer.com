import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeploymentHistoryLoader, DeploymentHistoryLoadState } from './deployment-history-loader';
import { DeploymentHistorySourceState } from './deployment-history-data';

// Entirely neutral fixture: no provider shape is needed by browser acquisition.
const row = {
  id: 'attempt-' + 'c'.repeat(64),
  summary: 'Improve focus',
  createdAt: '2026-10-05T18:00:00.000Z',
  revision: 'a'.repeat(7),
  environment: 'production',
  status: 'succeeded',
};
const snapshot = {
  schemaVersion: 4,
  checkedAt: '2026-10-06T12:00:00.000Z',
  generatedAt: '2026-10-06T12:01:00.000Z',
  refreshStatus: 'ok',
  rows: [row],
};

describe('DeploymentHistoryLoader', () => {
  let http: HttpTestingController;
  let loader: DeploymentHistoryLoader;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    loader = TestBed.inject(DeploymentHistoryLoader);
  });
  afterEach(() => http.verify());

  function start() {
    const states: DeploymentHistoryLoadState[] = [];
    const subscription = loader.load().subscribe((state) => states.push(state));
    const request = http.expectOne('/data/deployment-history.json');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(states).toEqual([{ status: 'loading' }]);
    return { states, request, subscription };
  }

  it('is cold until subscribed and exposes initial loading', () => {
    loader.load();
    http.expectNone('/data/deployment-history.json');
    const { subscription, request } = start();
    subscription.unsubscribe();
    expect(request.cancelled).toBe(true);
  });

  it('loads populated neutral data with freshness separate and consumer-compatible state', () => {
    const { request, states } = start();
    request.flush(JSON.stringify(snapshot));
    expect(states[1]).toEqual({
      status: 'ready',
      records: [row],
      freshness: {
        checkedAt: snapshot.checkedAt,
        generatedAt: snapshot.generatedAt,
        refreshStatus: 'ok',
      },
    });
    const consumerState: DeploymentHistorySourceState = states[1]!;
    expect(consumerState.status).toBe('ready');
    if (states[1]?.status !== 'ready') throw new Error('Expected ready');
    expect(Object.keys(states[1].records[0]!).sort()).toEqual([
      'createdAt',
      'environment',
      'id',
      'revision',
      'status',
      'summary',
    ]);
  });

  it('accepts verified-empty history with its original freshness', () => {
    const { request, states } = start();
    request.flush(JSON.stringify({ ...snapshot, rows: [] }));
    expect(states[1]).toEqual({
      status: 'ready',
      records: [],
      freshness: {
        checkedAt: snapshot.checkedAt,
        generatedAt: snapshot.generatedAt,
        refreshStatus: 'ok',
      },
    });
  });

  it.each([
    null,
    {},
    { ...snapshot, schemaVersion: 2 },
    { ...snapshot, schemaVersion: 3 },
    { ...snapshot, refreshStatus: 'failed' },
    { ...snapshot, checkedAt: 'invalid' },
    { ...snapshot, generatedAt: '2026-02-30T00:00:00.000Z' },
    { ...snapshot, checkedAt: '2026-10-06T08:00:00-04:00' },
    { ...snapshot, generatedAt: '2026-10-05T12:01:00.000Z' },
    { ...snapshot, providerPayload: {} },
    { ...snapshot, rows: [row, {}] },
    { ...snapshot, rows: [{ ...row, status: 'unknown' }] },
    { ...snapshot, rows: [row, row] },
    { ...snapshot, rows: [{ ...row, rawProviderField: 'not allowed' }] },
    { ...snapshot, rows: [{ ...row, summary: ' Not normalized ' }] },
  ])('rejects the entire malformed snapshot %#', (input) => {
    const { request, states } = start();
    request.flush(JSON.stringify(input));
    expect(states).toEqual([
      { status: 'loading' },
      { status: 'error', reason: 'invalid-snapshot' },
    ]);
  });

  it('classifies invalid JSON/SPA fallback HTML as invalid snapshots', () => {
    const { request, states } = start();
    request.flush('<html>SPA fallback</html>');
    expect(states[1]).toEqual({ status: 'error', reason: 'invalid-snapshot' });
  });

  it('classifies HTTP failure without exposing response details', () => {
    const { request, states } = start();
    request.flush('private diagnostics', { status: 503, statusText: 'Unavailable' });
    expect(states[1]).toEqual({ status: 'error', reason: 'load' });
    expect(JSON.stringify(states)).not.toContain('private diagnostics');
  });

  it('classifies network failure as a load error', () => {
    const { request, states } = start();
    request.error(new ProgressEvent('error'));
    expect(states[1]).toEqual({ status: 'error', reason: 'load' });
  });
});
