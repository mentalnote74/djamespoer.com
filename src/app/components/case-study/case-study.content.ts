import { DR_CASE_STUDY } from './dr.content';
import { TCC_CASE_STUDY } from './tcc.content';
import { CaseStudy } from './case-study.model';
import { EXL_CASE_STUDY } from './exl.content';
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
  exl: EXL_CASE_STUDY,
  ips: scaffold('IPS / PowerSchool'),
  tcc: TCC_CASE_STUDY,
  dr: DR_CASE_STUDY,
} satisfies Record<string, CaseStudy>;
