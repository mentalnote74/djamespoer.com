# Honey?! Should I Add Bot Herder to My Résumé?

### At some point, “I use AI” stops describing a tool and starts describing an operating model.

“Honey?! Should I add Bot Herder to my résumé?”

I was joking.

Mostly.

At the time I had multiple AI systems doing different pieces of work, one of them was building software, another was helping manage research and project context, Jira was behaving like an obstinate farm animal, and I was trying to keep everybody pointed at the same version of reality.

One agent had the ball.

Another knew something the first one needed.

A third could get around a tool bottleneck.

Work needed to move between them without losing the requirements, rationale, constraints or decisions that had accumulated along the way.

And suddenly I wasn't really “prompting AI” anymore.

I was managing a team.

A very strange team.

But a team.

That made me wonder:

**When does using AI become an actual operational skill?**

And if it does, what exactly do we call it?

---

## “Prompt engineering” already feels too small

Prompt engineering was a useful name for the first version of this problem.

You had a model.

You wanted something from it.

You learned how to ask better questions.

Context mattered.

Instructions mattered.

Examples mattered.

Precision mattered.

They still do.

But look at where the technology has gone.

Modern agent systems can use tools, maintain state, execute multi-step work, hand control between specialists, call other agents and interact with external systems.

OpenAI's current agent documentation doesn't just talk about writing a good prompt. It talks about **orchestration, handoffs, ownership, tools, state, guardrails, approvals and observability**.

One of the architectural choices it explicitly describes is whether a specialist should take ownership of a task or remain subordinate to a manager agent that retains responsibility for the final result.

That doesn't sound much like clever prompting anymore.

That sounds like organization design.

Anthropic has arrived at a similar place from the engineering side.

Its production multi-agent research system uses a lead agent that plans work, delegates separate investigations to specialized subagents, maintains state, gathers their results and synthesizes the final answer.

One of the lessons Anthropic reports is almost comically familiar:

If delegation is vague, agents duplicate work, leave holes, wander into the wrong problem or keep working long after they have enough information.

In other words:

Congratulations.

We reinvented management.

---

## The bot is not the system

This distinction matters.

It is easy to watch a powerful model complete a difficult task and conclude that the model is the capability.

Sometimes it is.

But increasingly the useful thing is the **system around the model**.

Who gets which job?

What information do they receive?

What information should they not receive?

Who owns the final decision?

When should a specialist take over?

When should one model simply serve as a tool for another?

Where does shared state live?

What happens when context is lost?

What gets written down?

What requires human approval?

How do we know what actually happened after five models and twelve tools touched the same problem?

Those are architecture questions.

They are also UX questions.

And management questions.

And governance questions.

And occasionally questions of basic herd control.

---

## I accidentally built a football team

Our own workflow around djamespoer.com evolved into something that would sound ridiculous if it hadn't become useful.

We started assigning a **QB**.

One AI owns the current drive.

Other systems have supporting roles.

When responsibility changes, we do a **PPP — Puff Puff Pass** — which is essentially a context handoff.

The outgoing QB needs to transfer enough state that the incoming one doesn't spend the next hour rediscovering decisions we already made.

We use Jira as persistent shared memory for requirements, decisions and future ideas.

We have shorthand for intentionally preserving things for later.

We have rules about who should act, who should research, who should write and when somebody should stay the hell out of the way because another agent is already executing.

None of that started as an exercise in designing a multi-agent architecture.

It started because things kept going wrong.

Context disappeared.

Two systems solved the same problem.

Somebody confidently resurrected a decision we had already rejected.

A beautifully reasoned answer contradicted something decided three days earlier.

Work got redone.

A tool became a bottleneck.

An agent optimized something nobody asked it to optimize.

Sound familiar?

These are not particularly exotic AI problems.

They are coordination problems.

---

## The industry is heading in exactly this direction

Microsoft's 2026 Work Trend Index studied 20,000 AI users across ten countries and identified a small group it calls **Frontier Professionals**.

They represented 16% of the AI users surveyed.

What made them different wasn't simply that they used AI more frequently.

Microsoft describes them as people who use agents for multi-step workflows, build multi-agent systems, rethink workflows and create shared standards for how AI should be used.

Among those advanced users, 80% reported producing work they could not have produced a year earlier. Across AI users generally, 66% said AI let them spend more time on high-value work and 58% said they were producing work they couldn't have produced a year before.

LinkedIn sees the skills market moving too.

Its 2026 labor-market research reports that U.S. jobs requiring AI-literacy skills grew **70% year over year**.

That category includes prompt engineering, but the broader point is more interesting:

AI literacy is moving from novelty toward baseline professional capability.

Anthropic's 2026 agentic-coding research goes even further.

Its prediction for coordinated agent teams explicitly calls out emerging skills in:

**task decomposition, agent specialization and coordination protocols.**

Those sound suspiciously résumé-worthy to me.

---

## More agents does not automatically mean more intelligence

This is where Bot Herder starts sounding less like a joke.

Because the obvious response to increasingly capable agents is:

**MORE AGENTS!**

Agent for research.

Agent for code.

Agent for QA.

Agent for SEO.

Agent to supervise the agent supervising the SEO agent.

Eventually you have created the world's most expensive digital homeowners association.

Anthropic found that its multi-agent research architecture performed substantially better than a single-agent approach on the kind of broad, parallel research problem it was designed to solve.

But it also found that multi-agent systems used roughly **15 times as many tokens as ordinary chat interactions**.

And some kinds of work simply aren't well suited to parallelization.

The lesson wasn't “multiple agents are better.”

It was:

**use them where decomposition produces enough value to justify the coordination cost.**

OpenAI's guidance makes essentially the same point from another direction:

Start with one agent when one agent is enough.

Add specialists when they materially improve capability isolation, policy isolation, prompt clarity or traceability.

Otherwise you have simply created more prompts, more handoffs and more places for something to go wrong.

That sounds very familiar too.

One of the hardest lessons in our own workflow has been knowing when **not** to send another robot onto the field.

---

## Context is infrastructure

The interesting part of multi-agent work may not be the agents at all.

It may be the context between them.

A brilliant specialist with the wrong context can produce a brilliant solution to the wrong problem.

That is often worse than an obvious failure.

So we started treating context like infrastructure.

What decisions are canonical?

Where are they stored?

Which facts are durable?

What is merely a current hypothesis?

What has already been rejected?

What does the next agent need in order to continue without replaying the entire project?

Who has authority to overwrite something?

When do we preserve history instead of replacing it?

Those aren't prompt questions.

They are information-architecture questions.

Anthropic's long-running agent research describes persistent memory, test oracles and orchestration patterns as important ingredients when agents work across longer horizons rather than within one conversational loop.

OpenAI likewise treats state and continuation as explicit architectural concerns rather than incidental details of a chat.

Again:

The model is not the whole system.

The seams matter.

---

## Somebody still has to own the result

There is one part of our ridiculous football organization chart that I think matters more than all the others.

There is always a human owner.

Me.

The agents can recommend.

They can research.

They can write code.

They can generate art.

They can run tests.

They can tell me with enormous confidence that something is excellent.

And sometimes I look at what they produced and say:

**That sucks. Pull it down.**

That is not a failure of the system.

That is the system working.

Because generation and acceptance are different responsibilities.

AI is getting extraordinarily good at producing plausible work.

That makes judgment more valuable, not less.

Microsoft's 2026 research frames the same shift as expanded human agency: as agents take on more execution, humans can move upward toward directing work, making decisions and owning outcomes.

Governance research is making the same distinction.

IBM researchers describe production agent systems as needing explicit points where policies, approvals and human oversight intervene rather than assuming autonomy should be unlimited.

The future may involve less human typing.

It does not follow that it involves less human responsibility.

---

## Observability is the difference between a team and a séance

If several agents are doing real work, another problem appears quickly:

**What the hell just happened?**

An answer comes out the other end.

Was the right source consulted?

Did an agent hand the job off?

Did a tool fail?

Was something retried?

Did the system silently choose a different path after an error?

Was the final result based on current information or some stale context from three handoffs ago?

Production agent frameworks increasingly treat tracing and observability as first-class concerns precisely because these systems become difficult to reason about once multiple models and tools are involved.

OpenAI's tracing guidance records model calls, tool calls, handoffs and guardrails so the workflow can actually be inspected after execution.

That has a direct parallel in how we're building the portfolio.

Jira isn't there because I have a deep emotional attachment to issue trackers.

God knows I don't.

It exists because conversational memory alone isn't sufficient infrastructure for a project with multiple AI collaborators operating over time.

The record matters.

The history matters.

The reason behind the decision matters.

Especially when everybody involved can produce a very convincing explanation for a decision nobody actually made.

---

## The bottleneck moves

This may be the strangest part.

As agents get faster, the thing slowing you down changes.

Sometimes the model is the bottleneck.

Then the model gets better.

Now context is the bottleneck.

You solve context.

Now the tool is the bottleneck.

You route around the tool.

Now human review is the bottleneck.

You improve the review process.

Now three agents are producing output faster than one person can reasonably judge it.

Every improvement moves pressure somewhere else in the system.

McKinsey describes the agentic transition similarly at the organizational level: the important problem is not merely deploying agents, but designing the **human-agent operating model** around them.

That phrase matters.

Operating model.

Not prompt.

---

## So should I actually put Bot Herder on my résumé?

Probably not.

Although I'd enjoy the interview.

But should the underlying capability appear there?

Absolutely.

The problem is naming it without drowning it in whatever this month's AI buzzword happens to be.

“Prompt engineering” is too narrow.

“AI user” means almost nothing.

“Agentic AI expert” makes me want to check my wallet.

What I am increasingly interested in is something closer to:

**AI-assisted product development and multi-agent workflow orchestration.**

Or:

**Human-directed agent orchestration.**

Or perhaps simply demonstrating the capability rather than claiming a grand new title.

Can you decompose ambiguous work?

Can you assign appropriate systems to appropriate tasks?

Can you manage context?

Can you define ownership?

Can you build useful handoffs?

Can you establish guardrails?

Can you tell when parallelization will help and when it will create chaos?

Can you preserve provenance?

Can you inspect what happened?

Can you recognize when the AI produced something technically defensible but fundamentally stupid?

And can you remain accountable for the outcome?

Those are transferable professional skills.

They look an awful lot like architecture.

They look an awful lot like product management.

They look an awful lot like technical leadership.

They also look an awful lot like what happens when you give one guy three quarterbacks, a Jira board and enough artificial intelligence to require livestock terminology.

---

## Maybe Bot Herder isn't the title.

Maybe it's the job.

AI is becoming easier to access.

The models will continue improving.

More tools will become agent-accessible.

More work will become delegable.

That means merely having access to an intelligent agent will stop being particularly interesting.

The differentiator moves upward.

Can you organize intelligence?

Can you direct it?

Can you constrain it?

Can you combine multiple systems without creating chaos?

Can you tell good output from persuasive garbage?

Can you design the environment in which humans and agents work together?

Can you keep the system moving when one of the tools decides to behave like Jira?

Those questions feel much more consequential than whether somebody knows the magical wording for a prompt.

So no.

I probably won't add **Bot Herder** to the résumé.

But somewhere underneath the professional language, I suspect that is exactly what the skill is becoming.

And apparently I have been getting a lot of practice.
