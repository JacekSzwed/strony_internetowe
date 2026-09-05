// test-analiza.js — testy regresji analizatora poziomów (gra/analiza.js) na małych, syntetycznych mapach.
// Bez przeglądarki. Sprawdza, że mini-silnik analizatora daje wyroki zgodne z prawdziwą fizyką gry
// (zasięgi skoku z AGENTS.md §4) i że wykrywa znane błędy projektowe: półkę pod koroną drzewa blokującą korytarz
// (błąd z końca poziomu 2, commit „Ciemny Las: przejście pod drzewem”), studnie bez wyjścia, nieosiągalne szmaragdy.
// Uruchom: node gra/test-analiza.js
const { analizuj } = require('./analiza.js');

let ok = true;
const test = (nazwa, w, info = '') => { if (!w) ok = false; console.log(`${w ? 'OK  ' : 'BŁĄD'} ${nazwa}${info ? ' — ' + info : ''}`); };

// Mapa z rysunku: wiersze równej długości, '.' = powietrze (czytelniej niż spacje). Lewa i prawa krawędź świata są ścianą (X).
const mapa = rys => rys.trim().split('\n').map(r => r.trim().replace(/\./g, ' '));
const meta = w => w.osiagalne.length === w.cele.length && w.cele.length > 0;

/* ---------- 1. zasięg skoku: płasko (start na wierszu 10, przerwa d kafli, lądowanie na tym samym poziomie) ---------- */
function plasko(d, up = 0) {
  const H = 16, W = 40, M = Array.from({ length: H }, () => Array(W).fill(' '));
  for (let x = 4; x <= 20; x++) M[10][x] = '#';
  for (let x = 21 + d; x < W; x++) M[10 - up][x] = '#';
  for (let x = 21; x < 21 + d; x++) M[H - 1][x] = 'V';
  M[9][6] = '@'; M[10 - up - 1][W - 3] = '!';
  return M.map(r => r.join(''));
}
test('płasko: przerwa 3 kafle — da się', meta(analizuj(plasko(3))));
test('płasko: przerwa 4 kafle — NIE da się (bez pixel-perfect coyote)', !meta(analizuj(plasko(4))));
test('+1 w górę: przerwa 3 — da się', meta(analizuj(plasko(3, 1))));
test('+1 w górę: przerwa 4 — NIE da się', !meta(analizuj(plasko(4, 1))));
test('+2 w górę: przerwa 2 — da się', meta(analizuj(plasko(2, 2))));
test('+2 w górę: przerwa 3 — NIE da się', !meta(analizuj(plasko(3, 2))));
test('+3 w górę: nawet 1 kafel przerwy — NIE da się (max skok 2 kafle)', !meta(analizuj(plasko(1, 3))));
test('−2 w dół: przerwa 4 — da się', meta(analizuj(plasko(4, -2))));
test('−2 w dół: przerwa 5 — NIE da się', !meta(analizuj(plasko(5, -2))));

/* ---------- 2. sufit nad trasą skoku ---------- */
function sufit(kol, wys, d = 3) { const M = plasko(d).map(r => r.split('')); M[10 - wys][21 + kol] = '#'; return M.map(r => r.join('')); }
test('sufit 3 nad ziemią tuż za krawędzią blokuje skok przez 3 kafle', !meta(analizuj(sufit(0, 3))));
test('sufit 4 nad ziemią tuż za krawędzią też blokuje (głowa sięga 2,6 kafla; potwierdzone w silniku)', !meta(analizuj(sufit(0, 4))));
test('sufit 4 nad ziemią w 2. kolumnie przerwy blokuje (szczyt lotu = 2,6 kafla, głowa uderza)', !meta(analizuj(sufit(1, 4))));
test('sufit 5 nad ziemią nie przeszkadza', meta(analizuj(sufit(1, 5))));
test('blok na wysokości głowy w 3. kolumnie przerwy nie przeszkadza (lot już opada)', meta(analizuj(sufit(3, 3))));

/* ---------- 3. BŁĄD Z POZIOMU 2: półka z liści 2 nad ziemią, wchodząca pod koronę drzewa (kolumny 158–184 poziomu 2 przesunięte o −150) ---------- */
const STARE = mapa(`
  ........................................
  ........................................
  ........................................
  ........................................
  ........................................
  ........................................
  ........................................
  .......................lll..............
  ......................lllll.............
  ......................lllll.............
  ....................eeellll...NNNNN.....
  ........................L.....|.!.|.....
  ........GGGG........lll.L.....|...|.....
  ..@.....DDDD............L.....|CCC|.....
  GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG
  DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD
`);
const w1 = analizuj(STARE);
test('stara geometria (półka lll w wierszu 12 pod koroną) — meta NIEOSIĄGALNA (regresja poziomu 2)', !meta(w1), `meta ${w1.osiagalne.length}/${w1.cele.length}`);
test('stara geometria — analizator zgłasza problem', w1.problem);
test('stara geometria — gracz dochodzi do półki (kolumna 19), dalej nie', w1.odw.has('19,14') && !w1.odw.has('23,14'));

const NOWE = STARE.map(r => r.replace(/^(.{20})eee/, '$1   ').replace(/^(.{20})lll/, '$1   '));
// półka 3 nad ziemią, PRZED koroną, dostępna z pagórka (jak w poprawionym poziomie 2: rzad(165,11,'lll'), szmaragdy(165,9,3))
NOWE[11] = NOWE[11].slice(0, 15) + 'lll' + NOWE[11].slice(18);
NOWE[9] = NOWE[9].slice(0, 15) + 'eee' + NOWE[9].slice(18);
const w2 = analizuj(NOWE);
test('nowa geometria (półka 3 nad ziemią przed koroną) — meta osiągalna', meta(w2), `meta ${w2.osiagalne.length}/${w2.cele.length}`);
test('nowa geometria — wszystkie szmaragdy osiągalne (z pagórka na półkę)', w2.brak.length === 0, w2.brak.join(' '));
test('nowa geometria — bez pułapek i problemów', !w2.problem);

/* ---------- 4. studnie: 3 głęboka = pułapka (także 2 kafle szeroka!), 2 głęboka = wyjdzie, 3 głęboka z lawą = śmierć (nie pułapka) ---------- */
function studnia(glebokosc, dno = '#', szer = 2) {
  const H = 16, W = 30, M = Array.from({ length: H }, () => Array(W).fill(' '));
  for (let x = 0; x < W; x++) for (let y = 10; y < H; y++) M[y][x] = '#';
  for (let x = 12; x < 12 + szer; x++) for (let y = 10; y < 10 + glebokosc; y++) M[y][x] = ' ';
  for (let x = 12; x < 12 + szer; x++) M[10 + glebokosc][x] = dno;
  M[9][3] = '@'; M[9][W - 3] = '!';
  return M.map(r => r.join(''));
}
const s3 = analizuj(studnia(3));
test('studnia 3 głęboka, 2 szeroka — wykryta jako PUŁAPKA', s3.pulapki.length > 0 && s3.problem, `pułapki: ${JSON.stringify(s3.pulapki)}`);
test('studnia 3 głęboka, 1 szeroka — wykryta jako PUŁAPKA', analizuj(studnia(3, '#', 1)).pulapki.length > 0);
test('studnia 3 głęboka, 5 szeroka — wykryta jako PUŁAPKA', analizuj(studnia(3, '#', 5)).pulapki.length > 0);
test('studnia 2 głęboka — da się wyjść (brak pułapki)', analizuj(studnia(2)).pulapki.length === 0);
test('studnia 3 głęboka z lawą na dnie — śmierć, nie pułapka', !analizuj(studnia(3, 'V')).problem);
test('studnia 3 głęboka z naciekami ^ na dnie — śmierć, nie pułapka', !analizuj(studnia(3, '^')).problem);

/* ---------- 5. szmaragd poza zasięgiem ---------- */
const ZA_WYSOKO = mapa(`
  ..............................
  ..............................
  ..............................
  ...............e..............
  ..............................
  ..............................
  ..............................
  ..............................
  ..@........................!..
  ##############################
  ##############################
`);
const w5 = analizuj(ZA_WYSOKO);
test('szmaragd 6 kafli nad ziemią — NIEOSIĄGALNY', w5.brak.length === 1 && w5.problem, w5.brak.join(' '));

/* ---------- 6. drabina i półka `_` ---------- */
// jak w poziomach: drabina(x, y0, y1) sięga 1 kafel NAD górę półki, na którą prowadzi (drabina(47,7,17); fill(48,8,60,9,'#'))
const DRABINA = mapa(`
  ..............................
  ..............................
  ..............................
  ..........H...................
  ..........H#############...!..
  ..........H#############.#####
  ..........H...................
  ..........H...................
  ..@.......H...................
  ##############################
  ##############################
`);
test('drabina prowadzi na górną półkę → meta osiągalna', meta(analizuj(DRABINA)));

const POLKA = mapa(`
  ..............................
  ..............................
  ..............................
  ..............................
  ..............................
  ..............................
  ...........__________......!..
  ........................######
  ..@...........................
  ##############################
  ##############################
`);
test('półka `_` 3 nad ziemią — skok pionowy przez półkę → meta osiągalna', meta(analizuj(POLKA)));

/* ---------- 7. PRAWDZIWE MAPY: obecne poziomy są OK, a cofnięcie znanych poprawek musi być wykrywane ---------- */
const fs = require('fs'), path = require('path');
global.window = {};
new Function(fs.readFileSync(path.join(__dirname, 'poziomy.js'), 'utf8'))();
const POZIOMY = window.POZIOMY;
const podmien = (m, x, y, s) => m.map((r, yy) => yy === y ? r.slice(0, x) + s + r.slice(x + s.length) : r);
for (const [i, p] of POZIOMY.entries()) { const w = analizuj(p.mapa); test(`poziom ${i + 1} „${p.nazwa}”: meta i przedmioty osiągalne, bez pułapek`, !w.problem, `meta ${w.osiagalne.length}/${w.cele.length}, brak: ${w.brak.join(' ')}, pułapki: ${JSON.stringify(w.pulapki)}`); }
// poziom 2 (Ciemny Las), koniec: półka lll w wierszu 12 pod koroną drzewa(174) blokowała korytarz — commit „przejście pod drzewem”
let las = POZIOMY[1].mapa; las = podmien(las, 165, 12, '   '); las = podmien(las, 170, 12, 'lll'); las = podmien(las, 170, 10, 'eee');
const wLas = analizuj(las);
test('poziom 2 ze STARĄ półką pod koroną (rzad(170,12) + szmaragdy(170,10)) → meta NIEOSIĄGALNA', wLas.osiagalne.length === 0 && wLas.problem, `meta ${wLas.osiagalne.length}/${wLas.cele.length}`);
// poziom 5 (Posterunek), dach: półki `__` tuż przy słupkach X pozwalały wskoczyć na szczyt słupka (nad mapą jest powietrze!) i spaść za wieżę
let post = POZIOMY[4].mapa; post = podmien(post, 52, 2, '  '); post = podmien(post, 52, 0, '  '); post = podmien(post, 62, 2, '  '); post = podmien(post, 62, 0, '  ');
post = podmien(post, 50, 2, '__'); post = podmien(post, 50, 0, 'ee'); post = podmien(post, 66, 2, '__'); post = podmien(post, 66, 0, 'ee');
const wPost = analizuj(post);
test('poziom 5 ze STARYMI półkami przy słupkach → PUŁAPKA (teren za wieżą bez powrotu)', wPost.pulapki.length > 0 && wPost.pulapki.every(([x, y]) => y === 28 && x >= 66), `pułapki: ${wPost.pulapki.length} pozycji, np. ${JSON.stringify(wPost.pulapki.slice(0, 3))}`);

console.log(ok ? '\nWYNIK: analizator OK' : '\nWYNIK: BŁĘDY analizatora (patrz wyżej)');
process.exit(ok ? 0 : 1);
