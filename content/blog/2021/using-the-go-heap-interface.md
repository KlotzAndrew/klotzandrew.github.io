---
layout: post
title: "Using the go heap interface"
date: 2021-03-07 17:00:00 -0500
categories: golang
featured: images/heap.png
description: ""
---

Go provides support for heaps as part of the language. What we have are interface and module methods, these can be a little intimidating if you were looking for a generic heap object out of the box.

### Expectations
If you are expecting an object your API might look something like this, where `pq` is shorthand for `priorityQueue:
```go
pq := heap.NewHeap()
pq.Push(item)
pq.Pop()
```
But instead, we get module functions that take a heap interface and its arguments:
```go
heap.Push(pq, item)
heap.Pop(pq)
```

### Interface

This is the [go heap interface][go-heap-interface]:

```go
type Interface interface {
		sort.Interface
		Push(x interface{})
		Pop() interface{}
}
```
Plus the [go sort interface][go-sort-interface]:
```go
type Interface interface {
		Len() int
		Less(i, j int) bool
		Swap(i, j int)
	}
```
### Implementation

Putting them together we get a full implementation:

```go
package main

import (
	"container/heap"
	"fmt"
)

type Item struct {
	value    int
	priority int
}

type PriorityQueue []*Item

func (pq PriorityQueue) Len() int      { return len(pq) }
func (pq PriorityQueue) Swap(i, j int) { pq[i], pq[j] = pq[j], pq[i] }

func (pq PriorityQueue) Less(i, j int) bool {
	return pq[i].priority > pq[j].priority
}

func (pq *PriorityQueue) Push(x interface{}) {
	// a failed type assertion here will panic
	*pq = append(*pq, x.(*Item))
}

func (pq *PriorityQueue) Pop() interface{} {
	old := *pq
	n := len(old)
	item := old[n-1]
	old[n-1] = nil
	*pq = old[0 : n-1]
	return item
}

func main() {
	pq := &PriorityQueue{}
	heap.Push(pq, &Item{value: 100, priority: 10})

	item := heap.Pop(pq)
	fmt.Println(item)
}

```

Implementing this interface gives us the heap methods we expect:
 - heap.Init(pq)
 - heap.Push(pq, interface {})
 - heap.Pop(pq)

As well as two helper methods, if you are tracking the item index in the underlying heap array:
 - heap.Remove(pq, index), removing element at index
 - heap.Fix(pq, index), equivalent to remove/push element at index

The downsides to the interface approach, besides having to implement five functions, are the interface type assertions from pop and push. The caller of pop needs to type assert, which is only a few lines of code. But passing the wrong type to push could lead to a panic, as it does in this example.

Without generics, this still provides the heap logic managed by the module.

[go-heap-interface]: https://github.com/golang/go/blob/597b5d192e39d7bba38dd461b96effe6e524984b/src/container/heap/heap.go#L32-L36
[go-sort-interface]: https://github.com/golang/go/blob/125eca0f7210da1bbf1a4a1460a87d1c33366b99/src/sort/sort.go#L12-L35
