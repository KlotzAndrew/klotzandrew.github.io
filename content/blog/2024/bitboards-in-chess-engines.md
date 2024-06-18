---
layout: post
title: "Bitboards in Chess Engines"
date: 2024-06-17 13:00:00 -0500
categories: bits
featured: images/chess-bitboard.png
description: ""
---

The first time I came across bitmaps was when I was looking into writing a chess engine. A chess board is 64 squares in a 8x8 grid. The first way to represent this is an array of arrays, but an even better way is to use a single u64 integer as a bit board.

One of the measures of a chess engine is how many moves it can evaluate per second. Using a 2d array we might represent the board like this. The letter `r` represents a rook and  `.` represents an empty square.

```go
0 . . . . . . . .
1 . . . . . . . .
2 . . . . . . . .
3 . . . . . . . .
4 . . . . r . . .
5 . . . . . . . .
6 . . . . . . . .
7 . . . . . . . .
  0 1 2 3 4 5 6 7
```

If we want to figure out possible moves for the rooks we need to loop over all row and column indexes and see if they are open, something like this:

```go
board := make([][]string, 8)
for r := range board {
	board[r] = slices.Repeat([]string{"."}, 8)
}
row := 4
col := 4

moves := [][]int{}
for r := row - 1; r >= 0; r-- {
	if board[r][col] != "." {
		// this square is occoupied
		break
	}
	newMove := []int{r, col}
	moves = append(moves, newMove)
}

fmt.Println(moves)
// [[3 4] [2 4] [1 4] [0 4]]
```

It may not look like much but there are a bunch of operations that are performed when accessing an element in this 2d array and doing a string comparison. Here is the output from ABC using the Godot decompiler.

Now instead of a 2d array, we can use each square as a bit in a u64 int. This lets us represent the entire board in a single integer. Our room place would be 1<<(8*rows). This lets us use bitwise operations to evaluate moves. For example, to see if our room can move up one row, we bit shift it's position by 8 1<<8 then & that with the occupied pieces board (another u64 int). If the value is zero then the square is a valid move. A similar approach can be taken for attack moves as well.
