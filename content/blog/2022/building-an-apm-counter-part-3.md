---
layout: post
title: "Building an Actions Per Minute counter - part 3, Data structure"
date: 2022-02-06 15:00:00 -0500
categories: cpp, windows
featured: images/apm_counter_sliding_window.png
description: ""
---

This is part 3 of a 3 about creating an Actions Per Minute (APM) tracker for playing video games on windows.

- [Part 1, Keylogger][part_1]
- [Part 2, UI][part_2]
- [Part 3, Data structure][part_3]

In the previous two parts, we tracked action events, then displayed text on the screen. In this part, we will run through turning action events into a per-minute metric.

The core data structure we will use is a rolling window. An array will store the current actions for a given second. New actions increment the last element of the array, every second we increase the size of the array by 1. A simple way to get our per minute would be to take the last 60 elements of our array and average them. This approach fetches a lot of the same data every second, 59 out of 60 elements are the same second to second. To improve this we keep a rolling value. Each second we add the value of the latest index and subtract the value at the last index of our window. This keeps a rolling integer value of the window sum.

!["sliding window"](images/apm_counter_sliding_window.png)

In our example array, we have 4 elements in the window with a sum of 18. Incrementing a second would slide our window 1 to the right. Adding 5, the element to the right of the window and subtracting 8, the last element in the window. Giving is a current rolling sum value of 21, which we can divide by the window size to get the average.

To get started we need 4 variables:

```cpp
std::vector<int> actionsPerSecond{0};
int rollingActionCount;
std::mutex mtx;
```

- `actionsPerSecond` is our counter for actions in each second
- `rollingActionCount` is our rolling window value
- `mtx` is our mutex, we have at least 2 threads modifying the same vector. The thread adding actions to a vector index, and the thread incrementing the vector index

Adding an action happens in the proc function thread handling our window events, where we were previously using `counter++`

```cpp
void addAction()
{
    const std::lock_guard<std::mutex> lock(mtx);

    int currentSecond = actionsPerSecond.size() - 1;
    actionsPerSecond[currentSecond]++;
}
```

In a separate thread we setup a 1 second ticker, we increment the size of the actions vector by 1, and then we increment the rolling window value:

```cpp
void incrementSecond() {
    const std::lock_guard<std::mutex> lock(mtx);

    int currentSecond = actionsPerSecond.size() - 1;
    rollingActionCount += actionsPerSecond[currentSecond];
    if (currentSecond >= 60) {
        rollingActionCount -= actionsPerSecond[currentSecond-60];
    }
    actionsPerSecond.push_back(0);
}

void tick() {
    while(true) {
        Sleep(1000);
        incrementSecond();
    }
}

std::thread t(tick);
```

And now we can get our current APM. When there are less than 60 data samples in the first minute, we give an estimate of APM to our users

```cpp
int adjustFirstMinute(int currentWindowSize)
{
    if (currentWindowSize == 0)
        return 0;

    float m = static_cast<float>(60) / static_cast<float>(currentWindowSize);
    return static_cast<int>(m * rollingActionCount);
}

int currentAPM()
{
    int currentSecond = actionsPerSecond.size() - 1;
    if (currentSecond > windowSize)
        return rollingActionCount;

    return adjustFirstMinute(currentSecond);
}
```

Take a look at the [GitHub repo](https://github.com/KlotzAndrew/actions-per-minute-tracker) if you want to see the full code in action

[part_1]: /blog/building-an-apm-counter-part-1
[part_2]: /blog/building-an-apm-counter-part-2
[part_3]: /blog/building-an-apm-counter-part-3
