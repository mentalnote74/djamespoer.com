import type { EvaluationTruth } from './jd-contract.ts';

/** James's own positioning statements, given directly as owner on 2026-11-13 (SCRUM-177/194).
 * They supplement the canonical Library of Truth for the public evaluator and résumé builder
 * until SCRUM-150 promotes them into the LoT. They never replace or alter canonical rows,
 * and they are excluded from the canonical digest and change detection. */
export const OWNER_POSITIONING: EvaluationTruth[] = [
  {
    truthId: 'owner-experience',
    statement:
      'James has 23+ years of experience working with the web, including 12+ years of professional experience. The rest was combined with full-time non-professional work, a work history going back to 1991, that shaped his perspective and work ethic.',
    state: 'accepted',
    qualifications: ['Owner statement, 2026-11-13. Do not present the 23+ years as professional employment.'],
  },
  {
    truthId: 'owner-angular',
    statement:
      'James has worked with Angular since 2016. He is self-taught, with 8 years of professional Angular work documented on his résumé.',
    state: 'accepted',
    qualifications: ['Owner statement, 2026-11-13.'],
  },
  {
    truthId: 'owner-learning',
    statement:
      'James is a senior practitioner whose résumé shows he repeatedly learns new technology to a professional level and delivers with it. Every job skill he has ever needed, he learned on the job.',
    state: 'accepted',
    qualifications: ['Owner statement, 2026-11-13.'],
  },
  {
    truthId: 'owner-whole-process',
    statement:
      'James understands the whole software development process tech-agnostically: the problem, the people, architecture, implementation, delivery and maintenance. Specific frameworks are tools he chooses for the job.',
    state: 'accepted',
    qualifications: ['Owner statement, 2026-11-13.'],
  },
];

export const withOwnerPositioning = (truths: EvaluationTruth[]) => [...truths, ...OWNER_POSITIONING];
