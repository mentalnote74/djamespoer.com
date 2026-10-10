import { CaseStudy } from '../case-study/case-study.model';

export const ENGINEERING_CONTENT: CaseStudy = {
  title: 'Engineering',
  introduction: 'Development Team / Lead Engineer',
  sections: [
    {
      heading: 'Building the Product',
      paragraphs: [
        'djamespoer.com is not a portfolio assembled from a template. It is a production Angular application built to demonstrate the same engineering decisions I make when working on larger software products.',
        'The site gives me a place to prove those decisions in running code: architecture, reusable components, TypeScript, Sass, responsive behavior, accessibility, testing, performance, analytics, deployment, and the less glamorous work of debugging the things that fail between them.',
        'The objective is not simply to make the site work.',
        'It is to build something I would be comfortable handing to another development team.',
      ],
    },
    {
      heading: 'Architecture Before Pages',
      paragraphs: [
        'A portfolio could have been built as a collection of individually designed pages. I deliberately took a different approach.',
        'The application is organized around reusable structures and shared content patterns so that new material can be added without duplicating presentation logic or allowing pages to drift apart.',
        'That approach is visible in the employment-history case studies. Dreyer & Reinbold, TCC, Indianapolis Public Schools, and EXL tell very different stories, but they are delivered through a common case-study architecture.',
        'Shared behavior belongs in shared code. Content remains content.',
        'That separation makes the application easier to extend, test, maintain, and eventually hand off.',
      ],
    },
    {
      heading: 'Engineering The Interface',
      paragraphs: [
        'Angular and TypeScript provide the application structure, while Sass handles the visual system and responsive presentation.',
        'I use the framework where it provides value rather than allowing framework abstractions to dictate the markup. Semantic HTML, maintainable styling, predictable component behavior, and a clean DOM remain important regardless of the technology producing them.',
        'The same principle applies to responsive design.',
        'Layouts are expected to adapt to the content and available viewport rather than being built around a handful of screenshots. When a real device exposes a problem that automated tooling does not, the implementation gets corrected.',
        'The browser is ultimately where the product has to work.',
      ],
    },
    {
      heading: 'Reuse Without Losing Identity',
      paragraphs: [
        'Reusable architecture should not mean every experience looks identical.',
        'The Perspective system demonstrates that distinction.',
        'Each Perspective can have its own visual identity and supporting artwork while sharing the underlying application architecture. The Creative Perspective hero, for example, reuses the same approved master artwork as its carousel entry rather than maintaining two independent assets that could drift apart.',
        'The implementation changes the presentation, not the source of truth.',
        'That is a small architectural decision, but it reflects a larger engineering preference: reuse the thing that should remain consistent and isolate the things that are supposed to change.',
      ],
    },
    {
      heading: 'Testing The System, Not Just The Happy Path',
      paragraphs: [
        'Every production change moves through automated testing and a production build before deployment.',
        'Focused tests provide fast feedback around the code being changed. The complete Angular test suite checks that the change has not broken behavior elsewhere in the application.',
        'Production builds expose another class of problems: compilation failures, asset issues, bundle growth, and configuration differences that may not appear during development.',
        'Deployment is not the end of the test.',
        'The deployed application is checked again because a successful local build does not prove that the production system is correct.',
      ],
    },
    {
      heading: 'Accessibility Is Engineering',
      paragraphs: [
        'Accessibility is part of the implementation rather than a cleanup task after the interface has been built.',
        'Semantic structure, keyboard behavior, responsive presentation, labels, contrast, focus behavior, and component markup are engineering concerns because they are properties of the product being delivered.',
        'Automated accessibility testing provides one layer of evidence. Browser inspection and human judgment provide another.',
        'The goal is not merely to make an audit tool stop complaining. The goal is to produce an interface people can actually use.',
      ],
    },
    {
      heading: 'Performance Has A Budget',
      paragraphs: [
        'Performance is treated the same way.',
        'Lighthouse and production builds provide measurable feedback while the application evolves. New features are not automatically worth their cost simply because they work.',
        'Bundle size, rendering behavior, asset choices, and layout stability remain part of the engineering conversation as functionality is added.',
        'That discipline has allowed the site to grow substantially while continuing to produce production Lighthouse scores at or near 100.',
      ],
    },
    {
      heading: 'Debugging The Delivery Pipeline',
      paragraphs: [
        'Not every failure is an application defect.',
        "During development, the deployment pipeline has occasionally failed during Cloudflare's installation/tooling stage even though the application itself was unchanged. Retrying the identical commit has subsequently built and deployed successfully.",
        'The important engineering decision in that situation is not changing working code simply because something failed.',
        'First determine which layer failed.',
        'Application code, tests, production compilation, deployment tooling, CDN behavior, and the browser are different parts of the system. Debugging effectively means isolating the failing layer before deciding what to change.',
      ],
    },
    {
      heading: 'Evidence Over Assumption',
      paragraphs: [
        'The development workflow leaves receipts.',
        'Git records what changed. Tests verify expected behavior. Production builds prove the application compiles. Deployment records identify what reached production. Lighthouse measures production characteristics. axe checks automated accessibility rules. Browser inspection catches problems those tools cannot understand.',
        'Jira preserves the decisions, requirements, acceptance criteria, and history surrounding the implementation.',
        'Together, those artifacts provide something more useful than a claim that I can build production software.',
        'They show the work.',
      ],
    },
    {
      heading: 'Shipping Is Part Of Engineering',
      paragraphs: [
        'The application is intentionally being developed in small production increments.',
        'A feature is not considered complete simply because the code exists locally. It needs to integrate with the existing system, survive testing and production compilation, deploy successfully, and work correctly after deployment.',
        'That creates a simple standard:',
        'Build it. Test it. Ship it. Verify it.',
        'Then improve it.',
      ],
    },
    {
      heading: 'What This Perspective Demonstrates',
      paragraphs: [
        'djamespoer.com demonstrates the way I approach front-end engineering: understand the system, establish the right abstraction, implement deliberately, test the result, isolate failures, measure production behavior, and keep shipping.',
        'The technologies will change.',
        'That engineering discipline should not.',
      ],
    },
    {
      heading: 'Technologies & Practices',
      paragraphs: [
        'Angular · TypeScript · JavaScript · HTML5 · Sass/SCSS · Responsive Design · Component Architecture · Reusable UI Patterns · Semantic HTML · WCAG · axe · Lighthouse · Automated Testing · Production Builds · Git · GitHub · Jira · CI/CD · Cloudflare · Performance Validation · Debugging · Production Verification',
      ],
    },
  ],
};
