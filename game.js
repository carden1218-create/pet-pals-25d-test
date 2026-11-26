(() => {
  "use strict";

  const OL = "#2a1f36";
  const TAU = Math.PI * 2;
  const COLS = 11, ROWS = 7;
  const PET_COST = 50;
  const PERSP_K = 0.044;

  const {
    hash, jit, sampleSmoothLoop, makeEllipsePts, tracePoly, strokeWaxCrayon, fillWaxCrayon, fillOilPastel, dabPastelCluster, dabStroke, buildCardboardStandees, whenReady, drawCrumpledPaperOverlay, paintKraftMottle, drawCorrugatedWallFlutes, getStandeeFlashCv
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
    },
    coco: {
      img: "coco", name: "椰椰獭", fxKind: "water", moveSpd: 4.7, range: 3.35, atkRate: 0.42, dmg: 25,
      projCol: "#2d9cff", coreCol: "#e4f8ff", burstCol: "#5cd0ff", wordOl: "#0e437a",
      words: ["SPLASH!", "哗啦!", "冲!"],
      burnDur: 0, slowDur: 1.2, splash: 1.05, knock: 0.34
    },
    taro: {
      img: "taro", name: "芋岩熊", fxKind: "rock", moveSpd: 3.9, range: 3.00, atkRate: 0.66, dmg: 38,
      projCol: "#8c7464", coreCol: "#e8d6c0", burstCol: "#c9925a", wordOl: "#3e2614",
      words: ["SMASH!", "轰隆!", "砸!"],
      burnDur: 0, slowDur: 0, splash: 1.55, knock: 0.20
    }
  };



  const ACTIVE_SKILLS = {
    chili:     { id: "ult_fire",      ico: "🔥", lbl: "烈焰火环", cd: 6.0, title: "大招 · 烈焰火环", desc: "按 Q/空格 或技能键召唤脚下燃烧火环，持续灼烧周围史莱姆！" },
    lemon:     { id: "ult_lightning", ico: "🌩️", lbl: "九天雷暴", cd: 6.0, title: "大招 · 九天雷暴", desc: "按 Q/空格 或技能键召唤雷云齐劈多道纸片天雷！" },
    blueberry: { id: "ult_frost",     ico: "❄️", lbl: "极寒冰暴", cd: 6.0, title: "大招 · 极寒冰暴", desc: "按 Q/空格 或技能键引爆大范围冰霜新星，冰封震碎大片史莱姆！" },
    coco:      { id: "ult_water",     ico: "🌊", lbl: "狂澜海啸", cd: 6.0, title: "大招 · 狂澜海啸", desc: "按 Q/空格 或技能键掀起滚滚纸板海浪横扫并冲退史莱姆！" },
    taro:      { id: "ult_rock",      ico: "🪨", lbl: "陨石震雨", cd: 6.0, title: "大招 · 陨石震雨", desc: "按 Q/空格 或技能键降下巨岩陨石雨砸裂地面并碾碎史莱姆！" }
  };

  const HERO_UPGRADES = {
    chili: [
      { id: "multi", ico: "🌶️", title: "万箭齐发 · 散射火球", desc: "每次额外发射 +2 颗辣椒火球！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.multiShot += 2; } },
      { id: "blast", ico: "💥", title: "爆燃扩大", desc: "爆炸范围 +40%，伤害 +35%！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.blastScale += 0.40; h.dmgMul += 0.35; } },
      { id: "speed", ico: "🔥", title: "极速连喷", desc: "攻击速度 +38%！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.atkSpdMul += 0.38; } },
      { id: "pierce", ico: "☄️", title: "穿透辣椒弹", desc: "火球可多穿透 +1 只史莱姆！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.pierce += 1; } }
    ],
    lemon: [
      { id: "multi", ico: "⚡", title: "万雷齐发 · 多重天雷", desc: "每次额外劈下 +2 道纸片天雷！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.multiShot += 2; } },
      { id: "chain", ico: "🌩️", title: "连锁天雷 +2", desc: "落雷额外再劈 +2 只附近史莱姆！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.chainCount += 2; } },
      { id: "speed", ico: "🔋", title: "雷霆暴走", desc: "攻速 +38%，天雷伤害 +25%！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.atkSpdMul += 0.38; h.dmgMul += 0.25; } },
      { id: "blast", ico: "💥", title: "霹雳强袭", desc: "天雷伤害 +45%，震波范围 +35%！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.dmgMul += 0.45; h.blastScale += 0.35; } }
    ],
    blueberry: [
      { id: "multi", ico: "❄️", title: "万箭齐发 · 冰晶齐射", desc: "每次额外发射 +2 枚冰霜球！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.multiShot += 2; } },
      { id: "blast", ico: "🧊", title: "极寒爆裂", desc: "冰冻溅射范围 +45%，伤害 +30%！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.blastScale += 0.45; h.dmgMul += 0.30; } },
      { id: "pierce", ico: "🌀", title: "穿透冰棱", desc: "冰霜球可多穿透 +1 只史莱姆！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.pierce += 1; } },
      { id: "speed", ico: "💨", title: "疾风速射", desc: "攻击速度 +38%！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.atkSpdMul += 0.38; } }
    ],
    coco: [
      { id: "multi", ico: "💧", title: "万箭齐发 · 水弹连珠", desc: "每次额外发射 +2 颗椰浪水弹！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.multiShot += 2; } },
      { id: "wave", ico: "🌊", title: "巨浪冲退", desc: "水浪范围 +45%，击退与伤害提升！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.blastScale += 0.45; h.dmgMul += 0.30; } },
      { id: "speed", ico: "💦", title: "极速喷射", desc: "攻速 +40%！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.atkSpdMul += 0.40; } },
      { id: "pierce", ico: "🫧", title: "穿透水柱", desc: "水弹可多穿透 +1 只史莱姆！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.pierce += 1; } }
    ],
    taro: [
      { id: "multi", ico: "🪨", title: "万石齐发 · 乱石崩云", desc: "每次额外砸出 +2 颗巨岩！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.multiShot += 2; } },
      { id: "quake", ico: "⛰️", title: "地裂岩刺", desc: "岩震范围 +45%，伤害 +35%！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.blastScale += 0.45; h.dmgMul += 0.35; } },
      { id: "speed", ico: "🔨", title: "重锤连砸", desc: "攻速 +38%！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.atkSpdMul += 0.38; } },
      { id: "pierce", ico: "💥", title: "碎岩穿刺", desc: "巨岩可多穿透 +1 只，伤害 +25%！", apply: (h) => { h.fxTier = (h.fxTier || 0) + 1;  h.pierce += 1; h.dmgMul += 0.25; } }
    ]
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

  function screenVecToGrid(scrX, scrY, gx, gy) {
    const [hsx, hsy] = proj(gx, gy, 0);
    const [gx1, gy1] = screenToGrid(hsx + scrX * 18, hsy + scrY * 18);
    const dx = gx1 - gx, dy = gy1 - gy;
    const len = Math.hypot(dx, dy);
    return len > 1e-5 ? [dx / len, dy / len] : [scrX, scrY];
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

    // Soft darker-teal cast shadow on ground to bottom-right (top-left sun)
    c.save();
    c.translate(16, botYOff + 14);
    tracePoly(c, expandUneven(pts, numLayers - 1, seed + 1));
    c.fillStyle = "rgba(18, 56, 52, 0.30)";
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

      // Soft warm umber cut bottom edge of corrugated layer (no harsh black ink!)
      c.save();
      c.translate(0, yOff + curH);
      strokeWaxCrayon(c, layerPts, "rgba(74, 40, 18, 0.72)", 1.7, seed + L * 71, true);
      c.restore();

      // Top face of EVERY raised/protruding cardboard stratum painted in thick oil-pastel (NO black outline!)
      c.save();
      c.translate(0, yOff);
      if (L > 0) {
        const shelfPalettes = [
          ["#1e4e44", "#2d6c5c", "#428971"],
          ["#23594d", "#347664", "#4d977d"],
          ["#2a5c4f", "#3a7b67", "#539a7f"]
        ];
        fillOilPastel(c, layerPts, "#2d6c5c", seed + L * 17, {
          cols: shelfPalettes[L % shelfPalettes.length], dabSize: 15, toothAlpha: 0.36, edgeBleed: true
        });
        c.save(); tracePoly(c, layerPts); c.clip();
        drawCrumpledPaperOverlay(c, W, H, 920 + seed + L, { cell: 64, strength: 0.58, coloredSurface: true });
        c.restore();
      } else {
        if (topFillFn) {
          topFillFn(layerPts);
        } else {
          const moundPal = seed % 2 ? ["#1e4f44", "#2f6e5d", "#478e75", "#5aa484"] : ["#23564a", "#357865", "#4f997e", "#d87842"];
          fillOilPastel(c, layerPts, "#32705f", seed + 30, {
            cols: moundPal, dabSize: 15, toothAlpha: 0.40, edgeBleed: true
          });
          c.save(); tracePoly(c, layerPts); c.clip();
          dabPastelCluster(c, cx - 10, cy - 4, 46, 20, { shadow: "#23584b", mid: "#3d826c", light: "#5ca686", accent: "#e08448" }, seed + 45, { count: 16, dabSize: 13 });
          drawCrumpledPaperOverlay(c, W, H, 935 + seed, { cell: 60, strength: 0.62, coloredSurface: true });
          c.restore();
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
    // 1. Painterly Oil-Pastel Sky band at top (solid pastel underpaint so zero white gaps, zero dark outlines!)
    const horizonY = H * (cam.portrait ? 0.145 : 0.155);
    const skyGrad = c.createLinearGradient(0, 0, 0, horizonY + 64);
    skyGrad.addColorStop(0, "#7abbd0");
    skyGrad.addColorStop(0.58, "#a8d8df");
    skyGrad.addColorStop(1, "#e7e5d2");
    c.fillStyle = skyGrad;
    c.fillRect(0, 0, W, horizonY + 64);
    fillOilPastel(c, [[0, 0], [W, 0], [W, horizonY + 64], [0, horizonY + 64]], "#8ecad9", 12, {
      withBase: false, cols: ["#7abbd0", "#95cedb", "#b6dfe3", "#e2e6d5"], dabSize: 28, toothAlpha: 0.26, edgeBleed: false, alpha: 0.62, density: 0.88
    });

    // Soft warm oil-pastel sun in upper-left sky (solid glow + dabs, NO black outline!)
    const sunX = W * (cam.portrait ? 0.15 : 0.085);
    const sunY = H * (cam.portrait ? 0.115 : 0.135);
    const sunR = Math.min(W, H) * 0.036;
    fillOilPastel(c, makeEllipsePts(sunX, sunY, sunR * 1.05, sunR * 1.05, 16, 20), "#f6d458", 20, {
      cols: ["#ecc04a", "#f6d458", "#ffea8f"], dabSize: sunR * 0.6, toothAlpha: 0.22, edgeBleed: true
    });

    // Soft oil-pastel cream clouds (ZERO dark outlines!)
    const clouds = [[0.33, 0.10, 0.90], [0.62, 0.11, 1.05], [0.87, 0.095, 0.85]];
    for (let ci = 0; ci < clouds.length; ci++) {
      const [cxr, cyr, sc] = clouds[ci];
      const clx = W * cxr, cly = H * cyr;
      const u = Math.min(W, H) * 0.036 * sc;
      dabPastelCluster(c, clx, cly, u * 1.65, u * 0.65, {
        shadow: "#d6ebee", mid: "#f7f2e4", light: "#fffcf4", accent: "#f8e8cf"
      }, 30 + ci * 7, { count: 24, dabSize: u * 0.62 });
    }

    // 2. Distant rolling hills + lush oil-pastel lower meadow (deep teal-green + warm burnt-orange earth!)
    const bgHill1 = [[0, H], [0, horizonY + 14]];
    for (let x = 0; x <= W + 60; x += 60) bgHill1.push([x, horizonY + 10 + Math.sin(x * 0.0055 + 0.7) * 18]);
    bgHill1.push([W, H]);
    fillOilPastel(c, bgHill1, "#5c9b83", 40, {
      cols: ["#4a8973", "#64a489", "#b87f5a"], dabSize: 24, toothAlpha: 0.34, edgeBleed: true, density: 0.85
    });

    const bgHill2 = [[0, H], [0, horizonY + 46]];
    for (let x = 0; x <= W + 50; x += 50) bgHill2.push([x, horizonY + 42 + Math.cos(x * 0.007 - 0.5) * 14]);
    bgHill2.push([W, H]);
    fillOilPastel(c, bgHill2, "#2f6e5d", 42, {
      cols: ["#205246", "#2f6e5d", "#438770", "#559c7f"], dabSize: 26, toothAlpha: 0.38, edgeBleed: true, density: 0.90
    });

    c.save();
    tracePoly(c, bgHill2);
    c.clip();
    // Big chunky burnt-orange & deeper-teal oil-pastel blobs across the outer meadow
    for (let mi = 0; mi < 16; mi++) {
      const mx = hash(mi * 13, 19) * W;
      const my = horizonY + 55 + hash(mi * 7, 31) * (H - horizonY - 55);
      const rx = Math.min(W, H) * (0.10 + hash(mi, 43) * 0.12);
      const isWarm = mi % 3 === 0;
      dabPastelCluster(c, mx, my, rx, rx * 0.42, isWarm
        ? { shadow: "#b85628", mid: "#d87842", light: "#e79658" }
        : { shadow: "#1b4a40", mid: "#2d6d5c", light: "#4b9279" },
        150 + mi * 7, { count: 18, dabSize: rx * 0.28 }
      );
    }

    // Winding Teal Stream along lower-right & right edge with soft aqua ripple marks!
    const streamPts = cam.portrait
      ? [[W * 0.62, H * 0.72], [W * 0.78, H * 0.78], [W * 0.88, H * 0.86], [W * 0.94, H * 0.95], [W * 1.02, H * 1.02], [W * 0.78, H * 1.04], [W * 0.68, H * 0.92], [W * 0.54, H * 0.82]]
      : [[W * 0.66, H * 0.68], [W * 0.80, H * 0.72], [W * 0.94, H * 0.76], [W * 1.04, H * 0.82], [W * 1.02, H * 1.04], [W * 0.76, H * 1.02], [W * 0.64, H * 0.90], [W * 0.56, H * 0.78]];
    const smoothStream = sampleSmoothLoop(streamPts, 4);
    fillOilPastel(c, smoothStream, "#3b9aa6", 205, {
      cols: ["#256b78", "#3b9aa6", "#58bdc2"], dabSize: 16, toothAlpha: 0.30, edgeBleed: true
    });
    c.save();
    tracePoly(c, smoothStream);
    c.clip();
    // Light cream-aqua pastel water ripple marks
    for (let ri = 0; ri < 26; ri++) {
      const rx = W * (0.58 + hash(ri * 7, 211) * 0.44);
      const ry = H * (0.70 + hash(ri * 11, 223) * 0.32);
      dabStroke(c, rx, ry, 18 + hash(ri, 229) * 20, 4.5, -0.18 + hash(ri, 233) * 0.36, ri % 3 ? "#b4f0ec" : "#77d4d6", 0.72, 240 + ri);
    }
    c.restore();

    // Small yellow flower clumps & pink stones along outer meadow/stream bank
    for (let fi = 0; fi < 14; fi++) {
      const fx = W * (0.05 + hash(fi * 17, 263) * 0.90);
      const fy = horizonY + 55 + hash(fi * 13, 271) * (H - horizonY - 70);
      if (fi % 3 === 0) {
        dabPastelCluster(c, fx, fy, 11, 6, { shadow: "#a45062", mid: "#d98492", light: "#ecaab4" }, 280 + fi, { count: 7, dabSize: 7 });
      } else {
        dabPastelCluster(c, fx, fy, 12, 7, { shadow: "#d49b24", mid: "#f6d458", light: "#ffe98c" }, 300 + fi, { count: 8, dabSize: 5.5 });
      }
    }
    c.restore();

    // Soft crumpled paper creases across sky & background meadow
    drawCrumpledPaperOverlay(c, W, H, 808, { cell: 112, strength: 0.70, coloredSurface: false });

    const layerH = getHillLayerH();
    const ox = cam.portrait ? 0.32 : 0.60;

    // 3. Main lumpy, organic raised 3-layer cardboard hill island in 3/4 oblique perspective
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
        // Thick oil-pastel deep teal-green meadow base (ZERO black outline!)
        fillOilPastel(c, pts, "#2f6e5d", 71, {
          cols: ["#1f5246", "#2f6e5d", "#438770", "#56a082"], dabSize: 18, toothAlpha: 0.48, edgeBleed: true
        });

        c.save();
        tracePoly(c, pts);
        c.clip();

        // Warm sunlit sage-teal highlight glow along upper-left rim
        c.save();
        c.strokeStyle = "rgba(138, 206, 168, 0.34)";
        c.lineWidth = 8;
        c.lineCap = "round";
        tracePoly(c, pts.slice(0, Math.floor(pts.length * 0.36)), false);
        c.stroke();
        c.restore();

        // Big chunky organic oil-pastel colour blobs across the 11x7 meadow (deep teal-green + warm burnt-orange patches!)
        for (let i = 0; i < 20; i++) {
          const gx = 0.2 + hash(i * 7, 13) * (COLS - 0.4);
          const gy = 0.2 + hash(i * 11, 29) * (ROWS - 0.4);
          const [px, py, pp] = proj(gx, gy, 0);
          const rx = cam.unit * (0.68 + hash(i, 41) * 0.72) * pp;
          const isWarmGround = (i % 4 === 0);
          dabPastelCluster(c, px, py, rx, rx * 0.48, isWarmGround
            ? { shadow: "#b8582a", mid: "#d4733e", light: "#e59154" }
            : (i % 2 ? { shadow: "#235a4d", mid: "#3b7e6a", light: "#5aa284" } : { shadow: "#1b4a40", mid: "#286454", light: "#3f826d" }),
            80 + i * 5, { count: 16, dabSize: Math.max(10, rx * 0.28) }
          );
        }

        // First pass: soft value-varied grass meadow tiles + SUBTLE DABBED GRID MARKS (NO hard tile borders!)
        for (let d = 0; d <= COLS + ROWS - 2; d++) {
          for (let tx = 0; tx < COLS; tx++) {
            const ty = d - tx;
            if (ty < 0 || ty >= ROWS) continue;
            if (PATH_SET.has(tx + "," + ty)) continue;

            const [cx0, cy0, pp0] = proj(tx + 0.5, ty + 0.5, 0);
            const dabR = cam.unit * 0.46 * pp0;
            const gPals = [
              { shadow: "#215548", mid: "#337260", light: "#4c9278" },
              { shadow: "#1d4e42", mid: "#2d6959", light: "#44876f" },
              { shadow: "#265d4f", mid: "#3a7b67", light: "#549b7e" }
            ];
            dabPastelCluster(c, cx0, cy0, dabR, dabR * 0.56, gPals[(tx * 3 + ty) % gPals.length], 500 + tx * 13 + ty, {
              count: 8, dabSize: Math.max(7, cam.unit * 0.22 * pp0)
            });

            // Subtle dabbed pastel corner ticks for readable placement grid (no digital grid lines!)
            const inner = tileCorners(tx, ty, 0.16, 0);
            for (let ci = 0; ci < 4; ci++) {
              const pA = inner[ci];
              dabStroke(c, pA[0], pA[1], Math.max(3.6, 5.2 * pp0), Math.max(2.0, 2.8 * pp0), ci * 0.8 + 0.4, "rgba(255, 246, 210, 0.48)", 0.85, 610 + tx * 11 + ty * 5 + ci);
            }

            const rnd = hash(tx + 5, ty + 11);
            if (rnd > 0.35) {
              const [gx, gy, pp] = proj(tx + 0.22 + rnd * 0.45, ty + 0.72, 0);
              dabStroke(c, gx - 2.5 * pp, gy - 2 * pp, 4.5 * pp, 2.2 * pp, -1.1, "#1c483d", 0.85, 700 + tx + ty);
              dabStroke(c, gx + 2.5 * pp, gy - 3 * pp, 5.0 * pp, 2.2 * pp, -1.8, "#5aa684", 0.85, 705 + tx + ty);
            }
            if (rnd > 0.72) {
              const [fx, fy, pp] = proj(tx + 0.66, ty + 0.32, 0);
              const isPink = (tx + ty) % 3 === 0;
              dabPastelCluster(c, fx, fy, 7.5 * pp, 4.5 * pp, isPink
                ? { shadow: "#c2627a", mid: "#e892a8", light: "#f7bac8" }
                : { shadow: "#d49b24", mid: "#f6d458", light: "#ffe98c" },
                800 + tx * 7 + ty, { count: 5, dabSize: Math.max(3.5, 4.6 * pp) }
              );
            }
          }
        }

        // Second pass: Smooth Curving Burnt-Orange Oil-Pastel Dirt Trail (NO jagged square tile corners!)
        const pathPts = [];
        for (let i = 0; i < PATH.length; i++) {
          const [tx, ty] = PATH[i];
          pathPts.push([tx + 0.5, ty + 0.5]);
          if (i < PATH.length - 1) {
            const [nx, ny] = PATH[i + 1];
            pathPts.push([lerp(tx + 0.5, nx + 0.5, 0.33), lerp(ty + 0.5, ny + 0.5, 0.33)]);
            pathPts.push([lerp(tx + 0.5, nx + 0.5, 0.67), lerp(ty + 0.5, ny + 0.5, 0.67)]);
          }
        }
        // Soft warm terracotta-umber bank shadow under the path
        for (let i = 0; i < pathPts.length; i++) {
          const [gx, gy] = pathPts[i];
          const [cx0, cy0, pp0] = proj(gx, gy, 0);
          const rx = cam.unit * 0.58 * pp0, ry = cam.unit * (cam.portrait ? 0.52 : 0.30) * pp0;
          dabPastelCluster(c, cx0, cy0, rx, ry, {
            shadow: "#98441e", mid: "#b85628", light: "#cc6836"
          }, 290 + i * 5, { count: 10, dabSize: Math.max(9, cam.unit * 0.26 * pp0) });
        }
        // Rich burnt-orange / terracotta painterly path core
        for (let i = 0; i < pathPts.length; i++) {
          const [gx, gy] = pathPts[i];
          const [cx0, cy0, pp0] = proj(gx, gy, 0);
          const rx = cam.unit * 0.49 * pp0, ry = cam.unit * (cam.portrait ? 0.44 : 0.25) * pp0;
          const jx = jit(i, 91) * 3.0, jy = jit(i, 97) * 2.2;
          dabPastelCluster(c, cx0 + jx, cy0 + jy, rx, ry, {
            shadow: "#c66330", mid: "#dc7c44", light: "#ea9958", accent: "#f2b274"
          }, 310 + i * 7, { count: 12, dabSize: Math.max(8, cam.unit * 0.24 * pp0) });
        }
        // Scattered pink/rose-stone pebbles along the dirt path (NO black outlines!)
        for (let i = 0; i < PATH.length; i++) {
          const [tx, ty] = PATH[i];
          for (let k = 0; k < 2; k++) {
            const gx = tx + 0.24 + hash(tx * 7 + k, ty * 13) * 0.52;
            const gy = ty + 0.24 + hash(tx * 17, ty * 5 + k) * 0.52;
            const [px, py, pp] = proj(gx, gy, 0);
            const r = cam.unit * (0.068 + k * 0.016) * pp;
            dabStroke(c, px, py, r * 1.9, r * 1.15, (k ? 0.3 : -0.4), k ? "#ebacb6" : "#b55d6e", 0.88, 400 + tx + k);
          }
        }

        // Subtle crumpled paper grain across the oil-pastel hill top
        drawCrumpledPaperOverlay(c, W, H, 955, { cell: 104, strength: 0.56, coloredSurface: true });

        c.restore();
      }
    });

    // 4. Raised Multi-Layer Back & Side Cardboard Hillocks (oil-pastel tops + corrugated kraft cliffs!)
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
        ctrl: [[-0.95 - ox * 0.55, 3.35], [-0.72 - ox * 0.40, 2.75], [-0.24 - ox * 0.15, 2.98], [-0.22 - ox * 0.15, 4.62], [-0.72 - ox * 0.40, 4.78]]
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
  let hitStopT = 0;
  let hitStopCd = 0;
  function triggerShake(mag, dur) {
    // Strictly <= 1.6px micro-nudge; never shakes HUD or detaches standees!
    const clamped = Math.min(1.6, mag);
    if (clamped >= shakeMag || shakeT <= 0) { shakeMag = clamped; shakeT = Math.min(0.06, dur); }
  }
  function triggerHitStop(dur) {
    if (hitStopCd <= 0) {
      hitStopT = Math.max(hitStopT, clamp(dur, 0.050, 0.080));
      hitStopCd = 0.065;
    }
  }
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
      facing: 1, waddle: 0, atkCd: 0.15, recoil: 0, windup: 0, lungeX: 0, lungeY: 0, lungeZ: 0, atkCount: 0,
      level: 1, xp: 0, xpNext: 4,
      multiShot: 1, atkSpdMul: 1, dmgMul: 1, blastScale: 1, pierce: 0, chainCount: 1, fxTier: 0,
      activeSkill: null, activeCd: 0, pickedIds: []
    };
  }

  function makeTower(tx, ty) {
    return {
      tx, ty, gx: tx + 0.5, gy: ty + 0.5, gz: 0,
      range: 3.15, atkCd: 0.12, atkRate: 0.62, dmg: 26,
      facing: 1, recoil: 0, windup: 0, lungeX: 0, lungeY: 0, phase: Math.random() * TAU
    };
  }

  function openHeroPicker() {
    game = {
      started: false, waveIdx: 0, spawnIdx: 0, spawnTimer: 0.35, wavePause: 0,
      lives: 1, gold: 60, over: false, won: false, levelPick: null,
      hero: makeHero(chosenHeroKey), towers: [], enemies: [], dying: [], shots: [], fx: [], scorch: [], activeZones: []
    };
    document.getElementById("overlay").classList.add("hidden");
    document.getElementById("levelup-overlay").classList.add("hidden");
    document.getElementById("pick-overlay").classList.remove("hidden");
    syncHud();
  }

  function startWithHero(heroKey) {
    chosenHeroKey = heroKey;
    game = {
      started: true, waveIdx: 0, spawnIdx: 0, spawnTimer: 0.25, wavePause: 0,
      lives: 1, gold: 60, over: false, won: false, levelPick: null,
      hero: makeHero(heroKey), towers: [], enemies: [], dying: [], shots: [], fx: [], scorch: [], activeZones: []
    };
    document.getElementById("pick-overlay").classList.add("hidden");
    document.getElementById("levelup-overlay").classList.add("hidden");
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
    const h = game.hero;
    if (h) {
      document.getElementById("xp-lvl").textContent = "Lv." + h.level;
      document.getElementById("xp-fill").style.width = Math.min(100, Math.round((h.xp / h.xpNext) * 100)) + "%";
      syncSkillBtn();
    }
  }

  function syncSkillBtn() {
    const btn = document.getElementById("btn-skill");
    if (!btn || !game || !game.hero || !game.hero.activeSkill) {
      if (btn) btn.classList.add("hidden");
      return;
    }
    const sk = game.hero.activeSkill;
    const cd = Math.max(0, game.hero.activeCd || 0);
    btn.classList.remove("hidden");
    document.getElementById("skill-ico").textContent = sk.ico;
    document.getElementById("skill-lbl").textContent = sk.lbl;
    const mask = document.getElementById("skill-cd-mask");
    if (cd > 0.02) {
      btn.classList.remove("ready");
      btn.classList.add("on-cd");
      const frac = clamp(cd / sk.cd, 0, 1);
      const deg = Math.round(frac * 360);
      mask.style.background = `conic-gradient(rgba(36, 24, 58, 0.42) ${deg}deg, rgba(255, 253, 246, 0.10) ${deg}deg)`;
      mask.textContent = cd.toFixed(1) + "s";
    } else {
      btn.classList.remove("on-cd");
      btn.classList.add("ready");
      mask.textContent = "";
    }
  }

  function triggerActiveSkill() {
    if (!game || !game.started || game.over || game.levelPick || !game.hero || !game.hero.activeSkill) return false;
    const h = game.hero;
    if (h.activeCd > 0.02) return false;
    const sk = h.activeSkill;
    h.activeCd = sk.cd;
    h.recoil = 1.4;
    triggerHitStop(0.055);
    triggerShake(1.5, 0.06);

    const k = h.key;
    if (k === "chili") {
      // Burning Fire Circle on ground around hero!
      game.activeZones.push({
        kind: "fireRing", gx: h.gx, gy: h.gy, r: 2.15 * h.blastScale,
        t: 0, dur: 3.2, tick: 0, dmg: Math.round(32 * h.dmgMul), seed: Math.floor(Math.random() * 9999)
      });
      addFx({ k: "hit", fxKind: "fire", gx: h.gx, gy: h.gy, gz: 0.9, word: "烈焰火环!", big: true, burstCol: "#ffe042", wordOl: "#6b1808", scale: 1.25, life: 0.55, max: 0.55, seed: 701 });
    } else if (k === "lemon") {
      // Sky Lightning Storm! 6 thick paper-cut bolts from storm clouds!
      const tgts = [...game.enemies].filter(e => e.hp > 0).slice(0, 6);
      const spots = tgts.length ? tgts.map(e => ({ e, gx: e.gx, gy: e.gy, gz: e.gz + 0.34 })) : [{ e: null, gx: h.gx + 1.5, gy: h.gy, gz: 0.34 }];
      while (spots.length < 5) {
        const p = pathPos(Math.random() * (PATH.length - 1));
        spots.push({ e: null, gx: p[0], gy: p[1], gz: 0.34 });
      }
      spots.forEach((sp, idx) => {
        addFx({ k: "skyCloud", gx: sp.gx, gy: sp.gy, gz: sp.gz + 2.65, life: 0.50, max: 0.50, thin: false, seed: 800 + idx });
        addFx({ k: "skyBolt", gx: sp.gx, gy: sp.gy, gz: sp.gz, life: 0.44, max: 0.44, thin: false, seed: 820 + idx });
        addFx({ k: "shockRing", fxKind: "lightning", gx: sp.gx, gy: sp.gy, gz: 0.04, r: 1.35, col: "#26a8ff", innerCol: "#fff24a", life: 0.38, max: 0.38, seed: 840 + idx });
        game.scorch.push({ gx: sp.gx, gy: sp.gy, life: 1.6, max: 1.6, seed: 860 + idx });
        if (sp.e && sp.e.hp > 0) damageEnemy(sp.e, Math.round(48 * h.dmgMul), false, { fxKind: "lightning", dirX: 0, dirY: 1 });
      });
      addFx({ k: "hit", fxKind: "lightning", gx: h.gx, gy: h.gy, gz: 1.0, word: "九天雷暴!", big: true, burstCol: "#ffe944", wordOl: "#13428c", scale: 1.28, life: 0.55, max: 0.55, seed: 899 });
    } else if (k === "blueberry") {
      // Frost Nova! Expanding ice ring + 10 ice crystal spikes!
      const nr = 3.25 * h.blastScale;
      addFx({ k: "frostRing", gx: h.gx, gy: h.gy, gz: 0.04, r: nr, life: 0.58, max: 0.58, seed: 901 });
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        const rr = 1.2 + (i % 2) * 1.1;
        addFx({ k: "iceNovaSpike", gx: h.gx + Math.cos(a) * rr, gy: h.gy + Math.sin(a) * rr * 0.72, gz: 0, h: 0.85, life: 0.55, max: 0.55, seed: 910 + i });
      }
      for (const e of game.enemies) {
        if (e.hp > 0 && Math.hypot(e.gx - h.gx, e.gy - h.gy) <= nr) {
          e.slowT = 3.6;
          damageEnemy(e, Math.round(44 * h.dmgMul), false, { fxKind: "frost", dirX: e.gx - h.gx, dirY: e.gy - h.gy });
        }
      }
      addFx({ k: "hit", fxKind: "frost", gx: h.gx, gy: h.gy, gz: 0.95, word: "极寒冰暴!", big: true, burstCol: "#72d8ff", wordOl: "#153d88", scale: 1.28, life: 0.55, max: 0.55, seed: 949 });
    } else if (k === "coco") {
      // Tidal Wave sweeping across the board!
      game.activeZones.push({
        kind: "tidalWave", gx: h.gx - 1.5, gy: h.gy, r: 2.35 * h.blastScale,
        t: 0, dur: 0.85, hitSet: new Set(), dmg: Math.round(45 * h.dmgMul), seed: Math.floor(Math.random() * 9999)
      });
      addFx({ k: "hit", fxKind: "water", gx: h.gx, gy: h.gy, gz: 0.95, word: "狂澜海啸!", big: true, burstCol: "#5cd0ff", wordOl: "#0e437a", scale: 1.25, life: 0.55, max: 0.55, seed: 959 });
    } else if (k === "taro") {
      // Earthquake + Boulder Rain across slimes!
      const tgts = [...game.enemies].filter(e => e.hp > 0);
      for (let i = 0; i < 6; i++) {
        const e = tgts[i % Math.max(1, tgts.length)];
        const bx = e ? e.gx + (Math.random() - 0.5) * 0.4 : pathPos(Math.random() * (PATH.length - 1))[0];
        const by = e ? e.gy + (Math.random() - 0.5) * 0.3 : pathPos(Math.random() * (PATH.length - 1))[1];
        addFx({ k: "boulderDrop", gx: bx, gy: by, gz: 0, delay: i * 0.06, life: 0.55, max: 0.55, seed: 970 + i });
        addFx({ k: "rockSpike", gx: bx + 0.3, gy: by + 0.1, gz: 0, h: 0.72, life: 0.52, max: 0.52, seed: 980 + i });
        addFx({ k: "shockRing", fxKind: "rock", gx: bx, gy: by, gz: 0.04, r: 1.4, col: "#6e523a", innerCol: "#d4b48c", life: 0.42, max: 0.42, seed: 990 + i });
        if (e && e.hp > 0) damageEnemy(e, Math.round(52 * h.dmgMul), false, { fxKind: "rock", dirX: 0, dirY: 1, knock: 0.30 });
      }
      addFx({ k: "hit", fxKind: "rock", gx: h.gx, gy: h.gy, gz: 0.95, word: "陨石震雨!", big: true, burstCol: "#c9925a", wordOl: "#3e2614", scale: 1.28, life: 0.55, max: 0.55, seed: 999 });
    }
    syncSkillBtn();
    return true;
  }

  function grantHeroXp(amt = 1) {
    if (!game || !game.hero || game.over) return;
    const h = game.hero;
    h.xp += amt;
    if (h.xp >= h.xpNext && !game.levelPick) {
      h.xp -= h.xpNext;
      h.level += 1;
      h.xpNext = Math.round(h.xpNext * 1.45 + 1);
      openLevelUpPicker();
    }
    syncHud();
  }

  function openLevelUpPicker() {
    const h = game.hero;
    const pool = [...(HERO_UPGRADES[h.key] || HERO_UPGRADES.chili)];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    let choices = pool.slice(0, 3);
    if (!h.activeSkill && ACTIVE_SKILLS[h.key]) {
      const sk = ACTIVE_SKILLS[h.key];
      choices[0] = {
        id: sk.id, ico: sk.ico, title: sk.title, desc: sk.desc,
        apply: (heroObj) => { heroObj.activeSkill = sk; heroObj.activeCd = 0; }
      };
    }
    game.levelPick = choices;
    document.getElementById("lvl-title").textContent = "⭐ " + game.hero.def.name + " Lv." + game.hero.level + "！选一个强化";
    const grid = document.getElementById("upg-grid");
    grid.innerHTML = "";
    choices.forEach((u, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "upg-card";
      btn.dataset.upg = u.id;
      btn.innerHTML = `<div class="upg-ico">${u.ico}</div><div><div class="upg-title">${idx + 1}. ${u.title}</div><div class="upg-desc">${u.desc}</div></div>`;
      btn.addEventListener("click", () => chooseLevelUpgrade(idx));
      grid.appendChild(btn);
    });
    document.getElementById("levelup-overlay").classList.remove("hidden");
  }

  function chooseLevelUpgrade(idx) {
    if (!game || !game.levelPick || !game.levelPick[idx]) return;
    const u = game.levelPick[idx];
    u.apply(game.hero);
    game.hero.pickedIds.push(u.id);
    game.levelPick = null;
    document.getElementById("levelup-overlay").classList.add("hidden");
    addFx({
      k: "pop", gx: game.hero.gx, gy: game.hero.gy, gz: 1.55,
      text: "⭐ " + u.title.split("·")[0].trim() + "!", col: "#ffe44a", life: 0.95, max: 0.95, seed: Math.floor(Math.random() * 9999)
    });
    spawnDustPuff(game.hero.gx, game.hero.gy);
    syncHud();
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
    const isCrit = !!(opt.crit || isKill);
    const bScale = (opt.blastScale || 1.0) * (1 + Math.min(0.45, (opt.fxTier || 0) * 0.14)) * (isCrit ? 1.24 : 1.08);

    // 55-76ms crunchy hit-stop + strictly <= 1.6px micro-shake
    triggerHitStop(isCrit ? 0.075 : 0.056);
    if (isCrit || fxKind === "fire" || fxKind === "rock") {
      triggerShake(isCrit ? 1.6 : 1.1, 0.055);
    }

    // Intense 12-ray contact impact spark + bright white flash core right ON the target!
    addFx({
      k: "impactSpark", fxKind, gx, gy, gz: gz + 0.12,
      col: fxKind === "frost" ? "#b4f0ff" : (fxKind === "lightning" ? "#fff45e" : (fxKind === "water" ? "#7cd8ff" : "#ffa83a")),
      scale: bScale * (isCrit ? 1.48 : 1.24),
      life: 0.25, max: 0.25, seed: Math.floor(Math.random() * 9999)
    });

    // Big chunky 3-layer starburst comic burst!
    addFx({
      k: "hit", fxKind, gx: gx + (Math.random() - 0.5) * 0.10, gy: gy - 0.10, gz: gz + 0.42,
      word, big: isCrit, burstCol, wordOl: opt.wordOl || OL, scale: bScale * 1.26,
      life: 0.44, max: 0.44, seed: Math.floor(Math.random() * 9999)
    });

    // Ground scorch / rock crack / water puddle mark under impact
    game.scorch.push({ gx, gy, life: 1.7, max: 1.7, seed: Math.floor(Math.random() * 999), frost: fxKind === "frost", water: fxKind === "water", rock: fxKind === "rock" });

    if (fxKind === "rock") {
      const spN = isCrit ? 6 : 4;
      for (let sp = 0; sp < spN; sp++) {
        const ang = (sp / spN) * TAU + Math.random() * 0.4;
        const distR = (0.42 + Math.random() * 0.36) * bScale;
        addFx({
          k: "rockSpike", gx: gx + Math.cos(ang) * distR, gy: gy + Math.sin(ang) * distR * 0.72, gz: 0,
          h: (0.56 + Math.random() * 0.28) * bScale, life: 0.50, max: 0.50, seed: Math.floor(Math.random() * 9999)
        });
      }
    }

    // 2 concentric expanding shockwave rings on the ground!
    if (fxKind === "frost") {
      addFx({
        k: "frostRing", gx, gy, gz: 0.04, r: (opt.splash || 1.45) * bScale * (isCrit ? 1.28 : 1.12),
        life: 0.44, max: 0.44, seed: Math.floor(Math.random() * 9999)
      });
    } else if (fxKind === "water") {
      addFx({
        k: "shockRing", fxKind, gx, gy, gz: 0.04,
        r: (opt.splash || 1.35) * bScale * (isCrit ? 1.30 : 1.12),
        col: "#2498ff", innerCol: "#e0f7ff",
        life: 0.40, max: 0.40, seed: Math.floor(Math.random() * 9999)
      });
    } else if (fxKind === "rock") {
      addFx({
        k: "shockRing", fxKind, gx, gy, gz: 0.04,
        r: (opt.splash || 1.55) * bScale * (isCrit ? 1.30 : 1.12),
        col: "#7a583c", innerCol: "#e4c296",
        life: 0.42, max: 0.42, seed: Math.floor(Math.random() * 9999)
      });
    } else {
      addFx({
        k: "shockRing", fxKind, gx, gy, gz: 0.04,
        r: (isCrit ? 1.62 : 1.28) * bScale, col: fxKind === "lightning" ? "#26a8ff" : "#ff4b18",
        innerCol: fxKind === "lightning" ? "#fff454" : "#ffe652",
        life: 0.38, max: 0.38, seed: Math.floor(Math.random() * 9999)
      });
    }
    // Second fast inner flash ring
    addFx({
      k: "shockRing", fxKind, gx, gy, gz: 0.06,
      r: (isCrit ? 1.05 : 0.82) * bScale, col: "#fffef0", innerCol: burstCol,
      life: 0.22, max: 0.22, seed: Math.floor(Math.random() * 9999)
    });

    // Lots of chunky paper / oil-pastel debris flying outward with gravity!
    const count = isCrit ? 24 : 17;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + Math.random() * 0.35;
      const spd = 2.3 + Math.random() * 2.5;
      const chipCol = fxKind === "frost"
        ? (i % 2 ? "#7cd8ff" : "#eefaff")
        : fxKind === "water"
          ? (i % 2 ? "#3aaeff" : "#e4f8ff")
          : fxKind === "rock"
            ? (i % 2 ? "#947a66" : "#d4bea4")
            : fxKind === "lightning"
              ? (i % 2 ? "#ffe83c" : "#34a2ff")
              : (i % 3 === 0 ? "#d2965c" : (i % 2 ? "#ffe652" : "#ff4d1c"));
      addFx({
        k: "cardChip", fxKind,
        gx: gx + Math.cos(a) * 0.18, gy: gy + Math.sin(a) * 0.16, gz: gz + 0.24,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd * 0.72, vz: 2.3 + Math.random() * 2.4,
        rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 18,
        col: chipCol, szMul: isCrit ? 1.25 : 1.08,
        life: 0.42 + Math.random() * 0.18, max: 0.60, seed: i * 17
      });
    }
  }

  function spawnPaperConfetti(gx, gy, tint) {
    const cols = ["#ff5a7a", "#ffe042", "#52c4ff", tint || "#86de44", "#ff9a36", "#fffdf6"];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU + Math.random() * 0.35;
      const spd = 1.4 + Math.random() * 2.2;
      addFx({
        k: "confetti", gx, gy, gz: 0.42,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd * 0.8, vz: 2.4 + Math.random() * 2.1,
        rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 16,
        col: cols[i % cols.length],
        life: 0.62 + Math.random() * 0.22, max: 0.84, seed: Math.floor(Math.random() * 9999)
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
    addFx({ k: "puff", gx, gy, gz: 0.36, tint: tint || "#86de44", life: 0.48, max: 0.48, seed: Math.floor(Math.random() * 9999) });
    spawnPaperConfetti(gx, gy, tint);
    if (reward) {
      addFx({ k: "pop", gx: gx + 0.24, gy, gz: 1.25, text: "+" + reward + "🪙", col: "#ffd83a", life: 0.72, max: 0.72, seed: Math.floor(Math.random() * 9999) });
    }
    grantHeroXp(1);
    game.scorch.push({ gx, gy, life: 1.8, max: 1.8, seed: Math.floor(Math.random() * 999) });
  }

  function spawnDustPuff(gx, gy, small = false) {
    addFx({ k: "dust", gx, gy, gz: 0.05, small, life: small ? 0.26 : 0.34, max: small ? 0.26 : 0.34, seed: Math.floor(Math.random() * 9999) });
  }

  function spawnDmgPop(gx, gy, gz, text, col, crit = false) {
    addFx({
      k: "pop", gx, gy, gz,
      vx: (Math.random() - 0.5) * (crit ? 0.95 : 0.65),
      vy: (Math.random() - 0.5) * 0.25,
      vz: crit ? 2.55 : 1.85,
      text, col: col || "#ffe45c", crit,
      life: crit ? 0.72 : 0.58, max: crit ? 0.72 : 0.58,
      seed: Math.floor(Math.random() * 9999)
    });
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
      const scrX = kx / kLen, scrY = ky / kLen;
      const [gdx, gdy] = screenVecToGrid(scrX, scrY, hero.gx, hero.gy);
      desVx = gdx * hero.def.moveSpd * mag;
      desVy = gdy * hero.def.moveSpd * mag;
    } else if (hero.target) {
      const dx = hero.target.gx - hero.gx, dy = hero.target.gy - hero.gy;
      const d = Math.hypot(dx, dy);
      if (d < 0.04) {
        hero.gx = hero.target.gx; hero.gy = hero.target.gy;
        hero.vx = 0; hero.vy = 0; hero.target = null;
      } else {
        const arriveSpd = d < 0.38 ? hero.def.moveSpd * Math.max(0.28, d / 0.38) : hero.def.moveSpd;
        desVx = (dx / d) * arriveSpd; desVy = (dy / d) * arriveSpd;
      }
    }

    const accel = 1 - Math.exp(-14 * dt);
    hero.vx = lerp(hero.vx, desVx, accel);
    hero.vy = lerp(hero.vy, desVy, accel);

    const spd = Math.hypot(hero.vx, hero.vy);
    hero.gx = clamp(hero.gx + hero.vx * dt, 0.2, COLS - 0.2);
    hero.gy = clamp(hero.gy + hero.vy * dt, 0.2, ROWS - 0.2);
    if (spd > 0.15) {
      const [sx0] = proj(hero.gx, hero.gy, 0);
      const [sx1] = proj(hero.gx + hero.vx * 0.05, hero.gy + hero.vy * 0.05, 0);
      if (Math.abs(sx1 - sx0) > 0.25) hero.facing = sx1 >= sx0 ? 1 : -1;
    }

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
    // Strong attack lunge & hop forward toward target!
    attacker.lungeX = ux * 0.24;
    attacker.lungeY = uy * 0.20;
    if ("lungeZ" in attacker) attacker.lungeZ = 0.14;
    if ("atkCount" in attacker) attacker.atkCount = (attacker.atkCount || 0) + 1;
    const isCritRoll = (attacker.atkCount && attacker.atkCount % 4 === 0) || Math.random() < 0.24;
    const mx = attacker.gx + ux * 0.48, my = attacker.gy + uy * 0.48;
    const fxKind = opt.fxKind || "fire";
    const dmgMul = opt.dmgMul || 1;
    const blastScale = opt.blastScale || 1;
    const multiShot = opt.multiShot || 1;
    const pierce = opt.pierce || 0;
    const chainCount = opt.chainCount ?? 1;
    const dmgVal = Math.round(opt.dmg * dmgMul);

    spawnCastDoodle(mx, my, startZ, dx, dy, opt.coreCol, fxKind);

    if (fxKind === "lightning") {
      // Lemon Chick: PAPER-CUT THUNDERBOLT STRIKING DOWN FROM THE SKY (with storm cloud flash!)
      const strikeTargets = [target];
      if (multiShot > 1) {
        const extra = game.enemies
          .filter((e) => e !== target && e.hp > 0 && Math.hypot(e.gx - attacker.gx, e.gy - attacker.gy) <= (opt.range || 3.8) + 1.2)
          .sort((a, b) => Math.hypot(a.gx - target.gx, a.gy - target.gy) - Math.hypot(b.gx - target.gx, b.gy - target.gy));
        for (let k = 0; k < Math.min(multiShot - 1, extra.length); k++) strikeTargets.push(extra[k]);
      }

      let anyKill = false;
      const hitSet = new Set();
      strikeTargets.forEach((st, idx) => {
        hitSet.add(st);
        const tz = st.gz + 0.34;
        addFx({
          k: "skyCloud", gx: st.gx, gy: st.gy, gz: tz + 2.65,
          life: 0.36, max: 0.36, thin: idx > 0, seed: Math.floor(Math.random() * 9999)
        });
        addFx({
          k: "skyBolt", gx: st.gx, gy: st.gy, gz: tz,
          life: 0.32, max: 0.32, thin: idx > 0, seed: Math.floor(Math.random() * 9999)
        });
        damageEnemy(st, isCritRoll ? Math.round(dmgVal * 1.55) : dmgVal, false, { fxKind: "lightning", dirX: 0, dirY: 1, crit: isCritRoll });
        if (st.hp <= 0) anyKill = true;
      });

      // Chain sky bolts onto additional nearby slimes!
      const chainR = opt.chainRange || 2.95;
      let chained = 0;
      for (const e of game.enemies) {
        if (chained >= chainCount) break;
        if (!hitSet.has(e) && e.hp > 0 && Math.hypot(e.gx - target.gx, e.gy - target.gy) <= chainR) {
          hitSet.add(e);
          chained++;
          addFx({
            k: "skyBolt", gx: e.gx, gy: e.gy, gz: e.gz + 0.32,
            life: 0.28, max: 0.28, thin: true, seed: Math.floor(Math.random() * 9999)
          });
          damageEnemy(e, Math.round(dmgVal * 0.55), false, { fxKind: "lightning", dirX: 0, dirY: 1 });
          if (e.hp <= 0) anyKill = true;
        }
      }

      spawnImpactDoodle(target.gx, target.gy, target.gz + 0.36, anyKill, { ...opt, blastScale, crit: isCritRoll });
      return;
    }

    // Chili / Blueberry: Single or 万箭齐发 spread volley!
    const baseAng = Math.atan2(dy, dx);
    const spreadStep = 0.24;
    for (let si = 0; si < multiShot; si++) {
      const off = (si - (multiShot - 1) * 0.5) * spreadStep;
      const a = baseAng + off;
      const tGx = attacker.gx + Math.cos(a) * dist;
      const tGy = attacker.gy + Math.sin(a) * dist;
      game.shots.push({
        sx: mx, sy: my, sz: startZ,
        gx: mx, gy: my, gz: startZ,
        target: si === 0 ? target : null,
        tx: si === 0 ? target.gx : clamp(tGx, 0.2, COLS - 0.2),
        ty: si === 0 ? target.gy : clamp(tGy, 0.2, ROWS - 0.2),
        tz: 0.38,
        t: 0, dur: clamp(dist * 0.085, 0.10, 0.19), crit: isCritRoll,
        fxKind, dmg: dmgVal, projCol: opt.projCol, coreCol: opt.coreCol,
        burstCol: opt.burstCol, wordOl: opt.wordOl, words: opt.words,
        burnDur: opt.burnDur || 0, slowDur: opt.slowDur || 0,
        splash: (opt.splash || 0) * blastScale, blastScale, knock: opt.knock || 0,
        pierce, piercedSet: new Set(),
        trail: [], seed: Math.floor(Math.random() * 9999)
      });
    }
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
    if (hitStopCd > 0) hitStopCd = Math.max(0, hitStopCd - dt);
    if (!game || !game.started || game.over || game.levelPick) return;
    if (hitStopT > 0) {
      hitStopT = Math.max(0, hitStopT - dt);
      // Hold bright white impact flash during hit-stop freeze so impact frame reads cleanly!
      for (const e of game.enemies) if (e.hitFlash > 0.85) e.hitFlash = Math.max(0.85, e.hitFlash - dt * 1.2);
      return;
    }

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
          hopPhase: Math.random() * TAU, hitFlash: 0, hitFlashCol: "#ffffff", hitSquash: 0, hitTilt: 0, hitPushX: 0, hitPushY: 0, burnT: 0, burnTick: 0.38, slowT: 0,
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
    if (hero.activeSkill && hero.activeCd > 0) {
      hero.activeCd = Math.max(0, hero.activeCd - dt);
      syncSkillBtn();
    }
    hero.recoil = Math.max(0, hero.recoil - dt * 6.0);
    hero.windup = Math.max(0, hero.windup - dt * 7.5);
    hero.lungeX = (hero.lungeX || 0) * Math.exp(-13 * dt);
    hero.lungeY = (hero.lungeY || 0) * Math.exp(-13 * dt);
    hero.lungeZ = (hero.lungeZ || 0) * Math.exp(-14 * dt);
    hero.atkCd -= dt * hero.atkSpdMul;
    if (hero.atkCd <= 0.11 && hero.atkCd > 0 && findBestTarget(hero.gx, hero.gy, hero.def.range)) {
      hero.windup = Math.max(hero.windup, 0.95);
    }
    if (hero.atkCd <= 0) {
      const target = findBestTarget(hero.gx, hero.gy, hero.def.range);
      if (target) {
        hero.atkCd = hero.def.atkRate; hero.recoil = 1.45; hero.windup = 0;
        fireShot(hero, target, {
          ...hero.def,
          multiShot: hero.multiShot, dmgMul: hero.dmgMul,
          blastScale: hero.blastScale, pierce: hero.pierce, chainCount: hero.chainCount, fxTier: hero.fxTier
        });
      }
    }

    for (const tw of game.towers) {
      tw.recoil = Math.max(0, tw.recoil - dt * 5.2);
      tw.windup = Math.max(0, (tw.windup || 0) - dt * 7);
      tw.lungeX = (tw.lungeX || 0) * Math.exp(-12 * dt);
      tw.lungeY = (tw.lungeY || 0) * Math.exp(-12 * dt);
      tw.atkCd -= dt;
      if (tw.atkCd <= 0.10 && tw.atkCd > 0 && findBestTarget(tw.gx, tw.gy, tw.range)) tw.windup = 0.85;
      if (tw.atkCd <= 0) {
        const target = findBestTarget(tw.gx, tw.gy, tw.range);
        if (target) {
          tw.atkCd = tw.atkRate; tw.recoil = 1.35; tw.windup = 0;
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
      s.gz = lerp(s.sz, s.tz, p) + Math.sin(p * Math.PI) * 0.62;

      if (!s.lastTrail || Math.hypot(s.gx - s.lastTrail[0], s.gy - s.lastTrail[1]) > 0.07) {
        s.trail.push({ gx: s.gx, gy: s.gy, gz: s.gz });
        s.lastTrail = [s.gx, s.gy];
        if (s.trail.length > 9) s.trail.shift();
      }

      // Pierce check along flight path
      if (s.pierce > 0) {
        for (const e of game.enemies) {
          if (e.hp > 0 && e !== s.target && !s.piercedSet.has(e) && Math.hypot(e.gx - s.gx, e.gy - s.gy) <= 0.55) {
            s.piercedSet.add(e);
            damageEnemy(e, Math.round(s.dmg * 0.8), false, { fxKind: s.fxKind, dirX: s.tx - s.sx, dirY: s.ty - s.sy });
            if (s.burnDur > 0) e.burnT = s.burnDur;
            if (s.slowDur > 0) e.slowT = s.slowDur;
            s.pierce--;
            if (s.pierce <= 0) break;
          }
        }
      }

      if (s.t >= 1) {
        let anyKill = false;
        const dirX = s.tx - s.sx, dirY = s.ty - s.sy;
        let hitTarget = s.target && s.target.hp > 0 ? s.target : null;
        if (!hitTarget) {
          // Spread volley shot: hit closest slime near landing spot if any!
          let bestD = 0.95;
          for (const e of game.enemies) {
            if (e.hp > 0) {
              const d = Math.hypot(e.gx - s.gx, e.gy - s.gy);
              if (d <= bestD) { bestD = d; hitTarget = e; }
            }
          }
        }
        if (hitTarget) {
          const hitDmg = s.crit ? Math.round(s.dmg * 1.55) : s.dmg;
          damageEnemy(hitTarget, hitDmg, false, { fxKind: s.fxKind, dirX, dirY, knock: s.knock || 0, crit: !!s.crit });
          if (s.burnDur > 0) { hitTarget.burnT = s.burnDur; hitTarget.burnTick = Math.min(hitTarget.burnTick, 0.34); }
          if (s.slowDur > 0) hitTarget.slowT = s.slowDur;
          if (hitTarget.hp <= 0) anyKill = true;
        }
        const splashR = Math.max(s.splash || 0, s.fxKind === "fire" && (s.blastScale || 1) > 1 ? 0.95 * s.blastScale : 0);
        if (splashR > 0) {
          for (const e of game.enemies) {
            if (e !== hitTarget && e.hp > 0 && Math.hypot(e.gx - s.gx, e.gy - s.gy) <= splashR) {
              damageEnemy(e, Math.round(s.dmg * 0.65), false, { fxKind: s.fxKind, dirX: e.gx - s.gx, dirY: e.gy - s.gy, knock: (s.knock || 0) * 0.7 });
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
      e.hitFlash = Math.max(0, e.hitFlash - dt * 5.8);
      e.hitSquash = Math.max(0, (e.hitSquash || 0) - dt * 4.4);
      e.hitTilt = (e.hitTilt || 0) * Math.exp(-11 * dt);
      e.hitPushX = (e.hitPushX || 0) * Math.exp(-9.5 * dt);
      e.hitPushY = (e.hitPushY || 0) * Math.exp(-9.5 * dt);
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

    for (let zi = game.activeZones.length - 1; zi >= 0; zi--) {
      const z = game.activeZones[zi];
      z.t += dt;
      if (z.kind === "fireRing") {
        z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = 0.36;
          for (const e of game.enemies) {
            if (e.hp > 0 && Math.hypot(e.gx - z.gx, e.gy - z.gy) <= z.r) {
              damageEnemy(e, z.dmg, false, { fxKind: "fire", dirX: e.gx - z.gx, dirY: e.gy - z.gy });
              e.burnT = 2.6;
            }
          }
        }
      } else if (z.kind === "tidalWave") {
        const p = z.t / z.dur;
        const wx = lerp(z.gx, Math.min(COLS, z.gx + 6.5), p);
        z.curX = wx;
        for (const e of game.enemies) {
          if (e.hp > 0 && !z.hitSet.has(e) && Math.abs(e.gx - wx) <= 1.15 && Math.abs(e.gy - z.gy) <= z.r) {
            z.hitSet.add(e);
            e.slowT = 2.0;
            damageEnemy(e, z.dmg, false, { fxKind: "water", dirX: 1, dirY: 0, knock: 0.65 });
          }
        }
      }
      if (z.t >= z.dur) game.activeZones.splice(zi, 1);
    }

    for (let i = game.dying.length - 1; i >= 0; i--) {
      const d = game.dying[i];
      d.t += dt;
      const p = d.t / d.dur;
      if (d.deathKind === "water") {
        // Bubble lifts slime upward slowly then pops at end!
        d.gz = p * 1.15;
      }
      if (!d.shattered && p >= 0.72) {
        d.shattered = true;
        if (d.deathKind === "lightning" || d.deathKind === "fire") {
          addFx({ k: "shockRing", fxKind: d.deathKind, gx: d.gx, gy: d.gy, gz: 0.05, r: 1.35, col: d.deathKind === "lightning" ? "#5cff7a" : "#ff5a1f", innerCol: "#fff88a", life: 0.36, max: 0.36, seed: d.dSeed });
          for (let a = 0; a < 22; a++) {
            const ang = (a / 14) * TAU + Math.random() * 0.4;
            addFx({
              k: "ashFlake", gx: d.gx + (Math.random() - 0.5) * 0.3, gy: d.gy + (Math.random() - 0.5) * 0.2,
              gz: 0.25 + Math.random() * 0.4,
              vx: Math.cos(ang) * (0.4 + Math.random() * 0.9), vy: Math.sin(ang) * 0.4,
              vz: 0.8 + Math.random() * 1.2, rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 8,
              col: a % 3 === 0 ? "#5a4d46" : "#282220", life: 0.55 + Math.random() * 0.25, max: 0.8, seed: a * 11
            });
          }
        } else if (d.deathKind === "frost") {
          addFx({ k: "frostRing", gx: d.gx, gy: d.gy, gz: 0.05, r: 1.35, life: 0.38, max: 0.38, seed: d.dSeed });
          for (let s = 0; s < 22; s++) {
            const ang = (s / 14) * TAU + Math.random() * 0.35;
            const spd = 1.8 + Math.random() * 1.8;
            addFx({
              k: "cardChip", fxKind: "frost", gx: d.gx, gy: d.gy, gz: 0.4,
              vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd * 0.7, vz: 2.0 + Math.random() * 1.8,
              rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 14,
              col: s % 2 ? "#94e8ff" : "#effaff", life: 0.45, max: 0.45, seed: s * 13
            });
          }
        } else if (d.deathKind === "water") {
          addFx({ k: "shockRing", fxKind: "water", gx: d.gx, gy: d.gy, gz: d.gz, r: 0.85, col: "#4eb8ff", innerCol: "#e4f8ff", life: 0.32, max: 0.32, seed: d.dSeed });
          for (let w = 0; w < 18; w++) {
            const ang = (w / 10) * TAU;
            addFx({
              k: "cardChip", fxKind: "water", gx: d.gx, gy: d.gy, gz: d.gz,
              vx: Math.cos(ang) * 1.6, vy: Math.sin(ang) * 1.1, vz: 1.1 + Math.random(),
              rot: 0, vrot: 0, col: w % 2 ? "#54c6ff" : "#e4f8ff", life: 0.36, max: 0.36, seed: w * 7
            });
          }
        } else if (d.deathKind === "rock") {
          addFx({ k: "shockRing", fxKind: "rock", gx: d.gx, gy: d.gy, gz: 0.05, r: 1.35, col: "#7a583c", innerCol: "#e4c296", life: 0.36, max: 0.36, seed: d.dSeed });
          for (let r = 0; r < 18; r++) {
            const ang = (r / 10) * TAU;
            addFx({
              k: "cardChip", fxKind: "rock", gx: d.gx, gy: d.gy, gz: 0.25,
              vx: Math.cos(ang) * 1.5, vy: Math.sin(ang) * 1.0, vz: 1.5 + Math.random() * 1.4,
              rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 10,
              col: r % 2 ? "#8c7464" : "#c8b29c", life: 0.42, max: 0.42, seed: r * 19
            });
          }
        }
      }
      if (d.t >= d.dur) game.dying.splice(i, 1);
    }

    for (let i = game.fx.length - 1; i >= 0; i--) {
      const f = game.fx[i];
      f.life -= dt;
      if (f.k === "cardChip" || f.k === "stepScrap" || f.k === "confetti" || f.k === "ashFlake") {
        f.gx += f.vx * dt; f.gy += f.vy * dt;
        f.gz += f.vz * dt;
        if (f.gz <= 0) { f.gz = 0; f.vz = Math.abs(f.vz) * 0.38; f.vx *= 0.65; f.vy *= 0.65; }
        f.vz -= (f.k === "cardChip" ? 9.5 : 5.2) * dt;
        if (f.k === "cardChip" || f.k === "confetti" || f.k === "ashFlake") f.rot += f.vrot * dt;
      } else if (f.k === "pop") {
        f.gx += (f.vx || 0) * dt;
        f.gy += (f.vy || 0) * dt;
        f.gz += (f.vz ?? 0.9) * dt;
        f.vz = (f.vz ?? 0.9) - 5.2 * dt;
        if (f.gz < 0.75 && f.vz < 0) { f.gz = 0.75; f.vz = Math.abs(f.vz) * 0.48; }
      }
      if (f.life <= 0) game.fx.splice(i, 1);
    }
    for (let i = game.scorch.length - 1; i >= 0; i--) {
      game.scorch[i].life -= dt;
      if (game.scorch[i].life <= 0) game.scorch.splice(i, 1);
    }
  }

  function damageEnemy(e, dmg, isBurn, hitOpt = {}) {
    e.hp -= dmg;
    const fk = hitOpt.fxKind || "fire";
    const isCrit = !!hitOpt.crit || (e.hp <= 0 && !isBurn);
    e.lastDeathKind = fk;
    e.hitFlash = isBurn ? 0.45 : 1.0;
    // Crisp white flash on every direct hit so hit-stop impact frames read instantly!
    e.hitFlashCol = isBurn ? "#ff984a" : "#ffffff";
    if (!isBurn) {
      e.hitSquash = isCrit ? 1.32 : 1.12;
      const dLen = Math.hypot(hitOpt.dirX || 0, hitOpt.dirY || 0);
      const ux = dLen > 1e-4 ? hitOpt.dirX / dLen : (Math.random() > 0.5 ? 1 : -1);
      const uy = dLen > 1e-4 ? hitOpt.dirY / dLen : 0;
      e.hitPushX = ux * (isCrit ? 0.48 : 0.36);
      e.hitPushY = uy * (isCrit ? 0.40 : 0.30);
      e.hitTilt = (ux >= 0 ? 1 : -1) * (isCrit ? 0.46 : 0.36);
      const kb = (hitOpt.knock || 0) + (isCrit ? 0.22 : 0.15);
      e.dist = Math.max(0, e.dist - (e.boss ? kb * 0.45 : kb));
    }
    spawnDmgPop(
      e.gx + (isBurn ? -0.36 : 0.34), e.gy - 0.15,
      e.gz + (isBurn ? 1.66 : 1.36),
      (isBurn ? "🔥-" : (isCrit ? "💥-" : "-")) + dmg + (isCrit ? "!" : ""),
      isBurn ? "#ff6828" : (isCrit ? "#ff5228" : "#ffe652"),
      isCrit
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
    c.fillStyle = `rgba(16, 54, 48, ${0.34 * lift})`;
    c.beginPath();
    c.ellipse(0, 0, rx * (1.12 + gz * 0.18), ry * (1.08 + gz * 0.14), 0, 0, TAU);
    c.fill();
    c.restore();
    c.save();
    c.fillStyle = `rgba(12, 42, 38, ${0.28 * lift})`;
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

  function drawLayeredStandee(c, key, sx, sy, hPx, facing = 1, squash = 0, flash = 0, tilt = 0, swaySeed = 0, flashCol = "#ffffff") {
    const arr = LAYERS[key];
    if (!arr) return;
    const drawSz = hPx * (260 / 210);
    const sxScale = 1 + squash * 0.24;
    const syScale = 1 / (1 + squash * 0.20);
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
      const dX = -drawSz * 0.5, dY = -drawSz + (24 / 260) * drawSz;
      c.drawImage(L.cv, dX, dY, drawSz, drawSz);
      if (flash > 0.08) {
        c.save();
        c.globalAlpha = Math.min(0.88, flash * 0.88);
        c.drawImage(getStandeeFlashCv(L.cv, flashCol), dX, dY, drawSz, drawSz);
        c.restore();
      }
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
    const shkX = shakeT > 0 ? (Math.random() - 0.5) * 2 * shakeMag * (shakeT / 0.06) : 0;
    const shkY = shakeT > 0 ? (Math.random() - 0.5) * 2 * shakeMag * (shakeT / 0.06) : 0;
    ctx.setTransform(1, 0, 0, 1, shkX * DPR, shkY * DPR);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, shkX * DPR, shkY * DPR);

    // Path chevrons
    ctx.save();
    ctx.strokeStyle = "rgba(255, 240, 210, 0.48)";
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
      const sz = cam.unit * 0.24 * pp;
      ctx.save();
      ctx.globalAlpha = a * 0.62;
      ctx.fillStyle = sc.frost ? "rgba(130, 215, 255, 0.45)" : "rgba(52, 34, 18, 0.36)";
      ctx.beginPath(); ctx.ellipse(sx, sy, sz, sz * 0.48, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = sc.frost ? "#4ba8eb" : "#3d2412";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx - sz * 0.7, sy - sz * 0.34); ctx.lineTo(sx + sz * 0.7, sy + sz * 0.34);
      ctx.moveTo(sx + sz * 0.7, sy - sz * 0.34); ctx.lineTo(sx - sz * 0.7, sy + sz * 0.34);
      ctx.stroke();
      ctx.restore();
    }

    const drawList = [];

    // Front-left, front-right & right-flank stepped cardboard hill mounds sorted cleanly by own centroid depth!
    const ox = cam.portrait ? 0.32 : 0.60;
    const edgeMounds = [
      { cx: 1.1, cy: 7.18, layers: 2, seed: 84, ctrl: [[0.05, 6.92], [2.15, 6.94], [2.32, 7.42], [1.25, 7.62], [-0.08, 7.40]] },
      { cx: 8.9, cy: 7.18, layers: 2, seed: 88, ctrl: [[7.35, 6.94], [10.45, 6.94], [10.65, 7.42], [9.05, 7.62], [7.25, 7.38]] },
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

    // Spawn Burrow (thick oil-pastel terracotta-brown mound, NO black outline!)
    const [btx, bty] = PATH[0];
    drawList.push({
      depth: depthOf(btx + 0.5, bty + 0.45),
      draw: () => {
        const [bx, by, pp] = proj(btx + 0.5, bty + 0.5, 0);
        const rx = cam.unit * (cam.portrait ? 0.56 : 0.44) * pp, ry = cam.unit * (cam.portrait ? 0.28 : 0.22) * pp;
        fillOilPastel(ctx, makeEllipsePts(bx, by, rx, ry, 20, 310, 0.06), "#925230", 310, {
          cols: ["#69371e", "#925230", "#b86b3e"], dabSize: 10, toothAlpha: 0.38
        });
        fillOilPastel(ctx, makeEllipsePts(bx, by + 2, rx * 0.65, ry * 0.6, 16, 312, 0.05), "#263440", 312, {
          cols: ["#1c2630", "#2c3d4a"], dabSize: 8, toothAlpha: 0.22
        });
      }
    });

    // Nest Standee (oil-pastel golden-ochre straw nest, NO black outline; Gen-1 egg standee unchanged!)
    const [htx, hty] = PATH[PATH.length - 1];
    drawList.push({
      depth: depthOf(htx + 0.5, hty + 0.58),
      draw: () => {
        const [hx, hy, pp] = proj(htx + 0.5, hty + 0.5, 0);
        const nw = cam.unit * (cam.portrait ? 0.68 : 0.55) * pp, nh = cam.unit * (cam.portrait ? 0.30 : 0.24) * pp;
        drawCardboardBaseAndShadow(ctx, hx, hy, nw * 1.9, 0, 410, false, false);
        fillOilPastel(ctx, makeEllipsePts(hx, hy, nw, nh, 22, 410, 0.06), "#e4ac46", 410, {
          cols: ["#b87a24", "#e4ac46", "#f5cf6e"], dabSize: 10, toothAlpha: 0.38
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
          const hgx = hero.gx + (hero.lungeX || 0) - (hero.windup || 0) * 0.08 * hero.facing;
          const hgy = hero.gy + (hero.lungeY || 0);
          const hgz = hero.gz + (hero.lungeZ || 0);
          const [gx0, gy0, pp0] = proj(hgx, hgy, 0);
          const [sx, sy, pp] = proj(hgx, hgy, hgz);
          const hPx = cam.unit * (cam.portrait ? 1.84 : 1.28) * pp;
          drawCardboardBaseAndShadow(ctx, gx0, gy0, hPx * 0.94 * pp0 / pp, hgz, 735, true, true);
          const idleBreathe = Math.sin(simTime * 5) * 0.04;
          const sq = hero.recoil * 0.65 - (hero.windup || 0) * 0.38 + (hgz > 0.05 ? -0.10 : idleBreathe);
          const atkLean = hero.recoil * 0.16 * hero.facing - (hero.windup || 0) * 0.14 * hero.facing;
          drawLayeredStandee(ctx, hero.def.img, sx, sy, hPx, hero.facing, sq, 0, hero.waddle + atkLean, 0);
        }
      });
    }

    // Planted Chili Towers
    for (const tw of game.towers) {
      drawList.push({
        depth: depthOf(tw.gx, tw.gy),
        draw: () => {
          const tgx = tw.gx + (tw.lungeX || 0) - (tw.windup || 0) * 0.06 * tw.facing;
          const tgy = tw.gy + (tw.lungeY || 0);
          const [gx0, gy0, pp0] = proj(tgx, tgy, 0);
          const [sx, sy, pp] = proj(tgx, tgy, tw.gz);
          const hPx = cam.unit * (cam.portrait ? 1.68 : 1.16) * pp;
          drawCardboardBaseAndShadow(ctx, gx0, gy0, hPx * 0.90 * pp0 / pp, tw.gz, 740, true, false);
          const breathe = Math.sin(simTime * 4.8 + tw.phase) * 0.05;
          const sq = tw.recoil * 0.56 - (tw.windup || 0) * 0.30 + breathe;
          const tLean = tw.recoil * 0.14 * tw.facing - (tw.windup || 0) * 0.12 * tw.facing;
          drawLayeredStandee(ctx, "chili", sx, sy, hPx, tw.facing, sq, 0, tLean, 0);
        }
      });
    }

    // Slime Standees
    for (const e of game.enemies) {
      drawList.push({
        depth: depthOf(e.gx, e.gy),
        draw: () => {
          const egx = e.gx + (e.hitPushX || 0), egy = e.gy + (e.hitPushY || 0);
          const [gx0, gy0, pp0] = proj(egx, egy, 0);
          const [sx, sy, pp] = proj(egx, egy, e.gz);
          const hPx = cam.unit * (cam.portrait ? 1.66 : 1.14) * e.size * pp;
          drawCardboardBaseAndShadow(ctx, gx0, gy0, hPx * 0.85 * pp0 / pp, e.gz, 760, true, false);

          if (e.burnT > 0) drawCardboardFlame(ctx, sx - hPx * 0.32, sy - hPx * 0.44, hPx * 0.36, e.burnSeed + 1, boil);
          const hopSq = (e.gz < 0.04 ? 0.16 : -0.11) + (e.landSq || 0) + (e.hitSquash || 0) * 0.92;
          const slimeTilt = Math.sin(e.hopPhase * 0.5) * 0.075 + (e.hitTilt || 0);
          ctx.save();
          if (e.slowT > 0) ctx.filter = "sepia(0.35) hue-rotate(165deg) saturate(1.9) brightness(1.06)";
          drawLayeredStandee(ctx, e.img, sx, sy, hPx, e.facing, hopSq, e.hitFlash, slimeTilt, 0, e.hitFlashCol || "#ffffff");
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

    for (const z of game.activeZones) {
      drawList.push({
        depth: depthOf(z.kind === "tidalWave" ? (z.curX || z.gx) : z.gx, z.gy) + 0.15,
        draw: () => {
          const p = clamp(z.t / z.dur, 0, 1);
          const fade = p < 0.8 ? 1 : clamp((1 - p) / 0.2, 0, 1);
          ctx.save();
          ctx.globalAlpha = fade;
          if (z.kind === "fireRing") {
            const [sx, sy, pp] = proj(z.gx, z.gy, 0.02);
            const rr = cam.unit * z.r * pp;
            ctx.strokeStyle = "rgba(255, 76, 24, 0.78)";
            ctx.lineWidth = Math.max(4, 7 * pp);
            ctx.beginPath(); ctx.ellipse(sx, sy, rr, rr * 0.48, 0, 0, TAU); ctx.stroke();
            ctx.fillStyle = "rgba(255, 162, 42, 0.24)"; ctx.fill();
            for (let fi = 0; fi < 10; fi++) {
              const a = (fi / 10) * TAU + simTime * 2.2;
              const fx = z.gx + Math.cos(a) * z.r, fy = z.gy + Math.sin(a) * z.r * 0.85;
              const [px, py, fpp] = proj(fx, fy, 0.04);
              drawCardboardFlame(ctx, px, py, cam.unit * 0.42 * fpp, z.seed + fi, boil);
            }
          } else if (z.kind === "tidalWave") {
            const wx = z.curX || z.gx;
            const [sx, sy, pp] = proj(wx, z.gy, 0.1);
            const wh = cam.unit * 1.45 * pp, ww = cam.unit * 0.78 * pp;
            const wavePts = sampleSmoothLoop([
              [sx - ww, sy + 6], [sx - ww * 0.6, sy - wh * 0.75],
              [sx + ww * 0.45, sy - wh], [sx + ww * 1.1, sy - wh * 0.55],
              [sx + ww * 0.65, sy - wh * 0.25], [sx + ww * 0.9, sy + 6]
            ], 3);
            drawCardboardCutoutChip(ctx, wavePts, "#34acff", z.seed, { thickX: 6, thickY: 4.5, lw: 2.5 });
            fillWaxCrayon(ctx, makeEllipsePts(sx + ww * 0.4, sy - wh * 0.72, ww * 0.55, wh * 0.18, 10, z.seed + 3), "#e8f9ff", z.seed + 3, { lw: 1.4 });
          }
          ctx.restore();
        }
      });
    }

    // Element-Specific Dying Slimes (Lightning electrocute->ash, Fire burn->char->ash, Ice sculpture->shatter, Water bubble float->pop, Rock boulder bury!)
    for (const d of game.dying) {
      drawList.push({
        depth: depthOf(d.gx, d.gy) + 0.05,
        draw: () => {
          const p = clamp(d.t / d.dur, 0, 1);
          const [gx0, gy0, pp0] = proj(d.gx, d.gy, 0);
          const [sx, sy, pp] = proj(d.gx, d.gy, d.gz);
          const hPx = cam.unit * (cam.portrait ? 1.66 : 1.14) * d.size * pp;
          drawCardboardBaseAndShadow(ctx, gx0, gy0, hPx * 0.85 * pp0 / pp, d.gz, 760, false, false);

          if (d.deathKind === "lightning") {
            // Electrocuted: jitter + green electric flash + crackling paper-cut electric arcs wrapping around it, then crumbles!
            const jx = (Math.sin(d.t * 85) * 6.5) * (1 - p);
            const fade = p < 0.72 ? 1 : clamp((1 - p) / 0.28, 0, 1);
            ctx.save();
            ctx.globalAlpha = fade;
            const gFlash = (Math.floor(d.t * 24) % 2 === 0) ? 0.92 : 0.45;
            drawLayeredStandee(ctx, d.img, sx + jx, sy, hPx * (1 - p * 0.25), d.facing, 0.15, gFlash, Math.sin(d.t * 50) * 0.12, 0, "#52ff7a");
            // Paper-cut electric arcs wrapping around the slime
            if (p < 0.80) {
              for (let ai = 0; ai < 3; ai++) {
                const ay = sy - hPx * (0.25 + ai * 0.26);
                const aw = hPx * 0.48;
                const arcPts = [
                  [sx - aw, ay + (ai % 2 ? -6 : 6)],
                  [sx - aw * 0.35, ay - 9],
                  [sx + aw * 0.15, ay + 10],
                  [sx + aw, ay - 5]
                ];
                ctx.lineCap = "round"; ctx.lineJoin = "round";
                tracePoly(ctx, arcPts, false);
                ctx.strokeStyle = "#2b1b0e"; ctx.lineWidth = 6.5 * pp; ctx.stroke();
                ctx.strokeStyle = "#5cff7a"; ctx.lineWidth = 4.2 * pp; ctx.stroke();
                ctx.strokeStyle = "#fff87a"; ctx.lineWidth = 2.0 * pp; ctx.stroke();
              }
            }
            ctx.restore();
          } else if (d.deathKind === "fire") {
            // Burns slowly with crayon flames, chars dark, then disintegrates!
            const fade = p < 0.70 ? 1 : clamp((1 - p) / 0.30, 0, 1);
            ctx.save();
            ctx.globalAlpha = fade;
            const charAmt = Math.min(0.92, p * 1.35);
            drawLayeredStandee(ctx, d.img, sx, sy, hPx * (1 - p * 0.30), d.facing, p * 0.35, charAmt, (p - 0.5) * 0.15, 0, "#24150e");
            if (p < 0.82) {
              drawCardboardFlame(ctx, sx - hPx * 0.24, sy - hPx * 0.30, hPx * 0.52, d.dSeed + 1, boil);
              drawCardboardFlame(ctx, sx + hPx * 0.22, sy - hPx * 0.22, hPx * 0.48, d.dSeed + 3, boil);
              drawCardboardFlame(ctx, sx, sy - hPx * 0.55, hPx * 0.44, d.dSeed + 7, boil);
            }
            ctx.restore();
          } else if (d.deathKind === "frost") {
            // Freezes into crayon/paper ice sculpture, holds for a beat, then shatters!
            if (p < 0.74) {
              ctx.save();
              ctx.filter = "saturate(0.35) hue-rotate(155deg) brightness(1.22)";
              drawLayeredStandee(ctx, d.img, sx, sy, hPx, d.facing, 0, 0.55, 0, 0, "#9be8ff");
              ctx.restore();
              // Paper-cut faceted ice crystal block encasing the slime!
              const iw = hPx * 0.52, ih = hPx * 1.08;
              const icePts = [
                [sx - iw, sy + 4], [sx - iw * 1.08, sy - ih * 0.55],
                [sx - iw * 0.45, sy - ih * 1.06], [sx + iw * 0.38, sy - ih * 1.02],
                [sx + iw * 1.05, sy - ih * 0.52], [sx + iw * 0.95, sy + 4]
              ];
              ctx.save();
              ctx.globalAlpha = 0.62;
              drawCardboardCutoutChip(ctx, icePts, "#9ce8ff", d.dSeed, { thickX: 4, thickY: 3, lw: 2.2 });
              ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.4;
              ctx.beginPath(); ctx.moveTo(sx - iw * 0.5, sy - ih * 0.8); ctx.lineTo(sx - iw * 0.1, sy - ih * 0.35); ctx.stroke();
              ctx.restore();
            }
          } else if (d.deathKind === "water") {
            // Trapped inside a shimmering crayon water bubble that slowly floats up and pops!
            if (p < 0.76) {
              const wob = Math.sin(d.t * 14) * 0.08;
              drawLayeredStandee(ctx, d.img, sx, sy, hPx * 0.78, d.facing, wob, 0.2, Math.sin(d.t * 8) * 0.14, 0, "#9ee4ff");
              const br = hPx * (0.64 + Math.sin(d.t * 12) * 0.03);
              ctx.save();
              ctx.fillStyle = "rgba(104, 206, 255, 0.36)";
              ctx.strokeStyle = "#2676c8";
              ctx.lineWidth = 3.0;
              ctx.beginPath(); ctx.ellipse(sx, sy - hPx * 0.40, br, br * 0.94, 0, 0, TAU); ctx.fill(); ctx.stroke();
              ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
              ctx.lineWidth = 3.2;
              ctx.lineCap = "round";
              ctx.beginPath(); ctx.arc(sx, sy - hPx * 0.40, br * 0.74, -2.5, -1.65); ctx.stroke();
              ctx.restore();
            }
          } else if (d.deathKind === "rock") {
            // Buried under falling cardboard boulders!
            if (p < 0.88) {
              const squashAmt = clamp(p * 2.2, 0, 1);
              drawLayeredStandee(ctx, d.img, sx, sy, hPx * (1 - squashAmt * 0.42), d.facing, squashAmt * 1.4, 0.25, 0, 0, "#c8b29c");
              const rockSpecs = [
                { ox: -0.26, oy: 0.12, r: 0.30, col: "#8c7464", delay: 0.0 },
                { ox: 0.26,  oy: 0.16, r: 0.32, col: "#7a6354", delay: 0.08 },
                { ox: 0.02,  oy: -0.18, r: 0.38, col: "#a48c7a", delay: 0.16 },
                { ox: -0.12, oy: 0.22, r: 0.26, col: "#b49e8a", delay: 0.22 }
              ];
              for (let ri = 0; ri < rockSpecs.length; ri++) {
                const rs = rockSpecs[ri];
                const fall = clamp((p - rs.delay) / 0.28, 0, 1);
                if (fall <= 0) continue;
                const dropY = lerp(sy - hPx * 1.8, sy - hPx * (0.28 - rs.oy), fall * fall);
                const rx = sx + rs.ox * hPx;
                const rr = hPx * rs.r;
                const rPts = [
                  [rx - rr, dropY + rr * 0.3], [rx - rr * 0.7, dropY - rr * 0.65],
                  [rx + rr * 0.2, dropY - rr * 0.8], [rx + rr * 0.95, dropY - rr * 0.2],
                  [rx + rr * 0.7, dropY + rr * 0.55], [rx - rr * 0.3, dropY + rr * 0.6]
                ];
                drawCardboardCutoutChip(ctx, rPts, rs.col, d.dSeed + ri, { thickX: 4.5, thickY: 3.5, lw: 2.0 });
              }
            }
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
            const sz = Math.max(6, cam.unit * 0.15 * tpp * (0.42 + (ti / Math.max(1, s.trail.length)) * 0.72));
            if (s.fxKind === "frost") {
              drawCardboardCutoutChip(ctx, [
                [tx, ty - sz], [tx + sz * 0.65, ty], [tx, ty + sz], [tx - sz * 0.65, ty]
              ], ti % 2 ? "#7cd8ff" : "#e8f9ff", s.seed + ti, { thickX: 2.2, thickY: 1.8, lw: 1.4 });
            } else if (s.fxKind === "water") {
              drawCardboardCutoutChip(ctx, makeEllipsePts(tx, ty, sz * 0.75, sz * 0.62, 10, s.seed + ti), ti % 2 ? "#42b4ff" : "#e4f8ff", s.seed + ti, { thickX: 2.0, thickY: 1.6, lw: 1.4 });
            } else if (s.fxKind === "rock") {
              drawCardboardCutoutChip(ctx, [
                [tx - sz * 0.7, ty], [tx, ty - sz * 0.7], [tx + sz * 0.7, ty + sz * 0.1], [tx - sz * 0.2, ty + sz * 0.65]
              ], "#9e8674", s.seed + ti, { thickX: 2.2, thickY: 1.8, lw: 1.5 });
            } else {
              drawCardboardFlame(ctx, tx, ty + sz * 0.2, sz * 1.4, s.seed + ti, boil, ti % 2 ? "#ff4e1e" : "#ffa828", "#fff080");
            }
          }

          const [sx, sy, pp] = proj(s.gx, s.gy, s.gz);
          const [nx, ny] = proj(s.tx, s.ty, s.tz);
          const ang = Math.atan2(ny - sy, nx - sx);
          const pr = Math.max(15, cam.unit * (cam.portrait ? 0.45 : 0.39) * pp);
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
          } else if (s.fxKind === "water") {
            // Coco Otter: Splashing water wave droplet cutout!
            ctx.rotate(ang);
            drawCardboardCutoutChip(ctx, [
              [pr * 1.05, 0], [pr * 0.35, -pr * 0.68], [-pr * 0.75, -pr * 0.45],
              [-pr * 1.20, 0], [-pr * 0.75, pr * 0.45], [pr * 0.35, pr * 0.68]
            ], "#2ea4ff", s.seed, { thickX: 4.5, thickY: 3.5, lw: 2.1 });
            fillWaxCrayon(ctx, makeEllipsePts(pr * 0.18, -pr * 0.12, pr * 0.32, pr * 0.20, 10, s.seed + 2), "#e6f9ff", s.seed + 2, { lw: 0 });
          } else if (s.fxKind === "rock") {
            // Taro Bear: Heavy jagged cardboard boulder!
            ctx.rotate(simTime * 5 + s.seed);
            drawCardboardCutoutChip(ctx, [
              [-pr * 0.95, pr * 0.25], [-pr * 0.72, -pr * 0.75], [pr * 0.22, -pr * 0.92],
              [pr * 0.98, -pr * 0.20], [pr * 0.76, pr * 0.72], [-pr * 0.25, pr * 0.85]
            ], "#8f7664", s.seed, { thickX: 5.5, thickY: 4.0, lw: 2.3 });
            fillWaxCrayon(ctx, [[-pr * 0.4, -pr * 0.4], [pr * 0.3, -pr * 0.55], [pr * 0.1, 0]], "#c8b29c", s.seed + 3, { lw: 0 });
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
        depth: depthOf(f.gx, f.gy) + ((f.k === "pop" || f.k === "skyCloud" || f.k === "skyBolt") ? 0.92 : (f.k === "frostRing" || f.k === "shockRing" || f.k === "footprint" || f.k === "slimePrint") ? -0.25 : 0.48),
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
          } else if (f.k === "skyCloud") {
            // Puffy paper-cut dark storm cloud flashing at top of strike!
            const sc = cam.unit * (f.thin ? 0.65 : 0.92) * pp * (0.85 + Math.sin(prog * Math.PI) * 0.25);
            const cy = Math.max(cam.portrait ? 115 : 74, sy);
            const cPts = sampleSmoothLoop([
              [sx - sc * 1.1, cy + sc * 0.25], [sx - sc * 1.18, cy - sc * 0.16],
              [sx - sc * 0.58, cy - sc * 0.52], [sx + sc * 0.12, cy - sc * 0.58],
              [sx + sc * 0.78, cy - sc * 0.36], [sx + sc * 1.15, cy + sc * 0.08],
              [sx + sc * 0.95, cy + sc * 0.35], [sx, cy + sc * 0.38]
            ], 3);
            drawCardboardCutoutChip(ctx, cPts, prog < 0.35 ? "#6a88c8" : "#4e649c", f.seed, { thickX: 5, thickY: 4, lw: 2.2 });
            if (prog < 0.45) {
              fillWaxCrayon(ctx, makeEllipsePts(sx, cy + sc * 0.12, sc * 0.55, sc * 0.18, 10, f.seed + 2), "#fff78a", f.seed + 2, { lw: 0, softEdge: false });
            }
          } else if (f.k === "skyBolt") {
            // PAPER-CUT CARDBOARD LIGHTNING BOLT STRIKING DOWN FROM THE SKY onto target slime!
            const slam = Math.min(1, prog * 3.8);
            const [tx, ty] = proj(f.gx, f.gy, f.gz);
            const topY = Math.max(cam.portrait ? 92 : 52, ty - cam.unit * (f.thin ? 2.6 : 3.2) * pp);
            const curBotY = lerp(topY + 18, ty, slam);
            const wHalf = (f.thin ? 11 : 17) * pp;
            const jog = (f.thin ? 18 : 28) * pp;
            const dSign = (f.seed % 2 === 0) ? 1 : -1;
            const y1 = lerp(topY, curBotY, 0.36), y2 = lerp(topY, curBotY, 0.58), y3 = lerp(topY, curBotY, 0.76);
            const boltPoly = [
              [tx - wHalf * 0.75 * dSign, topY],
              [tx + wHalf * 0.85 * dSign, topY],
              [tx + jog * 0.45 * dSign, y1 - wHalf * 0.3],
              [tx + jog * 1.05 * dSign, y1 + wHalf * 0.25],
              [tx + jog * 0.20 * dSign, y2 - wHalf * 0.1],
              [tx + jog * 0.80 * dSign, y2 + wHalf * 0.35],
              [tx, curBotY + 4],
              [tx - jog * 0.25 * dSign, y2 + wHalf * 0.05],
              [tx + jog * 0.18 * dSign, y1 + wHalf * 0.18],
              [tx - jog * 0.55 * dSign, y1 - wHalf * 0.08]
            ];
            drawCardboardCutoutChip(ctx, boltPoly, "#ffe938", f.seed, {
              thickX: f.thin ? 4.5 : 6.5, thickY: f.thin ? 3.5 : 5.0, lw: 2.3
            });
            // Bright white-yellow crayon inner highlight spine
            ctx.save();
            ctx.strokeStyle = "#fffef4";
            ctx.lineWidth = (f.thin ? 2.2 : 3.4) * pp;
            ctx.lineCap = "round"; ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(tx, topY + 6);
            ctx.lineTo(tx + jog * 0.45 * dSign, y1);
            ctx.lineTo(tx + jog * 0.25 * dSign, y2);
            ctx.lineTo(tx, curBotY);
            ctx.stroke();
            ctx.restore();
          } else if (f.k === "impactSpark") {
            // Crisp contact spark rays + flash star right ON the struck slime body!
            const spR = cam.unit * 0.62 * (f.scale || 1) * (0.45 + prog * 0.85) * pp;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.strokeStyle = f.col || "#fff47a";
            ctx.lineWidth = Math.max(2.6, 4.4 * pp * (1 - prog * 0.5));
            ctx.lineCap = "round";
            for (let ri = 0; ri < 8; ri++) {
              const a = (ri / 8) * TAU + f.seed;
              const r0 = spR * 0.32, r1 = spR * (ri % 2 === 0 ? 1.15 : 0.80);
              ctx.beginPath();
              ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
              ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
              ctx.stroke();
            }
            ctx.fillStyle = "#fffef6";
            ctx.beginPath();
            ctx.arc(0, 0, spR * 0.28 * (1 - prog * 0.4), 0, TAU);
            ctx.fill();
            ctx.restore();
          } else if (f.k === "iceNovaSpike") {
            const sh = cam.unit * f.h * (prog < 0.25 ? prog / 0.25 : 1 - (prog - 0.25) * 0.45) * pp;
            const sw = cam.unit * 0.24 * pp;
            drawCardboardCutoutChip(ctx, [
              [sx - sw, sy + 2], [sx - sw * 0.25, sy - sh], [sx + sw * 0.35, sy - sh * 0.85], [sx + sw, sy + 2]
            ], "#86e4ff", f.seed, { thickX: 4, thickY: 3, lw: 2.0 });
          } else if (f.k === "boulderDrop") {
            const dropP = clamp((prog - (f.delay || 0)) / 0.45, 0, 1);
            if (dropP > 0) {
              const curZ = lerp(3.4, 0.25, dropP * dropP);
              const [bx, by, bpp] = proj(f.gx, f.gy, curZ);
              const br = cam.unit * 0.36 * bpp;
              drawCardboardCutoutChip(ctx, [
                [bx - br, by + br * 0.2], [bx - br * 0.7, by - br * 0.7], [bx + br * 0.3, by - br * 0.85],
                [bx + br, by - br * 0.1], [bx + br * 0.7, by + br * 0.6], [bx - br * 0.2, by + br * 0.65]
              ], "#8c7464", f.seed, { thickX: 5, thickY: 4, lw: 2.2 });
            }
          } else if (f.k === "rockSpike") {
            const sh = cam.unit * f.h * (prog < 0.25 ? prog / 0.25 : 1 - (prog - 0.25) * 0.4) * pp;
            const sw = cam.unit * 0.22 * pp;
            drawCardboardCutoutChip(ctx, [
              [sx - sw, sy + 2], [sx - sw * 0.3, sy - sh], [sx + sw * 0.45, sy - sh * 0.75], [sx + sw, sy + 2]
            ], "#9c8270", f.seed, { thickX: 4, thickY: 3, lw: 2.0 });
          } else if (f.k === "ashFlake") {
            const sz = Math.max(4.5, cam.unit * 0.08 * pp);
            ctx.save(); ctx.translate(sx, sy); ctx.rotate(f.rot);
            ctx.fillStyle = f.col || "#2a2320";
            ctx.fillRect(-sz, -sz * 0.45, sz * 2, sz * 0.9);
            ctx.restore();
          } else if (f.k === "confetti") {
            const cw = Math.max(5.5, cam.unit * 0.095 * pp);
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(f.rot);
            ctx.scale(1, Math.cos(prog * 12 + f.seed) * 0.65 + 0.35);
            ctx.fillStyle = f.col || "#ffe042";
            ctx.strokeStyle = "#3a2414";
            ctx.lineWidth = 1.3;
            ctx.fillRect(-cw, -cw * 0.55, cw * 2, cw * 1.1);
            ctx.strokeRect(-cw, -cw * 0.55, cw * 2, cw * 1.1);
            ctx.restore();
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
            const rOut = cam.unit * (cam.portrait ? 1.52 : 1.18) * (f.big ? 0.92 : 0.76) * (f.scale || 1) * popScale * pp;
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
            const popBounce = f.crit ? easeOutBack(Math.min(1, prog * 4.5)) : easeOutBack(Math.min(1, prog * 4.0));
            const fs = Math.round(Math.max(16, cam.unit * (f.crit ? 0.36 : 0.25) * popBounce * pp));
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
    if (game && game.levelPick) {
      if (ev.key === "1") { chooseLevelUpgrade(0); return; }
      if (ev.key === "2") { chooseLevelUpgrade(1); return; }
      if (ev.key === "3") { chooseLevelUpgrade(2); return; }
    }
    keys[ev.code] = true;
    if (ev.code === "KeyQ" || ev.code === "KeyE" || ev.code === "Space") {
      ev.preventDefault();
      triggerActiveSkill();
      return;
    }
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
  document.getElementById("btn-skill").addEventListener("click", () => triggerActiveSkill());
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
    setHeroPos(gx, gy) { if (game && game.hero) { game.hero.gx = gx; game.hero.gy = gy; game.hero.vx = 0; game.hero.vy = 0; game.hero.target = null; } },
    plantTower(tx, ty) { return game && game.started ? plantAt(tx, ty) : false; },
    grantXp(n = 3) { grantHeroXp(n); },
    getDyingCount() { return game ? game.dying.length : 0; },
    pickUpgrade(idx = 0) { chooseLevelUpgrade(idx); },
    triggerSkill() { return triggerActiveSkill(); },
    getScreenPos(gx, gy, gz = 0) { const [x, y] = proj(gx, gy, gz); return { x: +x.toFixed(2), y: +y.toFixed(2) }; },
    getHeroScreenPos() {
      if (!game || !game.hero) return null;
      const [x, y] = proj(game.hero.gx, game.hero.gy, 0);
      return { x: +x.toFixed(2), y: +y.toFixed(2), gx: +game.hero.gx.toFixed(3), gy: +game.hero.gy.toFixed(3), facing: game.hero.facing };
    },
    getState() {
      return game && {
        started: game.started,
        hero: game.hero && {
          key: game.hero.key, gx: +game.hero.gx.toFixed(2), gy: +game.hero.gy.toFixed(2),
          level: game.hero.level, xp: game.hero.xp, xpNext: game.hero.xpNext, multiShot: game.hero.multiShot
        },
        levelPick: !!game.levelPick, hasActiveSkill: !!(game.hero && game.hero.activeSkill), activeCd: game.hero ? +game.hero.activeCd.toFixed(2) : 0,
        wave: game.waveIdx + 1, lives: game.lives, gold: game.gold,
        towers: game.towers.length, over: game.over, won: game.won,
        enemies: game.enemies.length, shots: game.shots.length, fx: game.fx.length,
        impactFx: game.fx.filter(f => f.k === "hit" || f.k === "skyBolt" || f.k === "impactSpark" || f.k === "shockRing" || f.k === "frostRing").length,
        skyBolts: game.fx.filter(f => f.k === "skyBolt").length
      };
    }
  };

  renderHeroThumbs();
  whenReady(() => renderHeroThumbs());
  updateLayout();
  openHeroPicker();
  requestAnimationFrame(loop);
})();
