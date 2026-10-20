import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { routes } from '../../app.routes';

describe('Thingamajob case study integration', () => {
  it('uses the same unfinished evaluator and preserves the case-study context and page heading', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    const harness = await RouterTestingHarness.create('/thingamajob');
    const root = harness.routeNativeElement!;
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelector('app-thingamajob app-jd-evaluation')).not.toBeNull();
    expect(root.querySelector('app-thingamajob-workflow')).toBeNull();
    expect(root.textContent).toContain('Working prototype');
    expect(root.querySelector('.case-study')?.textContent).toContain('The Library of Truth');
    expect(root.querySelector('.case-study')?.textContent).toContain('retaining detailed');
    expect(root.querySelector('iframe')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
});
