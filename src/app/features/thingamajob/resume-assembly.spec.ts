import { describe, it, expect } from 'vitest';
import {
  assembleResume,
  conciseBullets,
  resumeWording,
  type AssemblyFact,
} from './resume-assembly';
import type { ExtractionRun } from './extraction-run';
function fixture() {
  const run: ExtractionRun = {
    runId: 'fixture',
    state: 'staged',
    document: {
      sources: [
        {
          key: 'resume',
          sourceId: 's',
          sha256: 'fixture',
          units: [
            { locationKey: 'word/document.xml:p12', text: 'Experience' },
            { locationKey: 'word/document.xml:p13', text: 'Interface Developer' },
            {
              locationKey: 'word/document.xml:p14',
              text: 'Fictional Labs (FL) - Fictional City  January 2010 - Present',
            },
            { locationKey: 'word/document.xml:p20', text: 'Education' },
          ],
        },
      ],
      claims: [
        {
          id: 'c',
          text: 'The owner built accessible forms at Fictional Labs.',
          sourceKey: 'resume',
          sourceReference: {},
          extractionConfidence: 'high',
          uncertainties: [],
          conflictIds: [],
          citations: [{ locationKey: 'word/document.xml:p15', quote: 'Built accessible forms.' }],
        },
      ],
      questions: [],
      conflicts: [],
    },
    proposals: [],
  };
  const fact: AssemblyFact = {
    id: 'active',
    candidateId: 'c',
    run,
    text: run.document.claims[0].text,
  };
  return { run, fact };
}
describe('deterministic resume presentation', () => {
  it('suppresses redundant wording without hiding a different number or negation', () => {
    const full =
      'I maintained my own branch at Fictional Labs and upgraded that branch to Angular 10.';
    const short = 'I upgraded my own branch at Fictional Labs to Angular 10.';
    expect(conciseBullets([full, short])).toEqual([full]);
    expect(conciseBullets([full, short.replace('10', '9')])).toHaveLength(2);
    expect(conciseBullets([short, short.replace('I upgraded', 'I never upgraded')])).toHaveLength(
      2,
    );
  });
  it('uses source role structure with active facts, never replays raw source bullets', () => {
    const { run, fact } = fixture();
    run.document.sources[0].units!.splice(3, 0, {
      locationKey: 'word/document.xml:p16',
      text: 'An obsolete unsupported claim.',
    });
    const result = assembleResume([fact, { ...fact, id: 'duplicate' }], [run]);
    expect(result.roles).toHaveLength(1);
    expect(result.roles[0].employer).toBe('Fictional Labs (FL)');
    expect(result.roles[0].title).toBe('Interface Developer');
    expect(result.roles[0].dates).toBe('Started January 2010');
    expect(result.roles[0].bullets).toEqual(['Built accessible forms at Fictional Labs.']);
    expect(JSON.stringify(result)).not.toContain('obsolete unsupported');
  });
  it('keeps corrections, excludes temporal presentation from the document, and preserves inputs', () => {
    const { run, fact } = fixture();
    const facts = [
      fact,
      {
        id: 'corrected',
        text: 'I upgraded my own branch at Fictional Labs to Angular 10.',
        reviewed: true,
      },
      { id: 'historical', text: "At the resume's date, the owner was upgrading to Angular 9." },
    ];
    const before = JSON.stringify({ run, facts });
    const result = assembleResume(facts, [run]);
    expect(result.roles[0].bullets.join(' ')).toContain('own branch');
    expect(JSON.stringify(result)).not.toContain('Angular 9');
    expect(JSON.stringify({ run, facts })).toBe(before);
  });
  it('does not associate a later project with the last employment entry merely by paragraph order', () => {
    const { run, fact } = fixture();
    run.document.claims.push({
      ...run.document.claims[0],
      id: 'project',
      citations: [{ locationKey: 'word/document.xml:p100', quote: 'Separate project' }],
    });
    const result = assembleResume(
      [
        fact,
        { id: 'project', candidateId: 'project', run, text: 'The owner built a separate project.' },
      ],
      [run],
    );
    expect(result.additional).toEqual(['Built a separate project.']);
    expect(result.roles[0].bullets).toHaveLength(1);
  });
  it('does not invent dates or roles when source structure is unavailable', () => {
    const { run, fact } = fixture();
    run.document.sources[0].units = [];
    const result = assembleResume([fact], [run]);
    expect(result.roles).toEqual([]);
    expect(resumeWording('The resume lists a Bachelor of Science.')).toBe('Bachelor of Science.');
    expect(
      resumeWording('At Fictional Labs, the owner consulted with and advised Product Managers.'),
    ).toBe('Advised Product Managers.');
  });
});
