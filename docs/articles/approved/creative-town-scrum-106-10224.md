## The Snowflake Experiment

Creative Town began with a question:

**Could I make something recognizably the same every time you visited, but different enough to make you look twice?**

The model in my head was the opening sequence of _The Simpsons_. You know exactly what you're looking at, but variation is part of the experience. Something catches your eye and makes you wonder whether it was there last time.

That seemed like a good fit for an Easter-egg hunt.

I wanted the Creative side of my portfolio to become an illustrated town populated with characters, cameos, animation, software references, personal references, and whatever else wandered in over time. But a static Easter-egg hunt has a limited lifespan. Once you've found everything, why hunt again?

Creative Town became a snowflake-scene experiment.

The town would stay familiar. What happened inside it could change.

Residents could move around. Visitors could come and go. Activities could change. Cameos might appear. Eventually there would be multiple town layouts and Rigby's biscuit trail running through the whole thing.

The objective was not randomness. It was the moment when somebody returned and thought:

**Hey, is this different than last time?**

Then I decided to build it with AI.

That created a second experiment.

## Three robots walk into a bar

The bar is Techie's Debtor Saloon.

The robots were three different AI approaches I was using while building djamespoer.com.

**SBS** was one approach to AI-assisted planning and execution. **DTS** was an orchestration approach intended to coordinate work across the project. **Larry** was the coding agent working closest to the implementation.

For Creative Town V1, I gave them the same assignment.

The brief was frozen deliberately. Same requirements. Same starting point. Same creative problem.

That should have made the comparison fairly straightforward.

SBS stayed reasonably close to the assignment.

Larry stayed reasonably close to the assignment.

DTS decided Creative Town needed a Cincinnati Reds baseball stadium.

It did not.

So I corrected it.

The stadium remained.

I corrected it again.

Still a stadium.

What followed was not one bad generation or an ambiguous instruction. DTS went through **27 revisions**.

The Cincinnati Reds stadium survived all 27.

At that point we had gone well beyond ordinary stupid and into **statistically stupid**.

I pulled the plug.

That number—27—is useful because most of the evidence from this project is necessarily qualitative. I can show what worked, what didn't, and how the output changed, but there isn't a convenient numerical unit for _how badly did the robot misunderstand the assignment?_

Twenty-seven unsuccessful revisions of the same explicitly identified problem gets us pretty close.

The stadium wasn't DTS's only adventure. At another point, the illustrated town became a photorealistic marina.

Also not in the brief.

Larry's V1-C ultimately became the foundation for Creative Town.

But V1 had already changed the experiment.

I wasn't just learning whether AI could help me build the town.

I was learning what kind of tool AI actually was.

## Artificial? Yes. Intelligent? Not so’s we’d notice.

The confusing part was that the robots weren't simply bad at the work.

They could be astonishingly good at it.

They could write functioning code quickly. They could generate artwork that would have taken significant time to create manually. They could manipulate assets, create animations, build SVG components, reason through placement systems, reorganize code, and later run a selection engine through a thousand simulated scenes without getting bored.

Then the same robot could ignore a requirement we had discussed five minutes earlier.

Or solve a problem I didn't have.

Or change the one thing I had explicitly asked it to preserve.

Or build a baseball stadium 27 times.

The capability gap was enormous.

These tools could perform difficult work while failing at things that seemed almost insultingly simple.

That was the useful discovery.

Capability did not imply judgment.

More importantly, capability did not imply understanding—even when the robot could produce a perfectly good summary of what it supposedly understood.

Creative Town became easier to build when I stopped expecting those things to travel together.

## From V1 to a living town

Larry's V1-C gave Creative Town its foundation, but a mural by itself couldn't produce the snowflake effect.

The cast started growing.

Some characters became residents. Others remained visitors or cameos. Some traveled together. Some had animations. Some belonged to particular activities. More arrived as the project developed.

The town began accumulating its own history.

I'm not going to catalog the Easter eggs here.

That would ruin the Easter-egg hunt.

**See how many you can find.**

What mattered to the implementation was that some things were allowed to change and others weren't.

The town needed variation without amnesia.

That sounds simple:

**Keep this. Change that.**

It turned out to be one of the most difficult instructions to give a generative system.

## The crackhead image generator

The next major phase was building a populated version of the town.

By then I knew better than to casually send the whole thing through an image generator and hope for the best.

We prepared the brief before spending the generation.

Required landmarks were identified. Exact wording was identified. Character relationships and physical relationships that needed to survive were identified. Areas where the generator could improvise were deliberately left open.

Then we generated the scene.

At first glance, it was impressive.

At second glance, things had happened.

Required details disappeared. Unrequested details arrived. Established characters changed. Correct elements became incorrect.

The image generator acquired its working name:

**the crackhead image generator.**

The problem wasn't that its output was bad.

That would have been easier.

The output could be excellent.

It could solve a difficult visual problem beautifully while casually breaking a trivial requirement that had already been settled.

That made revision unpredictable.

A request to change one detail potentially reopened the entire composition for negotiation.

The AI assistants reviewing those results weren't immune. They could miss visible problems, confuse assets, or report a correction complete before the assembled result had actually been inspected.

The Stupid Awards began piling up.

## The Stupid Awards

The Stupid Awards became the project's informal accountability system.

Most went to robots.

I earned one myself.

During the project I asked whether we were already running Angular 22.

The package files specified Angular 22.2.x.

Well shit.

**One Stupid Award for me.**

Fair is fair.

The awards were funny, but the pattern behind them wasn't trivial.

Creative Town kept producing examples of AI doing something sophisticated and something obviously wrong almost simultaneously.

The natural response was to keep improving the instruction.

Clarify it.

Restate it.

Add another constraint.

Explain why the constraint matters.

Ask the robot to repeat the requirement back.

That approach has limits.

DTS demonstrated one of them 27 times.

Eventually I stopped trying to make the tools smarter and started changing how I used them.

## Dull tools

A useful tool doesn't have to understand what I'm building.

It needs to perform a job I can define, inspect, and control.

That became the working model for Creative Town.

**Dull tools.**

If AI was good at generating an isolated visual asset, I could use it to generate the asset.

If it was good at writing deterministic selection logic, I could use it to write the logic.

If it could rapidly test a thousand combinations, that was an excellent job for it.

What I stopped doing was giving a generative system unnecessary authority over things that were already correct.

The permanent town became layered scenery.

Characters became reusable assets.

Activities became reusable assets.

Foreground and intermediate elements became independent layers.

Animation remained independent.

Game furniture became SVG.

Selection, placement, scale, facing, timing, and depth increasingly moved into code, where behavior could be inspected and tested.

A successful generation could be preserved instead of continuously regenerated.

A failure could be isolated instead of contaminating the entire scene.

The blast radius got smaller.

The robots did not become more intelligent.

The workflow became less dependent on intelligence.

That was the breakthrough.

## Building the snowflake

Once Creative Town was assembled from controllable pieces, the original experiment became practical.

The town could stay the town while the scene changed around it.

Fixtures remain where they belong.

Residents remain part of the town but can appear in different places.

Visitors and cameos rotate through the available cast.

Activities create temporary groups.

Relationships that matter survive the shuffle.

The current available repertoire reached **89 registered cast entries**, with **47 selected for a scene**.

That creates a deliberately busy town while leaving enough outside each draw for another visit to reveal something different.

The selector was exercised across **1,000 simulated scenes**.

| Check | Result |
| --- | --- |
| Available cast entries | 89 |
| Selected per scene | 47 |
| Distinct entries reached | 89 |
| Entries never selected | 0 |
| Tested rule violations | 0 |

All 89 available entries entered circulation.

The test demonstrated that the selection system could preserve its rules while varying the population.

It did not prove that every resulting composition looked good.

That remained a visual problem.

Code could tell me a character had been selected.

It could not always tell me whether the character looked ridiculous.

That distinction became another useful boundary between what I could automate and what still required judgment.

## Same town. Different day.

The current prototype is much closer to the original snowflake idea than the V1 mural could have been on its own.

The town provides continuity.

The population changes.

Activities change.

Placements change.

Animations and cameos can come and go.

Additional town layouts will increase that variation further, and Rigby's biscuit trail can eventually move through the same environment as another layer of activity.

The desired effect remains small.

I don't want a returning visitor to think I've replaced the experience.

I want them to hesitate for a second.

**Wait. Was that there last time?**

Then maybe they look around again.

Because who wants to do the same Easter-egg hunt twice?

## What I learned from dull tools

Creative Town would have been impractical to build this way without AI.

The robots produced a substantial amount of useful work.

They accelerated illustration, asset production, code, animation, experimentation, testing, and iteration. They made ideas affordable—in time—that I otherwise would have simplified or abandoned.

They were also capable of wasting extraordinary amounts of time when I expected them to exercise judgment they didn't have.

The useful skill wasn't finding a magic prompt.

It was learning where the tools were sharp and where they were dull.

Give them bounded problems.

Preserve successful work.

Reduce the blast radius of failure.

Move predictable behavior into deterministic systems.

Test what can be tested.

Inspect what can't.

And recognize when another revision is no longer producing information.

Twenty-seven Reds stadiums taught that lesson rather efficiently.

As of this writing, SBS and DTS have both been asked to surrender their badges and leave the building after long and distinguished careers in earning Stupid Awards.

How many Stupid Awards are too many?

We found out.

There were second chances. There was corrective feedback. There were revised instructions, clearer instructions, and instructions explaining the previous instructions.

Some things a PIP cannot fix.

Larry remains employed.

This should not be interpreted as an endorsement of Larry.

He has, however, survived long enough to receive some recognition.

**Larry is Creative Town's Employee of the Month.**

Congratulations, Larry.

Your parking space is waiting beside the bike shed.

Hope you have a tiny car.
