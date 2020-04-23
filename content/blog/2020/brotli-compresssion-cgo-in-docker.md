---
layout: post
title: "Compression with Brotli CGO in Alpine Docker"
date: 2020-04-22 17:00:00 -0500
categories: brotli, docker, golang, cgo
featured: images/brotli.png
description: ""
---

Both [Uber][3] and [Lucidchart][4] have detailed breakdowns of gains by compressing JSON payloads and I wanted to give high compression a try with Brotli.

Setting up [Brotli][1] in Golang was a little trickier than I expected. First pass
was quick but maybe not optimal. Run `sudo apt-get install -y brotli`, followed by calling the command with exec:

```go
func Compress(b []byte) ([]byte, error) {
	cmd := exec.Command("brotli", "-f", "-q", "11", "-c")
	cmd.Stdin = bytes.NewReader(b)
	out, err := cmd.CombinedOutput()
	return out, err
}
```

For getting started this works (yay!). Run the command, get the output/error, and return to the caller. Brotli is a C library so we can do better by using their [CGO bindings][2].


```go
package main

import (
  "bytes"
  "fmt"

  "github.com/google/brotli/go/cbrotli"
)

func check(err error) {
  if err != nil {
    panic(err)
  }
}

func main() {
  content := []byte("hello world! hello world! hello world! hello world!")

  enc, err := cbrotli.Encode(content, cbrotli.WriterOptions{Quality: 5})
  check(err)

  dec, err := cbrotli.Decode(enc)
  check(err)

  fmt.Printf("%s\n %s\n", string(content), dec)
	fmt.Printf("from %v -> %v\n", len(dec), len(enc))
  panic("done")
}
```

Here we are just encoding then decoding a byte array. This should give us a nice output to check everything is compressing correctly.

Now we are going to have to build Brotli from source. Fortunately, most of the commands are on the readme for using CMake, `apt install` a bunch of tools, then `make` to build some things.

One of the nice things about go is running tiny containers, so we can shrink our golang container down to alpine. A gotcha was installing libc6-compat, without that there are is a very cryptic `./main: not found` error when trying to run the binary.


```Dockerfile
FROM golang:1.13.5 as builder

WORKDIR /go/brotli-cgo

RUN apt update -y \
  && apt install -y git build-essential cmake gcc make bc sed autoconf automake libtool git apt-transport-https

RUN cd /usr/local \
  && git clone https://github.com/google/brotli \
  && cd brotli && mkdir out && cd out && ../configure-cmake \
  && make \
  && make install

COPY go.mod go.mod
COPY go.sum go.sum
RUN go mod tidy

COPY . .

RUN CGO_ENABLED=1 LD_LIBRARY_PATH='/usr/local/lib' GOOS=linux \
  go build -o main .

FROM alpine:3.11

RUN apk --no-cache add --update ca-certificates libc6-compat

COPY --from=builder /usr/local/lib /usr/local/lib
COPY --from=builder /go/brotli-cgo/main .

RUN ./main
```

At the end, we can run `docker build -t brotli-cgo .` and get our output. We now have CGO calling Brotli in a very tiny container!

```
// hello world! hello world! hello world! hello world!
// hello world! hello world! hello world! hello world!
// from 51 -> 18
```

[1]: https://github.com/google/brotli
[2]: https://github.com/google/brotli/blob/master/go/cbrotli/cgo.go
[3]: https://eng.uber.com/trip-data-squeeze-json-encoding-compression/
[4]: https://www.lucidchart.com/techblog/2019/12/06/json-compression-alternative-binary-formats-and-compression-methods/
