(() => {
  "use strict";

  const OL = "#2a1f36";
  const TAU = Math.PI * 2;
  const COLS = 7, ROWS = 5;
  const PET_COST = 50;

  const {
    hash, jit, sampleSmoothLoop, makeEllipsePts, tracePoly, fillWaxCrayon, buildCardboardStandees, whenReady
  } = window.PaperCraft;

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
      projCol: "#29a8f5", coreCol: "#fff464", burstCol: "#6ad8ff", words: ["ZAP!", "啪!", "闪!"],
      burnDur: 0, slowDur: 0, splash: 0
    },
    blueberry: {
      img: "blueberry", name: "蓝莓枭", moveSpd: 2.95, range: 2.45, atkRate: 0.62, dmg: 28,
      projCol: "#3c6ef0", coreCol: "#d8f4ff", burstCol: "#8fe6ff", words: ["SPLASH!", "冰!", "啪!"],
      burnDur: 0, slowDur: 2.2, splash: 1.15
    }
  };

  const SCENIC_PROPS = [
    { kind: "tree",  gx: 0.35, gy: -0.02, scale: 0.84, seed: 11 },
    { kind: "tree",  gx: 3.95, gy: -0.04, scale: 0.80, seed: 22 },
    { kind: "tree",  gx: 6.68, gy: -0.02, scale: 0.82, seed: 29 },
    { kind: "bush",  gx: 2.15, gy: -0.06, scale: 0.85, seed: 33 },
    { kind: "bush",  gx: 5.35, gy: -0.05, scale: 0.82, seed: 38 },
    { kind: "rock",  gx: -0.24, gy: 2.75, scale: 0.90, seed: 44 },
    { kind: "tree",  gx: 7.26, gy: 1.55,  scale: 0.90, seed: 55 },
    { kind: "bush",  gx: 2.35, gy: 5.25,  scale: 0.90, seed: 66 },
    { kind: "rock",  gx: 4.95, gy: 5.22,  scale: 0.84, seed: 69 },
    { kind: "sign",  gx: 0.28, gy: 0.82,  scale: 0.84, seed: 77 },
    { kind: "fence", gx: 0.85, gy: 5.10,  scale: 0.96, seed: 81 },
    { kind: "fence", gx: 3.65, gy: 5.10,  scale: 0.96, seed: 82 },
    { kind: "fence", gx: 6.15, gy: 5.10,  scale: 0.96, seed: 83 }
  ];

  const WAVES = [
    [{ kind: "z1", delay: 0.25 }, { kind: "z1", delay: 1.35 }, { kind: "z1", delay: 1.3 }, { kind: "z1", delay: 1.25 }],
    [{ kind: "z1", delay: 1.5 }, { kind: "z2", delay: 1.3 }, { kind: "z1", delay: 1.15 }, { kind: "z2", delay: 1.3 }, { kind: "z1", delay: 1.15 }, { kind: "z2", delay: 1.3 }],
    [{ kind: "z2", delay: 1.5 }, { kind: "z1", delay: 1.0 }, { kind: "z3", delay: 1.25 }, { kind: "z2", delay: 1.15 }, { kind: "z3", delay: 1.25 }, { kind: "z2", delay: 1.1 }, { kind: "z3", delay: 1.25 }],
    [{ kind: "z2", delay: 1.4 }, { kind: "z3", delay: 1.05 }, { kind: "z2", delay: 0.95 }, { kind: "z3", delay: 1.05 }, { kind: "z1", delay: 0.8 }, { kind: "z3", delay: 1.0 }, { kind: "z3", delay: 1.05 }, { kind: "z2", delay: 1.0 }],
    [{ kind: "z3", delay: 1.5 }, { kind: "z2", delay: 0.9 }, { kind: "z3", delay: 1.0 }, { kind: "z3", delay: 0.95 }, { kind: "z2", delay: 0.85 }, { kind: "z3", delay: 1.0 }, { kind: "z3", delay: 1.15, boss: true }]
  ];

  const ENEMY_DEF = {
    z1: { img: "z1", hp: 46, speed: 1.02, size: 1.0, tint: "#86de44", reward: 12 },
    z2: { img: "z2", hp: 88, speed: 0.92, size: 1.08, tint: "#62c0ff", reward: 16 },
    z3: { img: "z3", hp: 132, speed: 1.02, size: 1.14, tint: "#ff7236", reward: 22 }
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
    // One continuous soft waxy crayon meadow across the whole flat screen (NO parallel marker stripes!)
    fillWaxCrayon(c, [[0, 0], [W, 0], [W, H], [0, H]], "#d8ebb4", 12, {
      toothCol: "#faf5e4", coverage: 0.78, toothAlpha: 0.62, clumpAlpha: 0.16, lw: 0, softEdge: false
    });

    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        const isPath = PATH_SET.has(tx + "," + ty);
        const corners = tileCorners(tx, ty, 0, 0);
        if (isPath) {
          fillWaxCrayon(c, corners, "#ecd5a1", 300 + tx * 11 + ty, {
            toothCol: "#faf4e2", coverage: 0.86, toothAlpha: 0.58, clumpAlpha: 0.22,
            lw: 2.0, ol: "rgba(110, 74, 38, 0.58)"
          });
          // Soft crayon pebbles on path
          for (let k = 0; k < 2; k++) {
            const gx = tx + 0.24 + hash(tx * 7 + k, ty * 13) * 0.52;
            const gy = ty + 0.24 + hash(tx * 17, ty * 5 + k) * 0.52;
            const [px, py, pp] = proj(gx, gy, 0);
            const r = cam.unit * (0.055 + k * 0.015) * pp;
            fillWaxCrayon(c, makeEllipsePts(px, py, r, r * 0.65, 12, 400 + tx + k), k ? "#f5ebd4" : "#c79e65", 400 + tx + k, {
              lw: 1.4, ol: "rgba(92, 62, 34, 0.55)", softEdge: false
            });
          }
        } else {
          const even = (tx + ty) % 2 === 0;
          fillWaxCrayon(c, corners, even ? "#bfe386" : "#b0d972", 500 + tx * 13 + ty, {
            toothCol: "#f9f5e4", coverage: 0.82, toothAlpha: 0.60, clumpAlpha: 0.20,
            lw: 1.5, ol: "rgba(76, 118, 46, 0.36)"
          });
          const inner = tileCorners(tx, ty, 0.13, 0);
          c.save();
          c.strokeStyle = "rgba(255, 252, 240, 0.65)";
          c.lineWidth = 1.5;
          c.setLineDash([5, 5]);
          tracePoly(c, inner);
          c.stroke();
          c.restore();

          const rnd = hash(tx + 5, ty + 11);
          if (rnd > 0.52) {
            const [gx, gy, pp] = proj(tx + 0.22 + rnd * 0.15, ty + 0.80, 0);
            c.save();
            c.strokeStyle = "rgba(62, 120, 38, 0.72)";
            c.lineWidth = 2.0;
            c.lineCap = "round";
            c.beginPath();
            c.moveTo(gx, gy); c.lineTo(gx - 3 * pp, gy - 6 * pp);
            c.moveTo(gx + 2 * pp, gy); c.lineTo(gx + 4 * pp, gy - 7 * pp);
            c.stroke();
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

  /* ================= Game State ================= */
  let simTime = 0;
  let speedMul = 1;
  let hoverTile = null;
  let tapMode = "plant";
  let chosenHeroKey = "chili";
  let game = null;
  const keys = {};
  const joyVec = { x: 0, y: 0, active: false };

  function makeHero(heroKey) {
    const def = HERO_DEFS[heroKey] || HERO_DEFS.chili;
    return {
      key: heroKey, def, gx: 2.5, gy: 2.5, gz: 0,
      vx: 0, vy: 0, target: null, walkPhase: 0, dustTimer: 0,
      facing: 1, waddle: 0, atkCd: 0.15, recoil: 0
    };
  }

  function makeTower(tx, ty) {
    return {
      tx, ty, gx: tx + 0.5, gy: ty + 0.5, gz: 0,
      range: 2.25, atkCd: 0.12, atkRate: 0.62, dmg: 26,
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
  /* ================= Cardboard Cutout FX ================= */
  function addFx(obj) { game.fx.push(obj); }

  function spawnCastDoodle(gx, gy, gz, dx, dy, col) {
    addFx({ k: "cast", gx, gy, gz, dx, dy, col: col || "#ffe24a", life: 0.25, max: 0.25, seed: Math.floor(Math.random() * 9999) });
  }

  function spawnImpactDoodle(gx, gy, gz, isKill, burstCol, words) {
    const list = words || ["POW!", "BOOM!", "轰!"];
    const word = list[Math.floor(Math.random() * list.length)];
    addFx({
      k: "hit", gx, gy, gz, word, big: !!isKill, burstCol: burstCol || "#ffe24a",
      life: 0.46, max: 0.46, seed: Math.floor(Math.random() * 9999)
    });
    const count = isKill ? 7 : 4;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + Math.random() * 0.35;
      const spd = 1.15 + Math.random() * 0.95;
      addFx({
        k: "cardChip",
        gx: gx + Math.cos(a) * 0.22, gy: gy + Math.sin(a) * 0.22, gz: gz + 0.12,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, vz: 1.65 + Math.random() * 1.0,
        rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 9,
        life: 0.44 + Math.random() * 0.14, max: 0.58,
        col: i % 3 === 0 ? "#c48d56" : (i % 2 ? (burstCol || "#ffe24a") : "#ff5a26"),
        seed: Math.floor(Math.random() * 9999)
      });
    }
  }

  function spawnDeathPuff(gx, gy, tint, reward) {
    addFx({ k: "puff", gx, gy, gz: 0.36, tint: tint || "#86de44", life: 0.56, max: 0.56, seed: Math.floor(Math.random() * 9999) });
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
      target, tx: target.gx, ty: target.gy, tz: 0.40,
      t: 0, dur: clamp(dist * 0.13, 0.17, 0.32),
      dmg: opt.dmg, projCol: opt.projCol, coreCol: opt.coreCol, burstCol: opt.burstCol, words: opt.words,
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
            dmg: tw.dmg, projCol: "#ff5321", coreCol: "#ffe24a", burstCol: "#ffe24a",
            words: ["POW!", "BOOM!", "轰!"], burnDur: 2.4, slowDur: 0, splash: 0
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
        e.burnT -= dt; e.burnTick -= dt;
        if (e.burnTick <= 0) { e.burnTick = 0.44; damageEnemy(e, 8, true); }
      }
      if (e.hp <= 0) {
        game.gold += e.reward; syncHud();
        spawnDeathPuff(e.gx, e.gy, e.tint, e.reward);
        game.enemies.splice(i, 1); continue;
      }

      const prevGx = e.gx;
      const spdMul = e.slowT > 0 ? 0.52 : 1.0;
      e.dist += e.speed * spdMul * dt;
      e.hopPhase += dt * 9.5 * spdMul;
      const [nx, ny] = pathPos(e.dist);
      e.gx = nx; e.gy = ny;
      if (Math.abs(nx - prevGx) > 0.002) e.facing = nx >= prevGx ? 1 : -1;
      e.gz = Math.abs(Math.sin(e.hopPhase)) * 0.20;

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
      if (f.k === "cardChip") {
        f.gx += f.vx * dt; f.gy += f.vy * dt;
        f.gz = Math.max(0, f.gz + f.vz * dt);
        f.vz -= 4.2 * dt; f.rot += f.vrot * dt;
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

    // Cast shadow on the flat floor
    c.save();
    c.translate(sx + rx * (0.30 + gz * 0.35), sy + ry * (0.38 + gz * 0.25));
    c.rotate(0.14);
    c.fillStyle = `rgba(48, 32, 18, ${0.24 * lift})`;
    c.beginPath();
    c.ellipse(0, 0, rx * (1 + gz * 0.15), ry * (1 + gz * 0.12), 0, 0, TAU);
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
      const lipH = Math.max(5.5, wPx * 0.068);
      // Top kraft-brown flat base tab
      c.save();
      c.beginPath();
      c.moveTo(sx - tw, sy - th * 0.4);
      c.lineTo(sx + tw, sy - th * 0.4);
      c.lineTo(sx + tw * 1.12, sy + th * 0.6);
      c.lineTo(sx - tw * 1.12, sy + th * 0.6);
      c.closePath();
      c.fillStyle = "#c48d56";
      c.fill();
      c.strokeStyle = "#4d2f16";
      c.lineWidth = 1.8;
      c.stroke();

      // Thick front corrugated cross-section edge (一格一格 brown wavy flutes!)
      c.beginPath();
      c.moveTo(sx - tw * 1.12, sy + th * 0.6);
      c.lineTo(sx + tw * 1.12, sy + th * 0.6);
      c.lineTo(sx + tw * 1.12, sy + th * 0.6 + lipH);
      c.lineTo(sx - tw * 1.12, sy + th * 0.6 + lipH);
      c.closePath();
      c.fillStyle = "#7d4f27";
      c.fill();
      c.save();
      c.clip();
      // Alternating dark flute pockets + tan arch ribs
      const yMid = sy + th * 0.6 + lipH * 0.5;
      for (let fx = sx - tw * 1.1; fx <= sx + tw * 1.1; fx += 6.5) {
        c.fillStyle = "#3a200c";
        c.beginPath();
        c.ellipse(fx, yMid, 2.2, lipH * 0.36, 0, 0, TAU);
        c.fill();
        c.fillStyle = "#c9925a";
        c.beginPath();
        c.ellipse(fx + 3.2, yMid - 0.5, 1.4, lipH * 0.25, 0, 0, TAU);
        c.fill();
      }
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

    for (const prop of SCENIC_PROPS) {
      drawList.push({
        depth: prop.gy,
        draw: () => {
          const [sx, sy, pp] = proj(prop.gx, prop.gy, 0);
          const hPx = cam.unit * (prop.kind === "tree" ? 1.25 : prop.kind === "fence" ? 0.85 : 0.92) * prop.scale * pp;
          drawCardboardBaseAndShadow(ctx, sx, sy, hPx * 0.78, 0, prop.seed, true, false);
          drawLayeredStandee(ctx, prop.kind, sx, sy, hPx, 1, 0, 0, 0, prop.kind === "tree" ? prop.seed : 0);
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
        fillWaxCrayon(ctx, makeEllipsePts(bx, by, rx, ry, 20, 310), "#7e5536", 310, { lw: 2.4 });
        fillWaxCrayon(ctx, makeEllipsePts(bx, by + 2, rx * 0.65, ry * 0.6, 16, 312), "#241624", 312, { lw: 1.8 });
      }
    });

    // Nest Standee
    const [htx, hty] = PATH[PATH.length - 1];
    drawList.push({
      depth: hty + 0.58,
      draw: () => {
        const [hx, hy, pp] = proj(htx + 0.5, hty + 0.5, 0);
        const nw = cam.unit * 0.44 * pp, nh = cam.unit * 0.19 * pp;
        drawCardboardBaseAndShadow(ctx, hx, hy, nw * 1.9, 0, 410, false, false);
        fillWaxCrayon(ctx, makeEllipsePts(hx, hy, nw, nh, 22, 410), "#e4b656", 410, { lw: 2.6 });
        const bob = Math.sin(simTime * 3.5) * 2.5 * pp;
        const hPx = cam.unit * (cam.portrait ? 1.05 : 0.90) * pp;
        drawLayeredStandee(ctx, "egg", hx, hy + bob, hPx, 1, Math.sin(simTime * 3.5) * 0.05, 0, 0, 0);

        const fx = hx + nw * 0.85, fy = hy - cam.unit * 0.02 * pp;
        drawCardboardCutoutChip(ctx, [
          [fx, fy - cam.unit * 0.56 * pp],
          [fx + cam.unit * 0.40 * pp, fy - cam.unit * 0.45 * pp],
          [fx, fy - cam.unit * 0.30 * pp]
        ], "#ff5c7a", 416, { thickX: 3.5, thickY: 2.5, lw: 2.0 });
      }
    });

    // Controllable Hero
    if (game.hero) {
      const hero = game.hero;
      drawList.push({
        depth: hero.gy,
        draw: () => {
          const [gx0, gy0, pp0] = proj(hero.gx, hero.gy, 0);
          const [sx, sy, pp] = proj(hero.gx, hero.gy, hero.gz);
          const hPx = cam.unit * (cam.portrait ? 1.20 : 1.00) * pp;
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
        depth: tw.gy,
        draw: () => {
          const [gx0, gy0, pp0] = proj(tw.gx, tw.gy, 0);
          const [sx, sy, pp] = proj(tw.gx, tw.gy, tw.gz);
          const hPx = cam.unit * (cam.portrait ? 1.10 : 0.90) * pp;
          drawCardboardBaseAndShadow(ctx, gx0, gy0, hPx * 0.90 * pp0 / pp, tw.gz, 740, true, false);
          const breathe = Math.sin(simTime * 4.8 + tw.phase) * 0.05;
          drawLayeredStandee(ctx, "chili", sx, sy, hPx, tw.facing, tw.recoil * 0.42 + breathe, 0, 0, 0);
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
          const hPx = cam.unit * (cam.portrait ? 1.08 : 0.88) * e.size * pp;
          drawCardboardBaseAndShadow(ctx, gx0, gy0, hPx * 0.85 * pp0 / pp, e.gz, 760, true, false);

          if (e.burnT > 0) drawCardboardFlame(ctx, sx - hPx * 0.28, sy - hPx * 0.44, hPx * 0.44, e.burnSeed + 1, boil);
          const hopSq = (e.gz < 0.04 ? 0.16 : -0.11) + e.hitFlash * 0.22;
          drawLayeredStandee(ctx, e.img, sx, sy, hPx, e.facing, hopSq, e.hitFlash, 0, 0);

          if (e.boss) {
            const cy = sy - hPx - 8 * pp, cw = hPx * 0.22;
            drawCardboardCutoutChip(ctx, [
              [sx - cw, cy], [sx - cw * 1.05, cy - cw * 0.85], [sx - cw * 0.4, cy - cw * 0.35],
              [sx, cy - cw * 1.1], [sx + cw * 0.4, cy - cw * 0.35], [sx + cw * 1.05, cy - cw * 0.85], [sx + cw, cy]
            ], "#ffe047", 605, { thickX: 4, thickY: 3, lw: 2.2 });
          }

          if (e.burnT > 0) drawCardboardFlame(ctx, sx + hPx * 0.26, sy - hPx * 0.18, hPx * 0.48, e.burnSeed + 5, boil);

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

    // Cardboard Cutout Projectiles
    for (const s of game.shots) {
      drawList.push({
        depth: s.gy + 0.2,
        draw: () => {
          const [gx0, gy0, pp0] = proj(s.gx, s.gy, 0);
          drawCardboardBaseAndShadow(ctx, gx0, gy0, cam.unit * 0.32 * pp0, s.gz, 780, false, false);

          for (let ti = 0; ti < s.trail.length; ti++) {
            const tr = s.trail[ti];
            const [tx, ty, tpp] = proj(tr.gx, tr.gy, tr.gz);
            const sz = Math.max(5.5, cam.unit * 0.12 * tpp * (0.65 + ti * 0.07));
            drawCardboardCutoutChip(ctx, [
              [tx - sz, ty - sz * 0.5], [tx + sz * 0.8, ty - sz * 0.7],
              [tx + sz, ty + sz * 0.6], [tx - sz * 0.7, ty + sz * 0.8]
            ], ti % 2 ? s.projCol : "#c48d56", s.seed + ti, { thickX: 2.5, thickY: 2.0, lw: 1.6 });
          }

          const [sx, sy, pp] = proj(s.gx, s.gy, s.gz);
          const [nx, ny] = proj(s.tx, s.ty, s.tz);
          const ang = Math.atan2(ny - sy, nx - sx);
          const pr = Math.max(14, cam.unit * 0.28 * pp);
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(ang);
          drawCardboardCutoutChip(ctx, [
            [pr * 1.15, 0], [pr * 0.28, -pr * 0.74], [-pr * 0.55, -pr * 0.55],
            [-pr * 1.45, -pr * 0.10], [-pr * 0.55, pr * 0.55], [pr * 0.28, pr * 0.74]
          ], s.projCol, s.seed, { thickX: 4.5, thickY: 3.5, lw: 2.2 });
          fillWaxCrayon(ctx, [
            [pr * 0.65, 0], [pr * 0.10, -pr * 0.35], [-pr * 0.68, 0], [pr * 0.10, pr * 0.35]
          ], s.coreCol, s.seed + 5, { lw: 1.5 });
          ctx.restore();
        }
      });
    }

    // Die-Cut Cardboard Explosion & Chip FX
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
            drawCardboardFlame(ctx, sx, sy, cam.unit * (0.24 + prog * 0.22) * pp, f.seed, boil, f.col, "#fffdf6");
          } else if (f.k === "hit") {
            const popScale = easeOutBack(Math.min(1, prog * 2.5));
            const rOut = cam.unit * (f.big ? 0.80 : 0.66) * popScale * pp;
            const rIn = rOut * 0.48;
            const spikes = 7;
            const outerPts = [], midPts = [];
            for (let i = 0; i < spikes * 2; i++) {
              const a = (i / (spikes * 2)) * TAU + f.seed;
              const rr = (i % 2 === 0 ? rOut : rIn) * (0.90 + hash(i, f.seed) * 0.16);
              outerPts.push([sx + Math.cos(a) * rr, sy + Math.sin(a) * rr * 0.85]);
              midPts.push([sx + Math.cos(a + 0.18) * rr * 0.56, sy + Math.sin(a + 0.18) * rr * 0.48]);
            }
            // Back thick brown-edged cardboard starburst -> Front orange/red cardboard starburst!
            drawCardboardCutoutChip(ctx, outerPts, f.burstCol || "#ffe24a", f.seed, { thickX: 6, thickY: 5, lw: 2.4 });
            ctx.save();
            ctx.shadowColor = "rgba(44, 24, 10, 0.40)";
            ctx.shadowOffsetX = 3.5; ctx.shadowOffsetY = 4.5; ctx.shadowBlur = 3;
            drawCardboardCutoutChip(ctx, midPts, "#ff6424", f.seed + 3, { thickX: 4, thickY: 3, lw: 1.8 });
            ctx.restore();

            ctx.save();
            ctx.translate(sx, sy - rOut * 0.26);
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
          } else if (f.k === "cardChip") {
            const sz = Math.max(7, cam.unit * 0.13 * pp);
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(f.rot);
            drawCardboardCutoutChip(ctx, [[-sz, -sz * 0.55], [sz, -sz * 0.3], [sz * 0.7, sz * 0.75], [-sz * 0.8, sz * 0.5]], f.col, f.seed, { thickX: 3.5, thickY: 2.5, lw: 1.6 });
            ctx.restore();
          } else if (f.k === "puff") {
            const spread = cam.unit * (0.28 + prog * 0.46) * pp;
            const rBase = cam.unit * 0.24 * (1 - prog * 0.22) * pp;
            for (let p = 0; p < 6; p++) {
              const a = (p / 6) * TAU + f.seed;
              const px = sx + Math.cos(a) * spread * 0.72;
              const py = sy + Math.sin(a) * spread * 0.48 - prog * 18 * pp;
              drawCardboardCutoutChip(ctx, makeEllipsePts(px, py, rBase, rBase * 0.80, 12, f.seed + p), p % 2 ? "#c48d56" : f.tint, f.seed + p, { thickX: 4, thickY: 3, lw: 2.0 });
            }
          } else if (f.k === "dust") {
            const sc = f.small ? 0.65 : 1.0;
            const sp = cam.unit * (0.12 + prog * 0.22) * sc * pp;
            for (let k = -1; k <= 1; k += 2) {
              fillWaxCrayon(ctx, makeEllipsePts(sx + k * sp, sy, cam.unit * 0.11 * sc * pp, cam.unit * 0.08 * sc * pp, 10, f.seed + k), "#d6b082", f.seed + k, { lw: 1.6 });
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
        enemies: game.enemies.length, shots: game.shots.length, fx: game.fx.length
      };
    }
  };

  renderHeroThumbs();
  whenReady(() => renderHeroThumbs());
  updateLayout();
  openHeroPicker();
  requestAnimationFrame(loop);
})();
