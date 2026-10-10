import { CaseStudy } from './case-study.model';

// Approved public authored copy; private research is never a runtime source.
export const IPS_CASE_STUDY: CaseStudy = {
  title: 'Indianapolis Public Schools',
  introduction: 'UI Developer · August 2019–October 2019',
  sections: [
    {
      heading: 'Overview',
      paragraphs: [
        'At Indianapolis Public Schools, I worked as a UI Developer customizing PowerSchool forms used to collect data required for state reporting.',
        "The challenge was not simply validating individual fields. The State of Indiana's reporting requirements included conditional rules that the existing PowerSchool form could not adequately represent. Whether a field was required could change based on a user's answers elsewhere in the form, sometimes involving combinations of several different selections.",
        "My role was to translate those reporting rules into dynamic interface behavior using JavaScript, jQuery, HTML, and CSS. The resulting form continuously adapted its requirements to the information being entered and prevented users from submitting combinations that did not satisfy the state's reporting rules.",
      ],
    },
    {
      heading: 'The Challenge',
      paragraphs: [
        'Indianapolis Public Schools was required to submit data according to State of Indiana reporting requirements.',
        'The existing PowerSchool form could capture the individual pieces of information, but it could not adequately represent the relationships between them.',
        'A selection in one dropdown might make two additional fields required. A particular combination of selections across several dropdowns could trigger another set of requirements. Changing an earlier answer could invalidate information that had already been entered elsewhere in the form.',
        'A static collection of required fields was not sufficient.',
        'The interface needed to understand the relationships between the answers and continuously determine what information was required.',
      ],
    },
    {
      heading: 'Translating State Rules Into Interface Logic',
      paragraphs: [
        "I worked directly with district leadership to understand the state's reporting requirements and translate them into conditional front-end logic within PowerSchool.",
        'Using JavaScript and jQuery, I created rules that evaluated combinations of user selections as the form was completed.',
        'Selecting a particular value could immediately make additional fields required. Other requirements depended on combinations of answers across several dropdowns.',
        'The form recalculated those dependencies dynamically as answers changed rather than waiting until the user attempted to submit the record.',
      ],
    },
    {
      heading: 'Making Changing Requirements Visible',
      paragraphs: [
        'Dynamic validation only works if users can understand what the interface expects from them.',
        'When an answer caused another field to become required, the interface made that change visible immediately. Required-field indicators were color coded, and related fields were positioned near one another when selections in one directly affected the requirements of another.',
        'Inline validation messages identified fields that had become required based on previous answers.',
        'This allowed users to see both what had changed and what they needed to do next without having to understand the underlying reporting rules themselves.',
      ],
    },
    {
      heading: 'Maintaining Valid State',
      paragraphs: [
        'Changing an earlier answer could also make previously entered information invalid.',
        'The form therefore did more than add and remove required indicators. When a change invalidated dependent information, the affected fields could be reset so incompatible values were not left behind in the record.',
        'The interface continuously reevaluated the form as users worked through it:',
      ],
      items: [
        'selections could dynamically make other fields required;',
        'combinations of multiple selections could trigger additional requirements;',
        'required-field indicators changed with the current state of the form;',
        'related fields were grouped to make dependencies easier to understand;',
        'inline messages explained newly required information; and',
        'dependent values could be reset when an earlier answer made them invalid.',
      ],
    },
    {
      heading: 'Validation and interface behavior',
      paragraphs: [
        'The validation logic and the interface behavior worked together rather than treating validation as an error check performed only at the end.',
      ],
    },
    {
      heading: 'Preventing Invalid Submissions',
      paragraphs: [
        'The final safeguard was submission itself.',
        'I implemented the validation to the point that a form containing an invalid combination of values could not be submitted.',
        'Instead of allowing invalid data to move downstream and requiring someone to identify and correct it later, the interface enforced the applicable state reporting rules at the point of entry and showed users what needed to be corrected.',
        'This turned a PowerSchool form that could collect the necessary fields into a workflow capable of enforcing the relationships between those fields.',
      ],
    },
    {
      heading: 'Outcome',
      paragraphs: [
        "The customized PowerSchool workflow prevented known invalid combinations from being submitted and helped improve the quality of data entering the district's state-reporting process.",
        'Just as importantly, the complexity of the reporting rules was moved into the application rather than being placed entirely on the person completing the form.',
        'Users did not need to manually determine every dependency between fields. The interface responded to their answers, identified the information required for the current situation, and prevented the record from advancing until the applicable requirements were satisfied.',
        'The work reinforced a principle that became increasingly important in my later enterprise UX engineering: when business or regulatory rules are complex, the interface should carry as much of that complexity as possible instead of transferring it to the user.',
      ],
    },
    {
      heading: 'Technologies & Practices',
      paragraphs: [
        'PowerSchool · JavaScript · jQuery · HTML · CSS · Dynamic form behavior · Conditional validation · Business-rule implementation · Dependency management · Inline validation · Form-state management · Regulated reporting',
      ],
    },
  ],
};
