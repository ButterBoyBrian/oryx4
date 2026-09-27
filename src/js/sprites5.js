'use strict';
// ---------- boss: Oryx V "The Usurper" — a giant yellow-dyed NoobWaffle that cycles through the classes ----------
// Bodies are 16x16 front views; the right fist is centred on texel (13,10) and each weapon is its own layer.
const FORM5_IDS = ['wizard', 'necro', 'mystic', 'priest', 'sorc', 'summoner', 'archer', 'huntress', 'bard', 'rogue', 'assassin', 'trickster', 'warrior', 'paladin', 'knight'];
const OUT5 = '#07050b';
const PAL5 = {
  Y: '#ffd23f', y: '#d49a1c', o: '#fff2a8', d: '#8a5a0e', S: '#f6cda6', s: '#d9a07a', E: '#120e18',
  B: '#7a4a24', b: '#4a2a12', n: '#a86a34', K: '#1d1a24', W: '#f4f8ff', w: '#c3cad8', M: '#e6ecf5', m: '#a6b0c3', l: '#646d82', R: '#e8433b', r: '#a52a28',
};
const BODY5 = {
  wizard: [['.........Y......', '........oy......', '.......oYy......', '......oYYy......', '.....oYYYYy.....', '...oYYYYYYYy....', '.iiHHHHHHHHHHh..', '..hhsEsssEshh...',
    '....sESSSEs.....', '...oYyyyyyYySSs.', '..ooYYYYYYYySSs.', '.SSHHHHHHHHhsss.', '.ssoYYYyYYYYy...', '..oYYYYyYYYYy...', '..oyYYYdYYyyy...', '...ddd...ddd....'],
    { H: '#7a3fc4', h: '#4b2380', i: '#b36bff' }],
  necro: [['......oYy.......', '.....oYYyy......', '....oYYYyyy.....', '...oYGGGGGyd....', '..oYGhhhhhGyd...', '..YGhhhhhhhGd...', '..YGhEPPPEhGd...', '..yGhPPPPPhGd...',
    '..yGhhpPphhGd...', '...oHyyyyyHySSs.', '..ooYHWWWHYySSs.', '.SSoYYEWEYYysss.', '.ssoYYwWwYYYy...', '..oYYYYHYYYYy...', '..HHHHHHHHHHH...', '...ddd...ddd....'],
    { G: '#ffe07a', H: '#4b2380', h: '#2a1242', P: '#dcd4ea', p: '#a89cc0', W: '#f4f0e0', w: '#b8b4a0' }],
  mystic: [['................', '.....eAaAa......', '....eAAaAAa.....', '...eAAAaAAAa....', '..eAHHHHHHHaa...', '..eASSSSSSSAa...', '..eASESSSESAa...', '..eAaSSSSSaAa...',
    '.eAAasSSSsaAAa..', '.eAaoyyyyyYaSSs.', '.eAaYYYYYYYaSSs.', '.eAaYYYYYYyasss.', '..aSSPPPPPPPy...', '..oSsYYYYYYYy...', '..oyYYYYYYyyy...', '...ddd...ddd....'],
    { A: '#e8a838', a: '#a8661c', e: '#ffdc80', H: '#3fbf5a', P: '#8a4fd8' }],
  priest: [['................', '.....WWWWw......', '....WWWWWWw.....', '...WWAAAAAww....', '..WWAAAAAAAww...', '..WASSSSSSSAw...', '..WASESSSESAw...', '..wWSSSSSSSWw...',
    '..wWWsSSSsWWw...', '..WWWWWWWWWwSSs.', '..oYYYYWYYYySSs.', '.SSoYYYWYYYysss.', '.ssoYYYWYYYYy...', '..oYYYYWYYYYy...', '..oyYYYWYYyyy...', '...ddd...ddd....'],
    { A: '#ffeaa0', w: '#b8c0d4' }],
  sorc: [['.......Y........', '......oYy.......', '.....oYYYy......', '....oYYYYYy.....', '...oYYKKKYyy....', '..oYYKKKKKYyy...', '..oYKGKKKGKyy...', '..YYKgKKKgKyy...',
    '..yYYKKKKKYyy...', '...oYyyyyyYySSs.', '..oRYYYYYYRySSs.', '.SSRYYYRYYYRsss.', '.ssoYYYRYYYYy...', '..oYYYYRYYYYy...', '..RRRRRRRRRRR...', '...ddd...ddd....'],
    { K: '#050308', G: '#ffb040', g: '#c8281a' }],
  summoner: [['......e..e......', '....eAeAAeA.....', '...eAAAAAAAa....', '..eAAAAAAAAAa...', '..AMMMMCMMMMa...', '..eASSSSSSSaa...', '..AASESSSESaa...', '..aASSSSSSSAa...',
    '...aASSSSSAa....', '...oYyyyyyYySSs.', '..ooYYmMmYYySSs.', '.SSoYYMvMYYysss.', '.ssoYYmMmYYYy...', '..oYYYYYYYYYy...', '..oyYYYYYYyyy...', '...ddd...ddd....'],
    { A: '#e8452a', a: '#a8261a', e: '#ff8a4a', C: '#8fe8ff', v: '#9a7ad8' }],
  archer: [['.R..............', '.Rr.....oy......', '..Rr..oYYYy.....', '..rRoYYYYYYy....', '...oYYYYYYYYy...', '..yyyyyyyyyyyd..', '...BSSSSSSSB....', '...BSESSSESB....',
    '....sSSSSSs.....', '...oYnByyyYySSs.', '..ooYYnBYYYySSs.', '.SSoYYYnBYYysss.', '.ssoYYYYnBYYy...', '...oYYYYYnBy....', '...BB.....BB....', '...bbb...bbb....'],
    {}],
  huntress: [['................', '.....eAAAa......', '....eAAAAAa.....', '...eAAAAAAAa....', '..eAAAAAAAAAa...', '..eASSSAAAAAa...', '..eASESSSEAAa...', '..eASSSSSSSAa...',
    '.eAAasSSSsaAAa..', '.eAaoHyyyHYaSSs.', '.eAaYYHYHYYaSSs.', '.eASSYYHYYyasss.', '..aSsBBBBBBBy...', '...oYHYYYHYy....', '....dd...dd.....', '...bbb...bbb....'],
    { A: '#f07a24', a: '#b04a12', e: '#ffb060', H: '#8a4fd8' }],
  bard: [['.........F......', '.cb.TTTT.Ff.....', '..biTTTTTFt.....', '.cbiTTTTTTt.....', '.iTTTTTTTTTTTt..', '..nttttttttt....', '..n.SSSSSSS.....', '..n.SESSSES.....',
    '..n..sSSSs......', '..noYyyyyyYySSs.', '..ooYYYoYYYySSs.', '.SSoYYYYYYYysss.', '.ssoYYYoYYYYy...', '...oYYYYYYYy....', '...BB.....BB....', '...bbb...bbb....'],
    { T: '#2bb5a8', t: '#17756d', i: '#7ee8dc', F: '#ff7fb6', f: '#c2407a', c: '#f4f0e0', n: '#b87a44', b: '#5a3418' }],
  rogue: [['................', '......nBB.......', '....nBBBBBb.....', '...nBBnBBBBb....', '..nBBBBBBBBBb...', '..BBSSSSSSSbb...', '..BSSESSSESbb...', '..bRRRRRRRRRRr..',
    '...rRRRRRRRrRr..', '...oYyyyyyYySSs.', '..ooYYYYYYYySSs.', '.SSoYYYYYYYysss.', '.ssKKKKGKKKKK...', '...oYYYyYYYy....', '...ll.....ll....', '...bbb...bbb....'],
    { G: '#c9a227' }],
  assassin: [['......oYy.......', '.....oYYyy......', '....oYYYYyy.....', '...oYYYYYYyy....', '..oYYyyyyyyYd...', '..oYdSSSSSdYd...', '..oYdESSSEdYd...', '..YYRRRRRRRYd...',
    '..yYrRRRRRrYd...', '...oKyyyyyKySSs.', '..ooYKYYYKYySSs.', '.SSoYYKYKYYysss.', '.ssoYYYKYYYYy...', '...KKKKKKKKK....', '...ll.....ll....', '...KKK...KKK....'],
    {}],
  trickster: [['...W...W...W....', '...WW.WWW.WW....', '..wWWWWWWWWWw...', '..wWWWWWWWWWWw..', '..wWWWWWWWWWw...', '..wWSSSSSSSWw...', '..wKKWKKKWKKw...', '...wSSSSSSSw....',
    '....sSSSSSs.....', '...mYyyyyyYmSSs.', '..omYYYYYYYmSSs.', '.SSoYYYYYYYysss.', '.ssmmmmmmmmmm...', '...oYYYyYYYy....', '...ll.....ll....', '...lll...lll....'],
    { K: '#1a1422' }],
  warrior: [['.H...........H..', '.Hh.........hH..', '..Hh.oMMMm.hH...', '..hHoMMMMMmHh...', '...lMMMMMMMl....', '...lmmmmmmml....', '...lSESmSESl....', '...lSSSSSSSl....',
    '....sSSSSSs.....', '.ooYyyyyyyYYSSs.', '.oYyoYYYYYyYSSs.', '.SSoYYYYYYYysss.', '.ssBBBBGBBBBB...', '...oYYYyYYYy....', '...ll.....ll....', '...lll...lll....'],
    { H: '#f0e6cc', h: '#b8a888', G: '#c9a227' }],
  paladin: [['....WWw.........', '.....wWW........', '......Ww........', '....oGGGGGg.....', '...oGGGGGGGg....', '...oGgSSSgGg....', '...GgESGSEgG....', '...GgSSSSSgG....',
    '....gsSSSsg.....', '.ooYyyyWyyYYSSs.', '.oYyYWWWWWyYSSs.', '.SSoYYYWYYYysss.', '.ssoYYYWYYYYy...', '...oYYYYYYYy....', '...ll.....ll....', '...lll...lll....'],
    { G: '#ffc93a', g: '#b07a1e' }],
  knight: [['................', '.....oMMMm......', '....oMMMMMm.....', '...oMMMMMMMm....', '...MKKKKKKKm....', '...MMmmKmmMm....', '...MMmmKmmMm....', '...MmmmKmmmm....',
    '.MMlmmmmmmmlMm..', '.MMmoyyyyyMMSSs.', '.mmlYYYYYYlmSSs.', '.SSoYYYYYYYysss.', '.ssoYYYYYYYYy...', '...oYYYYYYYy....', '...ll.....ll....', '...lll...lll....'],
    {}],
};
// 8x8 icons (floor + HUD)
const ICON5 = {
  wizard: ['...oY...', '..oYYY..', '.hHHHHh.', '.sESSEs.', '.oYYYYy.', 'SHHHHHhS', '.yYYYYy.', '..d..d..'],
  necro: ['...yY...', '..yYYy..', '.yGGGGd.', '.yEPPEd.', '.yhPPhd.', 'SoYWWYyS', '.yYHHYy.', '.HHHHHH.'],
  mystic: ['..eAaA..', '.eHHHHa.', '.AESSEa.', '.ASSSSa.', 'eAYYYYaa', 'SAYYYYyS', '.PPPPPP.', '.dd..dd.'],
  priest: ['..WWWw..', '.WAAAAw.', '.WESSEw.', '.wSSSSw.', '.WWWWWw.', 'SoYWYYyS', '.yYWYYy.', '..d..d..'],
  sorc: ['...oY...', '..oYYy..', '.oKKKKy.', '.YGKKGy.', '.yKKKKy.', 'SoRYYRyS', '.yYRYYy.', '.RRRRRR.'],
  summoner: ['.e.ee.e.', '.eAAAAa.', '.MMCMMm.', '.AESSEa.', '.oYYYYy.', 'SoYmmYyS', '.yYYYYy.', '..d..d..'],
  archer: ['.R..oy..', '.rRoYYy.', '.yyyyyyd', '.BESSEB.', '.oYBYYy.', 'SYYYBYYS', '.yYYYBy.', '.bb..bb.'],
  huntress: ['..eAAa..', '.eAAAAa.', '.AESSAa.', '.ASSSSa.', 'eAHYYHaa', 'SAYHHYyS', '.BBBBBB.', '.bb..bb.'],
  bard: ['c...TF..', 'b.iTTTf.', 'nTTTTTTt', 'n.ESSE..', 'noYYYYy.', 'SYYoYYyS', '.yYoYYy.', '.bb..bb.'],
  rogue: ['..nBBb..', '.nBBBBb.', '.BESSEb.', '.RRRRRRr', '.oYYYYy.', 'SYYYYYyS', '.KKGKKK.', '.bb..bb.'],
  assassin: ['...oY...', '..oYYy..', '.oYyyYy.', '.YESSEd.', '.YRRRRd.', 'SoKYYKyS', '.yYKKYy.', '.KK..KK.'],
  trickster: ['.W.W.W..', '.WWWWWw.', '.wWWWWw.', '.KWKKWK.', '.mSSSSm.', 'SoYYYYyS', '.mmmmmm.', '.ll..ll.'],
  warrior: ['H......H', 'hH.MM.Hh', '.hMMMMh.', '.lESmEl.', '.lSSSSl.', 'SoYYYYyS', '.BBGBBB.', '.ll..ll.'],
  paladin: ['..WWw...', '...wWG..', '.oGGGGg.', '.gESGEg.', '.oYWYYy.', 'SYWWWYyS', '.yYWYYy.', '.ll..ll.'],
  knight: ['..oMMm..', '.oMMMMm.', '.MKKKKm.', '.mmKKmm.', 'MMYYYYmm', 'SmYYYYmS', '.yYYYYy.', '.ll..ll.'],
};

// ---------- weapons (point up; grip = [x, y] in texel units, texel (i, j) spans [i, i+1]) ----------
const WPN5 = {
  wizard: [['..ic..', '.icCh.', '.iCCh.', '.iCCh.', '.iCCh.', '..Ch..', '.GGGg.', '..Gg..', '..nB..', '..nB..', '..nB..', '..nB..', '..nB..', '..HH..',
    '..Hh..', '..Hh..', '..HH..', '..nB..', '..nB..', '..Bb..'], { C: '#b36bff', c: '#f2ddff', i: '#d9b3ff', h: '#7a3fc4', G: '#e6b93a', g: '#b4861c', H: '#7a3fc4' }, [3, 15]],
  necro: [['.wWWw.', 'wWWWWw', 'WgWWgw', 'WGwWGw', '.WwWw.', '.w.w..', '..bB..', '..bB..', '..bB..', '..bB..', '..bB..', '..bB..', '..KK..', '..Kk..',
    '..Kk..', '..KK..', '..bB..', '..bB..', '..bB..', '..bK..'], { W: '#eef0e6', w: '#aeb3a0', g: '#1f8a3e', G: '#7dff7a', b: '#3a2410', B: '#5c3a1c', K: '#2a1f3a', k: '#1a1226' }, [3, 14]],
  mystic: [['.P..P.', 'P.cc.P', 'PcCCcP', 'PcCWcP', '.PccP.', '..PP..', '..Pp..', '..Pp..', '..Pp..', '..Pp..', '..Pp..', '..Pp..', '..GG..', '..Gg..',
    '..Gg..', '..GG..', '..Pp..', '..Pp..', '..Pp..', '..pp..'], { P: '#e8d2a8', p: '#b8986a', C: '#1fc8f5', c: '#9ff4ff', W: '#ffffff', G: '#3fbf5a', g: '#1f7a36' }, [3, 14]],
  priest: [['..W..', '.WoW.', 'WoYoW', '.WoW.', '..W..', '..G..', '..W..', '..w..', '..W..', '..G..', '..W..', '..G..'], { W: '#ffffff', w: '#d8dcea', o: '#fff6c8', Y: '#ffd23f', G: '#e6b93a' }, [2.5, 10]],
  sorc: [['...c.', '..cC.', '.cCb.', '..Cb.', '.cb..', '..b..', '..K..', '..k..', '..K..', '..k..', '..K..', '..k..'], { c: '#dff4ff', C: '#5fb8ff', b: '#2a6ad8', K: '#3a3450', k: '#231e33' }, [2.5, 10]],
  summoner: [['.MMM.', 'MvvvM', 'MvWvM', 'MvvvM', '.MMM.', '..m..', '..M..', '..m..', '..M..', '..m..', '..M..', '..m..'], { M: '#e6ecf5', m: '#8e98ae', v: '#9a7ad8', W: '#ffffff' }, [2.5, 10]],
  archer: [['....nB.', '...nBW.', '..nB.W.', '.nB..W.', '.nB..W.', 'nB...W.', 'nB...W.', 'GG...W.', 'GG...W.', 'GG...W.', 'GG...W.', 'nB...W.', 'nB...W.', '.nB..W.',
    '.nB..W.', '..nB.W.', '...nBW.', '....nB.'], { W: '#f4f8ff', G: '#4a2a12' }, [1, 9]],
  huntress: [['..nB...', '...nB..', '....nBW', '...nB.W', '..nB..W', '.nB...W', 'nB....W', 'GG....W', 'GG....W', 'GG....W', 'GG....W', 'nB....W', '.nB...W', '..nB..W',
    '...nB.W', '....nBW', '...nB..', '..nB...'], { n: '#ffa650', B: '#d0601c', W: '#f4f8ff', G: '#6a2a0e' }, [1, 9]],
  bard: [['...Gg..', '...nRW.', '..nR.W.', '.nR..W.', '.nR..W.', 'nR...W.', 'nR...W.', 'GG...W.', 'Gp...W.', 'Gp...W.', 'GG...W.', 'nR...W.', 'nR...W.', '.nR..W.',
    '.nR..W.', '..nR.W.', '...nRW.', '...Gg..'], { n: '#ffc2b0', R: '#e08a78', r: '#a8564a', W: '#fff2f8', G: '#ffd23f', g: '#c9a227', p: '#3fd8c8' }, [1, 9]],
  rogue: [['..W..', '.WMl.', '.WMl.', '.WMl.', '.WMl.', '.WMl.', 'lmmml', '..b..', '..b..', '..m..'], {}, [2.5, 8]],
  assassin: [['..G..', '.GMl.', '.GMl.', '.GMl.', '.GMl.', '.GMl.', 'lmmml', '..b..', '..b..', '..m..'], { G: '#7dff7a' }, [2.5, 8]],
  trickster: [['..W..', '.RRr.', '.OOo.', '.YYy.', '.GGg.', '.CCc.', 'lmmml', '..b..', '..b..', '..m..'], { O: '#ff9a2a', o: '#c96a10', Y: '#ffe14d', y: '#c9a21a', G: '#3fd46a', g: '#1f8a3e', C: '#4fb6ff', c: '#2a6ad8' }, [2.5, 8]],
  warrior: [['..WM..', '.WMMm.', '.WMMm.', '.WMMm.', '.WMMm.', '.WMMm.', '.WMMm.', '.WMMm.', '.WMMm.', '.WMMm.', '.WMMm.', '.WMMm.', 'llllll', '..RR..',
    '..Rr..', '..Rr..', '..RR..', '..ll..'], {}, [3, 15]],
  paladin: [['..WW..', '.WWww.', '.WGgw.', '.WGgw.', '.WGgw.', '.WGgw.', '.WGgw.', '.WGgw.', '.WWww.', '.WWww.', '.WWww.', 'GGGGGg', 'gGGGGg', '..WW..',
    '..Ww..', '..Ww..', '..GG..', '..Gg..'], { G: '#ffd23f', g: '#b4861c', W: '#ffffff', w: '#c9d6f0' }, [3, 14.5]],
  knight: [['...W...', '..WMm..', '.WMMMm.', '.WMlMm.', '.WMlMm.', '.WMlMm.', '.WMlMm.', '.WMlMm.', '.WMlMm.', '.WMlMm.', '.WMlMm.', '.WMlMm.', '.WMlMm.', '.WMlMm.',
    '.WMlMm.', '.WMlMm.', '.WMMMm.', '.WMMMm.', 'lllllll', 'l.lll.l', '...K...', '...K...', '...k...', '...K...', '..lll..', '..lll..'], { K: '#3a3450', k: '#231e33' }, [3.5, 22]],
};
const SHIELD5 = [['lmmmmmmmmml', 'moYYYYYYYym', 'mYYYYYYYYym', 'mYYKYKYKYym', 'mYYKKKKKYym', 'mYYKKKKKYym', 'mYYYYYYYYym', 'mYYYYYYYYym', 'mYYYYYYYyym', 'myYYYYYYyym', '.myYYYYyym.', '.mmyYYYymm.', '..mmyyymm..', '...mmmmm...'], {}];

// ---------- bullets ----------
const BUL5 = {
  sbolt: [['..vv...', '.vVVGo.', 'vVVGGoW', '.vVVGo.', '..vv...'], { v: '#7a3fc4', V: '#b36bff', G: '#ffd23f', o: '#fff2a8', W: '#ffffff' }, '#1a0830'],
  nbolt: [['..vv...', '.vVVGo.', 'vVVGGoW', '.vVVGo.', '..vv...'], { v: '#1f6a2e', V: '#3fbf5a', G: '#b8ff6a', o: '#eaffc8', W: '#ffffff' }, '#07200c'],
  skull: [['.wWWWw.', 'wWWWWWw', 'WGgWGgW', 'WggWggw', '.WWdWW.', '.wWwWw.', '..w.w..'], { W: '#f4f4ea', w: '#b8b8a8', G: '#7dff7a', g: '#1f8a3e', d: '#555548' }, '#141410'],
  soul: [['..aAa..', '.aAAAa.', 'aAEAEAa', 'aAAAAAa', 'aAAAAAa', '.aAAAa.', '.aAaAa.', 'a.a.a.a', '.......'], { A: '#c8ffd8', a: '#6ad88a', E: '#1a3a24' }, '#0a2a14'],
  ice: [['...W...', '..WCc..', '.WCCCc.', 'WCCWCCc', '.cCCCc.', '..cCc..', '...c...'], { W: '#ffffff', C: '#8fe8ff', c: '#2aa8d8' }, '#062a3a'],
  wbolt: [['.oYYoo...', 'oYWWWWWWW', '.oYYoo...'], { o: '#fff2a8', Y: '#ffd23f', W: '#ffffff' }, '#3a2206'],
  spark: [['C.W..', '.CWC.', 'WWWWC', '.CWC.', '..W.C'], { W: '#ffffff', C: '#6ab8ff' }, '#0a1a3a'],
  mshard: [['..MM.....', '.MvvMM...', 'MvWvvvMM.', '.MvvMM...', '..MM.....'], { M: '#e6ecf5', v: '#9a7ad8', W: '#ffffff' }, '#1a1030'],
  arrow: [['rR.......l..', 'BBBBBBBBBMMW', 'rR.......l..'], { R: '#e8433b', r: '#a52a28', B: '#8a5a2b' }, '#1a0e06'],
  bigArrow: [['rrR.............l...', '.rRR...........lMM..', 'BBBBBBBBBBBBBBBMMMMW', '.rRR...........lMM..', 'rrR.............l...'], { R: '#e8433b', r: '#a52a28', B: '#8a5a2b' }, '#1a0e06'],
  note: [['...WPP.', '...PPPP', '...P..P', '...P...', '...P...', '.PPP...', 'PWPP...', 'PPPP...', '.PP....'], { P: '#ff6fb0', W: '#ffffff' }, '#3a0620'],
  note2: [['...WTT.', '...TTTT', '...T..T', '...T...', '...T...', '.TTT...', 'TWTT...', 'TTTT...', '.TT....'], { T: '#3fd8c8', W: '#ffffff' }, '#06302c'],
  dagger: [['.....MMMM.', 'bbGMMMMMMW', '.....llll.'], { G: '#c9a227' }, '#0e0c14'],
  vdagger: [['.....GGGG.', 'bbGMMMMMMW', '.....llll.'], { G: '#7dff7a' }, '#0e0c14'],
  pdagger: [['.....RYGC.', 'bbMWWWWWWW', '.....oyVv.'], { R: '#ff5a5a', Y: '#ffe14d', G: '#3fd46a', C: '#4fb6ff', o: '#ff9a2a', y: '#c9d63a', V: '#a855f7', v: '#ff6fd0' }, '#0e0c14'],
  bubble: [['...ggg...', '.ggGGGgg.', '.gGWGGGg.', 'gGWGcGGGg', 'gGGccGGGg', 'gGGGGGGGg', '.gGGGGGg.', '.ggGGGgg.', '...ggg...'], { g: '#1f7a36', G: '#5ad86a', c: '#b8ffb0', W: '#ffffff' }, '#07200c'],
  prism: [['...W...', '..RYo..', '.RYGCV.', 'WYGWCVW', '.GGCVv.', '..CVv..', '...v...'], { R: '#ff5a5a', Y: '#ffe14d', o: '#ff9a2a', G: '#3fd46a', C: '#4fb6ff', V: '#a855f7', v: '#ff6fd0' }, '#141024'],
  blade: [['.....MMMM...', '..MMMRRRRMW.', 'MRRRRRRrrRMW', '.rrrrrrrrM..', '...rrrr.....'], { R: '#e8243c', r: '#8c1428' }, '#1a0610'],
  hcross: [['..GGG..', '..GoG..', 'GGGoGGG', 'GoooooG', 'GGGoGGG', '..GoG..', '..GGG..'], { G: '#e6b93a', o: '#fff6d0' }, '#3a2206'],
  kblade: [['..MMMMM..', '.MWWWWWWW', 'lMlllllMW', '.lmmmmmm.', '..lllll..'], {}, '#0e0c14'],
  holy: [['..gggg..', '.gYYYYg.', 'gYYWYYYg', 'gYWWWYYg', 'gYYWYYyg', 'gYYYYyyg', '.gYyyyg.', '..gggg..'], { g: '#c98a14', y: '#e8b030' }, '#3a2206'],
  bone: [['w.....w', 'WWWWWWW', 'w.....w'], { W: '#f4f4ea', w: '#b8b8a8' }, '#141410'],
  fang: [['..W..', '.WWw.', 'WWWww', '.Www.', '..w..'], { W: '#ffffff', w: '#c8b8a8' }, '#3a0610'],
  kwall: [['GGGGGGG', 'GoYYYyG', 'GYYdYyG', 'GYdddyG', '.GYdyG.', '..GyG..', '...G...'], { G: '#b4861c' }, '#3a2206'],
};

// ---------- props ----------
const GRAVE5 = [
  [['...lll...', '..lmmml..', '.lmmMmml.', '.lmMMMml.', '.lmmMmml.', '.lmmMmml.', '.lmmmmml.', '.lmlmmml.', '.lmmlmml.', 'lllllllll', 'bbbbbbbbb'], { b: '#3a2a1a' }],
  [['..lllll..', '.lmmmmml.', 'lmMmmmmml', 'lmmmlmmml', 'lmmmmlmml', 'lmmmlmmml', 'lmmmmmmml', 'lmmlmmmml', 'lmmmmmmml', 'lllllllll', 'bbbbbbbbb'], { b: '#3a2a1a' }],
  [['..lllll..', '.lmmmmml.', 'lmWWWWWml', 'lmWKWKWml', 'lmWWWWWml', 'lmmWWWmml', 'lmmmmmmml', 'lmmlmmmml', 'lmmmlmmml', 'lllllllll', 'bbbbbbbbb'], { b: '#3a2a1a', K: '#2a1f3a' }],
];
const MIRROR5 = [['...MMMMMM...', '..MvvvvvvM..', '.MvvWWvvvvM.', 'MvvWWvvvvvvm', 'MvWWvvvvvvvm', 'MvWvvvvvvvvm', 'MvvvvvvvvVvm', 'MvvvvvvvVVvm', '.mvvvvvVVvm.', '..mvvvvvvm..', '...mmmmmm...', '.....Mm.....', '.....Mm.....', '.....Mm.....', '....MMmm....', '.....mm.....'],
  { M: '#e6ecf5', m: '#8e98ae', v: '#9a7ad8', V: '#6a4ab8', W: '#ffffff' }];
const TRAP5 = [['..lmmml..', '.lmWmWml.', 'lmW...Wml', 'mW.oOo.Wm', 'm..OOO..m', 'mW.oOo.Wm', 'lmW...Wml', '.lmWmWml.', '..lmmml..'], { O: '#ff8a2a', o: '#ffc070' }];
const VIAL5 = [['.nBb.', '..w..', '.wGw.', 'wWGGw', 'wGGGw', 'wgGgw', '.www.'], { G: '#5ad86a', g: '#1f8a3e', w: '#c9d6e8', W: '#ffffff' }];
const FSWORD5 = [['.lll.', '..K..', '..k..', '..K..', 'lllll', '.WMm.', '.WMm.', '.WMm.', '.WMm.', '.WMm.', '.WMm.', '.WMm.', '.WMm.', '..Mm.', '..M..', '..W..'], { K: '#3a3450', k: '#231e33' }];
// the Necromancer's skeletons and the Huntress's hounds
const SKEL5 = [['...wWWw...', '..wWWWWw..', '..WGWWGW..', '..wWWWWw..', '...WkkW...', '....WW....', '.wWWWWWWw.', '.W.WkkW.W.', '.W.WWWW.W.', '...wWWw...', '...W..W...', '...W..W...', '..ww..ww..'],
  { W: '#f4f4ea', w: '#b8b8a8', k: '#3a3a30', G: '#7dff7a' }];
const WOLF5 = [['...........gG.', '..........gGGg', 'g........gGGRG', 'gG.gggggGGGGGg', '.GGGGGGGGGGGw.', '..GGGGGGGGGg..', '..Gg.gG..gG...', '..G..G....G...', '.gg.gg...gg...'],
  { G: '#9a8f80', g: '#5a5248', R: '#ff3040', w: '#e8e0d0' }];
const SKULL5 = [['..wWWWw..', '.wWWWWWw.', 'wWWWWWWWw', 'WGGWWWGGW', 'WgGWWWgGw', 'wWWWdWWWw', '.wWWWWWw.', '..WwWwW..', '..w.w.w..'], { W: '#f4f4ea', w: '#b8b8a8', G: '#7dff7a', g: '#1f8a3e', d: '#555548' }];

function goldStarPX(n) {   // shurikenPX with wider blades (reads at 9 px) in gold
  const p = new PX(n, n), c = n / 2, R = n / 2 - 0.2, at = (a, r) => [c + Math.cos(a) * r, c + Math.sin(a) * r];
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 - Math.PI / 2;
    p.poly([at(a, R), at(a + 1.3, R * 0.55), at(a - 0.6, R * 0.4)], '#fff2a8');
    p.poly([at(a, R), at(a + 1.3, R * 0.55), at(a + 0.3, R * 0.45)], '#d49a1c');
  }
  p.disc(c, c, R * 0.4, '#ff9a2a'); p.disc(c - R * 0.12, c - R * 0.12, R * 0.15, '#fff6d0'); p.disc(c, c, R * 0.14, '#5c3a08');
  return p;
}
function sealPX() {
  const p = new PX(15, 15), c = 7.5;
  p.ring(c, c, 6.2, 7.4, '#e6b93a'); p.ring(c, c, 4.1, 4.7, '#b4861c');
  p.rect(7, 1, 1, 13, '#e6b93a'); p.rect(1, 7, 13, 1, '#e6b93a');
  for (let k = 0; k < 8; k++) { const a = (k + 0.5) * TAU / 8; p.set(c + Math.cos(a) * 5.5 - 0.5, c + Math.sin(a) * 5.5 - 0.5, '#fff2a8'); }
  p.disc(c, c, 1.6, '#fff2a8');
  return p;
}
function soulGemPX() {
  const p = new PX(11, 11), c = 5.5;
  p.poly([[2, 5], [3, 1], [4.5, 3.5], [5.5, 0], [6.5, 3.5], [8, 1], [9, 5]], '#ff8a1a');
  p.disc(c, 6.5, 4.3, '#ff8a1a'); p.disc(c, 6.5, 3.3, '#ffd23f'); p.disc(c - 0.4, 6.1, 1.9, '#fff6d0'); p.disc(c - 0.6, 5.9, 0.9, '#ffffff');
  return p;
}

// ---------- build ----------
const SPR5 = {};
function pxList5(cv) {
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, out = [];
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    const i = (y * cv.width + x) * 4;
    if (d[i + 3]) out.push([x, y, '#' + ((1 << 24) | (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).slice(1)]);
  }
  return out;
}
function weapon5(rows, pal, grip) {
  const p = gridPX(rows, Object.assign({}, PAL5, pal));
  let ty = 0; while (![...rows[ty]].some(ch => ch !== '.')) ty++;
  const xs = [...rows[ty]].map((ch, x) => ch !== '.' ? x : -1).filter(x => x >= 0);
  return { cv: p.canvas(OUT5), pivot: [grip[0] + 1, grip[1] + 1], tip: [xs.reduce((a, b) => a + b, 0) / xs.length + 1.5, ty + 1.5] };
}
function buildSprites5() {
  const pal = x => Object.assign({}, PAL5, x), grid5 = ([rows, p], out = OUT5) => gridPX(rows, pal(p)).canvas(out);
  SPR5.form = {}; SPR5.icon = {};
  for (const id of FORM5_IDS) {
    const [rows, acc] = BODY5[id], body = grid5(BODY5[id]), w = weapon5(...WPN5[id]), lh = [];
    rows.forEach((r, y) => { if (y > 8) for (let x = 0; x < 6; x++) if ('Ss'.includes(r[x])) lh.push([x + 1.5, y + 1.5]); });   // left-hand texels, canvas px
    const lhand = [0, 1].map(k => lh.reduce((a, p) => a + p[k], 0) / lh.length);
    SPR5.form[id] = { body, px: pxList5(body), hand: [14.5, 11.5], lhand, weapon: w.cv, pivot: w.pivot, tip: w.tip };
    SPR5.icon[id] = grid5([ICON5[id], acc]);
  }
  SPR5.fist = grid5([['SSs', 'SSs', 'sss']], null);   // optional overlay: draw after the weapon, centred on form.hand, so the fist grips it
  SPR5.form.knight.shield = grid5(SHIELD5);
  SPR5.form.knight.shieldPivot = [6.5, 8];
  SPR5.b = {};
  for (const k in BUL5) SPR5.b[k] = grid5(BUL5[k], BUL5[k][2]);
  SPR5.b.nova = orbPX('#ffc21a', '#fff2a8').canvas('#3a2206');
  SPR5.b.shur = goldStarPX(9).canvas('#3a2206');
  SPR5.b.frost = orbPX('#5fd8f5', '#e8fdff', 3.8).canvas('#062a3a');
  SPR5.b.trapShot = orbPX('#ff7a1a', '#ffd08a').canvas('#3a1606');
  SPR5.grave = GRAVE5.map(g => grid5(g));
  SPR5.mirror = grid5(MIRROR5);
  SPR5.seal = sealPX().canvas(null);
  SPR5.trap = grid5(TRAP5);
  SPR5.vial = grid5(VIAL5);
  SPR5.fsword = grid5(FSWORD5);
  SPR5.bomb = goldStarPX(13).canvas('#3a2206');
  SPR5.skullLob = grid5(SKULL5, '#141410');
  SPR5.soulGem = soulGemPX().canvas('#3a1606');
  SPR5.skel = grid5(SKEL5, '#141410'); SPR5.wolf = grid5(WOLF5, '#1a1410');
}
