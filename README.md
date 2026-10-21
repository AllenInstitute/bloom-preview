# bloom-preview

Landing page for **bloom**, a multimodal transformer-based model for single-cell RNA and ATAC data
(Allen Institute). Static HTML/CSS/JS with no build step, served with GitHub Pages.

## What the page does

The page has two sections:

- **Hero:** the headline, the preprint and code links, and the bloom logo. The logo is revealed with a soft circular wipe that starts at the cell body.
- **"From a cell to its representation":** an interactive version of panels a–b of the paper figure. Visitors step through it with the ‹ › buttons, or drag the slider. Each step has a short explanation. The three steps are:
  1. Experimental measurements
  2. Feature sampling
  3. Model training: both views pass through the encoder in turn, then the task heads (reconstruction and VISReg)

## Layout

```
index.html              page content + figure geometry (one SVG for every screen)
assets/css/site.css     all styles, including the figure's
assets/js/figure.js     the figure timeline + stepper (single source of truth for motion)
assets/img/bloom-logo.svg   logo (traced neuron + geometric wordmark)
assets/img/bloom-mark.svg   neuron only, used as the favicon
.nojekyll               serve files as-is on GitHub Pages
```

## Editing

- **Copy and links:** edit them in `index.html`. The preprint button is marked `TODO` and currently points to `#`.
- **Step text and step stops:** these are `TEXT` and `STOPS` at the top of `assets/js/figure.js`.
- **Timing:** everything that moves is defined in seconds in `figure.js`:
  - `HOPS` and `SPLIT` set when the glowing dot travels; `HEADS` sets when both task heads glow together for each view.
  - `TRACKS` covers fades, fills and the VISReg alignment.
  - `DRAW` sets when each connector draws on.
  - `GLOW` derives the box highlights from the dot timing.

  Elements opt in through data attributes in the SVG (`data-op`, `data-sy`, `data-sx`, `data-tx`, `data-draw`, `data-glow`).
- **Geometry:** the figure is drawn once in `index.html`. If you move a shape that the dot travels past, update `FLOW` in `figure.js`; token positions are in `TOKENS`.
- **Phones (≤ 720px):** the same figure runs edge to edge, and the SVG viewBox acts as a camera (`CAM` in `figure.js`). Steps 1–2 frame the left half, step 3 slides once to the model-training half, and the end zooms out to the whole figure. Scrubbing moves the camera with the timeline.
- **Colours:** set as CSS variables at the top of `site.css`. Black and greys, with Allen orange (`#FF6E00`) as the only accent. Gene and peak colours follow the paper figure.

## Local preview

```
python3 -m http.server 8000   # then open http://localhost:8000
```

Calling `bloomFigure.show(seconds)` in the browser console jumps the figure to any moment on the timeline.

## Deploy

In the repository settings, go to Pages → Build and deployment → Deploy from a branch, and pick `main` with `/ (root)`.

## Notes

- Fonts are Figtree and JetBrains Mono from Google Fonts. Allen Institute's own typeface isn't publicly available.
- The logo reveal uses CSS `@property`. Browsers without it show the logo straight away.
- With `prefers-reduced-motion`, the logo appears without the reveal and the stepper jumps between steps instead of playing them.
