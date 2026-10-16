import { CaseStudy } from './case-study.model';

export const EXL_WORK_HISTORY = {
  title: 'EXL — Senior Web Designer',
  subtitle: 'LifePRO USA · Enterprise Life Insurance Software',
  introduction: [
    "I joined EXL as a Senior Web Designer working on LifePRO, the company's enterprise life-insurance administration platform. My role combined UX design with hands-on front-end work, accessibility, and collaboration with the engineering organization responsible for implementing the product.",
    'LifePRO was already a mature application when I joined the team. It had an established customer base, existing workflows, a substantial Angular application, shared UI components, and years of accumulated front-end decisions. My responsibility was not to replace that system. It was to design and improve the product while working within the architecture that already existed.',
    'Over my tenure, my work increasingly crossed the boundary between traditional UX design and front-end engineering.',
  ],
  sections: [
    {
      heading: 'Joining the LifePRO Team',
      paragraphs: [
        "My initial work centered on understanding LifePRO's existing interface, workflows, component architecture, and development process.",
        'The production application was running Angular 7 and relied on technologies including TypeScript, HTML, Sass/CSS, Bootstrap, and PrimeNG. Design and prototyping work included Figma and Justinmind.',
        'Because my background included both UX and front-end development, I could work beyond static design deliverables. I could inspect the implemented application, identify where behavior differed from design intent, and work with the development organization to determine whether a problem originated in the design, markup, component implementation, or styling architecture.',
        "I worked with LifePRO's distributed development organization, including engineers in Noida, India, translating UX requirements into production behavior and resolving implementation issues as designs moved into the application.",
      ],
    },
    {
      heading: 'Early Accessibility Work',
      paragraphs: [
        'Accessibility problems became apparent very early in my work with LifePRO.',
        "Rather than treating those issues exclusively as isolated defects, I began examining how the application's shared components, generated markup, and styling architecture contributed to repeated accessibility problems.",
        'That work eventually became particularly relevant when LifePRO undertook work associated with VA Section 508 requirements.',
        'Because many interface elements were produced through shared components and common styling, I focused on identifying corrections that could be made systematically rather than applying independent fixes to every consuming screen.',
        "PrimeNG was part of that investigation. Where appropriate, I worked with the component layer and Sass architecture rather than assuming that every accessibility problem should be corrected independently in the application's generated HTML.",
      ],
    },
    {
      heading: 'LifePRO v20 and v21',
      paragraphs: [
        'My UX responsibilities expanded across LifePRO versions 20 and 21.',
        'Across those releases, I designed approximately 40% of the screens and workflows.',
        'The work included translating insurance-product requirements into usable interface behavior, creating and refining interaction designs, and working with development through implementation.',
        'Figma and Justinmind supported design and prototyping, but the work routinely continued beyond the design artifact itself.',
        'Because I understood the underlying Angular application, HTML, CSS/Sass, Bootstrap, and component architecture, I could investigate implementation problems directly and communicate with developers in terms of both intended user behavior and the technical mechanisms producing it.',
        'That became especially useful in a distributed development environment. Rather than limiting review to whether an implemented screen visually matched a design, I could help determine why discrepancies existed and where corrections belonged.',
      ],
    },
    {
      heading: 'Section 508 Remediation',
      paragraphs: [
        'One of the largest accessibility issues I worked on involved a proposed remediation approach that would have affected approximately 1.5 million lines of generated HTML.',
        'I investigated the underlying presentation behavior and determined that the problem could instead be addressed systematically through the styling layer.',
        'I personally developed an approximately 150-line Sass solution that corrected the behavior without requiring the proposed large-scale modification of generated markup.',
        'The implementation substantially reduced the amount of application code implicated in the remediation and avoided introducing a much larger maintenance and regression surface.',
        "That work became representative of my broader approach to LifePRO's front end: when the same problem appeared repeatedly across the application, I looked first for the shared layer responsible for producing it.",
      ],
    },
    {
      heading: 'PrimeNG and Shared UI Behavior',
      paragraphs: [
        "LifePRO's use of PrimeNG meant that shared component behavior could affect many areas of the application.",
        'I worked with the component and styling layers to investigate and address accessibility and presentation problems at their source.',
        'This included working with a local/internal PrimeNG fork or copy where necessary and using Sass capabilities to control shared presentation behavior instead of repeatedly modifying individual consuming screens.',
        'The goal was to preserve reusable component behavior while making the resulting interfaces more accessible and maintainable.',
      ],
    },
    {
      heading: 'Investigating Angular Modernization',
      paragraphs: [
        "LifePRO's production application remained on Angular 7 during my tenure.",
        'To investigate the modernization path directly, I maintained my own fork of LifePRO and upgraded that branch from Angular 7 through Angular 10.',
        'The fork demonstrated that the application could run on the newer Angular framework, but it also exposed dependencies and technical debt surrounding the framework itself.',
        'In particular, the experiment identified issues in the existing Bootstrap/Sass architecture and related front-end dependencies that would require broader remediation before the production application could responsibly follow the same upgrade path.',
        'Those architectural conditions predated my employment.',
        'The production LifePRO application remained on Angular 7 when I left EXL. My Angular 10 fork therefore represented modernization research and working technical evidence, not a production migration.',
      ],
    },
    {
      heading: 'Front-End Architecture and Technical Debt',
      paragraphs: [
        'As my familiarity with LifePRO increased, I identified recurring areas where front-end technical debt affected UX implementation, accessibility, and modernization.',
        'Some could be addressed within normal product development.',
        'Others required architectural changes larger than the scope of an individual feature or release.',
        'Part of my role became distinguishing between those categories: fixing problems immediately when a safe systemic solution existed, documenting or demonstrating larger modernization opportunities when they did not, and avoiding changes that would create more maintenance debt than they removed.',
        'The Angular fork and the Section 508 Sass work represented opposite ends of that spectrum.',
        'The accessibility problem had a practical systemic correction that could be implemented.',
        'The Angular modernization experiment demonstrated a viable framework path but also exposed surrounding architectural work that the production product was not yet positioned to absorb.',
      ],
    },
    {
      heading: 'Cross-Functional and Distributed Collaboration',
      paragraphs: [
        'My LifePRO work involved regular collaboration across design, engineering, product, and leadership.',
        'I worked directly with the Noida development organization during implementation and communicated technical and UX concerns through an enterprise structure that included senior leadership and technical leadership within the broader CTO/CEO organization.',
        'The level of detail changed depending on the audience.',
        'With developers, conversations could involve Angular behavior, markup, Sass, PrimeNG, or implementation details.',
        'With product and leadership, the same issue might need to be explained in terms of user impact, implementation cost, risk, maintainability, or the consequences of accumulated technical debt.',
        'Being able to translate between those perspectives became an important part of the job.',
      ],
    },
    {
      heading: 'State of the Work When I Left',
      paragraphs: [
        "By the end of my tenure at EXL, I had contributed substantially to LifePRO's UX across versions 20 and 21, including approximately 40% of the screens and workflows produced during that period.",
        "I had also contributed directly to accessibility remediation, shared component and styling work, front-end architecture analysis, and investigation of the application's Angular modernization path.",
        'Some of that work shipped directly into the product.',
        'Some demonstrated approaches that could reduce future implementation cost.',
        'Some exposed larger architectural problems that remained unresolved when I left.',
        'LifePRO was still running Angular 7 in production. My Angular 10 fork had demonstrated that the framework itself could move while identifying surrounding Bootstrap, Sass, and front-end architectural debt that would have to be addressed for production modernization.',
        "The product continued to operate in a significant enterprise insurance-software market and was included in Gartner's Magic Quadrant research during this broader period. That recognition belongs to the LifePRO product and organization as a whole; my contribution was the UX, accessibility, and front-end work I performed within the product being developed and evaluated.",
        'My EXL tenure ultimately expanded the way I defined my own role.',
        'I had arrived with a UX-oriented title.',
        'The work increasingly demonstrated that the most useful place for me was between design and engineering—close enough to the user to recognize the experience problem and close enough to the implementation to determine where that problem actually belonged.',
      ],
    },
  ],
  relatedPage: {
    href: '/case-studies/exl',
    label: 'Read the EXL Case Study →',
    kind: 'case-study',
  },
} satisfies CaseStudy;
