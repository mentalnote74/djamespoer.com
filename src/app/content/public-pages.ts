export interface ArticleSummary {
  slug: string;
  title: string;
  dek: string;
  publishedDate: string;
  modifiedDate: string;
}

// Summaries only: the full articles are loaded by their individual lazy routes.
export const ARTICLES: readonly ArticleSummary[] = [
  {
    slug: 'how-do-i-make-it-to-the-top-of-the-stack',
    title: 'How Do I Make It to the Top of the Stack?',
    dek: 'In a remote job market flooded with applications and increasingly mediated by AI, a better résumé may not be enough. The problem is signal.',
    publishedDate: '2026-10-22',
    modifiedDate: '2026-10-22',
  },
  {
    slug: 'honey-should-i-add-bot-herder-to-my-resume',
    title: 'Honey?! Should I Add Bot Herder to My Résumé?',
    dek: 'At some point, “I use AI” stops describing a tool and starts describing an operating model.',
    publishedDate: '2026-10-22',
    modifiedDate: '2026-10-22',
  },
  {
    slug: 'like-a-big-dumb-bass',
    title: 'Like a Big Dumb Bass',
    dek: 'Attention is not the same thing as trust. But nobody gets to the trust part if you never get them to look.',
    publishedDate: '2026-10-22',
    modifiedDate: '2026-10-22',
  },
];

/** Published public content only. Shared by routing, prerendering and the sitemap. */
export const SITE_ORIGIN = 'https://djamespoer.com';
export const PROFESSIONAL_NAME = 'D. James Poer';
export const PROFESSIONAL_ROLE = 'Senior UX Engineer and Front-End Architect';
export const PUBLIC_PROFILES = [
  'https://www.linkedin.com/in/djamespoer',
  'https://github.com/mentalnote74',
];

export interface PublicPage {
  path: string;
  title: string;
  description: string;
  kind?: 'profile' | 'work' | 'article';
  lastModified?: string;
  article?: ArticleSummary;
}

export const PUBLIC_PAGES: readonly PublicPage[] = [
  {
    path: '',
    title: 'D. James Poer | Senior UX Engineer & Front-End Architect',
    description:
      'D. James Poer builds Angular and TypeScript interfaces for enterprise applications, combining UX engineering, design engineering, accessibility, WCAG and Section 508 experience.',
  },
  {
    path: 'about',
    title: 'About D. James Poer | UX Engineering & Front-End Architecture',
    description:
      'Meet D. James Poer: Senior UX Engineer and Front-End Architect working across design, Angular development, accessibility and product thinking.',
    kind: 'profile',
  },
  {
    path: 'engineering',
    title: 'Angular & TypeScript Front-End Engineering | D. James Poer',
    description:
      'Front-end architecture in practice: D. James Poer’s Angular components, TypeScript, semantic HTML, Sass, testing, performance and production delivery.',
  },
  {
    path: 'ux-product',
    title: 'UX Research & Product Engineering | D. James Poer',
    description:
      'D. James Poer connects user research, collaborative usability testing, workflow design and front-end implementation in enterprise applications.',
  },
  {
    path: 'accessibility',
    title: 'WCAG & Section 508 Accessibility Engineering | D. James Poer',
    description:
      'Accessibility engineering evidence from D. James Poer: semantic HTML, WCAG, Section 508, reusable components, systemic Sass solutions and human validation.',
  },
  {
    path: 'ai',
    title: 'Human-in-the-Loop AI Product Development | D. James Poer',
    description:
      'D. James Poer’s human-directed AI development model: agent orchestration, evidence-backed career tooling, product judgment, testing and production verification.',
  },
  {
    path: 'creative',
    title: 'Creative Design & Front-End Craft | D. James Poer',
    description:
      'Explore D. James Poer’s creative practice through visual design, interaction, illustrated portfolio concepts, experimentation and production craft.',
  },
  {
    path: 'impact',
    title: 'UX & Engineering Outcomes | D. James Poer',
    description:
      'Career evidence of D. James Poer’s operational improvements, research-informed products, predictable workflows and systemic accessibility solutions.',
  },
  {
    path: 'work/djamespoer',
    title: 'Building djamespoer.com: Angular Portfolio Case Study | D. James Poer',
    description:
      'The portfolio is the proof: D. James Poer’s Angular architecture, accessibility, AI-assisted development, performance measurement and continuous delivery in a live product.',
    kind: 'work',
  },
  {
    path: 'work/exl',
    title: 'EXL / LifePRO Work History: UX & Accessibility | D. James Poer',
    description:
      'D. James Poer’s EXL / LifePRO work: Senior Web Designer, enterprise UX, Section 508 accessibility, reusable Sass and Angular modernization, October 2019–April 2023.',
    kind: 'work',
  },
  {
    path: 'work/ips',
    title: 'IPS / PowerSchool Work History | D. James Poer',
    description:
      'D. James Poer’s UI Developer work at Indianapolis Public Schools, August–October 2019: PowerSchool workflow rules with JavaScript, jQuery, HTML and CSS.',
    kind: 'work',
  },
  {
    path: 'work/tcc',
    title: 'TCC Work History: UX Research & Angular Development | D. James Poer',
    description:
      'D. James Poer’s TCC experience, May 2015–June 2019: collaborative usability research, Oregon / Ascend, enterprise workflows, e-tcc.com and Vertex Angular development.',
    kind: 'work',
  },
  {
    path: 'work/dr',
    title: 'Dreyer & Reinbold Work History | D. James Poer',
    description:
      'D. James Poer’s Dreyer & Reinbold work, September 2011–May 2015: dealership websites, vehicle photography, vendor integrations and a classic-ASP intranet.',
    kind: 'work',
  },
  {
    path: 'case-studies/exl',
    title: 'LifePRO Accessibility & Angular Modernization Case Study | D. James Poer',
    description:
      'How D. James Poer addressed LifePRO’s systemic accessibility problem with reusable Sass and explored Angular modernization in a personal product fork.',
    kind: 'work',
  },
  {
    path: 'case-studies/ips',
    title: 'PowerSchool Business-Rule UX Case Study | D. James Poer',
    description:
      'How D. James Poer translated district policy into predictable PowerSchool validation and dependent workflow behavior with Indianapolis Public Schools leadership.',
    kind: 'work',
  },
  {
    path: 'case-studies/tcc',
    title: 'Oregon / Ascend Usability Research Case Study | D. James Poer',
    description:
      'How observing Oregon users and collaborative usability testing shaped Ascend, connecting research, business analysis and front-end engineering at TCC.',
    kind: 'work',
  },
  {
    path: 'case-studies/dr',
    title: 'The 15-Minute Month End: Classic ASP Case Study | D. James Poer',
    description:
      'D. James Poer’s Dreyer & Reinbold case study: configurable incentive rules and commission processing within an existing pre-.NET classic-ASP intranet.',
    kind: 'work',
  },
  {
    path: 'thingamajob',
    title: 'Thingamajob: Evidence-Backed Career Tool Prototype | D. James Poer',
    description:
      'Explore D. James Poer’s unfinished Thingamajob prototype: canonical career evidence, human judgment and job-description evaluation with honest qualification boundaries.',
    kind: 'work',
  },
  {
    path: 'buildometer',
    title: 'Buildometer: Evidence-Backed Project Delivery | D. James Poer',
    description:
      'Measure the live djamespoer.com project: known scope, shipped story points, estimated completion, historical throughput and bug lifecycle, with explicit measurement limits.',
    kind: 'work',
  },
  {
    path: 'product-journal',
    title: 'Product Journal & Daily Scrum History | D. James Poer',
    description:
      'Dated development notes from building djamespoer.com: work completed, current priorities, impediments and project evidence preserved in the Daily Scrum journal.',
  },
  {
    path: 'cookie-policy',
    title: 'Cookie Policy | D. James Poer',
    description:
      'How djamespoer.com stores playful cookie preferences, how long they last, how to change them and how they remain separate from Google Analytics.',
  },
  {
    path: 'blognostisphere',
    title: 'Blognostisphere | D. James Poer',
    description:
      'Original articles on UX, front-end engineering and AI, written under D. James Poer’s direction as Blognosticator and grounded in building djamespoer.com.',
    lastModified: '2026-10-22',
  },
  ...ARTICLES.map((article): PublicPage => ({
    path: `blognostisphere/${article.slug}`,
    title: `${article.title} | Blognostisphere`,
    description: article.dek,
    kind: 'article',
    lastModified: article.modifiedDate,
    article,
  })),
];

export function publicPageForPath(path: string): PublicPage | undefined {
  const normalized = path
    .split(/[?#]/)[0]
    .replace(/;[^/]*/g, '')
    .replace(/^\/+|\/+$/g, '');
  const page = PUBLIC_PAGES.find((entry) => entry.path === normalized);
  if (page) return page;
  const date = /^product-journal\/(\d{4}-\d{2}-\d{2})$/.exec(normalized)?.[1];
  if (date && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().startsWith(date)) {
    return {
      path: normalized,
      title: `Daily Scrum ${date} | D. James Poer Product Journal`,
      description: `The ${date} djamespoer.com development journal: completed work, current priorities and impediments recorded in that day’s Scrum brief.`,
    };
  }
  return undefined;
}

export function structuredDataForPage(page: PublicPage): Record<string, unknown> {
  const url = `${SITE_ORIGIN}/${page.path}`;
  const person = { '@id': `${SITE_ORIGIN}/#person` };
  const website = { '@id': `${SITE_ORIGIN}/#website` };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        ...person,
        '@type': 'Person',
        name: PROFESSIONAL_NAME,
        url: `${SITE_ORIGIN}/about`,
        jobTitle: PROFESSIONAL_ROLE,
        sameAs: PUBLIC_PROFILES,
        ...(page.article ? { alternateName: 'Blognosticator' } : {}),
      },
      {
        ...website,
        '@type': 'WebSite',
        name: 'djamespoer.com',
        url: `${SITE_ORIGIN}/`,
        creator: person,
      },
      {
        '@type': page.kind === 'profile' ? 'ProfilePage' : 'WebPage',
        '@id': `${url}#page`,
        url,
        name: page.title,
        description: page.description,
        isPartOf: website,
        ...(page.kind === 'profile' ? { mainEntity: person } : { about: person }),
        ...(page.kind === 'work'
          ? {
              mainEntity: {
                '@type': 'CreativeWork',
                '@id': `${url}#work`,
                name: page.title,
                url,
                author: person,
                description: page.description,
              },
            }
          : {}),
        ...(page.article
          ? {
              mainEntity: {
                '@type': 'BlogPosting',
                '@id': `${url}#article`,
                headline: page.article.title,
                description: page.article.dek,
                url,
                author: person,
                publisher: person,
                datePublished: page.article.publishedDate,
                dateModified: page.article.modifiedDate,
                mainEntityOfPage: { '@id': `${url}#page` },
                isPartOf: website,
              },
            }
          : {}),
      },
    ],
  };
}
