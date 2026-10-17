import { Pipe, PipeTransform } from '@angular/core';
/** Audit timestamps have one fixed UTC format; no locale-formatting runtime is needed. */
@Pipe({ name: 'utcTimestamp' })
export class UtcTimestamp implements PipeTransform {
  transform(seconds: number): string {
    const date = new Date(seconds * 1000);
    return Number.isFinite(date.getTime())
      ? date.toISOString().slice(0, 19).replace('T', ' ')
      : 'Unavailable';
  }
}
