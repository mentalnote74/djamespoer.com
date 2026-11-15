import { AccessDenied } from './access-identity.ts';
import { recheckWorkspace, mutationAuthorization } from './workspace-access.ts';
import type { IdentityDatabase, WorkspaceAccess } from './workspace-access.ts';

export async function canonicalUsageAvailable(database: IdentityDatabase) {
  return !!(await database.prepare("SELECT name FROM sqlite_master WHERE type='view' AND name='thingamajob_canonical_truth'").first());
}

/** Consumer boundary: no raw source text, proposals, review drafts or retired UNKNOWNs.
 * Automatic source-established facts and reviewed facts have equal truth membership.
 * Missing migration fails closed rather than falling back to unsafe legacy views.
 */
export async function canonicalTruth(database: IdentityDatabase, scope: WorkspaceAccess) {
  await recheckWorkspace(scope);
  mutationAuthorization(scope, 'owner');
  if (!(await canonicalUsageAvailable(database))) throw new AccessDenied();
  const row = await database.prepare(`SELECT
    (SELECT json_group_array(json_object('truthId',t.proposal_id,'claimId',t.claim_id,'candidateId',t.candidate_id,'runId',t.run_id,'statement',t.statement,'state',t.state,'policyVersion',t.policy_version,
      'qualifications',json(coalesce((SELECT json_extract(c.value,'$.uncertainties') FROM thingamajob_extraction_runs r,json_each(r.document_json,'$.claims') c WHERE r.workspace_id=t.workspace_id AND r.run_id=t.run_id AND json_extract(c.value,'$.id')=t.candidate_id),'[]')),
      'evidence',json((SELECT json_group_array(json_object('sourceId',s.source_id,'filename',e.filename,'locator',s.locator,'supportProposalId',s.proposal_id))
      FROM (SELECT p.workspace_id,p.proposal_id,p.source_id,p.locator FROM thingamajob_proposal_sources p
        JOIN thingamajob_proposals pr ON pr.workspace_id=p.workspace_id AND pr.proposal_id=p.proposal_id
        WHERE pr.disposition='proposed' AND NOT EXISTS(SELECT 1 FROM thingamajob_claims c WHERE c.workspace_id=p.workspace_id AND c.proposal_id=p.proposal_id)
        UNION ALL SELECT c.workspace_id,c.proposal_id,s.source_id,s.locator FROM thingamajob_claim_sources s
        JOIN thingamajob_active_claims c ON c.workspace_id=s.workspace_id AND c.claim_id=s.claim_id) s
      JOIN thingamajob_evidence e ON e.workspace_id=s.workspace_id AND e.source_id=s.source_id
      WHERE s.workspace_id=t.workspace_id AND (s.proposal_id=t.proposal_id OR s.proposal_id IN
        (SELECT u.proposal_id FROM thingamajob_current_truth_usage u WHERE u.workspace_id=t.workspace_id AND u.usage='duplicate' AND u.canonical_proposal_id=t.proposal_id))))))
      FROM (SELECT * FROM thingamajob_canonical_truth WHERE workspace_id=? ORDER BY proposal_id) t) claims,
    (SELECT json_group_array(json_object('unknownId',unknown_id,'question',question,'state',state,'version',version)) FROM thingamajob_career_unknowns WHERE workspace_id=? AND state='open') unknowns`)
    .bind(scope.workspaceId, scope.workspaceId).first<{claims:string;unknowns:string}>();
  await recheckWorkspace(scope);
  return { workspaceId: scope.workspaceId, claims: JSON.parse(row?.claims ?? '[]') as unknown[], unknowns: JSON.parse(row?.unknowns ?? '[]') as unknown[] };
}
