---
layout: post
title: "Dependency metrics for architecture improvements"
date: 2023-01-01 13:00:00 -0500
categories: bazel, architecture
featured: images/bazel_graph.png
description: ""
---


# Dependency metrics for architecture improvements

We can use dependency metrics to design our code to be built and test faster. As a codebase gets larger, it gets harder and harder to reason about how different packages are related to each other. An effect of this is build and test time can start to ballon. Caching can help here but for build and test, the effect of caching is limited by the code architecture.

Build and test caching in Go is done at the package level. If something in a package changes, that package and everything that depends on it need to be rebuilt. In a tangled codebase, this could mean changes to single packages could invalidate large parts of the dependency tree. With an invalidated dependency tree, we see a much smaller benefit from caching.

We can use Bazel to identify where bottlenecks are, and measure improvements. There is an excellent talk on this from Spotify here **[Driving architectural improvements with dependency metrics](https://www.youtube.com/watch?v=k4H20WxhbsA)**. The idea is to combine static code analysis with behavioural analysis of how engineers interact with the code.

To start, we can identify which packages are imported the most. If a package is imported in many places, it invalidates more of the dependency tree. Some psudocode:

```bash
all_pacakges = bazel query "kind(go_*, //...)" --output=package

for packge in all_packages
	package_reverse_dependencies = bazel query "filter('^//[a-z]', rdeps(//..., pacakge:all))" --output=package
	reverse_dependency_count = len(package_reverse_dependencies)
```

This on its own will give us a list of all packages, and how many packages import them. With this we can make a list of the most expensive packages to change. On its own this is not enough to take a decision on what to do with the code. There may be a really tangled piece of code that is expensive to change, but if it never changes then it does not matter.

The next thing we need to combine this with is change frequency of the code. This gives us a list of files that changed:

```bash
git whatchanged --pretty=%at --since '28 days ago'
```

If we multiply the cost of changing each package with the frequency that package changes, we now have a metric to guide our architecture when it comes to reducing package size or updating the import tree.