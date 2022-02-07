---
layout: post
title: "Building an Actions Per Minute counter - part 2, UI"
date: 2022-02-06 14:00:00 -0500
categories: cpp, windows
featured: images/apm_counter_window_class.png
description: ""
---

This is part 2 of a 3 about creating an Actions Per Minute (APM) tracker for playing video games on windows.

- [Part 1, Keylogger][part_1]
- [Part 2, UI][part_2]
- [Part 3, Data structure][part_3]

In the previous part, we were able to track mouse and keyboard actions. Now, we will display them on the screen.

At a high level, we will need a window class, a window, and a proc function. The window class is required to render a window. The window will be the box that will contain our text. A proc function is where we define what to “paint” inside our window, as well as handle updates to it and its visual contents.

!["class structure"](images/apm_counter_window_class.png)

## Paint the window

Starting in reverse order, a proc function for how to paint our window:

```cpp

int currentAPM()
{
    return 100;
}

static LRESULT CALLBACK wndProc(HWND hwnd, UINT message, WPARAM wParam, LPARAM lParam)
{
  switch (message)
  {
  case WM_PAINT:
  {
      PAINTSTRUCT paintStruct;
      HDC hdc = BeginPaint(hwnd, &paintStruct);

      RECT rect;
      GetClientRect(hwnd, &rect);

      std::string text = " : APM ";
      text = std::to_string(currentAPM()) + text;

      std::wstring widestr = std::wstring(text.begin(), text.end());
      const wchar_t* widecstr = widestr.c_str();

      DrawText(
          hdc,
          widecstr,
          -1,
          &rect,
          DT_RIGHT|DT_NOCLIP|DT_SINGLELINE|DT_VCENTER
      );

      EndPaint(hwnd, &paintStruct);
      break;

  }
  case WM_TIMER:
      RECT rect;
      GetClientRect(hwnd, &rect);
      InvalidateRect(hwnd, &rect, TRUE);
      break;
  case WM_CREATE:
      break;
  case WM_DESTROY:
      PostQuitMessage(0);
      break;
  default:
      return DefWindowProc(hwnd, message, wParam, lParam);
  }
  return 0;
}
```

There are 4 arguments we receive in our function:

- 1) hwnd, a handle to the current window. We use this to reference the current window again.
- 2) message, the type of message passed to our function. These will be built-in windows system types in our case, like Paint, Destroy, Create, Timer. Although we could define custom ones
- (3 & 4) wParam and lParam are extra information passed in. We ignore these for our case, but they could be used for example to determine which keypress triggered the event

The main logic for this is handling the `WM_PAINT` event, where we put text in the window. The other message to call out is `WM_TIMER`, since we want our APM number to update frequently we will be setting a timer up update the window. Updating happens by “invalidating” the current window, which will tell windows to repaint the area.

## Register a window class

Every window must be associated with a [window class](https://docs.microsoft.com/en-us/windows/win32/learnwin32/creating-a-window). Failing to register this class will prevent the window from being drawn.

```cpp
HINSTANCE instance = GetModuleHandle(0);
HCURSOR cursor = LoadCursor(0,IDC_ARROW);

WNDCLASSEX wndclass = {
    sizeof(WNDCLASSEX),
    0, // style
    wndProc, // window proc
    0, // extra bytes following window class
    0, // extra bytes following window instance
    instance, // hInstance
    LoadIcon(0,IDI_APPLICATION), // hIcon
    cursor, // hCursor
    HBRUSH(COLOR_WINDOW + 1), // hbrBackground
    0, // MenuName
    TEXT("actions-per-minute-class"), // ClassName
    LoadIcon(0,IDI_APPLICATION) // small icon
};

bool isClassRegistered = RegisterClassEx(&wndclass);
if (!isClassRegistered) {
    std::cout << "class not registered" << std::endl;
    exit(1);
}
```

There are a bunch of arguments to this function, for our use case, we can ignore most of them. A few ones to call out:

#### hInstance

A reference to the currently running program

#### wndProc

Our window proc function from earlier

#### hCursor

a reference to the mouse cursor, since we are not interacting with the mouse we could ignore this variable.

## Create the window

With the to earlier sections, we can create our window.

```cpp
int height = 25;
int width = 70;
int extraStyles = WS_EX_COMPOSITED | WS_EX_LAYERED | WS_EX_NOACTIVATE | WS_EX_TOPMOST | WS_EX_TRANSPARENT;
int styles = WS_VISIBLE | WS_POPUP;
HWND hwnd = CreateWindowEx(
    extraStyles,
    TEXT("actions-per-minute-class"),
    TEXT("actions-per-minute"),
    styles,
    GetSystemMetrics(SM_CXSCREEN)-width, // x
    height*3, // y
    width, // width
    height, // height,
    0, // parent
    0, // menu
    instance,
    NULL
);
```

There are a few interesting components to this.

- Height and width will be the size of our window
- X and Y positions, we want to place our window in the upper right corner of the screen. Roughly below an in-game top menu bar would appear is usually an open space we can use.
- Styles and extraStyles, we are defining this as a non-interactive popup window that stays on top of all other windows and has no border or menu bar. The settings are individual bits, so we need to xor them together.

## Handle messages

Each window has a “message queue”. Before these messages are received by our proc function, they need to be pulled off the queue then passed to `TranslateMessage` and `DispatchMessage`. I personally found this a little confusing because pulling messages off the queue appears totally independent from our proc function, but no messages are processed until this happens.

```cpp
int timer = 500;
SetTimer(hwnd, timer, timer, 0);

MSG msg = { };
while (WM_QUIT != msg.message)
{
    while (PeekMessage(&msg, NULL, 0, 0, PM_REMOVE) > 0)
    {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    Sleep(1);
}
```

There are two alternative functions to processing messages, `PeekMessage` and `GetMessage`. `GetMessage` blocks until a message come off the queue, which is simpler but prevents the main thread from doing anything else until a message appears. The alternative `PeekMessage` will return `0` if there are no messages on the queue, giving us an opportunity to do something else - like handle an exit signal. Since PeekMessage will spin in a loop and burn extra CPU cycles we can stick in a small `sleep`, this will give the CPU a break and save more resources for other programs.

We also set up our timer. This will send a `WM_TIMER` message to our proc function followed by a `WM_PAINT` message. This will cause our proc function to be called again and repaint the window every 500ms.

Take a look at the [GitHub repo](https://github.com/KlotzAndrew/actions-per-minute-tracker) if you want to see the full code in action

[part_1]: /blog/building-an-apm-counter-part-1
[part_2]: /blog/building-an-apm-counter-part-2
[part_3]: /blog/building-an-apm-counter-part-3
