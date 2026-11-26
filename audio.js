(() => {
  "use strict";

  let actx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let muted = false;
  let started = false;
  let loopTimer = null;
  let stepIdx = 0;

  // Cheerful C-major pentatonic / playful crayon-meadow loop (118 BPM, 16th-eighth bounce)
  const BPM = 116;
  const STEP_MS = Math.round((60 / BPM / 2) * 1000); // 8th notes
  // Melody MIDI notes (null = rest)
  const MELODY = [
    72, 76, 79, null, 76, 79, 84, null,
    81, 79, 76, 74, 72, null, 74, 76,
    77, 81, 84, null, 81, 79, 76, null,
    74, 76, 79, 76, 74, null, 72, null
  ];
  const BASS = [
    48, null, 55, null, 48, null, 55, null,
    45, null, 52, null, 48, null, 52, null,
    41, null, 48, null, 43, null, 50, null,
    43, null, 55, null, 48, null, 48, null
  ];

  function midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  function ensureCtx() {
    if (actx) {
      if (actx.state === "suspended") actx.resume().catch(() => {});
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    actx = new AC();
    masterGain = actx.createGain();
    masterGain.gain.value = muted ? 0 : 0.72;
    masterGain.connect(actx.destination);

    musicGain = actx.createGain();
    musicGain.gain.value = 0.28;
    musicGain.connect(masterGain);

    sfxGain = actx.createGain();
    sfxGain.gain.value = 0.62;
    sfxGain.connect(masterGain);
    return true;
  }

  function playNote(freq, dur, type, vol, dest, slideTo = null) {
    if (!actx || muted) return;
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    const g = actx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function playNoise(dur, freq, q, vol, dest) {
    if (!actx || muted) return;
    const t = actx.currentTime;
    const len = Math.max(256, Math.floor(actx.sampleRate * dur));
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = actx.createBufferSource();
    src.buffer = buf;
    const filt = actx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.setValueAtTime(freq, t);
    filt.Q.setValueAtTime(q, t);
    const g = actx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(dest);
    src.start(t);
  }

  function tickMusic() {
    if (!actx || muted || actx.state !== "running") return;
    const i = stepIdx % MELODY.length;
    stepIdx++;
    const m = MELODY[i];
    const b = BASS[i];
    if (m != null) {
      // Toy-marimba / kalimba pluck
      playNote(midiToFreq(m), 0.19, "triangle", 0.14, musicGain);
      playNote(midiToFreq(m + 12), 0.07, "sine", 0.04, musicGain);
    }
    if (b != null) {
      // Soft pizzicato bass bounce
      playNote(midiToFreq(b), 0.22, "sine", 0.16, musicGain);
    }
    if (i % 4 === 2) {
      // Soft paper-shaker / brush tick
      playNoise(0.035, 3600, 1.8, 0.035, musicGain);
    }
  }

  function startMusic() {
    if (!ensureCtx()) return;
    if (started) return;
    started = true;
    if (loopTimer) clearInterval(loopTimer);
    loopTimer = setInterval(tickMusic, STEP_MS);
  }

  function toggleMute() {
    muted = !muted;
    if (masterGain && actx) {
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.72, actx.currentTime, 0.02);
    }
    return muted;
  }

  function sfxAttack(kind) {
    if (!actx || muted) return;
    if (kind === "fire") {
      playNoise(0.14, 900, 1.2, 0.14, sfxGain);
      playNote(320, 0.13, "sawtooth", 0.09, sfxGain, 620);
    } else if (kind === "lightning") {
      playNote(920, 0.08, "square", 0.07, sfxGain, 260);
      playNoise(0.11, 2800, 2.0, 0.12, sfxGain);
    } else if (kind === "frost") {
      playNote(1080, 0.12, "sine", 0.10, sfxGain, 1560);
      playNote(1440, 0.10, "triangle", 0.06, sfxGain, 880);
    } else if (kind === "water") {
      playNote(260, 0.16, "sine", 0.12, sfxGain, 540);
      playNoise(0.12, 1400, 2.5, 0.09, sfxGain);
    } else if (kind === "rock") {
      playNote(155, 0.16, "triangle", 0.18, sfxGain, 68);
      playNoise(0.11, 420, 1.0, 0.14, sfxGain);
    } else if (kind === "slash") {
      playNoise(0.09, 2400, 1.3, 0.15, sfxGain);
      playNote(580, 0.09, "sawtooth", 0.09, sfxGain, 190);
    }
  }

  function sfxHit(kind, isCrit = false) {
    if (!actx || muted) return;
    const mul = isCrit ? 1.35 : 1.0;
    if (kind === "lightning") {
      playNoise(0.12, 3400, 1.5, 0.16 * mul, sfxGain);
      playNote(760, 0.10, "square", 0.08 * mul, sfxGain, 140);
    } else if (kind === "frost") {
      playNote(1320, 0.11, "triangle", 0.11 * mul, sfxGain, 660);
    } else if (kind === "slash") {
      playNoise(0.08, 3100, 1.4, 0.14 * mul, sfxGain);
      playNote(440, 0.08, "triangle", 0.11 * mul, sfxGain, 130);
    } else {
      playNote(isCrit ? 240 : 190, 0.11, "triangle", 0.15 * mul, sfxGain, 70);
      playNoise(0.07, 1100, 1.2, 0.09 * mul, sfxGain);
    }
  }

  function sfxUltimate(kind) {
    if (!actx || muted) return;
    playNote(392, 0.18, "triangle", 0.14, sfxGain, 784);
    setTimeout(() => playNote(523, 0.24, "triangle", 0.15, sfxGain, 1046), 60);
    if (kind === "fire" || kind === "rock") playNoise(0.28, 700, 0.9, 0.18, sfxGain);
    else if (kind === "lightning" || kind === "slash") playNoise(0.24, 3200, 1.4, 0.18, sfxGain);
    else playNoise(0.26, 1700, 1.6, 0.15, sfxGain);
  }

  function sfxHop(heavy = false) {
    if (!actx || muted) return;
    playNote(heavy ? 120 : 210, heavy ? 0.12 : 0.07, "sine", heavy ? 0.11 : 0.045, sfxGain, heavy ? 55 : 110);
  }

  function sfxPick() {
    if (!actx || muted) return;
    playNote(587, 0.10, "triangle", 0.12, sfxGain);
    setTimeout(() => playNote(880, 0.16, "triangle", 0.12, sfxGain), 65);
  }

  function bindAutoStart() {
    const wake = () => {
      startMusic();
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
    window.addEventListener("pointerdown", wake, { passive: true });
    window.addEventListener("keydown", wake, { passive: true });
  }
  bindAutoStart();

  window.GameAudio = {
    start: startMusic,
    toggleMute,
    isMuted: () => muted,
    sfxAttack,
    sfxHit,
    sfxUltimate,
    sfxHop,
    sfxPick
  };
})();
