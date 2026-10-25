# Blognostisphere — approved articles

## October 24 publication — SCRUM-143 / SCRUM-144

James explicitly lifted the publication hold on SCRUM-143 comment 10155. The
description remains an old idea capture, but its sole comment contains the
completed **The Difference Between Good, and Good Enough** manuscript, all four
research citations and the superseded hold. No attachments or later versions.
The original comment is archived intact in `approved/04-good-and-good-enough.md`;
the hold remains there as history, not as a current instruction or public copy.

The existing article pipeline publishes every manuscript word. Its first
sentence uses the existing dek field; the remaining prose and complete citation
list remain in the body. Only the editorial "Consideration #1", repeated title
and superseded status note are excluded from the public body. No rewrite,
generated copy or new Markdown runtime. The shared optional footer source list
is omitted when citations are already fully present in the body. Article 4 uses
October 24 publication/modification dates; the index's lastmod reflects its real
heading/list update. Existing article dates remain unchanged.

SCRUM-144 adds the H2 **Blognostifications** immediately above the list; article
titles use H3 below it. Current inventory is four article routes plus the index.
The existing registry supplies nav entries, related links, metadata/BlogPosting
schema and sitemap inclusion. Existing slides, Bass hero/swim-in, pig correction,
GA and themes are unchanged. Earlier verification notes below remain history.

Focused verification: 36 Angular tests and six discoverability/render tests pass;
production build/style budgets pass with 49 prerendered routes (468.82kB initial,
116.00kB estimated transfer). Local static HTML comparison matches every source
word including four citations. Desktop/390px index and article keyboard,
canonical/robots/schema/sitemap, overflow and scoped axe checks pass (zero
violations/application errors). Headless only; no preview pane opened.
Repeatable read-back: `node scripts/articles/verify-publication.mjs` or add
`--live`. Receipts/screenshots remain under ignored
`tmp/evidence/blognostisphere-publication/`; production receipt is also recorded
in Jira on release. Initial compilation used the older checkout's incomplete
dependencies; corrected only the worktree dependency junction and reran cleanly.
The route-test worker emitted a shutdown warning after all tests passed.

Approved October 22, 2026; inspiration-driven, not calendar-driven. No schedule,
newsletter, CMS, external ingestion or runtime Markdown parser.

Approved text is retained in `approved/`. Article 1 was recovered intact from
[SCRUM-128 comment 10115](https://djamespoer.atlassian.net/browse/SCRUM-128?focusedCommentId=10115).
Article 2 comes directly from the owner's full publication directive. Historical
weekly language and undecided naming in the older Jira canon are superseded by
the current explicit Blognostisphere/inspiration-driven decision.

Article 3, **Like a Big Dumb Bass**, comes from the owner's complete October 22
attachment. `approved/03-big-dumb-bass.md` preserves its wording; the receipt
records both original attachment and newline-normalized Markdown hashes. Its
354 body blocks retain all prose, with a semantic list for attention techniques.
The first two approved articles and bodies remain unchanged. Greenhouse's
2026 benchmark figures were checked directly against its report page; NN/G's
original scanning, first-impression, aesthetic-usability, information-scent and
perceived-value articles supply the research links. The LinkedIn report remains
the same March 2026 primary source already used by Article 1.

`source-receipt.json` records source hashes, body paragraph/heading counts,
comparison and real research URLs. Prose is preserved; the former repeated H1 and
dek become one page H1 and a paragraph. Body sections use H2. Inline emphasis and
minimal evidence links are semantic formatting, without rewriting the words.

Four existing-architecture lazy routes: `/blognostisphere` and the three named
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

Article 3 addition: build/budgets passed with 46 static routes and 459.74 kB
initial JavaScript/CSS (+0.23 kB raw versus the published dropdown checkpoint).
Its body is a separate 19.62 kB lazy chunk (5.64 kB estimated transfer). Existing
header tests 13/13, metadata tests 4/4 and discovery/render tests 6/6 passed.
Complete initial-HTML prose comparisons passed for all three articles. Desktop
and 390px index/detail checks (eight main-region axe scans) and the three-article
dropdown (two header axe scans) reported no violations, overflow, missing assets
or browser errors. Keyboard links, Escape/focus recovery and mobile close passed;
reduced-motion/forced-colors reading remained intact. All 46 generated public
JSON-LD graphs passed current Schema.org vocabulary/relationship validation.
