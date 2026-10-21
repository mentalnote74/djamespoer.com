import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DailyScrumBrief } from './daily-scrum-brief';
import { DAILY_SCRUM_BRIEF } from './brief.generated';
describe('DailyScrumBrief', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));
  it('renders the stored verified date and exact migrated copy with native semantics', () => {
    const fixture = TestBed.createComponent(DailyScrumBrief);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('time')?.dateTime).toBe(DAILY_SCRUM_BRIEF.date);
    expect(root.querySelector('time')?.textContent).toContain('2026');
    expect(root.querySelector('section')?.getAttribute('aria-labelledby')).toBe(
      'executive-scrum-heading',
    );
    expect(root.querySelectorAll('h2')).toHaveLength(1);
    expect(root.querySelectorAll('h3')).toHaveLength(DAILY_SCRUM_BRIEF.sections.length);
    expect(root.querySelectorAll('main')).toHaveLength(0);
    const paragraphs = DAILY_SCRUM_BRIEF.sections.flatMap((section) => [
      ...(section.paragraph ? [section.paragraph] : []),
      ...(section.paragraphs ?? []),
    ]);
    expect(
      [...root.querySelectorAll('p')]
        .slice(0, paragraphs.length)
        .map((p) => p.textContent?.replace(/\s+/g, ' ').trim()),
    ).toEqual(paragraphs);
    expect(root.textContent).not.toContain('sourceCommit');
  });
  it('supports a distinct heading id when reused without a duplicate landmark target', () => {
    const fixture = TestBed.createComponent(DailyScrumBrief);
    fixture.componentRef.setInput('headingId', 'secondary-brief');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h2')?.id).toBe('secondary-brief');
    expect(root.querySelector('section')?.getAttribute('aria-labelledby')).toBe('secondary-brief');
  });
});
