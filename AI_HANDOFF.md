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

Step 1 is complete. The next task is step 2, primary navigation. Do not begin a later step without direction from James.

## Current Repository State

- The repository contains one Angular 22 standalone application. `src/main.ts` bootstraps `App` with providers from `src/app/app.config.ts`.
- `src/app` contains the root app files, `components/`, `layout/`, and generated build information. Component templates and SCSS are colocated with their TypeScript files.
- The root `App` is the application shell. It renders the skip link, active `Header`, `Page`, and active `Footer` in that order.
- `src/app/components/header` is an implemented site header containing a `<header>` landmark and a LinkedIn link.
- `src/app/components/footer` is an implemented site footer containing a `<footer>` landmark, copyright text, and a button-controlled accessibility statement rendered as a labelled `<section>`. Its open state is currently a plain boolean.
- `src/app/components/hero` is the implemented construction experience. It renders a labelled `<section>`, decorative artwork, a visually hidden `h1` and supporting copy, contact and résumé links, a generated build timestamp, and particle behavior that is skipped when reduced motion is preferred.
- `src/app/layout/page` owns the single `<main id="main-content" tabindex="-1">` landmark and its router outlet. Routed content therefore renders between the header and footer.
- The `/` route lazy-loads the existing `Hero`. No navigation or portfolio POV routes exist yet.
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
- Jira is the project-management source of truth; GitHub is the engineering source of truth.
- `career-source/` is private. Never commit it or expose, copy, route, or bundle its raw contents through the client.

## Completed / Verified

- Angular bootstrap, router provider configuration, the coherent application shell, skip-link target, single main landmark, and routed hero composition are present in source.
- The root app test verifies the skip-link target, one header/main/footer, main focus target, routed hero placement inside main, and Page-before-Footer order. Header and footer creation specs remain in place.
- The hero source includes reduced-motion handling for particles, and global styles include visible focus treatment for links and buttons.
- The reusable Page routed-content boundary and shared layout container are implemented. Duplicate unused layout header/footer scaffolds are removed.
- `npm test -- --watch=false` passes all 3 test files and 4 tests.
- `npm run build` passes. The build emits the hero as a lazy chunk and stays within configured budgets.

## Next Engineering Task

Implement primary navigation within the established application shell. Preserve the single main landmark, current skip-link behavior, full-width header/footer landmarks, lazy home route, and shared layout container. Do not scaffold the six POV routes or begin the carousel unless James expands the scope.

## Open Questions / Decisions Needed

No unresolved architectural decision currently blocks primary navigation. Navigation labels, destinations, responsive interaction, and visual treatment require James's direction if they are not supplied with that task.

## Verification

Latest verification: `npm test -- --watch=false` passed 3 test files and 4 tests; `npm run build` completed successfully with a lazy hero chunk. The prebuild temporarily changed `BUILD_TIME` from `2026-10-04T22:50:56.705Z` to `2026-10-05T16:52:16.669Z`; the tracked value was restored so generated timestamp churn is not part of the implementation diff. No browser, axe, or visual audit was run. Documentation-only changes do not require application tests unless they affect executable configuration.
