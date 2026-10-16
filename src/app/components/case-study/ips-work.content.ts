import { CaseStudy } from './case-study.model';

export const IPS_WORK_HISTORY = {
  title: 'Indianapolis Public Schools — PowerSchool Custom Development',
  introduction: [
    "My work with Indianapolis Public Schools included developing custom functionality within the district's existing PowerSchool environment.",
    'Rather than developing a standalone application or modifying the PowerSchool product itself, I worked within the platform available to the district, using JavaScript, jQuery, HTML, and CSS to create interface behavior required by IPS workflows.',
    'The work required understanding not only what information a form needed to collect, but also how district requirements affected when information was required and how the interface should respond to different circumstances.',
  ],
  sections: [
    {
      heading: 'Working Within PowerSchool',
      paragraphs: [
        'PowerSchool provided the underlying student-information platform.',
        'My responsibility was to adapt portions of that environment to IPS requirements.',
        'That meant working within an existing commercial system rather than choosing the application architecture, framework, or data model from scratch.',
        "Custom functionality therefore had to coexist with PowerSchool's established behavior while still providing the district-specific interactions IPS needed.",
        'I used JavaScript and jQuery to control client-side behavior and validation, with HTML and CSS supporting the customized interface.',
      ],
    },
    {
      heading: 'Translating District Requirements',
      paragraphs: [
        'A significant part of the work involved converting administrative requirements into concrete form behavior.',
        'Written requirements can describe what information a district needs without specifying exactly how a user interface should enforce those rules.',
        'I worked with district leadership to understand the intended workflow and then translated those requirements into the conditions the application needed to evaluate.',
        'That included determining when particular information was required, which user choices changed subsequent requirements, how the form should respond to those choices, and what needed to be validated before the workflow could proceed.',
        'The resulting implementation connected district policy and reporting requirements with the actual behavior of the PowerSchool interface.',
      ],
    },
    {
      heading: 'Conditional Validation',
      paragraphs: [
        'The customized forms included conditional validation rather than treating every field as universally required.',
        'User selections and the context of the record determined what additional information needed to be supplied.',
        'JavaScript and jQuery handled those relationships in the browser, allowing the form to enforce requirements according to the conditions defined by the district.',
        'This was particularly important where discipline and reporting requirements affected the information that had to be captured.',
        'Instead of leaving those relationships entirely to user memory or written instructions, the interface incorporated them into its behavior.',
      ],
    },
    {
      heading: 'Discipline and Reporting Workflows',
      paragraphs: [
        'IPS requirements included rules associated with discipline and reporting.',
        'Those requirements had to be represented accurately in the customized PowerSchool forms.',
        'I implemented form behavior that responded to the relevant conditions and applied validation where additional information became necessary.',
        'The work required care because the interface was representing administrative rules rather than merely collecting arbitrary data.',
        "The goal was to make the form behave consistently with the district's requirements while remaining within the capabilities and constraints of the existing PowerSchool environment.",
      ],
    },
    {
      heading: 'Collaboration With District Leadership',
      paragraphs: [
        'I worked directly with district leadership to understand requirements and clarify how they should translate into interface behavior.',
        'That collaboration was important because requirements expressed in administrative or operational language do not automatically map cleanly to software logic.',
        'Questions that appear simple in conversation often need precise answers before they can become deterministic application behavior.',
        'What condition triggers the requirement?',
        'Does one selection make another field mandatory?',
        'Does the rule apply in every case or only under specific circumstances?',
        'What should happen when the user changes an earlier answer?',
        'Resolving those questions was part of implementing the feature correctly.',
      ],
    },
    {
      heading: 'The Work in Context',
      paragraphs: [
        'The IPS work was narrower in scope than later enterprise product work in my career, but it strengthened an important skill that continued through subsequent roles:',
        'translating human requirements into predictable interface behavior.',
        'I was working inside an established platform with established institutional requirements.',
        'The job was not to replace either one.',
        'It was to understand both well enough to connect them.',
        'Using JavaScript, jQuery, HTML and CSS, I customized the PowerSchool interface so district-specific requirements—including conditional discipline and reporting rules—could be represented directly in the workflow.',
        "The result was functionality tailored to IPS requirements while remaining within the district's existing PowerSchool system.",
      ],
    },
  ],
  relatedPage: {
    href: '/case-studies/ips',
    label: 'Read the IPS Case Study →',
    kind: 'case-study',
  },
} satisfies CaseStudy;
