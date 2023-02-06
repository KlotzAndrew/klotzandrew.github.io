---
layout: post
title: "Instrumenting bash scripts"
date: 2023-02-06 13:00:00 -0500
categories: bash, monitoring
featured: images/apm_counter_example.png
description: ""
---

Tracing gives a detailed breakdown of where time was spent, typically an HTTP request. We can do the same for shell scripts. If you find yourself in a CI or CD context where a few bash scripts are strung together, this could be useful.

Two places to add instrumentation:

1. Wrap the shell script
2. Within the shell script

### 1) Wrap the shell script with

Our example `wrapper.sh`

```bash
#!/bin/bash

START_TIME=$(date +%s)

"$@" # do the command
exit_code=$?

END_TIME=$(date +%s)

# record the results
echo "command: ${*}"
echo "exit: ${exit_code}"
echo "duration: $(($END_TIME - $START_TIME))"
```

This script can be used like `./wrapper.sh my_command -flag something`. We grab our start time with `date` for getting the duration. Execute the arguments we passed to the script with `$?`, and use `$?` to grab the success code. At the end, we record the values.

We use echo here to print to stdout, but this could instead be sending data somewhere or even better - capturing stdout and stderr to forward in the error message.

### 2) Within the script

Using trap in our example `script.sh`

```bash
#!/bin/bash

START_TIME=$(date +%s)

function record() {
    END_TIME=$(date +%s)

    exit_code=$1
    line_number=$2
    echo "exit code: $1"
    echo "line number: $2"

    echo "duration: $(( $END_TIME - $START_TIME))"

    line=$(awk "NR == n" n=$line_number $0)
    echo "error at: $0:$line_number $line"
}
trap 'record $? $LINENO' EXIT

# regular script stuff goes here
```

Here we are using `trap` on `EXIT` to always run our function. This function takes two arguments, `$?` has the exit value of the script when the function triggers, and `$LINENO` has the line number that triggered the trap function. All business logic goes in this script, it is a bit more verbose than the wrapper method but can be put sourced from a utility script for reuse and has the advantage of being able to use `$LINENO` to print out the bash line that caused the error.