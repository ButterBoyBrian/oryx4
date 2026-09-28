'use strict';
// ================= Oryx V renderer: the Hall of Heroes, the parties of stolen heroes, and the Knight =================
let FLOOR5C, MINI5, NEB5, GRAVES5 = [], MORPH5 = new Map();
const BOSS5_S = 26, HERO5_S = 12.5;   // screen px per sprite texel at zoom 1: the Knight (x1.25), a hero
// per weapon: accent colour, floor tint, glow key
const WEAP5 = [
  { col: '#c77dff', tint: 'rgba(120,40,200,', glow: 'p' }, { col: '#fff3c0', tint: 'rgba(255,240,190,', glow: 'w' },
  { col: '#8fe07a', tint: 'rgba(60,160,60,', glow: 'e' }, { col: '#b58cff', tint: 'rgba(70,20,110,', glow: 'v' },
  { col: '#ff5a6e', tint: 'rgba(200,30,50,', glow: 'r' }, { col: '#ffd23f', tint: 'rgba(255,190,60,', glow: 'g' },
];
const PLAQ5 = FORM5_IDS.map((id, i) => ({ id, a: -Math.PI / 2 + i * TAU / 15, w: [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5][i] }));
const NAME5 = id => HERO5[id] ? HERO5[id].name.slice(4).toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : 'The Knight';
// a hero's plaque: 0 = still to come, 1 = fighting you now, 2 = beaten
function plaqueState5(i, T) {
  const q = PLAQ5[i], F = FORMS5[S.f5.i];
  if (T >= T_KILL) return 2;
  if (q.id === 'knight') return F.w === 5 ? 1 : 0;
  if (q.w !== F.w) return q.w < F.w ? 2 : 0;
  const h = S.heroes.find(c => c.id === q.id); return !h || h.deadT <= T ? 2 : 1;
}

function initRender5() {
  Object.assign(SPR.glow, { e: glowSprite('rgba(90,255,140,0.9)', 64), b: glowSprite('rgba(90,170,255,0.95)', 64), v: glowSprite('rgba(170,90,255,0.9)', 64), o: glowSprite('rgba(255,140,40,0.9)', 64), y: glowSprite('rgba(255,236,150,0.8)', 64) });
  for (const k in SPR5.b) SPR.b[k] = SPR5.b[k];
  SPR.b.holyB = SPR.b.holy; SPR.b.frost = SPR.b.frost || SPR.b.ice;
  Object.assign(SPR.b, { link: SPR5.b.sbolt, comet: SPR5.b.shur, lance: SPR5.b.holy, mote: SPR5.b.holy, venom: SPR5.b.bubble });
  for (const id of FORM5_IDS) { const f = SPR5.form[id]; f.white = tinted(f.body, '#ffffff', 1); f.rim = tinted(f.body, '#ffd23f', 1); f.black = tinted(f.body, '#000000', 1); }
  buildFloor5(); buildNeb5();
  // the hall's obstacles: trees of the hunting grounds, pillars of the colosseum
  SPR5.tree = gridPX(['.....gGGGg.....', '...gGGhGGGGg...', '..gGhhGGGGGGg..', '.gGGhGGGGGgGGg.', '.gGGGGGGgGGGGg.', 'gGGGGGgGGGGGGGg', 'gGGGGGGGGGGgGGg', 'gGgGGGGGGGGGGGg', '.gGGGGGGGGgGGg.', '.ggGGGgGGGGGgg.', '..ggggGGGgggg..', '....gbBBbgg....', '......bBb......', '......bBb......', '......bBb......', '.....bbBbb.....', '....bb.B.bb....'],
    { G: '#3f9a3a', g: '#1f5a24', h: '#8fd46a', B: '#8a5a2b', b: '#4a2a12' }).canvas('#0a1408');
  SPR5.pillar = gridPX(['.ddddddddd.', 'dYYYYYYYYYd', '.dyyyyyyyd.', '..wWWWWWm..', '..wWWWWWm..', '..wWmWWWm..', '..wWWWWWm..', '..wWWWWmm..', '..wWWWWWm..', '..wWmWWWm..', '..wWWWWWm..', '..wWWWWWm..', '.dyyyyyyyd.', 'dYYYYYYYYYd', 'ddddddddddd'],
    { W: '#c9c3d6', w: '#f2eefa', m: '#7d7690', Y: '#e6b93a', y: '#9a7215', d: '#5c410b' }).canvas('#0a0810');
  const rng = mulberry32(1234);
  for (let i = 0; i < 46; i++) { const a = rng() * TAU, r = 15 + rng() * 12; GRAVES5.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.8, k: Math.floor(rng() * 3), s: 3 + rng() * 3, p: 0.5 + rng() * 0.35, ph: rng() * TAU, ghost: rng() < 0.3 ? FORM5_IDS[Math.floor(rng() * 15)] : null }); }
}
function buildFloor5() {
  const C = Math.ceil(ARENA_R * 8) + 10, N = C * 2, p = new PX(N, N), stone = ['#17131f', '#1a1623', '#1d1826', '#161220', '#1b1624'];
  p.each((px, py, x, y) => {
    const dx = (px - C) / 8, dy = (py - C) / 8, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    if (r > ARENA_R) return 0;
    if (r > ARENA_R - 0.5) return r > ARENA_R - 0.14 ? '#2e2106' : r > ARENA_R - 0.3 ? '#e6b93a' : '#7a5a10';
    const tx = Math.floor(dx), ty = Math.floor(dy), lx = ((x - C) % 8 + 8) % 8, ly = ((y - C) % 8 + 8) % 8;
    let c = stone[Math.floor(hash(tx + 70, ty + 70, 9) * stone.length)];
    if (lx === 0 || ly === 0) c = '#0e0b14';
    const n = hash(x, y, 13); if (n < 0.04) c = '#241e30'; else if (n > 0.98) c = '#0f0c15';
    // the rose window: fifteen spokes of gold, one for every hero he took
    const seg = ((a + Math.PI / 2) / TAU * 15 % 1 + 1) % 1, spoke = Math.min(seg, 1 - seg) * TAU / 15 * r;
    if (r > 3.1 && r < 9.9 && spoke < 0.07) c = '#8a6512';
    if (r > 3.1 && r < 9.9 && spoke >= 0.07 && Math.floor(seg * 2) % 2 === 0 && hash(tx, ty, 21) < 0.5) c = c === '#0e0b14' ? c : '#1f1a2b';
    if (Math.abs(r - 9.9) < 0.1 || Math.abs(r - 6.6) < 0.06) c = '#9a7215';
    if (r > 10.0 && r < 12.1) c = (lx === 0 || ly === 0) ? '#0a0810' : hash(tx, ty, 31) < 0.5 ? '#120f19' : '#14111c';   // the gallery band
    if (r < 3.1) c = r > 2.9 ? '#e6b93a' : r > 2.72 ? '#5c410b' : Math.abs(r - 1.9) < 0.08 ? '#b4861c' : (Math.floor((a / TAU + 1) * 30) % 2 ? '#211a2c' : '#1c1626');   // the dais
    return c;
  });
  // the gallery: a plinth for every hero he took
  for (const q of PLAQ5) {
    const cx = C + Math.cos(q.a) * 11.05 * 8, cy = C + Math.sin(q.a) * 11.05 * 8;
    for (let j = -7; j <= 7; j++) for (let k = -7; k <= 7; k++) { const d = Math.max(Math.abs(j), Math.abs(k)); p.set(cx + j, cy + k, d > 6 ? '#9a7215' : d > 5 ? '#3a2a08' : '#0b0910'); }
  }
  FLOOR5C = p.canvas(null, 0);
  const x = FLOOR5C.getContext('2d'); x.imageSmoothingEnabled = false;
  x.globalAlpha = 0.72;   // a mosaic, not a portrait: the bullets must read over it
  for (const q of PLAQ5) { const ic = SPR5.icon[q.id], cx = Math.round(C + Math.cos(q.a) * 11.05 * 8), cy = Math.round(C + Math.sin(q.a) * 11.05 * 8); x.drawImage(ic, cx - ic.width / 2, cy - ic.height / 2); }
  x.globalAlpha = 1;
  MINI5 = mkCanvas(300, 300); const mx = MINI5.getContext('2d'); mx.imageSmoothingEnabled = true; mx.drawImage(FLOOR5C, 0, 0, 300, 300);
}
function buildNeb5() {
  NEB5 = mkCanvas(2200, 1600);
  const x = NEB5.getContext('2d'), rng = mulberry32(77);
  x.fillStyle = '#05030a'; x.fillRect(0, 0, 2200, 1600);
  const cols = ['rgba(160,110,20,', 'rgba(90,30,140,', 'rgba(150,40,60,', 'rgba(40,60,120,'];
  for (let i = 0; i < 28; i++) {
    const cx = rng() * 2200, cy = rng() * 1600, r = 160 + rng() * 440, c = cols[Math.floor(rng() * cols.length)], gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, c + (0.09 + rng() * 0.12) + ')'); gr.addColorStop(1, c + '0)'); x.fillStyle = gr; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
}

// ---------- background: the void where the graves of his heroes drift ----------
function drawVoid5(g, T) {
  g.drawImage(NEB5, -CAM.x * 18 - 320, -CAM.y * 18 - 260);
  for (const s of STARS) {
    const x = ((s.x - CAM.x * TILE * s.p) % 2200 + 2200) % 2200 - 320, y = ((s.y - CAM.y * TILE * s.p) % 1500 + 1500) % 1500 - 210;
    if (x < -4 || y < -4 || x > GW || y > GH) continue;
    g.globalAlpha = 0.55 + 0.45 * Math.sin(T * 2.2 + s.tw); g.fillStyle = s.c; g.fillRect(x, y, s.s, s.s);
  }
  g.globalAlpha = 1;
  for (const q of GRAVES5) {
    const [x, y] = [GW / 2 + (q.x - CAM.x * q.p) * TILE * CAM.z * 0.8, GH * 0.54 + (q.y + 0.3 * Math.sin(T * 0.6 + q.ph) - CAM.y * q.p) * TILE * CAM.z * 0.8];
    if (x < -80 || y < -80 || x > GW + 80 || y > GH + 80) continue;
    if (q.ghost) { g.globalAlpha = 0.12 + 0.06 * Math.sin(T * 1.3 + q.ph); g.drawImage(SPR5.form[q.ghost].white, x - 9 * q.s * CAM.z, y - 9 * q.s * CAM.z, 18 * q.s * CAM.z, 18 * q.s * CAM.z); }   // ghosts of heroes he took
    else { const gv = SPR5.grave[q.k]; g.globalAlpha = 0.5; g.drawImage(gv, x - gv.width * q.s * CAM.z / 2, y - gv.height * q.s * CAM.z / 2, gv.width * q.s * CAM.z, gv.height * q.s * CAM.z); }
  }
  g.globalAlpha = 1;
}

// ---------- the arena ----------
function drawArena5(g, T, wt) {
  const C = Math.ceil(ARENA_R * 8) + 10, N = FLOOR5C.width, s = TEX * CAM.z, [ox, oy] = w2s(0, 0), f = S.f5, W = WEAP5[FORMS5[f.i].w];
  g.imageSmoothingEnabled = false; g.drawImage(FLOOR5C, ox - C * s, oy - C * s, N * s, N * s);
  // the hall changes shape with every party: whatever lies beyond the current boundary falls away into the void
  const ar = arena5(T), k0 = TILE * CAM.z;
  if (ar.A.kind !== 'circle' || ar.P.kind !== 'circle' || ar.shrink < 0.999) {
    const edge = [];
    for (let j = 0; j < 120; j++) { const th = j / 120 * TAU, r = rimR5(th, T); edge.push([ox + Math.cos(th) * r * k0, oy + Math.sin(th) * r * k0]); }
    g.beginPath(); g.arc(ox, oy, (ARENA_R + 0.8) * k0, 0, TAU); edge.slice().reverse().forEach(([x, y], j) => j ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
    g.fillStyle = 'rgba(5,3,10,0.94)'; g.fill('evenodd');
    g.beginPath(); edge.forEach(([x, y], j) => j ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
    g.lineWidth = 7; g.strokeStyle = '#2e2106'; g.stroke(); g.lineWidth = 3; g.strokeStyle = ar.shrink < 0.999 ? `rgba(255,90,90,${0.7 + 0.3 * Math.sin(T * 6)})` : '#e6b93a'; g.stroke();
  }
  // the hall takes on the colour of the weapon
  g.save(); g.beginPath(); g.arc(ox, oy, (ARENA_R - 0.5) * TILE * CAM.z, 0, TAU); g.clip();
  const gr = g.createRadialGradient(ox, oy, 2 * TILE * CAM.z, ox, oy, ARENA_R * TILE * CAM.z); gr.addColorStop(0, W.tint + '0.10)'); gr.addColorStop(1, W.tint + '0.03)');
  g.fillStyle = gr; g.fillRect(0, 0, GW, GH); g.restore();
  // the gallery: the heroes you face now glow; the ones you have beaten go dark
  const k = TILE * CAM.z;
  for (let i = 0; i < 15; i++) {
    const q = PLAQ5[i], st = plaqueState5(i, T), [x, y] = w2s(Math.cos(q.a) * 11.05, Math.sin(q.a) * 11.05), R = 0.8 * k;
    if (st === 2) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x - R, y - R, 2 * R, 2 * R); }
    else if (st === 1) { g.globalCompositeOperation = 'lighter'; glowAt(g, W.glow, x, y, 160 * CAM.z, 0.5 + 0.25 * Math.sin(T * 4 + i)); g.globalCompositeOperation = 'source-over'; g.strokeStyle = W.col; g.lineWidth = 3; g.strokeRect(x - R - 2, y - R - 2, 2 * R + 4, 2 * R + 4); }
  }
  g.globalCompositeOperation = 'lighter'; glowAt(g, W.glow, ox, oy, 380 * CAM.z, 0.18 + 0.06 * Math.sin(T * 2)); g.globalCompositeOperation = 'source-over';
}
// the Rooftops at night: the hall goes dark but for the lantern light around you (shots and heroes still shine)
function drawNight5(g, T) {
  const f = S.f5, on = FORMS5[f.i].ai === 'dagger' ? sat((T - f.mT - 0.8) / 1.6) : FORMS5[f.from]?.ai === 'dagger' ? 1 - sat((T - f.mT) / 1.2) : 0;
  if (on <= 0) return;
  const [x, y] = w2s(RP.x, RP.y), k = TILE * CAM.z, gr = g.createRadialGradient(x, y, 3.2 * k, x, y, 8.5 * k);
  gr.addColorStop(0, 'rgba(3,2,12,0)'); gr.addColorStop(1, `rgba(3,2,12,${0.8 * on})`);
  g.fillStyle = gr; g.fillRect(0, 0, GW, GH);
  g.globalCompositeOperation = 'lighter'; glowAt(g, 'y', x, y, 520 * CAM.z, 0.12 * on); g.globalCompositeOperation = 'source-over';
}
// on the floor: the night, shadows, seals, traps, struck quarters, telegraphs, the Conclave's circuit, and the safe lane of a sweeping blade
function drawFloor5(g, T, wt) {
  const k = TILE * CAM.z;
  drawNight5(g, T);
  for (const h of S.heroes) if (T >= h.rise && (h.deadT === Infinity || T < h.deadT + 0.8)) { const [x, y] = w2s(h.x, h.y + 1.25), a = sat((T - h.rise) / 0.8) * (h.deadT === Infinity ? 1 : 1 - (T - h.deadT) / 0.8) * (h.cloak > T ? 0.25 : 1) / (1 + h.z * 0.3); g.globalAlpha = 0.42 * a; g.fillStyle = '#000'; g.beginPath(); g.ellipse(x, y, 1.3 * k, 0.4 * k, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
  for (const m of S.mobs) if (m.kind === 'seal' && T >= m.T - 0.1 && T < m.deadT + 0.4) {
    const [x, y] = w2s(m.x, m.y), a = sat((T - m.T) / 0.8) * (m.deadT === Infinity ? 1 : sat((m.deadT + 0.4 - T) / 0.4)), sp = SPR5.seal, sc = 2.2 * k / sp.width * 2;
    g.globalCompositeOperation = 'lighter'; glowAt(g, 'g', x, y, 260 * CAM.z, 0.6 * a); g.globalCompositeOperation = 'source-over';
    g.save(); g.translate(x, y); g.scale(1, 0.72); g.rotate(T * 1.1 * m.dir); g.globalAlpha = 0.6 * a; g.drawImage(sp, -sp.width * sc / 2, -sp.height * sc / 2, sp.width * sc, sp.height * sc); g.restore(); g.globalAlpha = 1;
  }
  for (const q of S.traps) {   // landed traps; once armed, the ring shows how close is too close
    if (T < q.tl) continue;
    const [x, y] = w2s(q.x, q.y), sp = SPR5.trap;
    if (q.snapT <= T) { const v = (T - q.snapT) / 0.4; if (v < 1) { g.globalCompositeOperation = 'lighter'; glowAt(g, 'o', x, y, 220 * CAM.z * (1 + v), 1 - v); g.globalCompositeOperation = 'source-over'; } continue; }
    const armed = T >= q.ta, u = sat((T - q.tl) / (q.until - q.tl));
    g.globalCompositeOperation = 'lighter'; glowAt(g, 'o', x, y, 120 * CAM.z, armed ? 0.35 + 0.25 * Math.sin(T * 8) : 0.2); g.globalCompositeOperation = 'source-over';
    sprAt(g, sp, x, y, 4.2 * CAM.z);
    if (armed) { g.save(); g.setLineDash([8, 7]); g.strokeStyle = `rgba(255,150,60,${0.45 + 0.25 * Math.sin(T * 8)})`; g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, y, q.r * k, q.r * k * 0.8, 0, 0, TAU); g.stroke(); g.restore(); }
    g.strokeStyle = `rgba(255,${200 - 150 * u | 0},60,0.9)`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 0.62 * k, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - u)); g.stroke();
  }
  // the Bard's encore: the phrase lights the quarters, then each struck quarter glows until its note falls
  const [cx, cy] = w2s(0, 0), quarter = (a0, a1, col, al, n) => {
    g.fillStyle = `rgba(${col},${al})`; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 13.2 * k, a0, a1); g.closePath(); g.fill();
    g.strokeStyle = `rgba(${col},${Math.min(1, al * 3)})`; g.lineWidth = 3; g.stroke();
    if (n) { const m = (a0 + a1) / 2; txt(g, '' + n, cx + Math.cos(m) * 5.5 * k, cy + Math.sin(m) * 5.5 * k, 46 * CAM.z + 14, `rgba(255,220,240,${Math.min(1, al * 3.5)})`, { f: 'P2P', sw: 5, w: 400 }); }
  };
  for (const e of S.fx) if (e.type === 'quarter' && T >= e.T && T < e.T + 0.5) { const v = 1 - (T - e.T) / 0.5; for (const q of e.qs) quarter(e.a0 + q * TAU / 4, e.a0 + (q + 1) * TAU / 4, '255,111,176', 0.28 * v, e.n); }
  for (const z of S.zones5) {
    if (wt < z.t0 || wt > z.ti + 0.35) continue;
    if (wt < z.ti) { const u = (wt - z.t0) / (z.ti - z.t0); quarter(z.a0, z.a1, '255,90,160', 0.06 + 0.2 * u * u, z.n); }
    else quarter(z.a0, z.a1, '255,235,245', 0.55 * (1 - (wt - z.ti) / 0.35), 0);
  }
  for (const q of S.tele) {
    if (wt < q.t0 || wt > q.t1 + 0.15) continue;
    const u = sat((wt - q.t0) / Math.max(1e-3, q.t1 - q.t0));
    if (q.kind === 'bolt') {   // a flickering thread of lightning where the bolt will strike
      const fl = 0.35 + 0.65 * u * (0.6 + 0.4 * Math.sin(T * 50));
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(120,190,255,${fl})`; g.lineWidth = 2 + 5 * u; g.beginPath();
      q.pts.forEach(([x, y], i) => { const [sx, sy] = w2s(x, y); if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy); }); g.stroke();
      if (wt > q.t1) { g.strokeStyle = `rgba(230,245,255,${1 - (wt - q.t1) / 0.15})`; g.lineWidth = 10; g.stroke(); }
      g.globalCompositeOperation = 'source-over';
    } else if (q.kind === 'line') {   // a hound's lunge: a red band down its path
      const [x0, y0] = w2s(q.x, q.y), L = (q.len || 30) * k, w = q.w * k * (1.4 - 0.4 * u);
      g.save(); g.translate(x0, y0); g.rotate(q.a); g.globalCompositeOperation = 'lighter';
      g.fillStyle = `rgba(255,40,70,${0.12 + 0.3 * u})`; g.fillRect(0, -w, L, 2 * w);
      g.fillStyle = `rgba(255,200,210,${0.3 + 0.6 * u})`; g.fillRect(0, -1.5, L, 3); g.restore();
    } else if (q.kind === 'laser') {   // the Archer's sight: it follows you, then locks and flashes before the thunderbolt
      const locked = q.a !== null && wt >= q.tl, h = q.h, x0 = locked ? q.x : h.x, y0 = locked ? q.y : h.y, a = locked ? q.a : Math.atan2(RP.y - y0, RP.x - x0);
      const [sx, sy] = w2s(x0, y0), L = 26 * k, fl = locked ? 0.55 + 0.45 * Math.sin(T * 40) : 0.3 + 0.2 * u;
      g.save(); g.translate(sx, sy); g.rotate(a); g.globalCompositeOperation = 'lighter';
      g.fillStyle = locked ? `rgba(255,255,255,${0.2 * fl})` : `rgba(255,60,60,${0.1 + 0.1 * u})`; g.fillRect(1.2 * k, locked ? -0.35 * k : -0.12 * k, L, locked ? 0.7 * k : 0.24 * k);
      g.fillStyle = locked ? `rgba(255,255,255,${fl})` : `rgba(255,90,90,${0.5 + 0.3 * u})`; g.fillRect(1.2 * k, -1.5, L, 3); g.restore();
      if (!locked) { const [px, py] = w2s(RP.x, RP.y); g.strokeStyle = `rgba(255,70,70,${0.6 + 0.3 * Math.sin(T * 12)})`; g.lineWidth = 2; g.beginPath(); g.arc(px, py, 0.55 * k, 0, TAU); g.moveTo(px - 0.8 * k, py); g.lineTo(px + 0.8 * k, py); g.moveTo(px, py - 0.8 * k); g.lineTo(px, py + 0.8 * k); g.stroke(); }
    } else if (q.kind === 'path') {   // a constellation or a pentagram: the lines the runners will take, and the points that will burst
      const col = q.col === 'e' ? '120,255,150' : '255,214,120', al = wt < q.tr ? 0.25 + 0.5 * sat((wt - q.t0) / (q.tr - q.t0)) : 0.4 * (wt < q.t1 ? 1 : 1 - (wt - q.t1) / 0.15);
      if (al <= 0) continue;
      g.save(); g.globalCompositeOperation = 'lighter'; g.setLineDash([10, 8]); g.lineDashOffset = -T * 60; g.strokeStyle = `rgba(${col},${al})`; g.lineWidth = 3; g.beginPath();
      q.pts.forEach(([x, y], i) => { const [sx, sy] = w2s(x, y); if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy); }); g.stroke(); g.restore();
      g.globalCompositeOperation = 'lighter'; for (const [x, y] of q.pts) { const [sx, sy] = w2s(x, y); glowAt(g, q.col === 'e' ? 'e' : 'g', sx, sy, 90 * CAM.z, al); } g.globalCompositeOperation = 'source-over';
    } else if (q.kind === 'charge') {   // the Knight's charge path: a broad arrow that fills until he runs it
      const [x0, y0] = w2s(q.x0, q.y0), [x1, y1] = w2s(q.x1, q.y1), a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0), w = q.w * k, v = sat((wt - q.t0) / (q.tc - q.t0));
      g.save(); g.translate(x0, y0); g.rotate(a); g.globalAlpha = wt < q.tc ? 1 : Math.max(0, 1 - (wt - q.tc) / 0.3);
      g.fillStyle = `rgba(255,190,60,${0.1 + 0.18 * v})`; g.beginPath(); g.moveTo(0, -w); g.lineTo(L, -w); g.lineTo(L + w, 0); g.lineTo(L, w); g.lineTo(0, w); g.closePath(); g.fill();
      g.strokeStyle = `rgba(255,220,120,${0.5 + 0.4 * v})`; g.lineWidth = 3; g.stroke();
      g.fillStyle = `rgba(255,230,160,${0.25 + 0.5 * v})`; for (let s = 0.2; s < 1; s += 0.2) { const px = L * s; g.beginPath(); g.moveTo(px + 24, 0); g.lineTo(px - 10, -26); g.lineTo(px - 10, 26); g.closePath(); g.fill(); }
      g.restore(); g.globalAlpha = 1;
    } else if (q.kind === 'shadow') {   // TAKE COVER: the pillars' shadows glow green
      const al = (wt < q.t1 - 0.3 ? 0.14 + 0.1 * Math.sin(T * 9) : 0.24 * (q.t1 + 0.15 - wt) / 0.45) * sat((wt - q.t0) / 0.3);
      for (const o of arena5(T).obs) {
        const a = Math.atan2(o.y - q.y, o.x - q.x), d = Math.hypot(o.x - q.x, o.y - q.y), hw = Math.asin(Math.min(0.99, o.r * 0.9 / d)) - 0.02, [px, py] = w2s(q.x, q.y);
        g.fillStyle = `rgba(125,255,176,${al})`; g.beginPath(); g.arc(px, py, (d + 0.2) * k, a - hw, a + hw); g.arc(px, py, 14 * k, a + hw, a - hw, true); g.closePath(); g.fill();
      }
    }
  }
  // the Conclave's circuit: a faint beam between each pair of linked casters, under their streams
  if (FORMS5[S.f5.i].ai === 'staff') {
    const L = S.heroes.filter(h => h.deadT === Infinity && T >= h.T);
    if (L.length >= 2) { const pairs = L.length === 2 ? [[L[0], L[1]]] : L.map((h, j) => [h, L[(j + 1) % L.length]]); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(199,125,255,${0.16 + 0.05 * Math.sin(T * 5)})`; g.lineWidth = 0.5 * k; g.beginPath(); for (const [a, b] of pairs) { const [ax, ay] = w2s(a.x, a.y - a.z - 0.3), [bx, by] = w2s(b.x, b.y - b.z - 0.3); g.moveTo(ax, ay); g.lineTo(bx, by); } g.stroke(); g.globalCompositeOperation = 'source-over'; }
  }
  // the sweeping arms themselves: a spectral greatsword along every live arm
  for (const L of S.lanes5) {
    if (T < L.T0 || T >= L.T1) continue;
    const [lx, ly] = w2s(L.cx, L.cy), ghost = T < L.B0, a = ghost ? 0.25 + 0.15 * Math.sin(T * 14) : 1, holy = L.k === 'holyB';
    for (const h of L.arms) {
      const th = h.th0 + h.w * (T - L.B0), ux = Math.cos(th), uy = Math.sin(th), cuts = [[h.r0, h.r1]];
      for (const [q0, q1] of h.gaps) { const c = cuts.pop(); cuts.push([c[0], q0], [q1, c[1]]); }
      g.globalCompositeOperation = 'lighter';
      for (const [r0, r1] of cuts) {
        g.strokeStyle = holy ? `rgba(255,210,110,${0.3 * a})` : `rgba(170,200,255,${0.32 * a})`; g.lineWidth = 1.0 * k; g.lineCap = 'round';
        g.beginPath(); g.moveTo(lx + ux * r0 * k, ly + uy * r0 * k); g.lineTo(lx + ux * r1 * k, ly + uy * r1 * k); g.stroke();
        g.strokeStyle = holy ? `rgba(255,240,190,${0.45 * a})` : `rgba(215,230,255,${0.5 * a})`; g.lineWidth = 0.42 * k; g.stroke();
        g.strokeStyle = `rgba(255,255,255,${0.75 * a})`; g.lineWidth = 0.1 * k; g.stroke();
      }
      g.lineCap = 'butt'; g.globalCompositeOperation = 'source-over';
    }
  }
  // a sweeping arm is about to cross your angle: its gap glows green, strongest toward you
  const ln = lane5(RP.x, RP.y, T);
  if (ln && !S.dead && T < T_KILL) {
    const u = sat(1 - ln.tt / 1.8); if (u > 0) {
      const [lx, ly] = w2s(ln.L.cx, ln.L.cy), pa = Math.atan2(RP.y - ln.L.cy, RP.x - ln.L.cx), A = 0.32 * u * u, grd = g.createConicGradient(pa - Math.PI / 2, lx, ly);
      grd.addColorStop(0, 'rgba(125,255,176,0)'); grd.addColorStop(0.25, `rgba(125,255,176,${A})`); grd.addColorStop(0.5, 'rgba(125,255,176,0)'); grd.addColorStop(1, 'rgba(125,255,176,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(lx, ly, ln.g[1] * k, 0, TAU); g.arc(lx, ly, ln.g[0] * k, 0, TAU, true); g.fill();
    }
  }
}
// strikes from above: smites of light, lightning, a volley of arrows, a falling greatsword, a falling star, the Warrior's landing
function drawStrike5(g, z, wt) {
  const [x, y] = w2s(z.x, z.y), k = TILE * CAM.z;
  if (wt < z.ti) {   // the last moments before impact: the thing falls
    const v = 1 - (z.ti - wt) / 0.3; if (v < 0) return;
    if (z.kind === 'sword') { const sp = SPR5.fsword, sc = 5 * CAM.z, yy = y - (1 - v) * 9 * k - sp.height * sc * 0.8; g.drawImage(sp, x - sp.width * sc / 2, yy, sp.width * sc, sp.height * sc); }
    if (z.kind === 'arrow') for (let j = 0; j < 3; j++) { const ox = (hash(j, z.t0 * 100 | 0) - 0.5) * 0.9 * k; sprAt(g, SPR.b.arrow, x + ox, y - (1 - v) * 7 * k - j * 12, 4 * CAM.z, Math.PI / 2); }
    if (z.kind === 'star') { g.globalCompositeOperation = 'lighter'; glowAt(g, 'g', x, y - (1 - v) * 8 * k, 110 * CAM.z, 0.9); g.globalCompositeOperation = 'source-over'; sprAt(g, SPR5.b.shur, x, y - (1 - v) * 8 * k, 6 * CAM.z, wt * 12); }
    return;
  }
  const u = (wt - z.ti) / 0.4, w = z.r * k * 2 * (1 - u * 0.6);
  g.globalCompositeOperation = 'lighter';
  if (z.kind === 'bolt') {
    g.strokeStyle = `rgba(200,230,255,${1 - u})`; g.lineWidth = 7 * (1 - u) + 2; g.beginPath(); let yy = y, xx = x; g.moveTo(xx, yy);
    for (let j = 0; j < 9; j++) { yy -= y / 9; xx = x + (hash(j, z.t0 * 60 | 0) - 0.5) * 60; g.lineTo(xx, yy); } g.stroke();
    glowAt(g, 'b', x, y, w * 3, 1 - u);
  } else if (z.kind === 'slam') {   // the Warrior lands: a red shockwave
    glowAt(g, 'r', x, y, w * 2.2, 1 - u); g.strokeStyle = `rgba(255,120,110,${0.9 * (1 - u)})`; g.lineWidth = 8 * (1 - u) + 2;
    g.beginPath(); g.ellipse(x, y, w * (0.6 + u), w * 0.5 * (0.6 + u), 0, 0, TAU); g.stroke();
  } else if (z.kind === 'sword' || z.kind === 'arrow' || z.kind === 'star') {
    glowAt(g, z.kind === 'sword' || z.kind === 'star' ? 'g' : 'y', x, y, w * 2.4, 1 - u);
    g.strokeStyle = `rgba(255,230,170,${0.8 * (1 - u)})`; g.lineWidth = 4; g.beginPath(); g.ellipse(x, y, w * (0.6 + u), w * 0.45 * (0.6 + u), 0, 0, TAU); g.stroke();
    if (z.kind === 'sword' && u < 1) { const sp = SPR5.fsword, sc = 5 * CAM.z; g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1 - u; g.drawImage(sp, x - sp.width * sc / 2, y - sp.height * sc * 0.8, sp.width * sc, sp.height * sc); g.globalAlpha = 1; }
  } else {
    const grd = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    grd.addColorStop(0, 'rgba(255,200,80,0)'); grd.addColorStop(0.5, `rgba(255,248,210,${0.95 * (1 - u)})`); grd.addColorStop(1, 'rgba(255,200,80,0)');
    g.fillStyle = grd; g.fillRect(x - w / 2, 0, w, y); glowAt(g, 'g', x, y, w * 2.2, 1 - u);
  }
  g.globalCompositeOperation = 'source-over';
}
const LOB5_COL = { bomb: 'rgba(255,210,90,', skull: 'rgba(120,255,150,', vial: 'rgba(120,255,120,', trap: 'rgba(255,150,60,' };
function drawLob5(g, l, sx, sy, wt) {
  const sp = l.kind === 'bomb' ? SPR5.bomb : l.kind === 'skull' ? SPR5.skullLob : l.kind === 'vial' ? SPR5.vial : SPR5.trap;
  g.globalCompositeOperation = 'lighter'; glowAt(g, l.kind === 'bomb' ? 'g' : l.kind === 'trap' ? 'o' : 'e', sx, sy, 90 * CAM.z, 0.55); g.globalCompositeOperation = 'source-over';
  sprAt(g, sp, sx, sy, (l.kind === 'bomb' ? 5 : 5.5) * CAM.z, l.kind === 'trap' ? 0 : wt * (l.kind === 'bomb' ? 14 : 7));
}

// ---------- the heroes ----------
const _tint5 = new Map();
function tintCache5(img, col) { let m = _tint5.get(img); if (!m) _tint5.set(img, m = {}); return m[col] || (m[col] = tinted(img, col, 1)); }
function drawBody5(g, T, sp, cx, cy, s, flip, alpha, intro) {
  const img = sp.body, sy = 1 + 0.018 * Math.sin(T * 2.1);
  // a golden rim light around the silhouette, then the body; the lower rows sway like cloth
  g.globalAlpha = alpha * (intro ? 0.9 : 0.55);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { g.save(); g.translate(cx + dx * 3, cy + dy * 3); g.scale(s * flip, s * sy); g.drawImage(intro ? tintCache5(sp.body, '#b01d34') : sp.rim, -9, -9); g.restore(); }
  g.globalAlpha = alpha;
  g.save(); g.translate(cx, cy); g.scale(s * flip, s * sy);
  g.drawImage(img, 0, 0, 18, 10, -9, -9, 18, 10);
  for (let r = 10; r < 18; r++) g.drawImage(img, 0, r, 18, 1, -9 + Math.sin(T * 2.6 + r * 0.5) * (r - 9) * 0.035, r - 9, 18, 1.04);
  if (intro) { g.globalAlpha = alpha * 0.78; g.drawImage(sp.black, -9, -9); }   // a shadow of himself
  g.restore(); g.globalAlpha = 1;
  if (intro) { g.globalCompositeOperation = 'lighter'; glowAt(g, 'r', cx - 1.5 * s, cy - 2.5 * s, 60 * CAM.z, 0.9 * alpha); glowAt(g, 'r', cx + 1.5 * s, cy - 2.5 * s, 60 * CAM.z, 0.9 * alpha); g.globalCompositeOperation = 'source-over'; }
}
// the weapon moves with the class: casters point on the beat, bows track you, blades swing; when a hero attacks, its weapon snaps to the target and flares
function weaponAngle5(T, id, w, hx, hy, flip, spin) {
  const [px, py] = w2s(RP.x, RP.y), aim = Math.atan2(py - hy, px - hx) + Math.PI / 2, idle = 0.38 * flip + 0.06 * Math.sin(T * 1.7);
  const d = Math.atan2(Math.sin(aim - idle), Math.cos(aim - idle));
  if (w === 0 || w === 1) { const u = frac(T / BEAT), p = u < 0.12 ? u / 0.12 : Math.max(0, 1 - (u - 0.12) / 0.4); return idle + d * 0.75 * p; }
  if (w === 2) return idle + d * 0.6;
  if (w === 3) return id === 'rogue' ? T * 7 : idle + d * 0.8;
  if (w === 4) return spin ? T * 14 : idle + flip * 1.1 * Math.sin(T * (id === 'warrior' ? 10 : 5));
  return spin ? T * 2.2 : -0.25 * flip + 0.1 * Math.sin(T * 2);
}
function drawWeapon5(g, T, id, w, sp, cx, cy, s, flip, alpha, spin, shieldUp, atk = 0, atkA = 0) {
  const hx = cx + (sp.hand[0] - 9) * s * flip, hy = cy + (sp.hand[1] - 9) * s;
  let th = weaponAngle5(T, id, w, hx, hy, flip, spin);
  if (atk > 0) { const to = atkA + Math.PI / 2 - 0.35 * (1 - atk) * flip, d = Math.atan2(Math.sin(to - th), Math.cos(to - th)); th += d * Math.min(1, atk * 1.6); }   // the attack: snap to the target, overshoot a little
  const c = Math.cos(th), sn = Math.sin(th);
  g.globalAlpha = alpha * (0.38 + 0.35 * atk);   // ghostly: weapons are scenery, only shots hurt (a flash of solidity as it strikes)
  g.save(); g.translate(hx, hy); g.transform(c * s * flip, sn * s * flip, -sn * s, c * s, 0, 0); g.drawImage(sp.weapon, -sp.pivot[0], -sp.pivot[1]); g.restore();
  g.globalAlpha = alpha; g.save(); g.translate(cx, cy); g.scale(s * flip, s); g.drawImage(SPR5.fist, sp.hand[0] - 11.5, sp.hand[1] - 11.5); g.restore();   // the fist closes over the grip
  const tx = hx + ((sp.tip[0] - sp.pivot[0]) * c * flip - (sp.tip[1] - sp.pivot[1]) * sn) * s, ty = hy + ((sp.tip[0] - sp.pivot[0]) * sn * flip + (sp.tip[1] - sp.pivot[1]) * c) * s, gs = s / (BOSS5_S * CAM.z);
  g.globalCompositeOperation = 'lighter'; glowAt(g, WEAP5[w].glow, tx, ty, 150 * CAM.z * gs * (1 + 1.2 * atk), (0.3 + 0.12 * Math.sin(T * 8) + 0.6 * atk) * alpha);
  if (atk > 0.5) glowAt(g, 'w', tx, ty, 90 * CAM.z * gs * atk, atk * alpha);
  g.globalCompositeOperation = 'source-over';
  if (sp.shield) {   // the Knight's tower shield, on his other arm
    const sx = cx + (sp.lhand[0] - 14) * s * flip, sy = cy + (sp.lhand[1] - 8) * s, sh = sp.shield, a = shieldUp ? 0 : -0.3 * flip;
    g.globalAlpha = alpha * 0.38; g.save(); g.translate(sx, sy); g.rotate(a); g.scale(s, s); g.drawImage(sh, -sp.shieldPivot[0], -sp.shieldPivot[1]); g.restore();
  }
  g.globalAlpha = 1;
}
// a magic circle turns under a hero performing its signature
function drawGlyph5(g, T, h, W, alpha) {
  const [x, y] = w2s(h.x, h.y + 1.2), k = TILE * CAM.z, u = Math.min(1, (T - h.sigB) / 0.35) * Math.min(1, (h.sigB + h.sig.dur - T) / 0.35), a = alpha * u * (0.55 + 0.2 * Math.sin(T * 7)), R = 2.1 * k;
  g.save(); g.translate(x, y); g.scale(1, 0.42); g.globalCompositeOperation = 'lighter';
  g.strokeStyle = W.col; g.globalAlpha = a; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, R * 0.72, 0, TAU); g.stroke();
  g.rotate(T * 1.8); g.beginPath(); for (let q = 0; q < 6; q++) { const b = q * TAU / 6, e = b + TAU / 3; g.moveTo(Math.cos(b) * R * 0.72, Math.sin(b) * R * 0.72); g.lineTo(Math.cos(e) * R * 0.72, Math.sin(e) * R * 0.72); } g.stroke();
  g.rotate(-T * 3.2); for (let q = 0; q < 12; q++) { const b = q * TAU / 12; g.fillStyle = W.col; g.fillRect(Math.cos(b) * R * 0.86 - 3, Math.sin(b) * R * 0.86 - 3, 6, 6); }
  g.restore(); g.globalAlpha = 1;
  g.globalCompositeOperation = 'lighter'; glowAt(g, W.glow, x, y, 320 * CAM.z, 0.35 * a); g.globalCompositeOperation = 'source-over';
}
const heroHit5 = (h, wt) => { for (let i = S.hits.length - 1; i >= 0 && i > S.hits.length - 16; i--) { const q = S.hits[i]; if (q.hero === h.id && !q.armor && wt - q.wt >= 0 && wt - q.wt < 0.07) return true; } return false; };
// a stolen hero: gold-rimmed, its weapon a ghost, a thread of gold rising from it to its master; health below
function drawHero5(g, T, h) {
  const sp = SPR5.form[h.id], s = HERO5_S * CAM.z, F = FORMS5[S.f5.i], w = PLAQ5[FORM5_IDS.indexOf(h.id)].w, dead = T >= h.deadT, kneel = dead && S.fx.some(e => e.type === 'kneel' && e.id === h.id && T >= e.T && T - e.T < 3);
  const bob = Math.sin(T * 1.9 + h.j * 2) * 0.08, [cx, cy] = w2s(h.x, h.y - h.z - 0.3 + bob);
  const spd = Math.hypot(h.vx, h.vy), dashing = h.go && h.go.dash && T >= h.go.T0 && T < h.go.T1, W = WEAP5[w];
  const dxp = spd > 5 ? h.vx : RP.x - h.x; if (Math.abs(dxp) > 0.8) h.face = dxp > 0 ? 1 : -1; const flip = h.face || 1;   // it faces where it runs, else you
  const rise = sat((T - h.rise) / 0.8), cloak = h.cloak > T ? 0.12 + 0.08 * Math.sin(T * 17) : 1, u = dead ? (T - h.deadT) / (kneel ? 2.4 : 1.1) : 0, alpha = rise * cloak * (dead ? Math.max(0, 1 - u) : 1);
  if (alpha <= 0.01) return;
  // the thread of gold: Oryx works them from above
  if (!dead && rise > 0) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,214,120,${0.13 * alpha})`; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + Math.sin(T * 0.7 + h.j) * 30, 0); g.quadraticCurveTo(cx + Math.sin(T * 1.1 + h.j) * 20, cy * 0.5, cx, cy - 8 * s); g.stroke(); g.globalCompositeOperation = 'source-over'; }
  // afterimages in its weapon's colour when it moves fast
  if ((spd > 5 || dashing) && !dead) {
    g.globalCompositeOperation = 'lighter';
    for (let j = 2; j < h.tr.length; j += 2) { const [tx, ty, tz] = h.tr[j], [ax, ay] = w2s(tx, ty - tz - 0.3 + bob); g.globalAlpha = Math.min(1, alpha * (0.4 - j * 0.04) * (dashing ? 1.5 : 1)); g.save(); g.translate(ax, ay); g.scale(s * flip, s); g.drawImage(tintCache5(sp.body, W.col), -9, -9); g.restore(); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  if (h.sig && T >= h.sigB && T < h.sigB + h.sig.dur && !dead) drawGlyph5(g, T, h, W, alpha);
  g.globalCompositeOperation = 'lighter'; glowAt(g, W.glow, cx, cy, 300 * CAM.z, (0.3 + (dashing ? 0.4 : 0)) * alpha); g.globalCompositeOperation = 'source-over';
  // it leans into the run and squashes as it lands
  const lean = clamp(h.vx / 16, -0.28, 0.28) * (dashing ? 1.5 : 1), land = h.landT && T - h.landT < 0.2 ? 1 - (T - h.landT) / 0.2 : 0, atk = Math.max(0, 1 - (T - h.atkT) / 0.22);
  g.save(); g.translate(cx, cy + 9 * s); g.rotate(lean); g.scale(1 + 0.14 * land, (1 - 0.16 * land) * (kneel ? 1 - 0.35 * Math.min(1, u * 3) : 1)); g.translate(-cx, -cy - 9 * s);
  drawBody5(g, T, sp, cx, cy, s, flip, alpha, false);
  if (!dead) drawWeapon5(g, T, h.id, w, sp, cx, cy, s, flip, alpha, h.id === 'warrior' && h.walk, false, atk, h.atkA);
  if (heroHit5(h, S.wt) || (dead && u < 0.25)) { g.globalAlpha = (dead ? 0.9 * (1 - u * 4) : 0.55) * rise; g.save(); g.translate(cx, cy); g.scale(s * flip, s); g.drawImage(sp.white, -9, -9); g.restore(); g.globalAlpha = 1; }
  g.restore();
  if (dead) return;
  const k = TILE * CAM.z;
  // a Tome of Holy Protection on it: a golden bubble; its mirrors up: a violet barrier
  if (h.prot > T) { const a = Math.min(1, (h.prot - T) / 0.4) * (0.5 + 0.2 * Math.sin(T * 9)); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,220,120,${a})`; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 1.9 * k, 0, TAU); g.stroke(); glowAt(g, 'g', cx, cy, 320 * CAM.z, 0.35 * a); g.globalCompositeOperation = 'source-over'; }
  if (S.mobs.some(m => m.owner === h && m.must && m.deadT === Infinity && T >= m.T)) {
    const R = 2.0 * k; g.save(); g.translate(cx, cy); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(200,160,255,${0.55 + 0.15 * Math.sin(T * 6)})`; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(230,210,255,0.25)'; g.lineWidth = 2; for (let q = 0; q < 6; q++) { const an = q * TAU / 6 + T * 0.5; g.beginPath(); g.moveTo(Math.cos(an) * R, Math.sin(an) * R); g.lineTo(Math.cos(an + TAU / 6) * R, Math.sin(an + TAU / 6) * R); g.stroke(); } g.restore();
  }
  // health (the Colosseum's champions have none: they are outlasted)
  if (h.hp > 0 && rise >= 1 && !(h.cloak > T)) {
    const bw = 96 * Math.max(0.8, CAM.z / 0.62), bx = cx - bw / 2, by = cy + 11 * s, fr = Math.max(0, 1 - h.dmg / h.hp), inv = !heroVuln5(h, T);
    g.fillStyle = 'rgba(0,0,0,0.8)'; g.fillRect(bx - 2, by - 2, bw + 4, 11); g.fillStyle = '#2a2010'; g.fillRect(bx, by, bw, 7);
    g.fillStyle = inv ? '#9fb4d8' : fr < 0.3 ? '#ff6a4a' : '#ffd23f'; g.fillRect(bx, by, bw * fr, 7);
    txt(g, NAME5(h.id), cx, by + 20, 13, WEAP5[w].col, { f: 'SilkB', sw: 3, w: 400 });
  }
}
const DECOY5 = [];   // the Trickster in twelve hues (a canvas filter per frame is far too slow)
function decoyHue5(k) {
  if (!DECOY5[k]) { const b = SPR5.form.trickster.body, c = mkCanvas(b.width, b.height), x = c.getContext('2d'); x.filter = `hue-rotate(${k * 30}deg) saturate(1.6)`; x.drawImage(b, 0, 0); DECOY5[k] = c; }
  return DECOY5[k];
}
function drawDecoy5(g, T, d) {   // the Trickster's copies: prismatic, flickering as they are about to burst
  const sp = SPR5.form.trickster, s = HERO5_S * CAM.z, [x, y] = w2s(d.x, d.y - 0.3 + Math.sin(T * 1.9 + d.x) * 0.08), flip = RP.x > d.x ? 1 : -1, a = sat((T - d.T) / 0.3) * (T > d.until - 0.3 ? 0.5 + 0.5 * Math.sin(T * 40) : 1);
  g.globalCompositeOperation = 'lighter'; glowAt(g, 'w', x, y, 300 * CAM.z, 0.25 * a); g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 0.85 * a; g.setTransform(s * flip, 0, 0, s, x, y); g.drawImage(decoyHue5(Math.floor((T * 240 + d.x * 30) / 30) % 12), -9, -9);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
}
function drawKaleido5(g, T, e) {   // the Hall of Mirrors: her seven reflections across the Cathedral's axes
  const h = e.h, sp = SPR5.form.summoner, s = HERO5_S * CAM.z, a = sat((T - e.T) / 0.4) * sat((e.until - T) / 0.4) * 0.4;
  for (const [r, fl] of D4_5) { const [x, y] = d4(h.x, h.y, r, fl), [sx, sy] = w2s(x, y - 0.3); g.globalCompositeOperation = 'lighter'; glowAt(g, 'v', sx, sy, 260 * CAM.z, a); g.globalCompositeOperation = 'source-over'; g.globalAlpha = a; g.setTransform(s * (fl ? -1 : 1), 0, 0, s, sx, sy); g.drawImage(tintCache5(sp.body, '#b58cff'), -9, -9); g.globalAlpha = a * 0.6; g.drawImage(sp.body, -9, -9); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; }
}
function drawMirror5(g, T, m) {
  const [x, y] = w2s(m.x, m.y), u = sat((T - m.T) / 0.6), sp = SPR5.mirror, s = 5.6 * CAM.z * (0.4 + 0.6 * u), dead = T >= m.deadT;
  if (dead) { const v = (T - m.deadT) / 0.3; if (v < 1) { g.globalCompositeOperation = 'lighter'; glowAt(g, 'v', x, y, 300 * CAM.z * (1 + v), 1 - v); g.globalCompositeOperation = 'source-over'; } return; }
  g.globalCompositeOperation = 'lighter'; glowAt(g, 'v', x, y, 240 * CAM.z, 0.45 + 0.2 * Math.sin(T * 5)); g.globalCompositeOperation = 'source-over';
  const hit = S.hits.some(h => h.wt <= S.wt && S.wt - h.wt < 0.06 && Math.hypot(h.x - m.x, h.y - m.y) < 1.3);
  sprAt(g, hit ? tintCache5(sp, '#ffffff') : sp, x, y, s, 0.08 * Math.sin(T * 2 + m.sd));
  if (u >= 1) { const w = 70, fr = 1 - Math.min(1, m.dmg / m.hp); g.fillStyle = '#000'; g.fillRect(x - w / 2 - 2, y + 52 * CAM.z, w + 4, 9); g.fillStyle = '#b36bff'; g.fillRect(x - w / 2, y + 52 * CAM.z + 2, w * fr, 5); }
}
function drawMinion5(g, T, m) {   // a skeleton or a hound
  const dead = T >= m.deadT, v = dead ? (T - m.deadT) / 0.3 : 0, [x, y] = w2s(m.x, m.y + (m.kind === 'skel' ? -0.3 : 0)), rise = sat((T - m.T + 0.6) / 0.6);
  if (dead) { if (v < 1) { g.globalCompositeOperation = 'lighter'; glowAt(g, m.kind === 'skel' ? 'e' : 'r', x, y, 160 * CAM.z, 1 - v); g.globalCompositeOperation = 'source-over'; } return; }
  const sp = m.kind === 'skel' ? SPR5.skel : SPR5.wolf, flip = (m.fx ?? 1) < 0 ? -1 : 1, lunge = m.dash && T >= m.dash.T0;
  g.globalCompositeOperation = 'lighter'; glowAt(g, m.kind === 'skel' ? 'e' : 'r', x, y, (lunge ? 220 : 130) * CAM.z, lunge ? 0.7 : 0.3); g.globalCompositeOperation = 'source-over';
  const hit = S.hits.some(h => h.wt <= S.wt && S.wt - h.wt < 0.06 && Math.hypot(h.x - m.x, h.y - m.y) < 1.0);
  g.save(); g.globalAlpha = rise; g.translate(x, y + (1 - rise) * 20); g.scale(flip, 1); sprAt(g, hit ? tintCache5(sp, '#ffffff') : sp, 0, 0, 5 * CAM.z); g.restore(); g.globalAlpha = 1;
  if (rise >= 1) { const w = 44, fr = 1 - Math.min(1, m.dmg / m.hp); g.fillStyle = '#000'; g.fillRect(x - w / 2 - 1, y + 30 * CAM.z, w + 2, 6); g.fillStyle = m.kind === 'skel' ? '#9dff9a' : '#ff8a7a'; g.fillRect(x - w / 2, y + 30 * CAM.z + 1, w * fr, 4); }
}
function drawObstacle5(g, T, o, a) {
  const [x, y] = w2s(o.x, o.y), k = TILE * CAM.z, sp = o.kind === 'tree' ? SPR5.tree : SPR5.pillar, sc = o.r * 2.3 * k / sp.width;
  g.globalAlpha = a * 0.45; g.fillStyle = '#000'; g.beginPath(); g.ellipse(x, y, o.r * 1.05 * k, o.r * 0.45 * k, 0, 0, TAU); g.fill();
  g.globalAlpha = a; g.drawImage(sp, x - sp.width * sc / 2, y - sp.height * sc + 0.45 * k, sp.width * sc, sp.height * sc); g.globalAlpha = 1;
}
function entities5(list, g, T, wt) {
  const ar = arena5(T), obs = ar.A.obs || [];
  for (const o of obs) list.push([o.y + 0.4, () => drawObstacle5(g, T, o, ar.u)]);
  for (const h of S.heroes) if (T >= h.rise - 0.2 && T < h.deadT + 2.5) list.push([h.y + 1.25, () => drawHero5(g, T, h)]);
  for (const d of S.decoys) if (T >= d.T && T < d.until) list.push([d.y + 1.25, () => drawDecoy5(g, T, d)]);
  for (const m of S.mobs) if (T >= m.T - 0.6 && T < m.deadT + 0.4) { if (m.kind === 'mirror') list.push([m.y + 1, () => drawMirror5(g, T, m)]); else if (m.kind !== 'seal') list.push([m.y + 0.4, () => drawMinion5(g, T, m)]); }
  const ka = S.fx.findLast(e => e.type === 'kaleido'); if (ka && T >= ka.T && T < ka.until && ka.h.deadT > T) list.push([-99, () => drawKaleido5(g, T, ka)]);
}

// ---------- the usurper himself: the Knight ----------
const KSP5 = () => SPR5.form.knight;
const bossScale5 = () => BOSS5_S * CAM.z * 1.25;
function drawBoss5(g, T, wt) {
  const b = S.boss, f = S.f5, dead = T >= T_KILL, intro = T < TL.land, knight = knight5();
  // before his heroes take the field he stands in the hall as a shadow; then he withdraws to watch
  const fade = knight ? 1 : f.log.length === 1 && T < TL.land + 1.6 ? 1 - sat((T - TL.land - 0.6) / 1.0) : 0;
  if (fade <= 0 || b.y < -30) return;
  const morph = knight && T >= f.mT && T < f.T && f.from >= 0 && FORMS5[f.from].w === 5;
  const bob = Math.sin(T * 1.7) * 0.1, [cx, cy] = w2s(b.x, b.y - b.z - 0.25 + bob), sp = KSP5(), s = bossScale5(), F = FORMS5[f.i], shadow = intro || !knight;
  const dxp = RP.x - b.x; if (Math.abs(dxp) > 1.2) S.f5.face = dxp > 0 ? 1 : -1; const flip = S.f5.face || 1;
  const tremble = dead ? Math.min(1, (T - T_KILL) / 2.2) * 6 : 0;
  g.save(); if (tremble) g.translate(tremble * (hash(Math.floor(T * 60), 1) - 0.5) * 2, tremble * (hash(Math.floor(T * 60), 2) - 0.5) * 2);
  g.globalCompositeOperation = 'lighter';
  glowAt(g, 'g', cx, cy, 760 * CAM.z, (shadow ? 0.2 : 0.42) * (0.8 + 0.2 * Math.sin(T * 3.1)) * fade);
  glowAt(g, 'g', cx, cy, 520 * CAM.z, (shadow ? 0.1 : 0.35) * fade);
  g.globalCompositeOperation = 'source-over';
  if (morph) drawMorph5(g, T, cx, cy, flip);
  else {
    drawBody5(g, T, sp, cx, cy, s, flip, fade, shadow);
    if (!shadow && !dead && moving5(T)) { g.globalCompositeOperation = 'lighter'; for (let j = 1; j <= 4; j++) { const q = bossAt5(T - j * 0.035, wt), [ax, ay] = w2s(q.x, q.y - q.z - 0.25 + bob); g.globalAlpha = 0.3 - j * 0.06; g.save(); g.translate(ax, ay); g.scale(s * flip, s); g.drawImage(tintCache5(sp.body, '#ffd23f'), -9, -9); g.restore(); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }   // afterimages as he charges
    if (!shadow && !dead) drawWeapon5(g, T, 'knight', 5, sp, cx, cy, s, flip, 1, F.ai === 'knight2', F.ai === 'knight1');
    if (F.ai === 'knight3' && !shadow) { g.globalAlpha = 0.18 + 0.12 * Math.sin(T * 10); g.globalCompositeOperation = 'lighter'; g.save(); g.translate(cx, cy); g.scale(s * flip, s); g.drawImage(tintCache5(sp.body, '#ffd23f'), -9, -9); g.restore(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    const hf = knight && (fxSince('starHit', T, 0.12) || fxSince('final', T, 0.2)) && S.hits.length && S.hits[S.hits.length - 1].wp;
    if (hf) { g.globalAlpha = 0.55; g.save(); g.translate(cx, cy); g.scale(s * flip, s); g.drawImage(sp.white, -9, -9); g.restore(); g.globalAlpha = 1; }
    if (dead) {
      const u = sat((T - T_KILL - 0.3) / 2.1);
      g.globalCompositeOperation = 'lighter';
      for (let q = 0; q < 11; q++) { const a = hash(q, 15) * TAU, L = (90 + 420 * hash(q, 16)) * u * CAM.z; g.strokeStyle = `rgba(255,240,190,${0.75 * u})`; g.lineWidth = (6 + 12 * hash(q, 17)) * CAM.z; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); g.stroke(); }
      glowAt(g, 'w', cx, cy, 560 * u * CAM.z, u); g.globalCompositeOperation = 'source-over';
      if (Math.floor(T * 14) % 2 === 0) { g.globalAlpha = 0.5 * u; g.save(); g.translate(cx, cy); g.scale(s * flip, s); g.drawImage(sp.white, -9, -9); g.restore(); g.globalAlpha = 1; }
    }
  }
  g.restore();
  if (knight && !intro && !dead && !morph && b.z < 0.5) drawWeakPoint5(g, T, wt);
}
// a change of stance: his pixels burst into a swirl of gold and settle again
function morphPairs5() {
  if (MORPH5.has('k')) return MORPH5.get('k');
  const A = KSP5().px, ang = ([x, y]) => Math.atan2(y - 9, x - 9) + Math.hypot(x - 9, y - 9) * 0.02, sa = A.slice().sort((p, q) => ang(p) - ang(q)), out = [];
  for (let j = 0; j < sa.length; j++) out.push({ a: sa[j], b: sa[j], r: 5 + 5 * hash(j, 3), w: 5 + 4 * hash(j, 4), ph: hash(j, 5) * TAU });
  MORPH5.set('k', out); return out;
}
const hex5 = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function drawMorph5(g, T, cx, cy, flip) {
  const f = S.f5, u = (T - f.mT) / (f.T - f.mT), s = bossScale5(), gold = [255, 214, 90];
  g.globalCompositeOperation = 'lighter'; glowAt(g, 'g', cx, cy, 900 * CAM.z * (0.6 + 0.4 * Math.sin(Math.PI * u)), 0.5 + 0.4 * Math.sin(Math.PI * u)); g.globalCompositeOperation = 'source-over';
  for (const q of morphPairs5()) {
    const [ax, ay, ac] = q.a, [bx, by, bc] = q.b, a0 = Math.atan2(ay - 9, ax - 9), sw = q.ph + T * q.w * 0.6;
    let x, y, col;
    if (u < 0.3) { const v = easeOut(u / 0.3); x = lerp(ax - 9, Math.cos(a0 + sw * v) * q.r, v); y = lerp(ay - 9, Math.sin(a0 + sw * v) * q.r, v); col = hex5(ac).map((c, i) => lerp(c, gold[i], v)); }
    else if (u < 0.62) { x = Math.cos(a0 + sw) * q.r; y = Math.sin(a0 + sw) * q.r; col = gold; }
    else { const v = easeInOut((u - 0.62) / 0.38); x = lerp(Math.cos(a0 + sw) * q.r, bx - 9, v); y = lerp(Math.sin(a0 + sw) * q.r, by - 9, v); col = gold.map((c, i) => lerp(c, hex5(bc)[i], v)); }
    g.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`; g.fillRect(cx + x * s * flip - s * 0.5, cy + y * s - s * 0.5, s * 0.95, s * 0.95);
  }
  if (u > 0.55 && u < 0.72) { g.globalCompositeOperation = 'lighter'; glowAt(g, 'w', cx, cy, 700 * CAM.z, 1 - Math.abs(u - 0.62) / 0.1); g.globalCompositeOperation = 'source-over'; }
}
// his stolen soul: the only part of him that can be hurt
function drawWeakPoint5(g, T, wt) {
  const b = S.boss, bob = Math.sin(T * 1.7) * 0.1, w = wpPos5(T, wt, b), z = CAM.z, [x, y] = w2s(w.x, w.y + bob), [cx, cy] = w2s(b.x, b.y - b.z + bob), vul = bossVulnerable(T);
  let hit = false;
  for (let i = S.hits.length - 1; i >= 0 && i > S.hits.length - 12; i--) { const h = S.hits[i]; if (h.wp && !h.hero && wt - h.wt >= 0 && wt - h.wt < 0.07) { hit = true; break; } }
  const R = WP_R * TILE * z, pulse = 0.5 + 0.5 * Math.sin(T * 7);
  g.save(); g.setLineDash([6, 9]); g.lineWidth = 3; g.strokeStyle = vul ? 'rgba(255,220,120,0.5)' : 'rgba(160,180,210,0.25)';
  g.beginPath(); g.ellipse(cx, cy, WP_ORB5 * TILE * z, 0.8 * WP_ORB5 * TILE * z, 0, 0, TAU); g.stroke(); g.restore();
  g.fillStyle = vul ? 'rgba(30,14,0,0.5)' : 'rgba(10,12,20,0.35)'; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
  g.globalCompositeOperation = 'lighter';
  glowAt(g, vul ? 'g' : 'c', x, y, 300 * z, vul ? 0.85 + 0.15 * pulse : 0.3); glowAt(g, vul ? 'w' : 'c', x, y, 150 * z, vul ? 0.7 : 0.2);
  if (hit) glowAt(g, 'w', x, y, 230 * z, 1);
  g.globalCompositeOperation = 'source-over';
  sprAt(g, SPR5.soulGem, x, y, 7 * z * (1 + 0.06 * Math.sin(T * 9)), 0, vul ? 1 : 0.55);
  const col = vul ? (hit ? '#ffffff' : `rgba(255,${215 + 40 * pulse | 0},${90 + 90 * pulse | 0},1)`) : 'rgba(160,180,210,0.6)';
  g.lineWidth = 9; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
  g.lineWidth = 5; g.strokeStyle = col; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
  if (vul) for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + T * 0.8, ux = Math.cos(a), uy = Math.sin(a), d = R + 14 + 6 * pulse, px = x + ux * d, py = y + uy * d;
    g.beginPath(); g.moveTo(px - ux * 2, py - uy * 2); g.lineTo(px + ux * 16 - uy * 10, py + uy * 16 + ux * 10); g.lineTo(px + ux * 16 + uy * 10, py + uy * 16 - ux * 10); g.closePath();
    g.fillStyle = 'rgba(0,0,0,0.7)'; g.fill(); g.lineWidth = 2; g.strokeStyle = col; g.stroke();
  }
}

// ---------- effects over the view ----------
function postFx5(g, T, wt) {
  const k = TILE * CAM.z;
  g.globalCompositeOperation = 'lighter';
  for (const e of S.fx) {
    const tau = T - e.T; if (tau < 0 || tau > 2.6) continue;
    if (e.type === 'smoke' && tau < 1.5) { const [x, y] = w2s(e.x, e.y), v = e.out ? tau / 0.6 : Math.min(1, tau / 0.55); if (e.out ? tau < 0.6 : tau < 0.9) { g.globalCompositeOperation = 'source-over'; for (let q = 0; q < 10; q++) { const a = q * TAU / 10 + T, r = (20 + 60 * v) * CAM.z; g.fillStyle = `rgba(40,20,60,${0.55 * (e.out ? 1 - v : v < 1 ? v : Math.max(0, 1 - (tau - 0.55) / 0.35))})`; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.4, r * 0.5, 0, TAU); g.fill(); } g.globalCompositeOperation = 'lighter'; glowAt(g, 'v', x, y, 200 * CAM.z, 0.5 * (e.out ? 1 - v : v)); } }
    if (e.type === 'dash' && T >= e.T - 0.05 && T < e.T1 + 0.35) {   // a streak of light along the dash
      const u = sat((T - e.T) / Math.max(0.05, e.T1 - e.T)), fade = T < e.T1 ? 1 : 1 - (T - e.T1) / 0.35, rgb = RGB5[e.col] || RGB5.w, [x0, y0] = w2s(e.x0, e.y0 - 0.3), [x1, y1] = w2s(lerp(e.x0, e.x1, u), lerp(e.y0, e.y1, u) - 0.3);
      const grd = g.createLinearGradient(x0, y0, x1, y1); grd.addColorStop(0, `rgba(${rgb},0)`); grd.addColorStop(1, `rgba(${rgb},${0.75 * fade})`);
      g.strokeStyle = grd; g.lineCap = 'round'; g.lineWidth = 1.3 * k; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = `rgba(255,255,255,${0.8 * fade})`; g.lineWidth = 0.25 * k; g.stroke(); g.lineCap = 'butt'; glowAt(g, 'w', x1, y1, 200 * CAM.z, 0.6 * fade);
    }
    if (e.type === 'warp' && tau < 0.4) {   // a hero blinks: a flash that collapses where it leaves and bursts where it arrives
      const [x, y] = w2s(e.x, e.y - 0.3), v = tau / 0.4, R = (e.out ? v : 1 - v) * 2.4 * k + 0.3 * k, rgb = RGB5[e.col] || RGB5.w;
      g.strokeStyle = `rgba(${rgb},${1 - v})`; g.lineWidth = 6 * (1 - v) + 2; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke(); glowAt(g, e.col && SPR.glow[e.col] ? e.col : 'w', x, y, 360 * CAM.z, 0.8 * (1 - v));
      for (let q = 0; q < 8; q++) { const a = q * TAU / 8 + e.T, r = R * (0.6 + 0.6 * hash(q, e.T * 60 | 0)); g.fillStyle = `rgba(255,255,255,${1 - v})`; g.fillRect(x + Math.cos(a) * r - 3, y + Math.sin(a) * r - 3, 6, 6); }
    }
    if (e.type === 'stasis' && tau < 1.3) { const [x, y] = w2s(e.x, e.y); g.strokeStyle = `rgba(160,240,255,${1 - tau / 1.3})`; g.lineWidth = 12 * (1 - tau / 1.3) + 2; g.beginPath(); g.ellipse(x, y, 2400 * easeOut(tau / 0.8) * CAM.z, 1600 * easeOut(tau / 0.8) * CAM.z, 0, 0, TAU); g.stroke(); }
    if (e.type === 'stasisUp' && tau < 1.3) { const [x, y] = w2s(e.x, e.y - 0.3), v = tau / 1.3; g.strokeStyle = `rgba(160,240,255,${0.3 + 0.6 * v})`; g.lineWidth = 3 + 5 * v; g.beginPath(); g.arc(x, y, (1 - v) * 7 * k + 1.2 * k, 0, TAU); g.stroke(); glowAt(g, 'c', x, y, 300 * CAM.z, 0.3 + 0.6 * v); }
    if (e.type === 'prismPop' && tau < 0.6) { const [x, y] = w2s(e.x, e.y); glowAt(g, 'w', x, y, 500 * CAM.z * easeOut(tau / 0.4), 1 - tau / 0.6); }
    if (e.type === 'prismSplit' && tau < 0.5) { const [x, y] = w2s(e.x, e.y); g.lineWidth = 6; for (const [px, py] of e.pts) { const [qx, qy] = w2s(px, py); g.strokeStyle = `hsla(${(px * 40 + T * 300) % 360},100%,70%,${1 - tau / 0.5})`; g.beginPath(); g.moveTo(x, y); g.lineTo(qx, qy); g.stroke(); } }
    if (e.type === 'rise' && tau < 1.4) {   // a hero descends in a shaft of gold
      const [x, y] = w2s(e.x, e.y + 1.2), v = tau / 1.4, w = 2.6 * k * (1 - v * 0.5), a = Math.sin(Math.PI * v), grd = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      grd.addColorStop(0, 'rgba(255,200,80,0)'); grd.addColorStop(0.5, `rgba(255,240,190,${0.7 * a})`); grd.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = grd; g.fillRect(x - w / 2, 0, w, y); glowAt(g, 'g', x, y, 400 * CAM.z, a);
    }
    if (e.type === 'heroDie' && tau < 1.0) { const [x, y] = w2s(e.x, e.y - 0.3), v = tau / 1.0; glowAt(g, 'w', x, y, 700 * CAM.z * easeOut(v), 1 - v); g.strokeStyle = `rgba(255,230,160,${1 - v})`; g.lineWidth = 10 * (1 - v) + 2; g.beginPath(); g.ellipse(x, y, 9 * k * easeOut(v), 6 * k * easeOut(v), 0, 0, TAU); g.stroke(); }
    if (e.type === 'protect' && tau < 0.8 && e.h) { const [x, y] = w2s(e.h.x, e.h.y - e.h.z - 0.3), v = tau / 0.8; g.strokeStyle = `rgba(255,230,140,${1 - v})`; g.lineWidth = 6; g.beginPath(); g.arc(x, y, (1 + 3 * (1 - easeOut(v))) * k, 0, TAU); g.stroke(); }
    if (e.type === 'shield' && tau < 0.6 && e.x !== undefined) { const [x, y] = w2s(e.x, e.y - 0.3), v = tau / 0.6; g.strokeStyle = `rgba(210,170,255,${1 - v})`; g.lineWidth = 5; g.beginPath(); g.arc(x, y, 2 * k * (1 + v), 0, TAU); g.stroke(); }
    if (e.type === 'raise' && tau < 1.0) { const [x, y] = w2s(e.x, e.y), v = tau; glowAt(g, 'e', x, y, 260 * CAM.z, 0.7 * (1 - v)); }
    if (e.type === 'kaleido' && tau < 0.5) { const [x, y] = w2s(e.h.x, e.h.y - 0.3); glowAt(g, 'v', x, y, 1400 * CAM.z * easeOut(tau / 0.5), 1 - tau / 0.5); }
    if (e.type === 'draw' && tau < 0.8 && e.h) { const [x, y] = w2s(e.h.x, e.h.y - 0.3); glowAt(g, 'r', x, y, 360 * CAM.z, 0.8 * Math.sin(Math.PI * tau / 0.8)); }
    if (e.type === 'kneel' && tau < 2.4) { const [x, y] = w2s(e.x, e.y + 0.9); glowAt(g, 'g', x, y, 400 * CAM.z, 0.5 * (1 - tau / 2.4)); }
    if (e.type === 'morph' && tau < 2.6) { const nf = FORMS5[e.i], at = nf.party ? [0, 0] : [S.boss.x, S.boss.y - 0.25], [x, y] = w2s(at[0], at[1]), v = tau / (e.dur || 1.5); if (v > 0.55 && v < 1.2) { const q = (v - 0.55) / 0.65; g.strokeStyle = `rgba(255,220,130,${1 - q})`; g.lineWidth = 16 * (1 - q) + 2; g.beginPath(); g.ellipse(x, y, 1500 * easeOut(q) * CAM.z, 1000 * easeOut(q) * CAM.z, 0, 0, TAU); g.stroke(); } }
  }
  g.globalCompositeOperation = 'source-over';
  // the chase: the edges of the view burn and streak while the party hunts you
  const ch = S.f5.chase;
  if (ch && !ch.rite && T >= ch.C && T < ch.end + 0.6 && T < T_KILL) {
    const v = sat((T - ch.C) / 0.4) * sat((ch.end + 0.6 - T) / 0.6), pulse = 0.7 + 0.3 * Math.sin(T * 9);
    g.globalAlpha = 0.3 * v * pulse; g.drawImage(VIG_LOW, 0, 0); g.globalAlpha = 1;
    g.globalCompositeOperation = 'lighter';
    for (let q = 0; q < 34; q++) {   // speed streaks rushing in from the edges
      const a = hash(q, 51) * TAU, u = (T * (1.6 + hash(q, 52)) + hash(q, 53)) % 1, R0 = 700 + 300 * hash(q, 54), r1 = R0 * (1 - 0.35 * u), r2 = r1 - 90 - 80 * hash(q, 55), x = GW / 2, y = GH * 0.54;
      g.strokeStyle = `rgba(255,${190 + 60 * hash(q, 56) | 0},170,${0.5 * v * Math.sin(Math.PI * u)})`; g.lineWidth = 2 + 3 * hash(q, 57);
      g.beginPath(); g.moveTo(x + Math.cos(a) * r1 * 1.25, y + Math.sin(a) * r1 * 0.8); g.lineTo(x + Math.cos(a) * r2 * 1.25, y + Math.sin(a) * r2 * 0.8); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
  }
  // the last stand: the hall burns red and embers rise
  if (FORMS5[S.f5.i].ai === 'knight3' && T >= S.f5.T - 0.5 && T < T_KILL + 1) {
    const v = sat((T - S.f5.T + 0.5) / 1.5) * (T < T_KILL ? 1 : Math.max(0, 1 - (T - T_KILL))), pulse = 0.75 + 0.25 * Math.sin(T * 5.2);
    g.globalAlpha = 0.28 * v * pulse; g.drawImage(VIG_LOW, 0, 0); g.globalAlpha = 1;
    for (let q = 0; q < 46; q++) {
      const sp = 60 + 90 * hash(q, 41), u = ((T * sp / GH) + hash(q, 42)) % 1, x = hash(q, 43) * GW + Math.sin(T * 1.7 + q) * 30, y = GH * (1 - u);
      g.fillStyle = q % 3 ? `rgba(255,${120 + 80 * hash(q, 44) | 0},40,${0.8 * v * (1 - u)})` : `rgba(255,230,150,${0.9 * v * (1 - u)})`; g.fillRect(x, y, 4 + 3 * hash(q, 45), 4 + 3 * hash(q, 45));
    }
  }
  const st = fxSince('stasis', T, 1.3); if (st) { g.fillStyle = `rgba(120,200,255,${0.14 * (1 - (T - st.T) / 1.3)})`; g.fillRect(0, 0, GW, GH); }
  const bz = fxSince('berserk', T, 0.6); if (bz) { g.fillStyle = `rgba(255,30,40,${0.3 * (1 - (T - bz.T) / 0.6)})`; g.fillRect(0, 0, GW, GH); }
  const mo = S.fx.findLast(e => e.type === 'morph');
  if (mo && T >= mo.T) { const v = (T - mo.T) / (mo.dur || 1.5); if (v > 0.58 && v < 0.8) { g.fillStyle = `rgba(255,245,215,${(mo.big ? 0.75 : 0.45) * (1 - Math.abs(v - 0.62) / 0.18)})`; g.fillRect(0, 0, GW, GH); } }
  // the heroes call out the items they use, the way the realm names every drop
  for (const e of S.fx) {
    if (e.type !== 'item' || T < e.T || T - e.T > 1.8) continue;
    const o = e.h || S.boss; if (e.h && T >= e.h.deadT) continue;
    const u = T - e.T, [x, y] = w2s(o.x, o.y - (o.z || 0) - (e.h ? 2.9 : 5.2) - 0.35 * easeOut(u / 0.4)), a = u < 0.15 ? u / 0.15 : u > 1.3 ? 1 - (u - 1.3) / 0.5 : 1;
    g.globalAlpha = a; txt(g, e.text, x, y, 19 * (1 + 0.25 * Math.max(0, 1 - u / 0.15)), '#ffcf5a', { f: 'SilkB', sw: 5, sc: '#2a1400', w: 400 }); g.globalAlpha = 1;
  }
}

const RGB5 = { v: '170,90,255', e: '90,255,140', w: '255,255,255', r: '255,80,90', c: '120,230,255', g: '255,214,90', p: '199,125,255', b: '90,170,255', o: '255,150,60' };
// the title of a chase (or a rite) slams in from the side
function drawChaseBanner5(x, T) {
  const e = fxSince('chase', T, 2.2); if (!e) return;
  const u = T - e.T, a = u < 0.15 ? u / 0.15 : u > 1.7 ? 1 - (u - 1.7) / 0.5 : 1, sx = (1 - easeOut(u / 0.25)) * 900, y = 300;
  x.globalAlpha = a; x.fillStyle = e.rite ? 'rgba(60,40,0,0.55)' : 'rgba(90,0,10,0.55)'; x.beginPath(); x.moveTo(0, y - 46); x.lineTo(GW, y - 60); x.lineTo(GW, y + 40); x.lineTo(0, y + 54); x.closePath(); x.fill();
  txt(x, e.text + '!', GW / 2 + sx, y, 58 * (1 + 0.2 * Math.max(0, 1 - u / 0.2)), e.rite ? '#ffcf5a' : '#ff6477', { f: 'P2P', sw: 9, sc: e.rite ? '#2a1400' : '#2a0508', w: 400 });
  x.globalAlpha = 1;
}
// ---------- HUD ----------
function drawBossBar5(g, T, wt, wf) {
  const x0 = 330, y0 = 8, w = 820, a = sat((T - TL.run - 0.4) / 0.6), f = S.f5, F = FORMS5[f.i], W = WEAP5[F.w];
  const cap = s => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  g.globalAlpha = a;
  panel(g, x0, y0, w, 58, { bg: 'rgba(14,10,4,0.85)', bd: '#8a6512' });
  g.fillStyle = '#1d1829'; g.fillRect(x0 + 6, y0 + 6, 46, 46);
  g.imageSmoothingEnabled = false; g.drawImage(SPR5.icon[F.id], x0 + 8, y0 + 8, 42, 42);
  g.strokeStyle = '#d1a12a'; g.lineWidth = 2; g.strokeRect(x0 + 6, y0 + 6, 46, 46);
  txt(g, 'ORYX THE MAD GOD V', x0 + 62, y0 + 16, 17, '#ffcf5a', { a: 'left', sw: 4 });
  txt(g, 'The Usurper — ' + (T < TL.land ? '...' : PHASES5[F.w].num + ': ' + cap(WEAPONS5[F.w]) + ' · ' + (F.stance ? cap(F.stance) : cap(F.name))), x0 + w - 12, y0 + 16, 14, '#e8d8b8', { a: 'right', sw: 3 });
  const bx = x0 + 62, by = y0 + 30, bw = w - 74, bh = 20;
  g.fillStyle = '#000'; g.fillRect(bx - 2, by - 2, bw + 4, bh + 4); g.fillStyle = '#231a06'; g.fillRect(bx, by, bw, bh);
  const gold = g.createLinearGradient(0, by, 0, by + bh); gold.addColorStop(0, '#fff1a6'); gold.addColorStop(0.5, '#e6b93a'); gold.addColorStop(1, '#8a5a0e');
  let label = '', inv = T < T_KILL && f.from >= 0 && T >= f.mT && T < f.T;
  if (F.surv) {   // a survival clock: it drains in time, faster with every hit you land
    const left = T >= T_KILL ? 0 : T < f.T ? f.sv.base : Math.max(0, survLeft5(S.dead ? Math.min(T, S.dead) : T)), fr = left / f.sv.base, hot = left < 5;
    const red = g.createLinearGradient(0, by, 0, by + bh); red.addColorStop(0, hot ? '#ffb0b8' : '#ffd8a0'); red.addColorStop(0.5, hot ? '#ff4f6a' : '#ff8a3a'); red.addColorStop(1, '#6a1010');
    g.fillStyle = red; g.fillRect(bx, by, bw * fr, bh);
    if (T >= f.T && T < T_KILL && S.hits.some(h => h.surv && wt - h.wt >= 0 && wt - h.wt < 0.15)) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(bx + bw * fr - 6, by, 6, bh); }
    label = 'SURVIVE  ' + left.toFixed(1) + ' s';
    txt(g, f.sv.cap !== undefined && f.sv.bonus >= f.sv.cap ? 'the clock runs at full speed' : 'every hit speeds the clock', bx + 8, by + bh / 2 + 1, 12, '#ffe0c0', { a: 'left', sw: 3 });
  } else if (F.party) {   // a party: one segment per hero, each draining with its own health
    const tot = F.party.reduce((s, id) => s + HERO5[id].hp, 0); let x = bx, rem = 0;
    for (const id of F.party) {
      const hw = bw * HERO5[id].hp / tot, h = S.heroes.find(q => q.id === id), fr = h ? Math.max(0, 1 - h.dmg / h.hp) : 0; rem += h ? h.hp - h.dmg : 0;
      g.fillStyle = h && (h.prot > T || !heroVuln5(h, Math.max(T, h.T))) ? '#9fb4d8' : gold; g.fillRect(x, by, hw * fr, bh);
      g.fillStyle = '#000'; g.fillRect(x + hw - 1, by - 3, 3, bh + 6);
      g.globalAlpha = a * (fr > 0 ? 1 : 0.35); g.drawImage(SPR5.icon[id], x + 3, by + 2, 16, 16); g.globalAlpha = a;
      x += hw;
    }
    label = fmtK(rem) + ' / ' + fmtK(tot);
  } else {   // the Knight: his own health, with the change of stance marked
    const tot = STAGE_HP5[5] + STAGE_HP5[6], hp = T >= T_KILL ? 0 : Math.max(0, bossHpAt(wf)), fr = hp / tot, trail = Math.max(0, MAXHP - S.cum[Math.max(0, wf - 40)]) / tot;
    if (trail > fr) { g.fillStyle = '#fff3d0'; g.fillRect(bx + bw * fr, by, bw * Math.min(1, trail) - bw * fr, bh); }
    g.fillStyle = gold; g.fillRect(bx, by, bw * fr, bh);
    g.fillStyle = '#ffffff'; g.fillRect(bx + bw * STAGE_HP5[6] / tot - 1, by - 4, 3, bh + 8);
    label = fmtK(hp) + ' / ' + fmtK(tot);
  }
  txt(g, label, bx + bw / 2, by + bh / 2 + 1, 16, '#ffffff', { sw: 4 });
  const mir = S.mobs.some(m => m.must && m.deadT === Infinity && T >= m.T), prot = S.heroes.some(h => h.prot > T && h.deadT === Infinity);
  const status = inv ? 'CHANGING FORM' : mir ? 'SHATTER THE MIRRORS' : prot ? 'PROTECTED' : '';
  if (status && (Math.floor(T * 4) % 2 === 0)) txt(g, status, bx + bw - 6, by + bh / 2 + 1, 13, mir ? '#d8b8ff' : '#9ff4ff', { a: 'right', sw: 3 });
  const wv = fxSince('wave', T, 2.6);   // the Colosseum's waves
  if (wv) { const u = T - wv.T; g.globalAlpha = a * (u < 2 ? 1 : Math.max(0, 1 - (u - 2) / 0.6)); txt(g, wv.text, x0 + w / 2, y0 + 84, 22 * (1 + 0.35 * Math.max(0, 1 - u / 0.2)), '#ffcf5a', { f: 'P2P', sw: 5, w: 400 }); }
  g.globalAlpha = 1;
  // the gallery of heroes: where you are in the fight
  const X0 = GW - 400, Y0 = 8;
  panel(g, X0, Y0, 390, 58, { bg: 'rgba(14,10,4,0.82)', bd: '#5c410b' });
  for (let i = 0; i < 15; i++) {
    const px = X0 + 12 + i * 25, py = Y0 + 14, st = plaqueState5(i, T);
    if (i > 0 && PLAQ5[i].w !== PLAQ5[i - 1].w) { g.fillStyle = '#5c410b'; g.fillRect(px - 3, Y0 + 10, 2, 38); }
    g.globalAlpha = st === 2 ? 0.28 : st === 1 ? 1 : 0.7; g.drawImage(SPR5.icon[FORM5_IDS[i]], px, py + (st === 1 ? -3 : 0), 20, 20); g.globalAlpha = 1;
    if (st === 1) { g.strokeStyle = WEAP5[PLAQ5[i].w].col; g.lineWidth = 2; g.strokeRect(px - 2, py - 5, 24, 24); }
  }
  txt(g, F.stance ? 'THE KNIGHT · ' + F.stance : F.name, X0 + 195, Y0 + 46, 12, W.col, { f: 'SilkB', sw: 0, w: 400 });
}
// the stage banner is up: after each change of stage, and at the start
function banner5(T) { const mo = fxSince('morph', T, 4.2); return mo ? T - (mo.T + (mo.dur || 1.5) * 0.45) < 2.6 : T >= TL.land - 0.2 && T < TL.land + 3.0; }
function drawOverlays5(x, T) {
  const f = S.f5, mo = fxSince('morph', T, 4.2);
  drawChaseBanner5(x, T);
  if (mo || (T >= TL.land - 0.2 && T < TL.land + 3.0)) {
    const t0 = mo ? mo.T + (mo.dur || 1.5) * 0.45 : TL.land, u = T - t0, F = FORMS5[mo ? mo.i : f.i];
    if (u >= 0 && u < 2.6) {
      const a = u < 0.2 ? u / 0.2 : u > 2.1 ? 1 - (u - 2.1) / 0.5 : 1, sc = 1 + 0.3 * Math.max(0, 1 - u / 0.2), big = !mo || mo.big, y = 238, cap = s => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      x.globalAlpha = a; x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(0, y - (big ? 62 : 44), GW, big ? 144 : 100);
      const head = F.ai === 'knight3' ? 'HIS LAST STAND' : F.ai === 'knight2' ? 'THE KNIGHT' : 'PHASE ' + PHASES5[F.w].num + ' · ' + WEAPONS5[F.w];
      txt(x, head, GW / 2, y - (big ? 26 : 16), 24 * sc, WEAP5[F.w].col, { f: 'SilkB', sw: 5, w: 400 });
      const name = F.stance === 'LAST STAND' ? 'SURVIVE' : F.stance === 'BLADESTORM' ? 'BLADESTORM' : F.ai === 'knight1' ? 'ORYX, THE KNIGHT' : F.name;
      txt(x, name, GW / 2, y + (big ? 18 : 12), (big ? 48 : 40) * sc, F.surv ? '#ff6477' : '#ffe07a', { f: 'P2P', sw: 8, w: 400 });
      const sub = F.party ? F.party.map(NAME5).join(' · ') + (F.surv ? '  —  outlast the champions' : '') + '  —  ' + cap(ARENAS5[F.w].name) : F.surv ? 'outlast his clock: every hit you land shortens it' : F.ai === 'knight1' ? 'The Throne Hall' : '';
      if (sub) txt(x, sub, GW / 2, y + (big ? 70 : 52), 20, '#e8d8b8', { sw: 4 });
      x.globalAlpha = 1;
    }
  }
  if (T >= T_KILL && T < T_KILL + 5.5) {
    const u = T - T_KILL - 0.55, a = u < 0 ? 0 : u > 4.3 ? 1 - (u - 4.3) / 0.65 : 1;
    if (a > 0) {
      x.globalAlpha = a; const sc = 1 + 1.6 * Math.max(0, 1 - u / 0.16);
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, 150, GW, 180);
      txt(x, 'THE USURPER FALLS', GW / 2, 218, 70 * sc, '#ffffff', { f: 'P2P', sc: '#8a6512', sw: 12, w: 400 });
      txt(x, 'Every hero he stole walks free.', GW / 2, 292, 30, '#ffd23f', { sw: 6 });
      x.globalAlpha = 1;
    }
  }
}
