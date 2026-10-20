import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect } from 'vitest';
import { JdEvaluation } from './jd-evaluation';
describe('protected JD evaluation screen', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [JdEvaluation],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(JdEvaluation);
    fixture.detectChanges();
    return {
      fixture,
      http: TestBed.inject(HttpTestingController),
      component: fixture.componentInstance,
    };
  }
  it('submits only the JD, presents text/evidence/states without traceability controls, and makes no LoT mutation', async () => {
    const { fixture, http, component } = setup();
    component.jd.set('Required: fictional Angular development.');
    const reading = component.prepare(new Event('submit'));
    http.expectOne('/api/thingamajob/test/jd-input').flush({
      method: 'text',
      sourceLabel: 'Pasted text',
      jobDescription: component.jd(),
      notices: [],
      removedLines: 0,
      originalCharacters: 40,
    });
    await reading;
    const pending = component.evaluate(new Event('submit'));
    const req = http.expectOne('/api/thingamajob/test/evaluations');
    expect(Object.keys(req.request.body)).toEqual(['jobDescription']);
    expect(req.request.headers.has('Idempotency-Key')).toBe(true);
    req.flush({
      state: 'complete',
      evaluationId: 'fictional-evaluation',
      evaluatedAt: '2026-10-19',
      canonicalTruthCount: 3,
      requirements: [
        {
          id: 'r1',
          requirement: 'Fictional Angular',
          jdQuote: 'fictional Angular development',
          importance: 'required',
          outcome: 'MET',
          reasoning: 'Fictional direct support.',
          evidence: [
            {
              truthId: 'fictional',
              statement: '<img src=x onerror=alert(1)> Fictional Angular experience.',
              qualifications: ['Historical context preserved.'],
            },
          ],
          question: null,
        },
        {
          id: 'r2',
          requirement: 'Another skill',
          jdQuote: 'Fictional',
          importance: 'preferred',
          outcome: 'UNKNOWN',
          reasoning: 'No evidence establishes this.',
          evidence: [],
          question: 'Can you clarify?',
        },
      ],
    });
    await pending;
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('MET: 1');
    expect(root.textContent).toContain('UNKNOWN: 1');
    expect(root.textContent).toContain('Historical context preserved.');
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('h1')?.textContent).toContain('Evaluate a job');
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.textContent?.replace(/\s+/g, ' ')).toContain(
      'Required, preferred and unstated priority indicate importance, not evidence status.',
    );
    expect(root.querySelector('textarea')?.labels?.length).toBe(1);
    expect(component.result()).not.toBeNull();
    http.verify();
  });
  it('retains a failed JD for explicit retry but clears private state when access is revoked', async () => {
    const { fixture, http, component } = setup();
    component.jd.set('A sufficiently long fictional description.');
    const reading = component.prepare(new Event('submit'));
    http.expectOne('/api/thingamajob/test/jd-input').flush({
      method: 'text',
      sourceLabel: 'Pasted text',
      jobDescription: component.jd(),
      notices: [],
      removedLines: 0,
      originalCharacters: 42,
    });
    await reading;
    component.editPreview({
      target: { value: 'Reviewed fictional Angular job description.' },
    } as unknown as Event);
    let pending = component.evaluate(new Event('submit'));
    const failedRequest = http.expectOne('/api/thingamajob/test/evaluations');
    expect(failedRequest.request.body.jobDescription).toBe(
      'Reviewed fictional Angular job description.',
    );
    failedRequest.flush(
      {
        error:
          'The evaluation response could not be validated. Share this support reference before retrying.',
        evaluationId: 'jd-fictional-reference',
      },
      { status: 503, statusText: 'Unavailable' },
    );
    await pending;
    expect(component.jd()).not.toBe('');
    expect(component.failed()).toBe(true);
    expect(component.result()).toBeNull();
    expect(component.normalized()).toBe('Reviewed fictional Angular job description.');
    expect(component.prepared()).not.toBeNull();
    expect(component.status()).toContain('Reference: jd-fictional-reference');
    pending = component.evaluate(new Event('submit'));
    http
      .expectOne('/api/thingamajob/test/evaluations')
      .flush({ error: 'Denied' }, { status: 403, statusText: 'Forbidden' });
    await pending;
    fixture.detectChanges();
    expect(component.jd()).toBe('');
    expect(component.status()).toContain('Sign in again');
    http.verify();
  });
  it('URL and File use the same editable preview and extraction failures offer Paste text recovery', async () => {
    const { fixture, http, component } = setup();
    component.choose('url');
    component.url.set('https://builtin.com/job/fictional');
    let pending = component.prepare(new Event('submit'));
    const request = http.expectOne('/api/thingamajob/test/jd-input');
    expect(request.request.body.method).toBe('url');
    request.flush(
      { error: 'The page requires sign-in. Paste text instead.' },
      { status: 400, statusText: 'Bad Request' },
    );
    await pending;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Use Paste text instead');
    component.choose('file');
    const file = new File(['Required: fictional Angular development.'], 'job.txt');
    component.selectFile({ target: { files: [file] } } as unknown as Event);
    pending = component.prepare(new Event('submit'));
    const upload = http.expectOne('/api/thingamajob/test/jd-input');
    expect((upload.request.body as FormData).get('file')).toBe(file);
    upload.flush({
      method: 'file',
      sourceLabel: 'job.txt',
      jobDescription: 'Required: fictional Angular development.',
      notices: ['Review extracted content.'],
      removedLines: 0,
      originalCharacters: 40,
    });
    await pending;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#prepared-jd')).not.toBeNull();
    expect(component.normalized()).toContain('Angular');
    expect(fixture.nativeElement.textContent).toContain('Review extracted content.');
    http.expectNone('/api/thingamajob/test/evaluations');
    http.verify();
  });
});
