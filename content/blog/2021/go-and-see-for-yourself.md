---
layout: post
title: "Toyota Production System Principle - go and see for yourself"
date: 2021-12-22 13:00:00 -0500
categories: golang
featured: images/cicd.jpeg
description: ""
---

> If you sit with an engineer and ask them to show you their commit-to-production workflow, it is staggering how tolerant engineers are of toil, and frustration, and friction
>

This quote from [Danny Thomas on developer productivity at Netflix](https://www.youtube.com/watch?v=PqgbJSgvqj0&t=777s) ties directly into one of the principles of the [Toyota Production System](https://en.wikipedia.org/wiki/Toyota_Production_System): Go and see for yourself to thoroughly understand the situation ([Genchi Genbutsu](https://en.wikipedia.org/wiki/Genchi_Genbutsu)).

The concept is exactly what it sounds like. Instead of relying on second-hand information to understand a situation you need to literally go and see it for yourself. This is important because second-hand information may be biased or incomplete. Someone might report back that everything is running “good as usual”, where their definitions, experience, or context of “good” and “usual” are materially different than what you have in mind.

The paper “[The normalization of deviance in healthcare delivery](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2821100/)” describes how deviance from policy becomes normalized within a group of well-intentioned actors. What can start off as local optimizations to take a shortcut, live with friction, or ignore a policy can become “the norm”. The paper focuses on risk, but this extends to identifying opportunities for optimizations and improvements. The challenge this poses is that without seeing for yourself, the information received from the ground level may be different from what is happening.

What does this mean for DevOps and developer productivity? The primary mechanism engineering teams use to deliver value is to ship code to production and maintain it, go and see for yourself how these things are done to understand for yourself. This could be working on a tiny feature yourself, or just pairing with an engineer. Some of the things this includes:

- Finding work/task requirements
- Development environment setup/writing code
- Testing/Deploying
- Monitoring/Alerts

What I would consider a missed opportunity for people in leadership is to use a bespoke development process for themselves when they get hands-on. It might be very tempting to set up a development workflow for yourself with the idea of keeping out of the way from developers, but this misses out on a huge opportunity to get first-hand experience.
