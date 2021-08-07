---
layout: post
title: "Inject build-time variables in Golang"
date: 2021-08-07 13:00:00 -0500
categories: golang
featured: images/Go-Logo_Aqua.png
description: ""
---

With Golang we can inject build-time variables into our binary. This can help provide users with a quick way to gather more information about the build they are using. Docker's CLI contains information we can inject into our own project:

```bash
 Client: Docker Engine - Community
 Version:           20.10.6
 API version:       1.41
 Go version:        go1.13.15
 Git commit:        370c289
 Built:             Fri Apr  9 22:47:17 2021
 OS/Arch:           linux/amd64
 Context:           default
 Experimental:      true
```

Let's say for our project we want to inject the current Git SHA of the build, so our users can let us know exactly what commit they are running.

```golang
package main

import "fmt"

var GitSHA string

func main() {
	fmt.Printf("current revision: %s", GitSHA)
}
```

We want the output of this binary `./build.sh && ./main` to print:

> current revision: <sha>

We can get our git short SHA using `git rev-parse --short HEAD` . The command to inject variables is `-ldflags "-X main.GitSHA=<sha>` as part of the `go build` command

Combining the two we have a small build.sh script:

```bash
#!/bin/bash

sha=$(git rev-parse --short HEAD)
go build -ldflags "-X main.GitSHA=$sha" -o main
```

Running this gives gives the desired result!

> current revision: 9f76309

If you want to run the same in a Dockerfile instead of a bash script, you can do that as well:

```golang
FROM golang:latest

WORKDIR /go/src/github.com/klotzandrew/klotzandrew.io

COPY .git .
COPY . .

RUN GIT_SHA=$(git rev-parse --short HEAD) && \
  go build -ldflags "-X main.GitSHA=$GIT_SHA" -o main

CMD ["./main"]
```

And we can get the same output with

```bash
docker build -t golang-inject-git-sha .
docker run --rm golang-inject-git-sha
```

Some other useful pieces of information to include:

- Date of the build
- Release tag
