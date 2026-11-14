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
    expect(root.textContent).not.toContain('Working prototype');
    expect(root.querySelector('app-jd-evaluation')).not.toBeNull();
    expect(root.querySelector('app-thingamajob-workflow')).toBeNull();
    expect(root.querySelector('h1')).toBeNull();
    expect(root.querySelector('h2')?.textContent).toBe('Is James right for your role?');
    expect(root.querySelectorAll('input[type=radio]')).toHaveLength(0);
    expect(root.querySelector('textarea')).not.toBeNull();
    expect(root.querySelectorAll('button[type=submit]')).toHaveLength(1);
    expect(root.querySelector('button[type=submit]')?.textContent?.trim()).toBe('See how James fits');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
});
