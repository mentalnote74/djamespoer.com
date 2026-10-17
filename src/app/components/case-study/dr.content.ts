import { CaseStudy } from './case-study.model';

export const DR_CASE_STUDY = {
  title: 'The 15-Minute Month End',
  subtitle:
    'How a digital-presence job led to eliminating two and a half days of repetitive finance work',
  introduction: [
    "I wasn't hired by Dreyer & Reinbold to redesign a finance process. As Digital Presence Coordinator, I was responsible for an operation that included 11 dealership websites across five automotive brands, vehicle photography, inventory and pricing information, graphics, email campaigns, social media, vendor feeds, and third-party automotive platforms.",
    'That work exposed me to more than the public-facing websites. It also gave me visibility into the systems and processes employees used behind them, including an aging internal intranet. Inside that environment was a month-end finance process that consumed roughly two and a half days every month. Once I understood what people were actually doing during those two and a half days, the problem looked much less like paperwork and much more like software waiting to be written.',
  ],
  sections: [
    {
      heading: 'An Old Application With a Real Job to Do',
      paragraphs: [
        'The internal intranet was a legacy classic-ASP application from the pre-.NET era. Its codebase had accumulated over time, resulting in spaghetti-style ASP and areas where inline escaped C# had been introduced to provide additional UI behavior or logic. It was not an ASP.NET application, and it certainly was not the architecture I would have selected for a new project.',
        'That did not make it disposable. Employees depended on the intranet, and it already contained business behavior that mattered to the organization. Replacing the entire system would have turned a focused operational problem into a much larger software project. The useful challenge was to understand enough of the existing application to improve the workflow safely without pretending that every piece of technical debt had to be eliminated first.',
      ],
    },
    {
      heading: 'The Real Problem Was the Month-End Process',
      paragraphs: [
        'Finance and F&I personnel had to review vehicle sales at month end and determine which transactions qualified for applicable manufacturer or dealership incentive programs. Once the qualifying sales had been identified, the resulting commissions needed to be calculated for individuals and summarized for the organization.',
        'The work was legitimate, but much of it was repetitive. Employees were repeatedly evaluating transactions against a set of rules and then performing calculations based on the results. The complete process took approximately two and a half days.',
        'That distinction was important. The problem was not simply that the company had an old intranet, and it was not that finance needed a more attractive screen. Skilled employees were spending a significant amount of time performing deterministic work that could potentially be expressed as application logic.',
      ],
    },
    {
      heading: 'Separating the Rules From the Repetition',
      paragraphs: [
        "The first challenge was determining which part of the process genuinely required human knowledge and which part could be automated. Incentive programs could change, so simply hard-coding one month's criteria would have created another maintenance problem. The people responsible for the business still needed control over the rules.",
        'The solution was to make the incentive criteria configurable. Once those criteria were defined, the application could apply them consistently to the relevant sales, identify qualifying transactions, and calculate the corresponding commissions. It could then provide both individual and aggregate results without requiring staff to manually repeat the same evaluation across every transaction.',
        'This preserved the important division of responsibility. People still determined the business rules; the software handled the repetitive application of those rules.',
      ],
    },
    {
      heading: 'From Two and a Half Days to 15 Minutes',
      surface: 'feature',
      paragraphs: [
        'The result was straightforward to measure. A month-end process that had previously taken approximately 2.5 days could be completed in about 15 minutes.',
        'The improvement did not come from making finance work disappear. It came from recognizing that two different kinds of work had been mixed together. Understanding and configuring incentive rules required human knowledge of the business. Applying those rules repeatedly across a collection of transactions did not.',
        'Moving the second category into software allowed employees to spend far less time on mechanical processing while retaining control over the decisions that actually required their expertise.',
      ],
    },
    {
      heading: 'Working With the System We Had',
      surface: 'inset',
      paragraphs: [
        'The legacy intranet remained a constraint throughout the work. There was no clean greenfield architecture, and replacing the application was outside the scope of the problem I was trying to solve. That meant understanding existing behavior before modifying it and resisting the temptation to turn every piece of ugly code into a separate modernization project.',
        'Legacy software often contains more institutional knowledge than its architecture suggests. Code that appears awkward may exist because of a business requirement that is no longer documented anywhere else. Changing it safely requires understanding what it does before deciding what it should become.',
        'For this project, the correct decision was to improve the business process inside the environment Dreyer & Reinbold already used. The value came from solving the operational problem, not from being able to claim that I had rewritten the intranet.',
      ],
    },
    {
      heading: 'The Tool Kept Doing Its Job',
      paragraphs: [
        'More than a decade after developing the finance functionality, I learned that the tool was still being used.',
        'Longevity by itself does not make old software good. Applications should be replaced when their costs, risks, or limitations justify replacement. In this case, though, continued use provided useful evidence about the original solution: the tool had fit the workflow well enough to remain valuable long after I had left the company.',
        'That is particularly meaningful for an internal application. Nobody keeps using an internal finance tool because it makes an impressive portfolio piece. They use it because it continues to help them complete their work.',
      ],
    },
    {
      heading: 'The Broader Job Never Stopped',
      paragraphs: [
        'The finance project happened within a much larger role. I still had 11 dealership websites across five brands to support, along with vehicle photography, inventory, pricing, promotions, graphics, Constant Contact, VinSolutions, TrueCar, Edmunds, Cars.com, social channels, vendor feeds, and intern support.',
        "That context is important because this was not a dedicated innovation project created around a predetermined software idea. The opportunity came from being close enough to the organization's day-to-day digital operation to notice a recurring problem and having enough development experience to recognize that part of the process could be automated.",
        'The project started with observing work, not searching for somewhere to use a particular technology.',
      ],
    },
    {
      heading: 'What Worked',
      paragraphs: [
        'The strongest decision was defining the problem narrowly. We did not need to modernize the entire intranet to improve month-end finance processing. We needed to understand the incentive rules, make the changing criteria configurable, identify qualifying sales consistently, calculate the resulting commissions, and provide the individual and aggregate information the business needed.',
        'That focus allowed a useful solution to be built inside an imperfect existing environment. The measurable improvement—from roughly two and a half days to approximately 15 minutes—came from automating the repetitive portion of the workflow without taking control of the business rules away from the people who understood them.',
      ],
    },
    {
      heading: "What Didn't Change",
      paragraphs: [
        'The project did not eliminate the technical debt in the inherited intranet. The application remained a legacy classic-ASP system, and portions of the codebase remained more difficult to maintain than a modern application would have been.',
        'That was acceptable because eliminating all of the surrounding technical debt was not necessary to solve the problem at hand. A complete rewrite would have increased scope dramatically without being required to deliver the operational improvement. The project therefore left some architectural problems in place while solving the business problem that justified the work.',
      ],
    },
    {
      heading: 'How I Navigated It',
      paragraphs: [
        'The approach was pragmatic: understand the employee workflow before touching the software, identify which steps depended on human judgment, isolate the repetitive rules that could be expressed deterministically, and build the automation inside the system the organization already depended upon.',
        'The legacy application was treated as a constraint rather than as the objective. I needed to understand it well enough to preserve existing behavior, but I did not need to transform the entire intranet before delivering value. That distinction kept the work focused on the people losing two and a half days each month rather than on the technology I might have preferred to use.',
      ],
    },
    {
      heading: 'What I Took From It',
      paragraphs: [
        'Dreyer & Reinbold expanded my definition of user experience. The user was not always a customer researching a vehicle on a dealership website. Sometimes the user was an employee trying to finish month-end commission processing, and their experience problem was not navigation, typography, or visual design. It was losing two and a half days to repetitive work.',
        'Solving that problem required the same underlying discipline I would later apply to more conventional UX and front-end work: understand what the person is trying to accomplish, identify the friction, determine where the problem actually belongs, and choose an intervention appropriate to the system and constraints.',
        'In this case, the answer was a relatively small piece of software inside an aging intranet. It did not replace the platform or eliminate every piece of technical debt around it. It simply took a recurring process that consumed roughly two and a half days and reduced it to about 15 minutes.',
        'More than a decade later, it was still doing the job.',
      ],
    },
  ],
  relatedPage: {
    href: '/work/dr',
    label: '← View Dreyer & Reinbold Work History',
    kind: 'work',
  },
} satisfies CaseStudy;
