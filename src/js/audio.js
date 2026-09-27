'use strict';
// ================= original soundtrack + SFX (WebAudio, rendered offline) =================
const SR = 48000;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
let AC, NOISE, PW = {}, BUS = {}, CH0 = 0, CH1 = 1e9, STEM = 'music', LIVE = false, LIVE_OFF = 0;
// chunked rendering: only primitives whose start time is inside [CH0, CH1) and whose bus is the current stem get built
function gate(t, bus) {
  if (LIVE) { const lt = t - LIVE_OFF; return lt < AC.currentTime - 0.08 ? null : Math.max(lt, AC.currentTime); }
  return (t < CH0 || t >= CH1 || (STEM !== '*' && (bus || 'music') !== STEM)) ? null : t - CH0;   // STEM '*': every bus (offline recordings)
}

function pulseWave(duty) {
  const n = 64, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  return AC.createPeriodicWave(re, im);
}
function makeIR(sec, decay) {
  const len = Math.floor(SR * sec), b = AC.createBuffer(2, len, SR), rng = mulberry32(7);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (rng() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return b;
}
function env(g, t, peak, a, d, s, rel, dur) {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setTargetAtTime(peak * s, t + a, d / 3);
  const off = t + Math.max(a, dur);
  g.gain.setTargetAtTime(0, off, rel / 4);
  return off + rel;
}
function voice(t, f, dur, o) {
  t = gate(t, o.bus); if (t === null) return;
  // o: {wave, pw, vol, a, d, s, r, lp, q, lpEnv, det, pan, bus, vib, glide, rev}
  const out = AC.createGain(), end = env(out, t, o.vol, o.a ?? 0.005, o.d ?? 0.1, o.s ?? 0.6, o.r ?? 0.08, dur);
  let node = out;
  if (o.lp) {
    const flt = AC.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = o.q ?? 1;
    flt.frequency.setValueAtTime(o.lp, t);
    if (o.lpEnv) { flt.frequency.setValueAtTime(o.lp * o.lpEnv, t); flt.frequency.setTargetAtTime(o.lp, t + 0.01, o.lpT ?? 0.08); }
    flt.connect(out); node = flt;
  }
  const dets = o.det ? [-o.det, o.det] : [0];
  for (const dt of dets) {
    const osc = AC.createOscillator();
    if (o.pw) osc.setPeriodicWave(PW[o.pw]); else osc.type = o.wave || 'square';
    osc.frequency.setValueAtTime(o.glide ? f * o.glide : f, t);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(f, t + (o.glideT ?? 0.05));
    osc.detune.value = dt;
    if (o.vib) { const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * o.vib, t + 0.25); lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(end); }
    const vg = AC.createGain(); vg.gain.value = 1 / dets.length;
    osc.connect(vg); vg.connect(node); osc.start(t); osc.stop(end + 0.05);
  }
  route(out, o);
  return out;
}
function route(node, o) {
  let n = node;
  if (o.pan) { const p = AC.createStereoPanner(); p.pan.value = o.pan; node.connect(p); n = p; }
  n.connect(BUS[o.bus || 'music']);
  if (o.rev) { const s = AC.createGain(); s.gain.value = o.rev; n.connect(s); s.connect(BUS.rev); }
}
function noise(t, dur, o) {
  t = gate(t, o.bus); if (t === null) return;
  // o: {vol, type, f, f2, q, a, r, bus, pan, rev}
  const src = AC.createBufferSource(); src.buffer = NOISE; src.loop = true;
  const flt = AC.createBiquadFilter(); flt.type = o.type || 'bandpass'; flt.Q.value = o.q ?? 1;
  flt.frequency.setValueAtTime(o.f || 2000, t);
  if (o.f2) flt.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
  const g = AC.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.vol, t + (o.a ?? 0.003));
  if (o.rise) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.02); }
  else g.gain.setTargetAtTime(0, t + (o.a ?? 0.003), (o.r ?? dur) / 4);
  src.connect(flt); flt.connect(g);
  src.start(t, (Math.abs(t) * 7.3) % 1.5); src.stop(t + dur + (o.r ?? dur) + 0.1);
  route(g, o);
}
function sweep(t, f0, f1, dur, o) { // pitched sweep (zaps, drops, whooshes)
  t = gate(t, o.bus); if (t === null) return;
  const osc = AC.createOscillator(); osc.type = o.wave || 'sine';
  osc.frequency.setValueAtTime(f0, t); osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(o.vol, t); g.gain.setTargetAtTime(0, t + dur * 0.3, dur / 3);
  osc.connect(g); osc.start(t); osc.stop(t + dur * 1.6 + 0.05);
  route(g, o);
}
function bell(t, f, dur, o) { // FM bell
  t = gate(t, o.bus); if (t === null) return;
  const car = AC.createOscillator(), mod = AC.createOscillator(), mg = AC.createGain(), g = AC.createGain();
  car.frequency.value = f; mod.frequency.value = f * (o.ratio || 3.5);
  mg.gain.setValueAtTime(f * (o.index || 3), t); mg.gain.setTargetAtTime(f * 0.2, t, dur / 5);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.vol, t + 0.004); g.gain.setTargetAtTime(0, t + 0.004, dur / 4);
  mod.connect(mg); mg.connect(car.frequency); car.connect(g);
  car.start(t); mod.start(t); car.stop(t + dur * 1.5); mod.stop(t + dur * 1.5);
  route(g, o);
}
function tubular(t, f, vol, dur = 6) { // huge clock chime: inharmonic partials
  noise(t, 0.08, { vol: vol * 0.5, type: 'highpass', f: 3000, bus: 'sfx', rev: 0.3 });
  t = gate(t, 'sfx'); if (t === null) return;
  [[1, 1], [2.0, 0.6], [2.76, 0.45], [4.07, 0.3], [5.4, 0.2], [0.5, 0.5]].forEach(([r, a], i) => {
    const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f * r; o.detune.value = (i % 2 ? 4 : -4);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * a, t + 0.006); g.gain.setTargetAtTime(0, t + 0.006, dur / (3 + i));
    o.connect(g); o.start(t); o.stop(t + dur * 1.2); route(g, { bus: 'sfx', rev: 0.6, pan: i % 2 ? 0.2 : -0.2 });
  });
}
function kick(t, v = 1, bus = 'music') { sweep(t, 150, 42, 0.16, { vol: 0.9 * v, bus }); noise(t, 0.012, { vol: 0.25 * v, type: 'highpass', f: 2500, bus }); }
function snare(t, v = 1, bus = 'music') { noise(t, 0.16, { vol: 0.5 * v, type: 'bandpass', f: 1900, q: 0.7, bus, rev: 0.15 }); sweep(t, 240, 160, 0.08, { vol: 0.35 * v, wave: 'triangle', bus }); }
function hat(t, v = 1, open = false, bus = 'music') { noise(t, open ? 0.22 : 0.035, { vol: 0.16 * v, type: 'highpass', f: 7500, bus, pan: 0.25 }); }
function crash(t, v = 1) { noise(t, 1.4, { vol: 0.32 * v, type: 'highpass', f: 5200, r: 1.6, bus: 'music', rev: 0.3 }); }
function tick(t, hi, v = 1, bus = 'music') { bell(t, hi ? 2100 : 1500, 0.06, { vol: 0.11 * v, ratio: 1.4, index: 1, bus, pan: hi ? 0.35 : -0.35 }); }
function revCym(t1, dur, v = 1) { noise(t1 - dur, dur, { vol: 0.3 * v, type: 'highpass', f: 4000, rise: true, bus: 'music' }); }
function boom(t, v = 1, bus = 'sfx') { sweep(t, 110, 26, 1.4, { vol: 0.95 * v, bus }); noise(t, 0.9, { vol: 0.6 * v, type: 'lowpass', f: 1800, f2: 90, bus, rev: 0.4 }); }
function whoosh(t, dur, f0, f1, v = 1, bus = 'sfx') { noise(t, dur, { vol: 0.35 * v, type: 'bandpass', f: f0, f2: f1, q: 1.4, a: dur * 0.4, r: dur * 0.6, bus, rev: 0.25 }); }
function shatter(t, v = 1, seed = 1) {
  const r = mulberry32(seed);
  noise(t, 0.5, { vol: 0.45 * v, type: 'highpass', f: 3500, r: 0.6, bus: 'sfx', rev: 0.3 });
  for (let i = 0; i < 14; i++) bell(t + r() * 0.35, 2200 + r() * 4200, 0.25, { vol: 0.07 * v, ratio: 2.7, index: 2, bus: 'sfx', pan: r() * 1.6 - 0.8, rev: 0.3 });
}
function choir(t, notes, dur, v = 1, bus = 'music') {
  t = gate(t, bus); if (t === null) return;
  for (const m of notes) for (const vw of [[700, 1150], [400, 800]]) {
    const src = AC.createOscillator(); src.type = 'sawtooth'; src.frequency.value = mtof(m);
    const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 4.8; lg.gain.value = mtof(m) * 0.006; lfo.connect(lg); lg.connect(src.frequency);
    const g = AC.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05 * v, t + dur * 0.3); g.gain.setValueAtTime(0.05 * v, t + dur * 0.75); g.gain.linearRampToValueAtTime(0, t + dur);
    for (const fq of vw) { const b = AC.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fq; b.Q.value = 6; src.connect(b); b.connect(g); }
    src.start(t); lfo.start(t); src.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
    route(g, { bus, rev: 0.5, pan: vw[0] === 700 ? -0.3 : 0.3 });
  }
}
function pad(t, notes, dur, v = 1) { for (const m of notes) voice(t, mtof(m), dur, { wave: 'sawtooth', vol: 0.028 * v, a: 0.4, d: 0.5, s: 0.9, r: 0.6, lp: 1300, det: 9, rev: 0.35, pan: (m % 2 ? 0.3 : -0.3) }); }

// ---------- score ----------
const CH = { Dm: [62, 65, 69], Bb: [58, 62, 65], C: [60, 64, 67], A: [57, 61, 64], Gm: [55, 58, 62], F: [53, 57, 60], Eb: [51, 55, 58], D: [62, 66, 69], G: [55, 59, 62], Em: [64, 67, 71] };
const PROG_A = ['Dm', 'Bb', 'C', 'A', 'Dm', 'Bb', 'Gm', 'A'];
const PROG_R = ['A', 'Gm', 'Bb', 'Dm', 'A', 'C', 'Bb', 'Dm'];
const PROG_S = ['Dm', 'Dm', 'Eb', 'Eb', 'Dm', 'Dm', 'C', 'A'];
const MEL_A = [[0, 74, 1], [1, 77, 1], [2, 81, 1.5], [3.5, 79, 0.5], [4, 77, 1], [5, 74, 1], [6, 77, 0.5], [6.5, 79, 0.5], [7, 77, 1],
  [8, 76, 1], [9, 72, 1], [10, 76, 1], [11, 79, 1], [12, 81, 2], [14, 76, 1], [15, 73, 1],
  [16, 74, 1], [17, 77, 1], [18, 81, 1], [19, 86, 1], [20, 84, 1.5], [21.5, 82, 0.5], [22, 81, 1], [23, 77, 1],
  [24, 79, 1], [25, 82, 1], [26, 81, 1], [27, 79, 0.5], [27.5, 77, 0.5], [28, 76, 1], [29, 73, 1], [30, 76, 1], [31, 81, 1]];
const MEL_R = MEL_A.map(([b, m, l]) => [32 - (b + l), m, l]).sort((a, c) => a[0] - c[0]);
const MEL_S = [[0, 81, 3], [3, 79, 1], [4, 77, 2], [6, 76, 2], [8, 75, 3], [11, 74, 1], [12, 70, 4], [16, 81, 2], [18, 86, 2], [20, 84, 2], [22, 81, 2], [24, 79, 2], [26, 76, 2], [28, 73, 2], [30, 76, 2]];
const SCALE_D = [62, 64, 65, 67, 69, 70, 72];
function third(m) { // diatonic third below in D minor (C# treated as leading tone)
  if (m % 12 === 1) return m - 4;
  const pc = ((m - 62) % 12 + 12) % 12, oct = Math.floor((m - 62) / 12), idx = SCALE_D.findIndex(s => (s - 62) === pc);
  if (idx < 0) return m - 3;
  const j = idx - 2, o2 = j < 0 ? oct - 1 : oct;
  return SCALE_D[(j + 7) % 7] + 12 * o2;
}
const beatT = (bar, beat) => bar * BAR + beat * BEAT;

function secDrums(bar0, nb, style, T0 = 0, T1 = 1e9) {
  for (let b = bar0; b < bar0 + nb; b++) for (let s = 0; s < 16; s++) {
    const t = beatT(b, s / 4); if (t < T0 || t >= T1) continue;
    const odd = (b - bar0) % 2 === 1;
    if (style === 'rock') {
      if ([0, 6, 8, 11].includes(s)) kick(t, s === 0 ? 1 : 0.8);
      if (s === 4 || s === 12) snare(t);
      if (s % 2 === 0) hat(t, s % 4 === 0 ? 1 : 0.6, odd && s === 14);
      if (s % 2 === 0) tick(t, s % 4 === 0, 0.55);
    } else if (style === 'half') {
      if ([0, 7, 10].includes(s)) kick(t, 0.9);
      if (s === 8) snare(t, 1.1);
      if (s % 2 === 0) hat(t, 0.55);
      if (s % 4 === 2) tick(t, false, 0.5);
    } else if (style === 'stutter') {
      if (s % 4 === 0) kick(t, 0.9);
      if (s === 4 || s === 12) snare(t, 0.9);
      if (s % 4 < 2) hat(t, 0.8); if (s % 4 === 0) tick(t, s % 8 === 0, 0.7);
    } else if (style === 'drive') {
      if (s % 4 === 0 || s === 10) kick(t, 1);
      if (s === 4 || s === 12) snare(t, 1.1);
      if (s === 7 || s === 15) snare(t, 0.3);
      hat(t, s % 2 ? 0.45 : 0.85);
      if (s % 2 === 0) tick(t, s % 4 === 0, 0.45);
    } else if (style === 'lobby') {
      if (s % 2 === 0) hat(t, 0.4);
      if (s % 4 === 0) tick(t, s % 8 === 0, 0.8);
      if (b >= 9 && (s === 0 || s === 8)) kick(t, 0.7);
    }
  }
}
function secBass(bar0, prog, style, tr = 0, T0 = 0, T1 = 1e9) {
  prog.forEach((c, i) => {
    const r = CH[c][0] - 24 + tr, bar = bar0 + i;
    const n16 = style === 'drive' ? 16 : 8;
    for (let k = 0; k < n16; k++) {
      const t = beatT(bar, k * 4 / n16); if (t < T0 || t >= T1) continue;
      if (style === 'stutter' && k % 2 === 1) continue;
      const m = r + (style === 'half' ? (k % 4 === 3 ? 12 : 0) : (k % 2 ? 12 : 0));
      voice(t, mtof(m), 4 / n16 * BEAT * 0.85, { wave: 'sawtooth', vol: 0.16, a: 0.004, d: 0.12, s: 0.5, r: 0.05, lp: 420, lpEnv: 4, q: 4, pan: 0 });
    }
  });
}
function secArp(bar0, prog, tr = 0, v = 1, dir = 1, T0 = 0, T1 = 1e9) {
  prog.forEach((c, i) => {
    const ch = CH[c].map(m => m + 12 + tr), seq = [ch[0], ch[1], ch[2], ch[0] + 12, ch[2], ch[1]];
    for (let k = 0; k < 16; k++) {
      const t = beatT(bar0 + i, k / 4); if (t < T0 || t >= T1) continue;
      const m = dir > 0 ? seq[k % 6] : seq[5 - (k % 6)];
      voice(t, mtof(m), 0.1, { pw: 'p125', vol: 0.045 * v, a: 0.002, d: 0.06, s: 0.2, r: 0.04, pan: k % 2 ? 0.45 : -0.45, rev: 0.2 });
    }
  });
}
function secPad(bar0, prog, tr = 0, v = 1, T0 = 0, T1 = 1e9) { prog.forEach((c, i) => { const t = beatT(bar0 + i, 0); if (t >= T0 && t < T1) pad(t, CH[c].map(m => m + tr), BAR, v); }); }
function secLead(bar0, mel, tr = 0, o = {}) {
  for (const [b, m, l] of mel) {
    const t = bar0 * BAR + b * BEAT; if (t < (o.T0 ?? 0) || t >= (o.T1 ?? 1e9)) continue;
    const f = mtof(m + tr);
    voice(t, f, l * BEAT * 0.92, Object.assign({ pw: 'p25', vol: 0.085, a: 0.01, d: 0.2, s: 0.7, r: 0.12, vib: 0.012, pan: -0.1, rev: 0.3 }, o.v || {}));
    if (o.harm) voice(t, mtof(third(m) + tr), l * BEAT * 0.92, { pw: 'p50', vol: 0.05, a: 0.01, d: 0.2, s: 0.7, r: 0.12, vib: 0.01, pan: 0.25, rev: 0.3 });
    if (o.oct) voice(t, f / 2, l * BEAT * 0.92, { wave: 'sawtooth', vol: 0.04, a: 0.01, d: 0.2, s: 0.7, r: 0.12, lp: 2400, pan: 0.15, rev: 0.25 });
  }
}

function scoreMusic() {
  // ---- cold open ----
  pad(0.2, [38, 45, 50], 11.5, 1.6);
  for (let t = 0.5; t < 11.5; t += BEAT) tick(t, Math.round(t * 2) % 2 === 0, 0.8);
  for (const t of [1.0, 4.0]) { sweep(t, 70, 30, 1.6, { vol: 0.5, bus: 'music' }); noise(t, 1.2, { vol: 0.12, type: 'lowpass', f: 600, bus: 'music', rev: 0.5 }); }
  whoosh(6.1, 0.9, 300, 3000, 0.6, 'music'); sweep(7.0, 60, 25, 2, { vol: 0.6, bus: 'music' });
  for (let i = 0; i < 6; i++) bell(7.0 + i * 0.09, 1800 - i * 180, 0.4, { vol: 0.05, ratio: 2.5, bus: 'music', rev: 0.4 });
  tubular(10.0, mtof(38), 0.55, 5); boom(10.0, 0.8, 'music'); choir(10.0, [50, 57, 62, 65], 2.2, 1.4); crash(10.0, 0.8);
  // ---- lobby (bars 6-11) ----
  secDrums(6, 4, 'lobby');
  ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'Bb'].forEach((c, i) => {
    const bar = 6 + i, r = CH[c][0] - 24;
    for (let k = 0; k < 8; k++) voice(beatT(bar, k / 2), mtof(r + (k % 2 ? 12 : 0)), 0.2, { wave: 'sawtooth', vol: 0.17 + 0.03 * i, a: 0.004, d: 0.1, s: 0.4, r: 0.05, lp: 300 + i * 110, lpEnv: 3, q: 3 });
  });
  secPad(6, ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'Bb'], 0, 1.8);
  MEL_A.slice(0, 9).forEach(([b, m, l]) => bell(beatT(8, b), mtof(m + 12), 0.9, { vol: 0.15, ratio: 3.01, index: 1.2, bus: 'music', rev: 0.4, pan: 0.2 }));
  for (let s = 0; s < 32; s++) snare(beatT(10, s / 4), 0.15 + s * 0.022);
  for (let s = 0; s < 16; s++) snare(beatT(11.5, s / 8), 0.5 + s * 0.02);
  noise(20.0, 4.0, { vol: 0.2, type: 'bandpass', f: 400, f2: 6000, q: 2, rise: true, bus: 'music' });
  // ---- entrance (bar 12) ----
  pad(24.0, [38, 39, 45], 2.0, 2.2);
  for (const t of [24.0, 24.5, 25.0, 25.5]) kick(t, 0.8);
  revCym(26.0, 1.4, 1.2);
  // ---- phase I: TICK (bars 13-28) ----
  crash(26.0, 1.2);
  for (const off of [0, 8]) {
    const b0 = 13 + off;
    secDrums(b0, 8, 'rock', 0, TL.rw); secBass(b0, PROG_A, 'rock', 0, 0, TL.rwA); secArp(b0, PROG_A, 0, 1, 1, 0, TL.rwA); secPad(b0, PROG_A, 0, 1, 0, TL.rwA);
    secLead(b0, MEL_A, 0, { harm: off === 8, T1: TL.rwA });
    crash(beatT(b0, 0), 0.7); crash(beatT(b0 + 4, 0), 0.5);
  }
  // ---- rewind aftermath (60.5-62) + phase II: REWIND (bars 31-46) ----
  pad(60.5, [45, 50, 53], 1.5, 1.4); revCym(62.0, 1.4, 1.1);
  for (const off of [0, 8, 16, 24]) {
    if (off >= 16) continue;
  }
  for (const off of [0, 8]) {
    const b0 = 31 + off * 1;
    secDrums(b0, 8, 'half', 0, TL.ts); secBass(b0, PROG_R, 'half'); secArp(b0, PROG_R, 0, 0.9, -1); secPad(b0, PROG_R, 0, 1.1);
    secLead(b0, MEL_R, 0, { v: { pw: 'p125', vol: 0.08, vib: 0.018 } });
    revCym(beatT(b0 + 4, 0), 1.0, 0.8); crash(beatT(b0, 0), 0.6);
  }
  for (const off of [16]) { const b0 = 31 + off; secDrums(b0, 8, 'half', 0, TL.ts); }
  // bars 39-46 second half of phase II uses retrograde lead with harmony (drums already scheduled above for 39-46)
  // ---- time stop ----
  pad(94.0, [50, 53, 57], 0.6, 1.2);
  // ---- phase III: STASIS (bars 50-65) ----
  crash(100.0, 1.0);
  for (const off of [0, 8]) {
    const b0 = 50 + off, style = off === 0 ? 'stutter' : 'rock';
    secDrums(b0, 8, style); secBass(b0, PROG_S, off === 0 ? 'stutter' : 'rock'); secArp(b0, PROG_S, 0, 0.8, 1); secPad(b0, PROG_S, 0, 1.1);
    for (const [b, m, l] of MEL_S) { const t = b0 * BAR + b * BEAT; bell(t, mtof(m), l * BEAT * 1.6, { vol: 0.07, ratio: 2.0, index: 1.5, bus: 'music', rev: 0.45, pan: 0.15 }); voice(t, mtof(m), l * BEAT * 0.95, { wave: 'triangle', vol: 0.07, a: 0.05, d: 0.3, s: 0.8, r: 0.3, vib: 0.008, rev: 0.4 }); }
    crash(beatT(b0, 0), 0.6);
  }
  // ---- midnight transition (132-136) ----
  choir(132.1, [50, 57, 62, 65], 2.0, 1.3); choir(134.0, [46, 53, 58, 62], 2.0, 1.6);
  tubular(132.1, mtof(38), 0.5, 4);
  { let t = 132.2, dt = 0.5; while (t < 136) { tick(t, true, 0.9); t += dt; dt = Math.max(0.06, dt * 0.86); } }
  revCym(136.0, 1.8, 1.3);
  // ---- phase IV: MIDNIGHT (bars 68-91, E minor) ----
  crash(136.0, 1.3);
  for (let off = 0; off < 24; off += 8) {
    const b0 = 68 + off;
    secDrums(b0, 8, 'drive', 0, T_KILL); secBass(b0, PROG_A, 'drive', 2, 0, T_KILL); secArp(b0, PROG_A, 2, 1.1, 1, 0, T_KILL); secPad(b0, PROG_A, 2, 1.2, 0, T_KILL);
    secLead(b0, MEL_A, 2, { harm: off >= 8, oct: true, T1: T_KILL, v: { vol: 0.095 } });
    PROG_A.forEach((c, i) => { const t = beatT(b0 + i, 0); if (t < T_KILL - 0.1 && i % 2 === 0) choir(t, CH[c].map(m => m - 12 + 2), BAR * 2, 0.9); });
  }
  noise(180.0, T_KILL - 180.0, { vol: 0.3, type: 'bandpass', f: 300, f2: 7000, q: 2, rise: true, bus: 'music' });
  for (let s = 0; s < 22; s++) snare(180.0 + s * (T_KILL - 180.0) / 22, 0.3 + s * 0.03);
  // ---- victory fanfare (D major) ----
  const V0 = T_KILL + 3.0;
  const VPROG = ['D', 'G', 'A', 'D'];
  VPROG.forEach((c, i) => { pad(V0 + i * BAR, CH[c], BAR, 2.6); pad(V0 + i * BAR, CH[c].map(m => m + 12), BAR, 1.4); voice(V0 + i * BAR, mtof(CH[c][0] - 24), BAR * 0.9, { wave: 'sawtooth', vol: 0.2, a: 0.01, d: 0.3, s: 0.6, r: 0.2, lp: 600 }); });
  [[0, 74, 0.5], [0.5, 74, 0.5], [1, 74, 0.5], [1.5, 78, 1.5], [3, 76, 1], [4, 79, 2], [6, 78, 1], [7, 76, 1], [8, 76, 1.5], [9.5, 78, 0.5], [10, 81, 2], [12, 86, 4]].forEach(([b, m, l]) => {
    voice(V0 + b * BEAT, mtof(m), l * BEAT * 0.95, { wave: 'sawtooth', vol: 0.13, a: 0.02, d: 0.2, s: 0.8, r: 0.25, lp: 2600, lpEnv: 0.5, lpT: 0.1, det: 6, vib: 0.01, rev: 0.4 });
    voice(V0 + b * BEAT, mtof(m - 12), l * BEAT * 0.95, { pw: 'p25', vol: 0.07, a: 0.02, d: 0.2, s: 0.8, r: 0.25, rev: 0.3 });
  });
  for (let i = 0; i < 4; i++) { kick(V0 + i * BAR, 0.8); snare(V0 + i * BAR + BEAT * 2, 0.6); }
  for (let s = 0; s < 8; s++) sweep(V0 + 6 + s * 0.125, 110, 90, 0.12, { vol: 0.25, wave: 'triangle', bus: 'music' });
  crash(V0, 1.0); crash(V0 + 6 * BEAT * 4 / 4 * 4, 0.8); tubular(V0 + 12 * BEAT, mtof(50), 0.35, 5);
  // ---- outro: music-box theme in D major, half speed ----
  const O0 = V0 + 8.5, MAJ = { 77: 78, 82: 83, 72: 73, 84: 85, 70: 71 };
  const OPROG = ['D', 'G', 'A', 'D', 'D', 'G', 'Em', 'A'];
  OPROG.forEach((c, i) => { const t = O0 + i * BAR * 2; if (t < T_END - 1) pad(t, CH[c], BAR * 2, 2.4); });
  for (const [b, m, l] of MEL_A) {
    const t = O0 + b * BEAT * 2; if (t > T_END - 1.5) break;
    const mm = MAJ[m] || m;
    bell(t, mtof(mm + 12), 1.4, { vol: 0.17, ratio: 3.01, index: 1.1, bus: 'music', rev: 0.5, pan: 0.15 });
    bell(t, mtof(mm), 1.6, { vol: 0.1, ratio: 2.0, index: 0.8, bus: 'music', rev: 0.5, pan: -0.15 });
  }
}

// ---------- sfx from the simulation event log ----------
function scoreSfx(events) {
  // lobby UI (fixed times)
  whoosh(12.35, 0.4, 600, 2600, 0.5);
  for (let i = 0; i < 4; i++) { const t = 15.4 + i * 1.75; bell(t, 1320, 0.25, { vol: 0.08, ratio: 2, index: 1, bus: 'sfx' }); bell(t + 0.06, 1980, 0.3, { vol: 0.06, ratio: 2, index: 1, bus: 'sfx' }); if (i === 1) choir(t, [74, 81, 86], 1.2, 0.8, 'sfx'); }
  voice(22.4, mtof(62), 0.3, { wave: 'sawtooth', vol: 0.12, lp: 1800, bus: 'sfx' }); voice(22.4, mtof(69), 0.3, { wave: 'sawtooth', vol: 0.1, lp: 1800, bus: 'sfx' });
  voice(23.3, mtof(74), 0.4, { wave: 'sawtooth', vol: 0.14, lp: 3000, bus: 'sfx' }); voice(23.3, mtof(81), 0.4, { wave: 'sawtooth', vol: 0.1, lp: 3000, bus: 'sfx' });
  let lastHit = -1, lastShot = -1, lastRing = -1;
  for (const e of events) {
    const t = e.T;
    switch (e.type) {
      case 'shot': if (t - lastShot > 0.1) { lastShot = t; noise(t, 0.05, { vol: 0.035, type: 'bandpass', f: 5200, q: 2, bus: 'sfx', pan: -0.15 }); sweep(t, 1900, 900, 0.04, { vol: 0.018, wave: 'square', bus: 'sfx' }); } break;
      case 'hit': if (t - lastHit > 0.1) { lastHit = t; noise(t, 0.04, { vol: 0.05, type: 'lowpass', f: 1400, bus: 'sfx', pan: 0.1 }); } break;
      case 'star': whoosh(t, 0.3, 700, 4200, 0.35); bell(t, 1560, 0.3, { vol: 0.05, ratio: 2.4, index: 2, bus: 'sfx' }); break;
      case 'starHit': sweep(t, 140, 45, 0.3, { vol: 0.5, bus: 'sfx' }); noise(t, 0.35, { vol: 0.28, type: 'lowpass', f: 5000, f2: 260, bus: 'sfx', rev: 0.25 }); bell(t, 2640, 0.4, { vol: 0.05, ratio: 1.5, index: 2, bus: 'sfx', rev: 0.3 }); break;
      case 'bigStar': whoosh(t, 0.4, 500, 6000, 0.6); bell(t, 1175, 0.6, { vol: 0.09, ratio: 2, index: 3, bus: 'sfx', rev: 0.4 }); if (!e.final && t < 88.1) choir(t, [62, 66, 69, 74], 1.6, 1.4, 'sfx'); break;
      case 'killHit': boom(t, 0.9); shatter(t, 0.9, 99); crash(t, 1.0); tubular(t, mtof(50), 0.45, 3); break;
      case 'phurt': sweep(t, e.big ? 700 : 520, 170, e.big ? 0.22 : 0.12, { vol: e.big ? 0.22 : 0.12, wave: 'square', bus: 'sfx' }); if (e.big) noise(t, 0.2, { vol: 0.3, type: 'lowpass', f: 900, bus: 'sfx' }); break;
      case 'pot': for (let i = 0; i < 3; i++) sweep(t + i * 0.07, 380 + i * 160, 620 + i * 200, 0.06, { vol: 0.1, bus: 'sfx' }); break;
      case 'heal': [74, 78, 81, 86].forEach((m, i) => bell(t + i * 0.06, mtof(m), 0.5, { vol: 0.07, ratio: 2, index: 1, bus: 'sfx', rev: 0.4 })); break;
      case 'ring': case 'aim': if (t - lastRing > 0.12) { lastRing = t; sweep(t, e.type === 'ring' ? 820 : 1200, 380, 0.07, { vol: 0.03, wave: 'triangle', bus: 'sfx', pan: 0.2 }); } break;
      case 'swing': whoosh(t - 0.05, 0.4, 3000, 400, 0.7); noise(t, 0.3, { vol: 0.08, type: 'bandpass', f: 6000, q: 6, bus: 'sfx' }); break;
      case 'chime': tubular(t, mtof(40), 0.62, 6); boom(t, 0.5); break;
      case 'lob': sweep(t, 300, 620, 0.12, { vol: 0.05, bus: 'sfx' }); break;
      case 'lobHit': if (e.kind === 'glass') shatter(t, 0.35, Math.round(t * 100)); else { sweep(t, 180, 90, 0.15, { vol: 0.12, bus: 'sfx' }); noise(t, 0.12, { vol: 0.08, type: 'lowpass', f: 900, bus: 'sfx' }); } break;
      case 'pillar': sweep(t - 0.05, 2400, 300, 0.35, { vol: 0.08, bus: 'sfx', rev: 0.3 }); noise(t, 0.3, { vol: 0.12, type: 'highpass', f: 2500, bus: 'sfx' }); break;
      case 'echo': whoosh(t - 0.6, 0.9, 200, 1600, 0.6); choir(t, [50, 53, 57, 60], 1.6, 1.2, 'sfx'); tubular(t, mtof(45), 0.25, 3); break;
      case 'sentinels': for (let i = 0; i < 4; i++) { noise(t + i * 0.12, 0.08, { vol: 0.2, type: 'bandpass', f: 1200 + i * 300, q: 4, bus: 'sfx' }); bell(t + i * 0.12, 420 + i * 60, 0.3, { vol: 0.08, ratio: 1.41, index: 4, bus: 'sfx' }); } break;
      case 'sentDie': boom(t, 0.35); shatter(t, 0.3, Math.round(t * 10)); break;
      case 'shield': shatter(t, 0.7, 5); bell(t, 880, 1.2, { vol: 0.1, ratio: 2.76, index: 3, bus: 'sfx', rev: 0.5 }); break;
      case 'place': bell(t, 2350 + (Math.round(t * 50) % 5) * 90, 0.35, { vol: 0.07, ratio: 2.76, index: 4, bus: 'sfx', rev: 0.6, pan: (Math.round(t * 50) % 3 - 1) * 0.5 }); break;
      case 'blink': sweep(t, 200, 1700, 0.12, { vol: 0.14, bus: 'sfx', rev: 0.5 }); noise(t, 0.15, { vol: 0.12, type: 'bandpass', f: 1500, q: 2, bus: 'sfx', rev: 0.5 }); break;
      case 'dash': whoosh(t, 0.35, 1200, 5200, 0.7); break;
      case 'sand': noise(t, 0.35, { vol: 0.022, type: 'highpass', f: 6000, bus: 'sfx', pan: 0.4 }); break;
      case 'portal': whoosh(t - 0.3, 0.6, 200, 5000, 1.1); choir(t, [50, 57, 62], 1.2, 1.2, 'sfx'); break;
      case 'eyes': sweep(t, 62, 48, 1.8, { vol: 0.35, wave: 'sawtooth', bus: 'sfx', rev: 0.4 }); bell(t + 0.8, 3520, 1.2, { vol: 0.03, ratio: 1.01, index: 0.5, bus: 'sfx', rev: 0.6 }); break;
      case 'land': boom(t, 1.2); crash(t, 1.0); break;
      case 'rewindTaunt': sweep(t, 90, 60, 1.0, { vol: 0.2, wave: 'sawtooth', bus: 'sfx' }); break;
      case 'rewindEnd': noise(t, 0.08, { vol: 0.3, type: 'lowpass', f: 700, bus: 'sfx' }); sweep(t, 90, 50, 0.4, { vol: 0.4, bus: 'sfx' }); break;
      case 'stopTaunt': break;
      case 'stop': sweep(t, 520, 38, 1.4, { vol: 0.55, bus: 'sfx', rev: 0.6 }); noise(t, 1.0, { vol: 0.25, type: 'lowpass', f: 3000, f2: 100, bus: 'sfx', rev: 0.6 }); voice(t + 0.5, 4200, 4.0, { wave: 'sine', vol: 0.012, a: 1.0, d: 0.5, s: 1, r: 0.3, bus: 'sfx' }); break;
      case 'shatterSmall': shatter(t, 0.35, Math.round(t * 1000) % 97); break;
      case 'resume': boom(t, 1.1); crash(t, 1.2); break;
      case 'midnight': sweep(t, 55, 41, 3.8, { vol: 0.3, wave: 'sawtooth', bus: 'sfx', rev: 0.3 }); break;
      case 'transform': boom(t, 1.0); sweep(t, 70, 40, 2.0, { vol: 0.4, wave: 'sawtooth', bus: 'sfx', rev: 0.4 }); noise(t, 1.5, { vol: 0.3, type: 'bandpass', f: 300, q: 0.8, bus: 'sfx', rev: 0.4 }); crash(t, 1.1); break;
      case 'explode': boom(t, 0.75); shatter(t, 0.7, 77); crash(t, 0.8); for (let i = 0; i < 18; i++) bell(t + 0.1 + i * 0.07, 600 + (i * 373) % 1800, 0.3, { vol: 0.05, ratio: 1.41, index: 5, bus: 'sfx', pan: ((i * 7) % 11) / 5.5 - 1 }); break;
      case 'bag': [81, 85, 88, 93].forEach((m, i) => bell(t + 0.1 + i * 0.09, mtof(m), 0.8, { vol: 0.09, ratio: 2.0, index: 1.2, bus: 'sfx', rev: 0.5 })); noise(t, 0.4, { vol: 0.06, type: 'highpass', f: 8000, bus: 'sfx', rev: 0.4 }); break;
      case 'results': whoosh(t, 0.5, 400, 3000, 0.5); break;
    }
  }
  // death rumble between the kill and the explosion
  sweep(T_KILL + 0.4, 45, 90, 2.0, { vol: 0.35, wave: 'sawtooth', bus: 'sfx', rev: 0.3 });
  for (let i = 0; i < 12; i++) noise(T_KILL + 0.5 + i * 0.16, 0.05, { vol: 0.15 + i * 0.02, type: 'highpass', f: 4000, bus: 'sfx' });
  // time stop heartbeat / clutch heartbeat
  for (const t0 of [97.2, 99.3]) for (let i = 0; i < 3; i++) { sweep(t0 + i * 0.6, 70, 40, 0.14, { vol: 0.5, bus: 'sfx' }); sweep(t0 + i * 0.6 + 0.18, 65, 38, 0.12, { vol: 0.35, bus: 'sfx' }); }
  revCym(99.0, 1.0, 1.4);
}

// ---------- render ----------
async function renderStem(stem, events, CL = 10, TAIL = 7) {
  const total = Math.ceil(SR * (T_END + 0.5)), oL = new Float32Array(total), oR = new Float32Array(total);
  for (let c0 = 0; c0 < T_END + 0.5; c0 += CL) {
    CH0 = c0; CH1 = c0 + CL; STEM = stem;
    const len = Math.ceil(SR * (CL + TAIL));
    AC = new OfflineAudioContext(2, len, SR);
    NOISE = AC.createBuffer(1, SR * 2, SR);
    { const d = NOISE.getChannelData(0), r = mulberry32(3); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
    PW = { p125: pulseWave(0.125), p25: pulseWave(0.25), p50: pulseWave(0.5) };
    const master = AC.createGain(); master.gain.value = 0.75; master.connect(AC.destination);
    BUS.rev = AC.createConvolver(); BUS.rev.buffer = makeIR(2.6, 3.2);
    const rg = AC.createGain(); rg.gain.value = 0.32; BUS.rev.connect(rg); rg.connect(master);
    BUS.music = AC.createGain(); BUS.music.connect(master);
    BUS.sfx = AC.createGain(); BUS.sfx.gain.value = 0.9; BUS.sfx.connect(master);
    if (stem === 'music') scoreMusic(); else scoreSfx(events);
    const buf = await AC.startRendering(), a = buf.getChannelData(0), b = buf.getChannelData(1), off = Math.round(c0 * SR);
    for (let i = 0; i < len && off + i < total; i++) { oL[off + i] += a[i]; oR[off + i] += b[i]; }
  }
  return [oL, oR];
}
async function renderAudio(events) {
  const [mL, mR] = await renderStem('music', events), [sL, sR] = await renderStem('sfx', events);
  const L = new Float32Array(mL.length), R = new Float32Array(mL.length);
  // music mutes: rewind window, frozen time, kill -> victory
  const wins = [[TL.rwA, TL.rwB - 0.02], [TL.tsA + 0.05, TL.tsB - 0.03], [T_KILL, T_KILL + 2.95]];
  for (let i = 0; i < L.length; i++) {
    const T = i / SR; let g = 1;
    for (const [a, b] of wins) if (T > a - 0.03 && T < b + 0.03) g = Math.min(g, T < a ? (a - T) / 0.03 : T > b ? (T - b) / 0.03 : 0);
    L[i] = mL[i] * g + sL[i]; R[i] = mR[i] * g + sR[i];
  }
  // rewind: the audio literally runs backwards along the same world-time curve as the picture
  {
    const i0 = Math.floor(TL.rwA * SR), i1 = Math.floor(TL.rwB * SR);
    const srcL = L.slice(0, i0), srcR = R.slice(0, i0);
    let w = TL.rwA;
    for (let i = i0; i < i1; i++) {
      const T = i / SR; w += worldRate(T) / SR;
      const p = w * SR, k = Math.floor(p), fr = p - k;
      if (k < 1 || k >= srcL.length - 1) continue;
      const fade = Math.min(1, (i - i0) / (SR * 0.02), (i1 - i) / (SR * 0.05));
      const hiss = (hash(i, 17) - 0.5) * 0.02;
      L[i] += fade * ((srcL[k] * (1 - fr) + srcL[k + 1] * fr) * 0.9 + hiss);
      R[i] += fade * ((srcR[k] * (1 - fr) + srcR[k + 1] * fr) * 0.9 + hiss);
    }
  }
  // loudness: scale the 99.95th-percentile level to 0.72, then soft-limit the rare peaks above 0.7
  const mags = new Float32Array(Math.floor(L.length / 16));
  for (let j = 0; j < mags.length; j++) mags[j] = Math.max(Math.abs(L[j * 16]), Math.abs(R[j * 16]));
  const sorted = Float32Array.from(mags).sort(), q = sorted[Math.floor(sorted.length * 0.9995)], peak = sorted[sorted.length - 1];
  const gain = 0.72 / Math.max(q, 1e-6), lim = v => { const a = Math.abs(v); return a < 0.7 ? v : Math.sign(v) * (0.7 + 0.28 * Math.tanh((a - 0.7) / 0.28)); };
  const pcm = new Int16Array(L.length * 2);
  for (let i = 0; i < L.length; i++) { pcm[2 * i] = lim(L[i] * gain) * 32767; pcm[2 * i + 1] = lim(R[i] * gain) * 32767; }
  return { pcm, peak, q };
}
function wavBlob(pcm) {
  const hdr = new ArrayBuffer(44), v = new DataView(hdr), n = pcm.length * 2;
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n, true);
  return new Blob([hdr, pcm.buffer], { type: 'audio/wav' });
}
