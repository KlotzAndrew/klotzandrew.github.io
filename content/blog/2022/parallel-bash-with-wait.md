---
layout: post
title: "Parallel bash with wait"
date: 2022-08-20 13:00:00 -0500
categories: bash, concurrency
featured: images/bash_logo.png
description: ""
---

Parallel processing in bash is easy with the `wait` command. There is a small gotcha to watch out for. To use it `wait` will wait until all child background processes are finished. In your bash script you can toss a bunch of work into background processes with `&` and instead of exiting, calling `wait`will hang until they all complete:

```bash
#!/bin/bash

do_something() {
  sleep 1
  echo $1
}

for i in {1..5}; do
  do_something $i &
done

wait

echo "All done!"
```

Running this will output something like this after 1 second, instead of the 5 seconds needed by each function.

```bash
5
1
3
2
4
All done!
```

### The gotcha

Now the gotcha in that example has to do with handling error codes of the child processes. The difference is `wait` vs `wait $pid`.Waiting without a pid will swallow the exit code of the child process. Wait with a pid will return the exit code, so if we want to handle errors we will need to keep track of the pids of our child processes

The bash variable`$!`holds the pid of the most recently created child process. Modifying our loop we can track the pids of each created process to an array:

```bash
for i in {1..5}; do
    do_something "$i" &
    pids+=($!)
done
```

And instead of waiting for all pids with `wait` we wait for each pid individually, and track their exit codes in an array:

```bash
for pid in "${pids[@]}"; do
    wait "${pid}"
    status+=($?)
done
```

Putting this all together we now have parallel processing while handling exit codes of child processes:

```bash
#!/bin/bash

do_something() {
    sleep 1
    echo "$1"
    exit $((i % 2))
}

for i in {1..5}; do
    do_something "$i" &
    pids+=($!)
done

for pid in "${pids[@]}"; do
    wait "${pid}"
    status+=($?)
done

for i in "${!status[@]}"; do
    echo "job $i exited with ${status[$i]}"
done

echo "All done"
```

The output should look something like this, with the option of doing what you need on a per exit code basis:

```bash
1
5
4
3
2
job 0 exited with 1
job 1 exited with 0
job 2 exited with 1
job 3 exited with 0
job 4 exited with 1
All done
```