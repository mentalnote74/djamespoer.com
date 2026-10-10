import { CaseStudy } from '../case-study/case-study.model';

export const UX_PRODUCT_CONTENT: CaseStudy = {
  title: 'UX & Product',
  introduction: 'UX Designer / Product & Project Lead',
  sections: [
    {
      heading: 'Start With The Problem',
      paragraphs: [
        'Good product work does not begin with a component library, a wireframe, or a preferred technology.',
        'It begins by understanding the problem.',
        'Who needs this? What are they trying to accomplish? What information do they need? What is getting in their way? What does success look like for the user and for the organization?',
        'Those questions have shaped my work from early usability studies through enterprise application design and into djamespoer.com.',
        'The deliverable may eventually be an interface, but the work begins before the interface exists.',
      ],
    },
    {
      heading: 'Understand The People Using It',
      paragraphs: [
        'Users rarely experience software the way the people building it imagine they will.',
        'That is why direct observation matters.',
        'At TCC, Business Analyst Annie Rayhill and I conducted approximately 30 usability sessions with users in Oregon. We simultaneously moderated separate sessions, testing A and B versions of an interface while two senior client participants recorded observations using deliberately simple forms.',
        'Both of us moderated both versions.',
        'The result was particularly useful because neither design won.',
        'What emerged from the research was a hybrid that incorporated what users responded to successfully in each version.',
        'That experience reinforced something I have carried into every product since: the objective of research is not to prove that the design team was right. It is to discover what the product needs to become.',
      ],
    },
    {
      heading: "We'Re Testing The System, Not The User",
      paragraphs: [
        'Usability testing can become distorted the moment participants believe they are the ones being evaluated.',
        'I addressed that directly:',
        "“We're not testing you. You're testing our system. And the only right answers are what you honestly think and feel.”",
        'That distinction changes the relationship.',
        "The participant does not need to impress the moderator, understand the application's internal logic, or guess what the designer intended.",
        'The system has to make sense to them.',
        'When it does not, that is information about the system.',
      ],
    },
    {
      heading: 'Business Rules And User Needs Are The Same Product',
      paragraphs: [
        'At TCC, the relationship between Business Analysis and UX became especially important.',
        'I came to describe the two disciplines as opposite ends of the same rope.',
        'The Business Analyst understands what the organization and system must accomplish. UX understands what the person using that system needs in order to accomplish it.',
        'Neither end can simply drag the other behind it.',
        'The product exists where those requirements meet.',
        'That collaboration influenced how requirements, workflows, interaction decisions, and implementation moved through the development process rather than treating UX as a design phase handed to engineering after the important decisions had already been made.',
      ],
    },
    {
      heading: 'Turn Complexity Into Interface Behavior',
      paragraphs: [
        'The Indianapolis Public Schools project demonstrates the same principle from another direction.',
        "The State of Indiana's reporting requirements contained dependencies that were too complicated for a static PowerSchool form.",
        "A user's answer could make other fields required. Combinations of answers could introduce additional requirements. Changing an earlier selection could invalidate information already entered elsewhere.",
        'The person completing the form should not have to memorize that rule system.',
        'I worked directly with district leadership to understand those requirements and translated them into dynamic interface behavior.',
        'The product carried the complexity.',
        'Fields became required when appropriate. Indicators changed. Related information was grouped together. Inline messages explained what was needed. Invalid dependent values could be reset. Invalid combinations could not be submitted.',
        'That is both a UX decision and a product decision: when the system already knows the rule, do not make the user remember it.',
      ],
    },
    {
      heading: 'Design For The Actual Workflow',
      paragraphs: [
        'Interfaces do not exist independently from the work people are trying to perform.',
        'At Dreyer & Reinbold, the problem was a monthly operational process. Changing sales incentives meant a finance manager had to repeatedly search sales information for 14 salespeople in order to calculate commissions.',
        'The solution was not simply a prettier screen.',
        'I built a configurable workflow that allowed the current incentives to be represented in the system, produced individual salesperson reports, and provided an aggregate management view.',
        'More than a decade after I left, that functionality was still being used at month end.',
        'Longevity is not automatically proof of good UX, but it demonstrates something important about product design: solving the right operational problem can create value long after the original implementation is forgotten.',
      ],
    },
    {
      heading: 'Prioritize What Matters',
      paragraphs: [
        'Product development always contains more possible work than available time.',
        'djamespoer.com is intentionally managed that way.',
        'Ideas become backlog items. Requirements and acceptance criteria are captured. Work is prioritized. Features are implemented in small increments, tested, deployed, evaluated, and revised.',
        'Not everything interesting belongs in the current release.',
        'That distinction matters.',
        'The site has accumulated ideas for additional interactions, tooling, content, automation, themes, and experiments. Some have shipped. Some belong in later phases. Some may never justify their cost.',
        'Product judgment includes deciding what not to build yet.',
      ],
    },
    {
      heading: 'Design Systems Should Reduce Decisions, Not Creativity',
      paragraphs: [
        'Reusable patterns create consistency and reduce the number of decisions that need to be solved repeatedly.',
        'The employment-history case studies share structure because readers should not have to relearn the interface every time they move to another employer.',
        'The Perspective pages share architecture for the same reason.',
        'But consistency does not require sameness.',
        'The system should standardize the things users benefit from being predictable while leaving room for content, imagery, storytelling, and interaction to express the thing being communicated.',
        'A design system should remove unnecessary decisions so the important ones receive more attention.',
      ],
    },
    {
      heading: 'Accessibility Belongs In Product Decisions',
      paragraphs: [
        'Accessibility is often discussed as an implementation concern, but many accessibility failures begin earlier.',
        'Information architecture, interaction patterns, content structure, error behavior, visual hierarchy, responsive decisions, and component selection can create accessibility problems before a developer writes the final markup.',
        'That makes accessibility part of product definition and UX design.',
        'The question is not merely whether the completed interface passes an automated audit.',
        'The question is whether the experience was conceived in a way that allows different people, devices, and modes of interaction to use it successfully.',
      ],
    },
    {
      heading: 'Measure, Observe, Adjust',
      paragraphs: [
        'Analytics and automated scores can tell us important things, but they cannot tell us everything.',
        'Lighthouse can measure performance characteristics. axe can identify classes of accessibility problems. Automated tests can confirm expected application behavior. Analytics can reveal how people move through a product.',
        'None of them can independently determine whether the product makes sense.',
        'That requires combining quantitative evidence with observation, judgment, and feedback from actual use.',
        'The grid problem discovered on a real phone while building this site is a good example. The application could be technically correct while the resulting presentation was difficult for a human to interpret.',
        'The fix came from seeing the experience as a person saw it, not merely as the DOM or automated tooling understood it.',
      ],
    },
    {
      heading: 'Product Work Is Iterative',
      paragraphs: [
        'The current djamespoer.com homepage is intentionally transitional.',
        'During active construction, it communicates that the product is being built and exposes some of the evidence of that process. Once the substantive content is complete, that presentation no longer serves the same purpose.',
        'The planned next phase changes the emphasis.',
        "The Perspective system becomes the primary entry point, moving the product from “watch me build it” toward “here's how I think.”",
        'That is not merely a visual redesign.',
        'The product changed, so the interface should change with it.',
      ],
    },
    {
      heading: 'What This Perspective Demonstrates',
      paragraphs: [
        'My UX and product work sits between people, business requirements, technology, and delivery.',
        'I research before assuming. I translate complicated rules into understandable behavior. I use evidence to challenge design decisions, including my own. I build reusable systems without allowing the system to erase the identity of the product. I prioritize what needs to ship now while preserving what belongs next.',
        'Most importantly, I treat UX, product, and engineering as parts of the same problem rather than sequential departments passing artifacts across a wall.',
        'The goal is not to produce screens.',
        'The goal is to make the product work for the people who need it.',
      ],
    },
    {
      heading: 'Practices',
      paragraphs: [
        'User Research · Usability Testing · Product Strategy · Requirements Analysis · Information Architecture · Interaction Design · Responsive UX · Workflow Design · Prototyping · Design Systems · Accessibility · Business Analysis Collaboration · Backlog Management · Prioritization · Acceptance Criteria · Agile/Scrum · Analytics · Iterative Design · Cross-Functional Leadership · Production Validation',
      ],
    },
  ],
};
