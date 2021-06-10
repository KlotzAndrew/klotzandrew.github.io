---
layout: post
title: "Engineering Strategy 5x5"
date: 2021-06-09 17:00:00 -0500
categories: architecture
featured: images/5x5.png
description: ""
---

The idea for a 5x5 method for coming up with an engineering strategy in [Write five, then synthesize][write_five] - which I recommend reading. The gist is to write down 5 decisions and use those to create a strategy, and 5 strategies to create a vision,

### Why create an engineering strategy?
An engineering strategy adds value is by helping others make decisions. This is done by providing direction and reducing the number of available choices. A simple test is:
- can someone refer to the strategy as a tool to help come to a decision?


A pitfall I have made when crafting strategies making them too generic to provide value or contain conflicting direction. An easy way to fall into this trap is to start with high-level ideas and try to fill out the rest from there. The challenge with high-level ideas first is it lacks specifics. Without specifics, it will be really hard to avoid generalities and truisms.

Three attributes make a good strategy, From [Good Strategy, Bad Strategy][good_bad]:
1. **Diagnosis**. What is the nature of the problem? A good diagnosis simplifies something complex into something straightforward. A well-framed diagnosis will make our actions seem obvious.
2. **Guiding policy**. The overall approach to overcome the challenge identified in the diagnosis. This section is the direction and guardrails to narrow down the available actions.
3. **Coherent action**. Actions that can be taken to follow the guiding policy. These actions should be concrete, using existing resources and within the power.

The high-level idea first approach is similar to starting with the guiding policy. It is hard to have a coherent policy without first knowing the problem and without a coherent policy, it is unlikely to lead to coherent actions.

A few questions to quickly check a strategy:
- What problem are we trying to solve?
- What approach will we take to solve it?
- What specific actions can I take for this approach?

### Start small
Instead of starting with high-level ideas, we want to start with decisions and work up.

If you are not already writing technical decisions down, you should. It is an easy way to start building up an engineering culture and you are probably making lots of them already. The format is less important than the content. My preference is to use markdown and git, because of the familiarity of developers. A particular format I like is [Architecture Decision Records][adr], but any format like the ones at [Google][docs_google], [Azure][docs_as3], [Uber][docs_uber] will do.

Leaning on existing decisions gives us a few advantages out of the gate for making a strategy.
A strategy built from decisions already has diagnosed problems from the decisions.
The common theme for the decisions is the existing guiding policy, how have you already been deciding?
Decisions are as specific as it gets, so extrapolating out other coherent actions is just following the pattern.

Visions follow the same pattern, but instead of 5 decisions to a strategy, they are 5 strategies to vision.


[good_bad]: https://www.goodreads.com/book/show/11721966-good-strategy-bad-strategy
[write_five]: https://lethain.com/good-engineering-strategy-is-boring/

[adr]: https://adr.github.io/
[docs_google]: https://www.industrialempathy.com/posts/design-docs-at-google/
[docs_as3]: https://caitiem.com/2020/03/29/design-docs-markdown-and-git/
[docs_uber]: https://blog.pragmaticengineer.com/scaling-engineering-teams-via-writing-things-down-rfcs/
