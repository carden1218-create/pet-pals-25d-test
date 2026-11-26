(() => {
  "use strict";

  const OL = "#2a1f36";
  const TAU = Math.PI * 2;
  const COLS = 11, ROWS = 7;
  const PERSP_K = 0.044;

  const {
    hash, jit, sampleSmoothLoop, makeEllipsePts, tracePoly, strokeWaxCrayon, fillWaxCrayon, fillOilPastel, dabPastelCluster, dabStroke, buildCardboardStandees, whenReady, drawCrumpledPaperOverlay, paintKraftMottle, drawCorrugatedWallFlutes, getStandeeFlashCv
  } = window.PaperCraft;

  const AudioSys = window.GameAudio || {
    start() {}, toggleMute() { return false; }, isMuted() { return false; },
    sfxAttack() {}, sfxHit() {}, sfxUltimate() {}, sfxHop() {}, sfxPick() {}
  };

  // Main sandy path + 2 breach lanes so spawn-camping fails!
  const PATH = [
    [0, 1], [1, 1], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5],
    [3, 5], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1],
    [5, 1], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    [7, 5], [8, 5], [8, 4], [8, 3], [9, 3], [10, 3]
  ];
  const LANE_TOP = [
    [5, 0], [5, 1], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    [7, 5], [8, 5], [8, 4], [8, 3], [9, 3], [10, 3]
  ];
  const LANE_BOT = [
    [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [4, 4], [4, 3],
    [4, 2], [4, 1], [5, 1], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    [7, 5], [8, 5], [8, 4], [8, 3], [9, 3], [10, 3]
  ];
  const LANES = [PATH, LANE_TOP, LANE_BOT];
  const PATH_SET = new Set(PATH.map(([x, y]) => x + "," + y));

  const HERO_DEFS = {
    chili: {
      img: "chili", name: "椒椒鼠", fxKind: "fire", moveSpd: 4.4, range: 3.35, atkRate: 0.56, dmg: 26, maxHp: 115,
      projCol: "#ff4b1f", coreCol: "#ffe24a", burstCol: "#ff6d28", wordOl: "#6b1808",
      words: ["WHOOSH!", "BURN!", "燃!", "炙!"], burnDur: 3.2
    },
    lemon: {
      img: "lemon", name: "闪电鸡", fxKind: "lightning", moveSpd: 4.9, range: 3.75, atkRate: 0.92, dmg: 38, maxHp: 105,
      projCol: "#269ef5", coreCol: "#fff454", burstCol: "#ffe944", wordOl: "#13428c",
      words: ["CRACK!", "ZAP!", "轰雷!", "劈!"], chainRange: 2.95
    },
    blueberry: {
      img: "blueberry", name: "蓝莓枭", fxKind: "frost", moveSpd: 4.2, range: 3.45, atkRate: 0.62, dmg: 25, maxHp: 110,
      projCol: "#3c7cf5", coreCol: "#e4f7ff", burstCol: "#72d8ff", wordOl: "#153d88",
      words: ["FREEZE!", "冰封!", "碎!"], slowDur: 2.4, splash: 1.25
    },
    coco: {
      img: "coco", name: "椰椰獭", fxKind: "water", moveSpd: 4.7, range: 3.35, atkRate: 0.68, dmg: 24, maxHp: 115,
      projCol: "#2d9cff", coreCol: "#e4f8ff", burstCol: "#5cd0ff", wordOl: "#0e437a",
      words: ["CRASH!", "浪涌!", "湿!"], slowDur: 2.6, splash: 1.15, knock: 0.25
    },
    taro: {
      img: "taro", name: "芋岩熊", fxKind: "rock", moveSpd: 4.1, range: 3.40, atkRate: 0.56, dmg: 46, maxHp: 140,
      projCol: "#8c7464", coreCol: "#e8d6c0", burstCol: "#c9925a", wordOl: "#3e2614",
      words: ["SMASH!", "石化!", "砸!"], splash: 1.05, knock: 0.28
    },
    chestnut: {
      img: "chestnut", name: "刺栗剑圣", fxKind: "slash", moveSpd: 5.0, range: 2.55, atkRate: 0.50, dmg: 34, maxHp: 130,
      projCol: "#5cf2ff", coreCol: "#ffffff", burstCol: "#ffe24a", wordOl: "#1a2858",
      words: ["SLASH!", "斩!", "剑气!"], splash: 1.05, knock: 0.20, melee: true
    }
  };

  // 3 unique skills per hero (slot 0=[Q], slot 1=[E] ultimate, slot 2=[R]) — each levels Lv1..Lv5!
  const HERO_SKILLS = {
    chili: [
      { id: "chili_fan", ico: "🌶️", lbl: "扇形喷火", cd: 5.0, title: "小技能 · 扇形喷火", desc: "吃掉辣椒在地面喷出扇形烈焰，持续灼烧敌人！" },
      { id: "chili_wall", ico: "🔥", lbl: "辣椒火墙", cd: 9.0, title: "大招 · 辣椒火墙", desc: "喷出一长条高温火墙留红地板；满级召唤双火龙与火龙卷！" },
      { id: "chili_storm", ico: "🌪️", lbl: "龙卷风暴", cd: 7.5, title: "秘技 · 火焰龙卷暴", desc: "吐出多道螺旋火龙卷在敌群间回旋灼烧！" }
    ],
    lemon: [
      { id: "lemon_zeus", ico: "🕊️", lbl: "闪电之力", cd: 7.0, title: "小技能 · 闪电之力", desc: "召唤头戴头盔脚踏白云的宙斯鸟虚影，连射神圣白金雷；满级双宙斯分裂！" },
      { id: "lemon_storm", ico: "🌩️", lbl: "雷暴旋击", cd: 12.0, title: "大招 · 雷暴旋击", desc: "全屏乌云麻痹互电！怒脸大乌云狂劈；满级3朵乌云+全屏小雷！" },
      { id: "lemon_arc", ico: "⚡", lbl: "雷云轰炸", cd: 6.0, title: "秘技 · 蓄能雷云", desc: "头顶闪电连续充能多朵雷云飞向敌群齐劈！" }
    ],
    blueberry: [
      { id: "blue_breath", ico: "🌬️", lbl: "极寒吐息", cd: 5.5, title: "小技能 · 极寒吐息", desc: "喷出超帅寒气冻结敌人；满级大冰块滑行并留冰道！" },
      { id: "blue_blizz", ico: "❄️", lbl: "暴风雪域", cd: 10.0, title: "大招 · 暴风雪", desc: "飞空降下暴风雪把全场冻成冰雕+冰锥雨+滑行冰面！" },
      { id: "blue_mammoth", ico: "🦣", lbl: "猛犸冲锋", cd: 8.0, title: "秘技 · 猛犸战团", desc: "召唤威武猛犸战将踏碎冰霜与史莱姆！" }
    ],
    coco: [
      { id: "coco_torn", ico: "🌀", lbl: "水龙卷", cd: 5.5, title: "小技能 · 水龙卷", desc: "推出高速水龙卷；满级水龙虚影伴飞推浪咬击！" },
      { id: "coco_tsunami", ico: "🌊", lbl: "海啸来袭", cd: 10.0, title: "大招 · 狂澜海啸", desc: "头顶巨大漩涡蓄水溅浪，随后爆发海啸+海洋生物+巨船残骸与吸附漩涡！" },
      { id: "coco_bubble", ico: "🫧", lbl: "泡沫监牢", cd: 7.0, title: "秘技 · 气泡监牢", desc: "吐出大片水泡将史莱姆困住浮空并爆裂！" }
    ],
    taro: [
      { id: "taro_spire", ico: "🪨", lbl: "天降石锥", cd: 5.2, title: "小技能 · 天降石锥", desc: "召唤巨大石锥从天砸落；满级连降多根石锥！" },
      { id: "taro_volcano", ico: "🌋", lbl: "火山爆发", cd: 10.5, title: "大招 · 火山山岳", desc: "召唤巨山裂开化作火山喷发，飞石灼烧并堵路掩埋，配地鼠钻岩打斗！" },
      { id: "taro_quake", ico: "⛰️", lbl: "石化震荡", cd: 7.5, title: "秘技 · 岩震石化", desc: "重踏引爆碎石圈，直接给一片史莱姆套上石壳！" }
    ],
    chestnut: [
      { id: "sword_spin", ico: "⚙️", lbl: "狂旋剑轮", cd: 5.5, title: "小技能 · 狂旋锯剑", desc: "召唤疯狂旋转的飞剑持续切割约6秒；满级四面八方锯片飞剑齐袭！" },
      { id: "sword_ride", ico: "⚔️", lbl: "御剑飞仙", cd: 11.0, title: "大招 · 御剑飞仙", desc: "御剑腾空冲撞扎穿史莱姆，周身聚剑狂攻回旋；满级降下天穹剑阵！" },
      { id: "sword_rain", ico: "🗡️", lbl: "万剑齐发", cd: 7.5, title: "秘技 · 万剑插地", desc: "召唤一圈飞剑凌空扎入地面，随后逐一爆出交叉剑光斩！" }
    ]
  };

  // Creative behavior-changing level-up perks (NO "cheaper planting", NO boring raw +dmg!)
  const PERK_POOL = [
    { id: "perk_companion", ico: "🐾", title: "迷你跟班 · 召唤小弟", desc: "召唤一只缩小版主角随行作战！可点击设置跟随/驻守或优先目标。", apply: (h) => { spawnHeroCompanion(h.key); } },
    { id: "perk_split", ico: "❄️", title: "裂变追击 · 碎屑追踪", desc: "每次命中会分裂出 2 枚迷你追踪弹/剑气追打附近史莱姆！", apply: (h) => { h.splitShots = (h.splitShots || 0) + 2; } },
    { id: "perk_storm", ico: "🌨️", title: "元素余波 · 风暴随行", desc: "每次攻击命中后在原地留下小型元素漩涡/暴雪持续伤害！", apply: (h) => { h.stormWake = (h.stormWake || 0) + 1; } },
    { id: "perk_ember", ico: "🔥", title: "炽热余烬 · 持续灼烧", desc: "攻击附带飘散火星余烬，让史莱姆持续掉血并留下焦痕！", apply: (h) => { h.lingeringBurn = (h.lingeringBurn || 0) + 1; } },
    { id: "perk_chain", ico: "⚡", title: "电弧分叉 · 连锁跳弹", desc: "攻击命中后分叉出细密电弧/剑影弹射 2 个附近敌人！", apply: (h) => { h.chainCount += 2; } },
    { id: "perk_multi", ico: "🎯", title: "多重齐发 · 残影连击", desc: "每次普攻额外多发 1 道攻击并带残影；刺栗剑圣还可远程发射飞剑！", apply: (h) => { h.multiShot += 1; if (h.key === "chestnut") h.rangedSwords = (h.rangedSwords || 0) + 2; } },
    { id: "perk_pierce", ico: "🗡️", title: "贯穿飞刃 · 穿透增程", desc: "攻击穿透 +1 个目标、射程 +15%，命中飞溅碎屑！", apply: (h) => { h.pierce += 1; h.rangeMul = (h.rangeMul || 1) + 0.15; } },
    { id: "perk_crit", ico: "💥", title: "雷霆暴击 · 闪光震环", desc: "暴击率 +14%，暴击触发瞬间亮光闪烁与双层冲击环！", apply: (h) => { h.critChance = Math.min(0.75, (h.critChance || 0.20) + 0.14); } },
    { id: "perk_haste", ico: "💨", title: "疾风步法 · 残影加速", desc: "移速 +16%、攻速 +22%，移动与攻击留下帅气残影！", apply: (h) => { h.moveMul = (h.moveMul || 1) + 0.16; h.atkSpdMul += 0.22; } },
    { id: "perk_power", ico: "💪", title: "火力全开 · 爆裂强化", desc: "攻击和技能伤害 +25%，爆炸特效范围更大！", apply: (h) => { h.dmgMul += 0.25; h.blastScale = (h.blastScale || 1) + 0.08; } },
    { id: "perk_vital", ico: "💖", title: "坚韧体魄 · 生命强化", desc: "最大生命 +35 并立即回满，复活更快！", apply: (h) => { h.maxHp += 35; h.hp = h.maxHp; h.fastRevive = true; } },
    { id: "perk_econ", ico: "🪙", title: "丰收活力 · 掉币回血", desc: "打怪金币 +35%、经验 +30%，立即回复主角 35 点生命！", apply: (h) => { h.goldMul = (h.goldMul || 1) + 0.35; h.xpMul = (h.xpMul || 1) + 0.30; h.hp = Math.min(h.maxHp, h.hp + 35); } }
  ];

  const SCENIC_PROPS = [
    { kind: "tree",  gx: -0.35, gy: 0.45, scale: 1.06, seed: 51, hillLayers: 0 },
    { kind: "tree",  gx: 3.10,  gy: -0.35, scale: 1.00, seed: 52, hillLayers: 0 },
    { kind: "tree",  gx: 7.40,  gy: -0.35, scale: 1.04, seed: 53, hillLayers: 0 },
    { kind: "tree",  gx: 11.25, gy: 0.55, scale: 1.06, seed: 54, hillLayers: 0 },
    { kind: "tree",  gx: 7.40,  gy: 7.35, scale: 1.00, seed: 55, hillLayers: 0 },
    { kind: "bush",  gx: 1.45,  gy: -0.35, scale: 0.95, seed: 61, hillLayers: 0 },
    { kind: "bush",  gx: 5.20,  gy: -0.38, scale: 0.96, seed: 62, hillLayers: 0 },
    { kind: "bush",  gx: 9.45,  gy: -0.32, scale: 0.94, seed: 63, hillLayers: 0 },
    { kind: "rock",  gx: -0.38, gy: 3.45, scale: 0.92, seed: 68, hillLayers: 0 },
    { kind: "sign",  gx: 0.35,  gy: 0.42, scale: 0.92, seed: 77, hillLayers: 0 },
    { kind: "bush",  gx: 2.25,  gy: 7.28, scale: 0.95, seed: 66, hillLayers: 0 },
    { kind: "fence", gx: 5.35,  gy: 7.26, scale: 0.96, seed: 82, hillLayers: 0 },
    { kind: "bush",  gx: 8.65,  gy: 7.25, scale: 0.94, seed: 69, hillLayers: 0 }
  ];

  // Gen-1 Slime & Boss roster (normal, water, fast ember, lightning-cloud zap, armored pebble, flying splitter puff, archer spitter, 4 Bosses!)
  const ENEMY_DEF = {
    z1:      { img: "z1",      name: "嫩芽史莱姆", hp: 50,   speed: 1.42, size: 1.00, tint: "#86de44", reward: 10, role: "normal" },
    z2:      { img: "z2",      name: "果冻史莱姆", hp: 74,   speed: 1.38, size: 1.04, tint: "#62c0ff", reward: 12, role: "water" },
    z3:      { img: "z3",      name: "火焰史莱姆", hp: 64,   speed: 2.05, size: 1.06, tint: "#ff7236", reward: 14, role: "fast" },
    z4:      { img: "z4",      name: "电池史莱姆", hp: 82,   speed: 1.72, size: 1.08, tint: "#ffe042", reward: 16, role: "zap" },
    z5:      { img: "z5",      name: "岩石史莱姆", hp: 185,  speed: 1.05, size: 1.20, tint: "#9c948c", reward: 22, role: "armored" },
    z6:      { img: "z6",      name: "气球史莱姆", hp: 68,   speed: 1.76, size: 1.08, tint: "#ff8ab8", reward: 16, role: "glider", fly: true, splits: 2 },
    spitter: { img: "spitter", name: "远程史莱姆", hp: 78,   speed: 1.30, size: 1.08, tint: "#7acf3a", reward: 20, role: "spitter" },
    b1:      { img: "b1",      name: "果冻史莱姆王", hp: 960,  speed: 0.96, size: 1.48, tint: "#ff7ab8", reward: 85, boss: true, role: "boss" },
    b2:      { img: "b2",      name: "岩甲史莱姆王", hp: 1350, speed: 0.90, size: 1.54, tint: "#8faa8f", reward: 110, boss: true, role: "boss" },
    b3:      { img: "b3",      name: "熔岩史莱姆王", hp: 1750, speed: 0.98, size: 1.54, tint: "#e03a2a", reward: 140, boss: true, role: "boss" },
    b4:      { img: "b4",      name: "混沌史莱姆王", hp: 2200, speed: 1.02, size: 1.56, tint: "#8a4ad0", reward: 180, boss: true, role: "boss" }
  };

  function generateWave(waveNum) {
    // Wave 1-4 gentle warm-up on main path; Wave 5+ ramps steeply with Bosses, 3 lanes, gliders & archers so camping exit fails ~W6-9!
    // Balance v20: after wave 4 the count grows slowly and caps at 40 so a decent player can reach wave 20-30+
    const count = waveNum <= 2 ? 5 + waveNum * 2 : (waveNum <= 4 ? 7 + waveNum * 3 + Math.floor(waveNum * waveNum * 0.18) : Math.min(40, 13 + Math.floor((waveNum - 4) * 1.5)));
    const baseDelay = waveNum <= 3 ? Math.max(0.75, 1.35 - waveNum * 0.14) : Math.max(0.40, 1.02 - waveNum * 0.035);
    const pool = ["z1", "z2"];
    if (waveNum >= 2) pool.push("z3");
    if (waveNum >= 3) pool.push("z4", "z3");
    if (waveNum >= 4) pool.push("z5", "spitter");
    if (waveNum >= 5) pool.push("z6", "spitter", "z5");
    const entries = [];
    for (let i = 0; i < count; i++) {
      const kind = pool[(i * 7 + waveNum * 3) % pool.length];
      let lane = 0;
      if (waveNum === 5) lane = (i % 2 === 0 ? 0 : 1);
      else if (waveNum >= 6) lane = (i % 3);
      entries.push({
        kind,
        lane,
        delay: i === 0 ? 0.35 : baseDelay * (0.75 + hash(i, waveNum * 13) * 0.45)
      });
    }
    if (waveNum % 5 === 0) {
      const bossIdx = ((Math.floor(waveNum / 5) - 1) % 4) + 1;
      entries.push({ kind: "b" + bossIdx, lane: 0, delay: 0.9, boss: true });
    }
    return entries;
  }

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
  /* ================= 2.5D Isometric Raised GEN-1 Orchard Diorama (v1 Depth + Gen-1 Orchard Crayon Look) ================= */
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  let W = 1280, H = 720, DPR = 1;
  let cam = { ox: 640, oy: 380, tw: 62, th: 28, zs: 66, slab: 32, unit: 68, portrait: false, cosA: Math.cos(0.72), sinA: Math.sin(0.72) };
  let bgCache = null;

  function updateLayout() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(320, window.innerWidth);
    H = Math.max(320, window.innerHeight);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);

    const portrait = W < H;
    // Close-up 3D isometric framing: fills screen on desktop (1280x720) & mobile portrait (390x844) with strong 3D walls!
    const ang = portrait ? 1.18 : 0.34;
    const cosA = Math.cos(ang), sinA = Math.sin(ang);
    const tilt = portrait ? 0.64 : 0.48;
    const spanU = COLS * cosA + ROWS * sinA + 0.55;
    const spanV = COLS * sinA + ROWS * cosA + 0.55;
    const maxTwByW = (W * (portrait ? 0.96 : 0.94)) / (spanU * 0.96);
    const maxTwByH = (H * (portrait ? 0.72 : 0.80)) / (spanV * tilt * 0.96 + 0.75);
    const tw = Math.max(28, Math.min(maxTwByW, maxTwByH));
    const th = tw * tilt;

    cam = {
      ox: W * 0.50,
      oy: H * (portrait ? 0.53 : 0.54),
      tw, th,
      zs: tw * (portrait ? 1.02 : 0.96),
      slab: Math.max(24, tw * 0.46),
      unit: tw * 1.02,
      portrait, cosA, sinA
    };
    if (portrait) fitPortraitCamera();
    bgCache = null;
  }

  // v20: portrait fit measures the real projected island + edge props so nothing is clipped on the right/left edge
  function fitPortraitCamera() {
    const M = 0.58;
    const measure = () => {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      const add = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
      for (const [gx, gy] of [[-M, -M], [COLS + M, -M], [COLS + M, ROWS + M], [-M, ROWS + M]]) {
        const [x, y, pp] = proj(gx, gy, 0);
        add(x, y); add(x, y + cam.slab * pp * 1.25);
      }
      for (const pr of SCENIC_PROPS) {
        const [x, y, pp] = proj(pr.gx, pr.gy, 0);
        const hPx = cam.unit * 1.68 * (pr.kind === "tree" ? 1.25 : 0.94) * pr.scale * pp;
        add(x - hPx * 0.42, y - hPx); add(x + hPx * 0.42, y);
      }
      return { x0, x1, y0, y1 };
    };
    const padX = 6, top = 96, bottom = H - 70;
    for (let it = 0; it < 3; it++) {
      const b = measure();
      const sc = Math.min(1, (W - padX * 2) / (b.x1 - b.x0), (bottom - top) / (b.y1 - b.y0));
      cam.tw *= sc; cam.th *= sc; cam.zs *= sc; cam.slab = Math.max(18, cam.slab * sc); cam.unit *= sc;
      const b2 = measure();
      cam.ox += W * 0.5 - (b2.x0 + b2.x1) * 0.5;
      cam.oy += (top + bottom) * 0.5 - (b2.y0 + b2.y1) * 0.5;
    }
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
    return Math.max(16, Math.min(24, cam.slab * 0.65));
  }

  function crayonPolyGen1(c, pts, fillCol, seed, opts = {}) {
    const lw = opts.lw ?? 2.4;
    const ol = opts.ol ?? "#2b1b22";
    const amp = opts.amp ?? 1.4;
    const jPts = pts.map(([x, y], i) => [
      x + jit(i, seed) * amp,
      y + jit(i + 37, seed + 7) * amp
    ]);
    c.save();
    tracePoly(c, jPts);
    if (fillCol) { c.fillStyle = fillCol; c.fill(); }
    if (opts.hatch) {
      c.save(); c.clip();
      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      for (const [x, y] of jPts) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      c.strokeStyle = opts.hatch;
      c.globalAlpha = opts.hatchAlpha ?? 0.25;
      c.lineWidth = 2.0;
      const step = opts.hatchStep ?? 11;
      for (let x = minX - (maxY - minY); x < maxX + (maxY - minY); x += step) {
        c.beginPath(); c.moveTo(x, minY); c.lineTo(x + (maxY - minY) * 0.45, maxY); c.stroke();
      }
      c.restore();
    }
    if (opts.hi) {
      c.save(); c.strokeStyle = opts.hi; c.lineWidth = opts.hiW ?? 3.5; c.globalAlpha = opts.hiAlpha ?? 0.42;
      c.lineCap = "round";
      c.beginPath(); c.moveTo(jPts[0][0], jPts[0][1]); c.lineTo(jPts[1][0], jPts[1][1]); c.stroke();
      c.restore();
    }
    if (lw > 0) {
      tracePoly(c, jPts);
      c.strokeStyle = ol; c.lineWidth = lw; c.lineJoin = "round"; c.stroke();
    }
    c.restore();
  }

  function drawGen1DioramaBoard(c) {
    // 1. Warm sunlit v1 crayon sky -> meadow cream gradient + diagonal sunbeams
    const grad = c.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#fdf6de");
    grad.addColorStop(0.45, "#f8eed2");
    grad.addColorStop(1, "#e8efd0");
    c.fillStyle = grad;
    c.fillRect(0, 0, W, H);

    // Diagonal warm sunlight beams (v1 signature!)
    c.save();
    c.fillStyle = "rgba(255, 253, 240, 0.46)";
    for (let i = 0; i < 3; i++) {
      const bx = W * (0.04 + i * 0.22);
      c.beginPath();
      c.moveTo(bx, 0); c.lineTo(bx + W * 0.12, 0);
      c.lineTo(bx + W * 0.36, H); c.lineTo(bx + W * 0.16, H);
      c.closePath(); c.fill();
    }
    c.restore();

    // Rolling Gen-1 Orchard green meadow hills behind the floating 2.5D island
    const hillY = cam.oy - cam.th * (cam.portrait ? 4.4 : 4.1);
    c.save();
    const hill1 = [[0, H], [0, hillY + 28]];
    for (let x = 0; x <= W + 60; x += 60) hill1.push([x, hillY + Math.sin(x * 0.0055 + 0.7) * 24 + 18]);
    hill1.push([W, H]);
    tracePoly(c, hill1);
    c.fillStyle = "rgba(176, 218, 120, 0.48)";
    c.fill();

    const hill2 = [[0, H], [0, hillY + 58]];
    for (let x = 0; x <= W + 50; x += 50) hill2.push([x, hillY + 50 + Math.cos(x * 0.007 - 0.5) * 18]);
    hill2.push([W, H]);
    tracePoly(c, hill2);
    c.fillStyle = "rgba(146, 200, 92, 0.42)";
    c.fill();
    c.restore();

    // Cute hand-drawn crayon sun (v1) + puffy crayon clouds
    const sunX = W * (cam.portrait ? 0.15 : 0.11);
    const sunY = H * (cam.portrait ? 0.14 : 0.17);
    const sunR = Math.min(W, H) * 0.045;
    c.save();
    c.strokeStyle = "#2b1b22"; c.lineWidth = 2.6; c.lineCap = "round";
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      c.fillStyle = "#ffd64a";
      c.beginPath();
      c.moveTo(sunX + Math.cos(a) * sunR * 1.24, sunY + Math.sin(a) * sunR * 1.24);
      c.lineTo(sunX + Math.cos(a) * sunR * 1.62, sunY + Math.sin(a) * sunR * 1.62);
      c.stroke();
    }
    crayonPolyGen1(c, makeEllipsePts(sunX, sunY, sunR, sunR, 18, 20), "#ffe564", 20, { lw: 2.8, amp: 1.1 });
    c.restore();

    for (let ci = 0; ci < 3; ci++) {
      const clx = W * (0.31 + ci * 0.27);
      const cly = H * (0.10 + (ci % 2) * 0.05);
      const u = Math.min(W, H) * 0.036;
      const cPts = sampleSmoothLoop([
        [clx - u * 1.5, cly + u * 0.3], [clx - u * 1.3, cly - u * 0.3], [clx - u * 0.4, cly - u * 0.65],
        [clx + u * 0.45, cly - u * 0.72], [clx + u * 1.25, cly - u * 0.32], [clx + u * 1.55, cly + u * 0.3], [clx, cly + u * 0.4]
      ], 3);
      crayonPolyGen1(c, cPts, "#ffffff", 30 + ci, { lw: 2.0, ol: "rgba(43, 27, 34, 0.35)", amp: 1.0 });
    }

    // 2. Raised 3D Isometric Cardboard Island Board (-0.58 .. COLS+0.58, -0.58 .. ROWS+0.58)
    const M = 0.58;
    const iT = proj(-M, -M, 0);
    const iR = proj(COLS + M, -M, 0);
    const iB = proj(COLS + M, ROWS + M, 0);
    const iL = proj(-M, ROWS + M, 0);
    const sL = cam.slab * iL[2] * 1.25;
    const sB = cam.slab * iB[2] * 1.25;
    const sR = cam.slab * iR[2] * 1.25;

    // Ground drop shadow under the floating 2.5D island
    c.save();
    c.fillStyle = "rgba(43, 27, 34, 0.22)";
    tracePoly(c, [
      [iT[0] + 12, iT[1] + sB + 18],
      [iR[0] + 18, iR[1] + sR + 20],
      [iB[0] + 14, iB[1] + sB + 24],
      [iL[0] + 4,  iL[1] + sL + 18]
    ]);
    c.fill();
    c.restore();

    // Extruded 3D Cardboard / Soil Cliff Walls (front-left sunlit #9f6f46, front-right shaded #7d5230 + corrugated wave flutes!)
    const cliffL = [iL, iB, [iB[0] - 5 * iB[2], iB[1] + sB], [iL[0] + 5 * iL[2], iL[1] + sL]];
    crayonPolyGen1(c, cliffL, "#9f6f46", 111, { lw: 3.2, amp: 1.5, hatch: "#6b4324", hatchStep: 12, hatchAlpha: 0.25 });
    const cliffR = [iB, iR, [iR[0] - 5 * iR[2], iR[1] + sR], [iB[0] - 5 * iB[2], iB[1] + sB]];
    crayonPolyGen1(c, cliffR, "#7d5230", 112, { lw: 3.2, amp: 1.5, hatch: "#4c2d16", hatchStep: 12, hatchAlpha: 0.28 });

    // Corrugated cardboard flute pebbles & wave line along cliff walls (v1 + cardboard look!)
    for (let i = 0; i < 8; i++) {
      const t = (i + 0.5) / 8;
      crayonPolyGen1(c, makeEllipsePts(lerp(iL[0], iB[0], t), lerp(iL[1], iB[1], t) + lerp(sL, sB, t) * 0.62, cam.tw * 0.08, cam.tw * 0.048, 10, 210 + i), "#c89b6e", 210 + i, { lw: 1.8 });
    }
    for (let i = 0; i < 7; i++) {
      const t = (i + 0.5) / 7;
      crayonPolyGen1(c, makeEllipsePts(lerp(iB[0], iR[0], t), lerp(iB[1], iR[1], t) + lerp(sB, sR, t) * 0.62, cam.tw * 0.075, cam.tw * 0.045, 10, 230 + i), "#a8784c", 230 + i, { lw: 1.8 });
    }

    // Overhanging GEN-1 green grass lip along island rim
    const lip = 0.34;
    crayonPolyGen1(c, [iL, iB, [iB[0], iB[1] + sB * lip], [iL[0], iL[1] + sL * lip]], "#6bc442", 113, { lw: 2.8, amp: 1.4 });
    crayonPolyGen1(c, [iB, iR, [iR[0], iR[1] + sR * lip], [iB[0], iB[1] + sB * lip]], "#4ea32e", 114, { lw: 2.8, amp: 1.4 });

    // Top Orchard grassy border shelf
    crayonPolyGen1(c, [iT, iR, iB, iL], "#74c246", 115, { lw: 3.4, amp: 1.3, hi: "#b8ef7c", hiW: 5, hiAlpha: 0.45 });

    // 3. GEN-1 Orchard Checkerboard Lawn + Winding Sandy Crayon Path (11x7 grid!)
    for (let d = 0; d <= COLS + ROWS - 2; d++) {
      for (let tx = 0; tx < COLS; tx++) {
        const ty = d - tx;
        if (ty < 0 || ty >= ROWS) continue;
        const isPath = PATH_SET.has(tx + "," + ty);
        const corners = tileCorners(tx, ty, 0, 0);
        if (isPath) {
          // Sandy crayon path with dark border & recessed bevel
          crayonPolyGen1(c, corners, "#edd49f", 300 + tx * 11 + ty, { lw: 2.0, ol: "rgba(92, 58, 28, 0.72)", amp: 1.0 });
          c.save();
          c.strokeStyle = "rgba(128, 86, 42, 0.42)";
          c.lineWidth = Math.max(2.6, cam.tw * 0.07 * corners[0][2]);
          c.lineCap = "round";
          c.beginPath(); c.moveTo(corners[3][0], corners[3][1]); c.lineTo(corners[0][0], corners[0][1]); c.lineTo(corners[1][0], corners[1][1]); c.stroke();
          c.restore();
          for (let k = 0; k < 2; k++) {
            const gx = tx + 0.26 + hash(tx * 7 + k, ty * 13) * 0.48;
            const gy = ty + 0.26 + hash(tx * 17, ty * 5 + k) * 0.48;
            const [px, py, pp] = proj(gx, gy, 0);
            crayonPolyGen1(c, makeEllipsePts(px, py, cam.tw * 0.08 * pp, cam.th * 0.08 * pp, 10, 400 + tx + ty + k), k ? "#d7b67f" : "#f7e5be", 400 + tx + ty + k, { lw: 1.4 });
          }
        } else {
          // Genuine GEN-1 Orchard 2-tone green checkerboard (#95ce4c / #81bc38)!
          const even = (tx + ty) % 2 === 0;
          crayonPolyGen1(c, corners, even ? "#96cf4e" : "#80bc38", 500 + tx * 13 + ty, {
            lw: 1.6, ol: "rgba(43, 86, 28, 0.42)", amp: 0.9, hi: even ? "#c4f082" : "#ace26a", hiW: 2.2, hiAlpha: 0.36
          });
          // Crisp dashed chalk placement marker
          const inner = tileCorners(tx, ty, 0.14, 0);
          c.save();
          c.setLineDash([5, 5]);
          c.strokeStyle = "rgba(255, 255, 240, 0.56)";
          c.lineWidth = 1.5;
          tracePoly(c, inner);
          c.stroke();
          c.restore();

          // Gen-1 grass tufts & little flowers
          const rnd = hash(tx + 5, ty + 11);
          if (rnd > 0.62) {
            const [gx, gy, pp] = proj(tx + 0.24, ty + 0.76, 0);
            c.save();
            c.strokeStyle = "#3c8422"; c.lineWidth = 2.2; c.lineCap = "round";
            c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx - 3.5 * pp, gy - 8 * pp); c.moveTo(gx + 2 * pp, gy); c.lineTo(gx + 4 * pp, gy - 9 * pp); c.stroke();
            if (rnd > 0.84) {
              c.fillStyle = (tx + ty) % 2 ? "#ff78a8" : "#ffe258";
              c.strokeStyle = "#2b1b22"; c.lineWidth = 1.4;
              c.beginPath(); c.arc(gx + 8 * pp, gy - 5 * pp, 3.6 * pp, 0, TAU); c.fill(); c.stroke();
            }
            c.restore();
          }
        }
      }
    }

    // Gen-1 Crayon Paper Grain Overlay across the whole board (ui/grain feeling!)
    drawCrumpledPaperOverlay(c, W, H, 955, { cell: 104, strength: 0.52, coloredSurface: true });
  }

  function ensureBgCache() {
    if (bgCache) return bgCache;
    bgCache = document.createElement("canvas");
    bgCache.width = canvas.width;
    bgCache.height = canvas.height;
    const bc = bgCache.getContext("2d");
    bc.scale(DPR, DPR);
    drawGen1DioramaBoard(bc);
    return bgCache;
  }

  /* ================= Game State ================= */
  let simTime = 0;
  let speedMul = 1;
  let shakeT = 0;
  let shakeMag = 0;
  let hitStopT = 0;
  let hitStopCd = 0;
  let screenFlashT = 0;
  let screenFlashCol = "#fff9cc";
  function triggerShake(mag, dur) {
    const clamped = Math.min(1.6, mag);
    if (clamped >= shakeMag || shakeT <= 0) { shakeMag = clamped; shakeT = Math.min(0.06, dur); }
  }
  function triggerHitStop(dur) {
    if (hitStopCd <= 0) {
      hitStopT = Math.max(hitStopT, clamp(dur, 0.050, 0.080));
      hitStopCd = 0.065;
    }
  }
  function triggerScreenFlash(col = "#fff7c8", dur = 0.08) {
    screenFlashCol = col;
    screenFlashT = Math.max(screenFlashT, dur);
  }

  let hoverTile = null;
  let chosenHeroKey = "chili";
  let game = null;
  let selectedComp = null;
  const keys = {};
  const joyVec = { x: 0, y: 0, active: false };

  function makeHero(heroKey) {
    const def = HERO_DEFS[heroKey] || HERO_DEFS.chili;
    const skDefs = HERO_SKILLS[heroKey] || HERO_SKILLS.chili;
    return {
      key: heroKey, def, gx: 4.5, gy: 3.5, gz: 0,
      hp: def.maxHp || 110, maxHp: def.maxHp || 110, invulnT: 0, deadT: 0,
      vx: 0, vy: 0, target: null, walkPhase: 0, dustTimer: 0,
      facing: 1, waddle: 0, atkCd: 0.25, recoil: 0, windup: 0,
      lungeX: 0, lungeY: 0, lungeZ: 0, headbuttT: 0,
      dashState: null, ridingSwordT: 0, afterimages: [], atkCount: 0,
      level: 1, xp: 0, xpNext: 4,
      multiShot: 1, atkSpdMul: 1, dmgMul: 1, blastScale: 1, pierce: 0, chainCount: 0,
      splitShots: 0, stormWake: 0, lingeringBurn: 0, rangedSwords: 0,
      critChance: 0.20, moveMul: 1, rangeMul: 1, goldMul: 1, xpMul: 1,
      skills: [
        { ...skDefs[0], lv: 1, cdLeft: 0 },
        { ...skDefs[1], lv: 0, cdLeft: 0 },
        { ...skDefs[2], lv: 0, cdLeft: 0 }
      ],
      pickedIds: []
    };
  }

  function spawnHeroCompanion(heroKey, kindOverride = null, dur = 0) {
    if (!game || !game.hero) return null;
    const k = kindOverride || heroKey;
    const idx = game.companions.length;
    const ang = idx * 1.9;
    const comp = {
      id: "c_" + Math.floor(Math.random() * 1e7) + "_" + idx,
      key: k,
      gx: clamp(game.hero.gx + Math.cos(ang) * 0.75, 0.4, COLS - 0.4),
      gy: clamp(game.hero.gy + Math.sin(ang) * 0.65, 0.4, ROWS - 0.4),
      gz: 0, facing: 1, walkPhase: 0,
      lv: 1, prio: "nearest", guard: false, guardGx: game.hero.gx, guardGy: game.hero.gy,
      atkCd: 0.25, recoil: 0, ttl: dur > 0 ? dur : 0, isTemp: dur > 0, seed: 300 + idx * 17
    };
    game.companions.push(comp);
    spawnDustPuff(comp.gx, comp.gy, true);
    return comp;
  }

  function openHeroPicker() {
    selectedComp = null;
    game = {
      started: false, waveNum: 1, waveEntries: generateWave(1), spawnIdx: 0, spawnTimer: 0.35, wavePause: 0,
      lives: 10, gold: 60, over: false, levelPick: null,
      hero: makeHero(chosenHeroKey), companions: [], enemies: [], dying: [],
      shots: [], enemyShots: [], fx: [], scorch: [], puddles: [], rubbles: [],
      activeZones: [], telegraphs: [], iceFloorT: 0, darkSkyT: 0, swordOrbitT: 0,
      spawnsDone: 0, slimesKilled: 0
    };
    document.getElementById("overlay").classList.add("hidden");
    document.getElementById("levelup-overlay").classList.add("hidden");
    document.getElementById("pick-overlay").classList.remove("hidden");
    syncHud();
  }

  function startWithHero(heroKey) {
    chosenHeroKey = HERO_DEFS[heroKey] ? heroKey : "chili";
    selectedComp = null;
    game = {
      started: true, waveNum: 1, waveEntries: generateWave(1), spawnIdx: 0, spawnTimer: 0.25, wavePause: 0,
      lives: 10, gold: 60, over: false, levelPick: null,
      hero: makeHero(chosenHeroKey), companions: [], enemies: [], dying: [],
      shots: [], enemyShots: [], fx: [], scorch: [], puddles: [], rubbles: [],
      activeZones: [], telegraphs: [], iceFloorT: 0, darkSkyT: 0, swordOrbitT: 0,
      spawnsDone: 0, slimesKilled: 0
    };
    AudioSys.start();
    document.getElementById("pick-overlay").classList.add("hidden");
    document.getElementById("levelup-overlay").classList.add("hidden");
    document.getElementById("overlay").classList.add("hidden");
    spawnDustPuff(game.hero.gx, game.hero.gy);
    syncHud();
  }

  function syncHud() {
    if (!game) return;
    document.getElementById("hud-wave").textContent = "Wave " + game.waveNum + " · 无尽";
    document.getElementById("hud-life").textContent = "❤️ " + game.lives;
    document.getElementById("hud-gold").textContent = "🪙 " + game.gold;
    const h = game.hero;
    if (h) {
      const hpEl = document.getElementById("hero-hp-fill");
      const hpTxt = document.getElementById("hero-hp-txt");
      if (h.deadT > 0) {
        if (hpEl) hpEl.style.width = "0%";
        if (hpTxt) hpTxt.textContent = "复活 " + h.deadT.toFixed(1) + "s";
      } else {
        if (hpEl) hpEl.style.width = Math.max(0, Math.round((h.hp / h.maxHp) * 100)) + "%";
        if (hpTxt) hpTxt.textContent = Math.max(0, Math.round(h.hp));
      }
      document.getElementById("xp-lvl").textContent = "Lv." + h.level;
      document.getElementById("xp-fill").style.width = Math.min(100, Math.round((h.xp / h.xpNext) * 100)) + "%";
      syncSkillBtn();
    }
    const boss = game.enemies.find(e => e.boss && e.hp > 0);
    const bWrap = document.getElementById("boss-bar-wrap");
    if (bWrap) {
      if (boss) {
        bWrap.classList.remove("hidden");
        document.getElementById("boss-name").textContent = "👑 " + (ENEMY_DEF[boss.kind]?.name || "史莱姆王") + " · W" + game.waveNum;
        document.getElementById("boss-skill-tag").textContent = boss.skillTag || "蓄势待发";
        document.getElementById("boss-bar-fill").style.width = clamp(Math.round((boss.hp / boss.maxHp) * 100), 0, 100) + "%";
      } else {
        bWrap.classList.add("hidden");
      }
    }
  }

  function syncSkillBtn() {
    if (!game || !game.hero) return;
    const skills = game.hero.skills || [];
    for (let i = 0; i < 3; i++) {
      const btn = document.getElementById("skill-slot-" + i);
      if (!btn) continue;
      const sk = skills[i];
      if (!sk || sk.lv <= 0) {
        btn.classList.add("hidden");
        continue;
      }
      btn.classList.remove("hidden");
      document.getElementById("skill-ico-" + i).textContent = sk.ico;
      document.getElementById("skill-lbl-" + i).textContent = sk.lbl;
      document.getElementById("skill-lvl-" + i).textContent = "Lv" + sk.lv;
      const mask = document.getElementById("skill-cd-" + i);
      const effCd = getSkillCooldown(sk);
      if (sk.cdLeft > 0.02) {
        btn.classList.remove("ready");
        btn.classList.add("on-cd");
        const frac = clamp(sk.cdLeft / effCd, 0, 1);
        const deg = Math.round(frac * 360);
        mask.style.background = `conic-gradient(rgba(36, 24, 58, 0.42) ${deg}deg, rgba(255, 253, 246, 0.10) ${deg}deg)`;
        mask.textContent = sk.cdLeft.toFixed(1) + "s";
      } else {
        btn.classList.remove("on-cd");
        btn.classList.add("ready");
        mask.textContent = "";
      }
    }
  }

  function getSkillCooldown(sk) {
    return Math.max(2.2, sk.cd * (1 - 0.09 * Math.max(0, (sk.lv || 1) - 1)));
  }

  function damageHero(dmg, srcLabel = "") {
    if (!game || !game.hero || game.over) return false;
    const h = game.hero;
    if (h.deadT > 0 || h.invulnT > 0) return false;
    // Low passive dodge chance (~22%, never > 30%) on arrows/hazards so attacks usually hit!
    if (srcLabel === "arrow" && Math.random() < 0.22) {
      spawnDmgPop(h.gx, h.gy - 0.2, h.gz + 1.4, "DODGE! 闪避!", "#6ef5ff", false);
      h.lungeX = (Math.random() > 0.5 ? 1 : -1) * 0.28;
      return false;
    }
    h.hp = Math.max(0, h.hp - dmg);
    h.invulnT = 0.35;
    h.recoil = 0.9;
    triggerShake(1.4, 0.05);
    spawnDmgPop(h.gx, h.gy - 0.1, h.gz + 1.5, "-" + dmg + "💔", "#ff4a5a", true);
    AudioSys.sfxHit("fire", false);
    if (h.hp <= 0) {
      h.deadT = h.fastRevive ? 3.5 : 5.0;
      h.target = null;
      h.dashState = null;
      h.ridingSwordT = 0;
      spawnImpactDoodle(h.gx, h.gy, 0.5, true, { fxKind: "fire", words: ["倒下了!"], burstCol: "#ff6b6b", wordOl: "#521414" });
    }
    syncHud();
    return true;
  }

  function triggerActiveSkill(slotIdx = 0) {
    if (!game || !game.started || game.over || game.levelPick || !game.hero) return false;
    const h = game.hero;
    if (h.deadT > 0) return false;
    const sk = h.skills[slotIdx];
    if (!sk || sk.lv <= 0 || sk.cdLeft > 0.02) return false;
    sk.cdLeft = getSkillCooldown(sk);
    const lv = sk.lv;
    h.recoil = 1.25;
    triggerHitStop(0.055);
    triggerShake(1.5, 0.06);
    triggerScreenFlash(h.def.coreCol, 0.08);
    AudioSys.sfxUltimate(h.def.fxKind);

    const k = sk.id;
    const dmgBase = Math.round(h.def.dmg * h.dmgMul * (1 + 0.34 * (lv - 1)));
    const firstTgt = findBestTarget(h.gx, h.gy, 9.5) || { gx: clamp(h.gx + h.facing * 2.2, 0.5, COLS - 0.5), gy: h.gy, gz: 0 };

    if (k === "chili_fan") {
      // Eats 1 chili -> fan-shaped fire cone on ground scorching slimes
      game.activeZones.push({
        kind: "fireFan", gx: h.gx, gy: h.gy, dir: Math.atan2(firstTgt.gy - h.gy, firstTgt.gx - h.gx),
        r: 2.3 + lv * 0.25, t: 0, dur: 2.0 + lv * 0.3, tick: 0, dmg: Math.round(dmgBase * 0.85), seed: Math.floor(Math.random() * 9999), lv
      });
      addFx({ k: "hit", fxKind: "fire", gx: h.gx, gy: h.gy, gz: 0.95, word: "🌶️ 扇形喷火 Lv" + lv, big: true, burstCol: "#ffe042", wordOl: "#6b1808", scale: 0.95, life: 0.48, max: 0.48, seed: 701 });
    } else if (k === "chili_wall") {
      // Eats chili -> long roaring fire wall (heats red->orange->white-hot), leaves red floor; Lv>=3 summons 2 Fire Dragons!
      const ang = Math.atan2(firstTgt.gy - h.gy, firstTgt.gx - h.gx);
      game.activeZones.push({
        kind: "fireWall", gx: h.gx + Math.cos(ang) * 0.6, gy: h.gy + Math.sin(ang) * 0.5, ang,
        len: 3.4 + lv * 0.35, t: 0, dur: 3.2 + lv * 0.45, tick: 0, dmg: Math.round(dmgBase * 0.95), seed: Math.floor(Math.random() * 9999), lv
      });
      if (lv >= 3 || lv === 5) {
        const dN = lv >= 4 ? 2 : 1;
        for (let di = 0; di < dN; di++) {
          game.activeZones.push({
            kind: "fireDragon", gx: h.gx + (di ? 0.8 : -0.8), gy: h.gy - 0.4, t: 0, dur: 4.5, tick: 0,
            dmg: Math.round(dmgBase * 0.75), seed: 500 + di * 37, lv
          });
        }
      }
      addFx({ k: "hit", fxKind: "fire", gx: h.gx, gy: h.gy, gz: 1.0, word: "🔥 辣椒火墙 Lv" + lv, big: true, burstCol: "#ffe94a", wordOl: "#6b1808", scale: 1.05, life: 0.55, max: 0.55, seed: 711 });
    } else if (k === "chili_storm") {
      // Tornado storm: multiple swirling fire tornados with tiny flame cores!
      const nT = 2 + lv;
      for (let ti = 0; ti < nT; ti++) {
        const tg = game.enemies[ti % Math.max(1, game.enemies.length)];
        const tx = tg ? tg.gx : clamp(h.gx + (ti - 1) * 1.4, 0.5, COLS - 0.5);
        const ty = tg ? tg.gy : clamp(h.gy + (ti % 2 ? 1.1 : -1.1), 0.5, ROWS - 0.5);
        game.shots.push({
          kind: "fireTornado", sx: h.gx, sy: h.gy, sz: 0.55, gx: h.gx, gy: h.gy, gz: 0.55,
          target: tg || null, tx, ty, tz: 0.38, t: 0, dur: 0.42 + ti * 0.06, crit: true,
          fxKind: "fire", dmg: Math.round(dmgBase * 1.1), burnDur: 3.5, splash: 1.05, blastScale: 1, knock: 0.14, pierce: 1, piercedSet: new Set(), trail: [], seed: 730 + ti, growMax: 1.3 + lv * 0.12
        });
      }
    } else if (k === "lemon_zeus") {
      // Lightning Force: Zeus-bird phantom(s) on holy white cloud shooting holy white-gold bolts!
      const zCount = lv >= 5 ? 2 : 1;
      for (let zi = 0; zi < zCount; zi++) {
        game.activeZones.push({
          kind: "zeusPhantom", gx: h.gx + (zi === 0 ? -0.5 : 0.65), gy: h.gy - 0.45,
          t: 0, dur: 3.5 + lv * 0.45, tick: 0, dmg: Math.round(dmgBase * 0.62), boltsPerTick: 2 + Math.floor(lv / 2),
          canSplit: lv >= 4, seed: 810 + zi * 29, lv
        });
      }
      addFx({ k: "skyBolt", gx: h.gx, gy: h.gy, gz: 0.4, life: 0.35, max: 0.35, holy: true, seed: 815 });
      addFx({ k: "hit", fxKind: "lightning", gx: h.gx, gy: h.gy, gz: 1.05, word: "🕊️ 宙斯降临 Lv" + lv, big: true, burstCol: "#fff9be", wordOl: "#13428c", scale: 1.0, life: 0.5, max: 0.5, seed: 819 });
    } else if (k === "lemon_storm") {
      // Lightning Storm: darkened sky, paralyzed glowing scar on enemies (arc-shocking each other!), angry-face storm cloud(s) striking 5-6+ times!
      game.darkSkyT = Math.max(game.darkSkyT, 3.6 + lv * 0.4);
      for (const e of game.enemies) {
        if (e.hp > 0) e.paralyzeT = Math.max(e.paralyzeT || 0, 3.4 + lv * 0.3);
      }
      const cloudsN = lv >= 5 ? 3 : (lv >= 3 ? 2 : 1);
      for (let ci = 0; ci < cloudsN; ci++) {
        game.activeZones.push({
          kind: "angryCloud", gx: 2.5 + ci * 3.0, gy: 2.4 + (ci % 2) * 1.4,
          t: 0, dur: 3.4 + lv * 0.35, tick: 0, strikesLeft: 5 + lv, dmg: Math.round(dmgBase * 1.15),
          miniBolts: lv >= 5, seed: 840 + ci * 19, lv
        });
      }
      addFx({ k: "hit", fxKind: "lightning", gx: h.gx, gy: h.gy, gz: 1.05, word: "🌩️ 雷暴旋击 Lv" + lv, big: true, burstCol: "#ffe944", wordOl: "#13428c", scale: 1.05, life: 0.52, max: 0.52, seed: 849 });
    } else if (k === "lemon_arc") {
      // Charged cloud barrage: 2+lv clouds emerging & flying out!
      const tgts = [...game.enemies].filter(e => e.hp > 0);
      for (let ci = 0; ci < 2 + lv; ci++) {
        const tg = tgts[ci % Math.max(1, tgts.length)];
        game.activeZones.push({
          kind: "lemonCloudAttack", gx: h.gx, gy: h.gy, gz: 0.9,
          startGx: h.gx, startGy: h.gy, target: tg || null,
          tx: tg ? tg.gx : firstTgt.gx + (ci - 1) * 0.8, ty: tg ? tg.gy : firstTgt.gy,
          t: 0, chargeDur: 0.24, flyDur: 0.22, struck: false, dmg: Math.round(dmgBase * 1.15), seed: 870 + ci
        });
      }
    } else if (k === "blue_breath") {
      // Awesome Frost Breath freezing slimes; high Lv drops sliding Ice Block leaving ice trail!
      const ang = Math.atan2(firstTgt.gy - h.gy, firstTgt.gx - h.gx);
      game.activeZones.push({
        kind: "frostBreath", gx: h.gx, gy: h.gy, ang, r: 2.5 + lv * 0.22,
        t: 0, dur: 1.1, tick: 0, dmg: Math.round(dmgBase * 0.9), freezeDur: 1.2 + lv * 0.35, seed: 901, lv
      });
      if (lv >= 3) {
        game.activeZones.push({
          kind: "slidingIce", gx: h.gx + Math.cos(ang) * 0.4, gy: h.gy + Math.sin(ang) * 0.4,
          vx: Math.cos(ang) * 4.4, vy: Math.sin(ang) * 4.4, r: 0.65 + lv * 0.08,
          t: 0, dur: 1.6 + lv * 0.2, tick: 0, dmg: Math.round(dmgBase * 0.7), hitSet: new Set(), seed: 909, lv
        });
      }
      addFx({ k: "hit", fxKind: "frost", gx: h.gx, gy: h.gy, gz: 0.95, word: "🌬️ 极寒吐息 Lv" + lv, big: true, burstCol: "#8ae4ff", wordOl: "#153d88", scale: 1.0, life: 0.48, max: 0.48, seed: 912 });
    } else if (k === "blue_blizz") {
      // Blizzard Ult: flies up, snow falls, cold gust freezes all into ice sculptures, drops icicles, leaves icy floor!
      h.lungeZ = 0.85;
      game.iceFloorT = Math.max(game.iceFloorT, 12 + lv * 3);
      game.activeZones.push({
        kind: "blizzard", gx: 5.5, gy: 3.5, t: 0, dur: 3.6 + lv * 0.35, tick: 0,
        dmg: Math.round(dmgBase * 0.72), frozenDone: false, seed: 920, lv
      });
      addFx({ k: "hit", fxKind: "frost", gx: h.gx, gy: h.gy, gz: 1.1, word: "❄️ 暴风雪降 Lv" + lv, big: true, burstCol: "#b4f2ff", wordOl: "#153d88", scale: 1.08, life: 0.55, max: 0.55, seed: 929 });
    } else if (k === "blue_mammoth") {
      // Summon Mammoth Warriors!
      const mN = 1 + Math.floor(lv / 2);
      for (let mi = 0; mi < mN; mi++) {
        spawnHeroCompanion("mammoth", "mammoth", 12 + lv * 2);
      }
      addFx({ k: "hit", fxKind: "frost", gx: h.gx, gy: h.gy, gz: 1.0, word: "🦣 猛犸战团!", big: true, burstCol: "#b4f2ff", wordOl: "#153d88", scale: 1.0, life: 0.5, max: 0.5, seed: 939 });
    } else if (k === "coco_torn") {
      // Water Tornado (plus translucent Water Dragon at lv>=3!)
      const ang = Math.atan2(firstTgt.gy - h.gy, firstTgt.gx - h.gx);
      game.activeZones.push({
        kind: "waterTornado", gx: h.gx + Math.cos(ang) * 0.5, gy: h.gy + Math.sin(ang) * 0.4,
        vx: Math.cos(ang) * 3.8, vy: Math.sin(ang) * 3.0, t: 0, dur: 2.2 + lv * 0.25, tick: 0,
        dmg: Math.round(dmgBase * 0.85), hasDragon: lv >= 3, seed: 950, lv
      });
      addFx({ k: "hit", fxKind: "water", gx: h.gx, gy: h.gy, gz: 0.95, word: "🌀 水龙卷 Lv" + lv, big: true, burstCol: "#5cd0ff", wordOl: "#0e437a", scale: 1.0, life: 0.48, max: 0.48, seed: 952 });
    } else if (k === "coco_tsunami") {
      // Giant Tsunami Ult: overhead swirling whirlpool charging splashes -> giant tsunami with octopus/ship -> lingering whirlpool!
      game.activeZones.push({
        kind: "giantTsunami", gx: h.gx, gy: h.gy, t: 0, chargeDur: 1.8, waveDur: 1.35, whirlDur: 3.5 + lv * 0.4,
        tick: 0, dmg: Math.round(dmgBase * 1.15), hasShip: lv >= 4, seed: 960, lv
      });
      addFx({ k: "hit", fxKind: "water", gx: h.gx, gy: h.gy, gz: 1.05, word: "🌊 狂澜漩涡 Lv" + lv, big: true, burstCol: "#5cd0ff", wordOl: "#0e437a", scale: 1.05, life: 0.52, max: 0.52, seed: 965 });
    } else if (k === "coco_bubble") {
      // Bubble Prison trapping slimes!
      let trapped = 0;
      for (const e of game.enemies) {
        if (e.hp > 0 && trapped < 3 + lv && Math.hypot(e.gx - h.gx, e.gy - h.gy) <= 4.2) {
          trapped++;
          e.bubbleT = 1.6 + lv * 0.2;
          damageEnemy(e, Math.round(dmgBase * 0.9), false, { fxKind: "water", dirX: e.gx - h.gx, dirY: e.gy - h.gy });
        }
      }
      addFx({ k: "shockRing", fxKind: "water", gx: h.gx, gy: h.gy, gz: 0.06, r: 2.2, col: "#3caeff", innerCol: "#e6f9ff", life: 0.42, max: 0.42, seed: 970 });
    } else if (k === "taro_spire") {
      // Sky Stone Spires!
      const sN = 1 + lv;
      const tgts = [...game.enemies].filter(e => e.hp > 0);
      for (let i = 0; i < sN; i++) {
        const tg = tgts[i % Math.max(1, tgts.length)];
        const sx = tg ? tg.gx : firstTgt.gx + (i - 1) * 0.9;
        const sy = tg ? tg.gy : firstTgt.gy;
        addFx({ k: "boulderDrop", gx: sx, gy: sy, gz: 0, delay: i * 0.06, life: 0.50, max: 0.50, seed: 980 + i });
        addFx({ k: "rockSpike", gx: sx, gy: sy, gz: 0, h: 0.85, life: 0.65, max: 0.65, seed: 990 + i });
        game.rubbles.push({ gx: sx, gy: sy, life: 4.5, max: 4.5, dmg: Math.round(dmgBase * 0.35), seed: 995 + i });
        if (tg && tg.hp > 0) damageEnemy(tg, Math.round(dmgBase * 1.15), false, { fxKind: "rock", dirX: 0, dirY: 1, knock: 0.32 });
      }
    } else if (k === "taro_volcano") {
      // Giant Mountain -> Volcano eruption -> flaming rock shards + path-blocking boulders + Gopher/Mole duelist!
      const vx = clamp(firstTgt.gx, 1.4, COLS - 1.4), vy = clamp(firstTgt.gy, 1.2, ROWS - 1.2);
      game.activeZones.push({
        kind: "volcano", gx: vx, gy: vy, t: 0, eruptT: 1.1, dur: 4.8 + lv * 0.5, erupted: false,
        dmg: Math.round(dmgBase * 1.2), hasMole: lv >= 3, seed: 1005, lv
      });
      addFx({ k: "hit", fxKind: "rock", gx: vx, gy: vy, gz: 1.15, word: "🌋 火山山岳 Lv" + lv, big: true, burstCol: "#ff8842", wordOl: "#3e2614", scale: 1.08, life: 0.55, max: 0.55, seed: 1009 });
    } else if (k === "taro_quake") {
      // Mass petrify quake!
      const nr = 2.6 + lv * 0.25;
      addFx({ k: "shockRing", fxKind: "rock", gx: h.gx, gy: h.gy, gz: 0.05, r: nr, col: "#7a583c", innerCol: "#e4c296", life: 0.42, max: 0.42, seed: 1020 });
      for (const e of game.enemies) {
        if (e.hp > 0 && Math.hypot(e.gx - h.gx, e.gy - h.gy) <= nr) {
          applyRockShell(e, 2);
          damageEnemy(e, Math.round(dmgBase * 1.0), false, { fxKind: "rock", dirX: e.gx - h.gx, dirY: e.gy - h.gy, knock: 0.25 });
        }
      }
    } else if (k === "sword_spin") {
      // Madly spinning saw-blade sword(s) for 6s; max lv summons multiple saw blades flying in from all directions!
      const blades = lv >= 4 ? (3 + (lv - 3) * 2) : 1;
      for (let bi = 0; bi < blades; bi++) {
        game.activeZones.push({
          kind: "sawSword", gx: h.gx, gy: h.gy, ang: (bi / blades) * TAU,
          orbitR: bi === 0 ? 1.45 : 2.35, flyFromEdge: bi > 0, t: 0, dur: 6.0, tick: 0,
          dmg: Math.round(dmgBase * 0.72), seed: 1050 + bi * 17, lv
        });
      }
      addFx({ k: "hit", fxKind: "slash", gx: h.gx, gy: h.gy, gz: 0.95, word: "⚙️ 狂旋剑轮 Lv" + lv, big: true, burstCol: "#7cf4ff", wordOl: "#1a2858", scale: 1.0, life: 0.45, max: 0.45, seed: 1059 });
    } else if (k === "sword_ride") {
      // Rides a flying sword up into the air (~14-30s scaled cleanly so you can enjoy ramming + orbiting swords; 28s at lv>=4!),
      // rams & stabs enemies, several swords gather around & dart out wildly; Max Lv triggers Sky Sword Formation (剑阵)!
      const rideDur = 14 + lv * 4; // up to 30s at Lv5!
      h.ridingSwordT = rideDur;
      game.activeZones.push({
        kind: "swordOrbiters", dur: rideDur, t: 0, tick: 0,
        count: 3 + lv, dmg: Math.round(dmgBase * 0.78), formation: lv >= 5, formTick: 0, seed: 1070, lv
      });
      addFx({ k: "hit", fxKind: "slash", gx: h.gx, gy: h.gy, gz: 1.15, word: "⚔️ 御剑飞仙 Lv" + lv, big: true, burstCol: "#ffe866", wordOl: "#1a2858", scale: 1.08, life: 0.55, max: 0.55, seed: 1079 });
    } else if (k === "sword_rain") {
      // Ring/row of flying swords stabbing down into the ground before exploding into crisp light cuts!
      const sCount = 5 + lv * 2;
      const center = firstTgt;
      for (let si = 0; si < sCount; si++) {
        const a = (si / sCount) * TAU;
        const rr = 0.75 + (si % 2) * 0.85;
        const sx = clamp(center.gx + Math.cos(a) * rr, 0.3, COLS - 0.3);
        const sy = clamp(center.gy + Math.sin(a) * rr * 0.72, 0.3, ROWS - 0.3);
        game.activeZones.push({
          kind: "plantedSword", gx: sx, gy: sy, t: 0, dropDur: 0.18 + si * 0.04, stickDur: 0.55,
          exploded: false, dmg: Math.round(dmgBase * 0.92), seed: 1090 + si * 7
        });
      }
      addFx({ k: "hit", fxKind: "slash", gx: h.gx, gy: h.gy, gz: 1.05, word: "🗡️ 万剑齐发 Lv" + lv, big: true, burstCol: "#72f5ff", wordOl: "#1a2858", scale: 1.04, life: 0.5, max: 0.5, seed: 1099 });
    }
    syncSkillBtn();
    return true;
  }

  function grantHeroXp(amt = 1) {
    if (!game || !game.hero || game.over) return;
    const h = game.hero;
    h.xp += amt * (h.xpMul || 1);
    if (h.xp >= h.xpNext && !game.levelPick) {
      h.xp -= h.xpNext;
      h.level += 1;
      h.xpNext = Math.round(h.xpNext * 1.24 + 2);
      // Balance v20: every level-up also grows the hero (+10% damage, +8 max HP, heal 20)
      h.dmgMul += 0.10; h.maxHp += 8; h.hp = Math.min(h.maxHp, h.hp + 20);
      openLevelUpPicker();
    }
    syncHud();
  }

  function openLevelUpPicker() {
    const h = game.hero;
    const candidates = [];
    // Offer skill unlock/upgrade cards (up to Lv5) + creative behavior perks!
    h.skills.forEach((sk, slotIdx) => {
      if (sk.lv < 5) {
        const nextLv = sk.lv + 1;
        candidates.push({
          id: sk.id + "_lv" + nextLv,
          ico: sk.ico,
          title: sk.lv === 0 ? `解锁技能 · ${sk.lbl}` : `技能升级 · ${sk.lbl} Lv.${nextLv}`,
          desc: sk.lv === 0 ? sk.desc : (nextLv === 5 ? "满级质变！更强特效、更多层数与形态进化，冷却更短！" : "增加特效细节层数与伴随效果，冷却更短！"),
          apply: (heroObj) => {
            heroObj.skills[slotIdx].lv = nextLv;
            heroObj.skills[slotIdx].cdLeft = 0;
          }
        });
      }
    });
    const perkShuffled = [...PERK_POOL].sort(() => Math.random() - 0.5);
    // Guarantee at least 1 skill card (if available) + 2 varied creative perks!
    const choices = [];
    if (candidates.length > 0) {
      choices.push(candidates[Math.floor(Math.random() * candidates.length)]);
    }
    for (const p of perkShuffled) {
      if (choices.length >= 3) break;
      if (!choices.some(c => c.id === p.id)) choices.push(p);
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
    AudioSys.sfxPick();
    document.getElementById("levelup-overlay").classList.add("hidden");
    addFx({
      k: "pop", gx: game.hero.gx, gy: game.hero.gy, gz: 1.55,
      text: "⭐ " + u.title.split("·")[0].trim() + "!", col: "#ffe44a", life: 0.95, max: 0.95, seed: Math.floor(Math.random() * 9999)
    });
    spawnDustPuff(game.hero.gx, game.hero.gy);
    syncHud();
  }

  function showOverlay(won) {
    const ov = document.getElementById("overlay");
    document.getElementById("ov-title").textContent = won ? "Victory! 🎉" : "小窝失守! 💥";
    document.getElementById("ov-sub").textContent =
      game.hero.def.name + " 在无尽模式坚持到了第 " + game.waveNum + " 波，击败了 " + game.slimesKilled + " 只史莱姆！";
    document.getElementById("ov-btn").textContent = "Try again / 再玩一次";
    ov.classList.remove("hidden");
  }

  function lanePos(laneIdx, dist, flyMeta = null) {
    if (flyMeta) {
      const p = clamp(dist / flyMeta.totalLen, 0, 1);
      return [lerp(flyMeta.sx, flyMeta.tx, p), lerp(flyMeta.sy, flyMeta.ty, p)];
    }
    const pts = LANES[laneIdx] || PATH;
    const maxD = pts.length - 1;
    const clamped = clamp(dist, 0, maxD);
    const i = Math.min(maxD - 1, Math.floor(clamped));
    const f = clamped - i;
    const a = pts[i], b = pts[i + 1];
    return [lerp(a[0] + 0.5, b[0] + 0.5, f), lerp(a[1] + 0.5, b[1] + 0.5, f)];
  }
  /* ================= Unique Per-Element FX & Combat Helpers ================= */
  function addFx(obj) { game.fx.push(obj); }

  function spawnCastDoodle(gx, gy, gz, dx, dy, col, fxKind = "fire") {
    addFx({ k: "cast", fxKind, gx, gy, gz, dx, dy, col: col || "#ffe24a", life: 0.22, max: 0.22, seed: Math.floor(Math.random() * 9999) });
  }

  function applyRockShell(e, stacks = 1) {
    if (!e || e.hp <= 0) return;
    e.rockShell = Math.min(3, (e.rockShell || 0) + stacks);
    if (e.rockShell >= 3 && !e.petrified) {
      e.petrified = true;
      e.statueHp = 4; // Other slimes behind must hit the statue 4 times to break it!
      e.hitFlash = 0.7;
      e.hitFlashCol = "#c8b29c";
      spawnDmgPop(e.gx, e.gy - 0.2, e.gz + 1.45, "🗿 石化!", "#e8d6c0", true);
      addFx({ k: "shockRing", fxKind: "rock", gx: e.gx, gy: e.gy, gz: 0.05, r: 0.95, col: "#7a583c", innerCol: "#e8d6c0", life: 0.34, max: 0.34, seed: Math.floor(Math.random() * 999) });
    }
  }

  function spawnImpactDoodle(gx, gy, gz, isKill, opt = {}) {
    const words = opt.words || ["POW!", "BOOM!", "轰!", "炸!"];
    const word = words[Math.floor(Math.random() * words.length)];
    const fxKind = opt.fxKind || "fire";
    const burstCol = opt.burstCol || "#ffe24a";
    const isCrit = !!(opt.crit || isKill);
    const bScale = (opt.blastScale || 1.0) * 1.32 * (isCrit ? 1.26 : 1.10);

    // Punchy hit-stop + strictly <= 1.6px micro-shake!
    triggerHitStop(isCrit ? 0.082 : 0.060);
    triggerShake(isCrit ? 1.6 : 1.1, 0.06);
    if (isCrit) triggerScreenFlash(fxKind === "frost" ? "#dff6ff" : (fxKind === "lightning" ? "#fff8b8" : "#ffe6c4"), 0.07);
    AudioSys.sfxHit(fxKind, isCrit);

    // 1. Intense 10-ray contact spark + bright white flash core right ON the target!
    addFx({
      k: "impactSpark", fxKind, gx, gy, gz: gz + 0.14,
      col: fxKind === "frost" ? "#b4f0ff" : (fxKind === "lightning" ? "#fff45e" : (fxKind === "water" ? "#7cd8ff" : (fxKind === "slash" ? "#7cf5ff" : "#ffa83a"))),
      scale: bScale * (isCrit ? 1.48 : 1.24),
      life: 0.28, max: 0.28, seed: Math.floor(Math.random() * 9999)
    });

    // 2. BIG EXPLOSIVE 3-layer starburst comic burst + bold comic words (v11 signature, scaled up!)
    const colMap = {
      fire: ["#6b1808", "#ff6d28", "#fff099"],
      lightning: ["#13428c", "#26a8ff", "#fff8a6"],
      frost: ["#153d88", "#62c8ff", "#ffffff"],
      water: ["#0e437a", "#38aaff", "#e6f9ff"],
      rock: ["#3e2614", "#9e7c5c", "#e8d6c0"],
      slash: ["#1a2858", "#4eeeff", "#ffffff"]
    };
    const [rimCol, midCol, coreCol] = colMap[fxKind] || colMap.fire;
    let offX = (Math.random() - 0.5) * 0.14, offY = -0.10;
    if (game && game.hero) {
      const dx = gx - game.hero.gx, dy = gy - game.hero.gy;
      const d = Math.hypot(dx, dy);
      if (d > 0.05 && d < 2.4) { offX = (dx / d) * 0.34; offY = (dy / d) * 0.24 - 0.08; }
    }
    addFx({
      k: "hit", fxKind, gx: gx + offX, gy: gy + offY, gz: gz + 0.46,
      word, big: isCrit, burstCol: opt.burstCol || midCol, wordOl: opt.wordOl || rimCol,
      scale: bScale * (isCrit ? 1.30 : 1.06),
      life: 0.44, max: 0.44, seed: Math.floor(Math.random() * 9999)
    });

    // 3. Double concentric expanding shockwaves!
    if (fxKind === "frost") {
      addFx({ k: "frostRing", gx, gy, gz: 0.04, r: (opt.splash || 1.65) * bScale, life: 0.46, max: 0.46, seed: Math.floor(Math.random() * 9999) });
    } else {
      addFx({ k: "shockRing", fxKind, gx, gy, gz: 0.04, r: 1.38 * bScale, col: rimCol, innerCol: coreCol, life: 0.40, max: 0.40, seed: Math.floor(Math.random() * 9999) });
    }
    addFx({ k: "shockRing", fxKind, gx, gy, gz: 0.06, r: 0.92 * bScale, col: "#fffef0", innerCol: midCol, life: 0.24, max: 0.24, seed: Math.floor(Math.random() * 9999) });

    // 4. Lots of chunky cardboard/crayon debris flying outward with gravity!
    const chipN = isCrit ? 22 : 14;
    for (let i = 0; i < chipN; i++) {
      const ang = (i / chipN) * TAU + (Math.random() - 0.5) * 0.42;
      const spd = 2.1 + Math.random() * 2.4;
      addFx({
        k: "cardChip", fxKind, gx, gy, gz: gz + 0.22,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd * 0.72, vz: 2.2 + Math.random() * 2.2,
        rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 18,
        col: i % 2 ? coreCol : midCol, rimCol, life: 0.44 + Math.random() * 0.16, max: 0.60, seed: Math.floor(Math.random() * 9999)
      });
    }
  }

  function spawnPaperConfetti(gx, gy, tint) {
    const cols = [tint || "#86de44", "#ffe24a", "#ff7252", "#62c0ff"];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + Math.random() * 0.5;
      const spd = 1.1 + Math.random() * 1.5;
      addFx({
        k: "confetti", gx, gy, gz: 0.28,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd * 0.72, vz: 1.6 + Math.random() * 1.4,
        rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 12,
        col: cols[i % cols.length], life: 0.48 + Math.random() * 0.18, max: 0.66, seed: Math.floor(Math.random() * 9999)
      });
    }
  }

  function spawnStepFx(gx, gy, vx, vy, who, tint, heavy = false) {
    const len = Math.hypot(vx, vy);
    const ux = len > 1e-4 ? vx / len : 1;
    const uy = len > 1e-4 ? vy / len : 0;
    if (who === "slime") {
      // Landing squash ring + goo splat + takeoff/landing dust!
      addFx({ k: "slimePrint", gx, gy, gz: 0.01, col: tint || "#76d038", scale: heavy ? 1.5 : 1.0, life: 1.1, max: 1.1, seed: Math.floor(Math.random() * 9999) });
      addFx({ k: "shockRing", fxKind: "slime", gx, gy, gz: 0.02, r: heavy ? 0.85 : 0.48, col: tint || "#76d038", innerCol: "#ffffff", life: 0.26, max: 0.26, seed: Math.floor(Math.random() * 9999) });
      spawnDustPuff(gx, gy, !heavy);
      if (heavy) {
        triggerShake(1.3, 0.045);
        AudioSys.sfxHop(true);
      }
    } else {
      addFx({ k: "footprint", gx, gy, gz: 0.01, ang: Math.atan2(uy, ux), life: 0.85, max: 0.85, seed: Math.floor(Math.random() * 9999) });
      spawnDustPuff(gx - ux * 0.20, gy - uy * 0.12, true);
    }
  }

  function spawnTakeoffFx(gx, gy, tint, heavy = false) {
    spawnDustPuff(gx, gy, !heavy);
    const n = heavy ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      addFx({
        k: "stepScrap", gx, gy, gz: 0.08,
        vx: Math.cos(a) * 0.9, vy: Math.sin(a) * 0.65, vz: 1.0 + Math.random() * 0.7,
        col: i % 2 ? (tint || "#86de44") : "#d2a266", life: 0.30, max: 0.30, seed: i * 11
      });
    }
  }

  function spawnDeathPuff(gx, gy, tint, reward, xpVal = 1) {
    addFx({ k: "puff", gx, gy, gz: 0.34, tint: tint || "#86de44", life: 0.44, max: 0.44, seed: Math.floor(Math.random() * 9999) });
    spawnPaperConfetti(gx, gy, tint);
    if (reward) {
      addFx({ k: "pop", gx: gx + 0.24, gy, gz: 1.25, text: "+" + reward + "🪙", col: "#ffd83a", life: 0.72, max: 0.72, seed: Math.floor(Math.random() * 9999) });
    }
    grantHeroXp(xpVal || 1);
    game.scorch.push({ gx, gy, life: 1.6, max: 1.6, seed: Math.floor(Math.random() * 999) });
  }

  function spawnDustPuff(gx, gy, small = false) {
    addFx({ k: "dust", gx, gy, gz: 0.05, small, life: small ? 0.26 : 0.34, max: small ? 0.26 : 0.34, seed: Math.floor(Math.random() * 9999) });
  }

  function spawnDmgPop(gx, gy, gz, text, col, crit = false) {
    addFx({
      k: "pop", gx, gy, gz,
      vx: (Math.random() - 0.5) * (crit ? 0.85 : 0.55),
      vy: (Math.random() - 0.5) * 0.22,
      vz: crit ? 2.45 : 1.75,
      text, col: col || "#ffe45c", crit,
      life: crit ? 0.68 : 0.54, max: crit ? 0.68 : 0.54,
      seed: Math.floor(Math.random() * 9999)
    });
  }

  /* ================= Simulation ================= */
  function stepHeroMovement(hero, dt) {
    if (hero.deadT > 0) return;

    // Sword dash forward -> slash -> return animation!
    if (hero.dashState) {
      const ds = hero.dashState;
      ds.t += dt;
      if (Math.random() < 0.7) {
        hero.afterimages.push({ gx: hero.gx, gy: hero.gy, gz: hero.gz, facing: hero.facing, alpha: 0.52 });
      }
      if (ds.phase === "in") {
        const p = clamp(ds.t / ds.inDur, 0, 1);
        hero.gx = lerp(ds.ox, ds.tx, p);
        hero.gy = lerp(ds.oy, ds.ty, p);
        hero.gz = Math.sin(p * Math.PI) * 0.35;
        if (p >= 1) {
          ds.phase = "out";
          ds.t = 0;
          // Execute Sword Arc Slash at peak!
          const ang = Math.atan2(ds.dy, ds.dx);
          addFx({ k: "swordSlash", gx: ds.slashGx, gy: ds.slashGy, gz: 0.36, ang, r: 1.05, life: 0.26, max: 0.26, seed: Math.floor(Math.random() * 999) });
          addFx({ k: "swordSlash", gx: ds.slashGx, gy: ds.slashGy, gz: 0.36, ang: ang + 0.14, r: 0.85, inner: true, life: 0.22, max: 0.22, seed: Math.floor(Math.random() * 999) });
          if (ds.target && ds.target.hp > 0) {
            damageEnemy(ds.target, ds.dmg, false, { fxKind: "slash", dirX: ds.dx, dirY: ds.dy, knock: 0.22, crit: ds.crit });
          }
          // Cleave nearby slimes in arc
          for (const e of game.enemies) {
            if (e !== ds.target && e.hp > 0 && Math.hypot(e.gx - ds.slashGx, e.gy - ds.slashGy) <= 1.15) {
              damageEnemy(e, Math.round(ds.dmg * 0.65), false, { fxKind: "slash", dirX: e.gx - hero.gx, dirY: e.gy - hero.gy, knock: 0.16 });
            }
          }
          spawnImpactDoodle(ds.slashGx, ds.slashGy, 0.36, ds.target && ds.target.hp <= 0, { fxKind: "slash", words: ["SLASH!", "斩!"], crit: ds.crit });
        }
      } else {
        const p = clamp(ds.t / ds.outDur, 0, 1);
        hero.gx = lerp(ds.tx, ds.ox, p);
        hero.gy = lerp(ds.ty, ds.oy, p);
        hero.gz = Math.sin((1 - p) * Math.PI) * 0.20;
        if (p >= 1) {
          hero.gx = ds.ox; hero.gy = ds.oy; hero.gz = 0;
          hero.dashState = null;
        }
      }
      return;
    }

    let kx = 0, ky = 0;
    if (keys.KeyA || keys.ArrowLeft)  kx -= 1;
    if (keys.KeyD || keys.ArrowRight) kx += 1;
    if (keys.KeyW || keys.ArrowUp)    ky -= 1;
    if (keys.KeyS || keys.ArrowDown)  ky += 1;
    if (joyVec.active && (Math.abs(joyVec.x) > 0.08 || Math.abs(joyVec.y) > 0.08)) {
      kx = joyVec.x; ky = joyVec.y;
    }

    const effSpd = hero.def.moveSpd * (hero.moveMul || 1) * (hero.ridingSwordT > 0 ? 1.38 : 1.0) * (game.iceFloorT > 0 && hero.key === "blueberry" ? 1.25 : 1.0);
    let desVx = 0, desVy = 0;
    const kLen = Math.hypot(kx, ky);
    if (kLen > 0.08) {
      hero.target = null;
      const mag = Math.min(1, kLen);
      const [gdx, gdy] = screenVecToGrid(kx / kLen, ky / kLen, hero.gx, hero.gy);
      desVx = gdx * effSpd * mag;
      desVy = gdy * effSpd * mag;
    } else if (hero.target) {
      const dx = hero.target.gx - hero.gx, dy = hero.target.gy - hero.gy;
      const d = Math.hypot(dx, dy);
      if (d < 0.04) {
        hero.gx = hero.target.gx; hero.gy = hero.target.gy;
        hero.vx = 0; hero.vy = 0; hero.target = null;
      } else {
        const arriveSpd = d < 0.38 ? effSpd * Math.max(0.28, d / 0.38) : effSpd;
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
      if ((hero.moveMul || 1) > 1.05 || hero.ridingSwordT > 0) {
        if (Math.random() < 0.35) hero.afterimages.push({ gx: hero.gx, gy: hero.gy, gz: hero.gz, facing: hero.facing, alpha: 0.40 });
      }
    }

    if (hero.ridingSwordT > 0) {
      hero.gz = 0.82 + Math.sin(simTime * 7) * 0.08;
      hero.waddle = Math.sin(simTime * 6) * 0.06;
    } else if (spd > 0.25) {
      const prevSin = Math.sin(hero.walkPhase);
      hero.walkPhase += dt * (8.5 + spd * 1.4);
      const curSin = Math.sin(hero.walkPhase);
      hero.gz = Math.abs(curSin) * 0.26;
      hero.waddle = Math.sin(hero.walkPhase) * 0.10;
      hero.dustTimer -= dt;
      if ((prevSin * curSin <= 0 || hero.dustTimer <= 0) && spd > 0.5) {
        hero.dustTimer = 0.18;
        spawnStepFx(hero.gx, hero.gy + 0.04, hero.vx, hero.vy, "hero");
      }
    } else {
      hero.gz = lerp(hero.gz, 0, 1 - Math.exp(-16 * dt));
      hero.waddle = lerp(hero.waddle, 0, 1 - Math.exp(-16 * dt));
    }
  }

  function findTargetWithPrio(gx, gy, range, prio = "nearest") {
    let best = null, bestScore = -1e9;
    for (const e of game.enemies) {
      if (e.hp <= 0 || e.spawnT > 0.35) continue;
      const d = Math.hypot(e.gx - gx, e.gy - gy);
      if (d > range) continue;
      let sc = e.dist;
      if (prio === "nearest") sc = -d;
      else if (prio === "maxhp") sc = e.hp;
      else if (prio === "boss") sc = (e.boss ? 10000 : 0) + e.hp;
      if (e.petrified) sc -= 100000; // statues already block the road: shoot live slimes first
      if (sc > bestScore) { bestScore = sc; best = e; }
    }
    return best;
  }

  function findBestTarget(gx, gy, range) {
    return findTargetWithPrio(gx, gy, range, "progress");
  }

  function fireShot(attacker, target, opt) {
    const [psx] = proj(attacker.gx, attacker.gy, 0);
    const [tsx] = proj(target.gx, target.gy, 0);
    attacker.facing = tsx >= psx ? 1 : -1;

    const dx = target.gx - attacker.gx, dy = target.gy - attacker.gy;
    const dist = Math.max(0.1, Math.hypot(dx, dy));
    const ux = dx / dist, uy = dy / dist;
    attacker.atkCount = (attacker.atkCount || 0) + 1;
    const critChance = attacker.critChance || 0.20;
    const isCritRoll = Math.random() < critChance;
    const fxKind = opt.fxKind || "fire";
    const dmgMul = (opt.dmgMul || 1) * (game.iceFloorT > 0 && fxKind === "frost" ? 1.25 : 1.0);
    const dmgVal = Math.round(opt.dmg * dmgMul * (isCritRoll ? 1.55 : 1));
    const multiShot = opt.multiShot || 1;
    const pierce = opt.pierce || 0;
    const mx = attacker.gx + ux * 0.42, my = attacker.gy + uy * 0.38;
    const startZ = (attacker.gz || 0) + 0.52;

    AudioSys.sfxAttack(fxKind);
    spawnCastDoodle(mx, my, startZ, dx, dy, opt.coreCol, fxKind);

    if (fxKind === "lightning") {
      // LEMON CHICK: Small thundercloud emerges from head crest -> head lightning charges it with sparks -> flies to enemy -> strikes!
      attacker.lungeZ = 0.12;
      const count = multiShot;
      for (let si = 0; si < count; si++) {
        const tg = si === 0 ? target : (game.enemies.find(e => e !== target && e.hp > 0) || target);
        game.activeZones.push({
          kind: "lemonCloudAttack",
          gx: attacker.gx + (si - (count - 1) * 0.5) * 0.25, gy: attacker.gy, gz: (attacker.gz || 0) + 0.96,
          startGx: attacker.gx, startGy: attacker.gy, attackerRef: attacker,
          target: tg, tx: tg.gx, ty: tg.gy,
          t: 0, chargeDur: 0.30, flyDur: 0.22, struck: false,
          dmg: dmgVal, crit: isCritRoll, chainCount: opt.chainCount || 0, seed: Math.floor(Math.random() * 9999)
        });
      }
      return;
    }

    if (fxKind === "fire") {
      // CHILI MOUSE: Blows small fire tornado from mouth with tiny flame inside; starts small, grows as it flies, opens on contact + red lingering burn!
      attacker.lungeX = ux * 0.14; attacker.lungeY = uy * 0.10;
      const baseAng = Math.atan2(dy, dx);
      for (let si = 0; si < multiShot; si++) {
        const off = (si - (multiShot - 1) * 0.5) * 0.22;
        const a = baseAng + off;
        game.shots.push({
          kind: "fireTornado", sx: mx, sy: my, sz: startZ, gx: mx, gy: my, gz: startZ,
          target: si === 0 ? target : null,
          tx: si === 0 ? target.gx : clamp(attacker.gx + Math.cos(a) * dist, 0.2, COLS - 0.2),
          ty: si === 0 ? target.gy : clamp(attacker.gy + Math.sin(a) * dist, 0.2, ROWS - 0.2),
          tz: 0.34, t: 0, dur: clamp(dist * 0.13, 0.20, 0.36), crit: isCritRoll,
          fxKind: "fire", dmg: dmgVal, burnDur: opt.burnDur || 3.2,
          pierce, piercedSet: new Set(), trail: [], seed: Math.floor(Math.random() * 9999),
          growMax: 1.15, stormWake: opt.stormWake || 0, splitShots: opt.splitShots || 0, chainCount: opt.chainCount || 0
        });
      }
      return;
    }

    if (fxKind === "frost") {
      // BLUEBERRY OWL: Throws 6-point crystal snowflake; 30% chance to freeze into ice sculpture (0.45s) then cracks off!
      attacker.lungeX = ux * 0.15; attacker.lungeY = uy * 0.12;
      const baseAng = Math.atan2(dy, dx);
      for (let si = 0; si < multiShot; si++) {
        const off = (si - (multiShot - 1) * 0.5) * 0.24;
        const a = baseAng + off;
        game.shots.push({
          kind: "iceSnowflake", sx: mx, sy: my, sz: startZ, gx: mx, gy: my, gz: startZ,
          target: si === 0 ? target : null,
          tx: si === 0 ? target.gx : clamp(attacker.gx + Math.cos(a) * dist, 0.2, COLS - 0.2),
          ty: si === 0 ? target.gy : clamp(attacker.gy + Math.sin(a) * dist, 0.2, ROWS - 0.2),
          tz: 0.36, t: 0, dur: clamp(dist * 0.11, 0.16, 0.30), crit: isCritRoll,
          fxKind: "frost", dmg: dmgVal, slowDur: opt.slowDur || 2.4, freezeChance: 0.30,
          pierce, piercedSet: new Set(), trail: [], seed: Math.floor(Math.random() * 9999),
          stormWake: opt.stormWake || 0, splitShots: opt.splitShots || 0, chainCount: opt.chainCount || 0
        });
      }
      return;
    }

    if (fxKind === "water") {
      // COCO OTTER: Spits small spinning whirlpool onto the ground -> spins & grows -> turns into tsunami wave crashing onto enemy -> turns soaked-blue + leaves damaging/slowing puddle!
      attacker.lungeX = ux * 0.16; attacker.lungeY = uy * 0.12;
      for (let si = 0; si < multiShot; si++) {
        const tg = si === 0 ? target : (game.enemies.find(e => e !== target && e.hp > 0) || target);
        const wx = clamp(attacker.gx + ux * 0.72 + (si - (multiShot - 1) * 0.5) * 0.35, 0.2, COLS - 0.2);
        const wy = clamp(attacker.gy + uy * 0.56, 0.2, ROWS - 0.2);
        game.activeZones.push({
          kind: "cocoWhirlWave", gx: wx, gy: wy, startGx: wx, startGy: wy,
          target: tg, tx: tg.gx, ty: tg.gy,
          t: 0, spinDur: 0.32, surgeDur: 0.22, hit: false,
          dmg: dmgVal, crit: isCritRoll, knock: opt.knock || 0.25, seed: Math.floor(Math.random() * 9999)
        });
      }
      return;
    }

    if (fxKind === "rock") {
      // TARO BEAR: Sky rock falls above hero -> hero headbutts it -> flies to slime -> knockback + shatters into sharp ground rubble + builds rock shell -> petrifies into blocking statue!
      for (let si = 0; si < multiShot; si++) {
        const tg = si === 0 ? target : (game.enemies.find(e => e !== target && e.hp > 0) || target);
        game.activeZones.push({
          kind: "taroSkyRock", attackerRef: attacker, gx: attacker.gx, gy: attacker.gy, gz: 2.2,
          target: tg, tx: tg.gx, ty: tg.gy,
          t: 0, dropDur: 0.18, headbuttDur: 0.08, flyDur: 0.18, hit: false,
          dmg: dmgVal, crit: isCritRoll, knock: opt.knock || 0.28, seed: Math.floor(Math.random() * 9999)
        });
      }
      return;
    }

    if (fxKind === "slash") {
      // CHESTNUT SWORD HERO: Dash forward to slime -> crescent afterimage slash -> return! Plus ranged flying swords if upgraded!
      if (!attacker.dashState && attacker.isHero) {
        const stopDist = Math.max(0.45, dist - 0.58);
        const tx = clamp(attacker.gx + ux * stopDist, 0.2, COLS - 0.2);
        const ty = clamp(attacker.gy + uy * stopDist, 0.2, ROWS - 0.2);
        attacker.dashState = {
          phase: "in", t: 0, inDur: 0.11, outDur: 0.13,
          ox: attacker.gx, oy: attacker.gy, tx, ty,
          slashGx: target.gx, slashGy: target.gy, dx, dy, target, dmg: dmgVal, crit: isCritRoll
        };
      } else {
        // Companion / fallback close slash
        attacker.lungeX = ux * 0.28; attacker.lungeY = uy * 0.22;
        addFx({ k: "swordSlash", gx: target.gx, gy: target.gy, gz: 0.36, ang: Math.atan2(dy, dx), r: 0.95, life: 0.24, max: 0.24, seed: Math.floor(Math.random() * 999) });
        damageEnemy(target, dmgVal, false, { fxKind: "slash", dirX: dx, dirY: dy, knock: 0.18, crit: isCritRoll });
        spawnImpactDoodle(target.gx, target.gy, 0.36, target.hp <= 0, { fxKind: "slash", words: ["SLASH!", "斩!"], crit: isCritRoll });
      }
      // After upgrades, Chestnut also launches ranged flying swords!
      const rsCount = attacker.rangedSwords || 0;
      if (rsCount > 0) {
        const baseAng = Math.atan2(dy, dx);
        for (let ri = 0; ri < rsCount; ri++) {
          const a = baseAng + (ri - (rsCount - 1) * 0.5) * 0.24;
          game.shots.push({
            kind: "flyingSword", sx: mx, sy: my, sz: startZ + 0.18, gx: mx, gy: my, gz: startZ + 0.18,
            target: ri === 0 ? target : null,
            tx: clamp(attacker.gx + Math.cos(a) * (dist + 1.8), 0.2, COLS - 0.2),
            ty: clamp(attacker.gy + Math.sin(a) * (dist + 1.8), 0.2, ROWS - 0.2),
            tz: 0.36, t: 0, dur: 0.24, crit: isCritRoll,
            fxKind: "slash", dmg: Math.round(dmgVal * 0.72), ang: a,
            pierce: 1, piercedSet: new Set(), trail: [], seed: 440 + ri
          });
        }
      }
    }
  }
  function spawnSlimeEntry(kind, laneIdx, opts = {}) {
    const def = ENEMY_DEF[kind] || ENEMY_DEF.z1;
    // Balance v20: waves 1-4 unchanged; afterwards HP grows gently (x7 at W20, x14 at W30, x23 at W40) and speed caps at +40%
    const wN = game.waveNum;
    const waveScaleHp = opts.hpMul || (wN <= 5
      ? (0.48 + (wN - 1) * 0.11)
      : (0.92 + (wN - 5) * 0.20 + Math.pow(wN - 5, 1.75) * 0.03));
    const waveScaleSpd = opts.spdMul || (wN <= 5
      ? (0.74 + (wN - 1) * 0.04)
      : (0.90 + Math.min(0.40, (wN - 5) * 0.02)));
    const bossHpMul = def.boss && !opts.isMini ? 0.85 : 1;
    const isFly = !!def.fly;
    const flyMeta = isFly ? {
      sx: 0.3, sy: 0.7 + hash(game.spawnsDone, game.waveNum * 7) * 5.2,
      tx: 10.4, ty: 3.5, totalLen: 10.6
    } : null;
    const [sx, sy] = opts.gx != null ? [opts.gx, opts.gy] : lanePos(laneIdx, 0, flyMeta);
    const hp = Math.round((opts.hpOverride || def.hp) * waveScaleHp * bossHpMul);
    const e = {
      kind, img: def.img, tint: def.tint, role: def.role || "normal",
      reward: Math.round(def.reward * (1 + Math.min(1.5, game.waveNum * 0.06))), xpVal: def.boss && !opts.isMini ? 6 : 1,
      boss: !!def.boss && !opts.isMini,
      isMini: !!opts.isMini,
      hp, maxHp: hp,
      speed: def.speed * waveScaleSpd * (opts.isMini ? 1.15 : 1),
      size: opts.sizeOverride || def.size,
      lane: laneIdx, flyMeta, fly: isFly, splits: opts.noSplit ? 0 : (def.splits || 0),
      dist: opts.dist || 0, gx: sx, gy: sy, gz: 0, facing: 1,
      spawnT: opts.instant ? 0 : 0.72, spawnMax: 0.72, spawnSeed: Math.floor(Math.random() * 9999),
      hopPhase: Math.random() * TAU, hitFlash: 0, hitFlashCol: "#ffffff",
      hitSquash: 0, hitTilt: 0, hitPushX: 0, hitPushY: 0, landSq: 0,
      burnT: 0, burnTick: 0.35, slowT: 0, soakedT: 0, frozenT: 0, bubbleT: 0, paralyzeT: 0, paraTick: 0.45,
      rockShell: 0, petrified: false, statueHp: 0,
      archerCd: 2.2 + Math.random() * 1.4,
      bossSkillCd: 2.8, bossSkillIdx: 0, skillTag: "蓄势待发", bossChargeT: 0,
      burnSeed: Math.floor(Math.random() * 9999)
    };
    game.enemies.push(e);
    if (!opts.instant) {
      addFx({ k: "spawnVine", gx: sx, gy: sy, gz: 0, tint: def.tint, life: 0.78, max: 0.78, seed: e.spawnSeed });
    }
    game.spawnsDone++;
    return e;
  }

  function stepCompanions(dt) {
    const h = game.hero;
    for (let ci = game.companions.length - 1; ci >= 0; ci--) {
      const c = game.companions[ci];
      if (c.isTemp) {
        c.ttl -= dt;
        if (c.ttl <= 0) {
          spawnDustPuff(c.gx, c.gy, true);
          game.companions.splice(ci, 1);
          continue;
        }
      }
      c.recoil = Math.max(0, c.recoil - dt * 6);
      const isMammoth = c.key === "mammoth";
      const def = isMammoth ? { moveSpd: 3.4, range: 1.9, atkRate: 0.75, dmg: 38, fxKind: "frost" } : (HERO_DEFS[c.key] || HERO_DEFS.chili);
      const anchorX = c.guard ? c.guardGx : (h.deadT > 0 ? 5.5 : h.gx + Math.cos(ci * 2.1 + simTime * 0.4) * 0.95);
      const anchorY = c.guard ? c.guardGy : (h.deadT > 0 ? 5.5 : h.gy + Math.sin(ci * 2.1 + simTime * 0.4) * 0.72);
      const tgt = findTargetWithPrio(c.gx, c.gy, (def.range || 3.0) * (1 + (c.lv - 1) * 0.12), c.prio);

      let moveTx = anchorX, moveTy = anchorY;
      if (!c.guard && tgt && (isMammoth || def.melee)) {
        moveTx = tgt.gx; moveTy = tgt.gy;
      }
      const dx = moveTx - c.gx, dy = moveTy - c.gy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.22) {
        const spd = (def.moveSpd || 4.0) * 0.92;
        c.gx = clamp(c.gx + (dx / dist) * Math.min(dist, spd * dt), 0.25, COLS - 0.25);
        c.gy = clamp(c.gy + (dy / dist) * Math.min(dist, spd * dt), 0.25, ROWS - 0.25);
        c.facing = dx >= 0 ? 1 : -1;
        c.walkPhase += dt * 10;
        c.gz = Math.abs(Math.sin(c.walkPhase)) * 0.18;
      } else {
        c.gz = lerp(c.gz, 0, 1 - Math.exp(-14 * dt));
      }

      c.atkCd -= dt;
      if (c.atkCd <= 0 && tgt) {
        c.atkCd = Math.max(0.28, (def.atkRate || 0.7) / (1 + (c.lv - 1) * 0.2));
        c.recoil = 0.8;
        if (isMammoth) {
          addFx({ k: "shockRing", fxKind: "frost", gx: tgt.gx, gy: tgt.gy, gz: 0.04, r: 0.95, col: "#153d88", innerCol: "#bff2ff", life: 0.28, max: 0.28, seed: c.seed });
          damageEnemy(tgt, Math.round(def.dmg * (1 + (c.lv - 1) * 0.3)), false, { fxKind: "frost", dirX: tgt.gx - c.gx, dirY: tgt.gy - c.gy, knock: 0.35 });
          tgt.slowT = 2.0;
        } else {
          fireShot(c, tgt, {
            ...def,
            dmg: Math.round(def.dmg * 0.52 * (1 + (c.lv - 1) * 0.35)),
            dmgMul: h.dmgMul * 0.75,
            multiShot: 1,
            pierce: 0,
            chainCount: 0
          });
        }
      }
    }
  }

  function step(dt) {
    if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
    if (hitStopCd > 0) hitStopCd = Math.max(0, hitStopCd - dt);
    if (screenFlashT > 0) screenFlashT = Math.max(0, screenFlashT - dt);
    if (!game || !game.started || game.over || game.levelPick) return;
    if (hitStopT > 0) {
      hitStopT = Math.max(0, hitStopT - dt);
      for (const e of game.enemies) if (e.hitFlash > 0.85) e.hitFlash = Math.max(0.85, e.hitFlash - dt * 1.2);
      return;
    }

    if (game.iceFloorT > 0) game.iceFloorT = Math.max(0, game.iceFloorT - dt);
    if (game.darkSkyT > 0) game.darkSkyT = Math.max(0, game.darkSkyT - dt);

    // Endless Wave Spawner!
    if (game.spawnIdx < game.waveEntries.length) {
      game.spawnTimer -= dt;
      if (game.spawnTimer <= 0) {
        const entry = game.waveEntries[game.spawnIdx++];
        spawnSlimeEntry(entry.kind, entry.lane || 0);
        if (game.spawnIdx < game.waveEntries.length) game.spawnTimer = game.waveEntries[game.spawnIdx].delay;
      }
    } else if (game.enemies.length === 0) {
      game.wavePause += dt;
      if (game.wavePause >= 0.85) {
        game.waveNum += 1;
        game.waveEntries = generateWave(game.waveNum);
        game.spawnIdx = 0;
        game.spawnTimer = 0.30;
        game.wavePause = 0;
        // Slight wave recovery if alive
        if (game.hero.deadT <= 0) game.hero.hp = Math.min(game.hero.maxHp, game.hero.hp + Math.round(game.hero.maxHp * 0.25));
        addFx({ k: "pop", gx: 5.5, gy: 2.6, gz: 1.6, text: "🌊 第 " + game.waveNum + " 波!", col: "#ffe45c", crit: true, life: 1.1, max: 1.1, seed: game.waveNum });
        syncHud();
      }
    }

    const hero = game.hero;
    if (hero.deadT > 0) {
      hero.deadT = Math.max(0, hero.deadT - dt);
      if (hero.deadT <= 0) {
        // Respawn at the BOTTOM edge of the map after 5s!
        hero.gx = 5.5; hero.gy = 6.35; hero.gz = 0.4;
        hero.hp = hero.maxHp; hero.invulnT = 1.6;
        spawnDustPuff(hero.gx, hero.gy);
        addFx({ k: "shockRing", fxKind: "lightning", gx: hero.gx, gy: hero.gy, gz: 0.05, r: 1.25, col: "#26a8ff", innerCol: "#fff9b0", life: 0.36, max: 0.36, seed: 777 });
        spawnDmgPop(hero.gx, hero.gy - 0.2, 1.4, "✨ 复活出战!", "#92ff7a", true);
      }
      syncHud();
    } else {
      if (hero.invulnT > 0) hero.invulnT = Math.max(0, hero.invulnT - dt);
      if (hero.ridingSwordT > 0) {
        hero.ridingSwordT = Math.max(0, hero.ridingSwordT - dt);
        // While riding sword, hero rams & stabs enemies in flight path!
        for (const e of game.enemies) {
          if (e.hp > 0 && Math.hypot(e.gx - hero.gx, e.gy - hero.gy) <= 0.85 && (e._ramCd || 0) <= 0) {
            e._ramCd = 0.32;
            damageEnemy(e, Math.round(hero.def.dmg * hero.dmgMul * 0.9), false, { fxKind: "slash", dirX: hero.vx, dirY: hero.vy, knock: 0.22, crit: true });
            addFx({ k: "swordSlash", gx: e.gx, gy: e.gy, gz: 0.45, ang: Math.atan2(hero.vy, hero.vx), r: 0.9, life: 0.22, max: 0.22, seed: Math.floor(Math.random() * 999) });
          }
        }
      }
      stepHeroMovement(hero, dt);
      for (const sk of hero.skills) {
        if (sk.lv > 0 && sk.cdLeft > 0) sk.cdLeft = Math.max(0, sk.cdLeft - dt);
      }
      syncSkillBtn();

      hero.recoil = Math.max(0, hero.recoil - dt * 6.0);
      hero.windup = Math.max(0, hero.windup - dt * 7.5);
      hero.headbuttT = Math.max(0, (hero.headbuttT || 0) - dt);
      hero.lungeX = (hero.lungeX || 0) * Math.exp(-13 * dt);
      hero.lungeY = (hero.lungeY || 0) * Math.exp(-13 * dt);
      hero.lungeZ = (hero.lungeZ || 0) * Math.exp(-14 * dt);
      for (let ai = hero.afterimages.length - 1; ai >= 0; ai--) {
        hero.afterimages[ai].alpha -= dt * 2.4;
        if (hero.afterimages[ai].alpha <= 0) hero.afterimages.splice(ai, 1);
      }

      hero.atkCd -= dt;
      if (hero.atkCd <= 0 && !hero.dashState) {
        const effRange = hero.def.range * (hero.rangeMul || 1) * (hero.rangedSwords > 0 ? 1.35 : 1.0);
        const tgt = findBestTarget(hero.gx, hero.gy, effRange);
        if (tgt) {
          hero.atkCd = hero.def.atkRate / hero.atkSpdMul;
          hero.recoil = 1.0;
          hero.windup = 0.8;
          hero.isHero = true;
          fireShot(hero, tgt, {
            ...hero.def,
            range: effRange,
            dmgMul: hero.dmgMul,
            blastScale: hero.blastScale,
            multiShot: hero.multiShot,
            pierce: hero.pierce,
            chainCount: hero.chainCount,
            critChance: hero.critChance,
            stormWake: hero.stormWake,
            splitShots: hero.splitShots,
            burnDur: (hero.def.burnDur || 0) + (hero.lingeringBurn ? 2.4 : 0),
            rangedSwords: hero.rangedSwords
          });
        }
      }
    }

    stepCompanions(dt);

    // Projectiles (fireTornado, iceSnowflake, miniSplit, flyingSword)
    for (let i = game.shots.length - 1; i >= 0; i--) {
      const s = game.shots[i];
      if (s.target && s.target.hp > 0) {
        s.tx = s.target.gx; s.ty = s.target.gy; s.tz = (s.target.gz || 0) + 0.36;
      }
      s.t += dt / s.dur;
      const p = clamp(s.t, 0, 1);
      s.gx = lerp(s.sx, s.tx, p);
      s.gy = lerp(s.sy, s.ty, p);
      s.gz = s.kind === "fireTornado" ? lerp(s.sz, 0.24, p) : lerp(s.sz, s.tz, p) + Math.sin(p * Math.PI) * 0.42;

      if (!s.lastTrail || Math.hypot(s.gx - s.lastTrail[0], s.gy - s.lastTrail[1]) > 0.08) {
        s.trail.push({ gx: s.gx, gy: s.gy, gz: s.gz });
        s.lastTrail = [s.gx, s.gy];
        if (s.trail.length > 8) s.trail.shift();
      }

      if (s.pierce > 0) {
        for (const e of game.enemies) {
          if (e.hp > 0 && e !== s.target && !s.piercedSet.has(e) && Math.hypot(e.gx - s.gx, e.gy - s.gy) <= 0.55) {
            s.piercedSet.add(e);
            damageEnemy(e, Math.round(s.dmg * 0.78), false, { fxKind: s.fxKind, dirX: s.tx - s.sx, dirY: s.ty - s.sy });
            if (s.burnDur > 0) e.burnT = Math.max(e.burnT, s.burnDur);
            s.pierce--;
            if (s.pierce <= 0) break;
          }
        }
      }

      if (s.t >= 1) {
        const dirX = s.tx - s.sx, dirY = s.ty - s.sy;
        let hitTarget = s.target && s.target.hp > 0 ? s.target : null;
        if (!hitTarget) {
          let bestD = 0.88;
          for (const e of game.enemies) {
            if (e.hp > 0) {
              const d = Math.hypot(e.gx - s.gx, e.gy - s.gy);
              if (d <= bestD) { bestD = d; hitTarget = e; }
            }
          }
        }
        let anyKill = false;
        if (hitTarget) {
          damageEnemy(hitTarget, s.dmg, false, { fxKind: s.fxKind, dirX, dirY, knock: s.knock || 0, crit: !!s.crit });
          if (s.burnDur > 0) hitTarget.burnT = Math.max(hitTarget.burnT, s.burnDur);
          if (s.kind === "iceSnowflake") {
            hitTarget.slowT = Math.max(hitTarget.slowT, s.slowDur || 2.2);
            if (Math.random() < (s.freezeChance || 0.30)) {
              hitTarget.frozenT = Math.max(hitTarget.frozenT, 0.48);
            }
          }
          if (hitTarget.hp <= 0) anyKill = true;
        }

        // Fire Tornado opens & dissipates cleanly on contact!
        if (s.kind === "fireTornado") {
          addFx({ k: "tornadoOpen", gx: s.gx, gy: s.gy, gz: 0.25, scale: s.growMax || 1.15, life: 0.34, max: 0.34, seed: s.seed });
        }

        // Behavior upgrades: split into 2 mini chasers, storm wake, or arc chain!
        if (s.splitShots > 0 && s.kind !== "miniSplit") {
          const near = game.enemies.filter(e => e !== hitTarget && e.hp > 0).sort((a, b) => Math.hypot(a.gx - s.gx, a.gy - s.gy) - Math.hypot(b.gx - s.gx, b.gy - s.gy));
          for (let k = 0; k < Math.min(2, near.length); k++) {
            game.shots.push({
              kind: "miniSplit", sx: s.gx, sy: s.gy, sz: 0.36, gx: s.gx, gy: s.gy, gz: 0.36,
              target: near[k], tx: near[k].gx, ty: near[k].gy, tz: 0.35, t: 0, dur: 0.22,
              fxKind: s.fxKind, dmg: Math.round(s.dmg * 0.48), burnDur: s.burnDur || 0,
              pierce: 0, piercedSet: new Set(), trail: [], seed: s.seed + k + 1
            });
          }
        }
        if (s.stormWake > 0 && s.kind !== "miniSplit") {
          game.activeZones.push({ kind: "miniWake", fxKind: s.fxKind, gx: s.gx, gy: s.gy, r: 0.85, t: 0, dur: 1.1, tick: 0, dmg: Math.round(s.dmg * 0.35), seed: s.seed });
        }
        if (s.chainCount > 0 && s.kind !== "miniSplit") {
          let ch = 0;
          for (const e of game.enemies) {
            if (ch >= s.chainCount) break;
            if (e !== hitTarget && e.hp > 0 && Math.hypot(e.gx - s.gx, e.gy - s.gy) <= 2.3) {
              ch++;
              addFx({ k: "arcLine", gx0: s.gx, gy0: s.gy, gz0: 0.35, gx1: e.gx, gy1: e.gy, gz1: 0.35, fxKind: s.fxKind, life: 0.18, max: 0.18, seed: s.seed + ch });
              damageEnemy(e, Math.round(s.dmg * 0.55), false, { fxKind: s.fxKind, dirX: e.gx - s.gx, dirY: e.gy - s.gy });
            }
          }
        }

        spawnImpactDoodle(s.gx, s.gy, s.gz + 0.1, anyKill, { fxKind: s.fxKind, crit: !!s.crit, words: HERO_DEFS[game.hero.key]?.words });
        game.shots.splice(i, 1);
      }
    }

    // Telegraphs (Boss Thunderstorm warning circles, Archer Arrow Volley warning circles, Boss Fire Breath)
    for (let ti = game.telegraphs.length - 1; ti >= 0; ti--) {
      const tel = game.telegraphs[ti];
      tel.t += dt;
      if (tel.t >= tel.dur) {
        if (tel.kind === "bossThunder") {
          addFx({ k: "skyCloud", gx: tel.gx, gy: tel.gy, gz: 2.6, life: 0.36, max: 0.36, seed: tel.seed });
          addFx({ k: "skyBolt", gx: tel.gx, gy: tel.gy, gz: 0.1, life: 0.32, max: 0.32, seed: tel.seed + 3 });
          addFx({ k: "shockRing", fxKind: "lightning", gx: tel.gx, gy: tel.gy, gz: 0.04, r: tel.r, col: "#13428c", innerCol: "#fff45e", life: 0.32, max: 0.32, seed: tel.seed });
          if (hero.deadT <= 0 && Math.hypot(hero.gx - tel.gx, hero.gy - tel.gy) <= tel.r) {
            damageHero(tel.dmg || 22, "thunder");
          }
        } else if (tel.kind === "arrowVolley") {
          for (let ai = 0; ai < 7; ai++) {
            const a = (ai / 7) * TAU + hash(ai, tel.seed);
            const rr = hash(ai * 3, tel.seed) * tel.r * 0.85;
            addFx({ k: "arrowStick", gx: tel.gx + Math.cos(a) * rr, gy: tel.gy + Math.sin(a) * rr * 0.72, gz: 0, life: 0.55, max: 0.55, seed: tel.seed + ai });
          }
          addFx({ k: "shockRing", fxKind: "fire", gx: tel.gx, gy: tel.gy, gz: 0.04, r: tel.r, col: "#7a2c14", innerCol: "#ffd86b", life: 0.28, max: 0.28, seed: tel.seed });
          if (hero.deadT <= 0 && Math.hypot(hero.gx - tel.gx, hero.gy - tel.gy) <= tel.r) {
            damageHero(tel.dmg || 16, "arrow");
          }
        }
        game.telegraphs.splice(ti, 1);
      }
    }

    // Active Zones (including custom basic attack sequences AND hero ultimates!)
    for (let zi = game.activeZones.length - 1; zi >= 0; zi--) {
      const z = game.activeZones[zi];
      z.t += dt;

      if (z.kind === "lemonCloudAttack") {
        // Phase 1: Emerge & charge from Lemon's head bolt -> Phase 2: Fly to target -> Phase 3: Strike!
        const att = z.attackerRef;
        if (z.target && z.target.hp > 0) { z.tx = z.target.gx; z.ty = z.target.gy; }
        if (z.t < z.chargeDur) {
          if (att && !att.deadT) {
            z.gx = att.gx; z.gy = att.gy; z.gz = (att.gz || 0) + 1.05;
            z.startGx = z.gx; z.startGy = z.gy;
          }
        } else if (z.t < z.chargeDur + z.flyDur) {
          const fp = (z.t - z.chargeDur) / z.flyDur;
          z.gx = lerp(z.startGx, z.tx, fp);
          z.gy = lerp(z.startGy, z.ty, fp);
          z.gz = lerp(1.05, 1.85, fp);
        } else if (!z.struck) {
          z.struck = true;
          z.gx = z.tx; z.gy = z.ty;
          addFx({ k: "skyCloud", gx: z.tx, gy: z.ty, gz: 2.35, life: 0.36, max: 0.36, seed: z.seed });
          addFx({ k: "skyBolt", gx: z.tx, gy: z.ty, gz: 0.28, life: 0.30, max: 0.30, seed: z.seed + 5 });
          if (z.target && z.target.hp > 0) {
            damageEnemy(z.target, z.dmg, false, { fxKind: "lightning", dirX: 0, dirY: 1, crit: z.crit });
          }
          if (z.chainCount > 0) {
            let ch = 0;
            for (const e of game.enemies) {
              if (ch >= z.chainCount) break;
              if (e !== z.target && e.hp > 0 && Math.hypot(e.gx - z.tx, e.gy - z.ty) <= 2.6) {
                ch++;
                addFx({ k: "skyBolt", gx: e.gx, gy: e.gy, gz: 0.25, life: 0.26, max: 0.26, thin: true, seed: z.seed + ch });
                damageEnemy(e, Math.round(z.dmg * 0.55), false, { fxKind: "lightning", dirX: 0, dirY: 1 });
              }
            }
          }
          spawnImpactDoodle(z.tx, z.ty, 0.32, z.target && z.target.hp <= 0, { fxKind: "lightning", crit: z.crit, words: HERO_DEFS.lemon.words });
        }
        if (z.t >= z.chargeDur + z.flyDur + 0.12) game.activeZones.splice(zi, 1);
      } else if (z.kind === "cocoWhirlWave") {
        // Phase 1: Whirlpool spins & grows -> Phase 2: Surges as Tsunami Wave -> turns target blue/soaked + leaves puddle!
        if (z.target && z.target.hp > 0) { z.tx = z.target.gx; z.ty = z.target.gy; }
        if (z.t < z.spinDur) {
          z.gx = z.startGx; z.gy = z.startGy;
        } else if (z.t < z.spinDur + z.surgeDur) {
          const sp = (z.t - z.spinDur) / z.surgeDur;
          z.gx = lerp(z.startGx, z.tx, sp);
          z.gy = lerp(z.startGy, z.ty, sp);
        } else if (!z.hit) {
          z.hit = true;
          game.puddles.push({ gx: z.tx, gy: z.ty, r: 0.92, life: 3.4, max: 3.4, dmg: Math.round(z.dmg * 0.28), tick: 0, seed: z.seed });
          for (const e of game.enemies) {
            if (e.hp > 0 && Math.hypot(e.gx - z.tx, e.gy - z.ty) <= 1.15) {
              e.soakedT = 3.0;
              e.slowT = Math.max(e.slowT, 2.8);
              damageEnemy(e, e === z.target ? z.dmg : Math.round(z.dmg * 0.65), false, { fxKind: "water", dirX: z.tx - z.startGx, dirY: z.ty - z.startGy, knock: z.knock, crit: z.crit && e === z.target });
            }
          }
          spawnImpactDoodle(z.tx, z.ty, 0.28, z.target && z.target.hp <= 0, { fxKind: "water", crit: z.crit, words: HERO_DEFS.coco.words });
        }
        if (z.t >= z.spinDur + z.surgeDur + 0.08) game.activeZones.splice(zi, 1);
      } else if (z.kind === "taroSkyRock") {
        // Phase 1: Sky rock drops above Taro -> Phase 2: Taro headbutts it -> Phase 3: Flies & shatters into ground rubble + rock shell/statue!
        const att = z.attackerRef;
        if (z.target && z.target.hp > 0) { z.tx = z.target.gx; z.ty = z.target.gy; }
        if (z.t < z.dropDur) {
          const dp = z.t / z.dropDur;
          if (att) { z.gx = att.gx; z.gy = att.gy; z.startGx = att.gx; z.startGy = att.gy; }
          z.gz = lerp(2.8, 0.95, dp * dp);
        } else if (z.t < z.dropDur + z.headbuttDur) {
          if (att) { att.headbuttT = 0.16; att.lungeZ = 0.22; }
          z.gz = 1.05;
        } else if (z.t < z.dropDur + z.headbuttDur + z.flyDur) {
          const fp = (z.t - z.dropDur - z.headbuttDur) / z.flyDur;
          z.gx = lerp(z.startGx, z.tx, fp);
          z.gy = lerp(z.startGy, z.ty, fp);
          z.gz = lerp(0.95, 0.32, fp);
        } else if (!z.hit) {
          z.hit = true;
          // Shatter into sharp ground stone rubble damaging walkers!
          game.rubbles.push({ gx: z.tx, gy: z.ty, life: 4.5, max: 4.5, dmg: Math.round(z.dmg * 0.26), tick: 0, seed: z.seed });
          addFx({ k: "rockSpike", gx: z.tx + 0.25, gy: z.ty + 0.05, gz: 0, h: 0.56, life: 0.55, max: 0.55, seed: z.seed });
          if (z.target && z.target.hp > 0) {
            applyRockShell(z.target, 1);
            damageEnemy(z.target, z.dmg, false, { fxKind: "rock", dirX: z.tx - z.startGx, dirY: z.ty - z.startGy, knock: z.knock, crit: z.crit });
          }
          // Balance v20: the shattering boulder also splashes nearby slimes (55% dmg) so Taro keeps up in late waves
          const splR = 1.15 * ((att && att.blastScale) || 1);
          for (const o of game.enemies) {
            if (o !== z.target && o.hp > 0 && Math.hypot(o.gx - z.tx, o.gy - z.ty) <= splR) {
              damageEnemy(o, Math.round(z.dmg * 0.55), false, { fxKind: "rock", dirX: o.gx - z.tx, dirY: o.gy - z.ty, knock: z.knock * 0.6 });
            }
          }
          spawnImpactDoodle(z.tx, z.ty, 0.30, z.target && z.target.hp <= 0, { fxKind: "rock", crit: z.crit, words: HERO_DEFS.taro.words });
        }
        if (z.t >= z.dropDur + z.headbuttDur + z.flyDur + 0.06) game.activeZones.splice(zi, 1);
      } else if (z.kind === "fireFan" || z.kind === "fireWall" || z.kind === "miniWake") {
        z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = 0.34;
          for (const e of game.enemies) {
            if (e.hp <= 0) continue;
            const d = Math.hypot(e.gx - z.gx, e.gy - z.gy);
            const hitR = z.r || z.len * 0.65 || 1.2;
            if (d <= hitR) {
              damageEnemy(e, z.dmg, z.kind === "fireWall", { fxKind: z.fxKind || "fire", dirX: e.gx - z.gx, dirY: e.gy - z.gy });
              if (z.kind === "fireFan" || z.kind === "fireWall") e.burnT = Math.max(e.burnT, 2.5);
            }
          }
        }
        if (z.t >= z.dur) game.activeZones.splice(zi, 1);
      } else if (z.kind === "fireDragon") {
        z.tick -= dt;
        z.gx = clamp(z.gx + Math.cos(z.t * 2.2 + z.seed) * 1.4 * dt, 0.5, COLS - 0.5);
        z.gy = clamp(z.gy + Math.sin(z.t * 1.7 + z.seed) * 1.0 * dt, 0.5, ROWS - 0.5);
        if (z.tick <= 0) {
          z.tick = 0.65;
          const tg = findBestTarget(z.gx, z.gy, 5.5);
          if (tg) {
            game.shots.push({
              kind: "fireTornado", sx: z.gx, sy: z.gy, sz: 0.7, gx: z.gx, gy: z.gy, gz: 0.7,
              target: tg, tx: tg.gx, ty: tg.gy, tz: 0.35, t: 0, dur: 0.28,
              fxKind: "fire", dmg: z.dmg, burnDur: 2.5, pierce: 0, piercedSet: new Set(), trail: [], seed: z.seed + Math.floor(z.t * 10), growMax: 1.0
            });
          }
        }
        if (z.t >= z.dur) game.activeZones.splice(zi, 1);
      } else if (z.kind === "zeusPhantom") {
        z.tick -= dt;
        z.gx = hero.gx + Math.cos(z.t * 1.6 + z.seed) * 0.7;
        z.gy = hero.gy - 0.45 + Math.sin(z.t * 2.1 + z.seed) * 0.25;
        if (z.tick <= 0) {
          z.tick = 0.55;
          const tgts = [...game.enemies].filter(e => e.hp > 0).slice(0, z.boltsPerTick || 2);
          tgts.forEach((tg, idx) => {
            addFx({ k: "skyBolt", gx: tg.gx, gy: tg.gy, gz: 0.25, holy: true, life: 0.26, max: 0.26, seed: z.seed + idx });
            damageEnemy(tg, z.dmg, false, { fxKind: "lightning", dirX: 0, dirY: 1 });
            if (z.canSplit && Math.random() < 0.35 && game.companions.length < 6) {
              spawnHeroCompanion("lemon", "lemon", 14);
            }
          });
        }
        if (z.t >= z.dur) game.activeZones.splice(zi, 1);
      } else if (z.kind === "angryCloud") {
        z.tick -= dt;
        if (z.tick <= 0 && z.strikesLeft > 0) {
          z.tick = 0.48;
          z.strikesLeft--;
          const tg = game.enemies[Math.floor(Math.random() * Math.max(1, game.enemies.length))];
          if (tg && tg.hp > 0) {
            z.gx = lerp(z.gx, tg.gx, 0.6); z.gy = lerp(z.gy, tg.gy, 0.6);
            addFx({ k: "skyBolt", gx: tg.gx, gy: tg.gy, gz: 0.28, life: 0.28, max: 0.28, seed: z.seed + z.strikesLeft });
            damageEnemy(tg, z.dmg, false, { fxKind: "lightning", dirX: 0, dirY: 1, crit: true });
            addFx({ k: "shockRing", fxKind: "lightning", gx: tg.gx, gy: tg.gy, gz: 0.04, r: 1.2, col: "#13428c", innerCol: "#fff45e", life: 0.3, max: 0.3, seed: z.seed });
          }
          if (z.miniBolts) {
            const p = lanePos(0, Math.random() * (PATH.length - 1));
            addFx({ k: "skyBolt", gx: p[0], gy: p[1], gz: 0.2, thin: true, life: 0.2, max: 0.2, seed: z.seed + 77 });
          }
        }
        if (z.t >= z.dur) game.activeZones.splice(zi, 1);
      } else if (z.kind === "frostBreath") {
        z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = 0.35;
          for (const e of game.enemies) {
            if (e.hp > 0 && Math.hypot(e.gx - z.gx, e.gy - z.gy) <= z.r) {
              e.frozenT = Math.max(e.frozenT, z.freezeDur || 1.4);
              e.slowT = Math.max(e.slowT, 3.0);
              damageEnemy(e, z.dmg, false, { fxKind: "frost", dirX: e.gx - z.gx, dirY: e.gy - z.gy });
            }
          }
        }
        if (z.t >= z.dur) game.activeZones.splice(zi, 1);
      } else if (z.kind === "slidingIce") {
        z.gx += z.vx * dt; z.gy += z.vy * dt; z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = 0.16;
          addFx({ k: "iceTrail", gx: z.gx, gy: z.gy, gz: 0.02, life: 1.8, max: 1.8, seed: Math.floor(z.t * 30) });
        }
        for (const e of game.enemies) {
          if (e.hp > 0 && !z.hitSet.has(e) && Math.hypot(e.gx - z.gx, e.gy - z.gy) <= z.r) {
            z.hitSet.add(e);
            e.frozenT = Math.max(e.frozenT, 1.5);
            damageEnemy(e, z.dmg, false, { fxKind: "frost", dirX: z.vx, dirY: z.vy, knock: 0.25 });
          }
        }
        if (z.t >= z.dur) game.activeZones.splice(zi, 1);
      } else if (z.kind === "blizzard") {
        z.tick -= dt;
        if (!z.frozenDone && z.t >= 0.8) {
          z.frozenDone = true;
          for (const e of game.enemies) {
            if (e.hp > 0) {
              e.frozenT = Math.max(e.frozenT, 1.8);
              damageEnemy(e, z.dmg, false, { fxKind: "frost", dirX: 0, dirY: 1, crit: true });
            }
          }
        }
        if (z.tick <= 0) {
          z.tick = 0.32;
          const tg = game.enemies[Math.floor(Math.random() * Math.max(1, game.enemies.length))];
          if (tg && tg.hp > 0) {
            addFx({ k: "iceNovaSpike", gx: tg.gx, gy: tg.gy, gz: 0, h: 0.72, life: 0.45, max: 0.45, seed: Math.floor(Math.random() * 999) });
            damageEnemy(tg, Math.round(z.dmg * 0.6), false, { fxKind: "frost", dirX: 0, dirY: 1 });
          }
        }
        if (z.t >= z.dur) game.activeZones.splice(zi, 1);
      } else if (z.kind === "waterTornado") {
        z.gx += z.vx * dt; z.gy += z.vy * dt; z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = 0.26;
          game.puddles.push({ gx: z.gx, gy: z.gy, r: 0.72, life: 2.2, max: 2.2, dmg: Math.round(z.dmg * 0.22), tick: 0, seed: z.seed });
          for (const e of game.enemies) {
            if (e.hp > 0 && Math.hypot(e.gx - z.gx, e.gy - z.gy) <= 1.2) {
              e.soakedT = 2.6; e.slowT = 2.2;
              damageEnemy(e, z.dmg, false, { fxKind: "water", dirX: z.vx, dirY: z.vy, knock: 0.18 });
            }
          }
        }
        if (z.t >= z.dur) game.activeZones.splice(zi, 1);
      } else if (z.kind === "giantTsunami") {
        z.tick -= dt;
        if (z.t < z.chargeDur) {
          // Swirling overhead whirlpool splashing water
          if (z.tick <= 0) {
            z.tick = 0.35;
            const tg = findBestTarget(z.gx, z.gy, 6.0);
            if (tg) {
              tg.soakedT = 2.0;
              game.puddles.push({ gx: tg.gx, gy: tg.gy, r: 0.75, life: 2.4, max: 2.4, dmg: Math.round(z.dmg * 0.25), tick: 0, seed: z.seed });
              damageEnemy(tg, Math.round(z.dmg * 0.55), false, { fxKind: "water", dirX: tg.gx - z.gx, dirY: tg.gy - z.gy });
            }
          }
        } else if (z.t < z.chargeDur + z.waveDur) {
          const wp = (z.t - z.chargeDur) / z.waveDur;
          z.waveX = lerp(0.5, 10.5, wp);
          if (z.tick <= 0) {
            z.tick = 0.18;
            for (const e of game.enemies) {
              if (e.hp > 0 && Math.abs(e.gx - z.waveX) <= 1.2) {
                e.soakedT = 3.2; e.slowT = 2.8;
                damageEnemy(e, Math.round(z.dmg * 0.8), false, { fxKind: "water", dirX: 1, dirY: 0, knock: 0.45 });
              }
            }
          }
        } else {
          // Lingering whirlpool pulling non-boss slimes & splashing!
          if (z.tick <= 0) {
            z.tick = 0.35;
            for (const e of game.enemies) {
              if (e.hp > 0 && Math.hypot(e.gx - 5.5, e.gy - 3.5) <= 2.4) {
                if (!e.boss) e.dist = Math.max(0, e.dist - 0.16);
                damageEnemy(e, Math.round(z.dmg * 0.48), false, { fxKind: "water", dirX: 5.5 - e.gx, dirY: 3.5 - e.gy });
              }
            }
          }
        }
        if (z.t >= z.chargeDur + z.waveDur + z.whirlDur) game.activeZones.splice(zi, 1);
      } else if (z.kind === "volcano") {
        if (!z.erupted && z.t >= z.eruptT) {
          z.erupted = true;
          addFx({ k: "shockRing", fxKind: "fire", gx: z.gx, gy: z.gy, gz: 0.06, r: 2.3, col: "#3e2614", innerCol: "#ff9a3a", life: 0.45, max: 0.45, seed: z.seed });
          for (const e of game.enemies) {
            if (e.hp > 0 && Math.hypot(e.gx - z.gx, e.gy - z.gy) <= 2.6) {
              applyRockShell(e, 2);
              e.burnT = 2.2;
              damageEnemy(e, z.dmg, false, { fxKind: "rock", dirX: e.gx - z.gx, dirY: e.gy - z.gy, knock: 0.38, crit: true });
            }
          }
          game.rubbles.push({ gx: z.gx, gy: z.gy, r: 1.05, block: true, hp: 5, life: 4.5, max: 4.5, dmg: Math.round(z.dmg * 0.3), tick: 0, seed: z.seed });
        }
        if (z.t >= z.dur) game.activeZones.splice(zi, 1);
      } else if (z.kind === "sawSword") {
        // Spinning saw-blade swords cutting slimes for 6s!
        z.ang += dt * 7.5;
        if (z.flyFromEdge) {
          const p = clamp(z.t / 1.0, 0, 1);
          const rr = lerp(4.8, z.orbitR, Math.sin(p * Math.PI * 0.5));
          z.gx = hero.gx + Math.cos(z.ang) * rr;
          z.gy = hero.gy + Math.sin(z.ang) * rr * 0.72;
        } else {
          z.gx = hero.gx + Math.cos(z.ang) * z.orbitR;
          z.gy = hero.gy + Math.sin(z.ang) * z.orbitR * 0.72;
        }
        z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = 0.24;
          for (const e of game.enemies) {
            if (e.hp > 0 && Math.hypot(e.gx - z.gx, e.gy - z.gy) <= 0.95) {
              addFx({ k: "swordSlash", gx: e.gx, gy: e.gy, gz: 0.35, ang: z.ang, r: 0.75, life: 0.18, max: 0.18, seed: z.seed });
              damageEnemy(e, z.dmg, false, { fxKind: "slash", dirX: e.gx - z.gx, dirY: e.gy - z.gy, knock: 0.12 });
            }
          }
        }
        if (z.t >= z.dur) game.activeZones.splice(zi, 1);
      } else if (z.kind === "swordOrbiters") {
        z.tick -= dt;
        z.formTick += dt;
        if (z.tick <= 0) {
          z.tick = 0.34;
          const tgts = [...game.enemies].filter(e => e.hp > 0);
          for (let si = 0; si < Math.min(z.count, Math.max(1, tgts.length)); si++) {
            const tg = tgts[si % tgts.length];
            if (!tg) continue;
            addFx({ k: "swordSlash", gx: tg.gx, gy: tg.gy, gz: 0.4, ang: si * 1.1 + z.t * 4, r: 0.85, life: 0.20, max: 0.20, seed: z.seed + si });
            damageEnemy(tg, z.dmg, false, { fxKind: "slash", dirX: tg.gx - hero.gx, dirY: tg.gy - hero.gy });
          }
        }
        if (z.formation && z.formTick >= 1.1) {
          z.formTick = 0;
          // Max-level Sky Sword Formation (剑阵) stabbing down in a crisp ring!
          for (let fi = 0; fi < 6; fi++) {
            const a = (fi / 6) * TAU + z.t;
            const fx = clamp(hero.gx + Math.cos(a) * 1.8, 0.3, COLS - 0.3);
            const fy = clamp(hero.gy + Math.sin(a) * 1.25, 0.3, ROWS - 0.3);
            game.activeZones.push({ kind: "plantedSword", gx: fx, gy: fy, t: 0, dropDur: 0.14, stickDur: 0.36, exploded: false, dmg: z.dmg, seed: z.seed + fi });
          }
        }
        if (z.t >= z.dur || hero.deadT > 0) game.activeZones.splice(zi, 1);
      } else if (z.kind === "plantedSword") {
        if (z.t >= z.dropDur + z.stickDur && !z.exploded) {
          z.exploded = true;
          addFx({ k: "swordSlash", gx: z.gx, gy: z.gy, gz: 0.36, ang: 0.6, r: 1.05, life: 0.24, max: 0.24, seed: z.seed });
          addFx({ k: "swordSlash", gx: z.gx, gy: z.gy, gz: 0.36, ang: -0.9, r: 1.05, inner: true, life: 0.24, max: 0.24, seed: z.seed + 1 });
          addFx({ k: "shockRing", fxKind: "slash", gx: z.gx, gy: z.gy, gz: 0.04, r: 0.95, col: "#1a2858", innerCol: "#9af8ff", life: 0.26, max: 0.26, seed: z.seed });
          for (const e of game.enemies) {
            if (e.hp > 0 && Math.hypot(e.gx - z.gx, e.gy - z.gy) <= 1.25) {
              damageEnemy(e, z.dmg, false, { fxKind: "slash", dirX: e.gx - z.gx, dirY: e.gy - z.gy, knock: 0.18, crit: true });
            }
          }
        }
        if (z.t >= z.dropDur + z.stickDur + 0.12) game.activeZones.splice(zi, 1);
      }
    }

    // Water puddles & stone rubbles damaging/slowing slimes walking over them!
    for (let pi = game.puddles.length - 1; pi >= 0; pi--) {
      const p = game.puddles[pi];
      p.life -= dt; p.tick -= dt;
      if (p.tick <= 0) {
        p.tick = 0.45;
        for (const e of game.enemies) {
          if (e.hp > 0 && !e.fly && Math.hypot(e.gx - p.gx, e.gy - p.gy) <= (p.r || 0.85)) {
            e.soakedT = Math.max(e.soakedT, 1.4);
            e.slowT = Math.max(e.slowT, 1.4);
            damageEnemy(e, p.dmg, true, { fxKind: "water" });
          }
        }
      }
      if (p.life <= 0) game.puddles.splice(pi, 1);
    }
    for (let ri = game.rubbles.length - 1; ri >= 0; ri--) {
      const r = game.rubbles[ri];
      r.life -= dt; r.tick -= dt;
      if (r.tick <= 0) {
        r.tick = 0.48;
        for (const e of game.enemies) {
          if (e.hp > 0 && !e.fly && Math.hypot(e.gx - r.gx, e.gy - r.gy) <= (r.r || 0.78)) {
            damageEnemy(e, r.dmg, true, { fxKind: "rock" });
          }
        }
      }
      if (r.life <= 0) game.rubbles.splice(ri, 1);
    }

    // Enemies update: Spawn Vine -> Juicy Hop -> Archer Volley -> Boss Skills -> Petrified Statue Collision!
    for (let i = game.enemies.length - 1; i >= 0; i--) {
      const e = game.enemies[i];
      if (e._ramCd > 0) e._ramCd -= dt;
      e.hitFlash = Math.max(0, e.hitFlash - dt * 5.8);
      e.hitSquash = Math.max(0, (e.hitSquash || 0) - dt * 4.4);
      e.hitTilt = (e.hitTilt || 0) * Math.exp(-11 * dt);
      e.hitPushX = (e.hitPushX || 0) * Math.exp(-9.5 * dt);
      e.hitPushY = (e.hitPushY || 0) * Math.exp(-9.5 * dt);
      if (e.slowT > 0) e.slowT = Math.max(0, e.slowT - dt);
      if (e.soakedT > 0) e.soakedT = Math.max(0, e.soakedT - dt);
      if (e.paralyzeT > 0) {
        e.paralyzeT = Math.max(0, e.paralyzeT - dt);
        e.paraTick -= dt;
        if (e.paraTick <= 0) {
          e.paraTick = 0.55;
          for (const other of game.enemies) {
            if (other !== e && other.hp > 0 && other.paralyzeT > 0 && Math.hypot(other.gx - e.gx, other.gy - e.gy) <= 1.9) {
              addFx({ k: "arcLine", gx0: e.gx, gy0: e.gy, gz0: 0.4, gx1: other.gx, gy1: other.gy, gz1: 0.4, fxKind: "lightning", life: 0.2, max: 0.2, seed: e.burnSeed });
              damageEnemy(other, 18, false, { fxKind: "lightning", dirX: other.gx - e.gx, dirY: other.gy - e.gy });
              break;
            }
          }
        }
      }
      if (e.frozenT > 0) {
        e.frozenT = Math.max(0, e.frozenT - dt);
        if (e.frozenT <= 0) {
          // Ice sculpture visibly cracks off!
          for (let ic = 0; ic < 7; ic++) {
            const a = (ic / 7) * TAU;
            addFx({
              k: "cardChip", fxKind: "frost", gx: e.gx, gy: e.gy, gz: 0.45,
              vx: Math.cos(a) * 1.4, vy: Math.sin(a) * 1.0, vz: 1.5 + Math.random(),
              rot: Math.random() * TAU, vrot: 10, col: "#9ce8ff", rimCol: "#153d88", life: 0.36, max: 0.36, seed: ic
            });
          }
        }
      }
      if (e.burnT > 0) {
        e.burnT -= dt; e.burnTick -= dt;
        if (e.burnTick <= 0) { e.burnTick = 0.40; damageEnemy(e, 10, true, { fxKind: "fire" }); }
      }
      if (e.hp <= 0) {
        game.slimesKilled++;
        const goldGain = Math.round(e.reward * (hero.goldMul || 1));
        game.gold += goldGain; syncHud();
        spawnDeathPuff(e.gx, e.gy, e.tint, goldGain, e.xpVal || 1);
        if (e.splits > 0) {
          for (let sp = 0; sp < e.splits; sp++) {
            spawnSlimeEntry("z1", e.lane, {
              gx: e.gx + (sp === 0 ? -0.22 : 0.22), gy: e.gy, dist: Math.max(0, e.dist - 0.15),
              hpOverride: 34, sizeOverride: 0.72, instant: true, noSplit: true
            });
          }
        }
        game.enemies.splice(i, 1); continue;
      }

      // Vine Spawn toss arc!
      if (e.spawnT > 0) {
        e.spawnT = Math.max(0, e.spawnT - dt);
        const sp = 1 - e.spawnT / e.spawnMax;
        e.gz = Math.sin(sp * Math.PI) * 0.95;
        if (e.spawnT <= 0) {
          e.gz = 0;
          e.landSq = 0.30;
          spawnStepFx(e.gx, e.gy, 1, 0, "slime", e.tint, e.boss || e.role === "armored");
        }
        continue;
      }

      if (e.frozenT > 0 || e.bubbleT > 0) {
        if (e.bubbleT > 0) {
          e.bubbleT = Math.max(0, e.bubbleT - dt);
          e.gz = 0.45 + Math.sin(simTime * 6) * 0.08;
        }
        continue;
      }
      if (e.petrified) {
        e.gz = 0;
        continue; // Stuck in place as stone statue until teammates hit it 3-4 times!
      }

      // Check if blocked by a petrified statue teammate ahead on the path!
      const blocker = game.enemies.find(o => o !== e && o.petrified && o.hp > 0 && Math.hypot(o.gx - e.gx, o.gy - e.gy) <= 0.78);
      if (blocker) {
        e._statueHitCd = (e._statueHitCd || 0) - dt;
        if (e._statueHitCd <= 0) {
          e._statueHitCd = 0.55;
          blocker.statueHp = (blocker.statueHp || 4) - 1;
          blocker.hitFlash = 0.45;
          e.hitPushX = -0.14;
          addFx({ k: "cardChip", fxKind: "rock", gx: blocker.gx, gy: blocker.gy, gz: 0.45, vx: (Math.random() - 0.5) * 1.6, vy: -0.6, vz: 1.8, rot: 0, vrot: 8, col: "#c8b29c", rimCol: "#3e2614", life: 0.34, max: 0.34, seed: 55 });
          if (blocker.statueHp <= 0) {
            blocker.petrified = false;
            blocker.rockShell = 0;
            spawnDmgPop(blocker.gx, blocker.gy, 1.3, "碎裂!", "#ffe08a", false);
          }
        }
        continue;
      }

      // Archer Slime: wide-area telegraphed arrow volley!
      if (e.role === "spitter" && hero.deadT <= 0) {
        e.archerCd -= dt;
        if (e.archerCd <= 0 && Math.hypot(hero.gx - e.gx, hero.gy - e.gy) <= 6.2) {
          e.archerCd = 3.6;
          e.hitSquash = 0.45;
          game.telegraphs.push({ kind: "arrowVolley", gx: hero.gx, gy: hero.gy, r: 1.55, t: 0, dur: 1.05, dmg: 16, seed: Math.floor(Math.random() * 999) });
          spawnDmgPop(e.gx, e.gy, 1.3, "🏹 箭雨!", "#ffd04a", false);
        }
      }

      // Boss Special Abilities: Self-Heal Regen, Summon Mini-Self Minions, Telegraphed Thunderstorm, Charge & Fire Breath!
      if (e.boss) {
        e.bossSkillCd -= dt;
        if (e.bossChargeT > 0) {
          e.bossChargeT -= dt;
          e.dist += e.speed * 2.2 * dt;
        }
        if (e.bossSkillCd <= 0) {
          e.bossSkillCd = 3.6;
          const act = e.bossSkillIdx % 4;
          e.bossSkillIdx++;
          if (act === 0) {
            e.skillTag = "💚 再生恢复";
            const heal = Math.round(e.maxHp * 0.08);
            e.hp = Math.min(e.maxHp, e.hp + heal);
            addFx({ k: "shockRing", fxKind: "slime", gx: e.gx, gy: e.gy, gz: 0.06, r: 1.4, col: "#36a832", innerCol: "#c8ff9a", life: 0.45, max: 0.45, seed: 301 });
            spawnDmgPop(e.gx, e.gy, 1.8, "+" + heal + "💚", "#7eff7a", true);
          } else if (act === 1) {
            e.skillTag = "👾 召唤小弟";
            for (let m = 0; m < 2; m++) {
              spawnSlimeEntry(e.kind, e.lane, {
                gx: e.gx + (m === 0 ? -0.35 : 0.35), gy: e.gy + 0.15, dist: Math.max(0, e.dist - 0.2),
                hpOverride: Math.round(e.maxHp * 0.16), sizeOverride: 0.88, isMini: true, instant: false
              });
            }
          } else if (act === 2) {
            e.skillTag = "🌩️ 雷云天降";
            for (let t = 0; t < 3; t++) {
              const tx = clamp(hero.gx + (t - 1) * 1.25, 0.5, COLS - 0.5);
              const ty = clamp(hero.gy + (t % 2 ? 0.55 : -0.45), 0.5, ROWS - 0.5);
              game.telegraphs.push({ kind: "bossThunder", gx: tx, gy: ty, r: 1.22, t: 0, dur: 1.15, dmg: 22, seed: 400 + t });
            }
          } else {
            e.skillTag = "🔥 冲撞喷火";
            e.bossChargeT = 0.9;
            const bAng = Math.atan2(hero.gy - e.gy, hero.gx - e.gx);
            for (let f = -1; f <= 1; f++) {
              const a = bAng + f * 0.30;
              const fx = clamp(e.gx + Math.cos(a) * 2.2, 0.4, COLS - 0.4);
              const fy = clamp(e.gy + Math.sin(a) * 1.8, 0.4, ROWS - 0.4);
              addFx({ k: "tornadoOpen", gx: fx, gy: fy, gz: 0.3, scale: 0.9, life: 0.38, max: 0.38, seed: 500 + f });
            }
            if (hero.deadT <= 0 && Math.hypot(hero.gx - e.gx, hero.gy - e.gy) <= 2.65) {
              damageHero(20, "fireBreath");
            }
          }
          syncHud();
        }
      }

      // Juicy Hop Movement!
      const prevGx = e.gx, prevGy = e.gy;
      const prevHopIdx = Math.floor(e.hopPhase / Math.PI);
      const spdMul = (e.slowT > 0 ? 0.52 : 1.0) * (e.paralyzeT > 0 ? 0.72 : 1.0) * (game.iceFloorT > 0 ? 0.75 : 1.0);
      e.dist += e.speed * spdMul * dt;
      e.hopPhase += dt * (e.fly ? 5.5 : 8.2) * spdMul;
      const [nx, ny] = lanePos(e.lane, e.dist, e.flyMeta);
      e.gx = nx; e.gy = ny;
      if (Math.abs(nx - prevGx) > 0.002) e.facing = nx >= prevGx ? 1 : -1;
      const hopFrac = (e.hopPhase % Math.PI) / Math.PI;
      if (e.fly) {
        e.gz = 0.52 + Math.sin(e.hopPhase) * 0.14;
      } else {
        // Crouch anticipation at hopFrac < 0.16 -> high juicy arc -> hard landing squash!
        if (hopFrac < 0.16) {
          e.gz = 0;
          e.hopCrouch = 0.24 * (1 - hopFrac / 0.16);
        } else {
          e.hopCrouch = 0;
          const airP = (hopFrac - 0.16) / 0.84;
          e.gz = Math.sin(airP * Math.PI) * (e.boss ? 0.36 : 0.42);
        }
      }
      e.landSq = Math.max(0, (e.landSq || 0) - dt * 4.2);
      if (Math.floor(e.hopPhase / Math.PI) !== prevHopIdx && !e.fly) {
        const heavy = e.boss || e.role === "armored";
        e.landSq = heavy ? 0.40 : 0.28;
        spawnStepFx(e.gx, e.gy, nx - prevGx, ny - prevGy, "slime", e.tint, heavy);
        spawnTakeoffFx(e.gx, e.gy, e.tint, heavy);
      }

      const maxD = e.flyMeta ? e.flyMeta.totalLen : (LANES[e.lane] || PATH).length - 1;
      if (e.dist >= maxD) {
        game.lives = Math.max(0, game.lives - (e.boss ? 3 : 1));
        syncHud();
        spawnImpactDoodle(e.gx, e.gy, 0.45, true, { fxKind: "fire", words: ["失守!"] });
        game.enemies.splice(i, 1);
        if (game.lives <= 0) {
          game.over = true; showOverlay(false); return;
        }
        continue;
      }
    }

    // Dying Element Animations (lightning, fire, frost, water, rock, slash!)
    for (let i = game.dying.length - 1; i >= 0; i--) {
      const d = game.dying[i];
      d.t += dt;
      const p = d.t / d.dur;
      if (d.deathKind === "water") d.gz = p * 1.15;
      if (!d.shattered && p >= 0.72) {
        d.shattered = true;
        if (d.deathKind === "lightning" || d.deathKind === "fire") {
          addFx({ k: "shockRing", fxKind: d.deathKind, gx: d.gx, gy: d.gy, gz: 0.05, r: 1.05, col: d.deathKind === "lightning" ? "#26a8ff" : "#ff5a1f", innerCol: "#fff88a", life: 0.32, max: 0.32, seed: d.dSeed });
          for (let a = 0; a < 14; a++) {
            const ang = (a / 14) * TAU + Math.random() * 0.4;
            addFx({
              k: "ashFlake", gx: d.gx, gy: d.gy, gz: 0.3,
              vx: Math.cos(ang) * 0.9, vy: Math.sin(ang) * 0.45, vz: 0.9 + Math.random(),
              rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 8,
              col: a % 3 === 0 ? "#5a4d46" : "#282220", life: 0.5, max: 0.7, seed: a * 11
            });
          }
        } else if (d.deathKind === "frost") {
          addFx({ k: "frostRing", gx: d.gx, gy: d.gy, gz: 0.05, r: 1.05, life: 0.34, max: 0.34, seed: d.dSeed });
        } else if (d.deathKind === "slash") {
          addFx({ k: "shockRing", fxKind: "slash", gx: d.gx, gy: d.gy, gz: 0.05, r: 0.95, col: "#1a2858", innerCol: "#8af4ff", life: 0.28, max: 0.28, seed: d.dSeed });
        }
      }
      if (d.t >= d.dur) game.dying.splice(i, 1);
    }

    for (let i = game.fx.length - 1; i >= 0; i--) {
      const f = game.fx[i];
      f.life -= dt;
      if (f.k === "cardChip" || f.k === "stepScrap" || f.k === "confetti" || f.k === "ashFlake") {
        f.gx += f.vx * dt; f.gy += f.vy * dt; f.gz += f.vz * dt;
        if (f.gz <= 0) { f.gz = 0; f.vz = Math.abs(f.vz) * 0.38; f.vx *= 0.65; f.vy *= 0.65; }
        f.vz -= (f.k === "cardChip" ? 9.5 : 5.2) * dt;
        if (f.k === "cardChip" || f.k === "confetti" || f.k === "ashFlake") f.rot += f.vrot * dt;
      } else if (f.k === "pop") {
        f.gx += (f.vx || 0) * dt; f.gy += (f.vy || 0) * dt; f.gz += (f.vz ?? 0.9) * dt;
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
    if (e.petrified) dmg = Math.round(dmg * 0.85);
    e.hp -= dmg;
    const fk = hitOpt.fxKind || "fire";
    const isCrit = !!hitOpt.crit || (e.hp <= 0 && !isBurn);
    e.lastDeathKind = fk;
    e.hitFlash = isBurn ? 0.35 : 1.0;
    e.hitFlashCol = isBurn ? "#ff6832" : "#ffffff";
    if (!isBurn) {
      e.hitSquash = isCrit ? 1.24 : 0.95;
      const dLen = Math.hypot(hitOpt.dirX || 0, hitOpt.dirY || 0);
      const ux = dLen > 1e-4 ? hitOpt.dirX / dLen : (Math.random() > 0.5 ? 1 : -1);
      const uy = dLen > 1e-4 ? hitOpt.dirY / dLen : 0;
      const kbResist = e.role === "armored" ? 0.45 : (e.boss ? 0.35 : 1.0);
      e.hitPushX = ux * (isCrit ? 0.42 : 0.30) * kbResist;
      e.hitPushY = uy * (isCrit ? 0.34 : 0.24) * kbResist;
      e.hitTilt = (ux >= 0 ? 1 : -1) * (isCrit ? 0.40 : 0.30);
      const kb = ((hitOpt.knock || 0) + (isCrit ? 0.18 : 0.12)) * kbResist;
      e.dist = Math.max(0, e.dist - kb);
    }
    if (e.hp <= 0 && !e.dyingQueued) {
      e.dyingQueued = true;
      game.dying.push({
        img: e.img, gx: e.gx, gy: e.gy, gz: e.gz, facing: e.facing, size: e.size,
        deathKind: fk, t: 0, dur: fk === "slash" ? 0.56 : 0.70, shattered: false, dSeed: e.burnSeed
      });
    }
    spawnDmgPop(
      e.gx + (isBurn ? -0.30 : 0.28), e.gy - 0.12,
      e.gz + (isBurn ? 1.50 : 1.28),
      (isBurn ? "🔥-" : (isCrit ? "💥-" : "-")) + dmg + (isCrit ? "!" : ""),
      isBurn ? "#ff6828" : (isCrit ? "#ff5228" : "#ffe652"),
      isCrit
    );
  }
  /* ================= Cardboard Standee & Bespoke Crayon FX Renderers ================= */
  function getBoil() { return Math.floor(simTime * 11); }

  function drawCardboardBaseAndShadow(c, sx, sy, wPx, gz, seed, withTab = true, isHero = false) {
    const rx = wPx * 0.44, ry = wPx * 0.16;
    const lift = clamp(1 - gz * 0.55, 0.25, 1);

    c.save();
    c.translate(sx + rx * (0.42 + gz * 0.42), sy + ry * (0.48 + gz * 0.30));
    c.rotate(0.22);
    c.fillStyle = `rgba(42, 64, 20, ${0.34 * lift})`;
    c.beginPath(); c.ellipse(0, 0, rx * (1.12 + gz * 0.18), ry * (1.08 + gz * 0.14), 0, 0, TAU); c.fill();
    c.restore();
    c.save();
    c.fillStyle = `rgba(34, 52, 16, ${0.28 * lift})`;
    c.beginPath(); c.ellipse(sx, sy + 2, rx * 0.88, ry * 0.68, 0, 0, TAU); c.fill();
    c.restore();

    if (isHero) {
      c.save();
      c.setLineDash([7, 5]);
      c.strokeStyle = "#ff7b1c";
      c.lineWidth = 2.6;
      c.beginPath(); c.ellipse(sx, sy, wPx * 0.54, wPx * 0.21, 0, 0, TAU); c.stroke();
      c.restore();
    }

    if (withTab) {
      const tw = wPx * 0.38, th = Math.max(6, wPx * 0.08);
      const lipH = Math.max(7.0, wPx * 0.084);
      c.save();
      c.beginPath();
      c.moveTo(sx - tw, sy - th * 0.4); c.lineTo(sx + tw, sy - th * 0.4);
      c.lineTo(sx + tw * 1.12, sy + th * 0.6); c.lineTo(sx - tw * 1.12, sy + th * 0.6);
      c.closePath();
      c.fillStyle = "#c58e57"; c.fill();
      c.strokeStyle = "#482a12"; c.lineWidth = 1.8; c.stroke();

      const yTop = sy + th * 0.6;
      c.beginPath();
      c.moveTo(sx - tw * 1.12, yTop); c.lineTo(sx + tw * 1.12, yTop);
      c.lineTo(sx + tw * 1.12, yTop + lipH); c.lineTo(sx - tw * 1.12, yTop + lipH);
      c.closePath();
      c.fillStyle = "#2b1305"; c.fill();
      c.save(); c.clip();
      const xL = sx - tw * 1.12, xR = sx + tw * 1.12, yMid = yTop + lipH * 0.50, amp = lipH * 0.27;
      c.strokeStyle = "#dda86c"; c.lineWidth = 1.6;
      c.beginPath();
      for (let fx = xL - 2; fx <= xR + 2; fx += 2) {
        const wy = yMid + Math.sin((fx - xL) * 0.74 + seed) * amp;
        if (fx === xL - 2) c.moveTo(fx, wy); else c.lineTo(fx, wy);
      }
      c.stroke();
      c.fillStyle = "#cfa068"; c.fillRect(xL, yTop, xR - xL, Math.max(1.8, lipH * 0.22));
      c.fillStyle = "#986334"; c.fillRect(xL, yTop + lipH * 0.80, xR - xL, Math.max(1.8, lipH * 0.20));
      c.restore();
      c.strokeStyle = "#3d220e"; c.lineWidth = 1.6; c.stroke();
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
    const turnScale = 1 - Math.min(0.10, Math.abs(totTilt) * 0.45);

    for (let i = 0; i < arr.length; i++) {
      const L = arr[i];
      const dx = camOffX * L.zOff * hPx * 1.0;
      const dy = -L.zOff * hPx * 0.36;
      c.save();
      c.translate(sx + dx, sy + dy);
      if (totTilt) c.rotate(totTilt);
      c.scale(facing * sxScale * turnScale, syScale);
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

  function drawCardboardCutoutChip(c, pts, col, seed, opts = {}) {
    const thickX = opts.thickX ?? 4.0, thickY = opts.thickY ?? 3.0;
    c.save();
    c.translate(thickX, thickY);
    tracePoly(c, pts);
    c.fillStyle = "#6e4420"; c.fill();
    c.strokeStyle = "#3d220e"; c.lineWidth = 1.4; c.stroke();
    c.restore();
    c.save();
    tracePoly(c, pts);
    c.strokeStyle = "#b8824d"; c.lineWidth = 3.5; c.stroke();
    c.restore();
    fillWaxCrayon(c, pts, col, seed, { lw: opts.lw ?? 2.0, softEdge: false });
  }

  function drawCardboardFlame(c, sx, sy, s, seed, boil, col = "#ff5524", innerCol = "#ffe658") {
    const sway = Math.sin(simTime * 13 + seed) * s * 0.14;
    const outerPts = sampleSmoothLoop([
      [sx, sy + s * 0.22], [sx - s * 0.48, sy + s * 0.04], [sx - s * 0.42, sy - s * 0.62],
      [sx + sway, sy - s * 1.12], [sx + s * 0.44, sy - s * 0.60], [sx + s * 0.48, sy + s * 0.06]
    ], 3);
    drawCardboardCutoutChip(c, outerPts, col, seed + boil * 17, { thickX: 3.5, thickY: 2.5, lw: 1.8 });
    const innerPts = sampleSmoothLoop([
      [sx, sy + s * 0.12], [sx - s * 0.24, sy - s * 0.12],
      [sx + sway * 0.65, sy - s * 0.70], [sx + s * 0.24, sy - s * 0.10]
    ], 2);
    fillWaxCrayon(c, innerPts, innerCol, seed + 9 + boil * 17, { lw: 1.2 });
  }

  function drawCrayonSword(c, sx, sy, len, ang, seed = 1, glowCol = "#72f5ff") {
    c.save();
    c.translate(sx, sy);
    c.rotate(ang);
    // Crisp glowing sword-qi rim
    c.fillStyle = glowCol;
    c.beginPath();
    c.moveTo(len * 0.85, 0);
    c.lineTo(len * 0.12, -len * 0.15);
    c.lineTo(-len * 0.12, -len * 0.13);
    c.lineTo(-len * 0.12, len * 0.13);
    c.lineTo(len * 0.12, len * 0.15);
    c.closePath();
    c.fill();
    // Cardboard/steel blade core
    const bPts = [
      [-len * 0.06, -len * 0.09], [len * 0.60, -len * 0.08], [len * 0.80, 0],
      [len * 0.60, len * 0.08], [-len * 0.06, len * 0.09]
    ];
    fillWaxCrayon(c, bPts, "#eef8ff", seed, { lw: 1.8, ol: "#1a2858", softEdge: false });
    // Guard & hilt
    fillWaxCrayon(c, [[-len * 0.14, -len * 0.22], [-len * 0.04, -len * 0.22], [-len * 0.04, len * 0.22], [-len * 0.14, len * 0.22]], "#f0b842", seed + 3, { lw: 1.6, ol: "#3e2614" });
    fillWaxCrayon(c, [[-len * 0.34, -len * 0.06], [-len * 0.14, -len * 0.06], [-len * 0.14, len * 0.06], [-len * 0.34, len * 0.06]], "#8a5228", seed + 5, { lw: 1.5, ol: "#3e2614" });
    c.restore();
  }

  function drawSnowflake(c, sx, sy, r, rot, seed) {
    c.save();
    c.translate(sx, sy);
    c.rotate(rot);
    // Dark cobalt rim for crisp contrast + bright white crystal core!
    c.lineCap = "round";
    for (let pass = 0; pass < 2; pass++) {
      c.strokeStyle = pass === 0 ? "#153d88" : "#eefaff";
      c.lineWidth = pass === 0 ? r * 0.26 : r * 0.13;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const cx = Math.cos(a), syA = Math.sin(a);
        c.beginPath(); c.moveTo(0, 0); c.lineTo(cx * r, syA * r); c.stroke();
        // Fine side barbs
        const bx = cx * r * 0.56, by = syA * r * 0.56;
        c.beginPath();
        c.moveTo(bx + Math.cos(a + 0.7) * r * 0.28, by + Math.sin(a + 0.7) * r * 0.28);
        c.lineTo(bx, by);
        c.lineTo(bx + Math.cos(a - 0.7) * r * 0.28, by + Math.sin(a - 0.7) * r * 0.28);
        c.stroke();
      }
    }
    c.fillStyle = "#ffffff";
    c.beginPath(); c.arc(0, 0, r * 0.18, 0, TAU); c.fill();
    c.restore();
  }

  function drawThunderbolt(c, x0, y0, x1, y1, w, seed, holy = false) {
    const segs = 6;
    const pts = [];
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len, ny = dx / len;
    for (let i = 0; i <= segs; i++) {
      const f = i / segs;
      const off = (i === 0 || i === segs) ? 0 : (hash(i * 11, seed) - 0.5) * w * 2.2;
      pts.push([lerp(x0, x1, f) + nx * off, lerp(y0, y1, f) + ny * off]);
    }
    c.save();
    c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = holy ? "#3d6ab8" : "#13428c";
    c.lineWidth = w * 1.45;
    c.beginPath(); pts.forEach((p, idx) => idx === 0 ? c.moveTo(p[0], p[1]) : c.lineTo(p[0], p[1])); c.stroke();
    c.strokeStyle = holy ? "#fffef0" : "#ffe64a";
    c.lineWidth = w * 0.78;
    c.stroke();
    c.strokeStyle = "#ffffff";
    c.lineWidth = w * 0.34;
    c.stroke();
    // 2 fine branching forks
    for (let b = 1; b <= 3; b += 2) {
      const p = pts[b];
      if (!p) continue;
      const bx = p[0] + (b === 1 ? -1 : 1) * w * 2.4;
      const by = p[1] + w * 2.6;
      c.strokeStyle = holy ? "#fffef0" : "#ffe64a";
      c.lineWidth = Math.max(1.5, w * 0.32);
      c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(bx, by); c.stroke();
    }
    c.restore();
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

    // Storm sky darkening (Lemon Storm ult) & Icy Floor sheen (Blueberry Blizzard ult)
    if (game && game.darkSkyT > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(18, 28, 56, ${Math.min(0.42, game.darkSkyT * 0.25)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (game && game.iceFloorT > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(175, 232, 255, ${Math.min(0.24, game.iceFloorT * 0.03)})`;
      ctx.fillRect(0, H * 0.18, W, H * 0.82);
      ctx.restore();
    }

    // Path chevrons
    ctx.save();
    ctx.strokeStyle = "rgba(138, 98, 56, 0.45)";
    ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
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

    if (game && game.hero && game.hero.target) {
      const [tx, ty, tpp] = proj(game.hero.target.gx, game.hero.target.gy, 0);
      const r = cam.unit * 0.22 * tpp;
      ctx.save();
      ctx.strokeStyle = "#ff6b1c"; ctx.lineWidth = 2.6; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.ellipse(tx, ty, r, r * 0.46, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    // Water Puddles (damage & slow other slimes!)
    if (game) {
      for (const p of game.puddles) {
        const [sx, sy, pp] = proj(p.gx, p.gy, 0);
        const rr = cam.unit * (p.r || 0.8) * pp;
        ctx.save();
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1) * 0.72;
        fillOilPastel(ctx, makeEllipsePts(sx, sy, rr, rr * 0.45, 14, p.seed), "#42b4ff", p.seed, {
          cols: ["#1e7ed8", "#42b4ff", "#9ae4ff"], dabSize: Math.max(6, rr * 0.25), dabAlpha: 0.25, toothAlpha: 0.2, calm: true
        });
        ctx.restore();
      }
      // Sharp Ground Stone Rubble (damages slimes walking over!)
      for (const r of game.rubbles) {
        const [sx, sy, pp] = proj(r.gx, r.gy, 0);
        ctx.save();
        ctx.globalAlpha = clamp(r.life / r.max, 0, 1) * 0.9;
        for (let si = -1; si <= 1; si++) {
          const ox = sx + si * 14 * pp, oy = sy + Math.abs(si) * 4 * pp;
          const sh = (16 - Math.abs(si) * 3) * pp;
          drawCardboardCutoutChip(ctx, [[ox - 6 * pp, oy], [ox, oy - sh], [ox + 6 * pp, oy]], "#9e8874", r.seed + si, { thickX: 2.5, thickY: 2, lw: 1.5 });
        }
        ctx.restore();
      }
      // Telegraphed Warning Circles (Boss Thunderstorm & Archer Arrow Volley!)
      for (const tel of game.telegraphs) {
        const [sx, sy, pp] = proj(tel.gx, tel.gy, 0.02);
        const rr = cam.unit * tel.r * pp;
        const prog = clamp(tel.t / tel.dur, 0, 1);
        ctx.save();
        ctx.fillStyle = tel.kind === "bossThunder" ? "rgba(255, 210, 48, 0.22)" : "rgba(255, 76, 48, 0.22)";
        ctx.strokeStyle = tel.kind === "bossThunder" ? "#ffbe1a" : "#ff3e24";
        ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.ellipse(sx, sy, rr, rr * 0.48, 0, 0, TAU); ctx.fill(); ctx.stroke();
        // Expanding inner fill ring showing exact fuse timing
        ctx.fillStyle = tel.kind === "bossThunder" ? "rgba(255, 224, 60, 0.34)" : "rgba(255, 84, 52, 0.34)";
        ctx.beginPath(); ctx.ellipse(sx, sy, rr * prog, rr * 0.48 * prog, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }

    for (const sc of game.scorch) {
      const a = Math.min(1, sc.life / sc.max);
      const [sx, sy, pp] = proj(sc.gx, sc.gy, 0);
      const sz = cam.unit * 0.20 * pp;
      ctx.save();
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = "rgba(52, 34, 18, 0.32)";
      ctx.beginPath(); ctx.ellipse(sx, sy, sz, sz * 0.48, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }

    const drawList = [];
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

    // Spawn Burrow (Left) & Upper/Lower Breach Sprouts + Nest (Right)
    const [btx, bty] = PATH[0];
    drawList.push({
      depth: depthOf(btx + 0.5, bty + 0.45),
      draw: () => {
        const [bx, by, pp] = proj(btx + 0.5, bty + 0.5, 0);
        const rx = cam.unit * (cam.portrait ? 0.54 : 0.42) * pp, ry = cam.unit * (cam.portrait ? 0.26 : 0.20) * pp;
        fillOilPastel(ctx, makeEllipsePts(bx, by, rx, ry, 18, 310, 0.06), "#925230", 310, { cols: ["#69371e", "#925230", "#b86b3e"], dabSize: 10, toothAlpha: 0.36 });
        fillOilPastel(ctx, makeEllipsePts(bx, by + 2, rx * 0.62, ry * 0.58, 14, 312, 0.05), "#263440", 312, { cols: ["#1c2630", "#2c3d4a"], dabSize: 8, toothAlpha: 0.20 });
      }
    });

    const [htx, hty] = PATH[PATH.length - 1];
    drawList.push({
      depth: depthOf(htx + 0.5, hty + 0.58),
      draw: () => {
        const [hx, hy, pp] = proj(htx + 0.5, hty + 0.5, 0);
        const nw = cam.unit * (cam.portrait ? 0.68 : 0.55) * pp, nh = cam.unit * (cam.portrait ? 0.30 : 0.24) * pp;
        drawCardboardBaseAndShadow(ctx, hx, hy, nw * 1.9, 0, 410, false, false);
        fillOilPastel(ctx, makeEllipsePts(hx, hy, nw, nh, 22, 410, 0.06), "#e4ac46", 410, { cols: ["#b87a24", "#e4ac46", "#f5cf6e"], dabSize: 10, toothAlpha: 0.38 });
        const bob = Math.sin(simTime * 3.5) * 2.5 * pp;
        const hPx = cam.unit * (cam.portrait ? 1.66 : 1.16) * pp;
        drawLayeredStandee(ctx, "egg", hx, hy + bob, hPx, 1, Math.sin(simTime * 3.5) * 0.05, 0, 0, 0);
      }
    });

    // Controllable Hero (with Afterimages, Sword Prop, Flying-Sword Ride, or 5s Respawn Timer!)
    if (game.hero) {
      const hero = game.hero;
      drawList.push({
        depth: depthOf(hero.gx, hero.gy) + 0.36,
        draw: () => {
          if (hero.deadT > 0) {
            const [rx, ry, rpp] = proj(5.5, 6.35, 0);
            ctx.save();
            ctx.font = `900 ${Math.round(16 * rpp)}px "Fredoka", "PingFang SC", sans-serif`;
            ctx.textAlign = "center";
            ctx.strokeStyle = OL; ctx.lineWidth = 4;
            const txt = `⏳ ${hero.deadT.toFixed(1)}s 后底部复活`;
            ctx.strokeText(txt, rx, ry - 14);
            ctx.fillStyle = "#ffe866"; ctx.fillText(txt, rx, ry - 14);
            ctx.restore();
            return;
          }
          // Draw crisp motion afterimages
          for (const af of hero.afterimages) {
            const [ax, ay, app] = proj(af.gx, af.gy, af.gz);
            const ahPx = cam.unit * (cam.portrait ? 1.80 : 1.24) * app;
            ctx.save(); ctx.globalAlpha = af.alpha * 0.55;
            drawLayeredStandee(ctx, hero.def.img, ax, ay, ahPx, af.facing, 0, 0.4, 0, 0, "#7cf4ff");
            ctx.restore();
          }

          const hgx = hero.gx + (hero.lungeX || 0) - (hero.windup || 0) * 0.06 * hero.facing;
          const hgy = hero.gy + (hero.lungeY || 0);
          const hgz = hero.gz + (hero.lungeZ || 0);
          const [gx0, gy0, pp0] = proj(hgx, hgy, 0);
          const [sx, sy, pp] = proj(hgx, hgy, hgz);
          const hPx = cam.unit * (cam.portrait ? 1.84 : 1.28) * pp;
          drawCardboardBaseAndShadow(ctx, gx0, gy0, hPx * 0.94 * pp0 / pp, hgz, 735, true, true);
          if (hero.ridingSwordT > 0) {
            // Hero riding a giant glowing flying sword!
            drawCrayonSword(ctx, sx, sy + 6 * pp, hPx * 0.95, hero.facing > 0 ? 0.08 : Math.PI - 0.08, 901, "#ffe866");
          }
          const idleBreathe = Math.sin(simTime * 5) * 0.04;
          const sq = hero.recoil * 0.55 - (hero.headbuttT > 0 ? 0.35 : 0) + (hgz > 0.05 ? -0.08 : idleBreathe);
          const flash = hero.invulnT > 0 && Math.floor(simTime * 20) % 2 ? 0.5 : hero.recoil * 0.16;
          drawLayeredStandee(ctx, hero.def.img, sx, sy, hPx, hero.facing, sq, flash, hero.waddle, 0);

          if (hero.key === "chestnut") {
            const swAng = hero.dashState ? -0.95 * hero.facing : (hero.facing > 0 ? -0.45 : Math.PI + 0.45);
            drawCrayonSword(ctx, sx + hero.facing * hPx * 0.36, sy - hPx * 0.38, hPx * 0.56, swAng, 511, "#72f5ff");
          }
        }
      });
    }

    // Walkable Hero Companions (scaled-down hero clones or Mammoth warriors!)
    for (const c of game.companions) {
      drawList.push({
        depth: depthOf(c.gx, c.gy),
        draw: () => {
          const [gx0, gy0, pp0] = proj(c.gx, c.gy, 0);
          const [sx, sy, pp] = proj(c.gx, c.gy, c.gz);
          const isMam = c.key === "mammoth";
          const hPx = cam.unit * (cam.portrait ? 1.18 : 0.84) * (isMam ? 1.28 : (0.94 + (c.lv - 1) * 0.06)) * pp;
          drawCardboardBaseAndShadow(ctx, gx0, gy0, hPx * 0.85 * pp0 / pp, c.gz, c.seed, true, selectedComp === c);
          if (isMam) {
            // Crayon Woolly Mammoth standee!
            fillOilPastel(ctx, makeEllipsePts(sx, sy - hPx * 0.42, hPx * 0.45, hPx * 0.34, 14, c.seed), "#7a665a", c.seed, { cols: ["#5a483e", "#7a665a", "#9c8576"], dabSize: 10, calm: true });
            drawCardboardCutoutChip(ctx, [[sx + c.facing * hPx * 0.25, sy - hPx * 0.36], [sx + c.facing * hPx * 0.62, sy - hPx * 0.56], [sx + c.facing * hPx * 0.52, sy - hPx * 0.26]], "#fffdf4", c.seed + 2, { thickX: 2.5, thickY: 2, lw: 1.5 });
          } else {
            drawLayeredStandee(ctx, c.key, sx, sy, hPx, c.facing, c.recoil * 0.4, 0, Math.sin(c.walkPhase) * 0.08, 0);
            if (c.key === "chestnut") {
              drawCrayonSword(ctx, sx + c.facing * hPx * 0.34, sy - hPx * 0.36, hPx * 0.48, c.facing > 0 ? -0.45 : Math.PI + 0.45, c.seed, "#72f5ff");
            }
          }
          // Compact lv / mode tag
          ctx.save();
          ctx.font = `900 ${Math.max(10, Math.round(11 * pp))}px "Fredoka", sans-serif`;
          ctx.textAlign = "center";
          ctx.fillStyle = "#24183a";
          ctx.fillText((c.guard ? "🛡️" : "🐾") + "Lv" + c.lv, sx, sy - hPx - 4);
          ctx.restore();
        }
      });
    }

    // Slime Standees + Vine Spawn + Elemental Under-Effects + Petrified Rock Shell + Ice Sculpture + Soaked Blue!
    for (const e of game.enemies) {
      drawList.push({
        depth: depthOf(e.gx, e.gy),
        draw: () => {
          const egx = e.gx + (e.hitPushX || 0), egy = e.gy + (e.hitPushY || 0);
          const [gx0, gy0, pp0] = proj(egx, egy, 0);
          const [sx, sy, pp] = proj(egx, egy, e.gz);
          const hPx = cam.unit * (cam.portrait ? 1.62 : 1.12) * e.size * pp;
          drawCardboardBaseAndShadow(ctx, gx0, gy0, hPx * 0.86 * pp0 / pp, e.gz, 760, false, false);

          // Elemental under-effects (Lightning cloud under zap, ember under ember, etc.)
          if (e.role === "zap" || e.kind === "b4") {
            const cy = sy + 4 * pp;
            fillOilPastel(ctx, makeEllipsePts(sx, cy, hPx * 0.36, hPx * 0.14, 10, e.burnSeed), "#4a6298", e.burnSeed, { cols: ["#2c3e6b", "#5c7ab8"], dabSize: 7, calm: true });
            if (Math.floor(simTime * 12) % 2 === 0) drawThunderbolt(ctx, sx - 8 * pp, cy - 4 * pp, sx + 7 * pp, cy + 5 * pp, 2.2, e.burnSeed + boil);
          } else if (e.role === "fast" || e.kind === "b3") {
            if (Math.floor(simTime * 10 + e.burnSeed) % 2 === 0) drawCardboardFlame(ctx, sx - hPx * 0.25, sy - 2, hPx * 0.22, e.burnSeed, boil);
          }

          const hopSq = (e.hopCrouch || 0) + (e.gz > 0.15 ? -0.18 : 0.10) + (e.landSq || 0) + (e.hitSquash || 0) * 0.88;
          const slimeTilt = Math.sin(e.hopPhase * 0.5) * 0.065 + (e.hitTilt || 0);

          ctx.save();
          if (e.petrified) ctx.filter = "grayscale(0.92) contrast(1.12) brightness(0.90)";
          else if (e.frozenT > 0) ctx.filter = "saturate(0.35) hue-rotate(155deg) brightness(1.22)";
          else if (e.soakedT > 0) ctx.filter = "sepia(0.35) hue-rotate(172deg) saturate(2.2) brightness(0.95)";
          else if (e.burnT > 0) ctx.filter = "sepia(0.45) hue-rotate(-22deg) saturate(2.4) brightness(1.06)";

          drawLayeredStandee(ctx, e.img, sx, sy, hPx, e.facing, hopSq, e.hitFlash, slimeTilt, 0, e.hitFlashCol || "#ffffff");
          ctx.restore();

          // Soaked dripping water drops
          if (e.soakedT > 0) {
            ctx.save();
            ctx.fillStyle = "#4ec6ff";
            for (let dr = -1; dr <= 1; dr += 2) {
              const dy = ((simTime * 36 + dr * 9) % 16) * pp;
              ctx.beginPath(); ctx.arc(sx + dr * hPx * 0.22, sy - hPx * 0.35 + dy, 3.2 * pp, 0, TAU); ctx.fill();
            }
            ctx.restore();
          }

          // Burn lingering embers
          if (e.burnT > 0) drawCardboardFlame(ctx, sx + hPx * 0.26, sy - hPx * 0.20, hPx * 0.34, e.burnSeed + 5, boil);

          // Frozen Ice Sculpture shell
          if (e.frozenT > 0) {
            const iw = hPx * 0.46, ih = hPx * 0.98;
            ctx.save(); ctx.globalAlpha = 0.60;
            drawCardboardCutoutChip(ctx, [[sx - iw, sy + 2], [sx - iw * 0.9, sy - ih * 0.65], [sx, sy - ih * 1.05], [sx + iw * 0.9, sy - ih * 0.62], [sx + iw, sy + 2]], "#9ce8ff", e.burnSeed, { thickX: 3.5, thickY: 2.5, lw: 2 });
            ctx.restore();
          }

          // Progressive Rock Shell (1: broken cap on head -> 2: sides -> 3: FULL PETRIFIED STATUE!)
          if (e.rockShell >= 1) {
            const rTop = sy - hPx * 0.88;
            drawCardboardCutoutChip(ctx, [[sx - hPx * 0.24, rTop + 10 * pp], [sx - hPx * 0.14, rTop - 8 * pp], [sx + hPx * 0.16, rTop - 5 * pp], [sx + hPx * 0.25, rTop + 10 * pp]], "#8f8274", e.burnSeed + 1, { thickX: 3, thickY: 2.5, lw: 1.8 });
          }
          if (e.rockShell >= 2) {
            drawCardboardCutoutChip(ctx, [[sx - hPx * 0.36, sy - hPx * 0.18], [sx - hPx * 0.32, sy - hPx * 0.56], [sx - hPx * 0.08, sy - hPx * 0.45], [sx - hPx * 0.12, sy - hPx * 0.12]], "#7e7266", e.burnSeed + 2, { thickX: 3, thickY: 2, lw: 1.8 });
            drawCardboardCutoutChip(ctx, [[sx + hPx * 0.12, sy - hPx * 0.12], [sx + hPx * 0.10, sy - hPx * 0.48], [sx + hPx * 0.36, sy - hPx * 0.55], [sx + hPx * 0.38, sy - hPx * 0.16]], "#9c8e80", e.burnSeed + 3, { thickX: 3, thickY: 2, lw: 1.8 });
          }
          if (e.petrified) {
            ctx.save();
            ctx.font = `900 ${Math.round(12 * pp)}px "Fredoka", sans-serif`;
            ctx.textAlign = "center"; ctx.fillStyle = "#fff8e0"; ctx.strokeStyle = OL; ctx.lineWidth = 3;
            ctx.strokeText(`🗿${e.statueHp}`, sx, sy - hPx - 20);
            ctx.fillText(`🗿${e.statueHp}`, sx, sy - hPx - 20);
            ctx.restore();
          }

          // Paralyze lightning scar across body
          if (e.paralyzeT > 0) {
            drawThunderbolt(ctx, sx - hPx * 0.24, sy - hPx * 0.65, sx + hPx * 0.22, sy - hPx * 0.25, 2.2, e.burnSeed + boil);
          }
          // Bubble prison
          if (e.bubbleT > 0) {
            const br = hPx * 0.58;
            ctx.save();
            ctx.fillStyle = "rgba(104, 206, 255, 0.36)"; ctx.strokeStyle = "#2676c8"; ctx.lineWidth = 2.6;
            ctx.beginPath(); ctx.ellipse(sx, sy - hPx * 0.42, br, br * 0.92, 0, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.restore();
          }

          if (e.boss) {
            const cy = sy - hPx - 8 * pp, cw = hPx * 0.20;
            drawCardboardCutoutChip(ctx, [
              [sx - cw, cy], [sx - cw * 1.05, cy - cw * 0.85], [sx - cw * 0.4, cy - cw * 0.35],
              [sx, cy - cw * 1.1], [sx + cw * 0.4, cy - cw * 0.35], [sx + cw * 1.05, cy - cw * 0.85], [sx + cw, cy]
            ], "#ffe047", 605, { thickX: 3.5, thickY: 2.5, lw: 2.0 });
          }

          const bw = Math.max(34, cam.unit * 0.52 * e.size * pp), bh = Math.max(6, cam.unit * 0.075 * pp);
          const bx = sx - bw * 0.5, by = sy - hPx - (e.boss ? 28 : 14);
          const frac = clamp(e.hp / e.maxHp, 0, 1);
          ctx.fillStyle = "#fffcf4"; ctx.strokeStyle = OL; ctx.lineWidth = 1.8;
          ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2); ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
          if (frac > 0) {
            ctx.fillStyle = e.frozenT > 0 ? "#72d8ff" : (e.soakedT > 0 ? "#3898ff" : (e.burnT > 0 ? "#ff6828" : "#67cf48"));
            ctx.fillRect(bx, by, bw * frac, bh);
          }
        }
      });
    }

    // Active Zones Rendering (Custom basic sequences + Ultimates!)
    for (const z of game.activeZones) {
      drawList.push({
        depth: depthOf(z.gx, z.gy) + 0.16,
        draw: () => {
          const [sx, sy, pp] = proj(z.gx, z.gy, z.gz || 0.02);
          ctx.save();
          if (z.kind === "lemonCloudAttack") {
            const [sxz, syz] = proj(z.gx, z.gy, z.gz || 1.0);
            const charging = z.t < z.chargeDur;
            const chargeP = clamp(z.t / z.chargeDur, 0, 1);
            // Cloud brightens as Lemon's head lightning charges it!
            const col = charging ? (chargeP > 0.5 ? "#809cd4" : "#4b6294") : "#fff6a8";
            fillOilPastel(ctx, makeEllipsePts(sxz, syz, cam.unit * 0.48 * pp, cam.unit * 0.25 * pp, 12, z.seed), col, z.seed, { cols: ["#334670", col, "#fff8be"], dabSize: 9, calm: true });
            if (charging && z.attackerRef) {
              const [hx, hy] = proj(z.attackerRef.gx, z.attackerRef.gy, (z.attackerRef.gz || 0) + 0.72);
              drawThunderbolt(ctx, hx, hy, sxz, syz, 2.4, z.seed + boil);
            }
          } else if (z.kind === "cocoWhirlWave") {
            if (z.t < z.spinDur) {
              const p = z.t / z.spinDur;
              const rr = cam.unit * (0.42 + p * 0.60) * pp;
              ctx.strokeStyle = "#125096"; ctx.lineWidth = 3.2;
              for (let r = 0; r < 3; r++) {
                ctx.beginPath(); ctx.ellipse(sx, sy, rr * (1 - r * 0.26), rr * 0.44 * (1 - r * 0.26), z.t * 10 + r, 0, Math.PI * 1.45); ctx.stroke();
              }
            } else {
              // Curling Tsunami Wave surging to target!
              const wh = cam.unit * 1.15 * pp, ww = cam.unit * 0.78 * pp;
              const wPts = sampleSmoothLoop([[sx - ww, sy + 4], [sx - ww * 0.4, sy - wh], [sx + ww * 0.8, sy - wh * 0.75], [sx + ww * 0.4, sy - wh * 0.25], [sx + ww, sy + 4]], 3);
              drawCardboardCutoutChip(ctx, wPts, "#2ea2ff", z.seed, { thickX: 4, thickY: 3, lw: 2.0 });
            }
          } else if (z.kind === "taroSkyRock") {
            const br = cam.unit * 0.38 * pp;
            drawCardboardCutoutChip(ctx, [[sx - br, sy + br * 0.2], [sx - br * 0.6, sy - br * 0.8], [sx + br * 0.4, sy - br * 0.9], [sx + br, sy - br * 0.1], [sx + br * 0.6, sy + br * 0.5]], "#8c7464", z.seed, { thickX: 4, thickY: 3, lw: 2.0 });
          } else if (z.kind === "fireFan" || z.kind === "fireWall") {
            const rr = cam.unit * (z.r || z.len * 0.5) * pp;
            const hotness = clamp(z.t / z.dur, 0, 1);
            ctx.fillStyle = hotness > 0.6 ? "rgba(255, 224, 110, 0.34)" : "rgba(255, 78, 28, 0.30)";
            ctx.beginPath(); ctx.ellipse(sx, sy, rr, rr * 0.46, 0, 0, TAU); ctx.fill();
            for (let fi = 0; fi < 7; fi++) {
              const ox = Math.cos(z.ang || 0) * ((fi - 3) * 0.45);
              const oy = Math.sin(z.ang || 0) * ((fi - 3) * 0.35);
              const [fx, fy, fpp] = proj(z.gx + ox, z.gy + oy, 0.04);
              drawCardboardFlame(ctx, fx, fy, cam.unit * (0.48 + (z.lv || 1) * 0.08) * fpp, z.seed + fi, boil, hotness > 0.6 ? "#ff9432" : "#ff441c", hotness > 0.6 ? "#ffffff" : "#ffe658");
            }
          } else if (z.kind === "fireDragon") {
            drawCardboardFlame(ctx, sx, sy, cam.unit * 0.90 * pp, z.seed, boil, "#ff3b14", "#fff499");
          } else if (z.kind === "zeusPhantom") {
            // Holy white cloud + helmeted Zeus bird phantom with 2 lightning bolts!
            fillOilPastel(ctx, makeEllipsePts(sx, sy + 4, cam.unit * 0.62 * pp, cam.unit * 0.30 * pp, 12, z.seed), "#ffffff", z.seed, { cols: ["#e2f1ff", "#ffffff"], dabSize: 10, calm: true });
            ctx.globalAlpha = 0.85;
            drawLayeredStandee(ctx, "lemon", sx, sy - 6 * pp, cam.unit * 1.18 * pp, 1, 0, 0.35, 0, 0, "#fff8d0");
            drawThunderbolt(ctx, sx - 12 * pp, sy - cam.unit * 0.85 * pp, sx - 6 * pp, sy - cam.unit * 0.55 * pp, 2.2, z.seed + 1, true);
            drawThunderbolt(ctx, sx + 12 * pp, sy - cam.unit * 0.85 * pp, sx + 6 * pp, sy - cam.unit * 0.55 * pp, 2.2, z.seed + 2, true);
          } else if (z.kind === "angryCloud") {
            const [cx0, cy0] = proj(z.gx, z.gy, 2.3);
            const cw = cam.unit * 1.12 * pp, ch = cam.unit * 0.56 * pp;
            const cPts = sampleSmoothLoop([
              [cx0 - cw, cy0 + ch * 0.25], [cx0 - cw * 0.85, cy0 - ch * 0.55], [cx0 - cw * 0.28, cy0 - ch * 0.95],
              [cx0 + cw * 0.28, cy0 - ch * 0.92], [cx0 + cw * 0.88, cy0 - ch * 0.48], [cx0 + cw, cy0 + ch * 0.25],
              [cx0 + cw * 0.4, cy0 + ch * 0.52], [cx0 - cw * 0.4, cy0 + ch * 0.52]
            ], 3);
            fillOilPastel(ctx, cPts, "#323c58", z.seed, { cols: ["#22293e", "#46557a"], dabSize: 14, calm: true });
            tracePoly(ctx, cPts); ctx.strokeStyle = "#2b1b22"; ctx.lineWidth = 3.2 * pp; ctx.stroke();
            // Angry crayon face: furrowed brows, glowing yellow eyes, zig-zag scowl!
            ctx.fillStyle = "#ffe64a"; ctx.strokeStyle = "#2b1b22"; ctx.lineWidth = 2.0 * pp;
            for (const sd of [-1, 1]) {
              ctx.beginPath(); ctx.arc(cx0 + sd * 14 * pp, cy0 - 2 * pp, 5.2 * pp, 0, TAU); ctx.fill(); ctx.stroke();
            }
            ctx.strokeStyle = "#2b1b22"; ctx.lineWidth = 3.8 * pp; ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(cx0 - 22 * pp, cy0 - 12 * pp); ctx.lineTo(cx0 - 7 * pp, cy0 - 5 * pp);
            ctx.moveTo(cx0 + 22 * pp, cy0 - 12 * pp); ctx.lineTo(cx0 + 7 * pp, cy0 - 5 * pp);
            ctx.moveTo(cx0 - 14 * pp, cy0 + 13 * pp); ctx.lineTo(cx0 - 5 * pp, cy0 + 9 * pp);
            ctx.lineTo(cx0 + 5 * pp, cy0 + 14 * pp); ctx.lineTo(cx0 + 14 * pp, cy0 + 9 * pp);
            ctx.stroke();
          } else if (z.kind === "frostBreath") {
            const rr = cam.unit * z.r * pp;
            ctx.fillStyle = "rgba(132, 224, 255, 0.32)";
            ctx.beginPath(); ctx.ellipse(sx, sy, rr, rr * 0.46, 0, 0, TAU); ctx.fill();
            drawSnowflake(ctx, sx, sy - 14 * pp, cam.unit * 0.46 * pp, z.t * 4, z.seed);
          } else if (z.kind === "slidingIce") {
            const ir = cam.unit * 0.52 * pp;
            drawCardboardCutoutChip(ctx, [[sx - ir, sy], [sx - ir * 0.7, sy - ir * 1.1], [sx + ir * 0.7, sy - ir * 1.1], [sx + ir, sy]], "#9ce8ff", z.seed, { thickX: 4, thickY: 3, lw: 2 });
          } else if (z.kind === "blizzard") {
            for (let f = 0; f < 16; f++) {
              const fx = ((hash(f * 7, z.seed) + z.t * 0.35) % 1) * W;
              const fy = ((hash(f * 13, z.seed) + z.t * 0.65) % 1) * H;
              drawSnowflake(ctx, fx, fy, 16, z.t * 3 + f, z.seed + f);
            }
          } else if (z.kind === "waterTornado") {
            const rr = cam.unit * 0.60 * pp;
            for (let r = 0; r < 4; r++) {
              ctx.strokeStyle = r % 2 ? "#e6f9ff" : "#2490f0"; ctx.lineWidth = 3.2;
              ctx.beginPath(); ctx.ellipse(sx, sy - r * 12 * pp, rr * (0.45 + r * 0.18), rr * 0.22, z.t * 9 + r, 0, Math.PI * 1.5); ctx.stroke();
            }
            if (z.hasDragon) {
              drawCardboardCutoutChip(ctx, [[sx - 28 * pp, sy - 18 * pp], [sx - 6 * pp, sy - 46 * pp], [sx + 16 * pp, sy - 26 * pp], [sx, sy - 8 * pp]], "#52c8ff", z.seed + 5, { thickX: 3, thickY: 2, lw: 1.8 });
            }
          } else if (z.kind === "giantTsunami") {
            if (z.t < z.chargeDur) {
              const [cx0, cy0] = proj(z.gx, z.gy, 1.45);
              ctx.strokeStyle = "#1876d2"; ctx.lineWidth = 4;
              ctx.beginPath(); ctx.ellipse(cx0, cy0, cam.unit * 0.75 * pp, cam.unit * 0.32 * pp, z.t * 8, 0, Math.PI * 1.6); ctx.stroke();
            } else if (z.t < z.chargeDur + z.waveDur && z.waveX != null) {
              const [wx, wy, wpp] = proj(z.waveX, 3.5, 0.2);
              const wh = cam.unit * 2.85 * wpp, ww = cam.unit * 1.55 * wpp;
              const wavePts = sampleSmoothLoop([
                [wx - ww * 1.05, wy + 14], [wx - ww * 0.78, wy - wh * 0.55], [wx - ww * 0.12, wy - wh * 1.02],
                [wx + ww * 0.85, wy - wh * 0.92], [wx + ww * 1.10, wy - wh * 0.62], [wx + ww * 0.62, wy - wh * 0.52],
                [wx + ww * 0.52, wy - wh * 0.18], [wx + ww * 0.95, wy + 14]
              ], 3);
              drawCardboardCutoutChip(ctx, wavePts, "#1e8cf0", z.seed, { thickX: 6, thickY: 4.5, lw: 2.4 });
              // White frothy curling crest + swirling wave streaks!
              const crestPts = sampleSmoothLoop([
                [wx - ww * 0.25, wy - wh * 0.92], [wx + ww * 0.45, wy - wh * 1.04],
                [wx + ww * 1.05, wy - wh * 0.78], [wx + ww * 0.75, wy - wh * 0.55], [wx + ww * 0.25, wy - wh * 0.72]
              ], 3);
              drawCardboardCutoutChip(ctx, crestPts, "#eefaff", z.seed + 3, { thickX: 3, thickY: 2, lw: 1.8 });
              // Curling purple-pink octopus tentacle riding inside the tsunami!
              ctx.strokeStyle = "#2b1b22"; ctx.lineWidth = 7 * wpp; ctx.lineCap = "round";
              ctx.beginPath(); ctx.moveTo(wx - ww * 0.6, wy + 4); ctx.quadraticCurveTo(wx - ww * 0.75, wy - wh * 0.35, wx - ww * 0.38, wy - wh * 0.52); ctx.stroke();
              ctx.strokeStyle = "#ff68a8"; ctx.lineWidth = 4.2 * wpp; ctx.stroke();
              if (z.hasShip) {
              // Proper detailed crayon wooden sailing ship riding the tsunami wave!
              const sx0 = wx, sy0 = wy - wh * 0.46, shS = Math.max(0.9, wpp);
              // Wooden hull + stern cabin
              drawCardboardCutoutChip(ctx, [
                [sx0 - 44 * shS, sy0 - 10 * shS], [sx0 + 48 * shS, sy0 - 12 * shS],
                [sx0 + 34 * shS, sy0 + 18 * shS], [sx0 - 30 * shS, sy0 + 18 * shS]
              ], "#8c5024", z.seed + 9, { thickX: 4, thickY: 3, lw: 2.2 });
              drawCardboardCutoutChip(ctx, [
                [sx0 - 40 * shS, sy0 - 24 * shS], [sx0 - 16 * shS, sy0 - 24 * shS],
                [sx0 - 14 * shS, sy0 - 10 * shS], [sx0 - 42 * shS, sy0 - 10 * shS]
              ], "#b26c34", z.seed + 10, { thickX: 3, thickY: 2, lw: 1.8 });
              // Tall mast + billowing cream mainsail + red pennant!
              ctx.strokeStyle = "#4b2810"; ctx.lineWidth = 4 * shS;
              ctx.beginPath(); ctx.moveTo(sx0 + 4 * shS, sy0 - 10 * shS); ctx.lineTo(sx0 + 4 * shS, sy0 - 72 * shS); ctx.stroke();
              drawCardboardCutoutChip(ctx, [
                [sx0 + 6 * shS, sy0 - 64 * shS], [sx0 + 36 * shS, sy0 - 48 * shS],
                [sx0 + 32 * shS, sy0 - 22 * shS], [sx0 + 6 * shS, sy0 - 24 * shS]
              ], "#fff7e2", z.seed + 11, { thickX: 3, thickY: 2, lw: 2.0 });
              drawCardboardCutoutChip(ctx, [
                [sx0 + 4 * shS, sy0 - 72 * shS], [sx0 + 24 * shS, sy0 - 67 * shS], [sx0 + 4 * shS, sy0 - 61 * shS]
              ], "#ff4848", z.seed + 12, { thickX: 2, thickY: 1.5, lw: 1.6 });
              // Portholes + white bow foam
              ctx.fillStyle = "#ffe680"; ctx.strokeStyle = "#2b1b22"; ctx.lineWidth = 1.8;
              for (const pxOff of [-14, 4, 22]) {
                ctx.beginPath(); ctx.arc(sx0 + pxOff * shS, sy0 + 4 * shS, 4.2 * shS, 0, TAU); ctx.fill(); ctx.stroke();
              }
            }
            } else {
              const [wx, wy, wpp] = proj(5.5, 3.5, 0.02);
              ctx.strokeStyle = "#1876d2"; ctx.lineWidth = 3.5;
              ctx.beginPath(); ctx.ellipse(wx, wy, cam.unit * 1.2 * wpp, cam.unit * 0.55 * wpp, z.t * 7, 0, Math.PI * 1.6); ctx.stroke();
            }
          } else if (z.kind === "volcano") {
            const mw = cam.unit * 1.28 * pp, mh = cam.unit * 1.52 * pp;
            drawCardboardCutoutChip(ctx, [[sx - mw, sy + 6], [sx - mw * 0.35, sy - mh], [sx + mw * 0.35, sy - mh], [sx + mw, sy + 6]], z.erupted ? "#8c3b20" : "#786250", z.seed, { thickX: 5, thickY: 4, lw: 2.2 });
            if (z.erupted) drawCardboardFlame(ctx, sx, sy - mh, cam.unit * 0.78 * pp, z.seed, boil);
            if (z.hasMole && z.erupted) {
              fillOilPastel(ctx, makeEllipsePts(sx + Math.sin(z.t * 4) * 26 * pp, sy, 14 * pp, 11 * pp, 10, z.seed + 3), "#7c5236", z.seed + 3, { cols: ["#5a3a24", "#9e6b48"], dabSize: 6, calm: true });
            }
          } else if (z.kind === "sawSword") {
            drawCrayonSword(ctx, sx, sy - 18 * pp, cam.unit * 0.90 * pp, z.t * 18, z.seed, "#72f5ff");
          } else if (z.kind === "swordOrbiters") {
            for (let si = 0; si < z.count; si++) {
              const a = (si / z.count) * TAU + z.t * 4.5;
              const [ox, oy, opp] = proj(game.hero.gx + Math.cos(a) * 1.1, game.hero.gy + Math.sin(a) * 0.8, 0.65);
              drawCrayonSword(ctx, ox, oy, cam.unit * 0.72 * opp, a + 1.2, z.seed + si, "#ffe866");
            }
          } else if (z.kind === "plantedSword") {
            const fallP = clamp(z.t / z.dropDur, 0, 1);
            const curZ = z.t < z.dropDur ? lerp(2.8, 0.12, fallP * fallP) : 0.12;
            const [px, py, ppp] = proj(z.gx, z.gy, curZ);
            drawCrayonSword(ctx, px, py - 14 * ppp, cam.unit * 0.80 * ppp, Math.PI * 0.5, z.seed, "#72f5ff");
          }
          ctx.restore();
        }
      });
    }

    // Projectiles (fireTornado with spinning tiny flame inside, 6-point iceSnowflake, miniSplit, flyingSword!)
    for (const s of game.shots) {
      drawList.push({
        depth: depthOf(s.gx, s.gy) + 0.2,
        draw: () => {
          const [sx, sy, pp] = proj(s.gx, s.gy, s.gz);
          const prog = clamp(s.t, 0, 1);
          if (s.kind === "fireTornado") {
            const sc = (0.52 + prog * 0.78) * (s.growMax || 1.25);
            const h = cam.unit * 0.72 * sc * pp;
            const w = cam.unit * 0.34 * sc * pp;
            ctx.save();
            for (let ring = 0; ring < 4; ring++) {
              const f = ring / 3;
              const ry = sy - f * h;
              const rw = w * (0.45 + f * 0.65);
              ctx.strokeStyle = ring % 2 ? "#ff4e1c" : "#80180a";
              ctx.lineWidth = Math.max(2.2, 3.6 * sc * pp);
              ctx.beginPath(); ctx.ellipse(sx, ry, rw, rw * 0.38, simTime * 14 + ring, 0, Math.PI * 1.55); ctx.stroke();
            }
            // Tiny bright yellow-white flame spinning inside the tornado!
            drawCardboardFlame(ctx, sx, sy - h * 0.35, w * 0.58, s.seed, boil, "#ff8828", "#ffffff");
            ctx.restore();
          } else if (s.kind === "iceSnowflake" || s.kind === "miniSplit") {
            const r = cam.unit * (s.kind === "miniSplit" ? 0.20 : 0.34) * pp;
            drawSnowflake(ctx, sx, sy, r, simTime * 9 + s.seed, s.seed);
          } else if (s.kind === "flyingSword") {
            drawCrayonSword(ctx, sx, sy, cam.unit * 0.66 * pp, s.ang || 0, s.seed, "#72f5ff");
          }
        }
      });
    }

    // Element-Specific Dying Slimes (including Sliced-in-Half for Sword!)
    for (const d of game.dying) {
      drawList.push({
        depth: depthOf(d.gx, d.gy) + 0.05,
        draw: () => {
          const p = clamp(d.t / d.dur, 0, 1);
          const [sx, sy, pp] = proj(d.gx, d.gy, d.gz);
          const hPx = cam.unit * (cam.portrait ? 1.62 : 1.12) * d.size * pp;
          if (d.deathKind === "slash") {
            // Sliced in half: left & right cardboard halves slide apart!
            const split = p * 28 * pp;
            const arr = LAYERS[d.img];
            if (arr && arr[0]) {
              const drawSz = hPx * (260 / 210);
              const dX = -drawSz * 0.5, dY = -drawSz + (24 / 260) * drawSz;
              for (const side of [-1, 1]) {
                ctx.save();
                ctx.globalAlpha = 1 - p * 0.7;
                ctx.translate(sx + side * split, sy);
                ctx.rotate(side * p * 0.35);
                ctx.beginPath();
                ctx.rect(side < 0 ? -drawSz : 0, -drawSz * 1.2, drawSz, drawSz * 1.4);
                ctx.clip();
                ctx.drawImage(arr[0].cv, dX, dY, drawSz, drawSz);
                ctx.restore();
              }
            }
          } else if (d.deathKind === "lightning") {
            const jx = (Math.sin(d.t * 85) * 5.5) * (1 - p);
            ctx.save(); ctx.globalAlpha = 1 - p * 0.65;
            drawLayeredStandee(ctx, d.img, sx + jx, sy, hPx * (1 - p * 0.25), d.facing, 0.12, 0.75, 0, 0, "#52ff7a");
            ctx.restore();
          } else if (d.deathKind === "fire") {
            ctx.save(); ctx.globalAlpha = 1 - p * 0.7;
            drawLayeredStandee(ctx, d.img, sx, sy, hPx * (1 - p * 0.3), d.facing, 0.1, 0.5, 0, 0, "#24150e");
            if (p < 0.8) drawCardboardFlame(ctx, sx, sy - hPx * 0.35, hPx * 0.42, d.dSeed, boil);
            ctx.restore();
          } else if (d.deathKind === "frost") {
            ctx.save(); ctx.globalAlpha = 1 - p * 0.7; ctx.filter = "saturate(0.3) hue-rotate(155deg) brightness(1.2)";
            drawLayeredStandee(ctx, d.img, sx, sy, hPx, d.facing, 0, 0.4, 0, 0, "#9be8ff");
            ctx.restore();
          } else if (d.deathKind === "water") {
            ctx.save(); ctx.globalAlpha = 1 - p * 0.6;
            drawLayeredStandee(ctx, d.img, sx, sy, hPx * 0.78, d.facing, 0, 0.2, 0, 0, "#9ee4ff");
            ctx.strokeStyle = "#2676c8"; ctx.lineWidth = 2.6;
            ctx.beginPath(); ctx.arc(sx, sy - hPx * 0.4, hPx * 0.58, 0, TAU); ctx.stroke();
            ctx.restore();
          } else {
            ctx.save(); ctx.globalAlpha = 1 - p * 0.7;
            drawLayeredStandee(ctx, d.img, sx, sy, hPx * (1 - p * 0.4), d.facing, p, 0.25, 0, 0, "#c8b29c");
            ctx.restore();
          }
        }
      });
    }

    // Crisp Particle FX (spawnVine, swordSlash, tornadoOpen, skyCloud, skyBolt, arcLine, arrowStick, iceTrail, shockRing, cardChip, confetti, pop!)
    for (const f of game.fx) {
      drawList.push({
        depth: depthOf(f.gx ?? 5.5, f.gy ?? 3.5) + 0.35,
        draw: () => {
          const prog = clamp(1 - f.life / f.max, 0, 1);
          const fade = clamp(f.life / Math.min(0.18, f.max * 0.55), 0, 1);
          const [sx, sy, pp] = proj(f.gx ?? 5.5, f.gy ?? 3.5, f.gz ?? 0);
          ctx.save();
          ctx.globalAlpha = fade;

          if (f.k === "spawnVine") {
            // Sprouting green crayon vine lifting slime out of the earth!
            const rise = Math.sin(Math.min(1, prog * 1.4) * Math.PI * 0.5);
            const vh = cam.unit * 0.68 * rise * pp;
            ctx.strokeStyle = "#2d781e"; ctx.lineWidth = 5.5 * pp; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(sx, sy + 2);
            ctx.quadraticCurveTo(sx - 12 * pp, sy - vh * 0.5, sx + 4 * pp, sy - vh);
            ctx.stroke();
            ctx.strokeStyle = "#6ed646"; ctx.lineWidth = 3.0 * pp; ctx.stroke();
            dabStroke(ctx, sx - 10 * pp, sy - vh * 0.55, 11 * pp, 5 * pp, -0.5, "#66cc42", 0.9, f.seed);
            dabStroke(ctx, sx + 9 * pp, sy - vh * 0.75, 11 * pp, 5 * pp, 0.45, "#82e456", 0.9, f.seed + 1);
          } else if (f.k === "swordSlash") {
            const rr = cam.unit * (f.r || 0.95) * 1.35 * (0.75 + prog * 0.35) * pp;
            ctx.save(); ctx.translate(sx, sy); ctx.rotate(f.ang || 0);
            ctx.strokeStyle = "#1a2858"; ctx.lineWidth = (f.inner ? 5 : 8) * (1 - prog * 0.5) * pp; ctx.lineCap = "round";
            ctx.beginPath(); ctx.arc(0, 0, rr, -0.95, 0.95); ctx.stroke();
            ctx.strokeStyle = f.inner ? "#ffe866" : "#6ef5ff"; ctx.lineWidth = (f.inner ? 3 : 5) * (1 - prog * 0.5) * pp; ctx.stroke();
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.2 * (1 - prog * 0.5) * pp; ctx.stroke();
            ctx.restore();
          } else if (f.k === "tornadoOpen") {
            const rr = cam.unit * 0.78 * (f.scale || 1) * (0.5 + prog * 0.7) * pp;
            for (let a = 0; a < 5; a++) {
              const ang = (a / 5) * TAU + prog * 6;
              dabStroke(ctx, sx + Math.cos(ang) * rr, sy + Math.sin(ang) * rr * 0.55, 14 * pp, 6 * pp, ang + 1.2, a % 2 ? "#ffe04a" : "#ff5224", fade, f.seed + a);
            }
          } else if (f.k === "skyCloud") {
            const cw = cam.unit * 0.48 * pp;
            fillOilPastel(ctx, makeEllipsePts(sx, sy, cw, cw * 0.45, 12, f.seed), "#445480", f.seed, { cols: ["#2a3656", "#6478b0"], dabSize: 10, calm: true });
          } else if (f.k === "skyBolt") {
            const slam = Math.min(1, prog * 3.8);
            const tx = sx, ty = sy;
            const topY = Math.max(cam.portrait ? 84 : 48, ty - cam.unit * (f.thin ? 2.8 : 3.5) * pp);
            const curBotY = lerp(topY + 20, ty, slam);
            const wHalf = (f.thin ? 13 : 21) * pp;
            const jog = (f.thin ? 22 : 34) * pp;
            const dSign = (f.seed % 2 === 0) ? 1 : -1;
            const y1 = lerp(topY, curBotY, 0.36), y2 = lerp(topY, curBotY, 0.58);
            const boltPoly = [
              [tx - wHalf * 0.75 * dSign, topY], [tx + wHalf * 0.85 * dSign, topY],
              [tx + jog * 0.45 * dSign, y1 - wHalf * 0.3], [tx + jog * 1.05 * dSign, y1 + wHalf * 0.25],
              [tx + jog * 0.20 * dSign, y2 - wHalf * 0.1], [tx + jog * 0.80 * dSign, y2 + wHalf * 0.35],
              [tx, curBotY + 4], [tx - jog * 0.25 * dSign, y2 + wHalf * 0.05],
              [tx + jog * 0.18 * dSign, y1 + wHalf * 0.18], [tx - jog * 0.55 * dSign, y1 - wHalf * 0.08]
            ];
            drawCardboardCutoutChip(ctx, boltPoly, f.holy ? "#fffdf0" : "#ffe938", f.seed, {
              thickX: f.thin ? 4.5 : 6.5, thickY: f.thin ? 3.5 : 5.0, lw: 2.3
            });
            ctx.save();
            ctx.strokeStyle = f.holy ? "#ffe878" : "#fffef4";
            ctx.lineWidth = (f.thin ? 2.4 : 3.8) * pp;
            ctx.lineCap = "round"; ctx.lineJoin = "round";
            ctx.beginPath(); ctx.moveTo(tx, topY + 6); ctx.lineTo(tx + jog * 0.45 * dSign, y1);
            ctx.lineTo(tx + jog * 0.25 * dSign, y2); ctx.lineTo(tx, curBotY); ctx.stroke();
            ctx.restore();
          } else if (f.k === "arcLine") {
            const [x0, y0] = proj(f.gx0, f.gy0, f.gz0 || 0.35);
            const [x1, y1] = proj(f.gx1, f.gy1, f.gz1 || 0.35);
            drawThunderbolt(ctx, x0, y0, x1, y1, 2.2 * pp, f.seed + boil);
          } else if (f.k === "arrowStick") {
            ctx.strokeStyle = "#6e4420"; ctx.lineWidth = 2.6 * pp;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 6 * pp, sy - 20 * pp); ctx.stroke();
            ctx.fillStyle = "#ffe866"; ctx.fillRect(sx - 8 * pp, sy - 22 * pp, 5 * pp, 4 * pp);
          } else if (f.k === "iceTrail" || f.k === "iceNovaSpike" || f.k === "rockSpike") {
            const sh = cam.unit * (f.h || 0.35) * pp;
            const col = f.k === "rockSpike" ? "#9c8270" : "#88e4ff";
            drawCardboardCutoutChip(ctx, [[sx - 8 * pp, sy + 2], [sx, sy - sh], [sx + 8 * pp, sy + 2]], col, f.seed, { thickX: 2.5, thickY: 2, lw: 1.5 });
          } else if (f.k === "shockRing" || f.k === "frostRing") {
            const rr = cam.unit * (f.r || 0.9) * (0.35 + prog * 0.72) * pp;
            ctx.strokeStyle = f.col || "#26a8ff"; ctx.lineWidth = Math.max(2.2, 4.5 * pp * (1 - prog * 0.5));
            ctx.beginPath(); ctx.ellipse(sx, sy, rr, rr * 0.46, 0, 0, TAU); ctx.stroke();
            ctx.strokeStyle = f.innerCol || "#ffffff"; ctx.lineWidth = Math.max(1.2, 2.0 * pp * (1 - prog * 0.6));
            ctx.beginPath(); ctx.ellipse(sx, sy, rr * 0.68, rr * 0.31, 0, 0, TAU); ctx.stroke();
          } else if (f.k === "slimePrint") {
            const r = cam.unit * 0.16 * (f.scale || 1) * pp;
            fillWaxCrayon(ctx, makeEllipsePts(sx, sy, r, r * 0.45, 10, f.seed), f.col || "#76d038", f.seed, { withBase: false, coverage: 0.55, lw: 1.2 });
          } else if (f.k === "cardChip" || f.k === "confetti" || f.k === "ashFlake") {
            const sz = Math.max(6.8, cam.unit * 0.115 * pp);
            ctx.save(); ctx.translate(sx, sy); ctx.rotate(f.rot || 0);
            ctx.fillStyle = f.col || "#ffe24a";
            ctx.strokeStyle = f.rimCol || OL; ctx.lineWidth = 1.2;
            ctx.fillRect(-sz, -sz * 0.55, sz * 2, sz * 1.1);
            if (f.k === "cardChip") ctx.strokeRect(-sz, -sz * 0.55, sz * 2, sz * 1.1);
            ctx.restore();
          } else if (f.k === "dust") {
            const sc = f.small ? 0.65 : 1.0;
            const sp = cam.unit * (0.10 + prog * 0.20) * sc * pp;
            for (let k = -1; k <= 1; k += 2) {
              fillWaxCrayon(ctx, makeEllipsePts(sx + k * sp, sy, cam.unit * 0.09 * sc * pp, cam.unit * 0.065 * sc * pp, 8, f.seed + k), "#d6b082", f.seed + k, { lw: 1.2 });
            }
          } else if (f.k === "impactSpark") {
            const spR = cam.unit * 0.78 * (f.scale || 1) * (0.45 + prog * 0.85) * pp;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.strokeStyle = f.col || "#fff47a";
            ctx.lineWidth = Math.max(3.2, 5.2 * pp * (1 - prog * 0.5));
            ctx.lineCap = "round";
            for (let ri = 0; ri < 10; ri++) {
              const a = (ri / 10) * TAU + f.seed;
              const r0 = spR * 0.30, r1 = spR * (ri % 2 === 0 ? 1.22 : 0.85);
              ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke();
            }
            ctx.fillStyle = "#fffef6";
            ctx.beginPath(); ctx.arc(0, 0, spR * 0.32 * (1 - prog * 0.4), 0, TAU); ctx.fill();
            ctx.restore();
          } else if (f.k === "hit") {
            // v11 BIG EXPLOSIVE 3-layer starburst + comic words (scaled up!)
            const popScale = easeOutBack(Math.min(1, prog * 2.8));
            const rOut = cam.unit * (cam.portrait ? 1.48 : 1.16) * (f.big ? 0.96 : 0.80) * (f.scale || 1) * popScale * pp;
            const rIn = rOut * 0.42;
            const hudSafeTop = cam.portrait ? 110 : 72;
            const hx = clamp(sx, Math.max(54, rOut * 0.85), W - Math.max(54, rOut * 0.85));
            const hy = clamp(sy, hudSafeTop + rOut * 0.65, H - 60);
            const spikes = f.fxKind === "frost" ? 6 : (f.fxKind === "lightning" ? 9 : 8);
            const outerPts = [], midPts = [], corePts = [];
            for (let i = 0; i < spikes * 2; i++) {
              const a = (i / (spikes * 2)) * TAU + f.seed;
              const rr = (i % 2 === 0 ? rOut : rIn) * (0.88 + hash(i, f.seed) * 0.20);
              outerPts.push([hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 0.82]);
              midPts.push([hx + Math.cos(a + 0.16) * rr * 0.64, hy + Math.sin(a + 0.16) * rr * 0.54]);
              corePts.push([hx + Math.cos(a + 0.32) * rr * 0.34, hy + Math.sin(a + 0.32) * rr * 0.28]);
            }
            ctx.save();
            ctx.globalAlpha = fade * 0.80;
            drawCardboardCutoutChip(ctx, outerPts, f.burstCol || "#ffe24a", f.seed, { thickX: 6, thickY: 4.5, lw: 2.5 });
            const midCol = f.fxKind === "frost" ? "#2672e8" : (f.fxKind === "lightning" ? "#1e96ff" : (f.fxKind === "water" ? "#2498ff" : (f.fxKind === "slash" ? "#4eeeff" : "#ff3b14")));
            drawCardboardCutoutChip(ctx, midPts, midCol, f.seed + 3, { thickX: 4, thickY: 3, lw: 2.0 });
            ctx.globalAlpha = fade * 0.58;
            const coreCol = f.fxKind === "frost" ? "#eefaff" : "#fff799";
            fillWaxCrayon(ctx, corePts, coreCol, f.seed + 7, { lw: 1.4, softEdge: false });
            ctx.restore();
            ctx.save();
            ctx.translate(hx, hy - rOut * 0.10);
            ctx.rotate((hash(f.seed, 2) - 0.5) * 0.22);
            const fs = Math.round(Math.max(19, cam.unit * (cam.portrait ? 1.38 : 1.12) * (f.big ? 0.38 : 0.32) * popScale * pp));
            ctx.font = `900 ${fs}px "Fredoka", "PingFang SC", sans-serif`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
            ctx.strokeStyle = f.wordOl || OL; ctx.lineWidth = Math.max(5.0, fs * 0.20);
            ctx.strokeText(f.word, 0, 0);
            ctx.fillStyle = "#fffef8"; ctx.fillText(f.word, 0, 0);
            ctx.restore();
          } else if (f.k === "pop") {
            const popBounce = easeOutBack(Math.min(1, prog * 4.2));
            const fs = Math.round(Math.max(15, cam.unit * (f.crit ? 0.32 : 0.23) * popBounce * pp));
            const px = clamp(sx, 40, W - 40), py = clamp(sy, cam.portrait ? 104 : 68, H - 36);
            ctx.font = `900 ${fs}px "Fredoka", "PingFang SC", sans-serif`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
            ctx.strokeStyle = OL; ctx.lineWidth = Math.max(4.0, fs * 0.18);
            ctx.strokeText(f.text, px, py);
            ctx.fillStyle = f.col; ctx.fillText(f.text, px, py);
          }
          ctx.restore();
        }
      });
    }

    drawList.sort((a, b) => a.depth - b.depth);
    for (const item of drawList) item.draw();

    // Subtle crisp screen flash on crits / ultimates!
    if (screenFlashT > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.18, screenFlashT * 2.2);
      ctx.fillStyle = screenFlashCol;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Companion quick-control badge if selected
    if (selectedComp && game && game.companions.includes(selectedComp)) {
      const [cx, cy] = proj(selectedComp.gx, selectedComp.gy, selectedComp.gz + 1.15);
      const bx = clamp(cx, 120, W - 120), by = clamp(cy, 85, H - 70);
      ctx.save();
      ctx.fillStyle = "#fffdf6"; ctx.strokeStyle = OL; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(bx - 115, by - 22, 230, 36, 14); ctx.fill(); ctx.stroke();
      ctx.font = `900 12px "Fredoka", "PingFang SC", sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#24183a";
      const prioLabel = selectedComp.prio === "nearest" ? "最近" : (selectedComp.prio === "maxhp" ? "高血" : "Boss");
      ctx.fillText(`⬆️升级(30🪙) · 🎯${prioLabel} · ${selectedComp.guard ? "🛡️驻守" : "🐾跟随"}`, bx, by - 4);
      ctx.restore();
    }
  }

  /* ================= Input & Joystick ================= */
  function pointerPos(ev) {
    const rect = canvas.getBoundingClientRect();
    return [ev.clientX - rect.left, ev.clientY - rect.top];
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
    AudioSys.start();
    if (!game || !game.started || game.over) return;
    const [sx, sy] = pointerPos(ev);
    const [gx, gy] = screenToGrid(sx, sy);

    // Check if tapping selected companion control pill!
    if (selectedComp && game.companions.includes(selectedComp)) {
      const [cx, cy] = proj(selectedComp.gx, selectedComp.gy, selectedComp.gz + 1.15);
      const bx = clamp(cx, 120, W - 120), by = clamp(cy, 85, H - 70);
      if (Math.abs(sx - bx) <= 115 && Math.abs(sy - (by - 4)) <= 22) {
        if (sx < bx - 32) {
          if (game.gold >= 30 && selectedComp.lv < 5) {
            game.gold -= 30; selectedComp.lv++; syncHud();
            spawnDmgPop(selectedComp.gx, selectedComp.gy, 1.2, "⬆️ Lv" + selectedComp.lv, "#ffe44a", true);
          }
        } else if (sx < bx + 38) {
          const order = ["nearest", "maxhp", "boss"];
          selectedComp.prio = order[(order.indexOf(selectedComp.prio) + 1) % order.length];
        } else {
          selectedComp.guard = !selectedComp.guard;
          selectedComp.guardGx = selectedComp.gx; selectedComp.guardGy = selectedComp.gy;
        }
        return;
      }
    }

    // Tap a companion to select/cycle it!
    const tappedComp = game.companions.find(c => Math.hypot(c.gx - gx, c.gy - gy) <= 0.62);
    if (tappedComp) {
      selectedComp = selectedComp === tappedComp ? null : tappedComp;
      return;
    }
    selectedComp = null;

    // Clicking anywhere on the meadow/path moves the hero directly (NO planting/towers!)
    if (game.hero.deadT <= 0) {
      game.hero.target = { gx: clamp(gx, 0.2, COLS - 0.2), gy: clamp(gy, 0.2, ROWS - 0.2) };
    }
  });

  window.addEventListener("keydown", (ev) => {
    AudioSys.start();
    if (game && game.levelPick) {
      if (ev.key === "1") { chooseLevelUpgrade(0); return; }
      if (ev.key === "2") { chooseLevelUpgrade(1); return; }
      if (ev.key === "3") { chooseLevelUpgrade(2); return; }
    }
    keys[ev.code] = true;
    if (ev.code === "KeyQ" || ev.code === "Space") { ev.preventDefault(); triggerActiveSkill(0); return; }
    if (ev.code === "KeyE") { ev.preventDefault(); triggerActiveSkill(1); return; }
    if (ev.code === "KeyR") { ev.preventDefault(); triggerActiveSkill(2); return; }
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
    ev.stopPropagation(); AudioSys.start(); joyPid = ev.pointerId; joyZone.setPointerCapture(ev.pointerId);
    joyVec.active = true; updateJoy(ev.clientX, ev.clientY);
  });
  joyZone.addEventListener("pointermove", (ev) => { if (ev.pointerId === joyPid) updateJoy(ev.clientX, ev.clientY); });
  const endJoy = (ev) => {
    if (ev.pointerId !== joyPid) return;
    joyPid = null; joyVec.active = false; joyVec.x = 0; joyVec.y = 0; joyKnob.style.transform = "translate(0px, 0px)";
  };
  joyZone.addEventListener("pointerup", endJoy);
  joyZone.addEventListener("pointercancel", endJoy);

  document.querySelectorAll(".hero-opt").forEach((btn) => {
    btn.addEventListener("click", () => startWithHero(btn.dataset.hero));
  });
  document.getElementById("btn-speed").addEventListener("click", () => {
    speedMul = speedMul === 1 ? 2 : 1;
    const b = document.getElementById("btn-speed");
    b.textContent = speedMul + "×"; b.classList.toggle("active", speedMul === 2);
  });
  const muteBtn = document.getElementById("btn-mute");
  if (muteBtn) {
    muteBtn.addEventListener("click", () => {
      AudioSys.start();
      const m = AudioSys.toggleMute();
      muteBtn.textContent = m ? "🔇" : "🔊";
    });
  }
  for (let i = 0; i < 3; i++) {
    const sb = document.getElementById("skill-slot-" + i);
    if (sb) sb.addEventListener("click", () => triggerActiveSkill(i));
  }
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
    getGame() { return game; },
    renderNow() { render(); },
    pickHero(k) { startWithHero(k || "chili"); },
    moveHeroTo(gx, gy) { if (game && game.hero) game.hero.target = { gx, gy }; },
    setHeroPos(gx, gy) { if (game && game.hero) { game.hero.gx = gx; game.hero.gy = gy; game.hero.vx = 0; game.hero.vy = 0; game.hero.target = null; } },
    grantXp(n = 4) { grantHeroXp(n); },
    openPicker() { openLevelUpPicker(); },
    pickUpgrade(idx = 0) { chooseLevelUpgrade(idx); },
    unlockAndLevelSkill(slot = 0, lv = 5) {
      if (game && game.hero && game.hero.skills[slot]) {
        game.hero.skills[slot].lv = lv; game.hero.skills[slot].cdLeft = 0; syncSkillBtn();
      }
    },
    triggerSkill(slot = 0) { return triggerActiveSkill(slot); },
    spawnWave(wNum) {
      if (!game) return;
      game.waveNum = wNum; game.waveEntries = generateWave(wNum); game.spawnIdx = 0; game.spawnTimer = 0.05; game.enemies = [];
      syncHud();
    },
    spawnSlime(kind, lane = 0) { return game ? spawnSlimeEntry(kind, lane) : null; },
    stepSim(seconds, stepDt = 0.05) {
      const steps = Math.ceil(seconds / stepDt);
      for (let i = 0; i < steps; i++) {
        simTime += stepDt;
        step(stepDt);
        if (game && game.over) break;
      }
      render();
    },
    getState() {
      return game && {
        started: game.started,
        hero: game.hero && {
          key: game.hero.key, gx: +game.hero.gx.toFixed(2), gy: +game.hero.gy.toFixed(2),
          hp: Math.round(game.hero.hp), maxHp: game.hero.maxHp, deadT: +game.hero.deadT.toFixed(2),
          level: game.hero.level, xp: Math.round(game.hero.xp), xpNext: game.hero.xpNext,
          skills: game.hero.skills.map(s => ({ id: s.id, lv: s.lv, cdLeft: +s.cdLeft.toFixed(2) }))
        },
        companions: game.companions.length,
        levelPick: !!game.levelPick,
        wave: game.waveNum, lives: game.lives, gold: game.gold,
        over: game.over, slimesKilled: game.slimesKilled,
        enemies: game.enemies.length, shots: game.shots.length, fx: game.fx.length,
        activeZones: game.activeZones.length, puddles: game.puddles.length, rubbles: game.rubbles.length
      };
    }
  };

  renderHeroThumbs();
  whenReady(() => renderHeroThumbs());
  updateLayout();
  openHeroPicker();
  requestAnimationFrame(loop);
})();
