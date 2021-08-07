package main

import "fmt"

var GitSHA string

func main() {
	fmt.Printf("current revision: %s", GitSHA)
}
