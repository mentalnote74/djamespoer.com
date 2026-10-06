# AI Engineering Handoff

## Purpose

This is a concise, repository-local continuity document for James, ChatGPT, and Codex. It records the engineering state needed to resume work without reconstructing chat history. It is not a transcript, backlog, or replacement for Jira. See `AGENTS.md` for authoritative standing project instructions.

## Current Objective

The implementation sequence is:

1. Finish the reusable page/container and semantic landmark architecture.
2. Implement primary navigation.
3. Scaffold the six portfolio point-of-view routes.
4. Build the homepage carousel shell.
5. Move and integrate the existing construction hero experience into the carousel.

Steps 1 through 4 are complete. James explicitly reprioritized `SCRUM-39` — Build reusable accessible paginated Smart Grid — and has reviewed and approved its implementation. `SCRUM-23` remains pending and has not been cancelled. Do not begin `SCRUM-40` or deployment-history behavior.

## Current Repository State

- The repository contains one Angular 22 standalone application. `src/main.ts` bootstraps `App` with providers from `src/app/app.config.ts`.
- `src/app` contains the root app files, `components/`, `layout/`, and generated build information. Component templates and SCSS are colocated with their TypeScript files.
- The root `App` is the application shell. It renders the skip link, active `Header`, `Page`, and active `Footer` in that order.
- `src/app/components/header` contains the single `<header>` landmark. The site-name link points to `/`; a named primary `<nav>` contains the six approved POV links in order; LinkedIn remains an external utility link outside the nav.
- `src/app/components/footer` is an implemented site footer containing a `<footer>` landmark, copyright text, and a button-controlled accessibility statement rendered as a labelled `<section>`. Its open state is currently a plain boolean.
- `src/app/components/hero` is the implemented construction experience. It renders a labelled `<section>`, decorative artwork, a visually hidden `h1` and supporting copy, contact and résumé links, a generated build timestamp, and particle behavior that is skipped when reduced motion is preferred.
- `src/app/layout/page` owns the single `<main id="main-content" tabindex="-1">` landmark and its router outlet. Routed content therefore renders between the header and footer.
- The `/` route lazy-loads `Home`, which currently composes the unchanged `Hero` followed by the temporary six-slide carousel shell. `/engineering`, `/ux-product`, `/accessibility`, `/ai`, `/creative`, and `/impact` lazy-load one shared `ProofPage` shell driven by static route data. Each route supplies its approved heading, browser title, and description metadata while retaining a clear path to a dedicated component when its content later diverges.
- `Carousel` owns the active index, automatic rotation, manual controls, accessibility state, and reduced-motion response. Six projected `CarouselSlide` templates keep slide content separate from mechanics so SCRUM-23 can place the Hero into slide one without rewriting the carousel.
- `PageMetadataStrategy` extends Angular's `TitleStrategy` to apply the active route's browser title and description metadata, including restoration of Home metadata after client-side navigation.
- The obsolete, never-imported `src/app/layout/header` and `src/app/layout/footer` placeholders have been removed. The implemented header and footer remain under `src/app/components`.
- `src/styles.scss` is a single global baseline with box sizing, base typography and colors, inherited form fonts, link treatment, and shared focus-visible outlines. `src/app/app.scss` contains the skip-link presentation.
- Component presentation remains colocated. `src/styles/layout` now provides a modern Sass module containing the shared `.layout-container` primitive, an `80rem` shell maximum custom property, and a fluid `1rem`–`2rem` inline-gutter custom property. Header and footer inner content use it while their landmarks remain full width; the hero remains full bleed.
- The build copies `public/` as static assets. `npm run build` first regenerates `src/app/generated/build-info.ts`.

## Architecture Decisions

`AGENTS.md` is authoritative for the full standing rules. The decisions most relevant to the current work are:

- Start with semantic HTML and accessibility architecture.
- Angular owns behavior and state; Sass/CSS owns presentation and responsive composition where practical.
- Do not add a UI/CSS framework without a demonstrated need.
- Use modern Sass modules with `@use` and `@forward` as shared Sass emerges.
- Keep component-specific SCSS colocated; put reusable layout primitives in shared Sass.
- The six homepage POV slides are six perspectives on one career and share structure and evidence.
- The approved POV information architecture is Engineering, UX & Product, Accessibility, AI & Innovation, Creative, and Impact. The site name is the Home link; LinkedIn is outside primary navigation.
- Jira is the project-management source of truth; GitHub is the engineering source of truth.
- `career-source/` is private. Never commit it or expose, copy, route, or bundle its raw contents through the client.

## Completed / Verified

- Angular bootstrap, router provider configuration, the coherent application shell, skip-link target, single main landmark, and routed hero composition are present in source.
- The root app test verifies the skip-link target, one header/main/footer, main focus target, routed hero placement inside main, and Page-before-Footer order. Header and footer creation specs remain in place.
- The hero source includes reduced-motion handling for particles, and global styles include visible focus treatment for links and buttons.
- The reusable Page routed-content boundary and shared layout container are implemented. Duplicate unused layout header/footer scaffolds are removed.
- `SCRUM-20` adds semantic primary navigation to the active Header with RouterLink/RouterLinkActive, accessible current-page state, keyboard-sized links, visible active treatment, and CSS-only responsive reflow.
- Header tests verify the Home/current-page behavior, approved link order and paths, named navigation landmark, and LinkedIn placement outside the nav.
- `SCRUM-21` configures all six approved proof-of-value routes. Their restrained shared shell renders one route-specific `h1` and temporary copy inside the existing Page-owned main landmark and shared layout container.
- Route tests verify every approved path and heading, one main landmark, Home Hero preservation, navigation/route alignment, active `aria-current`, and route-specific title and description metadata.
- `SCRUM-22` adds the six-slide carousel shell with an approximately five-second interval, sequential wrapping, Previous/Next/direct selection, and Pause/Play. Any manual selection leaves rotation paused until explicit Play.
- Reduced-motion preference prevents automatic rotation and disables Play while preserving Previous, Next, and direct selection. Inactive projected content uses the native `hidden` state, automatic changes use `aria-live="off"`, and manually controlled changes use polite updates without moving focus.
- Cloudflare's `wrangler.jsonc` serves `dist/djamespoer/browser` with `not_found_handling` set to `single-page-application`, so direct requests and browser refreshes on the six client routes fall back to the Angular entry point.
- `npm test -- --watch=false` passes all 4 test files and 23 tests.
- `npm run build` passes. The build emits separate lazy chunks for Home and the shared proof page and stays within configured budgets.

## Next Engineering Task

`SCRUM-39` implementation and automated verification are complete. James has reviewed and approved the implementation. No commit or push was made. `SCRUM-23` remains pending and has not been cancelled. Do not begin `SCRUM-40` or another story without direction.

## Open Questions / Decisions Needed

No architectural or accessibility decision from `SCRUM-22` remains unresolved. The six slide labels and proof-page text are intentionally temporary; substantive content and career evidence remain future product work.

## Verification

Latest verification for `SCRUM-22`: the focused carousel/Home run passed 2 test files and 20 tests; `npm test -- --watch=false` passed all 4 test files and 23 tests; `npm run build` completed successfully with lazy Home and proof-page chunks and no budget warnings. The local development server also compiled successfully. Prettier and `git diff --check` pass. The prebuild temporarily changed `BUILD_TIME` from `2026-10-04T22:50:56.705Z` to `2026-10-05T19:10:13.067Z`; the tracked value was restored so generated timestamp churn is not part of the implementation diff. No browser, axe, or visual audit was available in the session.

## SCRUM-39 — Approved Implementation

- Added standalone `SmartGrid<T>` under `src/app/components/smart-grid`, with colocated native-table template/SCSS, typed text or consumer-template columns, stable row identity, controlled client/external pagination, loading/error/empty messaging, and consumer documentation. No new dependencies or route integration.
- Consumers own data acquisition, domain meaning, business rules, cell actions/presentation, and committed pagination. Grid owns generic rendering, client slicing, pager intents, native semantics, status announcements, and focus recovery. No deployment-history behavior, sorting, filtering, selection, editing, or virtualization.
- Synthetic book and sensor-reading consumers demonstrate generic rendering and consumer actions. Nine permanent tests cover pagination boundaries, page sizes, shrinking/empty data, external pages, loading/errors, stable keys, multiple instances, validation, and removed-action focus recovery.
- Verification: focused tests passed 9/9; full suite passed 32/32 in five files; production build passed with no budget warnings (242.21 kB initial). A temporary strict TypeScript/Angular template compilation passed; an intentional invalid cell field correctly failed with TS2339. Repository compiler settings remain unchanged.
- Temporary axe-core 4.10.3 WCAG DOM audits passed for populated, paginated, empty, loading, and error states. Color contrast was excluded because the test environment is jsdom; no real-browser, screen-reader, visual, zoom/reflow, or contrast audit was performed. Temporary audit source/test and type-check files were removed; no packages installed or servers started.
- Initial launcher attempts were blocked by PowerShell script policy; `.cmd` launchers resolved it. Sandboxed Angular compilation failed on workspace parent-directory access; approved execution outside the sandbox passed. One initial test assertion failed on caption whitespace and was corrected to compare trimmed text.
- Prettier and `git diff --check` passed. Generated build timestamp was restored to its prebuild tracked value.
