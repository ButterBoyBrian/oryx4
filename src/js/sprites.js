'use strict';
// ---------- tiny pixel painter ----------
const _colCache = {};
function u32(hex) {
  if (typeof hex === 'number') return hex;
  let v = _colCache[hex];
  if (v !== undefined) return v;
  const n = parseInt(hex.slice(1, 7), 16), a = hex.length > 7 ? parseInt(hex.slice(7, 9), 16) : 255;
  v = ((a << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0;
  return (_colCache[hex] = v);
}
class PX {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.d[y * this.w + x] = u32(c); }
  get(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : this.d[y * this.w + x]; }
  on(x, y) { return (this.get(x, y) >>> 24) > 0; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); }
  each(fn) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const c = fn(x + 0.5, y + 0.5, x, y); if (c) this.set(x, y, c); } }
  disc(cx, cy, r, c) { this.each((px, py) => ((px - cx) ** 2 + (py - cy) ** 2 <= r * r) ? c : 0); }
  ring(cx, cy, r0, r1, c) { this.each((px, py) => { const d = Math.hypot(px - cx, py - cy); return d >= r0 && d <= r1 ? c : 0; }); }
  line(x0, y0, x1, y1, c, w = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (w === 1) this.set(x0, y0, c); else this.rect(x0 - (w >> 1), y0 - (w >> 1), w, w, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  poly(pts, c) {
    this.each((px, py) => {
      let ins = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins;
      }
      return ins ? c : 0;
    });
  }
  grid(rows, pal, ox = 0, oy = 0) {
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const ch = r[x]; if (ch !== '.' && pal[ch]) this.set(ox + x, oy + y, pal[ch]); } });
    return this;
  }
  // canvas with 1px outline border
  canvas(outline = '#000000', pad = 1) {
    const w = this.w + pad * 2, h = this.h + pad * 2;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d'), id = cx.createImageData(w, h), out = new Uint32Array(id.data.buffer);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) out[(y + pad) * w + x + pad] = this.d[y * this.w + x];
    if (outline) {
      const oc = u32(outline);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (out[y * w + x] >>> 24) continue;
        let hit = false;
        for (let j = -1; j <= 1 && !hit; j++) for (let i = -1; i <= 1; i++) {
          const sx = x - pad + i, sy = y - pad + j;
          if (this.on(sx, sy)) { hit = true; break; }
        }
        if (hit) out[y * w + x] = oc;
      }
    }
    cx.putImageData(id, 0, 0);
    return cv;
  }
}
function gridPX(rows, pal) {
  const p = new PX(Math.max(...rows.map(r => r.length)), rows.length);
  return p.grid(rows, pal);
}
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tinted(src, color, alpha = 1) {
  const c = mkCanvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = alpha;
  x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}
function glowSprite(color, size = 64, inner = 0) {
  const c = mkCanvas(size, size), x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, size * inner / 2, size / 2, size / 2, size / 2);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  return c;
}

// ---------- the player: a yellow-robed wizard (original design) ----------
// Two poses per facing alternate on every shot: staff held upright (rest) and staff thrust at the target (cast).
const PAL_NINJA = {
  Y: '#ffd23f', y: '#c98a14', o: '#fff2a8', H: '#7a3fc4', h: '#4b2380', S: '#f6cda6', E: '#120e18',
  K: '#7a3fc4', B: '#7a4a24', b: '#4a2a12', C: '#b36bff', c: '#f2ddff', G: '#e6b93a',
};
const NINJA = {
  side: [
    ['..oY......', '.oYYY.....', 'hHHHHH.c..', '..SSE..C..', '..YKYYYB..', '..YKYY.B..', '..yYYy.B..', '...y.y.B..'],
    ['..oY......', '.oYYY.....', 'hHHHHH.c..', '..SSE..C..', '..YKYYYB..', '..YKYY.B..', '.yYYYYyB..', '..y...yB..'],
  ],
  sideAtk: ['..oY......', '.oYYY.....', 'hHHHHH....', '..SSE.....', '..YKYYBBGc', '..YKYY...C', '..yYYy....', '...y.y....'],
  front: [
    ['...oY...', '..oYYY..', '.hHHHHh.', '..ESSE.c', '.oYKYYYC', '.YYKYY.B', '.yYYYYyB', '..y..y.B'],
    ['...oY...', '..oYYY..', '.hHHHHh.', '..ESSE.c', '.oYKYYYC', '.YYKYY.B', '.yYYYYyB', '.y....yB'],
  ],
  frontAtk: ['...oY...', '..oYYY..', '.hHHHHh.', '..ESSE..', '.oYKYYY.', '.YYKYYYB', '.yYYYYyG', '..y..yCc'],
  back: [
    ['...Yo...', '..YYYo..', '.hHHHHh.', 'c.yYYy..', 'CYYKYYo.', 'BYYKYYY.', 'ByYYYYy.', 'B.y..y..'],
    ['...Yo...', '..YYYo..', '.hHHHHh.', 'c.yYYy..', 'CYYKYYo.', 'BYYKYYY.', 'ByYYYYy.', 'By....y.'],
  ],
  backAtk: ['c..Yo...', 'C.YYYo..', 'GhHHHHh.', 'B.yYYy..', 'BYYKYYo.', '.YYKYYY.', '.yYYYYy.', '..y..y..'],
};

// ---------- boss: Oryx IV "The Unwound" (original design) ----------
// body, cloak, sword, halo and wings are separate layers so they can animate independently
const BOSS_W = 64, BOSS_H = 70, BOSS_CHEST = [32, 37], BOSS_HAND_R = [53.5, 51], BOSS_EYES = [[29, 18], [35, 18], [32, 15]];
const CLOAK_Y = 49, CLOAK_H = 29;
function bossPal(form) {
  const u = form === 1;
  return {
    k0: '#050408', k1: '#110e18', k2: '#1d1829', k3: '#302842', k4: '#4a3f63',
    r0: '#33060f', r1: '#5e0d1e', r2: '#93162c', r3: '#d8243c', rg: u ? '#ffd9de' : '#ff6477',
    g0: '#5c410b', g1: '#9a7215', g2: '#d1a12a', g3: '#ffdc72', g4: '#fff6cf',
    eye: '#fff4e2', eyeR: '#ff2442', core: u ? '#e8402e' : '#a8142c', coreH: u ? '#fff3b0' : '#ff5a6e',
    sand: '#ffd36b', glass: '#d2efff', glassD: '#7fb8d6', speck: '#e2d4ff',
  };
}
function mirrorLeft(p) { for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w / 2; x++) p.d[y * p.w + (p.w - 1 - x)] = p.d[y * p.w + x]; }
function clockHand(p, ox, oy, a, len, w, P, tip) {
  const ex = ox + Math.cos(a) * len, ey = oy + Math.sin(a) * len;
  p.line(ox, oy, ex, ey, P.g1, w + 1);
  p.line(ox, oy, ex, ey, P.g2, Math.max(1, w - 1));
  const bx = ox + Math.cos(a) * len * 0.45, by = oy + Math.sin(a) * len * 0.45;
  if (len > 7) p.disc(bx + 0.5, by + 0.5, 1.3, P.g2);
  const nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2), tl = w + 1.6;
  p.poly([[ex + nx * tl + 0.5, ey + ny * tl + 0.5], [ex + Math.cos(a) * (tl + 2.2) + 0.5, ey + Math.sin(a) * (tl + 2.2) + 0.5], [ex - nx * tl + 0.5, ey - ny * tl + 0.5]], P.g3);
  p.set(ex + Math.cos(a) * 1.5, ey + Math.sin(a) * 1.5, tip || P.g4);
}
function drawBossPX(form) {
  const P = bossPal(form), p = new PX(BOSS_W, BOSS_H), cx = 32, u = form === 1;
  // --- symmetric parts (drawn full, then left half mirrored) ---
  // crown of clock hands
  [[0, 11, 2, P.eyeR], [18, 9, 2], [36, 8, 1], [56, 6.5, 1], [76, 5, 1]].forEach(([deg, len, w, tip]) => {
    const a = (-deg - 90) * Math.PI / 180;
    clockHand(p, 31.5, 11, a, len * (u ? 1.2 : 1), w, P, tip);
  });
  // pauldrons with gear teeth and hand-spikes
  const pd = [15.5, 31];
  [[-150, 9], [-125, 11], [-100, 8]].forEach(([deg, len]) => clockHand(p, pd[0], pd[1], deg * Math.PI / 180, len, 1, P));
  for (let k = 0; k < 11; k++) { const a = Math.PI + k * Math.PI / 10; p.disc(pd[0] + Math.cos(a) * 9.2, pd[1] + Math.sin(a) * 9.2, 1.2, P.g1); }
  p.disc(pd[0], pd[1], 8.6, P.k2);
  p.each((px, py) => { const d = Math.hypot(px - pd[0], py - pd[1]); if (d > 8.6) return 0; if (d > 7.4 && py < pd[1] + 2) return px + py < pd[0] + pd[1] - 3 ? P.g3 : P.g2; if (Math.abs(d - 5.4) < 0.5 || Math.abs(d - 3.2) < 0.5) return P.k3; if (d > 7.4) return P.k1; return 0; });
  p.disc(pd[0], pd[1], 1.7, P.r3); p.set(pd[0] - 1, pd[1] - 1, P.rg);
  // helm
  const prof = y => y < 9 ? -1 : y < 11 ? 2.5 : y < 13 ? 5 : y < 23 ? 6.5 : y < 28 ? 6.5 - (y - 22) * 0.35 : -1;
  p.each((px, py, x, y) => {
    const hw = prof(y), dx = px - cx; if (hw < 0 || Math.abs(dx) > hw) return 0;
    if (dx < -hw + 1) return P.k4; if (dx < -hw + 3) return P.k3; if (dx > hw - 2) return P.k1; return P.k2;
  });
  p.rect(26, 12, 12, 2, P.g2); p.rect(26, 12, 12, 1, P.g3);
  p.set(28, 12, P.r3); p.set(35, 12, P.r3); p.set(31, 13, P.r3); p.set(32, 13, P.r3);
  p.each((px, py, x, y) => { const dx = Math.abs(px - cx); if (y < 15 || y > 24) return 0; const hw = y < 22 ? 5 : 5 - (y - 21) * 1.3; return dx <= hw ? P.k0 : 0; });
  p.line(26, 24, 29, 27, P.g1); p.line(37, 24, 34, 27, P.g1);
  // gorget
  p.each((px, py, x, y) => (y >= 26 && y <= 29 && Math.abs(px - cx) <= 8.5) ? (y === 26 ? P.g3 : y === 29 && x % 2 ? P.g0 : P.g1) : 0);
  // torso plate
  const tw = y => y < 28 ? -1 : y <= 50 ? 14 - Math.max(0, y - 34) * 0.3 : -1;
  p.each((px, py, x, y) => {
    const hw = tw(y), dx = px - cx; if (hw < 0 || Math.abs(dx) > hw) return 0;
    if (dx < -hw + 1) return P.k4; if (dx < -hw + 4) return P.k3; if (dx > hw - 3) return P.k1;
    if ((y === 43 || y === 46) && Math.abs(dx) > 1.5) return P.k1;
    return P.k2;
  });
  p.line(19, 30, 26, 35, P.g2); p.line(19, 31, 26, 36, P.g0);
  p.rect(22, 44, 5, 1, P.g1); p.rect(22, 47, 6, 1, P.g1);
  // belt + gear buckle
  p.rect(22, 49, 20, 3, P.g1); p.rect(22, 49, 20, 1, P.g3);
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8; p.disc(cx + Math.cos(a) * 2.9, 50.5 + Math.sin(a) * 2.9, 0.9, P.g1); }
  p.disc(cx, 50.5, 2.5, P.g2); p.disc(cx, 50.5, 0.9, P.k0);
  // chest core with jagged broken rim
  const [ccx, ccy] = BOSS_CHEST, cr = u ? 8.6 : 7.2;
  p.each((px, py) => { const dx = px - ccx, dy = py - ccy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx); const re = cr + 1.1 + 0.9 * Math.sin(a * 7) * Math.sin(a * 3 + 1); return d <= re && d > cr - 0.4 ? P.k0 : 0; });
  p.each((px, py) => { const d = Math.hypot(px - ccx, py - ccy); return d <= cr - 0.4 ? (d < 2.4 ? P.coreH : d < cr - 1.6 ? P.core : P.r1) : 0; });
  for (let k = 0; k < 12; k++) {
    const a = k * TAU / 12, rr = cr - 1.5;
    p.set(ccx + Math.cos(a) * rr - 0.5, ccy + Math.sin(a) * rr - 0.5, k % 3 === 0 ? P.g4 : P.g2);
    if (k % 3 === 0) p.set(ccx + Math.cos(a) * (rr - 1) - 0.5, ccy + Math.sin(a) * (rr - 1) - 0.5, P.g3);
  }
  mirrorLeft(p);
  // --- asymmetric parts ---
  // eyes
  p.rect(28, 18, 3, 1, P.eye); p.set(30, 18, P.eyeR); p.rect(33, 18, 3, 1, P.eye); p.set(33, 18, P.eyeR);
  p.rect(28, 19, 2, 1, P.r2); p.rect(34, 19, 2, 1, P.r2);
  p.rect(31, 14, 2, 3, P.eyeR); p.set(31, 15, P.eye);
  if (u) [[27, 21], [36, 21], [29, 22], [34, 22], [30, 16], [33, 16]].forEach(([x, y]) => p.set(x, y, P.eyeR));
  // cracks from the core
  const rng = mulberry32(form ? 91 : 17);
  for (let c = 0; c < (u ? 11 : 7); c++) {
    let a = rng() * TAU, x = ccx + Math.cos(a) * (cr + 0.5), y = ccy + Math.sin(a) * (cr + 0.5);
    const len = 4 + rng() * (u ? 12 : 8);
    for (let i = 0; i < len; i++) {
      a += (rng() - 0.5) * 0.9; x += Math.cos(a); y += Math.sin(a);
      const inside = y > 27 && y < 50 && Math.abs(x - cx) < 13;
      if (!inside) break;
      p.set(x, y, i < 2 ? P.rg : i < len * 0.6 ? P.r3 : P.r2);
    }
  }
  // right arm (sword arm; sword is its own layer)
  p.line(47, 36, 52, 44, P.k2, 5); p.line(46, 36, 50, 43, P.k3, 2);
  p.disc(52.5, 44.5, 2.4, P.g1); p.set(51, 43, P.g3);
  p.line(52, 44, 53, 49, P.k2, 5); p.rect(50, 46, 6, 1, P.g2);
  p.disc(53.5, 51, 3, P.k3); p.set(52, 49, P.g3); p.set(54, 49, P.g3); p.set(55, 51, P.g2);
  // left arm with claw hand + hourglass (sand falls UP: time runs backwards)
  p.line(16, 36, 12, 44, P.k2, 5); p.line(15, 36, 11, 43, P.k3, 2);
  p.disc(11.5, 44.5, 2.4, P.g1); p.set(10, 43, P.g3);
  p.line(12, 44, 10, 50, P.k2, 5); p.rect(8, 47, 6, 1, P.g2);
  const hx = 10, hy = 58;
  p.rect(hx - 5, hy - 5, 11, 2, P.g2); p.rect(hx - 5, hy - 5, 11, 1, P.g3);
  p.rect(hx - 5, hy + 6, 11, 2, P.g1); p.rect(hx - 5, hy + 7, 11, 1, P.g0);
  p.poly([[hx - 3.5, hy - 3], [hx + 4.5, hy - 3], [hx + 1.3, hy + 0.5], [hx + 4.5, hy + 6], [hx - 3.5, hy + 6], [hx - 0.3, hy + 0.5]], P.glass);
  p.poly([[hx - 3, hy - 3], [hx + 4, hy - 3], [hx + 2.2, hy - 1], [hx - 1.2, hy - 1]], P.sand);
  p.set(hx, hy, P.sand); p.set(hx, hy + 1, P.sand); p.set(hx, hy + 3, P.sand); p.set(hx + 1, hy + 5, P.sand);
  p.line(hx + 3, hy + 2, hx + 1, hy + 5, '#ffffff');
  p.rect(hx - 5, hy - 3, 1, 9, P.g1); p.rect(hx + 5, hy - 3, 1, 9, P.g1);
  [[6, 55], [8, 56], [12, 56], [14, 55]].forEach(([tx, ty], i) => { p.line(10, 51, tx, ty, P.k1); p.set(tx, ty, P.r3); });
  p.disc(10.5, 51, 2.6, P.k3);
  return p;
}
function drawCloakPX(form) {
  const P = bossPal(form), p = new PX(BOSS_W, CLOAK_H), cx = 32, u = form === 1;
  p.each((px, py, x, y) => {
    const t = y / CLOAK_H, hw = 11 + 12 * Math.pow(t, 0.8), dx = px - cx;
    if (Math.abs(dx) > hw) return 0;
    const cut = 15 + 11 * hash(x >> 1, 5) + 3 * Math.sin(x * 0.7);
    if (y > cut) return 0;
    if (y > cut - 2.5 && (x + y) % 2) return 0;
    if (Math.abs(dx) < 4.5 && y < 18) return Math.abs(dx) > 3.5 ? P.g1 : y % 4 === 0 ? P.k2 : P.k1;
    if (u && hash(x, y, 9) < 0.06) return P.speck;
    const fold = ((dx + 3 * Math.sin(py * 0.22) + 40) % 5);
    if (Math.abs(dx) > hw - 1.3) return P.r0;
    if (y > cut - 5) return u ? P.k1 : P.r0;
    return fold < 1 ? P.r2 : fold < 2.2 ? P.r1 : u ? P.k2 : P.r1;
  });
  return p;
}
function drawSwordPX(form) {
  const P = bossPal(form), p = new PX(13, 60), c = 6.5;
  p.poly([[c, 0], [c + 5.5, 9], [c + 2.5, 8], [c - 2.5, 8], [c - 5.5, 9]], P.g2);
  p.poly([[c, 2], [c + 3, 7.5], [c - 3, 7.5]], P.r3);
  p.set(6, 3, P.rg);
  p.each((px, py, x, y) => {
    if (y < 8 || y > 41) return 0; const hw = 2.7 - (41 - y) * 0.012, dx = px - c; if (Math.abs(dx) > hw) return 0;
    if (Math.abs(dx) > hw - 1) return dx < 0 ? P.g3 : P.g1;
    if (Math.abs(dx) < 0.6) return (y % 5 === 0) ? P.rg : P.r3;
    return P.k2;
  });
  p.ring(c, 44, 2.6, 4.2, P.g2); p.ring(c, 44, 3.5, 4.2, P.g1);
  p.rect(0, 48, 13, 2, P.g1); p.rect(0, 48, 13, 1, P.g3); p.set(0, 50, P.g1); p.set(12, 50, P.g1);
  for (let y = 50; y < 56; y++) p.rect(5, y, 3, 1, y % 2 ? P.k3 : P.g0);
  p.disc(c, 57.5, 2, P.g2); p.disc(c, 57.5, 1.1, P.r3);
  return p;
}
const SWORD_PIVOT = [7.5, 53]; // grip, in canvas px (outline pad included)
function drawHaloPX() {
  const P = bossPal(0), n = 40, p = new PX(n, n), c = n / 2;
  p.each((px, py) => {
    const d = Math.hypot(px - c, py - c), a = Math.atan2(py - c, px - c) + Math.PI;
    const seg = a / TAU * 5, f = seg - Math.floor(seg);
    if (f > 0.86) return 0;
    const wob = 0.6 * Math.sin(Math.floor(seg) * 2.3);
    if (d > 16.3 + wob && d <= 18.2 + wob) return d > 17.5 + wob ? P.g1 : P.g3;
    if (Math.abs(d - 14.6) < 0.5 && Math.floor(a * 12) % 3 === 0) return P.r3;
    return 0;
  });
  return p;
}
function drawWingPX() { // one clock-hand wing blade, points up
  const P = bossPal(1), p = new PX(9, 40);
  clockHand(p, 4, 39, -Math.PI / 2, 34, 2, P, P.eyeR);
  return p;
}
function drawGobletPX() {
  const p = new PX(7, 8);
  p.rect(0, 0, 7, 1, '#e6b93a'); p.rect(1, 1, 5, 2, '#b4861c'); p.rect(1, 1, 5, 1, '#8c1428');
  p.rect(2, 3, 3, 1, '#b4861c'); p.rect(3, 4, 1, 2, '#b4861c'); p.rect(1, 6, 5, 1, '#e6b93a');
  return p;
}

// ---------- minion: clockwork sentinel ----------
function drawSentinelPX() {
  const p = new PX(18, 22), cx = 9;
  const P = Object.assign(bossPal(0), { brD: '#6e4f0e', brM: '#b4861c', brL: '#e6b93a', stM: '#302842', face: '#0a0d1c', glow: '#ff5a6e' });
  p.line(cx - 0.5, 15, cx - 0.5, 19, P.brD);
  p.disc(cx, 19.5, 1.9, P.brL);
  p.rect(cx - 4, 14, 2, 4, P.stM); p.rect(cx + 2, 14, 2, 4, P.stM);
  p.disc(cx, 9.5, 6, P.brM);
  p.each((px, py) => { const d = Math.hypot(px - cx, py - 9.5); return d <= 6 && d > 4.6 && (px - cx) + (py - 9.5) < 0 ? P.brL : 0; });
  p.disc(cx, 9.5, 4.4, P.face);
  for (let k = 0; k < 4; k++) { const a = k * TAU / 4; p.set(cx + Math.cos(a) * 3.3 - 0.5, 9.5 + Math.sin(a) * 3.3 - 0.5, P.glow); }
  p.line(cx - 0.5, 9, cx - 0.5, 6.5, '#ffffff'); p.line(cx - 0.5, 9, cx + 1.5, 10, '#ffffff');
  p.disc(cx, 2.8, 2.6, P.stM); p.set(cx - 0.5, 2.5, '#ff3f9e'); p.set(cx + 0.5, 2.5, '#ff9fd0');
  p.rect(1, 8, 2, 3, P.brD); p.rect(15, 8, 2, 3, P.brD);
  return p;
}

// ---------- projectiles ----------
function orbPX(c1, c2, r = 3.3) {
  const n = Math.ceil(r * 2) + 1, p = new PX(n, n), c = n / 2;
  p.disc(c, c, r, c1); p.disc(c, c, r * 0.6, c2); p.disc(c, c, r * 0.25 + 0.3, '#ffffff');
  return p;
}
function gearPX(n = 11, col = '#c89a2a', light = '#f0cf6a', dark = '#6e4f0e') {
  const p = new PX(n, n), c = n / 2, R = n / 2 - 1.5;
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8; p.disc(c + Math.cos(a) * R, c + Math.sin(a) * R, 1.1, dark); }
  p.disc(c, c, R - 0.3, col);
  p.each((px, py) => { const d = Math.hypot(px - c, py - c); return d < R - 0.3 && d > R - 1.6 && (px - c) + (py - c) < 0 ? light : 0; });
  p.disc(c, c, 1.3, '#140f06');
  return p;
}
function handPX() { // points +x
  const p = new PX(14, 5);
  p.rect(0, 2, 9, 1, '#dbe4f3'); p.rect(0, 3, 9, 1, '#7d879e'); p.rect(0, 1, 2, 3, '#b4861c');
  p.poly([[8, 0], [14, 2.5], [8, 5]], '#ff4fa3'); p.poly([[9, 1], [13, 2.5], [9, 4]], '#ffd1e6');
  return p;
}
function sandPX() { const p = new PX(3, 3); p.set(1, 0, '#ffd36b'); p.set(0, 1, '#ffd36b'); p.set(2, 1, '#ffd36b'); p.set(1, 2, '#e0a93a'); p.set(1, 1, '#fff6d0'); return p; }
// clockwork looks for some patterns (render only: each keeps its kind's hitbox)
const bellPX = () => gridPX(['...hhh...', '...BBB...', '..BwBBB..', '..BwBBB..', '.BBwBBBB.', '.BBBBBBB.', 'BBBBBBBBB', 'ddddddddd', '....c....'], { B: '#ff5fb8', w: '#ffe3f4', d: '#b0206a', h: '#ffd23f', c: '#ffffff' });
const markPX = () => gridPX(['.cccccc.', 'cCCCCCCc', 'cCWWWWCc', 'cCCCCCCc', '.cccccc.'], { c: '#0f8fb8', C: '#1fc8f5', W: '#e8fdff' });
const featherPX = () => gridPX(['....ddd....', '..ddRRRdd..', '.dRRRRRRRd.', 'qqqqqqqqqRW', '.dRRRRRRRd.', '..ddRRRdd..', '....ddd....'], { d: '#7a1020', R: '#e8433b', q: '#ffd0a0', W: '#ffffff' });
const jewelPX = () => gridPX(['...yy...', '..yWYy..', '.yWYYOy.', 'yYYYYOOy', 'yOYYYYOy', '.yOOYYy.', '..yOOy..', '...yy...'], { y: '#8a5a0e', Y: '#ffb52e', O: '#e08a10', W: '#fff6d0' });
const linkPX = () => gridPX(['..yyy..', '.yYYYy.', 'yYy.yYy', 'yY...Yy', 'yYy.yYy', '.yYYYy.', '..yyy..'], { y: '#6e4f0e', Y: '#e6b93a' });
function bobPX() {
  const p = new PX(11, 11);
  p.disc(5.5, 5.5, 5.4, '#6e4f0e'); p.disc(5.5, 5.5, 4.5, '#e6b93a'); p.disc(5.5, 5.5, 3.2, '#b4861c'); p.disc(4.3, 4.3, 1.3, '#fff1a6'); p.disc(5.5, 5.5, 1.1, '#e8333b');
  return p;
}
function shardPX() { const p = new PX(8, 3); p.rect(0, 1, 8, 1, '#e6f8ff'); p.rect(1, 0, 4, 1, '#8fd3f0'); p.rect(2, 2, 4, 1, '#5fa9cf'); p.set(7, 1, '#ffffff'); return p; }
function boltPX() {
  return gridPX(['...W...', '.WWCW..', 'WCccCWW', '.WWCW..', '...W...'], { W: '#f4f8ff', C: '#a855f7', c: '#f2ddff' });
}
function spellOrbPX(n) {   // the ability: a violet orb with a white sparkle
  const p = new PX(n, n), c = n / 2;
  p.disc(c, c, n / 2 - 0.4, '#6d28d9'); p.disc(c, c, n / 2 - 1.6, '#a855f7'); p.disc(c - 0.8, c - 0.8, n / 5, '#f2ddff');
  p.each((px, py) => (Math.abs(px - c) < 0.6 && Math.abs(py - c) < n / 2 - 0.5) || (Math.abs(py - c) < 0.6 && Math.abs(px - c) < n / 2 - 0.5) ? '#ffffff' : 0);
  return p;
}
function slashPX() { // katana wave, points +x
  const p = new PX(7, 13);
  p.each((px, py) => { const d = Math.hypot(px + 4, py - 6.5); return d > 8.2 && d < 10.2 && Math.abs(py - 6.5) < 6 ? (d > 9.4 ? '#ffffff' : '#ffe27a') : 0; });
  return p;
}
function starPX(n, rim) {
  const p = new PX(n, n), c = n / 2, R = n / 2 - 0.3, r = R * 0.34, pts = [];
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8 - Math.PI / 2, rr = k % 2 ? r : R; pts.push([c + Math.cos(a) * rr, c + Math.sin(a) * rr]); }
  p.poly(pts, rim || '#d49616');
  const pts2 = pts.map(([x, y]) => [c + (x - c) * 0.72, c + (y - c) * 0.72]);
  p.poly(pts2, '#ffd23f');
  p.each((px, py) => (Math.abs(px - c) < 0.8 && Math.abs(py - c) < R * 0.7) || (Math.abs(py - c) < 0.8 && Math.abs(px - c) < R * 0.7) ? '#fff6d0' : 0);
  p.disc(c, c, n > 11 ? 1.4 : 0.9, '#2a1a08');
  return p;
}
function bagPX(col, shade) {
  const p = new PX(11, 11);
  p.disc(5.5, 7, 4.2, col);
  p.each((px, py) => { const d = Math.hypot(px - 5.5, py - 7); return d <= 4.2 && px - 5.5 + (py - 7) * 0.3 > 1.4 ? shade : 0; });
  p.rect(4, 1, 3, 3, col); p.rect(3, 3, 5, 1, '#8a6a3a'); p.set(6, 1, shade);
  p.set(4, 5, '#ffffff'); p.set(3, 6, '#ffffff');
  return p;
}

// ---------- item icons (10x10 grids) ----------
const ICONS = {
  katana: [['.........W', '........Wo', '.......Wo.', '......Wo..', '.....Wo...', '....Wo....', '..pWo.....', '..BB......', '.B.pB.....', 'B.........'],
    { W: '#f4f8ff', o: '#9fb0c9', B: '#6a4426', p: '#c77dff' }],
  gi: [['..YY..YY..', '.YYYYYYYY.', 'YYYoYYoYYY', 'Y.YYoYYY.Y', '..YYoYYY..', '..KKKKKK..', '..YYYYYY..', '..YYppYY..', '..YYY.YY..', '..yy..yy..'],
    { Y: '#ffd23f', y: '#d4961a', o: '#fff2a8', K: '#1d1a24', p: '#c77dff' }],
  ring: [['...pPPp...', '..pPWWPp..', '...pPPp...', '..YY..YY..', '.Y......Y.', '.Y......Y.', '.Y......Y.', '..Y....Y..', '...YYYY...', '..........'],
    { Y: '#ffd23f', p: '#7a2ad8', P: '#b36bff', W: '#f2ddff' }],
  hpPot: [['...BB.....', '...cc.....', '..cRRc....', '.cRRRRc...', '.cRWRRc...', '.cRRRRc...', '.cRRRRc...', '..cccc....', '..........', '..........'],
    { B: '#8a6a3a', c: '#c9d6e8', R: '#e8333b', W: '#ffb0b0' }],
  mpPot: [['...BB.....', '...cc.....', '..cUUc....', '.cUUUUc...', '.cUWUUc...', '.cUUUUc...', '.cUUUUc...', '..cccc....', '..........', '..........'],
    { B: '#8a6a3a', c: '#c9d6e8', U: '#3b6cf0', W: '#b0c8ff' }],
  waffle: [['.yyyyyyyy.', 'yYoYoYoYoy', 'yoYoYoYoYy', 'yYoYoYoYoy', 'yoYoYoYoYy', 'yYoYoYoYoy', 'yoYoYoYoYy', 'yYoYoYoYoy', '.yyyyyyyy.', '..........'],
    { Y: '#e8a93a', o: '#b8741c', y: '#8a5214' }],
  key: [['..YYY.....', '.Y.c.Y....', '.Yc.cY....', '.Y.c.Y....', '..YYY.....', '...Y......', '...Y......', '...YYY....', '...Y......', '...YY.....'],
    { Y: '#e6b93a', c: '#5ff2ff' }],
  spdPot: [['...BB.....', '...cc.....', '..cGGc....', '.cGGGGc...', '.cGWGGc...', '.cGGGGc...', '.cGGGGc...', '..cccc....', '..........', '..........'],
    { B: '#8a6a3a', c: '#c9d6e8', G: '#3fd46a', W: '#b8ffcc' }],
  dexPot: [['...BB.....', '...cc.....', '..cOOc....', '.cOOOOc...', '.cOWOOc...', '.cOOOOc...', '.cOOOOc...', '..cccc....', '..........', '..........'],
    { B: '#8a6a3a', c: '#c9d6e8', O: '#ff9a2a', W: '#ffe0b0' }],
  hourglass: [['.YYYYYYY..', '..g...g...', '..gsssg...', '...gsg....', '....s.....', '...g.g....', '..g.s.g...', '..gsssg...', '.YYYYYYY..', '..........'],
    { Y: '#fff1a6', g: '#bfe9ff', s: '#ffd36b' }],
  cloak: [['...DDD....', '..DdddD...', '..DdRdD...', '.DddRddD..', '.DdddddD..', 'DddddddD..', 'DdddddddD.', 'DDDDDDDDD.', '..........', '..........'],
    { D: '#2a2233', d: '#473b59', R: '#e8433b' }],
};
function starIconPX() { return starPX(11, '#c77dff'); }

// ---------- build everything ----------
const SPR = {};
function buildSprites() {
  const n = PAL_NINJA;
  SPR.ninja = {
    side: NINJA.side.map(r => gridPX(r, n).canvas()), sideAtk: gridPX(NINJA.sideAtk, n).canvas(),
    front: NINJA.front.map(r => gridPX(r, n).canvas()), frontAtk: gridPX(NINJA.frontAtk, n).canvas(),
    back: NINJA.back.map(r => gridPX(r, n).canvas()), backAtk: gridPX(NINJA.backAtk, n).canvas(),
  };
  SPR.ninjaGhost = gridPX(NINJA.front[0], n).canvas();
  SPR.ninjaGhost = tinted(SPR.ninjaGhost, '#7ff6ff', 0.85);
  SPR.boss = [0, 1].map(f => drawBossPX(f).canvas('#030205'));
  SPR.cloak = [0, 1].map(f => drawCloakPX(f).canvas('#030205'));
  SPR.sword = [0, 1].map(f => drawSwordPX(f).canvas('#030205'));
  SPR.halo = drawHaloPX().canvas(null);
  SPR.wing = drawWingPX().canvas('#030205');
  SPR.goblet = drawGobletPX().canvas();
  SPR.bossWhite = tinted(SPR.boss[0], '#ffffff', 1);
  SPR.cloakWhite = tinted(SPR.cloak[0], '#ffffff', 1);
  SPR.echo = { castle: tinted(SPR.boss[0], '#7fb4ff', 0.72), cellar: tinted(SPR.boss[0], '#c0203c', 0.62), sanct: tinted(SPR.boss[0], '#ffd76a', 0.7) };
  SPR.echoCloak = { castle: tinted(SPR.cloak[0], '#7fb4ff', 0.72), cellar: tinted(SPR.cloak[0], '#c0203c', 0.62), sanct: tinted(SPR.cloak[0], '#ffd76a', 0.7) };
  SPR.sentinel = drawSentinelPX().canvas();
  SPR.sentinelWhite = tinted(SPR.sentinel, '#ffffff', 1);
  SPR.b = {
    orbC: orbPX('#1fc8f5', '#9ff4ff').canvas('#062a3a'),
    orbM: orbPX('#f03a96', '#ffa6d6').canvas('#3a0620'),
    orbW: orbPX('#ff5fb8', '#ffe3f4', 4.3).canvas('#3a0620'),
    orbG: orbPX('#ffb52e', '#fff0b0').canvas('#3a2206'),
    orbR: orbPX('#c0182f', '#ff8a9a').canvas('#3a0610'),
    gear: gearPX().canvas('#1a1206'),
    hand: handPX().canvas('#12050c'),
    sand: sandPX().canvas('#3a2206'),
    shard: shardPX().canvas('#0c2230'),
    bell: bellPX().canvas('#3a0620'), mark: markPX().canvas('#062a3a'), feather: featherPX().canvas('#3a0610'),
    jewel: jewelPX().canvas('#3a2206'), link: linkPX().canvas('#1a1206'), bob: bobPX().canvas('#1a1206'),
    slash: slashPX().canvas(null),
    bolt: boltPX().canvas('#1a0830'),
    star: spellOrbPX(9).canvas('#1a0830'),
    bigStar: spellOrbPX(15).canvas('#1a0830'),
  };
  SPR.bag = bagPX('#ffffff', '#c8ccd8').canvas();
  SPR.cuckoo = gridPX(['....rR......', '...rWWd.....', '..ddWEdd....', '.dddddddYY..', 'ddGGGddddY..', 'dGgggGddd...', '.dGGGddd....', '..ddddd.....', '...Y..Y.....'],
    { r: '#a52a28', R: '#e8433b', W: '#f4f8ff', E: '#120e18', d: '#8a5a2b', Y: '#ffd23f', G: '#d1a12a', g: '#6e4f0e' }).canvas();
  SPR.cuckooWhite = tinted(SPR.cuckoo, '#ffffff', 1);
  { const p = new PX(12, 3); p.rect(0, 1, 9, 1, '#f4f8ff'); p.rect(0, 0, 2, 3, '#b4861c'); p.poly([[8, -0.5], [12, 1.5], [8, 3.5]], '#ff2442'); SPR.b.seek = p.canvas('#12050c'); }
  SPR.icon = {};
  for (const k in ICONS) SPR.icon[k] = gridPX(ICONS[k][0], ICONS[k][1]).canvas();
  SPR.icon.star = starIconPX().canvas();
  SPR.icon.staff = gridPX(['.......cC.', '......CcCc', '.......CC.', '......G...', '.....B....', '....B.....', '...B......', '..B.......', '.b........', 'b.........'], { B: '#7a4a24', b: '#4a2a12', C: '#b36bff', c: '#f2ddff', G: '#e6b93a' }).canvas();
  SPR.icon.spell = spellOrbPX(10).canvas();
  SPR.icon.robe = gridPX(['...HHHH...', '..YYooYY..', '.YYYooYYY.', 'YYYKKKKYYY', '.YYYYYYYY.', '.YYYYYYYY.', '.yYYYYYYy.', '.yyyyyyyy.', '..........', '..........'], { Y: '#ffd23f', y: '#c98a14', o: '#fff2a8', H: '#7a3fc4', K: '#7a3fc4' }).canvas();
  SPR.glow = {};
  const gc = { c: 'rgba(60,220,255,0.9)', m: 'rgba(255,60,160,0.9)', g: 'rgba(255,190,60,0.9)', w: 'rgba(255,255,255,0.95)', p: 'rgba(190,110,255,0.95)', r: 'rgba(255,60,80,0.9)' };
  for (const k in gc) SPR.glow[k] = glowSprite(gc[k], 64);
}
