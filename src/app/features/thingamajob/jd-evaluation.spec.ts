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
    expect(root.querySelector('textarea')?.labels?.length).toBe(1);
    expect(component.result()).not.toBeNull();
    http.verify();
  });
  it('retains a failed JD for explicit retry but clears private state when access is revoked', async () => {
    const { fixture, http, component } = setup();
    component.jd.set('A sufficiently long fictional description.');
    let pending = component.evaluate(new Event('submit'));
    http
      .expectOne('/api/thingamajob/test/evaluations')
      .flush({ error: 'Unavailable' }, { status: 503, statusText: 'Unavailable' });
    await pending;
    expect(component.jd()).not.toBe('');
    expect(component.failed()).toBe(true);
    expect(component.result()).toBeNull();
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
});
