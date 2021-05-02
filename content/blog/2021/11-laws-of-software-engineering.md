---
layout: post
title: "11 Laws of Software Engineering"
date: 2021-05-02 11:00:00 -0500
categories: software
featured: images/engineering-laws.jpeg
description: ""
---

### 1) Hoots law

https://blog.boomsupersonic.com/the-astronauts-guide-to-problem-solving-5eafdca29fd7

> No matter how bad things are, you can always make them worse.

A production incident can have this false comforting feel that we are already in a worst-case scenario, so the only place left to go us up - just start trying things! This is problematic if it is just a bad scenario, not a worst-case scenario, where some actions can make things worse instead of better.

A comforting feeling I do get from this law is that keeping cool under pressure adds value.

### 2) Brooks law

https://en.wikipedia.org/wiki/Brooks%27s_law

> Adding human resources to a late software development project makes it later.

Sometimes in the last mile of a late project, a developer or team gets added to speed up delivery - there is a good chance this will have the opposite effect. The ramp-up time of new resources and communication overhead is a short-term cost being paid for a medium-term benefit of more velocity.

### 3) Pareto principle

https://en.wikipedia.org/wiki/Pareto_principle

> Roughly 80% of consequences come from 20% of the causes

After getting familiar with a system, I find this generally holds. There usually is an architecture, pattern, abstraction, style, etc... constituting a small 20% but contributing to 80% of the issues.

### 4) The 90-90 rule

https://en.wikipedia.org/wiki/Ninety%E2%80%93ninety_rule

> The first 90 percent of the code accounts for the first 90 percent of the development time. The remaining 10 percent of the code accounts for the other 90 percent of the development time.

Similar to the Pareto Principle where two categories have an unequal contribution, there is a concept of the 'easy part' and 'the hard part'. You probably did the easy part first, and the last mile is the hard part. This could even be due to Brooks's law, congratulations you also have new teammates who need training and mentoring in your last 10%!

### 5) Conway's law

https://en.wikipedia.org/wiki/Conway%27s_law

> Any organization that designs a system will produce a design whose structure is a copy of the organization's communication structure.

The implication of this is you can choose an organization design that helps facilitate a system you want to ship. For example, having a frontend team and a backend team will likely make it easier to build features for either frontend or backend code, but harder to make features that need both frontend and backend.

### 6) Murphies law

https://en.wikipedia.org/wiki/Murphy%27s_law

> Anything that can go wrong will go wrong

Distributed API calls between microservices will hit an unhappy path. Also, when did you last time you checked your database backup process?

### 7) Kerninghams law

[eps]: https://en.wikipedia.org/wiki/The_Elements_of_Programming_Style

From Kernighan and Plauger's book [The Elements of Programming Style][eps]

> Debugging is twice as hard as writing the code in the first place. Therefore, if you write the code as cleverly as possible, you are, by definition, not smart enough to debug it.

If someone has just learned about a complex event-sourced/other design that pushes their knowledge limits - then wants to build a production system with this new knowledge, Kerninghams Law says they will launch it in production then be unable to debug it.

### 8) Galls law

http://principles-wiki.net/principles:gall_s_law
> A complex system that works is invariably found to have evolved from a simple system that worked. The inverse proposition also appears to be true: A complex system designed from scratch never works and cannot be made to work. You have to start over, beginning with a working simple system.

If there were no feature requirements for event-sourcing, that event-sourced system from Kerninghams law may never work and you might want to consider reverting to CRUD.

### 9) Law of Demeter

https://en.wikipedia.org/wiki/Law_of_Demeter
> Each unit should have only limited knowledge about other units

This applies to objects as well as microservices. Methods like `user.account().preferences().timezone()` means a user needs to know how accounts and preferences work when we just want a timezone. This type of chain is a barrier to change, a modification to preferences can break the user even if those objects never interact with each other.
### 10) Linus's Law

https://en.wikipedia.org/wiki/Linus%27s_law

> Given enough eyeballs, all bugs are shallow.

If only one person knows how a piece of code works, a deep bug will appear while they are on vacation. Knowledge sharing is advisable.

### 11) Premature Optimization Effect

http://wiki.c2.com/?PrematureOptimization

> Premature optimization is the root of all evil.

The term "scalability" can sometimes make a software engineer's higher reasoning shut down. Scalability has numbers and projections, we can create hypotheses around these numbers and test our correctness. I have seen engineering teams spend months optimizing a system to scale to over 10k requests per second because of "scalability", while the actual usage barely reached 1.0 request per second
