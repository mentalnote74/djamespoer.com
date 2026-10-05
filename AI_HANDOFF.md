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

Steps 1 and 2 are complete. The next task is step 3, `SCRUM-21` — Scaffold six proof-of-value routes. Do not begin a later step without direction from James.

## Current Repository State

- The repository contains one Angular 22 standalone application. `src/main.ts` bootstraps `App` with providers from `src/app/app.config.ts`.
- `src/app` contains the root app files, `components/`, `layout/`, and generated build information. Component templates and SCSS are colocated with their TypeScript files.
- The root `App` is the application shell. It renders the skip link, active `Header`, `Page`, and active `Footer` in that order.
- `src/app/components/header` contains the single `<header>` landmark. The site-name link points to `/`; a named primary `<nav>` contains the six approved POV links in order; LinkedIn remains an external utility link outside the nav.
- `src/app/components/footer` is an implemented site footer containing a `<footer>` landmark, copyright text, and a button-controlled accessibility statement rendered as a labelled `<section>`. Its open state is currently a plain boolean.
- `src/app/components/hero` is the implemented construction experience. It renders a labelled `<section>`, decorative artwork, a visually hidden `h1` and supporting copy, contact and résumé links, a generated build timestamp, and particle behavior that is skipped when reduced motion is preferred.
- `src/app/layout/page` owns the single `<main id="main-content" tabindex="-1">` landmark and its router outlet. Routed content therefore renders between the header and footer.
- The `/` route lazy-loads the existing `Hero`. The primary navigation points to `/engineering`, `/ux-product`, `/accessibility`, `/ai`, `/creative`, and `/impact`; those route definitions and pages intentionally remain for `SCRUM-21`.
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
- `npm test -- --watch=false` passes all 3 test files and 5 tests.
- `npm run build` passes. The build emits the hero as a lazy chunk and stays within configured budgets.

## Next Engineering Task

Implement `SCRUM-21` — Scaffold six proof-of-value routes using the approved labels and paths. Preserve the application shell, navigation, single main landmark, lazy Home route, and shared layout container. Do not begin the carousel unless James expands the scope.

## Open Questions / Decisions Needed

No navigation decision remains unresolved. Until `SCRUM-21`, the six approved POV links intentionally target routes that are not yet configured.

## Verification

Latest verification for `SCRUM-20`: `npm test -- --watch=false` passed 3 test files and 5 tests; `npm run build` completed successfully with a lazy hero chunk and no budget warnings. The prebuild temporarily changed `BUILD_TIME` from `2026-10-04T22:50:56.705Z` to `2026-10-05T18:40:03.408Z`; the tracked value was restored so generated timestamp churn is not part of the implementation diff. No browser, axe, or visual audit was run.
