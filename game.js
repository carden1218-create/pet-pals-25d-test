(() => {
  "use strict";

  const OL = "#2a1f36";
  const TAU = Math.PI * 2;
  const COLS = 11, ROWS = 7;
  const PET_COST = 50;
  const PERSP_K = 0.044;

  const {
    hash, jit, sampleSmoothLoop, makeEllipsePts, tracePoly, strokeWaxCrayon, fillWaxCrayon, buildCardboardStandees, whenReady, drawCrumpledPaperOverlay, paintKraftMottle, drawCorrugatedWallFlutes
  } = window.PaperCraft;

  // 25 path tiles winding across 11x7 -> 52 grass placement slots!
  const PATH = [
    [0, 1], [1, 1], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5],
    [3, 5], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1],
    [5, 1], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    [7, 5], [8, 5], [8, 4], [8, 3], [9, 3], [10, 3]
  ];
  const PATH_SET = new Set(PATH.map(([x, y]) => x + "," + y));

  const HERO_DEFS = {
    chili: {
      img: "chili", name: "椒椒鼠", fxKind: "fire", moveSpd: 4.3, range: 3.25, atkRate: 0.50, dmg: 30,
      projCol: "#ff4b1f", coreCol: "#ffe24a", burstCol: "#ff6d28", wordOl: "#6b1808",
      words: ["POW!", "BOOM!", "轰!", "烧!"],
      burnDur: 2.6, slowDur: 0, splash: 0
    },
    lemon: {
      img: "lemon", name: "闪电鸡", fxKind: "lightning", moveSpd: 4.9, range: 3.55, atkRate: 0.36, dmg: 22,
      projCol: "#269ef5", coreCol: "#fff454", burstCol: "#ffe944", wordOl: "#13428c",
      words: ["ZAP!", "啪!", "闪!"],
      burnDur: 0, slowDur: 0, splash: 0, chainRange: 2.95
    },
    blueberry: {
      img: "blueberry", name: "蓝莓枭", fxKind: "frost", moveSpd: 4.1, range: 3.40, atkRate: 0.62, dmg: 28,
      projCol: "#3c7cf5", coreCol: "#e4f7ff", burstCol: "#72d8ff", wordOl: "#153d88",
      words: ["SPLASH!", "冰!", "冻!"],
      burnDur: 0, slowDur: 2.4, splash: 1.75
    }
  };

  const SCENIC_PROPS = [
    { kind: "tree",  gx: 0.65,  gy: -0.18, scale: 0.92, seed: 11, hillLayers: 2 },
    { kind: "bush",  gx: 2.75,  gy: -0.15, scale: 0.92, seed: 33, hillLayers: 2 },
    { kind: "tree",  gx: 6.15,  gy: -0.20, scale: 0.92, seed: 22, hillLayers: 3 },
    { kind: "bush",  gx: 7.95,  gy: -0.14, scale: 0.92, seed: 38, hillLayers: 2 },
    { kind: "tree",  gx: 9.75,  gy: -0.12, scale: 0.92, seed: 29, hillLayers: 2 },
    { kind: "rock",  gx: -0.40, gy: 3.85,  scale: 0.96, seed: 44, hillLayers: 1 },
    { kind: "tree",  gx: 11.25, gy: 1.95,  scale: 0.95, seed: 55, hillLayers: 2 },
    { kind: "sign",  gx: 0.45,  gy: 0.62,  scale: 0.92, seed: 77, hillLayers: 0 },
    { kind: "fence", gx: 1.25,  gy: 7.12,  scale: 1.00, seed: 81, hillLayers: 1 },
    { kind: "bush",  gx: 3.65,  gy: 7.08,  scale: 0.95, seed: 66, hillLayers: 0 },
    { kind: "fence", gx: 5.55,  gy: 7.08,  scale: 1.00, seed: 82, hillLayers: 0 },
    { kind: "rock",  gx: 7.65,  gy: 7.14,  scale: 0.92, seed: 69, hillLayers: 1 },
    { kind: "fence", gx: 9.45,  gy: 7.14,  scale: 1.00, seed: 83, hillLayers: 1 }
  ];

  const WAVES = [
    [{ kind: "z1", delay: 0.25 }, { kind: "z1", delay: 1.35 }, { kind: "z1", delay: 1.3 }, { kind: "z1", delay: 1.25 }],
    [{ kind: "z1", delay: 1.5 }, { kind: "z2", delay: 1.3 }, { kind: "z1", delay: 1.15 }, { kind: "z2", delay: 1.3 }, { kind: "z1", delay: 1.15 }, { kind: "z2", delay: 1.3 }],
    [{ kind: "z2", delay: 1.5 }, { kind: "z1", delay: 1.0 }, { kind: "z3", delay: 1.25 }, { kind: "z2", delay: 1.15 }, { kind: "z3", delay: 1.25 }, { kind: "z2", delay: 1.1 }, { kind: "z3", delay: 1.25 }],
    [{ kind: "z2", delay: 1.4 }, { kind: "z3", delay: 1.05 }, { kind: "z2", delay: 0.95 }, { kind: "z3", delay: 1.05 }, { kind: "z1", delay: 0.8 }, { kind: "z3", delay: 1.0 }, { kind: "z3", delay: 1.05 }, { kind: "z2", delay: 1.0 }],
    [{ kind: "z3", delay: 1.5 }, { kind: "z2", delay: 0.9 }, { kind: "z3", delay: 1.0 }, { kind: "z3", delay: 0.95 }, { kind: "z2", delay: 0.85 }, { kind: "z3", delay: 1.0 }, { kind: "z3", delay: 1.15, boss: true }]
  ];

  const ENEMY_DEF = {
    z1: { img: "z1", hp: 46, speed: 1.48, size: 1.0, tint: "#86de44", reward: 12 },
    z2: { img: "z2", hp: 88, speed: 1.32, size: 1.08, tint: "#62c0ff", reward: 16 },
    z3: { img: "z3", hp: 132, speed: 1.48, size: 1.14, tint: "#ff7236", reward: 22 }
  };

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  const LAYERS = buildCardboardStandees();

  function renderHeroThumbs() {
    document.querySelectorAll("canvas.hero-thumb").forEach((cv) => {
      const k = cv.dataset.thumb;
      const arr = LAYERS[k];
      if (!arr) return;
      const c = cv.getContext("2d");
      c.clearRect(0, 0, cv.width, cv.height);
      arr.forEach((L, idx) => {
        c.save();
        if (idx > 0) {
          c.shadowColor = "rgba(38, 22, 12, 0.32)";
          c.shadowOffsetX = 2.5;
          c.shadowOffsetY = 3.5;
          c.shadowBlur = 3;
        }
        c.drawImage(L.cv, 0, 0, cv.width, cv.height);
        c.restore();
      });
    });
  }

  /* ================= Flat Full-Screen Continuous Wax Crayon Floor ================= */
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  let W = 1280, H = 720, DPR = 1;
  let cam = { ox: 640, oy: 400, tw: 84, th: 40, zs: 80, unit: 84, portrait: false, cosA: Math.cos(0.22), sinA: Math.sin(0.22) };
  let bgCache = null;

  function updateLayout() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(320, window.innerWidth);
    H = Math.max(320, window.innerHeight);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);

    const portrait = W < H;
    // Landscape: sleek 12.6 deg oblique 3D tilt filling ~92% screen width; Portrait: 66 deg tall 3D orientation filling width & height!
    const ang = portrait ? 1.24 : 0.16;
    const cosA = Math.cos(ang), sinA = Math.sin(ang);
    const tilt = portrait ? 1.14 : 0.44;
    const spanU = COLS * cosA + ROWS * sinA + (portrait ? 0.85 : 1.05);
    const spanV = COLS * sinA + ROWS * cosA + (portrait ? 0.75 : 0.85);
    const maxTwByW = (W * (portrait ? 0.90 : 0.95)) / (spanU * 0.95);
    const maxTwByH = (H * (portrait ? 0.81 : 0.78)) / (spanV * tilt * 0.94 + 0.78);
    const tw = Math.max(28, Math.min(maxTwByW, maxTwByH));
    const th = tw * tilt;

    cam = {
      ox: W * (portrait ? 0.495 : 0.488),
      oy: H * (portrait ? 0.505 : 0.528),
      tw, th,
      zs: tw * (portrait ? 1.26 : 0.90),
      unit: tw,
      portrait, cosA, sinA
    };
    bgCache = null;
  }

  function depthOf(gx, gy) {
    return (gx - COLS * 0.5) * cam.sinA + (gy - ROWS * 0.5) * cam.cosA;
  }

  function proj(gx, gy, gz = 0) {
    const cx = gx - COLS * 0.5;
    const cy = gy - ROWS * 0.5;
    const u = cx * cam.cosA - cy * cam.sinA;
    const v = cx * cam.sinA + cy * cam.cosA;
    const p = 1 / (1 - v * PERSP_K);
    return [
      cam.ox + u * cam.tw * p,
      cam.oy + (v * cam.th - gz * cam.zs) * p,
      p
    ];
  }

  function screenToGrid(sx, sy) {
    const dy = (sy - cam.oy) / cam.th;
    const v = dy / (1 + dy * PERSP_K);
    const p = 1 / (1 - v * PERSP_K);
    const u = (sx - cam.ox) / (cam.tw * p);
    const cx = u * cam.cosA + v * cam.sinA;
    const cy = -u * cam.sinA + v * cam.cosA;
    return [cx + COLS * 0.5, cy + ROWS * 0.5];
  }

  function tileCorners(tx, ty, pad = 0, gz = 0) {
    const x0 = tx + pad, x1 = tx + 1 - pad;
    const y0 = ty + pad, y1 = ty + 1 - pad;
    return [proj(x0, y0, gz), proj(x1, y0, gz), proj(x1, y1, gz), proj(x0, y1, gz)];
  }

  function getHillLayerH() {
    return Math.max(11, Math.min(17.5, cam.unit * (cam.portrait ? 0.34 : 0.20)));
  }

  // Draw an irregular raised cardboard hill/terrace with two-plane directional lighting (sunlit left, darker right),
  // visible corrugated flutes, ambient occlusion seams, and GREEN crayon top on every protruding ledge!
  function drawCardboardHillSlab(c, pts, layerH, numLayers, seed, opts = {}) {
    const riseUp = !!opts.riseUp;
    const topFillFn = opts.topFillFn || null;
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;

    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const p of pts) {
      if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
    }

    const expandUneven = (src, L, sSeed) => {
      const baseStep = opts.stepOut ?? (cam.portrait ? 7.5 : 13);
      const phase1 = hash(sSeed, 17) * TAU;
      const phase2 = hash(sSeed, 43) * TAU;
      return src.map(([x, y], i) => {
        // Rough slightly torn / die-cut perimeter wobble on every layer (even L=0!)
        const rough = (hash(i * 19 + sSeed, L * 31 + 3) - 0.5) * 3.4;
        if (L === 0) return [x + rough * 0.65, y + rough * 0.45];
        const dx = x - cx, dy = y - cy;
        const d = Math.max(1, Math.hypot(dx, dy));
        const ang = Math.atan2(dy, dx);
        const lobe = 0.72 + 0.52 * Math.sin(ang * 3 + phase1 + L * 1.3) + 0.34 * Math.cos(ang * 5 + phase2);
        const j = (hash(i * 11 + sSeed, L * 23 + 7) - 0.5) * 8.5;
        const distOut = Math.max(4, L * baseStep * lobe + j);
        return [x + (dx / d) * distOut + rough, y + (dy / d) * distOut * (cam.portrait ? 0.86 : 0.64) + rough * 0.6];
      });
    };

    // Uneven thickness per stacked cardboard sheet (mimics hand-glued layered corrugated board!)
    const layerHeights = [];
    for (let L = 0; L < numLayers; L++) {
      layerHeights[L] = Math.max(9.0, layerH * (0.86 + hash(L, seed + 53) * 0.30));
    }
    const yOffsets = new Array(numLayers).fill(0);
    if (riseUp) {
      let acc = 0;
      for (let L = numLayers - 2; L >= 0; L--) {
        acc -= layerHeights[L];
        yOffsets[L] = acc;
      }
    } else {
      let acc = 0;
      for (let L = 1; L < numLayers; L++) {
        acc += layerHeights[L - 1];
        yOffsets[L] = acc;
      }
    }
    const botYOff = riseUp ? layerHeights[numLayers - 1] : yOffsets[numLayers - 1] + layerHeights[numLayers - 1];

    // Strong directional cast shadow on ground to bottom-right (top-left crayon sun)
    c.save();
    c.translate(16, botYOff + 14);
    tracePoly(c, expandUneven(pts, numLayers - 1, seed + 1));
    c.fillStyle = "rgba(42, 26, 12, 0.30)";
    c.fill();
    c.restore();

    for (let L = numLayers - 1; L >= 0; L--) {
      const yOff = yOffsets[L];
      const curH = layerHeights[L];
      const layerPts = expandUneven(pts, L, seed + L * 29);

      // Soft contact shadow tucked underneath this stacked layer onto the layer below!
      if (L < numLayers - 1 || !riseUp) {
        c.save();
        c.translate(3.5, yOff + curH + 4.5);
        tracePoly(c, layerPts);
        c.fillStyle = "rgba(26, 12, 3, 0.24)";
        c.fill();
        c.translate(1.5, 2.5);
        c.fillStyle = "rgba(26, 12, 3, 0.16)";
        c.fill();
        c.restore();
      }

      // Build exposed cardboard cliff wall mask (only visible front & side thickness, NOT top face)
      const wallMask = document.createElement("canvas");
      wallMask.width = c.canvas.width; wallMask.height = c.canvas.height;
      const wc = wallMask.getContext("2d");
      wc.scale(DPR, DPR);
      const steps = Math.max(10, Math.round(curH));
      for (let s = steps; s >= 1; s--) {
        wc.save(); wc.translate(0, yOff + (s / steps) * curH); tracePoly(wc, layerPts); wc.fillStyle = "#000"; wc.fill(); wc.restore();
      }
      wc.globalCompositeOperation = "destination-out";
      wc.save(); wc.translate(0, yOff); tracePoly(wc, layerPts); wc.fillStyle = "#000"; wc.fill(); wc.restore();

      const wallArt = document.createElement("canvas");
      wallArt.width = c.canvas.width; wallArt.height = c.canvas.height;
      const fc = wallArt.getContext("2d");
      fc.scale(DPR, DPR);

      // Directional 3D kraft base (sunlit left-front -> shaded right-front) + real mottled kraft pulp fibers!
      const wallGrad = fc.createLinearGradient(minX - 40, cy, maxX + 40, cy);
      wallGrad.addColorStop(0, "#bc854d");
      wallGrad.addColorStop(0.55, "#945f30");
      wallGrad.addColorStop(1, "#6b3e1a");
      fc.fillStyle = wallGrad;
      fc.fillRect(0, 0, W, H);

      paintKraftMottle(fc, minX - 60, minY + yOff - 20, (maxX - minX) + 120, (maxY - minY) + curH + 60, seed + L * 37);

      // Subtle vertical dent / crush creases in the cardboard wall
      for (let di = 0; di < 7; di++) {
        const dx = minX + hash(di * 13, seed + L * 19) * (maxX - minX);
        fc.fillStyle = di % 2 ? "rgba(42, 20, 6, 0.16)" : "rgba(232, 192, 144, 0.12)";
        fc.fillRect(dx, minY + yOff, 3.5 + hash(di, seed) * 5, (maxY - minY) + curH + 40);
      }

      // Authentic two-liner + continuous sinusoidal corrugated flute wave (no polka dots!)
      drawCorrugatedWallFlutes(fc, layerPts, yOff, curH, seed + L * 43, minX, maxX);

      // Clip wall art cleanly to exposed side wall and stamp
      fc.globalCompositeOperation = "destination-in";
      fc.setTransform(1, 0, 0, 1, 0, 0);
      fc.drawImage(wallMask, 0, 0);

      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(wallArt, 0, 0); c.restore();

      // Rough dark cut bottom edge line
      c.save();
      c.translate(0, yOff + curH);
      strokeWaxCrayon(c, layerPts, "#2c1405", 2.0, seed + L * 71, true);
      c.restore();

      // Top face of EVERY raised/protruding cardboard stratum is GREEN real-crayon grass!
      c.save();
      c.translate(0, yOff);
      if (L > 0) {
        const shelfCols = ["#8dc748", "#9ed455", "#80b83c"];
        fillWaxCrayon(c, layerPts, shelfCols[L % shelfCols.length], seed + L * 17, {
          toothCol: "#fcf6e2", coverage: 0.78, toothAlpha: 0.88, clumpAlpha: 0.38,
          lw: 2.9, ol: "#344f1c", bleed: false
        });
        c.save(); tracePoly(c, layerPts); c.clip();
        drawCrumpledPaperOverlay(c, W, H, 920 + seed + L, { cell: 64, strength: 0.74, coloredSurface: true });
        c.restore();
      } else {
        if (topFillFn) {
          topFillFn(layerPts);
        } else {
          fillWaxCrayon(c, layerPts, "#a8d85c", seed + 30, {
            toothCol: "#fdf7e3", coverage: 0.76, toothAlpha: 0.90, clumpAlpha: 0.40,
            lw: 3.3, ol: "#34501c"
          });
          c.save(); tracePoly(c, layerPts); c.clip();
          for (let m = 0; m < 4; m++) {
            const mx = cx + (hash(m, seed + 5) - 0.5) * 76;
            const my = cy + (hash(m, seed + 9) - 0.5) * 28;
            fillWaxCrayon(c, makeEllipsePts(mx, my, 40, 20, 12, seed + m), m % 2 ? "#c2e878" : "#80b83a", seed + m, {
              withBase: false, coverage: 0.42, toothAlpha: 0.75, clumpAlpha: 0.30, lw: 0
            });
          }
          drawCrumpledPaperOverlay(c, W, H, 935 + seed, { cell: 60, strength: 0.80, coloredSurface: true });
          c.restore();
          strokeWaxCrayon(c, layerPts, "#36501c", 2.9, seed + 55, true);
        }
      }
      c.restore();
    }
  }

  function drawRaisedMoundByKey(c, mSpec) {
    const layerH = getHillLayerH();
    const mPts = sampleSmoothLoop(mSpec.ctrl.map(([gx, gy]) => proj(gx, gy, 0)), 4);
    drawCardboardHillSlab(c, mPts, layerH * 0.95, mSpec.layers, mSpec.seed, {
      riseUp: true, stepOut: cam.portrait ? 5.5 : 10.0
    });
  }

  function drawFlatFloor(c) {
    // 1. BLUE CRAYON SKY band at top (~20% of screen) + rolling real-crayon green meadow floor!
    const horizonY = H * (cam.portrait ? 0.145 : 0.155);
    fillWaxCrayon(c, [[0, 0], [W, 0], [W, horizonY + 60], [0, horizonY + 60]], "#8ed0f8", 12, {
      toothCol: "#faf7ec", coverage: 0.74, toothAlpha: 0.90, clumpAlpha: 0.26, lw: 0, softEdge: false
    });
    fillWaxCrayon(c, [[0, horizonY * 0.45], [W, horizonY * 0.45], [W, horizonY + 65], [0, horizonY + 65]], "#c0e6fc", 14, {
      withBase: false, coverage: 0.54, toothAlpha: 0.82, clumpAlpha: 0.18, lw: 0, softEdge: false
    });

    // Subtle warm diagonal sunbeams from top-left
    c.save();
    c.fillStyle = "rgba(255, 252, 234, 0.20)";
    for (let i = 0; i < 3; i++) {
      const bx = W * (0.04 + i * 0.24);
      c.beginPath();
      c.moveTo(bx, 0); c.lineTo(bx + W * 0.11, 0);
      c.lineTo(bx + W * 0.30, H); c.lineTo(bx + W * 0.13, H);
      c.closePath(); c.fill();
    }
    c.restore();

    // Hand-drawn yellow crayon sun in upper-left sky band
    const sunX = W * (cam.portrait ? 0.15 : 0.085);
    const sunY = H * (cam.portrait ? 0.115 : 0.135);
    const sunR = Math.min(W, H) * 0.036;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      strokeWaxCrayon(c, [
        [sunX + Math.cos(a) * sunR * 1.25, sunY + Math.sin(a) * sunR * 1.25],
        [sunX + Math.cos(a) * sunR * 1.65, sunY + Math.sin(a) * sunR * 1.65]
      ], "#ffd24a", 2.8, 21 + i, false);
    }
    fillWaxCrayon(c, makeEllipsePts(sunX, sunY, sunR, sunR, 16, 20), "#ffe664", 20, {
      toothAlpha: 0.60, lw: 2.6, ol: OL, softEdge: false
    });

    // Puffy multi-lobe REAL CRAYON clouds (waxy cream-white + soft blue belly + sketchy crayon outline!)
    const clouds = [[0.33, 0.10, 0.90], [0.62, 0.11, 1.05], [0.87, 0.095, 0.85]];
    for (let ci = 0; ci < clouds.length; ci++) {
      const [cxr, cyr, sc] = clouds[ci];
      const clx = W * cxr, cly = H * cyr;
      const u = Math.min(W, H) * 0.036 * sc;
      const cloudPts = sampleSmoothLoop([
        [clx - u * 1.65, cly + u * 0.42],
        [clx - u * 1.80, cly - u * 0.12],
        [clx - u * 1.15, cly - u * 0.58],
        [clx - u * 0.45, cly - u * 0.92],
        [clx + u * 0.35, cly - u * 0.88],
        [clx + u * 1.05, cly - u * 0.50],
        [clx + u * 1.75, cly - u * 0.10],
        [clx + u * 1.60, cly + u * 0.44],
        [clx, cly + u * 0.52]
      ], 3);
      fillWaxCrayon(c, cloudPts, "#fffdf5", 30 + ci, {
        toothCol: "#e6f4fc", coverage: 0.84, toothAlpha: 0.72, clumpAlpha: 0.22,
        lw: 0, bleed: true, bleedW: 3.5
      });
      fillWaxCrayon(c, makeEllipsePts(clx + u * 0.12, cly + u * 0.24, u * 1.35, u * 0.26, 12, 35 + ci), "#cfe9fa", 35 + ci, {
        withBase: false, coverage: 0.45, toothAlpha: 0.65, lw: 0
      });
      strokeWaxCrayon(c, cloudPts, "#5b89ad", 2.4, 39 + ci, true);
    }

    // Distant rolling crayon meadow hills + consistent waxy crayon grass across the lower panorama!
    const bgHill1 = [[0, H], [0, horizonY + 14]];
    for (let x = 0; x <= W + 60; x += 60) bgHill1.push([x, horizonY + 10 + Math.sin(x * 0.0055 + 0.7) * 18]);
    bgHill1.push([W, H]);
    fillWaxCrayon(c, bgHill1, "#c4e282", 40, {
      toothCol: "#faf6e4", coverage: 0.76, toothAlpha: 0.90, clumpAlpha: 0.34, lw: 2.2, ol: "rgba(68, 108, 36, 0.55)", softEdge: false
    });

    const bgHill2 = [[0, H], [0, horizonY + 46]];
    for (let x = 0; x <= W + 50; x += 50) bgHill2.push([x, horizonY + 42 + Math.cos(x * 0.007 - 0.5) * 14]);
    bgHill2.push([W, H]);
    fillWaxCrayon(c, bgHill2, "#add462", 42, {
      toothCol: "#faf6e4", coverage: 0.74, toothAlpha: 0.92, clumpAlpha: 0.38, lw: 2.2, ol: "rgba(58, 96, 30, 0.50)", softEdge: false
    });

    c.save();
    tracePoly(c, bgHill2);
    c.clip();
    for (let mi = 0; mi < 12; mi++) {
      const mx = hash(mi * 13, 19) * W;
      const my = horizonY + 60 + hash(mi * 7, 31) * (H - horizonY - 60);
      const rx = Math.min(W, H) * (0.12 + hash(mi, 43) * 0.14);
      fillWaxCrayon(c, makeEllipsePts(mx, my, rx, rx * 0.45, 14, 150 + mi), mi % 2 ? "#c2e47a" : "#96c44c", 150 + mi, {
        withBase: false, coverage: 0.36, toothAlpha: 0.85, clumpAlpha: 0.32, lw: 0
      });
    }
    c.restore();

    // Soft organic CRUMPLED PAPER creases across the blue sky & lower meadow!
    drawCrumpledPaperOverlay(c, W, H, 808, { cell: 112, strength: 0.92, coloredSurface: false });

    const layerH = getHillLayerH();
    const ox = cam.portrait ? 0.32 : 0.60;

    // 2. Main lumpy, organic raised 3-layer cardboard hill island in 3/4 oblique isometric perspective!
    const hillCtrl = [
      proj(-0.22 - ox * 0.3, -0.05, 0),
      proj(1.40, -0.28, 0),
      proj(3.55, -0.06, 0),
      proj(6.05, -0.32, 0),
      proj(8.25, -0.06, 0),
      proj(10.35, -0.24, 0),
      proj(11.24 + ox * 0.3,  0.35, 0),
      proj(11.48 + ox * 0.55, 2.05, 0),
      proj(11.08 + ox * 0.18, 4.10, 0),
      proj(11.34 + ox * 0.38, 5.85, 0),
      proj(10.92 + ox * 0.22, 7.28, 0),
      proj(8.85,  7.42, 0),
      proj(7.15,  7.10, 0),
      proj(5.45,  7.04, 0),
      proj(3.75,  7.14, 0),
      proj(1.75,  7.38, 0),
      proj(-0.20 - ox * 0.2, 7.22, 0),
      proj(-0.26 - ox * 0.25, 5.35, 0),
      proj(-0.55 - ox * 0.55, 3.82, 0),
      proj(-0.22 - ox * 0.2,  1.85, 0)
    ];
    const mainHillPts = sampleSmoothLoop(hillCtrl, 4);

    drawCardboardHillSlab(c, mainHillPts, layerH, 3, 25, {
      riseUp: false,
      stepOut: cam.portrait ? 7.0 : 12.5,
      topFillFn: (pts) => {
        // Heavy real-crayon meadow base with visible white paper-tooth speckle!
        fillWaxCrayon(c, pts, "#a4d658", 71, {
          toothCol: "#fdf8e4", coverage: 0.74, toothAlpha: 0.92, clumpAlpha: 0.42,
          lw: 3.6, ol: "#36521c", bleed: true, bleedW: 4.5
        });

        c.save();
        tracePoly(c, pts);
        c.clip();

        // Sunlit top-left rim highlight along upper-left hill contour (classic v1 3D cue!)
        c.save();
        c.strokeStyle = "rgba(220, 250, 148, 0.55)";
        c.lineWidth = 6;
        c.lineCap = "round";
        tracePoly(c, pts.slice(0, Math.floor(pts.length * 0.36)), false);
        c.stroke();
        c.restore();

        // Organic crayon pressure patches across the 11x7 meadow
        for (let i = 0; i < 16; i++) {
          const gx = 0.25 + hash(i * 7, 13) * (COLS - 0.5);
          const gy = 0.25 + hash(i * 11, 29) * (ROWS - 0.5);
          const [px, py, pp] = proj(gx, gy, 0);
          const rx = cam.unit * (0.75 + hash(i, 41) * 0.85) * pp;
          fillWaxCrayon(c, makeEllipsePts(px, py, rx, rx * 0.52, 16, 80 + i), i % 2 ? "#c2e876" : "#7cb83a", 80 + i, {
            withBase: false, coverage: 0.34, toothAlpha: 0.84, clumpAlpha: 0.32, lw: 0
          });
        }

        // 11x7 Grass tiles & S-curve path tiles (drawn back-to-front for crisp 3D overlap!)
        for (let d = 0; d <= COLS + ROWS - 2; d++) {
          for (let tx = 0; tx < COLS; tx++) {
            const ty = d - tx;
            if (ty < 0 || ty >= ROWS) continue;
            const isPath = PATH_SET.has(tx + "," + ty);
            const rawCorners = tileCorners(tx, ty, 0, 0);
            const corners = rawCorners.map(([x, y], idx) => [
              x + jit(tx * 13 + ty * 7 + idx, 91) * 2.8,
              y + jit(tx * 19 + ty * 3 + idx, 97) * 2.4
            ]);

            if (isPath) {
              const pathCols = ["#ecc87d", "#e3b96c", "#efd089"];
              const pCol = pathCols[(tx + ty) % pathCols.length];
              fillWaxCrayon(c, corners, pCol, 300 + tx * 11 + ty, {
                toothCol: "#fdf7e4", coverage: 0.78, toothAlpha: 0.88, clumpAlpha: 0.40,
                bleed: true, bleedAlpha: 0.32, bleedW: 4.5, lw: 0
              });
              // Top-left recessed bevel shadow for sunken 3D path depth (from v1!)
              c.save();
              c.strokeStyle = "rgba(116, 72, 30, 0.46)";
              c.lineWidth = Math.max(2.6, cam.unit * 0.08 * corners[0][2]);
              c.lineCap = "round";
              c.beginPath();
              c.moveTo(corners[3][0], corners[3][1]);
              c.lineTo(corners[0][0], corners[0][1]);
              c.lineTo(corners[1][0], corners[1][1]);
              c.stroke();
              c.restore();

              strokeWaxCrayon(c, corners, "rgba(104, 66, 28, 0.72)", 2.2, 360 + tx * 13 + ty, true);

              for (let k = 0; k < 2; k++) {
                const gx = tx + 0.24 + hash(tx * 7 + k, ty * 13) * 0.52;
                const gy = ty + 0.24 + hash(tx * 17, ty * 5 + k) * 0.52;
                const [px, py, pp] = proj(gx, gy, 0);
                const r = cam.unit * (0.072 + k * 0.018) * pp;
                fillWaxCrayon(c, makeEllipsePts(px, py, r, r * 0.62, 10, 400 + tx + k), k ? "#f5ead2" : "#b88446", 400 + tx + k, {
                  toothAlpha: 0.60, lw: 1.6, ol: "rgba(76, 46, 20, 0.76)", softEdge: false
                });
              }
            } else {
              const gCols = ["#aedc66", "#9dce52", "#b8e272", "#90c244"];
              const gCol = gCols[(tx * 3 + ty) % gCols.length];
              fillWaxCrayon(c, corners, gCol, 500 + tx * 13 + ty, {
                withBase: false, coverage: 0.62, toothAlpha: 0.88, clumpAlpha: 0.38,
                bleed: true, bleedAlpha: 0.24, bleedW: 3.8, lw: 0
              });
              strokeWaxCrayon(c, corners, "rgba(56, 94, 28, 0.52)", 1.9, 540 + tx * 11 + ty, true);

              // Sketchy crayon plant-slot corner ticks
              const inner = tileCorners(tx, ty, 0.15, 0);
              for (let ci = 0; ci < 4; ci++) {
                const pA = inner[ci], pB = inner[(ci + 1) % 4], pP = inner[(ci + 3) % 4];
                const m1 = [lerp(pA[0], pB[0], 0.22), lerp(pA[1], pB[1], 0.22)];
                const m2 = [lerp(pA[0], pP[0], 0.22), lerp(pA[1], pP[1], 0.22)];
                strokeWaxCrayon(c, [m2, pA, m1], "rgba(255, 250, 224, 0.72)", 1.8, 610 + tx * 11 + ty * 5 + ci, false);
              }

              const rnd = hash(tx + 5, ty + 11);
              if (rnd > 0.38) {
                const [gx, gy, pp] = proj(tx + 0.22 + rnd * 0.45, ty + 0.74, 0);
                strokeWaxCrayon(c, [
                  [gx - 3.5 * pp, gy - 6 * pp], [gx, gy], [gx + 3 * pp, gy - 7 * pp]
                ], "rgba(48, 98, 26, 0.86)", 2.2, 700 + tx + ty, false);
              }
              if (rnd > 0.74) {
                const [fx, fy, pp] = proj(tx + 0.68, ty + 0.30, 0);
                const fCol = (tx + ty) % 2 ? "#ff8eba" : "#ffe658";
                fillWaxCrayon(c, makeEllipsePts(fx, fy, 3.8 * pp, 3.0 * pp, 10, 800 + tx), fCol, 800 + tx, {
                  toothAlpha: 0.40, lw: 1.5, ol: "#4a2c24", softEdge: false
                });
              }
            }
          }
        }

        // Tonal crumpled paper creases through the hill grass & path (preserves 3D lighting & sunken bevels!)
        drawCrumpledPaperOverlay(c, W, H, 955, { cell: 104, strength: 0.75, coloredSurface: true });

        c.restore();
        strokeWaxCrayon(c, pts, "#344e1a", 3.2, 777, true);
      }
    });

    // 3. Raised Multi-Layer Back & Side Cardboard Hillocks (2 to 4 stacked layers each, green top + directional brown walls!)
    const backAndSideMounds = [
      {
        layers: 3, seed: 41,
        ctrl: [[-0.25, 0.04], [-0.15, -0.45], [0.95, -0.72], [2.45, -0.58], [3.55, -0.32], [3.65, 0.06], [1.75, 0.10]]
      },
      {
        layers: 3, seed: 53,
        ctrl: [[4.95, 0.05], [5.25, -0.42], [6.85, -0.76], [8.75, -0.68], [10.45, -0.44], [10.72, 0.06], [7.85, 0.08]]
      },
      {
        layers: 4, seed: 59,
        ctrl: [[5.55, -0.02], [5.85, -0.55], [6.85, -0.82], [7.95, -0.58], [8.20, -0.02], [6.90, 0.04]]
      },
      {
        layers: 2, seed: 64,
        ctrl: [[-0.65 - ox * 0.45, 3.35], [-0.45 - ox * 0.35, 2.85], [0.05, 3.05], [0.06, 4.55], [-0.42 - ox * 0.30, 4.70]]
      },
    ];
    for (const mk of backAndSideMounds) drawRaisedMoundByKey(c, mk);
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

  /* ================= Game State ================= */
  let simTime = 0;
  let speedMul = 1;
  let shakeT = 0;
  let shakeMag = 0;
  function triggerShake(mag, dur) { if (mag >= shakeMag || shakeT <= 0) { shakeMag = mag; shakeT = dur; } }
  let hoverTile = null;
  let tapMode = "plant";
  let chosenHeroKey = "chili";
  let game = null;
  const keys = {};
  const joyVec = { x: 0, y: 0, active: false };

  function makeHero(heroKey) {
    const def = HERO_DEFS[heroKey] || HERO_DEFS.chili;
    return {
      key: heroKey, def, gx: 4.5, gy: 3.5, gz: 0,
      vx: 0, vy: 0, target: null, walkPhase: 0, dustTimer: 0,
      facing: 1, waddle: 0, atkCd: 0.15, recoil: 0
    };
  }

  function makeTower(tx, ty) {
    return {
      tx, ty, gx: tx + 0.5, gy: ty + 0.5, gz: 0,
      range: 3.15, atkCd: 0.12, atkRate: 0.62, dmg: 26,
      facing: 1, recoil: 0, phase: Math.random() * TAU
    };
  }

  function openHeroPicker() {
    game = {
      started: false, waveIdx: 0, spawnIdx: 0, spawnTimer: 0.35, wavePause: 0,
      lives: 1, gold: 60, over: false, won: false,
      hero: makeHero(chosenHeroKey), towers: [], enemies: [], shots: [], fx: [], scorch: []
    };
    document.getElementById("overlay").classList.add("hidden");
    document.getElementById("pick-overlay").classList.remove("hidden");
    syncHud();
  }

  function startWithHero(heroKey) {
    chosenHeroKey = heroKey;
    game = {
      started: true, waveIdx: 0, spawnIdx: 0, spawnTimer: 0.25, wavePause: 0,
      lives: 1, gold: 60, over: false, won: false,
      hero: makeHero(heroKey), towers: [], enemies: [], shots: [], fx: [], scorch: []
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
    document.getElementById("ov-title").textContent = won ? "You win! 🎉" : "Try again! 💥";
    document.getElementById("ov-sub").textContent = won
      ? (game.hero.def.name + "和小鸡窝一起守住了全 5 波！")
      : "史莱姆闯进小窝了！(小窝只有 1 点生命)";
    document.getElementById("ov-btn").textContent = won ? "Replay / 再玩一次" : "Try again / 再试一次";
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
  /* ================= Hero Signature Cardboard + Crayon FX ================= */
  function addFx(obj) { game.fx.push(obj); }

  function spawnCastDoodle(gx, gy, gz, dx, dy, col, fxKind = "fire") {
    addFx({ k: "cast", fxKind, gx, gy, gz, dx, dy, col: col || "#ffe24a", life: 0.24, max: 0.24, seed: Math.floor(Math.random() * 9999) });
  }

  function spawnImpactDoodle(gx, gy, gz, isKill, opt = {}) {
    const words = opt.words || ["POW!", "BOOM!", "轰!"];
    const word = words[Math.floor(Math.random() * words.length)];
    const fxKind = opt.fxKind || "fire";
    const burstCol = opt.burstCol || "#ffe24a";

    // Punchy screen shake on hit / kill!
    triggerShake(isKill ? 6.5 : 3.8, isKill ? 0.18 : 0.12);

    // Explosive upward-offset starburst so the burst feels huge & punchy without hiding the slime!
    addFx({
      k: "hit", fxKind, gx: gx + (Math.random() - 0.5) * 0.12, gy: gy - 0.10, gz: gz + 0.42,
      word, big: !!isKill, burstCol, wordOl: opt.wordOl || OL,
      life: 0.52, max: 0.52, seed: Math.floor(Math.random() * 9999)
    });

    // Double expanding shockwave rings on the ground!
    if (fxKind === "frost") {
      addFx({
        k: "frostRing", gx, gy, gz: 0.04, r: (opt.splash || 1.25) * (isKill ? 1.25 : 1.08),
        life: 0.50, max: 0.50, seed: Math.floor(Math.random() * 9999)
      });
    } else {
      addFx({
        k: "shockRing", fxKind, gx, gy, gz: 0.04,
        r: isKill ? 1.28 : 0.96, col: fxKind === "lightning" ? "#26a8ff" : "#ff4b18",
        innerCol: fxKind === "lightning" ? "#fff24a" : "#ffe042",
        life: 0.38, max: 0.38, seed: Math.floor(Math.random() * 9999)
      });
    }

    const count = isKill ? 14 : 9;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + Math.random() * 0.32;
      const spd = 1.65 + Math.random() * 1.45;
      const chipCol = fxKind === "frost"
        ? (i % 2 ? "#7cd8ff" : "#e8f8ff")
        : fxKind === "lightning"
          ? (i % 2 ? "#ffe83c" : "#34a2ff")
          : (i % 3 === 0 ? "#c48d56" : (i % 2 ? "#ffe24a" : "#ff4818"));
      addFx({
        k: "cardChip", fxKind,
        gx: gx + Math.cos(a) * 0.22, gy: gy + Math.sin(a) * 0.22, gz: gz + 0.22,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, vz: 1.85 + Math.random() * 1.1,
        rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 11,
        life: 0.42 + Math.random() * 0.14, max: 0.56,
        col: chipCol, seed: Math.floor(Math.random() * 9999)
      });
    }
  }

  function spawnStepFx(gx, gy, vx, vy, kind, col) {
    const spd = Math.hypot(vx, vy) || 1;
    const ux = vx / spd, uy = vy / spd;
    if (kind === "slime") {
      addFx({ k: "slimePrint", gx, gy, gz: 0.01, col: col || "#76d038", life: 0.95, max: 0.95, seed: Math.floor(Math.random() * 9999) });
      for (let k = -1; k <= 1; k += 2) {
        addFx({
          k: "stepScrap", gx: gx - ux * 0.12, gy: gy - uy * 0.10, gz: 0.08,
          vx: -ux * 0.55 + k * 0.42, vy: -uy * 0.45 + (Math.random() - 0.5) * 0.3, vz: 0.95,
          col: col || "#76d038", life: 0.30, max: 0.30, seed: Math.floor(Math.random() * 9999)
        });
      }
    } else {
      addFx({ k: "footprint", gx, gy, gz: 0.01, ang: Math.atan2(uy, ux), life: 0.85, max: 0.85, seed: Math.floor(Math.random() * 9999) });
      spawnDustPuff(gx - ux * 0.20, gy - uy * 0.12, true);
      addFx({
        k: "stepScrap", gx: gx - ux * 0.16, gy: gy - uy * 0.10, gz: 0.08,
        vx: -ux * 0.75 + (Math.random() - 0.5) * 0.5, vy: -uy * 0.55, vz: 1.05,
        col: "#c8915a", life: 0.32, max: 0.32, seed: Math.floor(Math.random() * 9999)
      });
    }
  }

  function spawnDeathPuff(gx, gy, tint, reward) {
    addFx({ k: "puff", gx, gy, gz: 0.36, tint: tint || "#86de44", life: 0.54, max: 0.54, seed: Math.floor(Math.random() * 9999) });
    if (reward) {
      addFx({ k: "pop", gx: gx + 0.24, gy, gz: 1.25, text: "+" + reward + "🪙", col: "#ffd83a", life: 0.72, max: 0.72, seed: Math.floor(Math.random() * 9999) });
    }
    game.scorch.push({ gx, gy, life: 1.8, max: 1.8, seed: Math.floor(Math.random() * 999) });
  }

  function spawnDustPuff(gx, gy, small = false) {
    addFx({ k: "dust", gx, gy, gz: 0.05, small, life: small ? 0.26 : 0.34, max: small ? 0.26 : 0.34, seed: Math.floor(Math.random() * 9999) });
  }

  function spawnDmgPop(gx, gy, gz, text, col) {
    addFx({ k: "pop", gx, gy, gz, text, col: col || "#ffe45c", life: 0.58, max: 0.58, seed: Math.floor(Math.random() * 9999) });
  }

  /* ================= Simulation ================= */
  function stepHeroMovement(hero, dt) {
    let kx = 0, ky = 0;
    if (keys.KeyA || keys.ArrowLeft)  kx -= 1;
    if (keys.KeyD || keys.ArrowRight) kx += 1;
    if (keys.KeyW || keys.ArrowUp)    ky -= 1;
    if (keys.KeyS || keys.ArrowDown)  ky += 1;

    if (joyVec.active && (Math.abs(joyVec.x) > 0.08 || Math.abs(joyVec.y) > 0.08)) {
      kx = joyVec.x; ky = joyVec.y;
    }

    let desVx = 0, desVy = 0;
    const kLen = Math.hypot(kx, ky);
    if (kLen > 0.08) {
      hero.target = null;
      const mag = Math.min(1, kLen);
      desVx = (kx / kLen) * hero.def.moveSpd * mag;
      desVy = (ky / kLen) * hero.def.moveSpd * mag;
    } else if (hero.target) {
      const dx = hero.target.gx - hero.gx, dy = hero.target.gy - hero.gy;
      const d = Math.hypot(dx, dy);
      if (d < 0.09) hero.target = null;
      else { desVx = (dx / d) * hero.def.moveSpd; desVy = (dy / d) * hero.def.moveSpd; }
    }

    const accel = 1 - Math.exp(-14 * dt);
    hero.vx = lerp(hero.vx, desVx, accel);
    hero.vy = lerp(hero.vy, desVy, accel);

    const spd = Math.hypot(hero.vx, hero.vy);
    hero.gx = clamp(hero.gx + hero.vx * dt, 0.2, COLS - 0.2);
    hero.gy = clamp(hero.gy + hero.vy * dt, 0.2, ROWS - 0.2);
    if (Math.abs(hero.vx) > 0.15) hero.facing = hero.vx >= 0 ? 1 : -1;

    if (spd > 0.25) {
      const prevSin = Math.sin(hero.walkPhase);
      hero.walkPhase += dt * (8.5 + spd * 1.4);
      const curSin = Math.sin(hero.walkPhase);
      hero.gz = Math.abs(curSin) * 0.28;
      hero.waddle = Math.sin(hero.walkPhase) * 0.10;
      hero.dustTimer -= dt;
      if ((prevSin * curSin <= 0 || hero.dustTimer <= 0) && spd > 0.5) {
        hero.dustTimer = 0.17;
        spawnStepFx(hero.gx, hero.gy + 0.04, hero.vx, hero.vy, "hero");
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

    const startZ = attacker.gz + 0.54;
    const dx = target.gx - attacker.gx, dy = target.gy - attacker.gy;
    const dist = Math.max(0.1, Math.hypot(dx, dy));
    const ux = dx / dist, uy = dy / dist;
    const mx = attacker.gx + ux * 0.42, my = attacker.gy + uy * 0.42;
    const fxKind = opt.fxKind || "fire";

    spawnCastDoodle(mx, my, startZ, dx, dy, opt.coreCol, fxKind);

    if (fxKind === "lightning") {
      // Lemon Chick: Instant jagged zig-zag wax-crayon lightning bolt + brief chain to 2nd slime!
      const tz = target.gz + 0.44;
      addFx({
        k: "bolt", sx: mx, sy: my, sz: startZ, tx: target.gx, ty: target.gy, tz,
        col: "#ffe938", edgeCol: "#1f8cf2", life: 0.34, max: 0.34, thin: false,
        seed: Math.floor(Math.random() * 9999)
      });
      damageEnemy(target, opt.dmg, false);
      let anyKill = target.hp <= 0;

      // Chain lightning to nearby 2nd slime
      const chainR = opt.chainRange || 2.15;
      let chainTgt = null, bestD = 1e9;
      for (const e of game.enemies) {
        if (e !== target && e.hp > 0) {
          const cd = Math.hypot(e.gx - target.gx, e.gy - target.gy);
          if (cd <= chainR && cd < bestD) { bestD = cd; chainTgt = e; }
        }
      }
      if (chainTgt) {
        addFx({
          k: "bolt", sx: target.gx, sy: target.gy, sz: tz,
          tx: chainTgt.gx, ty: chainTgt.gy, tz: chainTgt.gz + 0.40,
          col: "#fff468", edgeCol: "#29a8f5", life: 0.30, max: 0.30, thin: true,
          seed: Math.floor(Math.random() * 9999)
        });
        damageEnemy(chainTgt, Math.round(opt.dmg * 0.45), false);
        if (chainTgt.hp <= 0) anyKill = true;
      }

      spawnImpactDoodle(target.gx, target.gy, tz, anyKill, opt);
      return;
    }

    game.shots.push({
      sx: mx, sy: my, sz: startZ,
      gx: mx, gy: my, gz: startZ,
      target, tx: target.gx, ty: target.gy, tz: 0.40,
      t: 0, dur: clamp(dist * 0.13, 0.17, 0.32),
      fxKind, dmg: opt.dmg, projCol: opt.projCol, coreCol: opt.coreCol,
      burstCol: opt.burstCol, wordOl: opt.wordOl, words: opt.words,
      burnDur: opt.burnDur || 0, slowDur: opt.slowDur || 0, splash: opt.splash || 0,
      trail: [], seed: Math.floor(Math.random() * 9999)
    });
  }

  function findBestTarget(gx, gy, range) {
    let target = null, bestDist = -1;
    for (const e of game.enemies) {
      if (e.hp <= 0) continue;
      const d = Math.hypot(e.gx - gx, e.gy - gy);
      if (d <= range && e.dist > bestDist) { bestDist = d; target = e; }
    }
    return target;
  }

  function step(dt) {
    if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
    if (!game || !game.started || game.over) return;

    const wave = WAVES[game.waveIdx];
    if (wave && game.spawnIdx < wave.length) {
      game.spawnTimer -= dt;
      if (game.spawnTimer <= 0) {
        const entry = wave[game.spawnIdx++];
        const def = ENEMY_DEF[entry.kind];
        const [sx, sy] = pathPos(0);
        game.enemies.push({
          kind: entry.kind, img: def.img, tint: def.tint, reward: def.reward,
          boss: !!entry.boss,
          hp: entry.boss ? def.hp + 95 : def.hp, maxHp: entry.boss ? def.hp + 95 : def.hp,
          speed: def.speed, size: entry.boss ? def.size * 1.22 : def.size,
          dist: 0, gx: sx, gy: sy, gz: 0, facing: 1,
          hopPhase: Math.random() * TAU, hitFlash: 0, burnT: 0, burnTick: 0.38, slowT: 0,
          burnSeed: Math.floor(Math.random() * 9999)
        });
        if (game.spawnIdx < wave.length) game.spawnTimer = wave[game.spawnIdx].delay;
      }
    } else if (game.enemies.length === 0) {
      if (game.waveIdx + 1 < WAVES.length) {
        game.wavePause += dt;
        if (game.wavePause >= 0.9) {
          game.waveIdx++; game.spawnIdx = 0; game.spawnTimer = 0.35; game.wavePause = 0; syncHud();
        }
      } else {
        game.over = true; game.won = true; showOverlay(true); return;
      }
    }

    const hero = game.hero;
    stepHeroMovement(hero, dt);
    hero.recoil = Math.max(0, hero.recoil - dt * 5);
    hero.atkCd -= dt;
    if (hero.atkCd <= 0) {
      const target = findBestTarget(hero.gx, hero.gy, hero.def.range);
      if (target) {
        hero.atkCd = hero.def.atkRate; hero.recoil = 1;
        fireShot(hero, target, hero.def);
      }
    }

    for (const tw of game.towers) {
      tw.recoil = Math.max(0, tw.recoil - dt * 4.5);
      tw.atkCd -= dt;
      if (tw.atkCd <= 0) {
        const target = findBestTarget(tw.gx, tw.gy, tw.range);
        if (target) {
          tw.atkCd = tw.atkRate; tw.recoil = 1;
          fireShot(tw, target, {
            fxKind: "fire", dmg: tw.dmg, projCol: "#ff4b1f", coreCol: "#ffe24a", burstCol: "#ff6d28",
            wordOl: "#6b1808", words: ["POW!", "BOOM!", "轰!", "烧!"], burnDur: 2.4, slowDur: 0, splash: 0
          });
        }
      }
    }

    for (let i = game.shots.length - 1; i >= 0; i--) {
      const s = game.shots[i];
      if (s.target && s.target.hp > 0) {
        s.tx = s.target.gx; s.ty = s.target.gy; s.tz = s.target.gz + 0.38;
      }
      s.t += dt / s.dur;
      const p = clamp(s.t, 0, 1);
      s.gx = lerp(s.sx, s.tx, p);
      s.gy = lerp(s.sy, s.ty, p);
      s.gz = lerp(s.sz, s.tz, p) + Math.sin(p * Math.PI) * 0.65;

      if (!s.lastTrail || Math.hypot(s.gx - s.lastTrail[0], s.gy - s.lastTrail[1]) > 0.16) {
        s.trail.push({ gx: s.gx, gy: s.gy, gz: s.gz });
        s.lastTrail = [s.gx, s.gy];
        if (s.trail.length > 5) s.trail.shift();
      }

      if (s.t >= 1) {
        let anyKill = false;
        if (s.target && s.target.hp > 0) {
          damageEnemy(s.target, s.dmg, false);
          if (s.burnDur > 0) { s.target.burnT = s.burnDur; s.target.burnTick = Math.min(s.target.burnTick, 0.34); }
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
        spawnImpactDoodle(s.gx, s.gy, s.gz + 0.14, anyKill, s);
        game.shots.splice(i, 1);
      }
    }

    const maxDist = PATH.length - 1;
    for (let i = game.enemies.length - 1; i >= 0; i--) {
      const e = game.enemies[i];
      e.hitFlash = Math.max(0, e.hitFlash - dt * 5);
      if (e.slowT > 0) e.slowT = Math.max(0, e.slowT - dt);
      if (e.burnT > 0) {
        e.burnT -= dt; e.burnTick -= dt;
        if (e.burnTick <= 0) { e.burnTick = 0.44; damageEnemy(e, 8, true); }
      }
      if (e.hp <= 0) {
        game.gold += e.reward; syncHud();
        spawnDeathPuff(e.gx, e.gy, e.tint, e.reward);
        game.enemies.splice(i, 1); continue;
      }

      const prevGx = e.gx, prevGy = e.gy;
      const prevHopIdx = Math.floor(e.hopPhase / Math.PI);
      const spdMul = e.slowT > 0 ? 0.52 : 1.0;
      e.dist += e.speed * spdMul * dt;
      e.hopPhase += dt * 9.5 * spdMul;
      const [nx, ny] = pathPos(e.dist);
      e.gx = nx; e.gy = ny;
      if (Math.abs(nx - prevGx) > 0.002) e.facing = nx >= prevGx ? 1 : -1;
      e.gz = Math.abs(Math.sin(e.hopPhase)) * 0.22;
      e.landSq = Math.max(0, (e.landSq || 0) - dt * 4.5);
      if (Math.floor(e.hopPhase / Math.PI) !== prevHopIdx) {
        e.landSq = 0.24;
        spawnStepFx(e.gx, e.gy, nx - prevGx, ny - prevGy, "slime", e.tint);
      }

      if (e.dist >= maxDist) {
        game.lives = 0; syncHud();
        spawnImpactDoodle(e.gx, e.gy, 0.45, true, "#ff6b6b", ["OH NO!"]);
        game.enemies.splice(i, 1);
        game.over = true; game.won = false; showOverlay(false); return;
      }
    }

    for (let i = game.fx.length - 1; i >= 0; i--) {
      const f = game.fx[i];
      f.life -= dt;
      if (f.k === "cardChip" || f.k === "stepScrap") {
        f.gx += f.vx * dt; f.gy += f.vy * dt;
        f.gz = Math.max(0, f.gz + f.vz * dt);
        f.vz -= 4.5 * dt;
        if (f.k === "cardChip") f.rot += f.vrot * dt;
      } else if (f.k === "pop") f.gz += 0.72 * dt;
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
      e.gx + (isBurn ? -0.36 : 0.34), e.gy - 0.15,
      e.gz + (isBurn ? 1.66 : 1.36),
      (isBurn ? "🔥-" : "-") + dmg,
      isBurn ? "#ff6828" : "#ffe24a"
    );
  }

  /* ================= Cardboard Standee & Chip FX Renderers ================= */
  function getBoil() { return Math.floor(simTime * 11); }

  // Thick brown corrugated shipping-box base tab (with wavy/ribbed flute cells 一格一格) + floor shadow
  function drawCardboardBaseAndShadow(c, sx, sy, wPx, gz, seed, withTab = true, isHero = false) {
    const rx = wPx * 0.44, ry = wPx * 0.16;
    const lift = clamp(1 - gz * 0.55, 0.25, 1);

    // Bold directional cast shadow to bottom-right (top-left sun) + tight contact AO under base tab!
    c.save();
    c.translate(sx + rx * (0.42 + gz * 0.42), sy + ry * (0.48 + gz * 0.30));
    c.rotate(0.22);
    c.fillStyle = `rgba(36, 22, 10, ${0.34 * lift})`;
    c.beginPath();
    c.ellipse(0, 0, rx * (1.12 + gz * 0.18), ry * (1.08 + gz * 0.14), 0, 0, TAU);
    c.fill();
    c.restore();
    c.save();
    c.fillStyle = `rgba(26, 15, 6, ${0.28 * lift})`;
    c.beginPath();
    c.ellipse(sx, sy + 2, rx * 0.88, ry * 0.68, 0, 0, TAU);
    c.fill();
    c.restore();

    if (isHero) {
      c.save();
      c.setLineDash([7, 5]);
      c.strokeStyle = "#ff7b1c";
      c.lineWidth = 2.8;
      c.beginPath();
      c.ellipse(sx, sy, wPx * 0.54, wPx * 0.21, 0, 0, TAU);
      c.stroke();
      c.restore();
    }

    if (withTab) {
      const tw = wPx * 0.38, th = Math.max(6, wPx * 0.08);
      const lipH = Math.max(7.0, wPx * 0.084);
      // Rough die-cut kraft-brown flat base tab with mottled pulp fibers
      c.save();
      c.beginPath();
      c.moveTo(sx - tw, sy - th * 0.4);
      c.lineTo(sx + tw, sy - th * 0.4);
      c.lineTo(sx + tw * 1.12, sy + th * 0.6);
      c.lineTo(sx - tw * 1.12, sy + th * 0.6);
      c.closePath();
      c.fillStyle = "#c58e57";
      c.fill();
      c.save(); c.clip();
      for (let fi = 0; fi < 14; fi++) {
        const fx = sx - tw + hash(fi * 7, seed + 3) * tw * 2;
        const fy = sy - th * 0.4 + hash(fi * 11, seed + 9) * th;
        c.fillStyle = fi % 2 ? "rgba(98, 56, 22, 0.22)" : "rgba(238, 206, 162, 0.24)";
        c.fillRect(fx, fy, 3.2, 1.3);
      }
      c.restore();
      c.strokeStyle = "#482a12";
      c.lineWidth = 1.8;
      c.stroke();

      // Thick front corrugated cross-section edge: two kraft liner sheets + continuous sinusoidal flute wave!
      const yTop = sy + th * 0.6;
      c.beginPath();
      c.moveTo(sx - tw * 1.12, yTop);
      c.lineTo(sx + tw * 1.12, yTop);
      c.lineTo(sx + tw * 1.12, yTop + lipH);
      c.lineTo(sx - tw * 1.12, yTop + lipH);
      c.closePath();
      c.fillStyle = "#2b1305";
      c.fill();
      c.save();
      c.clip();
      // Continuous sinusoidal corrugated flute ribbon between liners
      const xL = sx - tw * 1.12, xR = sx + tw * 1.12;
      const yMid = yTop + lipH * 0.50;
      const amp = lipH * 0.27;
      c.lineCap = "round"; c.lineJoin = "round";
      c.strokeStyle = "#6e3e19"; c.lineWidth = 2.6;
      c.beginPath();
      for (let fx = xL - 2; fx <= xR + 2; fx += 2) {
        const wy = yMid + Math.sin((fx - xL) * 0.74 + seed) * amp;
        if (fx === xL - 2) c.moveTo(fx, wy + 0.8); else c.lineTo(fx, wy + 0.8);
      }
      c.stroke();
      c.strokeStyle = "#dda86c"; c.lineWidth = 1.5;
      c.beginPath();
      for (let fx = xL - 2; fx <= xR + 2; fx += 2) {
        const wy = yMid + Math.sin((fx - xL) * 0.74 + seed) * amp;
        if (fx === xL - 2) c.moveTo(fx, wy); else c.lineTo(fx, wy);
      }
      c.stroke();
      // Top & bottom kraft liner sheets
      c.fillStyle = "#cfa068";
      c.fillRect(xL, yTop, xR - xL, Math.max(1.8, lipH * 0.22));
      c.fillStyle = "#986334";
      c.fillRect(xL, yTop + lipH * 0.80, xR - xL, Math.max(1.8, lipH * 0.20));
      c.restore();
      c.strokeStyle = "#3d220e";
      c.lineWidth = 1.6;
      c.stroke();
      c.restore();
    }
  }

  function drawLayeredStandee(c, key, sx, sy, hPx, facing = 1, squash = 0, flash = 0, tilt = 0, swaySeed = 0) {
    const arr = LAYERS[key];
    if (!arr) return;
    const drawSz = hPx * (260 / 210);
    const sxScale = 1 + squash * 0.16;
    const syScale = 1 / (1 + squash * 0.12);
    const camOffX = (sx - W * 0.5) / W;
    const treeRock = swaySeed ? Math.sin(simTime * 1.8 + swaySeed) * 0.025 : 0;
    const totTilt = tilt + treeRock;
    // Subtle 3D perspective turn/foreshortening as standee moves or leans
    const turnScale = 1 - Math.min(0.10, Math.abs(totTilt) * 0.45);

    for (let i = 0; i < arr.length; i++) {
      const L = arr[i];
      const dx = camOffX * L.zOff * hPx * 1.0;
      const dy = -L.zOff * hPx * 0.36;

      c.save();
      c.translate(sx + dx, sy + dy);
      if (totTilt) c.rotate(totTilt);
      c.scale(facing * sxScale * turnScale, syScale);
      if (i > 0) {
        c.shadowColor = "rgba(44, 24, 10, 0.44)";
        c.shadowOffsetX = 4.0;
        c.shadowOffsetY = 5.5;
        c.shadowBlur = 4.0;
      }
      if (flash > 0.15) c.filter = `brightness(${1 + flash * 0.65})`;
      c.drawImage(L.cv, -drawSz * 0.5, -drawSz + (24 / 260) * drawSz, drawSz, drawSz);
      c.restore();
    }
  }

  // Die-cut kraft-brown-edged cardboard cutout chip (used for projectiles, flame cutouts, bursts)
  function drawCardboardCutoutChip(c, pts, col, seed, opts = {}) {
    const thickX = opts.thickX ?? 4.5, thickY = opts.thickY ?? 3.5;
    c.save();
    c.translate(thickX, thickY);
    tracePoly(c, pts);
    c.fillStyle = "#6e4420";
    c.fill();
    c.strokeStyle = "#3d220e";
    c.lineWidth = 1.6;
    c.stroke();
    c.restore();

    // Kraft brown rim around crayon front
    c.save();
    tracePoly(c, pts);
    c.strokeStyle = "#b8824d";
    c.lineWidth = 4.0;
    c.stroke();
    c.restore();

    fillWaxCrayon(c, pts, col, seed, { lw: opts.lw ?? 2.2, softEdge: false });
  }

  function drawCardboardFlame(c, sx, sy, s, seed, boil, col = "#ff5524", innerCol = "#ffe658") {
    const sway = Math.sin(simTime * 13 + seed) * s * 0.14;
    const outerPts = sampleSmoothLoop([
      [sx, sy + s * 0.22], [sx - s * 0.48, sy + s * 0.04], [sx - s * 0.42, sy - s * 0.62],
      [sx + sway, sy - s * 1.12], [sx + s * 0.44, sy - s * 0.60], [sx + s * 0.48, sy + s * 0.06]
    ], 3);
    drawCardboardCutoutChip(c, outerPts, col, seed + boil * 17, { thickX: 4, thickY: 3, lw: 2.0 });
    const innerPts = sampleSmoothLoop([
      [sx, sy + s * 0.12], [sx - s * 0.24, sy - s * 0.12],
      [sx + sway * 0.65, sy - s * 0.70], [sx + s * 0.24, sy - s * 0.10]
    ], 2);
    fillWaxCrayon(c, innerPts, innerCol, seed + 9 + boil * 17, { lw: 1.4 });
  }

  /* ================= Render Scene ================= */
  function render() {
    const boil = getBoil();
    const bg = ensureBgCache();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    const shkX = shakeT > 0 ? (Math.random() - 0.5) * 2 * shakeMag * (shakeT / 0.16) : 0;
    const shkY = shakeT > 0 ? (Math.random() - 0.5) * 2 * shakeMag * (shakeT / 0.16) : 0;
    ctx.setTransform(DPR, 0, 0, DPR, shkX * DPR, shkY * DPR);

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

    if (hoverTile && tapMode === "plant" && !PATH_SET.has(hoverTile.x + "," + hoverTile.y)) {
      const hc = tileCorners(hoverTile.x, hoverTile.y, 0.06, 0);
      ctx.save();
      tracePoly(ctx, hc);
      ctx.fillStyle = game.gold >= PET_COST ? "rgba(255, 224, 92, 0.42)" : "rgba(255, 160, 140, 0.32)";
      ctx.fill();
      ctx.strokeStyle = game.gold >= PET_COST ? "#ff8c24" : "#d94b38";
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore();
    }

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

    // Front-left, front-right & right-flank stepped cardboard hill mounds sorted cleanly by own centroid depth!
    const ox = cam.portrait ? 0.32 : 0.60;
    const edgeMounds = [
      { cx: 1.1, cy: 7.12, layers: 2, seed: 84, ctrl: [[0.05, 6.82], [2.15, 6.85], [2.32, 7.36], [1.25, 7.56], [-0.08, 7.34]] },
      { cx: 8.9, cy: 7.12, layers: 2, seed: 88, ctrl: [[7.35, 6.84], [10.45, 6.84], [10.65, 7.34], [9.05, 7.56], [7.25, 7.30]] },
      { cx: 11.1, cy: 1.95, layers: 3, seed: 72, ctrl: [[10.78, 1.15], [11.35 + ox * 0.35, 1.10], [11.58 + ox * 0.45, 2.02], [11.32 + ox * 0.32, 2.85], [10.78, 2.75]] }
    ];
    for (const fm of edgeMounds) {
      drawList.push({
        depth: depthOf(fm.cx, fm.cy) - 0.55,
        draw: () => drawRaisedMoundByKey(ctx, fm)
      });
    }

    const hillLayerH = getHillLayerH();
    for (const prop of SCENIC_PROPS) {
      drawList.push({
        depth: depthOf(prop.gx, prop.gy),
        draw: () => {
          const [sx, sy0, pp] = proj(prop.gx, prop.gy, 0);
          const sy = sy0 - (prop.hillLayers || 0) * hillLayerH * 0.95;
          const baseScale = cam.portrait ? 1.68 : 1.24;
          const hPx = cam.unit * baseScale * (prop.kind === "tree" ? 1.25 : prop.kind === "fence" ? 0.88 : 0.94) * prop.scale * pp;
          drawCardboardBaseAndShadow(ctx, sx, sy, hPx * 0.78, 0, prop.seed, true, false);
          drawLayeredStandee(ctx, prop.kind, sx, sy, hPx, 1, 0, 0, 0, prop.kind === "tree" ? prop.seed : 0);
        }
      });
    }

    // Spawn Burrow (heavy real-crayon earthen mound)
    const [btx, bty] = PATH[0];
    drawList.push({
      depth: depthOf(btx + 0.5, bty + 0.45),
      draw: () => {
        const [bx, by, pp] = proj(btx + 0.5, bty + 0.5, 0);
        const rx = cam.unit * (cam.portrait ? 0.56 : 0.44) * pp, ry = cam.unit * (cam.portrait ? 0.28 : 0.22) * pp;
        fillWaxCrayon(ctx, makeEllipsePts(bx, by, rx, ry, 20, 310, 0.06), "#885a36", 310, {
          toothAlpha: 0.70, clumpAlpha: 0.32, bleed: true, bleedW: 4, lw: 3.0, ol: "#3d2212"
        });
        fillWaxCrayon(ctx, makeEllipsePts(bx, by + 2, rx * 0.65, ry * 0.6, 16, 312, 0.05), "#261824", 312, {
          withBase: false, toothAlpha: 0.30, lw: 2.2
        });
      }
    });

    // Nest Standee (hand-drawn golden crayon straw nest with straw wisps!)
    const [htx, hty] = PATH[PATH.length - 1];
    drawList.push({
      depth: depthOf(htx + 0.5, hty + 0.58),
      draw: () => {
        const [hx, hy, pp] = proj(htx + 0.5, hty + 0.5, 0);
        const nw = cam.unit * (cam.portrait ? 0.68 : 0.55) * pp, nh = cam.unit * (cam.portrait ? 0.30 : 0.24) * pp;
        drawCardboardBaseAndShadow(ctx, hx, hy, nw * 1.9, 0, 410, false, false);
        fillWaxCrayon(ctx, makeEllipsePts(hx, hy, nw, nh, 22, 410, 0.06), "#e8b94e", 410, {
          toothAlpha: 0.72, clumpAlpha: 0.32, bleed: true, bleedW: 4, lw: 2.8, ol: "#694118"
        });
        ctx.save();
        ctx.strokeStyle = "#b57628";
        ctx.lineWidth = Math.max(1.6, 2.0 * pp);
        ctx.lineCap = "round";
        for (let sw = 0; sw < 14; sw++) {
          const a = (sw / 14) * TAU + jit(sw, 41) * 0.2;
          const x0 = hx + Math.cos(a) * nw * 0.75, y0 = hy + Math.sin(a) * nh * 0.75;
          const x1 = hx + Math.cos(a + 0.14) * nw * 1.15, y1 = hy + Math.sin(a + 0.14) * nh * 1.15;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }
        ctx.restore();
        const bob = Math.sin(simTime * 3.5) * 2.5 * pp;
        const hPx = cam.unit * (cam.portrait ? 1.66 : 1.16) * pp;
        drawLayeredStandee(ctx, "egg", hx, hy + bob, hPx, 1, Math.sin(simTime * 3.5) * 0.05, 0, 0, 0);

        const fx = hx + nw * 0.85, fy = hy - cam.unit * 0.02 * pp;
        const fz = cam.portrait ? 1.4 : 1.15;
        drawCardboardCutoutChip(ctx, [
          [fx, fy - cam.unit * 0.58 * fz * pp],
          [fx + cam.unit * 0.42 * fz * pp, fy - cam.unit * 0.46 * fz * pp],
          [fx, fy - cam.unit * 0.30 * fz * pp]
        ], "#ff5c7a", 416, { thickX: 3.5, thickY: 2.5, lw: 1.8 });
      }
    });

    // Controllable Hero
    if (game.hero) {
      const hero = game.hero;
      drawList.push({
        depth: depthOf(hero.gx, hero.gy),
        draw: () => {
          const [gx0, gy0, pp0] = proj(hero.gx, hero.gy, 0);
          const [sx, sy, pp] = proj(hero.gx, hero.gy, hero.gz);
          const hPx = cam.unit * (cam.portrait ? 1.84 : 1.28) * pp;
          drawCardboardBaseAndShadow(ctx, gx0, gy0, hPx * 0.94 * pp0 / pp, hero.gz, 735, true, true);
          const idleBreathe = Math.sin(simTime * 5) * 0.04;
          const sq = hero.recoil * 0.42 + (hero.gz > 0.05 ? -0.10 : idleBreathe);
          drawLayeredStandee(ctx, hero.def.img, sx, sy, hPx, hero.facing, sq, 0, hero.waddle, 0);
        }
      });
    }

    // Planted Chili Towers
    for (const tw of game.towers) {
      drawList.push({
        depth: depthOf(tw.gx, tw.gy),
        draw: () => {
          const [gx0, gy0, pp0] = proj(tw.gx, tw.gy, 0);
          const [sx, sy, pp] = proj(tw.gx, tw.gy, tw.gz);
          const hPx = cam.unit * (cam.portrait ? 1.68 : 1.16) * pp;
          drawCardboardBaseAndShadow(ctx, gx0, gy0, hPx * 0.90 * pp0 / pp, tw.gz, 740, true, false);
          const breathe = Math.sin(simTime * 4.8 + tw.phase) * 0.05;
          drawLayeredStandee(ctx, "chili", sx, sy, hPx, tw.facing, tw.recoil * 0.42 + breathe, 0, 0, 0);
        }
      });
    }

    // Slime Standees
    for (const e of game.enemies) {
      drawList.push({
        depth: depthOf(e.gx, e.gy),
        draw: () => {
          const [gx0, gy0, pp0] = proj(e.gx, e.gy, 0);
          const [sx, sy, pp] = proj(e.gx, e.gy, e.gz);
          const hPx = cam.unit * (cam.portrait ? 1.66 : 1.14) * e.size * pp;
          drawCardboardBaseAndShadow(ctx, gx0, gy0, hPx * 0.85 * pp0 / pp, e.gz, 760, true, false);

          if (e.burnT > 0) drawCardboardFlame(ctx, sx - hPx * 0.32, sy - hPx * 0.44, hPx * 0.36, e.burnSeed + 1, boil);
          const hopSq = (e.gz < 0.04 ? 0.16 : -0.11) + (e.landSq || 0) + e.hitFlash * 0.22;
          const slimeTilt = Math.sin(e.hopPhase * 0.5) * 0.075;
          ctx.save();
          if (e.slowT > 0) ctx.filter = "sepia(0.35) hue-rotate(165deg) saturate(1.9) brightness(1.06)";
          drawLayeredStandee(ctx, e.img, sx, sy, hPx, e.facing, hopSq, e.hitFlash, slimeTilt, 0);
          ctx.restore();

          if (e.slowT > 0) {
            // Cute wax-crayon ice crystals around slowed slime!
            for (let ic = -1; ic <= 1; ic += 2) {
              const ix = sx + ic * hPx * 0.38, iy = sy - hPx * 0.14;
              const cs = hPx * 0.14;
              drawCardboardCutoutChip(ctx, [
                [ix, iy - cs * 1.4], [ix + cs * 0.55, iy], [ix, iy + cs * 0.45], [ix - cs * 0.55, iy]
              ], "#8ae4ff", e.burnSeed + ic, { thickX: 2.5, thickY: 2.0, lw: 1.6 });
            }
          }

          if (e.boss) {
            const cy = sy - hPx - 8 * pp, cw = hPx * 0.22;
            drawCardboardCutoutChip(ctx, [
              [sx - cw, cy], [sx - cw * 1.05, cy - cw * 0.85], [sx - cw * 0.4, cy - cw * 0.35],
              [sx, cy - cw * 1.1], [sx + cw * 0.4, cy - cw * 0.35], [sx + cw * 1.05, cy - cw * 0.85], [sx + cw, cy]
            ], "#ffe047", 605, { thickX: 4, thickY: 3, lw: 2.2 });
          }

          if (e.burnT > 0) drawCardboardFlame(ctx, sx + hPx * 0.30, sy - hPx * 0.18, hPx * 0.40, e.burnSeed + 5, boil);

          const bw = Math.max(36, cam.unit * 0.56 * e.size * pp);
          const bh = Math.max(6.5, cam.unit * 0.08 * pp);
          const bx = sx - bw * 0.5, by = sy - hPx - (e.boss ? 32 : 16);
          const frac = clamp(e.hp / e.maxHp, 0, 1);
          ctx.fillStyle = "#fffcf4";
          ctx.strokeStyle = OL;
          ctx.lineWidth = 2.0;
          ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
          ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
          if (frac > 0) {
            ctx.fillStyle = e.slowT > 0 ? "#4fb7ff" : (e.burnT > 0 ? "#ff6828" : "#67cf48");
            ctx.fillRect(bx, by, bw * frac, bh);
          }
        }
      });
    }

    // Distinct Hero Cardboard + Crayon Projectiles (Fireball for Chili, Frost Crystal for Blueberry)
    for (const s of game.shots) {
      drawList.push({
        depth: depthOf(s.gx, s.gy) + 0.2,
        draw: () => {
          const [gx0, gy0, pp0] = proj(s.gx, s.gy, 0);
          drawCardboardBaseAndShadow(ctx, gx0, gy0, cam.unit * 0.30 * pp0, s.gz, 780, false, false);

          // Trail: fiery crayon embers for Chili, icy diamond shards for Blueberry
          for (let ti = 0; ti < s.trail.length; ti++) {
            const tr = s.trail[ti];
            const [tx, ty, tpp] = proj(tr.gx, tr.gy, tr.gz);
            const sz = Math.max(5, cam.unit * 0.11 * tpp * (0.60 + ti * 0.08));
            if (s.fxKind === "frost") {
              drawCardboardCutoutChip(ctx, [
                [tx, ty - sz], [tx + sz * 0.65, ty], [tx, ty + sz], [tx - sz * 0.65, ty]
              ], ti % 2 ? "#7cd8ff" : "#e8f9ff", s.seed + ti, { thickX: 2.2, thickY: 1.8, lw: 1.4 });
            } else {
              drawCardboardFlame(ctx, tx, ty + sz * 0.2, sz * 1.4, s.seed + ti, boil, ti % 2 ? "#ff4e1e" : "#ffa828", "#fff080");
            }
          }

          const [sx, sy, pp] = proj(s.gx, s.gy, s.gz);
          const [nx, ny] = proj(s.tx, s.ty, s.tz);
          const ang = Math.atan2(ny - sy, nx - sx);
          const pr = Math.max(12, cam.unit * (cam.portrait ? 0.34 : 0.29) * pp);
          ctx.save();
          ctx.translate(sx, sy);

          if (s.fxKind === "frost") {
            // Blueberry Owl: Spinning 6-point icy snowflake/frost orb cardboard cutout!
            ctx.rotate(simTime * 7 + s.seed);
            const starPts = [];
            for (let k = 0; k < 12; k++) {
              const a = (k / 12) * TAU;
              const rr = k % 2 === 0 ? pr * 1.05 : pr * 0.45;
              starPts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
            }
            drawCardboardCutoutChip(ctx, starPts, "#4898ff", s.seed, { thickX: 4, thickY: 3, lw: 2.0 });
            fillWaxCrayon(ctx, makeEllipsePts(0, 0, pr * 0.42, pr * 0.42, 12, s.seed + 3), "#e8f8ff", s.seed + 3, { lw: 1.5 });
          } else {
            // Chili Mouse: Arcing teardrop fireball cardboard cutout!
            ctx.rotate(ang);
            drawCardboardCutoutChip(ctx, [
              [pr * 1.05, 0], [pr * 0.40, -pr * 0.72], [-pr * 0.65, -pr * 0.56],
              [-pr * 1.50, -pr * 0.14], [-pr * 1.05, 0], [-pr * 1.50, pr * 0.18],
              [-pr * 0.65, pr * 0.56], [pr * 0.40, pr * 0.72]
            ], "#ff481a", s.seed, { thickX: 4.5, thickY: 3.5, lw: 2.2 });
            fillWaxCrayon(ctx, [
              [pr * 0.55, 0], [pr * 0.05, -pr * 0.36], [-pr * 0.75, 0], [pr * 0.05, pr * 0.36]
            ], "#ffe94e", s.seed + 5, { lw: 1.4 });
          }
          ctx.restore();
        }
      });
    }

    // Die-Cut Cardboard Explosion, Lightning Bolt, Frost Ring & Chip FX
    for (const f of game.fx) {
      drawList.push({
        depth: depthOf(f.gx, f.gy) + (f.k === "pop" ? 0.9 : (f.k === "frostRing" || f.k === "shockRing" || f.k === "footprint" || f.k === "slimePrint") ? -0.25 : 0.45),
        draw: () => {
          const prog = 1 - clamp(f.life / f.max, 0, 1);
          const alpha = prog < 0.74 ? 1 : clamp((1 - prog) / 0.26, 0, 1);
          const [sx, sy, pp] = proj(f.gx, f.gy, f.gz);
          ctx.save();
          ctx.globalAlpha = alpha;

          if (f.k === "cast") {
            const cs = cam.unit * (0.22 + prog * 0.18) * pp;
            if (f.fxKind === "lightning") {
              // Electric spark star
              const spPts = [];
              for (let i = 0; i < 8; i++) {
                const a = (i / 8) * TAU + f.seed;
                const rr = i % 2 === 0 ? cs * 1.1 : cs * 0.36;
                spPts.push([sx + Math.cos(a) * rr, sy + Math.sin(a) * rr]);
              }
              drawCardboardCutoutChip(ctx, spPts, "#ffe938", f.seed, { thickX: 3, thickY: 2, lw: 1.6 });
            } else if (f.fxKind === "frost") {
              drawCardboardCutoutChip(ctx, makeEllipsePts(sx, sy, cs * 0.85, cs * 0.85, 12, f.seed), "#8ee4ff", f.seed, { thickX: 3, thickY: 2, lw: 1.6 });
            } else {
              drawCardboardFlame(ctx, sx, sy, cs, f.seed, boil, "#ff501e", "#fff480");
            }
          } else if (f.k === "bolt") {
            // Lemon Chick jagged zig-zag wax-crayon lightning bolt + secondary crackle branches!
            const [ax, ay] = proj(f.sx, f.sy, f.sz);
            const [bx, by] = proj(f.tx, f.ty, f.tz);
            const segs = 7;
            const pts = [[ax, ay]];
            const dx = bx - ax, dy = by - ay;
            const len = Math.max(1, Math.hypot(dx, dy));
            const nx = -dy / len, ny = dx / len;
            const amp = (f.thin ? 14 : 24) * (1 - prog * 0.35);
            for (let i = 1; i < segs; i++) {
              const t = i / segs;
              const side = (i % 2 === 0 ? 1 : -1) * (0.7 + hash(i, f.seed) * 0.65);
              pts.push([lerp(ax, bx, t) + nx * side * amp, lerp(ay, by, t) + ny * side * amp]);
            }
            pts.push([bx, by]);

            ctx.lineJoin = "round"; ctx.lineCap = "round";
            tracePoly(ctx, pts, false);
            ctx.strokeStyle = "#3a2414"; ctx.lineWidth = (f.thin ? 10 : 15) * pp; ctx.stroke();
            tracePoly(ctx, pts, false);
            ctx.strokeStyle = f.edgeCol || "#1f8cf2"; ctx.lineWidth = (f.thin ? 7 : 11.5) * pp; ctx.stroke();
            tracePoly(ctx, pts, false);
            ctx.strokeStyle = f.col || "#ffe938"; ctx.lineWidth = (f.thin ? 4.2 : 6.8) * pp; ctx.stroke();
            tracePoly(ctx, pts, false);
            ctx.strokeStyle = "#fffef2"; ctx.lineWidth = (f.thin ? 1.8 : 3.0) * pp; ctx.stroke();

            // Crackle static sub-arcs branching off main bolt
            for (let b = 2; b < pts.length - 1; b += 2) {
              const bp = pts[b];
              const bSide = b % 4 === 0 ? 1 : -1;
              const bEnd = [bp[0] + nx * bSide * 22 * pp + (dx / len) * 14 * pp, bp[1] + ny * bSide * 22 * pp + (dy / len) * 14 * pp];
              ctx.beginPath(); ctx.moveTo(bp[0], bp[1]); ctx.lineTo(bEnd[0], bEnd[1]);
              ctx.strokeStyle = "#1f8cf2"; ctx.lineWidth = 4.5 * pp; ctx.stroke();
              ctx.strokeStyle = "#fff666"; ctx.lineWidth = 2.2 * pp; ctx.stroke();
            }
          } else if (f.k === "shockRing") {
            const rr = cam.unit * f.r * (0.35 + prog * 0.85) * pp;
            ctx.save();
            ctx.strokeStyle = f.col || "#ff5e22";
            ctx.lineWidth = Math.max(3.5, 6.5 * pp * (1 - prog * 0.55));
            ctx.beginPath(); ctx.ellipse(sx, sy, rr, rr * 0.46, 0, 0, TAU); ctx.stroke();
            ctx.strokeStyle = f.innerCol || "#ffd646";
            ctx.lineWidth = Math.max(2.0, 3.0 * pp * (1 - prog * 0.55));
            ctx.beginPath(); ctx.ellipse(sx, sy, rr * 0.72, rr * 0.33, 0, 0, TAU); ctx.stroke();
            ctx.restore();
          } else if (f.k === "frostRing") {
            // Blueberry Owl expanding icy frost splash ring + radial crystal spikes!
            const rr = cam.unit * f.r * (0.45 + prog * 0.75) * pp;
            ctx.save();
            ctx.strokeStyle = "#48b6ff";
            ctx.lineWidth = Math.max(3.5, 5.5 * pp * (1 - prog * 0.5));
            ctx.beginPath(); ctx.ellipse(sx, sy, rr, rr * 0.48, 0, 0, TAU); ctx.stroke();
            ctx.fillStyle = "rgba(130, 224, 255, 0.28)"; ctx.fill();
            for (let sp = 0; sp < 6; sp++) {
              const a = (sp / 6) * TAU + f.seed;
              const ix = sx + Math.cos(a) * rr * 0.92, iy = sy + Math.sin(a) * rr * 0.44;
              drawCardboardCutoutChip(ctx, [
                [ix, iy - 12 * pp], [ix + 5 * pp, iy], [ix, iy + 4 * pp], [ix - 5 * pp, iy]
              ], "#9be8ff", f.seed + sp, { thickX: 2.2, thickY: 1.8, lw: 1.4 });
            }
            ctx.restore();
          } else if (f.k === "hit") {
            // Explosive, punchy 3-layer starburst clamped safely below the top HUD & inside viewport!
            const popScale = easeOutBack(Math.min(1, prog * 2.7));
            const rOut = cam.unit * (cam.portrait ? 1.52 : 1.18) * (f.big ? 0.92 : 0.76) * popScale * pp;
            const rIn = rOut * 0.42;
            const hudSafeTop = cam.portrait ? 114 : 74;
            const hx = clamp(sx, Math.max(54, rOut * 0.9), W - Math.max(54, rOut * 0.9));
            const hy = clamp(sy, hudSafeTop + rOut * 0.72, H - 64);

            const spikes = f.fxKind === "frost" ? 6 : (f.fxKind === "lightning" ? 9 : 8);
            const outerPts = [], midPts = [], corePts = [];
            for (let i = 0; i < spikes * 2; i++) {
              const a = (i / (spikes * 2)) * TAU + f.seed;
              const rr = (i % 2 === 0 ? rOut : rIn) * (0.88 + hash(i, f.seed) * 0.20);
              outerPts.push([hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 0.82]);
              midPts.push([hx + Math.cos(a + 0.16) * rr * 0.64, hy + Math.sin(a + 0.16) * rr * 0.54]);
              corePts.push([hx + Math.cos(a + 0.32) * rr * 0.34, hy + Math.sin(a + 0.32) * rr * 0.28]);
            }
            drawCardboardCutoutChip(ctx, outerPts, f.burstCol || "#ffe24a", f.seed, { thickX: 6, thickY: 4.5, lw: 2.4 });
            const midCol = f.fxKind === "frost" ? "#2672e8" : (f.fxKind === "lightning" ? "#1e96ff" : "#ff3b14");
            drawCardboardCutoutChip(ctx, midPts, midCol, f.seed + 3, { thickX: 4, thickY: 3, lw: 2.0 });
            const coreCol = f.fxKind === "frost" ? "#eefaff" : "#fff799";
            fillWaxCrayon(ctx, corePts, coreCol, f.seed + 7, { lw: 1.4, softEdge: false });

            ctx.save();
            ctx.translate(hx, hy - rOut * 0.12);
            ctx.rotate((hash(f.seed, 2) - 0.5) * 0.22);
            const fs = Math.round(Math.max(19, cam.unit * (cam.portrait ? 1.42 : 1.15) * (f.big ? 0.38 : 0.32) * popScale * pp));
            ctx.font = `900 ${fs}px "Fredoka", "PingFang SC", sans-serif`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
            ctx.strokeStyle = f.wordOl || OL; ctx.lineWidth = Math.max(5.0, fs * 0.20);
            ctx.strokeText(f.word, 0, 0);
            ctx.fillStyle = "#fffef8"; ctx.fillText(f.word, 0, 0);
            ctx.restore();
          } else if (f.k === "cardChip") {
            const sz = Math.max(6.5, cam.unit * 0.11 * pp);
            ctx.save(); ctx.translate(sx, sy); ctx.rotate(f.rot);
            const chipPts = f.fxKind === "frost"
              ? [[0, -sz * 1.15], [sz * 0.7, 0], [0, sz * 1.15], [-sz * 0.7, 0]]
              : [[-sz, -sz * 0.55], [sz, -sz * 0.3], [sz * 0.7, sz * 0.75], [-sz * 0.8, sz * 0.5]];
            drawCardboardCutoutChip(ctx, chipPts, f.col, f.seed, { thickX: 3.2, thickY: 2.4, lw: 1.5 });
            ctx.restore();
          } else if (f.k === "puff") {
            const spread = cam.unit * (0.34 + prog * 0.58) * pp;
            const rBase = cam.unit * 0.16 * (1 - prog * 0.25) * pp;
            for (let p = 0; p < 6; p++) {
              const a = (p / 6) * TAU + f.seed;
              const px = sx + Math.cos(a) * spread * 0.82;
              const py = sy + Math.sin(a) * spread * 0.50 - prog * 22 * pp;
              drawCardboardCutoutChip(ctx, makeEllipsePts(px, py, rBase, rBase * 0.78, 12, f.seed + p), p % 2 ? "#c48d56" : f.tint, f.seed + p, { thickX: 3.5, thickY: 2.5, lw: 1.8 });
            }
          } else if (f.k === "footprint") {
            ctx.save(); ctx.translate(sx, sy); ctx.rotate(f.ang || 0);
            ctx.fillStyle = "rgba(84, 56, 28, 0.42)";
            ctx.beginPath(); ctx.ellipse(-3 * pp, -2.5 * pp, 3.6 * pp, 2.2 * pp, 0, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.ellipse(3 * pp, 2.5 * pp, 3.6 * pp, 2.2 * pp, 0, 0, TAU); ctx.fill();
            ctx.restore();
          } else if (f.k === "slimePrint") {
            const r = cam.unit * 0.17 * (0.85 + prog * 0.25) * pp;
            fillWaxCrayon(ctx, makeEllipsePts(sx, sy, r, r * 0.45, 12, f.seed), f.col || "#76d038", f.seed, {
              withBase: false, coverage: 0.48, toothAlpha: 0.45, lw: 1.4, ol: "rgba(45, 32, 24, 0.45)"
            });
          } else if (f.k === "stepScrap") {
            const sz = Math.max(3.5, cam.unit * 0.05 * pp);
            fillWaxCrayon(ctx, [[-sz + sx, sy - sz], [sz + sx, sy - sz * 0.6], [sz + sx, sy + sz], [-sz + sx, sy + sz * 0.7]], f.col || "#c8915a", f.seed, {
              withBase: false, lw: 1.2, softEdge: false
            });
          } else if (f.k === "dust") {
            const sc = f.small ? 0.65 : 1.0;
            const sp = cam.unit * (0.12 + prog * 0.22) * sc * pp;
            for (let k = -1; k <= 1; k += 2) {
              fillWaxCrayon(ctx, makeEllipsePts(sx + k * sp, sy, cam.unit * 0.11 * sc * pp, cam.unit * 0.08 * sc * pp, 10, f.seed + k), "#d6b082", f.seed + k, { lw: 1.6 });
            }
          } else if (f.k === "pop") {
            const fs = Math.round(Math.max(15, cam.unit * 0.23 * pp));
            const px = clamp(sx, 40, W - 40);
            const py = clamp(sy, cam.portrait ? 104 : 68, H - 36);
            ctx.font = `900 ${fs}px "Fredoka", "PingFang SC", sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.lineJoin = "round";
            ctx.strokeStyle = OL;
            ctx.lineWidth = Math.max(4.2, fs * 0.19);
            ctx.strokeText(f.text, px, py);
            ctx.fillStyle = f.col;
            ctx.fillText(f.text, px, py);
          }

          ctx.restore();
        }
      });
    }

    drawList.sort((a, b) => a.depth - b.depth);
    for (const item of drawList) item.draw();
  }

  /* ================= Input & Joystick ================= */
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
    if (game.gold < PET_COST) { flashNoGold(); return false; }
    game.gold -= PET_COST; syncHud();
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
    const isGrass = tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS && !PATH_SET.has(tx + "," + ty);
    if (ev.button === 2 || tapMode === "move" || !isGrass) {
      game.hero.target = { gx: clamp(gx, 0.2, COLS - 0.2), gy: clamp(gy, 0.2, ROWS - 0.2) };
      return;
    }
    plantAt(tx, ty);
  });

  window.addEventListener("keydown", (ev) => {
    keys[ev.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(ev.code)) ev.preventDefault();
  });
  window.addEventListener("keyup", (ev) => { keys[ev.code] = false; });

  const joyZone = document.getElementById("joy-zone");
  const joyKnob = document.getElementById("joy-knob");
  let joyPid = null;
  function updateJoy(clientX, clientY) {
    const r = joyZone.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const maxR = r.width * 0.36;
    let dx = clientX - cx, dy = clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > maxR) { dx = (dx / d) * maxR; dy = (dy / d) * maxR; }
    joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joyVec.x = dx / maxR; joyVec.y = dy / maxR;
  }
  joyZone.addEventListener("pointerdown", (ev) => {
    ev.stopPropagation(); joyPid = ev.pointerId; joyZone.setPointerCapture(ev.pointerId);
    joyVec.active = true; updateJoy(ev.clientX, ev.clientY);
  });
  joyZone.addEventListener("pointermove", (ev) => { if (ev.pointerId === joyPid) updateJoy(ev.clientX, ev.clientY); });
  const endJoy = (ev) => {
    if (ev.pointerId !== joyPid) return;
    joyPid = null; joyVec.active = false; joyVec.x = 0; joyVec.y = 0; joyKnob.style.transform = "translate(0px, 0px)";
  };
  joyZone.addEventListener("pointerup", endJoy);
  joyZone.addEventListener("pointercancel", endJoy);

  const btnMode = document.getElementById("btn-mode");
  btnMode.addEventListener("click", () => {
    tapMode = tapMode === "plant" ? "move" : "plant";
    btnMode.textContent = tapMode === "plant" ? "🌱 点草地种椒椒鼠 (50🪙)" : "🏃 点地面移动主角";
    btnMode.className = "mode-btn " + tapMode;
  });

  document.querySelectorAll(".hero-opt").forEach((btn) => {
    btn.addEventListener("click", () => startWithHero(btn.dataset.hero));
  });
  document.getElementById("btn-speed").addEventListener("click", () => {
    speedMul = speedMul === 1 ? 2 : 1;
    const b = document.getElementById("btn-speed");
    b.textContent = speedMul + "×"; b.classList.toggle("active", speedMul === 2);
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
        enemies: game.enemies.length, shots: game.shots.length, fx: game.fx.length,
        impactFx: game.fx.filter(f => f.k === "hit" || f.k === "bolt" || f.k === "shockRing" || f.k === "frostRing").length
      };
    }
  };

  renderHeroThumbs();
  whenReady(() => renderHeroThumbs());
  updateLayout();
  openHeroPicker();
  requestAnimationFrame(loop);
})();
