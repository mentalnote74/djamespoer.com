import { CaseStudy } from './case-study.model';
import { DJAMESPOER_CASE_STUDY } from './djamespoer.content';

// Public authored content only; the private archive is never a runtime source.
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
  djamespoer: DJAMESPOER_CASE_STUDY,
  exl: scaffold('EXL / LifePRO'),
  ips: scaffold('IPS / PowerSchool'),
  tcc: scaffold('TCC Software Solutions'),
  dr: scaffold('Dreyer & Reinbold'),
} satisfies Record<string, CaseStudy>;
