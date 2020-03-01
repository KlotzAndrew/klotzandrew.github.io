---
layout: post
title: "Graph queries with Cypher in Neo4j"
date: 2018-01-03 17:20:00 -0500
categories: neo4j, cypher
image: fisher_to_kitano.png
---

Neo4j uses a declarative language called Cypher, that lets us easily make
graph style queries that return some pretty cool data. We will be looking at
movie data again (this time the demo imdb dataset), and walking through some
queries that helped me get familiarity with the Cypher syntax

We will start off by finding the actors who have acted in the fewest movies
in our dataset:
```
MATCH (n)-[r:ACTED_IN]->()
RETURN n, count(r) AS num
ORDER BY num
LIMIT 2
```

Here we match all nodes, binding the nodes to the variable `n`, with all their
relationships with the label `:ACTED_IN`, binding those relationships to the
variable `r`. We then count, order, and return with a limit.

Taking our two actors Takeshi Kitano and Carrie Fisher, we are going to find
the shortest path between them:
```
MATCH p=shortestPath(
  (a:Person {name:"Takeshi Kitano"})-[*]-(b:Person {name:"Carrie Fisher"})
)
RETURN p
```

`shortestPath` starts with a breadth first search to find the shortest path. all
we have to do is identify the two nodes we are searching with and return the
result - which looks pretty cool:

![fisher_to_kitano]({{ "/assets/fisher_to_kitano.png"}})

Keanu Reeves was in that list, so lets see all the actors who acted with him
```
MATCH (keanu:Person {name:"Keanu Reeves"})-[:ACTED_IN]->(m)<-[:ACTED_IN]-(coActors)
RETURN coActors, m, keanu
```

This one looks a little more complicated, but all we are doing is specifying a
node with a name "Keanu Reeves", that has a relationships `:ACTED_IN` to
another node, which we bind to `m`, and on the other side nodes that have an
inverse `:ACTED_IN` relationship. The syntax is pretty straight forward, and
the results are powerful

![keanu_coactors]({{ "/assets/keanu_coactors.png"}})
