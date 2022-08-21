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