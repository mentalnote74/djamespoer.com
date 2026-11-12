import type { ArticleSummary } from '../../content/articles';

export interface Article extends ArticleSummary {
  /** Optional visible H1; the canonical title remains unchanged. */
  heading?: string;
  /** Trusted, statically authored HTML. Angular retains its normal sanitization. */
  body: string;
  sources: readonly { label: string; url: string }[];
}
