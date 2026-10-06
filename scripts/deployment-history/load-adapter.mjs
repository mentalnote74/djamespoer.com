import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Node-only loading of existing Angular-project TypeScript, without changing its imports.
// Scope resolution/transpilation to this boundary; TypeScript is already a dev dependency.
const boundary = new URL('../../src/app/components/deployment-history/', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      context.parentURL?.startsWith(boundary) &&
      specifier.startsWith('.') &&
      !specifier.endsWith('.ts')
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(boundary) && url.endsWith('.ts')) {
      const source = ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText;
      return { format: 'module', source, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const adapter =
  await import('../../src/app/components/deployment-history/adapters/github-deployments.ts');
export const adaptGitHubDeployments = adapter.adaptGitHubDeployments;
const boundaryModule =
  await import('../../src/app/components/deployment-history/deployment-history-data.ts');
export const normalizeDeploymentHistory = boundaryModule.normalizeDeploymentHistory;
const snapshotModule =
  await import('../../src/app/components/deployment-history/deployment-history-snapshot.ts');
export const validateDeploymentSnapshot = snapshotModule.validateDeploymentSnapshot;
