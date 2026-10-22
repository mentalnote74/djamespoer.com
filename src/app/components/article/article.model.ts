import type { ArticleSummary } from '../../content/articles';

export interface Article extends ArticleSummary {
  /** Trusted, statically authored HTML. Angular retains its normal sanitization. */
  body: string;
  sources: readonly { label: string; url: string }[];
}
