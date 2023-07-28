---
layout: post
title: "Setting up go with Bazel"
date: 2023-06-11 13:00:00 -0500
categories: architecture
featured: images/container_towers.png
description: ""
---

Bazel is an open-source build system created by Google, that can provide fast builds for Go projects though incremental builds and remote caching. Setting up a new project in Go with Bazel can be a little difficult, this guide walks you through it.

At a high level, Bazel operates BAZEL.build files. Bazel supports multiple languages, using BAZEL.build files provide a language-agnostic level for it to operate on. Our program will be written in Go and while we could write BAZEL.build files by hand ourselves we will be using Gazelle, a tool to generate those automatically. 

The Go project we will be building is called hello-world-bazel-go, and consists of 3 few files:

```go
// main.go
package main

import (
	"github.com/davecgh/go-spew/spew"
)

func main() {
	spew.Dump("hello world!")
}
```

```go
// go.mod
module hello-world-bazel-go

go 1.20

require github.com/davecgh/go-spew v1.1.1 // indirect
```

```go
// go.sum
github.com/davecgh/go-spew v1.1.1 h1:vj9j/u1bqnvCEfJOwUhtlOARqs3+rkHYY13jYWTU97c=
github.com/davecgh/go-spew v1.1.1/go.mod h1:J7Y8YcW2NihsgmVo/mv3lAwl/skON4iLHjSsI+c5H38=
```

Now running `go run main.go` we should see the output of the debugging package Spew: 

![Screen Shot 2023-07-28 at 2.48.00 PM.png](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/dede500b-e2e6-4b3e-97c5-2441dd6bb0b8/Screen_Shot_2023-07-28_at_2.48.00_PM.png)

Now to get started with Bazel, we need to [Install Bazel](https://bazel.build/start).

Next, we will 2 files to start using Bazel. A `WORKSPACE` file and a `BUILD.bazel` file. The WORKSPACE file should look like this:

```go
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "io_bazel_rules_go",
    sha256 = "6dc2da7ab4cf5d7bfc7c949776b1b7c733f05e56edc4bcd9022bb249d2e2a996",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/rules_go/releases/download/v0.39.1/rules_go-v0.39.1.zip",
        "https://github.com/bazelbuild/rules_go/releases/download/v0.39.1/rules_go-v0.39.1.zip",
    ],
)

http_archive(
    name = "bazel_gazelle",
    sha256 = "727f3e4edd96ea20c29e8c2ca9e8d2af724d8c7778e7923a854b2c80952bc405",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/bazel-gazelle/releases/download/v0.30.0/bazel-gazelle-v0.30.0.tar.gz",
        "https://github.com/bazelbuild/bazel-gazelle/releases/download/v0.30.0/bazel-gazelle-v0.30.0.tar.gz",
    ],
)

load("@io_bazel_rules_go//go:deps.bzl", "go_register_toolchains", "go_rules_dependencies")
load("@bazel_gazelle//:deps.bzl", "gazelle_dependencies", "go_repository")

go_rules_dependencies()

go_register_toolchains(version = "1.20.5")

gazelle_dependencies()
```

This file is written in Starlark, a language similar to Python that Bazel uses. While you do not need to understand what is in this file, we will do a quick run-through.

- Loading functions: the  `load(...)`calls are loading functions into the current scope. `load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")` is loading the function `http_archive`
- Downloading dependencies with http: `http_archive(...)`is downloading a package from a given URL. In our WORKSPACE we are downloading both `io_bazel_rules_go` and `bazel_gazelle`
- Loading more functions: now that we downloaded `io_bazel_rules_go` and `bazel_gazelle` we load their setup functions
- Execute the loaded functions with `()`

This should give you a basic idea of three steps to add a dependency for Bazel. First download the dependency with `http_archive`. Second, load a function from the dependency with `load`. Lastly, execute the function with `()`

The next file we need is a BUILD file. Ours looks like this

```python
load("@bazel_gazelle//:def.bzl", "gazelle")

# gazelle:prefix hello-world-bazel-go
gazelle(name = "gazelle")
```

The string after the word `prefix` should match the import path of your project.

We can now run Gazelle! There are two commands we need Gazelle for. The first is to add our Go dependencies to Bazel, by creating a `deps.bzl` file from our `go.mod` file. We do this with `bazel run //:gazelle -- update-repos -from_file=go.mod -to_macro=deps.bzl%go_dependencies`. This should create a `deps.bzl` file that looks like this:

```python
load("@bazel_gazelle//:deps.bzl", "go_repository")

def go_dependencies():
    go_repository(
        name = "com_github_davecgh_go_spew",
        importpath = "github.com/davecgh/go-spew",
        sum = "h1:vj9j/u1bqnvCEfJOwUhtlOARqs3+rkHYY13jYWTU97c=",
        version = "v1.1.1",
    )
```

Next is to generate out BAZEL.build files, with `bazel run //:gazelle`. This command generates a BAZEL.build file in every folder that has a .go file. Since project is tiny our root folder contained both our base `BUILD.bazel` file as well as our `main.go` file, so instead of creating a `BUILD.bazel` file Gazelle will append the contents to the existing one. It should now look like this:

```python
load("@io_bazel_rules_go//go:def.bzl", "go_binary", "go_library")
load("@bazel_gazelle//:def.bzl", "gazelle")

# gazelle:prefix hello-world-bazel-go
gazelle(name = "gazelle")

go_library(
    name = "hello-world-bazel-go_lib",
    srcs = ["main.go"],
    importpath = "hello-world-bazel-go",
    visibility = ["//visibility:private"],
    deps = ["@com_github_davecgh_go_spew//spew"],
)

go_binary(
    name = "hello-world-bazel-go",
    embed = [":hello-world-bazel-go_lib"],
    visibility = ["//visibility:public"],
)
```

At this point we are done with Gazelle and can start using Bazel. For starters, let's build our project:

```python
bazel build //...
```

This will build everything in our project. The bazel syntax of `//...` is similar to Go’s `./...` syntax for building everything. If we have a compilation error, building will let us know. On its own though it is not obvious where our binary is. After all, we have a project that prints ‘Hello world!” that we would like to see. We can ask Bazel to tell us all the binaries it can build:

```python
bazel query 'kind("go_binary", //...)'

# //:hello-world-bazel-go
```

The `hello-world-bazel-go` binary is the name of our project, makes sense so far. Next, we can ask Bazel where it put the files from building that package:

```python
bazel cquery --output=files //:hello-world-bazel-go

# bazel-out/darwin-fastbuild/bin/hello-world-bazel-go_/hello-world-bazel-go
```

Since this output file is a binary, we can run it directly:

```bash
./bazel-out/darwin-fastbuild/bin/hello-world-bazel-go_/hello-world-bazel-go

# (string) (len=12) "hello world!"
```

Let's say we wanted to run this directly similar to `go run main.go`, we could use:

```bash
bazel run //:hello-world-bazel-go

# (string) (len=12) "hello world!
```

And lastly, if we add a test file:

```go
// main_test.go
package main_test

import "testing"

func TestApp(t *testing.T) {
	//
}
```

For bazel to see this test file, we need to use Gazelle to update the `BUILD.bazel`file: `bazel run //:gazelle`. This will append this section to the file.

```go
go_test(
    name = "hello-world-bazel-go_test",
    srcs = ["main_test.go"],
)
```

Now we can run our tests with

```go
bazel test //...
```

And success!