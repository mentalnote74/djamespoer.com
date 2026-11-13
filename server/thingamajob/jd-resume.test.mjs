import test from 'node:test';
import assert from 'node:assert/strict';
import { validateResume, renderResumePdf, resumeFileName } from './jd-resume.ts';

// Fictional candidate evidence only.
const truths = [
  {
    truthId: 'a',
    statement: 'Senior UX Engineer at Fictional Co (2020–2023) leading accessibility remediation across 40 Angular screens.',
    state: 'accepted',
    qualifications: [],
  },
  {
    truthId: 'b',
    statement: 'Built reusable Sass design-system components in TypeScript and Angular.',
    state: 'accepted',
    qualifications: [],
  },
];

test('résumé keeps only canonically supported headings, bullets, numbers and skills', () => {
  const resume = validateResume(
    {
      headline: 'Senior UX Engineer',
      summary: 'Led accessibility remediation across 40 Angular screens.',
      summaryRefs: ['a'],
      skills: ['Angular', 'TypeScript', 'Kubernetes'],
      roles: [
        {
          employer: 'Fictional Co',
          title: 'Senior UX Engineer',
          dates: '2020–2023',
          headingRefs: ['a'],
          bullets: [
            { text: 'Led accessibility remediation across 40 Angular screens.', refs: ['a'] },
            { text: 'Cut load time by 70%.', refs: ['a'] },
            { text: 'Built reusable Sass design-system components.', refs: ['b'] },
            { text: 'Uncited claim.', refs: [] },
          ],
        },
        {
          employer: 'Invented Corp',
          title: 'CTO',
          dates: '2010–2020',
          headingRefs: ['b'],
          bullets: [{ text: 'Built reusable components.', refs: ['b'] }],
        },
      ],
    },
    truths,
  );
  assert.deepEqual(resume.skills, ['Angular', 'TypeScript']);
  assert.equal(resume.roles.length, 1, 'Employer not in its cited truths is dropped');
  assert.equal(resume.roles[0].dates, '2020–2023');
  assert.deepEqual(resume.roles[0].bullets, [
    'Led accessibility remediation across 40 Angular screens.',
    'Built reusable Sass design-system components.',
  ]);
  assert.match(resume.summary, /40 Angular screens/);
});

test('unsupported title/dates are blanked, invented summary numbers dropped, empty résumé refused', () => {
  const resume = validateResume(
    {
      headline: 'UX Engineer',
      summary: '20 years of experience.',
      summaryRefs: ['a'],
      skills: [],
      roles: [
        {
          employer: 'Fictional Co',
          title: 'Principal Architect',
          dates: '2015–2023',
          headingRefs: ['a'],
          bullets: [{ text: 'Led accessibility remediation.', refs: ['a'] }],
        },
      ],
    },
    truths,
  );
  assert.equal(resume.summary, '');
  assert.equal(resume.roles[0].title, '');
  assert.equal(resume.roles[0].dates, '');
  assert.throws(() => validateResume({ roles: [] }, truths));
});

test('PDF renders and file name is safe', async () => {
  const bytes = await renderResumePdf({
    headline: 'Senior UX Engineer',
    summary: 'Accessibility-first engineer — “quoted” café.',
    skills: ['Angular', 'TypeScript'],
    roles: [
      { employer: 'Fictional Co', title: 'Senior UX Engineer', dates: '2020–2023', bullets: ['Built things → shipped.'] },
    ],
  });
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');
  assert.equal(resumeFileName('Senior UX Engineer / A11y'), 'D-James-Poer-Resume-Senior-UX-Engineer-A11y.pdf');
});
