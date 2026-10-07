import { CaseStudy } from './case-study.model';

// Existing scaffold copy only. Replace with approved public content, not raw archive material.
const scaffold = (title: string): CaseStudy => ({
  title,
  introduction: 'Case-study scaffold. Supporting content and evidence have not yet been added.',
  sections: [
    'Context',
    'Problem',
    'Role and responsibilities',
    'Decisions',
    'Implementation',
    'Outcomes and evidence',
  ].map((heading) => ({ heading, paragraphs: ['Content pending.'] })),
});

export const CASE_STUDIES = {
  exl: scaffold('EXL / LifePRO'),
  ips: scaffold('IPS / PowerSchool'),
  tcc: scaffold('TCC Software Solutions'),
  dr: scaffold('D&R'),
} satisfies Record<string, CaseStudy>;
