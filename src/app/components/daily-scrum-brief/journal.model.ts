import { InjectionToken, makeStateKey } from '@angular/core';
import type { ScrumBrief } from './brief.model';

export interface Journal {
  schemaVersion: 1;
  latestDate: string;
  correctionNote?: string;
  entries: { date: string; brief?: ScrumBrief }[];
}

// Only main.server imports the complete public archive; no archive in client JS.
export const PRERENDER_JOURNAL = new InjectionToken<Journal>('Public journal for prerender');
export const JOURNAL_STATE = makeStateKey<Journal | null>('public-journal');

export function journalPage(history: Journal, date = history.latestDate): Journal {
  return {
    schemaVersion: 1,
    latestDate: history.latestDate,
    ...(history.correctionNote ? { correctionNote: history.correctionNote } : {}),
    entries: history.entries.map((entry) =>
      entry.date === date ? { date: entry.date, brief: entry.brief } : { date: entry.date },
    ),
  };
}
