'use strict';
// ================= game simulation (fixed 60 Hz step, driven by S.input) =================
// World time (wt) can run backwards (rewind) or stop (time stop). Bullets, hits and particles are
// closed-form functions of wt, so a rewind is just evaluating the world at an earlier wt.
const TUNE = {
  bulletMul: 2.08,        // scales every boss projectile's damage (tuned with the test bots in bot.js)
  density: 2.9,          // scales bullet counts and stream rates of every pattern
  speed: 1.6,           // scales every boss projectile's speed (same paths, less time to react)
  sweep: 0.75,           // extra speed factor for arena-covering patterns (every full ring, the sand curtains)
  p3dmg: 0.8,            // Phase III bullets hit a little softer
  p4speed: 0.85,         // Phase IV (Eleventh Hour) bullets are a little slower
  midnight: 2.5,         // Phase V intensity: hand/pendulum speed, bell, warden and needle fire rate
  survival: 4.0,         // Final Seconds intensity: fire rate of every survival wave
  wpMul: 1.2,            // damage multiplier for hits on the weak point (the only part of the boss that takes damage)
  regen: 21,             // player HP regen per second
  pots: 6, mpots: 6, potHeal: 200, mpPotGain: 200,
  slash: 1500, star: 13000,
};
const BK = {
  orbC: { r: 0.2, dmg: 95, glow: 'c', sc: 5 },
  orbM: { r: 0.2, dmg: 95, glow: 'm', sc: 5 },
  orbR: { r: 0.21, dmg: 105, glow: 'r', sc: 5 },
  orbW: { r: 0.25, dmg: 150, glow: 'm', sc: 5 },
  orbG: { r: 0.2, dmg: 100, glow: 'g', sc: 5 },
  gear: { r: 0.21, dmg: 130, glow: 'g', sc: 4.2, spin: 7 },
  hand: { r: 0.18, dmg: 160, glow: 'm', sc: 5, orient: 1 },
  sand: { r: 0.12, dmg: 60, glow: 'g', sc: 6 },
  shard: { r: 0.14, dmg: 85, glow: 'c', sc: 5, orient: 1 },
  clk: { r: 0.19, dmg: 150, glow: 'r', sc: 5, radial: 1 },   // blades of the midnight clock hands
  pend: { r: 0.25, dmg: 150, glow: 'g', sc: 4.5, spin: 4 },  // gears of the midnight pendulum
  seek: { r: 0.17, dmg: 110, glow: 'r', sc: 5, orient: 1 },   // Second Hands (homing needles)
};
const PK = { slash: { spd: 21, range: 12.8 }, star: { spd: 13.5, range: 10.5 }, bigStar: { spd: 12.5, range: 13 } };
const CAM_MID = 527;   // screen y of the middle of the play area between the top HUD row and the autofire pill
const BOSS_R = 2.25, BODY_R = 2.6, P_R = 0.015, HOME = { x: 0, y: -1.2 };
const P_SPEED = 7.4, FIRE_RATE = 7, STAR_CD = 0.6, STAR_MP = 110, SWING_DUR = 0.34;
const ECHO_DEF = [
  { id: 'castle', name: 'Echo of the Castle', dt: 0, a0: -2.35 },
  { id: 'cellar', name: 'Echo of the Cellar', dt: 8, a0: -0.75 },
  { id: 'sanct', name: 'Echo of the Sanctuary', dt: 16, a0: 1.57 },
];
let S = null, CUR_T = 0;
// difficulty only changes your survivability; the fight itself is identical on every setting
const DIFFS = {
  easy:       { name: 'EASY',       hp: 2500, regen: 100, pots: 12, mpots: 12, col: '#7dffb0' },
  hard:       { name: 'HARD',       hp: 1250, regen: 20,  pots: 6,  mpots: 6,  col: '#ffd23f' },
  diabolical: { name: 'DIABOLICAL', hp: 1250, regen: 12,  pots: 0,  mpots: 0,  col: '#ff4f6a' },
};
const DIFF_ORDER = ['easy', 'hard', 'diabolical'];
let CUR_DIFF = 'hard';
function setDifficulty(d) { const D = DIFFS[d]; CUR_DIFF = d; P_MAXHP = D.hp; Object.assign(TUNE, { regen: D.regen, pots: D.pots, mpots: D.mpots }); }
const NEG = -1e9;

function newInput() { return { up: 0, down: 0, left: 0, right: 0, ax: 0, ay: -5, fire: 0, auto: 1, ability: 0, hpPot: 0, mpPot: 0 }; }
function startGame(practice = 0, seed = (Date.now() & 0x7fffffff)) {
  resetTL(); CHAT.length = 0;
  for (const s of SPLITS) s.T = Infinity;
  TL.run = 0; TL.land = 2;
  if (practice <= 1) TL.p1 = TL.land;
  else {
    TL.p1 = NEG; TL.rw = TL.rwA = TL.rwB = NEG;
    if (practice === 2) TL.p2 = TL.land;
    else {
      TL.p2 = NEG; TL.ts = TL.tsA = TL.tsB = NEG;
      if (practice === 3) { TL.p3 = TL.land; TL.sent = TL.p3 + 8; }
      else if (practice === 4) { TL.p3 = NEG; TL.sent = NEG; TL.mn = TL.land - 4; TL.p4 = TL.land; }
      else if (practice === 5) { TL.p3 = NEG; TL.sent = NEG; TL.mn = TL.land - 8; TL.p4 = NEG; TL.m12 = TL.land - 3.5; TL.p5 = TL.land; }
      else { TL.p3 = NEG; TL.sent = NEG; TL.mn = TL.land - 12; TL.p4 = NEG; TL.m12 = TL.land - 8; TL.p5 = TL.land - 4; TL.sv = TL.land - 3.5; TL.svB = TL.land; }
    }
  }
  const base = [0, 0, 0.123, 0.359, 0.615, 0.808, 1][practice] * MAXHP;   // phase II starts above its threshold: the rewind undoes ~270k
  S = {
    f: 0, T: 0, wt: 0, off: 0, wf: 0, rate: 1, needTrunc: false, practice, seed, diff: CUR_DIFF,
    rng: mulberry32(seed), input: newInput(), gapBase: (seed % 12) / 12,
    p: { x: 0, y: 9.6, vx: 0, vy: 0, aim: -Math.PI / 2, dir: 2, face: 1, walk: 0, atkT: -9, nextShot: 0, nextStar: 0, lastStar: -9,
      hp: P_MAXHP, mp: P_MAXMP, pots: TUNE.pots, mpots: TUNE.mpots, hits: 0, dmgTaken: 0, shots: 0, landed: 0, vShots: 0, wpHits: 0 },
    hx: new Float32Array(HN), hy: new Float32Array(HN), hdir: new Int8Array(HN), hface: new Int8Array(HN), hwalk: new Float32Array(HN),
    hatk: new Float32Array(HN), hhp: new Float32Array(HN), hmp: new Float32Array(HN), hpots: new Int8Array(HN),
    cum: new Float64Array(HN), cumBase: base,
    bb: [], bbStart: 0, tele: [], pb: [], pend: [], hits: [], phits: [], parts: [], lobs: [], pillars: [], ev: [], fx: [], swings: [],
    sent: [], wardens: [], cuckoos: [], survBonus: 0, survW: -1, survWard: 0, shieldT: 0, echoes: [], trig: {},
    al: [], alx: new Float32Array(4096), aly: new Float32Array(4096),
    cam: { x: 0, y: 5.5, z: 0.72 },
    boss: { x: HOME.x, y: HOME.y, z: 6, form: 0 },
    blink: null, killPos: null, bag: null, botPad: 0, dead: 0, deathCause: '', cleared: false,
  };
  S.cum.fill(base, 0, 2);
  return S;
}

// ---------- time mapping ----------
function worldRate(T) {
  if (T >= TL.rwA && T < TL.rwB) { const u = (T - TL.rwA) / (TL.rwB - TL.rwA); return 1 - 6 * (1 - Math.cos(TAU * u)); }
  if (T >= TL.tsA && T < TL.tsB) return 0;
  if (T >= T_KILL && T < T_KILL + 0.35) return 0;
  return 1;
}
function phaseOf(T) { return T < TL.rw ? 0 : T < TL.ts ? 1 : T < TL.mn ? 2 : T < TL.m12 ? 3 : 4; }
function bossVulnerable(T) {
  if (T < TL.land || T >= T_KILL) return false;
  if (T >= TL.rw && T < TL.p2) return false;
  if (T >= TL.ts && T < TL.p3) return false;
  if (T >= TL.mn && T < TL.p4) return false;
  if (T >= TL.m12 && T < TL.p5) return false;
  if (T >= TL.sv && T < TL.svB) return false;
  if (S.sent.length && S.sent.some(z => z.deadT === Infinity)) return false;
  return true;
}
function stutG(t, so) { const u = (t + so) / BEAT; return BEAT * (Math.floor(u) + Math.min(1, 2 * frac(u))); }

// ---------- bullets ----------
let BX = 0, BY = 0, BTH = 0;
function bpos(b, wt) {
  if (b.hm) { const d = Math.max(0, wt - b.hwt); BX = b.hx + Math.cos(b.ang) * b.spd * d; BY = b.hy + Math.sin(b.ang) * b.spd * d; BTH = b.ang; return wt - b.t0; }
  let tau = wt - b.t0 - b.dl; if (tau < 0) tau = 0;
  if (b.st) { const t1 = b.t0 + b.dl; tau = stutG(t1 + tau, b.so) - stutG(t1, b.so); }
  const r = b.r0 + b.vr * tau + 0.5 * b.ar * tau * tau, th = b.th + b.w * tau + (b.osc ? b.osc * Math.sin(b.of * tau + b.op) : 0);
  BX = b.cx + r * Math.cos(th); BY = b.cy + r * Math.sin(th); BTH = th;
  return tau;
}
function bhead(b, wt) {
  if (b.hm) return b.ang;
  let tau = wt - b.t0 - b.dl; if (tau < 0) tau = 0;
  const r = b.r0 + b.vr * tau + 0.5 * b.ar * tau * tau, th = b.th + b.w * tau, dr = b.vr + b.ar * tau;
  const c = Math.cos(th), s = Math.sin(th), vx = dr * c - r * b.w * s, vy = dr * s + r * b.w * c;
  return (Math.abs(vx) + Math.abs(vy) < 1e-6) ? th + (b.vr < 0 ? Math.PI : 0) : Math.atan2(vy, vx);
}
const balive = (b, wt) => wt >= b.t0 - 1e-6 && wt < b.t0 + b.dl + b.life && wt < b.hit;
function wtAt(te) { return S.wt - (CUR_T - te); }
function emitB(te, o) {
  const dm = CUR_T >= TL.p3 && CUR_T < TL.mn ? TUNE.p3dmg : 1;
  const k = BK[o.k], v = o.raw ? 1 : TUNE.speed * (o.sweep ? TUNE.sweep : 1) * (CUR_T >= TL.p4 && CUR_T < TL.m12 ? TUNE.p4speed : 1);
  const b = { t0: o.t0 !== undefined ? o.t0 : wtAt(te), dl: o.dl || 0, cx: o.cx, cy: o.cy, r0: o.r0 || 0, vr: (o.vr || 0) * v, ar: (o.ar || 0) * v * v, th: o.th, w: (o.w || 0) * v,
    life: (o.life || 5) / v, arm: Math.max(o.arm || 0, 0.2), T0: CUR_T, rad: k.r, k: o.k, dmg: (o.dmg || k.dmg) * TUNE.bulletMul * dm, hit: Infinity, st: o.st || 0, so: S.off - (o.stBase || 0), rv: o.rv || 0, tg: o.tg || 0, sweep: o.sweep || 0, osc: o.osc || 0, of: o.of || 0, op: o.op || 0, src: o.src || 0, rg: o.rg || 0, vk: o.vk || 0 };
  S.bb.push(b);
  return b;
}
function ring(te, x, y, n, spd, k, off = 0, o = {}) {
  const gaps = o.gaps || null, tl = o.tele || 0;
  for (let i = 0; i < n; i++) {
    if (gaps && gaps.some(g => ((i - g[0]) % n + n) % n < g[1])) continue;
    if (o.gapsF && o.gapsF.some(([f0, fw]) => (((i / n - f0) % 1) + 1) % 1 < fw)) continue;
    emitB(te, Object.assign({ cx: x, cy: y, r0: o.r0 ?? 1.4, vr: spd, th: off + i * TAU / n, k, life: o.life || 6, sweep: 1, vk: o.vk }, tl ? { dl: tl, rv: te + tl, tg: 1, rg: 1 } : {}, o.extra || {}));   // rings sweep the arena
  }
  S.ev.push({ T: te + tl, type: 'ring', n, k });
}
function aimAt(te, x, y, n, spread, spd, k, o = {}) {
  const tx = o.tx ?? S.p.x, ty = o.ty ?? S.p.y, a = Math.atan2(ty - y, tx - x);
  for (let i = 0; i < n; i++) emitB(te, { cx: x, cy: y, r0: o.r0 ?? 0.8, vr: spd, th: a + (i - (n - 1) / 2) * spread, k, life: o.life || 4, src: o.src, vk: o.vk, ...(o.tele ? { dl: o.tele, rv: te + o.tele, tg: 1 } : {}) });
  S.ev.push({ T: te, type: 'aim', n, k });
}
function* ticks(T0, T1, start, end, period, phase = 0) {
  const k0 = Math.max(0, Math.floor((T0 - start - phase) / period) - 1);
  for (let k = k0; ; k++) {
    const t = start + phase + k * period;
    if (t >= end || t > T1 + 1e-9) break;
    if (t > T0 + 1e-9) yield [t, k];
  }
}
// repeating pattern cycles of length len inside [start, end)
function cyc(T0, T1, start, end, len, fn) {
  if (!(T1 > start && T0 < end)) return;
  const c0 = Math.max(0, Math.floor((T0 - start) / len)), c1 = Math.max(0, Math.floor((T1 - start) / len));
  for (let c = c0; c <= c1; c++) fn(start + c * len, c);
}

// ---------- boss motion ----------
function bossAt(T, wt) {
  const o = { x: HOME.x, y: HOME.y, z: 0, form: T >= TL.mn + 2 ? 1 : 0 };
  if (T < TL.land) { o.z = 6.5 * Math.pow(1 - sat((T - TL.run) / (TL.land - TL.run)), 2); return o; }
  if (T >= T_KILL && S.killPos) return Object.assign(o, S.killPos);
  if (T >= TL.tsA && T < TL.tsB && S.blink) {
    const bl = S.blink; let q = bl.pts[0];
    for (const pt of bl.pts) if (T >= pt.T) q = pt;
    return Object.assign(o, { x: q.x, y: q.y });
  }
  o.x += 0.9 * Math.sin(0.33 * wt); o.y += 0.45 * Math.sin(0.51 * wt);
  if (T >= TL.mn) o.z = 0.55 * smooth((T - TL.mn) / 2.5);
  if (T >= TL.p4) {
    const tau = T - TL.p4, bl = smooth(tau / 1.5);
    o.x = lerp(o.x, HOME.x + 3.4 * Math.sin(0.42 * tau), bl);
    o.y = lerp(o.y, HOME.y + 1.2 * Math.sin(0.84 * tau), bl);
  }
  if (T >= TL.m12) { const u = smooth((T - TL.m12) / 2); o.x = lerp(o.x, 0, u); o.y = lerp(o.y, 0.55, u); o.z = 0.55; }  // chest on the pivot
  return o;
}
function swordState(T, wt) {
  const t = T < TL.rwB ? wt : T;
  let ang = 0.28 + 0.06 * Math.sin(t * 1.3), swing = -1, u = 0;
  for (let i = S.swings.length - 1; i >= 0; i--) {
    const s0 = S.swings[i];
    if (s0 + SWING_DUR + 0.35 < t - 5) break;
    if (t >= s0 - 0.25 && t < s0 + SWING_DUR + 0.35) {
      const left = i % 2 === 0, a0 = left ? -1.25 : 2.25, a1 = left ? 2.25 : -1.25;
      if (t < s0) ang = lerp(ang, a0, smooth((t - s0 + 0.25) / 0.25));
      else if (t < s0 + SWING_DUR) { u = (t - s0) / SWING_DUR; ang = lerp(a0, a1, easeInOut(u)); swing = i; }
      else ang = lerp(a1, ang, smooth((t - s0 - SWING_DUR) / 0.35));
      break;
    }
  }
  return { ang, swing, u };
}
function handPos(b) { return { x: b.x + (BOSS_HAND_R[0] - BOSS_CHEST[0]) * 6 / TILE, y: b.y - b.z + (BOSS_HAND_R[1] - BOSS_CHEST[1]) * 6 / TILE }; }

// ---------- boss attack script (phase-relative, looping; TUNE.density scales every pattern) ----------
const nd = n => Math.max(1, Math.round(n * TUNE.density));
// aimed spread keeping the same total arc when the count is scaled
function aimD(t, x, y, n0, spread0, spd, k, o) { aimAt(t, x, y, nd(n0), spread0, spd, k, o); }
function bossAI(T0, T1) {
  const b = S.boss, p = S.p, R = S.rng, D = TUNE.density;
  const swing = t => { if (!S.swings.length || S.swings[S.swings.length - 1] < t) S.swings.push(t + 0.25); };
  const boomer = (t, k, cap = 22) => { const n = Math.min(cap, nd(16)); ring(t, b.x, b.y, n, 6.3, 'orbM', (k % 2 ? 0.5 : 0) * TAU / n + k * 0.07, { life: 5.4, extra: { ar: -2.85 }, vk: 'rew' }); };
  const arms = n0 => n0 + (D >= 1.3 ? 1 : 0);
  // ---- Phase I: TICK ----
  cyc(T0, T1, TL.p1, TL.rw, 32, (B) => {
    const e = x => Math.min(B + x, TL.rw);
    for (const [t, k] of ticks(T0, T1, B, e(8), BEAT)) {
      const tick = k % 2 === 0, n = nd(16);
      ring(t, b.x, b.y, n, 4.1, tick ? 'orbC' : 'orbM', (tick ? 0 : 0.5) * TAU / n + k * 0.045);
      if (k % 4 === 0) ring(t, b.x, b.y, nd(8), 2.7, 'gear', k * 0.3);
    }
    for (const [t] of ticks(T0, T1, B + 8, e(16), 0.095)) {
      const base = (t - B - 8) * 1.75, a0 = arms(3);
      for (let a = 0; a < a0; a++) emitB(t, { cx: b.x, cy: b.y, r0: 1.4, vr: 5.4, th: base + a * TAU / a0, k: 'orbC', life: 4.2 });
    }
    for (const [t, k] of ticks(T0, T1, B + 8, e(16), 2 * BEAT)) ring(t, b.x, b.y, nd(12), 3.3, 'orbM', k * 0.26);
    for (const [t] of ticks(T0, T1, B + 16, e(24), BEAT)) aimD(t, b.x, b.y, 5, 0.2, 6.0, 'gear');
    for (const [t, k] of ticks(T0, T1, B + 16, e(24), BAR)) ring(t, b.x, b.y, nd(30), 2.9, 'sand', k * 0.11);
    for (const [t] of ticks(T0, T1, B + 23.75, e(31.5), 1.6)) swing(t);
    for (const [t, k] of ticks(T0, T1, B + 24, e(32), 2 * BEAT, BEAT)) ring(t, b.x, b.y, nd(14), 3.5, 'orbC', k * 0.19);
  });
  // ---- Phase II: REWIND ----
  cyc(T0, T1, TL.p2, TL.ts, 32, (B) => {
    const e = x => Math.min(B + x, TL.ts);
    for (const [t, k] of ticks(T0, T1, B, e(8), 2 * BEAT)) boomer(t, k, 20);
    for (const [t, k] of ticks(T0, T1, B + 8, e(16), 1.6)) {
      // converging ring: starts outside the arena and flies in for LEAD s; the rim marks each entry point meanwhile.
      // Its two gaps advance one hour mark per ring, so the next safe spot is always a short run away.
      const g = S.gapBase + k / 12, LEAD = 1.0, L = 3.7 * TUNE.speed * TUNE.sweep * LEAD, n0 = S.bb.length;
      ring(t, 0, 0, nd(36), -3.7, 'orbC', k * 0.2, { r0: 12.4 + L, life: 3.3 + L / 3.7, gapsF: [[g, 4 / 36], [g + 0.5, 4 / 36]] });
      S.tele.push({ kind: 'rim', t0: wtAt(t), t1: wtAt(t) + LEAD, pts: S.bb.slice(n0).map(q => [Math.cos(q.th) * ARENA_R, Math.sin(q.th) * ARENA_R, q.th + Math.PI]) });
    }
    for (const [t] of ticks(T0, T1, B + 16, e(24), 0.12)) {
      const base = (t - B - 16) * 0.9;
      for (let a = 0; a < 2; a++) emitB(t, { cx: b.x, cy: b.y, r0: 1.4, vr: 3.1, th: base + a * Math.PI, k: 'orbM', life: 5 });
    }
    for (const [t, k] of ticks(T0, T1, B + 24, e(32), 2 * BEAT)) boomer(t, k, 20);
  });
  // ---- Phase III: STASIS ----
  cyc(T0, T1, TL.p3, TL.mn, 32, (B, c) => {
    const e = x => Math.min(B + x, TL.mn);
    for (const [t, k] of ticks(T0, T1, B, e(8), BEAT)) {
      const tick = k % 2 === 0, n = Math.min(40, nd(18));
      ring(t, b.x, b.y, n, 4.3, tick ? 'orbC' : 'orbM', (tick ? 0 : 0.5) * TAU / n + k * 0.03, { life: 8, extra: { st: 1, stBase: TL.p3 } });
    }
    for (const [t] of ticks(T0, T1, B, e(8), 2 * BEAT, 0.25)) aimD(t, b.x, b.y, 3, 0.18, 5.4, 'gear');
    if (c === 0) for (const [t, k] of ticks(T0, T1, B + 8, e(18), BAR)) ring(t, b.x, b.y, nd(24), 2.5, 'sand', k * 0.13);
    else {
      for (const [t] of ticks(T0, T1, B + 8, e(16), BEAT)) aimD(t, b.x, b.y, 3, 0.2, 6.0, 'gear');
      for (const [t, k] of ticks(T0, T1, B + 8, e(16), BAR)) ring(t, b.x, b.y, nd(16), 3.4, 'orbC', k * 0.2);
    }
    for (const [t, k] of ticks(T0, T1, B + 16, e(24), 0.62)) sandRow(t, k);
    for (const [t] of ticks(T0, T1, B + 16, e(24), 2 * BEAT, 0.5)) aimD(t, b.x, b.y, 3, 0.2, 4.4, 'orbM');
    for (const [t] of ticks(T0, T1, B + 25, e(32), 2.5 * BEAT)) lob(t, b.x, b.y - b.z, p.x, p.y, 'glass', 1.4);   // lands where you stand: keep moving (starts once the last sand has fallen)
    for (const [t, k] of ticks(T0, T1, B + 24, e(32), 2 * BEAT, BEAT)) ring(t, b.x, b.y, Math.min(32, nd(14)), 3.6, 'orbC', k * 0.21);
  });
  // ---- Phase IV: ELEVENTH HOUR (bells every CHIME_DT; the 12th, or 15% HP, forces midnight) ----
  const P = TL.p4, end = Math.min(T_KILL, CHIME(12), TL.m12);
  if (T1 > P && T0 < end) {
    for (let c = 1; c <= 11; c++) {
      const tc = CHIME(c);
      if (T0 < tc && T1 >= tc && tc < end) {
        const g = S.gapBase + c / 12, w = 5 / 44;   // the gaps advance one hour mark per bell
        ring(tc, b.x, b.y, nd(44), 4.5, 'orbW', 0, { gapsF: [[g, w], [g + 0.25, w], [g + 0.5, w], [g + 0.75, w]], life: 5, tele: 0.5, vk: 'bell' });
        S.ev.push({ T: tc, type: 'chime', c }); S.fx.push({ T: tc, type: 'chime', c, x: b.x, y: b.y });
      }
      const te = tc + 1.0;
      if (false && T0 < te && T1 >= te && te < end) {   // (echo chimes removed: they were the least fair part of phase IV)
        const g = S.gapBase + (c + 1) / 12, w = 5 / 44;   // the echo: gaps one hour mark further on, a short precise weave
        ring(te, b.x, b.y, nd(44), 4.5, 'orbW', 0, { gapsF: [[g, w], [g + 0.25, w], [g + 0.5, w], [g + 0.75, w]], life: 5, tele: 0.5 });
        S.ev.push({ T: te, type: 'bell' });
      }
    }
    const c = Math.floor((T1 - P) / CHIME_DT), t12 = CHIME_DT * 3;
    if (c < 3) {
      for (const [t] of ticks(T0, T1, P, Math.min(P + t12, end), 0.11)) {
        const base = (t - P) * 2.0, a0 = arms(4) + 1;
        for (let a = 0; a < a0; a++) emitB(t, { cx: b.x, cy: b.y, r0: 1.4, vr: 5.0, th: base + a * TAU / a0, k: 'orbC', life: 4.5 });
      }
      for (const [t] of ticks(T0, T1, P + 0.75, Math.min(P + t12, end), 2.0)) swing(t);
    } else if (c < 6) {
      for (const [t, k] of ticks(T0, T1, P + t12, Math.min(P + 2 * t12, end), 2 * BEAT)) boomer(t, k, 28);
      for (const [t] of ticks(T0, T1, P + t12, Math.min(P + 2 * t12, end), 2 * BEAT, 0.25)) aimD(t, b.x, b.y, 3, 0.2, 6.0, 'gear');
    } else if (c < 9) {
      for (const [t, k] of ticks(T0, T1, P + 2 * t12, Math.min(P + 3 * t12, end), BEAT)) ring(t, b.x, b.y, Math.min(30, nd(16)), 5.0, k % 2 ? 'orbM' : 'orbC', k * 0.09, { life: 7, extra: { st: 1, stBase: P } });
      for (const [t] of ticks(T0, T1, P + 2 * t12, Math.min(P + 3 * t12, end), 3 * BEAT, 0.5)) {
        lob(t, b.x, b.y - b.z, p.x, p.y, 'glass', 1.1);
      }
    } else {
      for (const [t, k] of ticks(T0, T1, P + 3 * t12, end, 0.72)) sandRow(t, k, 1, 4.5, 0.5, 1.5);
      for (const [t] of ticks(T0, T1, P + 3 * t12, end, 0.16)) {
        const base = (t - P - 3 * t12) * 1.3;
        for (let a = 0; a < 2; a++) emitB(t, { cx: b.x, cy: b.y, r0: 1.4, vr: 4.2, th: base + a * Math.PI, k: 'orbM', life: 5 });
      }
      for (const [t] of ticks(T0, T1, P + 3 * t12 + 0.25, end - 1, 1.5)) swing(t);
    }
  }
  // greatsword sweeps
  for (let i = S.swings.length - 1; i >= 0; i--) {
    const s0 = S.swings[i];
    if (s0 + SWING_DUR < T0) break;
    if (!(T1 > s0 && T0 < s0 + SWING_DUR)) continue;
    const left = i % 2 === 0, a0 = left ? -1.25 : 2.25, a1 = left ? 2.25 : -1.25;
    for (const [t] of ticks(T0, T1, s0, s0 + SWING_DUR, 0.02)) {
      const u = (t - s0) / SWING_DUR, ang = lerp(a0, a1, easeInOut(u)) - Math.PI / 2, h = handPos(b);
      emitB(t, { cx: h.x, cy: h.y, r0: 3.4, vr: 6.4, th: ang, k: 'hand', life: 3.2, arm: 0.15 });   // blades off the tip can't hit point-blank
    }
    if (T0 < s0 && T1 >= s0) S.ev.push({ T: s0, type: 'swing' });
  }
  // the twelfth bell: midnight cannot be skipped
  if (TL.m12 === Infinity && T0 < CHIME(12) && T1 >= CHIME(12)) { S.trig[3] = true; S.ev.push({ T: T1, type: 'split' }); forceMidnight(T1); }
  midnightAI(T0, T1);
  survivalAI(T0, T1);
}
// ---- Phase V: MIDNIGHT. An 18 s cycle of clock set pieces ----
//   0-6 s   Hands of Midnight: blade hands sweep, minute marks converge; the Hour Wardens fire in turn
//   6-12 s  The Pendulum: a gear chain swings from Oryx's chest; the escapement closes in; Cuckoos burst from the dial
//  12-18 s  The Hourglass Turns: sand down from XII, the glass flips, sand up from VI; Second Hands hunt you
// At 0 HP he does not die: THE FINAL SECONDS (a survival clock that your hits wind down faster) ends the fight.
const HANDS = [{ w: 0.4, r0: 1.4, r1: 12.4, gaps: [[4.3, 6.5], [8.8, 11.0]] }, { w: -0.25, r0: 1.4, r1: 4.3, gaps: [] }];   // a short hour hand, like a real clock: the minute hand's inner lane (4.3-6.5) is safe from both
const HAND_SEG = 3.0, HAND_DR = 0.42, MID_CYC = 18;
// the chains stop short of the rim, so the outer ring of the dial is always an escape from both pendulums
const PEND = { r0: 1.8, r1: 10.0, gap: [5.8, 8.2], amp: 0.85, per: 7.0 };
const midB0 = T => TL.p5 + MID_CYC * Math.max(0, Math.floor((T - TL.p5) / MID_CYC));
const handW = h => h.w * TUNE.midnight;
const handAngle = (h, T) => -Math.PI / 2 + handW(h) * Math.max(0, T - midB0(T));   // both start on XII every cycle
function emitHands(t, dl, rv, B0, hands = HANDS) {
  for (const h of hands) {
    const th = -Math.PI / 2 + handW(h) * (t + dl - B0);
    for (let r = h.r0; r <= h.r1 + 1e-6; r += HAND_DR) {
      if (h.gaps.some(([a, z]) => r > a && r < z)) continue;
      emitB(t, { cx: 0, cy: 0, r0: r, th, w: handW(h), k: 'clk', dl, life: HAND_SEG, rv, tg: 1, raw: 1 });
    }
  }
}
function emitPendulum(t, dl, rv, P0, up = 0) {
  const om = TAU / PEND.per * Math.min(TUNE.midnight, 1.4), op = om * (t + dl - P0) + (up ? Math.PI : 0);   // one swing per ~5 s
  const gap = up ? [99, 99] : PEND.gap, r1 = up ? 7.4 : PEND.r1;   // the upper pendulum is short: step past its tip
  for (let r = PEND.r0; r <= r1 + 1e-6; r += 0.46) {
    if (r > gap[0] && r < gap[1]) continue;
    emitB(t, { cx: 0, cy: 0, r0: r, th: up ? -Math.PI / 2 : Math.PI / 2, osc: PEND.amp, of: om, op, k: 'pend', vk: r + 0.46 > r1 + 1e-6 ? 'bob' : 'link', dl, life: HAND_SEG, rv, tg: 1, raw: 1 });
  }
}
// a set piece's segments: a ghost 1.5 s ahead of its start, then seamless tiles until it (or midnight) ends
function setPiece(T0, T1, start, dur, end, emit) {
  if (start >= end) return;
  const g = start - 1.5;
  if (T0 < g && T1 >= g) emit(g, 1.5, start);
  for (const [t] of ticks(T0, T1, start + HAND_SEG - 1e-6, Math.min(start + dur, end) - 1e-6, HAND_SEG)) emit(t, 0, 0);
}
// Second Hands: needles that steer toward you for 1.6 s, then fly straight. Sidestep late.
function chasers(t, x, y, n, a0) {
  for (let i = 0; i < n; i++) {
    const a = a0 + i * TAU / n, b = emitB(t, { cx: x, cy: y, r0: 1.2, vr: 0, th: a, k: 'seek', life: 4.6, raw: 1, rv: t + 0.35, tg: 1 });
    Object.assign(b, { hm: 1, hx: x + Math.cos(a) * 1.2, hy: y + Math.sin(a) * 1.2, ang: a, spd: 4.4 * TUNE.speed / 1.35, hold: 0.35, homeT: 1.6, turn: 1.7, hwt: b.t0, oa: S.rng() * TAU, miss: 0.5 + 0.6 * S.rng() });
  }
  S.ev.push({ T: t, type: 'seek' });
}
// the hour hand grows back through the final seconds; its gaps line up with the minute hand's two lanes
function survHands(w) {
  const r1 = w <= 2 ? 4.3 : w === 3 ? 8.0 : 12.4;
  return [HANDS[0], { w: HANDS[1].w, r0: 1.4, r1, gaps: r1 > 4.3 ? [[4.5, 6.5], [9.0, 10.8]] : [] }];
}
function updateHoming(wt) {
  const p = S.p;
  for (let i = S.bbStart; i < S.bb.length; i++) {
    const b = S.bb[i]; if (!b.hm || !balive(b, wt) || wt <= b.hwt) continue;
    const dt = wt - b.hwt;
    if (wt < b.t0 + b.hold) { b.hwt = wt; continue; }
    if (wt - b.t0 < b.homeT) {
      const tx = p.x + Math.cos(b.oa) * b.miss, ty = p.y + Math.sin(b.oa) * b.miss;
      let d = Math.atan2(ty - b.hy, tx - b.hx) - b.ang; d = Math.atan2(Math.sin(d), Math.cos(d));
      b.ang += clamp(d, -b.turn * dt, b.turn * dt);
    }
    b.hx += Math.cos(b.ang) * b.spd * dt; b.hy += Math.sin(b.ang) * b.spd * dt; b.hwt = wt;
  }
}
// Cuckoos: burst from a numeral's door, chase you, fire aimed volleys, and pop into a ring after 7 s. Killable.
function spawnCuckoos(T, n, life = 7.8, every = 0.9, stagger = 0) {   // stagger: their bursts come one at a time
  const R = S.rng, p = S.p, used = [];
  for (let i = 0, tries = 0; i < n && tries < 60; tries++) {
    const h = Math.floor(R() * 12), a = -Math.PI / 2 + h * Math.PI / 6, x = Math.cos(a) * 11.4, y = Math.sin(a) * 11.4;
    if (used.includes(h) || Math.hypot(x - p.x, y - p.y) < 6) continue;
    used.push(h); S.cuckoos.push({ x, y, h, vx: 0, vy: 0, T, life: life + i * stagger, every, hp: 6000, dmg: 0, deadT: Infinity, next: T + 1.6 + i * 0.35 }); i++;
  }
  S.ev.push({ T, type: 'cuckoo' });
}
function updateCuckoos(T) {
  const p = S.p, dt = 1 / FPS;
  for (const c of S.cuckoos) {
    if (c.deadT !== Infinity || T < c.T + 0.8) continue;
    if (T >= c.T + c.life) {   // the strike: burst into a slow ring and vanish
      c.deadT = T; ring(T, c.x, c.y, Math.min(10, nd(6)), 2.6, 'orbR', S.rng() * TAU, { r0: 0.6, tele: 0.45, vk: 'feather' });
      S.fx.push({ T, type: 'boom', x: c.x, y: c.y, s: 0.7 }); S.ev.push({ T, type: 'sentDie' }); continue;
    }
    const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) || 1, want = d > 3.6 ? 2.3 : -2.6;
    c.vx = lerp(c.vx, dx / d * want, 0.05); c.vy = lerp(c.vy, dy / d * want, 0.05);
    c.x += c.vx * dt; c.y += c.vy * dt;
    const r = Math.hypot(c.x, c.y); if (r > 11.8) { c.x *= 11.8 / r; c.y *= 11.8 / r; }
    if (T >= c.next) { if (d >= 4.0) aimAt(T, c.x, c.y, 5, 0.25, 2.8, 'orbR', { r0: 0.5, src: 'cuck', vk: 'feather' }); c.next = T + c.every; }
  }
}
function dissolve(pred, T) {
  const snap = [];
  for (let i = S.bbStart; i < S.bb.length; i++) { const q = S.bb[i]; if (pred(q) && balive(q, S.wt)) { bpos(q, S.wt); snap.push([BX, BY, q.k]); q.hit = S.wt; } }
  if (snap.length) S.parts.push({ t: S.wt, x: 0, y: 0, n: 0, seed: 1, col: 'clear', spd: 0, life: 0.6, snap });
}
function midnightAI(T0, T1) {
  const R = S.rng, M = TUNE.midnight, P5 = TL.p5, end = Math.min(T_KILL, TL.sv);
  for (let c = Math.max(0, Math.floor((T0 - P5) / MID_CYC)); c <= Math.floor((T1 + 1.6 - P5) / MID_CYC); c++) {
    const B0 = P5 + MID_CYC * c; if (B0 >= end) break;
    setPiece(T0, T1, B0, 6, end, (t, dl, rv) => emitHands(t, dl, rv, B0));
    setPiece(T0, T1, B0 + 6, 6, end, (t, dl, rv) => { emitPendulum(t, dl, rv, B0 + 6); emitPendulum(t, dl, rv, B0 + 6, 1); });
  }
  // the Hour Wardens: indestructible, they rise on the quarter-hour numerals for each Hands of Midnight
  if (!S.wardens.length && T1 >= P5 - 1) [[0, -10.8, 'XII'], [10.8, 0, 'III'], [0, 10.8, 'VI'], [-10.8, 0, 'IX']].forEach(([x, y, num], i) => S.wardens.push({ x, y, i, num }));
  for (let c = Math.max(0, Math.floor((T0 + 1 - P5) / MID_CYC)); c <= Math.floor((T1 + 1 - P5) / MID_CYC); c++) {
    const B0 = P5 + MID_CYC * c;
    if (B0 < end && T0 < B0 - 1 && T1 >= B0 - 1) S.ev.push({ T: B0 - 1, type: 'sentinels' });
  }
  if (!(T1 > P5 && T0 < end)) return;
  cyc(T0, T1, P5, end, MID_CYC, (B0) => {
    const e = x => Math.min(B0 + x, end), bell = (t, k) => {
      const g = S.gapBase + k / 24, w = 6 / 40;   // predictable: the next gap is always a short step away
      ring(t, 0, 0, nd(44), 2.8, 'orbW', k * 0.13, { gapsF: [[g, w], [g + 0.25, w], [g + 0.5, w], [g + 0.75, w]], life: 7, tele: 0.5, vk: 'bell' });
      S.ev.push({ T: t, type: 'bell' });
    };
    // Hands: wardens fire in turn, clockwise, one per second; minute marks converge on the pivot
    for (const [t, k] of ticks(T0, T1, B0 + 0.8, e(5.3), 1.0 / M)) {
      const w = S.wardens[k % 4]; if (Math.hypot(S.p.x - w.x, S.p.y - w.y) < 3.5) continue;   // no point-blank volleys
      aimD(t, w.x, w.y, 7, 0.18, 2.9, 'orbG', { r0: 0.7, src: 'ward', vk: 'jewel' }); S.fx.push({ T: t, type: 'wardenFire', i: w.i });
    }
    for (const [t, k] of ticks(T0, T1, B0 + 1, e(6), 0.72)) {
      const g = S.gapBase - k / 24, LEAD = 0.8, L = 2.4 * TUNE.speed * TUNE.sweep * LEAD, n0 = S.bb.length;   // gaps turn against the hands
      ring(t, 0, 0, Math.min(48, nd(24)), -2.4, 'orbC', k * TAU / 96, { r0: 12.4 + L, life: (11 + L) / 2.4, gapsF: [[g, 6 / 48], [g + 0.5, 6 / 48]], vk: 'mark' });
      S.tele.push({ kind: 'rim', t0: wtAt(t), t1: wtAt(t) + LEAD, pts: S.bb.slice(n0).map(q => [Math.cos(q.th) * ARENA_R, Math.sin(q.th) * ARENA_R, q.th + Math.PI]) });
    }
    // as the pendulum begins the wardens sink back into the dial and every volley they fired dissolves
    const ts = B0 + 5.8;
    if (T0 < ts && T1 >= ts && ts < end) { dissolve(q => q.src === 'ward', ts); S.ev.push({ T: ts, type: 'wardenSink' }); }
    // Pendulum: the escapement closes in, bells toll, and two Cuckoos burst from the dial
    for (const [t, k] of ticks(T0, T1, B0 + 6.3, e(12), 1.8)) {
      const g = R();
      ring(t, 0, 0, nd(26), -0.55, 'gear', k * 0.4, { r0: 11.6, life: 4.2, tele: 0.5, gapsF: [[g, 0.07], [g + 0.33, 0.07], [g + 0.66, 0.07]], extra: { w: (k % 2 ? -0.28 : 0.28) } });
    }
    for (const [t, k] of ticks(T0, T1, B0 + 7.5, e(10.4), 2.6 / M)) bell(t, k);
    if (T0 < B0 + 12.3 && T1 >= B0 + 12.3 && B0 + 12.3 < end) dissolve(q => q.k === 'orbW', B0 + 12.3);
    if (T0 < B0 + 6.5 && T1 >= B0 + 6.5 && B0 + 6.5 < end) { spawnCuckoos(B0 + 6.5, 5, 5.3); S.fx.push({ T: B0 + 6.5, type: 'banner', text: 'SHOOT DOWN THE CUCKOOS', y: 176, size: 30, col: '#ffd0a0' }); }
    // Hourglass: sand down from XII, flip, sand up from VI; Second Hands hunt you throughout
    for (const [t, k] of ticks(T0, T1, B0 + 12, e(14.2), 0.55)) sandRow(t, k, 1, 3.0, 0, 2.2, 1.0);
    if (T0 < B0 + 14.5 && T1 >= B0 + 14.5 && B0 + 14.5 < end) { S.fx.push({ T: B0 + 14.5, type: 'banner', text: 'THE HOURGLASS TURNS' }); S.ev.push({ T: B0 + 14.5, type: 'flip' }); }
    for (const [t, k] of ticks(T0, T1, B0 + 15, e(17.6), 0.55)) sandRow(t, k, -1, 3.0, 0, 2.2, 1.0);
    for (const [t, k] of ticks(T0, T1, B0 + 12.6, e(17.6), 1.5 / M)) chasers(t, 0, 0, 4, k * 1.1);
    // the hourglass empties as the next hour begins: leftover sand dissolves instead of crossing the new hands
    if (T0 < B0 + 17.95 && T1 >= B0 + 17.95 && B0 + 17.95 < end) dissolve(q => q.k === 'sand', B0 + 17.95);
  });
}
// warden visibility 0..1: rise before each cycle's Hands and sink as the Pendulum begins; all four rise for the final crescendo
function wardenVis(T) {
  if (!S.wardens.length || T < TL.p5 - 1) return 0;
  if (T >= TL.sv) { const t = S.survWard; return t ? sat((T - t) / 0.6) * (T < T_KILL ? 1 : Math.max(0, 1 - (T - T_KILL) / 0.6)) : 0; }
  const u = T - TL.p5, c = Math.floor((u + 1) / MID_CYC), l = u - c * MID_CYC;
  const v = l < -0.4 ? (l + 1) / 0.6 : l < 5.6 ? 1 : l < 6.2 ? 1 - (l - 5.6) / 0.6 : 0;
  return Math.max(0, v) * (T < T_KILL ? 1 : Math.max(0, 1 - (T - T_KILL) / 0.6));
}
// ---- THE FINAL SECONDS: a 40 s survival clock; every point of damage on the Heart winds it down faster ----
const SURV_T = 70, SURV_K = 46000;   // 70 s with no damage, ~45 s at optimal damage (one second skipped per 46k)
const SURV_WAVES = ['SECOND HANDS', 'THE ESCAPEMENT', 'THE GLASS SHATTERS', 'CUCKOO! CUCKOO!', 'MIDNIGHT, FOREVER'];
const survLeft = T => SURV_T - Math.max(0, T - TL.svB) - S.survBonus;
function startSurvival(T) {
  TL.sv = T; TL.svB = T + 3.5; SPLITS[4].T = T;
  S.ev.push({ T, type: 'survival' }); S.fx.push({ T, type: 'cutscene' });
  S.parts.push({ t: S.wt, x: 0, y: 0, n: 0, seed: 1, col: 'clear', spd: 0, life: 1, snap: S.al.map((b, i) => [S.alx[i], S.aly[i], b.k]) });
  for (let i = S.bbStart; i < S.bb.length; i++) S.bb[i].hit = Math.min(S.bb[i].hit, S.wt);
  for (const c of S.cuckoos) if (c.deadT === Infinity) { c.deadT = T; S.fx.push({ T, type: 'boom', x: c.x, y: c.y, s: 0.6 }); }
  S.lobs = []; S.pillars = []; S.tele = []; S.pend = [];
  say(T + 0.2, 'boss', 'You... struck the Heart of the Hour.');
  say(T + 1.4, 'boss', 'But I do not die AT midnight. I END at midnight.');
  say(T + 2.7, 'boss', 'Outlast me, if you can.');
}
function killBoss(T) {
  T_KILL = T; TL.bag = T + 5.2; TL.results = T + 12.5; SPLITS[5].T = T;
  S.ev.push({ T, type: 'killHit' }); S.fx.push({ T, type: 'final', x: S.boss.x, y: S.boss.y - S.boss.z });
}
function survivalAI(T0, T1) {
  if (!(T1 > TL.svB && T0 < T_KILL)) return;
  const q = 1 - Math.max(0, survLeft(T1)) / SURV_T, w = q < 0.6 ? Math.floor(q / 0.15) : 4, R = S.rng, V = TUNE.survival;
  if (w !== S.survW) {
    // each wave starts clean: the last wave's bullets and cuckoos vanish with the banner, then 1 s to breathe (the hands keep turning)
    dissolve(q => q.k !== 'clk', T1); S.lobs = []; S.pillars = []; S.tele = [];
    for (const c of S.cuckoos) if (c.deadT === Infinity) { c.deadT = T1; S.fx.push({ T: T1, type: 'boom', x: c.x, y: c.y, s: 0.5 }); }
    S.waveStart = T1 + 0.6;
    S.survW = w; S.fx.push({ T: T1, type: 'wave', text: SURV_WAVES[w] }); S.ev.push({ T: T1, type: 'wave' });
    if (w === 3) spawnCuckoos(T1, 3, 6.6, 1.2, 1.0);
    if (w === 4) { S.survWard = T1; S.ev.push({ T: T1, type: 'sentinels' }); }
  }
  const s0 = S.waveStart;
  const bell = (t, k, n, spd) => { const g = S.gapBase + k / 24, gw = 7 / 40; ring(t, 0, 0, nd(n), spd, 'orbW', k * 0.13, { gapsF: [[g, gw], [g + 0.25, gw], [g + 0.5, gw], [g + 0.75, gw]], life: 7, tele: 0.5, vk: 'bell' }); S.ev.push({ T: t, type: 'bell' }); };
  if (S.survHands === undefined && w >= 1) S.survHands = T1 + 1.5;   // ghost hands appear now, turn solid 1.5 s later
  if (S.survHands !== undefined) setPiece(T0, T1, S.survHands, 1e9, T_KILL, (t, dl, rv) => emitHands(t, dl, rv, S.survHands, survHands(S.survW)));
  if (w === 0) {          // SECOND HANDS: ticking rings and waves of needles
    for (const [t, k] of ticks(T0, T1, s0, 1e9, 1.0 / V)) ring(t, 0, 0, nd(12), 2.6, k % 2 ? 'orbM' : 'orbC', k * 0.16, { tele: 0.45 });
    for (const [t, k] of ticks(T0, T1, s0 + 0.5, 1e9, 1.4 / V)) chasers(t, 0, 0, 4, 0.5 + k * 0.7);
  } else if (w === 1) {   // THE ESCAPEMENT: counter-rotating gear rings close in while gear fans keep you honest
    for (const [t, k] of ticks(T0, T1, s0, 1e9, 0.55)) { const g = R(); ring(t, 0, 0, nd(24), -0.9, 'gear', k * 0.3, { r0: 11.8, life: 5, tele: 0.5, gapsF: [[g, 0.08], [g + 0.33, 0.08], [g + 0.66, 0.08]], extra: { w: k % 2 ? -0.35 : 0.35 } }); }
    for (const [t] of ticks(T0, T1, s0 + 0.4, 1e9, 0.45)) aimD(t, 0, 0, 5, 0.22, 3.8, 'gear');
    for (const [t, k] of ticks(T0, T1, s0 + 0.7, 1e9, 1.4)) chasers(t, 0, 0, 2, k * 1.1);
  } else if (w === 2) {   // THE GLASS SHATTERS: sand from both ends at once (same safe lanes), needles through the gaps
    for (const [t, k] of ticks(T0, T1, s0, 1e9, 1.0 / V)) { sandRow(t, k, 1, 3.0, 0, 1.9, 1.0); sandRow(t, k, -1, 3.0, 0, 1.9, 1.0); }
    for (const [t] of ticks(T0, T1, s0 + 0.5, 1e9, 0.5)) aimD(t, S.boss.x, S.boss.y, 4, 0.2, 3.4, 'gear');
    for (const [t, k] of ticks(T0, T1, s0 + 0.8, 1e9, 1.2)) chasers(t, 0, 0, 2, k * 1.3);
  } else if (w === 3) {   // CUCKOO! CUCKOO!: four cuckoos chase you as the minute marks close in
    for (const [t, k] of ticks(T0, T1, s0, 1e9, 0.7)) {
      const g = S.gapBase - k / 24, LEAD = 0.8, L = 2.4 * TUNE.speed * TUNE.sweep * LEAD, n0 = S.bb.length;   // gaps turn against the hands
      ring(t, 0, 0, 40, -2.4, 'orbC', k * TAU / 96, { r0: 12.4 + L, life: (11 + L) / 2.4, gapsF: [[g, 5 / 44], [g + 0.5, 5 / 44]], vk: 'mark' });   // spaced marks: a miss costs one hit, not four
      S.tele.push({ kind: 'rim', t0: wtAt(t), t1: wtAt(t) + LEAD, pts: S.bb.slice(n0).map(b => [Math.cos(b.th) * ARENA_R, Math.sin(b.th) * ARENA_R, b.th + Math.PI]) });
    }
    for (const [t, k] of ticks(T0, T1, s0 + 0.9, 1e9, 1.6)) chasers(t, 0, 0, 2, k * 1.2);
  } else {                // MIDNIGHT, FOREVER: all four wardens volley together, bells toll, needles hunt
    // the wardens never rest: each sweeps two jewel streams back and forth across the dial like a sprinkler, weaving against
    // its neighbours (alternate wardens sweep the other way). Nothing is aimed at you: read the weave and slip through the dotted streams
    for (const [t] of ticks(T0, T1, s0, 1e9, 0.23)) for (const wd of S.wardens) {
      const sw = 0.9 * Math.sin(1.1 * (t - s0) + wd.i * Math.PI / 2) * (wd.i % 2 ? -1 : 1), th = Math.atan2(-wd.y, -wd.x) + sw;
      for (const o of [-0.35, 0.35]) emitB(t, { cx: wd.x, cy: wd.y, r0: 0.7, vr: 2.4, th: th + o, k: 'orbG', vk: 'jewel', src: 'ward', life: 7 });
    }
    for (const [t, k] of ticks(T0, T1, s0 + 0.8, 1e9, 0.9)) bell(t, k, 40, 2.6);
    for (const [t, k] of ticks(T0, T1, s0 + 0.4, 1e9, 0.85)) chasers(t, 0, 0, 4, k * 0.9);
  }
}
function forceMidnight(T) {
  TL.m12 = T; TL.p5 = T + 4; SPLITS[3].T = T;
  S.ev.push({ T, type: 'chime', c: 12 }); S.fx.push({ T, type: 'strike', x: S.boss.x, y: S.boss.y });
  // the bell's shockwave clears the air
  S.parts.push({ t: S.wt, x: 0, y: 0, n: 0, seed: 1, col: 'clear', spd: 0, life: 1, snap: S.al.map((b, i) => [S.alx[i], S.aly[i], b.k]) });
  for (let i = S.bbStart; i < S.bb.length; i++) S.bb[i].hit = Math.min(S.bb[i].hit, S.wt);
  S.lobs = S.lobs.filter(l => l.tl <= S.wt); S.pillars = S.pillars.filter(z => z.ti <= S.wt); S.tele = [];
  say(T + 0.1, 'boss', 'IT IS MIDNIGHT.'); say(T + 1.8, 'boss', 'You thought you could skip me? Midnight comes for EVERYONE.');
}
// drift < 1 slows the gaps: needed when curtains fall from both ends, so the two streams' gaps line up
function sandRow(t, k, dir = 1, spd = 4.5, drift = 1, gw = 1.8, ph = 0) {
  const g1 = 6.5 * Math.sin(0.3 * drift * t + ph), g2 = -6 * Math.sin(0.22 * drift * t + 1.3 + ph);
  // the sand falls in from beyond the rim for LEAD s; the rim marks each column meanwhile
  const LEAD = 0.6, L = spd * TUNE.speed * TUNE.sweep * LEAD, pts = [];
  for (let x = -11.6; x <= 11.6; x += 0.72 / TUNE.density) {
    if (Math.abs(x - g1) < gw || Math.abs(x - g2) < gw) continue;
    const y0 = dir * (-Math.sqrt(Math.max(0, ARENA_R * ARENA_R - x * x)) + 0.2);
    emitB(t, { cx: x, cy: y0 - dir * L, vr: spd, th: dir * Math.PI / 2, k: 'sand', life: (-2 * dir * y0 + L) / spd, sweep: 1 });
    pts.push([x, y0, dir * Math.PI / 2]);
  }
  S.tele.push({ kind: 'sand', t0: wtAt(t), t1: wtAt(t) + LEAD, pts });
  S.ev.push({ T: t, type: 'sand' });
}
function lob(te, x0, y0, x1, y1, kind, fl0) {
  const r = Math.hypot(x1, y1); if (r > 11.4) { x1 *= 11.4 / r; y1 *= 11.4 / r; }
  const fl = fl0 || (kind === 'glass' ? 0.8 : 0.9), t0 = wtAt(te);
  S.lobs.push({ t0, tl: t0 + fl, x0, y0, x1, y1, kind });
  const n = Math.min(kind === 'glass' ? 10 : 10, nd(kind === 'glass' ? 10 : 8)), k = kind === 'glass' ? 'shard' : 'orbR', spd = kind === 'glass' ? 4.0 : 3.6, off = S.rng() * TAU;
  // harmless for 0.15 s after launch (as before): the danger starts ~2 tiles out, along the spokes the ghosts show
  for (let i = 0; i < n; i++) emitB(te, { dl: fl, rv: te + fl, tg: 1, arm: fl + 0.15, cx: x1, cy: y1, r0: 0.9, vr: spd, th: off + i * TAU / n, k, life: 3.0 });
  S.ev.push({ T: te, type: 'lob', kind }); S.ev.push({ T: te + fl, type: 'lobHit', kind });
}
function pillar(te, x, y) {
  const t0 = wtAt(te), n = Math.min(8, nd(6));
  S.pillars.push({ t0, ti: t0 + 0.75, x, y, r: 1.15, done: false });
  for (let i = 0; i < n; i++) emitB(te, { t0: t0 + 0.75, cx: x, cy: y, r0: 0.3, vr: 4.0, th: i * TAU / n + 0.3, k: 'orbG', life: 3, arm: 0.2 });
  S.ev.push({ T: te + 0.75, type: 'pillar' });
}

// ---------- minions ----------
const SENT_POS = [[-0.8, -7.2], [7.2, -0.6], [0.8, 6.6], [-7.2, 0.6]];   // Phase III sentinels: Oryx is shielded until all four fall
function echoPos(e, T) { const a = e.a0 + 0.1 * (T - e.T); return { x: 8.3 * Math.cos(a), y: -0.6 + 7.6 * Math.sin(a) }; }
function minionAI(T0, T1) {
  const p = S.p;
  // each echo holds its "hour" for 16 s; they overlap in pairs and the cycle repeats every 32 s
  cyc(T0, T1, TL.p2, TL.ts, 32, (B) => {
    for (const d of ECHO_DEF) {
      const t = B + d.dt;
      if (T0 < t && T1 >= t && t < TL.ts) { S.echoes.push(Object.assign({ T: t, until: t + 16 }, d)); S.ev.push({ T: t, type: 'echo' }); S.fx.push({ T: t, type: 'echo', id: d.id }); }
    }
  });
  if (T1 < TL.ts) for (const e of S.echoes) {
    if (T1 >= e.until) continue;
    const ep = echoPos(e, T1), end = Math.min(e.until, TL.ts);
    if (e.id === 'castle') for (const [t] of ticks(T0, T1, e.T + 0.8, end, 2 * BEAT, BEAT)) aimD(t, ep.x, ep.y, 3, 0.19, 6.2, 'hand', { r0: 0.6 });
    if (e.id === 'cellar') for (const [t] of ticks(T0, T1, e.T + 0.8, end, 3 * BEAT)) { const a = S.rng() * TAU, d = 1.2 + S.rng() * 1.8; lob(t, ep.x, ep.y - 1, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 'bubble'); }
    if (e.id === 'sanct') for (const [t] of ticks(T0, T1, e.T + 0.8, end, 3 * BEAT)) pillar(t, p.x, p.y);
  }
  updateCuckoos(T1);
  if (T0 < TL.sent - 0.2 && T1 >= TL.sent - 0.2) {
    SENT_POS.forEach(([x, y], i) => S.sent.push({ x, y, i, hp: 21000, dmg: 0, T: TL.sent - 0.2, deadT: Infinity }));
    S.ev.push({ T: TL.sent - 0.2, type: 'sentinels' }); S.fx.push({ T: TL.sent - 0.2, type: 'banner', text: 'DESTROY THE SENTINELS', y: 176, size: 30, col: '#ffb3bd' });
  }
  // the sentries withdraw just before the glass spikes begin: they sink away and their arrows dissolve
  cyc(T0, T1, TL.p3, TL.mn, 32, (B) => {
    const tw = B + 23;
    if (T0 < tw && T1 >= tw && S.sent.some(z => z.deadT === Infinity)) {
      for (const z of S.sent) if (z.deadT === Infinity) { z.deadT = tw; z.withdrawn = true; S.fx.push({ T: tw, type: 'boom', x: z.x, y: z.y, s: 0.5 }); }
      dissolve(q => q.src === 'sent', tw); S.shieldT = tw; S.ev.push({ T: tw, type: 'wardenSink' }); S.fx.push({ T: tw, type: 'shield' });
    }
  });
  for (const z of S.sent) {
    if (z.deadT < T1) continue;
    for (const [t] of ticks(T0, T1, z.T + 1.0, 1e9, 1.5 * BEAT, z.i * 0.25)) aimD(t, z.x, z.y, 3, 0.2, 4.2, 'hand', { r0: 0.6, src: 'sent' });
  }
}

// ---------- the weak point: the Heart of the Hour circles his chest; only hits on it do damage ----------
const WP_R = 1.2, WP_ORB = 1.7;
// steady orbit (0.24-0.87 rad/s, never reverses), a little quicker at midnight
function wpAngle(T, wt) { return 0.55 * wt + 0.7 * Math.sin(0.45 * wt) + (T >= TL.p4 ? 0.25 * (T - TL.p4) : 0); }
function wpPos(T, wt, b) { const a = wpAngle(T, wt); return { x: b.x + WP_ORB * Math.cos(a), y: b.y - b.z + 0.8 * WP_ORB * Math.sin(a) }; }
// where the weak point will be when a projectile fired now from (x0, y0) reaches it
function wpLead(T, wt, x0, y0, spd) {
  let w = wpPos(T, wt, S.boss);
  for (let it = 0; it < 3; it++) { const tau = Math.hypot(w.x - x0, w.y - y0) / spd; w = wpPos(T + tau, wt + tau, bossAt(T + tau, wt + tau)); }
  return w;
}

// ---------- the player ----------
function playerMove(T, wt) {
  const p = S.p, I = S.input;
  let dx = (I.right ? 1 : 0) - (I.left ? 1 : 0), dy = (I.down ? 1 : 0) - (I.up ? 1 : 0);
  const n = Math.hypot(dx, dy); if (n) { dx /= n; dy /= n; }
  p.vx = dx * P_SPEED; p.vy = dy * P_SPEED;
  p.x += p.vx / FPS; p.y += p.vy / FPS;
  const r = Math.hypot(p.x, p.y); if (r > 12.1) { p.x *= 12.1 / r; p.y *= 12.1 / r; }
  // his body is solid: no hiding inside the ring where his patterns spawn (except while he blinks around you in the time stop)
  const b = S.boss, bx = p.x - b.x, by = p.y - b.y, br = Math.hypot(bx, by);
  if (T >= TL.land && T < T_KILL && !(T >= TL.tsA && T < TL.tsB) && br < BODY_R) { const u = br > 1e-6 ? BODY_R / br : 0; p.x = b.x + (u ? bx * u : 0); p.y = b.y + (u ? by * u : BODY_R); }
}
function targets(T) {
  const L = [];
  if (T >= TL.land && T < T_KILL) { const b = S.boss; L.push({ x: b.x, y: b.y - b.z, r: BOSS_R, body: true }); }
  for (const z of S.sent) if (z.deadT === Infinity && T >= z.T + 0.4) L.push({ x: z.x, y: z.y, r: 0.75, sent: z });
  for (const c of S.cuckoos) if (c.deadT === Infinity && T >= c.T + 0.8) L.push({ x: c.x, y: c.y, r: 0.7, sent: c, cuck: true });
  return L;
}
function rayCircle(x0, y0, dx, dy, cx0, cy0, r) {
  const cx = cx0 - x0, cy = cy0 - y0, proj = cx * dx + cy * dy, perp2 = cx * cx + cy * cy - proj * proj;
  if (proj <= -r || perp2 >= r * r) return Infinity;
  return Math.max(0, proj - Math.sqrt(r * r - perp2));
}
function fireP(kind, T, wt, ang, dmgFn) {
  const p = S.p, pk = PK[kind], x0 = p.x, y0 = p.y - 0.25, dx = Math.cos(ang), dy = Math.sin(ang);
  let best = null, bestS = pk.range;
  if (T >= TL.land && T < T_KILL) {
    const w = wpLead(T, wt, x0, y0, pk.spd), s = rayCircle(x0, y0, dx, dy, w.x, w.y, WP_R);
    if (s < pk.range) { best = { wp: true, x: w.x, y: w.y }; bestS = s; }
  }
  if (!best) for (const tg of targets(T)) { const s = rayCircle(x0, y0, dx, dy, tg.x, tg.y, tg.r); if (s < bestS) { bestS = s; best = tg; } }
  const life = (best ? bestS : pk.range) / pk.spd;
  S.pb.push({ t0: wt, x0, y0, ang, spd: pk.spd, life, k: kind, hitT: best ? wt + life : Infinity });
  if (best) { const d = dmgFn(); S.pend.push({ t: wt + life, dmg: d.dmg, crit: d.crit, kind, tg: best, x: x0 + dx * bestS, y: y0 + dy * bestS }); }
}
function playerAttack(T, wt) {
  const p = S.p, I = S.input, R = S.rng;
  p.aim = Math.atan2(I.ay - (p.y - 0.25), I.ax - p.x);
  if (T < TL.run || T >= T_KILL || S.dead) return;
  if ((I.auto || I.fire) && T >= p.nextShot) {
    p.nextShot = T + 1 / FIRE_RATE; p.atkT = T; p.shots++; if (bossVulnerable(T)) p.vShots++;
    fireP('slash', T, wt, p.aim + (R() - 0.5) * 0.05, () => { const c = R() < 0.15; return { dmg: TUNE.slash * (0.88 + 0.24 * R()) * (c ? 1.8 : 1), crit: c }; });
    S.ev.push({ T, type: 'shot' });
  }
  if (I.ability && T >= p.nextStar && p.mp >= STAR_MP) {
    p.nextStar = T + STAR_CD; p.mp -= STAR_MP; p.lastStar = T; p.atkT = T;
    fireP('star', T, wt, p.aim, () => ({ dmg: TUNE.star * (0.92 + 0.16 * R()), crit: false }));
    S.ev.push({ T, type: 'star' });
  }
  if (I.hpPot) { I.hpPot = 0; if (p.pots > 0 && p.hp < P_MAXHP) { p.pots--; p.hp = Math.min(P_MAXHP, p.hp + TUNE.potHeal); S.fx.push({ T, type: 'heal', v: TUNE.potHeal }); S.ev.push({ T, type: 'pot' }); } }
  if (I.mpPot) { I.mpPot = 0; if (p.mpots > 0 && p.mp < P_MAXMP) { p.mpots--; p.mp = Math.min(P_MAXMP, p.mp + TUNE.mpPotGain); S.fx.push({ T, type: 'status', text: '+' + TUNE.mpPotGain + ' MP', col: '#7fa8ff' }); S.ev.push({ T, type: 'pot' }); } }
}

// ---------- phase transitions (HP driven) ----------
function trigger(T) {
  const ph = phaseOf(T);
  if (S.trig[ph]) return; S.trig[ph] = true;
  S.ev.push({ T, type: 'split' });
  if (ph === 0) { TL.rw = T; TL.rwA = T + 0.5; TL.rwB = T + 2.5; TL.p2 = T + 4; SPLITS[0].T = T; }
  else if (ph === 1) { TL.ts = T; TL.tsA = T + 0.5; TL.tsB = T + 5.0; TL.p3 = T + 7.0; TL.sent = TL.p3 + 8; SPLITS[1].T = T; }
  else if (ph === 2) { TL.mn = T; TL.p4 = T + 4; SPLITS[2].T = T; }
  else if (ph === 3) forceMidnight(T);
  else startSurvival(T);   // 0 HP: the final seconds
}
function resolveHits(T, wt, wf) {
  let dmgNow = 0;
  const prev = wf > 0 ? S.cum[wf - 1] : S.cumBase, keep = [];
  for (const h of S.pend) {
    if (h.t > wt + 1e-6) { keep.push(h); continue; }
    if (h.tg.sent) {
      const z = h.tg.sent; if (z.deadT !== Infinity) continue;
      z.dmg += h.dmg; S.hits.push({ wt: h.t, x: h.x, y: h.y, dmg: h.dmg, crit: h.crit, kind: h.kind });
      if (h.kind !== 'slash') S.p.mp = Math.min(P_MAXMP, S.p.mp + 33);
      S.p.landed++;
      if (z.dmg >= z.hp) {
        z.deadT = T; S.ev.push({ T, type: 'sentDie' }); S.fx.push({ T, type: 'boom', x: z.x, y: z.y, s: 1 });
        S.parts.push({ t: wt, x: z.x, y: z.y, n: 26, seed: S.parts.length * 7 + 3, col: 'gear', spd: 5, life: 1.2 });
        if (!h.tg.cuck && S.sent.every(q => q.deadT !== Infinity)) { S.shieldT = T; S.ev.push({ T, type: 'shield' }); S.fx.push({ T, type: 'shield' }); }
      }
      S.ev.push({ T, type: h.kind === 'slash' ? 'hit' : 'starHit' });
      continue;
    }
    if (h.tg.body) {
      S.hits.push({ wt: h.t, x: h.x, y: h.y, dmg: 0, armor: true, kind: h.kind });
      S.ev.push({ T, type: 'dink', heavy: h.kind !== 'slash' });
      continue;
    }
    if (T >= TL.svB && bossVulnerable(T)) {
      const d = h.dmg * TUNE.wpMul; S.survBonus += d / SURV_K; S.p.landed++; if (h.kind === 'slash') S.p.wpHits++;
      S.hits.push({ wt: h.t, x: h.x, y: h.y, dmg: d, crit: h.crit, kind: h.kind, wp: true, surv: true });
      if (h.kind !== 'slash') { S.p.mp = Math.min(P_MAXMP, S.p.mp + 33); S.fx.push({ T, type: 'starHit', x: h.x, y: h.y }); }
      S.ev.push({ T, type: h.kind === 'slash' ? 'hit' : 'starHit', crit: h.crit }); continue;
    }
    if (!bossVulnerable(T)) { S.hits.push({ wt: h.t, x: h.x, y: h.y, dmg: 0, armor: true, kind: h.kind }); S.ev.push({ T, type: 'dink', heavy: h.kind !== 'slash' }); continue; }
    const hp = MAXHP - (prev + dmgNow), floor = PHASE_FLOOR[phaseOf(T)] * MAXHP;
    const d = Math.min(h.dmg * TUNE.wpMul, hp - floor);
    if (d <= 0) continue;
    dmgNow += d; S.p.landed++; if (h.kind === 'slash') S.p.wpHits++;
    const final = floor === 0 && hp - d <= 0.5;
    S.hits.push({ wt: h.t, x: h.x, y: h.y, dmg: d, crit: h.crit, kind: h.kind, final, wp: true });
    if (h.kind !== 'slash') {
      S.p.mp = Math.min(P_MAXMP, S.p.mp + 33);
      S.parts.push({ t: h.t, x: h.x, y: h.y, n: final ? 40 : 18, seed: S.parts.length * 13 + 1, col: final ? 'p' : 'g', spd: final ? 7 : 4.5, life: final ? 1.1 : 0.7 });
      S.fx.push({ T, type: 'starHit', x: h.x, y: h.y });
    }
    if (final) S.fx.push({ T, type: 'final', x: h.x, y: h.y });
    S.ev.push({ T, type: final ? 'killHit' : h.kind === 'slash' ? 'hit' : 'starHit', crit: h.crit });
    if (hp - d <= floor + 0.5) trigger(T);
  }
  S.pend = keep;
  S.cum[wf] = prev + dmgNow;
}
function hurt(T, wt, dmg) {
  const p = S.p; p.lastHitT = T; p.hp -= dmg; p.hits++; p.dmgTaken += dmg;
  S.phits.push({ wt, dmg: Math.round(dmg), x: p.x, y: p.y });
  S.ev.push({ T, type: 'phurt', big: dmg > 300 });
  if (p.hp <= 0) killPlayer(T, 'oryx');
}
function killPlayer(T, cause) {
  if (S.dead) return;
  S.p.hp = 0; S.dead = T; S.deathCause = cause;
  S.ev.push({ T, type: 'death', cause });
}
function collide(T, wt) {
  const p = S.p;
  if (T >= T_KILL || S.dead) return;
  if (T - (p.lastHitT ?? -9) < 0.1) return;   // brief immunity so overlapping bullets can't stack in one instant
  for (let i = 0; i < S.al.length; i++) {
    const b = S.al[i]; if (T < b.rv || b.hit !== Infinity || wt < b.t0 + b.arm) continue;
    const dx = S.alx[i] - p.x, dy = S.aly[i] - p.y, rr = b.rad + P_R + S.botPad;
    if (dx * dx + dy * dy < rr * rr) { b.hit = wt; if (S.log) S.log.push({ T, ph: phaseOf(T) + 1, k: b.k, age: T - Math.max(b.T0 + b.dl, b.rv || 0), sweep: b.sweep }); hurt(T, wt, b.dmg); if (S.dead) return; }
  }
  for (const l of S.lobs) if (!l.done && wt >= l.tl) { l.done = true; if (Math.hypot(p.x - l.x1, p.y - l.y1) < (l.kind === 'glass' ? 0.9 : 0.7) + S.botPad) { if (S.log) S.log.push({ T, ph: phaseOf(T) + 1, k: 'bomb:' + l.kind, age: wt - l.t0 }); hurt(T, wt, 150 * TUNE.bulletMul); if (S.dead) return; } }
  for (const z of S.pillars) if (!z.done && wt >= z.ti) { z.done = true; if (Math.hypot(p.x - z.x, p.y - z.y) < z.r + P_R + S.botPad) { if (S.log) S.log.push({ T, ph: phaseOf(T) + 1, k: 'pillar', age: wt - z.t0 }); hurt(T, wt, 180 * TUNE.bulletMul); if (S.dead) return; } }
}
function regen() {
  const p = S.p;
  if (S.dead) return;
  p.hp = Math.min(P_MAXHP, p.hp + TUNE.regen / FPS);
  p.mp = Math.min(P_MAXMP, p.mp + 22 / FPS);
}

// ---------- time stop (the boss acts in real time while the world is frozen) ----------
function timeStop(T) {
  const p = S.p;
  if (!S.blink) {
    const b0 = bossAt(TL.tsA - 0.01, S.wt), radial = Math.atan2(p.y - b0.y, p.x - b0.x);
    let gap = radial + Math.PI / 2;
    if (Math.hypot(p.x + Math.cos(gap) * 5, p.y + Math.sin(gap) * 5) > 11) gap = radial - Math.PI / 2;
    if (Math.hypot(p.x + Math.cos(gap) * 5, p.y + Math.sin(gap) * 5) > 11) gap = Math.atan2(-p.y, -p.x);
    const pts = [];
    for (let q = 0; q < 4; q++) {
      const mid = gap + Math.PI / 4 + (q + 0.5) * (TAU - Math.PI / 2) / 4;
      pts.push({ T: TL.tsA + 0.5 + q * 0.75, x: p.x + Math.cos(mid) * 4.6, y: p.y + Math.sin(mid) * 4.6 + 1.2, q, mid });
    }
    S.blink = { gap, pts: [{ T: 0, x: b0.x, y: b0.y }, ...pts, { T: TL.tsA + 3.5, x: HOME.x + 0.9 * Math.sin(0.33 * S.wt), y: HOME.y + 0.45 * Math.sin(0.51 * S.wt) }], placed: 0, px: p.x, py: p.y };
  }
  const bl = S.blink;
  for (let q = 0; q < 4; q++) {
    const pt = bl.pts[q + 1];
    for (let j = 0; j < 8; j++) {
      const idx = q * 8 + j, tP = pt.T + 0.1 + j * 0.06;
      if (idx < bl.placed || T < tP) continue;
      bl.placed = idx + 1;
      const a = bl.gap + Math.PI / 4 + (idx + 0.5) * (TAU - Math.PI / 2) / 32;
      emitB(T, { t0: S.wt, dl: 0.12, cx: bl.px, cy: bl.py, r0: 3.3, vr: -5.2, th: a, k: 'hand', life: 1.6, rv: tP });
      S.ev.push({ T: tP, type: 'place' });
    }
    if ((S.f - 1) / FPS < pt.T && T >= pt.T) { S.ev.push({ T: pt.T, type: 'blink' }); S.fx.push({ T: pt.T, type: 'blink', x: pt.x, y: pt.y }); }
  }
}

// ---------- fixed one-shot events and boss lines ----------
function scriptEvents(T0, T1) {
  const at = t => T0 < t && T1 >= t;
  const b = S.boss, wt = S.wt;
  if (at(TL.run)) { S.ev.push({ T: TL.run, type: 'portal' }); say(TL.run + 0.7, 'boss', 'Three times you have ended me, mortal. Three times I have watched.'); }
  if (at(TL.run + 0.6)) S.ev.push({ T: T1, type: 'eyes' });
  if (at(TL.land)) {
    S.ev.push({ T: TL.land, type: 'land' }); S.fx.push({ T: TL.land, type: 'land', x: HOME.x, y: HOME.y + 3.3 });
    S.parts.push({ t: wt, x: HOME.x, y: HOME.y + 3.3, n: 60, seed: 777, col: 'gear', spd: 9, life: 1.1 });
  }
  const ends = { p1: TL.rw, p2: TL.ts, p3: TL.mn, p4: TL.m12, p5: TL.sv };
  for (const k in PHASE_LINES) for (const [o, text] of PHASE_LINES[k]) { const t = TL[k] + o; if (at(t) && t < ends[k] && !S.dead) say(t, 'boss', text); }
  if (at(TL.rw)) { say(TL.rw + 0.1, 'boss', 'Enough. Let us try that again.'); S.ev.push({ T: TL.rw, type: 'rewindTaunt' }); }
  if (at(TL.rw + 2.7)) say(T1, 'boss', 'Every wound you deal me, I simply... unmake.');
  if (at(TL.rwA)) S.ev.push({ T: TL.rwA, type: 'rewindStart' });
  if (at(TL.rwB)) S.ev.push({ T: TL.rwB, type: 'rewindEnd' });
  if (at(TL.ts)) say(TL.ts + 0.05, 'boss', 'Then I will simply... stop the clock.');
  if (at(TL.tsA)) { S.ev.push({ T: TL.tsA, type: 'stop' }); S.fx.push({ T: TL.tsA, type: 'stop' }); }
  if (at(TL.tsA + 1.7)) say(T1, 'boss', 'Time is MINE.');
  if (at(TL.tsB - 0.9)) say(T1, 'boss', 'And now... time resumes.');
  if (at(TL.tsA + 0.5)) for (const e of S.echoes) {
    if (TL.tsA >= e.until + 0.6) continue;
    const p = echoPos(e, TL.tsA);
    S.fx.push({ T: T1, type: 'echoShatter', x: p.x, y: p.y, id: e.id });
    S.parts.push({ t: wt, T: T1, rt: 1, x: p.x, y: p.y - 1, n: 50, seed: 900 + e.a0 * 100 | 0, col: e.id === 'castle' ? 'c' : e.id === 'cellar' ? 'r' : 'g', spd: 5, life: 1.4 });
    S.ev.push({ T: T1, type: 'shatterSmall' });
  }
  if (at(TL.tsB)) { S.ev.push({ T: TL.tsB, type: 'resume' }); S.fx.push({ T: TL.tsB, type: 'resume', x: S.p.x, y: S.p.y }); }
  if (at(TL.mn)) { S.ev.push({ T: TL.mn, type: 'midnight' }); say(TL.mn + 0.1, 'boss', 'NO MORE GAMES. When the clock strikes twelve, this realm ENDS.'); }
  if (at(TL.mn + 2)) { S.ev.push({ T: T1, type: 'transform' }); S.fx.push({ T: T1, type: 'transform', x: b.x, y: b.y }); }
  if (at(T_KILL)) { say(T_KILL + 0.7, 'boss', 'No... not even... one more second...'); say(T_KILL + 2.7, 'sys', BOSS + ' has been defeated!'); }
  if (at(T_KILL + 2.4)) {
    const k = S.killPos || b;
    S.ev.push({ T: T1, type: 'explode' }); S.fx.push({ T: T1, type: 'explode', x: k.x, y: k.y - k.z });
    [['gear', 90, 11, 2.4], ['g', 120, 14, 1.8], ['r', 80, 9, 2.2], ['w', 60, 16, 1.2], ['c', 50, 8, 2.0]].forEach(([col, n, spd, life], i) =>
      S.parts.push({ t: wt, x: k.x, y: k.y - k.z, n, seed: 4000 + i * 97, col, spd, life }));
  }
  if (at(TL.results)) S.ev.push({ T: TL.results, type: 'results' });
}

// ---------- step ----------
function refreshAlive(wt) {
  const bb = S.bb, margin = S.T < TL.rwB + 0.5 ? 14 : 0.5;
  while (S.bbStart < bb.length) {
    const b = bb[S.bbStart];
    if (b.t0 + b.dl + b.life < wt - margin && b.t0 < wt - margin) S.bbStart++; else break;
  }
  S.al.length = 0;
  for (let i = S.bbStart; i < bb.length; i++) {
    const b = bb[i];
    if (!balive(b, wt)) continue;
    bpos(b, wt);
    const n = S.al.length; if (n >= 4096) break;
    S.al.push(b); S.alx[n] = BX; S.aly[n] = BY;
  }
}
function truncateAfter(wt) {
  S.bb = S.bb.filter(b => b.t0 <= wt);
  for (const b of S.bb) if (b.hit > wt) b.hit = Infinity;
  S.bbStart = 0;
  S.pb = S.pb.filter(q => q.t0 <= wt && q.hitT <= wt);
  S.pend = [];
  S.hits = S.hits.filter(h => h.wt <= wt);
  S.phits = S.phits.filter(h => h.wt <= wt);
  S.parts = S.parts.filter(q => q.t <= wt);
  S.lobs = S.lobs.filter(q => q.t0 <= wt);
  S.tele = S.tele.filter(q => q.t0 <= wt);
  const wf = Math.round(wt * FPS), p = S.p;
  p.x = S.hx[wf]; p.y = S.hy[wf]; p.hp = S.hhp[wf]; p.mp = S.hmp[wf];
  S.needTrunc = false;
}
function record(wf) {
  const p = S.p;
  S.hx[wf] = p.x; S.hy[wf] = p.y; S.hhp[wf] = p.hp; S.hmp[wf] = p.mp; S.hpots[wf] = p.pots;
  const mv = Math.hypot(p.vx, p.vy);
  p.walk += mv / FPS;
  const a = (S.T - p.atkT < 0.3) ? p.aim : mv > 0.5 ? Math.atan2(p.vy, p.vx) : p.aim;
  const c = Math.cos(a), s = Math.sin(a);
  if (Math.abs(c) > Math.abs(s) * 0.8) { p.dir = 0; p.face = c >= 0 ? 1 : -1; } else p.dir = s > 0 ? 1 : 2;
  S.hdir[wf] = p.dir; S.hface[wf] = p.face; S.hwalk[wf] = mv > 0.5 ? p.walk : -1; S.hatk[wf] = p.atkT;
}
function updateCam(T) {
  const c = S.cam, wf = S.wf, px = S.hx[wf], py = S.hy[wf], b = S.boss;
  // frame the player and all of Oryx together: centre the pair's bounding box in the view below the top HUD row.
  // At the arena edge his crown just tucks under the boss bar; closer in, the same zoom leaves room to spare.
  const by = b.y - b.z, zf = T >= TL.mn ? 0.70 : 0.75;
  const top = Math.min(py - 0.75, by - 3.2), bot = Math.max(py + 0.8, by + 3.45);
  let tx = (Math.min(px - 0.6, b.x - 2.8) + Math.max(px + 0.6, b.x + 2.8)) / 2, ty = (top + bot) / 2 + (GH * 0.54 - CAM_MID) / (TILE * zf), z = zf;
  if (T < TL.land + 0.5) { tx = lerp(px, 0, 0.45); ty = lerp(py, 1.5, 0.45); z = 0.72; }
  if (T >= TL.tsA && T < TL.tsB && S.blink) { tx = S.blink.px; ty = S.blink.py - 0.5; z = 0.86; }
  if (T >= TL.sv && T < TL.svB - 0.3) { tx = b.x; ty = b.y - b.z - 0.3; z = 0.95; }
  if (T >= T_KILL && T < T_KILL + 3.2) { tx = lerp(tx, b.x, 0.5); ty = lerp(ty, b.y - b.z - 0.8, 0.5); z = 0.82; }
  const k = S.f < 2 ? 1 : 1 - Math.exp(-8 / FPS);
  c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.z += (z - c.z) * (1 - Math.exp(-2.2 / FPS));
}
function prune() {
  const wt = S.wt, T = S.T, keepW = S.T < TL.rwB + 1 ? 14 : 4;
  S.hits = S.hits.filter(h => h.wt > wt - keepW);
  S.phits = S.phits.filter(h => h.wt > wt - keepW);
  S.parts = S.parts.filter(q => (q.rt ? q.T > T - 4 : q.t > wt - keepW) || q.col === 'clear' && q.t > wt - 2);
  S.pb = S.pb.filter(q => q.t0 > wt - keepW);
  S.lobs = S.lobs.filter(q => q.tl > wt - keepW);
  S.pillars = S.pillars.filter(q => q.ti > wt - keepW);
  S.tele = S.tele.filter(q => q.t1 > wt - keepW);
  S.fx = S.fx.filter(e => e.T > T - 6);
  if (S.bbStart > 3000) { S.bb = S.bb.slice(S.bbStart); S.bbStart = 0; }
  if (S.swings.length > 64) S.swings = S.swings.slice(-32);
}
function step() {
  const f = S.f, T = f / FPS, Tp = (f - 1) / FPS;  // Tp is exactly the previous frame's T, so windows never overlap
  CUR_T = T; S.T = T;
  const rate = f === 0 ? 1 : worldRate(T - 0.5 / FPS);
  S.rate = rate;
  if (rate === 0) S.off = T - S.wt; else { S.off += (1 - rate) / FPS; S.wt = T - S.off; }
  S.wf = Math.round(S.wt * FPS);
  const wt = S.wt, wf = S.wf;
  if (rate > 0.5) {
    if (S.needTrunc) truncateAfter(wt);
    S.boss = bossAt(T, wt);
    if (T >= T_KILL && !S.killPos) S.killPos = { x: S.boss.x, y: S.boss.y, z: S.boss.z };
    if (T < T_KILL && !S.dead) { bossAI(Tp, T); minionAI(Tp, T); }
    updateHoming(wt);
    refreshAlive(wt);
    if (!S.dead) { playerMove(T, wt); playerAttack(T, wt); }
    resolveHits(T, wt, wf);
    if (T_KILL === Infinity && T >= TL.svB && survLeft(T) <= 0) killBoss(T);
    collide(T, wt);
    regen();
    if (T >= TL.bag && !S.bag) { S.bag = { x: S.killPos.x, y: S.killPos.y + 1.2, T }; S.ev.push({ T, type: 'bag' }); }
    record(wf);
  } else {
    if (rate < 0) S.needTrunc = true;
    S.boss = bossAt(T, wt);
    if (T >= TL.tsA && T < TL.tsB) timeStop(T);
    if (T >= T_KILL && !S.killPos) S.killPos = { x: S.boss.x, y: S.boss.y, z: S.boss.z };
    S.cum[wf] = S.cum[wf] || (wf > 0 ? S.cum[wf - 1] : S.cumBase);
    refreshAlive(wt);
    S.p.aim = Math.atan2(S.input.ay - (S.p.y - 0.25), S.input.ax - S.p.x);
  }
  if (T >= T_KILL && !S.cleared) {
    S.cleared = true;
    for (const b of S.al) b.hit = wt;
    S.parts.push({ t: wt, x: 0, y: 0, n: 0, seed: 1, col: 'clear', spd: 0, life: 1, snap: S.al.map((b, i) => [S.alx[i], S.aly[i], b.k]) });
    S.pend = [];
    S.ev.push({ T, type: 'kill' });
  }
  scriptEvents(Tp, T);
  updateCam(T);
  if (f % 120 === 119) prune();
  S.f++;
}
