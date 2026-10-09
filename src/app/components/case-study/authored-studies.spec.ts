import { DJAMESPOER_CASE_STUDY } from './djamespoer.content';
import { validateCaseStudy } from './case-study.validation';

describe('Authored case-study drafts', () => {
  it.each([DJAMESPOER_CASE_STUDY])('validates $title without empty scaffold sections', (study) => {
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
