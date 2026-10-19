import { approvedSourceContexts } from './context-policy.ts';
import { approvedTitleGroups } from './title-policy.ts';
// Bounded first-proof policy. Never treats model confidence or a citation match alone as entailment.
// The input digest pins this policy to the independently inspected candidate/source package;
// new extraction outputs require their own source vetting, not automatic reuse of this approval.
export const POLICY_VERSION = 'client-one-source-vetting-v4';
// Explicit October 19 QA: attribution, approximation and source-title variation
// do not invalidate faithfully captured testimony. This approval is run-bound;
// it is not a confidence-only or literal-citation-only auto-promotion heuristic.
export const QA_SOURCE_RUN = '1f96a7ab-1567-4678-bcef-15b840439cc7';
export const QA_DIRECT_CANDIDATES = [
  'ips-001', 'resume-010', 'resume-013', 'tcc-001',
  'resume-039', 'resume-040', 'resume-047',
  'tcc-005', 'tcc-008', 'tcc-010', 'tcc-011', 'tcc-012',
] as const;
export const APPROVED_TEMPLATE = '76528b67452512eebf4b63830eab7ecef5f45086c8f3bd19473c68cb2bfde0cd';
export interface VettingDocument {
  extractionRunId: string;
  claims: {
    id: string;
    sourceKey: string;
    text: string;
    extractionConfidence: string;
    uncertainties: string[];
    conflictIds: string[];
    citations: { locationKey: string; quote: string }[];
  }[];
  questions: { question: string; claimIds: string[] }[];
  conflicts: { id: string; explanation: string; claimIds: string[] }[];
  sources: {
    key: string;
    sourceId: string;
    sha256: string;
    units: { locationKey: string; text: string }[];
  }[];
}
export function classifyBaseline(document: VettingDocument) {
  const contexts = approvedSourceContexts(document.extractionRunId);
  const titleGroups = approvedTitleGroups(document.extractionRunId);
  const titleClaims = new Set<string>(titleGroups.flatMap((g) => [...g.claimIds]));
  const nonConflicts = new Set<string>(titleGroups.flatMap((g) => [...g.conflicts]));
  const issues = document.questions
    .map((q, i) => ({
      id: 'question-' + (i + 1),
      question: q.question,
      claimIds: q.claimIds,
    }))
    .filter(
      (q) =>
        !titleGroups.some((g) => g.issueId === q.id) && !contexts.some((c) => c.issueId === q.id),
    );
  if (
    document.claims.some((c) => c.id === 'resume-042') &&
    !contexts.some((c) => c.issueId === 'elapsed-time')
  )
    issues.push({
      id: 'elapsed-time',
      question:
        'The source gives a six-week build allowance. Did the site actually ship within six weeks, or should the claim describe the allotted build period?',
      claimIds: ['resume-042'],
    });
  const rows = document.claims.map((c) => {
    const reasons: string[] = [];
    const source = document.sources.find((s) => s.key === c.sourceKey);
    const valid =
      !!source &&
      c.citations.length > 0 &&
      c.citations.every((q) =>
        source.units.some((u) => u.locationKey === q.locationKey && u.text.includes(q.quote)),
      );
    if (!valid)
      return {
        candidateId: c.id,
        category: 'invalid' as const,
        reasons: ['Missing or nonliteral source citation; not established.'],
      };
    const context = contexts.find((s) => s.candidateId === c.id);
    if (context)
      return {
        candidateId: c.id,
        category: context.category as 'baseline' | 'qualified',
        reasons: [context.reason],
      };
    if (document.extractionRunId === QA_SOURCE_RUN && QA_DIRECT_CANDIDATES.some((id) => id === c.id))
      return {
        candidateId: c.id,
        category: 'baseline' as const,
        reasons: ['Faithful approved-source testimony. Preserve collaborative attribution, approximation and historical wording; no separate owner reconfirmation or independent corroboration is required.'],
      };
    if (titleClaims.has(c.id))
      return {
        candidateId: c.id,
        category: 'qualified' as const,
        reasons: [
          'Source-specific title presentation associated with the same corroborated employment period. No canonical employer title or promotion is inferred; wording differences alone are not conflicts.',
        ],
      };
    for (const issue of issues.filter((q) => q.claimIds.includes(c.id)))
      reasons.push(issue.question);
    for (const conflict of document.conflicts.filter(
      (k) => c.conflictIds.includes(k.id) && !nonConflicts.has(k.id),
    ))
      if (!reasons.includes(conflict.explanation)) reasons.push(conflict.explanation);
    if (c.extractionConfidence !== 'high') reasons.push('Uncertain extraction requires judgment.');
    if (reasons.length) return { candidateId: c.id, category: 'attention' as const, reasons };
    if (c.uncertainties.length)
      return { candidateId: c.id, category: 'qualified' as const, reasons: [...c.uncertainties] };
    return {
      candidateId: c.id,
      category: 'baseline' as const,
      reasons: [
        c.sourceKey === 'resume'
          ? 'Direct source-backed historical r�sum� fact; no material exception in the pinned source vetting.'
          : 'Direct approved public-source fact; no disagreement with r�sum� evidence in the pinned source vetting.',
      ],
    };
  });
  return { policyVersion: POLICY_VERSION, rows, issues };
}
