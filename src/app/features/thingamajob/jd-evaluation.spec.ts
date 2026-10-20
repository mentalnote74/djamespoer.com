import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect } from 'vitest';
import { JdEvaluation, JD_EVALUATION_API } from './jd-evaluation';

describe('one-action JD evaluator', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [JdEvaluation],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: JD_EVALUATION_API,
          useValue: {
            input: '/test/thingamajob/jd-input',
            evaluate: '/test/thingamajob/evaluate',
            public: true,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(JdEvaluation);
    fixture.detectChanges();
    return {
      fixture,
      http: TestBed.inject(HttpTestingController),
      component: fixture.componentInstance,
    };
  }
  const prepared = (text: string) => ({
    method: 'text',
    sourceLabel: 'Pasted text',
    jobDescription: text,
    notices: [],
    removedLines: 0,
    originalCharacters: text.length,
  });
  it('one Evaluate normalizes then evaluates, rendering only a safe concise paragraph', async () => {
    const { fixture, http, component } = setup();
    component.jd.set('A complete fictional job description.');
    const pending = component.evaluate(new Event('submit'));
    http
      .expectOne('/test/thingamajob/jd-input')
      .flush(prepared('Normalized fictional job description.'));
    await Promise.resolve();
    const request = http.expectOne('/test/thingamajob/evaluate');
    expect(request.request.body).toEqual({
      jobDescription: 'Normalized fictional job description.',
    });
    request.flush({
      state: 'complete',
      evaluationId: 'fixture',
      evaluatedAt: '2026-10-20',
      summary: 'Partial fit. <img src=x> is literal text.',
      requirements: [{ evidence: 'Internal detail must not render.' }],
    });
    await pending;
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.evaluation-summary')).toHaveLength(1);
    expect(root.textContent).toContain('Partial fit.');
    expect(root.textContent).not.toContain('Internal detail must not render');
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('#prepared-jd')).toBeNull();
    expect(root.querySelector('textarea')?.labels?.length).toBe(1);
    http.verify();
  });
  it('quota failure retains input and normalized text, with explicit retry and no cached success', async () => {
    const { fixture, http, component } = setup();
    component.jd.set('A complete fictional job description.');
    let pending = component.evaluate(new Event('submit'));
    http
      .expectOne('/test/thingamajob/jd-input')
      .flush(prepared('Normalized fictional job description.'));
    await Promise.resolve();
    http
      .expectOne('/test/thingamajob/evaluate')
      .flush(
        {
          error:
            'Evaluation is temporarily unavailable. Your input is retained. Please try again later.',
          evaluationId: 'jd-support',
        },
        { status: 503, statusText: 'Unavailable' },
      );
    await pending;
    expect(component.result()).toBeNull();
    expect(component.jd()).not.toBe('');
    expect(component.prepared()?.jobDescription).toContain('Normalized');
    expect(component.status()).toContain('Reference: jd-support');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.evaluation-summary')).toBeNull();
    pending = component.evaluate(new Event('submit'));
    http.expectNone('/test/thingamajob/jd-input');
    http
      .expectOne('/test/thingamajob/evaluate')
      .flush({ error: 'Try later.' }, { status: 503, statusText: 'Unavailable' });
    await pending;
    expect(component.result()).toBeNull();
    http.verify();
  });
  it('URL failure retains URL; File follows the same one-action flow and can recover to text', async () => {
    const { fixture, http, component } = setup();
    component.choose('url');
    component.url.set('https://example.org/job');
    let pending = component.evaluate(new Event('submit'));
    const request = http.expectOne('/test/thingamajob/jd-input');
    expect(request.request.body).toEqual({ method: 'url', url: component.url() });
    request.flush(
      { error: 'The page requires sign-in. Paste text instead.' },
      { status: 400, statusText: 'Bad Request' },
    );
    await pending;
    fixture.detectChanges();
    expect(component.url()).toBe('https://example.org/job');
    expect(fixture.nativeElement.textContent).toContain('Use pasted text instead');
    http.expectNone('/test/thingamajob/evaluate');
    http.verify();
  });
  it('file intake chains evaluation without preview and preserves extracted text on failure', async () => {
    const { http, component } = setup();
    component.choose('file');
    const file = new File(['Fictional job description for unit verification.'], 'job.txt');
    component.selectFile({ target: { files: [file] } } as unknown as Event);
    const pending = component.evaluate(new Event('submit'));
    const upload = http.expectOne('/test/thingamajob/jd-input');
    expect((upload.request.body as FormData).get('file')).toBe(file);
    upload.flush(prepared('Fictional extracted job description.'));
    await Promise.resolve();
    http
      .expectOne('/test/thingamajob/evaluate')
      .flush({ error: 'Temporarily unavailable.' }, { status: 503, statusText: 'Unavailable' });
    await pending;
    component.useText();
    expect(component.mode()).toBe('text');
    expect(component.jd()).toBe('Fictional extracted job description.');
    http.verify();
  });
});
