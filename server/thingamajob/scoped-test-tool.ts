import { createProposal } from './assertion-service.ts';
import { recheckWorkspace } from './workspace-access.ts';
import type { IdentityDatabase, WorkspaceAccess } from './workspace-access.ts';

/** Server-created, request-scoped proposal capability. No review/resolve operation.
 * Prompt text is inert content; tool arguments never select identity or workspace.
 * This is a fictional test adapter, not an LLM integration or public endpoint.
 */
export function createScopedTestTool(database: IdentityDatabase, scope: WorkspaceAccess) {
  return Object.freeze({
    async propose(argumentsValue: unknown, requestKey: string) {
      await recheckWorkspace(scope);
      const request = new Request('https://test-tool.invalid/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey },
        body: JSON.stringify(argumentsValue),
      });
      return createProposal(request, database, scope);
    },
  });
}
