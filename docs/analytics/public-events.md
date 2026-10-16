# Public intentional interaction events

GA4 initialization stays in src/index.html: same G-WQBYGF4Z8F property, production-host guard, explicit internal-browser marker and deferred portfolio-ready/idle script loading. The previous delegated document listener emitted resume_download, contact_click and thingamajob_open. It is removed to avoid duplicates. PublicAnalytics is the sole typed custom-event transport; PublicTrack explicitly opts links into trusted click/middle-click activation. Keyboard activation uses the normal trusted click. Footer settings calls the same service explicitly; no passive carousel or cookie-choice events.

Every event includes low-cardinality `location`, legacy `cta_location` (same value) and allowlisted `page_path`. Queries, hashes, link text and full destinations are never sent.

| Event | Additional parameters |
| --- | --- |
| resume_download | asset_name=public-current, legacy resume_id=public-current |
| contact_click | contact_method=email |
| thingamajob_open | source, destination_path=/thingamajob |
| case_study_open | employer, source |
| work_open | employer, source |
| carousel_cta_click | slide, destination (allowlisted public path) |
| cookie_settings_open | none; location=footer |
| external_profile_click | profile=linkedin (currently present); github only if an actual profile link is rendered |

Locations: primary-navigation, hero, home-thingamajob, page-content, footer, carousel. Sources: navigation, homepage, work, case-study, carousel, hero, page-content, footer. Existing employer/project slugs: djamespoer, exl, ips, tcc, dr. Active artwork slide keys: engineering, ux, accessibility, ai, impact. Creative Town has no link, so no fabricated CTA event. Work-menu links emit work_open; Case Studies menu and article links into employer case studies emit case_study_open. Product route /thingamajob emits thingamajob_open, retaining home-thingamajob attribution. A meaningful carousel link may also emit a destination-specific event if appropriate; no duplicate event name per activation.

Public résumé audit found the shared header download and retained Hero template, both pointing to /assets/resume/d-james-poer-resume.pdf with native download attributes. Both have explicit hooks; the current rendered site exposes the header entry. No route/file behavior changed. Existing LinkedIn profile link is tracked; GitHub repository/commit/file links are not misclassified as profile clicks. No new visible links, IDs or data-* attributes were invented. Angular directive inputs annotate only intentional existing links.

Production/localhost exclusion and explicit internal marker apply to every custom event. Missing/throwing GA or inaccessible storage silently drops optional telemetry, with no preventDefault, wait or logging. No preference choices, contact destinations, user text, private workspace/client/LoT/JD data are included. GA enhanced-measurement events remain a separate property capability; this change does not alter GA configuration or claim to verify GA ingestion.

Local verification: 3 initialization tests; 15 focused Angular transport/hook/footer tests. A Chrome production-host fixture serves only the local build using request interception and blocks ALL external requests, including GA, so checks send no live analytics. Eight actual user actions verified once each. Native PDF downloads completed with normal, missing and throwing gtag, and all three hashes matched the public artifact. Router and cookie settings/Escape still worked when GA threw; no page errors. Checks: output/public-analytics/browser-checks.json. No Lighthouse/broad axe or production deployment.
