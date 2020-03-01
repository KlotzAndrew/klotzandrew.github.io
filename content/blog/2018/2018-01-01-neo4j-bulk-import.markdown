---
layout: post
title: "Neo4j bulk data import"
date: 2018-01-01 17:20:00 -0500
categories: neo4j, ruby
image: neo4j-data-import.png
---

Neo4j has a csv import tool that makes importing large datasets pretty easy,
especially if you happen to be exporting data out of postgres with the `COPY`
command. We're going to take a quick look at importing with the imdb movie
dataset (docs here: [http://www.imdb.com/interfaces](http://www.imdb.com/interfaces)).

![abc]({{ "/assets/neo4j-data-import.png"}})

There is more than one way to import data into Neo4j, like the cypher
command `LOAD CSV` which is recommended for medium sized datasets up to 10M
records. This is a little smaller than our movie dataset, so the one we will
look at uses the command line `neo4j-admin import`, recommended by Neo4j for
*huge* datasets.

This is the example command we will be using:

```shell
neo4j-admin import \
  --nodes name.basics.csv \
  --nodes title.basics.csv \
  --relationships title.principals.csv \
  --ignore-missing-nodes
```

The csv files need to be formatted in a particular way to correctly create nodes
and relationships, and the `ignore-missing-nodes` needs to be added so the
importer ignores relationships with no nodes instead of throwing errors (them
imdb dataset we are using references a few missing nodes)

Nodes: `<primary_key_name>:ID,attr1,attr2,:LABEL`
* `<primary_key_name>:Id` is the id of our node, can be any id name like
`movieId:ID` or `personId:ID`
* `:LABEL` is any label attached
* attributes can be added in between `:START_ID` and `:END_ID`

Relationships: `:START_ID,attr1,attr2,:END_ID,:TYPE`
* `:START_ID` and `:END_ID` refer to the ids of the nodes in the
relationship
* `:TYPE` is the relationship type
* attributes can be added in between `:START_ID` and `:END_ID`

For our imdb data we are going to pull 3 files:
* `https://datasets.imdbws.com/name.basics.tsv.gz`, actor name to id
* `https://datasets.imdbws.com/title.basics.tsv.gz`, movie name to id
* `https://datasets.imdbws.com/title.principals.tsv.gz`, movie id to actor ids
(the cast)

The files are tab seperated and gzipped, so we'll go through the motions of
quickly changing them over to a csv format.

For the actors, it will roughly look like this:
```ruby
require 'open-uri'

url          = 'https://datasets.imdbws.com/name.basics.tsv.gz'
csv_filepath = File.join(Dir.pwd, 'name.basics.csv')
csv_headers  = "personId:ID,name,:LABEL \n"

zipped   = open(url)
unzipped = Zlib::GzipReader.new(zipped)

File.open(csv_filepath, 'w') do |csv_file|
  csv_file.write(csv_headers)

  unzipped.each_line do |line|
    values   = line.strip.split("\t")
    personID = values[0]
    name     = values[1]

    csv_file.write("#{personID},#{name},Actor \n")
  end
end
```

Movies will mostly look the same, except we are only interested in titleType
of movies (skipping episodes, shorts, ...):
```ruby
require 'open-uri'

url          = 'https://datasets.imdbws.com/title.basics.tsv.gz'
csv_filepath = File.join(Dir.pwd, 'title.basics.csv')
csv_headers  = "movieId:ID,name,:LABEL \n"

zipped   = open(url)
unzipped = Zlib::GzipReader.new(zipped)

File.open(csv_filepath, 'w') do |csv_file|
  csv_file.write(csv_headers)

  unzipped.each_line do |line|
    values   = line.strip.split("\t")
    personID = values[0]
    name     = values[2]

    csv_file.write("#{movieID},#{name},Movie \n") unless values[1] == 'movie'
  end
end
```

The relationships:
```ruby
url          = 'https://datasets.imdbws.com/title.principals.tsv.gz'
csv_filepath = File.join(Dir.pwd, 'title.principals.csv')
csv_headers  = ":START_ID,:END_ID,:TYPE \n"

zipped   = open(url)
unzipped = Zlib::GzipReader.new(zipped)

File.open(csv_filepath, 'w') do |csv_file|
  csv_file.write(csv_headers)

  unzipped.each_line do |line|
    values  = line.strip.split("\t")
    movieID = values[0]
    cast    = values[1].split(",")

    cast.each_with_object('') do |actorID, str|
      csv_file.write("#{actorID},#{imdbID},ACTED_IN \n")
    end
  end
end
```

Now that we have the csv data for all our movie and actors, we just pass them
to the command from the beginning and we are ready to play with some graph data
for movies!
