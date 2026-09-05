/* poziomy.js — 5 ręcznie zaprojektowanych poziomów. Mapa budowana jest z pomocą małych funkcji
   (ziemia, platforma, dom, drzewo...), a wynik to siatka znaków czytana przez silnik.
   Zasady grywalności: skok max 2 kafle w górę, przerwa max 3 kafle, drabina sięga 1 kafel ponad półkę.
   Legenda kafli: G trawa, D dirt, # kamień, C bruk, P deski, N ciemne deski, L pień (tło), l liście, B cegły,
   O obsydian, Q/I/Y/E rudy, i glowstone, W bedrock, V lawa, K kaktus, H drabina, _ półka, = tory,
   * pochodnia, X niewidzialna ściana, F płotek, w okno, T tnt, M mech, ^ kolce (nacieki).
   Byty: @ start, j NPC, z zombie, c creeper, k szkielet, s slime, p pillager, b boss,
   e szmaragd, a złote jabłko, o totem, f ognisko (checkpoint), ! dzwon (meta), m/n ruchoma platforma, h kurczak. */
(() => {
'use strict';

let S, SZER, WYS;
function nowy(szer, wys) { SZER = szer; WYS = wys; S = Array.from({ length: wys }, () => Array(szer).fill(' ')); }
const put = (x, y, ch) => { if (x >= 0 && y >= 0 && x < SZER && y < WYS) S[y][x] = ch; };
const get = (x, y) => (x >= 0 && y >= 0 && x < SZER && y < WYS) ? S[y][x] : ' ';
function fill(x0, y0, x1, y1, ch) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, ch); }
function ziemia(x0, x1, y, gora = 'G', pod = 'D') { fill(x0, y, x1, y, gora); fill(x0, y + 1, x1, WYS - 1, pod); }
function dziura(x0, x1, y0 = 0) { fill(x0, y0, x1, WYS - 1, ' '); }
function rzad(x, y, s) { for (let i = 0; i < s.length; i++) if (s[i] !== '.') put(x + i, y, s[i]); }
function sciany() { fill(0, 0, 0, WYS - 1, 'X'); fill(SZER - 1, 0, SZER - 1, WYS - 1, 'X'); }
function szmaragdy(x, y, ile, krok = 1, luk = 0) {
  for (let i = 0; i < ile; i++) { const dy = luk ? Math.round(-luk * Math.sin(Math.PI * i / (ile - 1))) : 0; put(x + i * krok, y + dy, 'e'); }
}
function dom(x, y, w, h, okna = true) {                              // y = wiersz podłogi; dach nie wystaje poza ściany
  fill(x, y - h, x + w - 1, y - 1, 'P');
  fill(x, y - 1, x + w - 1, y - 1, 'C');
  fill(x + 1, y - h + 1, x + w - 2, y - 2, ' ');
  for (let i = 0; x + i * 2 <= x + w - 1 - i * 2; i++) fill(x + i * 2, y - h - 1 - i, x + w - 1 - i * 2, y - h - 1 - i, 'N');
  if (okna) { put(x, y - h + 1, 'w'); put(x + w - 1, y - h + 1, 'w'); }
}
function drzewo(x, y, h = 4, r = 2) {                                // pień jest tłem (można przez niego przejść)
  fill(x, y - h, x, y - 1, 'L');
  fill(x - r, y - h - 2, x + r, y - h, 'l'); fill(x - r + 1, y - h - 3, x + r - 1, y - h - 3, 'l');
}
function schody(x, y, ile, ch = 'C', kier = 1) {                     // schody w górę: 1,2,3... bloków
  for (let i = 0; i < ile; i++) fill(x + i * kier, y - 1 - i, x + i * kier, y - 1, ch);
}
function tory(x0, x1, y) { for (let x = x0; x <= x1; x++) if (get(x, y) === ' ') put(x, y, '='); }
function meta(x, y, ch = 'C') {                                      // dzwon pod belką, między słupkami (tło); y = wiersz podłoża
  fill(x - 2, y - 4, x + 2, y - 4, 'N');
  for (let r = y - 3; r <= y - 1; r++) { put(x - 2, r, '|'); put(x + 2, r, '|'); }
  fill(x - 1, y - 1, x + 1, y - 1, ch);
  put(x, y - 3, '!');
}
function drabina(x, y0, y1) { fill(x, y0, x, y1, 'H'); }
function mapa() { return S.map(r => r.join('')); }

const POZIOMY = [];

/* ============================================================ 1. WIOSKA (ziemia: wiersz 12) */
(() => {
  nowy(160, 14);
  ziemia(0, 159, 12);
  sciany();
  put(3, 11, '@');
  put(6, 11, 'h');
  put(9, 11, 'j');
  schody(12, 12, 3);                                                 // 3 stopnie na dach domu
  dom(15, 12, 8, 4);
  szmaragdy(16, 4, 6);
  put(25, 11, 'z');
  dziura(30, 32);
  rzad(35, 10, 'PPP'); szmaragdy(35, 8, 3);
  rzad(40, 8, 'PPP'); szmaragdy(40, 6, 3);
  put(45, 11, 's');
  schody(48, 12, 2, 'G'); fill(50, 10, 57, 10, 'G'); fill(50, 11, 57, 11, 'D');   // pagórek
  put(58, 11, 'G'); put(59, 11, 'G');
  szmaragdy(50, 8, 7, 1, 2);
  put(53, 9, 'z');
  put(62, 11, 'f');
  schody(64, 12, 3);                                                 // schody na dach drugiego domu
  dom(68, 12, 7, 4); put(74, 10, ' '); put(74, 9, ' '); szmaragdy(70, 10, 3); put(71, 4, 'a');
  put(80, 11, 'z');
  dziura(84, 86);
  drzewo(92, 12, 4, 2); szmaragdy(89, 10, 7, 1, 2);
  put(96, 11, 's'); put(99, 11, 'z');
  put(104, 11, 'F'); put(108, 11, 'F'); put(112, 11, 'F');
  szmaragdy(105, 10, 3, 3);
  dziura(116, 119);
  rzad(117, 10, 'PP');
  drzewo(124, 12, 3, 2);
  put(127, 11, 'z'); put(131, 11, 'z');
  schody(134, 12, 2);
  fill(136, 10, 140, 10, 'C'); fill(136, 11, 140, 11, 'C');
  szmaragdy(136, 8, 5);
  put(146, 11, 's');
  meta(152, 12);
  POZIOMY.push({
    nazwa: 'Wioska', motyw: 'wioska', muzyka: 'spokojna', mapa: mapa(),
    opis: 'Pillagerzy napadli na wioskę i ukradli nasz dzwon! Emeryk, młody villager, rusza w pogoń.',
    npc: { 9: 'Emeryku! Pillagerzy zabrali dzwon na swój posterunek. Skacz na potwory, żeby je pokonać, i zbieraj szmaragdy!' },
  });
})();

/* ============================================================ 2. LAS (ziemia: wiersz 14) */
(() => {
  nowy(190, 16);
  ziemia(0, 189, 14);
  sciany();
  put(3, 13, '@'); put(8, 13, 'j');
  drzewo(14, 14, 5, 2); drzewo(22, 14, 4, 2);
  put(18, 13, 's');
  szmaragdy(11, 12, 5, 1, 1);
  rzad(28, 12, 'lll'); rzad(33, 10, 'lll'); rzad(38, 8, 'lll'); szmaragdy(38, 6, 3);   // schodki z liści
  put(34, 9, 'k');
  dziura(42, 45);
  rzad(43, 12, 'PP');
  drzewo(50, 14, 6, 2);
  put(54, 13, 'c');
  szmaragdy(56, 12, 4);
  dziura(60, 61);
  fill(62, 13, 66, 13, 'G'); fill(62, 14, 66, 15, 'D');
  fill(67, 12, 70, 12, 'G'); fill(67, 13, 70, 15, 'D');
  put(69, 11, 'k');
  fill(71, 13, 74, 13, 'G'); fill(71, 14, 74, 15, 'D');
  put(78, 13, 'f');
  drzewo(84, 14, 5, 2); drzewo(92, 14, 4, 2);
  szmaragdy(82, 12, 5, 1, 2);
  put(88, 13, 'z'); put(90, 13, 's');
  rzad(96, 12, 'lll'); rzad(101, 10, 'lll'); rzad(106, 8, 'lll'); rzad(111, 6, 'lll'); put(112, 4, 'a');   // wysoka ścieżka
  rzad(116, 8, 'lll'); rzad(121, 11, 'lll');
  szmaragdy(101, 8, 3); szmaragdy(116, 6, 3);
  put(102, 13, 'c'); put(110, 13, 'z'); put(118, 13, 'c');
  dziura(124, 127);
  rzad(125, 12, 'PP');
  drzewo(132, 14, 5, 2);
  put(136, 13, 'k'); put(140, 13, 's'); put(144, 13, 's');
  fill(148, 12, 152, 12, 'G'); fill(148, 13, 152, 15, 'D');
  fill(153, 10, 157, 10, 'G'); fill(153, 11, 157, 15, 'D');
  szmaragdy(153, 8, 5, 1, 1);
  put(156, 9, 'k');
  fill(158, 12, 161, 12, 'G'); fill(158, 13, 161, 15, 'D');
  put(165, 13, 'c'); put(170, 13, 'z');
  drzewo(174, 14, 4, 2);
  rzad(170, 12, 'lll'); szmaragdy(170, 10, 3);
  meta(182, 14);
  POZIOMY.push({
    nazwa: 'Ciemny Las', motyw: 'las', muzyka: 'spokojna', mapa: mapa(),
    opis: 'Ślady prowadzą w głąb lasu. Zapada zmrok, a między drzewami czają się szkielety i... coś zielonego.',
    npc: { 8: 'Uważaj na creepery! Gdy zaczną syczeć, uciekaj — wybuchają! Skok na nie tylko je rozdrażnia.' },
  });
})();

/* ============================================================ 3. JASKINIA (podłoga: wiersz 18) */
(() => {
  nowy(200, 20);
  fill(0, 0, 199, 19, '#');
  fill(1, 4, 198, 17, ' ');
  sciany();
  for (let i = 0; i < 70; i++) { const x = 1 + (i * 37) % 198, y = i % 2 ? 18 : (i % 3 ? 3 : 1); put(x, y, 'IQQYEQ'[i % 6]); }
  put(3, 17, '@'); put(8, 17, 'j');
  put(6, 12, '*'); put(20, 12, '*');
  put(14, 17, 'z');
  fill(18, 17, 20, 18, 'V');                                          // jezioro lawy (3 kafle — do przeskoczenia)
  rzad(18, 16, '###'); szmaragdy(18, 14, 3);
  put(26, 17, 'c');
  fill(30, 16, 33, 17, '#'); fill(34, 14, 37, 17, '#'); put(35, 13, 'k');   // stopnie 2+2
  szmaragdy(30, 14, 3);
  fill(38, 17, 40, 18, 'V');
  fill(41, 15, 44, 17, '#');
  put(43, 11, '*');
  drabina(47, 7, 17); fill(48, 8, 60, 9, '#');                        // drabina na górną półkę
  put(50, 7, 'z'); szmaragdy(52, 6, 6);
  put(56, 4, 'i');
  fill(61, 10, 64, 10, '#'); fill(66, 12, 69, 12, '#');               // zejście schodkami nad lawą
  put(67, 11, 'k');
  fill(70, 14, 73, 14, '#');
  fill(61, 17, 76, 18, 'V');
  fill(74, 16, 77, 17, '#');
  put(80, 17, 'f');
  put(82, 12, '*');
  fill(84, 17, 86, 18, 'V'); rzad(85, 16, '_'); rzad(86, 14, '_'); szmaragdy(85, 12, 4);
  fill(89, 16, 92, 17, '#'); put(90, 15, 'c');
  fill(93, 14, 96, 17, '#'); put(94, 13, 'a');
  fill(97, 17, 105, 18, 'V');
  fill(98, 14, 99, 14, '#'); fill(101, 12, 102, 12, '#'); fill(104, 14, 105, 14, '#');   // filary nad lawą
  fill(106, 15, 110, 17, '#'); put(108, 14, 'z');
  put(112, 12, '*');
  fill(111, 17, 118, 18, 'V');
  rzad(113, 13, '###'); rzad(117, 11, '###'); szmaragdy(117, 9, 3);
  fill(119, 15, 122, 17, '#');
  put(121, 14, 'k');
  fill(124, 17, 132, 17, '^');                                        // szyb z naciekami
  rzad(124, 14, '_'); rzad(126, 12, '_'); rzad(128, 14, '_'); rzad(130, 12, '_'); rzad(132, 14, '_');
  szmaragdy(125, 10, 4, 2);
  fill(134, 16, 137, 17, '#'); put(136, 15, 'c');
  put(140, 12, '*');
  put(140, 17, 'f');
  fill(143, 17, 150, 18, 'V');
  fill(144, 16, 144, 17, '#'); fill(147, 14, 147, 17, '#'); fill(150, 16, 150, 17, '#');
  szmaragdy(144, 13, 7, 1, 2);
  put(147, 8, 'i');
  fill(153, 15, 157, 17, '#'); put(154, 14, 'z'); put(156, 14, 'z');
  fill(158, 17, 160, 18, 'V');
  drabina(163, 11, 17); fill(164, 12, 166, 17, '#'); put(165, 11, 'k');
  fill(167, 14, 170, 17, '#');
  fill(171, 16, 174, 17, '#');
  put(178, 17, 'c'); put(182, 17, 'z');
  put(180, 12, '*');
  put(186, 17, 's'); put(188, 17, 's');
  meta(192, 18, '#');
  POZIOMY.push({
    nazwa: 'Jaskinia', motyw: 'jaskinia', muzyka: 'jaskinia', mapa: mapa(), ciemnosc: .74,
    opis: 'Trop prowadzi pod ziemię. W ciemności słychać kapanie wody i syk... Trzymaj się światła pochodni.',
    npc: { 8: 'W ciemności widać tylko przy pochodniach. Lawa i nacieki zabijają natychmiast — trzymaj się z daleka! Wchodź na drabiny strzałką w górę.' },
  });
})();

/* ============================================================ 4. KOPALNIA (podłoga: wiersz 18) */
(() => {
  nowy(210, 20);
  fill(0, 0, 209, 19, '#');
  fill(1, 3, 208, 17, ' ');
  sciany();
  for (let i = 0; i < 60; i++) { const x = 1 + (i * 41) % 208; put(x, 18, 'IQYE'[i % 4]); put(x, 2, 'QIQY'[i % 4]); }
  put(3, 17, '@'); put(8, 17, 'j');
  tory(1, 26, 17);
  put(6, 13, '*'); put(24, 13, '*');
  put(15, 17, 'z'); put(20, 17, 'p');
  put(27, 17, 'P'); fill(28, 16, 28, 17, 'P'); fill(29, 14, 33, 14, 'P'); szmaragdy(29, 12, 5);   // schodki i półka
  fill(34, 17, 40, 18, 'V');
  put(37, 15, 'm');                                                    // ruchoma platforma nad lawą
  fill(41, 15, 44, 17, 'P'); put(43, 14, 'k');
  fill(45, 17, 55, 18, 'V');
  put(47, 15, 'm'); put(52, 13, 'm');
  fill(56, 13, 59, 17, 'P'); put(57, 12, 'p');
  szmaragdy(57, 10, 3, 1, 1);
  put(62, 12, '*');
  fill(60, 17, 66, 17, '^'); rzad(62, 15, '_'); rzad(65, 15, '_');
  fill(67, 15, 70, 17, 'P');
  put(72, 17, 'f');
  tory(71, 89, 17);
  put(78, 17, 'c'); put(84, 17, 'z'); put(88, 17, 'z');
  put(82, 13, '*');
  drabina(90, 7, 17); fill(91, 8, 100, 9, 'P');                        // pionowy szyb w górę
  fill(91, 12, 100, 17, '#');
  fill(101, 17, 108, 18, 'V');
  put(93, 7, 'p'); szmaragdy(95, 5, 5);
  put(98, 3, 'i');
  put(104, 8, 'n');                                                    // pionowa platforma w dół
  fill(109, 15, 113, 17, 'P'); put(111, 14, 'z');
  fill(114, 17, 124, 18, 'V');
  put(117, 14, 'm'); put(122, 12, 'm');
  fill(125, 13, 128, 17, 'P'); put(127, 12, 'k');
  fill(129, 17, 133, 17, '^');
  rzad(129, 14, '_'); rzad(131, 12, '_'); rzad(133, 14, '_');
  szmaragdy(129, 10, 5, 1, 1);
  fill(134, 15, 137, 17, 'P');
  put(139, 17, 'f');
  put(142, 13, '*');
  tory(138, 159, 17);
  put(146, 17, 'p'); put(152, 17, 'c'); put(157, 17, 'p');
  fill(148, 16, 150, 16, 'P'); put(149, 15, 'a');
  fill(160, 17, 172, 18, 'V');
  put(163, 16, 'm'); put(168, 16, 'm');
  fill(173, 14, 176, 17, 'P'); put(175, 13, 'k');
  fill(177, 17, 179, 18, 'V');
  fill(180, 15, 184, 17, 'P'); put(183, 14, 'p');
  fill(185, 17, 189, 17, '^');
  rzad(186, 14, '__');
  put(192, 13, '*');
  fill(190, 16, 200, 17, 'P');
  put(194, 15, 'z'); put(198, 15, 'z');
  szmaragdy(191, 13, 8);
  meta(204, 18, '#');
  POZIOMY.push({
    nazwa: 'Opuszczona Kopalnia', motyw: 'kopalnia', muzyka: 'jaskinia', mapa: mapa(), ciemnosc: .6,
    opis: 'Stare tory prowadzą przez zalane lawą szyby. Pillagerzy rozstawili tu straże z kuszami.',
    npc: { 8: 'Ruchome platformy przeniosą cię nad lawą. Uważaj też na nacieki (kolce) — jak lawa, zabijają od razu. Pillagerzy strzelają z kusz — przeskakuj strzały i skacz im na głowy!' },
  });
})();

/* ============================================================ 5. POSTERUNEK PILLAGERÓW (ziemia: wiersz 28) */
(() => {
  nowy(130, 30);
  ziemia(0, 129, 28, 'G', 'D');
  sciany();
  put(3, 27, '@'); put(8, 27, 'j');
  drzewo(14, 28, 4, 2);
  put(18, 27, 'p'); put(24, 27, 'z');
  dziura(28, 30); rzad(28, 26, 'PP');
  put(34, 27, 'p');
  fill(36, 26, 40, 27, 'C'); szmaragdy(36, 24, 5);
  put(43, 27, 'c');
  // wieża: ściany x=50 i x=65, wnętrze 51..64, podłoga (bruk) w wierszach 26-27
  const wx = 50, ww = 16, L = wx + 1, R = wx + ww - 2;
  fill(wx, 4, wx + ww - 1, 27, 'N');
  fill(L, 5, R, 25, ' ');
  fill(wx, 26, wx + ww - 1, 27, 'C');
  put(wx, 26, ' '); put(wx, 25, ' '); put(wx, 24, ' ');                 // wejście (3 kafle wysokości)
  // piętra co 4 wiersze; drabiny w narożnikach na przemian, każda sięga 1 kafel ponad piętro
  const pietra = [22, 18, 14, 10];
  let nizej = 26;
  pietra.forEach((py, i) => {
    fill(L, py, R, py, 'P');
    const lx = i % 2 === 0 ? L : R;
    drabina(lx, py - 1, nizej - 1);
    put(wx + 8, py - 1, i % 2 ? 'p' : 'z');
    szmaragdy(wx + 5, py - 2, 6);
    put(i % 2 === 0 ? R - 2 : L + 2, py - 2, '*');
    nizej = py;
  });
  put(R - 3, 9, 'a');
  // dach = arena bossa (20 kafli szerokości, ogrodzona)
  const ax0 = wx - 2, ax1 = wx + ww + 1;
  fill(ax0, 4, ax1, 4, 'N');
  fill(ax0 - 1, 0, ax0 - 1, 3, 'X'); fill(ax1 + 1, 0, ax1 + 1, 3, 'X');
  put(ax0, 3, 'F'); put(ax1, 3, 'F');
  drabina(L, 3, 9);                                                    // ostatnia drabina przez dach
  rzad(ax0 + 2, 2, '__'); rzad(ax1 - 3, 2, '__');
  szmaragdy(ax0 + 2, 0, 2); szmaragdy(ax1 - 3, 0, 2);
  put(wx + 9, 3, 'b');
  POZIOMY.push({
    nazwa: 'Posterunek Pillagerów', motyw: 'posterunek', muzyka: 'jaskinia', muzykaBoss: 'boss', mapa: mapa(),
    opis: 'Noc. Przed tobą wieża posterunku. Na jej szczycie Kapitan Pillagerów strzeże skradzionego dzwonu.',
    npc: { 8: 'Wspinaj się po drabinach na sam szczyt wieży. Kapitan jest twardy — skocz mu na głowę trzy razy!' },
    dzwonPoBossie: { x: wx + 8, y: 3 },
    tlo: [[L, 5, R, 25, '#1E140C', '#2A1D12']],                         // tylna ściana wieży
  });
})();

window.POZIOMY = POZIOMY;
// prosta walidacja: każdy poziom musi mieć start i metę (dzwon lub bossa)
POZIOMY.forEach((p, i) => {
  const s = p.mapa.join('\n');
  if (!s.includes('@')) console.error(`Poziom ${i + 1}: brak startu (@)`);
  if (!s.includes('!') && !s.includes('b')) console.error(`Poziom ${i + 1}: brak mety (!)`);
  if (p.mapa.some(r => r.length !== p.mapa[0].length)) console.error(`Poziom ${i + 1}: nierówne wiersze`);
});
})();
