import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { describe, it, expect } from 'vitest';
import { TestSession, testSessionInterceptor } from './test-session';
import { ThingamajobTestHost } from './test-host';
import { WorkflowApi } from './workflow-api';

function setup() {
  TestBed.configureTestingModule({
    imports: [ThingamajobTestHost],
    providers: [
      TestSession,
      WorkflowApi,
      provideRouter([]),
      provideHttpClient(withInterceptors([testSessionInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const fixture = TestBed.createComponent(ThingamajobTestHost);
  fixture.detectChanges();
  return {
    fixture,
    session: TestBed.inject(TestSession),
    http: TestBed.inject(HttpTestingController),
    client: TestBed.inject(HttpClient),
  };
}
describe('protected TEST session recovery', () => {
  it('gates startup, removes routed private UI on 401/403, and exposes native sign-in navigation', async () => {
    const { fixture, session, http, client } = setup();
    const initial = http.expectOne('/api/thingamajob/test/session');
    expect(initial.request.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
    initial.flush({ authorized: true });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(session.state()).toBe('ready');
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
    for (const status of [401, 403]) {
      const failed = firstValueFrom(client.get('/api/thingamajob/test/truth')).catch(() => null);
      http.expectOne('/api/thingamajob/test/truth').flush({}, { status, statusText: 'Denied' });
      await failed;
      fixture.detectChanges();
      const link = fixture.nativeElement.querySelector('a.action');
      expect(link.textContent).toBe('Sign in again');
      expect(link.getAttribute('href')).toBe('/api/thingamajob/test/sign-in?view=home');
      expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
      expect(session.state()).toBe('denied');
      const retry = session.check();
      http.expectOne('/api/thingamajob/test/session').flush({ authorized: true });
      await retry;
      fixture.detectChanges();
      expect(session.state()).toBe('ready');
    }
    http.verify();
  });
  it('Back restoration rechecks access and network errors offer retry without claiming expiry', async () => {
    const { fixture, session, http } = setup();
    http
      .expectOne('/api/thingamajob/test/session')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(session.state()).toBe('unavailable');
    expect(fixture.nativeElement.textContent).toContain('Access check unavailable');
    fixture.componentInstance.restore({ persisted: true } as PageTransitionEvent);
    http
      .expectOne('/api/thingamajob/test/session')
      .flush({}, { status: 403, statusText: 'Denied' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(session.state()).toBe('denied');
    expect(fixture.nativeElement.textContent).toContain('operator check');
    http.verify();
  });
});
