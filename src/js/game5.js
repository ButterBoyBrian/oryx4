'use strict';
// ================= Oryx the Mad God V: THE USURPER =================
// Four times the heroes ended him, so he took the heroes. He sends them at you one party at a time, a party for each
// weapon: the Staff (Wizard, Necromancer, Mystic), the Wand (Priest, Sorcerer, Summoner), the Bow (Archer, Huntress,
// Bard), the Dagger (Rogue, Assassin, Trickster) and the Sword (Warrior, Paladin). Then he takes the field himself, as the
// Knight. In a party every hero has its own health and keeps up its own fire as it strafes, dashes and blinks around you;
// they take turns with signature moves named for their items, every so often the whole party breaks off (in turn to play
// one great pattern together from their marks, and to hunt you down), and each one that falls makes the rest press harder. The Colosseum and his Last Stand are survival phases, like Oryx
// IV's finale: a clock you outlast, which every hit you land winds down faster.
// Bullets here use raw speeds (tiles/s) and lives (s); V5.rate scales how often every pattern fires.
const FORMS5 = [
  { ai: 'staff', w: 0, id: 'wizard', name: 'THE CONCLAVE', party: ['wizard', 'necro', 'mystic'] },
  { ai: 'wand', w: 1, id: 'priest', name: 'THE CHOIR', party: ['priest', 'sorc', 'summoner'], tr: 'weapon' },
  { ai: 'bow', w: 2, id: 'archer', name: 'THE HUNT', party: ['archer', 'huntress', 'bard'], tr: 'weapon' },
  { ai: 'dagger', w: 3, id: 'rogue', name: 'THE NIGHT', party: ['rogue', 'assassin', 'trickster'], tr: 'weapon' },
  { ai: 'sword', w: 4, id: 'warrior', name: 'THE COLOSSEUM', party: ['warrior', 'paladin'], tr: 'weapon', surv: { base: 46, K: 19000 } },
  { ai: 'knight1', w: 5, id: 'knight', name: 'THE KNIGHT', hp: 300000, tr: 'weapon', stance: 'SHIELD CHARGE' },
  { ai: 'knight2', w: 5, id: 'knight', name: 'THE KNIGHT', hp: 300000, tr: 'stance', stance: 'BLADESTORM' },
  { ai: 'knight3', w: 5, id: 'knight', name: 'THE KNIGHT', tr: 'last', stance: 'LAST STAND', surv: { base: 60, K: 20000, cap: 20 } },   // 60 s if you never hit him, never less than 40
];
// the stolen heroes: health (the Colosseum's champions have none: they are outlasted), name, and the shot of their last volley
const HERO5 = {
  wizard: { hp: 265000, name: 'THE WIZARD', k: 'sbolt' }, necro: { hp: 250000, name: 'THE NECROMANCER', k: 'soul' }, mystic: { hp: 250000, name: 'THE MYSTIC', k: 'ice' },
  priest: { hp: 165000, name: 'THE PRIEST', k: 'holy' }, sorc: { hp: 170000, name: 'THE SORCERER', k: 'spark' }, summoner: { hp: 145000, name: 'THE SUMMONER', k: 'mshard' },
  archer: { hp: 230000, name: 'THE ARCHER', k: 'arrow' }, huntress: { hp: 220000, name: 'THE HUNTRESS', k: 'arrow' }, bard: { hp: 205000, name: 'THE BARD', k: 'note' },
  rogue: { hp: 220000, name: 'THE ROGUE', k: 'dagger' }, assassin: { hp: 230000, name: 'THE ASSASSIN', k: 'vdagger' }, trickster: { hp: 220000, name: 'THE TRICKSTER', k: 'pdagger' },
  warrior: { hp: 0, name: 'THE WARRIOR', k: 'blade' }, paladin: { hp: 0, name: 'THE PALADIN', k: 'holy' },
};
const WEAPONS5 = ['THE STAFF', 'THE WAND', 'THE BOW', 'THE DAGGER', 'THE SWORD', 'THE KNIGHT'];
const MUSIC5_KEYS = ['staff', 'wand', 'bow', 'dagger', 'sword', 'knight'];
const PRACT5 = [0, 1, 2, 3, 4, 5, 7];   // practice: each weapon's stage, and the Knight's Last Stand
const STAGE_HP5 = FORMS5.map(F => F.surv ? 0 : F.party ? F.party.reduce((a, id) => a + HERO5[id].hp, 0) : F.hp);
const MAXHP5 = STAGE_HP5.reduce((a, v) => a + v, 0);
const FLOOR5 = (() => { let c = 0; return STAGE_HP5.map((v, i) => { c += v; return i === FORMS5.length - 1 ? 0 : 1 - c / MAXHP5; }); })();
const SPLITS5 = ['Staff', 'Wand', 'Bow', 'Dagger', 'Sword', 'Knight'].map(name => ({ name, T: Infinity, pb: null }));
const PHASES5 = WEAPONS5.map((name, i) => ({ num: ['I', 'II', 'III', 'IV', 'V', 'VI'][i], name }));
const TRANS5 = { stance: 2.0, weapon: 3.2, last: 3.0 };
const HOME5 = { x: 0, y: -1.4 }, WP_ORB5 = 2.2, WP_R5 = 1.45, HERO5_R = 1.45, HERO5_BODY = 1.45;   // (hitboxes a little larger than the drawn soul and heroes)
// bullet kinds: hitbox radius, base damage (x TUNE.bulletMul, the same range as Oryx IV), glow colour, sprite scale and orientation
Object.assign(BK, {
  sbolt: { r: 0.16, dmg: 100, glow: 'p', sc: 4.2, orient: 1 }, nova: { r: 0.2, dmg: 100, glow: 'g', sc: 5 }, shur: { r: 0.18, dmg: 110, glow: 'g', sc: 4, spin: 9 },
  nbolt: { r: 0.16, dmg: 100, glow: 'e', sc: 4.2, orient: 1 }, skull: { r: 0.18, dmg: 110, glow: 'e', sc: 4.4 }, soul: { r: 0.18, dmg: 100, glow: 'e', sc: 4.4, orient: 1 },
  ice: { r: 0.15, dmg: 100, glow: 'c', sc: 4.4, orient: 1 }, frost: { r: 0.19, dmg: 100, glow: 'c', sc: 4.8 },
  holy: { r: 0.2, dmg: 100, glow: 'w', sc: 4.8 }, holyB: { r: 0.22, dmg: 150, glow: 'w', sc: 5, radial: 1, gs: 80 }, wbolt: { r: 0.14, dmg: 110, glow: 'w', sc: 4.4, orient: 1 },
  spark: { r: 0.15, dmg: 100, glow: 'b', sc: 4.5, spin: 12 }, mshard: { r: 0.16, dmg: 100, glow: 'v', sc: 4.4, orient: 1 },
  arrow: { r: 0.15, dmg: 120, glow: 'y', sc: 4.2, orient: 1, ga: 0.3 }, bigArrow: { r: 0.3, dmg: 170, glow: 'r', sc: 5, orient: 1, gs: 110 },
  trapShot: { r: 0.19, dmg: 110, glow: 'o', sc: 4.8 }, note: { r: 0.18, dmg: 100, glow: 'm', sc: 4.6 }, note2: { r: 0.18, dmg: 100, glow: 'c', sc: 4.6 },
  dagger: { r: 0.14, dmg: 120, glow: 'v', sc: 4.2, orient: 1, ga: 0.35 }, vdagger: { r: 0.14, dmg: 120, glow: 'e', sc: 4.2, orient: 1, ga: 0.35 },
  bubble: { r: 0.24, dmg: 90, glow: 'e', sc: 4.6, ga: 0.35 }, pdagger: { r: 0.14, dmg: 120, glow: 'w', sc: 4.2, orient: 1, ga: 0.35 }, prism: { r: 0.17, dmg: 100, glow: 'w', sc: 4.4, spin: 5 },
  blade: { r: 0.18, dmg: 150, glow: 'r', sc: 4.6, orient: 1 }, hcross: { r: 0.18, dmg: 110, glow: 'g', sc: 4.4, spin: 3 },
  kblade: { r: 0.24, dmg: 160, glow: 'w', sc: 5, radial: 1, gs: 80 }, kwall: { r: 0.2, dmg: 140, glow: 'g', sc: 4.6 }, fang: { r: 0.18, dmg: 110, glow: 'r', sc: 4.2, spin: 4 },
  link: { r: 0.15, dmg: 90, glow: 'p', sc: 3.8, orient: 1, ga: 0.35 }, comet: { r: 0.2, dmg: 120, glow: 'g', sc: 4.6, spin: 10, trail: 1 },
  lance: { r: 0.32, dmg: 160, glow: 'w', sc: 7, gs: 130, trail: 1 }, mote: { r: 0.16, dmg: 90, glow: 'w', sc: 3.4, ga: 0.3 },
  bone: { r: 0.16, dmg: 100, glow: 'w', sc: 4.2, spin: 8, ga: 0.25 }, venom: { r: 0.2, dmg: 90, glow: 'e', sc: 4.2, ga: 0.3 },
});
const V5 = { rate: 1.33 };   // (tuned with the test bots in bot.js)
const per5 = p => p / V5.rate;   // a pattern period, scaled by V5.rate

// ---------- boss selection (the title screen) ----------
const BOSS_CFG = { 4: { maxhp: MAXHP, floor: PHASE_FLOOR, splits: SPLITS, phases: PHASES, name: BOSS },
  5: { maxhp: MAXHP5, floor: FLOOR5, splits: SPLITS5, phases: PHASES5, name: 'Oryx the Mad God V' } };
function selectBoss(n) { const c = BOSS_CFG[n]; BOSS_N = n; MAXHP = c.maxhp; PHASE_FLOOR = c.floor; SPLITS = c.splits; PHASES = c.phases; BOSS = c.name; setDifficulty(CUR_DIFF); }
// Oryx V's own tweaks to a difficulty: Easy's Last Stand is on a shorter clock (45 s, never less than 30)
const DIFF5 = { easy: { last: { base: 45, cap: 15 } } };
const surv5 = F => F.surv ? Object.assign({ bonus: 0 }, F.surv, F.ai === 'knight3' && diffOf(CUR_DIFF).last) : null;   // a stage's survival clock
const diffOf = d => BOSS_N === 5 ? Object.assign({}, DIFFS[d], DIFF5[d]) : DIFFS[d];

// ---------- state ----------
const practiceBase5 = p => p && PRACT5[p - 1] ? (1 - FLOOR5[PRACT5[p - 1] - 1]) * MAXHP5 : 0;
function initS5(practice) {
  TL.rw = TL.rwA = TL.rwB = TL.ts = TL.tsA = TL.tsB = NEG;   // no rewind or time stop in this fight (shared code reads these)
  const i0 = practice ? PRACT5[practice - 1] : 0, T = TL.land + 1.6, F = FORMS5[i0];
  S.f5 = { i: i0, mT: -9, T, from: -1, trig: -1, W0: TL.land, log: [{ i: i0, mT: -9, T }], a0: S.rng() * TAU, st: {}, sv: surv5(F), turn: -1 };
  S.mv5 = []; S.mobs = []; S.decoys = []; S.lanes5 = []; S.traps = []; S.heroes = []; S.zones5 = [];
  S.bodyR = 2.9; S.bossR = 2.8;
  if (F.party) spawnParty5(TL.land + 0.4, T);
  if (F.ai === 'knight2' || F.ai === 'knight3') S.mv5.push({ T0: 0, T1: 0, x1: 0, y1: 0 });
}
function formOf5(T) { const L = S.f5.log; for (let k = L.length - 1; k > 0; k--) if (T >= L[k].mT) return L[k].i; return L[0].i; }
const knight5 = () => FORMS5[S.f5.i].w === 5;   // is he on the field himself? (the parties have no weak point)
const survLeft5 = T => { const f = S.f5; return f.sv.base - Math.max(0, T - f.T) - Math.min(f.sv.bonus, f.sv.cap ?? Infinity); };   // (cap: the most your hits can take off the clock)
function vuln5(T) {
  if (T < TL.land + 0.5 || T >= T_KILL || !knight5()) return false;
  const f = S.f5; return !(T >= f.mT && T < f.T);
}
const heroVuln5 = (h, T) => T >= h.rise + 0.9 && !(h.prot > T) && !(h.cloak > T) && !S.mobs.some(m => m.owner === h && m.must && m.deadT === Infinity);
function targets5(T, L) {
  const fast = (vx, vy) => Math.hypot(vx, vy) < 25;   // (a blink is not motion to lead)
  for (const h of S.heroes) if (h.deadT === Infinity && T >= h.rise + 0.6 && !(h.cloak > T)) L.push({ x: h.x, y: h.y - h.z - 0.3, r: HERO5_R, hero: h, vx: fast(h.vx, h.vy) ? h.vx : 0, vy: fast(h.vx, h.vy) ? h.vy : 0 });
  for (const m of S.mobs) if (m.hp && m.deadT === Infinity && T >= m.T + 0.4) L.push({ x: m.x, y: m.y, r: m.r * 1.2, sent: m, mob: 1, vx: fast(m.vx || 0, m.vy || 0) ? m.vx || 0 : 0, vy: fast(m.vx || 0, m.vy || 0) ? m.vy || 0 : 0 });
  for (const d of S.decoys) if (T >= d.T && T < d.until) L.push({ x: d.x, y: d.y - 0.3, r: 1.2, body: true, decoy: 1 });
}
// a shot landing on a hero (or, in a survival phase, on anyone): returns the damage it does to the fight's health, or null
// to let the shared code handle it (the Knight's soul, mirrors, minions, armour)
function hit5(h, T) {
  const z = h.tg.hero, f = S.f5, sv = f.sv && T >= f.T && T < T_KILL;
  if (!z && !(h.tg.wp && sv)) return null;
  if (z && z.deadT !== Infinity) return 0;
  const d = h.dmg * TUNE.wpMul, star = h.kind !== 'slash';
  const land = (dd, extra) => {
    S.p.landed++; if (!star) S.p.wpHits++; else { S.p.mp = Math.min(P_MAXMP, S.p.mp + 33); S.fx.push({ T, type: 'starHit', x: h.x, y: h.y }); }
    S.hits.push(Object.assign({ wt: h.t, x: h.x, y: h.y, dmg: dd, crit: h.crit, kind: h.kind, wp: true }, extra));
    S.ev.push({ T, type: star ? 'starHit' : 'hit', crit: h.crit });
  };
  if (sv) { f.sv.bonus += d / f.sv.K; land(d, { surv: true }); return 0; }
  if (!heroVuln5(z, T) || !(z.hp > 0)) { S.hits.push({ wt: h.t, x: h.x, y: h.y, dmg: 0, armor: true, kind: h.kind }); S.ev.push({ T, type: 'dink', heavy: star }); return 0; }   // (the Colosseum's champions only ever feed its clock)
  const dd = Math.min(d, z.hp - z.dmg); z.dmg += dd; land(dd, { hero: z.id });
  if (z.dmg >= z.hp - 0.5) heroDie5(z, T);
  return dd;
}

// ---------- the parties ----------
function spawnParty5(T0, T1) {
  const F = FORMS5[S.f5.i];
  S.heroes = F.party.map((id, j) => ({ id, j, x: 0, y: 0, z: 0, vx: 0, vy: 0, mvx: 0, mvy: 0, hp: HERO5[id].hp, dmg: 0, deadT: Infinity, rise: T0 + j * 0.3, T: T1, go: null, hold: 0,
    mode: null, planN: j, dir: j % 2 ? 1 : -1, tr: [], sig: null, sigB: -9, sigN: 0, sg: {}, st: {}, bB: T1 + 0.5 + j * 0.37, prot: -9, cloak: -9, atkT: -9, atkA: 0 }));
  for (const h of S.heroes) {   // each one leaps in from beyond the rim and lands on its mark
    const [x, y] = heroGoal5(h, T1), a = Math.atan2(y, x) + (h.j - 1) * 0.6;
    Object.assign(h, { x: Math.cos(a) * 17, y: Math.sin(a) * 17, go: { T0: h.rise, T1: h.rise + 0.9, x0: Math.cos(a) * 17, y0: Math.sin(a) * 17, x1: x, y1: y, hop: 6, land: 1.1 } });
    S.fx.push({ T: h.rise + 0.9, type: 'rise', x, y });
  }
  S.ev.push({ T: T0, type: 'rise' });
}
function heroDie5(h, T) {
  h.deadT = T;
  S.fx.push({ T, type: 'heroDie', x: h.x, y: h.y - h.z, id: h.id }); S.ev.push({ T, type: 'heroDie' });
  S.parts.push({ t: S.wt, x: h.x, y: h.y - 0.9, n: 60, seed: S.parts.length * 11 + 7, col: 'g', spd: 7, life: 1.3 });
  S.fx.push({ T, type: 'banner', text: HERO5[h.id].name + ' FALLS', y: 176, size: 26, col: '#ffe07a' });
  for (const m of S.mobs) if (m.owner === h && m.deadT === Infinity) { m.deadT = T; m.gone = 1; S.fx.push({ T, type: 'boom', x: m.x, y: m.y, s: 0.5 }); }
  if (h.id === 'trickster') { for (const d of S.decoys) S.fx.push({ T, type: 'prismPop', x: d.x, y: d.y }); S.decoys = []; }
  S.traps = S.traps.filter(q => q.owner !== h || q.snapT !== Infinity);
  const live = S.heroes.filter(q => q.deadT === Infinity);
  if (!live.length) { trigger5(T); return; }
  ring5(T, h.x, h.y, 14, 2.6, HERO5[h.id].k, S.rng() * TAU, { r0: 1.0, life: 4 });   // a last volley as it falls
  for (const q of live) q.bB = T + 0.6;   // the rest press harder (their fire restarts at the faster rate)
  const L = FALL5[FORMS5[S.f5.i].ai][S.heroes.length - live.length - 1]; if (L) say(T + 0.4, 'boss', L);
}
// a hero's place in its party's formation ([x, y, top speed]): where it lands as the party arrives, the Conclave's turning
// triangle and the Colosseum's champions
function heroGoal5(h, T) {
  const f = S.f5, L = S.heroes.filter(q => q.deadT === Infinity), n = Math.max(1, L.length), j = Math.max(0, L.indexOf(h)), p = S.p, id = h.id;
  switch (FORMS5[f.i].ai) {
    case 'staff': {   // the Conclave circles the Tower: a triangle that turns one way, then the other
      const a = f.a0 + 1.6 * Math.sin(0.07 * (T - f.T)) + j * TAU / n, R = n === 1 ? 3.2 : n === 2 ? 5.6 : 6.2;
      return [Math.cos(a) * R, Math.sin(a) * R * 0.9 - 0.4, 2.2];
    }
    case 'wand': {   // the Priest keeps the pulpit; the other two drift along the walls on either side
      if (id === 'priest') return [1.6 * Math.sin(0.23 * T), -2.4 + 0.6 * Math.sin(0.31 * T), 1.6];
      const k = L.filter(q => q.id !== 'priest').indexOf(h), a = Math.PI / 2 + (k ? 1 : -1) * (1.75 + 0.45 * Math.sin(0.09 * T));
      return [Math.cos(a) * 7.4, Math.sin(a) * 7.4 * 0.95, 2.4];
    }
    case 'bow': {
      if (id === 'archer') {   // a sniper's perch far across from you, chosen again every few seconds
        if (!(T < h.st.perchT)) { const a = Math.atan2(p.y, p.x) + Math.PI + (S.rng() - 0.5) * 1.6; h.st.perch = intoA5(Math.cos(a) * 9.4, Math.sin(a) * 9.4, 1.9); h.st.perchT = T + 4.5; }
        return [h.st.perch[0], h.st.perch[1], 3.4];
      }
      if (id === 'huntress') { const a = Math.atan2(h.y - p.y, h.x - p.x) + 0.25, [x, y] = intoA5(p.x + Math.cos(a) * 6.2, p.y + Math.sin(a) * 6.2, 1.9); return [x, y, 2.6]; }   // she stalks you
      const ar = L.find(q => q.id === 'archer'), a = ar ? Math.atan2(ar.y, ar.x) + 2.1 : 0.3 * T, [x, y] = intoA5(Math.cos(a) * 9, Math.sin(a) * 9, 1.9);   // the Bard plays from the edge
      return [x, y, 2.0];
    }
    case 'dagger': {
      if (id === 'rogue') { const a = Math.atan2(h.y - p.y, h.x - p.x) - 0.35, [x, y] = intoA5(p.x + Math.cos(a) * 6.5, p.y + Math.sin(a) * 6.5, 1.8); return [x, y, 3.8]; }   // circling in
      if (id === 'assassin') { const a = Math.atan2(p.y, p.x) + Math.PI + 0.6 * Math.sin(0.2 * T), [x, y] = intoA5(Math.cos(a) * 8.5, Math.sin(a) * 8.5, 1.8); return [x, y, 3.2]; }   // across the roof from you
      const [x, y] = intoA5(7 * Math.sin(0.21 * T + 1), 6 * Math.sin(0.33 * T), 1.8); return [x, y, 3.0];   // the Trickster wanders
    }
    default:   // the Colosseum: the Paladin keeps near the middle; the Warrior only moves when he leaps or walks you down
      if (id === 'paladin') return [3.2 * Math.cos(0.18 * T), -1.5 + 2.2 * Math.sin(0.18 * T), 1.4];
      if (h.walk) { const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy) || 1; return d > 4.2 ? [h.x + dx / d * 3, h.y + dy / d * 3, 3.4] : [h.x, h.y, 0]; }
      return [h.x, h.y, 0];
  }
}
// ---------- how heroes move ----------
// A hero is always in a stance and picks its next one when the current one ends: strafe (circle you), chase (run you
// down), kite (hold its range), point (run to a spot), formation (its party's slot) or hold (stand and cast). Dashes,
// leaps and blinks ride on top as scripted moves (h.go). Heroes have momentum: they accelerate, skid and lean.
function stanceGoal5(h, T) {
  const m = h.mode, p = S.p, dx = h.x - p.x, dy = h.y - p.y, d = Math.hypot(dx, dy) || 1;
  if (h.hold > T || !m) return [h.x, h.y, 0];
  if (m.kind === 'strafe') { const a = Math.atan2(dy, dx) + m.dir * Math.min(1.1, m.spd / m.r); return [p.x + Math.cos(a) * m.r, p.y + Math.sin(a) * m.r, m.spd]; }
  if (m.kind === 'chase') return d > m.stop ? [p.x, p.y, m.spd] : [h.x, h.y, 0];
  if (m.kind === 'kite') return [p.x + dx / d * m.r, p.y + dy / d * m.r, m.spd];
  if (m.kind === 'point') return [m.x, m.y, m.spd];
  if (m.kind === 'formation') return heroGoal5(h, T);
  return [h.x, h.y, 0];
}
function nextStance5(h, T) {
  if (h.hold > T) return { kind: 'hold', T1: h.hold, dur: 0 };
  const ch = S.f5.chase, s = (ch && T < ch.end && !ch.rite ? CHASE5[h.id].move : PLAN5[h.id])(h, T, h.planN++);
  return s.T1 ? s : Object.assign({ T1: T + s.dur * (0.85 + 0.3 * S.rng()) }, s);
}
function moveHero5(h, T) {
  const dt = 1 / FPS, x0 = h.x, y0 = h.y, g = h.go;
  if (g && T < g.T1) { if (T >= g.T0) { const u = (T - g.T0) / (g.T1 - g.T0), k = g.ease ? smooth(u) : u; h.x = lerp(g.x0, g.x1, k); h.y = lerp(g.y0, g.y1, k); h.z = g.hop ? g.hop * Math.sin(Math.PI * u) : 0; } h.mvx = h.mvy = 0; }
  else {
    if (g) { h.x = g.x1; h.y = g.y1; h.z = 0; h.go = null; if (g.land) { S.fx.push({ T, type: 'boom', x: h.x, y: h.y, s: g.land }); h.landT = T; } }
    if (T >= h.T && !(h.mode && T < h.mode.T1)) h.mode = nextStance5(h, T);   // (a new stance may begin with a dash or a blink)
    if (!h.go) {
      const [tx, ty, spd] = stanceGoal5(h, T), ex = tx - h.x, ey = ty - h.y, e = Math.hypot(ex, ey), v = e > 1e-3 ? Math.min(spd, e * 3) : 0, k = 1 - Math.exp(-dt / 0.16);
      h.mvx += ((v ? ex / e * v : 0) - h.mvx) * k; h.mvy += ((v ? ey / e * v : 0) - h.mvy) * k;
      h.x += h.mvx * dt; h.y += h.mvy * dt;
      for (const q of S.heroes) if (q !== h && q.deadT === Infinity && T >= q.rise) { const ex = h.x - q.x, ey = h.y - q.y, e = Math.hypot(ex, ey) || 1e-3; if (e < 4.6) { h.x += ex / e * (4.6 - e) * 3 * dt; h.y += ey / e * (4.6 - e) * 3 * dt; } }   // they keep apart
      [h.x, h.y] = intoA5(h.x, h.y, 1.6);
    }
  }
  h.vx = (h.x - x0) / dt; h.vy = (h.y - y0) / dt;
  h.tr.unshift([h.x, h.y, h.z]); if (h.tr.length > 9) h.tr.length = 9;   // (where it has just been: its afterimages)
}
// a point r from you at the hero's bearing turned by da
function spot5(h, r, da) { const p = S.p, a = Math.atan2(h.y - p.y, h.x - p.x) + da; return intoA5(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1.8); }
// a hero runs straight to (x1, y1) at o.spd once its line has shown for o.tele s. o.k leaves a biting trail (for o.trail s),
// o.wall carries a wall of shots ahead of it, o.ring bursts where it stops
function run5(h, t, x1, y1, o) {   // (h: a hero, or one of the Trickster's copies)
  [x1, y1] = intoA5(x1, y1, 1.6);
  const x0 = h.x, y0 = h.y, a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0), tl = o.tele ?? 0.5, dur = Math.max(0.05, L / o.spd), te = t + tl;
  S.tele.push({ kind: 'line', t0: wtAt(t), t1: wtAt(te), x: x0, y: y0, a, w: o.w ?? (o.wall ? 1.25 : 0.45), len: L, col: o.col });   // (a wall is 2 tiles wide: the band covers it)
  h.go = { T0: te, T1: te + dur, x0, y0, x1, y1, dash: 1, land: o.land ?? 0.5 };
  if (o.k) for (let s = 1.2; s < L; s += o.gap ?? 0.6) { const dl = tl + s / o.spd; e5(t, { cx: x0 + Math.cos(a) * s, cy: y0 + Math.sin(a) * s, r0: 0, vr: 0, th: a, k: o.k, dl, rv: t + dl, tg: 1, hid: 1, cont: 1, life: o.trail ?? 0.5 }); }
  if (o.wall) for (let j = -2; j <= 2; j++) e5(t, { cx: x0 + Math.cos(a) * 1.5 - Math.sin(a) * j * 0.5, cy: y0 + Math.sin(a) * 1.5 + Math.cos(a) * j * 0.5, r0: 0, vr: o.spd, th: a, k: o.wall, dl: tl, rv: te, tg: 1, cont: 1, life: dur });
  if (o.ring) { const g = S.rng(); ring5(t, x1, y1, o.ring.n, o.ring.spd, o.ring.k, g * TAU, { r0: 1.0, tele: tl + dur, hid: 1, life: 3, gaps: [[g, 3 / o.ring.n], [g + 0.5, 3 / o.ring.n]] }); }
  h.atkT = te + dur; h.atkA = a;
  S.fx.push({ T: te, type: 'dash', h, a, T1: te + dur, x0, y0, x1, y1, col: o.col || 'w' }); S.ev.push({ T: te, type: 'lunge' });
  return te + dur;
}
// a dash along a line through where you stand, on past you
const dash5 = (h, t, o) => { const p = S.p, a = Math.atan2(p.y - h.y, p.x - h.x), L = Math.hypot(p.x - h.x, p.y - h.y) + (o.over ?? 3); return run5(h, t, h.x + Math.cos(a) * L, h.y + Math.sin(a) * L, o); };
// a hero vanishes and reappears at (x, y) delay s later (a flash marks both ends)
function blink5(h, t, x, y, col, delay = 0.3) {
  [x, y] = intoA5(x, y, 1.8);
  h.go = { T0: t + delay, T1: t + delay, x0: h.x, y0: h.y, x1: x, y1: y };
  S.fx.push({ T: t, type: 'warp', x, y, col }); S.fx.push({ T: t + delay, type: 'warp', x: h.x, y: h.y, col, out: 1 }); S.ev.push({ T: t + delay, type: 'blink5' });
}
// heroes are solid (no hiding inside them, where their shots begin), except in mid-leap or mid-blink
function solid5(p, T) {
  for (const h of S.heroes) {
    if (h.deadT !== Infinity || T < h.rise + 0.6 || (h.go && T < h.go.T1 && T >= h.go.T0) || h.cloak > T) continue;
    const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy);
    if (d < HERO5_BODY) { const u = d > 1e-6 ? HERO5_BODY / d : 0; p.x = h.x + (u ? dx * u : 0); p.y = h.y + (u ? dy * u : HERO5_BODY); }
  }
}
// every tick of a party: each hero keeps up its basic attack as it moves; the heroes take turns with their signatures (one
// at a time, and the caster stands its ground for it), and every so often the whole party breaks off: in turn for a rite
// (they leap to their marks and play one great pattern together) and a chase (they hunt you down)
const CHASE_NAME5 = { staff: 'ARCANE PURSUIT', wand: 'THE CRUSADE', bow: 'THE HUNT', dagger: 'NO ESCAPE' };
function party5(T0, T1) {
  const f = S.f5, H = S.heroes, live = H.filter(h => h.deadT === Infinity), RT = RITE5[FORMS5[f.i].ai];
  for (const h of live) moveHero5(h, T1);
  if (T1 < f.T || !live.length) return;
  const dead = H.length - live.length, ch = f.chase || (f.chase = { next: f.T + 12, C: -9, end: -9, n: 0 });
  const inSig = h => h.sig && T1 >= h.sigB - 0.1 && T1 < h.sigB + h.sig.dur;
  if (T1 >= ch.next && !live.some(inSig)) {   // THE RITE or THE CHASE (once no signature is running)
    const rite = ch.n++ % 2 === 0;
    Object.assign(ch, { C: T1, rite, end: T1 + (rite ? RT.dur : 4.5), next: T1 + 15, st: {} });
    live.forEach((h, j) => {
      h.mode = null; h.hold = 0;
      if (rite) { if (!j) crumble5(T1); const [x, y] = intoA5(...RT.spot(h, j, live.length, ch.st), 1.8); h.go = { T0: T1, T1: T1 + 0.8, x0: h.x, y0: h.y, x1: x, y1: y, hop: 3, land: 0.8 }; h.hold = ch.end; }
      else if (CHASE5[h.id].start) { SRC5 = h.id + '.chase'; CHASE5[h.id].start(h, T1); }
    });
    S.fx.push({ T: T1, type: 'chase', text: rite ? RT.name : CHASE_NAME5[FORMS5[f.i].ai], rite }); S.ev.push({ T: T1, type: 'chase' });
  }
  const brk = T1 < ch.end, chasing = brk && !ch.rite;
  if (f.nextSig === undefined) f.nextSig = f.T + 1.0;
  if (T1 < ch.end + 0.6) f.nextSig = Math.max(f.nextSig, ch.end + 0.6);
  if (T1 >= f.nextSig) {
    let h = null;
    for (let k = 1; k <= H.length && !h; k++) { const c = H[(f.turn + k + H.length) % H.length]; if (c.deadT === Infinity && !inSig(c)) { h = c; f.turn = c.j; } }
    if (h) { const A = HAI5[h.id], s = A.sigs[h.sigN++ % A.sigs.length]; Object.assign(h, { sig: s, sigB: f.nextSig, sg: {}, mode: null, hold: f.nextSig + s.dur }); item5(h, s.name, f.nextSig); if (s.heavy) crumble5(f.nextSig); f.nextSig += s.dur + SIG_GAP5; }
    else f.nextSig = T1 + 0.2;
  }
  const PF = PARTY5[FORMS5[f.i].ai]; SRC5 = 'party'; if (PF && !(brk && ch.rite)) PF(T0, T1, live);
  if (brk && ch.rite) { SRC5 = 'rite'; RT.fire(T0, T1, ch.C, live, ch.st); }
  for (const h of live) {
    if (T1 < h.T) continue;
    const A = HAI5[h.id], s = h.sig;
    if (s && T1 >= h.sigB && T1 < h.sigB + s.dur) { SRC5 = h.id + '.' + s.name.split(' ')[0].toLowerCase(); s.fn(h, T0, T1, h.sigB); h.atkT = T1; h.atkA = aimA(h.x, h.y); }
    const [per, fn] = A.basic; SRC5 = h.id;
    const far = Math.hypot(S.p.x - h.x, S.p.y - h.y) > 4.3;   // (no point-blank basics: a hero needs a moment of distance to aim)
    for (const [t, k] of ticks(T0, T1, h.bB, Infinity, per5(per) * 1.1 / (1 + 0.3 * dead))) if (far && !(s && t >= h.sigB - 0.3 && t < h.sigB + s.dur) && !(ch.rite && t >= ch.C && t < ch.end)) { fn(h, t, k); h.atkT = t; h.atkA = aimA(h.x, h.y); }
    if (A.tick) A.tick(h, T0, T1);
    if (chasing && CHASE5[h.id].fire) { SRC5 = h.id + '.chase'; CHASE5[h.id].fire(h, T0, T1, ch.C); }
  }
}
// minions crumble when a bullet-heavy set piece begins (a rite, or a signature marked heavy), and none rise until it is over
const heavy5 = T => { const c = S.f5.chase; return !!(c && c.rite && T < c.end + 0.3) || S.heroes.some(h => h.sig && h.sig.heavy && T >= h.sigB - 0.1 && T < h.sigB + h.sig.dur + 0.3); };
function crumble5(T) { for (const m of S.mobs) if (m.deadT === Infinity && m.kind !== 'seal') { m.deadT = T; m.gone = 1; S.fx.push({ T, type: 'boom', x: m.x, y: m.y, s: 0.5 }); } }
// what a whole party does together
const PARTY5 = {
  staff(T0, T1, L) {   // the Conclave's arcane circuit: each caster streams bolts at the next (a triangle of three, a line of two)
    L = L.filter(h => T1 >= h.T); if (L.length < 2) return;
    const pairs = L.length === 2 ? [[L[0], L[1]]] : L.map((h, j) => [h, L[(j + 1) % L.length]]);
    for (const [t, k] of ticks(T0, T1, S.f5.T, Infinity, 0.085)) {
      if (k % 9 >= 5) continue;   // every stream has a gap to slip through
      for (const [a, b] of pairs) { const d = Math.hypot(b.x - a.x, b.y - a.y); if (d > 3.2) e5(t, { cx: a.x, cy: a.y, r0: 1.3, vr: 6.5, th: Math.atan2(b.y - a.y, b.x - a.x), k: 'link', life: (d - 2.7) / 6.5 }); }
    }
  },
};

// ---------- the heroes: a basic attack [period, fn], signatures (named for a hero's item) and extra per-tick behaviour ----------
const HAI5 = {
  // I. THE STAFF
  wizard: {
    basic: [0.55, (h, t) => braid5(t, h.x, h.y, leadA(h.x, h.y, 7.5, 0.7), 7.5, 'sbolt', 0.3, 2.8)],
    sigs: [
      { name: 'STAFF OF ASTRAL KNOWLEDGE', dur: 5.6, heavy: 1, fn(h, T0, T1, B) {   // CONSTELLATION: stars linked in a zig-zag around you; a comet runs the lines and each star bursts as it passes
        for (const [t] of ticks(T0, T1, B - 1e-6, B + 3.3, 1.6)) {
          const R = S.rng, p = S.p, a0 = R() * TAU, pts = [];
          for (let j = 0; j < 6; j++) { const r = j % 2 ? 2.2 : 5.8, a = a0 + j * 2.25; pts.push(intoA5(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 0.8)); }
          path5(t, pts, 12, 'comet', { tele: 1.0, n: 5, gap: 0.035, col: 'p', at: (ta, x, y) => ring5(t, x, y, 11, 3.2, 'nova', R() * TAU, { r0: 0.3, tele: ta - t, hid: 1, life: 3.5 }) });
        }
      } },
      { name: 'ELEMENTAL DETONATION SPELL', dur: 4.2, heavy: 1, fn(h, T0, T1, B) {   // STARFALL: stars land in two spirals closing on where you stood; each bursts into shurikens
        if (once5(T0, T1, B)) Object.assign(h.sg, { x: S.p.x, y: S.p.y, a: S.rng() * TAU, d: S.rng() < 0.5 ? 1 : -1 });
        const g = h.sg; if (g.x === undefined) return;
        for (const [t, k] of ticks(T0, T1, B, B + 2.9, per5(0.12))) { const r = 6.8 * (1 - Math.min(1, k / 24)) + 0.6, a = g.a + g.d * k * 0.7; for (const o of [0, Math.PI]) pillar5(t, g.x + Math.cos(a + o) * r, g.y + Math.sin(a + o) * r, { kind: 'star', tele: 0.85, r: 0.9, dmg: 140, burst: { n: 5, spd: 3.4, k: 'shur', off: a, life: 2.4 } }); }
      } },
    ],
  },
  necro: {
    basic: [1.0, (h, t) => { const a = leadA(h.x, h.y, 5.8, 0.6); for (const o of [-0.16, 0.16]) e5(t, { cx: h.x, cy: h.y, r0: 1.2, vr: 5.8, th: a + o, k: 'nbolt', wa: 0.25, wf: 8, life: 3.4 }); }],
    tick(h, T0, T1) {   // the dead rise to serve: a pair of skeletons every 11 s, four at most
      if (h.st.raise === undefined) h.st.raise = h.T + 3;
      if (T1 < h.st.raise || heavy5(T1)) return;
      h.st.raise = T1 + 11;
      if (S.mobs.filter(m => m.kind === 'skel' && m.deadT === Infinity).length > 2) return;
      const pa = Math.atan2(S.p.y, S.p.x);
      for (const sd of [-1, 1]) { const [x, y] = intoA5(Math.cos(pa + sd * 0.9) * 10.5, Math.sin(pa + sd * 0.9) * 10.5, 1.2); S.fx.push({ T: T1, type: 'raise', x, y }); spawnMob5({ kind: 'skel', owner: h, x, y, T: T1 + 0.7, hp: 7000, r: 0.6, next: T1 + 1.8 + S.rng() * 0.6 }); }
      S.ev.push({ T: T1, type: 'raise' });
    },
    sigs: [
      { name: 'SKULL OF ENDLESS TORMENT', dur: 5.8, fn(h, T0, T1, B) {   // PENTAGRAM: drawn around you, then again, turned; souls race along its lines and its points burst outward
        for (const [t, c] of ticks(T0, T1, B - 1e-6, B + 2, 1.7)) {
          const p = S.p, a0 = S.rng() * TAU, cx = p.x, cy = p.y, P = [0, 2, 4, 1, 3, 0].map(j => intoA5(cx + Math.cos(a0 + j * TAU / 5) * 5.2, cy + Math.sin(a0 + j * TAU / 5) * 5.2, 0.6));
          path5(t, P, 13, 'soul', { tele: 1.1, n: 6, gap: 0.04, col: 'e', at: (ta, x, y, q) => { if (q < 5) ring5(t, x, y, 10, 3.0, 'skull', Math.atan2(y - cy, x - cx) - Math.PI / 2 + TAU / 20, { r0: 0.4, tele: ta - t, hid: 1, life: 3, gaps: [[0.5, 0.5]] }); } });
        }
      } },
      { name: 'RITUAL SKULL', dur: 4.4, heavy: 1, fn(h, T0, T1, B) {   // DEATH BLOSSOM: souls loop out from him and back, the petals of a flower he stands in; keep your distance
        if (once5(T0, T1, B)) { h.sg.a = S.rng() * TAU; h.sg.d = S.rng() < 0.5 ? 1 : -1; h.hold = B + 4.2; }
        for (const [t] of ticks(T0, T1, B + 0.2, B + 3.2, per5(0.11))) for (let a = 0; a < 7; a++) e5(t, { cx: h.x, cy: h.y, r0: 1.2, vr: 6.4, ar: -4, w: 0.55 * h.sg.d, th: h.sg.a + a * TAU / 7 + (t - B) * 0.8 * h.sg.d, k: 'soul', life: 3.2 });
      } },
    ],
  },
  mystic: {
    basic: [1.0, (h, t) => fan5(t, h.x, h.y, 3, 0.13, 8.0, 'ice', { r0: 1.2, th: leadA(h.x, h.y, 8.0, 0.6) })],
    sigs: [
      { name: 'ORB OF CONFLICT', dur: 4.6, heavy: 1, fn(h, T0, T1, B) {   // STASIS: she spins out a spiral of ice; every shot in the hall stops dead, then creeps on the way it was going
        if (once5(T0, T1, B)) { S.fx.push({ T: B, type: 'stasisUp', x: h.x, y: h.y }); S.ev.push({ T: B, type: 'chargeUp' }); }
        for (const [t] of ticks(T0, T1, B + 0.1, B + 1.25, per5(0.1))) for (let a = 0; a < 5; a++) e5(t, { cx: h.x, cy: h.y, r0: 1.2, vr: 6, th: a * TAU / 5 + 2.2 * (t - B), k: 'ice', life: 3 });
        if (once5(T0, T1, B + 1.3)) {
          freeze5(B + 1.3, q => !q.hid, 1.3, (x, y, n, q) => ({ th: bhead(q, S.wt), vr: 0.4, ar: 3.2, life: 3.5, k: q.k }));
          S.fx.push({ T: B + 1.3, type: 'stasis', x: h.x, y: h.y }); S.ev.push({ T: B + 1.3, type: 'freeze' }); S.ev.push({ T: B + 2.6, type: 'thaw' });
        }
        for (const [t] of ticks(T0, T1, B + 1.5, B + 4.4, per5(0.7))) fan5(t, h.x, h.y, 4, 0.14, 8.0, 'ice', { r0: 1.2, th: leadA(h.x, h.y, 8.0, 0.8) });
      } },
      { name: 'IMPRISONMENT ORB', dur: 4.4, fn(h, T0, T1, B) {   // a cage of frost around you: three rings, one gap each; slip out through all three before they close
        if (!once5(T0, T1, B)) return;
        const x = S.p.x, y = S.p.y, g1 = S.rng(), g2 = g1 + (S.rng() < 0.5 ? 0.3 : -0.3), g3 = g2 + (S.rng() < 0.5 ? 0.3 : -0.3), hold = 2.7;
        if (Math.hypot(h.x - x, h.y - y) < 7) blink5(h, B, ...spot5(h, 8.5, 0), 'c');   // (she steps out of her own cage first)
        [[2.2, 22, g1], [3.9, 36, g2], [5.6, 50, g3]].forEach(([r, n, g]) => { const w = 3.9 / (TAU * r); ring5(B, x, y, n, -3.6, 'frost', 0, { r0: r, dl: hold, arm: 0.35, life: hold + r / 3.6, gaps: [[g - w / 2, w]] }); });
        S.f5.cage = { T0: B, T1: B + hold + 1.6, x, y, g: [[2.2, g1 * TAU], [3.9, g2 * TAU], [5.6, g3 * TAU]] };
        S.ev.push({ T: B, type: 'freeze' });
      } },
    ],
  },
  // II. THE WAND (the Cathedral's walls throw straight shots back once)
  priest: {
    basic: [1.3, (h, t) => { const a = leadA(h.x, h.y, 8.5, 0.5); for (let j = 0; j < 2; j++) for (const o of j ? [-0.07, 0.07] : [-0.14, 0, 0.14]) e5(t + j * 0.09, { cx: h.x, cy: h.y, r0: 1.3, vr: 8.5, th: a + o, k: 'wbolt', life: 3.4 }); S.ev.push({ T: t, type: 'aim' }); }],
    sigs: [
      { name: 'WAND OF RECOMPENSE', dur: 4.6, heavy: 1, fn(h, T0, T1, B) {   // lances of light that carom off the walls, trailing light that burns a moment
        for (const [t, k] of ticks(T0, T1, B + 0.3, B + 3.5, 1.05)) lance5(t, h.x, h.y, leadA(h.x, h.y, 8.5, 0.5) + (k % 3 - 1) * 0.35, 8.5, 4);
      } },
      { name: 'TOME OF HOLY PROTECTION', dur: 3.2, heavy: 1, fn(h, T0, T1, B) {   // a golden barrier on the most wounded of the rest of the choir, while smites fall on you
        if (once5(T0, T1, B)) {
          const q = S.heroes.filter(c => c.deadT === Infinity && c !== h && c.dmg > 0).sort((a, c) => c.dmg / c.hp - a.dmg / a.hp)[0];
          if (q) { q.prot = B + 2.0; S.fx.push({ T: B, type: 'protect', x: q.x, y: q.y, h: q }); S.ev.push({ T: B, type: 'seal' }); }
          for (const dl of [0, 0.6]) { const g = S.rng(); ring5(B + dl, h.x, h.y, 36, 3.4, 'holy', 0, { r0: 1.4, gaps: [[g, 4 / 36], [g + 0.5, 4 / 36]], bounce: 1 }); }
        }
        for (const [t] of ticks(T0, T1, B + 0.4, B + 2.6, per5(0.42))) { const [x, y] = intoA5(S.p.x + S.p.vx * 0.45, S.p.y + S.p.vy * 0.45, 1.0); pillar5(t, x, y, { kind: 'smite', tele: 0.75, r: 1.1, dmg: 150, burst: { n: 6, spd: 3.6, k: 'holy', life: 2.6 } }); }
      } },
    ],
  },
  sorc: {
    basic: [2.8, (h, t) => chain5(t, h.x, h.y, 4, 0.75)],
    sigs: [
      { name: 'SCEPTER OF FULMINATION', dur: 4.9, heavy: 1, fn(h, T0, T1, B) {   // lightning between the Cathedral's corners: the diagonals, the same turned half a step, then a star
        const A = ARENAS5[1], c = j => { const a = A.rot + j * TAU / 8; return [Math.cos(a) * A.R * 0.96, Math.sin(a) * A.R * 0.96]; };
        for (const [t, k] of ticks(T0, T1, B - 1e-6, B + 3.5, 1.1)) {
          if (k % 3 === 0) for (let j = 0; j < 4; j++) bolt5(t, ...c(j), ...c(j + 4), 1.0);
          else if (k % 3 === 1) for (let j = 0; j < 4; j++) { const a = j * Math.PI / 4 + (k > 3 ? Math.PI / 8 : 0), r = A.R * Math.cos(Math.PI / 8) * 0.96; bolt5(t, Math.cos(a) * r, Math.sin(a) * r, -Math.cos(a) * r, -Math.sin(a) * r, 1.0); }
          else for (let j = 0; j < 8; j++) bolt5(t, ...c(j), ...c(j + 3), 1.0);
        }
      } },
      { name: 'SCEPTER OF SKYBOLTS', dur: 4.2, fn(h, T0, T1, B) {   // lightning strides toward you: two lines of strikes, each landing a moment after the last
        for (const [t, c] of ticks(T0, T1, B, B + 3, 1.1)) {
          const [tx, ty] = leadP(h.x, h.y, 5, 1), a0 = Math.atan2(ty - h.y, tx - h.x), d = Math.hypot(tx - h.x, ty - h.y);
          for (const o of [-0.28, 0.28]) for (let j = 0; j < 7; j++) { const s = 2.5 + j * 1.7, a = a0 + o * (c % 2 ? -1 : 1) * (j ? 1 : 0.5); if (s > d + 3.5) break; pillar5(t + j * 0.11, h.x + Math.cos(a) * s, h.y + Math.sin(a) * s, { kind: 'bolt', tele: 0.7, r: 1.0, burst: { n: 4, spd: 3.0, k: 'spark', life: 2.2 } }); }
        }
      } },
    ],
  },
  summoner: {
    basic: [1.4, (h, t, k) => {
      fan5(t, h.x, h.y, 4, 0.15, 7.5, 'mshard', { r0: 1.2, th: leadA(h.x, h.y, 7.5, 0.5) });
      if (k % 2) for (const m of S.mobs) if (m.owner === h && m.deadT === Infinity && t >= m.T + 0.6) fan5(t + 0.3, m.x, m.y, 3, 0.16, 6, 'mshard', { r0: 0.9 });   // her mirrors copy her
    }],
    tick(h, T0, T1) {   // two mirrors guard her: while either stands she cannot be hurt; she raises them again 14 s after the last one breaks
      const live = S.mobs.filter(m => m.kind === 'mirror' && m.owner === h && m.deadT === Infinity);
      if (live.length) { h.st.mir = Infinity; return; }
      if (h.st.mir === Infinity) { h.st.mir = T1 + 14; S.fx.push({ T: T1, type: 'shield', x: h.x, y: h.y }); S.ev.push({ T: T1, type: 'shield' }); }
      if (T1 < (h.st.mir ?? h.T) || heavy5(T1)) return;
      h.st.mir = Infinity;
      const a = Math.atan2(h.y, h.x);
      for (const sd of [-1, 1]) { const [x, y] = intoA5(Math.cos(a + sd * 1.0) * 9, Math.sin(a + sd * 1.0) * 9, 1.4); spawnMob5({ kind: 'mirror', owner: h, sd, x, y, y0: y, T: T1, hp: 26000, r: 0.95, must: 1 }); }
      S.ev.push({ T: T1, type: 'mirrorUp' }); S.fx.push({ T: T1, type: 'banner', text: 'SHATTER THE MIRRORS', y: 176, size: 26, col: '#e0d0ff' });
    },
    sigs: [
      { name: 'HALL OF MIRRORS', dur: 4.6, fn(h, T0, T1, B) {   // seven reflections of her appear across the Cathedral's axes, and every one fires as she does
        if (once5(T0, T1, B)) { h.sg.a = S.rng() * TAU; h.hold = B + 4.4; h.sg.imgs = [[0, 0], ...D4_5].map(([r, fl]) => ({ r, fl })); S.fx.push({ T: B, type: 'kaleido', h, until: B + 4.4 }); S.ev.push({ T: B, type: 'mirrorUp' }); }
        if (!h.sg.imgs) return;
        for (const [t] of ticks(T0, T1, B + 0.5, B + 4.3, per5(0.3))) {
          const th = h.sg.a + (t - B) * 1.5;
          for (const { r, fl } of h.sg.imgs) { const [x, y] = d4(h.x, h.y, r, fl); e5(t, { cx: x, cy: y, r0: 0.9, vr: 4.2, th: r + (fl ? -th : th), k: 'mshard', life: 4.2 }); }
        }
      } },
    ],
  },
  // III. THE BOW (the trees stop arrows: take cover)
  archer: {
    basic: [0.75, (h, t) => fan5(t, h.x, h.y, 3, 0.12, 9.5, 'arrow', { r0: 1.2, th: leadA(h.x, h.y, 9.5, 0.8), cover: 1 })],
    sigs: [
      { name: 'QUIVER OF THUNDER', dur: 4.9, fn(h, T0, T1, B) {   // a sight tracks you; it locks, and a thunderbolt arrow follows the line a moment later
        if (once5(T0, T1, B)) h.hold = B + 4.8;
        for (const [t] of ticks(T0, T1, B - 1e-6, B + 3.5, 1.35)) { S.tele.push({ kind: 'laser', t0: wtAt(t), tl: wtAt(t + 1.0), t1: wtAt(t + 1.5), h, a: null }); S.ev.push({ T: t, type: 'drawBow' }); }
        for (const [t] of ticks(T0, T1, B + 1.0 - 1e-6, B + 4.5, 1.35)) {
          const a = aimA(h.x, h.y), q = S.tele.findLast(q => q.kind === 'laser' && q.h === h && q.a === null); if (q) Object.assign(q, { a, x: h.x, y: h.y });
          e5(t, { cx: h.x, cy: h.y, r0: 1.4, vr: 26, th: a, k: 'bigArrow', dl: 0.3, rv: t + 0.3, tg: 1, hid: 1, life: 1.2, cover: 1 });
          const x0 = h.x + Math.cos(a) * 1.4, y0 = h.y + Math.sin(a) * 1.4, sMax = Math.min(coverS5(x0, y0, a), wallHit5(x0, y0, a)[0]);
          for (let s = 1.2, j = 0; s < sMax; s += 1.1, j++) { const d = 0.35 + s / 26; e5(t, { cx: x0 + Math.cos(a) * s, cy: y0 + Math.sin(a) * s, r0: 0.25, vr: 2.2, th: a + (j % 2 ? 1 : -1) * Math.PI / 2, k: 'spark', dl: d, rv: t + d, tg: 1, hid: 1, arm: d + 0.1, life: 1.8 }); }
          S.ev.push({ T: t + 0.3, type: 'quiver' });
        }
      } },
      { name: 'DOOM BOW', dur: 4.1, fn(h, T0, T1, B) {   // ARROW STORM: four walls of arrows, each with two gaps; the trees stop them too
        if (once5(T0, T1, B)) { h.hold = B + 3.7; S.ev.push({ T: B, type: 'drawBow' }); S.fx.push({ T: B, type: 'draw', h }); }
        for (const [t] of ticks(T0, T1, B + 0.8, B + 3.3, 0.8)) {
          const a = leadA(h.x, h.y, 8, 0.5), R = S.rng, g1 = 3 + Math.floor(R() * 3), g2 = -(3 + Math.floor(R() * 3));
          for (let i = -11; i <= 11; i++) if (Math.abs(i - g1) > 1 && Math.abs(i - g2) > 1) e5(t, { cx: h.x, cy: h.y, r0: 1.3, vr: 8, th: a + i * 0.085, k: 'arrow', life: 3.2, cover: 1 });
          S.ev.push({ T: t, type: 'quiver' });
        }
      } },
    ],
  },
  huntress: {
    basic: [1.2, (h, t) => fan5(t, h.x, h.y, 2, 0.2, 8.5, 'arrow', { r0: 1.2, th: leadA(h.x, h.y, 8.5, 0.5), cover: 1 })],
    tick(h, T0, T1) {   // her hounds: two at her side; she calls the missing back every 14 s
      if (T1 < (h.st.hunt ?? h.T) || heavy5(T1)) return;
      h.st.hunt = T1 + 14;
      const have = S.mobs.filter(m => m.kind === 'wolf' && m.owner === h && m.deadT === Infinity).length;
      for (let k = have; k < 2; k++) { const a = S.rng() * TAU, [x, y] = intoA5(h.x + Math.cos(a) * 2, h.y + Math.sin(a) * 2, 1.0); spawnMob5({ kind: 'wolf', owner: h, x, y, T: T1 + 0.5, hp: 11000, r: 0.7, a: S.rng() * TAU, dir: k ? 1 : -1, next: T1 + 2.2 + k * 1.4 }); S.fx.push({ T: T1, type: 'raise', x, y }); }
      if (have < 2) S.ev.push({ T: T1, type: 'growl' });
    },
    sigs: [
      { name: 'GIANTCATCHER TRAP', dur: 2.6, fn(h, T0, T1, B) {   // a field of traps thrown around you: they snap when you come near, or when they tire of waiting
        for (const [t] of ticks(T0, T1, B, B + 1.25, 0.2)) { const a = S.rng() * TAU, d = 2.2 + S.rng() * 3; trap5(t, h.x, h.y - 1, S.p.x + Math.cos(a) * d, S.p.y + Math.sin(a) * d, { fl: 0.6, arm: 0.7, life: 7, r: 1.3, n: 10, spd: 3.4, owner: h }); }
      } },
    ],
  },
  bard: {
    basic: [1.3, (h, t) => fan5(t, h.x, h.y, 4, 0.16, 6.5, 'note', { r0: 1.2, th: leadA(h.x, h.y, 6.5, 0.5) })],
    sigs: [
      { name: 'ENCORE', dur: 7.5, fn(h, T0, T1, B) {   // she plays a phrase on the quarters of the hall, then plays it back: each quarter is struck on its note
        if (once5(T0, T1, B)) {
          const R = S.rng, seq = []; let prev = -1;
          for (let j = 0; j < 4; j++) { let q; do q = Math.floor(R() * 4); while (q === prev); prev = q; seq.push(j < 3 ? [q] : [q, (q + 2) % 4]); }
          Object.assign(h.sg, { seq, a0: R() * TAU });
        }
        const { seq, a0 } = h.sg; if (!seq) return;
        seq.forEach((qs, j) => {
          const td = B + 0.3 + j * 0.55, tp = B + 4.4 + j * 0.9;   // the phrase, then the playback (each strike shows 1.5 s ahead: time to cross a quarter)
          if (once5(T0, T1, td)) { S.fx.push({ T: td, type: 'quarter', qs, a0, n: j + 1 }); S.ev.push({ T: td, type: 'note', k: qs[0] * 2 + j }); }
          if (once5(T0, T1, tp - 1.5)) for (const q of qs) sector5(tp - 1.5, a0 + q * TAU / 4, a0 + (q + 1) * TAU / 4, 1.5, { n: j + 1 });
        });
      } },
    ],
  },
  // IV. THE DAGGER (the rooftops at night)
  rogue: {
    basic: [1.5, (h, t) => { if (h.cloak > t || Math.hypot(S.p.x - h.x, S.p.y - h.y) < 5) return; fan5(t, h.x, h.y, 5, 0.16, 9.5, 'dagger', { r0: 1.0, th: leadA(h.x, h.y, 8, 0.5), ar: -6, life: 1.58 }); }],
    sigs: [
      { name: 'CLOAK OF THE PLANEWALKER', dur: 4.0, fn(h, T0, T1, B) {   // he vanishes, slips behind you, and springs out of the dark
        if (once5(T0, T1, B)) { h.cloak = B + 1.6; h.hold = B + 1.6; S.fx.push({ T: B, type: 'smoke', x: h.x, y: h.y, out: 1 }); S.ev.push({ T: B, type: 'cloak' }); }
        if (once5(T0, T1, B + 1.0)) {   // behind you: the way you are coming from
          const p = S.p, sp = Math.hypot(p.vx, p.vy), a = sp > 1 ? Math.atan2(-p.vy, -p.vx) : S.rng() * TAU;
          let dest = null;
          for (let k = 0; k < 12 && !dest; k++) { const b = a + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.4, x = p.x + Math.cos(b) * 5.5, y = p.y + Math.sin(b) * 5.5; if (inA5(x, y, 1.8)) dest = [x, y]; }
          dest = dest || intoA5(p.x + Math.cos(a) * 5.5, p.y + Math.sin(a) * 5.5, 1.8);
          h.go = { T0: B + 1.6, T1: B + 1.6, x0: h.x, y0: h.y, x1: dest[0], y1: dest[1] };
          S.fx.push({ T: B + 1.0, type: 'smoke', x: dest[0], y: dest[1] });
        }
        if (once5(T0, T1, B + 1.6)) {   // BACKSTAB: a ring of daggers flies out, hangs, and flies on (he has just reappeared)
          const x = h.x, y = h.y, o = S.rng() * TAU;
          for (let i = 0; i < 8; i++) { const th = o + i * TAU / 8; e5(B + 1.6, { cx: x, cy: y, r0: 1.0, vr: 6, ar: -8, stop: 0.75, th, k: 'dagger', life: 1.35 }); e5(B + 1.6, { cx: x, cy: y, r0: 3.25, vr: 5.5, th, k: 'dagger', dl: 1.35, rv: B + 2.95, tg: 1, hid: 1, cont: 1, life: 2.4 }); }
          S.ev.push({ T: B + 1.6, type: 'blink5' }); S.fx.push({ T: B + 1.6, type: 'smoke', x, y, out: 1 });
        }
        for (const [t] of ticks(T0, T1, B + 2.5, B + 3.8, 0.6)) fan5(t, h.x, h.y, 5, 0.16, 11, 'dagger', { r0: 1.0, th: leadA(h.x, h.y, 9, 0.6), ar: -7.5, life: 1.45 });
      } },
      { name: 'DAGGER OF FOUL MALEVOLENCE', dur: 3.6, fn(h, T0, T1, B) {   // thrown daggers that come back to him, and fly on past him
        for (const [t] of ticks(T0, T1, B + 0.2, B + 1.6, 1.2)) fan5(t, h.x, h.y, 5, 0.24, 11, 'dagger', { r0: 1.0, th: leadA(h.x, h.y, 9, 0.5), ar: -7, life: 3.4 });
      } },
    ],
  },
  assassin: {
    basic: [1.7, (h, t) => fan5(t, h.x, h.y, 2, 0.16, 8, 'vdagger', { r0: 1.1, th: leadA(h.x, h.y, 8, 0.4) })],
    tick(h, T0, T1) {   // BANESERPENT: while he lives your footsteps are poisoned; venom wells up where you stood a second ago
      for (const [t] of ticks(T0, T1, h.T, Infinity, 0.2)) { const k = Math.round(t * FPS) - 66; if (k >= 0) e5(t, { cx: S.hx[k], cy: S.hy[k], r0: 0, vr: 0, th: 0, k: 'venom', dl: 0.4, rv: t + 0.4, tg: 1, life: 2.2 }); }
    },
    sigs: [
      { name: 'PLAGUE POISON', dur: 3.4, fn(h, T0, T1, B) {   // vials that burst into clouds of poison hanging in the air, then a closing ring of it
        for (const [t] of ticks(T0, T1, B, B + 1.0, 0.45)) { const [x, y] = leadP(h.x, h.y, 7, 1); lob5(t, h.x, h.y - 1, x + (S.rng() - 0.5) * 3, y + (S.rng() - 0.5) * 3, { kind: 'vial', fl: 0.8, r: 0.85, burst: { n: 12, spd: 2.4, k: 'bubble', ar: -1.6, stop: 1.5, life: 4.0 } }); }
        if (once5(T0, T1, B + 1.8)) { const g = S.rng(); conv5(B + 1.8, 44, 2.8, 'bubble', 0, [[g, 5 / 44], [g + 0.5, 5 / 44]], { col: 'e' }); }
      } },
    ],
  },
  trickster: {
    basic: [1.2, (h, t) => fan5(t, h.x, h.y, 3, 0.2, 8.2, 'pdagger', { r0: 1.0, th: leadA(h.x, h.y, 7, 0.6), ar: -4.6, life: 1.75 })],
    sigs: [
      { name: 'PRISM OF DIRE INSTABILITY', dur: 4.2, fn(h, T0, T1, B) {   // she splits in four and only one is real; every one of them throws prisms that split, and split again
        if (once5(T0, T1, B)) {
          const R = S.rng; let pts = null;
          for (let tries = 0; tries < 20 && !pts; tries++) { const a0 = R() * TAU, q = [0, 1, 2, 3].map(k => intoA5(Math.cos(a0 + k * Math.PI / 2) * 6.4, Math.sin(a0 + k * Math.PI / 2) * 6.4, 1.8)); if (q.every(([x, y]) => Math.hypot(x - S.p.x, y - S.p.y) > 4)) pts = q; }
          pts = pts || [0, 1, 2, 3].map(k => intoA5(Math.cos(k * Math.PI / 2 + 0.8) * 6.4, Math.sin(k * Math.PI / 2 + 0.8) * 6.4, 1.8));
          const real = Math.floor(R() * 4);
          h.go = { T0: B + 0.3, T1: B + 0.3, x0: h.x, y0: h.y, x1: pts[real][0], y1: pts[real][1] }; h.hold = B + 3.9;
          S.decoys = pts.filter((_, k) => k !== real).map(([x, y]) => ({ x, y, T: B + 0.3, until: B + 3.9 }));
          S.fx.push({ T: B, type: 'prismSplit', x: h.x, y: h.y, pts }); S.ev.push({ T: B, type: 'split5' });
        }
        for (const [t] of ticks(T0, T1, B + 0.7, B + 3.0, 1.5)) for (const [x, y] of [[h.x, h.y], ...S.decoys.map(d => [d.x, d.y])]) { const a = aimA(x, y); for (const o of [-0.3, 0.3]) fission5(t, x, y, a + o, 2); }
        if (once5(T0, T1, B + 3.9)) { for (const d of S.decoys) { ring5(B + 3.9, d.x, d.y, 14, 3.5, 'prism', S.rng() * TAU, { r0: 0.8 }); S.fx.push({ T: B + 3.9, type: 'prismPop', x: d.x, y: d.y }); } S.decoys = []; S.ev.push({ T: B + 3.9, type: 'decoyPop' }); }
      } },
    ],
  },
};
// the symmetries of the Cathedral used by the Hall of Mirrors: the seven [rotation, mirrored] images besides her own
const D4_5 = [[0, 1], [Math.PI / 2, 0], [Math.PI / 2, 1], [Math.PI, 0], [Math.PI, 1], [-Math.PI / 2, 0], [-Math.PI / 2, 1]];
const d4 = (x, y, r, fl) => { if (fl) y = -y; return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)]; };
// a survivor's words when one of its party falls (after the first, and the second)
const FALL5 = {
  staff: ['One voice fewer in my Conclave. The rest sing louder.', 'The last of my casters. Burn, hero!'],
  wand: ['The Choir is not silenced so easily.', 'One voice left. It is enough.'],
  bow: ['The Hunt does not end with one hunter.', 'Last one standing. Run, prey!'],
  dagger: ['A shadow falls. There are others.', 'Alone in the dark with you. Good.'],
};

// ---------- how each hero moves between its attacks (a stance, sometimes opened by a dash or a blink) ----------
const flip5 = h => (h.dir = -h.dir);
const PLAN5 = {
  wizard(h, T, k) { if (k % 4 === 3) { blink5(h, T, ...spot5(h, 7.5, (S.rng() < 0.5 ? 1 : -1) * (1.2 + S.rng())), 'p'); return { kind: 'hold', dur: 0.7 }; } return { kind: 'strafe', r: 7.5, spd: 5.2, dir: flip5(h), dur: 2.2 }; },
  necro(h) { return Math.hypot(h.x - S.p.x, h.y - S.p.y) < 6 ? { kind: 'kite', r: 9, spd: 5, dur: 1.2 } : { kind: 'strafe', r: 8.5, spd: 4, dir: flip5(h), dur: 2.4 }; },
  mystic(h, T, k) { if (k % 2) return { kind: 'hold', dur: 0.6 }; const [x, y] = spot5(h, 8, (S.rng() - 0.5) * 3); return { kind: 'point', x, y, spd: 6, dur: 1.8 }; },
  priest(h) { return { kind: 'strafe', r: 8, spd: 4.2, dir: flip5(h), dur: 2.6 }; },
  sorc(h, T, k) { if (k % 3 === 0) { blink5(h, T, ...spot5(h, 7 + S.rng() * 2, (S.rng() - 0.5) * 3.5), 'b'); return { kind: 'hold', dur: 1.4 }; } return { kind: 'strafe', r: 8, spd: 4, dir: flip5(h), dur: 1.2 }; },
  summoner() { return { kind: 'kite', r: 9.5, spd: 4.5, dur: 2 }; },
  archer(h, T, k) { return k % 2 ? { kind: 'hold', dur: 0.55 } : { kind: 'kite', r: 10, spd: 6.5, dur: 1.2 }; },   // she stutter-steps: run, stop to shoot
  huntress(h, T, k) { return k % 3 === 2 ? { kind: 'strafe', r: 5.5, spd: 6.2, dir: flip5(h), dur: 1.6 } : { kind: 'chase', spd: 4.8, stop: 5, dur: 2 }; },
  bard(h) { const [x, y] = spot5(h, 8.5, (S.rng() - 0.5) * 1.2); return { kind: 'point', x, y, spd: 7, dur: BEAT }; },   // she dances: a hop on every beat
  rogue(h, T, k) { if (k % 4 === 3 && !(h.cloak > T)) { dash5(h, T, { spd: 17, tele: 0.5, k: 'dagger', over: 3.5, trail: 0.35, col: 'v' }); return { kind: 'hold', dur: 0.5 }; } return { kind: 'strafe', r: 6, spd: 6.2, dir: flip5(h), dur: 1.5 }; },
  assassin(h, T, k) { if (k % 5 === 4) { dash5(h, T, { spd: 15, tele: 0.55, k: 'vdagger', over: 3, col: 'e' }); return { kind: 'hold', dur: 0.5 }; } return { kind: 'strafe', r: 7.5, spd: 5.6, dir: flip5(h), dur: 1.8 }; },
  trickster(h, T, k) { if (k % 3 === 2) { blink5(h, T, ...spot5(h, 7, (S.rng() - 0.5) * 4), 'w'); return { kind: 'hold', dur: 0.5 }; } return { kind: 'strafe', r: 7, spd: 4.8, dir: flip5(h), dur: 1.8 }; },
  warrior() { return { kind: 'formation', dur: 9 }; }, paladin() { return { kind: 'formation', dur: 9 }; },   // (the Colosseum scripts the champions)
};
// ---------- the rite: every other time a party breaks off, its heroes leap to their marks and play one great pattern together ----------
// spot(h, j, n, st): where the j-th of the n heroes stands; fire(T0, T1, C, L, st): the pattern (C: the call; st: its memory)
const SIG_GAP5 = 0.8, GOLD5 = Math.PI * (3 - Math.sqrt(5));   // (a breath between signatures; the golden angle)
const RT5 = { spiral: 0.2, spin: 0.9, hymn: 0.75, needle: 0.17, volley: 1.1, gap: 1.05, web: 2.2 };   // pacing (s) of the rites' volleys
const RITE5 = {
  staff: { name: 'THE CONJUNCTION', dur: 8, spot: (h, j, n) => { const a = S.f5.a0 + j * TAU / n; return [Math.cos(a) * 6.4, Math.sin(a) * 5.8 - 0.4]; },
    fire(T0, T1, C, L) {   // the casters stand on a triangle, each spinning a dotted spiral of its own shot against its neighbour's: a woven lattice
      for (const [t] of ticks(T0, T1, C + 1.0, C + 7.4, per5(RT5.spiral))) L.forEach((h, j) => { const d = j % 2 ? 1 : -1; for (let a = 0; a < 3; a++) e5(t, { cx: h.x, cy: h.y, r0: 1.3, vr: 5.5, w: 0.15 * d, th: d * RT5.spin * (t - C) + a * TAU / 3 + j, k: HERO5[h.id].k, life: 4.2 }); });
    } },
  wand: { name: 'THE HYMN', dur: 8, spot: (h, j) => [[0, -3.4], [-7, 1.8], [7, 1.8]][j],
    fire(T0, T1, C, L, st) {   // the first of the choir sings rings of light through two gates that turn a step with every ring; the others thread needles at you
      if (st.g === undefined) Object.assign(st, { g: S.rng(), d: S.rng() < 0.5 ? 1 : -1 });
      for (const [t, k] of ticks(T0, T1, C + 1.0, C + 7.4, per5(RT5.hymn))) { const g = st.g + st.d * k / 16; ring5(t, L[0].x, L[0].y, 44, 3.3, 'holy', 0, { r0: 1.4, life: 5, gaps: [[g, 4 / 44], [g + 0.5, 4 / 44]] }); }
      for (const h of L.slice(1)) for (const [t] of ticks(T0, T1, C + 1.2, C + 7.4, per5(RT5.needle))) e5(t, { cx: h.x, cy: h.y, r0: 1.2, vr: 7, th: aimA(h.x, h.y), k: HERO5[h.id].k, life: 2.6 });
    } },
  bow: { name: 'THE VOLLEY', dur: 8, spot: (h, j, n, st) => {   // a firing line across the hall from you: the walls of arrows it looses arc over the trees, one gap in each
      if (st.a === undefined) st.a = Math.atan2(S.p.y, S.p.x) + Math.PI;
      const o = (j - (n - 1) / 2) * 3.4; return [Math.cos(st.a) * 8.8 - Math.sin(st.a) * o, Math.sin(st.a) * 8.8 + Math.cos(st.a) * o];
    },
    fire(T0, T1, C, L, st) {   // the gap moves a few steps along the wall with every volley: follow it
      for (const [t] of ticks(T0, T1, C + 1.0, C + 7.4, per5(RT5.volley))) {
        const s = (st.g ?? (S.rng() - 0.5) * 6) + (S.rng() < 0.5 ? -1 : 1) * (2 + S.rng() * 1.5); st.g = Math.abs(s) > 7.5 ? s - Math.sign(s) * 5 : s;
        curtain5(t, st.a + Math.PI, 4.4, 0.66, [[st.g, RT5.gap]], 'arrow'); S.ev.push({ T: t, type: 'quiver' });
      }
    } },
  dagger: { name: 'THE WEB', dur: 8.2, spot: (h, j, n, st) => { if (st.a === undefined) st.a = S.rng() * TAU; const a = st.a + j * TAU / n; return [S.p.x + Math.cos(a) * 7.2, S.p.y + Math.sin(a) * 7.2]; },
    fire(T0, T1, C, L, st) {   // they surround you and throw fans of daggers that stop and hang in the air; then each one's daggers fly at you, one hero after another
      st.hang = st.hang || [];
      for (const [t, w] of ticks(T0, T1, C + 1.0, C + 6.0, RT5.web)) L.forEach((h, j) => {
        const tr = t + 1.3 + j * 0.35, n = 3 + 2 * w, a = aimA(h.x, h.y);
        for (let i = 0; i < n; i++) { const th = a + (i - (n - 1) / 2) * 0.2; e5(t, { cx: h.x, cy: h.y, r0: 1.0, vr: 7.5, ar: -10, stop: 0.75, th, k: HERO5[h.id].k, life: tr - t }); st.hang.push({ tr, x: h.x + Math.cos(th) * 3.81, y: h.y + Math.sin(th) * 3.81, k: HERO5[h.id].k }); }
      });
      for (const q of st.hang) if (once5(T0, T1, q.tr)) e5(q.tr, { cx: q.x, cy: q.y, r0: 0, vr: 8, th: aimA(q.x, q.y), k: q.k, life: 2.5 });
    } },
};
// ---------- the chase: every other time a party breaks off, it hunts you for a few seconds ----------
const CHASE5 = {
  wizard: { move(h, T, k) {   // he blink-steps after you, and every spot he leaves bursts a moment later
    ring5(T + 0.3, h.x, h.y, 8, 3.4, 'shur', S.rng() * TAU, { r0: 0.4, tele: 0.55, life: 2.6 });
    blink5(h, T, ...spot5(h, 5.2, k % 2 ? 0.8 : -0.8), 'p'); return { kind: 'hold', dur: 0.75 };
  } },
  necro: { move: () => ({ kind: 'kite', r: 9, spd: 4.8, dur: 2 }), start(h, T) {   // the dead rise behind you and sprint
    const a = Math.atan2(S.p.y, S.p.x);
    for (const sd of [-1, 1]) { const [x, y] = intoA5(S.p.x + Math.cos(a + sd * 0.8) * 4.5, S.p.y + Math.sin(a + sd * 0.8) * 4.5, 1.2); S.fx.push({ T, type: 'raise', x, y }); spawnMob5({ kind: 'skel', owner: h, x, y, T: T + 0.6, hp: 7000, r: 0.6, next: T + 1.6, sprint: T + 5.5, until: T + 6.5 }); }
    S.ev.push({ T, type: 'raise' });
  } },
  mystic: { move(h, T, k) {   // she slides past you on the ice, and the frost she leaves hangs in the air
    const p = S.p, sd = k % 2 ? 1 : -1, a0 = Math.atan2(p.y - h.y, p.x - h.x), ax = p.x - Math.sin(a0) * 2.6 * sd, ay = p.y + Math.cos(a0) * 2.6 * sd, a = Math.atan2(ay - h.y, ax - h.x);
    run5(h, T, ax + Math.cos(a) * 5, ay + Math.sin(a) * 5, { spd: 10, tele: 0.45, k: 'frost', gap: 0.7, trail: 1.6, col: 'c' }); return { kind: 'hold', dur: 0.35 };
  } },
  priest: { move(h, T) {   // THE CRUSADE: he charges at you behind a wall of light
    dash5(h, T, { spd: 13, tele: 0.65, over: 2.5, wall: 'holy', col: 'g' }); return { kind: 'hold', dur: 0.75 };
  } },
  sorc: { move: () => ({ kind: 'chase', spd: 5.5, stop: 4.5, dur: 2 }), fire(h, T0, T1, C) {   // he rides the storm after you; lightning strikes wherever you stand
    for (const [t] of ticks(T0, T1, C + 0.3, Infinity, 0.7)) pillar5(t, S.p.x, S.p.y, { kind: 'bolt', tele: 0.75, r: 0.95, burst: { n: 4, spd: 3, k: 'spark', life: 2 } });
  } },
  summoner: { move: () => ({ kind: 'kite', r: 9.5, spd: 4.5, dur: 2 }) },   // (her mirrors hunt you: mobs5)
  archer: { move(h, T, k) { const a = Math.atan2(h.y, h.x) + (k % 2 ? 1 : -1) * 1.4, [x, y] = intoA5(Math.cos(a) * 10, Math.sin(a) * 10, 1.9); return { kind: 'point', x, y, spd: 8, dur: 1.4 }; },
    fire(h, T0, T1, C) { for (const [t] of ticks(T0, T1, C + 0.2, Infinity, 0.45)) fan5(t, h.x, h.y, 2, 0.16, 9.5, 'arrow', { r0: 1.2, th: leadA(h.x, h.y, 10, 1), cover: 1 }); } },   // running shots along the edge
  huntress: { move: () => ({ kind: 'chase', spd: 6, stop: 3.8, dur: 2 }),   // THE HUNT: she runs you down with her hounds
    fire(h, T0, T1, C) { for (const [t] of ticks(T0, T1, C + 0.3, Infinity, 0.6)) if (Math.hypot(S.p.x - h.x, S.p.y - h.y) > 4.3) fan5(t, h.x, h.y, 2, 0.2, 9, 'arrow', { r0: 1.2, th: leadA(h.x, h.y, 9, 0.7), cover: 1 }); } },
  bard: { move: h => ({ kind: 'strafe', r: 8.5, spd: 7, dir: h.dir, dur: 2.5 }),   // presto: she dances around you, a chord on every beat
    fire(h, T0, T1, C) { for (const [t, k] of ticks(T0, T1, C, Infinity, BEAT)) fan5(t, h.x, h.y, 3, 0.2, 6.5, k % 2 ? 'note2' : 'note', { r0: 1.2 }); } },
  rogue: { move(h, T) { dash5(h, T, { spd: 18, tele: 0.45, k: 'dagger', over: 3.5, trail: 0.35, col: 'v' }); return { kind: 'hold', dur: 0.45 }; } },   // dash after dash
  assassin: { move: () => ({ kind: 'chase', spd: 6, stop: 5.5, dur: 2 }),   // her wake is poison
    fire(h, T0, T1, C) { for (const [t] of ticks(T0, T1, C, Infinity, 0.25)) e5(t, { cx: h.x, cy: h.y, r0: 0, vr: 0, th: 0, k: 'venom', dl: 0.3, rv: t + 0.3, tg: 1, life: 2.2 }); } },
  trickster: { move(h, T, k) { if (k % 2) { blink5(h, T, ...spot5(h, 7.5, (S.rng() - 0.5) * 4), 'w'); return { kind: 'hold', dur: 0.6 }; } return { kind: 'strafe', r: 7.5, spd: 5, dir: h.dir, dur: 1.5 }; },
    start(h, T) {   // her copies appear around you, and one after another they dash straight through you
      const p = S.p, a0 = S.rng() * TAU;
      for (let j = 0; j < 3; j++) { const a = a0 + j * TAU / 3, [x, y] = intoA5(p.x + Math.cos(a) * 7, p.y + Math.sin(a) * 7, 1.8); S.decoys.push({ x, y, T, until: T + 2.4 + j * 0.8, at: T + 0.5 + j * 0.8, chase: 1 }); }
      S.fx.push({ T, type: 'prismSplit', x: h.x, y: h.y, pts: S.decoys.slice(-3).map(d => [d.x, d.y]) }); S.ev.push({ T, type: 'split5' });
    } },
  warrior: { move: () => ({ kind: 'formation', dur: 9 }) }, paladin: { move: () => ({ kind: 'formation', dur: 9 }) },
};

// ---------- V. THE COLOSSEUM: survive the champions (the clock runs down faster with every hit on either of them) ----------
const SURV5_WAVES = ['FOR GLORY', 'HOLY GROUND', 'WAR CRY', 'WHIRLWIND'];
function colosseum5(T0, T1) {
  const f = S.f5, [wa, pa] = S.heroes, R = S.rng;
  for (const h of S.heroes) if (h.deadT === Infinity) moveHero5(h, T1);
  if (T1 < f.T || wa.deadT !== Infinity) return;
  const q = 1 - Math.max(0, survLeft5(T1)) / f.sv.base, w = Math.min(3, Math.floor(q * 4));
  if (w !== f.st.w) {   // each wave starts clean, with a breath
    dissolve(() => true, T1); S.lobs = []; S.pillars = []; S.tele = []; S.zones5 = [];
    for (const m of S.mobs) if (m.kind === 'seal' && m.deadT === Infinity) m.deadT = T1;
    f.st.w = w; f.st.s0 = T1 + 0.9; wa.walk = w === 3;
    S.fx.push({ T: T1, type: 'wave', text: SURV5_WAVES[w] }); S.ev.push({ T: T1, type: 'wave' });
    if (w === 1) { const a0 = R() * TAU; for (let k = 0; k < 4; k++) spawnMob5({ kind: 'seal', owner: pa, x: Math.cos(a0 + k * Math.PI / 2) * 6.2, y: Math.sin(a0 + k * Math.PI / 2) * 6.2, T: T1 + 0.9, dir: k % 2 ? -1 : 1 }); item5(pa, 'SEAL OF BLASPHEMOUS PRAYER', T1 + 0.9); S.ev.push({ T: T1 + 0.9, type: 'seal' }); }
    if (w === 3) item5(wa, 'WHIRLWIND', T1 + 0.9);
  }
  SRC5 = 'wave' + w;
  const s0 = f.st.s0, seals = S.mobs.filter(m => m.kind === 'seal' && m.deadT === Infinity && T1 >= m.T);
  const blades = (t, n, spread) => fan5(t, pa.x, pa.y, n - 1, spread * 1.1, 8.5, 'blade', { r0: 1.2, th: leadA(pa.x, pa.y, 8.5, 0.7), cover: 1 });
  const judge = (t, k) => { const g1 = (R() - 0.5) * 14, g2 = g1 + (g1 > 0 ? -1 : 1) * (5 + R() * 3); curtain5(t, k % 2 ? Math.PI / 2 : 0, 4.2, 0.72, [[g1, 1.1], [g2, 1.1]], 'holy', { cover: 1 }); S.ev.push({ T: t, type: 'judge' }); };
  if (w === 0) {   // FOR GLORY: he leaps onto you, again and again; her blades keep you moving
    for (const [t, k] of ticks(T0, T1, s0, Infinity, per5(2.2))) (k % 2 ? rush5 : leap5)(wa, t);
    for (const [t] of ticks(T0, T1, s0 + 0.4, Infinity, per5(0.85))) blades(t, 5, 0.15);
  } else if (w === 1) {   // HOLY GROUND: her seals spin crosses of light; he keeps leaping
    for (const [t] of ticks(T0, T1, s0 + 0.6, Infinity, per5(0.24))) for (const m of seals) { const base = m.dir * 1.1 * (t - s0); for (let a = 0; a < 4; a++) e5(t, { cx: m.x, cy: m.y, r0: 0.6, vr: 5, th: base + a * Math.PI / 2, k: 'hcross', life: 5, cover: 1 }); }
    for (const [t] of ticks(T0, T1, s0 + 0.5, Infinity, per5(2.6))) leap5(wa, t);
    for (const [t] of ticks(T0, T1, s0 + 0.3, Infinity, per5(0.8))) blades(t, 5, 0.16);
    for (const [t] of ticks(T0, T1, s0 + 2.2, Infinity, per5(5.5))) dash5(pa, t, { spd: 12, tele: 0.7, over: 2, wall: 'holy', ring: { n: 18, spd: 3, k: 'holy' }, col: 'g' });   // her holy charge
  } else if (w === 2) {   // WAR CRY: he roars from wherever he lands; nothing but the pillars' shadows is safe, and the shadows move
    for (const [t, k] of ticks(T0, T1, s0, Infinity, 3.0)) warcry5(wa, t, k);
    for (const [t] of ticks(T0, T1, s0 + 0.2, Infinity, per5(0.9))) blades(t, 5, 0.16);
    for (const [t, k] of ticks(T0, T1, s0 + 1.1, Infinity, 3.0)) judge(t, k);   // a wall of light while you run for cover
  } else {   // WHIRLWIND: he spins and walks you down; her Judgement sweeps the hall
    for (const [t] of ticks(T0, T1, s0, Infinity, per5(0.1))) { const base = f.a0 + 2.6 * (t - s0), n = t - s0 < 0.7 ? 3 : 6; for (let a = 0; a < n; a++) e5(t, { cx: wa.x, cy: wa.y, r0: 1.3, vr: 5.5, th: base + a * TAU / n, k: 'blade', life: 3, cover: 1 }); }
    for (const [t, k] of ticks(T0, T1, s0 + 1.2, Infinity, per5(1.3))) judge(t, k);
    for (const [t] of ticks(T0, T1, s0 + 0.6, Infinity, per5(0.9))) blades(t, 5, 0.16);
    for (const [t, k] of ticks(T0, T1, s0 + 0.9, Infinity, per5(1.1))) { const g = R(); ring5(t, pa.x, pa.y, 24, 3.2, 'hcross', k * 0.4, { r0: 1.2, gaps: [[g, 3 / 24], [g + 0.5, 3 / 24]], cover: 1 }); }
  }
}
function rush5(h, t) {   // the Warrior's bull rush: straight through where you stand, behind a wall of blades
  dash5(h, t, { spd: 15, tele: 0.6, over: 3, wall: 'blade', ring: { n: 24, spd: 3.2, k: 'nova' }, land: 1.0, col: 'r' }); S.ev.push({ T: t, type: 'berserk' });
}
function leap5(h, t) {   // the Warrior leaps and lands where you stood: get out from under him
  const [x1, y1] = intoA5(S.p.x, S.p.y, 1.8), dur = 0.95, g = S.rng();
  h.go = { T0: t, T1: t + dur, x0: h.x, y0: h.y, x1, y1, hop: 3.2 };
  pillar5(t, x1, y1, { kind: 'slam', tele: dur, r: 2.2, dmg: 160 });
  ring5(t, x1, y1, 28, 2.6, 'nova', S.rng() * TAU, { r0: 2.0, tele: dur, hid: 1, gaps: [[g, 6 / 28], [g + 0.5, 6 / 28]] });
  S.ev.push({ T: t, type: 'leap' }); S.ev.push({ T: t + dur, type: 'impact' }); S.fx.push({ T: t + dur, type: 'boom', x: x1, y: y1, s: 1.3 });
}
function warcry5(h, t, k) {   // HELM OF THE JUGGERNAUT: he leaps and roars two rings with no gaps; only the pillars' shadows are safe, and each roar comes from somewhere new
  const a = Math.atan2(S.p.y, S.p.x) + Math.PI / 2 * (k % 2 ? 1 : -1) + (S.rng() - 0.5) * 0.6, r = k ? 3.5 + S.rng() * 1.5 : 0, x = Math.cos(a) * r, y = Math.sin(a) * r;
  h.go = { T0: t, T1: t + 0.8, x0: h.x, y0: h.y, x1: x, y1: y, hop: 2.4 };
  if (!k) item5(h, 'HELM OF THE JUGGERNAUT', t);
  const tc = t + 2.3;
  S.tele.push({ kind: 'shadow', t0: wtAt(t + 0.4), t1: wtAt(tc + 0.9), x, y });
  for (let j = 0; j < 2; j++) ring5(t, x, y, 84, 6.5, 'blade', j * 0.037, { r0: 1.5, tele: tc - t + j * 0.3, hid: 1, cover: 1, life: 2.6 });
  S.fx.push({ T: t + 0.4, type: 'banner', text: 'TAKE COVER!', y: 176, size: 26, col: '#ff9a9a' });
  S.ev.push({ T: t, type: 'leap' }); S.ev.push({ T: tc, type: 'berserk' }); S.fx.push({ T: tc, type: 'berserk' });
  S.f5.cover = { T0: t + 0.4, T1: tc + 1.0, x, y };   // (for the test bots)
}

// ---------- the change of stage (a party wiped out, a clock run down, or the Knight's health gone) ----------
function trigger5(T) {
  const f = S.f5, i = f.i;
  if (f.trig === i) return; f.trig = i;
  S.ev.push({ T, type: 'split' });
  if (i === FORMS5.length - 1) { killBoss5(T); return; }
  const F = FORMS5[i], nf = FORMS5[i + 1], dur = TRANS5[nf.tr], big = nf.tr === 'weapon' || nf.tr === 'last';
  if (nf.w !== F.w) SPLITS[F.w].T = T;
  if (F.surv && F.party) { for (const h of S.heroes) if (h.deadT === Infinity) { h.deadT = T; S.fx.push({ T, type: 'kneel', x: h.x, y: h.y, id: h.id }); } S.ev.push({ T, type: 'kneel' }); }   // the crowd is satisfied: the champions bow out
  endForm5(T, big);
  // a stance lands on the beat of the phase's music; a new weapon (or the last stand) restarts it
  const t1 = big ? T + dur : f.W0 + Math.ceil((T + dur - f.W0) / BEAT - 1e-9) * BEAT;
  Object.assign(f, { i: i + 1, mT: T, T: t1, from: i, st: {}, big, sv: surv5(nf), nextSig: undefined, turn: -1, cage: null, cover: null });
  if (big) f.W0 = t1;
  f.log.push({ i: i + 1, mT: T, T: t1 });
  if (nf.party) spawnParty5(T + 1.4, t1);
  else if (F.w !== 5) { S.heroes = []; S.mv5 = [{ T0: T + 0.7, T1: T + 2.5, x0: HOME5.x, y0: HOME5.y, x1: HOME5.x, y1: HOME5.y, drop: 7 }]; }   // Oryx himself descends
  else if (nf.ai === 'knight2' || nf.ai === 'knight3') S.mv5.push({ T0: T, T1: T + 1.8, x1: 0, y1: 0, ease: 1 });   // to the centre of the hall
  S.ev.push({ T, type: 'morph', i: i + 1, big }); S.fx.push({ T, type: 'morph', i: i + 1, from: i, big, dur: t1 - T });
  const line = MORPH_LINES5[nf.ai]; if (line) say(T + 0.3, 'boss', line);
}
function endForm5(T, big) {
  // the old stage's summons go with it; a pending charge is cancelled where he stands
  for (const m of S.mobs) if (m.deadT === Infinity) { m.deadT = T; m.gone = true; S.fx.push({ T, type: 'boom', x: m.x, y: m.y, s: 0.5 }); }
  for (const d of S.decoys) S.fx.push({ T, type: 'prismPop', x: d.x, y: d.y });
  S.decoys = []; S.lanes5 = []; S.traps = []; S.zones5 = [];
  if (knight5()) { const b = bossAt5(T, S.wt); S.mv5 = [{ T0: T, T1: T, x1: b.x, y1: b.y }]; }
  dissolve(q => q.k === 'kblade' || q.k === 'holyB' || q.k === 'kwall' || q.rv > T + 0.05, T);
  S.pillars = S.pillars.filter(z => z.ti <= S.wt); S.lobs = S.lobs.filter(l => l.tl <= S.wt); S.tele = [];
  if (big) {   // a new weapon: the shockwave of the change clears the field
    S.parts.push({ t: S.wt, x: 0, y: 0, n: 0, seed: 1, col: 'clear', spd: 0, life: 1, snap: S.al.map((q, k) => [S.alx[k], S.aly[k], q.k]) });
    for (let k = S.bbStart; k < S.bb.length; k++) S.bb[k].hit = Math.min(S.bb[k].hit, S.wt);
    S.lobs = []; S.pillars = [];
  }
}
function killBoss5(T) { T_KILL = T; TL.bag = T + 5.2; TL.results = T + 12.5; SPLITS[5].T = T; }

// ---------- the hall takes a new shape with every weapon: its boundary holds you in, and some have solid obstacles ----------
const ARENAS5 = [
  { name: 'THE TOWER', kind: 'circle' },
  { name: 'THE CATHEDRAL', kind: 'poly', n: 8, R: 12.4, rot: Math.PI / 8 },
  { name: 'THE HUNTING GROUNDS', kind: 'circle', obs: [0, 1, 2, 3, 4].map(k => ({ x: Math.cos(-Math.PI / 2 + (k + 0.5) * TAU / 5) * 8.3, y: Math.sin(-Math.PI / 2 + (k + 0.5) * TAU / 5) * 8.3, r: 1.05, kind: 'tree' })) },
  { name: 'THE ROOFTOPS', kind: 'poly', n: 4, R: 12.3, rot: Math.PI / 4 },
  { name: 'THE COLOSSEUM', kind: 'circle', obs: [0, 1, 2, 3].map(k => ({ x: Math.cos(k * Math.PI / 2 + Math.PI / 4) * 8.6, y: Math.sin(k * Math.PI / 2 + Math.PI / 4) * 8.6, r: 1.3, kind: 'pillar' })) },
  { name: 'THE THRONE HALL', kind: 'circle' },
];
// the boundary's distance from the centre in direction th (ARENA_R for the round hall)
function shapeR5(A, th) {
  if (A.kind !== 'poly') return ARENA_R;
  const seg = TAU / A.n, d = ((th - A.rot - seg / 2) % seg + seg * 1.5) % seg - seg / 2;
  return A.R * Math.cos(Math.PI / A.n) / Math.cos(d);
}
// the current hall: during a change of weapon it morphs from the old shape to the new; the last stand closes in
function arena5(T) {
  const f = S.f5, A = ARENAS5[FORMS5[f.i].w], P = f.from >= 0 ? ARENAS5[FORMS5[f.from].w] : A, u = A === P ? 1 : smooth((T - f.mT) / Math.max(0.5, f.T - f.mT));
  const shrink = FORMS5[f.i].ai === 'knight3' ? lerp(1, 0.86, smooth((T - f.T - 2) / 18)) : 1;
  return { A, P, u, shrink, obs: u >= 0.999 ? A.obs || [] : [] };
}
function rimR5(th, T = S.T) { const a = arena5(T); return lerp(shapeR5(a.P, th), shapeR5(a.A, th), a.u) * a.shrink; }
// is (x, y) inside the hall with margin m (and clear of obstacles)? / pull a point inside
function inA5(x, y, m = 0, T = S.T) { if (Math.hypot(x, y) > rimR5(Math.atan2(y, x), T) - m) return false; return !arena5(T).obs.some(o => Math.hypot(x - o.x, y - o.y) < o.r + m); }
function intoA5(x, y, m = 0) {
  const r = Math.hypot(x, y), rb = rimR5(Math.atan2(y, x)) - m; if (r > rb) { x *= rb / r; y *= rb / r; }
  for (const o of arena5(S.T).obs) { const dx = x - o.x, dy = y - o.y, d = Math.hypot(dx, dy) || 1; if (d < o.r + m) { x = o.x + dx / d * (o.r + m); y = o.y + dy / d * (o.r + m); } }
  return [x, y];
}
// where a straight shot from (x, y) along th meets the wall: [distance, the wall's outward normal]
function wallHit5(x, y, th) {
  const A = arena5(S.T).A, ux = Math.cos(th), uy = Math.sin(th);
  if (A.kind !== 'poly') { const b = x * ux + y * uy, c = x * x + y * y - ARENA_R * ARENA_R, s = -b + Math.sqrt(Math.max(0, b * b - c)); return [s, Math.atan2(y + uy * s, x + ux * s)]; }
  let best = [Infinity, 0];
  for (let k = 0; k < A.n; k++) {
    const nth = A.rot + (k + 0.5) * TAU / A.n, nx = Math.cos(nth), ny = Math.sin(nth), den = ux * nx + uy * ny;
    if (den <= 1e-9) continue;
    const s = (A.R * Math.cos(Math.PI / A.n) - (x * nx + y * ny)) / den; if (s > 1e-6 && s < best[0]) best = [s, nth];
  }
  return best;
}
// how far a straight shot from (x, y) along th flies before a tree or a pillar stops it
function coverS5(x, y, th) {
  let best = Infinity; const ux = Math.cos(th), uy = Math.sin(th);
  for (const o of arena5(S.T).obs) { const cx = o.x - x, cy = o.y - y, p = cx * ux + cy * uy, q = cx * cx + cy * cy - p * p, r = o.r * 0.9; if (p > 0 && q < r * r) best = Math.min(best, p - Math.sqrt(r * r - q)); }
  return best;
}

// ---------- the Knight's movement: an anchor that glides (charges, walks) or drops from the sky ----------
function bossAt5(T, wt) {
  const o = { x: HOME5.x, y: HOME5.y, z: 0, form: 0 }, f = S.f5;
  if (T < TL.land) { o.z = 7 * Math.pow(1 - sat((T - TL.run) / (TL.land - TL.run)), 2); return o; }
  if (T >= T_KILL && S.killPos) return Object.assign(o, S.killPos);
  if (!knight5()) { if (!(T < TL.land + 1.6 && f.log.length === 1)) o.y = -60; return o; }   // while his heroes fight, he watches from beyond the hall
  let ax = HOME5.x, ay = HOME5.y;
  for (const m of S.mv5) {
    if (T < m.T0) { if (m.drop) { o.y = -60; return o; } break; }
    if (T >= m.T1) { ax = m.x1; ay = m.y1; continue; }
    const u = (T - m.T0) / (m.T1 - m.T0), k = m.ease ? smooth(u) : u;
    ax = lerp(m.x0 ?? ax, m.x1, k); ay = lerp(m.y0 ?? ay, m.y1, k);
    if (m.hop) o.z = m.hop * Math.sin(Math.PI * u); if (m.drop) o.z = m.drop * Math.pow(1 - u, 2);
    break;
  }
  o.x = ax; o.y = ay;
  return o;
}
function moveTo5(T0, T1, x1, y1, ease, hop) {   // glide (or leap) from wherever the anchor is at T0
  let ax = HOME5.x, ay = HOME5.y;
  for (const m of S.mv5) { if (m.T0 > T0) break; ax = T0 >= m.T1 ? m.x1 : lerp(m.x0 ?? ax, m.x1, (T0 - m.T0) / (m.T1 - m.T0)); ay = T0 >= m.T1 ? m.y1 : lerp(m.y0 ?? ay, m.y1, (T0 - m.T0) / (m.T1 - m.T0)); }
  S.mv5.push({ T0, T1, x0: ax, y0: ay, x1, y1, ease, hop });
}
// while he charges his body does not shove you: a clean sidestep is always enough
const moving5 = T => S.mv5.some(m => T >= m.T0 && T < m.T1);

// ---------- the weak point: his stolen soul circles his chest ----------
function wpPos5(T, wt, b) { const a = 0.62 * wt + 0.7 * Math.sin(0.45 * wt); return { x: b.x + WP_ORB5 * Math.cos(a), y: b.y - b.z + 0.8 * WP_ORB5 * Math.sin(a) }; }

// ---------- camera: frame you and whoever you are fighting ----------
function updateCam5(T) {
  const c = S.cam, wf = S.wf, px = S.hx[wf], py = S.hy[wf], b = S.boss, by = b.y - b.z;
  let tx, ty, z;
  if (knight5() || T < TL.land + 1.6) {
    const top = Math.min(py - 0.75, by - 4.4), bot = Math.max(py + 0.8, by + 3.9); z = 0.62;
    tx = (Math.min(px - 0.6, b.x - 3.2) + Math.max(px + 0.6, b.x + 3.2)) / 2; ty = (top + bot) / 2 + (GH * 0.54 - CAM_MID) / (TILE * z);
    if (b.y < -30) { tx = px * 0.5; ty = py * 0.5; }
  } else {   // a party: fit you and the heroes still standing
    let x0 = px - 1.5, x1 = px + 1.5, y0 = py - 1.5, y1 = py + 1.2;
    for (const h of S.heroes) if (h.deadT === Infinity || T < h.deadT + 1) { x0 = Math.min(x0, h.x - 2.2); x1 = Math.max(x1, h.x + 2.2); y0 = Math.min(y0, h.y - h.z - 2.6); y1 = Math.max(y1, h.y + 1.6); }
    z = clamp(Math.min(GW / ((x1 - x0) * TILE), (GH - 190) / ((y1 - y0) * TILE)), 0.56, S.f5.chase && T < S.f5.chase.end + 0.5 ? 0.6 : 0.68);
    tx = (x0 + x1) / 2; ty = (y0 + y1) / 2 + (GH * 0.54 - CAM_MID) / (TILE * z);
  }
  if (T < TL.land + 0.5) { tx = lerp(px, 0, 0.45); ty = lerp(py, 1.2, 0.45); z = 0.64; }
  if (T >= T_KILL && T < T_KILL + 3.2) { tx = lerp(tx, b.x, 0.5); ty = lerp(ty, b.y - b.z - 0.8, 0.5); z = 0.76; }
  const k = S.f < 2 ? 1 : 1 - Math.exp(-6 / FPS);
  c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.z += (z - c.z) * (1 - Math.exp(-1.6 / FPS));
}

// ---------- pattern helpers ----------
// a bullet; straight shots may ricochet once off the hall's walls (bounce) or stop at trees and pillars (cover)
let SRC5 = '';   // (a label for whatever is firing, for the balance audits)
function e5(t, o) {
  const b = emitB(t, Object.assign({ raw: 1 }, o, { src: o.src || SRC5 }));
  if ((o.bounce || o.cover) && !o.w && !o.ar && !o.wa) {
    const x = o.cx + (o.r0 || 0) * Math.cos(o.th), y = o.cy + (o.r0 || 0) * Math.sin(o.th), v = o.vr, L = (o.life || 5) * v;
    if (o.cover) { const s = coverS5(x, y, o.th); if (s < L) { b.life = s / v; return b; } }
    if (o.bounce) {
      const [s, nth] = wallHit5(x, y, o.th);
      if (s < L) { b.life = s / v; const dl = (o.dl || 0) + s / v; e5(t, Object.assign({}, o, { cx: x + Math.cos(o.th) * s, cy: y + Math.sin(o.th) * s, r0: 0, th: Math.PI + 2 * nth - o.th, dl, rv: t + dl, tg: 1, hid: 1, cont: 1, bounce: 0, life: (L - s) / v })); }
    }
  }
  return b;
}
const aimA = (x, y) => Math.atan2(S.p.y - y, S.p.x - x);
// where you will be when a shot of speed spd from (x, y) arrives, if you keep moving (k < 1 leads you by less)
function leadP(x, y, spd, k = 1) { const p = S.p, tau = Math.min(1.2, Math.hypot(p.x - x, p.y - y) / spd) * k; return intoA5(p.x + p.vx * tau, p.y + p.vy * tau, 0.6); }
const leadA = (x, y, spd, k) => { const [tx, ty] = leadP(x, y, spd, k); return Math.atan2(ty - y, tx - x); };
// a hero calls out the item it is using, the way the realm names every drop
const item5 = (h, text, t) => S.fx.push({ T: t, type: 'item', text, h });
function cyc5(T0, T1, start, len, fn) { if (T1 < start) return; const c0 = Math.max(0, Math.floor((T0 - start) / len)), c1 = Math.floor((T1 - start) / len); for (let c = c0; c <= c1; c++) fn(start + c * len, c); }
const once5 = (T0, T1, t) => T0 < t && T1 >= t;
function ring5(t, x, y, n, spd, k, off = 0, o = {}) {
  for (let i = 0; i < n; i++) {
    const f = i / n;
    if (o.gaps && o.gaps.some(([f0, fw]) => (((f - f0) % 1) + 1) % 1 < fw)) continue;
    e5(t, Object.assign({ cx: x, cy: y, r0: o.r0 ?? 1.8, vr: spd, th: off + f * TAU, k, life: o.life || 6, w: o.w || 0, ar: o.ar || 0, stop: o.stop, vk: o.vk, src: o.src, dl: o.dl, arm: o.arm,
      osc: o.osc || 0, of: o.of || 0, op: i * (o.opi || 0), wa: o.wa || 0, wf: o.wf || 0, wp: (o.wp || 0) + i * (o.wpi || 0), cover: o.cover, bounce: o.bounce },
      o.tele ? { dl: o.tele, rv: t + o.tele, tg: 1, rg: 1, hid: o.hid || 0, arm: o.tele + 0.15 } : {}));   // spawn grace counts from when it appears
  }
  S.ev.push({ T: t + (o.tele || 0), type: 'ring', n, k });
}
function fan5(t, x, y, n, spread, spd, k, o = {}) {
  const a = o.th ?? Math.atan2((o.ty ?? S.p.y) - y, (o.tx ?? S.p.x) - x);
  for (let i = 0; i < n; i++) e5(t, { cx: x, cy: y, r0: o.r0 ?? 1.4, vr: spd, th: a + (i - (n - 1) / 2) * spread, k, life: o.life || 4, ar: o.ar || 0, stop: o.stop, vk: o.vk, src: o.src, wa: o.wa || 0, wf: o.wf || 0, wp: o.wp || 0, cover: o.cover, bounce: o.bounce });
  S.ev.push({ T: t, type: 'aim', n, k });
}
// staff bolts fly in braided pairs, like your own staff's
function braid5(t, x, y, th, spd, k, amp = 0.45, life = 3) { for (const ph of [0, Math.PI]) e5(t, { cx: x, cy: y, r0: 1.8, vr: spd, th, k, wa: amp, wf: 9, wp: ph, life }); }
// a ring that starts beyond the rim and closes in; the rim marks each entry point meanwhile
function conv5(t, n, spd, k, off, gaps, o = {}) {
  const LEAD = o.lead ?? 0.8, L = spd * LEAD, n0 = S.bb.length, w = o.w || 0;
  ring5(t, 0, 0, n, -spd, k, off, { r0: 12.4 + L, life: (12.4 + L - (o.r1 ?? 2.8)) / spd, gaps, w, vk: o.vk });
  S.tele.push({ kind: 'rim', t0: wtAt(t), t1: wtAt(t) + LEAD, col: o.col, pts: S.bb.slice(n0).map(q => { const a = q.th + w * LEAD; return [Math.cos(a) * ARENA_R, Math.sin(a) * ARENA_R, a + Math.PI]; }) });
}
// something thrown: lands at (x1, y1) after fl s, hurts within r there, and bursts
function lob5(t, x0, y0, x1, y1, o) {
  [x1, y1] = intoA5(x1, y1, 1.2);
  const fl = o.fl || 0.9, t0 = wtAt(t), B = o.burst;
  S.lobs.push({ t0, tl: t0 + fl, x0, y0, x1, y1, kind: o.kind, r: o.r ?? 0.9, dmg: o.dmg ?? 150 });
  if (B) { const off = S.rng() * TAU; for (let i = 0; i < B.n; i++) e5(t, { dl: fl + (B.delay || 0), rv: t + fl + (B.delay || 0), tg: 1, hid: 1, arm: fl + (B.delay || 0) + 0.15, cx: x1, cy: y1, r0: B.r0 ?? 0.6, vr: B.spd, th: off + i * TAU / B.n, k: B.k, w: (B.w || 0), ar: B.ar || 0, stop: B.stop, life: B.life || 3, vk: B.vk }); }
  S.ev.push({ T: t, type: 'lob5', kind: o.kind }); S.ev.push({ T: t + fl, type: 'land5', kind: o.kind });
  return [x1, y1];
}
// a strike from above: a telegraphed circle, then the hit (and an optional burst)
function pillar5(t, x, y, o = {}) {
  [x, y] = intoA5(x, y, 1.0);
  const t0 = wtAt(t), tl = o.tele ?? 0.75, B = o.burst;
  S.pillars.push({ t0, ti: t0 + tl, x, y, r: o.r ?? 1.0, done: false, kind: o.kind || 'light', dmg: o.dmg ?? 150 });
  if (B) { const off = B.off ?? S.rng() * TAU; for (let i = 0; i < B.n; i++) e5(t, { dl: tl, rv: t + tl, tg: 1, hid: 1, arm: tl + 0.1, cx: x, cy: y, r0: 0.3, vr: B.spd, th: off + i * TAU / B.n, k: B.k, life: B.life || 3 }); }
  S.ev.push({ T: t + tl, type: 'strike5', kind: o.kind });
}
// a wall that enters from beyond the rim and crosses the arena along dir; gaps are [offset, half width] along the wall
function curtain5(t, dir, spd, spacing, gaps, k, o = {}) {
  const LEAD = o.lead ?? 0.7, L = spd * LEAD, ux = Math.cos(dir), uy = Math.sin(dir), px = -uy, py = ux, pts = [];
  for (let s = -12; s <= 12; s += spacing) {
    if (gaps.some(([g, hw]) => Math.abs(s - g) < hw)) continue;
    const d = Math.sqrt(Math.max(0, ARENA_R * ARENA_R - s * s)) - 0.2, x0 = px * s - ux * d, y0 = py * s - uy * d;
    e5(t, { cx: x0 - ux * L, cy: y0 - uy * L, r0: 0, vr: spd, th: dir, k, life: (2 * d + L) / spd, vk: o.vk, wa: o.wa || 0, wf: o.wf || 0, wp: o.wp || 0, cover: o.cover });
    pts.push([x0, y0, dir]);
  }
  S.tele.push({ kind: o.tk || 'sand', t0: wtAt(t), t1: wtAt(t) + LEAD, pts });
}
// long sweeping arms of segments around (cx, cy); like the clock hands, drawn by setPiece: a ghost first, then tiles
function arms5(t, dl, rv, B0, arms, cx, cy, k) {
  for (const h of arms) {
    const th = h.th0 + h.w * (t + dl - B0);
    for (let r = h.r0; r <= h.r1 + 1e-6; r += 0.42) {
      if (h.gaps.some(([a, z]) => r > a && r < z)) continue;
      e5(t, { cx, cy, r0: r, th, w: h.w, k, dl, life: HAND_SEG, rv, tg: 1, cont: !dl });
    }
  }
}
// the next arm to reach your angle and its safe lane: { r (lane centre), g: [r0, r1], tt (s until it arrives), L }
function lane5(px, py, T) {
  let best = null;
  for (const L of S.lanes5) {
    if (T < L.T0 || T >= L.T1) continue;
    const pa = Math.atan2(py - L.cy, px - L.cx), pr = Math.hypot(px - L.cx, py - L.cy);
    for (const h of L.arms) {
      if (pr > h.r1 + 0.6 || !h.gaps.length) continue;
      const th = h.th0 + h.w * (T - L.B0), tt = (((pa - th) * Math.sign(h.w)) % TAU + TAU) % TAU / Math.abs(h.w);
      if (!best || tt < best.tt) best = { L, h, tt };
    }
  }
  if (!best) return null;
  const pr = Math.hypot(px - best.L.cx, py - best.L.cy);
  let g = best.h.gaps[0]; for (const q of best.h.gaps) if (Math.abs(pr - (q[0] + q[1]) / 2) < Math.abs(pr - (g[0] + g[1]) / 2)) g = q;
  return { L: best.L, h: best.h, g, r: (g[0] + g[1]) / 2, tt: best.tt };
}
// every matching live bullet stops where it is for `hold` s, then flies off as fn(x, y, n, bullet) says
function freeze5(T, pred, hold, fn) {
  const snap = []; let n = 0;
  for (let i = S.bbStart; i < S.bb.length; i++) {
    const q = S.bb[i]; if (!pred(q) || !balive(q, S.wt) || T < q.rv || S.wt < q.t0 + q.dl) continue;
    bpos(q, S.wt); const x = BX, y = BY; if (Math.hypot(x, y) > 12.3) continue;
    const o = fn(x, y, n++, q); q.hit = S.wt; snap.push([x, y, q.k]);
    e5(T, Object.assign({ cx: x, cy: y, r0: 0, dl: hold, cont: 1, T0: q.T0, k: 'frost' }, o));
  }
  return snap;
}
// Sorcerer's chain lightning: a jagged bolt from his scepter through the ground near you, hopping on; it strikes after tele s
function chain5(t, x0, y0, hops, tele) {
  const R = S.rng, pts = [[x0, y0]];
  let x = S.p.x + (R() - 0.5) * 3, y = S.p.y + (R() - 0.5) * 3;
  for (let h = 0; h < hops; h++) {
    [x, y] = intoA5(x, y, 0.8); pts.push([x, y]);
    const a = Math.atan2(-y, -x) + (R() - 0.5) * 2.4; x += Math.cos(a) * 5; y += Math.sin(a) * 5;
  }
  const line = [];
  for (let s = 1; s < pts.length; s++) {
    const [ax, ay] = pts[s - 1], [bx, by] = pts[s], L = Math.hypot(bx - ax, by - ay) || 1, m = Math.ceil(L / 0.42), a = Math.atan2(by - ay, bx - ax);
    for (let j = 0; j < m; j++) { const u = j / m, jit = j ? (R() - 0.5) * 0.45 : 0; line.push([lerp(ax, bx, u) - (by - ay) / L * jit, lerp(ay, by, u) + (bx - ax) / L * jit, a]); }
  }
  strike5(t, line, tele, 2, 2.7, 2.6, (px, py) => Math.hypot(px - x0, py - y0) < 2.2);
}
// a straight bolt of lightning from (x0, y0) to (x1, y1): the thread shows for tele s, then it strikes and throws sparks off both sides
function bolt5(t, x0, y0, x1, y1, tele) {
  const L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0), m = Math.ceil(L / 0.42), R = S.rng, line = [];
  for (let j = 0; j <= m; j++) { const u = j / m, jit = j && j < m ? (R() - 0.5) * 0.3 : 0; line.push([lerp(x0, x1, u) - Math.sin(a) * jit, lerp(y0, y1, u) + Math.cos(a) * jit, a]); }
  strike5(t, line, tele, 3, 2.4, 2.2);
}
// a line of lightning points [x, y, heading]: the bolt itself for a flash, then sparks (spd, life) flying off every `every` points, alternate sides
function strike5(t, line, tele, every, spd, life, skip) {
  S.tele.push({ kind: 'bolt', t0: wtAt(t), t1: wtAt(t) + tele, pts: line });
  line.forEach(([px, py, a], j) => {
    if (skip && skip(px, py)) return;
    e5(t, { cx: px, cy: py, r0: 0, vr: 0, th: a, dl: tele, rv: t + tele, tg: 1, hid: 1, cont: 1, k: 'spark', life: 0.22 });
    if (j % every === 0) e5(t, { cx: px, cy: py, r0: 0.25, vr: spd, th: a + (j % (2 * every) ? 1 : -1) * Math.PI / 2, dl: tele, rv: t + tele, tg: 1, hid: 1, arm: tele + 0.15, k: 'spark', life });
  });
  S.ev.push({ T: t + tele, type: 'chain' });
}
// bullets that run along a polyline (a comet tracing a constellation, souls tracing a pentagram): each leg is its own
// bullet, revealed as the runner reaches it; the path shows for tele s first. at(t, x, y, q) fires as the runner leaves point q
function path5(t, pts, spd, k, o = {}) {
  const tele = o.tele ?? 1, n = o.n || 1, gap = o.gap || 0.05, t0 = wtAt(t);
  const tel = { kind: 'path', t0, tr: t0 + tele, t1: t0 + tele, pts, col: o.col || 'p' }; S.tele.push(tel);
  let s = 0;
  for (let q = 1; q < pts.length; q++) {
    const [ax, ay] = pts[q - 1], [bx, by] = pts[q], L = Math.hypot(bx - ax, by - ay), th = Math.atan2(by - ay, bx - ax);
    for (let j = 0; j < n; j++) { const dl = tele + j * gap + s / spd; e5(t, { cx: ax, cy: ay, r0: 0, vr: spd, th, k, dl, rv: t + dl, tg: 1, hid: 1, cont: 1, life: L / spd }); }
    if (o.at) o.at(t + tele + s / spd, ax, ay, q - 1);
    s += L;
  }
  tel.t1 = t0 + tele + s / spd + 0.1;   // the lines stay lit until the runners have passed
  S.ev.push({ T: t + tele, type: 'path' });
}
// a lance of light that caroms off the walls n times, with a trail of motes that burns a moment behind it
function lance5(t, x, y, th, spd, n) {
  let s0 = 0, px = x + Math.cos(th) * 1.5, py = y + Math.sin(th) * 1.5;
  for (let j = 0; j <= n; j++) {
    const [s, nth] = wallHit5(px, py, th), dl = s0 / spd;
    e5(t, { cx: px, cy: py, r0: 0, vr: spd, th, k: 'lance', dl, rv: j ? t + dl : 0, tg: j ? 1 : 0, hid: j ? 1 : 0, cont: j ? 1 : 0, life: s / spd });
    for (let d = 0.6; d < s; d += 0.55) { const dd = (s0 + d) / spd + 0.05; e5(t, { cx: px + Math.cos(th) * d, cy: py + Math.sin(th) * d, r0: 0, vr: 0, th, k: 'mote', dl: dd, rv: t + dd, tg: 1, hid: 1, cont: 1, life: 0.8 }); }
    px += Math.cos(th) * s; py += Math.sin(th) * s; th = Math.PI + 2 * nth - th; s0 += s;
  }
  S.ev.push({ T: t, type: 'lance' });
}
// a prism that splits in three after 0.7 s (and each of those again): gens generations
function fission5(t, x, y, th, gens, r0 = 1.0, spd = 5, dl = 0) {
  const L = 0.7;
  e5(t, { cx: x, cy: y, r0, vr: spd, th, k: 'prism', dl, rv: dl ? t + dl : 0, tg: dl ? 1 : 0, hid: dl ? 1 : 0, cont: dl ? 1 : 0, life: gens ? L : 1.6 });
  if (!gens) return;
  const r1 = r0 + spd * L, cx = x + Math.cos(th) * r1, cy = y + Math.sin(th) * r1;
  for (const o of [-0.45, 0, 0.45]) fission5(t, cx, cy, th + o, gens - 1, 0, spd + 0.6, dl + L);
}
// Huntress traps: thrown; armed arm s after they land; they snap into a ring when you come within r (or when their time is up)
function trap5(t, x0, y0, x1, y1, o) {
  [x1, y1] = lob5(t, x0, y0, x1, y1, { kind: 'trap', fl: o.fl, r: 0 });
  S.traps.push({ x: x1, y: y1, tl: t + o.fl, ta: t + o.fl + o.arm, until: t + o.fl + o.life, r: o.r, n: o.n, spd: o.spd, snapT: Infinity, owner: o.owner });
}
function traps5(T) {
  for (const q of S.traps) {
    if (q.snapT !== Infinity || T < q.ta) continue;
    if (T >= q.until || Math.hypot(S.p.x - q.x, S.p.y - q.y) < q.r) { q.snapT = T; ring5(T, q.x, q.y, q.n, q.spd, 'trapShot', S.rng() * TAU, { r0: 0.4, life: 3 }); S.ev.push({ T, type: 'snap' }); }
  }
  S.traps = S.traps.filter(q => q.snapT > T - 0.5);
}
// a strike on a quarter of the hall (the Bard's encore): angles a0..a1 about the centre, telegraphed tele s ahead
function sector5(t, a0, a1, tele, o = {}) {
  const t0 = wtAt(t); S.zones5.push({ t0, ti: t0 + tele, a0, a1, n: o.n, dmg: o.dmg ?? 140, done: false });
  S.ev.push({ T: t + tele, type: 'sector' });
}
// is (x, y) within pad of the slice?
function inSector5(z, x, y, pad = 0) {
  const r = Math.hypot(x, y), d = ((Math.atan2(y, x) - z.a0) % TAU + TAU) % TAU, w = z.a1 - z.a0;
  if (d < w) return true;
  const off = Math.min(d - w, TAU - d); return off < Math.PI / 2 && r * Math.sin(off) < pad;
}
function collide5(T, wt, hit) {
  const p = S.p;
  for (const z of S.zones5) if (!z.done && wt >= z.ti) { z.done = true; if (!hit && inSector5(z, p.x, p.y, P_R + S.botPad)) { if (S.log) S.log.push({ T, ph: phaseOf(T) + 1, k: 'sector', age: wt - z.t0 }); hurt(T, wt, z.dmg * TUNE.bulletMul); hit = true; } }
  return hit;
}
// the Knight's shield charge: the path shows first; he runs it and his shield carries a wall of steel
function charge5(t, tl, spd) {
  const b = S.boss, p = S.p, a = Math.atan2(p.y - b.y, p.x - b.x);
  let d = Math.hypot(p.x - b.x, p.y - b.y) + 1.5;
  while (d > 1 && !inA5(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, S.bodyR + 0.6)) d -= 0.25;
  const x1 = b.x + Math.cos(a) * d, y1 = b.y + Math.sin(a) * d, dur = d / spd, tc = t + tl, ux = Math.cos(a), uy = Math.sin(a);
  S.tele.push({ kind: 'charge', t0: wtAt(t), t1: wtAt(tc + dur), tc: wtAt(tc), x0: b.x, y0: b.y, x1, y1, w: S.bodyR });
  moveTo5(tc, tc + dur, x1, y1);
  for (let j = -3; j <= 3; j++) e5(t, { cx: b.x + ux * (S.bodyR + 0.15) - uy * j * 0.5, cy: b.y + uy * (S.bodyR + 0.15) + ux * j * 0.5, r0: 0, vr: spd, th: a, k: 'kwall', dl: tl, rv: tc, tg: 1, cont: 1, life: dur + 0.02 });
  const g = S.rng();
  ring5(t, x1, y1, 30, 3.4, 'kwall', 0, { r0: S.bodyR - 0.4, tele: tl + dur, hid: 1, gaps: [[g, 4 / 30], [g + 0.5, 4 / 30]] });
  S.ev.push({ T: t, type: 'chargeUp' }); S.ev.push({ T: tc, type: 'charge' }); S.ev.push({ T: tc + dur, type: 'impact' }); S.fx.push({ T: tc + dur, type: 'boom', x: x1, y: y1, s: 1.2 });
  return tc + dur;
}

// ---------- VI. THE KNIGHT: Oryx himself ----------
// the Last Stand's pacing: a new layer every `step` s of his clock (your hits run it faster, so they bring the layers on sooner: everyone
// sees the same storm, and a strong hand sees it in less time); the periods of its shield rings (of ringN shields), blade showers, aimed
// fans and spiral arms, and how much faster it all comes in the last layer. For the last `rot` s of his clock the storm gives way to the
// Last Sweep: his blade turns through the hall at `spin` rad/s with one safe lane, and the periods of its gated rings, blade fans, sword
// strikes on you, and (from chT s in) the chasers
const LS5 = { step: 8.75, ring: 1.3, ringN: 50, shower: 0.11, fan: 1.05, arm: 0.235, over: 1.2, rot: 25, spin: 0.5, ring2: 1.2, fan2: 0.75, pil: 1.0, ch: 2.2, chT: 8 };
const AI5 = {
  knight1(T0, T1, B0) {   // SHIELD CHARGE: he runs you down along a marked path, and the impact rings out
    const b = S.boss;
    if (once5(T0, T1, B0 + 0.3)) S.fx.push({ T: B0 + 0.3, type: 'item', text: 'SHIELD OF OGMUR', h: null });
    cyc5(T0, T1, B0, 10, (B, c) => {
      for (const [t] of ticks(T0, T1, B + 0.3, B + 10, per5(2.3))) charge5(t, 1.0, 11.5);
      for (const [t] of ticks(T0, T1, B + 0.6, B + 10, per5(0.95))) fan5(t, b.x, b.y, 3, 0.22, 8, 'blade', { r0: 2.4 });
      for (const [t, k] of ticks(T0, T1, B + 1.4, B + 10, per5(1.25))) ring5(t, b.x, b.y, 30, 3.0, 'nova', k * 0.41, { r0: 2.4 });
    });
  },
  knight2(T0, T1, B0) {   // BLADESTORM: his sword and its phantom sweep the whole hall; each has a different gap, so change lanes between them
    const b = S.boss, R = S.rng, Bs = B0 + 1.5;
    const arms = [{ th0: -Math.PI / 2, w: 0.48, r0: 3.1, r1: 12.4, gaps: [[5.2, 7.2]] }, { th0: Math.PI / 2, w: 0.48, r0: 3.1, r1: 12.4, gaps: [[8.6, 10.6]] }];
    if (!S.f5.st.lane) { S.f5.st.lane = 1; S.lanes5.push({ T0: B0, T1: Infinity, cx: 0, cy: 0, B0: Bs, arms, k: 'kblade' }); }
    setPiece(T0, T1, Bs, 1e9, Infinity, (t, dl, rv) => arms5(t, dl, rv, Bs, arms, 0, 0, 'kblade'));
    for (const [t] of ticks(T0, T1, B0 + 1.8, Infinity, per5(0.55))) { pillar5(t, S.p.x, S.p.y, { kind: 'sword', tele: 0.8, r: 0.9, dmg: 160, burst: { n: 4, spd: 3.0, k: 'blade', life: 2.5 } }); const a = R() * TAU; pillar5(t, S.p.x + Math.cos(a) * 2.5, S.p.y + Math.sin(a) * 2.5, { kind: 'sword', tele: 0.8, r: 0.9, dmg: 160 }); }   // the second sword only blocks the way
    for (const [t, k] of ticks(T0, T1, B0 + 2.5, Infinity, per5(1.2))) { const g = R(); ring5(t, b.x, b.y, 52, 3.6, 'nova', k * 0.3, { r0: 3.0, gaps: [[g, 3 / 52], [g + 0.5, 3 / 52]] }); }
    for (const [t] of ticks(T0, T1, B0 + 2.0, Infinity, per5(0.8))) fan5(t, b.x, b.y, 5, 0.15, 8.5, 'blade', { r0: 2.8 });
  },
  knight3(T0, T1, B0) {   // LAST STAND: first a storm of every sword he took, read and threaded where you stand; then the Last Sweep
    const L5 = LS5, f = S.f5, b = S.boss, R = S.rng, left = survLeft5(T1), far = 14;   // (far: every shot is gone once it is past the wall)
    if (left > L5.rot) {   // I. THE STORM: a new layer every L5.step s of his clock
      const lvl = Math.floor(Math.max(0, f.sv.base - left) / L5.step), F = lvl >= 3 ? L5.over : 1;
      // the Shield of Ogmur: slow rings of shields with no gap; slip between two plates as each one passes (they spread wider farther out)
      for (const [t] of ticks(T0, T1, B0, Infinity, per5(L5.ring / F))) ring5(t, b.x, b.y, L5.ringN, 2.6, 'kwall', R() * TAU, { r0: 3.0, life: (far - 3) / 2.6 });
      // a shower of blades flung every way, each a golden angle on from the last: they spread evenly, in three speeds
      for (const [t, k] of ticks(T0, T1, B0 + 0.4, Infinity, per5(L5.shower / F))) for (let j = 0; j < 3; j++) { const v = 3.5 + 1.5 * j; e5(t, { cx: b.x, cy: b.y, r0: 2.8, vr: v, th: (3 * k + j) * GOLD5, k: 'blade', life: (far - 2.8) / v }); }
      // then fans at where you stand: a short step aside is enough
      if (lvl >= 1) for (const [t] of ticks(T0, T1, B0, Infinity, per5(L5.fan / F))) fan5(t, b.x, b.y, 7, 0.12, 8, 'blade', { r0: 2.6, life: (far - 2.6) / 8 });
      // then two sets of spiral arms turning against each other: a lattice that drifts past you
      if (lvl >= 2) for (const [t] of ticks(T0, T1, B0, Infinity, per5(L5.arm / F))) { const u = t - B0; for (let a = 0; a < 4; a++) for (const d of [1, -1]) e5(t, { cx: b.x, cy: b.y, r0: 2.8, vr: 4, th: d * 0.45 * u + a * Math.PI / 2 + (d < 0 ? Math.PI / 4 : 0), k: 'nova', life: (far - 2.8) / 4 }); }
      return;
    }
    // II. THE LAST SWEEP: the storm clears, and his great blade turns through the hall; stand in its lane as it passes, and run the lane
    // to the gaps of his rings while swords fall where you stand
    const st = f.st;
    if (st.sw === undefined) {
      st.sw = T1; const Bs = T1 + 1.5, arms = [{ th0: Math.atan2(S.p.y, S.p.x) + Math.PI, w: L5.spin, r0: 3.1, r1: 12.4, gaps: [[6.4, 8.4]] }];   // (it rises across the hall from you)
      st.lane = { Bs, arms }; S.lanes5.push({ T0: T1, T1: Infinity, cx: 0, cy: 0, B0: Bs, arms, k: 'kblade' });
      dissolve(() => true, T1); S.pillars = []; S.tele = [];
      S.fx.push({ T: T1, type: 'wave', text: 'THE LAST SWEEP' }); S.ev.push({ T: T1, type: 'wave' }); S.fx.push({ T: T1 + 0.3, type: 'item', text: 'CRYSTAL SWORD', h: null });
    }
    const s0 = st.sw, { Bs, arms } = st.lane;
    setPiece(T0, T1, Bs, 1e9, Infinity, (t, dl, rv) => arms5(t, dl, rv, Bs, arms, 0, 0, 'kblade'));
    for (const [t] of ticks(T0, T1, s0 + 1.0, Infinity, per5(L5.ring2))) { const g = R(); ring5(t, b.x, b.y, 56, 4.6, 'kwall', R() * TAU, { r0: 3.0, gaps: [0, 1 / 3, 2 / 3].map(q => [g + q, 4 / 56]) }); }
    for (const [t] of ticks(T0, T1, s0 + 1.3, Infinity, per5(L5.fan2))) fan5(t, b.x, b.y, 6, 0.15, 9, 'blade', { r0: 2.6 });
    for (const [t] of ticks(T0, T1, s0 + 2.0, Infinity, per5(L5.pil))) pillar5(t, S.p.x, S.p.y, { kind: 'sword', tele: 0.8, r: 0.9, dmg: 160, burst: { n: 4, spd: 3.0, k: 'blade', life: 2.5 } });
    for (const [t, k] of ticks(T0, T1, s0 + L5.chT, Infinity, per5(L5.ch))) chasers(t, b.x, b.y, 4, k * 0.8);
  },
};

// ---------- minions: skeletons (the Necromancer's), hounds (the Huntress's), mirrors (the Summoner's), seals (the Paladin's) ----------
function spawnMob5(o) { const m = Object.assign({ T: S.T, dmg: 0, deadT: Infinity }, o); S.mobs.push(m); return m; }
function mobs5(T) {
  const dt = 1 / FPS, p = S.p, R = S.rng;
  for (const m of S.mobs) {
    if (m.deadT !== Infinity) { if (!m.done) { m.done = 1; if (!m.gone && m.kind === 'skel') ring5(T, m.x, m.y, 6, 2.6, 'bone', R() * TAU, { r0: 0.5, life: 3 }); } continue; }
    if (T < m.T) continue;
    const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1;
    if (m.kind === 'skel') {   // shambles toward you; stops at throwing range and hurls bones where you are going (the chase's sprinters crumble after it)
      if (m.until && T >= m.until) { m.deadT = T; continue; }
      const sp = m.sprint > T ? 5.2 : 2.0; if (d > (m.sprint > T ? 1.8 : 4.2)) { m.x += dx / d * sp * dt; m.y += dy / d * sp * dt; [m.x, m.y] = intoA5(m.x, m.y, 0.8); m.fx = dx; }
      if (T >= m.next) { m.next = T + per5(2.0); if (d > 2.5) fan5(T, m.x, m.y, 3, 0.2, 6.2, 'bone', { r0: 0.5, th: leadA(m.x, m.y, 6.2, 0.8) }); }
    } else if (m.kind === 'wolf') {   // circles you, then lunges straight through where you stand, leaving fangs in its wake
      if (m.dash && T >= m.dash.T1) m.dash = null;
      if (m.dash) { const u = sat((T - m.dash.T0) / (m.dash.T1 - m.dash.T0)); m.x = lerp(m.dash.x0, m.dash.x1, u); m.y = lerp(m.dash.y0, m.dash.y1, u); continue; }
      const hunt = S.f5.chase && T < S.f5.chase.end;   // (in a chase the hounds close in and lunge twice as often)
      m.a += m.dir * (hunt ? 1.6 : 1.1) * dt; const tx = p.x + Math.cos(m.a) * (hunt ? 4.2 : 5.2), ty = p.y + Math.sin(m.a) * (hunt ? 4.2 : 5.2);
      const ex = tx - m.x, ey = ty - m.y, ed = Math.hypot(ex, ey) || 1, sp = Math.min(ed * 3, hunt ? 11 : 8);
      m.x += ex / ed * sp * dt; m.y += ey / ed * sp * dt; [m.x, m.y] = intoA5(m.x, m.y, 0.8); m.fx = dx;
      if (T >= m.next) {
        m.next = T + per5(hunt ? 1.8 : 3.4);
        const a = Math.atan2(dy, dx), tl = 0.55, spd = 16, [x1, y1] = intoA5(m.x + Math.cos(a) * (d + 3), m.y + Math.sin(a) * (d + 3), 0.8), LL = Math.hypot(x1 - m.x, y1 - m.y), dur = LL / spd;
        S.tele.push({ kind: 'line', t0: wtAt(T), t1: wtAt(T) + tl, x: m.x, y: m.y, a, w: 0.35, len: LL });
        m.dash = { T0: T + tl, T1: T + tl + dur, x0: m.x, y0: m.y, x1, y1 };
        for (let s = 0.6; s < LL; s += 0.55) e5(T, { cx: m.x + Math.cos(a) * s, cy: m.y + Math.sin(a) * s, r0: 0, vr: 0, th: a, k: 'fang', dl: tl + s / spd, rv: T + tl + s / spd, tg: 1, hid: 1, cont: 1, life: 0.6 });
        ring5(T, x1, y1, 8, 3.5, 'fang', R() * TAU, { r0: 0.5, tele: tl + dur, hid: 1, life: 2.5 });
        S.ev.push({ T, type: 'growl' }); S.ev.push({ T: T + tl, type: 'lunge' });
      }
    } else if (m.kind === 'mirror') {   // in a chase her mirrors come after you, throwing shards
      if (S.f5.chase && T < S.f5.chase.end) { if (d > 3.5) { m.x += dx / d * 4.5 * dt; m.y0 += dy / d * 4.5 * dt; } if (T >= (m.next || 0)) { m.next = T + 0.7; fan5(T, m.x, m.y, 3, 0.16, 6, 'mshard', { r0: 0.9 }); } }
      m.y = m.y0 + 0.35 * Math.sin(T * 1.6 + m.sd);
    }
  }
}

// ---------- per frame: the stage's fighters, their summons and traps, and the survival clock ----------
function ai5(T0, T1) {
  const f = S.f5;
  if (f.sv && T1 >= f.T && survLeft5(T1) <= 0) trigger5(T1);   // the clock has run out
  const F = FORMS5[f.i];
  if (F.party && F.surv) colosseum5(T0, T1);
  else if (F.party) party5(T0, T1);
  else if (T1 >= f.T) { SRC5 = F.ai; AI5[F.ai](T0, T1, f.T); }
  SRC5 = 'minion'; mobs5(T1); traps5(T1);
  for (const m of S.mobs) { m.vx = (m.x - (m.lx ?? m.x)) * FPS; m.vy = (m.y - (m.ly ?? m.y)) * FPS; m.lx = m.x; m.ly = m.y; }   // (how fast each minion moves: shots lead it)
  for (const d of S.decoys) if (d.chase) {
    if (d.at && T1 >= d.at) { d.at = 0; dash5(d, T1, { spd: 15, tele: 0.55, k: 'prism', over: 4, trail: 0.4, col: 'w' }); }
    if (d.go && T1 >= d.go.T0) { const u = sat((T1 - d.go.T0) / (d.go.T1 - d.go.T0)); d.x = lerp(d.go.x0, d.go.x1, u); d.y = lerp(d.go.y0, d.go.y1, u); }
    if (T1 >= d.until) { ring5(T1, d.x, d.y, 10, 3.2, 'prism', S.rng() * TAU, { r0: 0.8 }); S.fx.push({ T: T1, type: 'prismPop', x: d.x, y: d.y }); }
  }
  S.decoys = S.decoys.filter(d => !d.chase || T1 < d.until);
  S.zones5 = S.zones5.filter(z => z.ti > S.wt - 0.5);
  if (S.mobs.length > 24) S.mobs = S.mobs.filter(m => m.deadT === Infinity || m.deadT > T1 - 2);
  while (S.mv5.length > 1 && S.mv5[1].T1 <= T1 - 0.5) S.mv5.shift();
}

// ---------- lines ----------
const LINES5 = {
  staff: [[0.3, 'My Conclave. Every spell they ever cast now answers to ME.']],
  wand: [[0.3, 'Sing, my Choir. Sing the hero to the grave.']],
  bow: [[0.3, 'The Hunt is on. Run, little prey.']],
  dagger: [[0.3, 'Night falls on the Rooftops. Watch your step.']],
  sword: [[0.3, 'The Colosseum! Entertain me, hero. Survive my champions.']],
  knight1: [[2.4, 'And I WILL NOT FALL.']],
  knight2: [[3.5, 'Feel the weight of every sword I have taken!']],
  knight3: [[6.5, 'I have worn ten thousand heroes! I will not lose to ONE!'], [12.5, 'Not like this... NEVER like this!']],
};
const MORPH_LINES5 = {
  wand: 'Staves? Mere sparks. Let the Choir sing.', bow: 'Enough magic. Now the Hunt begins.', dagger: 'Put out the lights.',
  sword: 'Steel, at last. Honest steel.', knight1: 'Enough. I will end you MYSELF.', knight2: 'No shield. Only the blade.', knight3: 'NOT LIKE THIS!',
};
function scriptEvents5(T0, T1) {
  const at = t => T0 < t && T1 >= t, b = S.boss, wt = S.wt, f = S.f5;
  if (at(TL.run)) { S.ev.push({ T: TL.run, type: 'portal' }); say(TL.run + 0.4, 'boss', S.practice ? 'Again? Very well.' : 'Four times heroes have ended me. So I took the heroes.'); }
  if (at(TL.land)) {
    S.ev.push({ T: TL.land, type: 'land' }); S.fx.push({ T: TL.land, type: 'land', x: HOME5.x, y: HOME5.y + 3.0 });
    S.parts.push({ t: wt, x: HOME5.x, y: HOME5.y + 3.0, n: 70, seed: 555, col: 'g', spd: 10, life: 1.2 });
  }
  for (const [o, text] of LINES5[FORMS5[f.i].ai] || []) { const t = f.T + o; if (at(t) && !S.dead && t < T_KILL) say(t, 'boss', text); }
  if (at(T_KILL)) { say(T_KILL + 0.7, 'boss', 'The realm... remembers... every hero...'); say(T_KILL + 2.7, 'sys', BOSS + ' has been defeated!'); }
  if (at(T_KILL + 2.4)) {
    const k = S.killPos || b;
    S.ev.push({ T: T1, type: 'explode' }); S.fx.push({ T: T1, type: 'explode', x: k.x, y: k.y - k.z });
    [['g', 140, 14, 2.2], ['w', 80, 17, 1.4], ['p', 60, 10, 2.0], ['gear', 60, 11, 2.4]].forEach(([col, n, spd, life], i) => S.parts.push({ t: wt, x: k.x, y: k.y - k.z, n, seed: 5000 + i * 97, col, spd, life }));
  }
  if (at(TL.results)) S.ev.push({ T: TL.results, type: 'results' });
}
