import { Route, Routes } from '@angular/router';
import { PUBLIC_PAGES } from './content/public-pages';
import { ARTICLES } from './content/articles';
import { destinationSlides } from './content/portfolio-slides';
import { NOT_FOUND } from './content/not-found';

const loadProofPage = () =>
  import('./components/proof-page/proof-page').then(({ ProofPage }) => ProofPage);

const createProofRoute = (path: string, heading: string): Route => ({
  path,
  title: `${heading} | D. James Poer`,
  data: {
    heading,
    description: `${heading} proof-of-value page for D. James Poer. Portfolio evidence will be added in a future content phase.`,
    ...(path === 'creative'
      ? {
          description:
            'Creative perspective: concept development, visual design, interaction, experimentation and production discipline.',
          artwork: {
            src: '/assets/perspectives/creative-2172.webp',
            srcset:
              '/assets/perspectives/creative-600.webp 600w, /assets/perspectives/creative-1200.webp 1200w, /assets/perspectives/creative-1800.webp 1800w, /assets/perspectives/creative-2172.webp 2172w',
            sizes: '(min-width: 1344px) 1280px, calc(100vw - clamp(1rem, 4vw, 2rem) * 2)',
            alt: 'A densely illustrated town of interconnected autobiographical scenes and visual Easter eggs.',
            width: 2172,
            height: 724,
          },
        }
      : {}),
  },
  ...(path === 'engineering'
    ? {
        data: {
          heading,
          composition: 'engineering',
          description:
            'Engineering perspective: Angular architecture, reusable components, accessibility, testing, performance and production delivery.',
        },
        resolve: {
          content: () =>
            import('./components/proof-page/engineering.content').then(
              ({ ENGINEERING_CONTENT }) => ENGINEERING_CONTENT,
            ),
        },
      }
    : {}),
  ...(path === 'ux-product'
    ? {
        data: {
          heading,
          composition: 'ux',
          description:
            'UX & Product perspective: user research, usability testing, workflow design, accessibility and iterative product delivery.',
        },
        resolve: {
          content: () =>
            import('./components/proof-page/ux-product.content').then(
              ({ UX_PRODUCT_CONTENT }) => UX_PRODUCT_CONTENT,
            ),
        },
      }
    : {}),
  ...(path === 'accessibility'
    ? {
        data: {
          heading,
          composition: 'accessibility',
          description:
            'Accessibility perspective: semantic HTML, Section 508, WCAG, reusable component architecture and human validation.',
        },
        resolve: {
          content: () =>
            import('./components/proof-page/accessibility.content').then(
              ({ ACCESSIBILITY_CONTENT }) => ACCESSIBILITY_CONTENT,
            ),
        },
      }
    : {}),
  ...(path === 'ai'
    ? {
        data: {
          heading,
          composition: 'ai',
          description:
            'AI & Innovation perspective: agent orchestration, human-directed product development, evidence and production verification.',
        },
        resolve: {
          content: () =>
            import('./components/proof-page/ai.content').then(({ AI_CONTENT }) => AI_CONTENT),
        },
      }
    : {}),
  ...(path === 'creative'
    ? {
        resolve: {
          content: () =>
            import('./components/proof-page/creative.content').then(
              ({ CREATIVE_CONTENT }) => CREATIVE_CONTENT,
            ),
        },
      }
    : {}),
  ...(path === 'impact'
    ? {
        data: {
          heading,
          composition: 'impact',
          description:
            'Impact perspective: lasting operational improvements, research-informed products, usable workflows and systemic accessibility solutions.',
        },
        resolve: {
          content: () =>
            import('./components/proof-page/impact.content').then(
              ({ IMPACT_CONTENT }) => IMPACT_CONTENT,
            ),
        },
      }
    : {}),
  loadComponent: loadProofPage,
});

export const interiorRoutes: Routes = [
  {
    path: 'blognostisphere',
    loadComponent: () =>
      import('./components/article-index/article-index').then(({ ArticleIndex }) => ArticleIndex),
  },
  ...ARTICLES.map((article): Route => ({
    path: `blognostisphere/${article.slug}`,
    resolve: {
      article: () =>
        article.slug === ARTICLES[0].slug
          ? import('./components/article/top-of-the-stack.content').then(({ ARTICLE }) => ARTICLE)
          : article.slug === ARTICLES[1].slug
            ? import('./components/article/bot-herder.content').then(({ ARTICLE }) => ARTICLE)
            : article.slug === ARTICLES[2].slug
              ? import('./components/article/big-dumb-bass.content').then(({ ARTICLE }) => ARTICLE)
              : import('./components/article/good-and-good-enough.content').then(
                  ({ ARTICLE }) => ARTICLE,
                ),
    },
    loadComponent: () => import('./components/article/article').then(({ Article }) => Article),
  })),
  {
    path: 'work',
    pathMatch: 'full' as const,
    redirectTo: '',
  },
  ...(
    [
      ['djamespoer', 'djamespoer.com'],
      ['exl', 'EXL / LifePRO'],
      ['ips', 'Indianapolis Public Schools'],
      ['tcc', 'TCC Software Solutions'],
      ['dr', 'Dreyer & Reinbold'],
    ] as const
  ).map(([path, heading]): Route => ({
    path: `work/${path}`,
    title: `${heading} | D. James Poer`,
    data: {
      description:
        path === 'exl'
          ? 'EXL work history: Senior Web Designer on LifePRO, UX, accessibility and front-end engineering.'
          : path === 'dr'
            ? 'Dreyer & Reinbold Work History: Digital Presence Coordinator, dealership websites, vendor integrations and classic-ASP intranet development, September 2011 through May 2015.'
            : path === 'ips'
              ? 'IPS Work History: customizing the existing PowerSchool environment with JavaScript, jQuery, HTML and CSS.'
              : path === 'tcc'
                ? 'TCC Work History: UX research, Ascend and Oregon delivery, corporate front-end work and Vertex Angular development, May 2015 through June 2019.'
                : `${heading} case study and supporting evidence.`,
    },
    resolve: {
      study: () =>
        path === 'exl'
          ? import('./components/case-study/exl-work.content').then(
              ({ EXL_WORK_HISTORY }) => EXL_WORK_HISTORY,
            )
          : path === 'ips'
            ? import('./components/case-study/ips-work.content').then(
                ({ IPS_WORK_HISTORY }) => IPS_WORK_HISTORY,
              )
            : path === 'tcc'
              ? import('./components/case-study/tcc-work.content').then(
                  ({ TCC_WORK_HISTORY }) => TCC_WORK_HISTORY,
                )
              : path === 'dr'
                ? import('./components/case-study/dr-work.content').then(
                    ({ DR_WORK_HISTORY }) => DR_WORK_HISTORY,
                  )
                : import('./components/case-study/case-study.content').then(
                    ({ CASE_STUDIES }) => CASE_STUDIES[path],
                  ),
    },
    loadComponent: () =>
      import('./components/case-study/case-study').then(({ CaseStudy }) => CaseStudy),
  })),
  {
    path: 'case-studies/exl',
    title: 'EXL Case Study | D. James Poer',
    data: {
      description:
        'LifePRO case study: investigating accessibility, Angular modernization and technical debt at the right architectural layer.',
    },
    resolve: {
      study: () =>
        import('./components/case-study/exl.content').then(({ EXL_CASE_STUDY }) => EXL_CASE_STUDY),
    },
    loadComponent: () =>
      import('./components/case-study/case-study').then(({ CaseStudy }) => CaseStudy),
  },
  {
    path: 'case-studies/ips',
    title: 'IPS Case Study | D. James Poer',
    data: {
      description:
        'Translating district policy into predictable PowerSchool behavior through conditional validation and collaboration with IPS leadership.',
    },
    resolve: {
      study: () =>
        import('./components/case-study/ips.content').then(({ IPS_CASE_STUDY }) => IPS_CASE_STUDY),
    },
    loadComponent: () =>
      import('./components/case-study/case-study').then(({ CaseStudy }) => CaseStudy),
  },
  {
    path: 'case-studies/tcc',
    title: 'TCC Case Study | D. James Poer',
    data: {
      description:
        'How observing Oregon users shaped Ascend and connected research, business analysis and front-end engineering at TCC.',
    },
    resolve: {
      study: () =>
        import('./components/case-study/tcc.content').then(({ TCC_CASE_STUDY }) => TCC_CASE_STUDY),
    },
    loadComponent: () =>
      import('./components/case-study/case-study').then(({ CaseStudy }) => CaseStudy),
  },
  {
    path: 'case-studies/dr',
    title: 'Dreyer & Reinbold Case Study | D. James Poer',
    data: {
      description:
        'The 15-Minute Month End: configurable incentive rules and commission processing inside an existing classic-ASP intranet.',
    },
    resolve: {
      study: () =>
        import('./components/case-study/dr.content').then(({ DR_CASE_STUDY }) => DR_CASE_STUDY),
    },
    loadComponent: () =>
      import('./components/case-study/case-study').then(({ CaseStudy }) => CaseStudy),
  },
  {
    path: 'about',
    title: 'About | D. James Poer',
    data: { description: 'About D. James Poer.' },
    loadComponent: () => import('./components/about/about').then(({ About }) => About),
  },
  createProofRoute('engineering', 'Engineering'),
  createProofRoute('ux-product', 'UX & Product'),
  createProofRoute('accessibility', 'Accessibility'),
  createProofRoute('ai', 'AI & Innovation'),
  createProofRoute('creative', 'Creative'),
  createProofRoute('impact', 'Impact'),
  {
    path: 'thingamajob',
    title: 'Thingamajob | D. James Poer',
    data: {
      description:
        'Thingamajob is a reusable career platform built around source-backed evidence and owner review.',
    },
    loadComponent: () =>
      import('./components/thingamajob-product/thingamajob-product').then(
        ({ ThingamajobProduct }) => ThingamajobProduct,
      ),
  },
  {
    path: 'cookie-policy',
    title: 'Cookie Policy | D. James Poer',
    data: { description: 'How the site remembers your playful cookie preferences.' },
    loadComponent: () =>
      import('./features/cookie-preferences/cookie-policy').then(
        ({ CookiePolicy }) => CookiePolicy,
      ),
  },
  ...['product-journal', 'product-journal/:date'].map((path): Route => ({
    path,
    title: 'Product Journal | D. James Poer',
    data: { description: 'Daily Scrum briefs and the history of building djamespoer.com.' },
    loadComponent: () =>
      import('./components/daily-scrum-brief/product-journal').then(
        ({ ProductJournal }) => ProductJournal,
      ),
  })),
  {
    path: 'buildometer',
    title: 'Buildometer | D. James Poer',
    data: {
      description:
        'Project completion, shipping frequency, scope and quality: evidence-backed project instruments.',
    },
    loadComponent: () =>
      import('./components/buildometer/buildometer').then(({ Buildometer }) => Buildometer),
  },
  {
    path: '**',
    title: NOT_FOUND.title,
    data: { description: NOT_FOUND.description, robots: 'noindex, nofollow' },
    loadComponent: () =>
      import('./components/not-found/not-found').then(({ NotFound }) => NotFound),
  },
].map((route: Route) => {
  const page = PUBLIC_PAGES.find((entry) => entry.path === route.path);
  return page
    ? {
        ...route,
        title: page.title,
        data: {
          ...route.data,
          description: page.description,
          ...(destinationSlides('/' + route.path).length
            ? { heroDestination: '/' + route.path }
            : {}),
        },
      }
    : route;
});
