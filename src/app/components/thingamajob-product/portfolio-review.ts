import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import type { PortfolioWorkflowPort } from '../../features/thingamajob/portfolio-workflow';
import type { Proposal, Workflow } from '../../features/thingamajob/workflow.models';

/** Local-only review adapter for the real workflow component; no HTTP/storage/auth. */
@Injectable()
export class PortfolioReview implements PortfolioWorkflowPort {
  readonly sourceText =
    'Fictional workshop note: Morgan Vale facilitated three accessibility workshops for a sample team.';
  private current!: Proposal;
  constructor() {
    this.clear();
  }
  clear(): void {
    this.current = {
      proposalId: 'sample-proposal',
      statement: 'Morgan Vale facilitated three accessibility workshops.',
      version: 1,
      reviewDisposition: 'proposed',
      claim: null,
      proposerAttribution: 'Fictional workshop note',
      history: [
        {
          version: 1,
          operation: 'proposed',
          statement: 'Morgan Vale facilitated three accessibility workshops.',
        },
      ],
    };
  }
  async overview(): Promise<Workflow> {
    return {
      workspaceId: 'fictional-portfolio',
      evidence: [],
      proposals: [structuredClone(this.current)],
      unknowns: [],
      limit: 1,
    };
  }
  async proposal(id: string): Promise<Proposal> {
    if (id !== this.current.proposalId) throw new Error('Sample not found');
    return structuredClone(this.current);
  }
  async review(
    proposal: Proposal,
    decision: 'accepted' | 'rejected' | 'corrected',
    correctedStatement?: string,
  ): Promise<Proposal> {
    if (
      proposal.proposalId !== this.current.proposalId ||
      proposal.version !== this.current.version ||
      this.current.reviewDisposition !== 'proposed'
    )
      throw new HttpErrorResponse({ status: 409 });
    const statement =
      decision === 'corrected' ? correctedStatement?.trim() : this.current.statement;
    if (
      !['accepted', 'rejected', 'corrected'].includes(decision) ||
      !statement ||
      statement.length > 4000
    )
      throw new Error('Enter valid review wording');
    this.current = {
      ...this.current,
      version: this.current.version + 1,
      reviewDisposition: decision,
      claim:
        decision === 'rejected'
          ? null
          : { claimId: 'sample-claim', statement, reviewDisposition: decision },
      history: [
        ...(this.current.history ?? []),
        { version: this.current.version + 1, operation: decision, statement },
      ],
    };
    return structuredClone(this.current);
  }
  evidenceUrl(): never {
    throw new Error('No downloads in this local walkthrough');
  }
  async unknown(): Promise<never> {
    throw new Error('Not offered in this walkthrough');
  }
  async createCorrection(): Promise<never> {
    throw new Error('Not offered in this walkthrough');
  }
  async supersede(): Promise<never> {
    throw new Error('Not offered in this walkthrough');
  }
  async resolve(): Promise<never> {
    throw new Error('Not offered in this walkthrough');
  }
  async createProposal(): Promise<never> {
    throw new Error('Not offered in this walkthrough');
  }
  async createUnknown(): Promise<never> {
    throw new Error('Not offered in this walkthrough');
  }
  async answer(): Promise<never> {
    throw new Error('Not offered in this walkthrough');
  }
  async link(): Promise<never> {
    throw new Error('Not offered in this walkthrough');
  }
  async upload(): Promise<never> {
    throw new Error('No uploads in this local walkthrough');
  }
}
