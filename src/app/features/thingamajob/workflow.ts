import {
  Component,
  computed,
  inject,
  signal,
  viewChild,
  ElementRef,
  OnInit,
  Injector,
  afterNextRender,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { WorkflowApi } from './workflow-api';
import type { Workflow, Proposal, UnknownDetail } from './workflow.models';

@Component({
  selector: 'app-thingamajob-workflow',
  imports: [DatePipe],
  templateUrl: './workflow.html',
  styleUrl: './workflow.scss',
  providers: [WorkflowApi],
})
export class ThingamajobWorkflow implements OnInit {
  readonly api = inject(WorkflowApi);
  readonly workspace = signal<Workflow | null>(null);
  readonly proposal = signal<Proposal | null>(null);
  readonly unknown = signal<UnknownDetail | null>(null);
  readonly busy = signal(false);
  readonly message = signal('Loading your protected workspace…');
  readonly correction = signal('');
  readonly notice = viewChild<ElementRef<HTMLElement>>('notice');
  private readonly injector = inject(Injector);
  readonly proposalHeading = viewChild<ElementRef<HTMLElement>>('proposalHeading');
  readonly claims = computed(
    () => this.workspace()?.proposals.flatMap((p) => (p.claim ? [p.claim] : [])) ?? [],
  );
  readonly replacementClaims = computed(() =>
    this.claims().filter((c) => c.claimId !== this.proposal()?.claim?.claimId),
  );
  readonly qualifying = computed(() => {
    const linked = new Set(
      this.unknown()
        ?.proposals.filter(
          (p) => p.claimId && ['accepted', 'corrected'].includes(p.reviewDisposition),
        )
        .map((p) => p.claimId),
    );
    return this.claims().filter((c) => linked.has(c.claimId));
  });
  readonly unlinkedAnswers = computed(
    () =>
      this.unknown()?.answers.filter(
        (a) =>
          a.evidence.length && !this.unknown()?.proposals.some((p) => p.answerId === a.answerId),
      ) ?? [],
  );
  async ngOnInit() {
    await this.refresh(false);
  }
  private focusNotice() {
    queueMicrotask(() => this.notice()?.nativeElement.focus());
  }
  private deny(error: unknown) {
    const status = error instanceof HttpErrorResponse ? error.status : undefined;
    if (status === 0 || status === 200 || status === 401 || status === 403) {
      this.workspace.set(null);
      this.proposal.set(null);
      this.unknown.set(null);
      this.correction.set('');
      this.api.clear();
    }
    this.message.set(
      status === 403
        ? 'Access denied (403). The server did not authorize this request. Refresh or contact the operator if approval is pending.'
        : status === 401
          ? 'Authentication required (401). Reload this protected page to sign in.'
          : status === 409
            ? 'Conflict (409). The record changed or this decision is no longer valid. Refresh and review its current version; no decision was retried automatically.'
            : status === 0
              ? 'Request unavailable. Your session or connection may have expired. Reload to sign in again.'
              : status
                ? `Request failed (${status}). No successful action is claimed. Refresh before trying again.`
                : 'The request could not be completed. No successful action is claimed.',
    );
  }
  private async load() {
    const overview = await this.api.overview();
    this.workspace.set(overview);
    const p = this.proposal(),
      u = this.unknown();
    if (p) this.proposal.set(await this.api.proposal(p.proposalId));
    if (u) this.unknown.set(await this.api.unknown(u.unknownId));
  }
  async refresh(focus = true) {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.load();
      this.message.set('Workspace refreshed. An empty evidence or reviewed-claim list is valid.');
    } catch (error) {
      this.deny(error);
    } finally {
      this.busy.set(false);
      if (focus) this.focusNotice();
    }
  }
  private async perform(action: () => Promise<unknown>, success: string) {
    if (this.busy()) return;
    this.busy.set(true);
    let saved = false;
    try {
      await action();
      saved = true;
      await this.load();
      this.message.set(success);
    } catch (error) {
      this.deny(error);
      if (saved && !(error instanceof HttpErrorResponse && [401, 403].includes(error.status)))
        this.message.set(
          'The server saved the action, but refresh failed. Refresh before submitting another action.',
        );
    } finally {
      this.busy.set(false);
      this.focusNotice();
    }
  }
  async proposeCorrection(event: Event, form: HTMLFormElement) {
    event.preventDefault();
    const obsolete = this.proposal()?.claim;
    if (!obsolete || !form.reportValidity()) return;
    await this.perform(async () => {
      this.proposal.set(
        await this.api.createCorrection(
          obsolete,
          this.value(form, 'statement'),
          this.value(form, 'attribution'),
          this.value(form, 'source'),
          this.value(form, 'locator'),
          this.value(form, 'reason'),
        ),
      );
    }, 'Linked correction proposal saved. The original remains active until this correction is explicitly approved.');
  }
  async supersede(event: Event, form: HTMLFormElement) {
    event.preventDefault();
    const obsolete = this.proposal()?.claim;
    if (!obsolete || !form.reportValidity()) return;
    const data = new FormData(form);
    await this.perform(
      () =>
        this.api.supersede(obsolete, String(data.get('replacement')), String(data.get('reason'))),
      'Claim supersession saved. Active LoT refreshed; original proposal, review and claim history remain preserved.',
    );
  }
  async viewClaimHistory(claimId: string) {
    const selected = this.workspace()?.proposals.find((p) => p.claim?.claimId === claimId);
    if (selected) await this.selectProposal(selected.proposalId, true);
  }
  async selectProposal(id: string, moveFocus = false) {
    if (this.busy()) return;
    this.proposal.set(null);
    this.correction.set('');
    if (!id) return;
    this.busy.set(true);
    try {
      this.proposal.set(await this.api.proposal(id));
      this.message.set('Proposal loaded. Review is a separate, explicit owner action.');
    } catch (error) {
      this.deny(error);
    } finally {
      this.busy.set(false);
      if (moveFocus)
        afterNextRender(
          () => {
            (this.proposalHeading()?.nativeElement ?? this.notice()?.nativeElement)?.focus();
          },
          { injector: this.injector },
        );
    }
  }
  async selectUnknown(id: string) {
    if (this.busy()) return;
    this.unknown.set(null);
    if (!id) return;
    this.busy.set(true);
    try {
      this.unknown.set(await this.api.unknown(id));
      this.message.set('UNKNOWN loaded. An answer or reviewed claim does not resolve it.');
    } catch (error) {
      this.deny(error);
    } finally {
      this.busy.set(false);
    }
  }
  async review(decision: 'accepted' | 'rejected' | 'corrected') {
    const p = this.proposal();
    if (!p || p.reviewDisposition !== 'proposed') return;
    if (decision === 'corrected' && !this.correction().trim()) {
      this.message.set('Enter corrected wording before choosing Correct.');
      this.focusNotice();
      return;
    }
    await this.perform(
      () => this.api.review(p, decision, this.correction()),
      decision === 'rejected'
        ? 'Proposal rejected. No reviewed claim was created. UNKNOWN state is unchanged.'
        : `${decision === 'corrected' ? 'Corrected' : 'Accepted'} reviewed claim saved. Review alone does not resolve an UNKNOWN; resolution is a separate owner action.`,
    );
  }
  private value(form: HTMLFormElement, name: string) {
    const value = new FormData(form).get(name);
    return typeof value === 'string' ? value : '';
  }
  async upload(event: Event, form: HTMLFormElement) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const file = new FormData(form).get('file');
    if (!(file instanceof File)) return;
    await this.perform(
      () =>
        this.api.upload(file, this.value(form, 'attribution'), this.value(form, 'sourceLocator')),
      'Evidence stored privately. No proposal, claim or resolution was created.',
    );
  }
  async propose(event: Event, form: HTMLFormElement) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    await this.perform(
      () =>
        this.api.createProposal(
          this.value(form, 'statement'),
          this.value(form, 'attribution'),
          this.value(form, 'source'),
          this.value(form, 'locator'),
        ),
      'Proposal request saved. Its current review state is shown in the refreshed list; only explicit owner review can create a claim.',
    );
  }
  async openUnknown(event: Event, form: HTMLFormElement) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    await this.perform(async () => {
      this.unknown.set(
        await this.api.createUnknown(
          this.value(form, 'question'),
          this.value(form, 'reason'),
          this.value(form, 'context'),
        ),
      );
    }, 'UNKNOWN request saved. Its current state is shown below; missing knowledge is valid.');
  }
  async answer(event: Event, form: HTMLFormElement) {
    event.preventDefault();
    const u = this.unknown();
    if (!u || !form.reportValidity()) return;
    await this.perform(
      () =>
        this.api.answer(
          u,
          this.value(form, 'answer'),
          this.value(form, 'attribution'),
          this.value(form, 'source'),
          this.value(form, 'locator'),
        ),
      'Attributed answer request saved. Answers do not themselves resolve UNKNOWNs.',
    );
  }
  async link(event: Event, form: HTMLFormElement) {
    event.preventDefault();
    const u = this.unknown();
    if (!u || !form.reportValidity()) return;
    await this.perform(
      () =>
        this.api.link(
          u,
          this.value(form, 'answerId'),
          this.value(form, 'statement'),
          this.value(form, 'attribution'),
        ),
      'Linked proposal request saved. Owner review and UNKNOWN resolution are separate actions.',
    );
  }
  async resolve(event: Event, form: HTMLFormElement) {
    event.preventDefault();
    const u = this.unknown();
    if (!u || !form.reportValidity()) return;
    await this.perform(
      () => this.api.resolve(u, this.value(form, 'claimId'), this.value(form, 'explanation')),
      'UNKNOWN explicitly resolved by the owner. Its question, answers and history are preserved.',
    );
  }
}
