import { Component, input } from '@angular/core';
import { DAILY_SCRUM_BRIEF } from './brief.generated';
@Component({
  selector: 'app-daily-scrum-brief',
  templateUrl: './daily-scrum-brief.html',
  styleUrl: './daily-scrum-brief.scss',
})
export class DailyScrumBrief {
  readonly brief = DAILY_SCRUM_BRIEF;
  readonly headingId = input('executive-scrum-heading');
  readonly displayDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(this.brief.date + 'T12:00:00Z'));
}
