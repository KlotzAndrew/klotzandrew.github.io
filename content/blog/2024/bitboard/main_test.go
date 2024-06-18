package main

import "testing"

// write a benchmark for BitBoardMoves
func BenchmarkBitBoardMoves(b *testing.B) {
	board := int64(0)
	position := int64(1 << 36)

	for i := 0; i < b.N; i++ {
		BitBoardMoves(board, position)
	}
}

func BenchmarkArrayBoardMoves(b *testing.B) {
	board := make([][]string, 8)
	for r := range board {
		board[r] = []string{".", ".", ".", ".", ".", ".", ".", "."}
	}
	row := 4
	col := 4

	for i := 0; i < b.N; i++ {
		ArrayBoardMoves(board, row, col)
	}
}
