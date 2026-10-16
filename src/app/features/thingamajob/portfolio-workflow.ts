import { InjectionToken } from '@angular/core';
import type { WorkflowApi } from './workflow-api';

/** Explicit parent-only boundary. It never selects a remote workspace or identity. */
export type WorkflowPort = Omit<
  WorkflowApi,
  | 'extractionRun'
  | 'stageExtractionRun'
  | 'resolveBaselineIssue'
  | 'sourceCandidates'
  | 'stageTextCandidate'
>;
export const WORKFLOW_API = new InjectionToken<WorkflowPort>('Thingamajob workflow boundary');
export interface PortfolioWorkflowPort extends WorkflowPort {
  readonly sourceText: string;
}
export const PORTFOLIO_WORKFLOW = new InjectionToken<PortfolioWorkflowPort>(
  'Fictional tab-local Thingamajob review',
);
