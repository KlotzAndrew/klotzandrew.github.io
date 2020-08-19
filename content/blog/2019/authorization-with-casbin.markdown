---
layout: post
title: "Web authorization with Casbin"
date: 2019-08-16 17:20:00 -0500
categories: web, authorization, casbin, golang
featured: images/casbin-logo.png
---

Casbin is an authorization library that supports ACL, RBAC, ABAC permissions on
resources. If you are not familiar with those terms, we will be running through
examples in another post. Here we will be starting off with what Casbin is and
how we can start using it to secure our web applications.

I wrote an <a href="http://klotzandrew.com/blog/authorization-with-open-policy-agent">article</a>
on Open Policy Agent, which is another popular permission system that you might want to check out.

What will go through:

* Casbin syntax/DSL
* Integrating into a Golang application

At a high level Casbin provides a language around permissions, as well as a toolset
for using that in a web environment. The authors refer to it as the
PERM Modeling Language (PML), and have a <a href="https://arxiv.org/abs/1903.09756">published paper</a> on it.
The building blocks we will be looking at are a ‘casbin model’, ‘casbin policy', and ‘casbin enforcer’.

The way the block fit together is by instantiating an enforcer with a model and policies, then evaluate with arguments.

```
enforcer := casbin.NewEnforcer(“model.conf", "policy.csv")
role, path, method := “admin”, “/admin/route”, “POST”
isAllowed := enforcer.Enforce(role, path, method)
```

Casbin will provide the facilities to evaluate policies, models, and arguments, but how do we configure it?

### Starting with the policy.csv

Example policy.csv
```
p, guest, /foo, GET
p, admin, /bar, POST
```

This role will be modified whenever a rule changes for example adding or removing
a resource. The default format is a csv where each line is a rule, but we can store
that in any format we want so long as casbin receives the format it expects.

Each row is a rule starting with a letter `p` for policy, for
example: `p, account_view, /accounts/:id, GET`. What follows the `p` are a set
of strings that we will be using for evaluation in the casbin model. More on the
model coming up, but as an example the model will bind policies with something
like this `p = sub, obj, act`. In the model evaluation the 1st string is the
subject, the 2nd string is the object, and the 3rd string is the action.
The order and meaning can be changed by us, but the important aspect is to
define a new rule, we insert another row following the convention we have set
up. This is a full example:


### Model with model.conf
The more complicated piece is that model.conf, this file will likely be written
once and only needs to be modified when the architecture of your permissions
change not when we need to add a new rule, an example of our model:

```
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
```

It might look a little overwhelming at first, but the DSL is not that complicated
when we go through it. Casbin uses dynamic binding to assign values on the left
to tuples on the right

#### Request definition:
`r` is for request, we assign it to the arguments passed into the `.Enforce(...)`
function. `sub, obj, act` are conventions in this case for accessing
entity (Subject), accessed resource (Object) and the access method (Action),
but we could change the order or number of them if we wanted.

#### Policy definition:
`p` is for policy, it binds our policy rules from the policy.csv file. A rule
in that file might look like this: `p, guest, /foo, GET`. In our model we
translate that to `p = “guest”, “ /foo”, “GET”`

#### Policy matches:
`m` is the result of checking a policy rule. This is the part that I mostly
associate the authorization part of our rule evaluations happening. We compare `r` and `p`
from the previous sections using logical operators. For matching
sub/obj/act:  `m = r.sub == p.sub && r.obj == p.obj && r.act == p.act`, we
using dot-accessors to say the match is true if the request and policy have equal
subjects, objects, and actions.

#### Policy effect:
`e` is what result we want based off the matching our our policies. In a
simple case we could use something like this `e = some(where (p.eft == allow))`, which
says if any of the rules we evaluated allow then the overall result is to allow
the request. A more advanced option would look like
this `e = some(where (p.eft == allow)) && !some(where (p.eft == deny))`, if at
least one rule allowed and no rules denied then the overall result is to allow
the request.

#### Syntax recap
With those 4 sections we map `r` from the arguments
to `.Evaluate(...)`, `p` from our policy file, evaluate the two for a match `m` and
then return the overall effect `e` from the matched policies.

Integrating this example into a golang project (using echo):

```go
package main

import (
  "github.com/casbin/casbin"
  "github.com/labstack/echo"
)

type Enforcer struct {
  enforcer *casbin.Enforcer
}

func (e *Enforcer) Enforce(next echo.HandlerFunc) echo.HandlerFunc {
  return func(c echo.Context) error {
    user, _, _ := c.Request().BasicAuth()
    method := c.Request().Method
    path := c.Request().URL.Path

    result := e.enforcer.Enforce(user, path, method)

    if result {
      return next(c)
    }
    return echo.ErrForbidden
  }
}

func main() {
  e := echo.New()
  enforcer := Enforcer{enforcer: casbin.NewEnforcer("model.conf", "policy.csv")}
  e.Use(enforcer.Enforce)
  e.Logger.Fatal(e.Start("0.0.0.0:3000"))
}

```

Walking through what this looks like we extract 3 parameters from an incoming
request, send them as arguments for enforce and if casbin allows the request
we let it through.

```bash
# allow
curl http://guest:@0.0.0.0:3000/foo

# deny
curl http://guest:@0.0.0.0:3000/bar

# allow
curl http://admin:@0.0.0.0:3000/bar
```

What we have achieved with this is an extremely performant
authorization framework in our web application that requires exactly 0 calls to
persistent storage in the request path. By using something like a JWT for more user
information we can start supporting uses cases that involve RBAC/ABAC/ACL, but for this
example we just have basic auth to keep it simple.

Our example we are loading hardcoded
model and policy files at application start, which is alright to get started with.
Casbin supports <a href="https://casbin.org/docs/en/adapters">persistent storage adapters for models and policies</a>,
allowing us to have an updated
policy be applied to running applications without a code change or deploy.
Another exciting extension of this would be running casbin using the
<a href="https://docs.microsoft.com/en-us/azure/architecture/patterns/sidecar">sidecar pattern</a>
for non-golang applications that want to be supported by the same
authorization framework.
