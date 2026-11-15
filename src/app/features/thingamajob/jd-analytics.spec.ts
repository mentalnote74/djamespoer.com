import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { JdEvaluation, JD_EVALUATION_API } from './jd-evaluation';
import { PublicAnalytics } from '../../services/public-analytics';

describe('SCRUM-141 meaningful evaluator actions', () => {
  const track = vi.fn(),
    beginEvaluation = vi.fn(() => ({ 'Idempotency-Key': 'fixture-attempt' }));
  let observerCallback: (() => void) | undefined;
  beforeEach(() => {
    track.mockClear();
    beginEvaluation.mockClear();
    observerCallback = undefined;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: () => void) {
          observerCallback = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    TestBed.configureTestingModule({
      imports: [JdEvaluation],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PublicAnalytics, useValue: { track, beginEvaluation } },
        {
          provide: JD_EVALUATION_API,
          useValue: { input: '/fixture/input', evaluate: '/fixture/evaluate', public: true },
        },
      ],
    });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.unstubAllGlobals();
  });
  function setup() {
    const f = TestBed.createComponent(JdEvaluation);
    f.detectChanges();
    return { f, c: f.componentInstance, http: TestBed.inject(HttpTestingController) };
  }
  const prepared = {
    method: 'file',
    sourceLabel: 'PRIVATE FILE NAME',
    jobDescription:
      'Senior UX Engineer at Fictional Co.\nBuild accessible Angular screens. ' +
      'x'.repeat(120) +
      '\nRecruiter: Pat Example\nEmail pat@example.invalid or call (555) 555-0100.',
    notices: [],
    removedLines: 0,
    originalCharacters: 100,
  };
  it('records actual mode changes and supported selection, not typing/cancel/reselecting an active mode', () => {
    const { c } = setup();
    c.choose('text');
    c.edit({ target: { value: 'PRIVATE TEXT' } } as unknown as Event);
    c.choose('file');
    c.choose('file');
    c.selectFile({ target: { files: [] } } as unknown as Event);
    c.selectFile({
      target: { files: [new File(['private'], 'PRIVATE.docx')] },
    } as unknown as Event);
    expect(track.mock.calls).toEqual([
      ['evaluation_input_selected', { location: 'page-content', input_method: 'file' }],
      ['evaluation_file_selected', { location: 'page-content', input_method: 'file' }],
    ]);
    expect(JSON.stringify(track.mock.calls)).not.toContain('PRIVATE');
  });
  it('counts one submission/intake/completion and one visible result despite repeated observer callbacks', async () => {
    const { c, http, f } = setup();
    c.choose('file');
    c.selectFile({ target: { files: [new File(['private'], 'PRIVATE.txt')] } } as unknown as Event);
    const pending = c.evaluate(new Event('submit'));
    const duplicate = c.evaluate(new Event('submit'));
    http.expectOne('/fixture/input').flush(prepared);
    await Promise.resolve();
    http
      .expectOne('/fixture/evaluate')
      .flush({
        state: 'complete',
        summary: 'FICTIONAL RESULT',
        evaluationId: 'fixture-id',
        evaluatedAt: '2026-11-05',
        card: {
          verdict: 'Yes, James can do this job.',
          met: 3,
          total: 4,
          requiredMet: 2,
          requiredTotal: 2,
          strengths: [],
          rampUp: [],
          learnerNote: '',
          jobTitle: 'Senior UX Engineer',
          company: 'Fictional Co',
        },
      });
    await Promise.all([pending, duplicate]);
    f.detectChanges();
    const heading: HTMLElement = f.nativeElement.querySelector('#evaluation-heading');
    vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue({ top: 10, bottom: 40 } as DOMRect);
    await new Promise((resolve) => setTimeout(resolve, 5));
    observerCallback?.();
    observerCallback?.();
    expect(beginEvaluation).toHaveBeenCalledExactlyOnceWith('file');
    expect(track.mock.calls.filter((c) => c[0] === 'evaluation_input_prepared')).toHaveLength(1);
    expect(track.mock.calls.filter((c) => c[0] === 'evaluation_completed')).toHaveLength(1);
    expect(track.mock.calls.filter((c) => c[0] === 'evaluation_result_viewed')).toHaveLength(1);
    // SCRUM-197: GA gets the job identity, score and job text, but never personal data,
    // file names or the answer text.
    expect(track).toHaveBeenCalledWith('evaluation_job_details', {
      location: 'page-content',
      evaluation_id: 'fixture-id',
      job_title: 'Senior UX Engineer',
      company: 'Fictional Co',
      met: 3,
      total: 4,
      required_met: 2,
      required_total: 2,
    });
    const chunks = track.mock.calls.filter((c) => c[0] === 'evaluation_job_text');
    const text = chunks.map((c) => c[1].job_text).join('');
    expect(chunks.every((c) => c[1].job_text.length <= 100)).toBe(true);
    expect(text).toContain('Build accessible Angular screens.');
    expect(text).toContain('[contact line removed]');
    expect(JSON.stringify(track.mock.calls)).not.toMatch(
      /Pat Example|pat@example|555|PRIVATE|FICTIONAL RESULT/,
    );
  });
  it('distinguishes input rejection from evaluation failure and never claims upload success on failure', async () => {
    const { c, http } = setup();
    c.choose('url');
    c.url.set('https://PRIVATE.invalid/job');
    let pending = c.evaluate(new Event('submit'));
    http.expectOne('/fixture/input').flush({}, { status: 400, statusText: 'Bad input' });
    await pending;
    expect(track).toHaveBeenCalledWith('evaluation_failed', {
      location: 'page-content',
      input_method: 'url',
      failure_stage: 'input',
    });
    expect(track.mock.calls.some((c) => c[0] === 'evaluation_input_prepared')).toBe(false);
    pending = c.evaluate(new Event('submit'));
    http.expectOne('/fixture/input').flush({ ...prepared, method: 'url' });
    await Promise.resolve();
    http.expectOne('/fixture/evaluate').flush({}, { status: 503, statusText: 'Unavailable' });
    await pending;
    expect(track).toHaveBeenCalledWith('evaluation_failed', {
      location: 'page-content',
      input_method: 'url',
      failure_stage: 'evaluation',
    });
    expect(track.mock.calls.filter((c) => c[0] === 'evaluation_input_prepared')).toHaveLength(1);
    expect(track.mock.calls.some((c) => c[0] === 'evaluation_completed')).toBe(false);
  });
  it('does not count offscreen or stale result callbacks as engagement', async () => {
    const { c, http, f } = setup();
    c.jd.set('FICTIONAL JOB DESCRIPTION');
    const pending = c.evaluate(new Event('submit'));
    http.expectOne('/fixture/input').flush({ ...prepared, method: 'text' });
    await Promise.resolve();
    http
      .expectOne('/fixture/evaluate')
      .flush({
        state: 'complete',
        summary: 'fixture',
        evaluationId: 'fixture',
        evaluatedAt: '2026-11-05',
      });
    await pending;
    f.detectChanges();
    const heading: HTMLElement = f.nativeElement.querySelector('#evaluation-heading');
    vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue({
      top: 10000,
      bottom: 10040,
    } as DOMRect);
    await new Promise((resolve) => setTimeout(resolve, 5));
    observerCallback?.();
    c.choose('url');
    observerCallback?.();
    expect(track.mock.calls.some((c) => c[0] === 'evaluation_result_viewed')).toBe(false);
  });
});
