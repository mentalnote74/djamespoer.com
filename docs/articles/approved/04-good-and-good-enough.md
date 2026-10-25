# Consideration #1

## The Difference Between Good, and Good Enough

There is a dangerous phrase in software development.

“Good enough.”

Sometimes it is exactly the right answer.

Sometimes it is what you say five minutes before creating a problem that somebody else will spend three weeks fixing.

Knowing the difference might be one of the more important skills in building software.

I have spent enough years working on enterprise applications to know that perfection is not a deliverable. There is always another edge case. Another browser. Another viewport. Another refactor. Another usability improvement. Another clever abstraction you could build because surely, someday, somebody is going to need it.

You can polish software forever.

At some point, you have to ship the damn thing.

That is **good enough**.

But there is another version.

The keyboard interaction is broken, but we’ll fix it later.

The architecture is already fighting us, but the ticket says Done.

The component technically works if you use it exactly the way the developer who wrote it expected you to use it.

Nobody tested the weird case.

Nobody tested the boring case.

Nobody tested it with a screen reader.

Nobody tested it on the phone sitting six inches away from them.

But the happy path worked once on Chrome, so...

Good enough.

That is not the same thing.

## Good enough has to be good first

I think that is the part we sometimes lose.

“Good enough” is supposed to describe **where we stop improving something that already satisfies its purpose**.

It should not describe the point where we got tired.

Those are very different engineering decisions.

There is actually a respectable body of thinking behind stopping before perfection. User-interface design is inherently iterative. You do not discover the perfect interface in a conference room and then faithfully type it into existence. You build something, observe what happens, learn, change it, and repeat.

That means version one does not need to contain every improvement that version twelve eventually will.

It does need to be a defensible version one.

The same distinction appears in accessibility. WCAG itself has levels of conformance. Level A is the minimum. Level AA incorporates A and AA. Level AAA goes further still, and W3C explicitly does not recommend requiring AAA across an entire site because some content simply cannot satisfy every AAA criterion.

That is a useful model.

There is a defined floor.

There is a meaningful target.

And there are improvements beyond it.

“Good enough” can live somewhere in that structure.

“Eh, nobody using a keyboard has complained yet” cannot.

## The last five percent is expensive

Anybody who has built anything complicated knows this curve.

Getting something from zero to working can happen surprisingly fast.

Getting it from working to good takes longer.

Getting it from good to excellent takes longer still.

And getting it from excellent to whatever mythical state we have decided constitutes perfection can consume an astonishing amount of time while producing increasingly tiny amounts of actual value.

Eventually you are sanding the underside of the drawer.

There is nothing wrong with beautiful craftsmanship. I actually like sanding the underside of the drawer.

The problem is pretending the customer is always better served because I did it.

Sometimes they are.

Sometimes the drawer needed to be installed Tuesday.

That is where judgment enters the equation.

The question is not:

**Can this be better?**

Of course it can.

The useful question is:

**What becomes meaningfully better if I keep working on it?**

Does another day improve usability?

Does it remove an accessibility barrier?

Does it reduce meaningful technical risk?

Does it make the next ten changes substantially easier?

Does it solve an actual user problem?

Or am I adjusting the border radius because I have become emotionally attached to the border radius?

I have done both.

## There is also such a thing as stopping too early

This is where “move fast” gets expensive.

Martin Fowler's technical-debt metaphor remains useful because shortcuts are not necessarily free. Poor internal quality makes future changes more expensive. Fowler's Design Stamina Hypothesis goes even further: skipping design can make a team look faster initially, but eventually the better-designed system overtakes it because it remains easier to change.

That means there are two ways to waste time.

You can overbuild something nobody needs.

Or you can underbuild something everybody has to keep fighting.

Both are waste.

One happens before shipping.

The other sends you invoices afterward.

The second one is particularly sneaky because the first release may look like a success. The feature shipped. The sprint closed. Everybody got a green check mark.

Then somebody asks for a small change.

And discovers that the small change requires archaeology, prayer, three regression fixes and the sacrifice of a junior developer.

Congratulations.

Yesterday's velocity has arrived with interest.

## “Done” is not a synonym for “perfect”

This is why I like acceptance criteria.

Not because Jira needs more boxes.

Because a good acceptance criterion forces us to decide what **good enough actually means before we're exhausted and trying to declare victory**.

The interaction works with a keyboard.

The page reflows correctly.

The error state is announced.

The user can recover from a mistake.

The important browsers work.

The architecture leaves us somewhere reasonable for the next change.

The thing solves the problem we said we were solving.

Now we have a floor.

Above that floor, we can still improve things.

We can improve the animation.

We can tune the copy.

We can refactor something that is awkward but harmless.

We can investigate the 0.1 percent case.

We can make the shadow eleven percent more shadowy.

But those things should have to compete with everything else we could build.

That is not lowering standards.

That **is** having standards.

## Good enough is a product decision

The best engineers I have worked with were not the people who refused to compromise.

They were the people who knew **what could be compromised**.

That requires understanding more than code.

You need to understand the user.

You need to understand the business.

You need to understand accessibility.

You need to understand architecture well enough to know which shortcut is temporary and which one quietly pours concrete around your ankles.

You need to know which imperfection is cosmetic and which one becomes structural.

And occasionally you need enough humility to admit:

I don't know yet.

So ship the smaller thing that lets us learn.

That is where “good enough” becomes powerful.

It creates room for evidence.

Instead of spending three weeks predicting what users might need, sometimes you spend three days building the smallest version you are proud to put in front of them.

Then you watch.

Then you learn.

Then you make it good again.

Not perfect.

Good.

## The line moves

There is one last complication.

Good enough is contextual.

A portfolio Easter egg and a banking transaction should not have identical risk tolerances.

A prototype and a production authentication system should not have identical definitions of done.

A decorative animation can fail gracefully.

A submit button cannot.

An internal experiment might reasonably accumulate debt that a heavily reused enterprise component absolutely should not.

The standard changes because the consequences change.

That does not make quality arbitrary.

It makes quality a judgment.

And that may be the real difference between **good** and **good enough**.

Good describes the thing.

Good enough describes the thing **in context**.

For this user.

For this risk.

For this moment.

For what we know today.

With enough quality that we are willing to stand behind it—and enough restraint to stop polishing it long enough to find out whether we were right.

Then we ship.

And tomorrow, if the evidence says we were wrong, we make it better.

---

## Research sources / citations

1. **W3C — Web Content Accessibility Guidelines (WCAG) 2.2.** Supports the discussion of conformance levels: Level A as the minimum, Level AA requiring A + AA, Level AAA requiring A + AA + AAA, and W3C's note that Level AAA should not generally be required for entire sites because some content cannot satisfy every AAA success criterion.  
  https://www.w3.org/TR/WCAG22/
2. **Nielsen Norman Group / Jakob Nielsen — “Iterative User Interface Design.”** Supports the discussion of UI design as an iterative process: interfaces are refined through testing/evaluation and redesign rather than expected to emerge perfect on the first attempt. The article reports substantial usability improvements across successive iterations in its case studies.  
  https://www.nngroup.com/articles/iterative-design/
3. **Martin Fowler — “Design Stamina Hypothesis.”** Supports the argument that neglecting software design may increase apparent delivery speed initially but can reduce future productivity as the codebase becomes harder to change; good design can eventually overtake the no-design approach. Fowler explicitly describes this as a hypothesis/judgment rather than objective proof.  
  https://martinfowler.com/bliki/DesignStaminaHypothesis.html
4. **Martin Fowler — “Technical Debt.”** Supports the debt/interest metaphor used in the article: deficiencies in internal quality make future modifications more expensive, with the extra effort functioning like interest on debt. Fowler also cautions that technical debt can be misused to justify neglecting internal quality.  
  https://martinfowler.com/bliki/TechnicalDebt.html

**Status:** Consideration draft only. Not approved for publication.
