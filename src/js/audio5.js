'use strict';
// ================= Oryx V, The Usurper: soundtrack in E minor at 120 BPM, rendered offline like the Oryx IV score =================
// One fixed timeline of segments [start, end, loop]; the game plays one per phase and loops [start, end) when loop is 1.
// Every segment starts on a bar line of the game's 0.5 s beat grid.
const SEG5 = { title5: [0, 16, 1], entrance5: [16, 20, 0], staff: [20, 52, 1], wand: [52, 84, 1], bow: [84, 116, 1], dagger: [116, 148, 1],
  sword: [148, 180, 1], knight: [180, 212, 1], laststand: [212, 228, 1], victory5: [228, 256, 0] };
const MUSIC5_LEN = 256;
Object.assign(LA, { music5L: null, music5R: null, prog5: 0 });
Object.assign(CH, { Am: [57, 60, 64], B: [59, 63, 66] });
const SC5 = [4, 6, 7, 9, 11, 0, 2], DOR5 = [4, 6, 7, 9, 11, 1, 2];   // pitch classes of E aeolian and E dorian
const oct5 = (m, lo) => lo + ((m - lo) % 12 + 12) % 12;              // m's pitch class placed in [lo, lo + 12)
// the harmony a third below m: diatonic, bent to the chord's raised tones (D# over B, C# over A); under a borrowed chord (Eb, F) the chord tone below
function third5(m, c, sc = SC5) {
  const has = h => CH[c].some(x => (x - h) % 12 === 0);
  if (!sc.includes(CH[c][0] % 12)) for (const d of [3, 4, 5]) if (has(m - d)) return m - d;
  const i = sc.indexOf(m % 12), h = i < 0 ? m - 4 : m - (sc[i] - sc[(i + 5) % 7] + 12) % 12;
  return !has(h) && has(h + 1) && !sc.includes((h + 1) % 12) ? h + 1 : h;
}

// ---------- the Usurper's theme: an arpeggio that climbs to the minor sixth and sighs down (C-B), answered by a falling three-note figure ----------
const PROG_U = ['Em', 'C', 'Am', 'B', 'Em', 'C', 'D', 'B'];
const MEL_U = [[0, 76, 1], [1, 79, .5], [1.5, 83, .5], [2, 84, 1.5], [3.5, 83, .5], [4, 81, 1], [5, 79, 1], [6, 76, 2],
  [8, 72, 1], [9, 76, .5], [9.5, 81, .5], [10, 83, 1.5], [11.5, 81, .5], [12, 79, 1], [13, 78, 1], [14, 75, 2],
  [16, 76, 1], [17, 79, .5], [17.5, 83, .5], [18, 88, 1.5], [19.5, 86, .5], [20, 84, 1], [21, 83, 1], [22, 79, 2],
  [24, 74, 1], [25, 78, .5], [25.5, 81, .5], [26, 84, 1.5], [27.5, 83, .5], [28, 81, 1], [29, 78, 1], [30, 75, 1.5], [31.5, 71, .5]];
// the motif rebuilt on any chord (root placed in [lo, lo + 12)), one rhythm per bar: [beat, tone (0-2 root/3rd/5th, 3 the scale step above the 5th), beats]
const MOTIF5 = [[0, 0, 1], [1, 1, .5], [1.5, 2, .5], [2, 3, 1.5], [3.5, 2, .5]];
const RH5 = { motif: MOTIF5, answer: [[0, 3, 1], [1, 2, 1], [2, 1, 2]],
  fast: [0, 2].flatMap(o => MOTIF5.map(([b, k, l]) => [o + b / 2, k, l / 2])),
  gallop: [[0, 0, .5], [.5, 1, .25], [.75, 2, .25], [1, 3, 1], [2, 2, .5], [2.5, 1, .25], [2.75, 2, .25], [3, 0, 1]],
  sneak: [[0, 0, .25], [.75, 1, .25], [1.5, 2, .25], [2, 3, .75], [3, 2, .25], [3.5, 1, .25]] };
function motifs(prog, rhs, lo = 71, sc = SC5) {
  return prog.flatMap((c, i) => {
    const n = CH[c].map(m => m - CH[c][0] + oct5(CH[c][0], lo)); n.push(n[2] + (sc.includes((n[2] + 1) % 12) ? 1 : 2));
    return (rhs[i % rhs.length] || []).map(([b, k, l]) => [i * 4 + b, n[k], l]);
  });
}

// ---------- instruments ----------
const INS5 = {
  lead: { pw: 'p25', vol: 0.08, a: 0.01, d: 0.2, s: 0.7, r: 0.12, vib: 0.012, lp: 4200, pan: -0.1, rev: 0.3 },
  saw: { wave: 'sawtooth', det: 8, vol: 0.07, a: 0.012, d: 0.25, s: 0.8, r: 0.14, lp: 2800, q: 1.5, vib: 0.012, pan: -0.1, rev: 0.28 },
  brass: { wave: 'sawtooth', det: 7, vol: 0.115, a: 0.035, d: 0.3, s: 0.85, r: 0.18, lp: 2400, lpEnv: 0.4, lpT: 0.12, q: 1.2, vib: 0.01, pan: -0.05, rev: 0.32 },
  pluck: { pw: 'p125', vol: 0.09, a: 0.002, d: 0.1, s: 0.08, r: 0.05, lp: 1800, lpEnv: 2.5, lpT: 0.05, q: 3, rev: 0.2 },
  bass: { wave: 'sawtooth', vol: 0.15, a: 0.004, d: 0.12, s: 0.5, r: 0.05, lp: 420, lpEnv: 4, q: 4 },
};
const nv = (t, m, dur, base, o) => voice(t, mtof(m), dur, Object.assign({}, base, o));
function lead5(bar0, mel, fn, prog = PROG_U) { for (const [b, m, l] of mel) fn(beatT(bar0, b), m, l * BEAT, prog[Math.floor(b / 4)]); }
const hero5 = (harm, cv = 0) => (t, m, d, c) => {   // the brass lead of the knight: octave below, optional harmony and choir on the melody
  nv(t, m, d * .92, INS5.brass); nv(t, m - 12, d * .92, INS5.saw, { vol: 0.04, vib: 0, pan: 0.2 });
  if (harm) nv(t, third5(m, c), d * .92, INS5.brass, { vol: 0.045, vib: 0, pan: 0.3 });
  if (cv) choir(t, [m - 12], d, cv);
};
const choir5 = (t, c, dur, v = 1, tr = 0) => choir(t, [CH[c][0] - 12, CH[c][2] - 12, CH[c][0], CH[c][1]].map(m => m + tr), dur, v);
const brass5 = (t, notes, dur, v = 1, o) => notes.forEach((m, i) => nv(t, m, dur, INS5.brass, Object.assign({ vol: 0.03 * v, a: 0.08, vib: 0, pan: i % 2 ? 0.3 : -0.3 }, o)));
const power5 = (t, c, dur, v = 1, mute = false) => (mute ? [0, 7] : [0, 7, 12]).forEach(iv => nv(t, oct5(CH[c][0], 43) + iv, dur, { wave: 'sawtooth', det: mute ? 0 : 14, vol: 0.07 * v, a: 0.004,
  d: mute ? 0.06 : 0.2, s: mute ? 0.15 : 0.7, r: 0.05, lp: mute ? 1300 : 3000, lpEnv: mute ? 0 : 2, lpT: 0.04, q: 2, rev: 0.1, pan: iv === 7 ? 0.25 : -0.1 }));
const strum5 = (t, c, v = 1) => CH[c].forEach((m, i) => nv(t + i * 0.016, m, 0.32, { pw: 'p50', vol: 0.03 * v, a: 0.002, d: 0.12, s: 0.25, r: 0.1, lp: 2400, pan: (i - 1) * 0.35, rev: 0.2 }));
const timp5 = (t, c, v = 1) => { const f = mtof(oct5(CH[c][0], 36)); sweep(t, f * 1.08, f, 1.1, { vol: 0.4 * v, rev: 0.2 }); noise(t, 0.05, { vol: 0.15 * v, type: 'lowpass', f: 1000, rev: 0.2 }); };

// ---------- drums: one character per 16th, a digit is the velocity in eighths, r a 32nd-note stutter; the last bar of a call plays the fill f ----------
// k kick, s snare, h hat, o open hat, t rim tick, m tom (its pitch falls through the bar)
const DR5 = { k: (t, v) => kick(t, v), s: (t, v) => snare(t, v), h: (t, v) => hat(t, v), o: (t, v) => hat(t, v, true), t: (t, v) => tick(t, true, v),
  m: (t, v, s) => { sweep(t, 300 - s * 10, 190 - s * 6, 0.4, { vol: 0.28 * v }); noise(t, 0.04, { vol: 0.12 * v, type: 'lowpass', f: 1500 }); } };
const GR5 = {
  title: { k: '4...............', h: '2.3.2.3.2.3.2.3.' },
  staff: { k: '8.....6.8.6.....', s: '....8.......8..2', h: '6.3.6.3.6.3.6.35', f: { s: '....8...5.6.7788' } },
  wand: { k: '8...7...8...7...', s: '....7.......7...', h: '4242424242424242', f: { s: '....8.......6688' } },
  bow: { k: '8.....7.8.....7.', s: '....9.......9...', h: '7.557.557.557.55', o: '..............4.', f: { m: '........8.7.6.65' } },
  dagger: { k: '8..7..7...7..7..', s: '....9..3....9.4.', t: '..6.......6.....', h: 'r.8.7.r.8.7.r.8r', f: { s: '....7.......rrrr' } },
  sword: { k: '8.4.8.4.8.4.8.44', s: '....9.......9...', h: '6.4.6.4.6.4.6.4.', f: { m: '........8.8.7.66' } },
  knight: { k: '9.....7.9.7.7.7.', s: '....9.......9...', h: '6.4.6.4.6.4.6.4.', o: '..............5.', f: { m: '........88776655', o: '' } },
  last: { k: '9...8...9...8.8.', s: '..8...8...8...9.', h: '6464646464646464', f: { s: '..8...8...888888' } },
  fan: { k: '8.......8.......', s: '....6.......6...', f: { s: '....6...45566778' } },
};
function drums5(bar0, nb, g) {
  for (let b = 0; b < nb; b++) for (let s = 0; s < 16; s++) for (const k in DR5) {
    const p = b === nb - 1 && g.f && k in g.f ? g.f : g, ch = (p[k] || '')[s] || '.';
    if (ch === '.') continue;
    const t = beatT(bar0 + b, s / 4), v = ch === 'r' ? 0.5 : ch / 8;
    DR5[k](t, v, s); if (ch === 'r') DR5[k](t + 0.0625, v * 0.8, s);
  }
}
// ---------- bass: one character per 16th (r root, o octave, f fifth, b flat second, '-' holds); roots sit in C2-B2 to keep the low end tight ----------
function bass5(bar0, prog, pat, o) {
  prog.forEach((c, i) => [...pat].forEach((ch, s) => {
    const iv = { r: 0, o: 12, f: 7, b: 1 }[ch]; if (iv === undefined) return;
    let n = 1; while (pat[s + n] === '-') n++;
    nv(beatT(bar0 + i, s / 4), oct5(CH[c][0], 36) + iv, n * 0.125 * 0.85, INS5.bass, o);
  }));
}

function scoreMusic5() {
  const B = k => SEG5[k][0] / BAR;
  // ---- title: the choir and bells breathe the opening of the theme at half speed over a soft pulse ----
  ['Em', 'C', 'Am', 'B'].forEach((c, i) => { const t = beatT(2 * i, 0); choir5(t, c, 2 * BAR, 1.8); pad(t, CH[c], 2 * BAR - 0.7, 1.5); bass5(2 * i, [c, c], 'r.r.r.r.r.r.r.r.', { pw: 'p50', vol: 0.045, lp: 600, lpEnv: 1.5, q: 1 }); });
  MEL_U.filter(n => n[0] < 16).forEach(([b, m, l]) => { const t = b * BEAT * 2; bell(t, mtof(m + 12), l * 1.6, { vol: 0.12, ratio: 3.01, index: 1.2, rev: 0.45, pan: 0.2 }); bell(t, mtof(m), l * 2, { vol: 0.08, ratio: 2, index: 0.8, rev: 0.4, pan: -0.2 }); });
  drums5(0, 8, GR5.title); tubular(0, mtof(52), 0.3, 6);
  // ---- entrance: the giant descends; noise rises over a falling drone on B and the drums gather into phase I ----
  noise(16, 4, { vol: 0.2, type: 'bandpass', f: 300, f2: 6000, q: 2, rise: true }); sweep(16, 440, 55, 4, { vol: 0.28, wave: 'triangle', rev: 0.3 });
  choir(16, [47, 54, 59, 63], 4, 1.4); brass5(16, [47, 54, 59, 66], 3.6, 1.3, { a: 1.5 });
  [16, 17, 17.5].forEach(t => timp5(t, 'B', 0.8)); [18, 18.5, 19, 19.5].forEach(t => kick(t, 0.8));
  for (let s = 0; s < 16; s++) snare(18 + s * 0.125, 0.15 + s * 0.045);
  revCym(20, 1.5, 1.1);
  // ---- phase I, staff (Wizard/Necromancer/Mystic): arcane and driving; the motif walks down an Andalusian cadence, then the theme ----
  { const b0 = B('staff'), PX = ['Em', 'D', 'C', 'B', 'Em', 'D', 'C', 'B'];
    const myst = (t, m, d) => { nv(t, m, d * .9, INS5.lead, { pw: 'p125', vol: 0.12, vib: 0.016, lp: 3200 }); nv(t + 0.375, m, d * .9, INS5.lead, { pw: 'p125', vol: 0.04, vib: 0, pan: 0.45, lp: 2200 }); };
    [[b0, PX], [b0 + 8, PROG_U]].forEach(([b, P], h) => {
      crash(beatT(b, 0), h ? 0.6 : 0.9); drums5(b, 8, GR5.staff); bass5(b, P, 'r.o.r.o.r.o.r.o.'); secArp(b, P, 0, 0.8);
      P.forEach((c, i) => choir5(beatT(b + i, 0), c, BAR, h ? 0.8 : 1));
    });
    timp5(beatT(b0, 0), 'Em');
    lead5(b0, motifs(PX.slice(0, 4), [RH5.motif]), myst, PX);
    lead5(b0 + 4, [[0, 79, 4], [4, 78, 4], [8, 76, 4], [12, 75, 3.5]], myst, PX);
    lead5(b0 + 8, MEL_U, myst);
  }
  // ---- phase II, wand (Priest/Sorcerer/Summoner): holy and electric; the theme rings out on bells over bright pads, then an electric climb ----
  { const b0 = B('wand'), PX = ['C', 'D', 'Em', 'G', 'C', 'D', 'B', 'B'];
    const bells = (t, m, d) => { bell(t, mtof(m + 12), d * 1.6, { vol: 0.055, ratio: 3.01, index: 1.3, rev: 0.4, pan: 0.2 }); bell(t, mtof(m), d * 2, { vol: 0.045, ratio: 2, index: 1, rev: 0.4, pan: -0.2 }); nv(t, m, d * .9, INS5.lead, { wave: 'triangle', pw: 0, vol: 0.05, vib: 0.01 }); };
    const elec = (t, m, d) => nv(t, m, d * .8, { wave: 'square', vol: 0.065, a: 0.003, d: 0.1, s: 0.4, r: 0.06, lp: 2600, lpEnv: 2.5, lpT: 0.05, q: 4, glide: 0.94, glideT: 0.03, pan: -0.15, rev: 0.25 });
    [[b0, PROG_U], [b0 + 8, PX]].forEach(([b, P], h) => {
      crash(beatT(b, 0), 0.8); drums5(b, 8, h ? { ...GR5.wand, o: '..5...5...5...5.' } : GR5.wand); bass5(b, P, '..r...r...r...r.', { lp: 520 }); secArp(b, P, 0, 0.45 + 0.15 * h, -1);
      P.forEach((c, i) => { pad(beatT(b + i, 0), [...CH[c], CH[c][0] + 14].map(m => m + 12), BAR, 0.55); if (i % 2 === 0) choir5(beatT(b + i, 0), c, 2 * BAR, 0.65, 12); });
    });
    lead5(b0, MEL_U, bells);
    lead5(b0 + 8, motifs(PX, [RH5.fast]), elec, PX);
  }
  // ---- phase III, bow (Archer/Huntress/Bard): folk and heroic; the theme turns dorian over a gallop, then a hunting call ----
  { const b0 = B('bow'), PT = ['Em', 'A', 'A', 'B', 'Em', 'A', 'D', 'B'], PX = ['Em', 'D', 'A', 'Em', 'Em', 'D', 'A', 'B'];
    const pulse = (t, m, d, c) => { nv(t, m, d * .9, INS5.lead, { vol: 0.095, vib: 0.018 }); nv(t, third5(m, c, DOR5), d * .9, INS5.lead, { pw: 'p50', vol: 0.05, vib: 0, pan: 0.3, lp: 2400 }); };
    [[b0, PT], [b0 + 8, PX]].forEach(([b, P], h) => {
      crash(beatT(b, 0), 0.8); drums5(b, 8, GR5.bow); bass5(b, P, 'r.rrr.rrr.rro.oo'); secPad(b, P, 0, 1.2);
      P.forEach((c, i) => { [0, 3, 6, 8, 11, 14].forEach(s => strum5(beatT(b + i, s / 4), c, s % 8 ? 0.9 : 1.3)); if (h) choir5(beatT(b + i, 0), c, BAR, 0.8); });
    });
    lead5(b0, MEL_U.map(([b, m, l]) => [b, m % 12 ? m : m + 1, l]), pulse, PT);   // C -> C#, the dorian sixth
    lead5(b0 + 8, motifs(PX, [RH5.gallop], 69, DOR5), pulse, PX);
  }
  // ---- phase IV, dagger (Rogue/Assassin/Trickster): stealth; a phrygian bass ostinato under stutter drums, the motif and theme plucked low ----
  { const b0 = B('dagger'), PX = ['Em', 'F', 'Em', 'F', 'Em', 'F', 'Am', 'B'];
    const pluck = (t, m) => { nv(t, m, 0.14, INS5.pluck, { vol: 0.14 }); nv(t + 0.375, m + 12, 0.1, INS5.pluck, { vol: 0.04, pan: 0.5 }); };
    [[b0, PX], [b0 + 8, PROG_U]].forEach(([b, P], h) => {
      crash(beatT(b, 0), 0.5); drums5(b, 8, GR5.dagger); bass5(b, P, 'r..r..o.r.b.r..f', { vol: 0.2, lp: 560 });
      P.forEach((c, i) => { pad(beatT(b + i, 0), CH[c].map(m => m - 12), BAR, 1.3); if (i % 2 === 0) choir5(beatT(b + i, 0), c, 2 * BAR, 0.9, -12); });
      for (let i = 0; i < 8; i += 2) bell(beatT(b + i, 3.5), mtof(95), 0.3, { vol: 0.045, ratio: 1.41, index: 2, pan: 0.6, rev: 0.5 });
    });
    lead5(b0, motifs(PX, [RH5.sneak], 59), pluck, PX);
    lead5(b0 + 8, MEL_U.map(([b, m, l]) => [b, m - 12, l]), (t, m, d) => { pluck(t, m); nv(t, m + 12, d * .9, INS5.lead, { wave: 'triangle', pw: 0, vol: 0.065, a: 0.05, pan: 0.2 }); });
  }
  // ---- phase V, sword (Warrior/Paladin): power chords and heavy drums; a riff answered by the motif, then the theme on a saw lead ----
  { const b0 = B('sword'), PX = ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'C', 'B'], RIFF = 'PmmPmmPmmPmmPmmm';
    const saw = (t, m, d) => { nv(t, m, d * .92, INS5.saw, { vol: 0.09 }); nv(t, m - 12, d * .92, INS5.saw, { vol: 0.05, vib: 0, pan: 0.15 }); };
    [[b0, PX], [b0 + 8, PROG_U]].forEach(([b, P], h) => {
      crash(beatT(b, 0), 1); drums5(b, 8, h ? GR5.sword : { ...GR5.sword, k: '8..7..7..7..8.66' }); bass5(b, P, h ? 'r.r.r.r.r.r.r.r.' : 'r..r..r..r..r...');
      P.forEach((c, i) => h ? [...'P.m.m.m.m.m.m.m.'].forEach((ch, s) => ch !== '.' && power5(beatT(b + i, s / 4), c, ch === 'P' ? BAR * 0.95 : 0.1, ch === 'P' ? 0.8 : 0.5, ch === 'm'))
        : [...RIFF].forEach((ch, s) => power5(beatT(b + i, s / 4), c, ch === 'P' ? 0.2 : 0.1, ch === 'P' ? 1 : 0.6, ch === 'm')));
    });
    lead5(b0, motifs(PX, [null, RH5.motif]), saw, PX);   // the motif answers the riff every other bar
    lead5(b0 + 8, MEL_U, saw);
  }
  // ---- phase VI, THE KNIGHT: the full theme twice with brass, choir and timpani; the second time in harmony with the choir on the melody ----
  { const b0 = B('knight');
    [0, 1].forEach(h => { const b = b0 + 8 * h;
      crash(beatT(b, 0), 1.1); drums5(b, 8, GR5.knight); bass5(b, PROG_U, 'r--.r-o.r--.r-o.'); secArp(b, PROG_U, 0, 0.5);
      PROG_U.forEach((c, i) => { const t = beatT(b + i, 0); choir5(t, c, BAR, 1.1); brass5(t, CH[c], BAR - 0.1, 1.2); timp5(t, c, 0.7); });
      lead5(b, MEL_U, hero5(h, h ? 1.3 : 0));
    });
  }
  // ---- last stand: the theme at full force over double-time drums ----
  { const b = B('laststand');
    crash(beatT(b, 0), 1.2); crash(beatT(b + 4, 0), 0.8); drums5(b, 8, GR5.last); bass5(b, PROG_U, 'rorororororororo'); secArp(b, PROG_U, 0, 0.7);
    PROG_U.forEach((c, i) => { const t = beatT(b + i, 0); choir5(t, c, BAR, 1.3); brass5(t, CH[c], BAR - 0.1, 1.0); timp5(t, c, 0.8); for (let s = 0; s < 16; s += 2) power5(beatT(b + i, s / 4), c, 0.12, 0.6, true); });
    lead5(b, MEL_U, hero5(1, 1.2));
  }
  // ---- victory: the motif turned major in a G major fanfare (bVI-bVII-I), then a music box plays the theme in G and fades ----
  { const b0 = B('victory5'), P = ['G', 'Em', 'C', 'D', 'Eb', 'F', 'G'];
    const FAN = [[0, 79, 1], [1, 83, .5], [1.5, 86, .5], [2, 88, 1.5], [3.5, 86, .5], [4, 84, 1], [5, 83, 1], [6, 79, 2], [8, 76, 1], [9, 79, .5], [9.5, 84, .5], [10, 86, 1.5], [11.5, 84, .5], [12, 83, 1], [13, 81, 1], [14, 78, 2],
      [16, 75, 1], [17, 79, .5], [17.5, 82, .5], [18, 84, 1.5], [19.5, 82, .5], [20, 77, 1], [21, 81, .5], [21.5, 84, .5], [22, 86, 1.5], [23.5, 84, .5], [24, 86, 4]];
    P.forEach((c, i) => { const t = beatT(b0 + i, 0); brass5(t, CH[c].map(m => m + 12), BAR - 0.1, 1.3); choir5(t, c, BAR, 1.1); timp5(t, c, 0.8); nv(t, oct5(CH[c][0], 36), BAR * 0.9, INS5.bass, { vol: 0.14, d: 0.4, lpEnv: 2, r: 0.2 }); });
    drums5(b0, 6, GR5.fan); crash(beatT(b0, 0), 1); crash(beatT(b0 + 6, 0), 1.2); kick(beatT(b0 + 6, 0), 1);
    lead5(b0, FAN, hero5(1, 1.1), P);
    const gmaj = m => { const n = m + 3; return n + ([10, 3, 5].includes(n % 12) ? 1 : 0); }, m0 = beatT(b0 + 7, 0);   // E minor theme -> G major
    MEL_U.filter(n => n[0] < 16).forEach(([b, m, l]) => { const t = m0 + b * BEAT, v = 1 - (t - m0) / 16; bell(t, mtof(gmaj(m) + 12), 1.4, { vol: 0.13 * v, ratio: 3.01, index: 1.1, rev: 0.5, pan: 0.15 }); bell(t, mtof(gmaj(m)), 1.6, { vol: 0.08 * v, ratio: 2, index: 0.8, rev: 0.5, pan: -0.15 }); });
    ['G', 'Em', 'C', 'D'].forEach((c, i) => pad(m0 + i * BAR, CH[c], BAR, 1.3 - i * 0.2));
    [67, 71, 74, 79].forEach((m, i) => bell(m0 + 8 + i * 0.15, mtof(m + 12), 2.4, { vol: 0.07, ratio: 3.01, index: 1, rev: 0.5, pan: i % 2 ? 0.2 : -0.2 }));
    pad(m0 + 8, CH.G, 2.4, 0.8);
  }
}

// renders the score segment by segment in <= 10 s chunks and normalizes it like prerenderMusic(); a loop's tails past its end
// wrap around to its start, so every loop is seamless, and a one-shot's are dropped (the game cuts it at its end anyway)
async function prerenderMusic5() {
  const CL = 10, TAIL = 7, total = Math.ceil(SR * MUSIC5_LEN), oL = new Float32Array(total), oR = new Float32Array(total);
  LA.prog5 = 0;
  for (const [a, e, loop] of Object.values(SEG5)) for (let c0 = a; c0 < e; c0 += CL) {
    CH0 = c0; CH1 = Math.min(c0 + CL, e); STEM = '*'; LIVE = false;   // '*': tubular() and the other sfx-bus primitives play in this score too
    const len = Math.ceil(SR * (CH1 - c0 + TAIL)), ac = AC = new OfflineAudioContext(2, len, SR); BUS = {};
    NOISE = AC.createBuffer(1, SR * 2, SR);
    { const d = NOISE.getChannelData(0), r = mulberry32(3); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
    PW = { p125: pulseWave(0.125), p25: pulseWave(0.25), p50: pulseWave(0.5) };
    const master = AC.createGain(); master.gain.value = 0.75; master.connect(AC.destination);
    BUS.rev = AC.createConvolver(); BUS.rev.buffer = makeIR(2.6, 3.2);
    const rg = AC.createGain(); rg.gain.value = 0.32; BUS.rev.connect(rg); rg.connect(master);
    BUS.music = AC.createGain(); BUS.music.connect(master); BUS.sfx = BUS.music;
    scoreMusic5();
    const buf = await ac.startRendering(), A = buf.getChannelData(0), Bc = buf.getChannelData(1), off = Math.round(c0 * SR), ia = Math.round(a * SR), ie = Math.round(e * SR);
    for (let i = 0; i < len; i++) { let k = off + i; if (k >= ie) { if (!loop) break; k -= ie - ia; } oL[k] += A[i]; oR[k] += Bc[i]; }
    LA.prog5 = CH1 / MUSIC5_LEN;
  }
  STEM = 'music';
  const mags = new Float32Array(Math.floor(total / 32));
  for (let j = 0; j < mags.length; j++) mags[j] = Math.abs(oL[j * 32]);
  const q = Float32Array.from(mags).sort()[Math.floor(mags.length * 0.999)] || 1, g = 0.42 / q;
  for (let i = 0; i < total; i++) { oL[i] *= g; oR[i] *= g; }
  LA.music5L = oL; LA.music5R = oR; LA.prog5 = 1;
}
