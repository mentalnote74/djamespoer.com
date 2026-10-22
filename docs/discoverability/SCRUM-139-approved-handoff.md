# SCRUM-139 — Offline handoff for Larry

Jira: https://djamespoer.atlassian.net/browse/SCRUM-139
Title: djamespoer.com — Old-school + modern SEO / discoverability pass

This handoff reproduces the full description from the original supplied Markdown and the original-brief comment written to Jira. Jira rendered some domain references as smart links; the original wording is retained here. No scope is omitted.

## FULL STORY DESCRIPTION

# NEXT STORY — djamespoer.com SEO / DISCOVERABILITY PASS

Create the next Jira story for the previously approved **old-school + modern SEO/discoverability pass** for djamespoer.com.

This is **approved work**, not a speculative idea.

Do **not** implement it as part of the Jira-logging operation unless Coach separately tells you to execute it.

The point of this story is straightforward:

**Make it easier for recruiters, hiring managers, search engines, AI search/discovery systems, and people searching James by name or specialty to find and correctly understand djamespoer.com.**

This is especially relevant to the current job-search strategy:

**survive machine filtering → interrupt human attention → reduce the cost of trust with verifiable evidence**

The site already contains substantial evidence.

This story makes that evidence substantially easier to discover.

---

# OBJECTIVE

Improve organic discoverability and machine comprehension of:

**D. James Poer**

and his positioning around:

* Senior UX Engineer
* Front-End Engineer
* Front-End Architect
* Design Engineer
* UX Engineering
* Angular
* TypeScript
* Accessibility
* WCAG
* Section 508
* Enterprise Applications
* Front-End Architecture
* Product / UX Engineering

The goal is not keyword stuffing.

The goal is:

**clear, truthful, crawlable professional identity reinforced consistently throughout the site.**

---

# 1. ROUTE-LEVEL TITLES + META DESCRIPTIONS

Audit public indexable routes.

Give meaningful pages aggressive but truthful:

* `<title>`
* meta description

Each should describe the actual content of the route and reinforce the professional/entity context where natural.

Avoid boilerplate descriptions that communicate nothing.

Do not mechanically stuff every keyword into every page.

Examples of useful distinctions:

* Work History pages describe employment/project evidence.
* Case Studies describe decisions, constraints, process and outcomes.
* Engineering emphasizes front-end architecture / Angular / TypeScript.
* Accessibility emphasizes WCAG / Section 508 / accessibility engineering.
* AI & Innovation emphasizes AI-assisted product development and human judgment.
* Buildometer describes measurable project delivery.
* Thingamajob describes evidence-backed career/product tooling.

Use the actual content.

---

# 2. CANONICAL URLS

Implement correct canonical URLs for indexable public routes.

Requirements:

* absolute canonical URL
* `https://djamespoer.com/...`
* one canonical identity per content page
* avoid accidental duplicate URL identities
* canonical must correspond to the route's intended public URL

Do not blindly canonicalize everything to the homepage.

---

# 3. ROBOTS DIRECTIVES

Ensure public professional content intentionally carries appropriate:

**index, follow**

behavior.

Preserve intentional `noindex` treatment for things that should not be search results, including test/evaluator surfaces where applicable.

Audit rather than globally flipping everything.

---

# 4. robots.txt

Create or validate a clean production `robots.txt`.

It should:

* permit crawling of intended public content
* protect intentionally excluded areas where appropriate
* reference the sitemap
* avoid obsolete SEO superstition

Do **not** rely on ancient directives such as `revisit-after`.

---

# 5. sitemap.xml

Create or validate a production sitemap containing intended indexable routes.

Requirements:

* canonical absolute URLs
* accurate membership
* truthful `lastmod` where it can be maintained accurately
* no fake timestamps simply to make content appear fresh

`changefreq` may be used only as a secondary hint if useful.

Do not treat `changefreq` as an important ranking mechanism.

Do not add junk/non-public/test routes merely because they exist in Angular routing.

---

# 6. CRAWLABLE PROFESSIONAL IDENTITY

Important professional positioning must exist in **real crawlable HTML**.

Do not rely exclusively on:

* animation
* images
* canvas/SVG artwork
* inaccessible visual text
* client-side effects
* metadata alone

A crawler arriving at the rendered page should be able to understand:

**D. James Poer is a Senior UX / Front-End Engineer and Front-End Architect with substantial Angular, TypeScript, accessibility, WCAG/Section 508, enterprise application and UX engineering experience.**

Use truthful site copy already supported by career evidence.

Do not invent credentials or experience.

---

# 7. STRUCTURED DATA / JSON-LD

Add appropriate structured data where it truthfully describes the page/entity.

Evaluate and use as appropriate:

* `Person`
* `WebSite`
* `ProfilePage`
* `CreativeWork`

Potential relationships should connect:

* D. James Poer
* djamespoer.com
* professional identity
* LinkedIn
* GitHub
* relevant public profiles
* truthful roles
* truthful skills/expertise

Do not create giant schema dumps just because properties exist.

Use structured data that accurately represents the content visible on the page.

Validate resulting markup.

---

# 8. INTERNAL LINK LANGUAGE

Audit important internal links.

Where appropriate, replace weak/contextless anchor text with descriptive language.

Avoid a site full of generic:

* Click here
* Learn more
* View
* Explore

when a descriptive accessible name can communicate the destination.

This does **not** require destroying concise visual CTA design.

Visible short CTA text may remain where appropriate if accessible labeling/context provides a meaningful destination.

Do not harm the carousel UX merely to cram keywords into buttons.

---

# 9. PAGE H1s / DOCUMENT STRUCTURE

Ensure meaningful H1s exist where required, especially:

* Work History
* Case Study
* major perspective/content pages

Heading structure should accurately describe the document.

Do not add hidden SEO headings.

Do not duplicate giant visual titles unnecessarily if existing semantic markup can provide the heading correctly.

---

# 10. CONSISTENT PROFESSIONAL IDENTITY

Audit consistency across:

* djamespoer.com
* public résumé artifacts
* LinkedIn
* GitHub/profile references
* contact information
* structured data
* page metadata

Important identity signals should agree on:

**D. James Poer**

and the current professional positioning.

Avoid contradictory role names, stale descriptions, missing LinkedIn references, inconsistent names, or different professional summaries accidentally describing different people.

---

# 11. KEYWORD / ENTITY REINFORCEMENT

Truthfully reinforce the professional entities that matter to the current job search.

Primary cluster:

* Senior UX Engineer
* Front-End Engineer
* Front-End Architect
* Angular
* TypeScript
* WCAG
* Section 508
* Accessibility
* Accessibility Engineering
* UX Engineering
* Enterprise Applications
* Front-End Architecture
* Design Engineer

Use these where they actually belong.

Do not stuff them into unrelated pages.

The objective is for repeated truthful evidence across the site to establish a coherent professional entity.

---

# 12. GOOGLE SEARCH CONSOLE

Set up / verify Google Search Console for djamespoer.com.

Then:

* submit sitemap
* verify crawling/indexing
* inspect important URLs
* request indexing where appropriate
* identify obvious crawl/index problems
* establish an initial measurement baseline

Do not obsessively request indexing for every trivial change.

---

# 13. BING WEBMASTER TOOLS

Set up / verify Bing Webmaster Tools.

Then:

* submit sitemap
* verify crawl/index status
* submit/index important URLs where supported and useful
* inspect obvious indexing issues

This also matters because Bing's index has downstream relevance beyond Bing's own search UI.

---

# 14. DIRECT INDEX NOTIFICATION

Where currently supported, legitimate, and useful, evaluate direct URL/index notification mechanisms.

Use supported mechanisms only.

No spammy indexing services.

No shady backlink/indexing products.

No obsolete ping rituals masquerading as SEO.

---

# 15. BASELINE DISCOVERABILITY MEASUREMENT

Before/around release, establish a lightweight baseline so later changes can be judged against something.

At minimum evaluate searches such as:

* exact full professional name
* name + Angular
* name + UX
* name + accessibility
* name + Front-End
* `djamespoer.com`

Record enough to know whether discoverability improves over time.

Do not turn this into a giant analytics project.

The purpose is simply:

**measure before pretending SEO worked.**

---

# 16. MODERN SEARCH / AI DISCOVERABILITY

While implementing conventional search-engine fundamentals, keep modern machine discovery in mind.

The site should make its identity and evidence understandable to systems consuming web content through:

* search indexes
* semantic/entity extraction
* AI-assisted search
* answer engines
* retrieval systems

The response is **not** to invent an “AI SEO” bag of tricks.

The response is:

* clear semantic HTML
* explicit identity
* structured relationships
* descriptive content
* strong information architecture
* stable URLs
* authoritative original evidence
* consistent entities
* crawlable text
* useful internal linking

Build something machines can understand because humans can understand it.

---

# DO NOT DO

Do not:

* keyword stuff
* hide SEO text
* create doorway pages
* manufacture fake location pages
* create fake freshness
* add hundreds of thin pages
* rewrite strong human copy into search-engine sludge
* compromise accessibility for SEO
* compromise performance for SEO tooling
* add giant unnecessary libraries
* install dubious SEO packages when Angular/browser primitives already solve the problem
* use `revisit-after` as though it still matters
* chase Lighthouse SEO 100 merely for the number if the underlying discoverability work is incomplete
* turn this into a site redesign

This is a **discoverability layer over the product we already built.**

---

# LEAN IMPLEMENTATION RULE

When this story is eventually executed:

Use the existing architecture.

Make the smallest coherent set of changes needed to establish the SEO foundation.

Do not invent a new metadata platform if a small shared Angular service/configuration can accomplish the same thing.

Do not create unnecessary abstraction before routes prove they need it.

Use the real production site as the meaningful validation step.

---

# ACCEPTANCE

The implementation story should ultimately be considered complete when:

1. Important indexable routes have truthful differentiated titles and descriptions.
2. Canonical URLs are correct.
3. Robots directives intentionally distinguish indexable from non-indexable surfaces.
4. `robots.txt` is correct and references the sitemap.
5. `sitemap.xml` accurately represents intended indexable content.
6. Important professional identity exists in crawlable HTML.
7. Appropriate structured data is present and valid.
8. Important internal links communicate useful destination context.
9. Major content pages have meaningful semantic H1/document structure.
10. D. James Poer's public professional identity is consistent across site metadata/content/profile references.
11. Target professional entities are reinforced truthfully.
12. Google Search Console is configured and the sitemap submitted.
13. Bing Webmaster Tools is configured and the sitemap submitted.
14. Important URLs have been inspected/submitted where appropriate.
15. A basic exact-name/domain/professional-query discoverability baseline is recorded.
16. Accessibility and performance remain healthy.
17. No spammy, deceptive, obsolete, or cargo-cult SEO was introduced.

---

# WHY THIS STORY EXISTS

The current job market creates an attention and trust problem.

The portfolio is already being built to provide unusually deep evidence.

SEO/discoverability makes sure that evidence is not trapped behind a URL somebody must already know.

The strategy is consistent with the first weekly article:

**Create more signal.**

Make James easy to identify.

Make the work easy to find.

Make the claims easy to verify.

Then let the evidence do its job.


## EXACT ORIGINAL-BRIEF COMMENT

Approved scope — original source preserved for recovery. This story is approved work; this logging operation performs no implementation. Execute only when Coach separately instructs it. Related strategy/article canon: SCRUM-128, comment 10115 (https://djamespoer.atlassian.net/browse/SCRUM-128?focusedCommentId=10115). The complete supplied brief, all 16 work areas, all 17 acceptance criteria, and every exclusion follow verbatim:

```markdown
# NEXT STORY — djamespoer.com SEO / DISCOVERABILITY PASS

Create the next Jira story for the previously approved **old-school + modern SEO/discoverability pass** for djamespoer.com.

This is **approved work**, not a speculative idea.

Do **not** implement it as part of the Jira-logging operation unless Coach separately tells you to execute it.

The point of this story is straightforward:

**Make it easier for recruiters, hiring managers, search engines, AI search/discovery systems, and people searching James by name or specialty to find and correctly understand djamespoer.com.**

This is especially relevant to the current job-search strategy:

**survive machine filtering → interrupt human attention → reduce the cost of trust with verifiable evidence**

The site already contains substantial evidence.

This story makes that evidence substantially easier to discover.

---

# OBJECTIVE

Improve organic discoverability and machine comprehension of:

**D. James Poer**

and his positioning around:

* Senior UX Engineer
* Front-End Engineer
* Front-End Architect
* Design Engineer
* UX Engineering
* Angular
* TypeScript
* Accessibility
* WCAG
* Section 508
* Enterprise Applications
* Front-End Architecture
* Product / UX Engineering

The goal is not keyword stuffing.

The goal is:

**clear, truthful, crawlable professional identity reinforced consistently throughout the site.**

---

# 1. ROUTE-LEVEL TITLES + META DESCRIPTIONS

Audit public indexable routes.

Give meaningful pages aggressive but truthful:

* `<title>`
* meta description

Each should describe the actual content of the route and reinforce the professional/entity context where natural.

Avoid boilerplate descriptions that communicate nothing.

Do not mechanically stuff every keyword into every page.

Examples of useful distinctions:

* Work History pages describe employment/project evidence.
* Case Studies describe decisions, constraints, process and outcomes.
* Engineering emphasizes front-end architecture / Angular / TypeScript.
* Accessibility emphasizes WCAG / Section 508 / accessibility engineering.
* AI & Innovation emphasizes AI-assisted product development and human judgment.
* Buildometer describes measurable project delivery.
* Thingamajob describes evidence-backed career/product tooling.

Use the actual content.

---

# 2. CANONICAL URLS

Implement correct canonical URLs for indexable public routes.

Requirements:

* absolute canonical URL
* `https://djamespoer.com/...`
* one canonical identity per content page
* avoid accidental duplicate URL identities
* canonical must correspond to the route's intended public URL

Do not blindly canonicalize everything to the homepage.

---

# 3. ROBOTS DIRECTIVES

Ensure public professional content intentionally carries appropriate:

**index, follow**

behavior.

Preserve intentional `noindex` treatment for things that should not be search results, including test/evaluator surfaces where applicable.

Audit rather than globally flipping everything.

---

# 4. robots.txt

Create or validate a clean production `robots.txt`.

It should:

* permit crawling of intended public content
* protect intentionally excluded areas where appropriate
* reference the sitemap
* avoid obsolete SEO superstition

Do **not** rely on ancient directives such as `revisit-after`.

---

# 5. sitemap.xml

Create or validate a production sitemap containing intended indexable routes.

Requirements:

* canonical absolute URLs
* accurate membership
* truthful `lastmod` where it can be maintained accurately
* no fake timestamps simply to make content appear fresh

`changefreq` may be used only as a secondary hint if useful.

Do not treat `changefreq` as an important ranking mechanism.

Do not add junk/non-public/test routes merely because they exist in Angular routing.

---

# 6. CRAWLABLE PROFESSIONAL IDENTITY

Important professional positioning must exist in **real crawlable HTML**.

Do not rely exclusively on:

* animation
* images
* canvas/SVG artwork
* inaccessible visual text
* client-side effects
* metadata alone

A crawler arriving at the rendered page should be able to understand:

**D. James Poer is a Senior UX / Front-End Engineer and Front-End Architect with substantial Angular, TypeScript, accessibility, WCAG/Section 508, enterprise application and UX engineering experience.**

Use truthful site copy already supported by career evidence.

Do not invent credentials or experience.

---

# 7. STRUCTURED DATA / JSON-LD

Add appropriate structured data where it truthfully describes the page/entity.

Evaluate and use as appropriate:

* `Person`
* `WebSite`
* `ProfilePage`
* `CreativeWork`

Potential relationships should connect:

* D. James Poer
* djamespoer.com
* professional identity
* LinkedIn
* GitHub
* relevant public profiles
* truthful roles
* truthful skills/expertise

Do not create giant schema dumps just because properties exist.

Use structured data that accurately represents the content visible on the page.

Validate resulting markup.

---

# 8. INTERNAL LINK LANGUAGE

Audit important internal links.

Where appropriate, replace weak/contextless anchor text with descriptive language.

Avoid a site full of generic:

* Click here
* Learn more
* View
* Explore

when a descriptive accessible name can communicate the destination.

This does **not** require destroying concise visual CTA design.

Visible short CTA text may remain where appropriate if accessible labeling/context provides a meaningful destination.

Do not harm the carousel UX merely to cram keywords into buttons.

---

# 9. PAGE H1s / DOCUMENT STRUCTURE

Ensure meaningful H1s exist where required, especially:

* Work History
* Case Study
* major perspective/content pages

Heading structure should accurately describe the document.

Do not add hidden SEO headings.

Do not duplicate giant visual titles unnecessarily if existing semantic markup can provide the heading correctly.

---

# 10. CONSISTENT PROFESSIONAL IDENTITY

Audit consistency across:

* djamespoer.com
* public résumé artifacts
* LinkedIn
* GitHub/profile references
* contact information
* structured data
* page metadata

Important identity signals should agree on:

**D. James Poer**

and the current professional positioning.

Avoid contradictory role names, stale descriptions, missing LinkedIn references, inconsistent names, or different professional summaries accidentally describing different people.

---

# 11. KEYWORD / ENTITY REINFORCEMENT

Truthfully reinforce the professional entities that matter to the current job search.

Primary cluster:

* Senior UX Engineer
* Front-End Engineer
* Front-End Architect
* Angular
* TypeScript
* WCAG
* Section 508
* Accessibility
* Accessibility Engineering
* UX Engineering
* Enterprise Applications
* Front-End Architecture
* Design Engineer

Use these where they actually belong.

Do not stuff them into unrelated pages.

The objective is for repeated truthful evidence across the site to establish a coherent professional entity.

---

# 12. GOOGLE SEARCH CONSOLE

Set up / verify Google Search Console for djamespoer.com.

Then:

* submit sitemap
* verify crawling/indexing
* inspect important URLs
* request indexing where appropriate
* identify obvious crawl/index problems
* establish an initial measurement baseline

Do not obsessively request indexing for every trivial change.

---

# 13. BING WEBMASTER TOOLS

Set up / verify Bing Webmaster Tools.

Then:

* submit sitemap
* verify crawl/index status
* submit/index important URLs where supported and useful
* inspect obvious indexing issues

This also matters because Bing's index has downstream relevance beyond Bing's own search UI.

---

# 14. DIRECT INDEX NOTIFICATION

Where currently supported, legitimate, and useful, evaluate direct URL/index notification mechanisms.

Use supported mechanisms only.

No spammy indexing services.

No shady backlink/indexing products.

No obsolete ping rituals masquerading as SEO.

---

# 15. BASELINE DISCOVERABILITY MEASUREMENT

Before/around release, establish a lightweight baseline so later changes can be judged against something.

At minimum evaluate searches such as:

* exact full professional name
* name + Angular
* name + UX
* name + accessibility
* name + Front-End
* `djamespoer.com`

Record enough to know whether discoverability improves over time.

Do not turn this into a giant analytics project.

The purpose is simply:

**measure before pretending SEO worked.**

---

# 16. MODERN SEARCH / AI DISCOVERABILITY

While implementing conventional search-engine fundamentals, keep modern machine discovery in mind.

The site should make its identity and evidence understandable to systems consuming web content through:

* search indexes
* semantic/entity extraction
* AI-assisted search
* answer engines
* retrieval systems

The response is **not** to invent an “AI SEO” bag of tricks.

The response is:

* clear semantic HTML
* explicit identity
* structured relationships
* descriptive content
* strong information architecture
* stable URLs
* authoritative original evidence
* consistent entities
* crawlable text
* useful internal linking

Build something machines can understand because humans can understand it.

---

# DO NOT DO

Do not:

* keyword stuff
* hide SEO text
* create doorway pages
* manufacture fake location pages
* create fake freshness
* add hundreds of thin pages
* rewrite strong human copy into search-engine sludge
* compromise accessibility for SEO
* compromise performance for SEO tooling
* add giant unnecessary libraries
* install dubious SEO packages when Angular/browser primitives already solve the problem
* use `revisit-after` as though it still matters
* chase Lighthouse SEO 100 merely for the number if the underlying discoverability work is incomplete
* turn this into a site redesign

This is a **discoverability layer over the product we already built.**

---

# LEAN IMPLEMENTATION RULE

When this story is eventually executed:

Use the existing architecture.

Make the smallest coherent set of changes needed to establish the SEO foundation.

Do not invent a new metadata platform if a small shared Angular service/configuration can accomplish the same thing.

Do not create unnecessary abstraction before routes prove they need it.

Use the real production site as the meaningful validation step.

---

# ACCEPTANCE

The implementation story should ultimately be considered complete when:

1. Important indexable routes have truthful differentiated titles and descriptions.
2. Canonical URLs are correct.
3. Robots directives intentionally distinguish indexable from non-indexable surfaces.
4. `robots.txt` is correct and references the sitemap.
5. `sitemap.xml` accurately represents intended indexable content.
6. Important professional identity exists in crawlable HTML.
7. Appropriate structured data is present and valid.
8. Important internal links communicate useful destination context.
9. Major content pages have meaningful semantic H1/document structure.
10. D. James Poer's public professional identity is consistent across site metadata/content/profile references.
11. Target professional entities are reinforced truthfully.
12. Google Search Console is configured and the sitemap submitted.
13. Bing Webmaster Tools is configured and the sitemap submitted.
14. Important URLs have been inspected/submitted where appropriate.
15. A basic exact-name/domain/professional-query discoverability baseline is recorded.
16. Accessibility and performance remain healthy.
17. No spammy, deceptive, obsolete, or cargo-cult SEO was introduced.

---

# WHY THIS STORY EXISTS

The current job market creates an attention and trust problem.

The portfolio is already being built to provide unusually deep evidence.

SEO/discoverability makes sure that evidence is not trapped behind a URL somebody must already know.

The strategy is consistent with the first weekly article:

**Create more signal.**

Make James easy to identify.

Make the work easy to find.

Make the claims easy to verify.

Then let the evidence do its job.

```
