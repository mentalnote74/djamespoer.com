// Bounded first-proof policy. Never treats model confidence or a citation match alone as entailment.
// The input digest pins this policy to the independently inspected candidate/source package;
// new extraction outputs require their own source vetting, not automatic reuse of this approval.
export const POLICY_VERSION = 'client-one-source-vetting-v1';
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
  const issues = document.questions.map((q, i) => ({
    id: 'question-' + (i + 1),
    question: q.question,
    claimIds: q.claimIds,
  }));
  if (document.claims.some((c) => c.id === 'resume-042'))
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
    for (const issue of issues.filter((q) => q.claimIds.includes(c.id)))
      reasons.push(issue.question);
    for (const conflict of document.conflicts.filter((k) => c.conflictIds.includes(k.id)))
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
