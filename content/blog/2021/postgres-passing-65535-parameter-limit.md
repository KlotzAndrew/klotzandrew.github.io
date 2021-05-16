---
layout: post
title: "Passing the Postgres 65535 parameter limit at 120x speed"
date: 2021-05-15 08:00:00 -0500
categories: postgres
featured: images/regular-vs-unnest.png
description: ""
---

If you are doing bulk inserts into Postgres you may have hit a message like this `extended protocol limited to 65535 parameters`, You may be tempted to rewrite your query into chunks and loop over those chunks, but there is a better way! We will use a Golang example that passes the 65535 constraints and reduces the time to insert 25k records from 2.9s to 24ms.

*A caveat on speed claims, I only tested this with the [Go pgx library][pgx] - so mileage may vary*

The 65535 error refers to the fact that [Postgres wire protocol uses an Int16 for binding input parameters][bind_limit], which is also a [limit on the backend][param_limit]. There is a trick I learned from [@HarlemCavalier][HarlemCavalier] in [promscale][promscale] using the `unnest` function to pass an array containing many values, with the array counting as a single parameter. The effective change in SQL looks like this:

```sql
-- before
INSERT INTO users
    (id, name)
    VALUES ($1,$2),($3,$4);

-- after
INSERT INTO users
    (id, name)
    (select * from unnest($1::int[], $2::int[]));
```

## Example in golang

We are going to write up an example that first shows a 100x speed improvement, and second shows our unnest function exceeding our parameter limit.

For starters we need a running Postgres container to work with, in a new terminal window:

`docker run --name bulk-postgres -e POSTGRES_PASSWORD=bulk postgres`

Next, we switch into go and need a setup function to create our tables:

```go
func setup() *pgx.Conn {
  conn, err := pgx.Connect(context.Background(), dbURL)
  if err != nil {
    panic(err)
  }

  query := `
  CREATE TABLE IF NOT EXISTS users (
    id int,
    name int
  );
  TRUNCATE TABLE users;
  `
  if _, err := conn.Exec(context.Background(), query); err != nil {
    panic(err)
  }
  return conn
}
```

Our user table has two int fields, so we need a function to generate some test data in our application

```go
// return a 2d array of ints. E.g. [[1,2],[3,4]]
func makeTestUsers(max int) [][]int {
  a := make([][]int, max+1)
  for i := range a {
    a[i] = []int{i, i + 1}
  }
  return a
}
```

### Regular Insert

```go
// converts a 2d array to query numbers and values
// input: [[1,2],[3,4]]
// output: ($1,$2),($3,$4) and [1,2,3,4]
func valuesToRows(values [][]int) (string, []interface{}) {
  rows := []interface{}{}
  query := ""
  for i, s := range values {
    rows = append(rows, s[0], s[1])

    numFields := 2
    n := i * numFields

    query += `(`
    for j := 0; j < numFields; j++ {
      query += `$` + strconv.Itoa(n+j+1) + `,`
    }
    query = query[:len(query)-1] + `),`
  }
  query = query[:len(query)-1]

  return query, rows
}
```

And now our function to do the inserts

```go
func RegularInsert(conn *pgx.Conn, values [][]int) {
  start := time.Now()
  defer func() { fmt.Println("regularInsert", time.Since(start)) }()

  query := `
  INSERT INTO users
    (id, name)
    VALUES %s;`

  queryParams, params := valuesToRows(values)
  query = fmt.Sprintf(query, queryParams)

  if _, err := conn.Exec(context.Background(), query, params...); err != nil {
    fmt.Println(err)
  }
}
```

### Unnest Insert

The unnest code is simpler because there are just two int arrays:

```go
func UnnestInsert(conn *pgx.Conn, values [][]int) {
  start := time.Now()
  defer func() { fmt.Println("unnestInsert", time.Since(start)) }()

  ids, names := []int{}, []int{}
  for _, v := range values {
    ids = append(ids, v[0])
    names = append(names, v[1])
  }

  query := `
  INSERT INTO users
    (id, name)
    (
      select * from unnest($1::int[], $2::int[])
    )`

  if _, err := conn.Exec(context.Background(), query, ids, names); err != nil {
    fmt.Println(err)
  }
}
```

## Results

At 25k rows (50k parameters at 2 parameters per row) our unnest insert is 120x faster. Beyond 25k rows, our regular insert hits its 65535 parameter constraint but our unnest function can still insert

![leverage 50](./images/regular-vs-unnest.png)

| rows (in 1000s) | regular (ms)    | unnest (ms)      | times faster |
|-----------------|-------------|-------------|--------------|
|               5 |   97.756644 |    6.165317 |  15 |
|              15 |  1099.48859 |    15.35103 |  71 |
|              25 | 2988.927136 |   24.724306 |  120 |
|              35 |             |   36.393635 |              |
|              70 |             |  111.888045 |              |
|             150 |             |  160.799487 |              |
|             500 |             |  689.425454 |              |
|            5000 |             | 6748.465272 |              |


Full code if you want to give it a try:

```go
package main

import (
  "context"
  "fmt"
  "strconv"
  "time"

  "github.com/jackc/pgx/v4"
)

// docker run --name bulk-postgres -e POSTGRES_PASSWORD=bulk postgres

const dbURL = "postgres://postgres:bulk@0.0.0.0:5432/postgres?sslmode=disable"

func main() {
  conn := setup()
  defer conn.Close(context.Background())

  values := makeTestUsers(25_000)

  RegularInsert(conn, values)
  UnnestInsert(conn, values)
}

func setup() *pgx.Conn {
  conn, err := pgx.Connect(context.Background(), dbURL)
  if err != nil {
    panic(err)
  }

  query := `
  CREATE TABLE IF NOT EXISTS users (
    id int,
    name int
  );
  TRUNCATE TABLE users;
  `
  if _, err := conn.Exec(context.Background(), query); err != nil {
    panic(err)
  }
  return conn
}

// return a 2d array of ints. E.g. [[1,2],[3,4]]
func makeTestUsers(max int) [][]int {
  a := make([][]int, max+1)
  for i := range a {
    a[i] = []int{i, i + 1}
  }
  return a
}

func UnnestInsert(conn *pgx.Conn, values [][]int) {
  start := time.Now()
  defer func() { fmt.Println("unnestInsert", time.Since(start)) }()

  ids, names := []int{}, []int{}
  for _, v := range values {
    ids = append(ids, v[0])
    names = append(names, v[1])
  }

  query := `
  INSERT INTO users
    (id, name)
    (
      select * from unnest($1::int[], $2::int[])
    )`

  if _, err := conn.Exec(context.Background(), query, ids, names); err != nil {
    fmt.Println(err)
  }
}

func RegularInsert(conn *pgx.Conn, values [][]int) {
  start := time.Now()
  defer func() { fmt.Println("regularInsert", time.Since(start)) }()

  query := `
  INSERT INTO users
    (id, name)
    VALUES %s;`

  queryParams, params := valuesToRows(values)
  query = fmt.Sprintf(query, queryParams)

  if _, err := conn.Exec(context.Background(), query, params...); err != nil {
    fmt.Println(err)
  }
}

// converts a 2d array to query numbers and values
// input: [[1,2],[3,4]]
// output: ($1,$2),($3,$4) and [1,2,3,4]
func valuesToRows(values [][]int) (string, []interface{}) {
  rows := []interface{}{}
  query := ""
  for i, s := range values {
    rows = append(rows, s[0], s[1])

    numFields := 2
    n := i * numFields

    query += `(`
    for j := 0; j < numFields; j++ {
      query += `$` + strconv.Itoa(n+j+1) + `,`
    }
    query = query[:len(query)-1] + `),`
  }
  query = query[:len(query)-1]

  return query, rows
}

```

[HarlemCavalier]: https://twitter.com/HarlemCavalier/status/1328090245657751553
[promscale]: https://github.com/timescale/promscale/blob/29f4691e22e4525206a9a5df1608ec9d81747659/pkg/pgmodel/sql_ingest.go#L633
[param_limit]: https://github.com/postgres/postgres/blob/master/src/interfaces/libpq/fe-exec.c#L1406-L1411
[bind_limit]: https://www.postgresql.org/docs/13/protocol-message-formats.html
[pgx]: https://github.com/jackc/pgx
