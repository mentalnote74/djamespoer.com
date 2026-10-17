import type { Claim, Proposal, UnknownDetail, Workflow } from './workflow.models';

/** Public UI contract. Implementations provide authority; this module has no HTTP or endpoints. */
export interface WorkflowPort {
  overview(): Promise<Workflow>;
  clear(): void;
  proposal(id: string): Promise<Proposal>;
  unknown(id: string): Promise<UnknownDetail>;
  evidenceUrl(id: string): string;
  review(
    proposal: Proposal,
    decision: 'accepted' | 'rejected' | 'corrected',
    correctedStatement?: string,
  ): Promise<Proposal>;
  createCorrection(
    obsolete: Claim,
    statement: string,
    attribution: string,
    sourceId: string,
    locator: string,
    reason: string,
  ): Promise<Proposal>;
  supersede(obsolete: Claim, replacementClaimId: string, reason: string): Promise<unknown>;
  resolve(unknown: UnknownDetail, claimId: string, explanation: string): Promise<UnknownDetail>;
  createProposal(
    statement: string,
    attribution: string,
    sourceId: string,
    locator: string,
  ): Promise<Proposal>;
  createUnknown(question: string, reason: string, context: string): Promise<UnknownDetail>;
  answer(
    unknown: UnknownDetail,
    answer: string,
    attribution: string,
    sourceId: string,
    locator: string,
  ): Promise<UnknownDetail>;
  link(
    unknown: UnknownDetail,
    answerId: string,
    statement: string,
    attribution: string,
  ): Promise<UnknownDetail>;
  upload(file: File, attribution: string, sourceLocator: string): Promise<unknown>;
}
