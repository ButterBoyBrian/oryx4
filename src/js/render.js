'use strict';
// ================= renderer =================
let GX, TMP, TX2, FLOOR, FLOOR_C, OVER, OVX, OVD, OVB, ROOM, ROOM_C, NEB, STARS = [], SIDE_BG, MINI;
// render caches (built once): vignettes, the midnight spotlight falloff, and the dial (rebuilt when a hand moves)
let VIG_MOOD, VIG_LOW, DARK_SPOT, ARENA, ARX, ARENA_KEY = '';
const BOSS_S = 6; // px per boss texel at zoom 1
const COL = { boss: '#ff9d3b', nw: '#ffe14d', sys: '#ff6b6b', gold: '#ffd23f', ench: '#c77dff', hp: '#3fd46a', mp: '#4b7bff' };

function initRender() {
  GX = CTX;   // the game view is drawn straight onto the screen (the sidebar covers anything past GW)
  TMP = mkCanvas(GW, GH); TX2 = TMP.getContext('2d');
  buildFloor(); buildRoom(); buildNebula(); buildSidebarBg(); buildCaches();
  const rng = mulberry32(99);
  for (let i = 0; i < 420; i++) STARS.push({ x: rng() * 3000 - 700, y: rng() * 2200 - 560, s: rng() < 0.12 ? 3 : rng() < 0.5 ? 2 : 1, p: 0.15 + rng() * 0.35, tw: rng() * 6, c: rng() < 0.2 ? '#ffcfd6' : rng() < 0.4 ? '#cfe6ff' : '#ffffff' });
  SPR.bossBlack = tinted(SPR.boss[0], '#000000', 1);
  SPR.cloakBlack = tinted(SPR.cloak[0], '#000000', 1);
  SPR.ninjaWhite = tinted(SPR.ninja.front[0], '#ffffff', 1);
  SPR.b.clk = SPR.b.hand; SPR.b.pend = SPR.b.gear; SPR.b.rew = SPR.b.orbM;
  SPR.bossRim = tinted(SPR.boss[0], '#b01d34', 1); SPR.cloakRim = tinted(SPR.cloak[0], '#b01d34', 1);
  SPR.swordBlack = tinted(SPR.sword[0], '#000000', 1); SPR.swordRim = tinted(SPR.sword[0], '#b01d34', 1);
}

function buildCaches() {
  const radial = (w, h, cx, cy, r0, r1, c0, c1) => { const c = mkCanvas(w, h), x = c.getContext('2d'), g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); g.addColorStop(0, c0); g.addColorStop(1, c1); x.fillStyle = g; x.fillRect(0, 0, w, h); return c; };
  VIG_MOOD = radial(GW, GH, GW / 2, GH / 2, 420, 1050, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.5)');
  VIG_LOW = radial(GW, GH, GW / 2, GH / 2, 300, 900, 'rgba(255,0,0,0)', 'rgba(200,0,20,1)');   // drawn at the pulse's alpha
  DARK_SPOT = radial(256, 256, 128, 128, 128 * 180 / 620, 128, 'rgba(3,1,10,0)', 'rgba(3,1,10,1)');   // midnight spotlight, drawn at the darkness alpha
  ARENA = mkCanvas(FLOOR.width, FLOOR.height); ARX = ARENA.getContext('2d');
}

// ---------- prerendered floors ----------
const GLYPH = { I: ['###', '.#.', '.#.', '.#.', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'] };
const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
function glyphs(p, str, cx, cy, col, sh) {
  const w = str.length * 4 - 1, x0 = Math.round(cx - w / 2), y0 = Math.round(cy - 2.5);
  [...str].forEach((ch, i) => GLYPH[ch].forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== '#') return; if (sh) p.set(x0 + i * 4 + x, y0 + y + 1, sh); p.set(x0 + i * 4 + x, y0 + y, col);
  })));
}
function buildFloor() {
  const C = Math.ceil(ARENA_R * 8) + 10, N = C * 2, p = new PX(N, N);
  FLOOR_C = C;
  const stone = ['#15121d', '#18141f', '#1b1724', '#16131e', '#1a1622'];
  const rng = mulberry32(5);
  p.each((px, py, x, y) => {
    const dx = (px - C) / 8, dy = (py - C) / 8, r = Math.hypot(dx, dy);
    if (r > ARENA_R) return 0;
    if (r > ARENA_R - 0.5) return r > ARENA_R - 0.14 ? '#2e2106' : r > ARENA_R - 0.3 ? '#d1a12a' : '#7a5a10';
    const tx = Math.floor(dx), ty = Math.floor(dy), lx = ((x - C) % 8 + 8) % 8, ly = ((y - C) % 8 + 8) % 8;
    let c = stone[Math.floor(hash(tx + 50, ty + 50, 5) * stone.length)];
    if (lx === 0 || ly === 0) c = '#0d0b12';
    const n = hash(x, y, 11); if (n < 0.05) c = '#221d2c'; else if (n > 0.975) c = '#0e0c13';
    // crimson aisles to XII / III / VI / IX
    const ax = Math.abs(dx), ay = Math.abs(dy);
    const aisle = (off, along) => {
      if (along < 2.8 || along > 10.25 || off > 1.12) return null;
      if (off > 0.98) return '#b4861c';
      if (off > 0.86) return '#3a0710';
      if (off > 0.62) return (Math.floor(along * 8 / 2) % 3 === 0) ? '#b01d34' : '#6a0f22';
      return (hash(x, y, 3) < 0.08) ? '#6e1224' : '#590c1c';
    };
    const a1 = aisle(ay, ax), a2 = aisle(ax, ay);
    if (a1) c = a1; if (a2) c = a2;
    if (r > 10.28 && r < 10.42) c = '#9a7215';
    if (r > 2.62 && r < 2.78) c = '#d1a12a';
    if (r < 2.62) {
      const a = Math.atan2(dy, dx), ray = Math.abs(((a / TAU * 12) % 1 + 1) % 1 - 0.5);
      c = r < 0.9 ? '#2a2234' : ray > 0.44 && r > 1.1 ? '#6e4f0e' : (r > 1.7 && r < 1.82) ? '#9a7215' : '#1f1a29';
    }
    // minute ticks
    if (r > 11.7 && r < 12.05) {
      const a = Math.atan2(dy, dx) + Math.PI / 2, m = a / (TAU / 60), dm = Math.abs(m - Math.round(m)) * (TAU / 60) * r;
      const hour = Math.round(m) % 5 === 0;
      if (dm < (hour ? 0.12 : 0.07) && (hour || r > 11.85)) c = hour ? '#e6b93a' : '#8a6512';
    }
    return c;
  });
  for (let h = 0; h < 12; h++) {
    const a = -Math.PI / 2 + h * Math.PI / 6, cx = C + Math.cos(a) * 11.0 * 8, cy = C + Math.sin(a) * 11.0 * 8;
    glyphs(p, ROMAN[h], cx, cy, '#d9ab30', '#2e2106');
  }
  for (let k = 0; k < 9; k++) { // cracks
    let a = rng() * TAU, r = 3 + rng() * 7, x = C + Math.cos(a) * r * 8, y = C + Math.sin(a) * r * 8, d = rng() * TAU;
    for (let i = 0; i < 10 + rng() * 22; i++) { d += (rng() - 0.5) * 1.1; x += Math.cos(d); y += Math.sin(d); if (Math.hypot(x - C, y - C) > (ARENA_R - 0.8) * 8) break; p.set(x, y, '#08070c'); }
  }
  FLOOR = p.canvas(null, 0);
  OVER = mkCanvas(N, N); OVX = OVER.getContext('2d'); OVD = OVX.createImageData(N, N); OVB = new Uint32Array(OVD.data.buffer);
  MINI = mkCanvas(300, 300);
  const mx = MINI.getContext('2d'); mx.imageSmoothingEnabled = true; mx.drawImage(FLOOR, 0, 0, 300, 300);
}
function buildRoom() {
  const TW = 15, TH = 13, p = new PX(TW * 8, TH * 8);
  ROOM_C = [TW * 4, TH * 4 + 8];
  p.each((px, py, x, y) => {
    const tx = Math.floor(x / 8), ty = Math.floor(y / 8), lx = x % 8, ly = y % 8;
    if (ty < 3) { // back wall facade
      if (ty === 2 && ly >= 6) return '#07060a';
      const brick = ((ly < 4 ? 0 : 4) + lx) % 8 === 0 || ly === 3 || ly === 7;
      return brick ? '#0f0c15' : hash(x, y, 2) < 0.1 ? '#2a2336' : '#211b2b';
    }
    if (tx === 0 || tx === TW - 1) return lx % 4 === 0 || ly === 7 ? '#0f0c15' : '#1d1826';
    let c = ['#15121d', '#18141f', '#1b1724'][Math.floor(hash(tx, ty, 4) * 3)];
    if (lx === 0 || ly === 0) c = '#0d0b12';
    const off = Math.abs(x - TW * 4 + 0.5) / 8;
    if (off < 1.1) c = off > 0.98 ? '#b4861c' : off > 0.86 ? '#3a0710' : off > 0.62 ? ((y >> 1) % 3 === 0 ? '#b01d34' : '#6a0f22') : '#590c1c';
    return c;
  });
  for (const bx of [3, TW - 4]) { p.rect(bx * 8 + 1, 3 * 8 + 10, 6, 8, '#2a2336'); p.rect(bx * 8 + 2, 3 * 8 + 10, 4, 2, '#b4861c'); }
  ROOM = p.canvas(null, 0);
}
function buildNebula() {
  NEB = mkCanvas(2200, 1600);
  const x = NEB.getContext('2d'), rng = mulberry32(42);
  x.fillStyle = '#040308'; x.fillRect(0, 0, 2200, 1600);
  const cols = ['rgba(120,20,50,', 'rgba(60,20,110,', 'rgba(20,70,110,', 'rgba(150,90,20,'];
  for (let i = 0; i < 26; i++) {
    const cx = rng() * 2200, cy = rng() * 1600, r = 150 + rng() * 420, c = cols[Math.floor(rng() * cols.length)];
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, c + (0.10 + rng() * 0.12) + ')'); g.addColorStop(1, c + '0)');
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
}
function buildSidebarBg() {
  SIDE_BG = mkCanvas(W - GW, H);
  const x = SIDE_BG.getContext('2d');
  x.fillStyle = '#15131b'; x.fillRect(0, 0, W - GW, H);
  x.fillStyle = '#2a2633'; x.fillRect(0, 0, 3, H);
  x.fillStyle = '#000'; x.fillRect(10, 10, 340, 300);
}

// ---------- helpers ----------
let CAM = { x: 0, y: 0, z: 1, sx: 0, sy: 0 };
// render interpolation: the simulation steps at 60 Hz; faster screens draw between the last two steps
const RI = { a: 1, S: null, wt: 0, cx: 0, cy: 0, cz: 1 }, RP = { x: 0, y: 0 };
let BPX = new Float32Array(1024), BPY = new Float32Array(1024), BPT = new Float32Array(1024);
const w2s = (x, y) => [GW / 2 + (x - CAM.x) * TILE * CAM.z + CAM.sx, GH * 0.54 + (y - CAM.y) * TILE * CAM.z + CAM.sy];
function sprAt(ctx, img, x, y, s, rot = 0, alpha = 1, flip = 1, ax = 0.5, ay = 0.5) {
  if (rot === 0 && flip === 1) { ctx.globalAlpha = alpha; ctx.drawImage(img, x - img.width * ax * s, y - img.height * ay * s, img.width * s, img.height * s); ctx.globalAlpha = 1; return; }
  const c = Math.cos(rot) * s, sn = Math.sin(rot) * s;
  ctx.setTransform(c * flip, sn * flip, -sn, c, x, y);
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, -img.width * ax, -img.height * ay);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
}
function glowAt(ctx, key, x, y, size, alpha) {
  const g = SPR.glow[key]; if (!g || alpha <= 0) return;
  ctx.globalAlpha = Math.min(1, alpha); ctx.drawImage(g, x - size / 2, y - size / 2, size, size); ctx.globalAlpha = 1;
}
function txt(ctx, s, x, y, size, fill, o = {}) {
  ctx.font = `${o.w || 700} ${size}px ${o.f || 'Pix'}`;
  ctx.textAlign = o.a || 'center'; ctx.textBaseline = o.b || 'middle';
  if (o.sw !== 0) { ctx.lineJoin = 'round'; ctx.miterLimit = 2; ctx.lineWidth = o.sw || Math.max(3, size * 0.2); ctx.strokeStyle = o.sc || '#000'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
}
function wrap(ctx, s, maxW) {
  const words = s.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function panel(ctx, x, y, w, h, o = {}) {
  ctx.save(); rrect(ctx, x, y, w, h, o.r ?? 6);
  ctx.fillStyle = o.bg || 'rgba(14,12,20,0.92)'; ctx.fill();
  ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.bd || '#4a3f63'; ctx.stroke(); ctx.restore();
}
function shake(T) {
  let ax = 0, ay = 0;
  for (let i = S.fx.length - 1; i >= 0; i--) {
    const e = S.fx[i], d = T - e.T; if (d < 0) continue; if (d > 2.5) break;
    const A = e.type === 'morph' ? (e.big ? 9 : 4) : e.type === 'berserk' ? 6 : e.type === 'stasis' ? 5 : e.type === 'land' ? 16 : e.type === 'chime' ? 9 : e.type === 'final' ? 22 : e.type === 'boom' ? 8 * (e.s || 1) : e.type === 'explode' ? 26 : e.type === 'starHit' && e.big ? 7 : e.type === 'resume' ? 12 : e.type === 'transform' ? 14 : e.type === 'chase' ? 8 : e.type === 'heroDie' ? 12 : e.type === 'kneel' ? 8 : 0;
    if (!A) continue;
    const k = A * Math.exp(-d * 5);
    ax += k * Math.sin(T * 91 + i); ay += k * Math.cos(T * 77 + i * 3);
  }
  return [ax, ay];
}
function fxSince(type, T, win) { for (let i = S.fx.length - 1; i >= 0; i--) { const e = S.fx[i]; if (e.type === type && T - e.T >= 0 && T - e.T < win) return e; } return null; }

// ---------- main entry ----------
function renderFrame(f) {
  const T = f / FPS, x = CTX;
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none';
  x.imageSmoothingEnabled = false;
  if (T < TL.lobby) { drawColdOpen(x, T); return; }
  if (T >= TL.credits) { drawCredits(x, T); return; }
  drawGameView(T);
  drawSidebar(x, T);
  drawOverlays(x, T);
  if (T < TL.lobby + 0.6) { x.fillStyle = `rgba(0,0,0,${1 - sat((T - TL.lobby) / 0.6)})`; x.fillRect(0, 0, W, H); }
  if (T > TL.credits - 0.8) { x.fillStyle = `rgba(0,0,0,${sat((T - TL.credits + 0.8) / 0.8)})`; x.fillRect(0, 0, W, H); }
}

// ---------- game viewport ----------
function drawGameView(T) {
  const a = RI.S === S ? RI.a : 1, g = GX, wf = S.wf, wt = lerp(RI.wt, S.wt, a), pf = Math.max(0, wf - 1);
  RP.x = lerp(S.hx[pf], S.hx[wf], a); RP.y = lerp(S.hy[pf], S.hy[wf], a);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = false; g.filter = 'none';
  if (T < TL.run) { drawLobby(g, T); return; }
  const [sx, sy] = shake(T);
  CAM = { x: lerp(RI.cx, S.cam.x, a), y: lerp(RI.cy, S.cam.y, a), z: lerp(RI.cz, S.cam.z, a), sx, sy };
  if (a === 1) Object.assign(CAM, { x: S.cam.x, y: S.cam.y, z: S.cam.z });
  const mid = BOSS_N === 5 ? 0 : T >= TL.mn ? smooth((T - TL.mn) / 3.5) : 0;
  if (BOSS_N === 5) { drawVoid5(g, T); drawArena5(g, T, wt); } else { drawVoid(g, T, mid); drawArena(g, T, wt, mid); }
  drawFloorFx(g, T, wt);
  if (BOSS_N === 5) drawFloor5(g, T, wt); else drawSafeLanes(g, T);
  drawRangeRing(g, T, wt, wf);
  drawShadows(g, T, wt);
  drawEntities(g, T, wt, wf);
  drawDarkness(g, T, wt, wf, mid);
  drawBullets(g, T, wt);
  drawParticles(g, T, wt);
  drawTargets(g, T);
  drawHitbox(g, T, wf);
  drawNumbers(g, T, wt, wf);
  drawBubble(g, T);
  postFx(g, T, wt);
  drawGameHud(g, T, wt, wf);
}
function drawVoid(g, T, mid) {
  const px = -CAM.x * 18 - 320, py = -CAM.y * 18 - 260;
  g.drawImage(NEB, px, py);
  if (mid > 0) { g.fillStyle = `rgba(2,1,8,${0.55 * mid})`; g.fillRect(0, 0, GW, GH); }
  for (const s of STARS) {
    const x = ((s.x - CAM.x * TILE * s.p) % 2200 + 2200) % 2200 - 320, y = ((s.y - CAM.y * TILE * s.p) % 1500 + 1500) % 1500 - 210;
    if (x < -4 || y < -4 || x > GW || y > GH) continue;
    const tw = 0.55 + 0.45 * Math.sin(T * 2.2 + s.tw);
    g.globalAlpha = tw * (0.6 + 0.4 * mid); g.fillStyle = s.c; g.fillRect(x, y, s.s, s.s);
  }
  g.globalAlpha = 1;
  // colossal background gears
  const gears = [[-15, -9, 7.5, 0.05], [16, 6, 9, -0.035], [-12, 12, 6, 0.06], [14, -13, 5.5, -0.07]];
  for (const [gx, gy, r, sp] of gears) {
    const [cx, cy] = [GW / 2 + (gx - CAM.x * 0.55) * TILE * CAM.z * 0.8, GH * 0.54 + (gy - CAM.y * 0.55) * TILE * CAM.z * 0.8];
    const R = r * TILE * 0.8 * CAM.z, a0 = T * sp * (T >= TL.rwA && T < TL.rwB ? -8 : T >= TL.tsA && T < TL.tsB ? 0 : 1);
    g.save(); g.translate(cx, cy); g.rotate(a0);
    g.fillStyle = mid > 0.5 ? '#0b0914' : '#0d0b16'; g.strokeStyle = 'rgba(160,110,30,0.22)'; g.lineWidth = 4;
    g.beginPath();
    for (let k = 0; k < 24; k++) {
      const a = k * TAU / 24;
      g.lineTo(Math.cos(a - 0.08) * R, Math.sin(a - 0.08) * R); g.lineTo(Math.cos(a - 0.05) * R * 1.12, Math.sin(a - 0.05) * R * 1.12);
      g.lineTo(Math.cos(a + 0.05) * R * 1.12, Math.sin(a + 0.05) * R * 1.12); g.lineTo(Math.cos(a + 0.08) * R, Math.sin(a + 0.08) * R);
    }
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#05040a'; g.beginPath(); g.arc(0, 0, R * 0.45, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(160,110,30,0.18)'; g.lineWidth = 3;
    g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6; g.moveTo(Math.cos(a) * R * 0.45, Math.sin(a) * R * 0.45); g.lineTo(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95); } g.stroke();   // spokes in one stroke
    g.restore();
  }
}
function clockHands(T, wt) {
  // returns [hourAngle, minuteAngle] in radians from 12 o'clock, clockwise
  let hr, mn;
  if (T < TL.rw || T >= TL.rwB) {
    let t = T;
    if (T >= TL.tsA && T < TL.tsB) t = TL.tsA;
    else if (T >= TL.tsB) t = T - (TL.tsB - TL.tsA);
    if (T >= TL.rwB) t -= 10;
    mn = (t - 20) * TAU / 60; hr = mn / 12 + TAU * 7 / 12;
    if (T >= TL.p3 && T < TL.mn) { const u = (T - TL.p3) / BEAT; mn = ((t - 20) + (Math.floor(u) + Math.min(1, frac(u) * 3)) * 0.4) * TAU / 60; hr = mn / 12 + TAU * 7 / 12; }
  } else {
    const t = wt; mn = (t - 20) * TAU / 60; hr = mn / 12 + TAU * 7 / 12;
  }
  if (T >= TL.mn) {
    const u = smooth((T - TL.mn) / 3.2);
    const c = 11;
    const minsAfter11 = Math.min(59.9, (T >= TL.p4 ? (T - TL.p4) / (12 * CHIME_DT) * 60 : 0));
    const hr1 = TAU * (11 + minsAfter11 / 60) / 12, mn1 = TAU * minsAfter11 / 60;
    const k = T >= T_KILL ? 1 : 1;
    hr = lerp(hr, hr1 + TAU * 3, u); mn = lerp(mn, mn1 + TAU * 8, u);
    if (T >= TL.m12) { hr = handAngle(HANDS[1], T) + Math.PI / 2; mn = handAngle(HANDS[0], T) + Math.PI / 2; }
    void c; void k;
  }
  return [hr, mn];
}
function thickLine(buf, N, x0, y0, x1, y1, w, col) {
  const len = Math.hypot(x1 - x0, y1 - y0), steps = Math.ceil(len * 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    for (let j = -w; j <= w; j++) for (let k = -w; k <= w; k++) {
      if (j * j + k * k > w * w + 0.5) continue;
      const px = Math.round(x + j), py = Math.round(y + k);
      if (px >= 0 && py >= 0 && px < N && py < N) buf[py * N + px] = col;
    }
  }
}
function drawArena(g, T, wt, mid) {
  const C = FLOOR_C, N = FLOOR.width, s = TEX * CAM.z;
  const [ox, oy] = w2s(0, 0);
  g.imageSmoothingEnabled = false;
  // clock hands overlay (texel-accurate), composited with the floor into ARENA only when a hand has moved
  const [hr, mn] = clockHands(T, wt), key = Math.round(hr * 2000) + ',' + Math.round(mn * 2000);
  if (key !== ARENA_KEY) {
  ARENA_KEY = key;
  OVB.fill(0);
  const dark = u32('#0b0f1a'), gold = u32('#2b3650'), hi = u32('#3c4a6a'), red = u32('#5b6f99');   // slate blue: background, unlike the gold bullet hands
  const hand = (a, len, w) => {
    const ex = C + Math.sin(a) * len * 8, ey = C - Math.cos(a) * len * 8;
    thickLine(OVB, N, C, C, ex, ey, w + 1, dark); thickLine(OVB, N, C, C, ex, ey, w, gold); thickLine(OVB, N, C, C, ex, ey, Math.max(0, w - 1), hi);
    const bx = C + Math.sin(a) * len * 8 * 0.62, by = C - Math.cos(a) * len * 8 * 0.62;
    for (let j = -3; j <= 3; j++) for (let k = -3; k <= 3; k++) if (j * j + k * k <= 9) { const px = Math.round(bx + j), py = Math.round(by + k); OVB[py * N + px] = (j * j + k * k <= 3) ? red : dark; }
  };
  hand(mn, 9.4, 1); hand(hr, 6.4, 2);
  for (let j = -4; j <= 4; j++) for (let k = -4; k <= 4; k++) if (j * j + k * k <= 16) OVB[(C + k) * N + C + j] = (j * j + k * k <= 5) ? red : gold;
  OVX.putImageData(OVD, 0, 0);
  ARX.clearRect(0, 0, N, N); ARX.drawImage(FLOOR, 0, 0); ARX.globalAlpha = 0.92; ARX.drawImage(OVER, 0, 0); ARX.globalAlpha = 1;
  }
  g.drawImage(ARENA, ox - C * s, oy - C * s, N * s, N * s);
  // glowing numerals in midnight (the chime count)
  if (T >= TL.p4) {
    const c = T >= TL.m12 ? 12 : Math.min(11, Math.floor((T - TL.p4) / CHIME_DT));
    g.globalCompositeOperation = 'lighter';
    for (let h = 1; h <= c; h++) {
      const a = -Math.PI / 2 + h * Math.PI / 6, [x, y] = w2s(Math.cos(a) * 11, Math.sin(a) * 11);
      const e = CHIME(h), fl = T - e < 0.6 ? 1.6 - (T - e) : 0.6 + 0.15 * Math.sin(T * 4 + h);
      glowAt(g, 'r', x, y, 110 * CAM.z, fl);
    }
    g.globalCompositeOperation = 'source-over';
  }
  // midnight: the floor sinks into night
  if (mid > 0) {
    g.save(); g.beginPath(); g.arc(ox, oy, ARENA_R * TILE * CAM.z, 0, TAU); g.clip();
    g.fillStyle = `rgba(6,3,16,${0.45 * mid})`; g.fillRect(0, 0, GW, GH);
    g.restore();
  }
  // spectral clock aura around the boss
  if (T >= TL.land - 0.2 && T < T_KILL + 2.4) {
    const b = S.boss, [bx, by] = w2s(b.x, b.y), R = 6.2 * TILE * CAM.z, rot = (T >= TL.rwA && T < TL.rwB) ? -wt * 1.4 : wt * 0.12;
    const a = (T < TL.land ? sat((T - TL.land + 0.2) / 0.2) : 1) * (0.18 + 0.1 * mid);
    g.save(); g.translate(bx, by); g.scale(1, 0.62); g.rotate(rot);
    g.strokeStyle = `rgba(216,36,60,${a})`; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
    g.beginPath(); g.arc(0, 0, R * 0.9, 0, TAU); g.stroke();
    g.fillStyle = `rgba(230,185,58,${a * 1.4})`;
    for (let k = 0; k < 60; k++) { const an = k * TAU / 60, L = k % 5 === 0 ? 16 : 7; g.save(); g.rotate(an); g.fillRect(-2, -R, 4, L); g.restore(); }
    g.restore();
  }
}
// the final seconds: as a clock hand closes in on you, the safe radii (where every hand has a gap or doesn't reach)
// fade in as soft green shading, a half circle facing you
function drawSafeLanes(g, T) {
  if (S.survHands === undefined || T < S.survHands || T >= T_KILL || S.dead) return;
  const hands = survHands(S.survW), pa = Math.atan2(S.p.y, S.p.x), pr = Math.hypot(S.p.x, S.p.y);
  let tmin = Infinity;   // seconds until a blade crosses your angle
  for (const h of hands) {
    if (pr > h.r1 + 0.3) continue;
    const w = handW(h), th = -Math.PI / 2 + w * (T - S.survHands);
    tmin = Math.min(tmin, (((pa - th) * Math.sign(w)) % TAU + TAU) % TAU / Math.abs(w));
  }
  const u = sat(1 - tmin / 1.8); if (u <= 0) return;
  const cut = [];
  for (const h of hands) { let r = h.r0; for (const [a, z] of h.gaps) { cut.push([r, a]); r = z; } cut.push([r, h.r1]); }
  cut.sort((a, b) => a[0] - b[0]);
  const safe = []; let r = BODY_R;
  for (const [a, z] of cut) { if (a > r + 0.3) safe.push([r, a]); r = Math.max(r, z); }
  if (r < 11.9) safe.push([r, 12.1]);
  const [cx, cy] = w2s(0, 0), k = TILE * CAM.z, A = 0.3 * u * u;
  const grd = g.createConicGradient(pa - Math.PI / 2, cx, cy);   // strongest toward you, fading out a quarter turn either side
  grd.addColorStop(0, 'rgba(125,255,176,0)'); grd.addColorStop(0.25, `rgba(125,255,176,${A})`); grd.addColorStop(0.5, 'rgba(125,255,176,0)'); grd.addColorStop(1, 'rgba(125,255,176,0)');
  g.fillStyle = grd;
  for (const [r0, r1] of safe) { g.beginPath(); g.arc(cx, cy, r1 * k, 0, TAU); g.arc(cx, cy, r0 * k, 0, TAU, true); g.fill(); }
}
function drawFloorFx(g, T, wt) {
  // entry warnings for attacks that come from outside the arena: glowing dashes on the rim, one per bullet
  for (const q of S.tele) {
    if (wt < q.t0 || wt > q.t1 + 0.12 || !(q.kind === 'rim' || q.kind === 'sand' || q.kind === 'note')) continue;   // (Oryx V draws its other telegraphs in drawFloor5)
    const u = sat((wt - q.t0) / (q.t1 - q.t0)), a = (0.35 + 0.65 * u) * (wt > q.t1 ? 1 - (wt - q.t1) / 0.12 : 1) * (0.8 + 0.2 * Math.sin(T * 30));
    const sand = q.kind === 'sand' || q.kind === 'note', len = (sand ? 0.55 : 0.7) * TILE * CAM.z, green = q.col === 'g' || q.col === 'e';
    const rgb = q.kind === 'note' ? '255,130,210' : green ? '120,255,150' : sand ? '255,220,120' : '140,240,255', gk = q.kind === 'note' ? 'm' : green ? 'e' : sand ? 'g' : 'c';
    g.globalCompositeOperation = 'lighter';
    for (const [x, y, ang] of q.pts) {
      const [sx, sy] = w2s(x, y);
      glowAt(g, gk, sx, sy, 58 * CAM.z, a * 0.9);
      g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = 4 * CAM.z;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(ang) * len * (0.4 + 0.6 * u), sy + Math.sin(ang) * len * (0.4 + 0.6 * u)); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
  }
  // telegraphs for pillars and lobbed bombs
  for (const z of S.pillars) {
    if (wt < z.t0 || wt > z.ti + 0.4) continue;
    const [x, y] = w2s(z.x, z.y), R = z.r * TILE * CAM.z;
    if (wt < z.ti) {
      const u = (wt - z.t0) / (z.ti - z.t0);
      g.save(); g.translate(x, y); g.scale(1, 0.7);
      const rgb = z.kind === 'bolt' ? '120,190,255' : z.kind === 'arrow' ? '255,240,200' : z.kind === 'sword' ? '255,200,120' : z.kind === 'slam' ? '255,80,80' : '255,215,100';
      g.fillStyle = `rgba(${rgb},${0.1 + 0.2 * u})`; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
      g.strokeStyle = `rgba(${rgb},0.8)`; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
      g.beginPath(); g.arc(0, 0, R * u, 0, TAU); g.stroke();
      g.restore();
    }
  }
  for (const l of S.lobs) {
    if (wt < l.t0 || wt > l.tl) continue;
    const [x, y] = w2s(l.x1, l.y1), u = (wt - l.t0) / (l.tl - l.t0), R = (l.kind === 'glass' ? 1.0 : 0.8) * TILE * CAM.z;
    g.save(); g.translate(x, y); g.scale(1, 0.7);
    g.strokeStyle = l.kind === 'glass' ? `rgba(160,230,255,${0.4 + 0.5 * u})` : (BOSS_N === 5 && LOB5_COL[l.kind] || 'rgba(255,70,100,') + (0.4 + 0.5 * u) + ')'; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, R * (1.4 - 0.4 * u), 0, TAU); g.stroke();
    g.restore();
  }
}
function drawShadows(g, T, wt) {
  g.fillStyle = 'rgba(0,0,0,0.42)';
  const sh = (x, y, w, h) => { const [sx, sy] = w2s(x, y); g.beginPath(); g.ellipse(sx, sy, w * TILE * CAM.z / 2, h * TILE * CAM.z / 2, 0, 0, TAU); g.fill(); };
  const b = S.boss;
  if (bossVisible(T)) { g.globalAlpha = T < TL.land ? sat((T - TL.run) / 2) * 0.8 : 1; if (BOSS_N === 5) { if (b.y > -30) sh(b.x, b.y + 3.35, 5.4, 1.3); } else sh(b.x, b.y + 3.3, 5.2, 1.3); g.globalAlpha = 1; }
  const wf = S.wf;
  sh(RP.x, RP.y + 0.42, 0.8, 0.25);
}
const bossVisible = T => T >= TL.run && T < T_KILL + 2.45;

// ---------- entities ----------
function drawEntities(g, T, wt, wf) {
  const list = [];
  const b = S.boss;
  if (bossVisible(T)) list.push([b.y + 3.3, () => BOSS_N === 5 ? drawBoss5(g, T, wt) : drawBoss(g, T, wt)]);
  if (BOSS_N === 5) entities5(list, g, T, wt);
  for (const e of S.echoes) if (T >= e.T && T < TL.tsA + 0.55 && T < e.until + 0.6) { const p = echoPos(e, T < TL.tsA ? T : TL.tsA); list.push([p.y + 1.4, () => drawEcho(g, T, e, p)]); }
  for (const z of S.sent) if (T >= z.T && T < z.deadT + 0.05) list.push([z.y + 0.8, () => drawSentinel(g, T, z)]);
  { const v = wardenVis(T); if (v > 0) for (const z of S.wardens) list.push([z.y + 0.8, () => drawWarden(g, T, z, v)]); }
  for (const c of S.cuckoos) if (T >= c.T && T < c.deadT && T < T_KILL) list.push([c.y, () => drawCuckoo(g, T, c)]);
  if (S.bag && T >= S.bag.T) list.push([S.bag.y, () => drawBag(g, T)]);
  list.push([S.hy[wf] + 0.4, () => drawPlayer(g, T, wt, wf)]);
  list.sort((a, c) => a[0] - c[0]);
  for (const [, fn] of list) fn();
  // lobbed projectiles (in the air, drawn above)
  for (const l of S.lobs) {
    if (wt < l.t0 || wt >= l.tl) continue;
    const u = (wt - l.t0) / (l.tl - l.t0), x = lerp(l.x0, l.x1, u), y = lerp(l.y0, l.y1, u) - Math.sin(Math.PI * u) * 2.4;
    const [sx, sy] = w2s(x, y);
    if (l.kind === 'glass') { g.globalCompositeOperation = 'lighter'; glowAt(g, 'c', sx, sy, 70 * CAM.z, 0.5); g.globalCompositeOperation = 'source-over'; sprAt(g, SPR.icon.hourglass, sx, sy, 5 * CAM.z, wt * 9); }
    else if (BOSS_N === 5) drawLob5(g, l, sx, sy, wt);
    else { g.globalCompositeOperation = 'lighter'; glowAt(g, 'r', sx, sy, 90 * CAM.z, 0.6); g.globalCompositeOperation = 'source-over'; sprAt(g, SPR.b.orbR, sx, sy, 9 * CAM.z * (1 + 0.08 * Math.sin(wt * 20))); }
  }
  // light pillars
  for (const z of S.pillars) {
    if (BOSS_N === 5) { if (wt >= z.ti - 0.3 && wt <= z.ti + 0.4) drawStrike5(g, z, wt); continue; }
    if (wt < z.ti || wt > z.ti + 0.4) continue;
    const u = (wt - z.ti) / 0.4, [x, y] = w2s(z.x, z.y), w = z.r * TILE * CAM.z * 2 * (1 - u * 0.6);
    const grd = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    grd.addColorStop(0, 'rgba(255,200,80,0)'); grd.addColorStop(0.5, `rgba(255,248,210,${0.95 * (1 - u)})`); grd.addColorStop(1, 'rgba(255,200,80,0)');
    g.globalCompositeOperation = 'lighter'; g.fillStyle = grd; g.fillRect(x - w / 2, 0, w, y);
    glowAt(g, 'g', x, y, w * 2.2, 1 - u); g.globalCompositeOperation = 'source-over';
  }
}
function drawBoss(g, T, wt) {
  const b = S.boss, form = b.form, s = BOSS_S * CAM.z;
  const bob = Math.sin(T * 1.7) * 0.12;
  const [cx, cy] = w2s(b.x, b.y - b.z + bob);
  const ox = cx - (BOSS_CHEST[0] + 1) * s, oy = cy - (BOSS_CHEST[1] + 1) * s;
  const dead = T >= T_KILL, intro = T < TL.land;
  let tremble = 0; if (dead) tremble = Math.min(1, (T - T_KILL) / 2.2) * 5;
  const jx = tremble * (hash(Math.floor(T * 60), 1) - 0.5) * 2, jy = tremble * (hash(Math.floor(T * 60), 2) - 0.5) * 2;
  g.save(); g.translate(jx, jy);
  // aura
  g.globalCompositeOperation = 'lighter';
  const pulse = 0.5 + 0.2 * Math.sin(T * 3.1);
  glowAt(g, 'r', cx, cy, 620 * CAM.z, (intro ? 0.15 : 0.32 + 0.12 * (form)) * pulse * 2);
  g.globalCompositeOperation = 'source-over';
  // wings (unwound form)
  if (form === 1) {
    const wu = smooth((T - 134.0) / 1.3);
    for (let i = 0; i < 6; i++) for (const sd of [-1, 1]) {
      const a = sd * (0.42 + i * 0.24 * wu) + Math.sin(T * 1.3 + i) * 0.03;
      g.save(); g.translate(cx, cy - 6 * s); g.rotate(a);
      g.drawImage(SPR.wing, -SPR.wing.width * s / 2, -SPR.wing.height * s * (0.9 + 0.35 * wu), SPR.wing.width * s, SPR.wing.height * s * (0.9 + 0.35 * wu));
      g.restore();
    }
  }
  // broken halo
  {
    const [hx, hy] = [ox + 33 * s, oy + 19 * s];
    const rot = (T >= TL.rwA && T < TL.rwB) ? -wt * 3 : wt * 0.35;
    g.save(); g.translate(hx, hy); g.rotate(rot);
    const hs = s * (form ? 1.25 : 1);
    if (intro) g.globalAlpha = sat((T - 25.2) / 0.5);
    g.drawImage(SPR.halo, -SPR.halo.width * hs / 2, -SPR.halo.height * hs / 2, SPR.halo.width * hs, SPR.halo.height * hs);
    g.restore(); g.globalAlpha = 1;
  }
  // cloak with sway (sliced by texel row)
  if (intro) {
    const ra = 0.35 + 0.65 * sat((T - 24.5) / 1.3);
    g.globalAlpha = ra;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      g.drawImage(SPR.cloakRim, ox + dx * s * 0.8, oy + (CLOAK_Y + dy * 0.8) * s, SPR.cloakRim.width * s, SPR.cloakRim.height * s);
      g.drawImage(SPR.bossRim, ox + dx * s * 0.8, oy + dy * s * 0.8, SPR.bossRim.width * s, SPR.bossRim.height * s);
    }
    g.globalAlpha = 1;
  }
  const cl = intro ? SPR.cloakBlack : SPR.cloak[form];
  for (let r = 0; r < cl.height; r++) {
    const sway = Math.sin(T * 2.6 + r * 0.33) * r * 0.06 * s * (form ? 1.6 : 1);
    g.drawImage(cl, 0, r, cl.width, 1, ox + sway, oy + (CLOAK_Y + r) * s, cl.width * s, s + 0.5);
  }
  // body
  const bodyImg = intro ? SPR.bossBlack : SPR.boss[form];
  g.drawImage(bodyImg, ox, oy, bodyImg.width * s, bodyImg.height * s);
  // chest clock hands (live)
  if (!intro) {
    const [hr, mn] = clockHands(T, wt), ccx = ox + (BOSS_CHEST[0] + 1) * s, ccy = oy + (BOSS_CHEST[1] + 1) * s;
    g.fillStyle = form ? '#fff3b0' : '#ffdc72';
    for (const [a, L] of [[mn * 3, 5.2], [hr * 3, 3.4]]) for (let i = 0; i <= L; i += 0.5) {
      const px = Math.floor(Math.sin(a) * i + 0.5), py = Math.floor(-Math.cos(a) * i + 0.5);
      g.fillRect(ccx - s / 2 + px * s, ccy - s / 2 + py * s, s, s);
    }
  }
  // greatsword
  const sw = swordState(T, wt), hp = [ox + (BOSS_HAND_R[0] + 1) * s, oy + (BOSS_HAND_R[1] + 1) * s];
  g.save(); g.translate(hp[0], hp[1]); g.rotate(sw.ang);
  const sword = intro ? SPR.swordBlack : SPR.sword[form];
  if (intro) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(SPR.swordRim, (-SWORD_PIVOT[0] + dx * 0.8) * s, (-SWORD_PIVOT[1] + dy * 0.8) * s, sword.width * s, sword.height * s);
  g.drawImage(sword, -SWORD_PIVOT[0] * s, -SWORD_PIVOT[1] * s, sword.width * s, sword.height * s);
  g.restore();
  // wind-up warning: a red fan over the area the coming sweep will cover
  for (let i = S.swings.length - 1; i >= 0; i--) {
    const s0 = S.swings[i], lead = s0 - (T < TL.rwB ? wt : T);
    if (lead > 0.55 || lead < -SWING_DUR) continue;
    const left = i % 2 === 0, a0 = (left ? -1.25 : 2.25) - Math.PI / 2, a1 = (left ? 2.25 : -1.25) - Math.PI / 2;
    const u = lead > 0 ? 1 - lead / 0.55 : 1 + lead / SWING_DUR, R0 = 3.1 * TILE * CAM.z, R1 = 8.5 * TILE * CAM.z;
    g.save(); g.translate(hp[0], hp[1]); g.beginPath(); g.arc(0, 0, R1, Math.min(a0, a1), Math.max(a0, a1)); g.arc(0, 0, R0, Math.max(a0, a1), Math.min(a0, a1), true); g.closePath();
    g.fillStyle = `rgba(255,40,80,${0.10 + 0.12 * u})`; g.fill(); g.strokeStyle = `rgba(255,90,120,${0.35 * u})`; g.lineWidth = 2; g.stroke(); g.restore();
    break;
  }
  if (sw.swing >= 0) {
    g.globalCompositeOperation = 'lighter'; g.save(); g.translate(hp[0], hp[1]);
    const L = 50 * s; g.strokeStyle = `rgba(255,70,100,${0.5 * (1 - sw.u)})`; g.lineWidth = 26 * CAM.z;
    const left = sw.swing % 2 === 0, a0 = (left ? -1.25 : 2.25) - Math.PI / 2;
    g.beginPath(); g.arc(0, 0, L * 0.8, Math.min(a0, sw.ang - Math.PI / 2), Math.max(a0, sw.ang - Math.PI / 2)); g.stroke();
    g.restore(); g.globalCompositeOperation = 'source-over';
  }
  // eyes
  g.globalCompositeOperation = 'lighter';
  const eyeA = intro ? sat((T - 24.6) / 0.5) : 0.8 + 0.2 * Math.sin(T * 7);
  for (const [ex, ey] of BOSS_EYES) glowAt(g, 'r', ox + (ex + 1.5) * s, oy + (ey + 1.5) * s, 70 * CAM.z, eyeA * 0.95);
  if (intro) for (const [ex, ey] of BOSS_EYES) glowAt(g, 'w', ox + (ex + 1.5) * s, oy + (ey + 1.5) * s, 26 * CAM.z, eyeA);
  glowAt(g, 'r', ox + (BOSS_CHEST[0] + 1) * s, oy + (BOSS_CHEST[1] + 1) * s, (form ? 220 : 150) * CAM.z, intro ? 0 : 0.55 + 0.25 * Math.sin(T * 5));
  g.globalCompositeOperation = 'source-over';
  // damage flash
  const hf = fxSince('starHit', T, 0.12) || fxSince('final', T, 0.2);
  if (hf && !intro) { g.globalAlpha = 0.55; g.drawImage(SPR.bossWhite, ox, oy, SPR.bossWhite.width * s, SPR.bossWhite.height * s); g.globalAlpha = 1; }
  // death: light spilling from cracks, then flashing
  if (dead) {
    const u = sat((T - T_KILL - 0.3) / 2.1);
    g.globalCompositeOperation = 'lighter';
    const ccx = ox + (BOSS_CHEST[0] + 1) * s, ccy = oy + (BOSS_CHEST[1] + 1) * s;
    for (let k = 0; k < 9; k++) {
      const a = hash(k, 5) * TAU, L = (80 + 380 * hash(k, 6)) * u * CAM.z;
      g.strokeStyle = `rgba(255,240,200,${0.7 * u})`; g.lineWidth = (6 + 10 * hash(k, 7)) * CAM.z;
      g.beginPath(); g.moveTo(ccx, ccy); g.lineTo(ccx + Math.cos(a) * L, ccy + Math.sin(a) * L); g.stroke();
    }
    glowAt(g, 'w', ccx, ccy, 500 * u * CAM.z, u);
    g.globalCompositeOperation = 'source-over';
    if (Math.floor(T * 14) % 2 === 0) { g.globalAlpha = 0.5 * u; g.drawImage(SPR.bossWhite, ox, oy, SPR.bossWhite.width * s, SPR.bossWhite.height * s); g.globalAlpha = 1; }
  }
  // invulnerability shield (sentinels alive)
  const shielded = S.sent.length && S.sent.some(z => z.deadT === Infinity) && T >= TL.sent;
  const shatter = S.shieldT && T - S.shieldT < 0.5;
  if (shielded || shatter) {
    const a = shielded ? 0.6 + 0.15 * Math.sin(T * 6) : 1 - (T - S.shieldT) / 0.5, R = 4.3 * TILE * CAM.z * (shatter ? 1 + (T - S.shieldT) : 1);
    g.save(); g.translate(cx, cy); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(90,230,255,${a})`; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
    g.strokeStyle = `rgba(90,230,255,${a * 0.35})`; g.lineWidth = 2;
    for (let k = 0; k < 12; k++) { const an = k * TAU / 12 + T * 0.4; g.beginPath(); g.moveTo(Math.cos(an) * R, Math.sin(an) * R); g.lineTo(Math.cos(an + 0.8) * R * 0.55, Math.sin(an + 0.8) * R * 0.55); g.stroke(); }
    g.restore(); g.globalCompositeOperation = 'source-over';
  }
  g.restore();
  if (!intro && !dead) drawWeakPoint(g, T, wt);
  // orbiting clock-hand daggers
  if (!intro && !dead) {
    const n = 12, R = 3.3;
    for (let k = 0; k < n; k++) {
      const a = k * TAU / n + (T >= TL.rwA && T < TL.rwB ? -wt * 2 : wt * 0.7), [x, y] = w2s(b.x + Math.cos(a) * R, b.y - b.z + Math.sin(a) * R * 0.7 + bob);
      sprAt(g, SPR.b.hand, x, y, 4 * CAM.z, a + Math.PI / 2, 0.85);
    }
  }
}
function drawEcho(g, T, e, p) {
  const s = 3.2 * CAM.z, [cx, cy] = w2s(p.x, p.y + Math.sin(T * 2 + e.a0) * 0.15);
  const fade = sat((T - e.T) / 0.8) * sat((e.until + 0.6 - T) / 0.6), frozen = T >= TL.tsA;
  const ox = cx - (BOSS_CHEST[0] + 1) * s, oy = cy - (BOSS_CHEST[1] + 1) * s;
  g.save();
  if (frozen) g.filter = 'grayscale(1)';
  g.globalAlpha = fade * (0.7 + 0.12 * Math.sin(T * 13 + e.a0));
  const cl = SPR.echoCloak[e.id];
  for (let r = 0; r < cl.height; r += 1) g.drawImage(cl, 0, r, cl.width, 1, ox + Math.sin(T * 3 + r * 0.4) * r * 0.08 * s, oy + (CLOAK_Y + r) * s, cl.width * s, s + 0.5);
  g.drawImage(SPR.echo[e.id], ox, oy, SPR.echo[e.id].width * s, SPR.echo[e.id].height * s);
  if (e.id === 'castle') { g.save(); g.translate(ox + (BOSS_HAND_R[0] + 1) * s, oy + (BOSS_HAND_R[1] + 1) * s); g.rotate(0.3); g.drawImage(SPR.sword[0], -SWORD_PIVOT[0] * s, -SWORD_PIVOT[1] * s, SPR.sword[0].width * s, SPR.sword[0].height * s); g.restore(); }
  if (e.id === 'cellar') sprAt(g, SPR.goblet, ox + 54 * s, oy + 49 * s, s * 1.4, 0, g.globalAlpha);
  g.filter = 'none';
  g.restore();
  if (!frozen) {
    g.globalCompositeOperation = 'lighter';
    glowAt(g, e.id === 'castle' ? 'c' : e.id === 'cellar' ? 'r' : 'g', cx, cy, 260 * CAM.z, 0.3 * fade);
    g.globalCompositeOperation = 'source-over';
  }
  txt(g, e.name, cx, Math.max(84, oy - 8), 17, e.id === 'castle' ? '#9cc8ff' : e.id === 'cellar' ? '#ff6477' : '#ffd76a', { sw: 4 });
  if (T - e.T < 0.5) { g.globalCompositeOperation = 'lighter'; glowAt(g, 'w', cx, cy, 400 * (T - e.T) * CAM.z, 1 - (T - e.T) * 2); g.globalCompositeOperation = 'source-over'; }
}
// minions you have to shoot: summoning glyphs before the sentinels rise, pulsing brackets on each live one,
// and arrows at the screen edge pointing to any that are off-screen
function drawTargets(g, T) {
  const z = CAM.z, L = [];
  if (T >= TL.sent - 1.8 && T < TL.sent - 0.2) for (const [px, py] of SENT_POS) {
    const [x, y] = w2s(px, py), u = (T - TL.sent + 1.8) / 1.6, r = (70 - 30 * u) * z;
    g.globalAlpha = 0.5 + 0.5 * Math.sin(T * 14); g.strokeStyle = '#ff2442'; g.lineWidth = 4;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.beginPath(); g.arc(x, y, r * 0.55, T * 4, T * 4 + TAU * 0.7); g.stroke();
    txt(g, '!', x, y, 34, '#ff2442', { f: 'P2P', sw: 5, w: 400 }); g.globalAlpha = 1;
  }
  for (const s of S.sent) if (T >= s.T && s.deadT === Infinity) L.push([s.x, s.y, 58, '#ff2442']);
  for (const c of S.cuckoos) if (T >= c.T + 0.8 && c.deadT === Infinity && T < T_KILL) L.push([c.x, c.y, 42, '#ff9a2a']);
  if (BOSS_N === 5) for (const m of S.mobs) if (m.must && T >= m.T && m.deadT === Infinity && T < T_KILL) L.push([m.x, m.y, 60, '#c9a0ff']);
  for (const [wx, wy, r0, col] of L) {
    const [x, y] = w2s(wx, wy), r = (r0 + 5 * Math.sin(T * 8)) * z, a = T * 1.5;
    if (x < -20 || y < -20 || x > GW + 20 || y > GH + 20) {   // off-screen: an arrow on the edge
      const ex = clamp(x, 40, GW - 40), ey = clamp(y, 120, GH - 40), th = Math.atan2(y - ey, x - ex);
      g.setTransform(Math.cos(th), Math.sin(th), -Math.sin(th), Math.cos(th), ex, ey);
      g.fillStyle = col; g.strokeStyle = '#000'; g.lineWidth = 3; g.beginPath(); g.moveTo(18, 0); g.lineTo(-12, -14); g.lineTo(-12, 14); g.closePath(); g.stroke(); g.fill();
      g.setTransform(1, 0, 0, 1, 0, 0); continue;
    }
    g.strokeStyle = col; g.lineWidth = 4; g.globalAlpha = 0.75 + 0.25 * Math.sin(T * 8);
    for (let k = 0; k < 4; k++) { const b = a + k * Math.PI / 2; g.beginPath(); g.arc(x, y, r, b - 0.35, b + 0.35); g.stroke(); }
    g.globalAlpha = 1;
  }
}
function drawCuckoo(g, T, c) {
  const u = sat((T - c.T) / 0.8), [x, y] = w2s(c.x, c.y + Math.sin(T * 6 + c.h) * 0.08), s = 5 * CAM.z * (0.3 + 0.7 * u), flip = c.vx < 0 ? -1 : 1;
  g.globalCompositeOperation = 'lighter'; glowAt(g, 'r', x, y, (u < 1 ? 240 : 110) * CAM.z, u < 1 ? 0.3 + 0.7 * (1 - u) : 0.35); g.globalCompositeOperation = 'source-over';
  const hit = S.hits.some(h => h.wt <= S.wt && S.wt - h.wt < 0.06 && Math.hypot(h.x - c.x, h.y - c.y) < 1.1) || (T > c.T + 7.0 && Math.floor(T * 12) % 2 === 0);
  if (c.next - T < 0.35 && T < c.T + 7.0) { g.globalCompositeOperation = 'lighter'; glowAt(g, 'r', x, y, 150 * CAM.z, 0.9 * (1 - (c.next - T) / 0.35)); g.globalCompositeOperation = 'source-over'; }   // volley wind-up
  if (T > c.T + 7.0) { g.globalCompositeOperation = 'lighter'; glowAt(g, 'r', x, y, 200 * CAM.z * (0.5 + (T - c.T - 7.0)), 0.9); g.globalCompositeOperation = 'source-over'; }
  g.setTransform(s * flip, 0, 0, s, x, y); g.drawImage(hit ? SPR.cuckooWhite : SPR.cuckoo, -SPR.cuckoo.width / 2, -SPR.cuckoo.height / 2); g.setTransform(1, 0, 0, 1, 0, 0);
  if (u >= 1) { const bw = 44, fr = 1 - Math.min(1, c.dmg / c.hp); g.fillStyle = '#000'; g.fillRect(x - bw / 2 - 2, y + 34 * CAM.z, bw + 4, 7); g.fillStyle = '#e0283f'; g.fillRect(x - bw / 2, y + 34 * CAM.z + 1.5, bw * fr, 4); }
}
function drawWarden(g, T, z, v) {
  const f = fxSince('wardenFire', T, 0.35), firing = f && f.i === z.i && v >= 1, s = 5 * CAM.z;
  const [x, y] = w2s(z.x, z.y + (1 - v) * 1.1 + Math.sin(T * 3 + z.i) * 0.1), [, floorY] = w2s(z.x, z.y + 0.95);
  g.globalCompositeOperation = 'lighter'; glowAt(g, 'g', x, y, (firing ? 200 : 120) * CAM.z, (firing ? 0.9 : 0.45) * v); g.globalCompositeOperation = 'source-over';
  g.save(); g.beginPath(); g.rect(0, 0, GW, floorY); g.clip();   // rises out of / sinks into the dial
  g.globalAlpha = v; g.drawImage(SPR.sentinel, x - SPR.sentinel.width * s / 2, y - SPR.sentinel.height * s / 2, SPR.sentinel.width * s, SPR.sentinel.height * s);
  g.restore();
  g.globalAlpha = v; txt(g, z.num, x, y - 58 * CAM.z, 16, firing ? '#fff1a6' : '#d9ab30', { f: 'P2P', sw: 4, w: 400 }); g.globalAlpha = 1;
}
function drawSentinel(g, T, z) {
  const [x, y] = w2s(z.x, z.y + Math.sin(T * 3 + z.i) * 0.1), s = 5 * CAM.z;
  const u = sat((T - z.T) / 0.4);
  g.globalAlpha = u;
  g.drawImage(SPR.sentinel, x - SPR.sentinel.width * s / 2, y - SPR.sentinel.height * s / 2, SPR.sentinel.width * s, SPR.sentinel.height * s);
  const hit = S.hits.some(h => h.wt <= S.wt && S.wt - h.wt < 0.06 && Math.hypot(h.x - z.x, h.y - z.y) < 1.2);
  if (hit) { g.globalAlpha = 0.6; g.drawImage(SPR.sentinelWhite, x - SPR.sentinel.width * s / 2, y - SPR.sentinel.height * s / 2, SPR.sentinel.width * s, SPR.sentinel.height * s); }
  g.globalAlpha = 1;
  const w = 70, fr = 1 - Math.min(1, z.dmg / z.hp);
  g.fillStyle = '#000'; g.fillRect(x - w / 2 - 2, y + 62 * CAM.z, w + 4, 9);
  g.fillStyle = '#e0283f'; g.fillRect(x - w / 2, y + 62 * CAM.z + 2, w * fr, 5);
}
function drawBag(g, T) {
  const bg = S.bag, u = T - bg.T, [x, y] = w2s(bg.x, bg.y - Math.max(0, 1.2 - u * 4) + Math.abs(Math.sin(Math.min(u, 0.6) * 10)) * 0.2 * Math.max(0, 1 - u * 1.6));
  g.globalCompositeOperation = 'lighter';
  const grd = g.createLinearGradient(x, y - 420, x, y);
  grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(1, `rgba(255,255,255,${0.35 + 0.1 * Math.sin(T * 5)})`);
  g.fillStyle = grd; g.fillRect(x - 26, y - 420, 52, 420);
  glowAt(g, 'w', x, y, 190, 0.7);
  g.globalCompositeOperation = 'source-over';
  sprAt(g, SPR.bag, x, y, 8 * CAM.z);
  for (let k = 0; k < 6; k++) { const a = T * 2 + k * 1.05, r = 44 + 8 * Math.sin(T * 3 + k); g.fillStyle = '#fff'; g.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6 - 10, 4, 4); }
}
function playerSprite(dir, face, walk, atk) {
  const n = SPR.ninja, fr = walk >= 0 ? Math.floor(walk / 0.55) % 2 : 0;
  if (dir === 0) return [atk ? n.sideAtk : n.side[fr], face];
  if (dir === 1) return [atk ? n.frontAtk : n.front[fr], 1];
  return [atk ? n.backAtk : n.back[fr], 1];
}
function drawPlayer(g, T, wt, wf) {
  const px = RP.x, py = RP.y, s = TEX * CAM.z;
  const atk = S.T - S.hatk[wf] < 0.075 && T < T_KILL;   // cast pose alternates with the rest pose on every shot
  const [img, flip] = playerSprite(S.hdir[wf], S.hface[wf], S.hwalk[wf], atk);
  const [x, y] = w2s(px, py);
  // speedy afterimages during the dash
  if (S.p.dash && T >= TL.tsB && T < S.p.dash.T1 + 0.3) {
    for (let k = 1; k <= 5; k++) {
      const wf2 = Math.max(0, wf - k * 3), [ax, ay] = w2s(S.hx[wf2], S.hy[wf2]);
      g.globalAlpha = 0.35 - k * 0.05; g.drawImage(SPR.ninjaGhost, ax - SPR.ninjaGhost.width * s / 2, ay - SPR.ninjaGhost.height * s * 0.6, SPR.ninjaGhost.width * s, SPR.ninjaGhost.height * s);
    }
    g.globalAlpha = 1;
  }
  g.globalCompositeOperation = 'lighter'; glowAt(g, 'g', x, y + 0.3 * TILE * CAM.z, 90 * CAM.z, 0.22); g.globalCompositeOperation = 'source-over';
  const hurt = S.phits.length && S.phits[S.phits.length - 1].wt <= wt && wt - S.phits[S.phits.length - 1].wt < 0.08;
  const ax = 5;   // the hitbox sits on the torso centre: grid column 4 in every pose (+1 for the outline padding)
  g.globalAlpha = 0.5;   // half-transparent: bullets and the hitbox dot stay visible through the character
  g.setTransform(s * flip, 0, 0, s, x, y); g.drawImage(img, -ax, -img.height * 0.6); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  if (atk) { const tip = [w2s(px + Math.cos(S.p.aim) * 0.6, py - 0.25 + Math.sin(S.p.aim) * 0.6)][0]; g.globalCompositeOperation = 'lighter'; glowAt(g, 'p', tip[0], tip[1], 70 * CAM.z, 0.7); g.globalCompositeOperation = 'source-over'; }   // cast flash
  if (hurt) { g.setTransform(s * flip, 0, 0, s, x, y); g.globalAlpha = 0.3; g.drawImage(tintCache(img), -ax, -img.height * 0.6); g.globalAlpha = 1; g.setTransform(1, 0, 0, 1, 0, 0); }
  // hp / mp bars under the sprite
  const bw = 62 * CAM.z, by = y + 0.5 * TILE * CAM.z;
  const hp = S.hhp[wf] / P_MAXHP, mp = S.hmp[wf] / P_MAXMP;
  g.fillStyle = '#000'; g.fillRect(x - bw / 2 - 2, by, bw + 4, 14);
  g.fillStyle = hp < 0.25 ? (Math.floor(T * 8) % 2 ? '#ff3030' : '#8a1010') : '#3fd46a'; g.fillRect(x - bw / 2, by + 2, bw * hp, 5);
  g.fillStyle = '#4b7bff'; g.fillRect(x - bw / 2, by + 8, bw * mp, 4);
}
// katana reach: a faint dashed ring around the slash origin, gold while the weak point is within reach
function drawRangeRing(g, T, wt, wf) {
  if (S.dead || T < TL.land || T >= T_KILL) return;
  const ox = RP.x, oy = RP.y - 0.25, [x, y] = w2s(ox, oy), R = PK.slash.range * TILE * CAM.z;
  const w = wpPos(T, wt, S.boss), inReach = Math.hypot(w.x - ox, w.y - oy) - WP_R <= PK.slash.range && bossVulnerable(T);
  g.save(); g.setLineDash([14, 10]); g.lineDashOffset = -T * 12;
  g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
  g.lineWidth = 2.5; g.strokeStyle = inReach ? 'rgba(255,214,100,0.62)' : 'rgba(220,225,245,0.34)';
  g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke(); g.restore();
}
// the player's real hitbox is a single point; a small dot above the bullets shows exactly where it is
function drawHitbox(g, T, wf) {
  if (S.dead || T >= T_KILL) return;
  const [sx, sy] = w2s(RP.x, RP.y), x = Math.round(sx), y = Math.round(sy);   // whole pixels: perfectly symmetric
  g.globalCompositeOperation = 'lighter'; glowAt(g, 'w', x, y, 22, 0.5); g.globalCompositeOperation = 'source-over';   // soft halo
  g.fillStyle = '#000000'; g.beginPath(); g.arc(x, y, 4.5, 0, TAU); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.fill();
  g.fillStyle = '#000000'; g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill();
}
// the Heart of the Hour: the only part of the boss that takes damage
function drawWeakPoint(g, T, wt) {
  const b = S.boss, bob = Math.sin(T * 1.7) * 0.12, w = wpPos(T, wt, b), z = CAM.z;
  const [x, y] = w2s(w.x, w.y + bob), [cx, cy] = w2s(b.x, b.y - b.z + bob), vul = bossVulnerable(T);
  let hit = false;
  for (let i = S.hits.length - 1; i >= 0 && i > S.hits.length - 12; i--) { const h = S.hits[i]; if (h.wp && wt - h.wt >= 0 && wt - h.wt < 0.07) { hit = true; break; } }
  const R = WP_R * TILE * z, pulse = 0.5 + 0.5 * Math.sin(T * 7);
  g.save(); g.setLineDash([6, 9]); g.lineWidth = 3; g.strokeStyle = vul ? 'rgba(255,200,120,0.5)' : 'rgba(160,180,210,0.25)';
  g.beginPath(); g.ellipse(cx, cy, WP_ORB * TILE * z, 0.8 * WP_ORB * TILE * z, 0, 0, TAU); g.stroke(); g.restore();
  // dark backing so the target reads against the boss sprite
  g.fillStyle = vul ? 'rgba(20,0,8,0.45)' : 'rgba(10,12,20,0.35)'; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
  g.globalCompositeOperation = 'lighter';
  glowAt(g, vul ? 'g' : 'c', x, y, 300 * z, vul ? 0.85 + 0.15 * pulse : 0.3);
  glowAt(g, vul ? 'r' : 'c', x, y, 170 * z, vul ? 0.85 : 0.2);
  if (hit) glowAt(g, 'w', x, y, 230 * z, 1);
  g.globalCompositeOperation = 'source-over';
  sprAt(g, SPR.b.gear, x, y, 10 * z, T * 2.5, vul ? 1 : 0.6);
  g.fillStyle = hit ? '#ffffff' : vul ? '#fff1dc' : '#8a95ad'; g.beginPath(); g.arc(x, y, 13 * z, 0, TAU); g.fill();
  g.fillStyle = vul ? '#ff2442' : '#4a5470'; g.beginPath(); g.arc(x, y, 7 * z, 0, TAU); g.fill();
  // the hittable circle: thick gold ring with a black outline, pulsing
  const col = vul ? (hit ? '#ffffff' : `rgba(255,${215 + 40 * pulse | 0},${90 + 90 * pulse | 0},1)`) : 'rgba(160,180,210,0.6)';
  g.lineWidth = 9; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
  g.lineWidth = 5; g.strokeStyle = col; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
  if (vul) { // four chevrons pointing inward
    const d = R + 14 + 6 * pulse;
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + T * 0.8, ux = Math.cos(a), uy = Math.sin(a), px = x + ux * d, py = y + uy * d;
      g.beginPath(); g.moveTo(px - ux * 2, py - uy * 2); g.lineTo(px + ux * 16 - uy * 10, py + uy * 16 + ux * 10); g.lineTo(px + ux * 16 + uy * 10, py + uy * 16 - ux * 10); g.closePath();
      g.fillStyle = 'rgba(0,0,0,0.7)'; g.fill(); g.lineWidth = 2; g.strokeStyle = col; g.stroke();
    }
  }
}
const _tint = new Map();
function tintCache(img) { if (!_tint.has(img)) _tint.set(img, tinted(img, '#ff2020', 1)); return _tint.get(img); }

// ---------- projectiles ----------
// visual kinds: sprite scale and orientation (bell sways, rew leaves rewind afterimages)
const VK = { bell: { sc: 5, swing: 1 }, mark: { sc: 5.5, radial: 1 }, feather: { sc: 4.2, orient: 1 }, jewel: { sc: 4.2, spin: 3 },
  link: { sc: 5, radial: 1 }, bob: { sc: 5.2, radial: 1 }, rew: { sc: 5, trail: 1 } };
function drawBullets(g, T, wt) {
  const al = S.al, n = al.length, z = CAM.z;
  if (BPX.length < n) { BPX = new Float32Array(n * 2); BPY = new Float32Array(n * 2); BPT = new Float32Array(n * 2); }
  const k0 = TILE * z, ox = GW / 2 - CAM.x * k0 + CAM.sx, oy = GH * 0.54 - CAM.y * k0 + CAM.sy;   // w2s, inlined
  for (let i = 0; i < n; i++) { bpos(al[i], wt); BPX[i] = ox + BX * k0; BPY[i] = oy + BY * k0; BPT[i] = BTH; }
  // glow pass
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const b = al[i]; if (T < b.rv && (!b.tg || b.hid)) continue;
    const x = BPX[i], y = BPY[i]; if (x < -60 || y < -60 || x > GW + 60 || y > GH + 60) continue;
    const k = BK[b.k], ga = T < b.rv ? 0.25 + 0.15 * Math.sin(T * 14) : 1;
    glowAt(g, k.glow, x, y, (k.gs || (b.k === 'orbW' ? 90 : b.k === 'sand' ? 34 : 64)) * z, (k.ga || (b.k === 'sand' ? 0.35 : 0.5)) * ga);
  }
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < n; i++) {
    const b = al[i]; if (T < b.rv && (!b.tg || b.hid)) continue;
    const x = BPX[i], y = BPY[i]; if (x < -60 || y < -60 || x > GW + 60 || y > GH + 60) continue;
    const k = BK[b.k], v = b.vk ? VK[b.vk] : k, alpha = T < b.rv ? 0.3 + 0.15 * Math.sin(T * 14) : 1;
    let rot = 0;
    if (v.orient) rot = bhead(b, wt); else if (v.spin) rot = (wt - b.t0) * v.spin; else if (v.radial) rot = BPT[i]; else if (v.swing) rot = 0.35 * Math.sin((wt - b.t0) * 8 + b.th * 5);
    if (v.trail) for (let j = 3; j >= 1; j--) { bpos(b, wt - j * 0.07); const [tx, ty] = w2s(BX, BY); sprAt(g, SPR.b[b.k], tx, ty, k.sc * z * (1 - j * 0.1), 0, alpha * (0.55 - j * 0.14)); }
    sprAt(g, SPR.b[b.vk || b.k], x, y, v.sc * z, rot, alpha);
    if (b.rv && T - b.rv < 0.15) { g.globalCompositeOperation = 'lighter'; glowAt(g, 'w', x, y, 120 * z, 1 - (T - b.rv) / 0.15); g.globalCompositeOperation = 'source-over'; }
  }
  // player projectiles
  for (const q of S.pb) {
    if (wt < q.t0 || wt >= q.t0 + q.life || wt >= q.hitT) continue;
    const tau = wt - q.t0, px = q.x0 + Math.cos(q.ang) * q.spd * tau, py = q.y0 + Math.sin(q.ang) * q.spd * tau;
    const [x, y] = w2s(px, py);
    if (q.k === 'slash') {
      const nx = -Math.sin(q.ang) * 0.17, ny = Math.cos(q.ang) * 0.17;   // the staff fires its bolts in pairs
      for (const sg of [-1, 1]) { const [bx, by] = w2s(px + nx * sg, py + ny * sg); g.globalCompositeOperation = 'lighter'; glowAt(g, 'p', bx, by, 46 * z, 0.4); g.globalCompositeOperation = 'source-over'; sprAt(g, SPR.b.bolt, bx, by, 4.4 * z, q.ang); }
    } else {
      const big = q.k === 'bigStar';
      g.globalCompositeOperation = 'lighter';
      for (let k = 1; k <= 4; k++) { const [tx, ty] = w2s(px - Math.cos(q.ang) * k * 0.35, py - Math.sin(q.ang) * k * 0.35); glowAt(g, 'p', tx, ty, (big ? 120 : 70) * z * (1 - k * 0.18), 0.35 - k * 0.07); }
      glowAt(g, 'p', x, y, (big ? 200 : 110) * z, 0.8);
      g.globalCompositeOperation = 'source-over';
      sprAt(g, big ? SPR.b.bigStar : SPR.b.star, x, y, (big ? 6.5 : 5.5) * z, tau * 18);
    }
  }
}
const PCOL = { g: ['#ffd23f', '#fff2a8', '#ff9a2a'], p: ['#c77dff', '#f2ddff', '#ffd23f'], c: ['#5ff2ff', '#d2f8ff'], r: ['#ff3b55', '#ff9aa8'], w: ['#ffffff', '#fff3cf'], gear: ['#d1a12a', '#9a7215', '#ffdc72', '#302842'], blood: ['#d8243c', '#5e0d1e'] };
function drawParticles(g, T, wt) {
  for (const e of S.parts) {
    const tau = e.rt ? T - e.T : wt - e.t; if (tau < 0 || tau > e.life * 1.05) continue;
    if (e.col === 'clear') {
      for (let i = 0; i < e.snap.length; i++) {
        const [bx, by, k] = e.snap[i], [x, y] = w2s(bx, by), u = tau / e.life;
        g.globalCompositeOperation = 'lighter'; glowAt(g, BK[k].glow, x, y, (40 + 80 * u) * CAM.z, 0.8 * (1 - u)); g.globalCompositeOperation = 'source-over';
        g.fillStyle = `rgba(255,255,255,${1 - u})`; g.fillRect(x - 3 + (hash(i, 9) - 0.5) * 40 * u, y - 3 - 40 * u * hash(i, 8), 5, 5);
      }
      continue;
    }
    const cols = PCOL[e.col] || PCOL.w;
    for (let i = 0; i < e.n; i++) {
      const a = hash(e.seed, i) * TAU, v = e.spd * (0.3 + 0.7 * hash(e.seed, i, 1)), li = e.life * (0.5 + 0.5 * hash(e.seed, i, 2));
      if (tau > li) continue;
      const d = v * tau * (1 - tau / (2 * li)), [x, y] = w2s(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d - (e.up || 0) * tau);
      const sz = (e.col === 'gear' ? 9 : 6) * CAM.z * (1 - 0.5 * tau / li);
      g.fillStyle = cols[i % cols.length]; g.globalAlpha = 1 - tau / li;
      g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
    g.globalAlpha = 1;
  }
}

// ---------- darkness / vision ----------
function drawDarkness(g, T, wt, wf, mid) {
  let a = 0;
  if (T < TL.land) a = 0.8 * (1 - sat((T - TL.land + 0.15) / 0.15));
  if (mid > 0 && T < T_KILL + 2.4) a = Math.max(a, 0.62 * mid);
  if (T >= T_KILL + 2.4) a = Math.max(0, 0.62 * (1 - sat((T - T_KILL - 2.4) / 1.5)));
  if (a <= 0) return;
  const [px, py] = w2s(RP.x, RP.y), D = Math.round(1240 * CAM.z), x0 = Math.round(px - D / 2), y0 = Math.round(py - D / 2);
  g.globalAlpha = a; g.imageSmoothingEnabled = true; g.drawImage(DARK_SPOT, x0, y0, D, D); g.imageSmoothingEnabled = false;
  g.fillStyle = '#03010a'; g.fillRect(0, 0, GW, Math.max(0, y0)); g.fillRect(0, y0 + D, GW, Math.max(0, GH - y0 - D));
  g.fillRect(0, y0, Math.max(0, x0), D); g.fillRect(x0 + D, y0, Math.max(0, GW - x0 - D), D); g.globalAlpha = 1;
}

// ---------- floating numbers / text ----------
function drawNumbers(g, T, wt, wf) {
  for (const h of S.hits) {
    if (h.armor) { // blocked: a white spark, plus a word for blocked stars
      const tau = wt - h.wt, d = h.kind === 'slash' ? 0.16 : 0.75; if (tau < 0 || tau > d) continue;
      const [x, y] = w2s(h.x, h.y), a = 1 - tau / d, L = (h.kind === 'slash' ? 9 : 16) * (1 + tau * 4);
      g.globalAlpha = a; g.strokeStyle = '#e8f0ff'; g.lineWidth = 2;
      for (let k = 0; k < 4; k++) { const an = k * Math.PI / 2 + Math.PI / 4 + hash(Math.round(h.wt * 600), k) * 0.5; g.beginPath(); g.moveTo(x + Math.cos(an) * L * 0.3, y + Math.sin(an) * L * 0.3); g.lineTo(x + Math.cos(an) * L, y + Math.sin(an) * L); g.stroke(); }
      if (h.kind !== 'slash') txt(g, 'BLOCKED', x, y - 30 - tau * 40, 20, '#b8c4dc', { sw: 4 });
      g.globalAlpha = 1; continue;
    }
    const dur = h.final ? 3.4 : h.big ? 1.9 : h.kind === 'star' ? 1.35 : 0.85;
    const tau = (h.final ? T - T_KILL : wt - h.wt); if (tau < 0 || tau > dur) continue;
    const u = tau / dur, jx = (hash(Math.round(h.wt * 600), 3) - 0.5) * (h.kind === 'slash' ? 1.6 : 0.6);
    const [x, y] = w2s(h.x + jx, h.y - 0.5 - easeOut(Math.min(1, tau / 0.5)) * (h.final ? 1.4 : 1.0) - (h.kind === 'slash' ? 0.6 * hash(Math.round(h.wt * 600), 4) : 0));
    const alpha = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
    g.globalAlpha = alpha;
    if (h.final) {
      const sc = 1 + 1.4 * Math.max(0, 1 - tau / 0.18);
      g.globalCompositeOperation = 'lighter'; glowAt(g, 'p', x, y, 520, 0.8 * alpha); g.globalCompositeOperation = 'source-over';
      txt(g, fmtInt(h.dmg), x, y, 78 * sc, '#ffffff', { sc: '#5a1a8a', sw: 12 });
    } else if (h.big) {
      g.globalCompositeOperation = 'lighter'; glowAt(g, 'p', x, y, 260, 0.6 * alpha); g.globalCompositeOperation = 'source-over';
      txt(g, fmtInt(h.dmg), x, y, 50 * (1 + 0.5 * Math.max(0, 1 - tau / 0.12)), '#f6e6ff', { sc: '#4a1070', sw: 9 });
    } else if (h.kind === 'star') txt(g, fmtInt(h.dmg), x, y, h.crit ? 42 : 36, h.crit ? '#ffe070' : '#ffd23f', { sc: '#3a1a00', sw: 7 });
    else txt(g, fmtInt(h.dmg), x, y, h.crit ? 27 : 22, h.crit ? '#ffae3b' : '#ff4040', { sw: 5 });
    g.globalAlpha = 1;
  }
  for (const h of S.phits) {
    const tau = wt - h.wt; if (tau < 0 || tau > 0.9) continue;
    const [x, y] = w2s(h.x, h.y - 0.9 - tau * 0.9);
    g.globalAlpha = tau < 0.6 ? 1 : 1 - (tau - 0.6) / 0.3;
    txt(g, '-' + h.dmg, x, y, h.dmg > 300 ? 34 : 24, '#ff2a2a', { sw: 5 });
    g.globalAlpha = 1;
  }
  const [px, py] = w2s(RP.x, RP.y);
  for (const e of S.fx) {
    const tau = T - e.T; if (tau < 0 || tau > 1.6) continue;
    const a = tau < 1.1 ? 1 : 1 - (tau - 1.1) / 0.5;
    g.globalAlpha = a;
    if (e.type === 'heal') { txt(g, '+' + e.v, px, py - 70 - tau * 50, 26, '#4dff7a', { sw: 5 }); if (e.text) txt(g, e.text, px, py - 110 - tau * 50, 22, '#7dffb0', { sw: 5 }); }
    if (e.type === 'status') txt(g, e.text, px, py - 95 - tau * 40, 22, e.col, { sw: 5 });
    g.globalAlpha = 1;
  }
}
function drawBubble(g, T) {
  let last = null;
  for (const c of CHAT) if (c[1] === 'boss' && c[0] <= T && T - c[0] < 3.4) last = c;
  if (!last || !bossVisible(T) && T < T_KILL) return;
  if (BOSS_N === 5 && banner5(T)) return;   // Oryx V: his class banner has the top of the screen (the line is still in the chat)
  const b = S.boss, [x, y0] = w2s(b.x, b.y - b.z - 5.4);
  const a = sat((T - last[0]) / 0.15) * (T - last[0] > 3.0 ? 1 - (T - last[0] - 3.0) / 0.4 : 1);
  g.globalAlpha = a;
  g.font = '700 22px Pix';
  const lines = last.bl || (last.bl = wrap(g, last[2], 460)), w = last.bw || (last.bw = Math.max(...lines.map(l => g.measureText(l).width)) + 36), h = lines.length * 28 + 22;
  const y = clamp(y0, 82 + h, GH - 60);
  const bx = clamp(x - w / 2, 20, GW - w - 20);
  panel(g, bx, y - h, w, h, { bg: 'rgba(20,6,12,0.92)', bd: '#d8243c', r: 8 });
  g.fillStyle = 'rgba(20,6,12,0.92)'; g.beginPath(); g.moveTo(x - 10, y - 1); g.lineTo(x + 10, y - 1); g.lineTo(x, y + 14); g.fill();
  lines.forEach((l, i) => txt(g, l, bx + w / 2, y - h + 24 + i * 28, 22, '#ffe6d0', { sw: 0 }));
  g.globalAlpha = 1;
}

// ---------- post effects inside the game view ----------
function postFx(g, T, wt) {
  // chime shockwaves / landing / final
  g.globalCompositeOperation = 'lighter';
  for (const e of S.fx) {
    const tau = T - e.T; if (tau < 0 || tau > 1.2) continue;
    if (e.type === 'chime' || e.type === 'land' || e.type === 'final' || e.type === 'explode' || e.type === 'boom' || e.type === 'resume' || e.type === 'transform') {
      const [x, y] = w2s(e.x ?? S.boss.x, e.y ?? S.boss.y);
      const R = (e.type === 'boom' ? 180 : e.type === 'final' ? 900 : 1200) * easeOut(tau / 1.2) * CAM.z;
      g.strokeStyle = e.type === 'chime' ? `rgba(255,90,120,${0.8 * (1 - tau / 1.2)})` : `rgba(255,236,190,${0.8 * (1 - tau / 1.2)})`;
      g.lineWidth = 14 * (1 - tau / 1.2) + 2;
      g.beginPath(); g.ellipse(x, y, R, R * 0.66, 0, 0, TAU); g.stroke();
    }
    if (e.type === 'blink') { const [x, y] = w2s(e.x, e.y); glowAt(g, 'r', x, y, 500 * (1 - tau / 1.2), 1 - tau / 1.2); }
    if (e.type === 'echoShatter') { const [x, y] = w2s(e.x, e.y - 1); glowAt(g, 'w', x, y, 420 * easeOut(tau / 0.5), Math.max(0, 1 - tau / 0.7)); }
  }
  g.globalCompositeOperation = 'source-over';
  // rewind: VHS
  if (T >= TL.rwA - 0.1 && T < TL.rwB + 0.25) {
    const k = T < TL.rwA ? (T - TL.rwA + 0.1) / 0.1 : T > TL.rwB ? 1 - (T - TL.rwB) / 0.25 : 1;
    TX2.setTransform(1, 0, 0, 1, 0, 0); TX2.clearRect(0, 0, GW, GH);
    TX2.filter = 'sepia(0.55) saturate(1.4) hue-rotate(150deg) contrast(1.15)'; TX2.drawImage(CV, 0, 0, GW, GH, 0, 0, GW, GH); TX2.filter = 'none';
    g.fillStyle = '#000'; g.fillRect(0, 0, GW, GH);
    for (let yb = 0; yb < GH; yb += 12) {
      const off = (hash(yb, Math.floor(T * 30)) - 0.5) * 38 * k + Math.sin(yb * 0.02 + T * 40) * 6 * k;
      g.drawImage(TMP, 0, yb, GW, 12, off, yb, GW, 12);
    }
    g.fillStyle = `rgba(0,0,0,${0.18 * k})`; for (let yb = 0; yb < GH; yb += 4) g.fillRect(0, yb, GW, 2);
    for (let i = 0; i < 3; i++) { const yy = ((T * 700 + i * 380) % (GH + 200)) - 100; g.fillStyle = `rgba(255,255,255,${0.1 * k})`; g.fillRect(0, yy, GW, 22 + i * 8); }
    if (T >= TL.rwA && T < TL.rwB) {
      const blink = Math.floor(T * 3) % 2 === 0;
      txt(g, '◀◀ REWIND', 70, 170, 44, '#ffffff', { a: 'left', f: 'P2P', sw: 6, w: 400 });
      if (blink) txt(g, 'PLAY', 70, 230, 22, 'rgba(255,255,255,0.0)', { a: 'left', f: 'P2P', sw: 0, w: 400 });
      const wtv = S.wt - T_RUN + 0.0; txt(g, 'WORLD ' + fmtTime(Math.max(0, wtv), 2), 70, 226, 26, '#9ff4ff', { a: 'left', f: 'P2P', sw: 5, w: 400 });
    }
  }
  // time stop: inversion sphere then grayscale
  if (T >= TL.tsA && T < TL.tsB + 0.5) {
    TX2.setTransform(1, 0, 0, 1, 0, 0); TX2.clearRect(0, 0, GW, GH); TX2.drawImage(CV, 0, 0, GW, GH, 0, 0, GW, GH);
    const [bx, by] = w2s(S.boss.x, S.boss.y);
    if (T < TL.tsB) {
      const u = (T - TL.tsA) / 0.55;
      g.filter = 'grayscale(1) contrast(1.25) brightness(0.92)'; g.drawImage(TMP, 0, 0); g.filter = 'none';
      if (u < 1.3) {
        const R = easeOut(Math.min(1, u)) * 2400, R2 = Math.max(0, u - 0.3) / 1.0 * 2400;
        g.save(); g.beginPath(); g.arc(bx, by, R, 0, TAU); g.arc(bx, by, R2, 0, TAU, true); g.clip('evenodd');
        g.filter = 'invert(1) hue-rotate(180deg)'; g.drawImage(TMP, 0, 0); g.filter = 'none'; g.restore();
      }
      g.fillStyle = 'rgba(40,0,20,0.12)'; g.fillRect(0, 0, GW, GH);
    } else {
      const u = (T - TL.tsB) / 0.5;
      g.save(); g.beginPath(); g.rect(0, 0, GW, GH); g.arc(bx, by, easeIn(u) * 2400, 0, TAU, true); g.clip('evenodd');
      g.filter = 'grayscale(1)'; g.drawImage(TMP, 0, 0); g.filter = 'none'; g.restore();
    }
  }
  if (BOSS_N === 5) postFx5(g, T, wt);
  // flashes
  const fl = (type, dur, col) => { const e = fxSince(type, T, dur); if (e) { g.fillStyle = col.replace('A', String(1 - (T - e.T) / dur)); g.fillRect(0, 0, GW, GH); } };
  fl('final', 0.5, 'rgba(255,255,255,A)'); fl('land', 0.35, 'rgba(255,220,200,A)'); fl('explode', 0.8, 'rgba(255,245,220,A)'); fl('transform', 0.5, 'rgba(255,80,110,A)');
  if (T >= TL.run && T < TL.run + 0.45) { g.fillStyle = `rgba(255,240,255,${1 - (T - TL.run) / 0.45})`; g.fillRect(0, 0, GW, GH); }
  // low hp vignette
  // time stop: show the one gap in the ring of blades, in colour over the grey world
  if (S.blink && T >= TL.tsA + 3.0 && T < TL.tsB + 0.6) {
    const bl = S.blink, [px, py] = w2s(bl.px, bl.py), k = 0.55 + 0.45 * Math.sin(T * 10);
    g.save(); g.translate(px, py); g.rotate(bl.gap); g.globalCompositeOperation = 'lighter';
    const R = 3.3 * TILE * CAM.z;
    glowAt(g, 'c', R * 0.75, 0, 260 * CAM.z, 0.8 * k);
    g.strokeStyle = `rgba(160,255,200,${k})`; g.lineWidth = 10;
    g.beginPath(); g.arc(0, 0, R, -Math.PI / 4 + 0.08, Math.PI / 4 - 0.08); g.stroke();
    g.fillStyle = `rgba(190,255,215,${k})`;
    for (const s of [0.35, 0.6, 0.85, 1.1]) { g.beginPath(); g.moveTo(R * s + 30, 0); g.lineTo(R * s - 8, -24); g.lineTo(R * s - 8, 24); g.closePath(); g.fill(); }
    g.restore(); g.globalCompositeOperation = 'source-over';
  }
  const lo = fxSince('lowhp', T, 1.6);
  const hpFrac = S.hhp[S.wf] / P_MAXHP;
  const la = Math.max(lo ? 1 - (T - lo.T) / 1.6 : 0, hpFrac < 0.3 && T < T_KILL ? (0.3 - hpFrac) * 2.5 : 0);
  if (la > 0) { g.globalAlpha = 0.55 * la * (0.75 + 0.25 * Math.sin(T * 12)); g.drawImage(VIG_LOW, 0, 0); g.globalAlpha = 1; }
  g.drawImage(VIG_MOOD, 0, 0);   // mood vignette
}

// ---------- HUD inside the game view ----------
function drawGameHud(g, T, wt, wf) {
  drawNameplate(g, T, wf);
  if (T >= TL.run + 0.4 && T < T_KILL + 3.0) (BOSS_N === 5 ? drawBossBar5 : drawBossBar)(g, T, wt, wf);
  drawSurvivalHud(g, T);
  if (T >= TL.p4 - 0.5 && T < T_KILL + 3.0) {
    const c = T >= TL.m12 ? 12 : Math.max(0, Math.min(11, Math.floor((T - TL.p4) / CHIME_DT))), last = c === 12 ? TL.m12 : c ? CHIME(c) : -9, fl = Math.max(0, 1 - (T - last) / 0.6);
    const a = sat((T - TL.p4 + 0.5) / 0.5);
    g.globalAlpha = a;
    const X0 = GW - 400, Y0 = 8;
    panel(g, X0, Y0, 390, 58, { bg: 'rgba(20,4,10,0.82)', bd: fl > 0 ? '#ff4f6a' : '#6a0f22', lw: 2 + fl * 2 });
    txt(g, c === 12 ? (T >= TL.sv ? 'THE FINAL SECONDS' : 'MIDNIGHT') : 'THE CLOCK STRIKES', X0 + 128, Y0 + 16, 12, c === 12 ? '#ff6477' : '#c9b8d8', { a: 'left', f: 'SilkB', sw: 0, w: 400 });
    txt(g, c ? ROMAN[c % 12] : '\u2014', X0 + 14, Y0 + 31, 22 * (1 + 0.35 * fl), c >= 9 ? '#ff4f6a' : '#ffe07a', { a: 'left', f: 'P2P', sw: 4, w: 400 });
    for (let k = 1; k <= 12; k++) {
      const px = X0 + 134 + (k - 1) * 20, py = Y0 + 39, lit = k <= c && T < T_KILL + 3;
      g.fillStyle = k === 12 ? (c === 12 ? '#ff2442' : '#2a0710') : lit ? (k >= 9 ? '#ff4f6a' : '#ffd23f') : '#2e2433';
      g.beginPath(); g.arc(px, py, k === 12 ? 7 : 6, 0, TAU); g.fill();
      if (k === 12) { g.strokeStyle = '#ff4f6a'; g.lineWidth = 2; g.stroke(); }
    }
    g.globalAlpha = 1;
  }
  drawChat(g, T);
}
function drawSurvivalHud(g, T) {
  if (!(T >= TL.svB - 0.2 && T < T_KILL + 1.5)) return;
  const left = T_KILL < Infinity ? 0 : Math.max(0, survLeft(S.dead ? Math.min(T, S.dead) : T)), a = sat((T - TL.svB + 0.2) / 0.4), hot = left < 5;
  g.globalAlpha = a;
  panel(g, GW / 2 - 170, 76, 340, 60, { bg: 'rgba(20,4,10,0.86)', bd: hot ? '#ff4f6a' : '#d1a12a', lw: 3 });
  txt(g, 'SURVIVE', GW / 2 - 150, 106, 16, '#c9b8d8', { a: 'left', f: 'SilkB', sw: 0, w: 400 });
  txt(g, left.toFixed(2), GW / 2 + 150, 107, 38, hot ? '#ff4f6a' : '#fff1a6', { a: 'right', f: 'Chakra', sw: 5 });
  const wv = fxSince('wave', T, 2.6);
  if (wv) { const u = T - wv.T; g.globalAlpha = a * (u < 2 ? 1 : Math.max(0, 1 - (u - 2) / 0.6)); txt(g, wv.text, GW / 2, 162, 22 * (1 + 0.35 * Math.max(0, 1 - u / 0.2)), '#ffcf5a', { f: 'P2P', sw: 5, w: 400 }); }
  g.globalAlpha = 1;
}
function drawNameplate(g, T, wf) {
  panel(g, 10, 8, 300, 58, { bg: 'rgba(10,8,14,0.72)', bd: 'rgba(90,80,110,0.6)' });
  g.fillStyle = '#211c2b'; g.fillRect(16, 14, 46, 46);
  g.imageSmoothingEnabled = false; g.drawImage(SPR.ninja.front[0], 18, 16, 42, 42);
  txt(g, NW, 72, 26, 22, '#ffffff', { a: 'left', sw: 4 });
  drawStarIcon(g, 262, 25, 9); txt(g, '89', 275, 26, 18, '#ffffff', { a: 'left', sw: 3 });
  g.fillStyle = '#f4f8ff'; g.fillRect(73, 45, 12, 7); g.fillRect(73, 41, 2, 4); g.fillRect(78, 41, 2, 4); g.fillRect(83, 41, 2, 4);   // guild crown
  txt(g, 'HOODLUMS', 91, 50, 15, '#5ee06a', { a: 'left', f: 'SilkB', sw: 3, w: 400 });
}
function drawStarIcon(g, x, y, r) {
  g.fillStyle = '#ffd23f'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill(); g.stroke();
}
function bossHpAt(wf) { return Math.max(0, MAXHP - S.cum[Math.max(0, wf)]); }
function drawBossBar(g, T, wt, wf) {
  const x0 = 330, y0 = 8, w = 820, a = sat((T - TL.run - 0.4) / 0.6);
  g.globalAlpha = a;
  panel(g, x0, y0, w, 58, { bg: 'rgba(12,6,10,0.85)', bd: '#6a0f22' });
  g.fillStyle = '#1d1829'; g.fillRect(x0 + 6, y0 + 6, 46, 46);
  g.save(); g.beginPath(); g.rect(x0 + 6, y0 + 6, 46, 46); g.clip();
  g.drawImage(SPR.boss[S.boss.form], 14, 6, 38, 36, x0 + 6, y0 + 6, 49, 46); g.restore();
  g.strokeStyle = '#d1a12a'; g.lineWidth = 2; g.strokeRect(x0 + 6, y0 + 6, 46, 46);
  txt(g, 'ORYX THE MAD GOD IV', x0 + 62, y0 + 16, 17, '#ffcf5a', { a: 'left', sw: 4 });
  const ph = T < TL.p2 ? PHASES[0] : T < TL.p3 ? PHASES[1] : T < TL.p4 ? PHASES[2] : T < TL.p5 ? PHASES[3] : PHASES[4];
  txt(g, 'The Unwound — ' + (T < TL.land ? '...' : 'Phase ' + ph.num + ': ' + ph.name), x0 + w - 12, y0 + 16, 14, '#c9b8d8', { a: 'right', sw: 3 });
  if (T >= TL.sv) {
    const bx = x0 + 62, by = y0 + 30, bw = w - 74, bh = 20, left = T_KILL < Infinity ? 0 : Math.max(0, T < TL.svB ? SURV_T : survLeft(S.dead ? Math.min(T, S.dead) : T)), fr = left / SURV_T;
    g.fillStyle = '#000'; g.fillRect(bx - 2, by - 2, bw + 4, bh + 4); g.fillStyle = '#1e1606'; g.fillRect(bx, by, bw, bh);
    const gr = g.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, '#fff1a6'); gr.addColorStop(1, '#b4861c'); g.fillStyle = gr; g.fillRect(bx, by, bw * fr, bh);
    txt(g, 'THE FINAL SECONDS \u00b7 ' + left.toFixed(1) + 's', bx + bw / 2, by + bh / 2 + 1, 16, '#ffffff', { sw: 4 });
    g.globalAlpha = 1; return;
  }
  const hp = T >= T_KILL ? 0 : bossHpAt(wf), fr = hp / MAXHP;
  const bx = x0 + 62, by = y0 + 30, bw = w - 74, bh = 20;
  g.fillStyle = '#000'; g.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
  g.fillStyle = '#2a0710'; g.fillRect(bx, by, bw, bh);
  const trail = Math.max(0, MAXHP - S.cum[Math.max(0, wf - 40)]) / MAXHP;
  if (trail > fr) { g.fillStyle = '#ffe6c0'; g.fillRect(bx + bw * fr, by, bw * (trail - fr), bh); }
  const grd = g.createLinearGradient(0, by, 0, by + bh); grd.addColorStop(0, '#ff5a6e'); grd.addColorStop(0.5, '#c01834'); grd.addColorStop(1, '#6a0f22');
  g.fillStyle = grd; g.fillRect(bx, by, bw * fr, bh);
  if (T >= TL.rwA && T < TL.rwB + 0.8) { g.fillStyle = `rgba(95,242,255,${0.35 + 0.25 * Math.sin(T * 20)})`; g.fillRect(bx, by, bw * fr, bh); }
  for (const q of [0.72, 0.5, 0.3, 0.15]) { g.fillStyle = '#ffd23f'; g.fillRect(bx + bw * q - 1, by - 3, 3, bh + 6); }
  txt(g, fmtK(hp) + ' / ' + fmtK(MAXHP), bx + bw / 2, by + bh / 2 + 1, 16, '#ffffff', { sw: 4 });
  const inv = !bossVulnerable(T) && T < T_KILL;
  const guarded = S.sent.some(z => z.deadT === Infinity && T >= z.T);
  if (inv && Math.floor(T * 4) % 2 === 0 || inv && T < TL.land) txt(g, guarded ? 'SHIELDED — DESTROY THE SENTINELS' : 'INVULNERABLE', bx + bw - 6, by + bh / 2 + 1, 13, guarded ? '#ff8a9a' : '#9ff4ff', { a: 'right', sw: 3 });
  g.globalAlpha = 1;
}
function drawChat(g, T) {
  if (S && T >= TL.sv && T < TL.svB + 0.3) return;   // the cutscene owns the screen
  const lines = [];
  for (const c of CHAT) if (c[0] <= T) lines.push(c);
  const recent = lines.slice(-6).filter(c => T - c[0] < 16);
  g.font = '700 21px Pix';
  const out = [];
  for (const c of recent) {
    const [t, who, msg] = c, name = who === 'boss' ? BOSS : who === 'nw' ? NW : '';
    const prefix = name ? '[' + name + ']: ' : '';
    const wl = c.wl || (c.wl = wrap(g, prefix + msg, 640));   // chat lines never change: wrap once
    wl.forEach((l, i) => out.push({ t, who, l, first: i === 0, prefix }));
  }
  const show = out.slice(-7), y0 = GH - 34 - show.length * 27;
  if (show.length && false) { const grd = g.createLinearGradient(0, y0 - 20, 0, GH); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.3, 'rgba(0,0,0,0.35)'); grd.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = grd; g.fillRect(0, y0 - 20, 720, GH - y0 + 20); }
  show.forEach((o, i) => {
    const y = y0 + i * 27, x = 18, a = Math.min(1, (T - o.t) / 0.12) * sat((16 - (T - o.t)) / 3);
    g.globalAlpha = a;
    const col = o.who === 'boss' ? COL.boss : o.who === 'nw' ? COL.nw : o.l.includes('defeated') ? '#ffe14d' : '#ff8a8a';
    if (o.first && o.prefix) {
      g.font = '700 21px Pix'; const pw = g.measureText(o.prefix).width;
      txt(g, o.prefix, x, y, 21, col, { a: 'left', sw: 4 });
      txt(g, o.l.slice(o.prefix.length), x + pw, y, 21, '#ffffff', { a: 'left', sw: 4 });
    } else txt(g, o.l, x, y, 21, o.who === 'sys' ? col : '#ffffff', { a: 'left', sw: 4 });
  });
  g.globalAlpha = 1;
}

// ---------- sidebar ----------
function drawSidebar(x, T) {
  const X = GW;
  x.drawImage(SIDE_BG, X, 0);
  const inFight = T >= TL.run;
  // minimap
  x.save(); x.beginPath(); x.rect(X + 10, 10, 340, 300); x.clip();
  if (inFight) {
    x.imageSmoothingEnabled = true; x.drawImage(BOSS_N === 5 ? MINI5 : MINI, X + 30, 10, 300, 300); x.imageSmoothingEnabled = false;
    const m = (wx, wy) => [X + 180 + wx / (FLOOR.width / 8) * 300, 160 + wy / (FLOOR.height / 8) * 300];
    const b = S.boss;
    if (bossVisible(T)) { const [bx, by] = m(b.x, b.y); x.fillStyle = '#ff2442'; x.fillRect(bx - 7, by - 7, 14, 14); }
    for (const e of S.echoes) if (T >= e.T && T < TL.tsA + 0.5 && T < e.until) { const p = echoPos(e, Math.min(T, TL.tsA)); const [ex, ey] = m(p.x, p.y); x.fillStyle = '#ff6477'; x.fillRect(ex - 5, ey - 5, 10, 10); }
    for (const z of S.sent) if (T >= z.T && T < z.deadT) { const [ex, ey] = m(z.x, z.y); x.fillStyle = '#ff2442'; x.fillRect(ex - 4, ey - 4, 8, 8); }
    if (BOSS_N === 5) { for (const h of S.heroes) if (T >= h.rise && T < h.deadT) { const [ex, ey] = m(h.x, h.y); x.fillStyle = h.cloak > T ? 'rgba(255,36,66,0.3)' : '#ff2442'; x.fillRect(ex - 6, ey - 6, 12, 12); } for (const z of S.mobs) if (z.must && T >= z.T && T < z.deadT) { const [ex, ey] = m(z.x, z.y); x.fillStyle = '#c9a0ff'; x.fillRect(ex - 5, ey - 5, 10, 10); } for (const d of S.decoys) if (T >= d.T && T < d.until) { const [ex, ey] = m(d.x, d.y); x.fillStyle = '#ff2442'; x.fillRect(ex - 7, ey - 7, 14, 14); } }
    if (S.bag && T >= S.bag.T) { const [ex, ey] = m(S.bag.x, S.bag.y); x.fillStyle = '#ffffff'; x.fillRect(ex - 5, ey - 5, 10, 10); }
    const [px, py] = m(S.hx[S.wf], S.hy[S.wf]);
    x.fillStyle = '#fff'; x.beginPath(); x.moveTo(px, py - 8); x.lineTo(px + 6, py + 6); x.lineTo(px - 6, py + 6); x.closePath(); x.fill();
    x.fillStyle = COL.nw; x.fillRect(px - 2, py - 2, 4, 4);
  } else {
    x.imageSmoothingEnabled = true; x.drawImage(ROOM, X + 60, 40, 240, 208); x.imageSmoothingEnabled = false;
    x.fillStyle = '#fff'; x.fillRect(X + 177, 170, 6, 6);
  }
  x.restore();
  x.strokeStyle = '#3a3346'; x.lineWidth = 2; x.strokeRect(X + 10, 10, 340, 300);
  txt(x, inFight ? (BOSS_N === 5 ? 'Oryx’s Hall of Heroes (1/85)' : 'Oryx’s Chronosanctum (1/85)') : 'Chronosanctum Antechamber', X + 180, 328, 19, '#9c95ab', { sw: 0 });
  // bars
  const wf = inFight ? S.wf : 0;
  const hp = inFight ? S.hhp[wf] : P_MAXHP, mp = inFight ? S.hmp[wf] : P_MAXMP;
  const bar = (y, fr, c1, c2, label) => {
    x.fillStyle = '#0b0a10'; x.fillRect(X + 12, y, 336, 30);
    x.fillStyle = c2; x.fillRect(X + 14, y + 2, 332, 26);
    x.fillStyle = c1; x.fillRect(X + 14, y + 2, 332 * clamp(fr, 0, 1), 26);
    txt(x, label, X + 22, y + 16, 19, '#fff', { a: 'left', sw: 4 });
  };
  const fame = 14212 + (T >= T_KILL + 2.7 ? 788 * sat((T - T_KILL - 2.7) / 1.5) : 0);
  bar(346, fame / 15000, '#e07a1a', '#3a2410', 'Fame ' + fmtInt(fame) + '/15000');
  bar(382, hp / P_MAXHP, hp / P_MAXHP < 0.25 ? '#e0283f' : '#3fbf5a', '#12301a', 'HP ' + Math.round(hp) + '/' + P_MAXHP);
  bar(418, mp / P_MAXMP, '#3b6cf0', '#101a3a', 'MP ' + Math.round(mp) + '/' + P_MAXMP);
  // equipment
  const eq = ['staff', 'spell', 'robe', 'ring'];
  const glowK = gearFocus(T);
  eq.forEach((k, i) => {
    const sx = X + 14 + i * 84, sy = 462;
    x.fillStyle = glowK === i ? '#3a2458' : '#231f2c'; x.fillRect(sx, sy, 78, 78);
    x.strokeStyle = '#8a4ad8'; x.lineWidth = 2 + (glowK === i ? 2 : 0); x.globalAlpha = 0.6 + 0.4 * Math.sin(T * 3 + i); x.strokeRect(sx + 1, sy + 1, 76, 76); x.globalAlpha = 1;
    const ic = SPR.icon[k]; x.drawImage(ic, sx + 39 - ic.width * 3, sy + 39 - ic.height * 3, ic.width * 6, ic.height * 6);
    txt(x, '✦', sx + 68, sy + 12, 14, '#d9a8ff', { sw: 3 });
    if (k === 'star' && inFight) {
      const cd = Math.max(0, S.p.nextStar - T);
      if (cd > 0 && T < T_KILL) { x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(sx, sy + 78 * (1 - cd / STAR_CD), 78, 78 * cd / STAR_CD); }
      if (S.p.mp < STAR_MP) { x.fillStyle = 'rgba(20,20,60,0.55)'; x.fillRect(sx, sy, 78, 78); }
      txt(x, 'SPACE', sx + 39, sy + 70, 12, '#c9b8d8', { f: 'SilkB', sw: 3, w: 400 });
    }
  });
  for (let i = 0; i < 8; i++) {   // the inventory: empty
    const sx = X + 14 + (i % 4) * 84, sy = 556 + Math.floor(i / 4) * 84;
    x.fillStyle = '#1c1924'; x.fillRect(sx, sy, 78, 78); x.strokeStyle = '#2f2a3a'; x.lineWidth = 2; x.strokeRect(sx + 1, sy + 1, 76, 76);
    txt(x, String(i + 1), sx + 39, sy + 40, 26, '#2f2a3a', { sw: 0 });
  }
  const pots = S ? S.p.pots : TUNE.pots, mpots = S ? S.p.mpots : TUNE.mpots;
  x.fillStyle = '#1c1924'; x.fillRect(X + 14, 730, 162, 44); x.fillRect(X + 184, 730, 162, 44);
  x.drawImage(SPR.icon.hpPot, X + 24, 733, 40, 40); txt(x, pots + '/' + TUNE.pots, X + 110, 752, 24, pots ? '#fff' : '#ff6b6b', { sw: 4 }); txt(x, 'F', X + 160, 752, 16, '#c9b8d8', { f: 'SilkB', sw: 3 });
  x.drawImage(SPR.icon.mpPot, X + 194, 733, 40, 40); txt(x, mpots + '/' + TUNE.mpots, X + 280, 752, 24, mpots ? '#fff' : '#ff6b6b', { sw: 4 }); txt(x, 'V', X + 330, 752, 16, '#c9b8d8', { f: 'SilkB', sw: 3 });
  drawSplits(x, T);
}
function gearFocus(T) { if (T < 15.4 || T >= 22.4) return -1; return Math.floor((T - 15.4) / 1.75); }

// ---------- LiveSplit-style panel ----------
const practiceName = p => BOSS_N === 5 ? WEAPONS5[p - 1].toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : p === 6 ? 'the Final Seconds' : 'Phase ' + PHASES[p - 1].num;
function drawSplits(x, T) {
  const X = GW + 10, Y = 786, w = 340;
  x.fillStyle = '#0a0a0e'; x.fillRect(X, Y, w, H - Y - 8);
  x.fillStyle = '#16161e'; x.fillRect(X, Y, w, 40);
  const rta = T >= TL.rwA && T < TL.rwB + 1.8;
  txt(x, rta ? 'RTA doesn’t rewind.' : S && S.practice ? 'Practice — ' + practiceName(S.practice) : 'Oryx ' + (BOSS_N === 5 ? 'V' : 'IV') + ' — ' + DIFFS[S ? S.diff : CUR_DIFF].name, X + 12, Y + 20, 20, rta ? '#9ff4ff' : S && S.practice ? '#ffb85a' : '#e8e8f0', { a: 'left', f: 'Chakra', sw: 0 });
  txt(x, '#' + (G.attempts || 1), X + w - 12, Y + 20, 18, '#8a8aa0', { a: 'right', f: 'Chakra', sw: 0 });
  const R = Math.max(0, Math.min(T, T_KILL, S && S.dead ? S.dead : Infinity) - T_RUN), running = T >= T_RUN;
  let cur = SPLITS.findIndex(s => T < s.T);
  if (T >= T_KILL) cur = -1;
  SPLITS.forEach((s, i) => {
    const y = Y + 42 + i * 26, done = T >= s.T;
    if (i === cur && running) { const grd = x.createLinearGradient(X, 0, X + w, 0); grd.addColorStop(0, '#1d3a8a'); grd.addColorStop(1, '#0d1a40'); x.fillStyle = grd; x.fillRect(X, y + 3, w, 26); }
    txt(x, s.name, X + 12, y + 16, 18, '#e8e8f0', { a: 'left', f: 'ChakraS', sw: 0, w: 600 });
    if (done && isFinite(s.T) && s.T > 0) {
      const st = s.T - T_RUN;
      if (s.pb != null) { const d = st - s.pb; txt(x, (d < 0 ? '−' : '+') + Math.abs(d).toFixed(2), X + 200, y + 16, 18, d < 0 ? '#29d65a' : '#e0283f', { a: 'right', f: 'Chakra', sw: 0 }); }
      txt(x, fmtTime(st, 2), X + w - 12, y + 16, 19, '#e8e8f0', { a: 'right', f: 'Chakra', sw: 0 });
    } else txt(x, s.pb != null && s.T > 0 ? fmtTime(s.pb, 2) : '—', X + w - 12, y + 16, 19, '#7a7a90', { a: 'right', f: 'Chakra', sw: 0 });
  });
  const ty = Y + 42 + SPLITS.length * 26 + 2;
  const fin = T >= T_KILL, big = fmtTime(R, 2);
  const grd = x.createLinearGradient(0, ty, 0, ty + 70);
  if (fin) { grd.addColorStop(0, '#fff3a0'); grd.addColorStop(1, '#e0a020'); }
  else if (!running) { grd.addColorStop(0, '#d0d0d8'); grd.addColorStop(1, '#8a8a98'); }
  else { grd.addColorStop(0, '#b8ffcc'); grd.addColorStop(1, '#22b24c'); }
  x.font = '700 64px Chakra'; x.textAlign = 'right'; x.textBaseline = 'middle'; x.fillStyle = grd; x.fillText(big, X + w - 12, ty + 36);
  if (fin && G.newPB && Math.floor(T * 2) % 2 === 0) txt(x, 'PB', X + 16, ty + 36, 28, '#ffd23f', { a: 'left', f: 'Chakra', sw: 0 });
}

// ---------- overlays (full frame) ----------
function drawOverlays(x, T) {
  if (T >= TL.sv && T < TL.svB + 0.6) {
    const u = T - TL.sv, k = u < 0.5 ? easeOut(u / 0.5) : T > TL.svB - 0.4 ? Math.max(0, 1 - (T - TL.svB + 0.4) / 1.0) : 1, bh = 120 * k;
    x.fillStyle = '#000'; x.fillRect(0, 0, GW, bh); x.fillRect(0, GH - bh, GW, bh);
    if (u > 1.1 && T < TL.svB + 0.2) {
      const a = Math.min(1, (u - 1.1) / 0.4) * (T > TL.svB - 0.3 ? Math.max(0, (TL.svB + 0.2 - T) / 0.5) : 1), sc = 1 + 0.25 * Math.max(0, 1 - (u - 1.1) / 0.25);
      x.globalAlpha = a;
      txt(x, 'THE FINAL SECONDS', GW / 2, GH - 250, 58 * sc, '#ffcf5a', { f: 'P2P', sw: 10, sc: '#2a0508', w: 400 });
      txt(x, 'Survive. Every strike on the Heart winds his clock down faster.', GW / 2, GH - 185, 26, '#ffd9de', { sw: 5 });
      x.globalAlpha = 1;
    }
  }
  if (T >= TL.lobby && T < TL.run) drawLobbyOverlay(x, T);
  if (BOSS_N === 5) drawOverlays5(x, T);
  else for (const ph of PHASES) {
    const t = TL[ph.key] + (ph.num === 'I' ? 0.6 : 0.1), u = T - t;
    if (u < 0 || u > 2.6) continue;
    const a = u < 0.25 ? u / 0.25 : u > 2.1 ? 1 - (u - 2.1) / 0.5 : 1;
    x.globalAlpha = a;
    const y = 230, sc = 1 + 0.25 * Math.max(0, 1 - u / 0.25);
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(0, y - 60, GW, 120);
    txt(x, 'PHASE ' + ph.num, GW / 2, y - 22, 24 * sc, '#d8b4ff', { f: 'SilkB', sw: 5, w: 400 });
    txt(x, ph.name, GW / 2, y + 20, 52 * sc, ph.num === 'IV' ? '#ff4f6a' : '#ffe07a', { f: 'P2P', sw: 8, w: 400 });
    x.globalAlpha = 1;
  }
  const bn = fxSince('banner', T, 1.8);
  if (bn) {
    const u = T - bn.T, a = u < 0.12 ? u / 0.12 : u > 1.3 ? 1 - (u - 1.3) / 0.5 : 1, sc = 1 + 0.8 * Math.max(0, 1 - u / 0.15);
    const by = bn.y || 330, bs = bn.size || 58;   // minion calls sit small under the top bar, clear of the fight
    x.globalAlpha = a; x.globalCompositeOperation = 'lighter'; glowAt(x, 'p', GW / 2, by, bs * 15, 0.5 * a); x.globalCompositeOperation = 'source-over';
    txt(x, bn.text, GW / 2, by, bs * sc, bn.col || '#f2ddff', { f: 'P2P', sc: '#4a1070', sw: bs / 5.8, w: 400 });
    x.globalAlpha = 1;
  }
  // boss title card
  if (false) {
    const u = T - TL.land - 0.5, a = u < 0.3 ? u / 0.3 : u > 3.4 ? 1 - (u - 3.4) / 0.6 : 1;
    x.globalAlpha = a;
    const grd = x.createLinearGradient(0, 0, GW, 0); grd.addColorStop(0, 'rgba(60,4,14,0.85)'); grd.addColorStop(0.7, 'rgba(60,4,14,0.4)'); grd.addColorStop(1, 'rgba(60,4,14,0)');
    x.fillStyle = grd; x.fillRect(0, 760, GW, 130);
    x.fillStyle = '#d1a12a'; x.fillRect(0, 760, GW * easeOut(u / 0.5), 3); x.fillRect(0, 887, GW * easeOut(u / 0.5), 3);
    txt(x, 'ORYX THE MAD GOD IV', 60 + (1 - easeOut(u / 0.4)) * -80, 808, 54, '#ffcf5a', { a: 'left', f: 'P2P', sw: 8, w: 400 });
    txt(x, 'The Unwound — he has died three times. He remembers every one.', 64, 858, 26, '#ffd9de', { a: 'left', sw: 5 });
    x.globalAlpha = 1;
  }
  // kill
  if (BOSS_N === 4 && T >= T_KILL && T < T_KILL + 5.5) {
    const u = T - T_KILL - 0.55, a = u < 0 ? 0 : u > 4.3 ? 1 - (u - 4.3) / 0.65 : 1;
    if (a > 0) {
      x.globalAlpha = a;
      const sc = 1 + 1.6 * Math.max(0, 1 - u / 0.16);
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, 150, GW, 180);
      txt(x, 'TIME\u2019S UP, ORYX', GW / 2, 218, 74 * sc, '#ffffff', { f: 'P2P', sc: '#8a1030', sw: 12, w: 400 });
      txt(x, 'Midnight struck \u2014 and you were still standing.', GW / 2, 292, 30, '#ffd23f', { sw: 6 });
      x.globalAlpha = 1;
    }
  }
  if (T >= TL.bag + 2.0 && T < TL.results + 0.4) drawLoot(x, T);
  if (T >= TL.results) drawResults(x, T);
}
function tooltip(x, X, Y, w, title, tcol, sub, lines, a) {
  x.globalAlpha = a;
  x.font = '600 19px Pix';
  const h = 76 + lines.length * 28;
  panel(x, X, Y, w, h, { bg: 'rgba(12,10,18,0.96)', bd: '#8a4ad8', lw: 3 });
  txt(x, title, X + 16, Y + 24, 24, tcol, { a: 'left', sw: 0 });
  txt(x, sub, X + 16, Y + 52, 17, '#9c95ab', { a: 'left', sw: 0 });
  lines.forEach((l, i) => txt(x, l[0], X + 16, Y + 84 + i * 28, 19, l[1] || '#e8e0f0', { a: 'left', sw: 0, w: 600 }));
  x.globalAlpha = 1;
}
const GEAR_TIPS = [
  ['Katana of the Last Frame', 'Untiered Katana · T-UT', [['Damage: 820–1,140 · Rate of Fire 140%'], ['✦ Boss Slayer III — +18% damage to bosses', '#d9a8ff'], ['✦ Dexterous Edge — +14 DEX', '#d9a8ff']]],
  ['Shuriken of the Split Second', 'Untiered Star · the gamebreaking one', [['On hit: 20,000 damage · MP Cost 110'], ['✦ Star Scaling V — scales with DEX + SPD', '#d9a8ff'], ['✦ Mana Echo — refunds 30% MP on hit', '#d9a8ff'], ['Balance team: “working as intended.”', '#8a8a98']]],
  ['Gi of the Unbroken Streak', 'Untiered Leather Armor', [['+60 DEF · +90 HP'], ['✦ Second Wind — heal 40% below 10% HP', '#d9a8ff']]],
  ['Ring of Frame Perfection', 'Untiered Ring', [['+12 DEX · +12 SPD · +60 MP'], ['✦ Critical Timing — +15% crit chance', '#d9a8ff']]],
];
function drawLobbyOverlay(x, T) {
  if (T >= 12.4 && T < 15.6) {
    const u = T - 12.4, a = u < 0.3 ? u / 0.3 : u > 2.8 ? 1 - (u - 2.8) / 0.4 : 1;
    x.globalAlpha = a;
    panel(x, 470, 250, 640, 210, { bg: 'rgba(8,6,12,0.88)', bd: '#d1a12a', lw: 3 });
    txt(x, 'RUNNER', 510, 298, 20, '#9c95ab', { a: 'left', f: 'SilkB', sw: 0, w: 400 });
    txt(x, NW, 700, 298, 34, COL.nw, { a: 'left', sw: 5 });
    txt(x, 'CLASS', 510, 350, 20, '#9c95ab', { a: 'left', f: 'SilkB', sw: 0, w: 400 });
    txt(x, 'Ninja · 8/8 · fully enchanted', 700, 350, 26, '#ffffff', { a: 'left', sw: 4 });
    txt(x, 'CATEGORY', 510, 402, 20, '#9c95ab', { a: 'left', f: 'SilkB', sw: 0, w: 400 });
    txt(x, 'Oryx IV · Solo · Any% (testing)', 700, 402, 26, '#ffffff', { a: 'left', sw: 4 });
    x.globalAlpha = 1;
  }
  const i = gearFocus(T);
  if (i >= 0) {
    const t0 = 15.4 + i * 1.75, u = T - t0, a = Math.min(1, u / 0.18) * (u > 1.55 ? 1 - (u - 1.55) / 0.2 : 1);
    const [title, sub, lines] = GEAR_TIPS[i];
    const sx = GW + 14 + i * 84 + 39, sy = 462 + 39;
    tooltip(x, 1010, 330 + i * 18, 540, title, '#ffb85a', sub, lines, a);
    x.globalAlpha = a; x.strokeStyle = '#8a4ad8'; x.lineWidth = 3; x.beginPath(); x.moveTo(1550, 400 + i * 18); x.lineTo(sx, sy); x.stroke(); x.globalAlpha = 1;
  }
  if (T >= 22.4 && T < 24) {
    const u = T - 22.4, a = u < 0.2 ? u / 0.2 : 1;
    x.globalAlpha = a;
    txt(x, T < 23.3 ? 'READY?' : 'GO', GW / 2, 240, 64, T < 23.3 ? '#ffffff' : '#7dffb0', { f: 'P2P', sw: 9, w: 400 });
    x.globalAlpha = 1;
  }
}
function drawLobby(g, T) {
  g.fillStyle = '#040308'; g.fillRect(0, 0, GW, GH);
  g.drawImage(NEB, -320, -260);
  const s = TEX, cx = GW / 2, cy = GH * 0.5;
  const ox = cx - ROOM_C[0] * s, oy = cy - ROOM_C[1] * s;
  g.drawImage(ROOM, ox, oy, ROOM.width * s, ROOM.height * s);
  const wx = (tx) => ox + tx * 8 * s, wy = (ty) => oy + ty * 8 * s;
  // portal (north wall)
  const [px, py] = [cx, wy(2.2)];
  g.save(); g.translate(px, py);
  g.globalCompositeOperation = 'lighter';
  glowAt(g, 'r', 0, 0, 420, 0.6 + 0.1 * Math.sin(T * 3));
  for (let k = 0; k < 7; k++) {
    g.strokeStyle = k % 2 ? 'rgba(255,90,120,0.7)' : 'rgba(255,210,110,0.6)'; g.lineWidth = 6;
    g.beginPath(); g.ellipse(0, 0, 100 - k * 12, 70 - k * 8, 0, T * (k % 2 ? -2 : 2.5) + k, T * (k % 2 ? -2 : 2.5) + k + 4.2); g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#050208'; g.beginPath(); g.ellipse(0, 0, 26, 18, 0, 0, TAU); g.fill();
  g.restore();
  txt(g, 'Oryx’s Chronosanctum', px, py - 110, 22, '#ffcf5a', { sw: 5 });
  // braziers
  for (const bx of [3.5, 11.5]) {
    const [fx, fy] = [wx(bx), wy(4.2)];
    g.globalCompositeOperation = 'lighter'; glowAt(g, 'r', fx, fy - 20, 180, 0.6 + 0.15 * Math.sin(T * 9 + bx)); g.globalCompositeOperation = 'source-over';
    for (let k = 0; k < 6; k++) { const h = (T * 3 + k / 6) % 1; g.fillStyle = h < 0.5 ? '#ffdc72' : '#e0283f'; g.fillRect(fx - 12 + hash(k, Math.floor(T * 12)) * 24, fy - 10 - h * 60, 8, 8); }
  }
  // the runner
  let pyw = 1.2, walking = false;
  if (T > 23.2) { pyw = 1.2 - (T - 23.2) / 0.8 * 3.6; walking = true; }
  const [img] = playerSprite(walking ? 2 : 1, 1, walking ? T * 6 : -1, false);
  const [sxp, syp] = [cx, cy + pyw * TILE];
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(sxp, syp + 30, 28, 9, 0, 0, TAU); g.fill();
  g.globalCompositeOperation = 'lighter'; glowAt(g, 'g', sxp, syp + 20, 90, 0.22); g.globalCompositeOperation = 'source-over';
  const bobY = walking ? 0 : Math.sin(T * 3) * 2;
  g.drawImage(img, sxp - img.width * TEX / 2, syp - img.height * TEX * 0.6 + bobY, img.width * TEX, img.height * TEX);
  const vg = g.createRadialGradient(GW / 2, GH / 2, 300, GW / 2, GH / 2, 950);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.65)'); g.fillStyle = vg; g.fillRect(0, 0, GW, GH);
  drawNameplate(g, T, 0);
  drawChat(g, T);
  if (T > 23.75) { g.fillStyle = `rgba(255,240,255,${(T - 23.75) / 0.25})`; g.fillRect(0, 0, GW, GH); }
}
function drawLoot(x, T) {
  const u = T - TL.bag - 2.0, a = Math.min(1, u / 0.25) * (T > TL.results - 0.2 ? 1 - (T - TL.results + 0.2) / 0.6 : 1);
  x.globalAlpha = Math.max(0, a);
  const X = 780, Y = 720;
  panel(x, X, Y, 480, 150, { bg: 'rgba(12,10,18,0.95)', bd: '#ffffff', lw: 3 });
  txt(x, 'Loot Bag', X + 16, Y + 22, 22, '#ffffff', { a: 'left', sw: 0 });
  for (let i = 0; i < 4; i++) {
    const sx = X + 16 + i * 84, sy = Y + 44;
    x.fillStyle = '#1c1924'; x.fillRect(sx, sy, 78, 78); x.strokeStyle = '#2f2a3a'; x.strokeRect(sx + 1, sy + 1, 76, 76);
  }
  const ic = BOSS_N === 5 ? SPR5.soulGem : SPR.icon.hourglass; x.drawImage(ic, X + 55 - ic.width * 3, Y + 83 - ic.height * 3, ic.width * 6, ic.height * 6);
  x.strokeStyle = '#ffffff'; x.lineWidth = 3; x.globalAlpha = Math.max(0, a) * (0.6 + 0.4 * Math.sin(T * 6)); x.strokeRect(X + 17, Y + 45, 76, 76);
  x.globalAlpha = Math.max(0, a);
  const ic2 = SPR.icon.hpPot; x.drawImage(ic2, X + 139 - ic2.width * 3, Y + 83 - ic2.height * 3, ic2.width * 6, ic2.height * 6);
  if (u > 0.9) { const tip = BOSS_N === 5 ? ['Soul of the Usurper', '#ffffff', 'Untiered Ability · white bag', [['On use: become the last hero you saw fall'], ['✦ Bound to the one who outlasted every hero', '#d9a8ff'], ['“He wore ten thousand faces. None were his.”', '#8a8a98']]] : ['Hourglass of the Unwound', '#ffffff', 'Untiered Ability · white bag', [['On use: rewind yourself 3 seconds'], ['✦ Bound to the one who skipped Midnight', '#d9a8ff'], ['“He won’t be needing it.”', '#8a8a98']]]; tooltip(x, 1030, 470, 520, ...tip, Math.max(0, a) * Math.min(1, (u - 0.9) / 0.2)); }
  x.globalAlpha = 1;
}
function drawResults(x, T) {
  const u = T - TL.results, a = Math.min(1, u / 0.5);
  x.globalAlpha = a * 0.78; x.fillStyle = '#05030a'; x.fillRect(0, 0, GW, H); x.globalAlpha = a;
  const X = 250, Y = 170, w = 1060;
  panel(x, X, Y, w, 700, { bg: 'rgba(12,8,18,0.96)', bd: '#d1a12a', lw: 3 });
  txt(x, S.practice ? 'PRACTICE CLEAR' : 'RUN COMPLETE', X + w / 2, Y + 60, 40, '#ffe07a', { f: 'P2P', sw: 6, w: 400 });
  txt(x, S.practice ? 'Practice from ' + practiceName(S.practice) + ' — times not saved' : BOSS + ' · Solo · ' + DIFFS[S.diff].name, X + w / 2, Y + 112, 26, '#c9b8d8', { sw: 0 });
  const R = T_KILL - T_RUN;
  const grd = x.createLinearGradient(0, Y + 150, 0, Y + 260); grd.addColorStop(0, '#fff3a0'); grd.addColorStop(1, '#e0a020');
  x.font = '700 120px Chakra'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = grd; x.fillText(fmtTime(R, 2), X + w / 2, Y + 210);
  txt(x, NW + ' · Wizard' + (S.practice ? '' : G.newPB ? (G.prevPB != null ? ' · NEW PB by −' + (G.prevPB - R).toFixed(2) + 's' : ' · first clear!') : G.prevPB != null ? ' · PB ' + fmtTime(G.prevPB) : ''), X + w / 2, Y + 290, 28, COL.nw, { sw: 4 });
  SPLITS.forEach((s, i) => {
    const y = Y + 334 + i * 38, st = s.T - T_RUN, d = s.pb != null ? st - s.pb : null, v = u > 0.6 + i * 0.25;
    if (!v || !isFinite(s.T) || s.T <= 0) return;
    x.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)'; x.fillRect(X + 120, y - 18, w - 240, 36);
    txt(x, (i + 1) + '. ' + s.name + (BOSS_N === 5 ? '' : i === 1 ? '  (rewound −10s)' : i === 5 ? '  (outlasted him)' : ''), X + 150, y, 26, '#ffffff', { a: 'left', sw: 0 });
    if (d != null) txt(x, (d < 0 ? '−' : '+') + Math.abs(d).toFixed(2), X + w - 330, y, 26, d < 0 ? '#29d65a' : '#e0283f', { a: 'right', f: 'Chakra', sw: 0 });
    txt(x, fmtTime(st, 2), X + w - 150, y, 28, '#ffffff', { a: 'right', f: 'Chakra', sw: 0 });
  });
  // the two skill metrics: damage taken over the run, and how fast the Final Seconds were outlasted (more damage on the Heart = shorter)
  if (u > 2.0) txt(x, 'Damage taken ' + fmtInt(S.p.dmgTaken) + '     ·     ' + (BOSS_N === 5 ? 'Last Stand ' + (T_KILL - S.f5.T).toFixed(2) : 'Final Seconds ' + (T_KILL - TL.svB).toFixed(2)) + ' s', X + w / 2, Y + 584, 30, '#ffd23f', { sw: 4 });
  if (u > 2.6) txt(x, 'Hits taken ' + S.p.hits + ' · HP pots ' + (TUNE.pots - S.p.pots) + '/' + TUNE.pots + ' · MP pots ' + (TUNE.mpots - S.p.mpots) + '/' + TUNE.mpots, X + w / 2, Y + 630, 24, '#ffffff', { sw: 0 });
  if (u > 1.2) txt(x, 'R — run it back      ENTER — title', X + w / 2, Y + 668, 20, Math.floor(T * 2) % 2 ? '#ffe07a' : '#c9b8d8', { f: 'SilkB', sw: 0, w: 400 });
  x.globalAlpha = 1;
}
function drawColdOpen(x, T) {
  x.fillStyle = '#030206'; x.fillRect(0, 0, W, H);
  x.globalAlpha = 0.5 + 0.5 * sat(T / 3); x.drawImage(NEB, -140, -260); x.globalAlpha = 1;
  for (const s of STARS) { const sx = ((s.x + T * 6 * s.p) % 2200 + 2200) % 2200 - 140, sy = s.y + 260; if (sx > W || sy > H || sy < 0) continue; x.globalAlpha = 0.4 + 0.4 * Math.sin(T * 2 + s.tw); x.fillStyle = s.c; x.fillRect(sx, sy, s.s, s.s); }
  x.globalAlpha = 1;
  // giant clock turning backwards
  x.save(); x.translate(W / 2, H / 2); x.globalAlpha = 0.28;
  x.strokeStyle = '#d1a12a'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 440, 0, TAU); x.stroke(); x.beginPath(); x.arc(0, 0, 400, 0, TAU); x.stroke();
  for (let k = 0; k < 60; k++) { const a = k * TAU / 60; x.save(); x.rotate(a); x.fillStyle = '#d1a12a'; x.fillRect(-2, -440, 4, k % 5 === 0 ? 34 : 14); x.restore(); }
  x.font = '400 30px P2P'; x.fillStyle = '#d1a12a'; x.textAlign = 'center'; x.textBaseline = 'middle';
  ROMAN.forEach((r, h) => { const a = -Math.PI / 2 + h * Math.PI / 6; x.fillText(r, Math.cos(a) * 350, Math.sin(a) * 350); });
  const mn = -T * 1.3, hr = -T * 0.11;
  x.lineCap = 'round';
  x.strokeStyle = '#ffdc72'; x.lineWidth = 8; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.sin(mn) * 330, -Math.cos(mn) * 330); x.stroke();
  x.lineWidth = 14; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.sin(hr) * 220, -Math.cos(hr) * 220); x.stroke();
  x.restore(); x.globalAlpha = 1;
  const card = (t0, t1, str, size, col, y, f = 'SilkB') => {
    if (T < t0 || T > t1) return;
    const u = T - t0, a = Math.min(1, u / 0.35) * (T > t1 - 0.4 ? (t1 - T) / 0.4 : 1);
    const n = Math.floor(Math.min(str.length, u * 38));
    x.globalAlpha = a; txt(x, str.slice(0, n), W / 2, y, size, col, { f, sw: 6, w: 400 }); x.globalAlpha = 1;
  };
  card(1.0, 3.8, 'Oryx has fallen three times.', 44, '#e8e0f0', H / 2);
  card(4.0, 6.8, 'In his Castle. In his Cellar. In his Sanctuary.', 40, '#e8e0f0', H / 2);
  card(7.0, 9.7, 'This time, he learned to rewind.', 44, '#ff6477', H / 2);
  if (T >= 10.0) {
    const u = T - 10.0, a = Math.min(1, u / 0.25) * (T > 11.6 ? (12 - T) / 0.4 : 1);
    x.globalAlpha = a * 0.9;
    const s = 9;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { x.drawImage(SPR.cloakRim, W / 2 - 33 * s + dx * 5, H / 2 - 260 + CLOAK_Y * s + dy * 5, SPR.cloak[0].width * s, SPR.cloak[0].height * s); x.drawImage(SPR.bossRim, W / 2 - 33 * s + dx * 5, H / 2 - 260 + dy * 5, SPR.boss[0].width * s, SPR.boss[0].height * s); }
    x.drawImage(SPR.cloakBlack, W / 2 - 33 * s, H / 2 - 260 + (CLOAK_Y) * s, SPR.cloak[0].width * s, SPR.cloak[0].height * s);
    x.drawImage(SPR.bossBlack, W / 2 - 33 * s, H / 2 - 260, SPR.boss[0].width * s, SPR.boss[0].height * s);
    x.globalCompositeOperation = 'lighter';
    for (const [ex, ey] of BOSS_EYES) glowAt(x, 'r', W / 2 - 33 * s + (ex + 1.5) * s, H / 2 - 260 + (ey + 1.5) * s, 110, a);
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = `rgba(0,0,0,${0.35 * a})`; x.fillRect(0, H / 2 + 150, W, 220);
    const sc = 1 + 0.6 * Math.max(0, 1 - u / 0.2);
    x.globalAlpha = a;
    txt(x, 'ORYX THE MAD GOD IV', W / 2, H / 2 + 220, 70 * sc, '#ffcf5a', { f: 'P2P', sw: 10, sc: '#2a0508', w: 400 });
    txt(x, '— THE UNWOUND —', W / 2, H / 2 + 300, 30, '#ff6477', { f: 'P2P', sw: 6, w: 400 });
    x.globalAlpha = 1;
  }
  if (T < 0.6) { x.fillStyle = `rgba(0,0,0,${1 - T / 0.6})`; x.fillRect(0, 0, W, H); }
  if (T > 11.6) { x.fillStyle = `rgba(0,0,0,${(T - 11.6) / 0.4})`; x.fillRect(0, 0, W, H); }
}
function drawCredits(x, T) {
  const u = T - TL.credits;
  x.fillStyle = '#030206'; x.fillRect(0, 0, W, H);
  const lines = [
    [0.3, 'a fan-made concept', 30, '#9c95ab', 'SilkB'],
    [0.9, 'ORYX THE MAD GOD IV', 56, '#ffcf5a', 'P2P'],
    [1.6, 'Runner — ' + NW, 34, COL.nw, 'Pix'],
    [2.3, 'inspired by “New Enchants are GAMEBREAKING — Speedrun Solo Oryx Sanctuary (3:34)”', 24, '#c9b8d8', 'Pix'],
    [3.0, 'boss, sprites, music and sound are original and generated in code', 24, '#c9b8d8', 'Pix'],
    [3.6, 'not affiliated with or endorsed by DECA Games', 22, '#7a7a90', 'Pix'],
    [4.6, 'Oryx IV does not exist. Yet.', 40, '#ff6477', 'SilkB'],
  ];
  lines.forEach(([t, s, size, col, f], i) => {
    if (u < t) return;
    const a = Math.min(1, (u - t) / 0.5) * (T > T_END - 1.0 ? (T_END - T) / 1.0 : 1);
    x.globalAlpha = Math.max(0, a);
    txt(x, s, W / 2, 250 + i * 95 + (i >= 6 ? 40 : 0), size, col, { f, sw: 0, w: f === 'Pix' ? 600 : 400 });
  });
  x.globalAlpha = 1;
}
