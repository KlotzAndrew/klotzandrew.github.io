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
