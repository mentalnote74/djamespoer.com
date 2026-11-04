# Software Development Is Never Done

## Just Done Enough for Now

Software development has a peculiar definition of _finished_.

You can finish a feature. You can close a ticket. You can ship a release, satisfy the acceptance criteria, and watch every automated test turn green. You can even get a perfect Lighthouse score.

Then somebody uses the software. Or a browser changes. Or an accessibility issue surfaces. Or somebody has a better idea. Or the business changes its mind. Sometimes that somebody is you, approximately eleven minutes after deployment.

Congratulations. Your finished software is unfinished again.

This isn't necessarily a failure of planning, engineering, or execution. It's the nature of building something that has to keep working in a world that refuses to stand still.

**Software development is never done. It's just done enough for now.**

## The Moving Finish Line

Traditional engineering gives us the comforting notion of a finished product. Build the bridge, inspect the bridge, open the bridge.

Software is different. A software application is simultaneously a product, an ongoing service, and a collection of assumptions about how people and technology will behave. Those assumptions have expiration dates.

The Agile movement recognized this long before anyone started stuffing large language models into development workflows. Continuous integration, iterative delivery, refactoring, and automated testing all emerged from the understanding that software needs to accommodate change.

Martin Fowler's writing on evolutionary design makes an important distinction: good architecture isn't necessarily the architecture that anticipates every future requirement. It's architecture that makes future changes manageable.

The goal isn't to build something that never needs changing. The goal is to avoid building something that becomes progressively more expensive to change.

And now we've introduced artificial intelligence into the equation. That should make things interesting.

## The Development Team That Doesn't Exist

Over the past several months, I've been experimenting with a different approach to software development. Instead of using one AI assistant to generate code, I've been assembling a small collection of specialized agents and assigning them responsibilities.

The arrangement has evolved considerably.

ChatGPT handles research, analysis, requirements, and the occasional spectacular misunderstanding. Codex helps coordinate implementation work. Larry is our coding agent. Other models and tools have participated in experiments, competitions, and occasional demonstrations of why artificial intelligence should never be confused with good judgment.

I provide the architecture, product direction, design decisions, acceptance criteria, and final approval.

In theory, this resembles a conventional development organization. Research informs requirements. Requirements become implementation tasks. Implementation produces something testable. Testing produces feedback. Feedback informs the next iteration.

In practice, it's a little like managing a software team where every employee has an extraordinary vocabulary, a questionable attention span, and absolutely no embarrassment about confidently doing the wrong thing.

But the arrangement works often enough to be worth investigating.

The question isn't whether AI can write software. Clearly, it can.

The more interesting question is whether multiple AI systems can participate in a sustainable engineering process without turning coordination, verification, and rework into the most expensive parts of development.

That's where the experiment gets interesting.

## More Agents, More Problems?

Multi-agent systems are attracting considerable attention because specialization offers some obvious advantages.

A research agent doesn't necessarily need permission to modify production code. A coding agent doesn't need to invent product requirements. A testing agent should be able to challenge an implementation without defending the decisions that produced it.

Separating those responsibilities can reduce complexity and provide useful checks and balances. But adding agents doesn't automatically improve anything.

Every handoff introduces another opportunity for information to disappear, assumptions to change, or instructions to be misunderstood. I've encountered all three. Repeatedly.

One agent produces a perfectly reasonable recommendation. Another interprets it differently. A third implements the interpretation. By the time the result comes back for review, the original requirement has undergone several unauthorized renovations.

Everybody reports success. Nobody built what I asked for.

The solution isn't necessarily another agent. Sometimes the solution is fewer agents, narrower responsibilities, and better documentation. Sometimes it's a deterministic process that doesn't require an AI to decide what happens next. And sometimes the solution is to stop asking a robot to make artistic decisions about a canoe.

More on that elsewhere.

## Creative Town: The Snowflake Experiment

Creative Town began with a relatively simple idea. I wanted a scene that remained recognizable between visits but changed enough to reward exploration.

Think of the opening sequence of _The Simpsons_. Familiar setting, recurring characters, unexpected variations. The same basic experience, but never quite the same experience twice.

That became the Snowflake Experiment.

Multiple AI systems received the same creative brief. The objective was to develop a scene with reusable characters, controlled variation, and enough personality to make visitors curious about what might happen next.

What followed was an unusually educational demonstration of the difference between generating an image and engineering a system.

One participant became inexplicably attached to a Cincinnati Reds stadium. Twenty-seven revisions later, the stadium was still there.

The experiment eventually produced a more useful architectural lesson.

Stop asking the image generator to solve problems that belong in software.

Preserve approved artwork. Separate visual assets into manageable layers. Put character selection, positioning, scale, timing, and behavioral constraints into deterministic code.

The result became testable. At one documented checkpoint, Creative Town's selector contained 89 registered cast entries. Simulating 1,000 scenes selected every registered character at least once, with no tested rule violations.

That's a meaningful engineering result. Not because AI created something magical. Because we stopped relying on magic.

**Use generative systems for the work that benefits from generation. Use deterministic systems for the work that requires predictability.**

And don't confuse the two.

## Thingamajob: When the Software Needs to Know What's True

Another experiment introduced a different problem.

Thingamajob is intended to evaluate job descriptions against a structured collection of verified professional experience.

The idea sounds straightforward. Collect career information. Organize it. Compare it against job requirements. Generate useful, truthful application materials.

Except career histories aren't always neat collections of independent facts. A résumé might describe the same project several different ways. A contract may have changed responsibilities over time. Technical experience might be real but poorly documented.

An AI system can turn that ambiguity into remarkably convincing fiction. That's unacceptable when the output is supposed to represent someone's professional qualifications.

The solution became a Library of Truth: structured assertions, corrections, supporting evidence, and a process for accepting or rejecting proposed interpretations.

For the first client, an inventory of 199 canonical assertions was consolidated into 54 coherent items.

That exercise exposed an important distinction. A system that can produce a plausible answer is not necessarily a system that can produce an accountable answer.

Adding more agents doesn't solve that problem. Giving them better boundaries, better evidence, and an explicit correction process might.

Thingamajob remains a work in progress. That's part of the point.

A functioning prototype can demonstrate a concept without proving that the underlying product is ready for broader use.

Knowing the difference is engineering.

## Shady White Van: Done Enough to Ship

Shady White Van offered another opportunity to test the approach.

This time, the objective was a separate React application built around a fictional band with very real ambitions.

The site needed to be fast, accessible, responsive, and deliberately lightweight. No bloated component kits. No unnecessary dependencies. No decorative complexity that compromised usability.

The development process involved a different AI coding assistant, providing a useful comparison against the workflow used for my Angular portfolio.

The result reached a verified production desktop Lighthouse score of 100 in all four categories: Performance, Accessibility, Best Practices, and SEO.

That's a successful milestone. It is not proof that the application is perfect.

Lighthouse measures particular characteristics under particular conditions. It doesn't replace human usability testing, exhaustive accessibility evaluation, or ongoing maintenance.

But it does provide useful evidence that the current implementation meets a defined set of quality expectations.

And that raises an important question.

When the application meets its requirements, performs well, and is ready for its intended audience, what exactly are we waiting for?

Ship it. Document what's left. Move on. Come back when there's a reason.

**Done enough for now isn't an excuse for poor quality. It's a decision about what constitutes sufficient quality for the current release.**

## The Human Is Still the Architect

There's an increasingly popular fantasy that software development is approaching a point where a sufficiently sophisticated AI can receive a vague instruction and independently produce a finished product.

Sometimes the demonstrations are impressive. But production software involves considerably more than generating code.

Somebody still needs to decide what the product should do. Somebody needs to understand the users, identify the constraints, evaluate trade-offs, and determine whether the result actually solves the intended problem.

Somebody needs to recognize when an implementation is technically correct but conceptually wrong. And somebody needs the authority to say no.

In my experiments, that responsibility remains mine.

The agents can recommend, research, implement, and test. They can also misunderstand, hallucinate, overwrite approved work, and burn through resources while enthusiastically pursuing the wrong objective.

A human architect isn't valuable merely because they know how to write the code themselves. They're valuable because they understand why the code should exist, what constitutes acceptable behavior, and when an apparent improvement is actually a regression.

That distinction becomes more important, not less, when code generation becomes inexpensive.

## The Cost of Being Almost Right

One of the more surprising lessons from this experiment has been how expensive an almost-correct AI response can become.

A traditional software defect usually has a reasonably identifiable location. An AI workflow defect might originate several steps earlier.

Was the requirement ambiguous? Did the research agent invent a constraint? Did the implementation agent misunderstand an approved design? Did the testing agent verify the wrong behavior? Did an outdated handoff document quietly become the authoritative source? Or did somebody simply fail to preserve the working version before making another change?

The problem isn't always the generated output. Sometimes it's the process that allowed the output to become authoritative.

This is why our workflow has increasingly emphasized version control, preserved artifacts, explicit approvals, bounded tasks, and documented handoffs.

Not because documentation is exciting. Because repeating the same mistake with five different AI agents is considerably less exciting.

The development process itself has become another software system requiring architecture, testing, and continuous improvement.

We're not just developing applications. We're developing the process that develops the applications.

And, naturally, that process isn't finished either.

## AI Is an Amplifier, Not an Engineering Methodology

The 2025 DORA research on AI-assisted software development reached a conclusion that aligns closely with these experiments.

AI tends to amplify the strengths and weaknesses of the systems adopting it.

A disciplined development organization can use AI to increase throughput. An undisciplined organization can use the same technology to generate mistakes considerably faster.

That's an important distinction.

Speed isn't automatically productivity. More code isn't automatically progress. More agents aren't automatically a better team.

If implementation accelerates while verification, coordination, and rework become bottlenecks, the apparent productivity improvement may be largely imaginary.

The engineering challenge is to improve the entire delivery process rather than optimize the most visible activity.

That means measuring what matters.

Did the feature work? Did it satisfy the requirement? Did it preserve existing functionality? Can we explain how it works? Can we maintain it?

And perhaps most importantly: Was the improvement worth the effort required to produce it?

## Knowing When to Stop

There is always another improvement available. Another animation. Another optimization. Another architectural refinement. Another dependency update. Another accessibility enhancement.

Some of those changes are important. Others are simply interesting.

And interesting can be a dangerous thing when you're a developer.

It's easy to spend three days improving something that was already perfectly adequate while a more valuable feature sits untouched.

This is where engineering judgment becomes product judgment.

A release needs a definition of done. The product needs a direction. The backlog needs priorities. And the development team needs permission to stop polishing one thing long enough to deliver another.

That doesn't mean accepting broken software.

It means distinguishing defects from enhancements, requirements from possibilities, and measurable improvements from endless tinkering.

In our multi-agent workflow, this has become particularly important.

An AI assistant will rarely run out of suggestions. It can produce another list of improvements almost indefinitely.

If every suggestion becomes another ticket, and every ticket becomes another round of research, implementation, and review, the development process can consume itself.

Eventually somebody has to say: That's enough. Ship it.

## Artificial? Yes. Intelligent? Sometimes.

The experiment has changed how I think about AI-assisted development.

I don't see AI agents as replacements for software engineering. I see them as potentially useful participants in a software engineering process.

Some are better at research. Some are better at implementation. Some are useful for generating alternatives. Some are particularly effective at finding problems in work produced by other systems.

And some occasionally deserve to have their badges confiscated.

The interesting opportunity isn't to eliminate the developer. It's to give an experienced developer access to capabilities that previously required a much larger team.

But those capabilities need coordination. They need constraints. They need accountability. They need someone who understands the difference between an acceptable compromise and a bad decision.

And they need an exit condition.

Because the objective was never to keep the robots busy. The objective was to build useful software.

## Done Enough for Now

My Angular portfolio will continue evolving.

Creative Town will acquire new characters, behaviors, and probably a few more questionable residents.

Thingamajob still has substantial work ahead before it can reliably deliver everything envisioned for it.

Shady White Van will eventually become something more than a technically polished home for a fictional band.

And the multi-agent development process will keep changing as the tools improve, the experiments produce new evidence, and we discover additional ways for apparently intelligent systems to misunderstand perfectly ordinary instructions.

None of these projects is finished in the absolute sense.

Some are ready for visitors. Some are ready for further testing. Some are ready for another development cycle.

That's normal.

The real achievement isn't reaching a mythical state where nothing remains to be done.

It's reaching a state where the software delivers enough value, with enough quality and enough confidence, to justify putting it into the world.

Then learning from what happens next.

Software development is never done.

**It's just done enough for now.**
