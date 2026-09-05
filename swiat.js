/* swiat.js — świat 2D w stylu Minecraft (8-bit) dla strony "opis postaci steve".
   Każda grafika (bloki, Steve, kilof, chmury, cząstki) jest rysowana z kodu — bez plików jpg/png.
   Jednostki: 1 blok = 16 pikseli tekstury (T). Steve ma 32 piksele = 2 bloki wysokości. */
(() => {
'use strict';

const T = 16;                       // pikseli tekstury na 1 blok
const WYS_ZIEMI = 2;                // ziemia (stopka) ma 2 bloki: trawa+dirt albo bedrock
const OPOZ_WIERSZA = 0.025;         // s — opóźnienie kaskady między wierszami kolumny
const CZAS_PEKANIA = 0.22;          // s — ile trwa pękanie bloku
const CZAS_POP = 0.18;              // s — ile trwa "wyskoczenie" stawianego bloku
const OGRANICZ_RUCH = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ narzędzia */
function szum(x, y, s = 0) {        // deterministyczny szum 0..1 (żeby tekstury były stabilne)
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const zTab = (t, n) => t[Math.min(t.length - 1, (n * t.length) | 0)];
const los = (a, b) => a + Math.random() * (b - a);
const klamra = (v, a, b) => v < a ? a : v > b ? b : v;
const wygladz = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const hex = k => [parseInt(k.slice(1, 3), 16), parseInt(k.slice(3, 5), 16), parseInt(k.slice(5, 7), 16)];
function mieszaj(a, b, t) {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

/* ------------------------------------------------------------------ palety Minecraft */
const PAL = {
  dirt:    ['#79553A', '#866043', '#6B4A31', '#7E5A3D', '#5B3D26', '#8F6B4B', '#79553A', '#74513A'],
  trawa:   ['#7CBD52', '#6FB048', '#5EA13D', '#7CBD52', '#68AA43', '#8AC95C'],
  bedrock: ['#575757', '#454545', '#6E6E6E', '#333333', '#7E7E7E', '#4C4C4C', '#2C2C2C', '#626262'],
  obsyd:   ['#0F0B1E', '#130E26', '#1A1230', '#0B0818', '#160F2B', '#0F0B1E', '#1F1638', '#120D22'],
};

/* tekstura bloku 16x16 generowana piksel po pikselu */
function tekstura(rodzaj, w) {
  const c = document.createElement('canvas'); c.width = c.height = T;
  const g = c.getContext('2d');
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const n = szum(x, y, w * 31 + 1), m = szum(x, y, w * 17 + 9);
    let k;
    if (rodzaj === 'trawa') {
      const gr = 3 + (szum(x, 0, w) > .5 ? 1 : 0) + (szum(x, 1, w) > .75 ? 1 : 0); // postrzępiona krawędź trawy
      k = y < gr ? zTab(PAL.trawa, n) : (y === gr && n > .5 ? '#5E4A2E' : zTab(PAL.dirt, m));
    } else if (rodzaj === 'dirt') k = zTab(PAL.dirt, n);
    else if (rodzaj === 'bedrock') k = zTab(PAL.bedrock, n);
    else {
      k = zTab(PAL.obsyd, n);
      if ((x + y * 2) % 11 < 2 && m > .6) k = m > .85 ? '#3A2A66' : '#2A1D4C'; // ukośne fioletowe smugi
      if (n > .985) k = '#4A3A80';
    }
    g.fillStyle = k; g.fillRect(x, y, 1, 1);
  }
  return c;
}
const TEX = {};
for (const r of ['trawa', 'dirt', 'bedrock', 'obsyd']) TEX[r] = [0, 1, 2, 3].map(w => tekstura(r, w));

/* 10 stadiów pękania bloku (jak destroy_stage_0..9 w Minecraft) — pęknięcia rosną od środka */
const PEK = (() => {
  const sciezki = [];
  for (let i = 0; i < 8; i++) {
    const kat = (i / 8) * Math.PI * 2 + szum(i, 5, 1) * .8;
    let x = 7.5 + szum(i, 6, 1) * 2 - 1, y = 7.5 + szum(i, 7, 1) * 2 - 1;
    const p = [];
    for (let k = 0; k < 13; k++) {
      p.push([x | 0, y | 0]);
      x += Math.cos(kat) * .85 + (szum(i, k, 2) - .5) * 1.3;
      y += Math.sin(kat) * .85 + (szum(i, k, 3) - .5) * 1.3;
    }
    sciezki.push(p);
  }
  return Array.from({ length: 10 }, (_, s) => {
    const c = document.createElement('canvas'); c.width = c.height = T;
    const g = c.getContext('2d'); g.fillStyle = 'rgba(0,0,0,.72)';
    sciezki.slice(0, 2 + Math.ceil(s * .7)).forEach(p => p.slice(0, 3 + s).forEach(([x, y]) => {
      if (x >= 0 && y >= 0 && x < T && y < T) g.fillRect(x, y, 1, 1);
    }));
    return c;
  });
})();

/* mini blok obsydianu trzymany w ręce */
const MINI_OBSYD = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 6;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(TEX.obsyd[0], 0, 0, 6, 6);
  g.fillStyle = '#3A2A66'; g.fillRect(1, 1, 1, 1); g.fillRect(4, 3, 1, 1);
  return c;
})();

/* ------------------------------------------------------------------ sprite Steve'a (widok z boku, 2D) */
const K = {
  h: '#3B2314', H: '#2A1809',            // włosy
  s: '#B7896A', S: '#98704F',            // skóra + cień
  e: '#FFFFFF', p: '#4B39C8',            // oko: białko + fioletowo-niebieska tęczówka
  m: '#6E4A2A',                          // usta / zarost
  t: '#00A6A6', T: '#008383',            // koszulka
  b: '#3F32A8', B: '#2B2276',            // spodnie
  g: '#6E6E6E', G: '#474747',            // buty
};
const GLOWA = [                          // 8x8
  'hhhhhhhh',
  'hhhhhhhh',
  'hHhhhhhh',
  'Hsssssss',
  'Hsssssep',
  'hssssssS',
  'ssssssmm',
  'sssssssm',
];
const TULOW = [                          // 4x12: koszulka + pas spodni
  'Tttt', 'Tttt', 'Tttt', 'Tttt', 'Tttt', 'Tttt', 'Tttt', 'Tttt',
  'Bbbb', 'Bbbb', 'Bbbb', 'Bbbb',
];
const NOGA = ['Bbbb', 'Bbbb', 'Bbbb', 'Bbbb', 'Bbbb', 'Bbbb', 'Bbbb', 'Bbbb', 'Bbbb', 'Gggg', 'Gggg', 'Gggg'];
const NOGA_CIEN = NOGA.map(w => w.replace(/b/g, 'B').replace(/g/g, 'G'));

function rysujSprite(g, tab, x, y) {
  for (let r = 0; r < tab.length; r++) for (let c = 0; c < tab[r].length; c++) {
    const k = K[tab[r][c]]; if (!k) continue;
    g.fillStyle = k; g.fillRect(x + c, y + r, 1, 1);
  }
}

/* "belka" — obrócony prostokąt pikseli (ramię, trzonek). kat: 0 = w dół, +90° = do przodu (w prawo) */
function belka(g, x0, y0, kat, dl, gr, kol, cien) {
  const dx = Math.sin(kat), dy = Math.cos(kat), nx = dy, ny = -dx;
  for (let k = 0; k < gr; k += .5) {
    g.fillStyle = k < 1 ? cien : kol;
    const ko = k - gr / 2 + .5;
    for (let t = .5; t < dl; t += .5)
      g.fillRect(Math.floor(x0 + dx * t + nx * ko), Math.floor(y0 + dy * t + ny * ko), 1, 1);
  }
}

/* diamentowy kilof: trzonek wzdłuż ramienia, głowica prostopadle na końcu */
function rysujKilof(g, hx, hy, kat) {
  belka(g, hx, hy, kat, 9, 2, '#8B5E34', '#5C3A1E');
  const tx = hx + Math.sin(kat) * 9, ty = hy + Math.cos(kat) * 9;
  const pk = kat + Math.PI / 2;                     // kierunek prostopadły
  belka(g, tx - Math.sin(pk) * 5, ty - Math.cos(pk) * 5, pk, 10, 3, '#5DECD9', '#25B3A4');
  // lekko zagięte końce głowicy
  for (const s of [-1, 1]) {
    const ex = tx + Math.sin(pk) * 5.5 * s - Math.sin(kat) * 1.2, ey = ty + Math.cos(pk) * 5.5 * s - Math.cos(kat) * 1.2;
    g.fillStyle = '#C9FFF9'; g.fillRect(Math.floor(ex), Math.floor(ey), 1, 1);
  }
}

const RAD = Math.PI / 180;
function katKilofa(u) {                 // u = 0..1 (jeden zamach): szybkie uderzenie, wolniejszy powrót
  const a = u < .38 ? 190 - 135 * Math.pow(u / .38, 2) : 55 + 135 * wygladz((u - .38) / .62);
  return a * RAD;
}
const katStawiania = u => (78 + 26 * Math.sin(Math.PI * u)) * RAD;

/* Steve: sx = lewa krawędź ciała (12 px szer.), sy = poziom stóp, dir = 1 w prawo / -1 w lewo */
function rysujSteve(g, sx, sy, dir, faza, tryb, u) {
  g.save();
  if (dir < 0) { g.translate(Math.round(sx) * 2 + 12, 0); g.scale(-1, 1); }
  sx = Math.round(sx);
  const krok = Math.sin(faza), nogaDx = Math.round(krok * 3);
  const bob = Math.abs(krok) > .7 ? -1 : 0;
  const y0 = sy - 32 + bob;
  belka(g, sx + 6, y0 + 9, -krok * .55, 12, 4, K.S, '#7F5A3E');          // tylne ramię
  rysujSprite(g, NOGA_CIEN, sx + 4 - nogaDx, y0 + 20);                     // tylna noga
  rysujSprite(g, TULOW, sx + 4, y0 + 8);
  rysujSprite(g, NOGA, sx + 4 + nogaDx, y0 + 20 - (Math.abs(nogaDx) >= 2 ? 1 : 0)); // przednia noga
  rysujSprite(g, GLOWA, sx + 2, y0);
  const kat = tryb === 'kop' ? katKilofa(u) : katStawiania(u);
  belka(g, sx + 6, y0 + 9, kat, 12, 4, K.s, K.S);                           // przednie ramię
  const hx = sx + 6 + Math.sin(kat) * 12, hy = y0 + 9 + Math.cos(kat) * 12;
  if (tryb === 'kop') rysujKilof(g, hx, hy, kat);
  else g.drawImage(MINI_OBSYD, Math.floor(hx + Math.sin(kat) * 2 - 3), Math.floor(hy + Math.cos(kat) * 2 - 3));
  g.restore();
}

/* ------------------------------------------------------------------ stan świata */
const tlo = document.getElementById('tlo'), przod = document.getElementById('przod');
const gT = tlo.getContext('2d'), gP = przod.getContext('2d');
let S = 3, W = 0, H = 0, KOL = 0, WIE = 0, yZ = 0;
let sciana, pek, pop, ziemia, ziemiaPop;
let motyw = localStorage.getItem('theme') === 'dark' ? 'ciemny' : 'jasny';
let anim = null;
const chmury = [], czastki = [], iskry = [];
let ileNieba = 0;

function nowaChmura(x) {
  const seg = []; let dx = 0;
  const n = 2 + (Math.random() * 3 | 0);
  for (let k = 0; k < n; k++) {
    const w = 8 + (Math.random() * 4 | 0) * 4, h = 3 + (Math.random() * 3 | 0);
    seg.push([dx, -h, w, h]); dx += w;
  }
  seg.push([4 + (Math.random() * 6 | 0), -seg[0][3] - 3, Math.max(8, dx - 14), 3]);
  const blisko = Math.random() < .5;
  return { x, y: 14 + Math.random() * Math.max(30, yZ * .5), seg, szer: dx, v: blisko ? los(7, 10) : los(3, 5), blisko };
}

function wypelnij(pelna) {
  sciana.fill(pelna); pek.fill(0); pop.fill(1); ziemia.fill(pelna); ziemiaPop.fill(1);
}

function rozmiar() {
  if (anim) zakonczPrzejscie();
  S = innerWidth < 640 ? 2 : 3;
  W = Math.ceil(innerWidth / S); H = Math.ceil(innerHeight / S);
  for (const c of [tlo, przod]) { c.width = W; c.height = H; c.style.width = W * S + 'px'; c.style.height = H * S + 'px'; }
  gT.imageSmoothingEnabled = gP.imageSmoothingEnabled = false;
  yZ = H - WYS_ZIEMI * T;
  KOL = Math.ceil(W / T) + 1; WIE = Math.ceil(yZ / T);
  sciana = new Uint8Array(KOL * WIE); pek = new Float32Array(KOL * WIE); pop = new Float32Array(KOL * WIE);
  ziemia = new Uint8Array(KOL); ziemiaPop = new Float32Array(KOL);
  wypelnij(motyw === 'ciemny' ? 1 : 0);
  document.documentElement.style.setProperty('--blok', T * S + 'px');
  chmury.length = 0;
  for (let i = 0; i < 3 + (W / 110 | 0); i++) chmury.push(nowaChmura(los(-40, W)));
}

/* ------------------------------------------------------------------ cząstki */
function odlamki(c, r, pal) {
  if (czastki.length > 700) return;
  const x = c * T, y = yZ - (r + 1) * T, kier = anim ? anim.dir : 1;
  for (let i = 0; i < 6; i++) czastki.push({
    x: x + los(2, 14), y: y + los(2, 14), vx: los(-30, 30) - kier * los(10, 40), vy: los(-70, -10),
    k: zTab(pal, Math.random()), z: los(.5, .9), t: 0, r: Math.random() < .5 ? 2 : 1,
  });
}
function pyl(c, pal) {
  for (let i = 0; i < 8; i++) czastki.push({
    x: c * T + los(0, 16), y: yZ - los(0, 3), vx: los(-25, 25), vy: los(-45, -10),
    k: zTab(pal, Math.random()), z: los(.4, .7), t: 0, r: 1,
  });
}
function aktualizujCzastki(dt) {
  for (let i = czastki.length - 1; i >= 0; i--) {
    const p = czastki[i]; p.t += dt;
    if (p.t > p.z) { czastki.splice(i, 1); continue; }
    p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.y > yZ - 1 && p.vy > 0) { p.y = yZ - 1; p.vy *= -.35; p.vx *= .6; }
  }
  // iskry z obsydianu (jak cząstki portalu)
  if (iskry.length < 45 && Math.random() < .35 && ileNieba < KOL * WIE) {
    for (let n = 0; n < 6; n++) {
      const c = Math.random() * KOL | 0, r = Math.random() * WIE | 0;
      if (sciana[c * WIE + r]) {
        iskry.push({ x: c * T + los(1, 15), y: yZ - r * T - los(1, 15), vy: los(-16, -6), f: los(0, 6), z: los(1.6, 3), t: 0,
          k: zTab(['#C084FC', '#A855F7', '#7E22CE', '#E9D5FF', '#D8B4FE'], Math.random()) });
        break;
      }
    }
  }
  for (let i = iskry.length - 1; i >= 0; i--) {
    const p = iskry[i]; p.t += dt;
    if (p.t > p.z || p.y < -4) { iskry.splice(i, 1); continue; }
    p.y += p.vy * dt; p.x += Math.sin(p.t * 3 + p.f) * 6 * dt;
  }
}

/* ------------------------------------------------------------------ rysowanie tła */
function rysujNiebo(t) {
  const pasy = 28, hP = Math.ceil(H / pasy);
  for (let i = 0; i < pasy; i++) { gT.fillStyle = mieszaj('#6FA0FF', '#C2DDFF', i / (pasy - 1)); gT.fillRect(0, i * hP, W, hP); }
  // słońce (kwadratowe, jak w Minecraft)
  const sx = Math.round(W * .68), sy = 22;
  gT.fillStyle = 'rgba(255,245,180,.35)'; gT.fillRect(sx - 3, sy - 3, 22, 22);
  gT.fillStyle = '#FFE977'; gT.fillRect(sx, sy, 16, 16);
  gT.fillStyle = '#FFF9C9'; gT.fillRect(sx + 2, sy + 2, 12, 12);
  gT.fillStyle = '#FFFFFF'; gT.fillRect(sx + 5, sy + 5, 6, 6);
  // chmury
  for (const ch of chmury) {
    if (!ch.blisko) rysujChmure(ch);
  }
  for (const ch of chmury) if (ch.blisko) rysujChmure(ch);
}
function rysujChmure(ch) {
  const x = Math.round(ch.x), y = Math.round(ch.y);
  gT.globalAlpha = ch.blisko ? 1 : .8;
  for (const [dx, dy, w, h] of ch.seg) {
    gT.fillStyle = '#FFFFFF'; gT.fillRect(x + dx, y + dy, w, h);
    gT.fillStyle = '#D9E1EC'; gT.fillRect(x + dx, y + dy + h - 1, w, 1);
  }
  gT.globalAlpha = 1;
}

function rysujTlo(t) {
  ileNieba = 0;
  if (motyw === 'jasny' || anim) rysujNiebo(t);
  else { gT.fillStyle = '#0F0B1E'; gT.fillRect(0, 0, W, H); }
  // ściana obsydianu
  for (let c = 0; c < KOL; c++) for (let r = 0; r < WIE; r++) {
    const i = c * WIE + r;
    if (!sciana[i]) { ileNieba++; continue; }
    const x = c * T, y = yZ - (r + 1) * T, tex = TEX.obsyd[szum(c, r, 77) * 4 | 0];
    if (pop[i] < 1) {
      const s = pop[i] < .6 ? .3 + pop[i] / .6 * .85 : 1.15 - (pop[i] - .6) / .4 * .15;
      const sz = Math.max(2, Math.round(T * s)), o = (T - sz) >> 1;
      gT.drawImage(tex, x + o, y + o, sz, sz);
    } else gT.drawImage(tex, x, y);
    if (pek[i] > 0) gT.drawImage(PEK[Math.min(9, pek[i] * 10 | 0)], x, y);
  }
  // pochodnie na ścianie + poświata
  for (let c = 3; c < KOL; c += 7) {
    const r = 3, i = c * WIE + r;
    if (r >= WIE || !sciana[i] || pop[i] < 1 || pek[i] > 0) continue;
    const x = c * T + 7, y = yZ - (r + 1) * T + 5;
    const mig = Math.sin(t * 9 + c) * 1.5 + szum(c, (t * 18) | 0, 5) * 3;
    const rad = 36 + mig;
    gT.globalCompositeOperation = 'lighter';
    const gr = gT.createRadialGradient(x + 1, y + 1, 2, x + 1, y + 1, rad);
    gr.addColorStop(0, 'rgba(255,165,70,.30)'); gr.addColorStop(.5, 'rgba(255,130,40,.12)'); gr.addColorStop(1, 'rgba(255,110,30,0)');
    gT.fillStyle = gr; gT.fillRect(x - rad, y - rad, rad * 2 + 2, rad * 2 + 2);
    gT.globalCompositeOperation = 'source-over';
    gT.fillStyle = '#7A5230'; gT.fillRect(x, y + 3, 2, 7);
    gT.fillStyle = '#5C3A1E'; gT.fillRect(x + 1, y + 3, 1, 7);
    gT.fillStyle = '#3C2A1A'; gT.fillRect(x, y + 2, 2, 1);
    gT.fillStyle = '#FFDB4A'; gT.fillRect(x, y, 2, 2);
    gT.fillStyle = '#FF8C1A'; gT.fillRect(x + ((t * 13 | 0) % 2), y - 1, 1, 1);
    if ((t * 7 | 0) % 3 === 0) { gT.fillStyle = '#FFFFFF'; gT.fillRect(x + 1 - ((t * 11 | 0) % 2), y, 1, 1); }
  }
  for (const p of iskry) {
    gT.globalAlpha = klamra(1 - p.t / p.z, 0, 1) * .9;
    gT.fillStyle = p.k; gT.fillRect(Math.round(p.x), Math.round(p.y), p.t < p.z * .5 ? 2 : 1, p.t < p.z * .5 ? 2 : 1);
  }
  gT.globalAlpha = 1;
}

/* ------------------------------------------------------------------ rysowanie przodu: ziemia, rośliny, cząstki, Steve */
function rysujRosline(c, x, t) {
  const n = szum(c, 9, 11), sw = Math.sin(t * 2 + c) > .3 ? 1 : 0;
  if (n > .86) {                                   // mak
    gP.fillStyle = '#3F8F2E'; gP.fillRect(x + 7, yZ - 4, 1, 4);
    gP.fillStyle = '#D22F2F'; gP.fillRect(x + 6 + sw, yZ - 7, 3, 3);
    gP.fillStyle = '#F45B5B'; gP.fillRect(x + 6 + sw, yZ - 7, 1, 1);
    gP.fillStyle = '#1A1A1A'; gP.fillRect(x + 7 + sw, yZ - 6, 1, 1);
  } else if (n > .74) {                            // mniszek
    gP.fillStyle = '#3F8F2E'; gP.fillRect(x + 8, yZ - 4, 1, 4);
    gP.fillStyle = '#F2D74C'; gP.fillRect(x + 7 + sw, yZ - 6, 3, 2);
    gP.fillStyle = '#FFF0A0'; gP.fillRect(x + 8 + sw, yZ - 6, 1, 1);
  } else if (n > .5) {                             // kępka trawy
    gP.fillStyle = '#63B346';
    gP.fillRect(x + 4, yZ - 3, 1, 3); gP.fillRect(x + 7 + sw, yZ - 5, 1, 5); gP.fillRect(x + 10, yZ - 4, 1, 4);
    gP.fillStyle = '#4E9A37'; gP.fillRect(x + 6, yZ - 2, 1, 2); gP.fillRect(x + 8, yZ - 3, 1, 3);
  }
}

function rysujPrzod(t) {
  gP.clearRect(0, 0, W, H);
  for (let c = 0; c < KOL; c++) {
    const x = c * T, b = ziemia[c];
    const t0 = (b ? TEX.bedrock : TEX.trawa)[szum(c, 0, 3) * 4 | 0];
    const t1 = (b ? TEX.bedrock : TEX.dirt)[szum(c, 1, 3) * 4 | 0];
    if (ziemiaPop[c] < 1) {
      // pod spodem stary blok, na nim "wyskakujący" nowy
      gP.drawImage((b ? TEX.trawa : TEX.bedrock)[szum(c, 0, 3) * 4 | 0], x, yZ);
      gP.drawImage((b ? TEX.dirt : TEX.bedrock)[szum(c, 1, 3) * 4 | 0], x, yZ + T);
      const s = ziemiaPop[c] < .6 ? .3 + ziemiaPop[c] / .6 * .85 : 1.15 - (ziemiaPop[c] - .6) / .4 * .15;
      const sz = Math.max(2, Math.round(T * s)), o = (T - sz) >> 1;
      gP.drawImage(t0, x + o, yZ + o, sz, sz); gP.drawImage(t1, x + o, yZ + T + o, sz, sz);
    } else {
      gP.drawImage(t0, x, yZ); gP.drawImage(t1, x, yZ + T);
      if (!b) rysujRosline(c, x, t);
    }
  }
  for (const p of czastki) {
    gP.globalAlpha = klamra(1.3 - p.t / p.z, 0, 1);
    gP.fillStyle = p.k; gP.fillRect(Math.round(p.x), Math.round(p.y), p.r, p.r);
  }
  gP.globalAlpha = 1;
  if (anim) {
    const a = anim, okres = a.tryb === 'kop' ? .32 : .42;
    rysujSteve(gP, a.x, yZ, a.dir, a.faza, a.tryb, (a.t / okres) % 1);
  }
}

/* ------------------------------------------------------------------ przejście motywu */
function zrobKlon(doCiemnego) {
  const tresc = document.getElementById('tresc'); if (!tresc) return null;
  const k = tresc.cloneNode(true);
  k.removeAttribute('id'); k.className = 'klon ' + (doCiemnego ? 'klon-ciemny' : 'klon-jasny');
  k.setAttribute('aria-hidden', 'true');
  k.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
  k.style.top = tresc.offsetTop + 'px'; k.style.left = tresc.offsetLeft + 'px'; k.style.width = tresc.offsetWidth + 'px';
  k.style.clipPath = doCiemnego ? 'inset(0 0 0 200%)' : 'inset(0 200% 0 0)';
  tresc.parentNode.insertBefore(k, tresc.nextSibling);
  return k;
}

/* kolor tekstu zmienia się dokładnie wzdłuż ukośnego frontu niszczonych/stawianych bloków */
function ustawKlon(a, zasieg) {
  const k = a.klon; if (!k) return;
  const rect = k.getBoundingClientRect();
  const opoz = a.tryb === 'kop' ? CZAS_PEKANIA : CZAS_POP * .5;
  const fx = wiersz => (zasieg - a.dir * a.v * (opoz + wiersz * OPOZ_WIERSZA)) * S - rect.left;
  const wiersz = yView => (yZ * S - yView) / (T * S);
  const yG = -40, yD = k.offsetHeight + 40;
  const xG = fx(wiersz(rect.top + yG)), xD = fx(wiersz(rect.top + yD));
  const daleko = a.dir > 0 ? -20000 : 20000;
  k.style.clipPath = `polygon(${daleko}px ${yG}px, ${xG.toFixed(1)}px ${yG}px, ${xD.toFixed(1)}px ${yD}px, ${daleko}px ${yD}px)`;
}

function startPrzejscia() {
  const doCiemnego = motyw === 'jasny';
  const dir = doCiemnego ? -1 : 1;
  const czas = klamra((W / T) / 9, 3.2, 6);
  anim = {
    tryb: doCiemnego ? 'buduj' : 'kop', dir, t: 0, faza: 0,
    x: dir > 0 ? -44 : W + 32, v: (W + 80) / czas,
    startKol: new Float32Array(KOL).fill(-1), startZiemia: new Uint8Array(KOL),
    klon: zrobKlon(doCiemnego),
  };
  document.body.classList.add('przejscie');
}

function aktualizuj(dt) {
  aktualizujCzastki(dt);
  for (const ch of chmury) { ch.x += ch.v * dt; if (ch.x > W + 10) { const n = nowaChmura(-ch.szer - 10); Object.assign(ch, n, { x: -n.szer - 10 }); } }
  if (!anim) return;
  const a = anim;
  a.t += dt; a.x += a.dir * a.v * dt; a.faza += a.v * dt / 2.4;
  const zasieg = a.x + 6 + a.dir * 13, kolZ = Math.floor(zasieg / T), kolC = Math.floor((a.x + 6) / T);
  const palZ = a.tryb === 'kop' ? PAL.bedrock : [...PAL.dirt, ...PAL.trawa];
  for (let c = 0; c < KOL; c++) {
    if (a.startKol[c] < 0 && (a.dir > 0 ? c <= kolZ : c >= kolZ)) a.startKol[c] = a.t;
    if (!a.startZiemia[c] && (a.dir > 0 ? c <= kolC : c >= kolC)) {
      a.startZiemia[c] = 1; ziemia[c] = a.tryb === 'buduj' ? 1 : 0; ziemiaPop[c] = 0; pyl(c, palZ);
    }
    if (ziemiaPop[c] < 1) ziemiaPop[c] = Math.min(1, ziemiaPop[c] + dt / .22);
    if (a.startKol[c] < 0) continue;
    for (let r = 0; r < WIE; r++) {
      const i = c * WIE + r, tau = a.t - a.startKol[c] - r * OPOZ_WIERSZA;
      if (tau <= 0) continue;
      if (a.tryb === 'kop') {
        if (sciana[i]) { pek[i] = tau / CZAS_PEKANIA; if (pek[i] >= 1) { sciana[i] = 0; pek[i] = 0; odlamki(c, r, [...PAL.obsyd, '#3A2A66', '#4A3A80']); } }
      } else {
        if (!sciana[i]) { sciana[i] = 1; pop[i] = 0; }
        if (pop[i] < 1) pop[i] = Math.min(1, tau / CZAS_POP);
      }
    }
  }
  ustawKlon(a, zasieg);
  // iskry w momencie uderzenia kilofem w ścianę
  if (a.tryb === 'kop') {
    const u = (a.t / .32) % 1;
    if (a.ostU !== undefined && a.ostU < .38 && u >= .38) {
      const kat = katKilofa(.38), ox = 6 + Math.sin(kat) * 21, oy = 9 + Math.cos(kat) * 21;
      const ix = a.dir > 0 ? a.x + ox : a.x + 12 - ox, iy = yZ - 32 + oy;
      for (let i = 0; i < 7; i++) czastki.push({
        x: ix, y: iy, vx: los(-60, 60), vy: los(-70, 10), r: 1, t: 0, z: los(.15, .35),
        k: zTab(['#FFFFFF', '#FFF3A0', '#C9FFF9', '#E9D5FF'], Math.random()),
      });
    }
    a.ostU = u;
  }
  if (a.dir > 0 ? a.x > W + 40 : a.x < -60) zakonczPrzejscie();
}

const oryginalToggle = window.toggleTheme;
function zastosujMotyw(ciemny) {
  motyw = ciemny ? 'ciemny' : 'jasny';
  document.documentElement.classList.toggle('ciemny', ciemny);
  if (document.body.classList.contains('dark-mode') !== ciemny && typeof oryginalToggle === 'function') oryginalToggle();
}
function zakonczPrzejscie() {
  const a = anim; anim = null;
  const pelna = a.tryb === 'buduj' ? 1 : 0;
  wypelnij(pelna);
  if (a.klon) a.klon.remove();
  document.body.classList.remove('przejscie');
  zastosujMotyw(!!pelna);
}

window.toggleTheme = function () {
  if (anim) return;
  if (OGRANICZ_RUCH || !W) { const c = motyw === 'jasny'; wypelnij(c ? 1 : 0); zastosujMotyw(c); return; }
  startPrzejscia();
};

/* ------------------------------------------------------------------ pętla */
let ost = performance.now();
function klatka(now) {
  const dt = Math.min(.05, (now - ost) / 1000); ost = now;
  const t = now / 1000;
  aktualizuj(dt);
  rysujTlo(t);
  rysujPrzod(t);
  requestAnimationFrame(klatka);
}

addEventListener('resize', rozmiar);
rozmiar();
requestAnimationFrame(klatka);
})();
