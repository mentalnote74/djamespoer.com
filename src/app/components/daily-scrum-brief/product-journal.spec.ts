import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TransferState } from '@angular/core';
import { ProductJournal } from './product-journal';
import { Journal, journalPage, JOURNAL_STATE, PRERENDER_JOURNAL } from './journal.model';
import { DAILY_SCRUM_BRIEF } from './brief.generated';

const history: Journal = {
  schemaVersion: 1, latestDate: '2026-10-27', correctionNote: 'Approved correction.',
  entries: [
    { date: '2026-10-27', brief: { ...DAILY_SCRUM_BRIEF, date: '2026-10-27' } },
    { date: '2026-10-22', brief: { ...DAILY_SCRUM_BRIEF, date: '2026-10-22' } },
  ],
};
describe('journal prerender and hydration', () => {
  it('renders a dated brief and native archive links before browser fetching; transfers only that brief', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { params: { date: '2026-10-22' } } } },
      { provide: PRERENDER_JOURNAL, useValue: history },
    ] });
    const fixture = TestBed.createComponent(ProductJournal);
    fixture.componentRef.setInput('date', '2026-10-22');
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('app-daily-scrum-brief time')?.getAttribute('datetime')).toBe('2026-10-22');
    expect(root.querySelector('a[href="/product-journal/2026-10-27"]')).not.toBeNull();
    expect(root.textContent).not.toContain('Loading the journal');
    const state = TestBed.inject(TransferState).get(JOURNAL_STATE, null)!;
    expect(state.entries.filter(e => e.brief)).toHaveLength(1);
    expect(state.entries.find(e => e.brief)?.date).toBe('2026-10-22');
  });
  it('restores matching HTML from transfer state without requiring the full archive in client JavaScript', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const transfer = TestBed.inject(TransferState);
    transfer.set(JOURNAL_STATE, journalPage(history));
    const fixture = TestBed.createComponent(ProductJournal);
    fixture.detectChanges();
    expect(fixture.componentInstance.selected()?.brief?.date).toBe('2026-10-27');
    expect(transfer.hasKey(JOURNAL_STATE)).toBe(false);
  });
  it('never substitutes a different brief for a missing date', () => {
    expect(journalPage(history, '2099-01-01').entries.some(e => e.brief)).toBe(false);
    expect(journalPage(history).entries.find(e => e.brief)?.date).toBe(history.latestDate);
  });
});
