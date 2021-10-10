---
layout: post
title: "Survivorship Bias and Organizational Scar Tissue"
date: 2021-10-10 09:00:00 -0500
categories: linux, systemd
featured: images/survivorship-bias.png
description: ""
---

How do organizations end up with so many rules that get in the way of getting work done? Well-intentioned decision-makers are often victims of [Survivorship Bias](https://en.wikipedia.org/wiki/Survivorship_bias) and implement rules using incomplete data, leading to counterproductive results. Survivorship bias is when decisions are made based on the data that has 'survived' some selection process.

My favorite example of Survivorship Bias is World War 2 bombers. Instead of adding armor to the most-hit areas of the returning bombers, the data supporting this was from the 'surviving' bombers that withstood hits and the least-hit areas were the bombers that did not survive and return to be included in the dataset.

> During World War II, the statistician Abraham Wald took survivorship bias into his calculations when considering how to minimize bomber losses to enemy fire. The Statistical Research Group (SRG) at Columbia University, which Wald was a part of, examined the damage done to aircraft that had returned from missions and recommended adding armor to the areas that showed the least damage. This contradicted the US military's conclusion that the most-hit areas of the plane needed additional armor. Wald noted that the military only considered the aircraft that had survived their missions – ignoring any bombers that had been shot down or otherwise lost, and thus also been rendered unavailable for assessment. The bullet holes in the returning aircraft represented areas where a bomber could take damage and still fly well enough to return safely to base. Therefore, Wald proposed that the Navy reinforce areas where the returning aircraft were unscathed, inferring that planes hit in those areas were the ones most likely to be lost. His work is considered seminal in the then-nascent discipline of operational research. - [Wikipedia, Survivorship bias](https://en.wikipedia.org/wiki/Survivorship_bias)
>

## A Deployment Example

A production software deployment just resulted in a bug being released that impacted a few people in departments thought to be unrelated to the change, the case marketing, and sales departments. We now have a cross-department meeting to discuss how to avoid this problem.

### An eager policy

Our decision-maker looks at the dataset of deploys that went wrong and sees 1 element. In this dataset, 100% of the elements are bugs from deploys. The bugs could have been caught by a cross-department review. The obvious decision is to add a policy where all deploys get reviewed by both the sales and marketing departments, even for changes not anticipated to impact those departments.

Let's say this deploy issue resulted in a cost of 25 hours worth of additional work (not a catastrophic company-ending event, but enough to throw the day off for a few people). The deployment review policy adds an extra 1-hour work per deployment (the time cost for a developer plus someone from the sales and marketing departments). It seems obvious that this 1-hour time investment is a great idea, and we are eager to add this policy to get a 25x return on investment.

### The missing data

What happened to the 99 deploys prior to this issue that happened without a problem? Our new policy impacted all 100 deploys, but the data that 'survived' was the 1 issue that resulted in a bug. Instead of our new policy being targeted towards 100% of the data set, it only targeted the visible 1%. That 1-hour time investment per deployment adds up to 100 hours of work to prevent a 25-hour issue, a 0.25x return on investment. Not only is adding a deployment review policy a bad idea, but we might start considering what other deployment policies can be removed!

### Insight

Not only will Survivorship Bias lead us to take counterproductive decisions, but it also gives the illusion that we are making progress. This illusion pushes out room for alternative ideas. If we look at the full dataset: 100 deploys, 1% error rate, 25-hour cost per error. We might explore some alternative ideas:

- Since there are many more good deploys than bad deploys, are there low per-deploy cost investments like automated testing?
- 25-hour is a high cost per error, can we reduce that with faster detection or remediation?
- Are there commonalities between the errors? e.g. an individual, team, or system that is disproportionally responsible

In [No Rules Rules](https://www.goodreads.com/book/show/49099937-no-rules-rules) Reed Hastings writes "*some people will cheat, but the gains outweigh the losses*" (p62) in reference to removing expense policies. Policies about employee expenses follow a similar pattern. It may be simpler to educate a single person who made a bad decision, rather than add a lowest common denominator policy to all employees.

## Organizational Scar Tissue

Adding policies is easier than removing them. Organizational scar tissue is the accumulation of rules and policies that provide little or questionable value. If the decision-making for introduction policies is subject to Survivorship Bias, this means they will probably stick around for the same reason. The end result is a bunch of rules that do more to get in the way of work getting done than they do to enable work getting done.
