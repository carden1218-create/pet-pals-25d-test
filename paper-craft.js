(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const OL = "#2a1f36";

  function hash(a, b) {
    let n = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b ^ 0xc2b2ae35, 0x27d4eb2f);
    n ^= n >>> 15;
    n = Math.imul(n, 0x2c1b3c6d);
    n ^= n >>> 12;
    return (n >>> 0) / 4294967296;
  }
  function jit(i, s) { return hash(i * 7 + 3, s * 13 + 1) - 0.5; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Smooth Catmull-Rom closed loop sampling -> cute organic silhouettes (NOT jagged!)
  function sampleSmoothLoop(ctrlPts, stepsPerSeg = 6) {
    const n = ctrlPts.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const p0 = ctrlPts[(i - 1 + n) % n];
      const p1 = ctrlPts[i];
      const p2 = ctrlPts[(i + 1) % n];
      const p3 = ctrlPts[(i + 2) % n];
      for (let s = 0; s < stepsPerSeg; s++) {
        const t = s / stepsPerSeg;
        const t2 = t * t, t3 = t2 * t;
        const x = 0.5 * (
          (2 * p1[0]) +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
        );
        const y = 0.5 * (
          (2 * p1[1]) +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
        );
        out.push([x, y]);
      }
    }
    return out;
  }

  function makeEllipsePts(cx, cy, rx, ry, n = 28, seed = 1, wobble = 0.03) {
    const ctrl = [];
    const k = 10;
    for (let i = 0; i < k; i++) {
      const a = (i / k) * TAU;
      const r = 1 + jit(i, seed) * wobble * 2;
      ctrl.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
    }
    return sampleSmoothLoop(ctrl, Math.max(3, Math.round(n / k)));
  }

  function tracePoly(c, pts) {
    c.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) c.moveTo(pts[i][0], pts[i][1]);
      else c.lineTo(pts[i][0], pts[i][1]);
    }
    c.closePath();
  }

  // Seamless 256x256 Wax Crayon Paper-Tooth Mask (grainy speckles, ZERO parallel stripes!)
  let toothPatCanvas = null;
  let darkGrainCanvas = null;
  function ensureToothTextures() {
    if (toothPatCanvas) return;
    const SZ = 192;

    // 1. Paper tooth knockout pattern: tiny organic wax-skip specks
    toothPatCanvas = document.createElement("canvas");
    toothPatCanvas.width = SZ; toothPatCanvas.height = SZ;
    const tc = toothPatCanvas.getContext("2d");
    const img = tc.createImageData(SZ, SZ);
    const d = img.data;

    // 2. Dark wax pigment clump grain pattern
    darkGrainCanvas = document.createElement("canvas");
    darkGrainCanvas.width = SZ; darkGrainCanvas.height = SZ;
    const dc = darkGrainCanvas.getContext("2d");
    const imgD = dc.createImageData(SZ, SZ);
    const dd = imgD.data;

    function vnoise(x, y, period, seed) {
      const gx = Math.floor(x / period), gy = Math.floor(y / period);
      const fx = (x / period) - gx, fy = (y / period) - gy;
      const wrap = Math.max(1, Math.round(SZ / period));
      const x0 = ((gx % wrap) + wrap) % wrap, x1 = (x0 + 1) % wrap;
      const y0 = ((gy % wrap) + wrap) % wrap, y1 = (y0 + 1) % wrap;
      const a = hash(x0 + y0 * 57, seed);
      const b = hash(x1 + y0 * 57, seed);
      const c = hash(x0 + y1 * 57, seed);
      const e = hash(x1 + y1 * 57, seed);
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      return lerp(lerp(a, b, ux), lerp(c, e, ux), uy);
    }

    for (let y = 0; y < SZ; y++) {
      for (let x = 0; x < SZ; x++) {
        const idx = (y * SZ + x) * 4;
        // Multi-scale paper bump tooth (no directional bars!)
        const n1 = vnoise(x, y, 16, 11);
        const n2 = vnoise(x, y, 6, 37);
        const n3 = hash(x * 13 + y * 97, 73);
        const tooth = n1 * 0.35 + n2 * 0.40 + n3 * 0.25;

        // Light paper tooth speckles peeking through wax
        if (tooth > 0.67) {
          const a = Math.min(255, Math.round((tooth - 0.67) * 520));
          d[idx] = 252; d[idx + 1] = 244; d[idx + 2] = 224; d[idx + 3] = a;
        }
        // Rich darker wax pigment clumps
        if (tooth < 0.34) {
          const a = Math.min(180, Math.round((0.34 - tooth) * 320));
          dd[idx] = 35; dd[idx + 1] = 20; dd[idx + 2] = 15; dd[idx + 3] = a;
        }
      }
    }
    tc.putImageData(img, 0, 0);
    dc.putImageData(imgD, 0, 0);
  }

  // Real Continuous Wax Crayon Fill (ONE continuous coloring pass, grainy paper-tooth speckles, NO stripes!)
  function fillWaxCrayon(c, pts, col, seed, opts = {}) {
    ensureToothTextures();
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const p of pts) {
      if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1];
      if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1];
    }
    const w = Math.max(4, maxX - minX), h = Math.max(4, maxY - minY);

    c.save();
    tracePoly(c, pts);
    c.clip();

    // 1. Warm paper-cardboard tooth base
    c.fillStyle = opts.toothCol || "#f6edd9";
    c.fillRect(minX - 4, minY - 4, w + 8, h + 8);

    // 2. Continuous waxy crayon coverage (soft uneven pressure variation, NO parallel stripes!)
    c.globalAlpha = opts.coverage ?? 0.90;
    c.fillStyle = col;
    c.fillRect(minX - 4, minY - 4, w + 8, h + 8);

    // Soft organic pressure variation (gentle light/dark wax clouds)
    const cx = minX + w * (0.35 + hash(seed, 3) * 0.3);
    const cy = minY + h * (0.32 + hash(seed, 7) * 0.3);
    const rg = c.createRadialGradient(cx, cy, Math.min(w, h) * 0.1, cx, cy, Math.max(w, h) * 0.85);
    rg.addColorStop(0, "rgba(255, 250, 232, 0.14)");
    rg.addColorStop(0.65, "rgba(255, 250, 232, 0)");
    rg.addColorStop(1, "rgba(42, 22, 12, 0.18)");
    c.globalAlpha = 1;
    c.fillStyle = rg;
    c.fillRect(minX - 4, minY - 4, w + 8, h + 8);

    // 3. Paper-tooth speckle knockouts + dark wax clumps
    const patLight = c.createPattern(toothPatCanvas, "repeat");
    const patDark = c.createPattern(darkGrainCanvas, "repeat");
    c.save();
    c.translate((seed * 29) % 192, (seed * 47) % 192);
    c.globalAlpha = opts.toothAlpha ?? 0.56;
    c.fillStyle = patLight;
    c.fillRect(minX - 200, minY - 200, w + 400, h + 400);
    c.globalAlpha = opts.clumpAlpha ?? 0.28;
    c.fillStyle = patDark;
    c.fillRect(minX - 200, minY - 200, w + 400, h + 400);
    c.restore();

    // Soft rough waxy inner edge (light paper tooth peeking right at the crayon perimeter)
    if (opts.softEdge !== false) {
      tracePoly(c, pts);
      c.strokeStyle = "rgba(246, 237, 217, 0.35)";
      c.lineWidth = opts.edgeW || 3.0;
      c.stroke();
    }

    c.restore();

    // 4. Soft textured crayon outline
    const lw = opts.lw ?? 3.0;
    if (lw > 0) {
      c.save();
      c.lineJoin = "round";
      c.lineCap = "round";
      tracePoly(c, pts);
      c.strokeStyle = opts.ol || OL;
      c.lineWidth = lw;
      c.stroke();
      // Subtle second waxy pass for hand-drawn crayon thickness
      c.globalAlpha = 0.34;
      c.lineWidth = lw * 0.7;
      tracePoly(c, pts.map(([x, y], i) => [x + jit(i, seed + 19) * 1.4, y + jit(i + 5, seed + 29) * 1.4]));
      c.stroke();
      c.restore();
    }
  }

  // Draw a thick die-cut CORRUGATED BROWN CARDBOARD STANDEE SLAB!
  // Includes:
  // - Extruded kraft brown thickness wall (thickX, thickY)
  // - Visible CORRUGATED FLUTES (wavy/ribbed 一格一格 shipping-box cross-section!) inside the cut edge
  // - Kraft cardboard front lip (NO white torn paper!)
  // - Optional front artwork drawn onto the cardboard face
  function makeCardboardSlab(w, h, silhouettePts, opts = {}, drawFrontArtFn = null) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const c = cv.getContext("2d");

    const thickX = opts.thickX ?? 11;
    const thickY = opts.thickY ?? 8;
    const lip = opts.lip ?? 3.5; // visible kraft brown die-cut border around front art

    // Build slightly padded die-cut board contour
    let cx = 0, cy = 0;
    for (const p of silhouettePts) { cx += p[0]; cy += p[1]; }
    cx /= silhouettePts.length; cy /= silhouettePts.length;

    const boardPts = lip > 0
      ? silhouettePts.map(([x, y]) => {
          const dx = x - cx, dy = y - cy;
          const d = Math.max(1, Math.hypot(dx, dy));
          return [x + (dx / d) * lip, y + (dy / d) * lip];
        })
      : silhouettePts;

    // 1. Draw thick extruded brown cardboard side wall (stepped back -> front)
    const steps = Math.max(8, Math.round(Math.hypot(thickX, thickY)));
    for (let s = steps; s >= 1; s--) {
      const t = s / steps;
      const ox = thickX * t, oy = thickY * t;
      c.save();
      c.translate(ox, oy);
      tracePoly(c, boardPts);
      // Darker cut-edge shading toward the back, warm kraft brown in front
      c.fillStyle = s === steps ? "#4a2c14" : (t > 0.6 ? "#734824" : "#8f5d32");
      c.fill();
      if (s === steps) {
        c.strokeStyle = "#3a210e";
        c.lineWidth = 2.0;
        c.stroke();
      }
      c.restore();
    }

    // 2. Carve the VISIBLE CORRUGATED FLUTES (一格一格 wavy/ribbed cross-section) into the cut edge!
    // Build mask of ONLY the extruded side wall (back shifted minus front board)
    const wallMask = document.createElement("canvas");
    wallMask.width = w; wallMask.height = h;
    const wc = wallMask.getContext("2d");
    wc.save();
    for (let s = steps; s >= 1; s--) {
      const t = s / steps;
      wc.save();
      wc.translate(thickX * t, thickY * t);
      tracePoly(wc, boardPts);
      wc.fillStyle = "#000";
      wc.fill();
      wc.restore();
    }
    wc.globalCompositeOperation = "destination-out";
    tracePoly(wc, boardPts);
    wc.fillStyle = "#000";
    wc.fill();
    wc.restore();

    // Paint corrugated flutes onto wallCanvas, clip via wallMask
    const wallArt = document.createElement("canvas");
    wallArt.width = w; wallArt.height = h;
    const ac = wallArt.getContext("2d");
    ac.fillStyle = "#8d5b30";
    ac.fillRect(0, 0, w, h);

    // Draw ribbed corrugated cells (alternating shadowed flute hollows & warm tan arches along perimeter!)
    const fluteStep = 6.5;
    let acc = 0;
    for (let i = 0; i < boardPts.length; i++) {
      const p0 = boardPts[i], p1 = boardPts[(i + 1) % boardPts.length];
      const seg = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      acc += seg;
      if (acc >= fluteStep) {
        acc = 0;
        const mx = p0[0] + thickX * 0.55;
        const my = p0[1] + thickY * 0.55;
        // Dark hollow corrugated flute cell
        ac.fillStyle = "#3c210d";
        ac.beginPath();
        ac.ellipse(mx, my, 2.5, 2.2, 0.4, 0, TAU);
        ac.fill();
        // Warm tan kraft flute arch beside it
        ac.fillStyle = "#c9925c";
        ac.beginPath();
        ac.ellipse(mx + 2.2, my - 1.5, 1.8, 1.5, 0.4, 0, TAU);
        ac.fill();
      }
    }
    // Thin middle kraft liner ridge so double-layer cardboard reads crisp
    ac.save();
    ac.translate(thickX * 0.48, thickY * 0.48);
    tracePoly(ac, boardPts);
    ac.strokeStyle = "#b57d47";
    ac.lineWidth = 1.6;
    ac.stroke();
    ac.restore();

    ac.globalCompositeOperation = "destination-in";
    ac.drawImage(wallMask, 0, 0);
    c.drawImage(wallArt, 0, 0);

    // Dark crisp outer cut edge on back of side wall
    c.save();
    c.translate(thickX, thickY);
    tracePoly(c, boardPts);
    c.strokeStyle = "#3a210e";
    c.lineWidth = 1.8;
    c.stroke();
    c.restore();

    // 3. Front kraft-brown cardboard face (warm shipping-box kraft with subtle fibers)
    c.save();
    tracePoly(c, boardPts);
    c.fillStyle = "#c9955e";
    c.fill();
    c.clip();
    // Subtle kraft cardboard fiber speckles
    for (let i = 0; i < 160; i++) {
      const fx = hash(i * 3, 17) * w;
      const fy = hash(i * 5, 31) * h;
      c.fillStyle = i % 2 ? "rgba(74, 44, 20, 0.14)" : "rgba(242, 212, 172, 0.16)";
      c.fillRect(fx, fy, 2.2, 1.4);
    }
    c.restore();

    tracePoly(c, boardPts);
    c.strokeStyle = "#4d2f16";
    c.lineWidth = 2.0;
    c.stroke();

    // 4. Draw front character / prop crayon art cleanly inside the die-cut cardboard!
    if (drawFrontArtFn) drawFrontArtFn(c);

    return cv;
  }

  /* ================= Die-Cut Cardboard Characters & Layered Trees ================= */
  function buildCardboardStandees() {
    const S = 260;
    const cx = S * 0.5, by = S - 24;
    const layers = {};

    // ---------- 1. CHILI MOUSE (椒椒鼠) — Cute Gen-1 silhouette on thick die-cut cardboard + popped face/ears ----------
    const chiliBodyPts = makeEllipsePts(cx, by - 78, 76, 68, 36, 101, 0.03);
    const chiliStemPts = sampleSmoothLoop([
      [cx - 10, by - 140], [cx - 14, by - 178], [cx + 6, by - 188], [cx + 18, by - 172], [cx + 10, by - 138]
    ], 5);
    const chiliBellyPts = sampleSmoothLoop([
      [cx - 56, by - 58], [cx - 32, by - 94], [cx, by - 82], [cx + 32, by - 94],
      [cx + 56, by - 58], [cx + 46, by - 18], [cx, by - 12], [cx - 46, by - 18]
    ], 5);

    layers.chili = [
      // Back thick shipping-box cardboard slab with chili body + green stem + ears
      { zOff: -0.04, cv: makeCardboardSlab(S, S, chiliBodyPts, { thickX: 12, thickY: 9, lip: 4.5 }, (c) => {
        // Stem on cardboard tab
        const stemSlab = makeCardboardSlab(S, S, chiliStemPts, { thickX: 8, thickY: 6, lip: 3.5 }, (sc) => {
          fillWaxCrayon(sc, chiliStemPts, "#339c36", 102, { lw: 3.0 });
        });
        c.drawImage(stemSlab, 0, 0);
        // Ears
        fillWaxCrayon(c, makeEllipsePts(cx - 66, by - 102, 22, 24, 20, 103), "#b82418", 103, { lw: 3.0 });
        fillWaxCrayon(c, makeEllipsePts(cx + 66, by - 100, 22, 24, 20, 104), "#b82418", 104, { lw: 3.0 });
        // Main plump red chili body in continuous waxy crayon
        fillWaxCrayon(c, chiliBodyPts, "#e63926", 105, { lw: 3.4 });
      })},
      // Popped-forward cardboard cheek/belly cutout + crisp cute face!
      { zOff: 0.08, cv: makeCardboardSlab(S, S, chiliBellyPts, { thickX: 6, thickY: 5, lip: 2.5 }, (c) => {
        fillWaxCrayon(c, chiliBellyPts, "#ffefc8", 106, { toothCol: "#fffdf6", lw: 2.8 });
        // Cute emerald eyes + white glints + rosy cheeks + paws
        fillWaxCrayon(c, makeEllipsePts(cx - 24, by - 88, 13, 14, 20, 107), "#239c5b", 107, { lw: 2.6 });
        fillWaxCrayon(c, makeEllipsePts(cx + 24, by - 88, 13, 14, 20, 108), "#239c5b", 108, { lw: 2.6 });
        fillWaxCrayon(c, makeEllipsePts(cx - 24, by - 88, 5.5, 6, 16, 109), "#fffdf6", 109, { lw: 1.8, toothAlpha: 0.1 });
        fillWaxCrayon(c, makeEllipsePts(cx + 24, by - 88, 5.5, 6, 16, 110), "#fffdf6", 110, { lw: 1.8, toothAlpha: 0.1 });
        fillWaxCrayon(c, makeEllipsePts(cx - 42, by - 66, 10, 7.5, 16, 111), "#ff8a9c", 111, { lw: 1.8 });
        fillWaxCrayon(c, makeEllipsePts(cx + 42, by - 66, 10, 7.5, 16, 112), "#ff8a9c", 112, { lw: 1.8 });
        fillWaxCrayon(c, makeEllipsePts(cx - 32, by - 16, 14, 9.5, 16, 113), "#f09e76", 113, { lw: 2.4 });
        fillWaxCrayon(c, makeEllipsePts(cx + 32, by - 16, 14, 9.5, 16, 114), "#f09e76", 114, { lw: 2.4 });
      })}
    ];

    // ---------- 2. LEMON CHICK (闪电鸡) — Cute Gen-1 chick on thick die-cut cardboard + popped wings/crest ----------
    const lemonBodyPts = makeEllipsePts(cx, by - 78, 74, 68, 36, 201, 0.03);
    const lemonBoltPts = sampleSmoothLoop([
      [cx - 8, by - 142], [cx - 22, by - 180], [cx + 14, by - 208], [cx + 4, by - 174],
      [cx + 30, by - 176], [cx + 8, by - 138]
    ], 3);
    const lemonBellyPts = makeEllipsePts(cx, by - 44, 46, 34, 24, 206, 0.03);

    layers.lemon = [
      { zOff: -0.04, cv: makeCardboardSlab(S, S, lemonBodyPts, { thickX: 12, thickY: 9, lip: 4.5 }, (c) => {
        const boltSlab = makeCardboardSlab(S, S, lemonBoltPts, { thickX: 8, thickY: 6, lip: 3.5 }, (sc) => {
          fillWaxCrayon(sc, lemonBoltPts, "#23a2ef", 201, { lw: 3.0 });
        });
        c.drawImage(boltSlab, 0, 0);
        fillWaxCrayon(c, lemonBodyPts, "#ffdc24", 203, { lw: 3.4 });
      })},
      { zOff: 0.08, cv: makeCardboardSlab(S, S, lemonBellyPts, { thickX: 6, thickY: 5, lip: 2.5 }, (c) => {
        fillWaxCrayon(c, lemonBellyPts, "#fff8de", 206, { toothCol: "#fffdf6", lw: 2.6 });
        // Cute wings
        fillWaxCrayon(c, makeEllipsePts(cx - 72, by - 64, 18, 22, 20, 204), "#ffba1a", 204, { lw: 2.8 });
        fillWaxCrayon(c, makeEllipsePts(cx + 72, by - 64, 18, 22, 20, 205), "#ffba1a", 205, { lw: 2.8 });
        // Expressive blue eyes + orange beak
        fillWaxCrayon(c, makeEllipsePts(cx - 26, by - 94, 16, 17, 20, 207), "#fffdf6", 207, { lw: 2.6, toothAlpha: 0.15 });
        fillWaxCrayon(c, makeEllipsePts(cx + 26, by - 94, 16, 17, 20, 208), "#fffdf6", 208, { lw: 2.6, toothAlpha: 0.15 });
        fillWaxCrayon(c, makeEllipsePts(cx - 25, by - 94, 8.5, 9.5, 16, 209), "#197ad6", 209, { lw: 2.0 });
        fillWaxCrayon(c, makeEllipsePts(cx + 25, by - 94, 8.5, 9.5, 16, 210), "#197ad6", 210, { lw: 2.0 });
        const beakPts = sampleSmoothLoop([[cx - 14, by - 80], [cx + 14, by - 80], [cx, by - 58]], 3);
        fillWaxCrayon(c, beakPts, "#ff7d22", 211, { lw: 2.6 });
      })}
    ];

    // ---------- 3. BLUEBERRY OWL (蓝莓枭) — Cute Gen-1 owl on thick die-cut cardboard + popped face mask ----------
    const owlBodyPts = sampleSmoothLoop([
      [cx - 64, by - 110], [cx - 66, by - 166], [cx - 24, by - 140],
      [cx, by - 156], [cx + 24, by - 140], [cx + 66, by - 166], [cx + 64, by - 110],
      [cx + 74, by - 46], [cx + 42, by - 14], [cx - 42, by - 14], [cx - 74, by - 46]
    ], 4);
    const owlMaskPts = sampleSmoothLoop([
      [cx - 54, by - 104], [cx - 26, by - 134], [cx, by - 112], [cx + 26, by - 134],
      [cx + 54, by - 104], [cx + 38, by - 66], [cx, by - 58], [cx - 38, by - 66]
    ], 4);

    layers.blueberry = [
      { zOff: -0.04, cv: makeCardboardSlab(S, S, owlBodyPts, { thickX: 12, thickY: 9, lip: 4.5 }, (c) => {
        fillWaxCrayon(c, owlBodyPts, "#1f52b0", 301, { lw: 3.4 });
        [[-22, -42], [0, -34], [22, -42], [-12, -22], [12, -22]].forEach(([dx, dy], idx) => {
          fillWaxCrayon(c, makeEllipsePts(cx + dx, by + dy, 8, 7.5, 16, 310 + idx), "#72aeff", 310 + idx, { lw: 2.0 });
        });
      })},
      { zOff: 0.08, cv: makeCardboardSlab(S, S, owlMaskPts, { thickX: 6, thickY: 5, lip: 2.5 }, (c) => {
        fillWaxCrayon(c, owlMaskPts, "#fdf0d4", 303, { toothCol: "#fffdf6", lw: 2.8 });
        fillWaxCrayon(c, makeEllipsePts(cx - 24, by - 96, 16, 17, 20, 320), "#5ca2ff", 320, { lw: 2.6 });
        fillWaxCrayon(c, makeEllipsePts(cx + 24, by - 96, 16, 17, 20, 321), "#5ca2ff", 321, { lw: 2.6 });
        fillWaxCrayon(c, makeEllipsePts(cx - 24, by - 96, 8, 8.5, 16, 322), "#1e1a30", 322, { lw: 1.8 });
        fillWaxCrayon(c, makeEllipsePts(cx + 24, by - 96, 8, 8.5, 16, 323), "#1e1a30", 323, { lw: 1.8 });
        const beakPts = sampleSmoothLoop([[cx - 10, by - 82], [cx + 10, by - 82], [cx, by - 64]], 3);
        fillWaxCrayon(c, beakPts, "#f0b24e", 324, { lw: 2.4 });
      })}
    ];

    // ---------- 4. SLIMES (z1 green, z2 blue, z3 orange) — Cute rounded slimes on thick cardboard ----------
    const makeSlime = (mainCol, shadeCol, spotCol, seed, horned) => {
      const slimePts = sampleSmoothLoop([
        [cx - 68, by - 22], [cx - 72, by - 66], [cx - 44, by - 114], [cx, by - 126],
        [cx + 44, by - 114], [cx + 72, by - 66], [cx + 68, by - 22], [cx, by - 12]
      ], 4);
      const facePts = makeEllipsePts(cx, by - 68, 46, 36, 24, seed + 12, 0.02);

      return [
        { zOff: -0.04, cv: makeCardboardSlab(S, S, slimePts, { thickX: 12, thickY: 9, lip: 4.5 }, (c) => {
          if (horned) {
            const lHorn = sampleSmoothLoop([[cx - 46, by - 106], [cx - 60, by - 154], [cx - 22, by - 120]], 3);
            const rHorn = sampleSmoothLoop([[cx + 46, by - 106], [cx + 60, by - 154], [cx + 22, by - 120]], 3);
            c.drawImage(makeCardboardSlab(S, S, lHorn, { thickX: 7, thickY: 5, lip: 3 }, (sc) => fillWaxCrayon(sc, lHorn, "#ffd43b", seed + 1)), 0, 0);
            c.drawImage(makeCardboardSlab(S, S, rHorn, { thickX: 7, thickY: 5, lip: 3 }, (sc) => fillWaxCrayon(sc, rHorn, "#ffd43b", seed + 2)), 0, 0);
          } else {
            const leaf = sampleSmoothLoop([[cx - 4, by - 120], [cx - 30, by - 148], [cx - 2, by - 138], [cx + 26, by - 150], [cx + 6, by - 118]], 3);
            c.drawImage(makeCardboardSlab(S, S, leaf, { thickX: 7, thickY: 5, lip: 3 }, (sc) => fillWaxCrayon(sc, leaf, spotCol, seed + 3)), 0, 0);
          }
          fillWaxCrayon(c, slimePts, mainCol, seed + 5, { lw: 3.4 });
          // Darker drippy bottom ooze band
          const oozePts = sampleSmoothLoop([
            [cx - 66, by - 36], [cx - 32, by - 46], [cx, by - 34], [cx + 34, by - 46],
            [cx + 66, by - 36], [cx + 62, by - 18], [cx, by - 12], [cx - 62, by - 18]
          ], 4);
          fillWaxCrayon(c, oozePts, shadeCol, seed + 6, { lw: 2.2 });
        })},
        { zOff: 0.07, cv: makeCardboardSlab(S, S, facePts, { thickX: 5, thickY: 4, lip: 2.0 }, (c) => {
          fillWaxCrayon(c, facePts, mainCol, seed + 7, { lw: 2.2 });
          fillWaxCrayon(c, makeEllipsePts(cx - 20, by - 76, 14, 15, 18, seed + 8), "#fffdf6", seed + 8, { lw: 2.4, toothAlpha: 0.15 });
          fillWaxCrayon(c, makeEllipsePts(cx + 22, by - 74, 12, 13, 18, seed + 9), "#fffdf6", seed + 9, { lw: 2.4, toothAlpha: 0.15 });
          fillWaxCrayon(c, makeEllipsePts(cx - 19, by - 75, 6.5, 7, 14, seed + 10), "#24183a", seed + 10, { lw: 1.5 });
          fillWaxCrayon(c, makeEllipsePts(cx + 22, by - 73, 6, 6.5, 14, seed + 11), "#24183a", seed + 11, { lw: 1.5 });
          const mouthPts = sampleSmoothLoop([[cx - 22, by - 46], [cx + 22, by - 46], [cx + 16, by - 26], [cx - 16, by - 26]], 3);
          fillWaxCrayon(c, mouthPts, "#36182c", seed + 13, { lw: 2.2 });
        })}
      ];
    };

    layers.z1 = makeSlime("#86de44", "#56a824", "#b8f478", 401, false);
    layers.z2 = makeSlime("#62c0ff", "#2e7cc2", "#a2e2ff", 431, false);
    layers.z3 = makeSlime("#ff7236", "#bd3614", "#ffc288", 461, true);

    // ---------- 5. NEST CHICK (小鸡窝) — Cute chick in cracked eggshell on thick cardboard ----------
    const chickPts = makeEllipsePts(cx, by - 82, 68, 64, 36, 501, 0.02);
    const shellPts = sampleSmoothLoop([
      [cx - 64, by - 64], [cx - 36, by - 42], [cx - 14, by - 66], [cx + 8, by - 40],
      [cx + 34, by - 66], [cx + 64, by - 48], [cx + 58, by - 14], [cx - 58, by - 14]
    ], 3);

    layers.egg = [
      { zOff: -0.04, cv: makeCardboardSlab(S, S, chickPts, { thickX: 12, thickY: 9, lip: 4.5 }, (c) => {
        fillWaxCrayon(c, chickPts, "#ffa624", 501, { lw: 3.4 });
        fillWaxCrayon(c, makeEllipsePts(cx - 20, by - 96, 11, 12, 16, 504), "#fffdf6", 504, { lw: 2.4, toothAlpha: 0.15 });
        fillWaxCrayon(c, makeEllipsePts(cx + 20, by - 96, 11, 12, 16, 505), "#fffdf6", 505, { lw: 2.4, toothAlpha: 0.15 });
        fillWaxCrayon(c, makeEllipsePts(cx - 19, by - 96, 6, 6.5, 14, 514), "#24183a", 514, { lw: 1.5 });
        fillWaxCrayon(c, makeEllipsePts(cx + 19, by - 96, 6, 6.5, 14, 515), "#24183a", 515, { lw: 1.5 });
        const beakPts = sampleSmoothLoop([[cx - 11, by - 82], [cx + 11, by - 82], [cx, by - 64]], 3);
        fillWaxCrayon(c, beakPts, "#ff6e1c", 506, { lw: 2.4 });
      })},
      { zOff: 0.09, cv: makeCardboardSlab(S, S, shellPts, { thickX: 7, thickY: 5, lip: 3.0 }, (c) => {
        fillWaxCrayon(c, shellPts, "#fff4d6", 503, { toothCol: "#fffdf6", lw: 2.8 });
      })}
    ];

    // ---------- 6. TREES (3 thick stacked corrugated cardboard layers with visible brown edges between!) ----------
    const trunkPts = sampleSmoothLoop([[cx - 15, by], [cx - 11, by - 96], [cx + 12, by - 94], [cx + 16, by]], 3);
    const backCrownPts = makeEllipsePts(cx, by - 124, 72, 54, 32, 602, 0.08);
    const frontCrownPts = makeEllipsePts(cx - 4, by - 134, 56, 44, 28, 604, 0.07);

    layers.tree = [
      { zOff: -0.06, cv: makeCardboardSlab(S, S, trunkPts, { thickX: 11, thickY: 8, lip: 4 }, (c) => {
        fillWaxCrayon(c, trunkPts, "#9e673b", 601, { lw: 3.0 });
      })},
      { zOff: 0.02, cv: makeCardboardSlab(S, S, backCrownPts, { thickX: 12, thickY: 9, lip: 4.5 }, (c) => {
        fillWaxCrayon(c, backCrownPts, "#5cb83a", 602, { lw: 3.2 });
      })},
      { zOff: 0.12, cv: makeCardboardSlab(S, S, frontCrownPts, { thickX: 9, thickY: 7, lip: 4.0 }, (c) => {
        fillWaxCrayon(c, frontCrownPts, "#8ae058", 604, { lw: 3.0 });
        fillWaxCrayon(c, makeEllipsePts(cx - 24, by - 140, 10, 10.5, 16, 606), "#eb4434", 606, { lw: 2.2 });
        fillWaxCrayon(c, makeEllipsePts(cx + 18, by - 128, 9.5, 10, 16, 607), "#eb4434", 607, { lw: 2.2 });
        fillWaxCrayon(c, makeEllipsePts(cx - 2, by - 114, 9, 9.5, 16, 608), "#eb4434", 608, { lw: 2.2 });
      })}
    ];

    // ---------- 7. BUSHES, ROCKS, SIGNPOST, FENCES — thick die-cut brown cardboard standees ----------
    const bushBack = makeEllipsePts(cx, by - 36, 62, 38, 28, 701, 0.08);
    const bushFront = makeEllipsePts(cx - 4, by - 44, 42, 30, 24, 703, 0.07);
    layers.bush = [
      { zOff: -0.02, cv: makeCardboardSlab(S, S, bushBack, { thickX: 10, thickY: 8, lip: 4 }, (c) => {
        fillWaxCrayon(c, bushBack, "#58b438", 701, { lw: 3.0 });
      })},
      { zOff: 0.08, cv: makeCardboardSlab(S, S, bushFront, { thickX: 7, thickY: 5, lip: 3.5 }, (c) => {
        fillWaxCrayon(c, bushFront, "#88de58", 703, { lw: 2.8 });
        fillWaxCrayon(c, makeEllipsePts(cx - 16, by - 46, 8, 7.5, 14, 704), "#ff88ba", 704, { lw: 2.0 });
        fillWaxCrayon(c, makeEllipsePts(cx + 14, by - 36, 7.5, 7.5, 14, 705), "#ffe054", 705, { lw: 2.0 });
      })}
    ];

    const rockBack = sampleSmoothLoop([[cx - 56, by], [cx - 42, by - 56], [cx + 10, by - 66], [cx + 54, by - 26], [cx + 46, by + 2]], 4);
    const rockFront = sampleSmoothLoop([[cx - 30, by - 6], [cx - 20, by - 46], [cx + 18, by - 48], [cx + 30, by - 14]], 4);
    layers.rock = [
      { zOff: -0.02, cv: makeCardboardSlab(S, S, rockBack, { thickX: 11, thickY: 8, lip: 4 }, (c) => {
        fillWaxCrayon(c, rockBack, "#989084", 720, { lw: 3.0 });
      })},
      { zOff: 0.07, cv: makeCardboardSlab(S, S, rockFront, { thickX: 7, thickY: 5, lip: 3 }, (c) => {
        fillWaxCrayon(c, rockFront, "#cbc2b6", 721, { lw: 2.6 });
      })}
    ];

    const signPost = sampleSmoothLoop([[cx - 6, by], [cx - 5, by - 90], [cx + 7, by - 90], [cx + 8, by]], 3);
    const signBoard = sampleSmoothLoop([[cx - 42, by - 94], [cx + 28, by - 96], [cx + 54, by - 74], [cx + 26, by - 52], [cx - 42, by - 54]], 3);
    layers.sign = [
      { zOff: -0.02, cv: makeCardboardSlab(S, S, signPost, { thickX: 9, thickY: 7, lip: 3.5 }, (c) => {
        fillWaxCrayon(c, signPost, "#966034", 740, { lw: 2.8 });
      })},
      { zOff: 0.07, cv: makeCardboardSlab(S, S, signBoard, { thickX: 8, thickY: 6, lip: 3.5 }, (c) => {
        fillWaxCrayon(c, signBoard, "#f0c268", 741, { lw: 2.8 });
      })}
    ];

    const railPts = sampleSmoothLoop([[cx - 84, by - 52], [cx + 84, by - 54], [cx + 84, by - 22], [cx - 84, by - 20]], 3);
    layers.fence = [
      { zOff: -0.02, cv: makeCardboardSlab(S, S, railPts, { thickX: 10, thickY: 7, lip: 3.5 }, (c) => {
        fillWaxCrayon(c, sampleSmoothLoop([[cx - 84, by - 36], [cx + 84, by - 38], [cx + 84, by - 22], [cx - 84, by - 20]], 3), "#d49854", 760, { lw: 2.6 });
        fillWaxCrayon(c, sampleSmoothLoop([[cx - 84, by - 66], [cx + 84, by - 68], [cx + 84, by - 52], [cx - 84, by - 50]], 3), "#e4ae68", 761, { lw: 2.6 });
      })},
      { zOff: 0.07, cv: makeCardboardSlab(S, S, sampleSmoothLoop([
        [cx - 72, by], [cx - 70, by - 88], [cx + 70, by - 88], [cx + 72, by]
      ], 2), { thickX: 7, thickY: 5, lip: 0 }, (c) => {
        c.clearRect(0, 0, S, S);
        [-60, -20, 20, 60].forEach((px, idx) => {
          const pPts = sampleSmoothLoop([[cx + px - 10, by], [cx + px - 9, by - 72], [cx + px, by - 86], [cx + px + 9, by - 72], [cx + px + 10, by]], 3);
          const picketSlab = makeCardboardSlab(S, S, pPts, { thickX: 7, thickY: 5, lip: 2.5 }, (sc) => {
            fillWaxCrayon(sc, pPts, "#f2c682", 770 + idx, { lw: 2.6 });
          });
          c.drawImage(picketSlab, 0, 0);
        });
      })}
    ];

    return layers;
  }

  window.PaperCraft = {
    hash, jit, sampleSmoothLoop, makeEllipsePts, tracePoly,
    fillWaxCrayon, makeCardboardSlab, buildCardboardStandees
  };
})();
