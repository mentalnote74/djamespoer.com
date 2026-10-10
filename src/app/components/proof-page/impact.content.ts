import { CaseStudy } from '../case-study/case-study.model';

export const IMPACT_CONTENT: CaseStudy = {
  title: 'Impact',
  sections: [
    {
      heading: 'Leave something better behind',
      paragraphs: [
        "Impact isn't the work itself. It's what changes because of the work.",
        'Sometimes impact lasts for years. Sometimes it changes what gets built. Sometimes it makes complicated work easier. Sometimes it prevents unnecessary work from happening at all.',
      ],
    },
    {
      heading: 'Sometimes impact just keeps working',
      paragraphs: [
        'At Dreyer & Reinbold, James inherited a spaghetti codebase dating back to 2005. In 2013, he found ways to fix existing problems and extend it with new features that met real business and user needs.',
        'One improvement automated a month-end accounting process that required an F&I manager to spend roughly two days every month doing tedious manual work. James reduced it to about 15 minutes of guided, push-the-button-for-the-next-step work.',
        "More than twelve years later, they're still using it.",
        "That's two days of tedious work they don't have to do, every month, year after year.",
        "It isn't the prettiest code James has ever written. It doesn't need to be.",
        "“It solved the problem then. It still solves the problem today. That's impact.”",
      ],
    },
    {
      heading: 'Sometimes impact changes what gets built',
      paragraphs: [
        "At TCC Software Solutions, we went to Oregon and put competing ideas in front of the people who would actually use them. Across roughly 30 A/B usability sessions, we watched people work through both approaches and learned where our assumptions matched their needs—and where they didn't.",
        "What we learned influenced Ascend, TCC's commercial product, and Oregon became its first client.",
        "“The people using the product changed what we built. That's the point.”",
        "But James's impact at TCC wasn't limited to the products he worked on.",
        "He also made a habit of bringing people together. He'd arrange lunches and introductions between people he thought might be able to do something with TCC, for TCC, or simply with each other. It wasn't part of his job. He was looking for combinations of people, ideas, and opportunities that might create something none of them could create alone.",
        "Not every introduction becomes an opportunity. Not every opportunity becomes a deal. Making the introduction doesn't make the outcome his.",
        'Sometimes impact is simply putting the right people at the same table and seeing if they can make fire.',
        'Some of those professional relationships lasted far longer than his time at TCC did.',
        "“Products aren't the only things you leave behind.”",
      ],
    },
    {
      heading: 'Sometimes impact makes the complicated easier',
      paragraphs: [
        'James translated Indianapolis Public Schools discipline/reporting requirements into usable behavior inside PowerSchool: form behavior, conditional validation, and business rules where the work actually happened.',
        'Complicated requirements became easier for the person doing the job. The rules belonged in the workflow instead of making the user carry all of that complexity themselves.',
      ],
    },
    {
      heading: "Sometimes impact is what you don't build",
      paragraphs: [
        'At EXL, the application had substantial underlying HTML and technical debt. That technical debt remained legitimate technical debt.',
        'But the immediate Section 508 accessibility problem did not require rewriting roughly 1.5 million lines of generated HTML. James identified a systemic presentation-layer solution requiring roughly 150 lines of Sass.',
        "A tremendous amount of work didn't need to happen.",
        'Knowing what not to build can be as valuable as knowing how to build it.',
      ],
    },
    {
      heading: 'What changes because of the work',
      paragraphs: [
        'At Dreyer & Reinbold, a solution continues giving someone roughly two days back every month. At TCC, research changed a product, and bringing people together created opportunities and relationships beyond the product itself. At IPS, complex business requirements became usable workflow behavior. At EXL, a massive amount of unnecessary remediation work was avoided by identifying the actual problem.',
        "The problem doesn't care whether the solution belongs to UX, design, engineering, accessibility, research, or product.",
        "James wants to understand what's actually getting in someone's way, find the leverage, and make it better.",
        'Sometimes the result is visible immediately. Sometimes its value becomes clearer years later when someone is still using the thing.',
        'Do work that matters today.',
        'Build it well enough to matter tomorrow.',
        'Leave something better behind.',
      ],
    },
  ],
};
