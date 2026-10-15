export type Disposition = 'proposed' | 'accepted' | 'rejected' | 'corrected';
export interface Evidence {
  sourceId: string;
  filename: string;
  attribution: string;
  sourceLocator: string;
}
export interface Claim {
  claimId: string;
  statement: string;
  reviewDisposition: 'accepted' | 'corrected';
}
export interface Proposal {
  baseline?: {
    canonicalUsage?: string;
    runId: string;
    candidateId: string;
    category: string;
    policyVersion: string;
    recordedAt: number;
    reasons: string[];
    active: boolean;
    transition: string;
  };
  proposalId: string;
  statement: string;
  version: number;
  reviewDisposition: Disposition;
  claim: Claim | null;
  supersedes?: {
    obsoleteClaimId: string;
    obsoleteProposalId: string;
    eventId: string;
    reason: string;
    recordedAt: number;
  }[];
  correctionOf?: { obsoleteClaimId: string; reason: string };
  historicalClaim?: Claim & { lifecycleState: 'superseded' };
  supersession?: {
    eventId: string;
    replacementClaimId: string;
    replacementProposalId: string;
    replacementReviewId: string;
    reason: string;
    recordedAt: number;
    executionContext: 'owner_access' | 'operator';
    authorizationReference: string;
    authorizingOwnerActorId?: string;
  };
  history?: History[];
  proposerAttribution?: string;
  proposerActorId?: string;
  proposedAt?: number;
  review?: {
    reviewId: string;
    decision: 'accepted' | 'corrected' | 'rejected';
    ownerActorId: string;
    reviewedAt: number;
    correctedStatement: string;
    expectedVersion: number;
    resultingVersion: number;
  } | null;
  evidence?: { sourceId: string; locator: string }[];
}
export interface History {
  version: number;
  operation: string;
  statement?: string;
  recordedAt?: number;
}
export interface UnknownSummary {
  unknownId: string;
  question: string;
  version: number;
  state: 'open' | 'resolved';
}
export interface UnknownDetail extends UnknownSummary {
  reason: string;
  context: string;
  answers: {
    answerId: string;
    answer: string;
    attribution: string;
    evidence: { sourceId: string; locator: string }[];
  }[];
  proposals: {
    answerId: string;
    proposalId: string;
    statement: string;
    reviewDisposition: Disposition;
    claimId: string | null;
    claimLifecycleState?: 'active' | 'superseded';
    reviewHistory: History[];
  }[];
  resolution: {
    claimId: string;
    explanation: string;
    claimLifecycleState?: 'active' | 'superseded';
  } | null;
  history: History[];
}
export interface Workflow {
  baselineClaims?: {
    candidateId: string;
    proposalId: string;
    statement: string;
    runId: string;
    establishedAt: number;
    basis: string;
    policyVersion: string;
  }[];
  workspaceId: string;
  evidence: Evidence[];
  proposals: Proposal[];
  unknowns: UnknownSummary[];
  limit: number;
}
