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

Work is currently at step 1. Do not begin a later step without direction from James.

## Current Repository State

- The repository contains one Angular 22 standalone application. `src/main.ts` bootstraps `App` with providers from `src/app/app.config.ts`.
- `src/app` contains the root app files, `components/`, `layout/`, and generated build information. Component templates and SCSS are colocated with their TypeScript files.
- The active root app imports `Header`, `Hero`, and `Footer` from `src/app/components`, plus `RouterOutlet`.
- `src/app/components/header` is an implemented site header containing a `<header>` landmark and a LinkedIn link.
- `src/app/components/footer` is an implemented site footer containing a `<footer>` landmark, copyright text, and a button-controlled accessibility statement rendered as a labelled `<section>`. Its open state is currently a plain boolean.
- `src/app/components/hero` is the implemented construction experience. It renders a labelled `<section>`, decorative artwork, a visually hidden `h1` and supporting copy, contact and résumé links, a generated build timestamp, and particle behavior that is skipped when reduced motion is preferred.
- `src/app/layout/header`, `src/app/layout/footer`, and `src/app/layout/page` also exist. They are unused placeholders with “works” templates and empty SCSS files. The layout header and footer reuse the same `app-header` and `app-footer` selectors as the implemented components.
- `src/app/app.routes.ts` exports an empty route array. The router is configured, but no portfolio routes exist. The root template places an empty `<router-outlet>` after the footer.
- The root template currently renders a skip link targeting `#main-content`, the active header, one `<main id="main-content" tabindex="-1">` containing the hero, the active footer, and then the router outlet.
- `src/styles.scss` is a single global baseline with box sizing, base typography and colors, inherited form fonts, link treatment, and shared focus-visible outlines. `src/app/app.scss` contains the skip-link presentation.
- Component presentation is colocated in component SCSS. No shared `src/styles/` Sass module tree, `@use`/`@forward` entry point, container primitive, or shared layout token layer exists yet.
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

- Angular bootstrap, router provider configuration, active header/hero/footer composition, the skip-link target, and the current landmark structure are present in source.
- Header and footer creation specs exist. The root app spec also exists, but source inspection shows its title assertion still expects generated starter content that the current template does not render.
- The hero source includes reduced-motion handling for particles, and global styles include visible focus treatment for links and buttons.
- The reusable layout directories have been scaffolded, but their page/container behavior is not implemented and they are not used by the root app.
- The repository and documentation state were inspected for this handoff. No application test, build, browser, axe, or visual audit was run for the documentation-only work.

## Next Engineering Task

Inspect and finish the reusable page/container and semantic landmark architecture before implementing navigation.

Resolve from the repository whether the duplicate `components/` and `layout/` header/footer structures are obsolete files, transitional scaffolding, or an intentional separation. Determine which layer owns the single `<main>` landmark, skip-link focus target, routed content projection, and reusable container behavior. Do not delete or reorganize the duplicate files until that intent is established from the code and James's direction.

## Open Questions / Decisions Needed

- Should the active header/footer implementations move into the layout layer, should the unused layout placeholders be removed later, or are the two directories intended to serve different responsibilities?
- Should the root app own the single `<main>` landmark while the page component provides inner page structure, or should the page component own `<main>` and the skip-link target?
- Should the reusable container be an Angular projection component, a shared Sass/CSS primitive, or a small combination of both based on semantic and layout needs?
- Where should the router outlet sit once page landmark ownership is established? It currently renders after the footer, although the route array is empty.

## Verification

Latest verification for this state is source inspection plus `git diff --check` for the documentation changes. Documentation-only changes do not require application tests unless they affect executable configuration. After implementation work, run and report the relevant unit tests and production build; do not infer runtime, accessibility, or visual results from source inspection alone.
