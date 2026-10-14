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
  proposalId: string;
  statement: string;
  version: number;
  reviewDisposition: Disposition;
  claim: Claim | null;
  history?: History[];
  proposerAttribution?: string;
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
    reviewHistory: History[];
  }[];
  resolution: { claimId: string; explanation: string } | null;
  history: History[];
}
export interface Workflow {
  workspaceId: string;
  evidence: Evidence[];
  proposals: Proposal[];
  unknowns: UnknownSummary[];
  limit: number;
}
