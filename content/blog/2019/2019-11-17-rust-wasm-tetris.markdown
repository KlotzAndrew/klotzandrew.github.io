---
layout: post
title: "Rust, wasm, and tetris"
date: 2019-11-17 17:00:00 -0500
categories: rust, wasm, tetris
image: tetris_rust_wasm_2.png
---

WASM has been making a lot of progress recently so I was looking for a small project to run through and tetris with rust came to mind. Its small enough to understand easily and complicated enough that it is not quite a ‘hello world’ program. We are mostly going to be looking at the interaction between WASM and the browser, there is <a href="https://hacks.mozilla.org/2019/03/standardizing-wasi-a-webassembly-system-interface/">interesting stuff happening on top of WASM like WASI</a>. The code for tetris is not relevant to the main goal (maybe a later article).

Full code <a href="https://github.com/KlotzAndrew/tetris-rust-wasm">here</a>, pull requests welcome! And a live demo:

<iframe
  align="middle"
  style="width:100%"
  height=600
  frameborder="0" scrolling="no"
  src="https://s3.amazonaws.com/klotzandrew.com/games/rust-wasm-tetris/index.html" ></iframe>

Rust itself does a better introduction on WASM, take a read if you have not yet: https://rustwasm.github.io/docs/book/introduction.html

The building blocks we get from rust is wasm_bindgen:

```rust
#[wasm_bindgen]
pub fn build_board( … ) { … }
```

Will allow us to import and use a function in the browser world like this:
```html
<script type="module">
import init, { build_board } from '/pkg/tetris_rust_wasm.js';
let game;
  async function run() {
  await init();
  game = build_board( … );
}
run()
</script>
```

Now to get our function working there is a little bit of magic that uses wasm-pack:

```bash
wasm-pack build --target web
```

Will output all out ‘wasm’ code into a `./pkg/` folder, this also includes some `.js` and `.ts` helpers for import. Prior to wasm-pack I had some trouble importing and running `.wasm` with different recommendations around `instantiateStreaming(…)` vs `instantiate(…), and this tool gives us a few hundred lines of that already done for us. For getting this running in a blog post the two files we care about are:
tetris_rust_wasm_bg.wasm (actual wasm code)
tetris_rust_wasm.js (auto-generated helpers from above)

What our wasm will do is attach to a html canvas object by id:
```html
<canvas id="board"></canvas>
```

Then pass that into a constructor that returns our ‘tetris game’:
```rust
#[wasm_bindgen]
pub fn build_board(rows: usize, cols: usize, block_width: u32) -> Tetris {
 set_panic_hook();

let window = web_sys::window().expect("no global `window` exists");
let document = window.document().expect("should have a document on window");
let canvas = document
  .get_element_by_id("board")
  .unwrap()
  .dyn_into::<HtmlCanvasElement>()
  .unwrap();

  return Tetris::build(&canvas, rows, cols, block_width);
}
```

We can then add wasm_bindgen functions to our tetris struct:
```rust
#[wasm_bindgen]
impl Tetris {
 pub fn move_down(&mut self) { … }

 pub fn tick(&mut self) { … }

 pub fn rotate(&mut self) { … }

 pub fn move_left(&mut self) { … }

 pub fn move_right(&mut self) { … }
```

The design of our tetris game will have our wasm binding to an html object, and the javascript code controlling the game tempo and movements. We could move more control into the wasm code but for illustration this shows the interactions as is.

Running `wasm-pack build --target web` will rebuild our .wasm code with the new methods. For local development my browser did not like loading .wasm files directly off the file system, so I used `python -m SimpleHTTPServer` to develop against 0.0.0.0:8000.

The next thing to add is a game loop using `requestAnimationFrame`:
```javascript
let started = false;
const start = () => {
  if (started) return;
  started = true;

  const delay = 400;
  let last = Date.now();
  function mainLoop() {
    if ((Date.now() - last) > delay) {
      game.tick();
      last = Date.now();
    }
    if (!game.game_over) { requestAnimationFrame(mainLoop); }
  }
  requestAnimationFrame(mainLoop);
}
```

And for our user controls for w/a/s/d:

```javascript
function keyboardControls(event) {
  if (event.keyCode === 65) {
    game.move_left();
  } else if (event.keyCode === 87) {
    game.rotate();
  } else if (event.keyCode === 68) {
    game.move_right();
  } else if (event.keyCode === 83) {
    game.move_down();
  }
  last = Date.now();
}
document.addEventListener('keydown', keyboardControls);
```

And now we have a working tetris board running in our browser! This is the full code snippet used for this post:

```html
<script type="module">
 import init, { build_board } from '../../assets/tetris_rust_wasm.js';

 let game;
 async function run() {
  await init();
  game = build_board(20, 10, 24);
 }
 let started = false;
 const start = () => {
  if (started) return;
  started = true;

   const delay = 400;
   let last = Date.now();
   function mainLoop() {
    if ((Date.now() - last) > delay) {
      game.tick();
      last = Date.now();
    }
    if (!game.game_over) { requestAnimationFrame(mainLoop); }
   }
   requestAnimationFrame(mainLoop);

   function keyboardControls(event) {
    if (event.keyCode === 65) {
      game.move_left();
    } else if (event.keyCode === 87) {
      game.rotate();
    } else if (event.keyCode === 68) {
      game.move_right();
    } else if (event.keyCode === 83) {
      game.move_down();
    }
    last = Date.now();
   }
  document.addEventListener('keydown', keyboardControls);
  };
  run().then(
    document.getElementById("board"),addEventListener("click", start)
  )
</script>
```

For iteration or improvement we can develop and test the rust code fully independent of the browser, so long as those public functions remain intact.

Full repo over here: https://github.com/KlotzAndrew/tetris-rust-wasm

getting deploy assets
```bash
# in tetris-rust-wasm folder
wasm-pack build --target web

# in blog folder
cp ../tetris-rust-wasm/pkg/tetris_rust_wasm.js ./assets/
cp ../tetris-rust-wasm/pkg/tetris_rust_wasm_bg.wasm ./assets/
```
