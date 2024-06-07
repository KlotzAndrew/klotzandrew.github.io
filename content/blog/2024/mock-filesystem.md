---
layout: post
title: "Mock filesystem for easier unit testing"
date: 2024-06-07 13:00:00 -0500
categories: software, testing
featured: images/mock-filesystem.jpeg
description: ""
---

Using a mock filesystem can help reduce test flakiness and speed up tests. A regular filesystem introduces two problems for tests. The first problem is that a shared resource ‘the filesystem’ is now shared between tests that may be running concurrently. The second problem is that this shared resource has state, leading to potential dependencies between tests. By implementing a mock filesystem, we avoid these issues. It creates an isolated environment for each test, eliminating shared resources and state. This results in faster, more reliable tests.

An example of this in Go. Lets say we have two functions, one that writes file contents and one that reads those contents. Both the code and the tests write files directly to the filesystem:

```go
// main.go
package main

import "os"

func WriteLog(filename, message string) {
	f, _ := os.Create(filename)
	defer f.Close()

	f.WriteString(message)
}

func CheckLogMessage(filename, message string) bool {
	f, _ := os.Open(filename)
	defer f.Close()

	buf := make([]byte, len(message))
	_, _ = f.Read(buf)
	return string(buf) == message
}
```

And two tests that looks like this:

```go
// main_test.go
package main

import "testing"

func TestExampleWriteLogString(t *testing.T) {
	WriteLog("test.log", "Hello, world!")
	equals := CheckLogMessage("test.log", "Hello, world!")

	if !equals {
		t.Errorf("not equal")
	}
}

func TestExampleWriteLogNumber(t *testing.T) {
	WriteLog("test.log", "123")
	equals := CheckLogMessage("test.log", "123")

	if !equals {
		t.Errorf("not equal")
	}
}

```

The downside here is we cannot run both tests in parallel without them colliding with each other and failing. In addition, the file they use needs to be cleaned up after each run, which is possible to do but requires an extra bit of housekeeping.

### Writing code that is easy to test

Now, let's implement the same tests using a mock filesystem. The trick here is changing our production code to accept a filesystem as a dependency, instead of calling a global `os` directly.

This will allow us to run the tests without actually writing to and reading from the real filesystem, avoiding the problems discussed above.

In our main.go we use [`afero.Fs`](https://github.com/spf13/afero), a drop in replacement for a regular filesystem. Now in the read and write functions, instead of interacting directly with the `os` package, we interact with our interface.

```go
package main

import (
	"github.com/spf13/afero"
)

func WriteLog(fs afero.Fs, filename, message string) {
	f, _ := fs.Create(filename)
	defer f.Close()

	f.WriteString(message)
}

func CheckLogMessage(fs afero.Fs, filename, message string) bool {
	f, _ := fs.Open(filename)
	defer f.Close()

	buf := make([]byte, len(message))
	_, _ = f.Read(buf)
	return string(buf) == message
}

func main() {
	var fs = afero.NewOsFs()

	WriteLog(fs, "test.log", "Hello, world!")
	equals := CheckLogMessage(fs, "test.log", "Hello, world!")
	println(equals)
}
```

This interface lets us pass in a mock filesystem in our tests:

```go
package main

import (
	"testing"

	"github.com/spf13/afero"
)

func TestExampleWriteLog(t *testing.T) {
	fs := afero.NewMemMapFs()

	WriteLog(fs, "test.log", "Hello, world!")
	equals := CheckLogMessage(fs, "test.log", "Hello, world!")

	if !equals {
		t.Errorf("not equal")
	}
}
```

This change lets us run our tests without the risk of concurrency issues, disk space issues, or cleanup issues. All of these help reduce flakiness, and make tests faster at the same time!
