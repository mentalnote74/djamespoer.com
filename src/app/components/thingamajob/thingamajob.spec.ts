import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Aside } from '../../layout/aside/aside';
import { Thingamajob } from './thingamajob';
import { ThingamajobWorkflow } from '../../features/thingamajob/workflow';
@Component({
  imports: [Aside, Thingamajob],
  template: '<app-aside label="Thingamajob"><app-thingamajob /></app-aside>',
})
class Host {}
describe('Homepage Thingamajob workflow', () => {
  it('uses the real controller for comparison, explicit correction, history and reset without HTTP', async () => {
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const widget = fixture.debugElement.query(By.directive(ThingamajobWorkflow))
      .componentInstance as ThingamajobWorkflow;
    await vi.waitFor(() => expect(widget.proposal()).not.toBeNull());
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('aside')?.getAttribute('aria-label')).toBe('Thingamajob');
    expect(root.querySelector('h2')?.textContent).toBe('Evaluate a Job Description');
    expect(root.querySelector('a')?.textContent).toBe('View Thingamajob Case Study');
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/thingamajob');
    widget.compareJobDescription(new Event('submit'), root.querySelector('form')!);
    expect(widget.jobComparison()?.matched).toContain('Accessibility');
    expect(widget.claims()).toHaveLength(0);
    widget.correction.set('Morgan facilitated three accessibility workshops.');
    await widget.review('corrected');
    expect(widget.proposal()?.reviewDisposition).toBe('corrected');
    expect(widget.proposal()?.history).toHaveLength(2);
    await widget.resetSample();
    expect(widget.proposal()?.reviewDisposition).toBe('proposed');
    expect(widget.claims()).toHaveLength(0);
    fixture.detectChanges();
    expect(root.textContent).not.toMatch(
      /sample-proposal|sample-claim|fictional-portfolio|api-test|Erica/,
    );
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
});
