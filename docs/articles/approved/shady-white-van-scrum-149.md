# Shady White Van

## Fake Band. Real Music.

It started with a fake band.

Not a fake *website* for a band. That would have been too easy. Shady White Van was going to make real music eventually. We just didn't have much of it yet.

What we did have was a name, a questionable sense of humor, a growing collection of song ideas, and an obvious domain name.

So I built the website first.

I also used it as an excuse to get out of my normal Angular neighborhood and build something from scratch in React. No template. No design system borrowed from another project. No giant component library because I might need a button someday.

The rule was:

**Form follows function follows accessibility and performance.**

React. TypeScript. Vite. Semantic HTML. Keyboard support. Reduced motion. Responsive from the beginning. Cloudflare deployment.

Before I gave the thing permission to become ridiculous, I wanted to know exactly how fast and clean boring could be.

The early production build hit the numbers I wanted, including a desktop Lighthouse run of **100 / 100 / 100 / 100**.

Then I ruined everything.

On purpose.

## Give the robot the keys

I wanted to see what happened if I gave an AI image generator the basic site and enough creative freedom to decide what Shady White Van should look like.

That became **Crackhead Pass #1**.

And Crackhead had ideas.

Some of them were actually pretty good.

It found a grimy garage/roadside aesthetic. A beat-up white van. Giant hand-painted lettering. Black backgrounds. Warm practical lighting. Torn-paper, homemade-zine energy.

It felt like something a band called Shady White Van might actually assemble in a garage.

It also hallucinated an entire Music/Merch/Tour ecosystem that didn't exist, invented copy nobody asked for, and filled parts of its own presentation with text too small for a human being to read.

My initial design critique was concise:

**“hmmm can’t read all that...”**

That wasn't the worst part.

ChatGPT also managed to turn preservation into performance art. I told it to preserve work for the case study. It said it had.

It hadn't.

That screw-up permanently changed the workflow.

From then on, “preserved” meant there was an actual artifact in an actual durable location. Prompts, originals, screenshots, Lighthouse reports, rejected attempts, decisions and deployment evidence started going into a version-controlled archive.

“Log this.”

“Preserve this.”

“Document this for the case study.”

Those stopped being conversational requests and became operational commands.

If there wasn't a file, there wasn't evidence.

## One pass. Make it stupid.

Eventually the brief had accumulated enough nonsense that I wanted to see what would happen if I gave the image generator all of it at once.

One pass.

No iterative rescue operation.

The van was a shabby 1970s custom Chevy slowly becoming a psychedelic UFO/showpiece. Gold portholes. Custom trim. Rotating display. Layers of graphics. Different visual worlds moving across the same vehicle.

The result wasn't production artwork.

But for once, it was useful.

The showroom was too gaudy. Some of the details were nonsense.

The van, though, asked the right question:

**Can I make that still image live?**

That question changed the project.

Shady White Van wasn't going to be a band homepage with a cool hero image anymore.

The van itself was going to become the website's living centerpiece.

## Cheap graphics. Expensive choreography.

The obvious way to create a constantly changing psychedelic van would be to render giant animations or videos and plaster them onto it.

I didn't want that.

The more interesting problem was figuring out how little media I could ship and how much richness I could manufacture in code.

Small graphics.

Procedural treatments.

Independent layers.

Different motion rates.

Alpha changes.

Distortion.

Depth.

Counter-motion.

Transitions that don't wait for every other transition.

I described it as:

**“a choreographed screen saver on a lazy river.”**

Instead of building a separate React experience for every design, the architecture evolved around one persistent van and a conductor that changes what its surfaces are doing.

Prepare the next content before revealing it. Keep the current treatment alive while the next one loads. Don't flash empty materials. Don't expose half-built frames.

The expensive part isn't the bitmap.

It's the choreography.

## And then the van looked like shit

There was one fairly important problem.

We needed a van.

The first procedural Three.js attempt technically worked.

It rotated.

It responded to the viewport.

It supported reduced motion.

The materials could be separated.

It could be lazy-loaded so the ordinary page didn't pay for Three.js until it needed it.

Engineering-wise, it checked a surprising number of boxes.

Visually?

**“no! that looks terrible!”**

It looked like somebody had been told that vans were rectangular but hadn't been given any additional information.

That wasn't a polish problem.

It was the wrong van.

The entire visual concept depended on a recognizable 1970s custom Chevy. If the underlying vehicle was generic, no amount of psychedelic material work was going to save it.

So we stopped trying to decorate the wrong answer.

I locked the visual reference, collected real custom-van photography, dug up historical Chevrolet G-Van information and installed Blender.

The standard wasn't concours restoration accuracy.

This is a fake rock band.

The standard became:

**Close enough for rock and roll.**

But “close enough” still had to be based on evidence rather than whatever shape an AI happened to invent that afternoon.

## The part where I hired another robot

By this point ChatGPT's image-generation adventures had produced useful ideas, some genuinely terrible execution, a preservation screw-up, and enough rework that the tool itself had become part of the experiment.

So I changed tools.

I brought Claude into the project.

That distinction matters because this isn't a case study about pressing an **AI** button and getting a website.

The creative director didn't change.

I was still defining the concept, approving and rejecting the work, supplying references, changing the architecture when the evidence demanded it, and deciding when something that technically worked still wasn't good enough.

The AI collaborator changed.

And the results changed dramatically.

**Same human creative director. Different AI tools. Wildly different results.**

With the repository, Blender pipeline, reference material, constraints and rapid feedback loop in place, the project accelerated.

The van moved from an experiment to the live hero.

Blender fed an optimized GLB pipeline. Three.js rendered it in the browser. The showroom gained a reflective pedestal, glow and environmental lighting. Chrome, glass, lenses and lamps got physical material treatments.

The white custom van picked up its bubble windows, visor, roof vent, ladder and spare, bumpers, grille, body flares, hood scoop, running boards, wide slot-mag wheels, exhaust and—because this is still Shady White Van—its custom plates:

**SHADY 1**

**STATE OF CONFUSION**

Then we gave the thing clothes.

## Twenty-six vans. One van.

The production skin system now cycles through **26 visual treatments**.

Some are procedural. Some are animated. Some are cultural homages built from color and motif rather than logos. Some exist primarily because someone should have stopped me and nobody did.

There is liquid chrome.

SWV Bedlam.

Dark Side of the Moon.

Yellow Submarine.

Deep-Sea Encounter.

Blacklight Ballroom.

Disco Mothership.

Interstellar Airbrush.

Axis: Bold as Love.

Cosmic Cowboy.

Persian Flying Carpet.

Stained-Glass Cathedral.

EVH Stripes.

General Lee.

A-Team.

Mystery Machine.

School Bus.

Digital Rain.

Death Star.

Coral Reef.

Starry Night.

Camouflage.

Spiral Galaxy.

Moon Landing.

Flying Guitars.

And then there's **Maze Chase**.

Maze Chase isn't a picture of an arcade game wrapped around the van.

It's an arcade game running on the van.

Each flank gets a live chase animation: chomper, pellets, four ghosts, power-pellet state change and restart behavior, fed through the same animation system used by the other skins.

At some point during development, the sentence “the arcade game running on the side of the 1974 psychedelic van needs work” became a perfectly ordinary engineering discussion.

That's about when I knew the project was healthy.

## Failure still counts after it works

Getting a convincing van into production did not suddenly make every idea good.

On November 1, I pushed for the front end to look more like the 1975–77 custom-van references.

That produced roughly a dozen incremental reconstruction attempts.

One problem would get patched.

Something else would get worse.

Another reference would suggest another correction.

The whole thing became less convincing with every supposedly helpful improvement.

Eventually I threw all of it away except the license plates.

That is not missing history.

That **is** the history.

One of the most useful things you can do in design or engineering is stop defending work because you already paid for it.

If the underlying approach is wrong, polishing it harder doesn't make it right.

Reset.

The current body shell is still an approximation. If I decide it needs another fidelity jump, the answer is a better source mesh and modeling pass—not fourteen more clever patches to the wrong geometry.

## The website reacts to the van

The van isn't simply rotating inside a static white box.

Its environment participates.

The current skin can influence the surrounding light and color. The header lives with the experience instead of behaving like an unrelated navigation bar floating over a demo.

The pedestal catches the vehicle.

The showroom catches the light.

The skin changes the room.

But the visual excess still has rules.

Motion can pause.

Reduced-motion preferences matter.

Expensive rendering isn't supposed to become a tax on pages that don't need it.

Accessibility doesn't get postponed until after the fun part.

That was the original rule, and the fact that the project became absurd doesn't give it permission to forget.

## Then I put the live thing inside my Angular site

A screenshot would have been easier.

It also would have missed the entire point.

Shady White Van is alive because it moves and changes. The portfolio case study needed to show that, not display a photograph of it.

So the React site gained a dedicated **3:1 embed target** for my Angular portfolio.

The embedded presentation centers the live rotating van in a wide cinematic band, suppresses the parts of the standalone site that don't belong in the case study, and lets djamespoer.com display the actual SWV experience cross-origin instead of shipping a fake reproduction of it.

It was tested at **750 × 250** and **420 × 140**.

So now an Angular portfolio can contain a window into a React/Three.js experience rendering a Blender-built 1970s custom van covered in procedural artwork and occasionally running an arcade game on its doors.

Which seems like a perfectly reasonable way to demonstrate front-end development.

## What I actually built

Underneath the joke, SWV became a fairly serious technical playground:

**React 19. TypeScript. Vite 8. Three.js. Blender. Draco-compressed GLB assets. Cloudflare Workers static hosting. Procedural graphics. Canvas animation. Dynamic materials. Responsive 3D. Reduced-motion handling. Lazy-loading. Cross-origin embedding.**

But the technology list isn't the interesting part.

The interesting part is the process that produced it.

Start with a boring, measurable foundation.

Give experimentation somewhere safe to happen.

Let AI generate possibilities without granting it authority.

Keep the original evidence.

Reject work that is technically correct but experientially wrong.

Change tools when the tool becomes the bottleneck.

Don't let sunk cost become architecture.

Use code to create richness instead of throwing bandwidth at the problem.

And don't confuse an AI producing something with the human deciding whether that something is any good.

## Fake Band. Real Lessons.

Shady White Van started because “Fake Band. Real Music.” made me laugh.

It turned into an experiment involving multiple AI systems, React, Three.js, Blender, historical vehicle research, accessibility, procedural graphics, performance budgets, evidence preservation, a live arcade game and a truly unreasonable amount of thought about a 1970s van.

Some of the AI work was brilliant.

Some of it was useless.

Some of it was so bad I hired a different AI.

That's part of the point.

The most valuable skill in an AI-assisted workflow isn't knowing how to ask a machine to make something.

It's knowing when what it made is wrong.

And then knowing what to do next.

**Fake Band. Real Music.**

Apparently, real engineering too.
