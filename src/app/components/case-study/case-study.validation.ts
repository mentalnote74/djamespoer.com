import { CaseStudy } from './case-study.model';

const requireText = (value: string, field: string): void => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Invalid case-study ${field}: nonempty text required.`);
  }
};

const requirePublicUrl = (value: string): void => {
  requireText(value, 'evidence URL');
  if (value !== value.trim() || value.includes('\\') || /[\u0000-\u0020\u007f]/.test(value)) {
    throw new Error('Invalid case-study evidence URL.');
  }
  // Authoring supports site-root paths and HTTPS, never executable/data/private-file URLs.
  if (!(value.startsWith('/') && !value.startsWith('//')) && !value.startsWith('https://')) {
    throw new Error('Invalid case-study evidence URL scheme.');
  }
  const url = new URL(value, 'https://case-study.invalid');
  if (
    url.username ||
    url.password ||
    /(?:^|\/)career-source(?:\/|$)/i.test(decodeURIComponent(url.pathname))
  ) {
    throw new Error('Invalid case-study evidence URL: private material or credentials.');
  }
};

/** Fail fast for trusted, typed public authoring; this is not a parser for external/archive payloads. */
export function validateCaseStudy(study: CaseStudy): CaseStudy {
  requireText(study.title, 'title');
  if (study.introduction !== undefined) requireText(study.introduction, 'introduction');
  for (const section of study.sections) {
    requireText(section.heading, 'section heading');
    for (const paragraph of section.paragraphs ?? []) requireText(paragraph, 'paragraph');
    for (const item of section.items ?? []) requireText(item, 'list item');
    if (
      section.listType !== undefined &&
      section.listType !== 'ordered' &&
      section.listType !== 'unordered'
    ) {
      throw new Error('Invalid case-study list type.');
    }
    if (section.listType !== undefined && !section.items?.length) {
      throw new Error('Invalid case-study list: items required.');
    }
    if (!(section.paragraphs?.length || section.items?.length || section.evidence?.length)) {
      throw new Error('Invalid case-study empty section: omit unsupported sections.');
    }
    for (const evidence of section.evidence ?? []) {
      if (evidence.kind === 'link') {
        requireText(evidence.label, 'link label');
        requirePublicUrl(evidence.href);
      } else if (evidence.kind === 'image') {
        requireText(evidence.alt, 'image alt text');
        requirePublicUrl(evidence.src);
        if (
          !Number.isSafeInteger(evidence.width) ||
          !Number.isSafeInteger(evidence.height) ||
          evidence.width <= 0 ||
          evidence.height <= 0
        ) {
          throw new Error('Invalid case-study image dimensions.');
        }
        if (evidence.caption !== undefined) requireText(evidence.caption, 'image caption');
      } else {
        throw new Error('Invalid case-study evidence kind.');
      }
    }
  }
  return study;
}
