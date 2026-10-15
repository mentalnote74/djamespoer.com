# Djamespoer

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Production release preparation

Local review builds (`npm run build`) remain offline. Before an explicitly authorized
manual production release, use `npm run build:production`, with
`CLOUDFLARE_ACCOUNT_ID` and a separate `DEPLOYMENT_HISTORY_READ_TOKEN` supplied by
the operator's environment. It reads only djamespoer-com's production deployment
list, sanitizes it, merges by stable ID with the retained local and currently
published public history, then builds.
Missing credentials or failed/incomplete acquisition stops the command. It never
falls back to Wrangler's deployment token. `npm run deploy:production` runs that
preparation before the existing Wrangler deployment; execute only with deployment
authorization. Do not deploy a standalone offline review artifact directly.

Cloudflare main-branch Builds retain their existing build-attempt refresh and now
retain local and published archived rows when provider retention rolls over.
A missing, invalid or unavailable published archive blocks refresh rather than
silently dropping history on a clean checkout. Manual deployment events
have their own stable IDs and the label "Production deployment"; they are distinct
from build attempts, not invented build successes. A static snapshot includes only
events existing at preparation time; the release producing that snapshot appears
at the next refresh. No browser credentials, polling API, or private bindings are
added.
