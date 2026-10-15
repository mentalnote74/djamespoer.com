import { Component, inject, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { WorkflowApi } from './workflow-api';
export interface ExtractionRun {
  runId: string;
  state: string;
  document: {
    claims: {
      id: string;
      text: string;
      sourceKey: string;
      sourceReference: { locator?: string; capturedAt?: string; originalSha256?: string };
      extractionConfidence: string;
      uncertainties: string[];
      conflictIds: string[];
      citations: { locationKey: string; quote: string }[];
    }[];
    questions: { question: string; claimIds: string[] }[];
    conflicts: { id: string; explanation: string; claimIds: string[] }[];
    sources: { key: string; sourceId: string; sha256: string }[];
  };
  proposals: { candidateId: string; proposalId: string; reviewDisposition: string }[];
}
const RUN = '1f96a7ab-1567-4678-bcef-15b840439cc7';
async function hash(file: File) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())),
    (v) => v.toString(16).padStart(2, '0'),
  ).join('');
}
@Component({
  selector: 'app-extraction-run',
  templateUrl: './extraction-run.html',
  styleUrl: './extraction-run.scss',
})
export class ExtractionRunPanel {
  private readonly api = inject(WorkflowApi);
  readonly reviewProposal = output<string>();
  readonly run = signal<ExtractionRun | null>(null);
  readonly busy = signal(false);
  readonly message = signal('Load the Client #1 extraction run to review its candidates.');
  private files: File[] = [];
  choose(input: HTMLInputElement) {
    this.files = Array.from(input.files ?? []);
  }
  proposal(id: string) {
    return this.run()?.proposals.find((p) => p.candidateId === id);
  }
  private failure(error: unknown) {
    const status = error instanceof HttpErrorResponse ? error.status : undefined;
    if (status === 401 || status === 403 || status === 0) this.run.set(null);
    this.message.set(
      status === 403
        ? 'Access denied (403). This run is unavailable to this identity/workspace, or has not been imported.'
        : status === 409
          ? 'Conflict (409). No decision was retried. Reload the run before continuing.'
          : 'The run could not be loaded/imported. No successful import is claimed. Selected files remain available; check the package and session before continuing.',
    );
  }
  async load() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      this.run.set(await this.api.extractionRun(RUN));
      this.message.set(
        'Run loaded. Candidates remain unverified until you explicitly review them.',
      );
    } catch (error) {
      this.failure(error);
    } finally {
      this.busy.set(false);
    }
  }
  async import() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const manifestFile = this.files.find((f) => f.name === 'manifest.json');
      const templateFile = this.files.find((f) => f.name === 'import-template.json');
      if (
        !manifestFile ||
        !templateFile ||
        manifestFile.size > 100000 ||
        templateFile.size > 1000000
      )
        throw new Error('Package required');
      if (
        (await hash(manifestFile)) !==
        '3368e56becf45054c7b19807e123ed0ce699462146dc7ab0e3d9494dad8835e1'
      )
        throw new Error('Manifest changed');
      const manifest = JSON.parse(await manifestFile.text()) as {
        templateSha256: string;
        files: {
          key: string;
          file: string;
          sha256: string;
          attribution: string;
          sourceLocator: string;
        }[];
      };
      if ((await hash(templateFile)) !== manifest.templateSha256)
        throw new Error('Template changed');
      const document = JSON.parse(await templateFile.text()) as ExtractionRun['document'] & {
        extractionRunId: string;
      };
      if (
        document.extractionRunId !== RUN ||
        document.claims.length !== 65 ||
        document.questions.length !== 4
      )
        throw new Error('Wrong run');
      // Validate every local file before sending any source. Original evidence is never rewritten.
      for (const source of manifest.files) {
        const file = this.files.find((f) => f.name === source.file);
        if (!file || (await hash(file)) !== source.sha256) throw new Error('Source changed');
      }
      for (const source of manifest.files) {
        const file = this.files.find((f) => f.name === source.file)!;
        const saved = (await this.api.upload(
          new File([file], file.name, { type: 'text/plain' }),
          source.attribution,
          source.sourceLocator,
          'extraction-source-' + source.sha256,
        )) as { sourceId: string };
        const binding = document.sources.find((s) => s.key === source.key);
        if (!binding || !saved.sourceId) throw new Error('Source unavailable');
        binding.sourceId = saved.sourceId;
      }
      let result: ExtractionRun | undefined;
      for (let step = 0; step < 13; step++) {
        result = await this.api.stageExtractionRun(RUN, document);
        this.run.set(result);
        this.message.set(`Staged ${result.proposals.length}/65 candidates. No automatic approval.`);
        if (result.state === 'staged') break;
      }
      if (result?.state !== 'staged' || result.proposals.length !== 65)
        throw new Error('Incomplete import');
      this.message.set(
        '65/65 candidates staged. Four questions preserved. No candidate was automatically approved.',
      );
    } catch (error) {
      this.failure(error);
    } finally {
      this.busy.set(false);
    }
  }
}
