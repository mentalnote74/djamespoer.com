import { TestBed } from '@angular/core/testing';
import { DailyScrumBrief } from './daily-scrum-brief';
import { DAILY_SCRUM_BRIEF } from './brief.generated';
describe('DailyScrumBrief', () => {
  it('renders the stored verified date and exact migrated copy with native semantics', () => {
    const fixture = TestBed.createComponent(DailyScrumBrief);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('time')?.dateTime).toBe('2026-10-16');
    expect(root.querySelector('time')?.textContent).toBe('October 16, 2026');
    expect(root.querySelector('section')?.getAttribute('aria-labelledby')).toBe(
      'executive-scrum-heading',
    );
    expect(root.querySelectorAll('h2')).toHaveLength(1);
    expect(root.querySelectorAll('h3')).toHaveLength(3);
    expect(root.querySelectorAll('main')).toHaveLength(0);
    expect(
      [...root.querySelectorAll('p')].map((p) => p.textContent?.replace(/\s+/g, ' ').trim()),
    ).toEqual(DAILY_SCRUM_BRIEF.sections.map((s) => s.paragraph));
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
