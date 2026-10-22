export { ARTICLES, type ArticleSummary } from './public-pages';

export const ARTICLE_BYLINE = 'By Blognosticator*';
export const ARTICLE_AUTHOR_NOTE =
  'Blognosticator is the pen name used for djamespoer.com articles written under James’s direction. Any shenanigans, inaccuracies, questionable judgment, excessive robot herding, or other flaggable offenses should be blamed first on James’s emotional-support donkey.';

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });
export function articleDateLabel(date: string): string {
  return dateFormatter.format(new Date(date));
}
