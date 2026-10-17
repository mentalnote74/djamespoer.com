import { CaseStudy } from './case-study.model';

export const DR_WORK_HISTORY = {
  title: 'Dreyer & Reinbold',
  subtitle: 'Digital Presence Coordinator · September 2011 – May 2015',
  introduction: [
    "I joined Dreyer & Reinbold in September 2011 as Digital Presence Coordinator, supporting the online presence of a multi-location automotive dealership organization representing five automotive brands. Over the next several years, my responsibilities covered 11 dealership websites as well as the systems, vendors, content, photography, inventory data, marketing tools, and internal applications that supported the company's digital operation.",
    "The position began primarily around the public-facing dealership presence, but my development background allowed me to take on technical problems that extended beyond website maintenance. By the time I left in May 2015, my work ranged from vehicle photography and digital marketing to vendor integrations and development within Dreyer & Reinbold's legacy internal intranet.",
  ],
  sections: [
    {
      heading: 'Managing the Dealership Web Presence',
      paragraphs: [
        'Supporting 11 dealership websites was an ongoing operational responsibility rather than an occasional publishing assignment. Vehicle inventory changed continuously, pricing and promotions changed, manufacturer programs expired or were replaced, and each dealership had its own content needs while remaining part of the larger Dreyer & Reinbold organization.',
        'I maintained and updated dealership content, supported promotions, and helped keep information accurate across the web presence. Because automotive retail changes quickly, much of the work involved understanding which information was current, where it originated, and how quickly a change needed to reach the public-facing sites.',
      ],
    },
    {
      heading: 'Inventory, Photography, and Vehicle Content',
      paragraphs: [
        'Vehicle inventory was one of the most important parts of the online customer experience. Customers increasingly researched vehicles before visiting a dealership, making accurate inventory information and useful photography an important part of the sales process.',
        'I worked with vehicle photography and the presentation of inventory across the dealership sites. That included producing and managing imagery and supporting the content associated with individual vehicles. Inventory data also passed through external systems and vendor feeds, so an incorrect result on a dealership website did not necessarily originate on that website. Part of maintaining the digital presence was understanding those relationships well enough to identify where a correction actually belonged.',
      ],
    },
    {
      heading: 'Vendors and Automotive Platforms',
      paragraphs: [
        'My responsibilities crossed a number of third-party automotive and marketing systems, including VinSolutions, TrueCar, Edmunds, Cars.com, Constant Contact, and other vendors supporting inventory, leads, marketing, and dealership visibility.',
        'Working across those services required coordinating information rather than treating each website as an isolated property. Inventory, pricing, promotions, and other dealership information could originate in one system and surface through several others. When something was incorrect, I needed to understand which system owned the information and how it propagated through the rest of the digital operation.',
      ],
    },
    {
      heading: 'Marketing, Graphics, and Social Media',
      paragraphs: [
        'The Digital Presence Coordinator role also included email marketing, social media, promotional graphics, and other digital content. I supported campaigns through Constant Contact and produced graphics and content for dealership promotions while balancing manufacturer requirements with the individual needs of the stores.',
        'Some of that work followed planned campaigns, while other requests were driven by the pace of automotive retail: new inventory, pricing changes, manufacturer incentives, or dealership promotions that needed to appear online quickly. My combination of design and web-development experience allowed me to create assets while also understanding how they would ultimately behave in the systems where they were published.',
      ],
    },
    {
      heading: 'Coordinating the Work',
      paragraphs: [
        'As the scope of the digital operation grew, I supervised intern support for portions of the recurring production work. Delegating those tasks required turning work I had previously handled myself into repeatable processes another person could execute consistently.',
        'That helped maintain coverage across the dealership sites while giving me more time to address technical issues, vendor problems, and internal development work. It was also an early opportunity to move from simply completing digital tasks to defining how those tasks should be performed.',
      ],
    },
    {
      heading: 'Working With the Internal Intranet',
      paragraphs: [
        'Dreyer & Reinbold also maintained an internal web application that predated modern .NET development. The intranet was a legacy classic ASP application with a codebase that had accumulated functionality over time. I inherited spaghetti-style ASP and areas where inline escaped C# had been introduced when additional UI behavior or logic was needed.',
        'This was not an ASP.NET application. The distinction matters because my work involved improving an existing pre-.NET system rather than developing against a modern ASP.NET architecture. Replacing the intranet was not the assignment, so new functionality had to coexist with the existing application and the business processes employees already depended upon.',
      ],
    },
    {
      heading: 'Finance and Commission Processing',
      paragraphs: [
        'One of the most significant internal improvements came from work with the finance and F&I operation. At month end, personnel had to determine which vehicle sales qualified for manufacturer or dealership incentive programs and then calculate the resulting commissions. The existing process required roughly two and a half days of manual work each month.',
        "I developed functionality within the existing intranet that allowed incentive criteria to be configured, identified sales that qualified under those criteria, and generated the individual and aggregate commission information required by the business. Instead of manually repeating the same qualification and calculation process across the month's transactions, the staff could define the applicable rules and allow the application to perform the repeatable portion of the work.",
        'The resulting workflow reduced a process that had taken approximately 2.5 days to about 15 minutes.',
      ],
    },
    {
      heading: 'A Durable Internal Tool',
      paragraphs: [
        'The finance application was not the most publicly visible work I did at Dreyer & Reinbold, but it produced one of the clearest operational outcomes. More than a decade after I originally developed the functionality, I learned that the tool was still being used.',
        "That longevity is meaningful because internal software survives only while it continues to serve the people who rely on it. The application had been built inside a legacy environment, but it solved a recurring business problem effectively enough to remain part of the organization's workflow years after my involvement ended.",
      ],
    },
    {
      heading: 'State of the Work When I Left',
      paragraphs: [
        'By the time I left Dreyer & Reinbold in May 2015, my responsibilities had expanded well beyond maintaining dealership websites. I had supported 11 sites across five automotive brands and worked with vehicle photography, inventory, pricing, graphics, email marketing, social media, vendor feeds, and third-party automotive platforms. I had also supervised support for recurring digital work and used my development background to improve internal business applications.',
        "The finance and commission tool became the clearest example of the latter. By understanding the existing month-end process and implementing its repeatable rules inside the company's classic-ASP intranet, I reduced approximately two and a half days of manual work to about 15 minutes.",
        'Dreyer & Reinbold broadened my understanding of digital experience beyond public websites. Customer-facing interfaces mattered, but so did the tools employees used to run the business behind them. That connection between user needs, business processes, and implementation became increasingly central to the work I pursued afterward.',
      ],
    },
  ],
  relatedPage: {
    href: '/case-studies/dr',
    label: 'Read the Dreyer & Reinbold Case Study →',
    kind: 'case-study',
  },
} satisfies CaseStudy;
