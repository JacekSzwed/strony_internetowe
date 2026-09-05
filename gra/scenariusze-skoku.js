// scenariusze-skoku.js — wspólna lista syntetycznych scenariuszy skoku używana przez:
//   • gra/test-analiza.js       — czy mini-silnik analizatora daje oczekiwany wyrok (tabela zasięgów z AGENTS.md §4),
//   • gra/test-przegladarka.js  — czy wyrok analizatora zgadza się z PRAWDZIWYM silnikiem gry w Chromium.
// Geometria: podłoże w wierszu 10 (kolumny 4..20), przerwa d kafli (kolumny 21..20+d) z lawą na dnie, lądowanie w wierszu 10-up
// od kolumny 21+d. Opcjonalna przeszkoda: kafel '#' w kolumnie (21+kol) i wierszu (10+dy) — np. sufit nad trasą lotu.
const SZER = 40, WYS = 16, KRAWEDZ = 21;   // KRAWEDZ = pierwsza kolumna przerwy (piksel krawędzi = KRAWEDZ*16)

function mapa(s) {
  const M = Array.from({ length: WYS }, () => Array(SZER).fill(' '));
  for (let y = 0; y < WYS; y++) { M[y][0] = 'X'; M[y][SZER - 1] = 'X'; }
  for (let x = 4; x <= KRAWEDZ - 1; x++) M[10][x] = '#';
  for (let x = KRAWEDZ + s.d; x < SZER - 1; x++) M[10 - s.up][x] = '#';
  for (let x = KRAWEDZ; x < KRAWEDZ + s.d; x++) M[WYS - 1][x] = 'V';
  if (s.przeszkoda) { const [kol, dy] = s.przeszkoda; M[10 + dy][KRAWEDZ + kol] = '#'; }
  M[9][6] = '@'; M[10 - s.up - 1][SZER - 3] = '!';
  return M.map(r => r.join(''));
}

// oczekiwany wyrok „da się” wg tabeli zasięgów: +2 → 2 kafle | +1 i 0 → 3 | −1 i niżej → 4 (bez przeszkód)
const zasieg = up => up >= 2 ? 2 : up >= 0 ? 3 : 4;

const SCENARIUSZE = [];
// brzegowy: true = w domyślnym (szybkim) biegu test-przegladarka; pełny zestaw dopiero z --pelna
for (const up of [2, 1, 0, -1, -2]) for (let d = 1; d <= 5; d++) SCENARIUSZE.push({ nazwa: `${up >= 0 ? '+' : ''}${up} w górę, przerwa ${d}`, up, d, oczekiwane: d <= zasieg(up), brzegowy: d === zasieg(up) || d === zasieg(up) + 1 });
SCENARIUSZE.push({ nazwa: '+3 w górę, przerwa 1 (za wysoko)', up: 3, d: 1, oczekiwane: false, brzegowy: true });
// sufity nad trasą (płasko, przerwa 3): kafel dy nad podłożem w kolumnie kol przerwy. oczekiwane = null → „nieznane”, decyduje silnik
for (const kol of [0, 1, 2, 3]) for (const wys of [3, 4, 5]) SCENARIUSZE.push({ nazwa: `płasko 3, sufit ${wys} nad ziemią w kolumnie ${kol}`, up: 0, d: 3, przeszkoda: [kol, -wys], oczekiwane: wys >= 5 ? true : wys === 3 && kol <= 2 ? false : null, brzegowy: (wys === 3 && kol <= 2) || (wys === 4 && kol <= 1) || (wys === 5 && kol === 1) });
SCENARIUSZE.push({ nazwa: 'płasko 3, blok 1 wysoki tuż przed celem', up: 0, d: 3, przeszkoda: [3, -1], oczekiwane: null, brzegowy: false });
SCENARIUSZE.push({ nazwa: 'płasko 3, blok na wysokości głowy w kolumnie 2', up: 0, d: 3, przeszkoda: [2, -2], oczekiwane: null, brzegowy: false });
SCENARIUSZE.push({ nazwa: 'płasko 2, blok na wysokości głowy w kolumnie 1', up: 0, d: 2, przeszkoda: [1, -2], oczekiwane: null, brzegowy: false });

module.exports = { SCENARIUSZE, mapa, SZER, WYS, KRAWEDZ };
