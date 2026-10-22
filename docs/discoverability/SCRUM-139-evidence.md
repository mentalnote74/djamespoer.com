# SCRUM-139 — discoverability implementation and account handoff

Scope source: [approved full handoff](SCRUM-139-approved-handoff.md), including
the original comment, all 16 work areas and all 17 acceptance criteria.
Baseline production: `9d5a4ea4837fde29f6ebba74c4f5e1ca779e11ea`.

**Story remains open.** Account-side acceptance 12/13 and part of 14 require
signed-in access. Neither missing tags nor a sitemap URL proves whether a
webmaster account/property already exists or is verified. No credential update
or rotation is indicated by the evidence available here.

## Findings and changes

The baseline production response had no JSON-LD. Direct interior requests served
the generic CSR shell rather than route-specific metadata and career content.
The missing sitemap URL returned the SPA document with HTTP 200. Lighthouse SEO
was already 100: that score did not establish discoverability or indexing.

Extended the existing PageMetadataStrategy with one small public-page registry:
differentiated titles/descriptions, normalized absolute canonicals, per-navigation
robots/social metadata and a compact connected Schema.org graph. Existing public
routes remain lazy on client navigation. The registry also drives supported
Angular static prerendering and sitemap membership: 21 fixed public pages plus
21 existing journal dates. Date paths are regenerated from the real public
journal during prebuild; no historical measurement or content is fabricated.

Removed obsolete CSR rewrites that would hide the new static documents. The
existing Work alias redirects to Home. Cloudflare's supported drop-trailing-slash
handling agrees with the canonical links; the SPA fallback remains available.
Existing stylesheet inlining/preload preparation now covers every built document.
There is no request-time SSR service or new runtime dependency.

Added a visible, concise homepage professional introduction, descriptive links
to About/Engineering/Accessibility, About's full-name H1 and public profile links.
Kept the existing semantic Home heading, concise carousel Explore buttons,
carousel composition/behavior, all career content and all source privacy rules.
Existing work/case-study links already name their destinations. A rendered axe
check exposed duplicate Related page landmark names above/below studies; those
labels now distinguish position without changing links or visible copy.

robots.txt allows intended public content, excludes API/Cloudflare utility paths
and references the sitemap. Unwritten journal dates are noindex, without public structured data. Test pages remain crawlable so their existing
noindex can be seen. The live evaluator's separate Worker already supplies both
HTTP and HTML noindex/nofollow; its implementation is untouched. Defense-in-depth
asset headers cover test and CSR-shell paths. The sitemap excludes aliases,
test/API/private paths and nonexistent routes. It omits lastmod/changefreq/priority;
build time is not represented as a content update.

## Structured data and modern discovery

Person and WebSite share stable IDs; About is a ProfilePage with the person as its
main entity. Public work/case-study/prototype descriptions use CreativeWork for
the authored evidence page, not a claim of sole ownership of an employer's product.
Other routes use WebPage. Public LinkedIn/GitHub references agree with existing
authorized references. No ratings, invented jobs, fake timestamps or career-source
documents are included. All 42 graphs were parsed and their types, properties,
inherited domains/ranges and entity relationships validated against the current
[official Schema.org vocabulary](https://schema.org/version/latest/schemaorg-current-https.jsonld).
This is not a guarantee of Google rich results.

Existing llms.txt now links to actual public evidence and explains the unfinished
prototype/private-source boundary. The previously removed ai-catalog.json was not
reintroduced. No AI-only doorway content, article platform or SCRUM-128 work was
implemented.

## Identity/source audit

- Public résumé `public/assets/resume/d-james-poer-resume.pdf` is unchanged.
  SHA-256: `f7a88e9bf5c3850a8a7d78586a60b21584a497430817eb85bf35a3627dd9f463`.
  Its name, email, LinkedIn/domain references, UX/front-end architecture,
  Angular/TypeScript and WCAG/Section 508 positioning agree with this implementation.
- Existing approved public Engineering, Accessibility and authored employment
  content support the visible introduction. IPS private departure context is not
  used. EXL personal-fork wording and D&R classic ASP remain distinct.
- LinkedIn's returned public search excerpt names D. James Poer and describes
  Senior UX Engineer / Front-End Architect positioning. It is an indexed excerpt,
  not a fresh full-profile inspection or new ingestion.
- GitHub's public API returned `mentalnote74` with no display name, bio or website.
  The established account URL is preserved. Optional owner improvement: GitHub
  Settings → Public profile: name D. James Poer, a truthful UX/front-end bio, and
  website https://djamespoer.com. No account was changed.
- No Google/Bing verification meta tag or verification file was found in the repo
  or the baseline production documents. No matching verification TXT was returned
  by the public DNS check. These are setup observations, not account-status proof.

## Direct notification decision

- [Google Indexing API](https://developers.google.com/search/apis/indexing-api/v3/using-api)
  is restricted to JobPosting and livestream BroadcastEvent pages. This portfolio
  is neither; the evaluator's pasted JDs do not make the site a job-posting service.
  No Indexing API integration or fabricated JobPosting schema was added.
- Google's [retired sitemap ping](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping)
  is not used. Discovery uses sitemap/robots and the account-side submission steps.
- [IndexNow](https://www.indexnow.org/documentation) is a legitimate option for
  notifying participating engines about genuinely changed public URLs. It needs
  an actual site-owned proof key and a restrained changed-URL publication policy.
  It is not a substitute for the required Google/Bing account baseline and is not
  a required integration in this evaluation-only work area. Evaluated, not
  installed: no invented key/credential, recurring resubmission or second release
  automation path was added. Bing's supported manual submission remains the
  smallest next step once the owner can access the verified property.

## Baseline and verification

[Search snapshot](2026-10-22-search-baseline.json) records all six requested queries.
The returned result sets did not contain djamespoer.com; several professional-name
queries returned the LinkedIn profile and unrelated namesakes. Domain-only search
returned a registration-list page. Provider/index/localization are not exposed by
the search tool; this is not a Google/Bing rank claim or proof of deindexing. No
claim of improved ranking is made at release.

[Production-before route evidence](2026-10-22-production-before.json) records the
actual initial HTML and retained test noindex. [Paired performance evidence](2026-10-22-performance-before.json)
starts with mobile Lighthouse 13.5.0: Performance 90, Accessibility 100, SEO 100,
simulated FCP 2787.0945 ms/LCP 2819.0945 ms/TBT 97.5 ms/CLS 0; observed FCP
1186 ms/LCP 1220 ms. One before/after run is a regression check, not a statistical
benchmark or proof that SEO improved. Both use the established internal analytics
opt-out. Simulated scores and observed browser timings remain separate.

Production build/budgets pass: 451.62 kB initial versus 443.66 kB baseline
(+7.96 kB raw; approximately +2.10 kB estimated transfer). No new package/framework.
Existing carousel tests 23/23, metadata/About 5/5, case-study tests 7/7 and focused
Node discovery/render-preparation tests 6/6 passed. Initial strict typing/fixture
failures were corrected. The rendered duplicate-landmark finding was fixed and
verified with a regression check.

Local Cloudflare runtime: all 42 initial documents have the intended canonical,
differentiated title/description, robots, social metadata, one main/H1 and JSON-LD.
Desktop checks cover all 21 fixed pages; 390px covers eight representative pages.
All 29 scoped main-content axe scans pass; no hydration/browser errors, missing
assets or overflow. Keyboard skip and actual router navigation preserve focus and
update canonical/schema together. Trailing-slash aliases redirect to non-slash
canonicals. Source PNGs, runtime art and career source files are untouched.

Final live read-back, Worker/deployment identity, schema and performance results
are retained after release under the isolated worktree's `tmp/evidence/`. The
public release marker identifies the exact implementation commit. A local final
receipt and Jira-ready comment are retained there if Atlassian remains unavailable.

## Acceptance ledger

| AC | Result | Evidence |
| --- | --- | --- |
| 1 | Implemented | Public registry, route metadata and dated journal metadata |
| 2 | Implemented | 42 initial canonicals; query/fragment/matrix normalization; host slash policy |
| 3 | Implemented | Public index/follow; internal deny behavior; retained test noindex |
| 4 | Implemented | Production robots.txt with sitemap reference |
| 5 | Implemented | 42 canonical URLs generated from real routes/journal; no fake lastmod |
| 6 | Implemented | Visible professional introduction; prerendered public career content |
| 7 | Implemented | Small connected graph; current vocabulary/relationship validation |
| 8 | Implemented | Descriptive public links and existing concise contextual carousel CTAs |
| 9 | Implemented | One semantic H1/main in each initial document; distinct related landmarks |
| 10 | Implemented | Site/résumé/profile-reference audit; optional GitHub enrichment documented |
| 11 | Implemented | Evidence-supported professional entities in appropriate visible copy/metadata |
| 12 | **Blocked: account access** | No signed-in Search Console access; property/verification/submission unknown |
| 13 | **Blocked: account access** | No signed-in Bing Webmaster access; property/verification/submission unknown |
| 14 | **Partial: account access** | Technical public URL inspection complete; account inspection/submission pending |
| 15 | Recorded | Six-query search snapshot and before-release production evidence |
| 16 | Verified locally; live receipt follows release | Build, regression tests, scoped axe, responsive checks and paired performance |
| 17 | Implemented | No spam, hidden SEO copy, fake freshness, invented routes or indexing gimmicks |

## Coach: precise account-side next steps

1. Open [Google Search Console](https://search.google.com/search-console) with the
   existing intended Google account. Check the property selector first: setup
   status is unknown, so do not create a duplicate property unnecessarily.
2. If an accessible verified Domain property `djamespoer.com` exists, select it.
   Otherwise add Domain property `djamespoer.com`. Copy the exact DNS TXT proof
   supplied by Google into the domain's Cloudflare DNS (name `@` / root, TXT value
   supplied by Google), retain existing DNS records, then click Verify in Search
   Console. Alternatively use an existing verified URL-prefix property
   `https://djamespoer.com/`; do not replace an existing proof token.
3. Under Sitemaps submit `https://djamespoer.com/sitemap.xml`. Record the returned
   processing status. Use URL Inspection for Home, About, Engineering,
   Accessibility and `/work/djamespoer`; inspect the canonical/index status and run
   Test live URL where needed. Request indexing once for important changed pages
   that warrant it. Record Pages/indexing issues plus initial Performance
   impressions/clicks when the account has data. Do not repeatedly resubmit.
4. Open [Bing Webmaster Tools](https://www.bing.com/webmasters/) in the intended
   account; check for the existing site. Use its existing verified site if present.
   If absent, import the verified Search Console site or add
   `https://djamespoer.com/` and complete the exact ownership method offered by Bing
   (official XML file/meta tag/DNS proof). Share an official public verification
   file/tag for integration if required; do not send passwords or access tokens.
5. Submit the same sitemap under Sitemaps, inspect the same important pages using
   URL Inspection, and use supported URL Submission once where appropriate.
   Preserve the results/date and reconcile AC 12–14 in SCRUM-139.
6. If the property exists under another account, use that property's existing
   owner/admin to grant the intended Google/Bing account the necessary access.
   A missing signed-in session is not evidence of an expired credential. No token,
   password, OAuth client or Cloudflare credential needs rotation on current evidence.

References: [Google verification help](https://support.google.com/webmasters/answer/9008080),
[Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
[Bing site verification](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b),
[Bing sitemaps](https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed),
[Bing URL inspection](https://www.bing.com/webmasters/help/URL-Inspection-55a30305).

Atlassian read retries returned MCP request timeouts, not an authentication-denied
response. Evidence is retained locally; no Jira status transition or completion
claim was made. Reconcile the final receipt/comment when connector access returns.
