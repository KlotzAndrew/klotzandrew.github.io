---
layout: post
title: "Debugging slow PostgreSQL queries"
date: 2018-01-04 17:20:00 -0500
categories: postgresql
featured: images/slow_psql_queries.png
---

If production is on fire from slow queries, the quick command to identify them
is:

```sql
SELECT
  pid,
  now() - query_start as duration,
  state,
  query
FROM pg_stat_activity
WHERE pg_stat_activity.state <> 'idle'
  AND pg_stat_activity.query_start < now() - interval '5 minutes';
```

The above command will output any queries that have been running for more than
5 minutes. We are returning some of the predefined views from
`pg_stat_activity`, which is PostgreSQL's statistics collector. There are a lot
of other statistics on that table, but these ones help quickly finding offending
queries.

You can check out all the statistics available with
`SELECT * from pg_stat_activity;`

The next step is making sure logs are available. If you haven't already started
looking at your database logs, make sure these values are set on in your
postgresql.conf file:

```
logging_collector = on
log_directory = 'pg_log'
log_min_duration_statement = 30
```

* `logging_collector` collects postgresql log outputs and writes them to a file
* `log_directory` sets the name of the log file that will be written to
* `log_min_duration_statement` will log the query time, only for queries taking
longer than the number set (in milliseconds). This one is really useful!

With this on you will get logs of slow running queries (with the time it took!),
which can use either to identify problems before things catch fire or tell a
story about what happened.
