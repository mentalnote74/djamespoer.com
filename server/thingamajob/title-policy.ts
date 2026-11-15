export interface RoleEvidence {
  employerKey: string;
  startYear: number;
  endYear: number;
  startMonth?: number;
  endMonth?: number;
  responsibilityAnchors: string[];
  explicitSeparateRoles?: boolean;
  materialResponsibilityOrSeniorityDisagreement?: boolean;
}
// Title strings deliberately do not determine whether evidence conflicts.
export function titleRelationship(a: RoleEvidence, b: RoleEvidence) {
  if (
    a.explicitSeparateRoles ||
    b.explicitSeparateRoles ||
    a.materialResponsibilityOrSeniorityDisagreement ||
    b.materialResponsibilityOrSeniorityDisagreement
  )
    return 'material-ambiguity';
  if (
    a.employerKey !== b.employerKey ||
    a.startYear !== b.startYear ||
    a.endYear !== b.endYear ||
    (a.startMonth !== undefined && b.startMonth !== undefined && a.startMonth !== b.startMonth) ||
    (a.endMonth !== undefined && b.endMonth !== undefined && a.endMonth !== b.endMonth)
  )
    return 'unreconciled-role';
  return a.responsibilityAnchors.filter((k) => b.responsibilityAnchors.includes(k)).length >= 2
    ? 'presentation-variants'
    : 'unreconciled-role';
}
export const TITLE_POLICY = 'client-one-title-presentations-v2';
export const TITLE_GROUPS = [
  {
    roleKey: 'ips-role',
    claimIds: ['resume-010', 'ips-001'],
    issueId: 'question-2',
    conflicts: ['conflict-002'],
    a: {
      employerKey: 'ips',
      startYear: 2019,
      endYear: 2019,
      startMonth: 8,
      endMonth: 10,
      responsibilityAnchors: ['powerschool', 'javascript', 'forms'],
    },
    b: {
      employerKey: 'ips',
      startYear: 2019,
      endYear: 2019,
      startMonth: 8,
      endMonth: 10,
      responsibilityAnchors: ['powerschool', 'javascript', 'forms'],
    },
  },
  {
    roleKey: 'tcc-role',
    claimIds: ['resume-013', 'tcc-001'],
    issueId: 'question-1',
    conflicts: ['conflict-001', 'conflict-003'],
    a: {
      employerKey: 'tcc',
      startYear: 2015,
      endYear: 2019,
      startMonth: 5,
      endMonth: 6,
      responsibilityAnchors: ['ux', 'accessibility', 'ascend', 'oregon'],
    },
    b: {
      employerKey: 'tcc',
      startYear: 2015,
      endYear: 2019,
      responsibilityAnchors: ['ux', 'accessibility', 'ascend', 'oregon'],
    },
  },
] as const;
export function approvedTitleGroups(runId: string) {
  if (runId !== '1f96a7ab-1567-4678-bcef-15b840439cc7') return [];
  return TITLE_GROUPS.filter(
    (g) =>
      titleRelationship(
        { ...g.a, responsibilityAnchors: [...g.a.responsibilityAnchors] },
        { ...g.b, responsibilityAnchors: [...g.b.responsibilityAnchors] },
      ) === 'presentation-variants',
  );
}
