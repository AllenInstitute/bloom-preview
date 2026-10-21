/* bloom model figure: one timeline, stepped by the viewer.
 *
 * Everything that moves is described here, in seconds on a single timeline.
 * index.html holds only geometry; elements opt in with data attributes:
 *   data-op="track"     opacity      data-sy="track"  scaleY (grows from bottom)
 *   data-sx="track"     scaleX       data-tx="track"  translateX (px)
 *   data-draw="n"       connector n draws on        data-glow="box" highlight window
 * Tokens and glowing dots are generated from TOKENS / FLOW below.
 *
 * There is one figure for every screen size. On phones (<= 720px) the SVG viewBox
 * becomes a camera (CAM) that frames one stage at a time.
 */
(() => {
  'use strict';

  // ---- Steps: where "next" stops, and what each step says -----------------
  // each entry: [text before, italic word, text after]; \n starts a new line
  const STOPS = [0, 1.9, 5.1, 16.6];
  const TEXT = [
    ['Step through how bloom turns one cell’s measurements into a representation.', '', ''],
    ['A single cell is profiled: genes (RNA) and chromatin peaks (ATAC) are measured along the genome, each with its own signal.', '', ''],
    ['Each measured gene or peak becomes a ', 'token', ' carrying its sequence, genomic position and value.\nTokens are sampled from the universe of all measured genes and peaks to form two overlapping views of the same cell.'],
    ['Each view passes through the encoder in turn: attention heads over sequence, position and value, then a Perceiver that condenses the tokens into one cell representation. From each representation the reconstruction head predicts gene and peak values, and VISReg pulls the two views’ representations together.', '', '']
  ];

  // ---- The glowing dot: [start, end] of each hop, per view -----------------
  //      hop 0: views → attention, hop 1: attention → Perceiver, hop 2: Perceiver → representation
  //      view II starts only after both task heads have finished with view I
  const HOPS = { A: [[5.44, 5.76], [6.64, 6.96], [7.81, 8.26]],
                 B: [[9.70, 10.18], [11.03, 11.27], [12.04, 12.42]] };
  const SPLIT = { A: [8.32, 8.58], B: [12.63, 12.87] };          // representation → both task heads
  const HEADS = { A: [SPLIT.A[1], 9.48], B: [SPLIT.B[1], 15.4] }; // both task heads glow together, per view

  const FLOW = {
    hops: [[[684, 200], [712, 200]], [[862, 200], [898, 200]], [[1060, 200], [1107, 200]]],
    up:   [[1123, 200], [1163, 200], [1163, 149], [1185, 149]],
    down: [[1123, 200], [1163, 200], [1163, 251], [1185, 251]]
  };

  // ---- Tokens: resting position in the views and the track feature they come from
  const TOKENS = [
    ['g', 410, 177, 152], ['p', 440, 213, 221], ['g', 492, 161, 255], ['p', 516, 191, 281], ['g', 498, 219, 152],
    ['p', 548, 209, 326], ['g', 606, 173, 255], ['p', 638, 165, 281], ['g', 646, 213, 152], ['p', 588, 229, 326]
  ];
  const TRACK_Y = 200;

  // ---- Phone camera: [time, viewBox x] / [time, viewBox width] ----------------
  // Two wide framings and one slow pan, so the view moves at most once per step:
  // steps 1-2 frame measurements + sampling, step 3 frames model training,
  // and the last second zooms out to the whole figure.
  const FULL = [0, 22, 1385, 284];
  const CAM = {
    x: [[5.1, 10], [6.1, 690], [15.5, 690], [16.5, 0]],
    w: [[5.1, 686], [6.1, 695], [15.5, 695], [16.5, 1385]],
    aspect: '686 / 284'
  };

  // ---- Tracks: [[time, value], ...], eased between keys, held at the ends ----
  const on = (t0, t1, f = 0.06) => [[t0 - f, 0], [t0, 1], [t1, 1], [t1 + f, 0]];
  const appear = (t, f = 0.06) => [[t - f, 0], [t, 1]];
  const TRACKS = {
    signal: [[0, 0], [1.6, 1]],
    fly:    [[1.92, 0], [4.48, 1]],
    flyOp:  [[1.92, 0], [2.4, 1]],
    views:  [[2.88, 0], [4.48, 1]],
    embA:   on(HOPS.A[2][1], HOPS.B[2][1] - 0.06),
    embB:   appear(HOPS.B[2][1]),
    recA:   on(SPLIT.A[1], SPLIT.B[1] - 0.06),
    recB:   appear(SPLIT.B[1]),
    visA:   appear(SPLIT.A[1]),
    visB:   appear(SPLIT.B[1]),
    recon:  [[8.64, 0], [9.36, 1], [12.18, 1], [12.42, 0], [12.93, 0], [13.65, 1]],
    pair:   appear(13.16, 0.16),
    align:  [[13.38, 0], [15.3, 1]]
  };
  TRACKS.alignA = TRACKS.align.map(([t, v]) => [t, 16 * v]);
  TRACKS.alignB = TRACKS.align.map(([t, v]) => [t, -16 * v]);
  TRACKS.half   = TRACKS.align.map(([t, v]) => [t, 1 - 0.53 * v]);

  // connectors draw on just before the flow first uses them
  const DRAW = { 1: 0.16, 2: 2.08, 3: 5.2, 4: 6.48, 5: 6.96, 6: 7.6, 7: 8.16 };

  // boxes highlight while the dot is inside them; both task heads share one window per view
  const GLOW = {
    att: [[HOPS.A[0][1], HOPS.A[1][0]], [HOPS.B[0][1], HOPS.B[1][0]]],
    per: [[HOPS.A[1][1], HOPS.A[2][0]], [HOPS.B[1][1], HOPS.B[2][0]]],
    rec: [HEADS.A, HEADS.B],
    vis: [HEADS.A, HEADS.B]
  };

  // ---- helpers -------------------------------------------------------------
  const SVGNS = 'http://www.w3.org/2000/svg';
  const smooth = (x) => x * x * (3 - 2 * x);
  function sample(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i];
      if (t <= t1) {
        const [t0, v0] = keys[i - 1];
        return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0 || 1));
      }
    }
    return keys[keys.length - 1][1];
  }
  const glowAt = (wins, t) => Math.max(0, ...wins.map(([a, b]) => sample(on(a, b, 0.08), t)));
  function along(pts, u) {                      // point at fraction u of a polyline
    const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    let d = u * segs.reduce((a, b) => a + b, 0);
    for (let i = 0; i < segs.length; i++) {
      if (d <= segs[i] || i === segs.length - 1) {
        const k = segs[i] ? Math.min(1, d / segs[i]) : 0;
        return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
      }
      d -= segs[i];
    }
  }
  function el(name, attrs, parent) {
    const n = document.createElementNS(SVGNS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // ---- build generated pieces ----------------------------------------------
  const svg = document.querySelector('svg.fig');
  const filter = svg.querySelector('filter').id;

  const tokLayer = svg.querySelector('[data-tokens]');
  const tokens = TOKENS.map(([type, x, y, fromX]) => {
    const g = el('g', { class: 'token' }, tokLayer);
    el('line', { class: 'tick', x1: x + 1, y1: y, x2: x + 10, y2: y, stroke: type === 'g' ? 'var(--gene)' : 'var(--peak)' }, g);
    ['seq', 'pos', 'val'].forEach((c, i) => el('rect', { class: c, x, y: y + 5 + 11 * i, width: 11, height: 11 }, g));
    el('rect', { class: 'outline', x, y: y + 5, width: 11, height: 33, rx: 1 }, g);
    return { node: g, dx: fromX - x, dy: TRACK_Y - y };
  });

  const dotLayer = svg.querySelector('[data-dots]');
  const dots = [];
  const makeDot = (legs) => {
    const g = el('g', { opacity: 0 }, dotLayer);
    el('circle', { class: 'dot-halo', r: 9, filter: `url(#${filter})` }, g);
    el('circle', { class: 'dot-core', r: 4.5 }, g);
    dots.push({ node: g, legs });
  };
  ['A', 'B'].forEach((v) => {
    makeDot(HOPS[v].map(([a, b], i) => [a, b, FLOW.hops[i]]));
    makeDot([[...SPLIT[v], FLOW.up]]);
    makeDot([[...SPLIT[v], FLOW.down]]);
  });

  svg.querySelectorAll('[data-draw]').forEach((n) => n.setAttribute('pathLength', 1));

  const bound = (attr) => [...svg.querySelectorAll(`[data-${attr}]`)];
  const ops = bound('op'), sys = bound('sy'), sxs = bound('sx'), txs = bound('tx'), draws = bound('draw'), glows = bound('glow');
  const phoneMq = matchMedia('(max-width: 720px)');

  // ---- render the figure at time t ------------------------------------------
  function render(t) {
    ops.forEach((n) => { n.style.opacity = sample(TRACKS[n.dataset.op], t); });
    sys.forEach((n) => { n.style.transform = `scaleY(${sample(TRACKS[n.dataset.sy], t)})`; });
    sxs.forEach((n) => { n.style.transform = `scaleX(${sample(TRACKS[n.dataset.sx], t)})`; });
    txs.forEach((n) => { n.style.transform = `translateX(${sample(TRACKS[n.dataset.tx], t)}px)`; });
    draws.forEach((n) => {
      const s = DRAW[n.dataset.draw];
      n.style.strokeDashoffset = 1 - sample([[s, 0], [s + 0.32, 1]], t);
    });
    glows.forEach((n) => { n.style.opacity = glowAt(GLOW[n.dataset.glow], t); });

    const p = sample(TRACKS.fly, t), o = sample(TRACKS.flyOp, t);
    tokens.forEach(({ node, dx, dy }) => {
      node.style.transform = `translate(${dx * (1 - p)}px, ${dy * (1 - p)}px)`;
      node.style.opacity = o;
    });

    dots.forEach(({ node, legs }) => {
      const leg = legs.find(([a, b]) => t >= a && t <= b);
      if (!leg) { node.setAttribute('opacity', 0); return; }
      const [a, b, pts] = leg;
      const [x, y] = along(pts, (t - a) / (b - a));
      node.setAttribute('opacity', 1);
      node.setAttribute('transform', `translate(${x} ${y})`);
    });

    if (phoneMq.matches) {
      svg.setAttribute('viewBox', `${sample(CAM.x, t)} ${FULL[1]} ${sample(CAM.w, t)} ${FULL[3]}`);
      svg.style.aspectRatio = CAM.aspect;
    } else {
      svg.setAttribute('viewBox', FULL.join(' '));
      svg.style.aspectRatio = `${FULL[2]} / ${FULL[3]}`;
    }
  }

  // ---- stepper --------------------------------------------------------------
  const root = document.querySelector('.model');
  const btnNext = root.querySelector('[data-act="next"]');
  const btnBack = root.querySelector('[data-act="back"]');
  const scrub = root.querySelector('.scrub');
  const count = root.querySelector('.step-count');
  const text = root.querySelector('.step-text');
  const END = STOPS[STOPS.length - 1];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let now = 0, raf = 0;

  function setText(step) {
    const [a, em, b] = TEXT[step];
    const i = document.createElement('em');
    i.textContent = em;
    text.replaceChildren(a, i, b);
  }
  function show(t) {
    now = t;
    render(t);
    const step = t < 0.01 ? 0 : Math.max(1, STOPS.findIndex((s) => s >= t - 0.01));
    const atEnd = t >= END - 0.01;
    count.textContent = `${step}/${STOPS.length - 1}`;
    setText(step);
    scrub.value = Math.round((t / END) * 1000);
    btnNext.classList.toggle('at-end', atEnd);
    btnNext.setAttribute('aria-label', t < 0.01 ? 'Start' : atEnd ? 'Replay' : 'Next step');
  }
  function playTo(from, to) {
    cancelAnimationFrame(raf);
    if (reduceMotion) { show(to); return; }
    const start = performance.now();
    const tick = (ms) => {
      const t = Math.min(to, from + (ms - start) / 1000);
      show(t);
      if (t < to) raf = requestAnimationFrame(tick);
    };
    show(from);
    raf = requestAnimationFrame(tick);
  }

  btnNext.addEventListener('click', () => {
    const next = STOPS.find((s) => s > now + 0.01);
    if (next === undefined) playTo(0, STOPS[1]); else playTo(now, next);
  });
  btnBack.addEventListener('click', () => {
    cancelAnimationFrame(raf);
    const prev = STOPS.filter((s) => s < now - 0.01);
    show(prev.length ? prev[prev.length - 1] : 0);
  });
  scrub.addEventListener('input', () => { cancelAnimationFrame(raf); show((scrub.value / 1000) * END); });
  phoneMq.addEventListener('change', () => render(now));

  // expose for screenshots / debugging: bloomFigure.show(seconds)
  window.bloomFigure = { show, STOPS };
  show(0);
})();
