'use strict';
// ================= live audio for the game =================
// Music: the video's score is rendered offline once (against the video's fixed timeline) and sliced into
// per-phase segments that restart exactly when a phase starts, so bullet patterns stay on the beat.
// SFX: the same synth voices, built live on a real AudioContext from the simulation's event log.
const LA = { ctx: null, bus: null, noise: null, pw: null, musicL: null, musicR: null, musicBuf: null, musicGain: null, prog: 0, cur: null, muted: false };
const SEG = { title: [12, 24, 1], entrance: [24, 26, 0], p1: [26, 58, 1], rwAfter: [60.5, 62, 0], p2: [62, 94, 1], p3: [100, 132, 1], mid: [132, 136, 0], p4: [136, 152, 1], p5: [152, 168, 1], victory: [187, 213.5, 0] };

async function prerenderMusic() {
  const T0 = 10, T1 = 214, CL = 10, TAIL = 7, total = Math.ceil(SR * T1);
  const oL = new Float32Array(total), oR = new Float32Array(total);
  for (let c0 = T0; c0 < T1; c0 += CL) {
    const saved = Object.assign({}, TL), sk = T_KILL, sr = T_RUN;
    CH0 = c0; CH1 = c0 + CL; STEM = 'music'; LIVE = false;
    const len = Math.ceil(SR * (CL + TAIL));
    AC = new OfflineAudioContext(2, len, SR); BUS = {};
    NOISE = AC.createBuffer(1, SR * 2, SR);
    { const d = NOISE.getChannelData(0), r = mulberry32(3); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
    PW = { p125: pulseWave(0.125), p25: pulseWave(0.25), p50: pulseWave(0.5) };
    const master = AC.createGain(); master.gain.value = 0.75; master.connect(AC.destination);
    BUS.rev = AC.createConvolver(); BUS.rev.buffer = makeIR(2.6, 3.2);
    const rg = AC.createGain(); rg.gain.value = 0.32; BUS.rev.connect(rg); rg.connect(master);
    BUS.music = AC.createGain(); BUS.music.connect(master); BUS.sfx = BUS.music;
    useVideoTL(); scoreMusic(); Object.assign(TL, saved); T_KILL = sk; T_RUN = sr;
    const buf = await AC.startRendering(), a = buf.getChannelData(0), b = buf.getChannelData(1), off = Math.round(c0 * SR);
    for (let i = 0; i < len && off + i < total; i++) { oL[off + i] += a[i]; oR[off + i] += b[i]; }
    LA.prog = (c0 + CL - T0) / (T1 - T0);
  }
  const mags = new Float32Array(Math.floor(total / 32));
  for (let j = 0; j < mags.length; j++) mags[j] = Math.abs(oL[j * 32]);
  const q = Float32Array.from(mags).sort()[Math.floor(mags.length * 0.999)] || 1, g = 0.42 / q;
  for (let i = 0; i < total; i++) { oL[i] *= g; oR[i] *= g; }
  LA.musicL = oL; LA.musicR = oR; LA.prog = 1;
  if (LA.ctx) makeMusicBuffer();
}
// the build embeds the pre-rendered score (MUSIC_OGG, base64 Opus; see bake_music.py): decoding it takes a moment instead of composing
async function loadMusic() {
  if (typeof MUSIC_OGG === 'undefined') return prerenderMusic();
  try {
    const bytes = Uint8Array.from(atob(MUSIC_OGG), c => c.charCodeAt(0));
    const buf = await new OfflineAudioContext(2, 1, SR).decodeAudioData(bytes.buffer);
    LA.musicL = buf.getChannelData(0); LA.musicR = buf.getChannelData(1); LA.prog = 1;
    if (LA.ctx) makeMusicBuffer();
  } catch (e) { return prerenderMusic(); }
}
function makeMusicBuffer() {
  const b = LA.ctx.createBuffer(2, LA.musicL.length, SR);
  b.copyToChannel(LA.musicL, 0); b.copyToChannel(LA.musicR, 1);
  LA.musicBuf = b;
}
// Oryx V has its own score (audio5.js), baked the same way (MUSIC5_OGG)
async function loadMusic5() {
  if (typeof MUSIC5_OGG === 'undefined') { await prerenderMusic5(); if (LA.ctx) makeMusicBuffer5(); return; }
  try {
    const bytes = Uint8Array.from(atob(MUSIC5_OGG), c => c.charCodeAt(0));
    const buf = await new OfflineAudioContext(2, 1, SR).decodeAudioData(bytes.buffer);
    LA.music5L = buf.getChannelData(0); LA.music5R = buf.getChannelData(1); LA.prog5 = 1;
    if (LA.ctx) makeMusicBuffer5();
  } catch (e) { await prerenderMusic5(); if (LA.ctx) makeMusicBuffer5(); }
}
function makeMusicBuffer5() {
  const b = LA.ctx.createBuffer(2, LA.music5L.length, SR);
  b.copyToChannel(LA.music5L, 0); b.copyToChannel(LA.music5R, 1);
  LA.music5Buf = b;
}
function audioInit() {
  if (LA.ctx) { if (LA.ctx.state === 'suspended' && !G.paused) LA.ctx.resume(); return; }
  const ctx = new AudioContext({ sampleRate: SR }); LA.ctx = ctx;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
  LA.master = ctx.createGain(); LA.master.gain.value = 1; LA.master.connect(comp); comp.connect(ctx.destination);
  LA.musicGain = ctx.createGain(); LA.musicGain.gain.value = 0.9; LA.musicGain.connect(LA.master);
  const saved = [AC, NOISE, PW, BUS];
  AC = ctx; BUS = {};
  NOISE = ctx.createBuffer(1, SR * 2, SR);
  { const d = NOISE.getChannelData(0), r = mulberry32(3); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
  PW = { p125: pulseWave(0.125), p25: pulseWave(0.25), p50: pulseWave(0.5) };
  BUS.sfx = ctx.createGain(); BUS.sfx.gain.value = 0.42; BUS.sfx.connect(LA.master); BUS.music = BUS.sfx;
  BUS.rev = ctx.createConvolver(); BUS.rev.buffer = makeIR(2.2, 3.2);
  const rg = ctx.createGain(); rg.gain.value = 0.3; BUS.rev.connect(rg); rg.connect(BUS.sfx);
  LA.bus = BUS; LA.noise = NOISE; LA.pw = PW;
  [AC, NOISE, PW, BUS] = saved;
  if (LA.musicL) makeMusicBuffer();
  if (LA.music5L) makeMusicBuffer5();
}
function live(fn) {
  const saved = [AC, NOISE, PW, BUS, LIVE];
  AC = LA.ctx; NOISE = LA.noise; PW = LA.pw; BUS = LA.bus; LIVE = true;
  try { fn(); } finally { [AC, NOISE, PW, BUS, LIVE] = saved; }
}
function setMuted(m) { LA.muted = m; if (LA.master) LA.master.gain.setTargetAtTime(m ? 0 : 1, LA.ctx.currentTime, 0.05); }

// ---------- music ----------
function musicStop(fade = 0.35) {
  const c = LA.cur; if (!c) return; LA.cur = null;
  if (c.pending) return;
  const t = LA.ctx.currentTime;
  c.g.gain.cancelScheduledValues(t); c.g.gain.setValueAtTime(c.g.gain.value, t); c.g.gain.linearRampToValueAtTime(0, t + fade);
  try { c.src.stop(t + fade + 0.05); } catch (e) { }
}
function musicStart(key, into) {
  const five = !SEG[key] && key !== 'rewind', buf = five ? LA.music5Buf : LA.musicBuf;
  if (!buf) return false;
  const ctx = LA.ctx, g = ctx.createGain(), src = ctx.createBufferSource(), t = ctx.currentTime + 0.02;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.04); g.connect(LA.musicGain);
  if (key === 'rewind') { src.buffer = rewindBuffer(); src.connect(g); src.start(t, Math.max(0, into)); }
  else {
    const [a, b, loop] = five ? SEG5[key] : SEG[key], len = b - a;
    src.buffer = buf; src.connect(g);
    if (loop) { src.loop = true; src.loopStart = a; src.loopEnd = b; src.start(t, a + ((into % len) + len) % len); }
    else { if (into >= len) return true; src.start(t, a + Math.max(0, into), len - Math.max(0, into)); }
  }
  LA.cur = { key, src, g };
  return true;
}
// the rewind plays the phase-I music backwards along the same world-time curve as the picture
function rewindBuffer() {
  const n = Math.ceil((TL.rwB - TL.rwA) * SR), b = LA.ctx.createBuffer(2, n, SR), L = b.getChannelData(0), R = b.getChannelData(1);
  const [a, e] = SEG.p1, len = e - a;
  let w = TL.rwA - (S ? S.off : 0);
  for (let i = 0; i < n; i++) {
    const T = TL.rwA + i / SR; w += worldRate(T) / SR;
    const pos = (a + (((w - TL.p1) % len) + len) % len) * SR, k = Math.floor(pos), fr = pos - k;
    const fade = Math.min(1, i / (SR * 0.02), (n - i) / (SR * 0.05)), hiss = (hash(i, 17) - 0.5) * 0.015;
    L[i] = fade * (LA.musicL[k] * (1 - fr) + LA.musicL[k + 1] * fr + hiss);
    R[i] = fade * (LA.musicR[k] * (1 - fr) + LA.musicR[k + 1] * fr + hiss);
  }
  return b;
}
function desiredMusic(T) {
  if (BOSS_N === 5) return desiredMusic5(T);
  if (G.mode === 'title') return ['title', 0];
  if (!S || S.dead) return null;
  if (T >= T_KILL) return T >= T_KILL + 3 ? ['victory', T_KILL + 3] : null;
  if (T < TL.land) return ['entrance', TL.run];
  if (T >= TL.svB) return ['p5', TL.svB];
  if (T >= TL.sv) return null;
  if (T >= TL.p5) return ['p5', TL.p5];
  if (T >= TL.m12) return null;
  if (T >= TL.p4) return ['p4', TL.p4];
  if (T >= TL.mn) return ['mid', TL.mn];
  if (T >= TL.p3) return ['p3', TL.p3];
  if (T >= TL.ts) return null;
  if (T >= TL.p2) return ['p2', TL.p2];
  if (T >= TL.rwB) return ['rwAfter', TL.rwB];
  if (T >= TL.rwA) return ['rewind', TL.rwA];
  if (T >= TL.p1) return ['p1', TL.p1];
  return null;
}
function desiredMusic5(T) {
  if (G.mode === 'title') return ['title5', 0];
  if (!S || (S.dead && T >= S.dead)) return null;
  if (T >= T_KILL) return T >= T_KILL + 3 ? ['victory5', T_KILL + 3] : null;
  if (T < TL.land) return ['entrance5', TL.run];
  // the stage at T comes from the stage log, so a replay after the fight (the video recorder) hears the same music
  const L = S.f5.log; let j = L.length - 1; while (j > 0 && T < L[j].mT) j--;
  let k = j; while (k > 0 && FORMS5[L[k].i].tr === 'stance') k--;   // a change of stance keeps the music going
  const W0 = k ? L[k].T : TL.land, F = FORMS5[L[j].i];
  if (T < W0) return null;   // a new weapon: silence while the hall changes
  return [F.ai === 'knight3' ? 'laststand' : MUSIC5_KEYS[F.w], W0];
}
function musicUpdate(T) {
  if (!LA.ctx) return;
  const want = desiredMusic(T), cur = LA.cur ? LA.cur.key : null;
  if ((want ? want[0] : null) === cur && !(cur && LA.cur.pending)) return;
  if (cur) musicStop(want && want[0] === 'rewind' ? 0.05 : cur === 'title' ? 0.6 : 0.35);
  if (want) {
    const into = G.mode === 'title' ? LA.ctx.currentTime : T - want[1];
    if (!musicStart(want[0], into)) LA.cur = { key: want[0], pending: true, src: { stop() { } }, g: LA.musicGain };
  }
}

// ---------- sfx ----------
let _lastHit = -1, _lastShot = -1, _lastRing = -1, _lastDink = -1;
function playEvents(evs) {
  if (!LA.ctx || !evs.length || LA.muted) return;
  LIVE_OFF = S.T - (LA.ctx.currentTime + 0.03);
  live(() => { for (const e of evs) sfxEvent(e); });
}
function uiBlip(hi = 1) { if (!LA.ctx) return; LIVE_OFF = -LA.ctx.currentTime - 0.01; live(() => { bell(0, 1320 * hi, 0.25, { vol: 0.08, ratio: 2, index: 1, bus: 'sfx' }); bell(0.06, 1980 * hi, 0.3, { vol: 0.06, ratio: 2, index: 1, bus: 'sfx' }); }); }
function sfxEvent(e) {
  const t = e.T;
  switch (e.type) {
    case 'shot': if (t - _lastShot > 0.1) { _lastShot = t; noise(t, 0.05, { vol: 0.035, type: 'bandpass', f: 5200, q: 2, bus: 'sfx', pan: -0.15 }); sweep(t, 1900, 900, 0.04, { vol: 0.018, wave: 'square', bus: 'sfx' }); } break;
    case 'hit': // a damaging hit: punchy thump + crack, brighter on crits
      if (t - _lastHit > 0.045) {
        _lastHit = t; const v = 1 + (hash(Math.round(t * 997), 3) - 0.5) * 0.14;
        sweep(t, 210 * v, 62, 0.08, { vol: 0.32, bus: 'sfx' });
        noise(t, 0.05, { vol: 0.26, type: 'bandpass', f: 2300 * v, q: 1.3, bus: 'sfx', pan: 0.08 });
        noise(t, 0.022, { vol: 0.14, type: 'highpass', f: 6500, bus: 'sfx' });
        if (e.crit) { bell(t, 1760 * v, 0.2, { vol: 0.07, ratio: 2, index: 1.4, bus: 'sfx' }); sweep(t, 900, 1500, 0.05, { vol: 0.05, wave: 'square', bus: 'sfx' }); }
      }
      break;
    case 'dink': // no damage (armour or invulnerable): a metallic shield ping
      if (t - _lastDink > (e.heavy ? 0 : 0.07)) {
        _lastDink = t; const v = 1 + (hash(Math.round(t * 991), 5) - 0.5) * 0.1;
        bell(t, (e.heavy ? 1250 : 3100) * v, e.heavy ? 0.5 : 0.18, { vol: e.heavy ? 0.13 : 0.075, ratio: 1.414, index: e.heavy ? 4 : 2.2, bus: 'sfx', rev: 0.15 });
        noise(t, 0.015, { vol: e.heavy ? 0.12 : 0.06, type: 'highpass', f: 7000, bus: 'sfx' });
      }
      break;
    case 'star': whoosh(t, 0.3, 700, 4200, 0.35); bell(t, 1560, 0.3, { vol: 0.05, ratio: 2.4, index: 2, bus: 'sfx' }); break;
    case 'starHit': sweep(t, 140, 45, 0.3, { vol: 0.5, bus: 'sfx' }); noise(t, 0.35, { vol: 0.28, type: 'lowpass', f: 5000, f2: 260, bus: 'sfx', rev: 0.25 }); bell(t, 2640, 0.4, { vol: 0.05, ratio: 1.5, index: 2, bus: 'sfx', rev: 0.3 }); break;
    case 'killHit': boom(t, 0.9); shatter(t, 0.9, 99); crash(t, 1.0); tubular(t, mtof(50), 0.45, 3);
      sweep(t + 0.4, 45, 90, 2.0, { vol: 0.35, wave: 'sawtooth', bus: 'sfx', rev: 0.3 });
      for (let i = 0; i < 12; i++) noise(t + 0.5 + i * 0.16, 0.05, { vol: 0.15 + i * 0.02, type: 'highpass', f: 4000, bus: 'sfx' });
      break;
    case 'phurt': sweep(t, e.big ? 700 : 520, 170, e.big ? 0.22 : 0.12, { vol: e.big ? 0.22 : 0.13, wave: 'square', bus: 'sfx' }); break;
    case 'pot': for (let i = 0; i < 3; i++) sweep(t + i * 0.07, 380 + i * 160, 620 + i * 200, 0.06, { vol: 0.1, bus: 'sfx' }); break;
    case 'ring': case 'aim': if (t - _lastRing > 0.12) { _lastRing = t; sweep(t, e.type === 'ring' ? 820 : 1200, 380, 0.07, { vol: 0.03, wave: 'triangle', bus: 'sfx', pan: 0.2 }); } break;
    case 'swing': whoosh(t - 0.05, 0.4, 3000, 400, 0.7); noise(t, 0.3, { vol: 0.08, type: 'bandpass', f: 6000, q: 6, bus: 'sfx' }); break;
    case 'bell': tubular(t, mtof(45), 0.3, 3); break;
    case 'survival': boom(t, 1.2); tubular(t, mtof(26), 0.8, 7); choir(t + 0.3, [38, 45, 50, 53], 3.0, 1.6, 'sfx'); break;
    case 'wave': bell(t, 1320, 0.5, { vol: 0.09, ratio: 2, index: 2, bus: 'sfx', rev: 0.5 }); whoosh(t, 0.5, 300, 3000, 0.5); break;
    case 'cuckoo': for (let i = 0; i < 2; i++) { bell(t + i * 0.34, mtof(88), 0.18, { vol: 0.1, ratio: 1, index: 0.3, bus: 'sfx' }); bell(t + i * 0.34 + 0.15, mtof(84), 0.22, { vol: 0.1, ratio: 1, index: 0.3, bus: 'sfx' }); } break;
    case 'seek': sweep(t, 900, 1800, 0.12, { vol: 0.05, wave: 'triangle', bus: 'sfx' }); break;
    case 'wardenSink': sweep(t, 420, 90, 0.6, { vol: 0.2, bus: 'sfx', rev: 0.4 }); shatter(t, 0.25, 13); break;
    case 'flip': sweep(t, 180, 1400, 0.5, { vol: 0.25, bus: 'sfx', rev: 0.5 }); shatter(t + 0.1, 0.4, 31); tubular(t, mtof(52), 0.35, 3); break;
    case 'chime':
      if (e.c === 12) { tubular(t, mtof(26), 1.0, 9); boom(t, 1.3); crash(t, 1.4); }
      else { tubular(t, mtof(40), 0.62, 6); boom(t, 0.5); }
      break;
    case 'lob': sweep(t, 300, 620, 0.12, { vol: 0.05, bus: 'sfx' }); break;
    case 'lobHit': if (e.kind === 'glass') shatter(t, 0.35, Math.round(t * 100)); else { sweep(t, 180, 90, 0.15, { vol: 0.12, bus: 'sfx' }); noise(t, 0.12, { vol: 0.08, type: 'lowpass', f: 900, bus: 'sfx' }); } break;
    case 'pillar': sweep(t - 0.05, 2400, 300, 0.35, { vol: 0.08, bus: 'sfx', rev: 0.3 }); noise(t, 0.3, { vol: 0.12, type: 'highpass', f: 2500, bus: 'sfx' }); break;
    case 'echo': whoosh(t - 0.6, 0.9, 200, 1600, 0.6); choir(t, [50, 53, 57, 60], 1.6, 1.2, 'sfx'); break;
    case 'sentinels': for (let i = 0; i < 4; i++) { noise(t + i * 0.12, 0.08, { vol: 0.2, type: 'bandpass', f: 1200 + i * 300, q: 4, bus: 'sfx' }); bell(t + i * 0.12, 420 + i * 60, 0.3, { vol: 0.08, ratio: 1.41, index: 4, bus: 'sfx' }); } break;
    case 'sentDie': boom(t, 0.35); shatter(t, 0.3, Math.round(t * 10)); break;
    case 'shield': shatter(t, 0.7, 5); bell(t, 880, 1.2, { vol: 0.1, ratio: 2.76, index: 3, bus: 'sfx', rev: 0.5 }); break;
    case 'place': bell(t, 2350 + (Math.round(t * 50) % 5) * 90, 0.35, { vol: 0.07, ratio: 2.76, index: 4, bus: 'sfx', rev: 0.6 }); break;
    case 'blink': sweep(t, 200, 1700, 0.12, { vol: 0.14, bus: 'sfx', rev: 0.5 }); noise(t, 0.15, { vol: 0.12, type: 'bandpass', f: 1500, q: 2, bus: 'sfx', rev: 0.5 }); break;
    case 'sand': noise(t, 0.35, { vol: 0.018, type: 'highpass', f: 6000, bus: 'sfx', pan: 0.4 }); break;
    case 'portal': whoosh(t, 0.6, 200, 5000, 1.0); break;
    case 'eyes': sweep(t, 62, 48, 1.8, { vol: 0.35, wave: 'sawtooth', bus: 'sfx', rev: 0.4 }); break;
    case 'land': boom(t, 1.1); crash(t, 1.0); break;
    case 'rewindTaunt': sweep(t, 90, 60, 1.0, { vol: 0.2, wave: 'sawtooth', bus: 'sfx' }); break;
    case 'rewindEnd': noise(t, 0.08, { vol: 0.3, type: 'lowpass', f: 700, bus: 'sfx' }); sweep(t, 90, 50, 0.4, { vol: 0.4, bus: 'sfx' }); break;
    case 'stop':
      sweep(t, 520, 38, 1.4, { vol: 0.55, bus: 'sfx', rev: 0.6 }); noise(t, 1.0, { vol: 0.25, type: 'lowpass', f: 3000, f2: 100, bus: 'sfx', rev: 0.6 });
      for (let i = 0; i < 3; i++) { sweep(TL.tsA + 2.7 + i * 0.6, 70, 40, 0.14, { vol: 0.5, bus: 'sfx' }); sweep(TL.tsA + 2.88 + i * 0.6, 65, 38, 0.12, { vol: 0.35, bus: 'sfx' }); }
      revCym(TL.tsB, 1.0, 1.4);
      break;
    case 'shatterSmall': shatter(t, 0.35, Math.round(t * 1000) % 97); break;
    case 'resume': boom(t, 1.0); crash(t, 1.1); break;
    case 'midnight': sweep(t, 55, 41, 3.8, { vol: 0.3, wave: 'sawtooth', bus: 'sfx', rev: 0.3 }); break;
    case 'transform': boom(t, 0.9); sweep(t, 70, 40, 2.0, { vol: 0.4, wave: 'sawtooth', bus: 'sfx', rev: 0.4 }); crash(t, 1.0); break;
    case 'explode': boom(t, 0.75); shatter(t, 0.7, 77); crash(t, 0.8); break;
    case 'bag': [81, 85, 88, 93].forEach((m, i) => bell(t + 0.1 + i * 0.09, mtof(m), 0.8, { vol: 0.09, ratio: 2.0, index: 1.2, bus: 'sfx', rev: 0.5 })); break;
    case 'split': bell(t, 1760, 0.4, { vol: 0.06, ratio: 2, index: 1, bus: 'sfx' }); bell(t + 0.08, 2637, 0.5, { vol: 0.05, ratio: 2, index: 1, bus: 'sfx' }); break;
    // ---- Oryx V ----
    case 'morph':
      if (e.big) { boom(t, 0.9); crash(t, 0.8); choir(t + 0.2, [52, 59, 64, 67], 2.2, 1.4, 'sfx'); }
      else { whoosh(t, 0.7, 400, 4200, 0.6); sweep(t + 0.1, 90, 55, 0.8, { vol: 0.25, wave: 'sawtooth', bus: 'sfx', rev: 0.4 }); }
      [76, 79, 83, 88, 91].forEach((m, i) => bell(t + 0.08 * i, mtof(m), 0.6, { vol: 0.06, ratio: 2, index: 1.2, bus: 'sfx', rev: 0.5 }));
      tubular(t + (e.big ? 1.6 : 0.85), mtof(e.big ? 40 : 52), e.big ? 0.5 : 0.3, e.big ? 5 : 3);
      break;
    case 'lob5': sweep(t, 300, 700, 0.14, { vol: 0.05, bus: 'sfx' }); break;
    case 'land5':
      if (e.kind === 'bomb') { bell(t, 1320, 0.4, { vol: 0.07, ratio: 2.4, index: 2, bus: 'sfx', rev: 0.3 }); noise(t, 0.2, { vol: 0.14, type: 'lowpass', f: 3000, f2: 300, bus: 'sfx' }); }
      else if (e.kind === 'skull') { sweep(t, 400, 90, 0.35, { vol: 0.12, wave: 'triangle', bus: 'sfx', rev: 0.4 }); bell(t, 620, 0.5, { vol: 0.05, ratio: 1.41, index: 4, bus: 'sfx', rev: 0.4 }); }
      else if (e.kind === 'vial') { shatter(t, 0.25, Math.round(t * 70)); for (let i = 0; i < 4; i++) sweep(t + 0.05 + i * 0.06, 300 + i * 90, 700 + i * 120, 0.05, { vol: 0.05, bus: 'sfx' }); }
      else if (e.kind === 'trap') { noise(t, 0.03, { vol: 0.12, type: 'highpass', f: 4000, bus: 'sfx' }); bell(t, 900, 0.12, { vol: 0.05, ratio: 1.41, index: 3, bus: 'sfx' }); }
      break;
    case 'strike5':
      if (e.kind === 'bolt') { noise(t, 0.25, { vol: 0.3, type: 'highpass', f: 2500, bus: 'sfx', rev: 0.3 }); sweep(t, 180, 50, 0.4, { vol: 0.3, bus: 'sfx' }); }
      else if (e.kind === 'sword') { bell(t, 520, 0.5, { vol: 0.12, ratio: 1.41, index: 5, bus: 'sfx', rev: 0.3 }); boom(t, 0.3); }
      else if (e.kind === 'arrow') { noise(t, 0.05, { vol: 0.08, type: 'bandpass', f: 1800, bus: 'sfx' }); noise(t + 0.04, 0.04, { vol: 0.06, type: 'bandpass', f: 2400, bus: 'sfx' }); }
      else { sweep(t - 0.05, 2400, 300, 0.35, { vol: 0.08, bus: 'sfx', rev: 0.3 }); bell(t, 1760, 0.4, { vol: 0.05, ratio: 2, index: 1, bus: 'sfx', rev: 0.4 }); }
      break;
    case 'chain': noise(t, 0.3, { vol: 0.28, type: 'bandpass', f: 3000, f2: 800, q: 1.2, bus: 'sfx', rev: 0.3 }); sweep(t, 1400, 120, 0.25, { vol: 0.08, wave: 'square', bus: 'sfx' }); break;
    case 'snap': noise(t, 0.04, { vol: 0.14, type: 'bandpass', f: 2600, q: 3, bus: 'sfx' }); bell(t, 330, 0.18, { vol: 0.06, ratio: 1.41, index: 4, bus: 'sfx' }); break;
    case 'note': { const sc = [64, 67, 69, 71, 74, 76, 79, 81, 83, 86]; bell(t, mtof(sc[((e.k % 10) + 10) % 10]), 0.5, { vol: 0.07, ratio: 3.01, index: 1.2, bus: 'sfx', rev: 0.4, pan: e.k % 2 ? 0.3 : -0.3 }); break; }
    case 'chord': [64, 68, 71, 76].forEach(m => bell(t, mtof(m), 0.9, { vol: 0.06, ratio: 3.01, index: 1.4, bus: 'sfx', rev: 0.5 })); break;
    case 'cloak': whoosh(t, 0.5, 4000, 300, 0.5); break;
    case 'blink5': sweep(t, 200, 1700, 0.12, { vol: 0.12, bus: 'sfx', rev: 0.5 }); noise(t, 0.12, { vol: 0.1, type: 'bandpass', f: 1500, q: 2, bus: 'sfx', rev: 0.4 }); break;
    case 'split5': [84, 88, 91, 96].forEach((m, i) => bell(t + i * 0.05, mtof(m), 0.4, { vol: 0.06, ratio: 2.7, index: 2, bus: 'sfx', rev: 0.4 })); break;
    case 'decoyPop': shatter(t, 0.4, Math.round(t * 10)); break;
    case 'berserk': sweep(t, 120, 60, 0.9, { vol: 0.4, wave: 'sawtooth', bus: 'sfx', rev: 0.3 }); noise(t, 0.6, { vol: 0.2, type: 'bandpass', f: 500, q: 0.8, bus: 'sfx' }); break;
    case 'seal': [64, 71, 76].forEach((m, i) => bell(t + i * 0.08, mtof(m), 1.0, { vol: 0.07, ratio: 2, index: 1.5, bus: 'sfx', rev: 0.5 })); break;
    case 'judge': choir(t, [64, 71, 76], 0.5, 0.9, 'sfx'); break;
    case 'leap': whoosh(t, 0.8, 300, 2200, 0.7); sweep(t, 90, 160, 0.9, { vol: 0.2, wave: 'sawtooth', bus: 'sfx' }); break;
    case 'chargeUp': sweep(t, 60, 110, 0.9, { vol: 0.18, wave: 'sawtooth', bus: 'sfx' }); break;
    case 'charge': whoosh(t, 0.5, 3000, 300, 0.9); break;
    case 'impact': boom(t, 0.7); crash(t, 0.5); break;
    case 'mirrorUp': [88, 93, 95, 100].forEach((m, i) => bell(t + i * 0.06, mtof(m), 0.5, { vol: 0.06, ratio: 1.01, index: 0.6, bus: 'sfx', rev: 0.5 })); break;
    case 'freeze': shatter(t, 0.5, 12); sweep(t, 90, 40, 0.8, { vol: 0.35, bus: 'sfx' }); voice(t, 3500, 1.2, { wave: 'sine', vol: 0.02, a: 0.1, d: 0.3, s: 1, r: 0.3, bus: 'sfx' }); break;
    case 'thaw': noise(t, 0.1, { vol: 0.2, type: 'highpass', f: 3000, bus: 'sfx' }); whoosh(t, 0.4, 600, 3000, 0.5); break;
    case 'release': whoosh(t, 0.5, 500, 2500, 0.5); break;
    case 'drawBow': sweep(t, 180, 260, 0.6, { vol: 0.05, wave: 'triangle', bus: 'sfx' }); break;
    case 'quiver': sweep(t, 900, 120, 0.2, { vol: 0.22, wave: 'triangle', bus: 'sfx' }); noise(t, 0.3, { vol: 0.2, type: 'bandpass', f: 1200, f2: 300, bus: 'sfx' }); break;
    case 'chase': boom(t, 0.55); sweep(t, 95, 190, 0.55, { vol: 0.22, wave: 'sawtooth', bus: 'sfx', rev: 0.3 }); for (let i = 0; i < 3; i++) noise(t + 0.12 * i, 0.07, { vol: 0.16, type: 'bandpass', f: 900 + 300 * i, q: 3, bus: 'sfx' }); break;
    case 'rise': choir(t, [55, 62, 67, 71], 1.4, 1.0, 'sfx'); whoosh(t, 1.0, 300, 3200, 0.6); break;
    case 'heroDie': boom(t, 0.6); shatter(t, 0.6, Math.round(t * 30)); tubular(t + 0.1, mtof(43), 0.35, 4); break;
    case 'kneel': choir(t, [48, 55, 60, 64], 2.0, 1.2, 'sfx'); break;
    case 'raise': sweep(t, 90, 180, 0.7, { vol: 0.14, wave: 'sawtooth', bus: 'sfx', rev: 0.4 }); noise(t, 0.4, { vol: 0.08, type: 'lowpass', f: 900, bus: 'sfx' }); break;
    case 'growl': sweep(t, 110, 70, 0.5, { vol: 0.2, wave: 'sawtooth', bus: 'sfx' }); noise(t, 0.45, { vol: 0.1, type: 'bandpass', f: 300, q: 1.5, bus: 'sfx' }); break;
    case 'lunge': whoosh(t, 0.35, 2500, 400, 0.6); break;
    case 'lance': sweep(t, 600, 2400, 0.3, { vol: 0.08, wave: 'triangle', bus: 'sfx', rev: 0.4 }); bell(t, 1976, 0.6, { vol: 0.05, ratio: 2, index: 1, bus: 'sfx', rev: 0.5 }); break;
    case 'path': [72, 76, 79, 84].forEach((m, i) => bell(t + i * 0.05, mtof(m), 0.5, { vol: 0.05, ratio: 3.01, index: 1, bus: 'sfx', rev: 0.5 })); break;
    case 'sector': bell(t, 1320, 0.4, { vol: 0.08, ratio: 3.01, index: 1.4, bus: 'sfx', rev: 0.4 }); boom(t, 0.35); break;
    case 'death': boom(t, 0.8); sweep(t + 0.1, 440, 55, 1.6, { vol: 0.25, wave: 'square', bus: 'sfx', rev: 0.5 }); tubular(t + 0.2, mtof(38), 0.4, 5); break;
  }
}
