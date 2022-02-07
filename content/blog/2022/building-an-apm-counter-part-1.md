---
layout: post
title: "Building an Actions Per Minute counter - part 1, Keylogger"
date: 2022-02-06 13:00:00 -0500
categories: cpp, windows
featured: images/apm_counter_example.png
description: ""
---

This is part 1 of a 3 about creating an Actions Per Minute (APM) tracker for playing video games on windows.

- [Part 1, Keylogger][part_1]
- [Part 2, UI][part_2]
- [Part 3, Data structure][part_3]

A few games I had in mind to track my APM with are League of Legends, Dota 2, and Age of Empires. The idea is to have a binary that does one thing: display a small box with our current APM number in the corner of the screen. For this we need 3 components:

1. Count actions (keystrokes or mouse clicks)
2. Calculate a per minute average
3. Display the number on the screen

!["apm counter example"](images/apm_counter_example.png)

The first part we will start with is registering keyboard and mouse actions, which will be the input to our APM counter.  There are two architectural styles I looked at for counting keystrokes. Both styles use the Win32 API.

1. Looping over all keys
2. Hooks

## 1) Looping over all keys

This method is easier to implement. The win32 function `GetAsyncKeyState(key)` takes a keycode and checks if that key is currently pressed. Once we know that key is pressed, we can increment a counter. The [keycodes go up to 254](https://docs.microsoft.com/en-us/windows/win32/inputdev/virtual-key-codes), so what we can do is constantly loop through and check all keycodes and check if they are pressed.

```cpp
#include <windows.h>

int counter;

int main() {
  while (true) {
		for (int key = 0; key <= 254; key++) {
			if (GetAsyncKeyState(key) == -32767) {
				counter++;
			}
		}
	}

	return 0;
}
```

The magic number `-32767` has some meaning. The return value from `GetAsyncKeyState(key)` is a signed 16-bit int, where the most significant bit indicates the key is currently being held down and the least significant bit indicates the key has transitioned from released to pressed since the last call to `GetAsyncKeyState`.

The downside to this approach is we are not actually tracking when a key is pressed. We check if a key is currently pressed and count that as a keystroke. In addition, the docs on GetAsyncKeyState mention the [pressed to released state flag may not be reliable](https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getasynckeystate).

## 2) Keyboard and mouse event hooks

`SetWindowsHookEx` is a win32 method to attach a hook method to either keyboard or mouse events. With this, we can get a counter increment per action instead of the previous method.

The hook functions only have 3 parts to them. The most complicated part is knowing which `WM_` constants to track.

```cpp
LRESULT mouseProc(int nCode, WPARAM wparam, LPARAM lparam)
{
		// 1) function requirement to exit early
    if (nCode < 0)
        return CallNextHookEx(kHook, nCode, wparam, lparam);

		// 2) where we detect actions
    if (wparam == WM_LBUTTONDOWN ||
        wparam == WM_RBUTTONDOWN ||
        wparam == WM_XBUTTONDOWN ||
        wparam == WM_MBUTTONDOWN)
        counter++;

		// 3) function return values
    return CallNextHookEx(kHook, nCode, wparam, lparam);
}
```

1. The [win32 spec requires](https://docs.microsoft.com/en-us/previous-versions/windows/desktop/legacy/ms644984(v=vs.85)) us to immediately call `CallNextHookEx` with the input parameters and return its value without further processing if `nCode < 0`
2. Our tracking code. The `wparam` variable holds the type of event this was, we want to filter for “button down” events and increment our counter whenever one happens. This excludes events like “mouse move” which we do not want to track
3. Our required return value, the same as #1

The code for the keyboard hook is very similar

```cpp
LRESULT keyboardProc(int nCode, WPARAM wparam, LPARAM lparam)
{
		// 1) function reqirements
    if (nCode < 0)
        CallNextHookEx(mHook, nCode, wparam, lparam);

		// 2) where we detect actions
    if (wparam == WM_KEYDOWN || wparam == WM_SYSKEYDOWN)
        counter++;

		// 3) function reqirements
    return CallNextHookEx(mHook, nCode, wparam, lparam);
}
```

The only difference here is which `wparam` values to check. We could combine these two functions into a single function that checks both the keyboard and mouse events if we wanted.

Registering the hooks requires calling `SetWindowsHookEx`.

```cpp
kHook = SetWindowsHookEx(WH_KEYBOARD_LL, (HOOKPROC)keyboardProc, GetModuleHandle(NULL), 0);
mHook = SetWindowsHookEx(WH_MOUSE_LL, (HOOKPROC)mouseProc, GetModuleHandle(NULL), 0);
```

`SetWindowsHookEx` needs 4 parameters:

1. The type of hook we register, either keyboard or mouse hooks in our case
2. The hook function
3. A handle to the current calling function `GetModuleHandle(NULL)` does the trick
4. Which thread to associate the hook with, `0` means all threads since we want to track events across all applications

This function needs to be called twice, once for the keyboard hooks `WH_KEYBOARD_LL` and one for the mouse hooks `WH_MOUSE_LL`. You will notice the return values `kHook` and `mHook` were used inside the hooks functions themselves, the hooks do need to be called there.

Take a look at the [GitHub repo](https://github.com/KlotzAndrew/actions-per-minute-tracker) if you want to see the full code in action


[part_1]: /blog/building-an-apm-counter-part-1
[part_2]: /blog/building-an-apm-counter-part-2
[part_3]: /blog/building-an-apm-counter-part-3
