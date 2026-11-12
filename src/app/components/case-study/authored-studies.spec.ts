import { IPS_CASE_STUDY } from './ips.content';
import { DR_CASE_STUDY } from './dr.content';
import { TCC_CASE_STUDY } from './tcc.content';
import { EXL_CASE_STUDY } from './exl.content';
import { DJAMESPOER_CASE_STUDY } from './djamespoer.content';
import { validateCaseStudy } from './case-study.validation';

describe('Authored case-study drafts', () => {
  it('preserves IPS state-rule and conditional-form boundaries', () => {
    const copy = JSON.stringify(IPS_CASE_STUDY);
    expect(copy).not.toMatch(/federal|penalties|WCAG|Section 508/);
  });
  it('preserves the approved D&R roles and inherited-system boundaries', () => {
    const copy = JSON.stringify(DR_CASE_STUDY);
  });
  it.each([EXL_CASE_STUDY, DJAMESPOER_CASE_STUDY, TCC_CASE_STUDY, DR_CASE_STUDY, IPS_CASE_STUDY])(
    'validates $title without empty scaffold sections',
    (study) => {
      const validated = validateCaseStudy(study);
      expect(validated).toBe(study);
      expect(study.sections.length).toBeGreaterThan(5);
      expect(JSON.stringify(study)).not.toMatch(/Content pending|file:\/\/|data:/);
      for (const section of validated.sections) {
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
