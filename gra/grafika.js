/* grafika.js — cała grafika gry generowana z kodu: tekstury bloków, sprite'y postaci, przedmioty i tła.
   Styl: 2D, 8-bit, kolory Minecrafta. Żadnych plików png/jpg. */
(() => {
'use strict';

const T = 16;

function szum(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const zTab = (t, n) => t[Math.min(t.length - 1, (n * t.length) | 0)];

function plotno(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/* sprite z tablicy wierszy + palety; '.' = przezroczysty */
function sprite(wiersze, pal) {
  const w = Math.max(...wiersze.map(r => r.length)), h = wiersze.length;
  const c = plotno(w, h), g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < wiersze[y].length; x++) {
    const k = pal[wiersze[y][x]]; if (!k) continue;
    g.fillStyle = k; g.fillRect(x, y, 1, 1);
  }
  return c;
}
function odbij(c) {
  const o = plotno(c.width, c.height), g = o.getContext('2d');
  g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o;
}
function przemaluj(c, kolor) {                                 // biała "błyskająca" wersja sprite'a
  const o = plotno(c.width, c.height), g = o.getContext('2d');
  g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = kolor; g.fillRect(0, 0, c.width, c.height); return o;
}

/* ------------------------------------------------------------------ tekstury bloków */
const PAL = {
  dirt:   ['#79553A', '#866043', '#6B4A31', '#7E5A3D', '#5B3D26', '#8F6B4B', '#79553A', '#74513A'],
  trawa:  ['#7CBD52', '#6FB048', '#5EA13D', '#7CBD52', '#68AA43', '#8AC95C'],
  kamien: ['#7F7F7F', '#767676', '#8A8A8A', '#6E6E6E', '#858585', '#7A7A7A', '#909090', '#666666'],
  bruk:   ['#7A7A7A', '#8C8C8C', '#6D6D6D', '#969696', '#808080'],
  deski:  ['#B08F4F', '#A6844A', '#BC9A56', '#9E7C43', '#B3924F'],
  cDeski: ['#4A3220', '#3F2A1A', '#553A25', '#45301E'],
  pien:   ['#6B5330', '#5A4429', '#7A6038', '#4F3B22', '#6B5330'],
  liscie: ['#3E8A2E', '#347A27', '#48993A', '#2D6B22', '#3E8A2E', '#55A845'],
  bedrock:['#575757', '#454545', '#6E6E6E', '#333333', '#7E7E7E', '#4C4C4C', '#2C2C2C', '#626262'],
  obsyd:  ['#0F0B1E', '#130E26', '#1A1230', '#0B0818', '#160F2B', '#1F1638'],
  glow:   ['#F2D77A', '#E8C05A', '#D9A94A', '#FFE9A0', '#F7DF8A', '#C99A3E'],
  lawa:   ['#FF8F1A', '#FFC23A', '#E0621A', '#FFE96A', '#FF7A0F', '#FFB030'],
  kaktus: ['#4E8A2E', '#5FA03A', '#3F7524', '#57963A'],
  piasek: ['#DBD3A0', '#D2C892', '#E3DBAC', '#CFC48B'],
  cegly:  ['#7D7D7D', '#858585', '#727272', '#8A8A8A'],
  snieg:  ['#F4F8FF', '#E8EEF8', '#FFFFFF'],
};

function tekstura(rodzaj, w = 0) {
  const c = plotno(T, T), g = c.getContext('2d');
  const put = (x, y, k) => { g.fillStyle = k; g.fillRect(x, y, 1, 1); };
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const n = szum(x, y, w * 31 + 1), m = szum(x, y, w * 17 + 9);
    let k = null;
    switch (rodzaj) {
      case 'trawa': {
        const gr = 3 + (szum(x, 0, w) > .5 ? 1 : 0) + (szum(x, 1, w) > .75 ? 1 : 0);
        k = y < gr ? zTab(PAL.trawa, n) : (y === gr && n > .5 ? '#5E4A2E' : zTab(PAL.dirt, m)); break; }
      case 'trawaSnieg': {
        const gr = 3 + (szum(x, 0, w) > .5 ? 1 : 0);
        k = y < gr ? zTab(PAL.snieg, n) : zTab(PAL.dirt, m); break; }
      case 'dirt': k = zTab(PAL.dirt, n); break;
      case 'kamien': k = zTab(PAL.kamien, n); if (m > .93) k = '#5E5E5E'; break;
      case 'bruk': {
        const fuga = (y % 5 === 4) || ((x + ((y / 5) | 0) * 3) % 6 === 5);
        k = fuga ? (n > .5 ? '#4F4F4F' : '#585858') : zTab(PAL.bruk, szum((x / 3) | 0, (y / 5) | 0, w + 4) * .7 + n * .3); break; }
      case 'deski': {
        const rz = (y / 4) | 0, linia = y % 4 === 3, koniec = (x + rz * 5) % 8 === 7 && !linia;
        k = linia ? '#6B4F2A' : koniec ? '#7A5A30' : zTab(PAL.deski, szum(rz, 0, w) * .6 + n * .4); break; }
      case 'cDeski': {
        const rz = (y / 4) | 0, linia = y % 4 === 3, koniec = (x + rz * 5) % 8 === 7 && !linia;
        k = linia ? '#2A1A0F' : koniec ? '#33231A' : zTab(PAL.cDeski, szum(rz, 0, w) * .6 + n * .4); break; }
      case 'pien': k = zTab(PAL.pien, szum(x, 0, w) * .7 + n * .3); if (n > .9) k = '#3F2E18'; break;
      case 'liscie': k = n > .12 ? zTab(PAL.liscie, m) : null; break;
      case 'bedrock': k = zTab(PAL.bedrock, n); break;
      case 'obsyd': k = zTab(PAL.obsyd, n); if ((x + y * 2) % 11 < 2 && m > .6) k = '#2A1D4C'; break;
      case 'glow': k = zTab(PAL.glow, n * .5 + szum((x / 3) | 0, (y / 3) | 0, w) * .5); break;
      case 'lawa': k = zTab(PAL.lawa, szum((x / 2) | 0, (y / 2) | 0, w) * .6 + n * .4); break;
      case 'kaktus': k = x === 0 || x === 15 ? (y % 4 === 1 ? '#2A4F18' : '#3F7524') : zTab(PAL.kaktus, szum(x, 0, w) * .6 + n * .4); break;
      case 'piasek': k = zTab(PAL.piasek, n); break;
      case 'cegly': {
        const rz = (y / 8) | 0, fuga = y % 8 === 7 || ((x + rz * 8) % 16 === 15);
        k = fuga ? '#5A5A5A' : zTab(PAL.cegly, szum((x / 8) | 0, rz, w) * .6 + n * .4); break; }
      case 'wegiel': k = zTab(PAL.kamien, n); if (szum((x / 2) | 0, (y / 2) | 0, w + 50) > .8) k = n > .5 ? '#1A1A1A' : '#2E2E2E'; break;
      case 'zelazo': k = zTab(PAL.kamien, n); if (szum((x / 2) | 0, (y / 2) | 0, w + 60) > .82) k = n > .5 ? '#D8AF93' : '#B88A6E'; break;
      case 'diament': k = zTab(PAL.kamien, n); if (szum((x / 2) | 0, (y / 2) | 0, w + 70) > .84) k = n > .5 ? '#5DECD9' : '#2FBFB0'; break;
      case 'szmaragdRuda': k = zTab(PAL.kamien, n); if (szum((x / 2) | 0, (y / 2) | 0, w + 80) > .84) k = n > .5 ? '#17DD62' : '#0B9E43'; break;
      case 'drabina': k = (x === 2 || x === 3 || x === 12 || x === 13) ? '#8B5E34' : (y % 4 === 1 && x > 1 && x < 14) ? '#A87A48' : null; break;
      case 'polka': k = y < 8 ? ((y === 7) ? '#6B4F2A' : zTab(PAL.deski, szum(0, 0, w) * .6 + n * .4)) : null; break;
      case 'tor': k = (y === 6 || y === 10) ? '#A0A0A0' : (x % 8 === 2 || x % 8 === 3) && y > 5 && y < 12 ? '#6B4A26' : null; break;
      case 'pochodnia': k = null; break;
      case 'plotek': k = (x === 3 || x === 4 || x === 11 || x === 12) ? '#B08F4F' : ((y === 4 || y === 5 || y === 10 || y === 11) ? '#A6844A' : null); if (k && y < 1) k = null; break;
      case 'bookshelf': k = (y % 8 < 1 || y % 8 > 6) ? '#B08F4F' : zTab(['#8A2E2E', '#2E5C8A', '#4E8A2E', '#D8C25A', '#7A4A9A', '#B08F4F'], szum((x / 2) | 0, (y / 8) | 0, w)); break;
      case 'niewidz': k = null; break;
      case 'okno': k = (x === 0 || x === 15 || y === 0 || y === 15) ? '#B08F4F' : (x === 7 || x === 8 || y === 7 || y === 8) ? '#8A6B3A' : (n > .8 ? '#E9F6FF' : '#BFE3F5'); break;
      case 'tnt': k = y < 3 || y > 12 ? '#D63A2A' : (y > 5 && y < 10) ? (x > 3 && x < 12 ? '#F0F0F0' : '#D63A2A') : '#D63A2A'; if (y > 5 && y < 10 && x > 4 && x < 11 && y > 6 && y < 9 && (x === 5 || x === 7 || x === 9)) k = '#111'; break;
      case 'mech': k = zTab(['#4E8A2E', '#5FA03A', '#3F7524', '#6FAE45'], n); break;
    }
    if (k) put(x, y, k);
  }
  return c;
}

/* pochodnia jako osobny sprite (rysowana na tle) */
const POCHODNIA = sprite([
  '.......',
  '..YY...',
  '..OO...',
  '..oo...',
  '...k...',
  '...ww..',
  '...ww..',
  '...ww..',
  '...ww..',
  '...ww..',
], { Y: '#FFF3A0', O: '#FFDB4A', o: '#FF8C1A', k: '#3C2A1A', w: '#7A5230' });

/* ------------------------------------------------------------------ sprite'y postaci */
const P_GRACZ = { h: '#3A2A1E', s: '#C9A07A', S: '#A87F5A', u: '#2B2018', g: '#4C9A3C', k: '#111111', r: '#6E4B2C', R: '#563A22', t: '#8B6B45', l: '#3E3A34', f: '#26231F', n: '#B08A63' };
const GRACZ_GORA = [
  '..hhhhhhhh..',
  '..hhhhhhhh..',
  '..hsuuuuuu..',
  '..hsssssgk..',
  '..hsssssssn.',
  '..Sssssssnn.',
  '..Ssssssssn.',
  '..SSsssssS..',
  '...rrrrrr...',
  '...Rrrrrr...',
  '..RRRRRRRR..',
  '..RRRRRRRs..',
  '...Rrrrrr...',
  '...Rrrrrr...',
  '...Rrrtrr...',
  '...Rrrrrr...',
  '...Rrrrrr...',
  '...RRRRRR...',
];
const GRACZ_NOGI = {
  stoj: ['...ll..ll...', '...ll..ll...', '...ll..ll...', '...ff..ff...'],
  krok1: ['..ll....ll..', '..ll....ll..', '..ff....ff..', '............'],
  krok2: ['....llll....', '....llll....', '....llll....', '....ffff....'],
  skok: ['..ll....ll..', '..ff....ff..', '............', '............'],
};
const GRACZ = {};
for (const k in GRACZ_NOGI) { const c = sprite([...GRACZ_GORA, ...GRACZ_NOGI[k]], P_GRACZ); GRACZ[k] = [odbij(c), c]; }
const GRACZ_BIALY = przemaluj(GRACZ.stoj[1], '#FFFFFF');

/* Starszy wioski (NPC) — wyższy, z białą brodą */
const NPC = (() => {
  const pal = { ...P_GRACZ, w: '#EDEDED', r: '#5E7A3A', R: '#465C2B', t: '#7C9A50' };
  const c = sprite([
    '..hhhhhhhh..', '..hhhhhhhh..', '..hsuuuuuu..', '..hsssssgk..', '..hsssssssn.', '..Sssssssnn.', '..Swwwwwwwn.', '..SwwwwwwS..', '...wwwwww...',
    '...rrrrrr...', '...Rrrrrr...', '..RRRRRRRR..', '..RRRRRRRs..', '...Rrrrrr...', '...Rrrrrr...', '...Rrrtrr...', '...Rrrrrr...', '...Rrrrrr...',
    '...Rrrrrr...', '...Rrrrrr...', '...Rrrrrr...', '...RRRRRR...', '...ll..ll...', '...ll..ll...', '...ll..ll...', '...ll..ll...', '...ff..ff...',
  ], pal);
  return [odbij(c), c];
})();

const P_ZOMBIE = { h: '#2F5E2B', z: '#4E9A48', Z: '#3B7A36', e: '#1B3A1B', t: '#2E8B7F', T: '#236B62', b: '#3B2F8A', B: '#26205A' };
const ZOMBIE_GORA = [
  '...hhhhhhhh...', '...hhhhhhhh...', '...hzzzzzzz...', '...hzzzzzze...', '...Zzzzzzzz...', '...Zzzzzzzz...', '...ZzzzzzZZ...', '...ZZzzzzzZ...',
  '....Tttt......', '....TtttzzzzzZ', '....TtttzzzzzZ', '....TtttZZZZZZ', '....Tttt......', '....Tttt......', '....Tttt......', '....Tttt......', '....Bbbb......', '....Bbbb......',
];
const ZOMBIE = [['....Bbbb......', '....Bbbb......', '....Bbbb......', '....Bbbb......', '....BBBB......', '....BBBB......'],
                ['..BBBBBbbb....', '..BBBBBbbb....', '..BBBB.Bbbb...', '..BBBB.Bbbb...', '..BBBB.BBBB...', '.......BBBB...']]
  .map(n => { const c = sprite([...ZOMBIE_GORA, ...n], P_ZOMBIE); return [odbij(c), c]; });

const P_CREEPER = { c: '#5DB85D', C: '#3F9C3F', d: '#2E7D2E', D: '#7ACB7A', k: '#111111' };
const CREEPER_GORA = [
  'cCcDcCcc', 'CcDccCDc', 'cDcCcDcC', 'DcCccCcD', 'ckkcckkc', 'ckkcckkc', 'cCckkcCc', 'Dcckkccc', 'cckkkkcC', 'CckkkkcD', 'cckcckcc', 'DckcckcC',
  'cCcDcCcc', 'CcDccCDc', 'cDcCcDcC', 'DcCccCcD',
];
const CREEPER = [['ccc..ccc', 'cCc..CcD', 'Ccc..ccc', 'cDc..cCc', 'ccc..Dcc', 'dDd..dDd'],
                 ['ccc..ccc', 'cCc..CcD', 'Ccc..ccc', 'cDc..cCc', 'dDd..Dcc', '.....dDd']]
  .map(n => sprite([...CREEPER_GORA, ...n], P_CREEPER));
const CREEPER_BIALY = przemaluj(CREEPER[0], '#FFFFFF');

const P_SZKIELET = { b: '#C6C6C6', B: '#8F8F8F', k: '#1A1A1A', w: '#6B4A26', s: '#DDDDDD' };
const SZKIELET_GORA = [
  '..bbbbbb...', '..bbbbbb...', '..bbbbkk...', '..bbbbkk...', '..Bbbbbb...', '..BbbbBB...', '..BBbbbB...', '....bb.....',
  '..bBbBbb.w.', '...BbbBbbsw', '...bBBb..sw', '...BbbB..sw', '...bBBb..sw', '...BbbB..sw', '...bbbb..sw', '...Bbbb..sw',
];
const SZKIELET = [['...b..b..sw', '...b..b..w.', '...b..b....', '...b..b....', '...B..B....', '...b..b....', '...B..B....', '...B..B....'],
                  ['...b..b..sw', '..b....b.w.', '..b....b...', '..b....b...', '..B....B...', '..b....b...', '..B....B...', '..B....B...']]
  .map(n => { const c = sprite([...SZKIELET_GORA, ...n], P_SZKIELET); return [odbij(c), c]; });

const SLIME = sprite([
  '.ssssssssss.', 'sSSSSSSSSSSs', 'sSddddddddSs', 'sSdkkddkkdSs', 'sSdkkddkkdSs', 'sSddddddddSs', 'sSdddkkdddSs', 'sSddddddddSs', 'sSSSSSSSSSSs', '.ssssssssss.',
], { s: '#6FCF5A', S: '#52B040', d: '#3F8F33', k: '#111111' });

const P_PILLAGER = { h: '#2B2B2B', s: '#9AA0A0', S: '#7E8484', u: '#1E1E1E', e: '#3F7F3F', k: '#111111', n: '#8A9090', r: '#2F353A', R: '#20252A', t: '#4D5359', l: '#33362C', f: '#222222', w: '#6B4A26', i: '#B0B0B0' };
const PILLAGER_GORA = [
  '..hhhhhhhh..', '..hhhhhhhh..', '..hsuuuuuu..', '..hsssssek..', '..hsssssssn.', '..Sssssssnn.', '..Ssssssssn.', '..SSssssssn.',
  '...rrrrrr...', '...Rrrtrr...', '..RRRRRrrrwi', '..RRRRRRswww', '...Rrrtrr.i.', '...Rrrtrr...', '...Rrrrrr...', '...Rrrrrr...', '...Rrrrrr...', '...RRRRRR...',
];
const PILLAGER = [['...ll..ll...', '...ll..ll...', '...ll..ll...', '...ll..ll...', '...ff..ff...', '...ff..ff...'],
                  ['..ll....ll..', '..ll....ll..', '..ll....ll..', '..ff....ff..', '..ff....ff..', '............']]
  .map(n => { const c = sprite([...PILLAGER_GORA, ...n], P_PILLAGER); return [odbij(c), c]; });

const SZTANDAR = sprite(['pcccc.', 'pcdccc', 'pccdcc', 'pcdddc', 'pccdcc', 'pcdccc', 'pcccc.', 'pcccc.', 'pccdc.', 'pccc..', 'p.....', 'p.....', 'p.....', 'p.....'], { p: '#5C3A1E', c: '#D8D8D8', d: '#3A3A3A' });
const BOSS = PILLAGER.map(([l, r]) => {
  const zrob = (p, dir) => {
    const c = plotno(18, 24), g = c.getContext('2d');
    if (dir > 0) { g.drawImage(SZTANDAR, 0, 0); g.drawImage(p, 5, 0); } else { g.drawImage(odbij(SZTANDAR), 12, 0); g.drawImage(p, 1, 0); }
    return c;
  };
  return [zrob(l, -1), zrob(r, 1)];
});
const BOSS_BIALY = BOSS[0].map(c => przemaluj(c, '#FFFFFF'));

const KURCZAK = [
  ['.......ww.', '.......wk.', '.......wwy', '.......wr.', '..wwwwwww.', '.wwwwwwww.', '.wWWWwwww.', '.WWWWWWWW.', '..WWWWWW..', '...l..l...'],
  ['.......ww.', '.......wk.', '.......wwy', '.......wr.', '..wwwwwww.', '.wWWWWwww.', '.wwwwwwww.', '.WWWWWWWW.', '..WWWWWW..', '...l..l...'],
].map(r => sprite(r, { w: '#F4F4F4', W: '#D0D0D0', r: '#D83A2A', y: '#F2C23A', k: '#111111', l: '#F2C23A' }));

/* ------------------------------------------------------------------ przedmioty */
const SZMARAGD_BAZA = sprite(['...GG...', '..gGGG..', '.gGGGhg.', '.gGGGGg.', '.gGGGGg.', '..gGGg..', '...gg...'], { g: '#0B9E43', G: '#17DD62', h: '#B4FFD0' });
const SZMARAGD = [8, 6, 3, 1, 3, 6].map(w => {                         // "obrót" — zwężanie klatek
  const c = plotno(8, 7), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(SZMARAGD_BAZA, (8 - w) >> 1, 0, w, 7); return c;
});
const JABLKO = sprite(['....s...', '...ss.L.', '..GGGGG.', '.GhGGGGD', '.GGGGGGD', '.GGGGGGD', '..GGGGD.', '...GGG..'], { s: '#5C3A1E', L: '#4E8A2E', G: '#F2C23A', h: '#FFF3B0', D: '#C99A1E' });
const TOTEM = sprite(['..gggg..', '..gkkg..', '..gggg..', 'gGGGGGGg', 'g.GGGG.g', '..GGGG..', '..GGGG..', '..G..G..'], { g: '#E2C04A', k: '#2A2A2A', G: '#52A84B' });
const DZWON = sprite([
  'pppppppppppp', '.....pp.....', '....gggg....', '...ghgggg...', '...ghgggg...', '...ghgggg...', '...gggggG...', '..gggggggG..', '.gggggggggG.', 'gggggggggggG', '....dddd....',
], { p: '#4A3220', g: '#E8B42A', G: '#B8861A', h: '#FFE88A', d: '#333333' });
const OGNISKO = [
  ['.......Y........', '......YO........', '.....YOO.Y......', '.....OOoYO......', '....oOooOo......', '....ooooo.......', 'ww..wwwwww..ww..', '.wwwwwwwwwwww...', '..wwwwwwwwww....', 'wwwwwwwwwwwwwwww'],
  ['........Y.......', '.......YOY......', '......YOOO......', '.....OOooO......', '....YoOooo......', '.....ooooo......', 'ww..wwwwww..ww..', '.wwwwwwwwwwww...', '..wwwwwwwwww....', 'wwwwwwwwwwwwwwww'],
].map(r => sprite(r, { Y: '#FFF3A0', O: '#FFDB4A', o: '#FF8C1A', w: '#6B4A26' }));
const OGNISKO_ZGASZONE = sprite(['ww..wwwwww..ww..', '.wwwwwwwwwwww...', '..wwwwwwwwww....', 'wwwwwwwwwwwwwwww'], { w: '#6B4A26' });
const STRZALA = (() => { const c = sprite(['.w.sssk.', 'wwsssssk', '.w.sssk.'], { w: '#EDEDED', s: '#8B5E34', k: '#9A9A9A' }); return [odbij(c), c]; })();
const SERCE = [sprite(['.kk.kk.', 'krrkrrk', 'krhrrrk', '.krrrk.', '..krk..', '...k...'], { k: '#2A0A0A', r: '#E03131', h: '#FF8A8A' }),
               sprite(['.kk.kk.', 'krrkrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...'], { k: '#2A0A0A', r: '#3A3A3A' })];
const PORTRET = sprite(['hhhhhhhh', 'hhhhhhhh', 'hsuuuuuu', 'hsssssgk', 'hsssssss', 'Sssssssn', 'Ssssssss', 'SSsssssS'], P_GRACZ);
const IKONA_SZMARAGD = SZMARAGD[0];
const PLATFORMA = (() => {                                             // ruchoma platforma z desek 32x8
  const c = plotno(32, 8), g = c.getContext('2d');
  const d = tekstura('deski', 3);
  g.drawImage(d, 0, 0, 16, 8, 0, 0, 16, 8); g.drawImage(d, 0, 0, 16, 8, 16, 0, 16, 8);
  g.fillStyle = '#5A5A5A'; g.fillRect(0, 7, 32, 1); g.fillRect(0, 0, 32, 1);
  return c;
})();
const KOLCE = sprite(['...k....k....k..', '..kkk..kkk..kkk.', '.kkkkkkkkkkkkkkk'], { k: '#B0B0B0' });

/* ------------------------------------------------------------------ definicje kafli */
const KAFLE = {
  ' ': { nazwa: 'powietrze' },
  '#': { tex: 'kamien', staly: true },
  'G': { tex: 'trawa', staly: true },
  'D': { tex: 'dirt', staly: true },
  'C': { tex: 'bruk', staly: true },
  'P': { tex: 'deski', staly: true },
  'N': { tex: 'cDeski', staly: true },
  'L': { tex: 'pien', staly: true },
  'l': { tex: 'liscie', staly: true },
  'B': { tex: 'cegly', staly: true },
  'O': { tex: 'obsyd', staly: true },
  'Q': { tex: 'wegiel', staly: true },
  'I': { tex: 'zelazo', staly: true },
  'Y': { tex: 'diament', staly: true },
  'E': { tex: 'szmaragdRuda', staly: true },
  'i': { tex: 'glow', staly: true, swiatlo: 34 },
  'W': { tex: 'bedrock', staly: true },
  'S': { tex: 'piasek', staly: true },
  'K': { tex: 'kaktus', staly: true, rani: true },
  'V': { tex: 'lawa', lawa: true, swiatlo: 26 },
  'H': { tex: 'drabina', drabina: true },
  '_': { tex: 'polka', polka: true },
  '=': { tex: 'tor' },
  '*': { pochodnia: true, swiatlo: 40 },
  'X': { tex: 'niewidz', staly: true, niewidz: true },
  'F': { tex: 'plotek', staly: true },
  'R': { tex: 'bookshelf', staly: true },
  'w': { tex: 'okno', staly: true },
  'T': { tex: 'tnt', staly: true },
  'M': { tex: 'mech', staly: true },
  'U': { tex: 'trawaSnieg', staly: true },
  '^': { kolce: true, rani: true },
};
const TEX = {};
for (const k in KAFLE) { const t = KAFLE[k].tex; if (t && !TEX[t]) TEX[t] = [0, 1, 2].map(w => tekstura(t, w)); }
TEX.lawa2 = [0, 1, 2].map(w => tekstura('lawa', w + 7));

/* ------------------------------------------------------------------ tła (parallax) */
const NIEBO = {
  wioska: ['#5C94F0', '#8FBEFF', '#C8E2FF'],
  las: ['#2F3B73', '#B0668A', '#F2B27A'],
  jaskinia: ['#101014', '#16161C', '#1C1C24'],
  kopalnia: ['#14110E', '#1E1913', '#2A2118'],
  posterunek: ['#070A1C', '#141C3E', '#2A3560'],
};
function gradient(g, kolory, W, H) {
  const pasy = 12;
  for (let i = 0; i < pasy; i++) {
    const t = i / (pasy - 1), a = kolory[t < .5 ? 0 : 1], b = kolory[t < .5 ? 1 : 2], u = (t < .5 ? t : t - .5) * 2;
    const A = a.match(/\w\w/g).map(h => parseInt(h, 16)), B = b.match(/\w\w/g).map(h => parseInt(h, 16));
    g.fillStyle = `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * u)).join(',')})`;
    g.fillRect(0, Math.floor(i * H / pasy), W, Math.ceil(H / pasy) + 1);
  }
}
function chmury(g, W, H, cam, t, kolor = '#FFFFFF', cien = '#D9E1EC') {
  for (let i = 0; i < 7; i++) {
    const szer = 24 + (szum(i, 1) * 40 | 0), x = ((szum(i, 2) * 900 + t * (4 + i % 3 * 2) - cam * .15) % (W + 140)) - 70;
    const y = 8 + szum(i, 3) * (H * .35);
    g.fillStyle = kolor; g.fillRect(x | 0, y | 0, szer, 5); g.fillRect((x + 6) | 0, (y - 3) | 0, szer - 14, 3);
    g.fillStyle = cien; g.fillRect(x | 0, (y + 4) | 0, szer, 1);
  }
}
function wzgorza(g, W, H, cam, poziomY, kolor, k2, ampl, okres, wsp, seed) {
  g.fillStyle = kolor;
  for (let x = 0; x < W; x += 2) {
    const wx = x + cam * wsp;
    const h = ampl * (.55 + .45 * Math.sin(wx / okres + seed)) * (.7 + .3 * Math.sin(wx / (okres * .37) + seed * 3));
    g.fillRect(x, (poziomY - h) | 0, 2, H);
  }
  g.fillStyle = k2;
  for (let x = 0; x < W; x += 2) {
    const wx = x + cam * wsp;
    const h = ampl * (.55 + .45 * Math.sin(wx / okres + seed)) * (.7 + .3 * Math.sin(wx / (okres * .37) + seed * 3));
    g.fillRect(x, (poziomY - h) | 0, 2, 2);
  }
}
function domki(g, W, H, cam, poziomY, wsp) {
  for (let i = 0; i < 8; i++) {
    const x = ((szum(i, 7) * 1600 - cam * wsp) % (W + 200)) - 100, w = 28 + (szum(i, 8) * 20 | 0), h = 18 + (szum(i, 9) * 10 | 0);
    const y = poziomY - h;
    g.fillStyle = '#6E6E6E'; g.fillRect(x | 0, y + h - 6, w, 6);
    g.fillStyle = '#9E7C43'; g.fillRect(x | 0, y, w, h - 6);
    g.fillStyle = '#4A3220';
    for (let s = 0; s < 6; s++) g.fillRect((x + s * 2) | 0, y - 10 + s * 2 - 1, w - s * 4, 2);
    g.fillStyle = '#E9F6FF'; g.fillRect((x + 6) | 0, y + 5, 5, 5); g.fillRect((x + w - 11) | 0, y + 5, 5, 5);
  }
}
function drzewa(g, W, H, cam, poziomY, wsp, pien, liscie, skala, seed) {
  for (let i = 0; i < 12; i++) {
    const x = ((szum(i, seed) * 1800 - cam * wsp) % (W + 160)) - 80, h = (30 + szum(i, seed + 1) * 30) * skala;
    g.fillStyle = pien; g.fillRect(x | 0, (poziomY - h) | 0, 4 * skala | 0, h | 0);
    g.fillStyle = liscie;
    const r = 12 * skala;
    g.fillRect((x - r + 2) | 0, (poziomY - h - r) | 0, (2 * r) | 0, (r * 1.6) | 0);
    g.fillRect((x - r * .6 + 2) | 0, (poziomY - h - r * 1.6) | 0, (r * 1.2) | 0, (r * .7) | 0);
  }
}
function gwiazdy(g, W, H, t) {
  for (let i = 0; i < 60; i++) {
    const x = szum(i, 20) * W, y = szum(i, 21) * H * .7, mig = Math.sin(t * 2 + i) > .6 ? 2 : 1;
    g.fillStyle = szum(i, 22) > .5 ? '#FFFFFF' : '#C9D4FF'; g.fillRect(x | 0, y | 0, mig, mig);
  }
}
function ksiezyc(g, x, y) {
  g.fillStyle = '#E8E8F0'; g.fillRect(x, y, 14, 14);
  g.fillStyle = '#C9C9D8'; g.fillRect(x + 3, y + 3, 4, 4); g.fillRect(x + 9, y + 8, 3, 3); g.fillRect(x + 2, y + 10, 2, 2);
}
function wieza(g, W, H, cam, poziomY, wsp) {
  const x = 200 - cam * wsp;
  g.fillStyle = '#2B1E12'; g.fillRect(x | 0, poziomY - 90, 30, 90);
  g.fillStyle = '#3A2A1A'; g.fillRect((x - 4) | 0, poziomY - 96, 38, 8);
  g.fillStyle = '#17110A'; for (let i = 0; i < 4; i++) g.fillRect((x + 6) | 0, poziomY - 80 + i * 20, 5, 7), g.fillRect((x + 19) | 0, poziomY - 80 + i * 20, 5, 7);
  g.fillStyle = '#D8D8D8'; g.fillRect((x + 12) | 0, poziomY - 112, 6, 12); g.fillStyle = '#3A3A3A'; g.fillRect((x + 14) | 0, poziomY - 109, 2, 6);
}

function rysujTlo(g, motyw, W, H, camX, camY, t, ziemiaEkran) {
  gradient(g, NIEBO[motyw] || NIEBO.wioska, W, H);
  const ziemiaY = (ziemiaEkran === undefined ? H - 20 : ziemiaEkran) + 4;
  switch (motyw) {
    case 'wioska':
      g.fillStyle = '#FFE977'; g.fillRect(W - 60, 14, 14, 14); g.fillStyle = '#FFFBD5'; g.fillRect(W - 57, 17, 8, 8);
      chmury(g, W, H, camX, t);
      wzgorza(g, W, H, camX, ziemiaY, '#5F9E48', '#79B85A', 46, 60, .25, 1);
      wzgorza(g, W, H, camX, ziemiaY, '#4E8A3A', '#62A04A', 30, 40, .45, 2);
      domki(g, W, H, camX, ziemiaY, .6);
      break;
    case 'las':
      g.fillStyle = '#FFD27A'; g.fillRect(40, 30, 16, 16); g.fillStyle = '#FFF1C2'; g.fillRect(43, 33, 10, 10);
      chmury(g, W, H, camX, t, '#F8C9A0', '#D89A78');
      wzgorza(g, W, H, camX, ziemiaY, '#2E4A3A', '#3A5A46', 40, 70, .2, 4);
      drzewa(g, W, H, camX, ziemiaY, .35, '#1E2C1E', '#233A28', 1, 30);
      drzewa(g, W, H, camX, ziemiaY, .6, '#2E2216', '#2F5A33', 1.4, 40);
      break;
    case 'jaskinia':
    case 'kopalnia': {
      const k = motyw === 'jaskinia' ? ['#2A2A2E', '#242428'] : ['#2E261E', '#27201A'];
      for (let y = -((camY * .5) % 16) - 16; y < H + 16; y += 16) for (let x = -((camX * .5) % 16) - 16; x < W + 16; x += 16) {
        const cx = Math.round((x + camX * .5) / 16), cy = Math.round((y + camY * .5) / 16), n = szum(cx, cy, 90);
        g.fillStyle = n > .5 ? k[0] : k[1]; g.fillRect(x | 0, y | 0, 16, 16);
        if (n > .93) { g.fillStyle = motyw === 'jaskinia' ? '#3B3B44' : '#3A2F24'; g.fillRect((x + 4) | 0, (y + 4) | 0, 6, 6); }
        if (n < .04) { g.fillStyle = motyw === 'jaskinia' ? '#5DECD9' : '#D8AF93'; g.fillRect((x + 6) | 0, (y + 7) | 0, 2, 2); }
      }
      if (motyw === 'kopalnia') {                                       // belki stropowe
        g.fillStyle = '#4A3220';
        for (let x = -((camX * .7) % 96); x < W; x += 96) { g.fillRect(x | 0, 0, 6, H); g.fillRect(x | 0, (30 - camY * .7) | 0, 96, 5); }
      }
      break; }
    case 'posterunek':
      gwiazdy(g, W, H, t);
      ksiezyc(g, W - 56, 18);
      wzgorza(g, W, H, camX, ziemiaY, '#0E1428', '#161E38', 44, 64, .2, 6);
      wieza(g, W, H, camX, ziemiaY, .35);
      drzewa(g, W, H, camX, ziemiaY, .5, '#0A0D18', '#0E1622', 1.2, 50);
      break;
  }
}

window.Grafika = {
  T, TEX, KAFLE, POCHODNIA, GRACZ, GRACZ_BIALY, NPC, ZOMBIE, CREEPER, CREEPER_BIALY, SZKIELET, SLIME, PILLAGER, BOSS, BOSS_BIALY, KURCZAK,
  SZMARAGD, JABLKO, TOTEM, DZWON, OGNISKO, OGNISKO_ZGASZONE, STRZALA, SERCE, PORTRET, IKONA_SZMARAGD, PLATFORMA, KOLCE,
  rysujTlo, przemaluj, odbij, sprite, plotno, szum, tekstura,
};
})();
