import { validateCaseStudy } from './case-study.validation';
import { CaseStudy, CaseStudyEvidence } from './case-study.model';
import { CASE_STUDIES } from './case-study.content';

const studyWith = (evidence: CaseStudyEvidence): CaseStudy => ({
  title: 'Synthetic',
  sections: [{ heading: 'Evidence', evidence: [evidence] }],
});

describe('Case-study authored-content validation', () => {
  it('preserves current placeholders and allows genuinely omitted sections', () => {
    for (const study of Object.values(CASE_STUDIES)) expect(validateCaseStudy(study)).toBe(study);
    expect(validateCaseStudy({ title: 'Synthetic', sections: [] }).sections).toEqual([]);
  });
  it('rejects blank headings/text and empty sections rather than inventing content', () => {
    expect(() => validateCaseStudy({ title: ' ', sections: [] })).toThrow();
    expect(() =>
      validateCaseStudy({ title: 'Synthetic', sections: [{ heading: 'Context' }] }),
    ).toThrow(/empty section/);
    expect(() =>
      validateCaseStudy({ title: 'Synthetic', sections: [{ heading: ' ', paragraphs: ['Text'] }] }),
    ).toThrow();
    expect(() =>
      validateCaseStudy({
        title: 'Synthetic',
        sections: [{ heading: 'Context', paragraphs: [' '] }],
      }),
    ).toThrow();
    expect(() =>
      validateCaseStudy({ title: 'Synthetic', sections: [{ heading: 'Context', items: [' '] }] }),
    ).toThrow();
  });
  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    '//example.com/path',
    'http://example.com',
    'https://user:password@example.com',
    '/career-source/private.pdf',
    '/%63areer-source/private.pdf',
    ' /example',
    '/example path',
    '/example\\path',
    'https://',
  ])('rejects malformed or disallowed evidence URL %s', (href) => {
    expect(() =>
      validateCaseStudy(studyWith({ kind: 'link', label: 'Synthetic evidence', href })),
    ).toThrow();
  });
  it.each(['/public-artifact.pdf', 'https://example.com/evidence'])(
    'accepts labelled public URL %s',
    (href) => {
      expect(() =>
        validateCaseStudy(studyWith({ kind: 'link', label: 'Synthetic evidence', href })),
      ).not.toThrow();
    },
  );
  it('requires meaningful image alt text and positive integral dimensions', () => {
    const image = {
      kind: 'image',
      src: '/example.png',
      alt: 'Synthetic interface',
      width: 800,
      height: 600,
    } as const;
    expect(() => validateCaseStudy(studyWith(image))).not.toThrow();
    expect(() => validateCaseStudy(studyWith({ ...image, alt: '' }))).toThrow(/alt text/);
    for (const width of [0, -1, 1.5, Infinity])
      expect(() => validateCaseStudy(studyWith({ ...image, width }))).toThrow(/dimensions/);
    expect(() => validateCaseStudy(studyWith({ ...image, caption: ' ' }))).toThrow(/caption/);
  });
});
