import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { NavigationError } from '@angular/router';
import { GREETING_RETRY_KEY, ModuleRecovery, isModuleLoadFailure } from './module-recovery';

describe('deployment module recovery', () => {
  const missing = new TypeError(
    'Failed to fetch dynamically imported module: https://portfolio.test/chunk-old.js',
  );
  let view: {
    location: {
      origin: string;
      assign: ReturnType<typeof vi.fn>;
      reload: ReturnType<typeof vi.fn>;
    };
    navigator: { onLine: boolean };
    sessionStorage: Storage;
  };
  beforeEach(() => {
    sessionStorage.clear();
    view = {
      location: { origin: 'https://portfolio.test', assign: vi.fn(), reload: vi.fn() },
      navigator: { onLine: true },
      sessionStorage,
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: { baseURI: 'https://portfolio.test/', defaultView: view } },
      ],
    });
  });
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });
  it('recognizes module failures without treating arbitrary application or fetch errors as stale builds', () => {
    expect(isModuleLoadFailure(missing)).toBe(true);
    expect(isModuleLoadFailure({ cause: missing })).toBe(true);
    expect(isModuleLoadFailure(new Error('Importing a module script failed.'))).toBe(true);
    for (const error of [
      null,
      new Error('Failed to fetch'),
      new Error('Unknown route'),
      { code: 750 },
    ])
      expect(isModuleLoadFailure(error)).toBe(false);
  });
  it('continues to the intended same-origin destination with a bounded full-document request', () => {
    const recovery = TestBed.inject(ModuleRecovery);
    recovery.navigationFailed(new NavigationError(1, '/about?view=full#evidence', missing));
    expect(view.location.assign).toHaveBeenCalledWith(
      'https://portfolio.test/about?view=full#evidence',
    );
    recovery.navigationFailed(new NavigationError(2, '/engineering', missing));
    expect(view.location.assign).toHaveBeenCalledTimes(1);
    expect(recovery.routeFailure()).toBe('https://portfolio.test/engineering');
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 120001);
    recovery.navigationFailed(new NavigationError(3, '/engineering', missing));
    expect(view.location.assign).toHaveBeenCalledTimes(2);
  });
  it('does not auto-reload for unrelated errors, offline browsing, or external destinations', () => {
    const recovery = TestBed.inject(ModuleRecovery);
    recovery.navigationFailed(new NavigationError(1, '/about', new Error('API failed')));
    recovery.navigationFailed(new NavigationError(2, 'https://external.test/', missing));
    expect(recovery.routeFailure()).toBeNull();
    view.navigator.onLine = false;
    recovery.navigationFailed(new NavigationError(3, '/about', missing));
    expect(view.location.assign).not.toHaveBeenCalled();
    expect(recovery.routeFailure()).toBe('https://portfolio.test/about');
  });
  it('restores greeting intent on reload, sharing the same loop guard with route recovery', () => {
    const recovery = TestBed.inject(ModuleRecovery);
    recovery.greetingFailed();
    expect(sessionStorage.getItem(GREETING_RETRY_KEY)).toBe('1');
    expect(view.location.reload).toHaveBeenCalledTimes(1);
    recovery.greetingFailed();
    recovery.navigationFailed(new NavigationError(1, '/about', missing));
    expect(view.location.reload).toHaveBeenCalledTimes(1);
    expect(view.location.assign).not.toHaveBeenCalled();
  });
  it('shows manual recovery when storage cannot enforce a cross-reload limit', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw Error('blocked');
    });
    const recovery = TestBed.inject(ModuleRecovery);
    recovery.navigationFailed(new NavigationError(1, '/about', missing));
    recovery.greetingFailed();
    expect(view.location.assign).not.toHaveBeenCalled();
    expect(view.location.reload).not.toHaveBeenCalled();
    expect(recovery.routeFailure()).toContain('/about');
    recovery.reloadGreeting();
    expect(view.location.reload).toHaveBeenCalledTimes(1);
  });
});
