---
layout: post
title:  "Building a Leaderboard with Redis"
date:   2017-12-24 17:20:00 -0500
categories: redis, go
featured: images/redis-logo.png
---

Leaderboards can be cumbersome to build, especially building one that can scale
past millions. Fortunately Redis has built-in data type that makes doing this
really easy.

The data type is a sorted set, a collection of non repeating strings where each
member is associated with a score. Access to a range around a user i.e.
getting a user's leaderboard is extremely fast, and can be done with `ZRANGE`,
which is a O(log(N)+M) operations, where N is the size of the sorted set and M
are the elements returned, meaning a set size of 100+ million can still return in a few milliseconds.

We'll make a tiny example web server in go that can do a few basic operations with a
leaderboard:
 * add to a leaderboard with `ZADD/3`
 * get a users current rank with `ZRANK/2`
 * get leaderboard around a user with `ZRANGE/3`
 * get top10 with `ZREVRANGE/3`

Our leaderboard will store simple userID/score pairs. Each operation
takes the key name our of leaderboard, and 1-2 additional arguments
depending on the command.

To give some context, we're going to be using mux for our web server, go-redis as our Redis client and returning a user struct:

```go
import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-redis/redis"
	"github.com/gorilla/mux"
)

const leaderboard string = "leaderboard"

func respondWithJSON(w http.ResponseWriter, code int, user interface{}) {
	response, _ := json.Marshal(user)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

type user struct {
	ID    string  `json:"id,omitempty"`
	Rank  int64   `json:"rank,omitempty"`
	Score float64 `json:"score,omitempty"`
}

type app struct {
	Router *mux.Router
	Redis  *redis.Client
}

func (a *app) initialize() {
	a.Router = mux.NewRouter()
	a.Redis = redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: "", // no password set
		DB:       0,  // use default DB
	})

	a.initializeRoutes()
}

func (a *app) initializeRoutes() {
	a.Router.HandleFunc("/leaderboard/{id}", a.viewLeaderboard).Methods("GET")
	a.Router.HandleFunc("/user/{id}", a.viewRank).Methods("GET")
	a.Router.HandleFunc("/user/{id}", a.updateRank).Methods("POST")
	a.Router.HandleFunc("/topusers", a.topRanks).Methods("GET")
}

func (a *app) run() {
	http.ListenAndServe(":8080", a.Router)
}

func main() {
	a := app{}
	a.initialize()
	a.run()
}
```

The first thing we will look at is updating a user's score. ZADD takes the leaderboard key play a key/value pair, we will use userID/score
in this example. The ZADD operation is idempotent so it will either add or update depending if the key already exists in the set. Our web
server will take in the request params, and pass them to our Redis
client:
```go
func (a *app) updateRank(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	newUser := new(user)
	json.NewDecoder(r.Body).Decode(newUser)

	zAdd := a.Redis.ZAdd(leaderboard, redis.Z{newUser.Score, id})
	added, _ := zAdd.Result()

	if added == int64(1) {
		respondWithJSON(w, http.StatusOK, ``)
	}
}
```

Next thing we'll do is get the rank of the user we added with ZRANK,
this operation does a lookup by the userID key we added and returns the
rank of that user:
```go
func (a *app) viewRank(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	zRank := a.Redis.ZRank(leaderboard, id)
	user := user{ID: id, Rank: zRank.Val()}

	respondWithJSON(w, http.StatusOK, user)
}
```

Viewing the top10 ranks is pretty straight forward, ZREVRANGE takes the
sorted set ordered from highest to lowest, we will just grab the
first 10 elements from it. ZREVRANGEWITHSCORES includes the score for
each user, which is also convenient for our web server:

```go
func (a *app) topRanks(w http.ResponseWriter, r *http.Request) {
	zRevRangeWithScores := a.Redis.ZRevRangeWithScores(leaderboard, 0, 9)

	users := []user{}
	for _, data := range zRevRangeWithScores.Val() {
		member, _ := data.Member.(string)

		user := user{ID: member, Score: data.Score}
		users = append(users, user)
	}

	respondWithJSON(w, http.StatusOK, users)
}
```

Last and most interesting is the leaderboard around a single user. This
will actually be the same as the top10 leaderboard, but instead of
taking the top scores, we're going to find the rank of our user and
grab the users immediately around them.

```go
func (a *app) viewLeaderboard(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	zRank := a.Redis.ZRank(leaderboard, id)

	lower := zRank.Val() - 5
	upper := zRank.Val() + 4

	zRangeWithScores := a.Redis.ZRangeWithScores(leaderboard, lower, upper)

	users := []user{}
	for _, data := range zRangeWithScores.Val() {
		member, _ := data.Member.(string)

		user := user{ID: member, Score: data.Score}
		users = append(users, user)
	}

	respondWithJSON(w, http.StatusOK, users)
}
```

Now we have a fully functioning leaderboard! Not only is it as fast as Redis, but the performance is essentially O(log(N)), so it scales petty well.

The first few extensions of this are probably
* multiple leaderboards e.g. `leaderboard/vip/3` (which would just involve setting a different Redis key to access a
different sorted set)
* removing a user from the sorted set
* total users in the leaderboard

None of those involve anything more complicated than what we just
went over, but up to you to implement!
