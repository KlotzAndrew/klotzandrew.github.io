---
layout: post
title: "Screenshot Blur as Lockscreen on OSX"
date: 2019-10-22 17:00:00 -0500
categories: hammerspoon, imagemagick, lua, bash
description: Take a screenshot, blur it, and use it as the screensaver with a little lock icon on top.
image: screenshot-blur-lockscreen.png
---

![Blurred screenshot](../../assets/screenshot-blur-lockscreen.png)

Take a screenshot, blur it, and use it as the screensaver with a little lock icon on top.

There are some great examples of this on
<a href="https://www.reddit.com/r/unixporn/comments/4yj29e/i3lock_simple_blur_script/">reddit</a>
and
<a href="https://github.com/meskarune/i3lock-fancy">github</a>.
I have yet to find one that works with osx, so this is the script I put together. If you come across a tool that does this or spot and improvement let me know! The full code is
<a href="https://github.com/KlotzAndrew/.hammerspoon/commit/0dbc238d55845b5034cef18849684eb78ba9121d">here</a> for you to take a look.

The tricky bit is hooking into osx screensaver hooks, for this we are going to use <a href="https://github.com/Hammerspoon/hammerspoon">Hammerspoon</a>. Hammerspoon is a project for osx that lets us do scripting around osx hooks.
The project is a fork of ‘Mjolnir’, and any Norse mythology joke makes me chuckle.
This is going to allow us to run lua scripts around a screensaver hook, with a little bit of lua:

```lua
hs.hotkey.bind({"cmd", "ctrl"}, "l", function()
   os.execute("./lock.sh >& lock.log")
   hs.caffeinate.startScreensaver()
end)
```

Now we are invoking our `lock.sh` script (logging the output) right before triggering the screensaver, giving us the hook we needed. Since most of the work for this project is calling out to other tools, my preference is to minimize lua work and move all the lifting to shell as soon as possible.

There are a few features I wanted in the image:

1. The background is blurred
1. A lock image
1. Some text about unlocking
1. Image and text are not the same as the blurred background

The first thing we do is capture a screenshot:

```bash
tmp_image=/tmp/lock.png
screencapture -m -x "$tmp_image"
```

Next we see if the screenshot is darker or lighter, and pick an opposite color lock icon and text color:

```bash
color_value="60"
color=$(/usr/local/bin/convert "$tmp_image" \
  -gravity center \
  -crop 100x100+0+0 +repage \
  -colorspace hsb \
  -resize 1x1 \
  txt:- | awk -F '[%$]' 'NR==2{gsub(",",""); printf "%.0f\n", $(NF-1)}');

if [[ $color -gt $color_value ]]; then # white background image and black text
 bw="black"
 icon="./circlelockdark.png"
else #black
 bw="white"
 icon="./circlelock.png"
fi
```

Some settings and text, this is likely where you want to do some tuning.
For example the default hue, or the font is the default system sans-serif font.
We get the blur effect from shrinking the image to 10% then expanding it by 1000%, this ends up being <a href="https://stackoverflow.com/questions/35649413/imagemagick-looking-for-a-fast-way-to-blur-an-image#targetText=Essentually%20the%20reason%20large%20blurs,fewer%20pixels%20in%20the%20process.">faster than using blur directly</a>:

```bash
text="Type password to unlock"
hue=(-level "0%,100%,0.6")
effect=(-filter Gaussian -resize 10% -define "filter:sigma=1.5" -resize 1000%)
font=$(convert -list font | awk "{ a[NR] = \$2 } /family: $(fc-match sans -f "%{family}\n")/ { print a[NR-1]; exit }")
```

Finally we are going to overlay the lock icon and text on top of our blurred background and replace the image osx expects to use as the screensaver image.

```bash
/usr/local/bin/convert "$tmp_image" "${hue[@]}" "${effect[@]}" \
  -font "$font" \
  -fill "$bw" \
  -gravity center \
  -pointsize 36 \
  -annotate +0+250 "$text" "$icon" \
  -gravity center \
  -composite ~/screensaver/lock.png
```

The osx setting this depends on that I haven’t scritped yet is setting the base screensaver image. If you have not guessed yet, my screensaver is set to use the image `~/screensaver/lock.png` and this depends on that being set consistently.

Overall, I really like the effect and it looks awesome. The improvement I can think of making now is around speed, because we are taking a screenshot there ends up being a little delay on the screensaver starting compared to not waiting for a screenshot. I suspect reducing the image quality of the screenshot would help with that, but I am not sure where the settings are and already put too much time into this project.

Hope you enjoy the screensaver as much as I do!
