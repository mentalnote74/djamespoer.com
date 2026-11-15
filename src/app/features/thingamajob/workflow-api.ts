import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ExtractionRun } from './extraction-run';
import type { Workflow, Proposal, UnknownDetail, Claim } from './workflow.models';

@Injectable()
export class WorkflowApi {
  private readonly http = inject(HttpClient);
  private workspaceId: string | undefined;
  private readonly retries = new Map<string, { body: string; key: string }>();
  async overview(): Promise<Workflow> {
    const result = await firstValueFrom(this.http.get<Workflow>('/api/thingamajob/test/workflow'));
    if (
      !result ||
      !Array.isArray(result.evidence) ||
      !Array.isArray(result.proposals) ||
      !Array.isArray(result.unknowns)
    )
      throw new Error('Invalid workspace response');
    const next = this.identifier(result.workspaceId);
    if (this.workspaceId !== next) this.retries.clear();
    this.workspaceId = next;
    return result;
  }
  extractionRun(runId: string) {
    return firstValueFrom(
      this.http.get<ExtractionRun>(this.root() + '/extraction-runs/' + this.identifier(runId)),
    );
  }
  resolveBaselineIssue(
    runId: string,
    body: {
      issueId: string;
      answer: string;
      decisions: { candidateId: string; statement: string; reject: boolean }[];
    },
  ) {
    return this.post('/extraction-runs/' + this.identifier(runId) + '/resolve', body);
  }
  stageExtractionRun(runId: string, document: object) {
    return this.post<ExtractionRun>('/extraction-runs/' + this.identifier(runId), document);
  }
  clear() {
    this.workspaceId = undefined;
    this.retries.clear();
  }
  private identifier(value: string) {
    if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value))
      throw new Error('Invalid record identifier');
    return value;
  }
  private root() {
    if (!this.workspaceId) throw new Error('Workspace unavailable');
    return '/api/thingamajob/workspaces/' + this.workspaceId;
  }
  private async post<T>(path: string, body: object): Promise<T> {
    const serialized = JSON.stringify(body),
      prior = this.retries.get(path);
    const key = prior?.body === serialized ? prior.key : crypto.randomUUID();
    this.retries.set(path, { body: serialized, key });
    return firstValueFrom(
      this.http.post<T>(this.root() + path, body, { headers: { 'Idempotency-Key': key } }),
    );
  }
  proposal(id: string) {
    return firstValueFrom(
      this.http.get<Proposal>(this.root() + '/assertions/' + this.identifier(id)),
    );
  }
  unknown(id: string) {
    return firstValueFrom(
      this.http.get<UnknownDetail>(this.root() + '/unknowns/' + this.identifier(id)),
    );
  }
  evidenceUrl(id: string) {
    return this.root() + '/evidence/' + this.identifier(id) + '/original';
  }
  review(
    proposal: Proposal,
    decision: 'accepted' | 'rejected' | 'corrected',
    correctedStatement?: string,
  ) {
    return this.post<Proposal>('/assertions/' + this.identifier(proposal.proposalId) + '/review', {
      decision,
      expectedVersion: proposal.version,
      ...(decision === 'corrected' ? { correctedStatement } : {}),
    });
  }
  createCorrection(
    obsolete: Claim,
    statement: string,
    proposerAttribution: string,
    sourceId: string,
    locator: string,
    correctionReason: string,
  ) {
    return this.post<Proposal>('/claims/' + this.identifier(obsolete.claimId) + '/corrections', {
      statement,
      proposerAttribution,
      evidence: [{ sourceId: this.identifier(sourceId), locator }],
      correctionReason,
    });
  }
  supersede(obsolete: Claim, replacementClaimId: string, reason: string) {
    return this.post('/claims/' + this.identifier(obsolete.claimId) + '/supersede', {
      replacementClaimId: this.identifier(replacementClaimId),
      expectedObsoleteVersion: 1,
      expectedReplacementVersion: 1,
      reason,
    });
  }
  resolve(unknown: UnknownDetail, claimId: string, explanation: string) {
    return this.post<UnknownDetail>(
      '/unknowns/' + this.identifier(unknown.unknownId) + '/resolve',
      { claimId: this.identifier(claimId), explanation, expectedVersion: unknown.version },
    );
  }
  createProposal(
    statement: string,
    proposerAttribution: string,
    sourceId: string,
    locator: string,
  ) {
    return this.post<Proposal>('/assertions', {
      statement,
      proposerAttribution,
      evidence: [{ sourceId: this.identifier(sourceId), locator }],
    });
  }
  createUnknown(question: string, reason: string, context: string) {
    return this.post<UnknownDetail>('/unknowns', { question, reason, context });
  }
  answer(
    unknown: UnknownDetail,
    answer: string,
    attribution: string,
    sourceId: string,
    locator: string,
  ) {
    return this.post<UnknownDetail>(
      '/unknowns/' + this.identifier(unknown.unknownId) + '/answers',
      {
        answer,
        attribution,
        evidence: sourceId ? [{ sourceId: this.identifier(sourceId), locator }] : [],
        expectedVersion: unknown.version,
      },
    );
  }
  link(unknown: UnknownDetail, answerId: string, statement: string, proposerAttribution: string) {
    return this.post<UnknownDetail>(
      '/unknowns/' +
        this.identifier(unknown.unknownId) +
        '/answers/' +
        this.identifier(answerId) +
        '/proposal',
      { statement, proposerAttribution, expectedVersion: unknown.version },
    );
  }
  async upload(file: File, attribution: string, sourceLocator: string, importKey?: string) {
    if (file.size > 10_000_000 || !file.size)
      throw new Error('Select a supported file of up to 10 MB');
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())),
      (v) => v.toString(16).padStart(2, '0'),
    ).join('');
    const serialized = JSON.stringify({
        hash,
        name: file.name,
        type: file.type,
        attribution,
        sourceLocator,
      }),
      path = '/evidence',
      prior = this.retries.get(path);
    const key = importKey ?? (prior?.body === serialized ? prior.key : crypto.randomUUID());
    this.retries.set(path, { body: serialized, key });
    const form = new FormData();
    form.set('file', file);
    form.set('attribution', attribution);
    form.set('sourceLocator', sourceLocator);
    return firstValueFrom(
      this.http.post(this.root() + path, form, { headers: { 'Idempotency-Key': key } }),
    );
  }
}
