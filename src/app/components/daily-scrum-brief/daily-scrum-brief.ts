import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ScrumBrief } from './brief.model';
import { DAILY_SCRUM_BRIEF } from './brief.generated';
@Component({
  imports: [RouterLink],
  selector: 'app-daily-scrum-brief',
  templateUrl: './daily-scrum-brief.html',
  styleUrl: './daily-scrum-brief.scss',
})
export class DailyScrumBrief {
  readonly brief = input<ScrumBrief>(DAILY_SCRUM_BRIEF);
  readonly showJournalLink = input(true);
  readonly headingId = input('executive-scrum-heading');
  readonly displayDate = computed(() =>
    new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(this.brief().date + 'T12:00:00Z')),
  );
}
