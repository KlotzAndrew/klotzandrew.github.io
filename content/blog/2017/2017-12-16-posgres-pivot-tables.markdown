---
layout: post
title:  "PostgreSQL pivot tables, selecting has-many relationships"
date:   2017-12-16 17:20:00 -0500
categories: sql
---

PostgreSQL has a useful function called `crosstab` that makes selecting
'has many' data associations pretty easy. In our example we have contacts
who has many match_values (0+), and we want to present the data in a
single table.

A frequent approach I see to this problem is to make multiple queries to a
database and piece the data together in a client application. Well if you have
seen that being done before, this is a single query that returns the exact data
for that type of problem. Instead of multiple queries, we are going to make a
pivot table, join that with another table, and return a set of results that
otherwise might be hard to get.

#### Problem we are trying to solve:

##### Desired structure:
```
name | position | industry | nps
------+----------+----------+-----
Jon  | Director | Media    |
Beth |          | Banking  | 8
Amy  | VP       |          | 10
```

##### Raw data:
{% highlight sql %}
SELECT * FROM contacts;

-- id | name
-- ----+------
--  1 | Jon
--  2 | Beth
--  3 | Amy

SELECT * FROM match_values;
-- id | contact_id | match_category_id |   name
-- ----+------------+-------------------+----------
--  1 |          1 |                 1 | Director
--  2 |          1 |                 2 | Media
--  3 |          2 |                 2 | Banking
--  4 |          2 |                 3 | 8
--  5 |          3 |                 1 | VP
--  6 |          3 |                 3 | 10

select * from match_categories;
-- id |   name
-- ----+----------
--  1 | Position
--  2 | Industry
--  3 | NPS
{% endhighlight %}

The first thing we need to do is `CREATE extension tablefunc;`, this will let us
use the `crosstab` function.

Now lets take a quick high level look at how the crosstab function works for our case. We will be passing in 2 string arguments, and provide a schema for the
results to be returned in.

{% highlight sql %}
SELECT * FROM crosstab(
  TEXT source_sql,
  TEXT category_sql
) AS ct (
  result_schema
)
{% endhighlight %}

The first argument 'source_sql' is a string that returns 3 columns in this order
* __row_name column__, how the table extends vertically
* __category column__, how the table extends horizontally
* __value column__, the values populating the columns

Our source_sql will be:
{% highlight sql %}
SELECT contact_id, match_category_id, name FROM match_values ORDER BY 1, 2
{% endhighlight %}

`contact_id` is the row name, `match_category_id` is the column names, and `name`
is the values.

The second argument `category_sql` is the ordering of the category column, this prevents all
the null values being squashed to the left. It should return a single column of
equal length to the categories from the first query of the same type and with
no duplicates.

Our category_sql will be:

{% highlight sql %}
SELECT DISTINCT id FROM match_categories ORDER BY 1
{% endhighlight %}

The results is a list of the column names and data types, for us to select from.

Ours columns look like this:
{% highlight sql %}
contact_id INT,
position TEXT,
industry TEXT,
NPS TEXT
{% endhighlight %}

Now putting it all together into a full query, we get this:

{% highlight sql %}
SELECT * FROM crosstab (
  $$ SELECT contact_id, match_category_id, name FROM match_values ORDER BY 1, 2 $$,
  $$ SELECT DISTINCT match_category_id FROM match_values ORDER BY 1 $$
) AS ct (
  contact_id INT,
  position TEXT,
  industry TEXT,
  NPS TEXT
);

-- | contact_id | position | industry | nps  |
-- |---         |---       |---       |--    |
-- | 1          | Director | Media    |      |
-- | 2          |          | Banking  | 8    |
-- | 3          | VP       |          | 10   |
{% endhighlight %}

The result is pretty close to what we want, but instead of contact_id we really
want a column that has the contact name. What we can do is combine our retults
with a Common Table Expression using `WITH`, and join that with contacts to get exactly
what we were looking for

{% highlight sql %}
WITH pivot_table AS (
  SELECT * from crosstab (
    $$ SELECT contact_id, match_category_id, name FROM match_values ORDER BY 1 $$,
    $$ SELECT DISTINCT match_category_id from match_values ORDER BY 1 $$
  ) AS ct (
    contact_id INT,
    position TEXT,
    industry TEXT,
    nps TEXT
  )
)

SELECT
  contacts.name,
  pivot_table.position,
  pivot_table.industry,
  pivot_table.nps
FROM contacts
LEFT JOIN pivot_table ON contacts.id = pivot_table.contact_id;

-- | name | position | industry | nps  |
-- |---   |---       |---       |--    |
-- | Jon  | Director | Media    |      |
-- | Beth |          | Banking  | 8    |
-- | Amy  | VP       |          | 10   |
{% endhighlight %}

Now we can return exactly what we were looking for in a single query! Our
database can do more of the heavy lifting and we can avoid an alternative of
multiple queries and piecing the data together somewhere else.

If you want to try this out yourself, here is the SQL to generate the data in
your own database:

{% highlight sql %}
CREATE extension tablefunc;

CREATE TABLE contacts(
  id INT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE match_values(
  id INT PRIMARY KEY,
  contact_id INT NOT NULL,
  match_category_id INT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE match_categories(
  id INT PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO contacts
  (id, name)
VALUES
  ( 1, 'Jon'),
  ( 2, 'Beth'),
  ( 3, 'Amy');

INSERT INTO match_categories
  (id, name)
VALUES
  ( 1, 'Position'),
  ( 2, 'Industry'),
  ( 3, 'NPS');

INSERT INTO match_values
  (id, contact_id, match_category_id, name)
VALUES
  ( 1, 1, 1, 'Director'),
  ( 2, 1, 2, 'Media'),
  ( 3, 2, 2, 'Banking'),
  ( 4, 2, 3, '8'),
  ( 5, 3, 1, 'VP'),
  ( 6, 3, 3, '10');
{% endhighlight %}
