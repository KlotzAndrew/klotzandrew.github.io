---
layout: post
title: "Strategy for Scaling a Platform Team"
date: 2021-10-25 09:00:00 -0500
categories: management
featured: images/team-topologies.png
description: ""
---

A growing software department usually means creating a dedicated 'platform team' to take care of the non-feature components, but what should that team look like? and how does it interact with the rest of the organization so it scales?

The objective of a platform team is to let the future teams focus on shipping features and sequester off dedicate development time to addressing platform issues that no team individually has bandwidth for. Pagerduty has an article on [scaling an engineering organization](https://www.pagerduty.com/blog/scaling-engineering-org/) that mentions creating this type of team, but not what it should look like. The default ownership for this type of team can end up with "everything non-feature related". Without much planning, this configuration can quickly lead to an overwhelmed platform team and developers with a platform that does not inspire joy.

Adding more developers to the platform team alone might not solve the problem. As the width of the number of teams to support increases, and the depth of different tools increases the cognitive load can grow exponentially for a platform team while hiring grows linearly. There is a solution that does not involve increasing team size to keep up. [Team Topologies](https://www.goodreads.com/book/show/44135420-team-topologies) provides a framework for reasoning about team interactions with 4 team types, and 3 interaction models. With this framework of team types and interaction models, we can identify a scaling trap and how to organize a platform team in a way to avoid it.

## The 4 team types

"Platform team" is a loaded term and can mean different things in different contexts. The purpose of team types is to minimize the ambiguity of what our teams should be doing.

### Stream Aligned Team

Stream-aligned teams are what we can consider a typical feature or product team. They are the ones aligned to a specific value stream for users, responsible for continuously shipping features to support that value. Steam-aligned teams should as much as possible, be able to deliver value independently from other teams. This means there are some required capabilities they need to perform to be considered an effective team:

- Development and coding
- Design and architecture
- Commercial viability analysis
- User Experience
- Product management and ownership
- Infrastructure and operability
- metrics and monitoring
- Testing and QA
- Application security

The more independent these teams are, the less cognitive load they will have to deal with, and the less cognitive load they will require from other teams to function.

### Platform Team

The platform in this framework is the team that provides the self-serve capabilities that the stream-aligned teams require. This is typically the typical definition of platform team that comes to mind when I think of the term.

### Enabling Team

Instead of building or owning a capability, Enabling teams to pick up projects that enable teams to do more. For example, a Platform Team might build the capability for a fast CI pipeline but an Enabling Team would pick up a project for migrating difficult CI pipelines. Another example would be a division between monitoring capabilities to track uptime, and the enabling projects to improve that uptime.

Enablement is a type of work that typically starts off sitting with a platform team. Especially in smaller settings, creating a capability and enabling with that capability might be the same piece of work.

### Complicated subsystem

A subcomponent of the system that depends on specialist knowledge. These teams exist when consolidating the cognitive load of a component to a few specialists can unburden the rest of the teams of dealing with the complexities. An example could be [Monzo moving payments processing to a single component.](https://www.notion.so/Strategy-for-Scaling-a-Platform-Team-f7c0a0483b1840f88ec9b52546acce05) The difference with platform teams is this team is likely providing an API or library from a few specialists.

## The 3 Interaction models

Interaction models are how teams work with each other. Any team type can be using one of the interaction models, the combination of the two is what we work on and how we work on it with others.

### X-as-a-service

X-as-a-service is typically what I think of when "platform team" gets mentioned. The platform is the foundation that others build on top of, it has a well-defined and well-documented surface area. Other teams within the company can expect it to cover their expected use cases and can pick it up primarily from the documentation.

### Collaboration

Collaboration is when two teams work closely to solve a shared goal. In the platform context, this model can be used for rolling out new technologies. A stream-aligned team will need a new technology to support a business case, which lends itself nicely to collaborating with a platform team who will be making that-as-a-service.

### Facilitation

Facilitation is where one team clears impediments for another team. Impediments could be technology-based or knowledge-based. The advantage of facilitating is that it quickly unblocks the team on the receiving end, the disadvantage is an increased cognitive load on the facilitating team. Facilitation should not be done with too many teams at a time.

### Collaboration Modes
| Team                  | Collaboration | X-as-a-service | Facilitation |
|-----------------------|---------------|----------------|--------------|
| Stream aligned        | Typical       | Typical        | occasional   |
| enabling              | occasional    |                | Typical      |
| Complicated subsystem | occasional    | Typical        |              |
| platform              | occasional    | Typical        |              |

## Avoid a Scaling Trap

A scaling trap is a platform team getting stuck in "facilitating mode". For each X-as-a-service, ownership needs to be clearly defined and work put in to reach "as a service" status. Failing to hit this threshold can result in perpetual facilitation; steam-aligned teams will perpetually need to be unblocked for the same reason. This facilitation translates into toil for a platform team. As the number of teams and systems increases, this toil can quickly consume most of the platform team's time and prevent scaling. In addition, there is usually no difference between Enabling Teams and Platform teams, reinforcing the idea that facilitation is a worthwhile activity to be spending time on.

There is a path forward that can also be done incrementally:

1. Identify what capabilities need to be provided to stream-aligned-teams
2. Identify the API boundaries for those capabilities
3. Identify feedback loops to iterate on API boundaries for the systems providing that boundary
4. Identify systematic blockers that might need an Enabling Team instead of a Platform Team

With this strategy, even if the API boundary is incorrect today your team will have a way to incrementally reduce toil. [Team Topologies GitHub repo](https://github.com/TeamTopologies/Team-Shape-Templates) has some resources to help with an exercise for identifying teams and interaction types.
