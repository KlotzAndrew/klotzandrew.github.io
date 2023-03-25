---
layout: post
title: "What values should live in a golang request context?"
date: 2023-03-25 13:00:00 -0500
categories: bash, monitoring
featured: images/Go-Logo_Aqua.png
description: ""
---

Contexts in Go live for the duration of a request and can contain an arbitrary set of values. This can be convenient because frequently used values can be stored, added by middleware and used later in a handler or function downstream. From the point of view of a handler or downstream functions, the values magically exist. So why not put everything in this magic object?

Here is a small example of setting values in middleware, magically added from the point of view of the handler:

```bash
package main

import (
	"context"
	"fmt"
)

func main() {
	ctx := context.Background()

	// middleware sets some value
	ctx = middleware(ctx)

	// handler uses the value
	handler(ctx)
}

func middleware(ctx context.Context) context.Context {
	ctx = context.WithValue(ctx, "key", "value")
	return ctx
}

func handler(ctx context.Context) {
	value := ctx.Value("key")
	fmt.Println(value)
}
```

The middleware function sets a value, from the handler’s point of view the values have been magically populated without needing to be passed as an argument. This can seem handy for frequently used values, letting us skip one extra value when calling fuctions. e.g. imagine this function was nested multiple layers deep we can skip passing 2 arguments:

```go
// before
func doThing(ctx context.Context, user_id, organization_id string, request_params Params) {
  // business logic
}

// after
func doThing(ctx context.Context, request_params Params) {
  user_id := ctx.GetValue("user_id")
  organization_id := ctx.GetValue("organization_id")
}
```

What is the downside? The values are populated magically. This works for values that are always there, but as soon as they are not always there then things will magically break. This drift starts to happen as soon as a value is not always needed in a handler. This shifts the context from holding values that are always used to a bag of values sometimes used, their dependency being implicit instead of explicit. The outcome of this is something difficult to refactor and test because of the unclear dependencies.

What goes in? things that exist across all requests and live for the lifetime of the request should be in the context. Some examples that might be a good fit:

- trace_id, should be consistent for the entire request
- logger, we always want a logger
- user_id of the user initiating the request

What might not be a good fit?

Fields that are the subject of the request: user_id, user_email, or organization_id. These values are request parameters. If they are frequently used it might be tempting to add them to the context, but they are still request params for that specific request - not all requests.