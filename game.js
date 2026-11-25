(() => {
  "use strict";

  const OL = "#2b2038";
  const TAU = Math.PI * 2;
  const COLS = 7, ROWS = 5;
  const PET_COST = 50;

  const PATH = [
    [0, 1], [1, 1], [1, 2], [1, 3], [2, 3],
    [3, 3], [3, 2], [3, 1], [4, 1], [5, 1],
    [5, 2], [5, 3], [6, 3]
  ];
  const PATH_SET = new Set(PATH.map(([x, y]) => x + "," + y));

  const HERO_DEFS = {
    chili: {
      img: "chili", name: "椒椒鼠", moveSpd: 3.1, range: 2.35, atkRate: 0.50, dmg: 30,
      projCol: "#ff5321", coreCol: "#ffe24a", burstCol: "#ffe24a", words: ["POW!", "BOOM!", "轰!"],
      burnDur: 2.6, slowDur: 0, splash: 0
    },
    lemon: {
      img: "lemon", name: "闪电鸡", moveSpd: 3.55, range: 2.55, atkRate: 0.34, dmg: 22,
      projCol: "#34b6ff", coreCol: "#fff464", burstCol: "#70dcff", words: ["ZAP!", "啪!", "闪!"],
      burnDur: 0, slowDur: 0, splash: 0
    },
    blueberry: {
      img: "blueberry", name: "蓝莓枭", moveSpd: 2.95, range: 2.45, atkRate: 0.62, dmg: 28,
      projCol: "#4f7cff", coreCol: "#d8f4ff", burstCol: "#8fe6ff", words: ["SPLASH!", "冰!", "啪!"],
      burnDur: 0, slowDur: 2.2, splash: 1.15
    }
  };

  const SCENIC_PROPS = [
    { kind: "tree",  gx: 0.35, gy: -0.02, scale: 0.80, seed: 11 },
    { kind: "tree",  gx: 3.95, gy: -0.04, scale: 0.76, seed: 22 },
    { kind: "tree",  gx: 6.68, gy: -0.02, scale: 0.78, seed: 29 },
    { kind: "bush",  gx: 2.15, gy: -0.06, scale: 0.85, seed: 33 },
    { kind: "bush",  gx: 5.35, gy: -0.05, scale: 0.82, seed: 38 },
    { kind: "rock",  gx: -0.24, gy: 2.75, scale: 0.88, seed: 44 },
    { kind: "tree",  gx: 7.26, gy: 1.55,  scale: 0.88, seed: 55 },
    { kind: "bush",  gx: 2.35, gy: 5.25,  scale: 0.90, seed: 66 },
    { kind: "rock",  gx: 4.95, gy: 5.22,  scale: 0.82, seed: 69 },
    { kind: "sign",  gx: 0.28, gy: 0.82,  scale: 0.82, seed: 77 },
    { kind: "fence", gx: 0.85, gy: 5.10,  scale: 0.96, seed: 81 },
    { kind: "fence", gx: 3.65, gy: 5.10,  scale: 0.96, seed: 82 },
    { kind: "fence", gx: 6.15, gy: 5.10,  scale: 0.96, seed: 83 }
  ];

  const WAVES = [
    [
      { kind: "z1", delay: 0.25 },
      { kind: "z1", delay: 1.35 },
      { kind: "z1", delay: 1.3 },
      { kind: "z1", delay: 1.25 }
    ],
    [
      { kind: "z1", delay: 1.5 },
      { kind: "z2", delay: 1.3 },
      { kind: "z1", delay: 1.15 },
      { kind: "z2", delay: 1.3 },
      { kind: "z1", delay: 1.15 },
      { kind: "z2", delay: 1.3 }
    ],
    [
      { kind: "z2", delay: 1.5 },
      { kind: "z1", delay: 1.0 },
      { kind: "z3", delay: 1.25 },
      { kind: "z2", delay: 1.15 },
      { kind: "z3", delay: 1.25 },
      { kind: "z2", delay: 1.1 },
      { kind: "z3", delay: 1.25 }
    ],
    [
      { kind: "z2", delay: 1.4 },
      { kind: "z3", delay: 1.05 },
      { kind: "z2", delay: 0.95 },
      { kind: "z3", delay: 1.05 },
      { kind: "z1", delay: 0.8 },
      { kind: "z3", delay: 1.0 },
      { kind: "z3", delay: 1.05 },
      { kind: "z2", delay: 1.0 }
    ],
    [
      { kind: "z3", delay: 1.5 },
      { kind: "z2", delay: 0.9 },
      { kind: "z3", delay: 1.0 },
      { kind: "z3", delay: 0.95 },
      { kind: "z2", delay: 0.85 },
      { kind: "z3", delay: 1.0 },
      { kind: "z3", delay: 1.15, boss: true }
    ]
  ];

  const ENEMY_DEF = {
    z1: { img: "z1", hp: 46, speed: 1.02, size: 1.0, tint: "#9ae666", reward: 12 },
    z2: { img: "z2", hp: 88, speed: 0.92, size: 1.08, tint: "#84d2ff", reward: 16 },
    z3: { img: "z3", hp: 132, speed: 1.02, size: 1.14, tint: "#ff7e4a", reward: 22 }
  };

  function hash(a, b) {
    let n = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b ^ 0xc2b2ae35, 0x27d4eb2f);
    n ^= n >>> 15;
    n = Math.imul(n, 0x2c1b3c6d);
    n ^= n >>> 12;
    return (n >>> 0) / 4294967296;
  }
  function jit(i, s) { return hash(i * 7 + 3, s * 13 + 1) - 0.5; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  const IMG = {};
  const STANDEE = {};
  let grainPat = null;
  let assetsLoaded = 0;

  function ensureGrain(c) {
    if (!grainPat && IMG.grain && IMG.grain.naturalWidth) {
      grainPat = c.createPattern(IMG.grain, "repeat");
    }
    return grainPat;
  }

  function applyGrain(c, alpha) {
    const pat = ensureGrain(c);
    if (!pat) return;
    c.save();
    c.globalAlpha = alpha == null ? 0.72 : alpha;
    c.fillStyle = pat;
    c.fill();
    c.restore();
  }

  function buildJitterPath(c, pts, seed, amp, subdiv = 2, closed = true) {
    const out = [];
    const n = pts.length;
    const segs = closed ? n : n - 1;
    let idx = 0;
    for (let i = 0; i < segs; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % n];
      for (let s = 0; s < subdiv; s++) {
        const t = s / subdiv;
        out.push([
          lerp(p0[0], p1[0], t) + jit(idx * 3 + 1, seed) * amp,
          lerp(p0[1], p1[1], t) + jit(idx * 3 + 2, seed + 19) * amp
        ]);
        idx++;
      }
    }
    if (!closed && n > 0) {
      const last = pts[n - 1];
      out.push([last[0] + jit(idx * 3 + 1, seed) * amp, last[1] + jit(idx * 3 + 2, seed + 19) * amp]);
    }
    c.beginPath();
    for (let i = 0; i < out.length; i++) {
      if (i === 0) c.moveTo(out[i][0], out[i][1]);
      else c.lineTo(out[i][0], out[i][1]);
    }
    if (closed) c.closePath();
    return out;
  }

  function crayonPoly(c, pts, fill, seed, o = {}) {
    const amp = o.amp ?? 1.7;
    const lw = o.lw ?? 2.6;
    const subdiv = o.subdiv ?? 2;
    const ol = o.ol ?? OL;
    const ptsOut = buildJitterPath(c, pts, seed, amp, subdiv, true);
    if (fill) {
      if (o.paperUnder) {
        c.fillStyle = "#fffdf6";
        c.fill();
        c.save();
        c.globalAlpha = o.fillAlpha ?? 0.84;
        c.fillStyle = fill;
        c.fill();
        c.restore();
      } else {
        c.fillStyle = fill;
        c.fill();
      }
      applyGrain(c, o.grain ?? 0.82);

      if (o.crayonStrokes !== false) {
        c.save();
        c.clip();
        let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
        for (const p of ptsOut) {
          if (p[0] < minX) minX = p[0];
          if (p[1] < minY) minY = p[1];
          if (p[0] > maxX) maxX = p[0];
          if (p[1] > maxY) maxY = p[1];
        }
        c.strokeStyle = o.strokeTint || "rgba(255, 253, 245, 0.34)";
        c.lineWidth = o.strokeW || 2.4;
        c.lineCap = "round";
        const step = o.strokeStep || 9;
        for (let d = minX - (maxY - minY); d < maxX + (maxY - minY); d += step) {
          c.beginPath();
          c.moveTo(d, minY - 3);
          c.lineTo(d + (maxY - minY) * 0.65, maxY + 3);
          c.stroke();
        }
        c.restore();
      }
    }
    if (lw > 0) {
      c.save();
      c.lineJoin = "round";
      c.lineCap = "round";
      c.strokeStyle = ol;
      c.lineWidth = lw;
      buildJitterPath(c, pts, seed, amp, subdiv, true);
      c.stroke();
      c.globalAlpha *= 0.52;
      c.lineWidth = lw * 0.55;
      buildJitterPath(c, pts, seed + 37, amp * 1.25, subdiv, true);
      c.stroke();
      c.restore();
    }
  }

  function crayonStroke(c, pts, col, lw, seed, amp = 1.6) {
    if (pts.length < 2) return;
    c.save();
    c.lineCap = "round";
    c.lineJoin = "round";
    buildJitterPath(c, pts, seed, amp, 2, false);
    c.strokeStyle = OL;
    c.lineWidth = lw + 2.8;
    c.stroke();
    buildJitterPath(c, pts, seed + 11, amp * 0.9, 2, false);
    c.strokeStyle = col;
    c.lineWidth = lw;
    c.stroke();
    c.restore();
  }

  function crayonEllipse(c, cx, cy, rx, ry, fill, seed, o = {}) {
    const n = o.n || 16;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    crayonPoly(c, pts, fill, seed, { ...o, subdiv: 1 });
  }

  function bakeCardboardStandee(srcCanvasOrImg, seed = 7) {
    const w = srcCanvasOrImg.naturalWidth || srcCanvasOrImg.width;
    const h = srcCanvasOrImg.naturalHeight || srcCanvasOrImg.height;
    if (!w || !h) return srcCanvasOrImg;

    const pad = Math.round(Math.max(18, Math.min(28, h * 0.075)));
    const cw = w + pad * 2, ch = h + pad * 2;

    const mask = document.createElement("canvas");
    mask.width = cw; mask.height = ch;
    const mc = mask.getContext("2d");
    const rBase = pad * 0.56;
    const dirs = 20;
    for (let i = 0; i < dirs; i++) {
      const a = (i / dirs) * TAU;
      const r = rBase * (0.78 + hash(i, seed) * 0.44);
      mc.drawImage(srcCanvasOrImg, pad + Math.cos(a) * r, pad + Math.sin(a) * r);
    }
    mc.drawImage(srcCanvasOrImg, pad, pad);

    const makeFillFromMask = (fillCol) => {
      const tc = document.createElement("canvas");
      tc.width = cw; tc.height = ch;
      const tctx = tc.getContext("2d");
      tctx.drawImage(mask, 0, 0);
      tctx.globalCompositeOperation = "source-in";
      tctx.fillStyle = fillCol;
      tctx.fillRect(0, 0, cw, ch);
      return tc;
    };

    const out = document.createElement("canvas");
    out.width = cw; out.height = ch;
    const c = out.getContext("2d");

    const cardEdge = makeFillFromMask("#6b533b");
    const cardBody = makeFillFromMask("#cfb084");
    const paperEdge = makeFillFromMask("#d8ccb4");
    const paperWhite = makeFillFromMask("#fffdf6");

    const thickX = Math.max(4, Math.round(h * 0.017));
    const thickY = Math.max(2, Math.round(h * 0.009));
    c.drawImage(cardEdge, thickX + 1.5, thickY + 1);
    for (let s = thickX; s >= 1; s--) {
      c.drawImage(cardBody, s, Math.round(s * thickY / thickX));
    }

    c.drawImage(paperEdge, 1.2, 1.2);
    c.drawImage(paperWhite, 0, 0);
    c.drawImage(srcCanvasOrImg, pad, pad);

    out._pad = pad;
    out._origW = w;
    out._origH = h;
    return out;
  }

  function bakePropStandee(kind, seed) {
    const w = 220, h = 240;
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const c = cv.getContext("2d");
    const cx = w * 0.5, by = h - 22;

    if (kind === "tree") {
      crayonPoly(c, [
        [cx - 14, by], [cx - 10, by - 78], [cx + 10, by - 78], [cx + 15, by]
      ], "#b88252", seed, { paperUnder: true, fillAlpha: 0.85, lw: 3.4, amp: 1.6, strokeTint: "rgba(255,253,245,0.4)" });
      crayonEllipse(c, cx - 28, by - 96, 46, 38, "#7fd458", seed + 1, { paperUnder: true, fillAlpha: 0.82, lw: 3.4, amp: 2.2 });
      crayonEllipse(c, cx + 28, by - 92, 44, 36, "#6ec64a", seed + 2, { paperUnder: true, fillAlpha: 0.82, lw: 3.4, amp: 2.2 });
      crayonEllipse(c, cx, by - 124, 54, 44, "#97e46b", seed + 3, { paperUnder: true, fillAlpha: 0.82, lw: 3.4, amp: 2.2 });
      crayonEllipse(c, cx - 22, by - 108, 10, 11, "#f24c3d", seed + 5, { lw: 2.4, amp: 0.7 });
      crayonEllipse(c, cx + 20, by - 118, 9.5, 10.5, "#f24c3d", seed + 6, { lw: 2.4, amp: 0.7 });
      crayonEllipse(c, cx + 2, by - 88, 9, 10, "#f24c3d", seed + 7, { lw: 2.4, amp: 0.7 });
    } else if (kind === "bush") {
      crayonEllipse(c, cx - 28, by - 26, 34, 26, "#78cd54", seed, { paperUnder: true, fillAlpha: 0.84, lw: 3.2, amp: 1.8 });
      crayonEllipse(c, cx + 26, by - 24, 32, 24, "#6bc048", seed + 1, { paperUnder: true, fillAlpha: 0.84, lw: 3.2, amp: 1.8 });
      crayonEllipse(c, cx, by - 40, 38, 30, "#97e46b", seed + 2, { paperUnder: true, fillAlpha: 0.84, lw: 3.2, amp: 1.8 });
      crayonEllipse(c, cx - 12, by - 44, 8, 8, "#ff99c0", seed + 4, { lw: 2.0, amp: 0.5 });
      crayonEllipse(c, cx + 16, by - 30, 7.5, 7.5, "#ffe464", seed + 5, { lw: 2.0, amp: 0.5 });
    } else if (kind === "rock") {
      crayonPoly(c, [
        [cx - 46, by], [cx - 34, by - 42], [cx + 8, by - 52], [cx + 46, by - 22], [cx + 40, by + 4]
      ], "#c8bfb0", seed, { paperUnder: true, fillAlpha: 0.84, lw: 3.2, amp: 1.8 });
    } else if (kind === "sign") {
      crayonStroke(c, [[cx, by], [cx, by - 64]], "#9f6e44", 5.5, seed, 1.0);
      crayonPoly(c, [
        [cx - 38, by - 84], [cx + 26, by - 86], [cx + 46, by - 64], [cx + 24, by - 44], [cx - 38, by - 46]
      ], "#f0c878", seed + 2, { paperUnder: true, fillAlpha: 0.86, lw: 3.2, amp: 1.4 });
    } else if (kind === "fence") {
      const xs = [cx - 64, cx - 22, cx + 22, cx + 64];
      crayonStroke(c, [[cx - 72, by - 24], [cx + 72, by - 24]], "#d9a464", 5.2, seed, 1.0);
      crayonStroke(c, [[cx - 72, by - 48], [cx + 72, by - 48]], "#e6b474", 5.2, seed + 1, 1.0);
      for (let i = 0; i < xs.length; i++) {
        const px = xs[i];
        crayonPoly(c, [
          [px - 8, by], [px - 8, by - 60], [px, by - 72], [px + 8, by - 60], [px + 8, by]
        ], "#f0c686", seed + 10 + i, { paperUnder: true, fillAlpha: 0.88, lw: 2.8, amp: 1.0, subdiv: 1 });
      }
    }
    return bakeCardboardStandee(cv, seed);
  }

  const ASSET_URLS = {
    chili:     "assets/pets/chili-1.webp",
    lemon:     "assets/pets/lemon-1.webp",
    blueberry: "assets/pets/blueberry-1.webp",
    z1:        "assets/enemies/z-1.webp",
    z2:        "assets/enemies/z-2.webp",
    z3:        "assets/enemies/z-3.webp",
    egg:       "assets/fx/hen-egg.webp",
    grain:     "assets/ui/grain.png"
  };
  const totalAssets = Object.keys(ASSET_URLS).length;

  function loadAllAssets(done) {
    for (const [k, url] of Object.entries(ASSET_URLS)) {
      const im = new Image();
      im.onload = () => {
        IMG[k] = im;
        if (k === "grain") {
          grainPat = null;
        } else {
          STANDEE[k] = bakeCardboardStandee(im, k.charCodeAt(0) * 17);
        }
        assetsLoaded++;
        if (assetsLoaded >= totalAssets) {
          STANDEE.tree  = bakePropStandee("tree", 101);
          STANDEE.bush  = bakePropStandee("bush", 202);
          STANDEE.rock  = bakePropStandee("rock", 303);
          STANDEE.sign  = bakePropStandee("sign", 404);
          STANDEE.fence = bakePropStandee("fence", 505);
          done();
        }
      };
      im.onerror = () => {
        assetsLoaded++;
        if (assetsLoaded >= totalAssets) done();
      };
      im.src = url;
    }
  }
  /* ================= Flat Full-Screen Panoramic Floor Camera ================= */
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  let W = 1280, H = 720, DPR = 1;
  let cam = { topY: 90, botY: 660, halfWTop: 480, halfWBot: 610, zs: 95, unit: 140, portrait: false };
  let bgCache = null;

  function updateLayout() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(320, window.innerWidth);
    H = Math.max(320, window.innerHeight);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);

    const portrait = W < H;
    const topY = portrait ? H * 0.25 : H * 0.20;
    const botY = portrait ? H * 0.77 : H * 0.90;
    const halfWBot = portrait ? W * 0.48 : W * 0.465;
    const halfWTop = halfWBot * (portrait ? 0.88 : 0.83);
    const unit = (halfWBot * 2) / COLS;

    cam = {
      topY, botY, halfWTop, halfWBot,
      zs: portrait ? unit * 1.38 : unit * 0.82,
      unit, portrait
    };
    bgCache = null;
  }

  function proj(gx, gy, gz = 0) {
    const t = gy / ROWS;
    const k = cam.halfWTop / cam.halfWBot;
    const p = lerp(k, 1.0, t);
    const rowY = lerp(cam.topY, cam.botY, t * p);
    const halfW = lerp(cam.halfWTop, cam.halfWBot, (rowY - cam.topY) / Math.max(1, cam.botY - cam.topY));
    const nx = (gx - COLS * 0.5) / (COLS * 0.5);
    const sx = W * 0.5 + nx * halfW;
    const sy = rowY - gz * cam.zs * p;
    return [sx, sy, p];
  }

  function screenToGrid(sx, sy) {
    const k = cam.halfWTop / cam.halfWBot;
    const yNorm = (sy - cam.topY) / Math.max(1, cam.botY - cam.topY);
    const a = 1 - k, b = k, c = -yNorm;
    const disc = b * b - 4 * a * c;
    const t = disc >= 0 ? (-b + Math.sqrt(disc)) / (2 * a) : yNorm;
    const gy = t * ROWS;
    const halfW = lerp(cam.halfWTop, cam.halfWBot, yNorm);
    const nx = (sx - W * 0.5) / Math.max(1, halfW);
    const gx = nx * (COLS * 0.5) + COLS * 0.5;
    return [gx, gy];
  }

  function tileCorners(tx, ty, pad = 0, gz = 0) {
    const x0 = tx + pad, x1 = tx + 1 - pad;
    const y0 = ty + pad, y1 = ty + 1 - pad;
    return [proj(x0, y0, gz), proj(x1, y0, gz), proj(x1, y1, gz), proj(x0, y1, gz)];
  }

  function drawFlatFloor(c) {
    c.fillStyle = "#f4f2e2";
    c.fillRect(0, 0, W, H);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(218, 238, 178, 0.52)");
    g.addColorStop(0.5, "rgba(202, 230, 152, 0.58)");
    g.addColorStop(1, "rgba(186, 220, 134, 0.62)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    c.save();
    c.lineCap = "round";
    for (let i = 0; i < 42; i++) {
      const rx = hash(i, 7) * W;
      const ry = hash(i, 19) * H;
      const len = 45 + hash(i, 31) * 75;
      c.strokeStyle = i % 2 ? "rgba(154, 206, 98, 0.28)" : "rgba(255, 253, 244, 0.45)";
      c.lineWidth = 8 + hash(i, 41) * 8;
      c.beginPath();
      c.moveTo(rx, ry);
      c.lineTo(rx + len, ry - len * 0.35);
      c.stroke();
    }
    c.restore();
    applyGrain(c, 0.45);

    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        const isPath = PATH_SET.has(tx + "," + ty);
        const corners = tileCorners(tx, ty, 0, 0);
        if (isPath) {
          crayonPoly(c, corners, "#f0ddb2", 300 + tx * 11 + ty, {
            paperUnder: true, fillAlpha: 0.78, amp: 1.3, lw: 2.0,
            ol: "rgba(138, 102, 62, 0.62)", grain: 0.85,
            strokeTint: "rgba(255, 253, 245, 0.48)", strokeStep: 8
          });
          for (let k = 0; k < 2; k++) {
            const gx = tx + 0.24 + hash(tx * 7 + k, ty * 13) * 0.52;
            const gy = ty + 0.24 + hash(tx * 17, ty * 5 + k) * 0.52;
            const [px, py, pp] = proj(gx, gy, 0);
            const r = cam.unit * (0.055 + k * 0.015) * pp;
            crayonEllipse(c, px, py, r, r * 0.65, k ? "#fffaf0" : "#dfc28d", 400 + tx * 9 + ty + k, {
              lw: 1.5, ol: "rgba(92, 68, 42, 0.55)", amp: 0.6, crayonStrokes: false
            });
          }
        } else {
          const even = (tx + ty) % 2 === 0;
          crayonPoly(c, corners, even ? "#bfe588" : "#aedb74", 500 + tx * 13 + ty, {
            paperUnder: true, fillAlpha: 0.68, amp: 1.2, lw: 1.5,
            ol: "rgba(82, 128, 52, 0.36)", grain: 0.82,
            strokeTint: "rgba(255, 253, 245, 0.42)", strokeStep: 10
          });
          const inner = tileCorners(tx, ty, 0.13, 0);
          c.save();
          c.setLineDash([5, 5]);
          c.strokeStyle = "rgba(255, 253, 245, 0.72)";
          c.lineWidth = 1.6;
          c.beginPath();
          c.moveTo(inner[0][0], inner[0][1]);
          c.lineTo(inner[1][0], inner[1][1]);
          c.lineTo(inner[2][0], inner[2][1]);
          c.lineTo(inner[3][0], inner[3][1]);
          c.closePath();
          c.stroke();
          c.restore();

          const rnd = hash(tx + 5, ty + 11);
          if (rnd > 0.48) {
            const [gx, gy, pp] = proj(tx + 0.22 + rnd * 0.15, ty + 0.80, 0);
            c.save();
            c.strokeStyle = "rgba(68, 132, 42, 0.75)";
            c.lineWidth = 2.0;
            c.lineCap = "round";
            c.beginPath();
            c.moveTo(gx, gy); c.lineTo(gx - 3 * pp, gy - 6 * pp);
            c.moveTo(gx + 2 * pp, gy); c.lineTo(gx + 4 * pp, gy - 7 * pp);
            c.stroke();
            if (rnd > 0.75) {
              crayonEllipse(c, gx + 4 * pp, gy - 7 * pp, 3.2 * pp, 3.2 * pp, rnd > 0.87 ? "#ffe264" : "#ff9cc0", 77 + tx, {
                lw: 1.2, amp: 0.4, crayonStrokes: false
              });
            }
            c.restore();
          }
        }
      }
    }
  }

  function ensureBgCache() {
    if (bgCache) return bgCache;
    bgCache = document.createElement("canvas");
    bgCache.width = canvas.width;
    bgCache.height = canvas.height;
    const bc = bgCache.getContext("2d");
    bc.scale(DPR, DPR);
    drawFlatFloor(bc);
    return bgCache;
  }

  /* ================= Game State (Hero + Planted Towers) ================= */
  let simTime = 0;
  let speedMul = 1;
  let hoverTile = null;
  let tapMode = "plant"; // "plant" or "move"
  let chosenHeroKey = "chili";
  let game = null;

  const keys = {};
  const joyVec = { x: 0, y: 0, active: false };

  function makeHero(heroKey) {
    const def = HERO_DEFS[heroKey] || HERO_DEFS.chili;
    return {
      key: heroKey,
      def,
      gx: 2.5, gy: 2.5, gz: 0,
      vx: 0, vy: 0,
      target: null, // { gx, gy } for click-to-move
      walkPhase: 0,
      dustTimer: 0,
      facing: 1,
      waddle: 0,
      atkCd: 0.15,
      recoil: 0
    };
  }

  function makeTower(tx, ty) {
    return {
      tx, ty,
      gx: tx + 0.5, gy: ty + 0.5, gz: 0,
      range: 2.25,
      atkCd: 0.12,
      atkRate: 0.62,
      dmg: 26,
      facing: 1,
      recoil: 0,
      phase: Math.random() * TAU
    };
  }

  function openHeroPicker() {
    game = {
      started: false,
      waveIdx: 0,
      spawnIdx: 0,
      spawnTimer: 0.35,
      wavePause: 0,
      lives: 1,
      gold: 60,
      over: false,
      won: false,
      hero: makeHero(chosenHeroKey),
      towers: [],
      enemies: [],
      shots: [],
      fx: [],
      scorch: []
    };
    document.getElementById("overlay").classList.add("hidden");
    document.getElementById("pick-overlay").classList.remove("hidden");
    syncHud();
  }

  function startWithHero(heroKey) {
    chosenHeroKey = heroKey;
    game = {
      started: true,
      waveIdx: 0,
      spawnIdx: 0,
      spawnTimer: 0.25,
      wavePause: 0,
      lives: 1,
      gold: 60,
      over: false,
      won: false,
      hero: makeHero(heroKey),
      towers: [],
      enemies: [],
      shots: [],
      fx: [],
      scorch: []
    };
    document.getElementById("pick-overlay").classList.add("hidden");
    document.getElementById("overlay").classList.add("hidden");
    spawnDustPuff(game.hero.gx, game.hero.gy);
    syncHud();
  }

  function syncHud() {
    if (!game) return;
    const wNum = Math.min(WAVES.length, game.waveIdx + 1);
    document.getElementById("hud-wave").textContent = "Wave " + wNum + " / " + WAVES.length;
    document.getElementById("hud-life").textContent = "❤️ " + game.lives;
    document.getElementById("hud-gold").textContent = "🪙 " + game.gold;
  }

  function flashNoGold() {
    const el = document.getElementById("hud-gold");
    el.classList.remove("pill-shake");
    void el.offsetWidth;
    el.classList.add("pill-shake");
  }

  function showOverlay(won) {
    const ov = document.getElementById("overlay");
    const t = document.getElementById("ov-title");
    const s = document.getElementById("ov-sub");
    const b = document.getElementById("ov-btn");
    if (won) {
      t.textContent = "You win! 🎉";
      s.textContent = game.hero.def.name + "和小鸡窝一起守住了全 5 波！";
      b.textContent = "Replay / 再玩一次";
    } else {
      t.textContent = "Try again! 💥";
      s.textContent = "史莱姆闯进小窝了！(小窝只有 1 点生命)";
      b.textContent = "Try again / 再试一次";
    }
    ov.classList.remove("hidden");
  }

  function pathPos(dist) {
    const maxD = PATH.length - 1;
    const clamped = clamp(dist, 0, maxD);
    const i = Math.min(maxD - 1, Math.floor(clamped));
    const f = clamped - i;
    const a = PATH[i], b = PATH[i + 1];
    return [lerp(a[0] + 0.5, b[0] + 0.5, f), lerp(a[1] + 0.5, b[1] + 0.5, f)];
  }

  /* ================= Crayon Doodle FX ================= */
  function addFx(obj) { game.fx.push(obj); }

  function spawnCastDoodle(gx, gy, gz, dx, dy, col) {
    addFx({
      k: "cast", gx, gy, gz, dx, dy, col: col || "#ffe24a",
      life: 0.25, max: 0.25, seed: Math.floor(Math.random() * 9999)
    });
  }

  function spawnImpactDoodle(gx, gy, gz, isKill, burstCol, words) {
    const list = words || ["POW!", "BOOM!", "轰!"];
    const word = list[Math.floor(Math.random() * list.length)];
    addFx({
      k: "hit", gx, gy, gz, word, big: !!isKill, burstCol: burstCol || "#ffe24a",
      life: 0.44, max: 0.44, seed: Math.floor(Math.random() * 9999)
    });
    const count = isKill ? 6 : 4;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + Math.random() * 0.35;
      const spd = 1.15 + Math.random() * 0.95;
      addFx({
        k: "doodleBit",
        shape: i % 3 === 0 ? "star" : (i % 3 === 1 ? "flame" : "spiral"),
        gx: gx + Math.cos(a) * 0.22,
        gy: gy + Math.sin(a) * 0.22,
        gz: gz + 0.10,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        vz: 1.55 + Math.random() * 1.0,
        life: 0.40 + Math.random() * 0.12,
        max: 0.52,
        col: i % 2 ? (burstCol || "#ffe24a") : "#ff5a26",
        seed: Math.floor(Math.random() * 9999)
      });
    }
  }

  function spawnDeathPuff(gx, gy, tint, reward) {
    addFx({
      k: "puff", gx, gy, gz: 0.36,
      tint: tint || "#a8e878",
      life: 0.56, max: 0.56, seed: Math.floor(Math.random() * 9999)
    });
    if (reward) {
      addFx({
        k: "pop", gx: gx + 0.24, gy, gz: 1.25,
        text: "+" + reward + "🪙", col: "#ffd83a",
        life: 0.70, max: 0.70, seed: Math.floor(Math.random() * 9999)
      });
    }
    game.scorch.push({ gx, gy, life: 1.8, max: 1.8, seed: Math.floor(Math.random() * 999) });
  }

  function spawnDustPuff(gx, gy, small = false) {
    addFx({
      k: "dust", gx, gy, gz: 0.05, small,
      life: small ? 0.26 : 0.34, max: small ? 0.26 : 0.34,
      seed: Math.floor(Math.random() * 9999)
    });
  }

  function spawnDmgPop(gx, gy, gz, text, col) {
    addFx({
      k: "pop", gx, gy, gz, text, col: col || "#ffe45c",
      life: 0.58, max: 0.58, seed: Math.floor(Math.random() * 9999)
    });
  }

  /* ================= Simulation Step ================= */
  function stepHeroMovement(hero, dt) {
    let kx = 0, ky = 0;
    if (keys.KeyA || keys.ArrowLeft)  kx -= 1;
    if (keys.KeyD || keys.ArrowRight) kx += 1;
    if (keys.KeyW || keys.ArrowUp)    ky -= 1;
    if (keys.KeyS || keys.ArrowDown)  ky += 1;

    if (joyVec.active && (Math.abs(joyVec.x) > 0.08 || Math.abs(joyVec.y) > 0.08)) {
      kx = joyVec.x;
      ky = joyVec.y;
    }

    let desVx = 0, desVy = 0;
    const kLen = Math.hypot(kx, ky);
    if (kLen > 0.08) {
      hero.target = null; // Direct input cancels click-to-move
      const mag = Math.min(1, kLen);
      desVx = (kx / kLen) * hero.def.moveSpd * mag;
      desVy = (ky / kLen) * hero.def.moveSpd * mag;
    } else if (hero.target) {
      const dx = hero.target.gx - hero.gx;
      const dy = hero.target.gy - hero.gy;
      const d = Math.hypot(dx, dy);
      if (d < 0.09) {
        hero.target = null;
      } else {
        desVx = (dx / d) * hero.def.moveSpd;
        desVy = (dy / d) * hero.def.moveSpd;
      }
    }

    const accel = 1 - Math.exp(-14 * dt);
    hero.vx = lerp(hero.vx, desVx, accel);
    hero.vy = lerp(hero.vy, desVy, accel);

    const spd = Math.hypot(hero.vx, hero.vy);
    hero.gx = clamp(hero.gx + hero.vx * dt, 0.15, COLS - 0.15);
    hero.gy = clamp(hero.gy + hero.vy * dt, 0.15, ROWS - 0.15);

    if (Math.abs(hero.vx) > 0.15) hero.facing = hero.vx >= 0 ? 1 : -1;

    if (spd > 0.25) {
      const prevSin = Math.sin(hero.walkPhase);
      hero.walkPhase += dt * (8.5 + spd * 1.4);
      const curSin = Math.sin(hero.walkPhase);
      hero.gz = Math.abs(curSin) * 0.28;
      hero.waddle = Math.sin(hero.walkPhase) * 0.10;
      hero.dustTimer -= dt;
      if ((prevSin * curSin <= 0 || hero.dustTimer <= 0) && spd > 0.6) {
        hero.dustTimer = 0.18;
        spawnDustPuff(hero.gx - (hero.vx / spd) * 0.22, hero.gy + 0.05, true);
      }
    } else {
      hero.gz = lerp(hero.gz, 0, 1 - Math.exp(-16 * dt));
      hero.waddle = lerp(hero.waddle, 0, 1 - Math.exp(-16 * dt));
    }
  }

  function fireShot(attacker, target, opt) {
    const [psx] = proj(attacker.gx, attacker.gy, 0);
    const [tsx] = proj(target.gx, target.gy, 0);
    attacker.facing = tsx >= psx ? 1 : -1;

    const startZ = attacker.gz + 0.52;
    const dx = target.gx - attacker.gx, dy = target.gy - attacker.gy;
    const dist = Math.max(0.1, Math.hypot(dx, dy));
    const ux = dx / dist, uy = dy / dist;
    const mx = attacker.gx + ux * 0.42, my = attacker.gy + uy * 0.42;

    spawnCastDoodle(mx, my, startZ, dx, dy, opt.coreCol);
    game.shots.push({
      sx: mx, sy: my, sz: startZ,
      gx: mx, gy: my, gz: startZ,
      target,
      tx: target.gx, ty: target.gy, tz: 0.40,
      t: 0, dur: clamp(dist * 0.13, 0.17, 0.32),
      dmg: opt.dmg,
      projCol: opt.projCol,
      coreCol: opt.coreCol,
      burstCol: opt.burstCol,
      words: opt.words,
      burnDur: opt.burnDur || 0,
      slowDur: opt.slowDur || 0,
      splash: opt.splash || 0,
      trail: [],
      seed: Math.floor(Math.random() * 9999)
    });
  }

  function findBestTarget(gx, gy, range) {
    let target = null, bestDist = -1;
    for (const e of game.enemies) {
      if (e.hp <= 0) continue;
      const d = Math.hypot(e.gx - gx, e.gy - gy);
      if (d <= range && e.dist > bestDist) {
        bestDist = d;
        target = e;
      }
    }
    return target;
  }

  function step(dt) {
    if (!game || !game.started || game.over) return;

    const wave = WAVES[game.waveIdx];
    if (wave && game.spawnIdx < wave.length) {
      game.spawnTimer -= dt;
      if (game.spawnTimer <= 0) {
        const entry = wave[game.spawnIdx++];
        const def = ENEMY_DEF[entry.kind];
        const [sx, sy] = pathPos(0);
        game.enemies.push({
          kind: entry.kind,
          img: def.img,
          tint: def.tint,
          reward: def.reward,
          boss: !!entry.boss,
          hp: entry.boss ? def.hp + 95 : def.hp,
          maxHp: entry.boss ? def.hp + 95 : def.hp,
          speed: def.speed,
          size: entry.boss ? def.size * 1.22 : def.size,
          dist: 0,
          gx: sx, gy: sy, gz: 0,
          facing: 1,
          hopPhase: Math.random() * TAU,
          hitFlash: 0,
          burnT: 0,
          burnTick: 0.38,
          slowT: 0,
          burnSeed: Math.floor(Math.random() * 9999)
        });
        if (game.spawnIdx < wave.length) game.spawnTimer = wave[game.spawnIdx].delay;
      }
    } else if (game.enemies.length === 0) {
      if (game.waveIdx + 1 < WAVES.length) {
        game.wavePause += dt;
        if (game.wavePause >= 0.9) {
          game.waveIdx++;
          game.spawnIdx = 0;
          game.spawnTimer = 0.35;
          game.wavePause = 0;
          syncHud();
        }
      } else {
        game.over = true;
        game.won = true;
        showOverlay(true);
        return;
      }
    }

    // Move + Auto-Attack for Controllable Hero
    const hero = game.hero;
    stepHeroMovement(hero, dt);
    hero.recoil = Math.max(0, hero.recoil - dt * 5);
    hero.atkCd -= dt;
    if (hero.atkCd <= 0) {
      const target = findBestTarget(hero.gx, hero.gy, hero.def.range);
      if (target) {
        hero.atkCd = hero.def.atkRate;
        hero.recoil = 1;
        fireShot(hero, target, hero.def);
      }
    }

    // Auto-Attack for Stationary Planted Chili Towers
    for (const tw of game.towers) {
      tw.recoil = Math.max(0, tw.recoil - dt * 4.5);
      tw.atkCd -= dt;
      if (tw.atkCd <= 0) {
        const target = findBestTarget(tw.gx, tw.gy, tw.range);
        if (target) {
          tw.atkCd = tw.atkRate;
          tw.recoil = 1;
          fireShot(tw, target, {
            dmg: tw.dmg,
            projCol: "#ff5321",
            coreCol: "#ffe24a",
            burstCol: "#ffe24a",
            words: ["POW!", "BOOM!", "轰!"],
            burnDur: 2.4,
            slowDur: 0,
            splash: 0
          });
        }
      }
    }

    for (let i = game.shots.length - 1; i >= 0; i--) {
      const s = game.shots[i];
      if (s.target && s.target.hp > 0) {
        s.tx = s.target.gx;
        s.ty = s.target.gy;
        s.tz = s.target.gz + 0.38;
      }
      s.t += dt / s.dur;
      const p = clamp(s.t, 0, 1);
      s.gx = lerp(s.sx, s.tx, p);
      s.gy = lerp(s.sy, s.ty, p);
      s.gz = lerp(s.sz, s.tz, p) + Math.sin(p * Math.PI) * 0.65;

      if (!s.lastTrail || Math.hypot(s.gx - s.lastTrail[0], s.gy - s.lastTrail[1]) > 0.16) {
        s.trail.push({ gx: s.gx, gy: s.gy, gz: s.gz });
        s.lastTrail = [s.gx, s.gy];
        if (s.trail.length > 6) s.trail.shift();
      }

      if (s.t >= 1) {
        let anyKill = false;
        if (s.target && s.target.hp > 0) {
          damageEnemy(s.target, s.dmg, false);
          if (s.burnDur > 0) {
            s.target.burnT = s.burnDur;
            s.target.burnTick = Math.min(s.target.burnTick, 0.34);
          }
          if (s.slowDur > 0) s.target.slowT = s.slowDur;
          if (s.target.hp <= 0) anyKill = true;
        }
        if (s.splash > 0) {
          for (const e of game.enemies) {
            if (e !== s.target && e.hp > 0 && Math.hypot(e.gx - s.gx, e.gy - s.gy) <= s.splash) {
              damageEnemy(e, Math.round(s.dmg * 0.6), false);
              if (s.slowDur > 0) e.slowT = s.slowDur;
              if (e.hp <= 0) anyKill = true;
            }
          }
        }
        spawnImpactDoodle(s.gx, s.gy, s.gz + 0.14, anyKill, s.burstCol, s.words);
        game.shots.splice(i, 1);
      }
    }

    const maxDist = PATH.length - 1;
    for (let i = game.enemies.length - 1; i >= 0; i--) {
      const e = game.enemies[i];
      e.hitFlash = Math.max(0, e.hitFlash - dt * 5);
      if (e.slowT > 0) e.slowT = Math.max(0, e.slowT - dt);

      if (e.burnT > 0) {
        e.burnT -= dt;
        e.burnTick -= dt;
        if (e.burnTick <= 0) {
          e.burnTick = 0.44;
          damageEnemy(e, 8, true);
        }
      }

      if (e.hp <= 0) {
        game.gold += e.reward;
        syncHud();
        spawnDeathPuff(e.gx, e.gy, e.tint, e.reward);
        game.enemies.splice(i, 1);
        continue;
      }

      const prevGx = e.gx;
      const spdMul = e.slowT > 0 ? 0.52 : 1.0;
      e.dist += e.speed * spdMul * dt;
      e.hopPhase += dt * 9.5 * spdMul;
      const [nx, ny] = pathPos(e.dist);
      e.gx = nx;
      e.gy = ny;
      if (Math.abs(nx - prevGx) > 0.002) e.facing = nx >= prevGx ? 1 : -1;
      e.gz = Math.abs(Math.sin(e.hopPhase)) * 0.20;

      if (e.dist >= maxDist) {
        game.lives = 0;
        syncHud();
        spawnImpactDoodle(e.gx, e.gy, 0.45, true, "#ff6b6b", ["OH NO!"]);
        game.enemies.splice(i, 1);
        game.over = true;
        game.won = false;
        showOverlay(false);
        return;
      }
    }

    for (let i = game.fx.length - 1; i >= 0; i--) {
      const f = game.fx[i];
      f.life -= dt;
      if (f.k === "doodleBit") {
        f.gx += f.vx * dt;
        f.gy += f.vy * dt;
        f.gz = Math.max(0, f.gz + f.vz * dt);
        f.vz -= 4.2 * dt;
      } else if (f.k === "pop") {
        f.gz += 0.72 * dt;
      }
      if (f.life <= 0) game.fx.splice(i, 1);
    }
    for (let i = game.scorch.length - 1; i >= 0; i--) {
      game.scorch[i].life -= dt;
      if (game.scorch[i].life <= 0) game.scorch.splice(i, 1);
    }
  }

  function damageEnemy(e, dmg, isBurn) {
    e.hp -= dmg;
    e.hitFlash = isBurn ? 0.45 : 1.0;
    spawnDmgPop(
      e.gx + (isBurn ? -0.36 : 0.34),
      e.gy - 0.15,
      e.gz + (isBurn ? 1.66 : 1.36),
      (isBurn ? "🔥-" : "-") + dmg,
      isBurn ? "#ff6828" : "#ffe24a"
    );
  }

  /* ================= Standee & Doodle FX Renderers ================= */
  function getBoil() { return Math.floor(simTime * 11); }

  function drawDoodleFlame(c, sx, sy, scale, seed, boil, outerCol = "#ff5524", innerCol = "#ffe658") {
    const s = scale;
    const bSeed = seed + boil * 17;
    const sway = Math.sin(simTime * 13 + seed) * s * 0.13;
    const stretch = 1 + Math.sin(simTime * 16 + seed * 2) * 0.11;

    const outerPts = [
      [sx, sy + s * 0.22],
      [sx - s * 0.48, sy + s * 0.08],
      [sx - s * 0.64, sy - s * 0.28],
      [sx - s * 0.34, sy - s * 0.23],
      [sx - s * 0.44, sy - s * 0.72 * stretch],
      [sx - s * 0.14, sy - s * 0.48],
      [sx + sway, sy - s * 1.15 * stretch],
      [sx + s * 0.24, sy - s * 0.52],
      [sx + s * 0.50, sy - s * 0.74 * stretch],
      [sx + s * 0.38, sy - s * 0.25],
      [sx + s * 0.62, sy - s * 0.20],
      [sx + s * 0.46, sy + s * 0.10]
    ];
    crayonPoly(c, outerPts, outerCol, bSeed, {
      paperUnder: true, fillAlpha: 0.88, amp: s * 0.08, lw: Math.max(2.4, s * 0.08), subdiv: 1,
      grain: 0.85, strokeTint: "rgba(255, 240, 200, 0.42)", strokeStep: Math.max(5, s * 0.22)
    });

    const innerPts = [
      [sx, sy + s * 0.14],
      [sx - s * 0.26, sy + s * 0.02],
      [sx - s * 0.25, sy - s * 0.36],
      [sx - s * 0.07, sy - s * 0.26],
      [sx + sway * 0.75, sy - s * 0.72 * stretch],
      [sx + s * 0.13, sy - s * 0.28],
      [sx + s * 0.28, sy - s * 0.38],
      [sx + s * 0.24, sy + s * 0.03]
    ];
    crayonPoly(c, innerPts, innerCol, bSeed + 9, {
      amp: s * 0.05, lw: Math.max(1.6, s * 0.05), subdiv: 1, grain: 0.65, crayonStrokes: false
    });
  }

  function drawDoodleStar(c, x, y, r, fill, seed, boil) {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.38;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    crayonPoly(c, pts, fill, seed + boil * 13, { amp: r * 0.09, lw: 2.0, subdiv: 1, grain: 0.55, crayonStrokes: false });
  }

  function drawDoodleSpiral(c, x, y, r, col, seed, boil) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const a = t * TAU * 1.3 + seed;
      pts.push([x + Math.cos(a) * r * t, y + Math.sin(a) * r * t]);
    }
    crayonStroke(c, pts, col, 2.6, seed + boil, 0.9);
  }

  function drawStandeeBaseAndShadow(c, sx, sy, wPx, gz, seed, withTab = true, isHero = false) {
    const rx = wPx * 0.44, ry = wPx * 0.16;
    const lift = clamp(1 - gz * 0.55, 0.25, 1);

    c.save();
    c.translate(sx + rx * (0.28 + gz * 0.35), sy + ry * (0.35 + gz * 0.25));
    c.rotate(0.14);
    c.fillStyle = `rgba(68, 56, 42, ${0.20 * lift})`;
    c.beginPath();
    c.ellipse(0, 0, rx * (1 + gz * 0.15), ry * (1 + gz * 0.12), 0, 0, TAU);
    c.fill();
    c.restore();

    if (isHero) {
      // Friendly golden crayon ring under controllable hero
      c.save();
      c.setLineDash([7, 5]);
      c.strokeStyle = "#ff7b1c";
      c.lineWidth = 2.8;
      c.beginPath();
      c.ellipse(sx, sy, wPx * 0.52, wPx * 0.20, 0, 0, TAU);
      c.stroke();
      c.restore();
    }

    if (withTab) {
      const tw = wPx * 0.34, th = Math.max(4, wPx * 0.065);
      crayonPoly(c, [
        [sx - tw, sy - th * 0.3],
        [sx + tw, sy - th * 0.3],
        [sx + tw * 1.12, sy + th],
        [sx - tw * 1.12, sy + th]
      ], "#dfc69c", seed || 71, { lw: 1.8, ol: "#5c4632", amp: 0.6, subdiv: 1, grain: 0.6, crayonStrokes: false });
    }
  }

  function drawStandee(c, key, sx, sy, hPx, facing = 1, squash = 0, flash = 0, tilt = 0) {
    const st = STANDEE[key] || IMG[key];
    if (!st) return;
    const origW = st._origW || st.naturalWidth;
    const origH = st._origH || st.naturalHeight;
    if (!origW || !origH) return;
    const pad = st._pad || 0;
    const scale = hPx / origH;
    const drawW = (st.width || origW) * scale;
    const drawH = (st.height || origH) * scale;
    const padPx = pad * scale;

    const sxScale = 1 + squash * 0.16;
    const syScale = 1 / (1 + squash * 0.12);

    c.save();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.translate(sx, sy);
    if (tilt) c.rotate(tilt);
    c.scale(facing * sxScale, syScale);
    c.drawImage(st, -drawW * 0.5, -hPx - padPx, drawW, drawH);

    if (flash > 0.05 && IMG[key]) {
      c.globalCompositeOperation = "lighter";
      c.globalAlpha = Math.min(0.55, flash * 0.55);
      c.drawImage(IMG[key], -(origW * scale) * 0.5, -hPx, origW * scale, hPx);
    }
    c.restore();
  }

  /* ================= Render Scene ================= */
  function render() {
    const boil = getBoil();
    const bg = ensureBgCache();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Path chevrons
    ctx.save();
    ctx.strokeStyle = "rgba(138, 98, 56, 0.45)";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < PATH.length - 1; i += 2) {
      const a = proj(PATH[i][0] + 0.5, PATH[i][1] + 0.5, 0);
      const b = proj(PATH[i + 1][0] + 0.5, PATH[i + 1][1] + 0.5, 0);
      const mx = lerp(a[0], b[0], 0.5), my = lerp(a[1], b[1], 0.5);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const sz = Math.max(5, cam.unit * 0.08 * a[2]);
      ctx.beginPath();
      ctx.moveTo(mx - Math.cos(ang - 0.65) * sz, my - Math.sin(ang - 0.65) * sz);
      ctx.lineTo(mx, my);
      ctx.lineTo(mx - Math.cos(ang + 0.65) * sz, my - Math.sin(ang + 0.65) * sz);
      ctx.stroke();
    }
    ctx.restore();

    // Hovered grass tile highlight when in plant mode
    if (hoverTile && tapMode === "plant" && !PATH_SET.has(hoverTile.x + "," + hoverTile.y)) {
      const hc = tileCorners(hoverTile.x, hoverTile.y, 0.06, 0);
      crayonPoly(ctx, hc, game.gold >= PET_COST ? "rgba(255, 224, 92, 0.45)" : "rgba(255, 160, 140, 0.35)", 701 + boil, {
        amp: 1.2, lw: 2.6, ol: game.gold >= PET_COST ? "#ff8c24" : "#d94b38", subdiv: 1, grain: 0.3, crayonStrokes: false
      });
    }

    // Hero click-to-move target marker on the flat ground
    if (game.hero && game.hero.target) {
      const [tx, ty, tpp] = proj(game.hero.target.gx, game.hero.target.gy, 0);
      const r = cam.unit * 0.22 * tpp;
      ctx.save();
      ctx.strokeStyle = "#ff6b1c";
      ctx.lineWidth = 2.6;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.ellipse(tx, ty, r, r * 0.46, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    for (const sc of game.scorch) {
      const a = Math.min(1, sc.life / sc.max);
      const [sx, sy, pp] = proj(sc.gx, sc.gy, 0);
      const sz = cam.unit * 0.12 * pp;
      ctx.save();
      ctx.globalAlpha = a * 0.55;
      ctx.strokeStyle = "#5c4632";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx - sz, sy - sz * 0.5); ctx.lineTo(sx + sz, sy + sz * 0.5);
      ctx.moveTo(sx + sz, sy - sz * 0.5); ctx.lineTo(sx - sz, sy + sz * 0.5);
      ctx.stroke();
      ctx.restore();
    }

    const drawList = [];

    for (const prop of SCENIC_PROPS) {
      drawList.push({
        depth: prop.gy,
        draw: () => {
          const [sx, sy, pp] = proj(prop.gx, prop.gy, 0);
          const hPx = cam.unit * (prop.kind === "tree" ? 1.25 : prop.kind === "fence" ? 0.85 : 0.92) * prop.scale * pp;
          drawStandeeBaseAndShadow(ctx, sx, sy, hPx * 0.78, 0, prop.seed, true, false);
          drawStandee(ctx, prop.kind, sx, sy, hPx, 1, 0, 0, 0);
        }
      });
    }

    // Spawn Burrow
    const [btx, bty] = PATH[0];
    drawList.push({
      depth: bty + 0.45,
      draw: () => {
        const [bx, by, pp] = proj(btx + 0.5, bty + 0.5, 0);
        const rx = cam.unit * 0.36 * pp, ry = cam.unit * 0.18 * pp;
        crayonEllipse(ctx, bx, by, rx, ry, "#7e5536", 310, { lw: 2.6, amp: 1.4, crayonStrokes: false });
        crayonEllipse(ctx, bx, by + 2, rx * 0.70, ry * 0.65, "#241624", 312 + boil, { lw: 2.0, amp: 1.0, grain: 0.2, crayonStrokes: false });
      }
    });

    // Nest Standee
    const [htx, hty] = PATH[PATH.length - 1];
    drawList.push({
      depth: hty + 0.58,
      draw: () => {
        const [hx, hy, pp] = proj(htx + 0.5, hty + 0.5, 0);
        const nw = cam.unit * 0.42 * pp, nh = cam.unit * 0.18 * pp;
        drawStandeeBaseAndShadow(ctx, hx, hy, nw * 1.9, 0, 410, false, false);
        crayonEllipse(ctx, hx, hy, nw, nh, "#ebc066", 410, {
          paperUnder: true, fillAlpha: 0.86, lw: 2.6, amp: 1.4, crayonStrokes: false
        });
        const bob = Math.sin(simTime * 3.5) * 2.5 * pp;
        const hPx = cam.unit * (cam.portrait ? 1.05 : 0.88) * pp;
        drawStandee(ctx, "egg", hx, hy + bob, hPx, 1, Math.sin(simTime * 3.5) * 0.05, 0, 0);

        const fx = hx + nw * 0.85, fy = hy - cam.unit * 0.02 * pp;
        crayonStroke(ctx, [[fx, fy], [fx, fy - cam.unit * 0.54 * pp]], "#7c5230", 2.8, 415, 0.7);
        crayonPoly(ctx, [
          [fx, fy - cam.unit * 0.54 * pp],
          [fx + cam.unit * 0.36 * pp, fy - cam.unit * 0.45 * pp],
          [fx, fy - cam.unit * 0.32 * pp]
        ], "#ff6280", 416 + boil, { amp: 1.0, lw: 2.2, subdiv: 1, crayonStrokes: false });
      }
    });

    // Controllable Hero Standee
    if (game.hero) {
      const hero = game.hero;
      drawList.push({
        depth: hero.gy,
        draw: () => {
          const [gx0, gy0, pp0] = proj(hero.gx, hero.gy, 0);
          const [sx, sy, pp] = proj(hero.gx, hero.gy, hero.gz);
          const hPx = cam.unit * (cam.portrait ? 1.18 : 0.98) * pp;
          drawStandeeBaseAndShadow(ctx, gx0, gy0, hPx * 0.94 * pp0 / pp, hero.gz, 735, true, true);
          const idleBreathe = Math.sin(simTime * 5) * 0.04;
          const sq = hero.recoil * 0.42 + (hero.gz > 0.05 ? -0.10 : idleBreathe);
          drawStandee(ctx, hero.def.img, sx, sy, hPx, hero.facing, sq, 0, hero.waddle);
        }
      });
    }

    // Planted Chili Towers
    for (const tw of game.towers) {
      drawList.push({
        depth: tw.gy,
        draw: () => {
          const [gx0, gy0, pp0] = proj(tw.gx, tw.gy, 0);
          const [sx, sy, pp] = proj(tw.gx, tw.gy, tw.gz);
          const hPx = cam.unit * (cam.portrait ? 1.08 : 0.88) * pp;
          drawStandeeBaseAndShadow(ctx, gx0, gy0, hPx * 0.90 * pp0 / pp, tw.gz, 740, true, false);
          const breathe = Math.sin(simTime * 4.8 + tw.phase) * 0.05;
          drawStandee(ctx, "chili", sx, sy, hPx, tw.facing, tw.recoil * 0.42 + breathe, 0, 0);
        }
      });
    }

    // Slime Standees
    for (const e of game.enemies) {
      drawList.push({
        depth: e.gy,
        draw: () => {
          const [gx0, gy0, pp0] = proj(e.gx, e.gy, 0);
          const [sx, sy, pp] = proj(e.gx, e.gy, e.gz);
          const hPx = cam.unit * (cam.portrait ? 1.06 : 0.86) * e.size * pp;
          drawStandeeBaseAndShadow(ctx, gx0, gy0, hPx * 0.85 * pp0 / pp, e.gz, 760, true, false);

          if (e.burnT > 0) {
            drawDoodleFlame(ctx, sx - hPx * 0.28, sy - hPx * 0.44, hPx * 0.52, e.burnSeed + 1, boil);
          }

          const hopSq = (e.gz < 0.04 ? 0.16 : -0.11) + e.hitFlash * 0.22;
          drawStandee(ctx, e.img, sx, sy, hPx, e.facing, hopSq, e.hitFlash, 0);

          if (e.boss) {
            const cy = sy - hPx - 8 * pp;
            const cw = hPx * 0.22;
            crayonPoly(ctx, [
              [sx - cw, cy], [sx - cw * 1.05, cy - cw * 0.85], [sx - cw * 0.4, cy - cw * 0.35],
              [sx, cy - cw * 1.1], [sx + cw * 0.4, cy - cw * 0.35], [sx + cw * 1.05, cy - cw * 0.85], [sx + cw, cy]
            ], "#ffe047", 605 + boil, { amp: 1.0, lw: 2.4, subdiv: 1, crayonStrokes: false });
          }

          if (e.burnT > 0) {
            drawDoodleFlame(ctx, sx + hPx * 0.26, sy - hPx * 0.18, hPx * 0.56, e.burnSeed + 5, boil);
          } else if (e.slowT > 0) {
            drawDoodleStar(ctx, sx + hPx * 0.26, sy - hPx * 0.30, hPx * 0.16, "#84e2ff", e.burnSeed, boil);
          }

          const bw = Math.max(36, cam.unit * 0.56 * e.size * pp);
          const bh = Math.max(6.5, cam.unit * 0.08 * pp);
          const bx = sx - bw * 0.5;
          const by = sy - hPx - (e.boss ? 32 : 16);
          const frac = clamp(e.hp / e.maxHp, 0, 1);
          crayonPoly(ctx, [
            [bx - 2, by - 2], [bx + bw + 2, by - 2],
            [bx + bw + 2, by + bh + 2], [bx - 2, by + bh + 2]
          ], "#fffcf4", 910, { amp: 0.7, lw: 2.0, subdiv: 1, grain: 0.2, crayonStrokes: false });
          if (frac > 0) {
            const fw = Math.max(4, bw * frac);
            crayonPoly(ctx, [
              [bx, by], [bx + fw, by], [bx + fw, by + bh], [bx, by + bh]
            ], e.slowT > 0 ? "#4fb7ff" : (e.burnT > 0 ? "#ff6828" : "#67cf48"), 912, { amp: 0.5, lw: 0, subdiv: 1, grain: 0.45, crayonStrokes: false });
          }
        }
      });
    }

    // Doodled Projectiles
    for (const s of game.shots) {
      drawList.push({
        depth: s.gy + 0.2,
        draw: () => {
          const [gx0, gy0, pp0] = proj(s.gx, s.gy, 0);
          drawStandeeBaseAndShadow(ctx, gx0, gy0, cam.unit * 0.34 * pp0, s.gz, 780, false, false);

          for (let ti = 0; ti < s.trail.length; ti++) {
            const tr = s.trail[ti];
            const [tx, ty, tpp] = proj(tr.gx, tr.gy, tr.gz);
            const sz = Math.max(6, cam.unit * 0.16 * tpp * (0.65 + ti * 0.06));
            if (ti % 2 === 0) drawDoodleFlame(ctx, tx, ty, sz * 1.15, s.seed + ti * 3, boil, s.projCol, s.coreCol);
            else drawDoodleSpiral(ctx, tx, ty, sz * 0.88, s.coreCol, s.seed + ti, boil);
          }

          const [sx, sy, pp] = proj(s.gx, s.gy, s.gz);
          const [nx, ny] = proj(s.tx, s.ty, s.tz);
          const ang = Math.atan2(ny - sy, nx - sx);
          const pr = Math.max(14, cam.unit * 0.28 * pp);
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(ang);
          crayonPoly(ctx, [
            [pr * 1.15, 0], [pr * 0.28, -pr * 0.74], [-pr * 0.45, -pr * 0.50], [-pr * 1.45, -pr * 0.72],
            [-pr * 0.90, -pr * 0.18], [-pr * 1.68, 0.05], [-pr * 0.90, pr * 0.28], [-pr * 1.35, pr * 0.68],
            [-pr * 0.42, pr * 0.50], [pr * 0.28, pr * 0.74]
          ], s.projCol, s.seed + boil * 19, {
            paperUnder: true, fillAlpha: 0.9, amp: pr * 0.11, lw: 2.8, subdiv: 1, grain: 0.85
          });
          crayonPoly(ctx, [
            [pr * 0.68, 0], [pr * 0.10, -pr * 0.36], [-pr * 0.70, -pr * 0.12], [-pr * 0.60, pr * 0.16], [pr * 0.10, pr * 0.36]
          ], s.coreCol, s.seed + 5 + boil * 19, { amp: pr * 0.07, lw: 1.8, subdiv: 1, crayonStrokes: false });
          ctx.restore();
        }
      });
    }

    // Air-Drawn Cartoon Doodle FX
    for (const f of game.fx) {
      drawList.push({
        depth: f.gy + (f.k === "pop" ? 0.6 : 0.38),
        draw: () => {
          const prog = 1 - clamp(f.life / f.max, 0, 1);
          const alpha = prog < 0.74 ? 1 : clamp((1 - prog) / 0.26, 0, 1);
          const [sx, sy, pp] = proj(f.gx, f.gy, f.gz);
          ctx.save();
          ctx.globalAlpha = alpha;

          if (f.k === "cast") {
            const r = cam.unit * (0.24 + prog * 0.22) * pp;
            drawDoodleFlame(ctx, sx, sy, r * 1.15, f.seed, boil, f.col, "#fffdf6");
          } else if (f.k === "hit") {
            const popScale = easeOutBack(Math.min(1, prog * 2.5));
            const rOut = cam.unit * (f.big ? 0.78 : 0.64) * popScale * pp;
            const rIn = rOut * 0.52;
            const spikes = 8;
            const whitePts = [], outerPts = [], midPts = [];
            for (let i = 0; i < spikes * 2; i++) {
              const a = (i / (spikes * 2)) * TAU + f.seed;
              const rr = (i % 2 === 0 ? rOut : rIn) * (0.90 + hash(i, f.seed) * 0.18);
              whitePts.push([sx + Math.cos(a) * (rr + 7 * pp), sy + Math.sin(a) * (rr + 7 * pp) * 0.85]);
              outerPts.push([sx + Math.cos(a) * rr, sy + Math.sin(a) * rr * 0.85]);
              midPts.push([sx + Math.cos(a) * rr * 0.58, sy + Math.sin(a) * rr * 0.50]);
            }
            crayonPoly(ctx, whitePts, "#fffdf6", f.seed + boil * 13, {
              amp: rOut * 0.05, lw: 1.6, ol: "rgba(155, 138, 118, 0.5)", subdiv: 1, grain: 0.2, crayonStrokes: false
            });
            crayonPoly(ctx, outerPts, f.burstCol || "#ffe24a", f.seed + boil * 13, {
              paperUnder: true, fillAlpha: 0.86, amp: rOut * 0.05, lw: 2.6, subdiv: 1, grain: 0.78
            });
            crayonPoly(ctx, midPts, "#ff6824", f.seed + 3 + boil * 13, {
              amp: rOut * 0.04, lw: 0, subdiv: 1, grain: 0.55, crayonStrokes: false
            });

            ctx.save();
            ctx.translate(sx, sy - rOut * 0.30);
            ctx.rotate((hash(f.seed, 2) - 0.5) * 0.26);
            const fs = Math.round(Math.max(18, cam.unit * (f.big ? 0.36 : 0.32) * popScale * pp));
            ctx.font = `900 ${fs}px "Fredoka", "PingFang SC", sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.lineJoin = "round";
            ctx.strokeStyle = OL;
            ctx.lineWidth = Math.max(4.5, fs * 0.18);
            ctx.strokeText(f.word, 0, 0);
            ctx.fillStyle = "#fffcf4";
            ctx.fillText(f.word, 0, 0);
            ctx.restore();
          } else if (f.k === "doodleBit") {
            const sz = Math.max(6, cam.unit * 0.14 * pp);
            if (f.shape === "star") drawDoodleStar(ctx, sx, sy, sz, f.col, f.seed, boil);
            else if (f.shape === "flame") drawDoodleFlame(ctx, sx, sy, sz * 1.25, f.seed, boil, f.col, "#fffdf6");
            else drawDoodleSpiral(ctx, sx, sy, sz * 0.9, f.col, f.seed, boil);
          } else if (f.k === "puff") {
            const spread = cam.unit * (0.28 + prog * 0.46) * pp;
            const rBase = cam.unit * 0.30 * (1 - prog * 0.22) * pp;
            const puffs = 7;
            for (let p = 0; p < puffs; p++) {
              const a = (p / puffs) * TAU + f.seed;
              const px = sx + Math.cos(a) * spread * 0.72;
              const py = sy + Math.sin(a) * spread * 0.48 - prog * 18 * pp;
              crayonEllipse(ctx, px, py, rBase, rBase * 0.82, p % 2 ? "#fffdf6" : f.tint, f.seed + p + boil * 11, {
                lw: 2.4, amp: 1.6, grain: 0.75, crayonStrokes: false
              });
            }
            crayonEllipse(ctx, sx, sy - prog * 18 * pp, rBase * 1.15, rBase * 0.9, "#fffdf6", f.seed + 9 + boil * 11, {
              lw: 2.6, amp: 1.6, grain: 0.6, crayonStrokes: false
            });
          } else if (f.k === "dust") {
            const sc = f.small ? 0.65 : 1.0;
            const sp = cam.unit * (0.12 + prog * 0.22) * sc * pp;
            for (let k = -1; k <= 1; k += 2) {
              crayonEllipse(ctx, sx + k * sp, sy, cam.unit * 0.12 * sc * pp, cam.unit * 0.08 * sc * pp, "#fffdf6", f.seed + k + boil, {
                lw: 1.8, amp: 0.9, crayonStrokes: false
              });
            }
          } else if (f.k === "pop") {
            const fs = Math.round(Math.max(15, cam.unit * 0.23 * pp));
            ctx.font = `900 ${fs}px "Fredoka", "PingFang SC", sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.lineJoin = "round";
            ctx.strokeStyle = OL;
            ctx.lineWidth = Math.max(4.0, fs * 0.18);
            ctx.strokeText(f.text, sx, sy);
            ctx.fillStyle = f.col;
            ctx.fillText(f.text, sx, sy);
          }

          ctx.restore();
        }
      });
    }

    drawList.sort((a, b) => a.depth - b.depth);
    for (const item of drawList) item.draw();
  }

  /* ================= Input & Virtual Joystick ================= */
  function pointerPos(ev) {
    const rect = canvas.getBoundingClientRect();
    return [ev.clientX - rect.left, ev.clientY - rect.top];
  }

  function towerAtTile(tx, ty) {
    return game.towers.find((t) => t.tx === tx && t.ty === ty) || null;
  }

  function plantAt(tx, ty) {
    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS || PATH_SET.has(tx + "," + ty)) return false;
    if (towerAtTile(tx, ty)) return false;
    if (game.gold < PET_COST) {
      flashNoGold();
      return false;
    }
    game.gold -= PET_COST;
    syncHud();
    game.towers.push(makeTower(tx, ty));
    spawnDustPuff(tx + 0.5, ty + 0.5);
    return true;
  }

  canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
  canvas.addEventListener("pointermove", (ev) => {
    const [sx, sy] = pointerPos(ev);
    const [gx, gy] = screenToGrid(sx, sy);
    const tx = Math.floor(gx), ty = Math.floor(gy);
    hoverTile = (tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS) ? { x: tx, y: ty } : null;
  });
  canvas.addEventListener("pointerleave", () => { hoverTile = null; });
  canvas.addEventListener("pointerdown", (ev) => {
    if (!game || !game.started || game.over) return;
    const [sx, sy] = pointerPos(ev);
    const [gx, gy] = screenToGrid(sx, sy);
    const tx = Math.floor(gx), ty = Math.floor(gy);

    // Right-click OR Move-mode OR tapping on the path/outer meadow -> move hero there!
    const isGrass = tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS && !PATH_SET.has(tx + "," + ty);
    if (ev.button === 2 || tapMode === "move" || !isGrass) {
      game.hero.target = { gx: clamp(gx, 0.2, COLS - 0.2), gy: clamp(gy, 0.2, ROWS - 0.2) };
      return;
    }

    // Left-click / tap grass in plant mode -> plant stationary Chili Mouse tower!
    plantAt(tx, ty);
  });

  window.addEventListener("keydown", (ev) => {
    keys[ev.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(ev.code)) {
      ev.preventDefault();
    }
  });
  window.addEventListener("keyup", (ev) => { keys[ev.code] = false; });

  // Virtual Joystick (works with touch and mouse!)
  const joyZone = document.getElementById("joy-zone");
  const joyKnob = document.getElementById("joy-knob");
  let joyPid = null;

  function updateJoy(clientX, clientY) {
    const r = joyZone.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const maxR = r.width * 0.36;
    let dx = clientX - cx, dy = clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > maxR) {
      dx = (dx / d) * maxR;
      dy = (dy / d) * maxR;
    }
    joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joyVec.x = dx / maxR;
    joyVec.y = dy / maxR;
  }

  joyZone.addEventListener("pointerdown", (ev) => {
    ev.stopPropagation();
    joyPid = ev.pointerId;
    joyZone.setPointerCapture(ev.pointerId);
    joyVec.active = true;
    updateJoy(ev.clientX, ev.clientY);
  });
  joyZone.addEventListener("pointermove", (ev) => {
    if (ev.pointerId !== joyPid) return;
    updateJoy(ev.clientX, ev.clientY);
  });
  const endJoy = (ev) => {
    if (ev.pointerId !== joyPid) return;
    joyPid = null;
    joyVec.active = false;
    joyVec.x = 0;
    joyVec.y = 0;
    joyKnob.style.transform = "translate(0px, 0px)";
  };
  joyZone.addEventListener("pointerup", endJoy);
  joyZone.addEventListener("pointercancel", endJoy);

  // Mode toggle button
  const btnMode = document.getElementById("btn-mode");
  btnMode.addEventListener("click", () => {
    tapMode = tapMode === "plant" ? "move" : "plant";
    btnMode.textContent = tapMode === "plant" ? "🌱 点草地种椒椒鼠 (50🪙)" : "🏃 点地面移动主角";
    btnMode.className = "mode-btn " + tapMode;
  });

  // Hero Picker cards
  document.querySelectorAll(".hero-opt").forEach((btn) => {
    btn.addEventListener("click", () => startWithHero(btn.dataset.hero));
  });

  document.getElementById("btn-speed").addEventListener("click", () => {
    speedMul = speedMul === 1 ? 2 : 1;
    const b = document.getElementById("btn-speed");
    b.textContent = speedMul + "×";
    b.classList.toggle("active", speedMul === 2);
  });
  document.getElementById("btn-reset").addEventListener("click", () => openHeroPicker());
  document.getElementById("ov-btn").addEventListener("click", () => openHeroPicker());
  window.addEventListener("resize", () => updateLayout());

  let lastTs = 0;
  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const rawDt = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000));
    lastTs = ts;
    const dt = rawDt * speedMul;
    simTime += dt;
    step(dt);
    render();
    requestAnimationFrame(loop);
  }

  window.__proto25d = {
    pickHero(k) { startWithHero(k || "chili"); },
    moveHeroTo(gx, gy) { if (game && game.hero) game.hero.target = { gx, gy }; },
    plantTower(tx, ty) { return game && game.started ? plantAt(tx, ty) : false; },
    getState() {
      return game && {
        started: game.started,
        hero: game.hero && { key: game.hero.key, gx: +game.hero.gx.toFixed(2), gy: +game.hero.gy.toFixed(2) },
        wave: game.waveIdx + 1, lives: game.lives, gold: game.gold,
        towers: game.towers.length, over: game.over, won: game.won,
        enemies: game.enemies.length, shots: game.shots.length, fx: game.fx.length
      };
    }
  };

  updateLayout();
  openHeroPicker();
  loadAllAssets(() => { bgCache = null; });
  requestAnimationFrame(loop);
})();
