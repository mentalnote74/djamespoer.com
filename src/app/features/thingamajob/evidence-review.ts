import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  ElementRef,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { WorkflowApi } from './workflow-api';
import type { Workflow, Proposal, Claim } from './workflow.models';

@Component({
  selector: 'app-evidence-review',
  templateUrl: './evidence-review.html',
  styleUrl: './career-record.scss',
})
export class EvidenceReview {
  readonly workspace = input.required<Workflow>();
  readonly changed = output<void>();
  private readonly api = inject(WorkflowApi);
  apiEvidenceUrl(id: string) {
    return this.api.evidenceUrl(id);
  }
  readonly notice = viewChild<ElementRef<HTMLElement>>('flowNotice');
  readonly busy = signal(false);
  readonly message = signal('Add career text or reopen a saved text source to continue.');
  readonly denied = signal(false);
  readonly sourceId = signal('');
  readonly candidates = signal<{ statement: string; locator: string; excerpt: string }[]>([]);
  readonly index = signal(0);
  readonly proposal = signal<Proposal | null>(null);
  readonly correction = signal('');
  readonly target = signal<(Claim & { proposalId: string }) | null>(null);
  readonly current = computed(() => this.candidates()[this.index()]);
  readonly pending = computed(() =>
    this.workspace().proposals.filter((p) => p.reviewDisposition === 'proposed'),
  );
  readonly claims = computed(
    () =>
      this.workspace().reviewedClaims ??
      this.workspace().proposals.flatMap((p) =>
        p.claim ? [{ ...p.claim, proposalId: p.proposalId }] : [],
      ),
  );
  private async action(task: () => Promise<void>) {
    if (this.busy() || this.denied()) return;
    this.busy.set(true);
    try {
      await task();
    } catch (e) {
      const status = e instanceof HttpErrorResponse ? e.status : undefined;
      if (status === 401 || status === 403 || status === 0) {
        this.denied.set(true);
        this.candidates.set([]);
        this.proposal.set(null);
        this.target.set(null);
        this.changed.emit();
      }
      this.message.set(
        status === 401 || status === 403
          ? 'Sign-in expired or access denied. Reload this protected page to continue.'
          : status === 409
            ? 'This decision changed elsewhere. Reopen it before deciding again.'
            : status === 415
              ? 'This source is not a UTF-8 text file. Paste its career text or upload a .txt copy.'
              : status === 413
                ? 'This source is too large for this first text-review flow. Use a smaller text document.'
                : 'The action could not be completed. Your saved evidence and completed decisions are preserved. Reopen the source or decision to continue.',
      );
    } finally {
      this.busy.set(false);
      setTimeout(() => this.notice()?.nativeElement.focus());
    }
  }
  async upload(
    event: Event,
    form: HTMLFormElement,
    pasted: string,
    file: File | undefined,
    attribution: string,
    locator: string,
  ) {
    event.preventDefault();
    if (!form.reportValidity() || (!file && !pasted.trim())) return;
    await this.action(async () => {
      if (file && pasted.trim()) {
        this.message.set('Choose a file or paste text, one source at a time.');
        return;
      }
      const source = await this.api.upload(
        file ?? new File([pasted], 'career-text.txt', { type: 'text/plain' }),
        attribution,
        locator,
      );
      this.sourceId.set(source.sourceId);
      this.changed.emit();
      await this.find(source.sourceId);
      form.reset();
    });
  }
  private async find(id: string) {
    this.candidates.set([]);
    this.proposal.set(null);
    this.target.set(null);
    this.index.set(0);
    const result = await this.api.sourceCandidates(id);
    this.sourceId.set(id);
    this.candidates.set(result.candidates);
    this.message.set(
      `${result.source.filename} is saved. ${result.candidates.length} source excerpts available. They are suggestions, not approved facts.`,
    );
  }
  async openSource(id: string) {
    if (id) await this.action(() => this.find(id));
  }
  async openCandidate(index: number) {
    if (!this.candidates()[index]) return;
    await this.action(async () => {
      this.proposal.set(null);
      this.target.set(null);
      this.index.set(index);
      const p = await this.api.stageTextCandidate(this.sourceId(), index);
      this.proposal.set(p);
      this.correction.set(p.statement);
      this.changed.emit();
      this.message.set('Source suggestion saved for review. Only your decision can approve it.');
    });
  }
  async openProposal(id: string) {
    if (!id) return;
    await this.action(async () => {
      this.candidates.set([]);
      this.target.set(null);
      const p = await this.api.proposal(id);
      this.proposal.set(p);
      this.correction.set(p.statement);
      this.message.set('Pending statement opened. Inspect its source before deciding.');
    });
  }
  async decide(decision: 'accepted' | 'corrected' | 'rejected') {
    const p = this.proposal();
    if (
      !p ||
      p.reviewDisposition !== 'proposed' ||
      (decision === 'corrected' && !this.correction().trim())
    )
      return;
    await this.action(async () => {
      this.proposal.set(await this.api.review(p, decision, this.correction()));
      this.changed.emit();
      this.message.set(
        decision === 'rejected'
          ? 'Rejected. No career claim was approved.'
          : 'Decision saved. The active Library of Truth now reflects this decision.',
      );
    });
  }
  async correctClaim(id: string) {
    const claim = this.claims().find((c) => c.claimId === id);
    if (!claim) return;
    await this.action(async () => {
      const p = await this.api.proposal(claim.proposalId);
      if (!p.claim || p.claim.claimId !== claim.claimId) throw new Error('Claim changed');
      this.candidates.set([]);
      this.proposal.set(p);
      this.target.set(claim);
      this.correction.set(claim.statement);
      this.message.set(
        'Correct the approved statement. Approval replaces the old active claim and preserves its history.',
      );
    });
  }
  async approveCorrection(reason: string) {
    const claim = this.target(),
      evidence = this.proposal()?.evidence?.[0];
    if (!claim || !evidence || !reason.trim() || !this.correction().trim()) return;
    await this.action(async () => {
      const p = await this.api.createCorrection(
        claim,
        this.correction(),
        'Owner correction',
        evidence.sourceId,
        evidence.locator,
        reason,
      );
      // Keep the created proposal visible if approval fails, so it can be resumed.
      this.proposal.set(p);
      this.target.set(null);
      this.changed.emit();
      this.proposal.set(await this.api.review(p, 'corrected', this.correction()));
      this.changed.emit();
      this.message.set(
        'Correction approved. Prior acceptance and replacement history are preserved.',
      );
    });
  }
}
