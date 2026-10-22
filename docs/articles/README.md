# Blognostisphere — first publication

Approved October 22, 2026; inspiration-driven, not calendar-driven. No schedule,
newsletter, CMS, external ingestion or runtime Markdown parser.

Approved text is retained in `approved/`. Article 1 was recovered intact from
[SCRUM-128 comment 10115](https://djamespoer.atlassian.net/browse/SCRUM-128?focusedCommentId=10115).
Article 2 comes directly from the owner's full publication directive. Historical
weekly language and undecided naming in the older Jira canon are superseded by
the current explicit Blognostisphere/inspiration-driven decision.

`source-receipt.json` records source hashes, body paragraph/heading counts,
comparison and real research URLs. Prose is preserved; the former repeated H1 and
dek become one page H1 and a paragraph. Body sections use H2. Inline emphasis and
minimal evidence links are semantic formatting, without rewriting the words.

Three existing-architecture lazy routes: `/blognostisphere` and the two named
article paths. One Article model/presentation, one small index. Full bodies and
source lists load only on their article routes. Published static HTML contains
the complete text, links, headings, byline and standing donkey disclaimer.
Themes, Manrope/Inter roles, shared page reading measure, focus and navigation
remain the existing site's. No hero artwork or new animation.

The public metadata registry contains small summaries, not article bodies. It
drives titles/descriptions, canonicals, index/follow, supported prerendering and
the sitemap. Explicit October 22 publication/modification dates supply lastmod;
ordinary builds do not update editorial dates. BlogPosting author/publisher point
to the existing D. James Poer Person; Blognosticator is his displayed pen name and
alternateName, not another Person. No unrelated SEO work or submission automation.

Sources are primary publishers, including official OpenAI docs, Microsoft,
LinkedIn, Anthropic, IBM Research, McKinsey, Greenhouse and Ashby. The Greenhouse
2025 28→95 series is distinct from its 2026 benchmark series; both links are kept.
Research claims remain the approved dated prose, not live measurements.

Lean verification: production build/budgets, existing metadata/header and sitemap
tests, complete initial-HTML text comparison against each approved source,
desktop/390px index/detail/navigation, semantic headings, internal links,
byline/disclaimer, scoped axe, overflow, browser/asset errors, static
reduced-motion/forced-colors reading, and current Schema.org vocabulary validation.
Final live receipts follow release under the worktree's ignored `tmp/evidence/`.

Local results: build/budgets passed, 45 static routes. Initial bundle 458.80 kB
(+7.18 kB raw / approximately +2.42 kB estimated transfer); no new dependency.
Full article chunks are separate lazy loads (approximately 4.99/5.38 kB transfer).
Existing header/metadata checks 17/17 and discovery/render-preparation checks 6/6
passed. Six desktop/390px scoped axe scans: zero violations. Complete initial
article text matches both approved bodies; keyboard and native links, 1280px
reflow, reduced-motion/forced-colors reading, overflow/browser/asset checks passed.
All 45 public graphs validated against current Schema.org types, properties,
inherited domains/ranges and references, including BlogPosting dates/authorship.
