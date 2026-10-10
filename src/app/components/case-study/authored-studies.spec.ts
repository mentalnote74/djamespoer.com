import { TCC_CASE_STUDY } from './tcc.content';
import { EXL_CASE_STUDY } from './exl.content';
import { DJAMESPOER_CASE_STUDY } from './djamespoer.content';
import { validateCaseStudy } from './case-study.validation';

describe('Authored case-study drafts', () => {
  it.each([EXL_CASE_STUDY, DJAMESPOER_CASE_STUDY, TCC_CASE_STUDY])(
    'validates $title without empty scaffold sections',
    (study) => {
      expect(validateCaseStudy(study)).toBe(study);
      expect(study.sections.length).toBeGreaterThan(5);
      expect(JSON.stringify(study)).not.toMatch(/Content pending|file:\/\/|data:/);
      for (const section of study.sections) {
        for (const evidence of section.evidence ?? []) {
          expect(evidence.kind === 'link' ? evidence.href : evidence.src).not.toContain(
            '/career-source/',
          );
        }
      }
    },
  );
  it('preserves concrete EXL handoff evidence without inventing savings or certification', () => {
    const copy = JSON.stringify(EXL_CASE_STUDY);
    expect(copy).toContain('1.5 million');
    expect(copy).toContain('150 lines');
    expect(copy).toContain('40%');
    expect(copy).toContain('Section 508');
    expect(EXL_CASE_STUDY.introduction).toContain('Senior Web Designer');
    expect(copy).toContain('still running Angular 7 when I left EXL');
    expect(copy).toContain('local branch to compile and build through Angular 10');
    expect(copy).toContain('The upgraded UI was not production-ready');
    const technologies = EXL_CASE_STUDY.sections.at(-1)?.items;
    expect(technologies).toContain('Figma');
    expect(technologies).toContain('Justinmind');
    expect(copy).not.toContain('Ivy');
    expect(copy).not.toContain('Gartner');
    expect(copy).not.toContain('months saved');
  });
  it('keeps local and production results distinct and cites the accepted full SHA', () => {
    const copy = JSON.stringify(DJAMESPOER_CASE_STUDY);
    expect(copy).toContain('6facda597f1a21007384cc86f6fcfbbf04343398');
    expect(copy).toContain('Post-fix local optimized build: Performance 100; CLS 0.');
    expect(copy).toContain('production acceptance');
    expect(copy).toContain('Performance 99');
    expect(copy).toContain('SCRUM-63 remains open pending');
    expect(copy).not.toContain('3.5-year');
  });
});
