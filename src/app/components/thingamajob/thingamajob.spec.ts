import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Thingamajob } from './thingamajob';

describe('public unfinished Thingamajob', () => {
  it('mounts the portable one-action evaluator without historical demo or startup requests', () => {
    TestBed.configureTestingModule({
      imports: [Thingamajob],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(Thingamajob);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent?.replace(/\s+/g, ' ')).toContain(
      'Working prototype — actively under development. Evaluations may be incomplete or incorrect. Review the findings before acting on them.',
    );
    expect(root.querySelector('app-jd-evaluation')).not.toBeNull();
    expect(root.querySelector('app-thingamajob-workflow')).toBeNull();
    expect(root.querySelector('h1')).toBeNull();
    expect(root.querySelector('h2')?.textContent).toBe('Thingamajob');
    expect(root.querySelectorAll('input[type=radio]')).toHaveLength(3);
    expect(root.querySelectorAll('button[type=submit]')).toHaveLength(1);
    expect(root.querySelector('button[type=submit]')?.textContent).toBe('Evaluate');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
});
