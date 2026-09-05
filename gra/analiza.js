// Analiza grywalności poziomów: BFS po pozycjach "stania" (kafel x, wiersz podłoża y).
// Reguły zgodne z fizyką gry: skok do 2 kafli w górę, przerwa do 3 kafli, drabiny, półki, ruchome platformy (przybliżone).
const fs = require('fs');
global.window = {};
new Function(fs.readFileSync(process.argv[2] || 'gra/poziomy.js', 'utf8'))();

const STALE = new Set('#GDCPNlBOQIYEiWSKFRwTMU'.split(''));   // '|' i 'L' to tło
const POLKA = '_';
const SMIERTELNE = new Set(['V', '^']);                        // lawa i nacieki: zabijają, więc lądowanie tam nie liczy się jako "uwięzienie"

for (const [nr, p] of window.POZIOMY.entries()) {
  const M = p.mapa.map(r => r.split(''));
  const H = M.length, W = M[0].length;
  const at = (x, y) => (x < 0 || x >= W) ? 'X' : (y < 0 || y >= H) ? ' ' : M[y][x];
  const staly = (x, y) => STALE.has(at(x, y)) || at(x, y) === 'X';
  // ruchome platformy -> zbiór kafli, na których można stanąć
  const plat = new Set();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (M[y][x] === 'm') for (let d = -3; d <= 4; d++) plat.add((x + d) + ',' + y);
    if (M[y][x] === 'n') for (let d = -3; d <= 3; d++) for (let k = -1; k <= 1; k++) plat.add((x + k) + ',' + (y + d));
  }
  const podloze = (x, y) => staly(x, y) || at(x, y) === POLKA || plat.has(x + ',' + y);   // czy na kaflu (x,y) można stać (stopy na jego górze)
  const wolne = (x, y) => !staly(x, y) && !SMIERTELNE.has(at(x, y));                       // śmiertelny kafel też blokuje "zmieszczenie się" ciała — przejście przez niego = śmierć, nie realna pozycja
  const miesci = (x, y) => wolne(x, y - 1) && wolne(x, y - 2);                            // stojąc na y: ciało w y-1 i y-2
  const stoi = (x, y) => y < H && podloze(x, y) && miesci(x, y) && !SMIERTELNE.has(at(x, y));
  const spadnij = (x, y) => { // z powietrza w (x, y-1) spadaj aż do podłoża; null = śmierć/nic
    for (let yy = y; yy < H; yy++) { if (SMIERTELNE.has(at(x, yy))) return null; if (podloze(x, yy)) return miesci(x, yy) ? [x, yy] : null; }
    return null;
  };
  // sasiedzi(x,y): wszystkie pozycje osiągalne z (x,y) jednym ruchem (chód/skok/drabina) — używane zarówno w BFS, jak i do wykrywania pułapek
  function sasiedzi(x, y) {
    const wyn = [];
    const dod = (tx, ty) => { if (tx >= 0 && tx < W && ty >= 0 && ty < H) wyn.push([tx, ty]); };
    const lad = (tx, ty) => { if (!miesci(tx, ty)) return; const s = stoi(tx, ty) ? [tx, ty] : spadnij(tx, ty); if (s) dod(...s); };
    for (const dx of [-1, 1]) if (miesci(x + dx, y)) lad(x + dx, y);
    for (const [up, maxD] of [[2, 3], [1, 4], [0, 4], [-1, 5], [-2, 5], [-3, 6], [-4, 6], [-5, 6], [-6, 6]]) {
      for (const dir of [-1, 1]) for (let d = 1; d <= maxD; d++) {
        const tx = x + dir * d, ty = y - up;
        if (!wolne(x, y - 3) && up > 0) break;
        if (!miesci(tx, ty)) { if (staly(tx, ty - 1) || staly(tx, ty - 2)) break; else continue; }
        if (stoi(tx, ty)) dod(tx, ty); else if (up <= 0) { const s = spadnij(tx, ty); if (s) dod(...s); }
      }
    }
    if (at(x, y - 1) === 'H' || at(x, y) === 'H') {
      for (let yy = y - 1; yy >= 1; yy--) {
        if (at(x, yy) !== 'H' && at(x, yy + 1) !== 'H') break;
        if (!wolne(x, yy - 1)) break;
        for (const dx of [-1, 1]) if (miesci(x + dx, yy + 1)) lad(x + dx, yy + 1);
        if (stoi(x, yy + 1) || at(x, yy) === 'H') dod(x, yy + 1);
      }
    }
    return wyn;
  }
  let start = null, cele = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (M[y][x] === '@') start = spadnij(x, y + 1);
    if (M[y][x] === '!' || M[y][x] === 'b') cele.push([x, y]);
  }
  const klucz = (x, y) => x + ',' + y;
  const odw = new Set([klucz(...start)]), kolejka = [start];
  const dodaj = (x, y) => { if (x < 0 || x >= W || y < 0 || y >= H) return; const k = klucz(x, y); if (!odw.has(k)) { odw.add(k); kolejka.push([x, y]); } };
  while (kolejka.length) {
    const [x, y] = kolejka.shift();
    for (const [tx, ty] of sasiedzi(x, y)) dodaj(tx, ty);
  }
  const osiagalne = cele.filter(([cx, cy]) => [-1, 0, 1].some(dx => [0, 1, 2].some(dy => odw.has(klucz(cx + dx, cy + dy)))));
  // szmaragdy: osiągalny, jeśli jest pozycja stania w x±1 i y+1..y+3 (skok sięga 2 kafle nad stopy + wysokość ciała)
  let szm = 0, szmOk = 0, brak = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ('ea'.includes(M[y][x])) {
    szm++;
    const ok = [-1, 0, 1].some(dx => [1, 2, 3, 4].some(dy => odw.has(klucz(x + dx, y + dy))));
    if (ok) szmOk++; else brak.push(`${M[y][x]}(${x},${y})`);
  }
  // PUŁAPKI: pozycja osiągalna (z czegokolwiek), z której NIE MA żadnego ruchu do INNEJ pozycji (poza samą sobą) —
  // czyli gracz może tam wpaść, ale nie może się wydostać (studnia bez wyjścia).
  const pulapki = [];
  for (const k of odw) {
    const [x, y] = k.split(',').map(Number);
    const wyjscia = sasiedzi(x, y).filter(([tx, ty]) => tx !== x || ty !== y);
    if (wyjscia.length === 0) pulapki.push([x, y]);
  }
  console.log(`Poziom ${nr + 1} ${p.nazwa}: start ${start}, meta osiągalna: ${osiagalne.length}/${cele.length}, pozycji: ${odw.size}, przedmioty ${szmOk}/${szm}` + (brak.length ? `  NIEOSIĄGALNE: ${brak.join(' ')}` : '') + (pulapki.length ? `  *** PUŁAPKI (bez wyjścia): ${pulapki.map(([x,y])=>`(${x},${y})`).join(' ')}` : ''));
  if (process.argv.includes('-v')) {
    const out = M.map((r, y) => r.map((c, x) => odw.has(klucz(x, y)) && c === ' ' ? '·' : c).join(''));
    console.log(out.join('\n'));
  }
}
