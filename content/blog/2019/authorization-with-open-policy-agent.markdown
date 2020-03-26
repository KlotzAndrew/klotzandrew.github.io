---
layout: post
title: "Web authorization with Open Policy Agent"
date: 2019-04-28 17:20:00 -0500
categories: golang, web, authorization, open policy agent, opa
featured: images/opa-admin-all-on.png
---

So maybe you upgraded our authentication logic to no longer be a system bottleneck
but now find authorization slowing you down, or have custom authorization logic
mixed in with business logic - then Open Policy Agent can help! If you have not heard of <a href="https://www.openpolicyagent.org/">Open Policy Agent</a>,
it is really worth checking out, it is a declarative way to push authorization outside
your business logic in an extremely scalable way.

<img src="images/opa-admin-all-on.png" width="700"  />

Overview:

 - Architecture
 - walk-through integrating a golang webserver with OPA
 - writing and testing authz policies
 - setting up UI for authz admin
 - demo, full code here: https://github.com/KlotzAndrew/opa-firefly


#### Architecture

One of the things that makes Open Policy Agent interesting is that we can embrace
the sidecar pattern with it. Each node in our system will be running an instance
of Open Policy Agent, allowing any service to make a request to localhost to check
authorization, making this solution extremely scalable. Agents can point to a
location to fetch current policies on startup, periodically fetch, and be triggered
to re-fetch, which gives us some options for keeping them in sync.

#### Integrating with a Golang server

What is the goal? Just an additional middleware call that checks permissions for the routes.
The most our service will know about authorization will be adding the middleware `authz`
```go
func main() {
	e := echo.New()

	e.GET("/accounts/:id", getAccount)
	e.GET("/rewards/:id/redeem", getAccount)

	e.Use(authz)

	e.Logger.Fatal(e.Start(":1323"))
}
```

working with echo, our middleware looks something like this:

```go
func authz(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if isAuthorized(c) {
			return next(c)
		}
		return echo.NewHTTPError(http.StatusUnauthorized, "Please provide valid credentials")
	}
}
```

to check isAuthorized, we construct a payload to send to OPA, send it, then check if
any of the policies returned true for the route. The payload returns policy name +
result where we *could* check which policy matched, but in this example we only
care if any matched.

```go
type user struct {
	UserID    string   `json:"userID"`
	Employees []string `json:"employees"`
	Role      string   `json:"role"`
}

func isAuthorized(c echo.Context) bool {
	u := unmarshalUser(c.Request().Header.Get("JWT"))

	authzRequestPayload := map[string]map[string]interface{}{
		"input": {
			"userID":    u.UserID,
			"method":    c.Request().Method,
			"path":      trimPath(c.Request().URL.Path),
			"employees": u.Employees,
			"role":      u.Role,
		},
	}

	response := checkAuthz(authzRequestPayload)

	for _, v := range response.Result {
		if v == true {
			return true
		}
	}
	return false
}
```

OPA uses the sidecar pattern, so we will use an http call to localhost
to check the requester permissions. `checkAuthz` will just me making a request to a OPA agent on localhost

```go
func checkAuthz(values map[string]map[string]interface{}) opaResponse {
	jsonValue, errm := json.Marshal(values)
	if errm != nil {
		panic(errm)
	}

	opaURL := "http://localhost:8181/v1/data/httpapi/authz"
	resp, errp := http.Post(opaURL, "application/json", bytes.NewBuffer(jsonValue))
	if errp != nil {
		panic(errp)
	}
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		panic(err.Error())
	}

	var response opaResponse
	if errj := json.Unmarshal(body, &response); errj != nil {
		panic(errj)
	}

	return response
}
```

#### Writing and testing policies

Time to write some policies! So desired goal will be:
 - anyone (employees) can access their own account
 - managers can access their employees account
 - premium users can access rewards for their account

For our policies, we will start with `default allowAccounts = false` to default
deny, as well as assigning the requesting input payload as `http_api`. The next block allows the `"GET"` method for the path `"accounts/:userID"`,
where `:userID` is assigned from the input payload.


```opa
package httpapi.authz

import input as http_api

default allowAccounts = false

allowAccounts {
  http_api.method = "GET"
  http_api.path = ["accounts", userID]
  userID = http_api.userID
}
```

So for an input `{"userID": "a"}`,
we authorize access to  `"accounts/a"`, and deny for all others. We can even
write a test around this, testing both the allowed and denied case:


```opa
package httpapi.authz

test_get_anonymous_denied {
    not allowAccounts with input as {
        "path": ["accounts", "a"],
        "method": "GET",
        "userID": "b"
    }
}

test_get_allowed {
    allowAccounts with input as {
        "path": ["accounts", "a"],
        "method": "GET",
        "userID": "a"
    }
}
```

Next policy is for the managers, we use ` http_api.employees[_] = userID` to
wildcard any field in the employees array to the value userID, using that
for the allowed path `"accounts/:userID"`.

```opa
package httpapi.authz

import input as http_api

default allowManagers = false

allowManagers {
  http_api.method = "GET"
  http_api.path = ["accounts", userID]
  http_api.employees[_] = userID
}

```

So for an input `{"employees": ["x"]}`,
we authorize access to `"accounts/x`, for any value of x.

For the premium role, we start by checking for premium `http_api.role = "premium"`.
We then assign userID from the input, which we use for checking the path
`"rewards/:userID/redeem"`. Lastly we check if the api method is either GET/POST
by checking array inclusion.

```opa
package httpapi.authz

import input as http_api

default allowPremium = false

allowPremium {
  userID = http_api.userID
  http_api.role = "premium"

  http_api.path =  ["rewards", userID, "redeem"]
  {http_api.method} == {http_api.method} & {"GET", "POST"}
}
```

For our test, we check the methods and the premium role.

```opa
package httpapi.authz

test_get_premium_allowed {
    allowPremium with input as {
        "path": ["rewards", "a", "redeem"],
        "method": "GET",
        "userID": "a",
        "role": "premium"
    }
}

test_get_premium_denied {
    not allowPremium with input as {
        "path": ["rewards", "a", "redeem"],
        "method": "GET",
        "userID": "a",
        "role": "not_premium"
    }
}

test_post_premium_allowed {
    allowPremium with input as {
        "path": ["rewards", "a", "redeem"],
        "method": "POST",
        "userID": "a",
        "role": "premium"
    }
}
```

#### Admin

We are not going to spend too much time on the web UI for the demo, although I find
it pretty cool. There is not much code, we grab the current
policies (here we just check the active agent `http://0.0.0.0:8181/v1/policies/`),
compare against the available policies (`http://0.0.0.0:8000/`), then post to our
agent if we want to enable/disable (`http://0.0.0.0:8181/v1/policies/`)

#### Demo

Now it is demo time! The full code is over here (https://github.com/KlotzAndrew/opa-firefly)
if you want to follow along. For design, we have a golang http server running
on `:1323`, for authz it checks with a OPA agent running on `localhost:8181`
(sidecar pattern can use localhost). To get the policies into OPA we have a
react app running on `:3000`, it loads the policies from a python webserver
hosting our policies folder on `:8000`, and to enable/disable it `POSTS` to
the OPA agent on `:8181`.

There are a few accommodations here for the purposes of a local demo. The local
python server is a replacement for file storage like s3. On start a OPA agent
would pull from there, and periodically check for changes. Instead of a webserver
making a request directly to a known OPA agent with an update, that would be a
backend server updating all known OPA agents. Also, worth noting the nginx
server in the sample code is to support the react app making cors request directly
to the backend server.

Booting it up, in three terminals
```bash
docker-compose up
go run main.go authz-middleware.go
cd opa-admin && npm install && npm start
```

<img src="images/opa-admin-one-on.png" width="700"  />

The admin page is running on http://0.0.0.0:3000. Toggle on some policies
and test out some http requests!

```bash
curl -H "JWT: {\"userId\": \"a\"}" \
  http://0.0.0.0:1323/accounts/a

curl -H "JWT: {\"userId\": \"a\", \"employees\": [\"c\"]}" \
  http://0.0.0.0:1323/accounts/b

curl -H "JWT: {\"userId\": \"a\", \"role\": \"premium\"}" \
  http://0.0.0.0:1323/rewards/a/redeem

```

In total this is what is running:
 - OPA query page: http://0.0.0.0:8181/
 - filesys for OPA: http://0.0.0.0:8000/
 - demo website: http://0.0.0.0:1323/
 - admin webpage: http://0.0.0.0:3000/

The code for a working example is over here: https://github.com/KlotzAndrew/opa-firefly
