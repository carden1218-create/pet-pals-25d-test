(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const OL = "#2b2038";

  function hash(a, b) {
    let n = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b ^ 0xc2b2ae35, 0x27d4eb2f);
    n ^= n >>> 15;
    n = Math.imul(n, 0x2c1b3c6d);
    n ^= n >>> 12;
    return (n >>> 0) / 4294967296;
  }
  function jit(i, s) { return hash(i * 7 + 3, s * 13 + 1) - 0.5; }

  function makeTornPoints(pts, seed, macroAmp = 6.5, microAmp = 2.8, subdiv = 4) {
    const out = [];
    const n = pts.length;
    let idx = 0;
    for (let i = 0; i < n; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % n];
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
      const len = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / len, ny = dx / len;
      for (let s = 0; s < subdiv; s++) {
        const t = s / subdiv;
        const bx = p0[0] + dx * t, by = p0[1] + dy * t;
        const mOff = (hash(idx, seed) - 0.46) * macroAmp * (s === 0 ? 0.55 : 1.15);
        const fOff = (hash(idx + 97, seed + 31) - 0.5) * microAmp;
        const tOff = (hash(idx + 53, seed + 71) - 0.5) * (microAmp * 0.6);
        out.push([
          bx + nx * (mOff + fOff) + (dx / len) * tOff,
          by + ny * (mOff + fOff) + (dy / len) * tOff
        ]);
        idx++;
      }
    }
    return out;
  }

  function makeIrregularBlobPts(cx, cy, rx, ry, seed, n = 12, wobble = 0.20) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + jit(i, seed + 5) * 0.15;
      const rMod = 1 + (hash(i * 3, seed) - 0.45) * wobble * 2;
      pts.push([cx + Math.cos(a) * rx * rMod, cy + Math.sin(a) * ry * rMod]);
    }
    return pts;
  }

  function tracePoly(c, pts) {
    c.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) c.moveTo(pts[i][0], pts[i][1]);
      else c.lineTo(pts[i][0], pts[i][1]);
    }
    c.closePath();
  }

  function fillCoarseCrayon(c, pts, col, seed, opts = {}) {
    const basePaper = opts.paperCol || "#fbf6e6";
    const strokeW = opts.strokeW || 10;
    const step = opts.step || 7;
    const density = opts.density ?? 0.85;
    const darkCol = opts.shadeCol || null;

    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const p of pts) {
      if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1];
      if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1];
    }

    c.save();
    tracePoly(c, pts);
    c.clip();

    c.fillStyle = basePaper;
    c.fillRect(minX - 6, minY - 6, maxX - minX + 12, maxY - minY + 12);

    if (opts.crease !== false) {
      const cy1 = minY + (maxY - minY) * (0.28 + hash(seed, 11) * 0.44);
      const cy2 = minY + (maxY - minY) * (0.28 + hash(seed, 29) * 0.44);
      c.strokeStyle = "rgba(118, 98, 74, 0.18)";
      c.lineWidth = 2.4;
      c.beginPath();
      c.moveTo(minX - 4, cy1);
      c.lineTo((minX + maxX) * 0.5, (cy1 + cy2) * 0.5 + (hash(seed, 43) - 0.5) * 14);
      c.lineTo(maxX + 4, cy2);
      c.stroke();
      c.strokeStyle = "rgba(255, 255, 255, 0.50)";
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(minX - 4, cy1 + 2.2);
      c.lineTo(maxX + 4, cy2 + 2.2);
      c.stroke();
    }

    if (col) {
      const spanX = maxX - minX + 20, spanY = maxY - minY + 20;
      const diagAng = (opts.angle ?? -0.55) + jit(seed, 3) * 0.22;
      const cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5;
      const rad = Math.hypot(spanX, spanY) * 0.66;

      c.save();
      c.translate(cx, cy);
      c.rotate(diagAng);
      c.lineCap = "round";

      let si = 0;
      for (let y = -rad; y <= rad; y += step) {
        si++;
        if (hash(si, seed) > density + 0.14) continue;
        const x0 = -rad + jit(si, seed + 1) * 10;
        const x1 = rad + jit(si, seed + 2) * 10;
        const segs = 3;
        for (let g = 0; g < segs; g++) {
          if (hash(si * 7 + g, seed + 17) > density) continue;
          const sx0 = x0 + ((x1 - x0) * g) / segs + jit(g, si) * 4;
          const sx1 = x0 + ((x1 - x0) * (g + 0.94)) / segs;
          c.strokeStyle = col;
          c.globalAlpha = 0.78 + hash(si + g, seed + 9) * 0.22;
          c.lineWidth = strokeW * (0.72 + hash(si, g + seed) * 0.50);
          c.beginPath();
          c.moveTo(sx0, y + jit(g, seed) * 3.0);
          c.lineTo(sx1, y + jit(g + 3, seed) * 3.0);
          c.stroke();
        }
      }

      if (darkCol) {
        c.strokeStyle = darkCol;
        for (let y = 0; y <= rad; y += step * 1.4) {
          c.globalAlpha = 0.45;
          c.lineWidth = strokeW * 0.65;
          c.beginPath();
          c.moveTo(-rad * 0.75, y + 4);
          c.lineTo(rad * 0.85, y - 6);
          c.stroke();
        }
      }

      const speckCount = Math.min(280, Math.round((spanX * spanY) / 40));
      for (let k = 0; k < speckCount; k++) {
        const px = (hash(k * 3, seed + 11) - 0.5) * rad * 1.8;
        const py = (hash(k * 5, seed + 23) - 0.5) * rad * 1.8;
        const r = 1.1 + hash(k, seed + 41) * 2.2;
        c.fillStyle = k % 3 === 0 ? basePaper : col;
        c.globalAlpha = k % 3 === 0 ? 0.58 : 0.46;
        c.fillRect(px, py, r, r * 0.85);
      }
      c.restore();
    }

    c.restore();
  }

  function drawTornPaperPiece(c, rawPts, opts = {}) {
    const seed = opts.seed || 17;
    const torn = makeTornPoints(rawPts, seed, opts.macroAmp ?? 6.5, opts.microAmp ?? 2.8, opts.subdiv ?? 4);
    const rim = opts.rim ?? 5.5;
    const fibers = opts.fibers !== false;

    if (opts.corrugated) {
      const offX = opts.corrX ?? 6, offY = opts.corrY ?? 5;
      const corrPts = torn.map(([x, y]) => [x + offX, y + offY]);
      c.save();
      tracePoly(c, corrPts);
      c.fillStyle = "#dfd1b4";
      c.fill();
      c.clip();
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
      for (const p of corrPts) {
        if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1];
        if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1];
      }
      c.strokeStyle = "#8a7558";
      c.lineWidth = 2.1;
      for (let gx = minX - 4; gx <= maxX + 4; gx += 6) {
        c.beginPath(); c.moveTo(gx, minY - 4); c.lineTo(gx, maxY + 4); c.stroke();
      }
      c.restore();
      c.save();
      tracePoly(c, corrPts);
      c.strokeStyle = "#5c4a38";
      c.lineWidth = 1.7;
      c.stroke();
      c.restore();
    }

    if (rim > 0) {
      let cx = 0, cy = 0;
      for (const p of torn) { cx += p[0]; cy += p[1]; }
      cx /= torn.length; cy /= torn.length;

      const pulpPts = torn.map(([x, y], i) => {
        const dx = x - cx, dy = y - cy;
        const d = Math.max(1, Math.hypot(dx, dy));
        const rExtra = rim * (0.65 + hash(i * 5, seed + 88) * 1.05);
        return [x + (dx / d) * rExtra, y + (dy / d) * rExtra];
      });

      c.save();
      tracePoly(c, pulpPts);
      c.fillStyle = "#f9f3e2";
      c.fill();
      c.strokeStyle = "#c8bca2";
      c.lineWidth = 1.3;
      c.stroke();

      if (fibers) {
        c.strokeStyle = "#fffdf6";
        c.lineWidth = 1.7;
        c.lineCap = "round";
        for (let i = 0; i < pulpPts.length; i += 2) {
          const p = pulpPts[i];
          const dx = p[0] - cx, dy = p[1] - cy;
          const d = Math.max(1, Math.hypot(dx, dy));
          const fl = 2.5 + hash(i, seed + 123) * 4.5;
          const angJit = (hash(i + 7, seed) - 0.5) * 0.65;
          const ux = dx / d, uy = dy / d;
          c.beginPath();
          c.moveTo(p[0], p[1]);
          c.lineTo(p[0] + (ux - uy * angJit) * fl, p[1] + (uy + ux * angJit) * fl);
          c.stroke();
        }
      }
      c.restore();
    }

    fillCoarseCrayon(c, torn, opts.col, seed, opts);

    const lw = opts.lw ?? 2.6;
    if (lw > 0) {
      c.save();
      c.lineJoin = "round";
      c.lineCap = "round";
      tracePoly(c, torn);
      c.strokeStyle = opts.ol || OL;
      c.lineWidth = lw;
      c.stroke();
      c.globalAlpha = 0.42;
      c.lineWidth = lw * 0.58;
      tracePoly(c, torn.map(([x, y], i) => [x + jit(i, seed + 51) * 1.8, y + jit(i + 9, seed + 61) * 1.8]));
      c.stroke();
      c.restore();
    }
  }

  function makeLayerCanvas(w, h, drawFn) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const c = cv.getContext("2d");
    drawFn(c, w, h);
    return cv;
  }

  function buildLayeredStandees() {
    const S = 260;
    const cx = S * 0.5, by = S - 22;
    const layers = {};

    // Clean sticker-cut options for crisp small eyes/cheeks/beaks!
    const crisp = { macroAmp: 1.5, microAmp: 0.7, subdiv: 2, rim: 1.5, fibers: false, strokeW: 9, step: 4.5, density: 0.98, crease: false };

    // ---------- 1. CHILI MOUSE (椒椒鼠) — bold chunky 5-layer torn-paper craft ----------
    layers.chili = [
      { zOff: -0.07, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx, by - 90, 82, 78, 101, 13, 0.16), {
          col: "#d84028", paperCol: "#f7eed7", seed: 101, corrugated: true, corrX: 7, corrY: 5, rim: 6.5, strokeW: 12, step: 6, density: 0.94
        });
        drawTornPaperPiece(c, [
          [cx - 14, by - 160], [cx - 22, by - 206], [cx + 10, by - 220], [cx + 26, by - 194], [cx + 14, by - 156]
        ], { col: "#3ca636", shadeCol: "#22681f", seed: 102, corrugated: true, corrX: 5, corrY: 4, rim: 5.5, strokeW: 10, step: 5.5, density: 0.95 });
      })},
      { zOff: 0.0, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 72, by - 118, 26, 28, 103, 9, 0.22), {
          col: "#c2281c", shadeCol: "#7d1610", seed: 103, rim: 5, strokeW: 9, step: 5.5, density: 0.95
        });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 72, by - 114, 26, 28, 104, 9, 0.22), {
          col: "#c2281c", shadeCol: "#7d1610", seed: 104, rim: 5, strokeW: 9, step: 5.5, density: 0.95
        });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx, by - 88, 76, 72, 105, 13, 0.14), {
          col: "#ee3f28", shadeCol: "#b82214", seed: 105, rim: 6, strokeW: 12, step: 5.5, density: 0.94
        });
      })},
      { zOff: 0.09, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, [
          [cx - 56, by - 66], [cx - 32, by - 104], [cx, by - 92], [cx + 34, by - 104],
          [cx + 58, by - 64], [cx + 46, by - 20], [cx - 46, by - 20]
        ], { col: "#ffefc4", paperCol: "#fffdf6", seed: 106, rim: 5, fibers: false, strokeW: 11, step: 5.5, density: 0.95 });
      })},
      { zOff: 0.17, shadow: false, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 25, by - 98, 15, 16, 107, 9, 0.12), { col: "#25a45f", seed: 107, ...crisp });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 25, by - 98, 15, 16, 108, 9, 0.12), { col: "#25a45f", seed: 108, ...crisp });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 25, by - 98, 6.5, 7, 109, 8, 0.08), { col: "#fffdf6", seed: 109, ...crisp, rim: 0, lw: 2.0 });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 25, by - 98, 6.5, 7, 110, 8, 0.08), { col: "#fffdf6", seed: 110, ...crisp, rim: 0, lw: 2.0 });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 45, by - 76, 12, 9, 111, 8, 0.14), { col: "#ff8c9e", seed: 111, ...crisp, lw: 1.8 });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 45, by - 76, 12, 9, 112, 8, 0.14), { col: "#ff8c9e", seed: 112, ...crisp, lw: 1.8 });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 34, by - 16, 16, 11, 113, 8, 0.16), { col: "#f5a27a", seed: 113, ...crisp, rim: 2.5 });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 34, by - 16, 16, 11, 114, 8, 0.16), { col: "#f5a27a", seed: 114, ...crisp, rim: 2.5 });
      })}
    ];

    // ---------- 2. LEMON CHICK (闪电鸡) — bold chunky 4-layer torn-paper craft ----------
    layers.lemon = [
      { zOff: -0.07, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, [
          [cx - 10, by - 156], [cx - 28, by - 200], [cx + 14, by - 228], [cx + 2, by - 192],
          [cx + 34, by - 194], [cx + 10, by - 150]
        ], { col: "#25a4f0", shadeCol: "#1668ad", seed: 201, corrugated: true, corrX: 6, corrY: 4, rim: 5.5, strokeW: 10, step: 5.5, density: 0.95 });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx, by - 88, 78, 74, 202, 13, 0.16), {
          col: "#f5c218", seed: 202, corrugated: true, corrX: 7, corrY: 5, rim: 6.5, strokeW: 12, step: 6, density: 0.94
        });
      })},
      { zOff: 0.0, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx, by - 88, 74, 70, 203, 13, 0.14), {
          col: "#ffe02b", shadeCol: "#e09f10", seed: 203, rim: 6, strokeW: 12, step: 5.5, density: 0.94
        });
      })},
      { zOff: 0.09, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, [
          [cx - 72, by - 92], [cx - 104, by - 64], [cx - 86, by - 34], [cx - 58, by - 54]
        ], { col: "#ffb81c", seed: 204, rim: 4.5, strokeW: 9, step: 5.5, density: 0.94 });
        drawTornPaperPiece(c, [
          [cx + 70, by - 92], [cx + 102, by - 64], [cx + 84, by - 34], [cx + 56, by - 54]
        ], { col: "#ffb81c", seed: 205, rim: 4.5, strokeW: 9, step: 5.5, density: 0.94 });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx, by - 46, 48, 36, 206, 10, 0.15), {
          col: "#fff8df", paperCol: "#fffdf6", seed: 206, rim: 4.5, fibers: false, strokeW: 10, step: 5.5, density: 0.95
        });
      })},
      { zOff: 0.17, shadow: false, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 28, by - 104, 18, 19, 207, 9, 0.10), { col: "#fffdf6", seed: 207, ...crisp });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 28, by - 104, 18, 19, 208, 9, 0.10), { col: "#fffdf6", seed: 208, ...crisp });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 28, by - 104, 9, 10, 209, 8, 0.08), { col: "#197ad6", seed: 209, ...crisp, rim: 0, lw: 2.0 });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 28, by - 104, 9, 10, 210, 8, 0.08), { col: "#197ad6", seed: 210, ...crisp, rim: 0, lw: 2.0 });
        drawTornPaperPiece(c, [[cx - 16, by - 88], [cx + 16, by - 88], [cx, by - 64]], {
          col: "#ff7f24", shadeCol: "#cc4e08", seed: 211, ...crisp, rim: 2.5
        });
      })}
    ];

    // ---------- 3. BLUEBERRY OWL (蓝莓枭) — bold chunky 4-layer torn-paper craft ----------
    layers.blueberry = [
      { zOff: -0.07, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, [
          [cx - 66, by - 122], [cx - 72, by - 194], [cx - 26, by - 160],
          [cx, by - 186], [cx + 26, by - 160], [cx + 72, by - 194], [cx + 66, by - 122],
          [cx + 78, by - 42], [cx, by - 14], [cx - 78, by - 42]
        ], { col: "#1d4591", shadeCol: "#102859", seed: 301, corrugated: true, corrX: 7, corrY: 5, rim: 6.5, strokeW: 12, step: 6, density: 0.94 });
      })},
      { zOff: 0.02, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx, by - 86, 74, 70, 302, 13, 0.14), {
          col: "#2458b8", shadeCol: "#163878", seed: 302, rim: 5.5, strokeW: 12, step: 5.5, density: 0.94
        });
        drawTornPaperPiece(c, [
          [cx - 58, by - 114], [cx - 28, by - 146], [cx, by - 122], [cx + 28, by - 146],
          [cx + 58, by - 114], [cx + 42, by - 72], [cx, by - 64], [cx - 42, by - 72]
        ], { col: "#fdf1d6", paperCol: "#fffdf6", seed: 303, rim: 5, fibers: false, strokeW: 10, step: 5.5, density: 0.95 });
      })},
      { zOff: 0.10, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        [[-22, -48], [0, -40], [22, -48], [-12, -26], [12, -26]].forEach(([dx, dy], idx) => {
          drawTornPaperPiece(c, makeIrregularBlobPts(cx + dx, by + dy, 9, 8.5, 310 + idx, 7, 0.18), {
            col: "#7ab4ff", seed: 310 + idx, ...crisp, lw: 1.8
          });
        });
      })},
      { zOff: 0.18, shadow: false, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 26, by - 106, 18, 19, 320, 9, 0.10), { col: "#64a8ff", seed: 320, ...crisp });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 26, by - 106, 18, 19, 321, 9, 0.10), { col: "#64a8ff", seed: 321, ...crisp });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 26, by - 106, 8.5, 9, 322, 8, 0.08), { col: "#1e1a30", seed: 322, ...crisp, rim: 0, lw: 1.6 });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 26, by - 106, 8.5, 9, 323, 8, 0.08), { col: "#1e1a30", seed: 323, ...crisp, rim: 0, lw: 1.6 });
        drawTornPaperPiece(c, [[cx - 12, by - 88], [cx + 12, by - 88], [cx, by - 68]], {
          col: "#f0b454", seed: 324, ...crisp, rim: 2.5
        });
      })}
    ];

    // ---------- 4. SLIMES (z1 green, z2 blue, z3 orange) — bold 3-layer torn-paper standees ----------
    const makeSlime = (mainCol, shadeCol, spotCol, seed, horned) => [
      { zOff: -0.06, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        if (horned) {
          drawTornPaperPiece(c, [[cx - 52, by - 118], [cx - 66, by - 170], [cx - 24, by - 134]], {
            col: "#ffd43b", seed: seed + 1, corrugated: true, corrX: 5, corrY: 4, rim: 4.5, strokeW: 9, step: 5.5, density: 0.95
          });
          drawTornPaperPiece(c, [[cx + 52, by - 118], [cx + 66, by - 170], [cx + 24, by - 134]], {
            col: "#ffd43b", seed: seed + 2, corrugated: true, corrX: 5, corrY: 4, rim: 4.5, strokeW: 9, step: 5.5, density: 0.95
          });
        } else {
          // Cute torn-paper sprout leaf on green/blue slime top!
          drawTornPaperPiece(c, [[cx - 6, by - 124], [cx - 34, by - 154], [cx - 4, by - 144], [cx + 28, by - 156], [cx + 8, by - 122]], {
            col: spotCol, seed: seed + 3, corrugated: true, corrX: 4, corrY: 3, rim: 4.5, strokeW: 8, step: 5.5, density: 0.95
          });
        }
        drawTornPaperPiece(c, makeIrregularBlobPts(cx, by - 72, 78, 64, seed, 12, 0.20), {
          col: shadeCol, seed, corrugated: true, corrX: 7, corrY: 5, rim: 6.5, strokeW: 12, step: 6, density: 0.94
        });
      })},
      { zOff: 0.04, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx, by - 70, 72, 58, seed + 5, 12, 0.18), {
          col: mainCol, shadeCol, seed: seed + 5, rim: 6, strokeW: 12, step: 5.5, density: 0.93
        });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 34, by - 96, 19, 14, seed + 6, 8, 0.22), {
          col: spotCol, seed: seed + 6, ...crisp, rim: 2.5
        });
      })},
      { zOff: 0.13, shadow: false, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 24, by - 78, 16, 17, seed + 7, 8, 0.12), { col: "#fffdf6", seed: seed + 7, ...crisp });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 26, by - 76, 14, 15, seed + 8, 8, 0.12), { col: "#fffdf6", seed: seed + 8, ...crisp });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 22, by - 77, 7, 7.5, seed + 9, 7, 0.08), { col: "#24183a", seed: seed + 9, ...crisp, rim: 0, lw: 1.6 });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 26, by - 75, 6.5, 7, seed + 10, 7, 0.08), { col: "#24183a", seed: seed + 10, ...crisp, rim: 0, lw: 1.6 });
        drawTornPaperPiece(c, [
          [cx - 26, by - 44], [cx - 10, by - 34], [cx + 4, by - 44], [cx + 18, by - 34], [cx + 30, by - 46],
          [cx + 20, by - 22], [cx - 20, by - 22]
        ], { col: "#36182c", seed: seed + 11, ...crisp, rim: 2.5, lw: 2.2 });
      })}
    ];

    layers.z1 = makeSlime("#8ae048", "#50a324", "#d8ff9e", 401, false);
    layers.z2 = makeSlime("#68c4ff", "#2e7ec4", "#d2f2ff", 431, false);
    layers.z3 = makeSlime("#ff7538", "#bd3816", "#ffd29e", 461, true);

    // ---------- 5. NEST CHICK (小鸡窝) — bold 4-layer torn-paper craft ----------
    layers.egg = [
      { zOff: -0.06, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx, by - 80, 74, 70, 501, 13, 0.16), {
          col: "#f59d24", shadeCol: "#bf6610", seed: 501, corrugated: true, corrX: 7, corrY: 5, rim: 6.5, strokeW: 12, step: 6, density: 0.94
        });
      })},
      { zOff: 0.04, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx, by - 98, 60, 58, 502, 12, 0.14), {
          col: "#ffb82e", shadeCol: "#db7a14", seed: 502, rim: 5.5, strokeW: 11, step: 5.5, density: 0.94
        });
      })},
      { zOff: 0.12, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, [
          [cx - 66, by - 68], [cx - 38, by - 42], [cx - 16, by - 68], [cx + 6, by - 42],
          [cx + 32, by - 68], [cx + 64, by - 52], [cx + 58, by - 12], [cx - 58, by - 12]
        ], { col: "#fff6dc", paperCol: "#fffdf6", seed: 503, rim: 5, fibers: false, strokeW: 10, step: 5.5, density: 0.95 });
      })},
      { zOff: 0.18, shadow: false, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 22, by - 100, 12, 13, 504, 8, 0.10), { col: "#fffdf6", seed: 504, ...crisp });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 22, by - 100, 12, 13, 505, 8, 0.10), { col: "#fffdf6", seed: 505, ...crisp });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 21, by - 100, 6.5, 7, 514, 7, 0.08), { col: "#24183a", seed: 514, ...crisp, rim: 0, lw: 1.5 });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 21, by - 100, 6.5, 7, 515, 7, 0.08), { col: "#24183a", seed: 515, ...crisp, rim: 0, lw: 1.5 });
        drawTornPaperPiece(c, [[cx - 12, by - 84], [cx + 12, by - 84], [cx, by - 66]], {
          col: "#ff7222", seed: 506, ...crisp, rim: 2.5
        });
      })}
    ];

    // ---------- 6. TREES (4 rising multi-plane pop-up paper layers!) ----------
    layers.tree = [
      { zOff: -0.07, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, [
          [cx - 18, by], [cx - 12, by - 98], [cx + 14, by - 96], [cx + 20, by]
        ], { col: "#b87a46", shadeCol: "#7d4c24", seed: 601, corrugated: true, corrX: 6, corrY: 4, rim: 5.5, strokeW: 10, step: 6, density: 0.92 });
      })},
      { zOff: 0.0, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 30, by - 122, 50, 44, 602, 11, 0.28), {
          col: "#4fa832", shadeCol: "#31731b", seed: 602, corrugated: true, corrX: 5, corrY: 4, rim: 5.5, strokeW: 11, step: 6.5, density: 0.88
        });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 34, by - 116, 48, 42, 603, 11, 0.28), {
          col: "#4fa832", shadeCol: "#31731b", seed: 603, corrugated: true, corrX: 5, corrY: 4, rim: 5.5, strokeW: 11, step: 6.5, density: 0.88
        });
      })},
      { zOff: 0.10, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx, by - 146, 62, 50, 604, 13, 0.26), {
          col: "#7ad64e", shadeCol: "#4ea82a", seed: 604, rim: 6, strokeW: 11, step: 6.5, density: 0.86
        });
      })},
      { zOff: 0.19, shadow: false, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 12, by - 116, 36, 26, 605, 10, 0.28), {
          col: "#9ee86b", seed: 605, rim: 4.5, strokeW: 9, step: 6.5, density: 0.85
        });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 24, by - 142, 12, 12, 606, 8, 0.20), { col: "#f24838", seed: 606, ...crisp, rim: 2.5 });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 22, by - 130, 11, 11, 607, 8, 0.20), { col: "#f24838", seed: 607, ...crisp, rim: 2.5 });
      })}
    ];

    // ---------- 7. BUSHES, ROCKS, SIGNPOST, FENCES ----------
    layers.bush = [
      { zOff: -0.04, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 24, by - 36, 44, 34, 701, 10, 0.28), {
          col: "#4fa832", seed: 701, corrugated: true, corrX: 5, corrY: 4, rim: 5.5, strokeW: 10, step: 6.5, density: 0.88
        });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 28, by - 32, 42, 30, 702, 10, 0.28), {
          col: "#4fa832", seed: 702, corrugated: true, corrX: 5, corrY: 4, rim: 5.5, strokeW: 10, step: 6.5, density: 0.88
        });
      })},
      { zOff: 0.08, shadow: false, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, makeIrregularBlobPts(cx, by - 44, 48, 36, 703, 11, 0.26), {
          col: "#8ce05a", seed: 703, rim: 5, strokeW: 10, step: 6.5, density: 0.86
        });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx - 16, by - 46, 10, 9, 704, 7, 0.20), { col: "#ff8ec0", seed: 704, ...crisp, lw: 2 });
        drawTornPaperPiece(c, makeIrregularBlobPts(cx + 18, by - 34, 9, 9, 705, 7, 0.20), { col: "#ffe258", seed: 705, ...crisp, lw: 2 });
      })}
    ];

    layers.rock = [
      { zOff: -0.03, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, [
          [cx - 58, by], [cx - 46, by - 56], [cx + 8, by - 68], [cx + 56, by - 28], [cx + 48, by + 2]
        ], { col: "#9c9488", shadeCol: "#6d665c", seed: 720, corrugated: true, corrX: 5, corrY: 4, rim: 5.5, strokeW: 10, step: 6.5, density: 0.90 });
      })},
      { zOff: 0.08, shadow: false, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, [
          [cx - 32, by - 6], [cx - 24, by - 48], [cx + 16, by - 52], [cx + 34, by - 16]
        ], { col: "#d2cabe", seed: 721, rim: 4.5, strokeW: 9, step: 6.5, density: 0.86 });
      })}
    ];

    layers.sign = [
      { zOff: -0.02, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, [[cx - 7, by], [cx - 5, by - 92], [cx + 8, by - 92], [cx + 9, by]], {
          col: "#a8703c", seed: 740, corrugated: true, corrX: 4, corrY: 3, rim: 4.5, strokeW: 8, step: 6, density: 0.90
        });
      })},
      { zOff: 0.08, shadow: false, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, [
          [cx - 44, by - 98], [cx + 28, by - 102], [cx + 56, by - 76], [cx + 26, by - 52], [cx - 44, by - 54]
        ], { col: "#f2c872", shadeCol: "#c9963b", seed: 741, rim: 5, strokeW: 9, step: 6, density: 0.90 });
      })}
    ];

    layers.fence = [
      { zOff: -0.02, shadow: true, cv: makeLayerCanvas(S, S, (c) => {
        drawTornPaperPiece(c, [[cx - 86, by - 36], [cx + 86, by - 38], [cx + 84, by - 22], [cx - 86, by - 20]], {
          col: "#d49a58", seed: 760, corrugated: true, corrX: 4, corrY: 3, rim: 4, strokeW: 8, step: 6, density: 0.90
        });
        drawTornPaperPiece(c, [[cx - 86, by - 68], [cx + 86, by - 70], [cx + 84, by - 54], [cx - 86, by - 52]], {
          col: "#e6b06c", seed: 761, corrugated: true, corrX: 4, corrY: 3, rim: 4, strokeW: 8, step: 6, density: 0.90
        });
      })},
      { zOff: 0.08, shadow: false, cv: makeLayerCanvas(S, S, (c) => {
        [-64, -22, 22, 64].forEach((px, idx) => {
          drawTornPaperPiece(c, [
            [cx + px - 11, by], [cx + px - 10, by - 76], [cx + px + 1, by - 92], [cx + px + 11, by - 74], [cx + px + 10, by]
          ], { col: "#f5cb86", shadeCol: "#d49a52", seed: 770 + idx, rim: 3.5, strokeW: 8, step: 6, density: 0.90 });
        });
      })}
    ];

    return layers;
  }

  window.PaperCraft = {
    hash, jit, makeTornPoints, makeIrregularBlobPts, tracePoly,
    fillCoarseCrayon, drawTornPaperPiece, buildLayeredStandees
  };
})();
