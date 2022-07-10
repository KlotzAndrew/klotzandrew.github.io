---
layout: post
title: "Concurrent writing to slices in GO"
date: 2022-07-06 16:00:00 -0500
categories: golang
featured: images/Go-Logo_Aqua.png
description: ""
---

Can you concurrently write to slices in GO? The short answer is yes. The [Language Specification for GO](https://go.dev/ref/spec#Variables) describes different behavior for *Structured variables* compared to regular variables. Generally, if there are multiple writers to a variable you need synchronization to avoid a data race but for GO each field for an array, slice, and struct can be addressed individually.

> *Structured* variables of [array](https://go.dev/ref/spec#Array_types), [slice](https://go.dev/ref/spec#Slice_types), and [struct](https://go.dev/ref/spec#Struct_types) types have elements and fields that may be [addressed](https://go.dev/ref/spec#Address_operators) individually. Each such element acts like a variable.
>

### Approaches with locks

Let’s say we did not know this and had to fetch some data, where want to speed it up with goroutines and WaitGroups.

```go
package main

import (
	"fmt"
	"math/rand"
	"sync"
	"time"
)

func main() {
	input := []int{1, 2, 3, 4, 5}

	wg := sync.WaitGroup{}
	result := []int{}

	for _, num := range input {
		wg.Add(1)
		go func(num int) {
			data := getData(num)
			result = append(result, data)
			wg.Done()
		}(num)
	}

	wg.Wait()

	fmt.Println(result)
}

func getData(num int) int {
	time.Sleep(time.Duration(rand.Intn(100)) * time.Millisecond)
	return num * 2
}
```

The above example has a race condition without concurrency controls `go run -race main.go`. Each thread is modifying the slice itself, instead of the members of the slice. Now we could add a mutex around writing to the slice in our goroutine, but now we have locks in our concurrency.

```go
wg := sync.WaitGroup{}
mutex := sync.Mutex{}

for _, num := range input {
	wg.Add(1)
	go func(num int) {
    mutex.Lock()
		data := getData(num)
		result = append(result, data)
		wg.Done()
    mutex.Unlock()
	}(num)
}
```

Another option would be to collect the results in a channel, then flush them out after the WaitGroup is finished. The downside is we need to add another loop and lose the order. Although we could include the order with the result, then sort after we flush the channel.

```go
wg := sync.WaitGroup{}
mutex := sync.Mutex{}
resultChan := make(chan int, len(input))

for _, num := range input {
	wg.Add(1)
	go func(num int) {
		mutex.Lock()
		data := getData(num)
		resultChan <- data
		wg.Done()
		mutex.Unlock()
	}(num)
}

wg.Wait()

for len(resultChan) > 0 {
	data := <-resultChan
		result = append(result, data)
}
```

Fortunately, with our language specification, we don’t need to do any of this. If we pre-allocate our slice variables, we can write to each of them concurrently by index:

```go
wg := sync.WaitGroup{}
result := make([]int, len(input))

for i, num := range input {
	wg.Add(1)
	go func(num, i int) {
		data := getData(num)
		result[i] = data
		wg.Done()
	}(num, i)
}
wg.Wait()
```
