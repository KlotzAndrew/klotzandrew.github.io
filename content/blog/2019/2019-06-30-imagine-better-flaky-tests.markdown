---
layout: post
title: "Imagining better flaky test management"
date: 2019-06-30 17:20:00 -0500
categories:  engineering velocity, testing
---

If we imagined better tooling around managing flaky tests what could we come up with? One thing I have noticed in working with polyglot that often come with docker, is that while each language/framework has its own tools for testing, there are some recurring issues around flaky tests that are common in all. If it is a common problem, maybe one day there will be tooling around it that is as common as run of the mill unit testing tools.

There are costs of flaky test, some are easy to measure:
 * <b>Direct cost of engineering time</b>, every rerun is 30 minutes you are paying an engineer to stare at a screen.
 * <b>Indirect cost of risk</b>, engineers start ignoring warning signals that could be real issues, this could mean <a href="https://www.travelweekly.com/Travel-News/Airline-News/Analysis-shows-pilots-often-ignore-Boeing-737-cockpit-alarm">ignoring a warning sign that a plan is about to crash</a>
 * <b>Indirect cost of tech debt</b>, a flaky test suite is much more likely to become derelict and be discarded

The upsides are hard to measure, but part of building high velocity teams:
 * <b>Culture of quality</b>, a really great developer experience around testing makes it that much easier to build in quality
 * <b>Faster time to ship</b>, reducing the barriers to getting code to production is how we get value to customers hands

If we take the approach that everyone wants to write awesome tests, but there are barriers that stop us, what are some that come to mind?
 1. Hard to collect data
 1. Hard to identify the root cause
 1. Incorrectly ‘resolving’  (e.g. its been working this week)
 1. Quarantining <a href="https://confluence.atlassian.com/bamboo/quarantining-failing-tests-289276886.html">is hard</a>/<a href=" https://marklapierre.net/pros-cons-quarantined-tests/">becomes permanent</a>

These are some of the features that a solution could have, that seem achievable:
 1. Hard to collect data
    * Groups data from flaky failures
    * Collects data from all branches
 1. Hard to identify the root cause
    * Automatically diagnoses some issues (e.g. order dependance)
 1. Incorrectly resolve
    * Tracks issues over time
    * Assign flaky tests to engineers
 1. Quarantining
    * Automatically remove from quarantine

If some of these might be interesting to you check out this website: http://testrecall.com

Do you have any tools or patterns for addressing flaky tests?
