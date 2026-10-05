# Repository Instructions

## Product and Objective

`djamespoer.com` is the professional portfolio of D. James Poer, a UX Engineer and Front-End Architect. Its primary job is to earn James interviews by showing concrete evidence of design, frontend engineering, accessibility, architecture, AI/product thinking, and technical execution.

Treat James as the product owner and an experienced UX/frontend engineer. Explain consequential architectural tradeoffs, but keep routine implementation communication concise. Ask when ambiguity would materially change the architecture or product behavior.

Never invent career facts, employers, projects, outcomes, metrics, technologies, dates, or evidence. A missing fact is unknown, not false. Surface genuine source conflicts for James to resolve.

## Current Delivery Sequence

Work in this order unless James explicitly directs otherwise:

1. Finish the reusable page/container and semantic landmark architecture.
2. Implement primary navigation.
3. Scaffold the six portfolio point-of-view routes.
4. Build the homepage carousel shell.
5. Move the existing construction/hero experience into the carousel.

Do not implement later stages opportunistically while completing an earlier one.

The homepage concept calls for exactly six initial slides at approximately five seconds each, creating an unstated roughly 30-second recruiter elevator pitch. Each slide presents a different perspective on the same career and links to a substantive, indexable route with supporting evidence. The six routes share reusable components and evidence; they are not independent mini-sites.

## Repository and Stack

- Preserve the existing Angular, TypeScript, semantic HTML, and Sass/SCSS stack unless explicitly instructed otherwise.
- This is an Angular 22 standalone application bootstrapped from `src/main.ts`.
- Application code lives in `src/app`; global styles live in `src/styles.scss`; public static files live in `public`.
- Existing components use colocated `.ts`, `.html`, and `.scss` files. Follow that convention when extending them.
- `src/app/components` contains the current site components. `src/app/layout` contains the emerging reusable layout layer; inspect both before changing component ownership or selectors.
- Routes are provided through `src/app/app.routes.ts`; keep feature routes lazy-loaded when they are introduced.
- Unit tests use Vitest through Angular's test builder. There is currently no configured lint or end-to-end script.
- `npm run build` runs `scripts/generate-build-info.mjs` first and rewrites `src/app/generated/build-info.ts`. Treat that timestamp update as generated output and do not mistake it for a functional change.
- Cloudflare deployment configuration is in `wrangler.jsonc`; the built browser assets are served as a single-page application.

## Development Principles

Build accessibility-first, semantic-first, progressively enhanced, responsive interfaces. Favor small reusable components, minimal dependencies, predictable state, strong performance, and implementation choices that visibly demonstrate engineering judgment.

Before editing code, inspect the relevant implementation and its tests. Preserve working behavior unless the requested change requires altering it. Do not replace sound architecture merely because a newer pattern exists. Avoid speculative abstractions, premature generalization, and unnecessary packages.

Keep changes focused and reviewable. `main` is the canonical production branch. Jira is the intended project-management source of truth and GitHub is the engineering source of truth. When Jira issue keys become available, use them in relevant engineering work and commit messages as directed.

## Sass / CSS Architecture

Do not introduce Bootstrap, Angular Material, PrimeNG, Tailwind, or another large UI/CSS framework merely for convenience. The project intentionally avoids a framework unless a demonstrated requirement later justifies one.

Use semantic HTML for content and structure, with presentation abstracted into Sass/CSS. Prefer meaningful markup such as `<section class="portfolio-story">` over framework-oriented container/row/column markup. Angular owns application behavior and state. Sass/CSS owns presentation, responsive layout and composition, reflow, spacing, typography, and visual states wherever CSS can solve the requirement cleanly.

Do not use TypeScript viewport checks for ordinary responsive presentation when media queries, container queries, Grid, Flexbox, or other native CSS capabilities are sufficient.

### Sass Organization

Use modern Sass modules with `@use` and `@forward`; do not build a legacy global `@import` chain. Keep component-specific presentation colocated with the component's `.ts`, `.html`, and `.scss` files. Global Sass is for reusable design-system intelligence, tokens, primitives, layout tools, accessibility rules, and other genuinely shared concerns—not individual component styling.

As shared requirements emerge, evolve global styles by responsibility toward this conceptual structure:

```text
src/styles/
  abstracts/   tokens, variables, mixins, functions, and module index
  base/        reset, typography, accessibility, and module index
  layout/      container, grid, and module index
  components/  shared/global presentation primitives only
  themes/      theme tokens and genuinely theme-specific rules
  vendor/      third-party CSS only when required
```

Do not create empty directories, files, layers, or abstractions simply to match this structure. Add them when real requirements justify them.

### Layout Primitives and Design Tokens

Create reusable Sass/CSS layout primitives instead of repeating page-width, gutter, grid, breakpoint, and spacing logic across Angular components. The reusable page/container architecture is the foundation for this system.

Prefer native CSS Grid, Flexbox, logical properties, custom properties, fluid sizing, and container or media queries as appropriate. Choose breakpoints based on where content and layout need to change, rather than copying device or framework breakpoints.

Centralize deliberate, reusable decisions such as spacing, typography, sizing, radii, layering, and motion when doing so creates real consistency. Use CSS custom properties for values that need runtime cascading or theming. Use Sass variables, functions, and mixins for compile-time concerns where Sass adds a clear advantage. Do not turn every literal value into a token; tokens represent meaningful design decisions.

### Accessible Styling

Accessibility is part of the Sass architecture. Shared styles must support visible and intentional `:focus-visible` states, reduced motion, readable typography, sufficient contrast, responsive reflow and zoom, keyboard interaction, usable touch targets, and communication that does not depend on hover alone. Presentation must not obscure the semantic document structure. Prefer correct native markup over attempts to repair weak semantics with CSS or ARIA.

### Themes

Design alternate themes to reuse the same semantic application structure and shared components. Themes primarily change tokens and presentation; do not scatter theme-specific behavior through Angular components or clone the application for a visual treatment.

Future experimental themes, including the planned retro/Wild West '97 treatment and dynamic visual themes, should preserve the shared structure wherever practical.

### CSS Performance and Engineering Intent

Keep generated CSS deliberate and inspectable. Avoid unnecessary framework CSS, deep selector nesting, duplicated declarations, unused output, and abstractions that generate disproportionate CSS. Do not trade semantic HTML, accessibility, maintainability, or performance for Sass cleverness.

The implementation is itself portfolio evidence. Source should demonstrate deliberate choices in semantic HTML, Angular component architecture, Sass organization, responsive design, accessibility, performance, maintainability, and separation of behavior from presentation. Favor clear engineering judgment over unnecessary complexity.

## Angular and TypeScript Conventions

- Keep TypeScript strict and avoid `any`; use `unknown` when a value is genuinely uncertain.
- Use standalone Angular components. Angular 22 treats them as the default, so do not add `standalone: true`.
- Use signals for local state, `computed()` for derived state, and `linkedSignal()` when derived state must remain writable and synchronized. Use `set()` or `update()`, never `mutate()`.
- Use `input()`, `output()`, and `model()` instead of decorator-based inputs and outputs.
- Use `inject()` rather than constructor injection.
- Put host bindings and listeners in the decorator's `host` object rather than using `@HostBinding` or `@HostListener`.
- Use native template control flow (`@if`, `@for`, and `@switch`). Do not use structural `*ngIf`, `*ngFor`, or `*ngSwitch` in new work.
- Use class and style bindings instead of `ngClass` and `ngStyle`.
- Import only the Angular directives and pipes a component needs; do not import `CommonModule` as a convenience bundle.
- Use `NgOptimizedImage` for static images when compatible. It does not support inline base64 images.
- Keep templates simple and components focused on one responsibility. Follow existing external-template and external-style conventions unless a small inline implementation is clearly more maintainable.
- Prefer Signal Forms for new forms where the installed Angular version supports the required APIs; otherwise use reactive forms.

## Accessibility and Semantics

Accessibility is part of the architecture. Target WCAG AA and Section 508 quality and require all implemented UI to pass relevant axe checks.

Prefer native HTML semantics over ARIA. Do not add ARIA when a native element already provides the correct name, role, value, state, or behavior. Maintain:

- one clear main landmark and useful banner, navigation, complementary, and contentinfo landmarks where appropriate;
- a logical heading hierarchy and an identifiable page heading;
- complete keyboard operation and sensible focus management;
- clearly visible focus indicators with sufficient contrast;
- accessible names and useful screen-reader behavior;
- reduced-motion support for nonessential animation;
- responsive layouts, readable reflow, and WCAG AA color contrast.

Preserve the existing skip-link contract and landmark behavior while the reusable page/container architecture is being completed. Avoid nested or duplicate `main` landmarks.

## Career Evidence and Private Material

Public claims eventually need receipts such as employer or project context, dates, technologies, artifacts, case studies, code, screenshots, external corroboration, or outcomes where available. Present only evidence that James has authorized and that is suitable for public use.

`career-source/` is a private Career Truth Archive and is intentionally excluded from Git. Never commit it or expose, route, bundle, copy, or publish its raw files or contents through the Angular client or `public`. Never make archive documents directly downloadable. Future retrieval from this archive must happen server-side, and the public client may receive only explicitly authorized and sanitized information.

Never commit secrets, credentials, private career documents, or generated sensitive data.

## Verification and Reporting

After implementation changes, run the checks appropriate to the scope:

- `npm test` for unit tests;
- `npm run build` for production compilation and bundle budgets;
- any narrower relevant test during iteration.

No lint script is currently configured; do not claim lint verification unless one is added and run. Account for the generated build timestamp after a build and keep unrelated generated churn out of focused changes when practical.

Report exactly what ran, what passed, what failed, and whether a failure appears to predate the change. Do not claim checks, accessibility audits, browser behavior, or visual verification that were not actually performed.

After meaningful engineering work, update `AI_HANDOFF.md` when the current state, completed work, next task, unresolved decisions, or verification status has materially changed. Keep it concise. Do not turn it into a transcript or duplicate Jira/backlog content. Never place secrets or private `career-source/` content in it.
