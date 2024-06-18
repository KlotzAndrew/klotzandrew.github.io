package main

import (
	"fmt"
)

func ArrayBoard() {
	board := make([][]string, 8)
	for r := range board {
		board[r] = []string{".", ".", ".", ".", ".", ".", ".", "."}
	}
	row := 4
	col := 4

	moves := ArrayBoardMoves(board, row, col)

	fmt.Println(moves)
}

func ArrayBoardMoves(board [][]string, row, col int) [][]int {
	moves := [][]int{}
	row -= 1
	for row >= 0 {
		if board[row][col] != "." {
			// this square is occoupied
			break
		}
		newMove := []int{row, col}
		moves = append(moves, newMove)
		row -= 1
	}
	return moves
}

func BitBoard() {
	board := int64(0)
	row := 4
	col := 4

	position := int64(1 << (row*8 + col))

	moves := BitBoardMoves(board, position)

	fmt.Println(moves)
}

func BitBoardMoves(board, position int64) []int64 {
	moves := []int64{}
	position >>= 8
	for position >= 0 {
		if position&board != 0 {
			// this square is occoupied
			break
		}
		moves = append(moves, position)
		position >>= 8
	}
	return moves
}

func main() {
	ArrayBoard()
	BitBoard()
}
