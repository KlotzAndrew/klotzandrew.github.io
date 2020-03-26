---
layout: post
title: "Object Fingerprinting for Efficient Data Ingestion"
date: 2020-03-25 17:00:00 -0500
categories: golang, json, path of exile
image: object-fingerprinting.png
---

We are going to cut our write payload down by 95% for our very specific example.

What happens when you frequently receive a payload for an updated collection of many items where only a small subset of items were been updated? The easy and most expensive path is to take the full payload and persist it to our data store with some version of insert or update operation. The upside is this is quick to implement, but the downside is a lot of extra slow writing that could be skipped.

### The API use case
I was playing with the [Path of Exile API][2] (amazing game and I recommend trying it if you have not yet), and the payload pushes a lot of data that could be considered redundant. The units we will consider here are a 'stash' that contains dozens of 'items' and items contain 50+ fields. When any item in a stash is updated, the full stash payload is sent in the API. On average only one or a few items will have changed between stash payloads so the bulk of the data is redundant, there has been no change since last being stored. The payload size clocks in around 4mb per second so there is a lot of room for improvement here.

```bash
curl http://api.pathofexile.com/public-stash-tabs | wc --bytes
# 4025444
```
An example of the stash payload with 50 items:

```javascript
[
  {item1}, // only this item changed
  {item2},
  {item3},
 // ...50 more unchanged items
]
```

Using the simple solution we insert all 50 items with an upsert (insert or update) operation, but we can do better. We will take a fingerprint of the JSON for the item, store and compare that to determine if the item has changed (upsert) or not changed (skip). Go makes this pretty easy with custom un-marshallers.


### Go Unmarshaller

Let's start with an item that has an `ID` field that is populated from the JSON payload. We need an extra field called HashCode for our fingerprint that we calculate during the unmarshal process:

```go
type Item struct {
  ID              string `json:"id"`
  HashCode string
}
```

By providing a custom UnmarshalJSON method to our type, go will recognize the [Unmarshaler interface][1] and use our custom function instead of the default.

The function signature gives us a pointer to the destionation object and the raw data for unmarsalling. To re-implement the default unmarshaller we start with something like this function:

```go
func (i *Item) UnmarshalJSON(data []byte) error {
if err := json.Unmarshal(data, &aliasItem); err != nil {
    return err
  }
return nil
}
```

Although we will not actually work, we get an infinite loop because `Unmarshal` will call `UnmarshalJSON` again recursively. The solution is an inline alias type, for sharing the same fields but none of the methods (i.e. our custom unmarshal JSON method.

```go
type aliasType Item
aliasItem := &struct{ *aliasType }{aliasType: (*aliasType)(i)}
```

Now the goal here is to use a hashing function and store a HashCode on our object:

```go
i.HashCode = fmt.Sprintf("%x", sha256.Sum256(data))
```

putting it all together

```go
func (i *Item) UnmarshalJSON(data []byte) error {
  type aliasType Item
  aliasItem := &struct{ *aliasType }{aliasType: (*aliasType)(i)}

  if err := json.Unmarshal(data, &aliasItem); err != nil {
    return err
  }
  i.HashCode = fmt.Sprintf("%x", sha1.Sum(data))
  return nil
}
```

Now instead of moving the full object around, we can use a comparably much smaller hashcode to skip items that have not changed; letting us significantly reduce resources per item.

Here is the full code example:

```go
package main

import (
  "crypto/sha1"
  "encoding/json"
  "fmt"
)

type Item struct {
  ID       string `json:"id"`
  HashCode string
}

func (i *Item) UnmarshalJSON(data []byte) error {
  type aliasType Item
  aliasItem := &struct{ *aliasType }{aliasType: (*aliasType)(i)}

  if err := json.Unmarshal(data, &aliasItem); err != nil {
    return err
  }
  i.HashCode = fmt.Sprintf("%x", sha1.Sum(data))
  return nil
}

func main() {
  data := []byte(`{"id": "foo"}`)
  item := Item{}
  err := json.Unmarshal(data, &item)

  fmt.Println("err: ", err)
  fmt.Println("item: ", item)
}
```

### Conclusion

How much can this help? Using our example of 50 items in a stash, let's say an average item payload is 1500 bytes and 2 items are changed per payload. Using 40 bytes per sha1

Before: 50 items * 1500bytes/item = 75000 bytes per stash
After: 50 items * 40bytes/item + 2 items * 1500bytes/item = 3480

We are down to 3480 bytes, saving 95% of the write payload!


[1]: https://github.com/golang/go/blob/54697702e435bddb69c0b76b25b3209c78d2120a/src/encoding/json/decode.go#L118-L120
[2]: https://www.pathofexile.com/developer/docs/api-resource-public-stash-tabs#intro
