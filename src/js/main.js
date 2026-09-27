'use strict';
// ================= the playable game: loop, input, menus =================
const CV = document.getElementById('cv'), CTX = CV.getContext('2d', { alpha: false });   // always fully painted
const G = { mode: 'load', paused: false, autofire: true, keys: {}, mx: GW / 2, my: GH / 2 - 200, lmb: false, attempts: 0, newPB: false, prevPB: null, practice: 0, titleT: 0, deadAt: 0 };
const store = {
  get(k, d) { try { const v = localStorage.getItem('oryx4.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('oryx4.' + k, JSON.stringify(v)); } catch (e) { } },
};

// ---------- layout: keep the 1920x1080 canvas letterboxed in the window ----------
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  CV.style.width = W * s + 'px'; CV.style.height = H * s + 'px';
}
addEventListener('resize', fit); fit();

// ---------- input ----------
const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'ability' };
addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  audioInit();
  if (KEYMAP[e.code]) G.keys[KEYMAP[e.code]] = true;
  if (e.repeat) return;
  if (G.mode === 'title') {
    const di = DIFF_ORDER.indexOf(CUR_DIFF);
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'Tab') pickBoss(BOSS_N === 5 ? 4 : 5);
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') pickDiff(DIFF_ORDER[Math.max(0, di - 1)]);
    if (e.code === 'ArrowRight' || e.code === 'KeyD') pickDiff(DIFF_ORDER[Math.min(2, di + 1)]);
    if (e.code === 'Enter' || e.code === 'NumpadEnter') begin(0);
    const n = +e.key; if (n >= 1 && n <= PRACTICE_BTNS[BOSS_N].length) begin(n);
    if (e.code === 'KeyM') setMuted(!LA.muted);
    return;
  }
  if (G.mode !== 'play') return;
  if (e.code === 'Escape' || e.code === 'KeyP') { togglePause(); return; }
  if (e.code === 'KeyR') {
    // restarting a live run takes Esc then R; R alone only works once the run is over
    if (G.paused || S.dead || T_KILL !== Infinity) begin(G.practice); else G.rHint = performance.now();
    return;
  }
  if (e.code === 'KeyM') setMuted(!LA.muted);
  if (G.paused) { if (e.code === 'KeyQ') toTitle(); return; }
  if ((S.dead || T_KILL !== Infinity) && (e.code === 'Enter' || e.code === 'NumpadEnter')) { toTitle(); return; }
  if (e.code === 'KeyC' || e.code === 'KeyI') toggleAuto();
  if (e.code === 'KeyF') S.input.hpPot = 1;
  if (e.code === 'KeyV') S.input.mpPot = 1;
});
addEventListener('keyup', e => { if (KEYMAP[e.code]) G.keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { G.keys = {}; G.lmb = false; if (G.mode === 'play' && !G.paused && S && !S.dead) togglePause(); });
function canvasPos(e) { const r = CV.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
CV.addEventListener('mousemove', e => { [G.mx, G.my] = canvasPos(e); });
CV.addEventListener('mousedown', e => {
  e.preventDefault(); audioInit(); [G.mx, G.my] = canvasPos(e);
  if (G.mode === 'title') { if (e.button !== 0) return; const hit = DIFF_ORDER.find((d, i) => Math.abs(G.mx - diffX(i)) < 100 && Math.abs(G.my - 906) < 28), pr = practiceHit(), bs = bossHit(); if (bs) pickBoss(bs); else if (hit) pickDiff(hit); else if (pr >= 0) begin(pr + 1); else begin(0); return; }
  if (e.button === 0) G.lmb = true;
  if (e.button === 1 && G.mode === 'play') toggleAuto();
});
addEventListener('mouseup', e => { if (e.button === 0) G.lmb = false; });
CV.addEventListener('contextmenu', e => e.preventDefault());
CV.addEventListener('auxclick', e => e.preventDefault());
const diffX = i => 1140 + i * 220;
const PRACTICE_BTNS = { 4: ['TICK', 'REWIND', 'STASIS', 'XI HOUR', 'MIDNIGHT', 'FINAL SEC'], 5: ['STAFF', 'WAND', 'BOW', 'DAGGER', 'SWORD', 'KNIGHT', 'LAST STAND'] }, practX = i => 1360 + (i - (PRACTICE_BTNS[BOSS_N].length - 1) / 2) * 122, PRACT_Y = 784;
const practiceHit = () => PRACTICE_BTNS[BOSS_N].findIndex((_, i) => Math.abs(G.mx - practX(i)) < 58 && Math.abs(G.my - PRACT_Y) < 18);
// the two fights: tabs at the top of the title screen
const bossX = n => n === 4 ? 1240 : 1480, BOSS_TAB_Y = 44;
const bossHit = () => [4, 5].find(n => Math.abs(G.mx - bossX(n)) < 110 && Math.abs(G.my - BOSS_TAB_Y) < 26);
function pickBoss(n) { if (n === BOSS_N) return; selectBoss(n); store.set('boss', n); uiBlip(n === 5 ? 1.2 : 0.9); }
function pickDiff(d) { if (d === CUR_DIFF) return; setDifficulty(d); store.set('difficulty', d); uiBlip(d === 'easy' ? 0.8 : d === 'hard' ? 1.0 : 1.3); }
const pbKey = () => (BOSS_N === 5 ? 'o5pb.' : 'pb6.') + CUR_DIFF, attKey = () => BOSS_N === 5 ? 'attempts5' : 'attempts';
function toggleAuto() { G.autofire = !G.autofire; store.set('autofire', G.autofire); uiBlip(G.autofire ? 1.25 : 0.8); }
function togglePause() {
  G.paused = !G.paused;
  if (LA.ctx) { if (G.paused) LA.ctx.suspend(); else LA.ctx.resume(); }
}
function screenToWorld(sx, sy) { const c = S.cam; return [c.x + (sx - GW / 2) / (TILE * c.z), c.y + (sy - GH * 0.54) / (TILE * c.z)]; }
function applyInput() {
  const I = S.input, k = G.keys;
  I.up = k.up ? 1 : 0; I.down = k.down ? 1 : 0; I.left = k.left ? 1 : 0; I.right = k.right ? 1 : 0;
  I.ability = k.ability ? 1 : 0; I.fire = G.lmb ? 1 : 0; I.auto = G.autofire ? 1 : 0;
  [I.ax, I.ay] = screenToWorld(G.mx, G.my);
}

// ---------- flow ----------
function begin(practice) {
  audioInit(); uiBlip(1.5);
  G.practice = practice; G.mode = 'play'; G.paused = false; G.rHint = 0;
  if (LA.ctx && LA.ctx.state === 'suspended') LA.ctx.resume(); G.newPB = false; G.deadAt = 0;
  if (!practice) { G.attempts = store.get(attKey(), 0) + 1; store.set(attKey(), G.attempts); }
  startGame(practice);
  const pb = practice ? null : store.get(pbKey(), null);
  G.prevPB = pb ? pb.total : null;
  SPLITS.forEach((s, i) => s.pb = pb ? pb.splits[i] : null);
  if (LA.cur) musicStop(0.2);
}
function toTitle() { G.mode = 'title'; G.paused = false; if (LA.ctx && LA.ctx.state === 'suspended') LA.ctx.resume(); S = null; }
function onKill() {
  if (G.practice || G.killSaved === S) return;
  G.killSaved = S;
  const R = T_KILL - T_RUN, pb = store.get(pbKey(), null);
  if (!pb || R < pb.total) { store.set(pbKey(), { total: R, splits: SPLITS.map(s => s.T - T_RUN) }); G.newPB = true; }
}

// ---------- loop ----------
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  RI.a = 1;
  if (G.mode === 'play' && S && !G.paused) {
    acc += dt;
    let n = 0;
    while (acc >= 1 / FPS && n < 6) {
      RI.S = S; RI.wt = S.wt; RI.cx = S.cam.x; RI.cy = S.cam.y; RI.cz = S.cam.z;   // the state before this step, for interpolation
      if (!S.dead) { applyInput(); step(); }
      acc -= 1 / FPS; n++;
      if (S.dead && !G.deadAt) G.deadAt = now;
      if (T_KILL !== Infinity) onKill();
    }
    if (n === 6) acc = 0;
    RI.a = Math.min(1, acc * FPS);   // how far we are toward the next step: high-refresh screens draw the in-between
    playEvents(S.ev.splice(0));
    musicUpdate(S.T);
  } else if (G.mode === 'title') { G.titleT += dt; musicUpdate(0); }
  render(now);
  requestAnimationFrame(frame);
}
function render(now) {
  const x = CTX;
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.imageSmoothingEnabled = false;
  if (G.mode === 'load' || G.mode === 'title') { drawTitle(x, G.titleT); drawCursor(x); return; }
  const T = Math.max(0, (S.f - 1) / FPS);
  drawGameView(T);
  drawSidebar(x, T);
  drawOverlays(x, T);
  drawPlayHud(x, T);
  if (S.dead) drawDeath(x, T, now);
  if (G.paused) drawPause(x);
  else if (G.rHint && now - G.rHint < 2000) { x.globalAlpha = Math.min(1, (2000 - (now - G.rHint)) / 400); panel(x, GW / 2 - 250, GH - 110, 500, 48, { bg: 'rgba(10,8,14,0.85)', bd: '#ffd23f' }); txt(x, 'ESC, then R \u2014 restart the run', GW / 2, GH - 86, 18, '#ffe07a', { f: 'SilkB', sw: 0, w: 400 }); x.globalAlpha = 1; }
  drawCursor(x);
}

// ---------- screens ----------
function drawPlayHud(x, T) {
  const on = G.autofire;
  const label = on ? 'AUTOFIRE ON' : 'AUTOFIRE OFF · HOLD LMB';
  x.font = '400 14px SilkB'; const w = x.measureText(label).width + 70;
  panel(x, GW / 2 - w / 2, GH - 46, w, 32, { bg: 'rgba(10,8,14,0.7)', bd: on ? '#3fd46a' : '#6a6a80' });
  txt(x, label + '  [C]', GW / 2, GH - 29, 14, on ? '#7dffb0' : '#c9c9d8', { f: 'SilkB', sw: 0, w: 400 });
  const wp = fxSince('strike', T, 3);
  if (wp) {
    const u = T - wp.T;
    x.fillStyle = `rgba(255,250,240,${Math.max(0, 1 - u / 2.5)})`; x.fillRect(0, 0, GW, GH);
    x.globalAlpha = Math.max(0, 1 - u / 3); txt(x, 'XII', GW / 2, GH / 2 - 40, 160, '#8a1030', { f: 'P2P', sw: 0, w: 400 }); x.globalAlpha = 1;
  }
}
function drawDeath(x, T, now) {
  const u = (now - G.deadAt) / 1000, a = sat(u / 0.6);
  x.fillStyle = `rgba(30,0,6,${0.62 * a})`; x.fillRect(0, 0, GW, GH);
  if (u < 0.4) return;
  x.globalAlpha = sat((u - 0.4) / 0.4);
  const cx = GW / 2, cy = 330;
  x.fillStyle = '#5a5566'; x.beginPath(); x.moveTo(cx - 70, cy + 110); x.lineTo(cx - 70, cy - 40); x.arc(cx, cy - 40, 70, Math.PI, 0); x.lineTo(cx + 70, cy + 110); x.closePath(); x.fill();
  x.strokeStyle = '#1a1820'; x.lineWidth = 6; x.stroke();
  x.fillStyle = '#3a3644'; x.fillRect(cx - 8, cy - 70, 16, 90); x.fillRect(cx - 34, cy - 44, 68, 16);
  x.fillStyle = '#2a2433'; x.fillRect(cx - 110, cy + 106, 220, 18);
  txt(x, 'YOU DIED', cx, cy + 190, 64, '#ff4f6a', { f: 'P2P', sw: 10, sc: '#2a0508', w: 400 });
  const hp = (MAXHP - S.cum[S.wf]) / MAXHP * 100, F5 = BOSS_N === 5 ? FORMS5[S.f5.i] : null;
  const cause = 'Killed by ' + (F5 && F5.party ? F5.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).replace('The ', 'the ') + ', the heroes he stole' : BOSS + (F5 && F5.surv ? ' in his Last Stand' : !F5 && phaseOf(S.dead) === 4 ? ' at midnight' : ''));
  txt(x, cause, cx, cy + 262, 28, '#ffd9de', { sw: 5 });
  const ph = F5 ? PHASES5[F5.w] : PHASES[phaseOf(S.dead)];
  txt(x, (!F5 && S.dead >= TL.sv ? 'The Final Seconds — ' + Math.max(0, survLeft(S.dead)).toFixed(1) + 's left' : 'Phase ' + ph.num + ' — ' + ph.name + (F5 && F5.stance ? ' · ' + F5.stance : '') + '   ·   ' + (F5 && F5.surv ? Math.max(0, survLeft5(S.dead)).toFixed(1) + ' s left on the clock' : 'boss HP ' + hp.toFixed(1) + '%')) + '   ·   ' + fmtTime(S.dead - T_RUN), cx, cy + 310, 24, '#c9b8d8', { sw: 4 });
  txt(x, 'R — try again        ENTER — title', cx, cy + 380, 22, Math.floor(u * 2) % 2 ? '#ffe07a' : '#ffffff', { f: 'SilkB', sw: 4, w: 400 });
  const pn = F5 ? (F5.ai === 'knight3' ? 7 : F5.w + 1) : S.dead >= TL.sv ? 6 : phaseOf(S.dead) + 1;
  if (!G.practice && pn >= 2) txt(x, 'Tip: press ' + pn + ' on the title screen to practice this phase.', cx, cy + 424, 18, '#9c95ab', { sw: 3 });
  x.globalAlpha = 1;
}
function drawPause(x) {
  x.fillStyle = 'rgba(5,3,10,0.72)'; x.fillRect(0, 0, W, H);
  txt(x, 'PAUSED', W / 2, 250, 64, '#ffe07a', { f: 'P2P', sw: 8, w: 400 });
  drawControls(x, W / 2 - 330, 330);
  txt(x, 'ESC — resume      R — restart      Q — quit to title      M — mute', W / 2, 830, 20, '#ffffff', { f: 'SilkB', sw: 3, w: 400 });
}
const CONTROLS = [['WASD', 'move'], ['Mouse', 'aim'], ['Left click', 'shoot (when autofire is off)'], ['C / MMB / I', 'toggle autofire'], ['Space', 'Arcane Shuriken (110 MP)'], ['F / V', 'health / magic potion'], ['Esc', 'pause'], ['Esc, then R', 'restart the run']];
function drawControls(x, X, Y) {
  panel(x, X, Y, 660, 36 + CONTROLS.length * 40, { bg: 'rgba(10,8,16,0.88)', bd: '#4a3f63' });
  CONTROLS.forEach(([k, v], i) => {
    txt(x, k, X + 28, Y + 38 + i * 40, 20, '#ffd23f', { a: 'left', f: 'SilkB', sw: 0, w: 400 });
    txt(x, v, X + 300, Y + 38 + i * 40, 22, '#e8e0f0', { a: 'left', sw: 0 });
  });
}
function drawTitle(x, t) {
  x.fillStyle = '#030206'; x.fillRect(0, 0, W, H);
  x.globalAlpha = 0.85; x.drawImage(NEB, -140, -260); x.globalAlpha = 1;
  for (const s of STARS) { const sx = ((s.x + t * 6 * s.p) % 2200 + 2200) % 2200 - 140, sy = s.y + 260; if (sx > W || sy > H || sy < 0) continue; x.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + s.tw); x.fillStyle = s.c; x.fillRect(sx, sy, s.s, s.s); }
  x.globalAlpha = 1;
  const cx = 560, cy = 470;
  if (BOSS_N === 5) drawTitleArt5(x, t, cx, cy);
  else {
  x.save(); x.translate(cx, cy); x.globalAlpha = 0.28;
  x.strokeStyle = '#d1a12a'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 400, 0, TAU); x.stroke(); x.beginPath(); x.arc(0, 0, 362, 0, TAU); x.stroke();
  for (let k = 0; k < 60; k++) { x.save(); x.rotate(k * TAU / 60); x.fillStyle = '#d1a12a'; x.fillRect(-2, -400, 4, k % 5 === 0 ? 30 : 12); x.restore(); }
  x.font = '400 26px P2P'; x.fillStyle = '#d1a12a'; x.textAlign = 'center'; x.textBaseline = 'middle';
  ROMAN.forEach((r, h) => { const a = -Math.PI / 2 + h * Math.PI / 6; x.fillText(r, Math.cos(a) * 318, Math.sin(a) * 318); });
  x.lineCap = 'round'; x.strokeStyle = '#ffdc72';
  x.lineWidth = 8; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.sin(-t * 1.3) * 300, -Math.cos(-t * 1.3) * 300); x.stroke();
  x.lineWidth = 14; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.sin(-t * 0.11) * 200, -Math.cos(-t * 0.11) * 200); x.stroke();
  x.restore(); x.globalAlpha = 1;
  if (SPR.bossRim) {
    const s = 8, ox = cx - 33 * s, oy = cy - 300;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { x.drawImage(SPR.cloakRim, ox + dx * 5, oy + CLOAK_Y * s + dy * 5, SPR.cloak[0].width * s, SPR.cloak[0].height * s); x.drawImage(SPR.bossRim, ox + dx * 5, oy + dy * 5, SPR.boss[0].width * s, SPR.boss[0].height * s); }
    x.drawImage(SPR.cloakBlack, ox, oy + CLOAK_Y * s, SPR.cloak[0].width * s, SPR.cloak[0].height * s);
    x.drawImage(SPR.bossBlack, ox, oy, SPR.boss[0].width * s, SPR.boss[0].height * s);
    x.globalCompositeOperation = 'lighter';
    for (const [ex, ey] of BOSS_EYES) glowAt(x, 'r', ox + (ex + 1.5) * s, oy + (ey + 1.5) * s, 100, 0.8 + 0.2 * Math.sin(t * 5));
    x.globalCompositeOperation = 'source-over';
  }
  }
  // the two fights
  for (const n of [4, 5]) {
    const on = n === BOSS_N, hv = bossHit() === n, bx = bossX(n);
    panel(x, bx - 110, BOSS_TAB_Y - 24, 220, 48, { bg: on ? (n === 5 ? 'rgba(46,34,6,0.95)' : 'rgba(40,10,20,0.95)') : 'rgba(14,10,18,0.85)', bd: on ? (n === 5 ? '#ffd23f' : '#ff6477') : hv ? '#8a7a9a' : '#3a3346', lw: on ? 3 : 2 });
    txt(x, n === 5 ? 'ORYX V' : 'ORYX IV', bx, BOSS_TAB_Y - 6, on ? 20 : 17, on ? (n === 5 ? '#ffe07a' : '#ff8a9a') : '#9c95ab', { f: 'P2P', sw: 0, w: 400 });
    txt(x, n === 5 ? 'THE USURPER' : 'THE UNWOUND', bx, BOSS_TAB_Y + 13, 11, on ? '#e8e0f0' : '#6a6a80', { f: 'SilkB', sw: 0, w: 400 });
  }
  txt(x, '↑ ↓ choose the fight', 1360, 88, 12, '#6a6a80', { f: 'SilkB', sw: 0, w: 400 });
  txt(x, BOSS_N === 5 ? 'ORYX THE MAD GOD V' : 'ORYX THE MAD GOD IV', 1360, 170, 50, '#ffcf5a', { f: 'P2P', sw: 9, sc: '#2a0508', w: 400 });
  txt(x, BOSS_N === 5 ? '— THE USURPER —' : '— THE UNWOUND —', 1360, 238, 26, BOSS_N === 5 ? '#ffe07a' : '#ff6477', { f: 'P2P', sw: 5, w: 400 });
  txt(x, BOSS_N === 5 ? 'he took the realm’s heroes · now they hunt you · harder than IV' : 'a fan-made boss rush · play as ' + NW + ' the Wizard', 1360, 290, 22, '#c9b8d8', { sw: 0 });
  drawControls(x, 1030, 330);
  const blink = Math.floor(t * 2) % 2 === 0;
  txt(x, 'ENTER or CLICK — begin the run', 1360, 720, 26, blink ? '#ffe07a' : '#ffffff', { f: 'SilkB', sw: 4, w: 400 });
  // practice: click a phase, or press its number
  txt(x, 'PRACTICE A PHASE — click or press 1–' + PRACTICE_BTNS[BOSS_N].length, 1360, 750, 13, '#9c95ab', { f: 'SilkB', sw: 0, w: 400 });
  const ph = practiceHit();
  PRACTICE_BTNS[BOSS_N].forEach((name, i) => {
    const cx = practX(i), on = ph === i;
    panel(x, cx - 58, PRACT_Y - 18, 116, 36, { bg: on ? 'rgba(58,36,88,0.95)' : 'rgba(14,10,18,0.85)', bd: on ? '#c77dff' : '#3a3346', lw: on ? 3 : 2 });
    txt(x, (i + 1) + ' ' + name, cx, PRACT_Y + 1, 13, on ? '#f2ddff' : '#c9b8d8', { f: 'SilkB', sw: 0, w: 400 });
  });
  const pb = store.get(pbKey(), null), att = store.get(attKey(), 0);
  txt(x, DIFFS[CUR_DIFF].name + ' personal best: ' + (pb ? fmtTime(pb.total) : '—') + '    ·    attempts: ' + att, 1360, 822, 22, '#ffd23f', { sw: 3 });
  txt(x, BOSS_N === 5 ? 'Five parties of stolen heroes. Then the Knight himself.' : 'At the twelfth bell, midnight falls. Survive it.', 1360, 852, 20, BOSS_N === 5 ? '#ffe07a' : '#ff9aa8', { sw: 3 });
  // difficulty chooser
  DIFF_ORDER.forEach((d, i) => {
    const D = DIFFS[d], on = d === CUR_DIFF, cx = diffX(i), hover = Math.abs(G.mx - cx) < 100 && Math.abs(G.my - 906) < 28;
    panel(x, cx - 100, 878, 200, 56, { bg: on ? 'rgba(40,20,30,0.95)' : 'rgba(14,10,18,0.85)', bd: on ? D.col : hover ? '#8a7a9a' : '#3a3346', lw: on ? 3 : 2 });
    txt(x, D.name, cx, 907, on ? 20 : 17, on ? D.col : '#9c95ab', { f: 'SilkB', sw: 0, w: 400 });
  });
  const D = diffOf(CUR_DIFF);
  txt(x, '← →   ' + D.hp + ' HP  ·  ' + D.regen + ' HP/s regen  ·  ' + (D.pots ? D.pots + ' HP / ' + D.mpots + ' MP potions' : 'no potions'), 1360, 962, 20, D.col, { sw: 3 });
  const prog = BOSS_N === 5 ? (LA.prog5 || 0) : LA.prog;
  if (prog < 1) txt(x, 'composing the soundtrack… ' + Math.round(prog * 100) + '%', 1360, 1040, 18, '#7a7a90', { sw: 0 });
  else if (!LA.ctx) txt(x, 'press any key to wake the audio', 1360, 1040, 18, '#7a7a90', { sw: 0 });
  txt(x, 'fan-made · original art & music · not affiliated with DECA Games', 20, 1060, 16, '#5a5566', { a: 'left', sw: 0 });
}
function drawCursor(x) {
  const mx = G.mx, my = G.my;
  x.save(); x.lineWidth = 3; x.strokeStyle = '#000'; x.beginPath(); x.arc(mx, my, 11, 0, TAU); x.stroke();
  x.lineWidth = 2; x.strokeStyle = '#ffffff'; x.beginPath(); x.arc(mx, my, 11, 0, TAU); x.stroke();
  x.fillStyle = '#fff';
  for (const [dx, dy, w, h] of [[-19, -1, 10, 2], [9, -1, 10, 2], [-1, -19, 2, 10], [-1, 9, 2, 10]]) { x.fillStyle = '#000'; x.fillRect(mx + dx - 1, my + dy - 1, w + 2, h + 2); x.fillStyle = '#fff'; x.fillRect(mx + dx, my + dy, w, h); }
  x.fillStyle = '#ff4f6a'; x.fillRect(mx - 1.5, my - 1.5, 3, 3);
  x.restore();
}

// ---------- boot ----------
(async function boot() {
  await Promise.all(['Pix', 'SilkB', 'P2P', 'Chakra', 'ChakraS'].map(f => document.fonts.load(`20px ${f}`)));
  buildSprites(); buildSprites5(); initRender(); initRender5();
  G.autofire = store.get('autofire', true);
  selectBoss(store.get('boss', 4) === 5 ? 5 : 4);
  setDifficulty(DIFFS[store.get('difficulty', 'hard')] ? store.get('difficulty', 'hard') : 'hard');
  G.mode = 'title';
  requestAnimationFrame(frame);
  loadMusic().then(() => loadMusic5());   // one after the other: both render through the same offline audio globals
})();
// Oryx V on the title screen: the giant yellow wizard in silhouette, the fifteen heroes he became circling him
function drawTitleArt5(x, t, cx, cy) {
  x.save(); x.translate(cx, cy);
  x.globalAlpha = 0.3; x.strokeStyle = '#d1a12a'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 400, 0, TAU); x.stroke(); x.beginPath(); x.arc(0, 0, 330, 0, TAU); x.stroke();
  x.globalAlpha = 1; x.imageSmoothingEnabled = false;
  FORM5_IDS.forEach((id, i) => { const a = -Math.PI / 2 + i * TAU / 15 + t * 0.05, ic = SPR5.icon[id]; x.globalAlpha = 0.55 + 0.25 * Math.sin(t * 2 + i); x.drawImage(ic, Math.cos(a) * 365 - 25, Math.sin(a) * 365 - 25, 50, 50); });
  x.restore(); x.globalAlpha = 1;
  const sp = SPR5.form.knight, s = 22, bob = Math.sin(t * 1.7) * 6, hx = cx - 9 * s + sp.hand[0] * s, hy = cy - 9 * s - 20 + bob + sp.hand[1] * s, th = 0.35 + 0.05 * Math.sin(t * 1.7);
  x.globalCompositeOperation = 'lighter'; glowAt(x, 'g', cx, cy - 20, 1000, 0.3 + 0.06 * Math.sin(t * 2)); glowAt(x, 'w', hx + 60, hy - 330, 300, 0.4 + 0.2 * Math.sin(t * 6)); x.globalCompositeOperation = 'source-over';
  x.globalAlpha = 0.85; x.setTransform(s, 0, 0, s, cx - 9 * s + (sp.lhand[0] - 14 + 9) * s, cy - 9 * s - 20 + bob + (sp.lhand[1] - 8 + 9) * s); x.drawImage(sp.shield, -sp.shieldPivot[0], -sp.shieldPivot[1]); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1;
  x.globalAlpha = 0.5; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) x.drawImage(sp.rim, cx - 9 * s + dx * 5, cy - 9 * s - 20 + bob + dy * 5, 18 * s, 18 * s); x.globalAlpha = 1;
  x.drawImage(sp.body, cx - 9 * s, cy - 9 * s - 20 + bob, 18 * s, 18 * s);
  x.setTransform(Math.cos(th) * s, Math.sin(th) * s, -Math.sin(th) * s, Math.cos(th) * s, hx, hy); x.drawImage(sp.weapon, -sp.pivot[0], -sp.pivot[1]); x.setTransform(1, 0, 0, 1, 0, 0);
  x.drawImage(SPR5.fist, hx - 2.5 * s, hy - 2.5 * s, 5 * s, 5 * s);
}
