'use strict';
// ---------- global constants ----------
const W = 1920, H = 1080, FPS = 60;
const GW = 1560, GH = 1080;              // game viewport; sidebar is x >= GW
const BEAT = 0.5, BAR = 2.0;             // 120 BPM
const TILE = 72, TEX = 9;
const ARENA_R = 12.6;
const MAXHP = 1870000;
let P_MAXHP = 1250;                      // set by the chosen difficulty
const P_MAXMP = 612;
const HN = FPS * 60 * 20;                // history capacity: 20 minutes
const PHASE_FLOOR = [0.785, 0.641, 0.385, 0.192, 0];   // phases I-II are short; III-V keep 480k / 360k / 360k HP
const CHIME_DT = 2.5;                    // seconds between bells in the eleventh hour; the 12th forces midnight

// ---------- timeline ----------
// In the video every event had a fixed time. In the game they are filled in as the fight unfolds
// (Infinity = has not happened yet), so the renderer's time checks work unchanged.
const TL = {};
let T_RUN = 0, T_KILL = Infinity, T_END = 213.5;
const TL_KEYS = ['lobby', 'run', 'land', 'p1', 'rw', 'rwA', 'rwB', 'p2', 'ts', 'tsA', 'tsB', 'p3', 'sent', 'mn', 'p4', 'm12', 'p5', 'sv', 'svB', 'bag', 'results', 'credits'];
function resetTL() { for (const k of TL_KEYS) TL[k] = Infinity; T_KILL = Infinity; T_RUN = 0; }
// the video's fixed timeline: the soundtrack is pre-rendered against it and sliced into phase loops
const VIDEO_TL = { lobby: 12, run: 24, land: 26, p1: 26, rw: 58, rwA: 58.5, rwB: 60.5, p2: 62, ts: 94, tsA: 94.5, tsB: 99.0, p3: 100, sent: 108, mn: 132, p4: 136 };
function useVideoTL() { resetTL(); Object.assign(TL, VIDEO_TL); T_RUN = 24; T_KILL = 184; }
resetTL();
const CHIME = k => TL.p4 + CHIME_DT * k;

const SPLITS = ['Tick', 'Rewind', 'Stasis', 'Eleventh Hour', 'Midnight', 'Final Seconds'].map(name => ({ name, T: Infinity, pb: null }));
const PHASES = [{ key: 'p1', num: 'I', name: 'TICK' }, { key: 'p2', num: 'II', name: 'REWIND' }, { key: 'p3', num: 'III', name: 'STASIS' }, { key: 'p4', num: 'IV', name: 'ELEVENTH HOUR' }, { key: 'p5', num: 'V', name: 'MIDNIGHT' }];

const BOSS = 'Oryx the Mad God IV';
const NW = 'Wizard';   // the player's name on the nameplate, chat and results
const CHAT = [];
function say(T, who, text) { CHAT.push([T, who, text]); }
// boss lines, relative to the start of each phase (only spoken while that phase is still running)
const PHASE_LINES = {
  p1: [[0.6, 'Now the hours themselves obey ME. Your clock runs out here.'], [7, 'Tick. Tock. Every second you spend here is a second I own.'], [15, 'Dance between my gears, little ninja!'], [24.5, 'You cannot outrun time.'], [40, 'Still here? I have all the time in the world.']],
  p2: [[4, 'Your own past is my weapon now.'], [12, 'I have watched this moment a thousand times. You die in all of them.'], [26, 'Every ending belongs to me.']],
  p3: [[1.6, 'You survived that? Impossible.'], [7.8, 'Sentinels! Hold the hour!'], [16, 'The sands will bury you, as they buried the realm.'], [24, 'Shatter, mortal. Like glass.']],
  p4: [[1.5, 'The eleventh hour. Savor it. It is your last.'], [10, 'Your little timer means NOTHING against eternity!'], [20, 'Feel the hours close around you!']],
  p5: [[2.5, 'Every hand on this clock points at YOU.'], [7, 'Cuckoo. Cuckoo. Your hour has come.'], [13, 'Your sand runs out. Mine never does.'], [22, 'Wardens! Toll the hours!'], [34, 'Midnight does not end, mortal!']],
};

// ---------- math / rng ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sat = v => clamp(v, 0, 1);
const smooth = t => { t = sat(t); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - sat(t), 3);
const easeIn = t => Math.pow(sat(t), 3);
const easeInOut = t => { t = sat(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const frac = v => v - Math.floor(v);
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const fmtK = v => v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'K' : '' + Math.round(v);
const fmtInt = v => Math.round(v).toLocaleString('en-US');
function fmtTime(s, dec = 2) {
  s = Math.max(0, s);
  const m = Math.floor(s / 60), r = s - m * 60;
  const whole = Math.floor(r), fr = Math.floor((r - whole) * Math.pow(10, dec) + 1e-6);
  return (m > 0 ? m + ':' + String(whole).padStart(2, '0') : '' + whole) + (dec ? '.' + String(fr).padStart(dec, '0') : '');
}
