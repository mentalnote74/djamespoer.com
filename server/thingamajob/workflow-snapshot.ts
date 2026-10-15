import { activeBaseline, baselineAvailable } from './baseline-service.ts';
import { AccessDenied } from './access-identity.ts';
import { recheckWorkspace } from './workspace-access.ts';
import type { IdentityDatabase, WorkspaceAccess } from './workspace-access.ts';

/** One bounded D1 read snapshot. No onboarding, inference, or mutations. */
export async function workflowSnapshot(database: IdentityDatabase, scope: WorkspaceAccess) {
  await recheckWorkspace(scope);
  const row = await database
    .prepare(
      `SELECT w.workspace_id,
    (SELECT json_group_array(json_object('sourceId',source_id,'filename',filename,'attribution',attribution,'sourceLocator',source_locator))
      FROM (SELECT * FROM thingamajob_evidence WHERE workspace_id=w.workspace_id ORDER BY acquired_at DESC,source_id LIMIT 100)) evidence,
    (SELECT json_group_array(json_object('proposalId',p.proposal_id,'statement',p.statement,'version',p.current_version,'reviewDisposition',p.disposition,
      'claim',json((SELECT json_object('claimId',c.claim_id,'statement',c.statement,'reviewDisposition',c.disposition) FROM thingamajob_active_claims c WHERE c.workspace_id=p.workspace_id AND c.proposal_id=p.proposal_id))))
      FROM (SELECT * FROM thingamajob_proposals WHERE workspace_id=w.workspace_id ORDER BY proposed_at DESC,proposal_id LIMIT 100) p) proposals,
    (SELECT json_group_array(json_object('unknownId',unknown_id,'question',question,'state',state,'version',version))
      FROM (SELECT * FROM thingamajob_unknowns WHERE workspace_id=w.workspace_id ORDER BY unknown_id LIMIT 100)) unknowns
    FROM thingamajob_workspaces w WHERE w.workspace_id=?`,
    )
    .bind(scope.workspaceId)
    .first<{ workspace_id: string; evidence: string; proposals: string; unknowns: string }>();
  if (!row) throw new AccessDenied();
  await recheckWorkspace(scope);
  return {
    workspaceId: row.workspace_id,
    evidence: JSON.parse(row.evidence) as unknown,
    proposals: JSON.parse(row.proposals) as unknown,
    unknowns: JSON.parse(row.unknowns) as unknown,
    limit: 100,
    ...((await baselineAvailable(database))
      ? { baselineClaims: await activeBaseline(database, scope) }
      : {}),
  };
}
