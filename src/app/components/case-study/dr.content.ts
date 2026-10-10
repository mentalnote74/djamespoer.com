import { CaseStudy } from './case-study.model';

// Public copy approved by James/DTS; no private evidence is a runtime source.
export const DR_CASE_STUDY: CaseStudy = {
  title: 'Dreyer & Reinbold',
  introduction: 'Photographer/Web Developer · Digital Presence Coordinator · 2011–2015',
  sections: [
    {
      heading: 'Overview',
      paragraphs: [
        'Across two roles at Dreyer & Reinbold, my responsibilities expanded from vehicle photography and web production into dealership websites, digital operations, and internal application development.',
        'I supported a digital presence spanning 11 websites across automotive brands including BMW, MINI, Infiniti, Volkswagen, and Subaru. The work combined customer-facing web production with internal systems and provided an early opportunity to translate business processes into working software.',
      ],
    },
    {
      heading: 'Automotive Digital Operations',
      paragraphs: [
        'Maintaining dealership websites required coordinating frequently changing inventory, promotions, manufacturer requirements, and digital content across multiple properties.',
        'My responsibilities included maintaining dealership websites, creating and updating pages and graphics, photographing vehicle inventory, producing HTML email campaigns, and supporting automotive platforms and services including VinSolutions, Edmunds, Cars.com, TrueCar, and Constant Contact.',
        'Working across these systems provided visibility into both the customer-facing experience and the operational processes supporting it.',
      ],
    },
    {
      heading: 'Extending The Internal Intranet',
      paragraphs: [
        'Dreyer & Reinbold had an existing database-backed intranet that had been developed several years before I joined the organization.',
        'I inherited portions of that legacy application, repaired and improved existing functionality, and extended the system to address additional business requirements.',
        'One of the most significant additions automated a recurring month-end process for the finance team.',
      ],
    },
    {
      heading: 'Automating Month-End Commission Reporting',
      paragraphs: [
        'Salespeople could receive additional commissions based on products and protection packages sold with a vehicle. Because incentive structures changed each month, calculating those commissions required the finance manager to review sales data and manually determine the appropriate commissions for approximately 14 salespeople.',
        'I worked with the people responsible for the process to translate those changing business rules into an application workflow.',
        "I developed a dashboard that allowed the finance manager to configure the current month's incentives and process each salesperson's sales through the reporting system.",
        'The application:',
      ],
      items: [
        'identified qualifying sales and products;',
        'applied the configured monthly incentive rules;',
        'calculated the resulting commissions;',
        'generated individual salesperson reports; and',
        'produced an aggregated management report showing results across the sales team.',
      ],
    },
    {
      heading: 'Processing and workflow',
      paragraphs: [
        "Once configured, an individual salesperson's report could be processed in approximately 30 seconds.",
        'The application converted a recurring manual calculation process into a consistent, repeatable workflow while still allowing the finance team to accommodate changing monthly incentive structures.',
      ],
    },
    {
      heading: 'Working Within An Existing System',
      paragraphs: [
        "The solution was developed by extending the dealership group's existing intranet rather than replacing it.",
        'That required understanding an established application and its data, correcting existing issues where necessary, and introducing new functionality without disrupting the workflows employees already depended on.',
        'This experience established an approach that became increasingly important in my later work: understand the existing system and business process first, then make targeted changes that improve the workflow while minimizing unnecessary disruption.',
      ],
    },
    {
      heading: 'Outcome',
      paragraphs: [
        "The month-end commission functionality became part of Dreyer & Reinbold's operational workflow.",
        'More than a decade after I left the company, the functionality remains in use for the month-end process.',
        'Its longevity demonstrates the value of translating a specific operational problem into software that fits the people, rules, and systems already supporting the business.',
      ],
    },
    {
      heading: 'Foundation For Later Work',
      paragraphs: [
        'Dreyer & Reinbold provided the foundation for the work that followed in my career.',
        'The role combined front-end development with business rules, legacy systems, data-driven interfaces, and direct collaboration with the people performing the work. Those same concerns would later become central to my work on larger enterprise applications at TCC, Indianapolis Public Schools, and EXL.',
      ],
    },
    {
      heading: 'Technologies & Practices',
      paragraphs: [
        'HTML · CSS · JavaScript · jQuery · Legacy web applications · Database-backed intranet development · HTML email · Automotive inventory platforms · Digital asset production · Vehicle photography · Business-process automation · Reporting interfaces',
      ],
    },
  ],
};
