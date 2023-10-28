package main

import (
	"context"
	"testing"
)

func BenchmarkRegularInsert(b *testing.B) {
	conn := setup()
	defer conn.Close(context.Background())

	values := makeTestUsers(25_000)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		RegularInsert(conn, values)
	}
}

func BenchmarkUnnestInsert(b *testing.B) {
	conn := setup()
	defer conn.Close(context.Background())

	values := makeTestUsers(25_000)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		RegularInsert(conn, values)
	}
}

func BenchmarkVauesToRowsBuilder(b *testing.B) {
	conn := setup()
	defer conn.Close(context.Background())

	values := makeTestUsers(25_000)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		valuesToRows(values)
	}
}

func BenchmarkVauesToRowsConcatination(b *testing.B) {
	conn := setup()
	defer conn.Close(context.Background())

	values := makeTestUsers(25_000)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		valuesToRowsConcatenation(values)
	}
}
