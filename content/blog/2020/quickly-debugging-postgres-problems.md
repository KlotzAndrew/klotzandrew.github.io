---
layout: post
title: "Quickly debugging Postgres problems"
date: 2020-08-15 17:00:00 -0500
categories: postgres, debugging
featured: images/pg.jpg
description: ""
---

# Uh-oh! something just happened

One of these queries might quickly narrow down a problem with your Postgres database. With a little luck, the culprit has to do with either: queries, indexes, or disk space. Postgres exposes a lot of internal information in system tables like `pg_stat_activity` and `pg_stat_user_tables`, if you are not already familiar with them we will be looking at a few as we go:

 * Queries, `pg_stat_activity`
    * Long running queries?
    * What is blocking my lock?
    * Stop processes
 * Indexes, `pg_stat_user_tables` & `pg_stat_user_indexes`
    * Tables need vacuum?
    * Missing index?
    * Slow vacuum?
 * Disk Space, `pg_stat_database` & `pg_relation_size`
    * Database size?
    * Table size?
    * Index size?

## Queries

`pg_stat_activity` has information on currently running processes, and in our case - queries. We can get all long-running queries based on `query_start`, including the SQL that is being run and additional data about what the process is doing.

### Long running queries?
```sql
SELECT
  pid,
  usename,
  datname,
  state,
  NOW() - pg_stat_activity.query_start AS duration,
  wait_event_type,
  wait_event,
  query
FROM pg_stat_activity
WHERE (NOW() - pg_stat_activity.query_start) > interval '1 minutes'
ORDER BY duration DESC;
```

There are a few cases you are likely to find here:
 - A query like `SELECT * FROM big_table` has been running since an incident started
 - A query like `SELECT * FROM big_table WHERE should_have_an_index` is missing an index
 - A query is stuck on locks, the `wait_event` and `wait_event_type` columns have information which could indicate locking bottlenecks ([info on what the field values mean][3])
 - Lots of idle queries, filter them out with `WHERE state <> 'idle'` unless something may be opening
 more idle connections than we want

In the case of locks being the bottleneck, we can use `pg_blocking_pids` to walk backward and what is responsible for queries stumbling over each other locks.

### What is blocking my lock?
```sql
SELECT * FROM pg_stat_activity
WHERE pid IN (SELECT pg_blocking_pids(<pid of blocked query>));
```

To take action use either `pg_cancel_backend` or `pg_terminate_backend`, the former
tries to cancel the running query and if that does not work the latter will terminate
the connection.

### Stop processes
```sql
SELECT pg_cancel_backend(<pid>);
SELECT pg_terminate_backend(<pid>);
```

## Indexes

`pg_stat_user_tables` shows system information about tables. We can use this to see if our autovacuum or indexing strategy is not working for us.

### Tables need vacuum?
```sql
SELECT
  schemaname,
  relname,
  n_dead_tup,
  n_live_tup,
  n_dead_tup / n_live_tup AS percent_dead_tuples
FROM pg_stat_user_tables WHERE n_live_tup > 0
ORDER BY n_dead_tup DESC;
```
A high number of `n_dead_tup` or `percent_dead_tuples` likely means our autovacuum is not running often enough on this table. This can cause queries and indexes to be less effective and slower, the solution is to usually autovacuum more frequently. The rest of the columns in the table can also help with identifying where to look next:

```sql
SELECT
  schemaname,
  relname,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  n_tup_hot_upd,
  n_mod_since_analyze,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze,
  vacuum_count,
  autoanalyze_count,
  autovacuum_count
FROM pg_stat_user_tables;
```

Some common issues:
 - Infrequent vacuums or analyzes. `last_autovacuum` and `last_autoanalyze` will tell you if a table has not been vacuumed or analyzed recently. Likely the case for tables with large `n_dead_tup`. Can also be paired with `autovacuum_count` and `autoanalyze_count` to see if it is running frequently
 - Missing indexes. From high `seq_scan` and low `idx_scan`. For healthy indexes we want most of our reads to not be coming from seq scans. There are some cases where you can sequentially walk the whole table without a problem (e.g. `SELECT * FROM table_with_10_rows` needs no index)
 - Not performing hot updates. On high usage tables with low `n_tup_hot_upd`. With lots of updates, there are big performance improvements for more hot tuple updates. The fix here might live in the application on determining how to group affected rows together more easily


The opposite of a missing index could be too many indexes slowing down updates. If an index has a low hit rate, we are doing an extra index update without any of the benefits.

### Missing index?
```sql
SELECT
  schemaname,
  relname,
  indexrelname,
  idx_scan
FROM pg_stat_user_indexes
```

Another potential issue is autovacuum is running but just taking too long.

### Slow vacuum?
```sql
SELECT
  datname,
  usename,
  pid,
  state,
  wait_event,
  current_timestamp - xact_start AS xact_runtime,
  query
FROM pg_stat_activity
WHERE upper(query) LIKE '%VACUUM%'
ORDER BY xact_start;
```

At the database level, the vacuum needs periodically run to clean up transaction ids for postgres to continue running. If you want to check this value before it gets too large (~2 billion):
```sql
SELECT max(age(datfrozenxid)) FROM pg_database;
```

There is a good [article from amazon on setting up alarms to monitor this in AWS][1]. If it is climbing or triggers an alarm we can narrow down the area if there are multiple databases:

```sql
SELECT
  datname,
  age(datfrozenxid) AS frozen_age,
  age(datfrozenxid)::decimal / 1000000000 AS frozen_age_percent
FROM pg_database
ORDER BY frozen_age desc limit 20;
```

## Disk space

`pg_stat_database` stores database-wide statistics, and we will be looking at `pg_catalog` for table-level statistics.

Do we have a disk space problem? Let's work from the top down.

### Database size?
We can get our `current_database()` and check there are no size surprises:

```sql
SELECT pg_size_pretty(pg_database_size(current_database()));
```

### Table size?

Using `pg_catalog.pg_stat_user_tables` from tracking down table-level index issues, but this time for disk space:

```sql
SELECT schemaname AS table_schema,
  relname AS table_name,
  pg_size_pretty(pg_relation_size(relid)) AS data_size
FROM pg_catalog.pg_stat_user_tables
ORDER BY pg_relation_size(relid) desc;
```

### Index size?

Using `pg_catalog.pg_stat_user_indexes` from index investigation, but now for disk space:

```sql
SELECT schemaname AS table_schema,
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan AS id_scans,
  pg_size_pretty(pg_relation_size(relid)) AS data_size
FROM pg_catalog.pg_stat_user_indexes
ORDER BY pg_relation_size(relid) DESC;
```

Disk space issues might be coming from temporary files. When Postgres attempts to sort a very large set without sufficient memory it uses temp files. A query like `SELECT * FROM large_table ORDER BY column_with_no_index` will try loading the dataset into memory to sort and then use disk:

```sql
SELECT datname, temp_files, temp_bytes
FROM pg_stat_database ;
```

Hopefully, some of this helps, let me know if there are any others you use!


[1]: https://aws.amazon.com/blogs/database/implement-an-early-warning-system-for-transaction-id-wraparound-in-amazon-rds-for-postgresql
[2]: https://wiki.postgresql.org/wiki/Schema_Size
[3]: https://www.postgresql.org/docs/12/monitoring-stats.html
