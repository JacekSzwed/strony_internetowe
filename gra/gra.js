/* gra.js — "Emeryk i Skradziony Dzwon": platformówka 2D w stylu 8-bit (Minecraft).
   Silnik: fizyka kafelkowa, kamera, byty, cząstki, ciemność z oświetleniem, stany gry, sterowanie klawiaturą i dotykiem. */
(() => {
'use strict';

const G = window.Grafika, C = window.Czcionka, D = window.Dzwiek;
const { T, TEX, KAFLE } = G;
const W = 320, H = 180;
const GRAW = .28, MAX_SPAD = 5, SKOK = -4.9, PREDKOSC = 1.55;

const canvas = document.getElementById('gra');
const g = canvas.getContext('2d');
canvas.width = W; canvas.height = H; g.imageSmoothingEnabled = false;
const ciemnoscPlotno = G.plotno(W, H), gc = ciemnoscPlotno.getContext('2d');

function dopasuj() {
  let s = Math.min(innerWidth / W, innerHeight / H);
  if (s >= 2) s = Math.floor(s);
  canvas.style.width = Math.floor(W * s) + 'px'; canvas.style.height = Math.floor(H * s) + 'px';
}
addEventListener('resize', dopasuj); dopasuj();

/* ------------------------------------------------------------------ sterowanie */
const kl = {}, wcisniete = {}, dotyk = { lewo: false, prawo: false, gora: false, dol: false, skok: false };
const KL_GRY = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Enter', 'Escape', 'KeyP', 'KeyM', 'KeyZ', 'KeyX'];
addEventListener('keydown', e => {
  if (KL_GRY.includes(e.code)) e.preventDefault();
  if (!kl[e.code]) wcisniete[e.code] = true;
  kl[e.code] = true; D.start();
});
addEventListener('keyup', e => { kl[e.code] = false; });
addEventListener('blur', () => { for (const k in kl) kl[k] = false; });
let tap = false;
canvas.addEventListener('pointerdown', () => { D.start(); tap = true; });

for (const [id, pole] of [['d-lewo', 'lewo'], ['d-prawo', 'prawo'], ['d-gora', 'gora'], ['d-dol', 'dol'], ['d-skok', 'skok']]) {
  const el = document.getElementById(id); if (!el) continue;
  const on = e => { e.preventDefault(); D.start(); if (!dotyk[pole]) wcisniete['dotyk-' + pole] = true; dotyk[pole] = true; };
  const off = e => { e.preventDefault(); dotyk[pole] = false; };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
}
const wej = {
  lewo: () => kl.ArrowLeft || kl.KeyA || dotyk.lewo,
  prawo: () => kl.ArrowRight || kl.KeyD || dotyk.prawo,
  gora: () => kl.ArrowUp || kl.KeyW || dotyk.gora || dotyk.skok,
  dol: () => kl.ArrowDown || kl.KeyS || dotyk.dol,
  skok: () => kl.Space || kl.ArrowUp || kl.KeyW || kl.KeyZ || dotyk.skok,
  skokWc: () => wcisniete.Space || wcisniete.ArrowUp || wcisniete.KeyW || wcisniete.KeyZ || wcisniete['dotyk-skok'],
  ok: () => wcisniete.Enter || wcisniete.Space || wcisniete.KeyZ || wcisniete['dotyk-skok'] || tap,
  menuGora: () => wcisniete.ArrowUp || wcisniete.KeyW || wcisniete['dotyk-gora'] || wcisniete.ArrowLeft || wcisniete.KeyA || wcisniete['dotyk-lewo'],
  menuDol: () => wcisniete.ArrowDown || wcisniete.KeyS || wcisniete['dotyk-dol'] || wcisniete.ArrowRight || wcisniete.KeyD || wcisniete['dotyk-prawo'],
  pauza: () => wcisniete.Escape || wcisniete.KeyP,
  wycisz: () => wcisniete.KeyM,
};

/* ------------------------------------------------------------------ narzędzia */
const los = (a, b) => a + Math.random() * (b - a);
const klamra = (v, a, b) => v < a ? a : v > b ? b : v;
const koliduje = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const odl = (a, b) => Math.hypot((a.x + a.w / 2) - (b.x + b.w / 2), (a.y + a.h / 2) - (b.y + b.h / 2));

/* ------------------------------------------------------------------ stan gry */
const gra = {
  stan: 'tytul', poziomNr: 0, zycia: 3, szmaragdy: 0, szmaragdyPoziomu: 0, czas: 0, t: 0, timer: 0,
  menu: 0, tytulT: 0, wstrzas: 0, blysk: 0, postep: parseInt(localStorage.getItem('gra-postep') || '0'),
  rekord: parseInt(localStorage.getItem('gra-rekord') || '0'), ukonczono: false, komunikat: null,
};
let P = null;          // aktualny poziom
let gracz = null;
let kamera = { x: 0, y: 0 };
let kropla = 0;

/* ------------------------------------------------------------------ poziom */
function wczytajPoziom(nr, zachowaj) {
  const def = window.POZIOMY[nr];
  const wiersze = def.mapa.map(r => r.split(''));
  P = {
    def, szer: wiersze[0].length, wys: wiersze.length, k: wiersze, wrogowie: [], przedmioty: [], strzaly: [], czastki: [], platformy: [],
    npc: [], pochodnie: [], lawa: [], glow: [], ogniska: [], zebrane: zachowaj ? zachowaj.zebrane : new Set(), checkpoint: zachowaj ? zachowaj.checkpoint : null,
    boss: null, bossAktywny: false, bossPokonany: zachowaj ? zachowaj.bossPokonany : false, dzwon: null, start: null, t: 0,
  };
  for (let y = 0; y < P.wys; y++) for (let x = 0; x < P.szer; x++) {
    const ch = wiersze[y][x];
    if (ch === '*') P.pochodnie.push({ x, y });
    if (ch === 'V') P.lawa.push({ x, y });
    if (ch === 'i') P.glow.push({ x, y });
    if (KAFLE[ch]) continue;
    wiersze[y][x] = ' ';
    const px = x * T, py = y * T, id = x + ',' + y;
    switch (ch) {
      case '@': P.start = { x: px + 3, y: py - 6 }; break;
      case 'j': P.npc.push({ x: px + 2, y: py + T - 27, w: 12, h: 27, dir: 1, tekst: def.npc[x] || '...', pokaz: 0 }); break;
      case 'z': P.wrogowie.push(nowyWrog('zombie', px + 3, py + T - 24)); break;
      case 'c': P.wrogowie.push(nowyWrog('creeper', px + 4, py + T - 22)); break;
      case 'k': P.wrogowie.push(nowyWrog('szkielet', px + 4, py + T - 24)); break;
      case 's': P.wrogowie.push(nowyWrog('slime', px + 2, py + T - 10)); break;
      case 'p': P.wrogowie.push(nowyWrog('pillager', px + 3, py + T - 24)); break;
      case 'b': if (!P.bossPokonany) { P.boss = nowyWrog('boss', px, py + T - 24); P.wrogowie.push(P.boss); } break;
      case 'e': if (!P.zebrane.has(id)) P.przedmioty.push({ typ: 'szmaragd', id, x: px + 4, y: py + 4, w: 8, h: 8, faza: (x * 7 + y * 3) % 60 }); break;
      case 'a': if (!P.zebrane.has(id)) P.przedmioty.push({ typ: 'jablko', id, x: px + 4, y: py + 4, w: 8, h: 8, faza: 0 }); break;
      case 'o': if (!P.zebrane.has(id)) P.przedmioty.push({ typ: 'totem', id, x: px + 4, y: py + 3, w: 8, h: 10, faza: 0 }); break;
      case 'f': P.ogniska.push({ x: px, y: py + T - 10, w: 16, h: 10, aktywne: P.checkpoint && P.checkpoint.id === id, id }); break;
      case '!': P.dzwon = { x: px + 2, y: py, w: 12, h: 11, kat: 0, v: 0 }; break;
      case 'm': P.platformy.push({ x0: px - 8, y0: py, x: px - 8, y: py, w: 32, h: 8, typ: 'm', A: 40, om: .8 + ((x * 13) % 5) * .1, f: x }); break;
      case 'n': P.platformy.push({ x0: px - 8, y0: py, x: px - 8, y: py, w: 32, h: 8, typ: 'n', A: 44, om: .7 + ((x * 7) % 5) * .1, f: x }); break;
      case 'h': P.npc.push({ x: px + 3, y: py + T - 10, w: 10, h: 10, kurczak: true, dir: 1 }); break;
    }
  }
  if (P.bossPokonany && def.dzwonPoBossie) P.dzwon = { x: def.dzwonPoBossie.x * T + 2, y: def.dzwonPoBossie.y * T, w: 12, h: 11, kat: 0, v: 0 };
  const s = P.checkpoint ? { x: P.checkpoint.x, y: P.checkpoint.y } : P.start;
  gracz = { x: s.x, y: s.y, w: 10, h: 21, vx: 0, vy: 0, dir: 1, naZiemi: false, hp: 3, nietykalny: 0, martwy: 0, anim: 0, coyote: 0, bufor: 0, drabina: false, platforma: null, wygrana: 0, mrug: 0 };
  kamera.x = klamra(gracz.x - W / 2, 0, P.szer * T - W); kamera.y = klamra(gracz.y - H / 2, 0, P.wys * T - H);
  gra.szmaragdyPoziomu = zachowaj ? zachowaj.szmaragdyPoziomu : gra.szmaragdy;
}

function nowyWrog(typ, x, y) {
  const w = { typ, x, y, vx: 0, vy: 0, dir: Math.random() < .5 ? -1 : 1, naZiemi: false, hp: 1, t: Math.random() * 3, anim: 0, lont: -1, cel: 0, ranny: 0, martwy: 0 };
  switch (typ) {
    case 'zombie': w.w = 8; w.h = 23; w.v = .38; break;
    case 'creeper': w.w = 8; w.h = 21; w.v = .34; break;
    case 'szkielet': w.w = 8; w.h = 23; w.v = .3; break;
    case 'slime': w.w = 12; w.h = 10; w.v = 0; w.sq = 0; break;
    case 'pillager': w.w = 10; w.h = 23; w.v = .35; break;
    case 'boss': w.w = 12; w.h = 23; w.v = .5; w.hp = 3; w.dir = -1; break;
  }
  return w;
}

/* ------------------------------------------------------------------ kafle i kolizje */
function kafel(tx, ty) {
  if (tx < 0 || tx >= P.szer) return 'X';
  if (ty < 0) return ' ';
  if (ty >= P.wys) return ' ';
  return P.k[ty][tx];
}
const staly = ch => !!(KAFLE[ch] && KAFLE[ch].staly);

function ruszX(e, dx) {
  e.x += dx; e.uderzyl = false;
  const y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 1) / T);
  if (dx > 0) {
    const tx = Math.floor((e.x + e.w - 1) / T);
    for (let ty = y0; ty <= y1; ty++) if (staly(kafel(tx, ty))) { e.x = tx * T - e.w; e.vx = 0; e.uderzyl = true; break; }
  } else if (dx < 0) {
    const tx = Math.floor(e.x / T);
    for (let ty = y0; ty <= y1; ty++) if (staly(kafel(tx, ty))) { e.x = (tx + 1) * T; e.vx = 0; e.uderzyl = true; break; }
  }
}
function ruszY(e, dy) {
  const stareDol = e.y + e.h;
  e.y += dy; e.naZiemi = false;
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 1) / T);
  if (dy > 0) {
    const ty = Math.floor((e.y + e.h - 1) / T);
    for (let tx = x0; tx <= x1; tx++) {
      const ch = kafel(tx, ty), d = KAFLE[ch];
      if (staly(ch) || (d && d.polka && stareDol <= ty * T + .5)) { e.y = ty * T - e.h; e.vy = 0; e.naZiemi = true; break; }
    }
    for (const pl of P.platformy) {
      if (e.x + e.w > pl.x && e.x < pl.x + pl.w && stareDol <= pl.y + Math.max(1, pl.dy || 0) + .5 && e.y + e.h >= pl.y) {
        e.y = pl.y - e.h; e.vy = 0; e.naZiemi = true; e.platforma = pl;
      }
    }
  } else if (dy < 0) {
    const ty = Math.floor(e.y / T);
    for (let tx = x0; tx <= x1; tx++) if (staly(kafel(tx, ty))) { e.y = (ty + 1) * T; e.vy = 0; break; }
  }
}
function podStopami(e, ch) {                                          // czy pod przednią stopą jest podłoże
  const tx = Math.floor((e.dir > 0 ? e.x + e.w + 1 : e.x - 2) / T), ty = Math.floor((e.y + e.h + 1) / T);
  const k = kafel(tx, ty);
  return staly(k) || (KAFLE[k] && KAFLE[k].polka) || (KAFLE[k] && KAFLE[k].lawa && ch);
}
function dotykaKafla(e, test) {
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 1) / T), y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 1) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const d = KAFLE[kafel(tx, ty)]; if (d && test(d)) return true; }
  return false;
}

/* ------------------------------------------------------------------ cząstki */
function czastki(x, y, ile, kolory, opc = {}) {
  for (let i = 0; i < ile; i++) P.czastki.push({
    x, y, vx: los(-1, 1) * (opc.sila || 1.4), vy: los(-1, .2) * (opc.sila || 1.4) - (opc.gora || 0), k: kolory[(Math.random() * kolory.length) | 0],
    z: los(.3, .8) * (opc.czas || 1), t: 0, r: opc.r || 1 + (Math.random() < .5 ? 1 : 0), grav: opc.grav === undefined ? .12 : opc.grav,
  });
}
function napis(x, y, s, kolor = '#fff') { P.czastki.push({ x, y, vx: 0, vy: -.5, k: kolor, z: .9, t: 0, r: 0, grav: 0, s }); }

/* ------------------------------------------------------------------ gracz */
function aktualizujGracza() {
  const p = gracz;
  if (p.martwy) {
    p.martwy++; p.vy += GRAW * .6; p.y += p.vy; p.x += p.vx;
    if (p.martwy === 80) poSmierci();
    return;
  }
  if (p.wygrana) { p.wygrana++; p.anim += .1; return; }
  const naZiemi = p.naZiemi;
  // ruch poziomy
  const acc = naZiemi ? .26 : .17;
  if (wej.lewo()) { p.vx -= acc; p.dir = -1; }
  else if (wej.prawo()) { p.vx += acc; p.dir = 1; }
  else p.vx *= naZiemi ? .74 : .93;
  p.vx = klamra(p.vx, -PREDKOSC, PREDKOSC);
  if (Math.abs(p.vx) < .05) p.vx = 0;

  // drabina
  const srodekTx = Math.floor((p.x + p.w / 2) / T), srodekTy = Math.floor((p.y + p.h / 2) / T);
  const naDrabinie = KAFLE[kafel(srodekTx, srodekTy)] && KAFLE[kafel(srodekTx, srodekTy)].drabina;
  const drabinaNizej = KAFLE[kafel(srodekTx, Math.floor((p.y + p.h + 1) / T))] && KAFLE[kafel(srodekTx, Math.floor((p.y + p.h + 1) / T))].drabina;
  if ((naDrabinie && (wej.gora() || wej.dol())) || (drabinaNizej && wej.dol() && !naDrabinie)) p.drabina = true;
  if (!naDrabinie && !drabinaNizej) p.drabina = false;

  // skok (coyote time + bufor)
  if (naZiemi) p.coyote = 6; else if (p.coyote > 0) p.coyote--;
  if (wej.skokWc()) p.bufor = 7; else if (p.bufor > 0) p.bufor--;
  if (p.bufor > 0 && (p.coyote > 0 || p.drabina)) {
    p.vy = SKOK; p.bufor = 0; p.coyote = 0; p.drabina = false; p.platforma = null;
    D.sfx('skok'); czastki(p.x + p.w / 2, p.y + p.h, 5, ['#C9B58A', '#A89870'], { sila: .8, gora: .3 });
  }
  if (!wej.skok() && p.vy < -1.8) p.vy = -1.8;

  if (p.drabina) {
    p.vy = wej.gora() ? -1.3 : wej.dol() ? 1.3 : 0;
    p.vx *= .7;
  } else {
    p.vy = Math.min(MAX_SPAD, p.vy + GRAW);
  }
  // przenoszenie przez platformę
  if (p.platforma) { p.x += p.platforma.dx || 0; p.y += p.platforma.dy || 0; }
  p.platforma = null;
  ruszX(p, p.vx);
  const bylNaZiemi = p.naZiemi, vyPrzed = p.vy;
  ruszY(p, p.vy);
  if (p.drabina && p.vy === 0 && wej.gora() && p.naZiemi) p.drabina = false;
  if (!bylNaZiemi && p.naZiemi && vyPrzed > 2.5) { D.sfx('ladowanie'); czastki(p.x + p.w / 2, p.y + p.h, 4, ['#C9B58A', '#A89870'], { sila: .7, gora: .2 }); }
  if (p.naZiemi && p.vx !== 0) { p.anim += Math.abs(p.vx) * .11; } else if (!p.naZiemi) p.anim = 0;
  if (p.nietykalny > 0) p.nietykalny--;

  // zagrożenia
  if (dotykaKafla(p, d => d.lawa)) { zabijGracza('lawa'); return; }
  if (p.y > P.wys * T + 30) { zabijGracza('spadek'); return; }
  if (dotykaKafla(p, d => d.rani)) zranGracza(1, p.dir * -1);

  // przedmioty
  for (let i = P.przedmioty.length - 1; i >= 0; i--) {
    const it = P.przedmioty[i];
    if (!koliduje(p, it)) continue;
    P.przedmioty.splice(i, 1); P.zebrane.add(it.id);
    if (it.typ === 'szmaragd') {
      gra.szmaragdy++; D.sfx('szmaragd');
      czastki(it.x + 4, it.y + 4, 6, ['#17DD62', '#B4FFD0', '#0B9E43'], { grav: .02, sila: 1 });
      if (gra.szmaragdy % 50 === 0) { gra.zycia++; D.sfx('totem'); napis(p.x - 10, p.y - 10, '+1 życie', '#FFE066'); }
    } else if (it.typ === 'jablko') {
      p.hp = 3; D.sfx('jablko'); napis(p.x - 12, p.y - 10, 'Pełne zdrowie!', '#FFE066');
      czastki(it.x + 4, it.y + 4, 10, ['#F2C23A', '#FFF3B0'], { grav: .02 });
    } else if (it.typ === 'totem') {
      gra.zycia++; D.sfx('totem'); napis(p.x - 8, p.y - 10, '+1 życie', '#FFE066');
      czastki(it.x + 4, it.y + 4, 14, ['#52A84B', '#E2C04A', '#FFFFFF'], { grav: 0, sila: 1.6 });
    }
  }
  for (const o of P.ogniska) if (!o.aktywne && koliduje(p, o)) {
    P.ogniska.forEach(q => q.aktywne = false); o.aktywne = true;
    P.checkpoint = { x: o.x + 2, y: o.y - 22, id: o.id }; D.sfx('checkpoint'); napis(o.x - 12, o.y - 14, 'Punkt kontrolny', '#FFB347');
    czastki(o.x + 8, o.y + 2, 10, ['#FF8C1A', '#FFDB4A'], { grav: -.02, sila: .8 });
  }
  if (P.dzwon && koliduje(p, P.dzwon)) ukonczPoziom();
}

function zranGracza(ile, kier) {
  const p = gracz;
  if (p.nietykalny > 0 || p.martwy) return;
  p.hp -= ile; p.nietykalny = 75; p.vx = kier * 2.2; p.vy = -2.6; p.drabina = false;
  D.sfx('obrazenia'); gra.wstrzas = 8;
  czastki(p.x + p.w / 2, p.y + p.h / 2, 8, ['#E03131', '#FF8A8A'], { sila: 1.5 });
  if (p.hp <= 0) zabijGracza('obrazenia');
}
function zabijGracza(jak) {
  const p = gracz; if (p.martwy) return;
  p.martwy = 1; p.hp = 0; p.vy = jak === 'lawa' ? -1 : -3.2; p.vx = 0;
  D.sfx('smierc'); gra.wstrzas = 10;
  if (jak === 'lawa') { D.sfx('plusk'); czastki(p.x + p.w / 2, p.y + p.h, 16, ['#FF8F1A', '#FFC23A', '#E0621A'], { sila: 1.8, gora: 1 }); p.y += 6; }
  else czastki(p.x + p.w / 2, p.y + p.h / 2, 12, ['#6E4B2C', '#C9A07A', '#E03131'], { sila: 1.6 });
}
function poSmierci() {
  gra.zycia--;
  if (gra.zycia <= 0) { gra.stan = 'gameover'; gra.timer = 0; D.stopMuzyke(); D.sfx('gameover'); return; }
  wczytajPoziom(gra.poziomNr, { zebrane: P.zebrane, checkpoint: P.checkpoint, bossPokonany: P.bossPokonany, szmaragdyPoziomu: gra.szmaragdyPoziomu });
  gra.stan = 'gra';
}

/* ------------------------------------------------------------------ wrogowie */
function aktualizujWroga(w) {
  const p = gracz;
  w.t += 1 / 60;
  if (w.martwy) { w.martwy++; return; }
  if (w.ranny > 0) w.ranny--;
  const dx = (p.x + p.w / 2) - (w.x + w.w / 2), dy = (p.y + p.h / 2) - (w.y + w.h / 2), widzi = !p.martwy && Math.abs(dy) < 40;

  switch (w.typ) {
    case 'zombie': {
      const goni = widzi && Math.abs(dx) < 100;
      if (goni) w.dir = dx > 0 ? 1 : -1;
      const v = goni ? .55 : w.v;
      if (!goni && (w.uderzyl || (w.naZiemi && !podStopami(w)))) w.dir *= -1;
      w.vx = w.dir * v; break; }
    case 'creeper': {
      if (w.lont >= 0) {
        w.lont += 1 / 60; w.vx = 0;
        if (w.lont > 1) { wybuch(w.x + w.w / 2, w.y + w.h / 2, 30); w.martwy = 1; w.hp = 0; return; }
        break;
      }
      const goni = widzi && Math.abs(dx) < 90;
      if (goni) w.dir = dx > 0 ? 1 : -1;
      if (!goni && (w.uderzyl || (w.naZiemi && !podStopami(w)))) w.dir *= -1;
      w.vx = w.dir * (goni ? .6 : w.v);
      if (widzi && odl(w, p) < 22) { w.lont = 0; D.sfx('syk'); }
      break; }
    case 'szkielet':
    case 'pillager': {
      const zasieg = w.typ === 'szkielet' ? 150 : 130;
      const widziGracza = !p.martwy && Math.abs(dx) < zasieg && Math.abs(dy) < 56;
      if (widziGracza) {
        w.dir = dx > 0 ? 1 : -1; w.vx = 0;
        if (w.t - w.cel > (w.typ === 'szkielet' ? 1.9 : 2.1)) {
          w.cel = w.t;
          const sx = w.x + w.w / 2 + w.dir * 6, sy = w.y + 9;
          const v = w.typ === 'szkielet' ? 2.3 : 2.7, k = Math.atan2(dy - 6, dx) ;
          const kat = w.typ === 'szkielet' ? klamra(k, w.dir > 0 ? -.6 : Math.PI - .6, w.dir > 0 ? .6 : Math.PI + .6) : (w.dir > 0 ? 0 : Math.PI);
          P.strzaly.push({ x: sx, y: sy, w: 8, h: 3, vx: Math.cos(kat) * v, vy: Math.sin(kat) * v, z: 0, wroga: true });
          D.sfx('luk');
        }
      } else {
        if (w.uderzyl || (w.naZiemi && !podStopami(w))) w.dir *= -1;
        w.vx = w.dir * w.v;
      }
      break; }
    case 'slime': {
      if (w.naZiemi) {
        w.vx *= .7; w.sq = Math.min(1, w.sq + .1);
        if (w.t > 1.3 + (w.x % 7) * .1) {
          w.t = 0; w.dir = dx > 0 ? 1 : -1;
          w.vy = -3.3; w.vx = w.dir * (widzi && Math.abs(dx) < 120 ? 1.1 : .7); D.sfx('slime');
        }
      } else w.sq = Math.max(-.4, w.sq - .1);
      break; }
    case 'boss': {
      if (!P.bossAktywny) { w.vx = 0; break; }
      const faza = w.t % 3.4;
      const v = w.v + (3 - w.hp) * .22;
      if (faza < 2.2) { w.dir = dx > 0 ? 1 : -1; w.vx = w.dir * v; if (w.uderzyl && w.naZiemi) w.vy = -4.2; }
      else { w.vx *= .8; if (Math.abs(faza - 2.5) < 1 / 60 && !p.martwy) {
        w.dir = dx > 0 ? 1 : -1;
        for (const k of [-.22, 0, .22]) P.strzaly.push({ x: w.x + w.w / 2 + w.dir * 8, y: w.y + 8, w: 8, h: 3, vx: Math.cos(k) * 2.6 * w.dir, vy: Math.sin(k) * 2.6, z: 0, wroga: true });
        D.sfx('luk');
      } }
      if (w.t > 6 && Math.abs(w.t % 3.4 - 1.1) < 1 / 60 && w.naZiemi && dy < -20) w.vy = -4.6;
      break; }
  }
  w.vy = Math.min(MAX_SPAD, w.vy + GRAW);
  ruszX(w, w.vx); ruszY(w, w.vy);
  if (w.typ === 'slime' || w.typ === 'zombie' || w.typ === 'creeper') w.anim += Math.abs(w.vx) * .12; else w.anim += Math.abs(w.vx) * .1;
  if (w.y > P.wys * T + 20 || dotykaKafla(w, d => d.lawa)) { w.martwy = 1; w.hp = 0; czastki(w.x + w.w / 2, w.y + w.h, 8, ['#FF8F1A', '#FFC23A'], { gora: 1 }); }

  // kolizja z graczem
  if (!p.martwy && !p.wygrana && koliduje(p, w) && !w.martwy) {
    const zGory = p.vy > 0 && p.y + p.h - w.y < 10 + p.vy;
    if (zGory) {
      p.vy = w.typ === 'creeper' ? -5.6 : -4.2; p.y = w.y - p.h;
      if (w.typ === 'creeper') { if (w.lont < 0) { w.lont = .45; D.sfx('syk'); } D.sfx('stomp'); }
      else if (w.typ === 'boss') {
        p.vx = -p.dir * 2.6;                                        // odrzut, żeby nie dało się "stać" na głowie bossa
        if (w.ranny <= 0) { w.hp--; w.ranny = 90; D.sfx('stomp'); D.sfx('boss'); gra.wstrzas = 10; w.vy = -2; w.vx = p.dir * 2;
          czastki(w.x + w.w / 2, w.y + 6, 12, ['#D8D8D8', '#2F353A', '#9AA0A0'], { sila: 1.8 });
          if (w.hp <= 0) pokonajBossa(w); else napis(w.x - 6, w.y - 12, ['', 'Jeszcze 1!', 'Jeszcze 2!'][w.hp], '#FF8A8A'); }
      } else {
        w.hp--; D.sfx('stomp'); gra.wstrzas = 4;
        if (w.hp <= 0) { w.martwy = 1; czastki(w.x + w.w / 2, w.y + w.h / 2, 10, koloryWroga(w.typ), { sila: 1.6 }); }
      }
    } else if (w.typ !== 'creeper' || w.lont < 0) zranGracza(1, dx > 0 ? 1 : -1);
    else if (w.typ === 'creeper' && w.lont >= 0) zranGracza(1, dx > 0 ? 1 : -1);
  }
}
const koloryWroga = t => ({ zombie: ['#4E9A48', '#2E8B7F', '#3B2F8A'], szkielet: ['#C6C6C6', '#8F8F8F'], slime: ['#6FCF5A', '#3F8F33'], pillager: ['#9AA0A0', '#2F353A'], creeper: ['#5DB85D', '#2E7D2E'], boss: ['#D8D8D8', '#2F353A'] }[t] || ['#fff']);

function wybuch(x, y, r) {
  D.sfx('wybuch'); gra.wstrzas = 14; gra.blysk = 6;
  czastki(x, y, 30, ['#FFFFFF', '#FFDB4A', '#FF8C1A', '#555555', '#222222'], { sila: 3, czas: 1.4, grav: .05 });
  P.czastki.push({ x, y, vx: 0, vy: 0, k: '#fff', z: .35, t: 0, r: 0, grav: 0, kolo: r });
  const p = gracz;
  if (!p.martwy && Math.hypot(p.x + p.w / 2 - x, p.y + p.h / 2 - y) < r + 6) { zranGracza(2, p.x + p.w / 2 > x ? 1 : -1); }
  for (const w of P.wrogowie) if (!w.martwy && w.typ !== 'boss' && Math.hypot(w.x + w.w / 2 - x, w.y + w.h / 2 - y) < r) { w.martwy = 1; w.hp = 0; w.lont = -1; czastki(w.x + w.w / 2, w.y + w.h / 2, 6, koloryWroga(w.typ)); }
}
function pokonajBossa(w) {
  w.martwy = 1; P.bossPokonany = true; P.bossAktywny = false;
  czastki(w.x + w.w / 2, w.y + w.h / 2, 40, ['#D8D8D8', '#2F353A', '#FFE066', '#FFFFFF'], { sila: 2.4, czas: 1.6 });
  D.sfx('koniecPoziomu'); D.grajMuzyke(P.def.muzyka);
  const d = P.def.dzwonPoBossie;
  if (d) { P.dzwon = { x: d.x * T + 2, y: d.y * T, w: 12, h: 11, kat: 0, v: 0, pojawia: 1 }; napis(d.x * T - 20, d.y * T - 12, 'Dzwon odzyskany!', '#FFE066'); }
}

function aktualizujStrzaly() {
  for (let i = P.strzaly.length - 1; i >= 0; i--) {
    const s = P.strzaly[i]; s.z += 1 / 60; s.vy += .025; s.x += s.vx; s.y += s.vy;
    const ch = kafel(Math.floor((s.x + (s.vx > 0 ? s.w : 0)) / T), Math.floor((s.y + 1) / T));
    if (s.z > 3 || staly(ch)) { P.strzaly.splice(i, 1); czastki(s.x + 4, s.y + 1, 3, ['#8B5E34', '#EDEDED'], { sila: .6 }); continue; }
    if (!gracz.martwy && koliduje(gracz, s)) { P.strzaly.splice(i, 1); zranGracza(1, s.vx > 0 ? 1 : -1); }
  }
}
function aktualizujPlatformy() {
  for (const pl of P.platformy) {
    const nx = pl.typ === 'm' ? pl.x0 + Math.sin(P.t * pl.om + pl.f) * pl.A : pl.x0;
    const ny = pl.typ === 'n' ? pl.y0 + Math.sin(P.t * pl.om + pl.f) * pl.A : pl.y0;
    pl.dx = nx - pl.x; pl.dy = ny - pl.y; pl.x = nx; pl.y = ny;
  }
}
function aktualizujCzastki() {
  for (let i = P.czastki.length - 1; i >= 0; i--) {
    const c = P.czastki[i]; c.t += 1 / 60;
    if (c.t > c.z) { P.czastki.splice(i, 1); continue; }
    c.vy += c.grav; c.x += c.vx; c.y += c.vy;
  }
}

/* ------------------------------------------------------------------ ukończenie poziomu */
function ukonczPoziom() {
  const p = gracz; p.wygrana = 1; p.vx = 0;
  P.dzwon.v = .35; D.sfx('dzwon'); D.stopMuzyke();
  gra.stan = 'koniecPoziomu'; gra.timer = 0;
  if (gra.poziomNr + 1 > gra.postep) { gra.postep = Math.min(window.POZIOMY.length - 1, gra.poziomNr + 1); localStorage.setItem('gra-postep', gra.postep); }
  czastki(P.dzwon.x + 6, P.dzwon.y + 6, 20, ['#FFE066', '#FFF3B0', '#E8B42A'], { grav: .02, sila: 1.6, czas: 1.5 });
}
function nastepnyPoziom() {
  if (gra.poziomNr + 1 >= window.POZIOMY.length) { gra.stan = 'zwyciestwo'; gra.timer = 0; gra.ukonczono = true; D.grajMuzyke('zwyciestwo'); if (gra.szmaragdy > gra.rekord) { gra.rekord = gra.szmaragdy; localStorage.setItem('gra-rekord', gra.rekord); } return; }
  gra.poziomNr++; startPoziomu();
}
function startPoziomu() {
  wczytajPoziom(gra.poziomNr, null);
  gra.stan = 'karta'; gra.timer = 0; D.stopMuzyke();
}
function nowaGra(odPoziomu = 0) {
  gra.poziomNr = odPoziomu; gra.zycia = 3; gra.szmaragdy = 0; gra.czas = 0;
  gra.stan = 'intro'; gra.timer = 0; D.stopMuzyke();
  if (odPoziomu > 0) startPoziomu();
}

/* ------------------------------------------------------------------ główna aktualizacja */
function aktualizuj() {
  gra.t += 1 / 60;
  if (wej.wycisz()) { const m = D.wycisz(); if (P) napis(kamera.x + 120, kamera.y + 20, m ? 'Dźwięk wyłączony' : 'Dźwięk włączony'); }
  switch (gra.stan) {
    case 'tytul': {
      D.grajMuzyke('tytul');
      gra.tytulT += 1 / 60;
      const opcje = opcjeMenu();
      if (wej.menuGora()) { gra.menu = (gra.menu + opcje.length - 1) % opcje.length; D.sfx('menu'); }
      if (wej.menuDol()) { gra.menu = (gra.menu + 1) % opcje.length; D.sfx('menu'); }
      if (wej.ok()) { D.sfx('wybor'); opcje[gra.menu].akcja(); }
      if (Math.random() < .004) D.sfx('kurczak');
      break; }
    case 'sterowanie': if (wej.ok() || wej.pauza()) { gra.stan = 'tytul'; D.sfx('menu'); } break;
    case 'intro': gra.timer += 1 / 60; if (wej.ok() || gra.timer > 14) { startPoziomu(); } break;
    case 'karta': gra.timer += 1 / 60; if (wej.ok() || gra.timer > 3.2) { gra.stan = 'gra'; D.grajMuzyke(P.def.muzyka); } break;
    case 'gra': {
      if (wej.pauza()) { gra.stan = 'pauza'; gra.menu = 0; D.sfx('pauza'); break; }
      P.t += 1 / 60; gra.czas += 1 / 60;
      aktualizujPlatformy();
      aktualizujGracza();
      for (let i = P.wrogowie.length - 1; i >= 0; i--) { const w = P.wrogowie[i]; aktualizujWroga(w); if (w.martwy > 40) P.wrogowie.splice(i, 1); }
      aktualizujStrzaly(); aktualizujCzastki();
      for (const it of P.przedmioty) it.faza++;
      for (const n of P.npc) { n.blisko = odl(n, gracz) < 34; if (n.blisko) n.pokaz = Math.min(1, n.pokaz + .1); else n.pokaz = Math.max(0, n.pokaz - .1); n.dir = gracz.x > n.x ? 1 : -1; }
      if (P.boss && !P.bossAktywny && !P.boss.martwy && Math.abs(gracz.x - P.boss.x) < 150 && Math.abs(gracz.y - P.boss.y) < 60) { P.bossAktywny = true; D.grajMuzyke(P.def.muzykaBoss || 'boss'); D.sfx('boss'); napis(P.boss.x - 24, P.boss.y - 14, 'Kapitan Pillagerów!', '#FF8A8A'); }
      if (P.def.ciemnosc && Math.random() < .004) D.sfx('kropla');
      // kamera
      const cx = gracz.x + gracz.w / 2 - W / 2 + gracz.dir * 18, cy = gracz.y + gracz.h / 2 - H / 2 + 12;
      kamera.x += (klamra(cx, 0, P.szer * T - W) - kamera.x) * .1;
      kamera.y += (klamra(cy, 0, P.wys * T - H) - kamera.y) * .1;
      break; }
    case 'pauza': {
      const opcje = [
        { n: 'Wznów', a: () => { gra.stan = 'gra'; } },
        { n: () => 'Dźwięk: ' + (D.czyWyciszone() ? 'wył.' : 'wł.'), a: () => D.wycisz() },
        { n: 'Wyjdź do menu', a: () => { gra.stan = 'tytul'; gra.menu = 0; D.stopMuzyke(); } },
      ];
      if (wej.pauza()) { gra.stan = 'gra'; D.sfx('menu'); }
      if (wej.menuGora()) { gra.menu = (gra.menu + 2) % 3; D.sfx('menu'); }
      if (wej.menuDol()) { gra.menu = (gra.menu + 1) % 3; D.sfx('menu'); }
      if (wej.ok()) { D.sfx('wybor'); opcje[gra.menu].a(); }
      gra.opcjePauzy = opcje;
      break; }
    case 'koniecPoziomu': {
      gra.timer += 1 / 60; P.t += 1 / 60;
      aktualizujCzastki(); aktualizujGracza(); for (const it of P.przedmioty) it.faza++;
      if (P.dzwon) { P.dzwon.kat += P.dzwon.v; P.dzwon.v -= P.dzwon.kat * .02; P.dzwon.v *= .995; }
      if (gra.timer > 2 && (wej.ok() || gra.timer > 6)) nastepnyPoziom();
      break; }
    case 'gameover': gra.timer += 1 / 60; if (gra.timer > 1.2 && wej.ok()) { gra.zycia = 3; gra.szmaragdy = gra.szmaragdyPoziomu; startPoziomu(); } break;
    case 'zwyciestwo': gra.timer += 1 / 60; if (gra.timer > 3 && wej.ok()) { gra.stan = 'tytul'; gra.menu = 0; D.stopMuzyke(); } break;
  }
  if (gra.wstrzas > 0) gra.wstrzas--;
  if (gra.blysk > 0) gra.blysk--;
  for (const k in wcisniete) wcisniete[k] = false;
  tap = false;
}
function opcjeMenu() {
  const o = [{ n: 'Nowa gra', akcja: () => nowaGra(0) }];
  if (gra.postep > 0) o.push({ n: 'Kontynuuj: poziom ' + (gra.postep + 1), akcja: () => nowaGra(gra.postep) });
  o.push({ n: 'Sterowanie', akcja: () => { gra.stan = 'sterowanie'; } });
  o.push({ n: () => 'Dźwięk: ' + (D.czyWyciszone() ? 'wył.' : 'wł.'), akcja: () => D.wycisz() });
  return o;
}

/* ------------------------------------------------------------------ rysowanie */
function rysujKafle(cx, cy) {
  const x0 = Math.max(0, Math.floor(cx / T)), x1 = Math.min(P.szer - 1, Math.floor((cx + W) / T) + 1);
  const y0 = Math.max(0, Math.floor(cy / T)), y1 = Math.min(P.wys - 1, Math.floor((cy + H) / T) + 1);
  const lawaKl = (P.t * 2.5 | 0) % 2 ? TEX.lawa2 : TEX.lawa;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const ch = P.k[ty][tx], d = KAFLE[ch]; if (!d || d.niewidz) continue;
    const x = tx * T - cx, y = ty * T - cy, w = G.szum(tx, ty, 5) * 3 | 0;
    if (d.kolce) { g.drawImage(G.KOLCE, x, y + 13); continue; }
    if (d.pochodnia) { g.drawImage(G.POCHODNIA, x + 4, y + 4); if ((P.t * 10 | 0) % 2) { g.fillStyle = '#FFF3A0'; g.fillRect(x + 6 + ((P.t * 7 | 0) % 2), y + 4, 1, 1); } continue; }
    if (d.lawa) { g.drawImage(lawaKl[w], x, y); if (Math.random() < .002) P.czastki.push({ x: tx * T + los(2, 14), y: ty * T + 2, vx: 0, vy: -.6, k: '#FFC23A', z: .8, t: 0, r: 2, grav: 0 }); continue; }
    if (!d.tex) continue;
    g.drawImage(TEX[d.tex][w], x, y);
    if (d.staly && ty > 0 && P.k[ty - 1][tx] === 'V') { g.fillStyle = 'rgba(255,140,20,.25)'; g.fillRect(x, y, T, 2); }
  }
}
function rysujByt(spr, e, cx, cy, ox = 0, oy = 0) { g.drawImage(spr, Math.round(e.x - cx + ox), Math.round(e.y - cy + oy)); }

function rysujSwiat() {
  const wst = gra.wstrzas > 0 ? (Math.random() - .5) * gra.wstrzas * .6 : 0;
  const cx = Math.round(kamera.x + wst), cy = Math.round(kamera.y + wst * .5);
  G.rysujTlo(g, P.def.motyw, W, H, kamera.x, kamera.y, gra.t, (P.wys - 2) * T - kamera.y);
  rysujKafle(cx, cy);
  for (const pl of P.platformy) g.drawImage(G.PLATFORMA, Math.round(pl.x - cx), Math.round(pl.y - cy));
  for (const o of P.ogniska) g.drawImage(o.aktywne ? G.OGNISKO[(P.t * 8 | 0) % 2] : G.OGNISKO_ZGASZONE, Math.round(o.x - cx), Math.round(o.y - cy + (o.aktywne ? 0 : 6)));
  if (P.dzwon) {
    const d = P.dzwon; g.save(); g.translate(Math.round(d.x - cx + 6), Math.round(d.y - cy)); g.rotate(d.kat); g.drawImage(G.DZWON, -6, 0); g.restore();
    if (d.pojawia) { g.fillStyle = 'rgba(255,230,120,.25)'; g.fillRect(Math.round(d.x - cx - 4), Math.round(d.y - cy - 4), 20, 20); }
  }
  for (const it of P.przedmioty) {
    const bob = Math.round(Math.sin(it.faza / 12) * 1.5);
    if (it.typ === 'szmaragd') rysujByt(G.SZMARAGD[(it.faza / 6 | 0) % 6], it, cx, cy, 0, bob);
    else if (it.typ === 'jablko') rysujByt(G.JABLKO, it, cx, cy, 0, bob);
    else rysujByt(G.TOTEM, it, cx, cy, 0, bob);
  }
  for (const n of P.npc) {
    if (n.kurczak) rysujByt(G.KURCZAK[(P.t * 4 | 0) % 2], n, cx, cy);
    else rysujByt(G.NPC[n.dir > 0 ? 1 : 0], n, cx, cy);
  }
  for (const w of P.wrogowie) rysujWroga(w, cx, cy);
  for (const s of P.strzaly) {
    g.save(); g.translate(Math.round(s.x - cx + 4), Math.round(s.y - cy + 1)); g.rotate(Math.atan2(s.vy, Math.abs(s.vx)) * (s.vx < 0 ? -1 : 1)); g.drawImage(G.STRZALA[s.vx < 0 ? 0 : 1], -4, -1); g.restore();
  }
  rysujGracza(cx, cy);
  for (const c of P.czastki) {
    if (c.s) { C.tekst(g, c.s, Math.round(c.x - cx), Math.round(c.y - cy), c.k, { cien: '#000' }); continue; }
    if (c.kolo) { g.globalAlpha = 1 - c.t / c.z; g.fillStyle = '#FFF3A0'; const r = c.kolo * (c.t / c.z); g.beginPath(); g.arc(c.x - cx, c.y - cy, r, 0, 7); g.fill(); g.globalAlpha = 1; continue; }
    g.globalAlpha = klamra(1.5 - c.t / c.z, 0, 1); g.fillStyle = c.k; g.fillRect(Math.round(c.x - cx), Math.round(c.y - cy), c.r, c.r);
  }
  g.globalAlpha = 1;
  if (P.def.ciemnosc) rysujCiemnosc(cx, cy);
  if (gra.blysk > 0) { g.fillStyle = `rgba(255,255,255,${gra.blysk / 12})`; g.fillRect(0, 0, W, H); }
  // dymki NPC
  for (const n of P.npc) if (n.pokaz > 0 && n.tekst) rysujDymek(n, cx, cy);
}
function rysujWroga(w, cx, cy) {
  const kl = (w.anim | 0) % 2, dir = w.dir > 0 ? 1 : 0;
  if (w.martwy) {
    g.globalAlpha = Math.max(0, 1 - w.martwy / 30);
    const s = 1 - w.martwy / 40;
    let spr = sprWroga(w, kl, dir); if (spr) g.drawImage(spr, Math.round(w.x - cx + w.w / 2 - spr.width * s / 2), Math.round(w.y - cy + w.h - spr.height * s), Math.round(spr.width * s), Math.round(spr.height * s));
    g.globalAlpha = 1; return;
  }
  if (w.typ === 'slime') {
    const sq = w.sq, sw = 12 + sq * 4, sh = 10 - sq * 3;
    g.drawImage(G.SLIME, Math.round(w.x - cx + 6 - sw / 2), Math.round(w.y - cy + 10 - sh), Math.round(sw), Math.round(sh)); return;
  }
  if (w.typ === 'creeper') {
    const s = w.lont >= 0 ? 1 + w.lont * .35 : 1, spr = (w.lont >= 0 && (w.lont * 10 | 0) % 2) ? G.CREEPER_BIALY : G.CREEPER[kl];
    g.drawImage(spr, Math.round(w.x - cx + 4 - 4 * s), Math.round(w.y - cy + 21 - 22 * s), Math.round(8 * s), Math.round(22 * s)); return;
  }
  const spr = sprWroga(w, kl, dir);
  if (w.typ === 'boss') { if (w.ranny > 0 && (w.ranny / 4 | 0) % 2) { g.drawImage(G.BOSS_BIALY[dir], Math.round(w.x - cx - 3), Math.round(w.y - cy)); return; } g.drawImage(spr, Math.round(w.x - cx - 3), Math.round(w.y - cy)); return; }
  rysujByt(spr, w, cx, cy, w.typ === 'szkielet' ? (dir ? -2 : -1) : -2, w.typ === 'szkielet' || w.typ === 'zombie' || w.typ === 'pillager' ? 0 : 0);
}
function sprWroga(w, kl, dir) {
  switch (w.typ) {
    case 'zombie': return G.ZOMBIE[kl][dir];
    case 'szkielet': return G.SZKIELET[kl][dir];
    case 'pillager': return G.PILLAGER[kl][dir];
    case 'boss': return G.BOSS[kl][dir];
    case 'creeper': return G.CREEPER[kl];
    case 'slime': return G.SLIME;
  }
}
function rysujGracza(cx, cy) {
  const p = gracz;
  if (p.martwy) { g.globalAlpha = Math.max(0, 1 - p.martwy / 70); g.drawImage(G.GRACZ.skok[p.dir > 0 ? 1 : 0], Math.round(p.x - cx - 1), Math.round(p.y - cy - 1)); g.globalAlpha = 1; return; }
  if (p.nietykalny > 0 && (p.nietykalny / 3 | 0) % 2) return;
  let kl;
  if (p.drabina) kl = (p.anim / 1 | 0) % 2 ? 'krok1' : 'stoj';
  else if (!p.naZiemi) kl = 'skok';
  else if (p.vx !== 0) kl = ['stoj', 'krok1', 'stoj', 'krok2'][(p.anim | 0) % 4];
  else kl = 'stoj';
  if (p.wygrana) kl = (gra.timer * 6 | 0) % 2 ? 'skok' : 'stoj';
  g.drawImage(G.GRACZ[kl][p.dir > 0 ? 1 : 0], Math.round(p.x - cx - 1), Math.round(p.y - cy - 1));
}
function rysujCiemnosc(cx, cy) {
  gc.globalCompositeOperation = 'source-over';
  gc.fillStyle = `rgba(4,2,8,${P.def.ciemnosc})`; gc.fillRect(0, 0, W, H);
  gc.globalCompositeOperation = 'destination-out';
  const swiatlo = (x, y, r, sila = 1) => {
    if (x < -r || y < -r || x > W + r || y > H + r) return;
    const gr = gc.createRadialGradient(x, y, r * .15, x, y, r);
    gr.addColorStop(0, `rgba(0,0,0,${sila})`); gr.addColorStop(.6, `rgba(0,0,0,${sila * .55})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    gc.fillStyle = gr; gc.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const mig = Math.sin(gra.t * 11) * 2;
  swiatlo(gracz.x + gracz.w / 2 - cx, gracz.y + gracz.h / 2 - cy, 74);
  for (const p of P.pochodnie) swiatlo(p.x * T + 8 - cx, p.y * T + 6 - cy, 46 + mig);
  for (const l of P.lawa) if (l.y === 0 || P.k[l.y - 1][l.x] !== 'V') swiatlo(l.x * T + 8 - cx, l.y * T + 2 - cy, 24, .9);
  for (const l of P.glow) swiatlo(l.x * T + 8 - cx, l.y * T + 8 - cy, 40);
  for (const o of P.ogniska) if (o.aktywne) swiatlo(o.x + 8 - cx, o.y - cy, 44 + mig);
  for (const c of P.czastki) if (c.kolo) swiatlo(c.x - cx, c.y - cy, 90, 1);
  g.drawImage(ciemnoscPlotno, 0, 0);
  // ciepła poświata pochodni
  g.globalCompositeOperation = 'lighter';
  for (const p of P.pochodnie) {
    const x = p.x * T + 8 - cx, y = p.y * T + 6 - cy; if (x < -50 || x > W + 50) continue;
    const gr = g.createRadialGradient(x, y, 2, x, y, 30 + mig); gr.addColorStop(0, 'rgba(255,150,50,.22)'); gr.addColorStop(1, 'rgba(255,120,30,0)');
    g.fillStyle = gr; g.fillRect(x - 34, y - 34, 68, 68);
  }
  g.globalCompositeOperation = 'source-over';
}
function rysujDymek(n, cx, cy) {
  const linie = C.lamTekst(n.tekst, 150), szer = Math.max(...linie.map(C.szerokoscTekstu)) + 8, wys = linie.length * 10 + 6;
  let x = Math.round(n.x - cx + n.w / 2 - szer / 2), y = Math.round(n.y - cy - wys - 8);
  x = klamra(x, 2, W - szer - 2); y = Math.max(2, y);
  g.globalAlpha = n.pokaz;
  g.fillStyle = '#000'; g.fillRect(x - 1, y - 1, szer + 2, wys + 2);
  g.fillStyle = '#F8F0D8'; g.fillRect(x, y, szer, wys);
  g.fillStyle = '#F8F0D8'; g.fillRect(Math.round(n.x - cx + n.w / 2 - 2), y + wys, 4, 3); g.fillStyle = '#000'; g.fillRect(Math.round(n.x - cx + n.w / 2 - 2), y + wys + 3, 4, 1);
  linie.forEach((l, i) => C.tekst(g, l, x + 4, y + 3 + i * 10, '#2A1E12'));
  g.globalAlpha = 1;
}
function rysujHUD() {
  for (let i = 0; i < 3; i++) g.drawImage(G.SERCE[i < gracz.hp ? 0 : 1], 4 + i * 9, 4);
  g.drawImage(G.IKONA_SZMARAGD, W / 2 - 18, 4);
  C.tekst(g, String(gra.szmaragdy), W / 2 - 7, 3, '#FFFFFF', { cien: '#000' });
  g.drawImage(G.PORTRET, W - 30, 3);
  C.tekst(g, '×' + gra.zycia, W - 20, 3, '#FFFFFF', { cien: '#000' });
  if (P.boss && P.bossAktywny && !P.boss.martwy) {
    C.tekst(g, 'KAPITAN', W / 2, 16, '#FF8A8A', { wyr: 'srodek', cien: '#000' });
    for (let i = 0; i < 3; i++) g.drawImage(G.SERCE[i < P.boss.hp ? 0 : 1], W / 2 - 13 + i * 9, 27);
  }
}
function panel(x, y, w, h) {
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x + 2, y + 2, w, h);
  g.fillStyle = '#C6C6C6'; g.fillRect(x, y, w, h);
  g.fillStyle = '#8B8B8B'; g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle = '#000'; g.fillRect(x, y, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x + w - 1, y, 1, h);
  g.fillStyle = '#FFFFFF'; g.fillRect(x + 1, y + 1, w - 2, 1); g.fillRect(x + 1, y + 1, 1, h - 2);
  g.fillStyle = '#555555'; g.fillRect(x + 1, y + h - 2, w - 2, 1); g.fillRect(x + w - 2, y + 1, 1, h - 2);
}
function przyciskMenu(x, y, w, s, aktywny) {
  g.fillStyle = '#000'; g.fillRect(x, y, w, 14);
  g.fillStyle = aktywny ? '#7A7AE0' : '#6F6F6F'; g.fillRect(x + 1, y + 1, w - 2, 12);
  g.fillStyle = aktywny ? '#A6A6FF' : '#A0A0A0'; g.fillRect(x + 1, y + 1, w - 2, 1); g.fillRect(x + 1, y + 1, 1, 12);
  g.fillStyle = aktywny ? '#4A4A9A' : '#555'; g.fillRect(x + 1, y + 12, w - 2, 1); g.fillRect(x + w - 2, y + 1, 1, 12);
  C.tekst(g, typeof s === 'function' ? s() : s, x + w / 2, y + 1, aktywny ? '#FFFFA0' : '#FFFFFF', { wyr: 'srodek', cien: '#3F3F3F' });
}

/* tytuł: łąka, Emeryk, jezioro lawy z kurczakiem na wysepce */
function rysujTytul() {
  const t = gra.tytulT;
  G.rysujTlo(g, 'wioska', W, H, t * 6, 0, gra.t, 140);
  const zy = 140;
  for (let x = 0; x < W; x += T) { g.drawImage(TEX.trawa[(x / T) % 3], x, zy); g.drawImage(TEX.dirt[(x / T + 1) % 3], x, zy + 16); g.drawImage(TEX.dirt[(x / T + 2) % 3], x, zy + 32); }
  // jezioro lawy
  const lawaKl = (t * 2.5 | 0) % 2 ? TEX.lawa2 : TEX.lawa;
  for (let x = 208; x < 304; x += T) { g.drawImage(lawaKl[(x / T) % 3], x, zy); g.drawImage(TEX.kamien[(x / T) % 3], x, zy + 16); }
  g.drawImage(TEX.kamien[1], 192, zy); g.drawImage(TEX.kamien[2], 304, zy);
  g.drawImage(TEX.kamien[0], 248, zy - 2, 16, 8);                    // wysepka
  g.drawImage(G.KURCZAK[(t * 5 | 0) % 2], 251, zy - 12 + (Math.sin(t * 9) > .7 ? -1 : 0));
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(256, zy, 4, 256, zy, 60); gr.addColorStop(0, 'rgba(255,140,40,.28)'); gr.addColorStop(1, 'rgba(255,100,20,0)');
  g.fillStyle = gr; g.fillRect(190, zy - 60, 130, 70);
  g.globalCompositeOperation = 'source-over';
  if (Math.random() < .3) { g.fillStyle = '#FFC23A'; g.fillRect(208 + Math.random() * 96 | 0, zy - 2 - (t * 20 % 10 | 0), 2, 2); }
  // Emeryk
  g.drawImage(G.GRACZ[(t * 2 | 0) % 6 === 0 ? 'krok1' : 'stoj'][1], 40, zy - 22);
  // pillager z dzwonem uciekający w tle
  const px = ((t * 14) % (W + 60)) - 30;
  g.drawImage(G.PILLAGER[(t * 8 | 0) % 2][1], px, zy - 24); g.drawImage(G.DZWON, px + 10, zy - 30, 8, 7);
  // tytuł
  C.tekst(g, 'EMERYK', W / 2, 18, '#FFE066', { wyr: 'srodek', skala: 3, cien: '#3F2A00' });
  C.tekst(g, 'i Skradziony Dzwon', W / 2, 52, '#FFFFFF', { wyr: 'srodek', cien: '#000' });
  const opcje = opcjeMenu();
  opcje.forEach((o, i) => przyciskMenu(W / 2 - 70, 72 + i * 17, 140, o.n, i === gra.menu));
  if (gra.rekord > 0) C.tekst(g, 'Rekord: ' + gra.rekord + ' szmaragdów', W / 2, H - 12, '#B4FFD0', { wyr: 'srodek', cien: '#000' });
  C.tekst(g, '♥ Kurczak z lawy', 232, zy + 22, '#FFB347', { wyr: 'srodek', cien: '#000' });
}
function rysujSterowanie() {
  G.rysujTlo(g, 'las', W, H, gra.t * 4, 0, gra.t);
  panel(20, 14, 280, 152);
  C.tekst(g, 'STEROWANIE', W / 2, 20, '#FFE066', { wyr: 'srodek', cien: '#000' });
  const l = ['← →  lub  A D  – ruch', '↑ / SPACJA / Z  – skok (dłużej = wyżej)', '↑ ↓  – drabiny', 'ESC / P  – pauza      M  – dźwięk', '', 'Skacz na potwory, żeby je pokonać.', 'Creepery po skoku syczą i wybuchają – uciekaj!', 'Zbieraj szmaragdy: 50 = dodatkowe życie.', 'Złote jabłko leczy, ognisko = punkt kontrolny.', 'Dotknij dzwonu, aby ukończyć poziom.'];
  l.forEach((s, i) => C.tekst(g, s, 30, 36 + i * 11, i < 4 ? '#FFFFFF' : '#DDDDDD', { cien: '#000' }));
  C.tekst(g, 'ENTER – powrót', W / 2, 150, '#FFFFA0', { wyr: 'srodek', cien: '#000' });
}
function rysujIntro() {
  G.rysujTlo(g, 'wioska', W, H, gra.t * 3, 0, gra.t);
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W, H);
  const tekst = 'W spokojnej wiosce mieszkał młody villager Emeryk. Pewnej nocy pillagerzy napadli na wioskę i ukradli jej największy skarb – dzwon, który ostrzegał mieszkańców przed niebezpieczeństwem.\n\nDorośli bali się ruszyć w pogoń. Ale nie Emeryk. Zabrał worek na szmaragdy i wyruszył przez las, jaskinie i kopalnie aż do posterunku pillagerów...';
  const linie = C.lamTekst(tekst, 280), ile = Math.min(linie.length, Math.floor(gra.timer * 2.2));
  linie.slice(0, ile).forEach((s, i) => C.tekst(g, s, 20, 22 + i * 11, '#F8F0D8'));
  g.drawImage(G.GRACZ.stoj[1], W / 2 - 6, 130);
  if ((gra.t * 2 | 0) % 2) C.tekst(g, 'ENTER – dalej', W / 2, 160, '#FFFFA0', { wyr: 'srodek', cien: '#000' });
}
function rysujKarte() {
  rysujSwiat();
  g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(0, 0, W, H);
  C.tekst(g, 'POZIOM ' + (gra.poziomNr + 1), W / 2, 40, '#FFE066', { wyr: 'srodek', skala: 2, cien: '#000' });
  C.tekst(g, P.def.nazwa, W / 2, 66, '#FFFFFF', { wyr: 'srodek', cien: '#000' });
  C.lamTekst(P.def.opis, 280).forEach((s, i) => C.tekst(g, s, W / 2, 92 + i * 11, '#DDDDDD', { wyr: 'srodek' }));
  g.drawImage(G.PORTRET, W / 2 - 16, 140); C.tekst(g, '× ' + gra.zycia, W / 2 - 4, 140, '#FFFFFF', { cien: '#000' });
}
function rysujKoniecPoziomu() {
  rysujSwiat(); rysujHUD();
  if (gra.timer > .8) {
    panel(60, 40, 200, 96);
    C.tekst(g, 'Poziom ukończony!', W / 2, 48, '#FFE066', { wyr: 'srodek', cien: '#000' });
    C.tekst(g, P.def.nazwa, W / 2, 62, '#FFFFFF', { wyr: 'srodek', cien: '#000' });
    C.tekst(g, 'Szmaragdy z poziomu: ' + (gra.szmaragdy - gra.szmaragdyPoziomu), W / 2, 84, '#B4FFD0', { wyr: 'srodek', cien: '#000' });
    C.tekst(g, 'Razem: ' + gra.szmaragdy, W / 2, 96, '#B4FFD0', { wyr: 'srodek', cien: '#000' });
    C.tekst(g, 'Czas: ' + czasStr(gra.czas), W / 2, 108, '#FFFFFF', { wyr: 'srodek', cien: '#000' });
    if (gra.timer > 2 && (gra.t * 2 | 0) % 2) C.tekst(g, 'ENTER – dalej', W / 2, 124, '#FFFFA0', { wyr: 'srodek', cien: '#000' });
  }
}
const czasStr = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function rysujGameOver() {
  rysujSwiat();
  g.fillStyle = 'rgba(40,0,0,.7)'; g.fillRect(0, 0, W, H);
  C.tekst(g, 'KONIEC GRY', W / 2, 50, '#FF5555', { wyr: 'srodek', skala: 2, cien: '#000' });
  C.tekst(g, 'Pillagerzy tym razem wygrali...', W / 2, 84, '#FFFFFF', { wyr: 'srodek', cien: '#000' });
  C.tekst(g, 'Szmaragdy: ' + gra.szmaragdy, W / 2, 100, '#B4FFD0', { wyr: 'srodek', cien: '#000' });
  if (gra.timer > 1.2 && (gra.t * 2 | 0) % 2) C.tekst(g, 'ENTER – spróbuj jeszcze raz', W / 2, 130, '#FFFFA0', { wyr: 'srodek', cien: '#000' });
}
function rysujZwyciestwo() {
  G.rysujTlo(g, 'wioska', W, H, gra.t * 5, 0, gra.t, 144);
  const zy = 144;
  for (let x = 0; x < W; x += T) { g.drawImage(TEX.trawa[(x / T) % 3], x, zy); g.drawImage(TEX.dirt[(x / T + 1) % 3], x, zy + 16); g.drawImage(TEX.dirt[(x / T) % 3], x, zy + 32); }
  // fajerwerki
  for (let i = 0; i < 5; i++) {
    const f = (gra.timer * .8 + i * .37) % 1, fx = 40 + i * 60, fy = 40 + (i % 2) * 20;
    if (f < .6) { g.fillStyle = '#FFF3A0'; g.fillRect(fx, zy - f / .6 * (zy - fy), 2, 3); }
    else { const r = (f - .6) / .4 * 22; g.fillStyle = ['#FF5555', '#55FF55', '#5555FF', '#FFFF55', '#FF55FF'][i]; for (let k = 0; k < 10; k++) g.fillRect(fx + Math.cos(k * .628) * r | 0, fy + Math.sin(k * .628) * r | 0, 2, 2); }
  }
  // dzwon na cokole, Emeryk, starszy, kurczak
  fill3(W / 2 - 8, zy); g.drawImage(G.DZWON, W / 2 - 6, zy - 34);
  g.drawImage(G.GRACZ.stoj[1], W / 2 - 40, zy - 22); g.drawImage(G.NPC[0], W / 2 + 20, zy - 27); g.drawImage(G.KURCZAK[(gra.t * 4 | 0) % 2], W / 2 + 46, zy - 10);
  panel(40, 8, 240, 60);
  C.tekst(g, 'DZWON WRÓCIŁ DO WIOSKI!', W / 2, 14, '#FFE066', { wyr: 'srodek', cien: '#000' });
  C.tekst(g, 'Emeryk został bohaterem.', W / 2, 28, '#FFFFFF', { wyr: 'srodek', cien: '#000' });
  C.tekst(g, 'Szmaragdy: ' + gra.szmaragdy + '   Czas: ' + czasStr(gra.czas), W / 2, 42, '#B4FFD0', { wyr: 'srodek', cien: '#000' });
  C.tekst(g, gra.szmaragdy >= gra.rekord ? 'NOWY REKORD!' : 'Rekord: ' + gra.rekord, W / 2, 54, '#FFFFA0', { wyr: 'srodek', cien: '#000' });
  if (gra.timer > 3 && (gra.t * 2 | 0) % 2) C.tekst(g, 'ENTER – menu', W / 2, 166, '#FFFFA0', { wyr: 'srodek', cien: '#000' });
}
function fill3(x, y) { g.drawImage(TEX.bruk[0], x, y - 16); g.drawImage(TEX.cDeski[0], x, y - 40, 16, 6); }
function rysujPauza() {
  rysujSwiat(); rysujHUD();
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, W, H);
  C.tekst(g, 'PAUZA', W / 2, 40, '#FFFFFF', { wyr: 'srodek', skala: 2, cien: '#000' });
  (gra.opcjePauzy || []).forEach((o, i) => przyciskMenu(W / 2 - 60, 74 + i * 17, 120, o.n, i === gra.menu));
}

function rysuj() {
  g.setTransform(1, 0, 0, 1, 0, 0);
  switch (gra.stan) {
    case 'tytul': rysujTytul(); break;
    case 'sterowanie': rysujSterowanie(); break;
    case 'intro': rysujIntro(); break;
    case 'karta': rysujKarte(); break;
    case 'gra': rysujSwiat(); rysujHUD(); break;
    case 'pauza': rysujPauza(); break;
    case 'koniecPoziomu': rysujKoniecPoziomu(); break;
    case 'gameover': rysujGameOver(); break;
    case 'zwyciestwo': rysujZwyciestwo(); break;
  }
  if (D.czyWyciszone() && gra.stan !== 'tytul') { C.tekst(g, '♪ wył.', W - 4, H - 12, '#AAAAAA', { wyr: 'prawo' }); }
}

/* ------------------------------------------------------------------ pętla */
let akum = 0, ost = performance.now();
function klatka(now) {
  akum += Math.min(100, now - ost); ost = now;
  let kroki = 0;
  while (akum >= 1000 / 60 && kroki < 4) { aktualizuj(); akum -= 1000 / 60; kroki++; }
  if (kroki === 4) akum = 0;
  rysuj();
  requestAnimationFrame(klatka);
}
requestAnimationFrame(klatka);

window.GRA = { gra, get poziom() { return P; }, get gracz() { return gracz; }, wczytajPoziom, nowaGra, startPoziomu, kamera, wej, kl };
})();
