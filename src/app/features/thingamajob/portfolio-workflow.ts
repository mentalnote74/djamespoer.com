import { InjectionToken } from '@angular/core';
import type { WorkflowPort } from './workflow-port';

/** Explicit parent-only boundary. It never selects a remote workspace or identity. */
export type { WorkflowPort } from './workflow-port';
export const WORKFLOW_API = new InjectionToken<WorkflowPort>('Thingamajob workflow boundary');
export interface PortfolioWorkflowPort extends WorkflowPort {
  readonly sourceText: string;
}
export const PORTFOLIO_WORKFLOW = new InjectionToken<PortfolioWorkflowPort>(
  'Fictional tab-local Thingamajob review',
);
