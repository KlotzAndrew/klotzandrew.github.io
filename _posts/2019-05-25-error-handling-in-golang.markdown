---
layout: post
title: "Golang custom error types with stack trace"
date: 2019-04-28 17:20:00 -0500
categories:  golang
---

Golang error handling is fun because it is a first class citizen in the language,
but the built in behavior is bare bones. But there are two features that really help:

1. Custom error types
1. Stack traces

The default behavior returns an error with a message. An example is doing a sql
query where we bubble up `ErrNoRows` and return 404 for that error but 500 for other errors:

```golang
// handler.go
import "database/sql"

func handler(r http.Reader, w *http.Writer) error {
  user, err := repo.findUserByID(1)
  if err != nil {
    if err ==  sql.ErrNoRows {
      return 404
    } else {
      return 500
    }
  }
  return 200, user
}

// repo.go
import "database/sql"

func findUserByID(id int) (User, err) {
  // ...
  rows, err := sql.Query(...)
  if err != nil && err == sql.ErrNoRows {
    return User{}, err
  }
  // ...
}
```

These types of errors are called sentinel errors, the benefit is we can check against
their type, but the downside is our http handler now needs to import the `database/sql` package
and we have no stack traces. We could define our own custom error type and return
that instead:

```golang
// custom.go
var ErrorNotFound = errors.New("Record not found")

func findUserByID(id int) (User, err) {
  if err != nil && err == sql.ErrNoRows {
    return User{}, ErrorNotFound
  }
}
```

Under the hood the sql error looks like this:
```golang
var ErrNoRows = errors.New("sql: no rows in result set")
```

Declaring our own error does not get us too much farther, and we still have no stack
trace. Our example has 1 layer and 1 query, but if we
had multiple layers and multiple queries, keeping track of what went wrong where
becomes less obvious (especially for errors less straight forward as ErrNotFound).

This is where a package like `errors` comes in. We can use `errors.Wrap(err, "msg")`
and later up the stack get the original error with `errors.Cause(err)`. Our
error handling code now gets a stack trace and has no need to import sql:


```golang
package main

import (
    "fmt"
    "github.com/pkg/errors"
)

var ErrorNotFound = errors.New("Record not found")

func main() {
    err := foo("SELECT id FROM users where name = 'bar'")

    if errors.Cause(err) == ErrorNotFound {
        fmt.Printf("Holla %v\n%+v\n", err.Error(), err)
    } else {
        fmt.Println("default error")
    }
}

func foo(s string) error {
    return errors.Wrap(ErrorNotFound, s)
}
```

The trick to the errors package is in calling `runtime.Callers()` when a new
error is created. Which you could also do if you wanted to roll something custom.

A potential way to improve would be not requiring the handler to import `ErrorNotFound`.
A way to get around that would be to type assert on behavior instead of
types. Where if our ErrorNotFound instead conformed to an interface, we could check
against that, and just import an interface instead of a struct:

```golang
type InterfaceErrorNotFound interface {
  IsNotFound() bool
}

type ErrorNotFound error

func (e ErrorNotFound) IsNotFound() { true }

func IsErrorNotFound
```
