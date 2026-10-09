import { CaseStudy } from './case-study.model';

/** Approved public editorial content; current professional project. */
export const DJAMESPOER_CASE_STUDY: CaseStudy = {
  title: 'djamespoer.com',
  introduction:
    'UX Engineer · Front-End Architect · Product Builder\n\nAn independently built portfolio and product laboratory for UX engineering, front-end architecture, accessibility, AI-assisted development, and evidence-driven delivery.',
  sections: [
    {
      heading: "Building the product you're using to evaluate me",
      paragraphs: [
        'djamespoer.com is an active software project—not a finished portfolio being periodically updated.',
        "I'm designing, developing, testing, and shipping it continuously. New features, content, accessibility improvements, performance work, experiments, and occasionally bugs move through the same development cycle I would expect from a production application: requirements, implementation, testing, human acceptance, source control, CI/CD, deployment, and verification.",
        "You're seeing the product while it's being built.",
        "That's intentional.",
        "The “Under Construction” message isn't an apology for an unfinished portfolio. It's an invitation to watch the work happen.",
        'The Build & Deployment History on the home page makes that activity visible. Rather than simply claiming the site is under active development, it exposes the actual pipeline history—including successful builds, failed attempts, terminated runs, and repeated deployments.',
        'As the project evolves, the site becomes its own evidence.',
        'A feature ships. A real device exposes a usability problem. The problem becomes a bug. The fix is tested and deployed. Performance changes are measured. Architecture changes when the evidence says it should. The deployment history keeps moving.',
        "So this case study isn't really finished either.",
        "You're reading the current version of an ongoing product story.",
        "I own the product decisions, UX, front-end architecture, accessibility, implementation, performance, analytics, SEO, testing, and delivery. I'm also using the project to explore where AI can accelerate real product development—and where human judgment still has to make the final call.",
        'Rather than saying I can design an experience, build an Angular application, diagnose accessibility problems, improve performance, work with AI, or make product decisions, I can point to the system doing those things right now.',
      ],
    },
    {
      heading: 'Designing around evidence',
      paragraphs: [
        "The site's information architecture separates two different questions a hiring manager might have.",
        'Where have you done this before?',
        'The Work section answers that through case studies from my career.',
        'How do you think and work?',
        'Six Perspectives—Engineering, UX & Product, Accessibility, AI & Innovation, Creative, and Impact—look across that experience from different angles.',
        'Underneath both is the same principle: important claims should be backed by evidence.',
        'That influenced the architecture as well. Case studies use reusable presentation components while their content remains independently structured and validated. Career-source research stays outside the public application, allowing the published site to remain clean while preserving the evidence behind it.',
      ],
    },
    {
      heading: 'Building the front end',
      paragraphs: [
        'The application is built with Angular, TypeScript, semantic HTML, and Sass.',
        'I deliberately avoided starting with a large UI framework. Native browser semantics and a small shared styling foundation give me more control over accessibility, performance, and markup while keeping the application easier to reason about.',
        'Routes are lazy-loaded. Shared components handle reusable presentation patterns. Individual features remain responsible for their own content, meaning, and business decisions.',
        "The goal isn't architectural cleverness.",
        "It's an application that can grow without turning every new idea into another special case.",
      ],
    },
    {
      heading: 'Accessibility requires humans too',
      paragraphs: [
        'Accessibility is part of the engineering process, not a cleanup phase.',
        'The site includes keyboard interaction, visible focus behavior, semantic landmarks, reduced-motion handling, automated axe testing, and accessibility-focused component tests.',
        "But one of the more useful lessons came from something the automated checks didn't catch.",
        "A deployment-history table worked technically at narrow widths, yet became difficult for a person to understand on a real phone. The information was still there; the experience wasn't good enough.",
        'Human review exposed the problem.',
        'The responsive design was changed so each row collapses into a card with individually labeled values. The relationships that were obvious from desktop column headers remain understandable when those columns disappear.',
        "The tests weren't useless—they were answering a different question.",
        'Automation helped establish whether the interface was technically sound. A human using the interface established whether it was actually usable.',
        "That's an important distinction in accessibility engineering.",
      ],
    },
    {
      heading: 'Finding a performance problem instead of hiding it',
      paragraphs: [
        'A clean production Lighthouse run exposed another problem:',
        "Those numbers weren't terrible.",
        "They also weren't good enough to ignore.",
        'Trace analysis showed that the application shell and footer were painting before the lazy-loaded Home route arrived. When Home rendered, it pushed the already-visible footer down the page.',
        'The obvious response would have been to abandon lazy loading or mask the movement.',
        'Instead, I kept the routing architecture and changed the initial rendering sequence so the application waits for the first route before completing the visible bootstrap experience.',
        'The result:',
        'The subsequent production acceptance run reached:',
        "The useful part of that story isn't the 99.",
        "It's that measurement exposed an architectural interaction, the trace identified the cause, and the fix addressed the cause without throwing away a useful capability.",
      ],
      items: [
        'Baseline production: Performance 92; Cumulative Layout Shift 0.17.',
        'Post-fix local optimized build: Performance 100; CLS 0.',
        'Post-fix production acceptance: Performance 99; Agentic Browsing 3/3; axe issues 0.',
      ],
      evidence: [
        {
          kind: 'link',
          label: 'Accepted initial-navigation implementation and regression test',
          href: 'https://github.com/mentalnote74/djamespoer.com/commit/6facda597f1a21007384cc86f6fcfbbf04343398',
        },
        {
          kind: 'link',
          label: 'Recorded measurement environments and acceptance evidence',
          href: 'https://github.com/mentalnote74/djamespoer.com/blob/main/docs/milestones/2026-10-07-initial-route-cls-remediation.md',
        },
      ],
    },
    {
      heading: 'Making continuous delivery visible',
      paragraphs: [
        "If I'm going to say this product is being developed and shipped in real time, I want that claim to be verifiable.",
        "That's why the home page exposes its Build & Deployment History.",
        "Cloudflare contains useful build and deployment information, but credentials and raw provider data don't belong in a browser application.",
        'The solution separates acquisition from presentation.',
        'Build-time tooling acquires the history, sanitizes it, validates its schema, and produces a safe same-origin snapshot that Angular can display without access to Cloudflare credentials.',
        'That history includes successes, failures, terminated attempts, and repeated attempts.',
        'It also forced an important distinction into the data model:',
        'A failed dependency installation is a failed pipeline attempt.',
        "It isn't a failed deployment if deployment never started.",
        "That may sound like semantics until you're trying to understand what actually happened to a production system.",
        'The feature has already produced its own case study. Testing revealed that production builds were updating the display timestamp while repeatedly copying an older snapshot. The lifecycle—not the table—was wrong.',
        'The refresh process has now been redesigned and locally verified so production builds refresh and validate the history before compiling the application, while a failed refresh preserves the last known-good snapshot rather than publishing questionable data.',
        'The refresh lifecycle is implemented and tested locally. SCRUM-63 remains open pending Cloudflare build-only credential configuration and live production verification; the refreshed lifecycle has not yet passed production acceptance.',
        'The portfolio is documenting its own development while simultaneously generating new engineering problems worth documenting.',
        "That's exactly what I wanted it to do.",
      ],
    },
    {
      heading: 'Using ai without outsourcing judgment',
      paragraphs: [
        "AI is deeply integrated into how I'm building this project, but not as an autopilot.",
        'I use multiple AI collaborators for research, implementation, analysis, testing, critique, and content development. Work is divided according to the strengths of each system, with Jira providing a shared record of requirements, decisions, evidence, and acceptance.',
        'That workflow can move extremely quickly.',
        'It can also produce extremely convincing wrong answers.',
        'One design experiment made that particularly obvious. Multiple AI systems received the same frozen creative brief and independently generated solutions. Their outputs were compared, critiqued, synthesized, and regenerated.',
        "The technically strongest-looking result wasn't automatically the winner.",
        'One candidate failed when placed inside the actual carousel container. Another followed the composition more successfully. Human review—not model confidence—decided what survived.',
        'The same rule applies to engineering work.',
        'AI can propose a solution, write code, run tests, inspect evidence, and argue that the job is finished.',
        "It doesn't get final acceptance.",
        'I do.',
        "That combination—machine speed with human product judgment—is one of the things I'm deliberately exploring through this project.",
      ],
    },
    {
      heading: 'An ongoing product story',
      paragraphs: [
        'This case study has no final screenshot yet.',
        'djamespoer.com is still being designed, developed, tested, and shipped. As the product changes, this case study changes with it.',
        'Every feature gives me another opportunity to demonstrate how I approach product decisions, architecture, accessibility, performance, testing, AI-assisted development, and the inevitable difference between what looked right in development and what actually worked for a user.',
        'Some of those stories end with a successful deployment.',
        'Some end with a bug.',
        'The useful ones explain what happened next.',
        'The deployment history on the home page is the running receipt.',
      ],
      evidence: [
        {
          kind: 'link',
          label: 'Public application source and change history',
          href: 'https://github.com/mentalnote74/djamespoer.com',
        },
      ],
    },
    {
      heading: 'Core technologies and practices',
      items: [
        'Angular · TypeScript · Sass/CSS · Semantic HTML · Responsive Design · WCAG · Accessibility Engineering · axe · Lighthouse · Performance Engineering · Product Ownership · UX Engineering · Front-End Architecture · AI-Assisted Development · CI/CD · Cloudflare · Git/GitHub · Jira · Analytics · SEO',
      ],
    },
  ],
};
