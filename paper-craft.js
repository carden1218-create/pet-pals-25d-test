(() => {
  "use strict";

  const TAU = Math.PI * 2;
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
        const n1 = vnoise(x, y, 22, 11);
        const n2 = vnoise(x, y, 7, 37);
        const n3 = vnoise(x, y, 3, 61);
        const n4 = hash(x * 13 + y * 97, 73);
        const tooth = n1 * 0.28 + n2 * 0.34 + n3 * 0.22 + n4 * 0.16;

        if (tooth > 0.51) {
          const a = Math.min(255, Math.round((tooth - 0.51) * 760));
          d[idx] = 255; d[idx + 1] = 252; d[idx + 2] = 238; d[idx + 3] = a;
        }
        if (tooth < 0.45) {
          const a = Math.min(230, Math.round((0.45 - tooth) * 440));
          dd[idx] = 36; dd[idx + 1] = 22; dd[idx + 2] = 10; dd[idx + 3] = a;
        }
        if (tooth > 0.62) {
          const a = Math.min(235, Math.round((tooth - 0.62) * 760));
          od[idx] = 0; od[idx + 1] = 0; od[idx + 2] = 0; od[idx + 3] = a;
        }
      }
    }
    tc.putImageData(img, 0, 0);
    dc.putImageData(imgD, 0, 0);
    oc.putImageData(imgO, 0, 0);
  }

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

    tracePoly(g, pts, closed);
    g.strokeStyle = col;
    g.lineWidth = lw;
    g.globalAlpha = 0.92;
    g.stroke();

    tracePoly(g, pts.map(([x, y], i) => [x + jit(i, seed + 17) * 1.4, y + jit(i + 5, seed + 31) * 1.4]), closed);
    g.lineWidth = lw * 0.72;
    g.globalAlpha = 0.45;
    g.stroke();

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

    if (opts.withBase !== false) {
      c.fillStyle = opts.toothCol || "#fbf4e0";
      c.fillRect(minX - 4, minY - 4, w + 8, h + 8);
    }

    c.globalAlpha = opts.coverage ?? 0.92;
    c.fillStyle = col;
    c.fillRect(minX - 4, minY - 4, w + 8, h + 8);

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

    if (opts.softEdge !== false) {
      tracePoly(c, pts);
      c.strokeStyle = col;
      c.globalAlpha = 0.35;
      c.lineWidth = opts.edgeW || 3.0;
      c.lineJoin = "round";
      c.stroke();
    }

    c.restore();

    // Optional soft uneven wax bleed slightly outside the line (real hand-colored crayon!)
    if (opts.bleed) {
      c.save();
      c.globalAlpha = opts.bleedAlpha ?? 0.28;
      tracePoly(c, pts.map(([x, y], i) => [x + jit(i, seed + 53) * 5.0, y + jit(i + 9, seed + 61) * 5.0]));
      c.strokeStyle = col;
      c.lineWidth = opts.bleedW ?? 5.5;
      c.lineJoin = "round";
      c.stroke();
      c.restore();
    }

    const lw = opts.lw ?? 0;
    if (lw > 0) {
      strokeWaxCrayon(c, pts, opts.ol || OL, lw, seed, true);
    }
  }

  // Dilate an opaque mask uniformly by `padPx` to produce a clean die-cut cardboard silhouette!
  function dilateMask(srcMask, padPx) {
    const w = srcMask.width, h = srcMask.height;
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    const oc = out.getContext("2d");
    oc.drawImage(srcMask, 0, 0);
    if (padPx <= 0) return out;
    const rings = [padPx * 0.55, padPx];
    for (const r of rings) {
      const n = r === padPx ? 16 : 8;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        oc.drawImage(srcMask, Math.cos(a) * r, Math.sin(a) * r);
      }
    }
    // Convert to pure solid black silhouette
    oc.globalCompositeOperation = "source-in";
    oc.fillStyle = "#000";
    oc.fillRect(0, 0, w, h);
    return out;
  }

  // Build a unified 3D corrugated brown cardboard standee from ANY silhouette mask + front art drawer!
  function makeCardboardStandeeFromMask(w, h, innerMask, opts = {}, drawFrontArtFn = null) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const c = cv.getContext("2d");

    const thickX = opts.thickX ?? 11;
    const thickY = opts.thickY ?? 8;
    const lip = opts.lip ?? 3.5;

    const boardMask = dilateMask(innerMask, lip);

    // 1. Extruded thick brown corrugated cardboard side wall with outer kraft liners + wavy flute core!
    const steps = Math.max(10, Math.round(Math.hypot(thickX, thickY)));
    const stepMasks = ["#331908", "#5e3616", "#8c592c", "#b8824d"].map((col) => {
      const m = document.createElement("canvas");
      m.width = w; m.height = h;
      const mc = m.getContext("2d");
      mc.drawImage(boardMask, 0, 0);
      mc.globalCompositeOperation = "source-in";
      mc.fillStyle = col;
      mc.fillRect(0, 0, w, h);
      return m;
    });

    for (let sIdx = steps; sIdx >= 1; sIdx--) {
      const t = sIdx / steps;
      // Outer back liner (last 2 steps), inner hollow channel (middle steps), front liner (first 2 steps)
      const idx = (sIdx >= steps - 1) ? 0 : (sIdx <= 2 ? 3 : (t > 0.5 ? 1 : 2));
      c.drawImage(stepMasks[idx], thickX * t, thickY * t);
    }

    // 2. Real corrugated flute wave & kraft fiber mottling inside the extruded cardboard edge
    const wallMask = document.createElement("canvas");
    wallMask.width = w; wallMask.height = h;
    const wc = wallMask.getContext("2d");
    for (let sIdx = steps; sIdx >= 1; sIdx--) {
      const t = sIdx / steps;
      wc.drawImage(boardMask, thickX * t, thickY * t);
    }
    wc.globalCompositeOperation = "destination-out";
    wc.drawImage(boardMask, 0, 0);

    const wallArt = document.createElement("canvas");
    wallArt.width = w; wallArt.height = h;
    const ac = wallArt.getContext("2d");
    // Dark hollow core + mottled kraft variation
    ac.fillStyle = "#3a1d0b";
    ac.fillRect(0, 0, w, h);
    for (let mi = 0; mi < 160; mi++) {
      const mx = hash(mi * 7, 13) * w, my = hash(mi * 11, 29) * h;
      ac.fillStyle = mi % 2 ? "rgba(182, 126, 72, 0.25)" : "rgba(38, 18, 6, 0.28)";
      ac.beginPath(); ac.ellipse(mx, my, 8, 5, 0, 0, TAU); ac.fill();
    }

    // Scan outer perimeter and draw continuous angled corrugated flute waves between top/bottom liners!
    const bmData = boardMask.getContext("2d").getImageData(0, 0, w, h).data;
    const cellSz = 4.5;
    const cols = Math.ceil(w / cellSz);
    const seen = new Uint8Array(cols * Math.ceil(h / cellSz));
    const wallAng = Math.atan2(thickY, thickX);

    ac.lineCap = "round";
    ac.lineJoin = "round";
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (bmData[(y * w + x) * 4 + 3] < 140) continue;
        const up = bmData[((y - 1) * w + x) * 4 + 3] < 140;
        const dn = bmData[((y + 1) * w + x) * 4 + 3] < 140;
        const lf = bmData[(y * w + (x - 1)) * 4 + 3] < 140;
        const rt = bmData[(y * w + (x + 1)) * 4 + 3] < 140;
        if (!up && !dn && !lf && !rt) continue;

        const bIdx = Math.floor(y / cellSz) * cols + Math.floor(x / cellSz);
        if (seen[bIdx]) continue;
        seen[bIdx] = 1;

        // Draw diagonal corrugated wave rib spanning from front liner (x,y) to back liner (x+thickX, y+thickY)
        const x0 = x + thickX * 0.12, y0 = y + thickY * 0.12;
        const x1 = x + thickX * 0.88, y1 = y + thickY * 0.88;
        const xm = (x0 + x1) * 0.5 - Math.sin(wallAng) * 2.2;
        const ym = (y0 + y1) * 0.5 + Math.cos(wallAng) * 2.2;
        ac.strokeStyle = "#220e04";
        ac.lineWidth = 3.2;
        ac.beginPath(); ac.moveTo(x0, y0); ac.lineTo(xm, ym); ac.lineTo(x1, y1); ac.stroke();
        ac.strokeStyle = "#dba469";
        ac.lineWidth = 1.6;
        ac.beginPath(); ac.moveTo(x0 + 1.2, y0 - 0.8); ac.lineTo(xm + 1.2, ym - 0.8); ac.lineTo(x1 + 1.2, y1 - 0.8); ac.stroke();
      }
    }

    // Outer back kraft liner sheet + dark cut edge
    ac.globalCompositeOperation = "destination-in";
    ac.drawImage(wallMask, 0, 0);
    c.drawImage(wallArt, 0, 0);

    // Highlighted kraft liner strip along back rim
    const backLiner = dilateMask(boardMask, 1.5);
    const blc = backLiner.getContext("2d");
    blc.globalCompositeOperation = "source-in";
    blc.fillStyle = "#aa7642";
    blc.fillRect(0, 0, w, h);
    blc.globalCompositeOperation = "destination-out";
    blc.drawImage(boardMask, -1.8, -1.5);
    c.drawImage(backLiner, thickX * 0.88, thickY * 0.88);

    const backRim = dilateMask(boardMask, 1.4);
    const brc = backRim.getContext("2d");
    brc.globalCompositeOperation = "source-in";
    brc.fillStyle = "#331a08";
    brc.fillRect(0, 0, w, h);
    brc.globalCompositeOperation = "destination-out";
    brc.drawImage(boardMask, 0, 0);
    c.drawImage(backRim, thickX, thickY);

    // 3. Front kraft-brown cardboard face with realistic light/dark kraft mottling + frayed wood fibers!
    const frontBoard = document.createElement("canvas");
    frontBoard.width = w; frontBoard.height = h;
    const fc = frontBoard.getContext("2d");
    fc.fillStyle = "#c9925a";
    fc.fillRect(0, 0, w, h);
    for (let i = 0; i < 48; i++) {
      const mx = hash(i * 7, 11) * w, my = hash(i * 13, 23) * h;
      fc.fillStyle = i % 2 ? "rgba(156, 102, 52, 0.22)" : "rgba(224, 182, 132, 0.22)";
      fc.beginPath(); fc.ellipse(mx, my, 14, 9, hash(i, 5) * 3, 0, TAU); fc.fill();
    }
    for (let i = 0; i < 240; i++) {
      const fx = hash(i * 3, 17) * w, fy = hash(i * 5, 31) * h;
      fc.fillStyle = i % 3 === 0 ? "rgba(62, 34, 14, 0.22)" : (i % 2 ? "rgba(96, 56, 24, 0.16)" : "rgba(244, 218, 178, 0.20)");
      fc.fillRect(fx, fy, 2.8, 1.2);
    }
    fc.globalCompositeOperation = "destination-in";
    fc.drawImage(boardMask, 0, 0);

    const frontRim = dilateMask(boardMask, 1.3);
    const frc = frontRim.getContext("2d");
    frc.globalCompositeOperation = "source-in";
    frc.fillStyle = "#482a12";
    frc.fillRect(0, 0, w, h);
    c.drawImage(frontRim, 0, 0);
    c.drawImage(frontBoard, 0, 0);

    // 4. Glue front art cleanly on top of the cardboard face!
    if (drawFrontArtFn) drawFrontArtFn(c);

    return cv;
  }

  function makeCardboardSlab(w, h, silhouettePts, opts = {}, drawFrontArtFn = null) {
    const innerMask = document.createElement("canvas");
    innerMask.width = w; innerMask.height = h;
    const mc = innerMask.getContext("2d");
    tracePoly(mc, silhouettePts);
    mc.fillStyle = "#000";
    mc.fill();

    return makeCardboardStandeeFromMask(w, h, innerMask, opts, (c) => {
      if (drawFrontArtFn) {
        c.save();
        tracePoly(c, silhouettePts);
        c.clip();
        c.fillStyle = "#fcf5e3";
        c.fillRect(0, 0, w, h);
        drawFrontArtFn(c);
        c.restore();
        if (opts.outerOl !== false) {
          strokeWaxCrayon(c, silhouettePts, opts.ol || OL, opts.outerLw ?? 4.2, opts.seed || 7, true);
        }
      }
    });
  }

  // Turn an ORIGINAL Gen-1 sprite (.webp) into a 3D standing corrugated cardboard cutout figure!
  function makeSpriteCardboardStandee(img, opts = {}) {
    const S = 260;
    const cx = S * 0.5, by = S - 24;

    // 1. Scan opaque bounds of original sprite so it stands flush on the base tab
    const rawCv = document.createElement("canvas");
    rawCv.width = img.naturalWidth || img.width;
    rawCv.height = img.naturalHeight || img.height;
    const rc = rawCv.getContext("2d");
    rc.drawImage(img, 0, 0);
    const rawData = rc.getImageData(0, 0, rawCv.width, rawCv.height).data;

    let minX = rawCv.width, minY = rawCv.height, maxX = -1, maxY = -1;
    for (let y = 0; y < rawCv.height; y++) {
      for (let x = 0; x < rawCv.width; x++) {
        const idx = (y * rawCv.width + x) * 4;
        const a = rawData[idx + 3];
        const lum = (rawData[idx] + rawData[idx + 1] + rawData[idx + 2]) / 3;
        // Strip faint translucent white/gray anti-alias fringe outside the dark crayon outline
        if (a < 85 && lum > 105) {
          rawData[idx + 3] = 0;
          continue;
        }
        if (a >= 75) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    rc.putImageData(new ImageData(rawData, rawCv.width, rawCv.height), 0, 0);

    const bw = Math.max(1, maxX - minX + 1);
    const bh = Math.max(1, maxY - minY + 1);
    const maxW = opts.maxW ?? 172;
    const maxH = opts.maxH ?? 186;
    const scale = Math.min(maxW / bw, maxH / bh);
    const dw = bw * scale;
    const dh = bh * scale;
    const dx = cx - dw * 0.5;
    const dy = by - dh;

    // 2. Render scaled original Gen-1 sprite onto 260x260 canvas
    const spriteCv = document.createElement("canvas");
    spriteCv.width = S; spriteCv.height = S;
    const sc = spriteCv.getContext("2d");
    sc.drawImage(rawCv, minX, minY, bw, bh, dx, dy, dw, dh);

    // 3. Build solid alpha silhouette mask directly from the original sprite
    const innerMask = document.createElement("canvas");
    innerMask.width = S; innerMask.height = S;
    const mc = innerMask.getContext("2d");
    mc.drawImage(spriteCv, 0, 0);
    mc.globalCompositeOperation = "source-in";
    mc.fillStyle = "#000";
    mc.fillRect(0, 0, S, S);

    // 4. Glue original Gen-1 crayon sprite directly onto thick die-cut corrugated cardboard!
    return makeCardboardStandeeFromMask(S, S, innerMask, {
      thickX: opts.thickX ?? 14,
      thickY: opts.thickY ?? 10,
      lip: opts.lip ?? 4.2
    }, (c) => {
      c.drawImage(spriteCv, 0, 0);
    });
  }

  /* ================= Standee Library (Gen-1 Sprites + Matching Crayon Props) ================= */
  let readyCallbacks = [];
  let isReady = false;

  function whenReady(fn) {
    if (isReady) fn();
    else readyCallbacks.push(fn);
  }

  function buildCardboardStandees() {
    const S = 260;
    const cx = S * 0.5, by = S - 24;
    const layers = {};

    // 1. World props (ONE whole heavy real-crayon shape per standee on thick corrugated cardboard!)
    const treeOuter = sampleSmoothLoop([
      [cx - 17, by], [cx - 14, by - 66],
      [cx - 42, by - 68], [cx - 66, by - 92], [cx - 72, by - 122], [cx - 58, by - 154],
      [cx - 28, by - 174], [cx, by - 180], [cx + 28, by - 174],
      [cx + 58, by - 154], [cx + 72, by - 122], [cx + 66, by - 92], [cx + 42, by - 68],
      [cx + 15, by - 66], [cx + 18, by]
    ], 4);

    layers.tree = [{
      zOff: 0,
      cv: makeCardboardSlab(S, S, treeOuter, { thickX: 11, thickY: 8, lip: 3.8, seed: 601, ol: "#322118", outerLw: 4.8 }, (c) => {
        const trunkPts = sampleSmoothLoop([[cx - 19, by], [cx - 14, by - 76], [cx + 15, by - 76], [cx + 20, by]], 3);
        fillWaxCrayon(c, trunkPts, "#925a32", 601, { coverage: 0.88, toothAlpha: 0.72, clumpAlpha: 0.34, bleed: true, bleedW: 4 });
        fillWaxCrayon(c, sampleSmoothLoop([[cx + 2, by - 4], [cx + 4, by - 72], [cx + 15, by - 72], [cx + 18, by - 4]], 2), "#6e4020", 602, { withBase: false, coverage: 0.55, toothAlpha: 0.45 });
        strokeWaxCrayon(c, [[cx - 5, by - 8], [cx - 4, by - 56]], "#452412", 2.8, 602, false);
        strokeWaxCrayon(c, [[cx + 6, by - 16], [cx + 6, by - 60]], "#452412", 2.6, 603, false);

        const crownPts = sampleSmoothLoop([
          [cx - 42, by - 68], [cx - 66, by - 92], [cx - 72, by - 122], [cx - 58, by - 154],
          [cx - 28, by - 174], [cx, by - 180], [cx + 28, by - 174],
          [cx + 58, by - 154], [cx + 72, by - 122], [cx + 66, by - 92], [cx + 42, by - 68], [cx, by - 62]
        ], 4);
        fillWaxCrayon(c, crownPts, "#5cb43e", 604, { withBase: false, coverage: 0.87, toothAlpha: 0.74, clumpAlpha: 0.36 });
        // Rich crayon colour variation (sunlit chartreuse top-left + deep leafy green lower-right)
        fillWaxCrayon(c, makeEllipsePts(cx - 16, by - 142, 46, 28, 22, 605, 0.08), "#8ae05a", 605, { withBase: false, coverage: 0.62, toothAlpha: 0.58 });
        fillWaxCrayon(c, makeEllipsePts(cx + 22, by - 94, 42, 24, 22, 610, 0.09), "#3d8c28", 610, { withBase: false, coverage: 0.52, toothAlpha: 0.55 });
        // Sketchy crayon leaf doodles inside canopy
        strokeWaxCrayon(c, [[cx - 44, by - 72], [cx, by - 62], [cx + 44, by - 72]], "#2b4a20", 3.8, 606, false);
        strokeWaxCrayon(c, [[cx - 42, by - 116], [cx - 30, by - 124], [cx - 20, by - 114]], "#387826", 2.6, 611, false);
        strokeWaxCrayon(c, [[cx + 22, by - 134], [cx + 34, by - 142], [cx + 42, by - 132]], "#387826", 2.6, 612, false);

        // Bright crayon apple (with subtle warm wax highlight)
        fillWaxCrayon(c, makeEllipsePts(cx - 2, by - 122, 16, 15, 18, 607), "#e83424", 607, { withBase: false, coverage: 0.90, toothAlpha: 0.52, lw: 3.2, bleed: true, bleedW: 3 });
        strokeWaxCrayon(c, [[cx - 2, by - 137], [cx, by - 147]], "#3d2214", 2.8, 608, false);
        fillWaxCrayon(c, sampleSmoothLoop([[cx, by - 142], [cx + 12, by - 150], [cx + 10, by - 138]], 2), "#66c844", 609, { withBase: false, coverage: 0.90, lw: 2.2 });
      })
    }];

    const bushOuter = sampleSmoothLoop([
      [cx - 60, by - 12], [cx - 66, by - 36], [cx - 44, by - 66], [cx - 12, by - 74],
      [cx + 16, by - 74], [cx + 48, by - 64], [cx + 66, by - 34], [cx + 58, by - 12], [cx, by - 6]
    ], 4);
    layers.bush = [{
      zOff: 0,
      cv: makeCardboardSlab(S, S, bushOuter, { thickX: 10, thickY: 7, lip: 3.8, seed: 701, ol: "#322118", outerLw: 4.5 }, (c) => {
        fillWaxCrayon(c, bushOuter, "#54ad38", 701, { coverage: 0.87, toothAlpha: 0.74, clumpAlpha: 0.34 });
        fillWaxCrayon(c, makeEllipsePts(cx - 12, by - 48, 44, 22, 22, 702, 0.08), "#85de56", 702, { withBase: false, coverage: 0.62, toothAlpha: 0.55 });
        fillWaxCrayon(c, makeEllipsePts(cx + 18, by - 24, 38, 16, 20, 705, 0.08), "#3a8824", 705, { withBase: false, coverage: 0.48, toothAlpha: 0.50 });
        fillWaxCrayon(c, makeEllipsePts(cx - 20, by - 42, 9, 8.5, 14, 703), "#ff84ba", 703, { withBase: false, coverage: 0.90, toothAlpha: 0.45, lw: 2.4 });
        fillWaxCrayon(c, makeEllipsePts(cx + 18, by - 32, 8.5, 8.5, 14, 704), "#ffe24e", 704, { withBase: false, coverage: 0.90, toothAlpha: 0.45, lw: 2.4 });
      })
    }];

    const rockOuter = sampleSmoothLoop([[cx - 56, by], [cx - 42, by - 56], [cx + 10, by - 66], [cx + 54, by - 26], [cx + 46, by + 2]], 4);
    layers.rock = [{
      zOff: 0,
      cv: makeCardboardSlab(S, S, rockOuter, { thickX: 10, thickY: 7, lip: 3.5, seed: 720, ol: "#362822", outerLw: 4.5 }, (c) => {
        fillWaxCrayon(c, rockOuter, "#9a9184", 720, { coverage: 0.88, toothAlpha: 0.72, clumpAlpha: 0.34 });
        fillWaxCrayon(c, sampleSmoothLoop([[cx - 34, by - 16], [cx - 24, by - 50], [cx + 16, by - 54], [cx + 28, by - 24]], 3), "#d4cabd", 721, { withBase: false, coverage: 0.68, toothAlpha: 0.56 });
        fillWaxCrayon(c, makeEllipsePts(cx + 22, by - 12, 22, 12, 14, 722), "#7a8c58", 722, { withBase: false, coverage: 0.45, toothAlpha: 0.50 });
        strokeWaxCrayon(c, [[cx - 18, by - 14], [cx + 6, by - 22], [cx + 26, by - 16]], "#4b4238", 2.4, 723, false);
      })
    }];

    const signOuter = sampleSmoothLoop([
      [cx - 8, by], [cx - 8, by - 54], [cx - 42, by - 54], [cx - 42, by - 94],
      [cx + 28, by - 96], [cx + 54, by - 74], [cx + 28, by - 52],
      [cx + 8, by - 52], [cx + 8, by]
    ], 3);
    layers.sign = [{
      zOff: 0,
      cv: makeCardboardSlab(S, S, signOuter, { thickX: 9, thickY: 7, lip: 3.5, seed: 740, ol: "#3a2414", outerLw: 4.2 }, (c) => {
        const signPost = sampleSmoothLoop([[cx - 8, by], [cx - 7, by - 60], [cx + 8, by - 60], [cx + 8, by]], 3);
        const signBoard = sampleSmoothLoop([[cx - 42, by - 94], [cx + 28, by - 96], [cx + 54, by - 74], [cx + 28, by - 52], [cx - 42, by - 54]], 3);
        fillWaxCrayon(c, signPost, "#966034", 740, { coverage: 0.88, toothAlpha: 0.70, clumpAlpha: 0.32 });
        fillWaxCrayon(c, signBoard, "#f2c468", 741, { withBase: false, coverage: 0.90, toothAlpha: 0.68, clumpAlpha: 0.28, lw: 3.2 });
        strokeWaxCrayon(c, [[cx - 24, by - 74], [cx + 26, by - 74], [cx + 16, by - 82]], "#7a441e", 2.8, 742, false);
        strokeWaxCrayon(c, [[cx + 26, by - 74], [cx + 16, by - 66]], "#7a441e", 2.8, 743, false);
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
      cv: makeCardboardSlab(S, S, fenceOuter, { thickX: 9, thickY: 7, lip: 3.5, seed: 760, ol: "#3a2414", outerLw: 4.2 }, (c) => {
        fillWaxCrayon(c, sampleSmoothLoop([[cx - 84, by - 36], [cx + 84, by - 38], [cx + 84, by - 20], [cx - 84, by - 20]], 2), "#cc904c", 760, { coverage: 0.88, toothAlpha: 0.68, lw: 2.6 });
        fillWaxCrayon(c, sampleSmoothLoop([[cx - 84, by - 68], [cx + 84, by - 68], [cx + 84, by - 52], [cx - 84, by - 52]], 2), "#dfaa64", 761, { withBase: false, coverage: 0.88, toothAlpha: 0.68, lw: 2.6 });
        [-60, -20, 20, 60].forEach((px, idx) => {
          const pPts = sampleSmoothLoop([[cx + px - 10, by], [cx + px - 9, by - 72], [cx + px, by - 88], [cx + px + 9, by - 72], [cx + px + 10, by]], 2);
          fillWaxCrayon(c, pPts, "#f0c480", 770 + idx, { withBase: false, coverage: 0.90, toothAlpha: 0.66, lw: 2.8 });
          strokeWaxCrayon(c, [[cx + px - 2, by - 10], [cx + px - 1, by - 46]], "#9e6632", 1.8, 780 + idx, false);
        });
      })
    }];

    // 2. ORIGINAL GEN-1 CHARACTER SPRITES glued onto corrugated cardboard standees!
    const spriteSpecs = [
      ["chili",     "assets/pets/chili-1.webp",     { maxW: 174, maxH: 186 }],
      ["lemon",     "assets/pets/lemon-1.webp",     { maxW: 168, maxH: 192 }],
      ["blueberry", "assets/pets/blueberry-1.webp", { maxW: 168, maxH: 184 }],
      ["z1",        "assets/enemies/z-1.webp",      { maxW: 158, maxH: 182 }],
      ["z2",        "assets/enemies/z-2.webp",      { maxW: 158, maxH: 182 }],
      ["z3",        "assets/enemies/z-3.webp",      { maxW: 162, maxH: 194 }],
      ["egg",       "assets/fx/hen-egg.webp",       { maxW: 164, maxH: 178 }]
    ];

    Promise.all(spriteSpecs.map(([key, src, opts]) => new Promise((resolve) => {
      const im = new Image();
      im.onload = () => {
        layers[key] = [{ zOff: 0, cv: makeSpriteCardboardStandee(im, opts) }];
        resolve();
      };
      im.onerror = () => resolve();
      im.src = src;
    }))).then(() => {
      isReady = true;
      for (const fn of readyCallbacks) fn();
      readyCallbacks = [];
    });

    return layers;
  }

  // Procedural Soft Crumpled Paper Overlay (organic curved wrinkles, gentle light/shadow facets, no geometric glass shards)
  function drawCrumpledPaperOverlay(c, w, h, seed = 404, opts = {}) {
    ensureToothTextures();
    const cell = opts.cell ?? 112;
    const strength = opts.strength ?? 1.0;
    const isColoredSurface = !!opts.coloredSurface;
    const zScale = cell * 0.42;
    const cols = Math.ceil(w / cell) + 3;
    const rows = Math.ceil(h / cell) + 3;

    const grid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let q = 0; q < cols; q++) {
        const bx = (q - 1) * cell;
        const by = (r - 1) * cell;
        const jx = (hash(q * 19 + r * 37, seed) - 0.5) * cell * 0.85;
        const jy = (hash(q * 41 + r * 13, seed + 5) - 0.5) * cell * 0.85;
        const hz = hash(q * 29 + r * 53, seed + 11);
        row.push([bx + jx, by + jy, hz]);
      }
      grid.push(row);
    }

    const tris = [];
    const edges = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let q = 0; q < cols - 1; q++) {
        const p00 = grid[r][q], p10 = grid[r][q + 1];
        const p01 = grid[r + 1][q], p11 = grid[r + 1][q + 1];
        edges.push([p00, p10, q * 7 + r]);
        edges.push([p00, p01, q * 13 + r]);
        if (hash(q * 17 + r * 31, seed + 19) > 0.5) {
          tris.push([p00, p10, p11]);
          tris.push([p00, p11, p01]);
          edges.push([p00, p11, q * 23 + r]);
        } else {
          tris.push([p00, p10, p01]);
          tris.push([p10, p11, p01]);
          edges.push([p10, p01, q * 29 + r]);
        }
      }
    }

    c.save();
    // 1. Soft, subtle faceted light/shadow paper folds (low contrast so it never looks like glass shards)
    for (let i = 0; i < tris.length; i++) {
      const [a, b, d] = tris[i];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = (b[2] - a[2]) * zScale;
      const vx = d[0] - a[0], vy = d[1] - a[1], vz = (d[2] - a[2]) * zScale;
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const len = Math.max(1e-4, Math.hypot(nx, ny, nz));
      const tilt = ((nx / len) * -0.72 + (ny / len) * -0.68 + (nz / len) * 0.14) - 0.14;
      const ridge = (a[2] + b[2] + d[2]) / 3;

      c.beginPath();
      c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.closePath();

      if (tilt > 0.04) {
        c.fillStyle = `rgba(255, 253, 245, ${Math.min(0.10, tilt * 0.18 * strength)})`;
        c.fill();
      } else if (tilt < -0.04) {
        c.fillStyle = `rgba(72, 58, 36, ${Math.min(0.075, -tilt * 0.13 * strength)})`;
        c.fill();
      }
      if (isColoredSurface) {
        if (ridge > 0.57) {
          c.fillStyle = `rgba(36, 56, 18, ${Math.min(0.06, (ridge - 0.57) * 0.14 * strength)})`;
          c.fill();
        } else if (ridge < 0.42) {
          c.fillStyle = `rgba(255, 251, 236, ${Math.min(0.09, (0.42 - ridge) * 0.22 * strength)})`;
          c.fill();
        }
      }
    }

    // 2. Organic wavy paper creases (only stronger folds, soft translucent curves — NO harsh straight dark lines)
    c.lineCap = "round";
    c.lineJoin = "round";
    for (let i = 0; i < edges.length; i++) {
      const [pA, pB, eSeed] = edges[i];
      const dz = Math.abs(pA[2] - pB[2]);
      if (dz < 0.34) continue;
      const aNorm = Math.min(1, (dz - 0.34) * 2.1) * strength;
      const dx = pB[0] - pA[0], dy = pB[1] - pA[1];
      const len = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / len, ny = dx / len;
      const bend1 = (hash(eSeed, seed + 31) - 0.5) * 14;
      const bend2 = (hash(eSeed, seed + 47) - 0.5) * 14;
      const p1x = pA[0] + dx * 0.33 + nx * bend1, p1y = pA[1] + dy * 0.33 + ny * bend1;
      const p2x = pA[0] + dx * 0.67 + nx * bend2, p2y = pA[1] + dy * 0.67 + ny * bend2;

      // Soft shadowed paper wrinkle
      c.strokeStyle = `rgba(76, 62, 42, ${(isColoredSurface ? 0.08 : 0.095) * aNorm})`;
      c.lineWidth = 1.2 + dz * 0.5;
      c.beginPath();
      c.moveTo(pA[0], pA[1]);
      c.bezierCurveTo(p1x, p1y, p2x, p2y, pB[0], pB[1]);
      c.stroke();

      // Gentle highlight / crayon-skip beside the wrinkle
      c.strokeStyle = isColoredSurface
        ? `rgba(255, 252, 238, ${0.18 * aNorm})`
        : `rgba(255, 254, 248, ${0.24 * aNorm})`;
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(pA[0] + 1.5, pA[1] + 1.3);
      c.bezierCurveTo(p1x + 1.5, p1y + 1.3, p2x + 1.5, p2y + 1.3, pB[0] + 1.5, pB[1] + 1.3);
      c.stroke();
    }

    // 3. Soft paper-tooth grain across folds
    const pat = c.createPattern(toothPatCanvas, "repeat");
    c.globalAlpha = (isColoredSurface ? 0.14 : 0.16) * strength;
    c.fillStyle = pat;
    c.fillRect(0, 0, w, h);
    c.restore();
  }

  // Paint realistic kraft paper mottling + pulp fibers inside current clip
  function paintKraftMottle(c, minX, minY, w, h, seed = 101, shadeBias = 0) {
    c.save();
    for (let i = 0; i < 26; i++) {
      const mx = minX + hash(i * 7, seed + 3) * w;
      const my = minY + hash(i * 11, seed + 7) * h;
      const rx = 12 + hash(i, seed + 11) * 28;
      const ry = 6 + hash(i, seed + 17) * 14;
      c.fillStyle = i % 2 === 0
        ? `rgba(222, 178, 126, ${0.18 + Math.max(0, shadeBias) * 0.08})`
        : `rgba(112, 66, 28, ${0.18 + Math.max(0, -shadeBias) * 0.10})`;
      c.beginPath(); c.ellipse(mx, my, rx, ry, hash(i, seed) * 2, 0, TAU); c.fill();
    }
    for (let i = 0; i < 160; i++) {
      const fx = minX + hash(i * 13, seed + 23) * w;
      const fy = minY + hash(i * 17, seed + 29) * h;
      c.fillStyle = i % 3 === 0 ? "rgba(58, 32, 12, 0.24)" : "rgba(242, 212, 170, 0.22)";
      c.fillRect(fx, fy, 2.5 + hash(i, seed + 31) * 3.0, 1.1);
    }
    c.restore();
  }

  // Draw authentic corrugated cardboard cross-section along an exposed wall mask:
  // two kraft liner sheets + continuous sinusoidal flute wave + directional sunlit/shaded contrast + dents + peeled tabs
  function drawCorrugatedWallFlutes(fc, layerPts, yOff, layerH, seed, minX, maxX) {
    const samples = [];
    let totalLen = 0;
    for (let i = 0; i < layerPts.length; i++) {
      const p0 = layerPts[i], p1 = layerPts[(i + 1) % layerPts.length];
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
      const seg = Math.hypot(dx, dy);
      if (seg < 0.5) continue;
      // Outward normal for clockwise loop (or detect downward-facing front walls where dx > 0 on bottom edge)
      const nX = dy / seg, nY = -dx / seg;
      const nSub = Math.max(1, Math.ceil(seg / 2.2));
      for (let k = 0; k < nSub; k++) {
        const t = k / nSub;
        const x = p0[0] + dx * t;
        const y = p0[1] + dy * t;
        const dentWave = Math.sin(totalLen * 0.025 + seed) * 0.10 + (hash(Math.floor(totalLen / 44), seed + 9) > 0.85 ? -0.24 : 0);
        const localH = Math.max(7.5, layerH * (0.96 + dentWave));
        samples.push({ x, y, s: totalLen, h: localH, nX, nY });
        totalLen += seg / nSub;
      }
    }
    if (samples.length < 3) return;

    fc.lineCap = "round";
    fc.lineJoin = "round";

    // 1. Hollow inner corrugated channel (deep warm umber #3b1c09, not pure black!)
    fc.strokeStyle = "#3b1c09";
    fc.lineWidth = layerH * 0.54;
    fc.beginPath();
    samples.forEach((pt, idx) => {
      const yy = pt.y + yOff + pt.h * 0.52;
      if (idx === 0) fc.moveTo(pt.x, yy); else fc.lineTo(pt.x, yy);
    });
    fc.stroke();

    // 2. Continuous sinusoidal corrugated flute wave (~10.5px pitch, softer organic kraft contrast)
    const waveFreq = 0.60;
    const wavePts = samples.map((pt) => {
      const phase = pt.s * waveFreq + seed * 0.7;
      // Occasional subtle flattened/crushed stretch where wave amplitude dips
      const crush = hash(Math.floor(pt.s / 55), seed + 17) > 0.86 ? 0.55 : 1.0;
      const amp = pt.h * 0.23 * crush;
      return { x: pt.x, y: pt.y + yOff + pt.h * 0.52 + Math.sin(phase) * amp, nx: pt.x };
    });

    // Shaded underside of flute wave
    fc.strokeStyle = "#6e3e1a";
    fc.lineWidth = 2.6;
    fc.beginPath();
    wavePts.forEach((pt, idx) => idx === 0 ? fc.moveTo(pt.x, pt.y + 0.85) : fc.lineTo(pt.x, pt.y + 0.85));
    fc.stroke();

    // Sunlit kraft flute ribbon (gradient from warm tan left-sunlit to shaded caramel right)
    const fluteGrad = fc.createLinearGradient(minX, 0, maxX, 0);
    fluteGrad.addColorStop(0, "#e3b278");
    fluteGrad.addColorStop(0.55, "#c99056");
    fluteGrad.addColorStop(1, "#9d6838");
    fc.strokeStyle = fluteGrad;
    fc.lineWidth = 1.85;
    fc.beginPath();
    wavePts.forEach((pt, idx) => idx === 0 ? fc.moveTo(pt.x, pt.y) : fc.lineTo(pt.x, pt.y));
    fc.stroke();

    // 3. Prominent top & bottom kraft liner sheets sandwiching the corrugated wave!
    const topLinerGrad = fc.createLinearGradient(minX, 0, maxX, 0);
    topLinerGrad.addColorStop(0, "#d7a872");
    topLinerGrad.addColorStop(0.6, "#be8a52");
    topLinerGrad.addColorStop(1, "#986435");
    fc.strokeStyle = topLinerGrad;
    fc.lineWidth = Math.max(2.6, layerH * 0.24);
    fc.beginPath();
    samples.forEach((pt, idx) => {
      const yy = pt.y + yOff + layerH * 0.14;
      if (idx === 0) fc.moveTo(pt.x, yy); else fc.lineTo(pt.x, yy);
    });
    fc.stroke();

    fc.strokeStyle = "#8a562a";
    fc.lineWidth = Math.max(2.4, layerH * 0.21);
    fc.beginPath();
    samples.forEach((pt, idx) => {
      const yy = pt.y + yOff + pt.h * 0.88;
      if (idx === 0) fc.moveTo(pt.x, yy); else fc.lineTo(pt.x, yy);
    });
    fc.stroke();

    // 4. Subtle peeled top-liner flaps + frayed kraft fibers on front-facing edges
    for (let i = 18; i < samples.length - 18; i += 34) {
      const pt = samples[i];
      if (hash(i, seed + 41) > 0.62) {
        fc.fillStyle = "#dfb37b";
        fc.strokeStyle = "#522f14";
        fc.lineWidth = 1.05;
        fc.beginPath();
        fc.moveTo(pt.x - 5.5, pt.y + yOff + 1.2);
        fc.lineTo(pt.x + 3.5, pt.y + yOff - 2.8);
        fc.lineTo(pt.x + 8.5, pt.y + yOff + 2.2);
        fc.closePath();
        fc.fill(); fc.stroke();
      }
      fc.strokeStyle = "rgba(232, 198, 152, 0.55)";
      fc.lineWidth = 1.0;
      fc.beginPath();
      fc.moveTo(pt.x, pt.y + yOff + pt.h * 0.32);
      fc.lineTo(pt.x + (hash(i, seed + 7) - 0.5) * 5.5, pt.y + yOff + pt.h * 0.32 + 4.8);
      fc.stroke();
    }
  }

  window.PaperCraft = {
    hash, jit, sampleSmoothLoop, makeEllipsePts, tracePoly,
    strokeWaxCrayon, fillWaxCrayon, makeCardboardSlab,
    buildCardboardStandees, whenReady, drawCrumpledPaperOverlay, paintKraftMottle, drawCorrugatedWallFlutes
  };
})();
