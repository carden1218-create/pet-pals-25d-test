(() => {
  "use strict";

  const TAU = Math.PI * 2;
  // Warm dark charcoal-umber crayon outline (just like Gen-1!)
  const OL = "#2d202d";

  function hash(a, b) {
    let n = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b ^ 0xc2b2ae35, 0x27d4eb2f);
    n ^= n >>> 15;
    n = Math.imul(n, 0x2c1b3c6d);
    n ^= n >>> 12;
    return (n >>> 0) / 4294967296;
  }
  function jit(i, s) { return hash(i * 7 + 3, s * 13 + 1) - 0.5; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Smooth Catmull-Rom closed loop sampling -> cute organic silhouettes
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

  function makeEllipsePts(cx, cy, rx, ry, n = 28, seed = 1, wobble = 0.025) {
    const ctrl = [];
    const k = 10;
    for (let i = 0; i < k; i++) {
      const a = (i / k) * TAU;
      const r = 1 + jit(i, seed) * wobble * 2;
      ctrl.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
    }
    return sampleSmoothLoop(ctrl, Math.max(3, Math.round(n / k)));
  }

  function tracePoly(c, pts, closed = true) {
    c.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) c.moveTo(pts[i][0], pts[i][1]);
      else c.lineTo(pts[i][0], pts[i][1]);
    }
    if (closed) c.closePath();
  }

  // Seamless 192x192 Wax Crayon Paper-Tooth Mask (grainy speckles, ZERO parallel stripes!)
  let toothPatCanvas = null;
  let darkGrainCanvas = null;
  let outlineGrainCanvas = null;
  function ensureToothTextures() {
    if (toothPatCanvas) return;
    const SZ = 192;

    toothPatCanvas = document.createElement("canvas");
    toothPatCanvas.width = SZ; toothPatCanvas.height = SZ;
    const tc = toothPatCanvas.getContext("2d");
    const img = tc.createImageData(SZ, SZ);
    const d = img.data;

    darkGrainCanvas = document.createElement("canvas");
    darkGrainCanvas.width = SZ; darkGrainCanvas.height = SZ;
    const dc = darkGrainCanvas.getContext("2d");
    const imgD = dc.createImageData(SZ, SZ);
    const dd = imgD.data;

    outlineGrainCanvas = document.createElement("canvas");
    outlineGrainCanvas.width = SZ; outlineGrainCanvas.height = SZ;
    const oc = outlineGrainCanvas.getContext("2d");
    const imgO = oc.createImageData(SZ, SZ);
    const od = imgO.data;

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
        const n1 = vnoise(x, y, 16, 11);
        const n2 = vnoise(x, y, 5, 37);
        const n3 = hash(x * 13 + y * 97, 73);
        const tooth = n1 * 0.30 + n2 * 0.42 + n3 * 0.28;

        // Warm cream paper tooth speckles peeking through wax
        if (tooth > 0.62) {
          const a = Math.min(255, Math.round((tooth - 0.62) * 560));
          d[idx] = 252; d[idx + 1] = 245; d[idx + 2] = 225; d[idx + 3] = a;
        }
        // Rich darker wax pigment clumps
        if (tooth < 0.36) {
          const a = Math.min(185, Math.round((0.36 - tooth) * 320));
          dd[idx] = 35; dd[idx + 1] = 20; dd[idx + 2] = 15; dd[idx + 3] = a;
        }
        // Subtle knockout speckles for textured hand-drawn crayon outlines
        if (tooth > 0.72) {
          const a = Math.min(200, Math.round((tooth - 0.72) * 650));
          od[idx] = 0; od[idx + 1] = 0; od[idx + 2] = 0; od[idx + 3] = a;
        }
      }
    }
    tc.putImageData(img, 0, 0);
    dc.putImageData(imgD, 0, 0);
    oc.putImageData(imgO, 0, 0);
  }

  // Soft textured hand-drawn wax crayon outline (rough waxy grain, NOT sterile vector ink!)
  function strokeWaxCrayon(c, pts, col = OL, lw = 4.2, seed = 1, closed = true) {
    if (lw <= 0) return;
    ensureToothTextures();

    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const p of pts) {
      if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1];
      if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1];
    }
    const pad = Math.ceil(lw * 2 + 6);
    const ox = Math.floor(minX - pad), oy = Math.floor(minY - pad);
    const sw = Math.max(8, Math.ceil(maxX - minX + pad * 2));
    const sh = Math.max(8, Math.ceil(maxY - minY + pad * 2));

    const sc = document.createElement("canvas");
    sc.width = sw; sc.height = sh;
    const g = sc.getContext("2d");
    g.translate(-ox, -oy);
    g.lineJoin = "round";
    g.lineCap = "round";

    // Primary waxy stroke
    tracePoly(g, pts, closed);
    g.strokeStyle = col;
    g.lineWidth = lw;
    g.globalAlpha = 0.92;
    g.stroke();

    // Soft crumbly secondary wax-drag pass
    tracePoly(g, pts.map(([x, y], i) => [x + jit(i, seed + 17) * 1.5, y + jit(i + 5, seed + 31) * 1.5]), closed);
    g.lineWidth = lw * 0.72;
    g.globalAlpha = 0.48;
    g.stroke();

    // Break outline with paper-tooth speckles so it reads as real wax crayon on textured paper
    g.save();
    g.globalCompositeOperation = "destination-out";
    g.globalAlpha = 0.78;
    const pat = g.createPattern(outlineGrainCanvas, "repeat");
    g.translate((seed * 23) % 192, (seed * 41) % 192);
    g.fillStyle = pat;
    g.fillRect(ox - 200, oy - 200, sw + 400, sh + 400);
    g.restore();

    c.drawImage(sc, ox, oy);
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

    // Optional paper-tooth base (skip when layering soft crayon patches directly on an already-colored body!)
    if (opts.withBase !== false) {
      c.fillStyle = opts.toothCol || "#fbf4e0";
      c.fillRect(minX - 4, minY - 4, w + 8, h + 8);
    }

    // Continuous waxy crayon fill
    c.globalAlpha = opts.coverage ?? 0.92;
    c.fillStyle = col;
    c.fillRect(minX - 4, minY - 4, w + 8, h + 8);

    // Gentle organic pressure shading (warm top highlight -> soft underside depth)
    if (opts.shade !== false) {
      const cx = minX + w * (0.38 + hash(seed, 3) * 0.24);
      const cy = minY + h * (0.30 + hash(seed, 7) * 0.22);
      const rg = c.createRadialGradient(cx, cy, Math.min(w, h) * 0.08, cx, cy, Math.max(w, h) * 0.85);
      rg.addColorStop(0, "rgba(255, 252, 236, 0.14)");
      rg.addColorStop(0.62, "rgba(255, 250, 232, 0)");
      rg.addColorStop(1, "rgba(42, 22, 12, 0.15)");
      c.globalAlpha = 1;
      c.fillStyle = rg;
      c.fillRect(minX - 4, minY - 4, w + 8, h + 8);
    }

    // Paper-tooth speckle knockouts + dark wax pigment clumps (NO stripes!)
    const patLight = c.createPattern(toothPatCanvas, "repeat");
    const patDark = c.createPattern(darkGrainCanvas, "repeat");
    c.save();
    c.translate((seed * 29) % 192, (seed * 47) % 192);
    c.globalAlpha = opts.toothAlpha ?? 0.56;
    c.fillStyle = patLight;
    c.fillRect(minX - 200, minY - 200, w + 400, h + 400);
    c.globalAlpha = opts.clumpAlpha ?? 0.26;
    c.fillStyle = patDark;
    c.fillRect(minX - 200, minY - 200, w + 400, h + 400);
    c.restore();

    // Soft crumbly waxy edge so adjacent crayon regions blend warmly
    if (opts.softEdge !== false) {
      tracePoly(c, pts);
      c.strokeStyle = col;
      c.globalAlpha = 0.35;
      c.lineWidth = opts.edgeW || 3.0;
      c.lineJoin = "round";
      c.stroke();
    }

    c.restore();

    // Textured crayon outline ONLY when explicitly requested (lw > 0)
    const lw = opts.lw ?? 0;
    if (lw > 0) {
      strokeWaxCrayon(c, pts, opts.ol || OL, lw, seed, true);
    }
  }

  // Draw a unified die-cut CORRUGATED BROWN CARDBOARD STANDEE for one whole object!
  // - Single smooth outer silhouette (NO internal stacked cardboard slabs or stitched seams!)
  // - Thick brown extruded cardboard cut edge with visible corrugated flutes (一格一格)
  // - Kraft-brown outer cut rim (ZERO white torn-paper borders!)
  // - Whole genuine crayon drawing inside the front face
  function makeCardboardSlab(w, h, silhouettePts, opts = {}, drawFrontArtFn = null) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const c = cv.getContext("2d");

    const thickX = opts.thickX ?? 11;
    const thickY = opts.thickY ?? 8;
    const lip = opts.lip ?? 3.5;

    // Helper: draw uniform rounded die-cut silhouette mask (works cleanly even on concave trees/crests!)
    function paintBoardShape(gc, fillCol) {
      tracePoly(gc, silhouettePts);
      gc.fillStyle = fillCol;
      gc.fill();
      if (lip > 0) {
        gc.lineJoin = "round";
        gc.lineCap = "round";
        gc.lineWidth = lip * 2;
        gc.strokeStyle = fillCol;
        gc.stroke();
      }
    }

    const boardMask = document.createElement("canvas");
    boardMask.width = w; boardMask.height = h;
    paintBoardShape(boardMask.getContext("2d"), "#000");

    // 1. Thick extruded kraft-brown cardboard side wall
    const steps = Math.max(9, Math.round(Math.hypot(thickX, thickY)));
    const stepCvs = [];
    const colors = ["#4a2c14", "#6e431f", "#8a582e"];
    for (const col of colors) {
      const sc = document.createElement("canvas");
      sc.width = w; sc.height = h;
      paintBoardShape(sc.getContext("2d"), col);
      stepCvs.push(sc);
    }

    for (let s = steps; s >= 1; s--) {
      const t = s / steps;
      const ox = thickX * t, oy = thickY * t;
      const idx = s === steps ? 0 : (t > 0.55 ? 1 : 2);
      c.drawImage(stepCvs[idx], ox, oy);
    }

    // 2. Carve VISIBLE CORRUGATED FLUTES (一格一格 shipping-box ribbed cross-section) into the cut edge
    const wallMask = document.createElement("canvas");
    wallMask.width = w; wallMask.height = h;
    const wc = wallMask.getContext("2d");
    for (let s = steps; s >= 1; s--) {
      const t = s / steps;
      wc.drawImage(boardMask, thickX * t, thickY * t);
    }
    wc.globalCompositeOperation = "destination-out";
    wc.drawImage(boardMask, 0, 0);

    const wallArt = document.createElement("canvas");
    wallArt.width = w; wallArt.height = h;
    const ac = wallArt.getContext("2d");
    ac.fillStyle = "#8c592e";
    ac.fillRect(0, 0, w, h);

    // Compute signed area to orient outward normal cleanly
    let area2 = 0;
    for (let i = 0; i < silhouettePts.length; i++) {
      const a = silhouettePts[i], b = silhouettePts[(i + 1) % silhouettePts.length];
      area2 += a[0] * b[1] - b[0] * a[1];
    }
    const nSign = area2 >= 0 ? -1 : 1;

    // Walk perimeter of silhouettePts & carve crisp 一格一格 corrugated flute pockets!
    const fluteStep = 5.4;
    let acc = 0;
    for (let i = 0; i < silhouettePts.length; i++) {
      const p0 = silhouettePts[i];
      const p1 = silhouettePts[(i + 1) % silhouettePts.length];
      const ex = p1[0] - p0[0], ey = p1[1] - p0[1];
      const seg = Math.hypot(ex, ey);
      if (seg < 0.01) continue;
      const nx = (ey / seg) * nSign, ny = (-ex / seg) * nSign;
      acc += seg;
      if (acc >= fluteStep) {
        acc = 0;
        const bx = p0[0] + nx * (lip + 0.5) + thickX * 0.50;
        const by = p0[1] + ny * (lip + 0.5) + thickY * 0.50;
        // Dark hollow corrugated flute cell (一格一格!)
        ac.fillStyle = "#311908";
        ac.beginPath();
        ac.ellipse(bx, by, 2.7, 2.3, Math.atan2(thickY, thickX), 0, TAU);
        ac.fill();
        // Warm kraft tan corrugated flute arch beside it
        ac.fillStyle = "#d9a268";
        ac.beginPath();
        ac.ellipse(bx - nx * 1.4 + (ex / seg) * 2.2, by - ny * 1.4 + (ey / seg) * 2.2, 1.5, 1.3, 0, 0, TAU);
        ac.fill();
      }
    }

    ac.globalCompositeOperation = "destination-in";
    ac.drawImage(wallMask, 0, 0);
    c.drawImage(wallArt, 0, 0);

    // Back outer cut shadow line
    const backOutline = document.createElement("canvas");
    backOutline.width = w; backOutline.height = h;
    const boc = backOutline.getContext("2d");
    boc.save();
    boc.translate(thickX, thickY);
    tracePoly(boc, silhouettePts);
    boc.lineJoin = "round";
    boc.lineCap = "round";
    boc.lineWidth = lip * 2 + 2.2;
    boc.strokeStyle = "#3a210e";
    boc.stroke();
    boc.restore();
    boc.globalCompositeOperation = "destination-out";
    boc.drawImage(boardMask, thickX * 0.92, thickY * 0.92);
    c.drawImage(backOutline, 0, 0);

    // 3. Front kraft-brown cardboard face (warm shipping-box kraft, NO white torn paper!)
    const frontBoard = document.createElement("canvas");
    frontBoard.width = w; frontBoard.height = h;
    const fc = frontBoard.getContext("2d");
    fc.fillStyle = "#c8915a";
    fc.fillRect(0, 0, w, h);
    for (let i = 0; i < 180; i++) {
      const fx = hash(i * 3, 17) * w;
      const fy = hash(i * 5, 31) * h;
      fc.fillStyle = i % 2 ? "rgba(74, 44, 20, 0.14)" : "rgba(242, 212, 172, 0.16)";
      fc.fillRect(fx, fy, 2.2, 1.4);
    }
    fc.globalCompositeOperation = "destination-in";
    fc.drawImage(boardMask, 0, 0);
    c.drawImage(frontBoard, 0, 0);

    // Subtle dark kraft rim along front board edge
    c.save();
    tracePoly(c, silhouettePts);
    c.lineJoin = "round";
    c.lineCap = "round";
    c.strokeStyle = "#523117";
    c.lineWidth = lip * 2 + 1.8;
    c.stroke();
    c.restore();
    // Re-fill inner front board cleanly over inner half of rim stroke
    c.drawImage(frontBoard, 0, 0);

    // 4. Draw the GENUINE CRAYON DRAWING cleanly on the front face inside silhouettePts!
    if (drawFrontArtFn) {
      c.save();
      tracePoly(c, silhouettePts);
      c.clip();
      // Warm cream drawing-paper base ONLY inside the character/prop outline (zero white border outside!)
      c.fillStyle = "#fcf5e3";
      c.fillRect(0, 0, w, h);
      drawFrontArtFn(c);
      c.restore();

      // Single continuous rough crayon outline around the whole character/prop silhouette
      if (opts.outerOl !== false) {
        strokeWaxCrayon(c, silhouettePts, opts.ol || OL, opts.outerLw ?? 4.6, opts.seed || 7, true);
      }
    }

    return cv;
  }

  /* ================= Whole Crayon-Drawn Characters & Plants on Die-Cut Cardboard Standees ================= */
  function buildCardboardStandees() {
    const S = 260;
    const cx = S * 0.5, by = S - 24;
    const layers = {};

    // ---------- 1. CHILI MOUSE (椒椒鼠) — Whole Gen-1 crayon drawing on ONE cardboard standee ----------
    const chiliOuterPts = sampleSmoothLoop([
      [cx - 10, by - 142],
      [cx - 14, by - 166], [cx - 22, by - 186], [cx - 2, by - 190], [cx + 8, by - 166], [cx + 12, by - 142],
      [cx + 46, by - 134], [cx + 72, by - 104], [cx + 78, by - 64], [cx + 68, by - 26],
      [cx + 40, by - 10], [cx, by - 8], [cx - 42, by - 10],
      [cx - 72, by - 24], [cx - 80, by - 58], [cx - 70, by - 100], [cx - 44, by - 134]
    ], 4);

    layers.chili = [{
      zOff: 0,
      cv: makeCardboardSlab(S, S, chiliOuterPts, { thickX: 11, thickY: 8, lip: 3.5, seed: 101 }, (c) => {
        // Whole red pepper body (continuous wax crayon, no internal seams)
        fillWaxCrayon(c, chiliOuterPts, "#de2b1c", 101, { coverage: 0.93, toothAlpha: 0.54, clumpAlpha: 0.24 });

        // Warm cream belly/face bib sloping gently up on right & curving around green eyes (Gen-1 shape!)
        const bibPts = sampleSmoothLoop([
          [cx - 22, by - 12], [cx + 38, by - 10], [cx + 72, by - 28], [cx + 76, by - 62],
          [cx + 58, by - 96], [cx + 36, by - 102], [cx + 22, by - 82], [cx + 12, by - 78],
          [cx + 4, by - 98], [cx - 18, by - 96], [cx - 28, by - 72], [cx - 46, by - 46], [cx - 38, by - 20]
        ], 4);
        fillWaxCrayon(c, bibPts, "#fcf0d4", 102, { withBase: false, coverage: 0.96, toothAlpha: 0.42, clumpAlpha: 0.14 });

        // Cute tiny red smile dip between eyes (Gen-1 signature!)
        const noseDipPts = sampleSmoothLoop([
          [cx - 10, by - 84], [cx + 22, by - 84], [cx + 20, by - 70], [cx + 6, by - 66], [cx - 8, by - 70]
        ], 3);
        fillWaxCrayon(c, noseDipPts, "#de2b1c", 103, { withBase: false, coverage: 0.94, toothAlpha: 0.45 });

        // Green pepper stem on top with warm brown collar crease
        const stemPts = sampleSmoothLoop([
          [cx - 12, by - 140], [cx - 16, by - 170], [cx - 22, by - 188],
          [cx - 2, by - 190], [cx + 8, by - 168], [cx + 14, by - 140]
        ], 3);
        fillWaxCrayon(c, stemPts, "#2d8e4b", 104, { coverage: 0.92, toothAlpha: 0.50 });
        strokeWaxCrayon(c, [[cx - 16, by - 140], [cx, by - 136], [cx + 16, by - 140]], "#542a18", 4.0, 105, false);

        // Little Gen-1 zig-zag crease on left hip
        strokeWaxCrayon(c, [
          [cx - 64, by - 66], [cx - 50, by - 54], [cx - 42, by - 64], [cx - 32, by - 58]
        ], "#4a2216", 4.2, 106, false);

        // Green eyes with cream glints (soft crayon circles, NO heavy dark outlines!)
        fillWaxCrayon(c, makeEllipsePts(cx - 2, by - 82, 12.5, 13.5, 20, 107), "#268f56", 107, { withBase: false, coverage: 0.95, toothAlpha: 0.35 });
        fillWaxCrayon(c, makeEllipsePts(cx + 42, by - 82, 10.5, 12.5, 20, 108), "#268f56", 108, { withBase: false, coverage: 0.95, toothAlpha: 0.35 });
        fillWaxCrayon(c, makeEllipsePts(cx - 1, by - 82, 4.8, 5.2, 14, 109), "#fbf5e4", 109, { withBase: false, coverage: 0.98, toothAlpha: 0.15 });
        fillWaxCrayon(c, makeEllipsePts(cx + 43, by - 82, 4.0, 4.8, 14, 110), "#fbf5e4", 110, { withBase: false, coverage: 0.98, toothAlpha: 0.15 });

        // Soft rosy cheek smudges (NO outline)
        fillWaxCrayon(c, makeEllipsePts(cx - 22, by - 62, 11.5, 9.5, 16, 111), "#d88a84", 111, { withBase: false, coverage: 0.85, toothAlpha: 0.40 });
        fillWaxCrayon(c, makeEllipsePts(cx + 56, by - 64, 9.5, 9.0, 16, 112), "#d88a84", 112, { withBase: false, coverage: 0.85, toothAlpha: 0.40 });

        // Stubby little rounded paws at bottom
        fillWaxCrayon(c, makeEllipsePts(cx - 24, by - 16, 13, 9, 16, 113), "#d89586", 113, { withBase: false, coverage: 0.90, toothAlpha: 0.38 });
        fillWaxCrayon(c, makeEllipsePts(cx + 44, by - 15, 10, 7, 16, 114), "#d89586", 114, { withBase: false, coverage: 0.90, toothAlpha: 0.38 });
        fillWaxCrayon(c, makeEllipsePts(cx - 56, by - 19, 10, 6.5, 16, 115), "#d89586", 115, { withBase: false, coverage: 0.90, toothAlpha: 0.38 });
      })
    }];

    // ---------- 2. LEMON CHICK (闪电鸡) — Whole Gen-1 crayon drawing on ONE cardboard standee ----------
    const lemonOuterPts = sampleSmoothLoop([
      [cx - 6, by - 140], [cx - 20, by - 166], [cx + 2, by - 178], [cx + 22, by - 204],
      [cx + 16, by - 172], [cx + 32, by - 172], [cx + 10, by - 140],
      [cx + 46, by - 128], [cx + 68, by - 94], [cx + 78, by - 60], [cx + 70, by - 28],
      [cx + 38, by - 12], [cx, by - 10], [cx - 42, by - 12],
      [cx - 72, by - 28], [cx - 76, by - 66], [cx - 62, by - 104], [cx - 38, by - 130]
    ], 4);

    layers.lemon = [{
      zOff: 0,
      cv: makeCardboardSlab(S, S, lemonOuterPts, { thickX: 11, thickY: 8, lip: 3.5, seed: 201 }, (c) => {
        // Plump bright yellow body in continuous wax crayon
        fillWaxCrayon(c, lemonOuterPts, "#ffd91c", 201, { coverage: 0.93, toothAlpha: 0.56, clumpAlpha: 0.20 });

        // Blue lightning-bolt crest on top
        const boltPts = sampleSmoothLoop([
          [cx - 8, by - 140], [cx - 20, by - 166], [cx + 2, by - 178], [cx + 22, by - 204],
          [cx + 16, by - 172], [cx + 32, by - 172], [cx + 10, by - 140]
        ], 3);
        fillWaxCrayon(c, boltPts, "#23a2ef", 202, { coverage: 0.93, toothAlpha: 0.45, lw: 3.6, ol: "#134e94" });

        // Soft cream belly patch at bottom (no outline, blended crayon edge!)
        const bellyPts = makeEllipsePts(cx - 4, by - 32, 48, 30, 24, 203, 0.03);
        fillWaxCrayon(c, bellyPts, "#fff8e0", 203, { withBase: false, coverage: 0.96, toothAlpha: 0.40, clumpAlpha: 0.10 });

        // Cute white eye ovals (no black border!) -> bright blue rings -> dark pupils
        fillWaxCrayon(c, makeEllipsePts(cx - 28, by - 90, 15, 17, 20, 204), "#fffdf6", 204, { withBase: false, coverage: 0.98, toothAlpha: 0.20 });
        fillWaxCrayon(c, makeEllipsePts(cx + 18, by - 90, 16, 17, 20, 205), "#fffdf6", 205, { withBase: false, coverage: 0.98, toothAlpha: 0.20 });
        fillWaxCrayon(c, makeEllipsePts(cx - 27, by - 90, 9.5, 11, 18, 206), "#1f92e6", 206, { withBase: false, coverage: 0.96, toothAlpha: 0.24 });
        fillWaxCrayon(c, makeEllipsePts(cx + 17, by - 90, 10, 11, 18, 207), "#1f92e6", 207, { withBase: false, coverage: 0.96, toothAlpha: 0.24 });
        fillWaxCrayon(c, makeEllipsePts(cx - 27, by - 90, 4.8, 5.5, 14, 208), "#153263", 208, { withBase: false, coverage: 0.98, toothAlpha: 0.1 });
        fillWaxCrayon(c, makeEllipsePts(cx + 17, by - 90, 5.0, 5.5, 14, 209), "#153263", 209, { withBase: false, coverage: 0.98, toothAlpha: 0.1 });

        // Rosy warm-tan cheek blushes (no outline!)
        fillWaxCrayon(c, makeEllipsePts(cx - 48, by - 66, 11, 8.5, 16, 210), "#e0a042", 210, { withBase: false, coverage: 0.85, toothAlpha: 0.42 });
        fillWaxCrayon(c, makeEllipsePts(cx + 38, by - 66, 12, 9.0, 16, 211), "#e0a042", 211, { withBase: false, coverage: 0.85, toothAlpha: 0.42 });

        // Cute orange beak with textured crayon line
        const beakPts = sampleSmoothLoop([[cx - 18, by - 74], [cx - 4, by - 86], [cx + 10, by - 74], [cx - 4, by - 64]], 3);
        fillWaxCrayon(c, beakPts, "#eeab38", 212, { withBase: false, coverage: 0.95, toothAlpha: 0.35, lw: 3.0 });
        strokeWaxCrayon(c, [[cx - 14, by - 73], [cx - 4, by - 70], [cx + 6, by - 73]], OL, 2.8, 213, false);
      })
    }];

    // ---------- 3. BLUEBERRY OWL (蓝莓枭) — Whole Gen-1 crayon drawing on ONE cardboard standee ----------
    const owlOuterPts = sampleSmoothLoop([
      [cx - 64, by - 114], [cx - 64, by - 166], [cx - 32, by - 146],
      [cx - 14, by - 160], [cx - 2, by - 148], [cx + 12, by - 160], [cx + 28, by - 146],
      [cx + 64, by - 162], [cx + 64, by - 110],
      [cx + 76, by - 62], [cx + 68, by - 26], [cx + 38, by - 12], [cx, by - 12],
      [cx - 42, by - 12], [cx - 72, by - 32], [cx - 76, by - 72]
    ], 4);

    layers.blueberry = [{
      zOff: 0,
      cv: makeCardboardSlab(S, S, owlOuterPts, { thickX: 11, thickY: 8, lip: 3.5, seed: 301 }, (c) => {
        // Deep blueberry crayon body
        fillWaxCrayon(c, owlOuterPts, "#18418c", 301, { coverage: 0.94, toothAlpha: 0.50, clumpAlpha: 0.24 });

        // Cream owl face mask (blended softly with crayon tooth, NO heavy outer seam!)
        const maskPts = sampleSmoothLoop([
          [cx - 56, by - 96], [cx - 42, by - 128], [cx - 14, by - 126], [cx, by - 110],
          [cx + 16, by - 126], [cx + 46, by - 126], [cx + 56, by - 94],
          [cx + 40, by - 62], [cx, by - 56], [cx - 40, by - 62]
        ], 4);
        fillWaxCrayon(c, maskPts, "#fbf0da", 302, { withBase: false, coverage: 0.96, toothAlpha: 0.44, clumpAlpha: 0.14 });

        // Soft peach cheek smudges inside mask
        fillWaxCrayon(c, makeEllipsePts(cx - 42, by - 82, 9, 8, 14, 303), "#eed1ae", 303, { withBase: false, coverage: 0.78 });
        fillWaxCrayon(c, makeEllipsePts(cx + 42, by - 82, 9, 8, 14, 304), "#eed1ae", 304, { withBase: false, coverage: 0.78 });

        // Owl eyes (blue crayon iris + dark center + textured crayon ring)
        fillWaxCrayon(c, makeEllipsePts(cx - 24, by - 94, 15.5, 16.5, 20, 305), "#649be0", 305, { withBase: false, coverage: 0.95, toothAlpha: 0.30, lw: 3.2 });
        fillWaxCrayon(c, makeEllipsePts(cx + 22, by - 94, 15.5, 16.5, 20, 306), "#649be0", 306, { withBase: false, coverage: 0.95, toothAlpha: 0.30, lw: 3.2 });
        fillWaxCrayon(c, makeEllipsePts(cx - 24, by - 94, 8.5, 9.2, 16, 307), "#1d1a30", 307, { withBase: false, coverage: 0.98, toothAlpha: 0.14 });
        fillWaxCrayon(c, makeEllipsePts(cx + 22, by - 94, 8.5, 9.2, 16, 308), "#1d1a30", 308, { withBase: false, coverage: 0.98, toothAlpha: 0.14 });

        // Small beak
        const beakPts = sampleSmoothLoop([[cx - 12, by - 76], [cx - 1, by - 88], [cx + 10, by - 76], [cx - 1, by - 64]], 3);
        fillWaxCrayon(c, beakPts, "#f0d4ac", 309, { withBase: false, coverage: 0.95, lw: 2.8 });
        strokeWaxCrayon(c, [[cx - 9, by - 75], [cx - 1, by - 73], [cx + 7, by - 75]], OL, 2.4, 310, false);

        // Five cute sky-blue belly polka dots (NO outlines)
        [[-30, -40], [-4, -42], [22, -40], [-16, -24], [12, -24]].forEach(([dx, dy], idx) => {
          fillWaxCrayon(c, makeEllipsePts(cx + dx, by + dy, 8.5, 7.2, 16, 315 + idx), "#6fa8e8", 315 + idx, { withBase: false, coverage: 0.92, toothAlpha: 0.32 });
        });

        // Subtle tucked wing stroke + tiny feet
        strokeWaxCrayon(c, [[cx + 42, by - 58], [cx + 56, by - 50], [cx + 68, by - 36]], OL, 3.0, 322, false);
        fillWaxCrayon(c, makeEllipsePts(cx - 28, by - 13, 10, 6.5, 14, 323), "#f0cfa8", 323, { withBase: false, coverage: 0.94 });
        fillWaxCrayon(c, makeEllipsePts(cx + 22, by - 13, 10, 6.5, 14, 324), "#f0cfa8", 324, { withBase: false, coverage: 0.94 });
      })
    }];

    // ---------- 4. SLIMES (z1 green, z2 blue, z3 orange) — Whole Gen-1 crayon drawings on ONE cardboard standee ----------
    const makeSlime = (mainCol, shadeCol, spotCol, seed, variant) => {
      let ctrl;
      if (variant === "flame") {
        ctrl = [
          [cx - 6, by - 132], [cx - 28, by - 156], [cx - 16, by - 178], [cx + 2, by - 196],
          [cx + 18, by - 176], [cx + 30, by - 156], [cx + 12, by - 130],
          [cx + 46, by - 116], [cx + 68, by - 68], [cx + 66, by - 22], [cx, by - 10],
          [cx - 66, by - 22], [cx - 68, by - 68], [cx - 46, by - 116]
        ];
      } else {
        ctrl = [
          [cx - 4, by - 126], [cx - 12, by - 144], [cx - 34, by - 148], [cx - 24, by - 164], [cx - 2, by - 144],
          [cx + 22, by - 164], [cx + 32, by - 148], [cx + 10, by - 142], [cx + 6, by - 124],
          [cx + 46, by - 112], [cx + 68, by - 66], [cx + 66, by - 22], [cx, by - 10],
          [cx - 66, by - 22], [cx - 68, by - 66], [cx - 46, by - 112]
        ];
      }
      const slimeOuter = sampleSmoothLoop(ctrl, 4);

      return [{
        zOff: 0,
        cv: makeCardboardSlab(S, S, slimeOuter, { thickX: 11, thickY: 8, lip: 3.5, seed }, (c) => {
          fillWaxCrayon(c, slimeOuter, mainCol, seed + 1, { coverage: 0.93, toothAlpha: 0.54, clumpAlpha: 0.22 });

          // Flame or leaf top tint (soft crayon blend)
          if (variant === "flame") {
            const innerFlame = sampleSmoothLoop([[cx - 14, by - 136], [cx, by - 172], [cx + 16, by - 136]], 3);
            fillWaxCrayon(c, innerFlame, spotCol, seed + 2, { withBase: false, coverage: 0.92, toothAlpha: 0.35 });
          } else {
            const leafTop = sampleSmoothLoop([
              [cx - 4, by - 126], [cx - 12, by - 144], [cx - 34, by - 148], [cx - 24, by - 164], [cx - 2, by - 144],
              [cx + 22, by - 164], [cx + 32, by - 148], [cx + 10, by - 142], [cx + 6, by - 124]
            ], 3);
            fillWaxCrayon(c, leafTop, spotCol, seed + 2, { withBase: false, coverage: 0.90, toothAlpha: 0.38 });
          }

          // Darker wavy bottom ooze band (NO heavy outline!)
          const oozePts = sampleSmoothLoop([
            [cx - 66, by - 36], [cx - 40, by - 46], [cx - 16, by - 32], [cx + 10, by - 46],
            [cx + 36, by - 32], [cx + 66, by - 40], [cx + 64, by - 18], [cx, by - 10], [cx - 64, by - 18]
          ], 4);
          fillWaxCrayon(c, oozePts, shadeCol, seed + 4, { withBase: false, coverage: 0.92, toothAlpha: 0.36 });

          // Expressive Gen-1 eyes
          fillWaxCrayon(c, makeEllipsePts(cx - 22, by - 78, 15, 16, 18, seed + 5), "#fbf6e6", seed + 5, { withBase: false, coverage: 0.96, lw: 3.0 });
          fillWaxCrayon(c, makeEllipsePts(cx + 22, by - 78, 15, 16, 18, seed + 6), "#fbf6e6", seed + 6, { withBase: false, coverage: 0.96, lw: 3.0 });
          fillWaxCrayon(c, makeEllipsePts(cx - 21, by - 77, 7, 7.5, 14, seed + 7), variant === "flame" ? "#24182c" : shadeCol, seed + 7, { withBase: false, coverage: 0.98 });
          fillWaxCrayon(c, makeEllipsePts(cx + 21, by - 77, 7, 7.5, 14, seed + 8), variant === "flame" ? "#24182c" : shadeCol, seed + 8, { withBase: false, coverage: 0.98 });

          // Soft blush cheeks
          fillWaxCrayon(c, makeEllipsePts(cx - 42, by - 60, 10, 8, 14, seed + 9), "#a68594", seed + 9, { withBase: false, coverage: 0.55 });
          fillWaxCrayon(c, makeEllipsePts(cx + 42, by - 60, 10, 8, 14, seed + 10), "#a68594", seed + 10, { withBase: false, coverage: 0.55 });

          // Cute toothy grin
          const mouthPts = sampleSmoothLoop([[cx - 26, by - 52], [cx + 26, by - 52], [cx + 20, by - 32], [cx - 20, by - 32]], 3);
          fillWaxCrayon(c, mouthPts, "#2c1e34", seed + 11, { withBase: false, coverage: 0.96, lw: 2.6 });
          fillWaxCrayon(c, makeEllipsePts(cx - 10, by - 46, 5.5, 5, 12, seed + 12), "#fbf5e4", seed + 12, { withBase: false, coverage: 0.98 });
          fillWaxCrayon(c, makeEllipsePts(cx + 10, by - 46, 5.5, 5, 12, seed + 13), "#fbf5e4", seed + 13, { withBase: false, coverage: 0.98 });
          fillWaxCrayon(c, makeEllipsePts(cx + 4, by - 34, 11, 5.5, 12, seed + 14), "#b46874", seed + 14, { withBase: false, coverage: 0.85 });

          // Blue slime's iconic X band-aid on right cheek!
          if (variant === "bandaid") {
            strokeWaxCrayon(c, [[cx + 42, by - 64], [cx + 58, by - 48]], "#fbf5e4", 8.5, seed + 15, false);
            strokeWaxCrayon(c, [[cx + 58, by - 64], [cx + 42, by - 48]], "#fbf5e4", 8.5, seed + 16, false);
            strokeWaxCrayon(c, [[cx + 42, by - 64], [cx + 58, by - 48]], OL, 2.2, seed + 17, false);
            strokeWaxCrayon(c, [[cx + 58, by - 64], [cx + 42, by - 48]], OL, 2.2, seed + 18, false);
          }
        })
      }];
    };

    layers.z1 = makeSlime("#82db40", "#4f9f22", "#a8ee68", 401, "leaf");
    layers.z2 = makeSlime("#5ec2f8", "#2d82c9", "#92dcff", 431, "bandaid");
    layers.z3 = makeSlime("#ff541f", "#bd2712", "#d89c42", 461, "flame");

    // ---------- 5. NEST CHICK (小鸡窝) — ONE unified crayon-drawn standee ----------
    const eggOuter = sampleSmoothLoop([
      [cx - 68, by - 80], [cx - 52, by - 132], [cx, by - 148], [cx + 52, by - 132],
      [cx + 68, by - 80], [cx + 62, by - 22], [cx, by - 12], [cx - 62, by - 22]
    ], 4);

    layers.egg = [{
      zOff: 0,
      cv: makeCardboardSlab(S, S, eggOuter, { thickX: 11, thickY: 8, lip: 3.5, seed: 501 }, (c) => {
        fillWaxCrayon(c, eggOuter, "#ffa828", 501, { coverage: 0.93, toothAlpha: 0.52 });
        const shellPts = sampleSmoothLoop([
          [cx - 66, by - 60], [cx - 38, by - 42], [cx - 14, by - 66], [cx + 10, by - 40],
          [cx + 36, by - 66], [cx + 66, by - 48], [cx + 60, by - 18], [cx, by - 12], [cx - 60, by - 18]
        ], 3);
        fillWaxCrayon(c, shellPts, "#fff4d8", 502, { withBase: false, coverage: 0.96, lw: 3.0 });

        fillWaxCrayon(c, makeEllipsePts(cx - 20, by - 96, 11.5, 12.5, 16, 503), "#fffdf6", 503, { withBase: false, coverage: 0.98, lw: 2.6 });
        fillWaxCrayon(c, makeEllipsePts(cx + 20, by - 96, 11.5, 12.5, 16, 504), "#fffdf6", 504, { withBase: false, coverage: 0.98, lw: 2.6 });
        fillWaxCrayon(c, makeEllipsePts(cx - 19, by - 96, 6, 6.5, 14, 505), "#24183a", 505, { withBase: false, coverage: 0.98 });
        fillWaxCrayon(c, makeEllipsePts(cx + 19, by - 96, 6, 6.5, 14, 506), "#24183a", 506, { withBase: false, coverage: 0.98 });
        const beakPts = sampleSmoothLoop([[cx - 11, by - 82], [cx + 11, by - 82], [cx, by - 66]], 3);
        fillWaxCrayon(c, beakPts, "#ff6e1c", 507, { withBase: false, coverage: 0.95, lw: 2.6 });
      })
    }];

    // ---------- 6. TREES — ONE whole crayon-drawn tree on ONE cardboard standee (NOT multi-piece!) ----------
    const treeOuter = sampleSmoothLoop([
      [cx - 15, by], [cx - 13, by - 78],
      [cx - 56, by - 84], [cx - 74, by - 122], [cx - 56, by - 166],
      [cx, by - 182], [cx + 56, by - 166], [cx + 74, by - 122], [cx + 56, by - 84],
      [cx + 14, by - 78], [cx + 16, by]
    ], 4);

    layers.tree = [{
      zOff: 0,
      cv: makeCardboardSlab(S, S, treeOuter, { thickX: 11, thickY: 8, lip: 3.5, seed: 601 }, (c) => {
        // Warm crayon brown trunk (continuous fill, blends softly under canopy)
        const trunkPts = sampleSmoothLoop([[cx - 16, by], [cx - 13, by - 86], [cx + 14, by - 86], [cx + 16, by]], 3);
        fillWaxCrayon(c, trunkPts, "#9c6438", 601, { coverage: 0.94, toothAlpha: 0.54 });
        strokeWaxCrayon(c, [[cx - 4, by - 14], [cx - 3, by - 58]], "#5e361a", 2.4, 602, false);
        strokeWaxCrayon(c, [[cx + 5, by - 26], [cx + 6, by - 68]], "#5e361a", 2.2, 603, false);

        // Whole puffy green crayon canopy (single unified shape, darker lower shade + lighter crown + red apples, NO stacked slab cuts!)
        const crownPts = sampleSmoothLoop([
          [cx - 56, by - 84], [cx - 74, by - 122], [cx - 56, by - 166],
          [cx, by - 182], [cx + 56, by - 166], [cx + 74, by - 122], [cx + 56, by - 84], [cx, by - 76]
        ], 4);
        fillWaxCrayon(c, crownPts, "#68c442", 604, { withBase: false, coverage: 0.94, toothAlpha: 0.56, clumpAlpha: 0.22 });
        // Soft sunlit top-left wax highlight (no outline!)
        fillWaxCrayon(c, makeEllipsePts(cx - 10, by - 142, 46, 30, 24, 605), "#8be25c", 605, { withBase: false, coverage: 0.65, toothAlpha: 0.45 });
        // Soft canopy bottom curve stroke so trunk & canopy separate naturally like a crayon sketch
        strokeWaxCrayon(c, [[cx - 54, by - 84], [cx, by - 76], [cx + 54, by - 84]], "#2d4c24", 3.4, 606, false);

        // Cute crayon apples (soft dark crayon outline)
        fillWaxCrayon(c, makeEllipsePts(cx - 26, by - 136, 10, 10.5, 16, 607), "#eb4434", 607, { withBase: false, coverage: 0.95, lw: 2.4 });
        fillWaxCrayon(c, makeEllipsePts(cx + 22, by - 124, 9.5, 10, 16, 608), "#eb4434", 608, { withBase: false, coverage: 0.95, lw: 2.4 });
        fillWaxCrayon(c, makeEllipsePts(cx - 2, by - 104, 9, 9.5, 16, 609), "#eb4434", 609, { withBase: false, coverage: 0.95, lw: 2.4 });
      })
    }];

    // ---------- 7. BUSH — ONE whole crayon-drawn bush on ONE cardboard standee ----------
    const bushOuter = makeEllipsePts(cx, by - 38, 64, 38, 30, 701, 0.08);
    layers.bush = [{
      zOff: 0,
      cv: makeCardboardSlab(S, S, bushOuter, { thickX: 10, thickY: 7, lip: 3.5, seed: 701 }, (c) => {
        fillWaxCrayon(c, bushOuter, "#62bd3e", 701, { coverage: 0.93, toothAlpha: 0.56 });
        fillWaxCrayon(c, makeEllipsePts(cx - 8, by - 46, 44, 24, 22, 702), "#8ae058", 702, { withBase: false, coverage: 0.65, toothAlpha: 0.44 });
        fillWaxCrayon(c, makeEllipsePts(cx - 20, by - 44, 8.5, 8, 14, 703), "#ff88ba", 703, { withBase: false, coverage: 0.95, lw: 2.2 });
        fillWaxCrayon(c, makeEllipsePts(cx + 18, by - 34, 8, 8, 14, 704), "#ffe054", 704, { withBase: false, coverage: 0.95, lw: 2.2 });
      })
    }];

    // ---------- 8. ROCK, SIGNPOST, FENCE — ONE whole cardboard standee each ----------
    const rockOuter = sampleSmoothLoop([[cx - 56, by], [cx - 42, by - 56], [cx + 10, by - 66], [cx + 54, by - 26], [cx + 46, by + 2]], 4);
    layers.rock = [{
      zOff: 0,
      cv: makeCardboardSlab(S, S, rockOuter, { thickX: 10, thickY: 7, lip: 3.5, seed: 720 }, (c) => {
        fillWaxCrayon(c, rockOuter, "#9c9488", 720, { coverage: 0.93, toothAlpha: 0.55 });
        fillWaxCrayon(c, sampleSmoothLoop([[cx - 32, by - 16], [cx - 22, by - 50], [cx + 16, by - 54], [cx + 28, by - 24]], 3), "#cbc2b6", 721, { withBase: false, coverage: 0.72, toothAlpha: 0.45 });
      })
    }];

    const signOuter = sampleSmoothLoop([
      [cx - 8, by], [cx - 8, by - 54], [cx - 42, by - 54], [cx - 42, by - 94],
      [cx + 28, by - 96], [cx + 54, by - 74], [cx + 28, by - 52],
      [cx + 8, by - 52], [cx + 8, by]
    ], 3);
    layers.sign = [{
      zOff: 0,
      cv: makeCardboardSlab(S, S, signOuter, { thickX: 9, thickY: 7, lip: 3.5, seed: 740 }, (c) => {
        const signPost = sampleSmoothLoop([[cx - 8, by], [cx - 7, by - 60], [cx + 8, by - 60], [cx + 8, by]], 3);
        const signBoard = sampleSmoothLoop([[cx - 42, by - 94], [cx + 28, by - 96], [cx + 54, by - 74], [cx + 28, by - 52], [cx - 42, by - 54]], 3);
        fillWaxCrayon(c, signPost, "#966034", 740, { coverage: 0.94, toothAlpha: 0.50 });
        fillWaxCrayon(c, signBoard, "#f0c268", 741, { withBase: false, coverage: 0.95, toothAlpha: 0.50, lw: 3.0 });
      })
    }];

    const fenceOuter = sampleSmoothLoop([
      [cx - 84, by - 20], [cx - 84, by - 68], [cx - 70, by - 68], [cx - 60, by - 88], [cx - 48, by - 68],
      [cx - 30, by - 68], [cx - 20, by - 88], [cx - 10, by - 68],
      [cx + 10, by - 68], [cx + 20, by - 88], [cx + 30, by - 68],
      [cx + 48, by - 68], [cx + 60, by - 88], [cx + 70, by - 68],
      [cx + 84, by - 68], [cx + 84, by - 20], [cx + 70, by - 20], [cx + 70, by],
      [cx + 50, by], [cx + 50, by - 20], [cx + 30, by - 20], [cx + 30, by],
      [cx + 10, by], [cx + 10, by - 20], [cx - 10, by - 20], [cx - 10, by],
      [cx - 30, by], [cx - 30, by - 20], [cx - 50, by - 20], [cx - 50, by],
      [cx - 70, by], [cx - 70, by - 20]
    ], 2);
    layers.fence = [{
      zOff: 0,
      cv: makeCardboardSlab(S, S, fenceOuter, { thickX: 9, thickY: 7, lip: 3.5, seed: 760 }, (c) => {
        fillWaxCrayon(c, sampleSmoothLoop([[cx - 84, by - 36], [cx + 84, by - 38], [cx + 84, by - 20], [cx - 84, by - 20]], 2), "#d49854", 760, { coverage: 0.94, lw: 2.4 });
        fillWaxCrayon(c, sampleSmoothLoop([[cx - 84, by - 68], [cx + 84, by - 68], [cx + 84, by - 52], [cx - 84, by - 52]], 2), "#e4ae68", 761, { withBase: false, coverage: 0.94, lw: 2.4 });
        [-60, -20, 20, 60].forEach((px, idx) => {
          const pPts = sampleSmoothLoop([[cx + px - 10, by], [cx + px - 9, by - 72], [cx + px, by - 88], [cx + px + 9, by - 72], [cx + px + 10, by]], 2);
          fillWaxCrayon(c, pPts, "#f2c682", 770 + idx, { withBase: false, coverage: 0.95, lw: 2.6 });
        });
      })
    }];

    return layers;
  }

  window.PaperCraft = {
    hash, jit, sampleSmoothLoop, makeEllipsePts, tracePoly,
    strokeWaxCrayon, fillWaxCrayon, makeCardboardSlab, buildCardboardStandees
  };
})();
