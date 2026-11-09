# AGENTS.md

Notes for coding agents working on this repo. Read [README.md](README.md) first for what the demo is.

## Setup

- There is no build step, no package.json and nothing to install. Plain HTML, CSS and ES modules.
- Serve the root with any static server (`npx serve .` or `python3 -m http.server`). ES modules don't load from `file://`.
- GSAP 3.15 with ScrollTrigger and Lenis 1.3 are vendored in `js/` and loaded as classic scripts before the module, so `gsap`, `ScrollTrigger` and `Lenis` are globals. Don't import them. `css/lenis.css` is Lenis's own stylesheet.
- three.js 0.186.1 (the WebGPU build with TSL, which falls back to WebGL 2) is vendored in `js/three/` for pages 10–12, which load it through an import map in their `<head>`: `three/webgpu`, `three/tsl`, and a third entry that points `three.webgpu.min.js`'s own `./three.core.js` import at `three.core.min.js`. They're jsDelivr's minified builds; replace all three together when upgrading.
- The fonts come from Google Fonts: Host Grotesk for the text and Inter Tight for the closing quote.
- The analytics and sponsor scripts are commented out in every page. They're added on the live server only.
- There are no automated tests. Check a change in a browser: scroll the whole page down and back up, resize the window, try it at phone width and with reduced motion, and look at the console. Check 10–12 on a real GPU: headless Chromium's default software renderer makes them fall back to the plain grid, on purpose.

## Map

| Path | What it is |
| --- | --- |
| `index.html`…`index12.html` | One page per variation (01 is `index.html`). Same markup; they differ in the `demo-<N>` body class, the script, the head tags, and pages 02 and 07–12 have six more grid items in the first 16 rows (49 instead of 43). |
| `js/demo<N>/index.js` | The page's animation: preloading, smooth scrolling, and the scrubbed tweens for each grid item. |
| `js/stage.js` | `createStage`, the WebGL canvas of pages 10–12: loads the images as textures, draws each one where its DOM element is, moved onto the surface the page describes, and falls back to the DOM grid without a GPU. |
| `js/utils.js` | `preloadImages` (decodes the background images) and `fadeOnScroll` (the reduced motion fallback). |
| `js/gsap.min.js`, `js/ScrollTrigger.min.js`, `js/lenis.min.js` | The vendored libraries. |
| `js/three/` | three.js 0.186.1 for pages 10–12: `three.webgpu.min.js`, `three.core.min.js`, `three.tsl.min.js`. |
| `css/base.css` | All styles: the colour, font and spacing tokens, each page's glow (`.demo-<N>`), the loader, the frame, the grid, the closing quote (`.footer`) and the WebGL canvas of pages 10–12 (`.grid-canvas`, `.is-webgl`). |
| `css/lenis.css` | Lenis's recommended styles. |
| `img/` | The 20 images (300×300 JPEGs). |

## How a page works

- `.grid` is an 8-column CSS grid. Each `.grid__item` is placed with inline `--r` (row) and `--c` (column) and holds a `.grid__item-img` with a background image, 4:5 (square on 02 and 04, whose images round into circles). From 53em the grid has 30px gaps and side margins.
- `.footer` is the closing quote after the grid, a screen high, with no background or border of its own, so it follows the images on the same ground.
- The script waits for the images (`preloadImages`) and then the fonts (`document.fonts.ready`) before removing the `loading` class from the body, so nothing shows before it's ready.
- Then `gsap.matchMedia()` sets up one of two things:
  - With reduced motion: native scrolling, and `fadeOnScroll` fades each item out as it leaves the top. No effect.
  - Otherwise: Lenis (`lerp: 0.1`) runs on GSAP's ticker (`lenis.raf(time * 1000)`, `lagSmoothing(0)`) and calls `ScrollTrigger.update` on every scroll, so the scroll and the scrubbed animations update in the same frame. Then each grid item gets its tweens, each with a ScrollTrigger whose `trigger` is the item and `scrub` is set. The setup returns a cleanup that removes the ticker callback and destroys Lenis.
- A ScrollTrigger goes on a standalone `gsap.to` or on a timeline itself, never on a tween nested inside a timeline. Set start values with `gsap.set` (or `startAt`).
- Effects animate `transform` and `opacity` only (02 and 04 also round the corners with `borderRadius`). Pages 10–12 draw the images with WebGL instead.
- Random values (`gsap.utils.random`) are picked once per item on each load, so the same page moves a little differently every time.
- Items pushed past the right edge are cut off by `overflow-x: clip` on `.content`, so the page never gets wider than the screen.
- Page 07 sets `perspective` on `.grid` and moves its `perspectiveOrigin` with the scroll to the middle of the screen, measured from the grid's top (on phones the frame sits above the grid, in the flow).
- Page 09 does the same, and also makes the grid and its items one 3D space (`transformStyle: 'preserve-3d'`), so near images are drawn over far ones. It moves the image, never the item, so ScrollTrigger always measures a flat trigger. Each image's `z` and `opacity` come from its distance from the middle of the screen (`render(d)`, set through `quickSetter`), not from a tween: images come out of the vanishing point in the middle of the screen and are in their places, at full size, when they reach the middle. From there they scroll with the page, with nothing animated.
- Pages 10–12 draw every image on a WebGL canvas (three.js, TSL) behind the page's text, where its DOM element is, through `createStage` in `js/stage.js`; the DOM images stay in the page, hidden (`.is-webgl`), to hold their places and give the layout. Each page passes a `surface`: given a point of an image as it lies flat on the page (`flatX`, `flatY`, in pixels from the middle of the screen, y up) and the image's middle and size, it returns where the point goes, how bright the image looks there and its opacity; `layout` sets the page's own uniforms before each frame. From the middle of the screen up, every surface is the flat grid. Images further down the page are drawn first (they're further away on all three). Without a GPU (the software renderer) or if anything fails, the plain grid stays and the page scrolls; with reduced motion, the DOM grid with `fadeOnScroll`.
  - 10 Tunnel: below the middle each image lies on the lower half of a round tunnel whose far end is the middle of the screen. Its distance from the grid's middle becomes its angle round the tunnel (keeping its length along the curve, so `radius` is the grid's width over `SPAN`), and its distance below the middle its depth, with its top toward the far end so it faces into the tunnel. Between the middle and `OPEN` below it, the image opens out from the wall into the flat grid as one piece, going by its middle. Darker further in (`DARKEST`), it comes out of the dark over the last `FADE` of `FAR`. On narrow screens the tunnel's near end comes toward the viewer (`nearZ`) until its floor reaches `MOUTH` half viewport heights below the middle.
  - 11 Floor: below the middle the sheet curves toward the viewer (radius `BEND` of the viewport's height) and runs on as a floor below eye level, so images further down the page lie nearer and lower, face up with their tops toward the middle. Darker lying down (`DARKEST`); they fade out before they get too close to the camera (`NEAREST`).
  - 12 Horizon: below the middle the sheet curves away from the viewer over a globe: downward with a radius of `CURVE` viewport heights, so a horizon shows near the bottom of the screen and the images beyond it (their triangles facing away) aren't drawn, and sideways with a radius of `CURVE_SIDEWAYS` grid widths, which each image takes as one piece as its middle goes `SIDEWAYS_IN` below the middle, so it never twists. Lit from the front: darker the more it faces away (`DARKEST`).

## Variations

| # | Page | What it does | Notes |
| --- | --- | --- | --- |
| 01 | `index.html` | Images shrink to nothing towards a random bottom corner as they leave through the top. | The main page; its title names the demo. A `contrast(70%)` filter on the images. |
| 02 | `index2.html` | Shrink to Circle: images shrink to half size and round into circles as they rise from 40% of the screen to the top. | Pivot below the image (`transformOrigin: 50% 200%`). |
| 03 | `index3.html` | Sideways Drift: items drift sideways by a random amount as they cross the screen, then shrink into the corner they drifted towards. | |
| 04 | `index4.html` | Parallax Circles: items move at random vertical speeds and round into circles. | |
| 05 | `index5.html` | Stretch and Fade: images stretch tall and thin from their bottom edge, and items fade out at the top. | |
| 06 | `index6.html` | Squeeze: images squeeze into a thin, slightly skewed sliver. | `back.in(2)` ease and `scrub: 0.1`. Shown in the article. |
| 07 | `index7.html` | 3D Roll: items rotate on X from 70° to −70° as they cross the screen, like a turning drum. | Perspective on the grid (see above). Shown in the article. |
| 08 | `index8.html` | Swing: images swing around a pivot three widths to their right, while items move at random vertical speeds. | |
| 09 | `index9.html` | Out of the Depth: images come out of the dark far behind the middle of the screen and are in their places when they reach the middle; from there they scroll with the page. | Added in the 2026 update. Each image has its own depth (`zFar`). |
| 10 | `index10.html` | Tunnel: below the middle of the screen the images line the lower half of a round tunnel whose far end is the middle of the screen, ride its walls toward the viewer, darker further in, and stand up and open out flat into the grid as they reach the middle. | Added in the 2026 update. WebGL (three.js, TSL), see above. |
| 11 | `index11.html` | Floor: below the middle of the screen the images lie on a floor that comes toward the viewer; as the page scrolls they travel away along it, curve up and stand into the grid, darker lying down. | Added in the 2026 update. WebGL (three.js, TSL), see above. |
| 12 | `index12.html` | Horizon: below the middle of the screen the grid curves away over a globe; the images come up over its horizon, lean back and darker, and roll up flat into the grid. | Added in the 2026 update. WebGL (three.js, TSL), see above. |

## Adding a variation

1. Copy a page to `index<N>.html` and change the `demo-<N>` body class, the script (`js/demo<N>/index.js`), the title, the description, the canonical and social URLs, and the JSON-LD.
2. Write `js/demo<N>/index.js` from an existing one. Keep the preloading, the `gsap.matchMedia()` setup and the Lenis lines; change only the tweens inside `gridItems.forEach`.
3. Give the page its glow as `.demo-<N> { --color-glow: … }` in `css/base.css` (the light at the top of the screen; `--glow-at` moves it, `--glow-strength` sets how bright it is).
4. Add the link to the `.frame__demos` nav on **every** page. The current page's entry is a `<span class="frame__demo frame__demo--current" aria-current="page">`, not a link. From 53em the numbers sit in one row: raise the count in `.frame__demos`' `auto repeat(12, …)` in `css/base.css`. On phones they wrap six to a row (`repeat(6, …)`), so that one stays.
5. If the variation uses a technique the frame's tags don't name yet, add that tag to its page and to `index.html`, linked as `https://tympanus.net/codrops/hub/tag/<slug>/`. Only tags that already exist on Codrops (10–12 brought `#webgl #three.js #webgpu #tsl`).
6. Add it to the Variations table here.

## Style

- Tabs for indentation. Some lines inside the tweens are indented with spaces, as the author left them; follow what's around the line you edit.
- Single quotes, except the ScrollTrigger `start`/`end` positions, which are double-quoted in most pages. Semicolons.
- Short `//` comments over each step ("// Preload images and fonts"); JSDoc on the helpers in `utils.js`.
- Flat CSS, one block per selector, no nesting. Colours, fonts and spacing are custom properties on `:root`; each page sets only its glow.
- Spacing is the 15-point scale (`--space-1` to `--space-4`: 15, 30, 60, 90px). Use those, not other values.
- One dark ground (`#0b0b0b`) for every page, white text, 55% white for links and labels, no accent colour: the photos bring the colour.
- No uppercase text: the words are set as they're written. Host Grotesk at 13px for the frame, Inter Tight 500 for the closing quote.
- No dependencies and no build tooling unless asked.

## Ask before changing

- The pages' `<title>`, meta description, keywords, social tags and JSON-LD.
- The frame's title, its Article, All demos and GitHub links, and the tags (other than a tag for a technique a new variation brings in).
- The credits and the closing quote.
- The author's eight original variations (01–08).
