// Analiza grywalności poziomów: BFS po pozycjach "stania" (kafel x, wiersz podłoża y).
// Skoki NIE są tabelką — analizator zawiera MINI-SILNIK: dokładną kopię fizyki gracza z gra.js (hitbox 10×21 px,
// SKOK/GRAW/MAX_SPAD/PREDKOSC, coyote time, krótki skok, kolizje ruszX/ruszY) i symuluje lot po pikselach. Dzięki temu widzi
// sufity, korony drzew i półki na trasie lotu (głowa uderza → skok się kończy), a nie tylko punkt lądowania.
// Zgodność mini-silnika z prawdziwą grą sprawdza gra/test-przegladarka.js (kilkadziesiąt scenariuszy skoku w Chromium).
//
// Użycie:  node gra/analiza.js            — raport dla wszystkich poziomów (kod wyjścia 1, gdy coś jest nie tak)
//          node gra/analiza.js -v         — dodatkowo mapy z zaznaczonymi (·) osiągalnymi pozycjami (kropka = powietrze nad stopami)
//          node gra/analiza.js --mapa 3   — wypisz mapę poziomu 3 z numeracją kolumn (do projektowania)
// Jako moduł:  const { analizuj } = require('./analiza');  analizuj(tablicaWierszy) → { problem, osiagalne, cele, brak, pulapki, trudne, odw, sasiedzi, ... }
const fs = require('fs');
const path = require('path');

const STALE = new Set('#GDCPNlBOQIYEiWSKFRwTMU'.split(''));   // '|' i 'L' to tło
const POLKA = '_';
const SMIERTELNE = new Set(['V', '^']);                        // lawa i nacieki: zabijają, więc lądowanie tam nie liczy się jako "uwięzienie"

function analizuj(mapa) {
  const M = mapa.map(r => r.split(''));
  const H = M.length, W = M[0].length;
  const at = (x, y) => (x < 0 || x >= W) ? 'X' : (y < 0 || y >= H) ? ' ' : M[y][x];   // jak kafel() w gra.js: nad i pod mapą jest powietrze (można stanąć na szczycie ściany sięgającej wiersza 0!)
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
  // ---- MINI-SILNIK: dokładna kopia fizyki gracza z gra.js (hitbox 10×21 px, SKOK, GRAW, MAX_SPAD, PREDKOSC, coyote time 6 klatek,
  //      ograniczenie vy do -1.8 po puszczeniu skoku, kolizje ruszX/ruszY, półki jednostronne). Zamiast tabeli zasięgu skoku
  //      analizator SYMULUJE lot po pikselach — dzięki temu wykrywa też sufity/korony drzew na trasie, o które uderza głowa.
  const T = 16, PW = 10, PH = 21, GRAW = .28, MAX_SPAD = 5, SKOK = -5, PREDKOSC = 1.65;
  const podlozeJednostronne = (tx, ty) => at(tx, ty) === POLKA || plat.has(tx + ',' + ty);
  // Jedna klatka fizyki dla stanu s = {x, y, vx, vy, naZiemi, coyote}. Zwraca false, gdy gracz ginie (lawa/nacieki/wypadnięcie z mapy).
  function krok(s, dir, skokTrzymany, skokWcisniety) {
    const acc = s.naZiemi ? .26 : .17;
    if (dir) s.vx += dir * acc; else s.vx *= s.naZiemi ? .74 : .93;
    s.vx = Math.max(-PREDKOSC, Math.min(PREDKOSC, s.vx)); if (Math.abs(s.vx) < .05) s.vx = 0;
    if (s.naZiemi) s.coyote = 6; else if (s.coyote > 0) s.coyote--;
    if (skokWcisniety && s.coyote > 0) { s.vy = SKOK; s.coyote = 0; }
    if (!skokTrzymany && s.vy < -1.8) s.vy = -1.8;
    s.vy = Math.min(MAX_SPAD, s.vy + GRAW);
    s.x += s.vx;                                                                         // ruszX
    const y0 = Math.floor(s.y / T), y1 = Math.floor((s.y + PH - 1) / T);
    if (s.vx > 0) { const tx = Math.floor((s.x + PW - 1) / T); for (let ty = y0; ty <= y1; ty++) if (staly(tx, ty)) { s.x = tx * T - PW; s.vx = 0; break; } }
    else if (s.vx < 0) { const tx = Math.floor(s.x / T); for (let ty = y0; ty <= y1; ty++) if (staly(tx, ty)) { s.x = (tx + 1) * T; s.vx = 0; break; } }
    const stareDol = s.y + PH; s.y += s.vy; s.naZiemi = false;                           // ruszY
    const x0 = Math.floor(s.x / T), x1 = Math.floor((s.x + PW - 1) / T);
    if (s.vy > 0) { const ty = Math.floor((s.y + PH) / T); for (let tx = x0; tx <= x1; tx++) if (staly(tx, ty) || (podlozeJednostronne(tx, ty) && stareDol <= ty * T + .5)) { s.y = ty * T - PH; s.vy = 0; s.naZiemi = true; break; } }
    else if (s.vy < 0) { const ty = Math.floor(s.y / T); for (let tx = x0; tx <= x1; tx++) if (staly(tx, ty)) { s.y = (ty + 1) * T; s.vy = 0; break; } }
    for (let ty = Math.floor(s.y / T); ty <= Math.floor((s.y + PH - 1) / T); ty++) for (let tx = x0; tx <= x1; tx++) if (SMIERTELNE.has(at(tx, ty))) return false;
    return s.y <= H * T + 30;
  }
  // Wszystkie pozycje stania osiągalne z kafla (x,y) skokiem lub zejściem z krawędzi — z każdej klatki rozbiegu rozgałęziamy „skocz teraz”
  // (pełny skok oraz krótki: puszczenie po 4 klatkach), dolot trwa aż do lądowania lub śmierci. Odbicie tylko, gdy stopy są jeszcze na
  // podłożu (hitbox może wystawać do 9 px za krawędź) — z coyote time silnika (6 klatek w powietrzu) analizator NIE korzysta.
  // Lądowanie liczy się tylko, gdy udaje się z ciągłego przedziału pozycji odbicia o szerokości ≥ OKNO px (≈ 4 klatki biegu = 65 ms;
  // w prawdziwej grze dochodzi jeszcze coyote time): skoki „pixel-perfect” (np. płasko przez 4 kafle z ostatnich 2 px nawisu albo
  // +2 w górę przez 3 kafle) są odrzucane — nie nadają się dla dzieci.
  // Zasięgi wychodzą zgodne z tabelą w AGENTS.md §4; zgodność z silnikiem sprawdza gra/test-przegladarka.js.
  const OKNO = 6;
  function ladowania(x, y) {
    const wyn = [];
    const zapisz = (s, zbior) => { const ty = Math.round((s.y + PH) / T); for (let tx = Math.floor(s.x / T); tx <= Math.floor((s.x + PW - 1) / T); tx++) if (stoi(tx, ty)) zbior.add(tx + ',' + ty); };
    const dolot = (s, dir, trzymaj, zbior) => { for (let k = 1; k < 200; k++) { if (!krok(s, dir, k < trzymaj, false)) return; if (s.naZiemi) { zapisz(s, zbior); return; } } };
    const dodajZbior = zbior => { for (const k of zbior) wyn.push(k.split(',').map(Number)); };
    const start = (px, vx) => ({ x: px, y: y * T - PH, vx, vy: 0, naZiemi: true, coyote: 6 });
    const wolnyStart = px => { for (let tx = Math.floor(px / T); tx <= Math.floor((px + PW - 1) / T); tx++) if (!miesci(tx, y)) return false; return true; };
    for (const dir of [-1, 1]) for (const vx0 of [dir * PREDKOSC, 0]) {
      let px = dir > 0 ? x * T - PW + 1 : (x + 1) * T - 1;                                // hitbox ledwo dotyka kafla od tyłu → rozbieg przez cały kafel
      if (!wolnyStart(px)) px = x * T + (dir > 0 ? 0 : T - PW);                           // ściana z tyłu → start wewnątrz kafla
      const s = start(px, vx0);
      const okna = [new Map(), new Map()];                                                // per wariant (pełny/krótki): lądowanie → {od: px pierwszego udanego odbicia w serii, pudlo: ile ostatnich forków nie trafiło}
      for (let k = 0; k < 40; k++) {
        if (s.naZiemi) [999, 4].forEach((trzymaj, i) => {
          const f = { ...s }, lad = new Set();
          if (krok(f, dir, true, true)) dolot(f, dir, trzymaj, lad);
          for (const [kl, o] of okna[i]) if (!lad.has(kl) && ++o.pudlo > 1) okna[i].delete(kl);   // seria przerwana (pojedyncze pudło wybaczamy — trafienia
          for (const kl of lad) {                                                              //  bywają naprzemienne przez fazę subpikselową lotu)
            const o = okna[i].get(kl); if (!o) okna[i].set(kl, { od: s.x, pudlo: 0 });
            else { o.pudlo = 0; if (Math.abs(s.x - o.od) >= OKNO) wyn.push(kl.split(',').map(Number)); }
          }
        });
        if (!krok(s, dir, false, false)) break;
        const cx0 = Math.floor(s.x / T), cx1 = Math.floor((s.x + PW - 1) / T);
        if (s.naZiemi) { if (cx0 > x || cx1 < x || s.vx === 0) break; }                   // przeszedł na sąsiedni kafel (= chód) albo ściana
        else if (s.coyote === 0) { const lad = new Set(); dolot(s, dir, 0, lad); dodajZbior(lad); break; }   // zejście z krawędzi bez skoku
      }
    }
    for (const px of [x * T - PW + 1, x * T + 3, (x + 1) * T - 1]) if (wolnyStart(px)) { const f = start(px, 0), lad = new Set(); if (krok(f, 0, true, true)) dolot(f, 0, 999, lad); dodajZbior(lad); }   // skok pionowy (np. na półkę `_` nad głową)
    return wyn;
  }
  // sasiedzi(x,y): wszystkie pozycje osiągalne z (x,y) jednym ruchem (chód/skok/zejście/drabina) — używane w BFS i do wykrywania pułapek
  const pamiec = new Map();
  function sasiedzi(x, y) {
    const k = x + ',' + y; if (pamiec.has(k)) return pamiec.get(k);
    const wyn = [];
    const dod = (tx, ty) => { if (tx >= 0 && tx < W && ty >= 0 && ty < H) wyn.push([tx, ty]); };
    const lad = (tx, ty) => { if (!miesci(tx, ty)) return; const s = stoi(tx, ty) ? [tx, ty] : spadnij(tx, ty); if (s) dod(...s); };
    for (const dx of [-1, 1]) if (miesci(x + dx, y)) lad(x + dx, y);
    for (const [tx, ty] of ladowania(x, y)) dod(tx, ty);
    if (at(x, y - 1) === 'H' || at(x, y) === 'H') {
      for (let yy = y - 1; yy >= 1; yy--) {
        if (at(x, yy) !== 'H' && at(x, yy + 1) !== 'H') break;
        if (!wolne(x, yy - 1)) break;
        for (const dx of [-1, 1]) if (miesci(x + dx, yy + 1)) lad(x + dx, yy + 1);
        if (stoi(x, yy + 1) || at(x, yy) === 'H') dod(x, yy + 1);
      }
    }
    pamiec.set(k, wyn);
    return wyn;
  }
  let start = null, cele = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (M[y][x] === '@') start = spadnij(x, y + 1);
    if (M[y][x] === '!' || M[y][x] === 'b') cele.push([x, y]);
  }
  const klucz = (x, y) => x + ',' + y;
  const odw = new Set(start ? [klucz(...start)] : []), kolejka = start ? [start] : [];
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
  // PUŁAPKI: osiągalna pozycja, z której NIE DA SIĘ już dojść do żadnej mety (dzwonu/bossa) — gracz może tam wpaść (np. studnia
  // 3 kafle głęboka, dowolnej szerokości; półka pod koroną drzewa bez zejścia), ale nie ma jak kontynuować i nie ginie.
  // Liczone odwrotnym BFS-em od pozycji przy mecie po grafie ruchów (sasiedzi). Śmierć (lawa/nacieki/przepaść) NIE jest pułapką —
  // gracz wraca do punktu kontrolnego.
  const odwrotny = new Map();
  for (const k of odw) { const [x, y] = k.split(',').map(Number); for (const [tx, ty] of sasiedzi(x, y)) { const kk = klucz(tx, ty); if (!odwrotny.has(kk)) odwrotny.set(kk, new Set()); odwrotny.get(kk).add(k); } }
  const doMety = new Set(), kolejka2 = [];
  for (const [cx, cy] of cele) for (const dx of [-1, 0, 1]) for (const dy of [0, 1, 2]) { const k = klucz(cx + dx, cy + dy); if (odw.has(k) && !doMety.has(k)) { doMety.add(k); kolejka2.push(k); } }
  while (kolejka2.length) { const k = kolejka2.shift(); for (const p of odwrotny.get(k) || []) if (!doMety.has(p)) { doMety.add(p); kolejka2.push(p); } }
  const pulapki = cele.length ? [...odw].filter(k => !doMety.has(k)).map(k => k.split(',').map(Number)) : [];
  // TRUDNE SKOKI (ostrzeżenie, nie błąd): 1-kaflowy słupek otoczony śmiertelnymi przepaściami/lawą z obu stron —
  // gracz musi wylądować idealnie i natychmiast odbić się. Frustrujące; dopuszczalne tylko celowo w późnych poziomach.
  const trudne = [];
  for (const k of odw) {
    const [x, y] = k.split(',').map(Number);
    if (!podloze(x, y) || podloze(x - 1, y) || podloze(x + 1, y)) continue;                // to nie 1-kaflowy słupek
    const przepasc = (cx) => { const s = spadnij(cx, y); return s === null; };             // spadnięcie tam = śmierć
    if (przepasc(x - 1) && przepasc(x + 1)) trudne.push([x, y]);
  }
  const problem = osiagalne.length < cele.length || brak.length > 0 || pulapki.length > 0 || !start;
  return { W, H, M, start, cele, osiagalne, szm, szmOk, brak, pulapki, trudne, odw, klucz, problem, sasiedzi, stoi };
}

function raport(nr, p, w, verbose) {
  console.log(`${w.problem ? 'BŁĄD' : 'OK  '} Poziom ${nr + 1} ${p.nazwa}: start ${w.start}, meta osiągalna: ${w.osiagalne.length}/${w.cele.length}, pozycji: ${w.odw.size}, przedmioty ${w.szmOk}/${w.szm}` + (w.brak.length ? `  NIEOSIĄGALNE: ${w.brak.join(' ')}` : '') + (w.pulapki.length ? `  *** PUŁAPKI (bez wyjścia): ${w.pulapki.map(([x, y]) => `(${x},${y})`).join(' ')}` : '') + (w.trudne.length ? `  UWAGA trudne skoki (1-kaflowy słupek między przepaściami): ${w.trudne.map(([x, y]) => `(${x},${y})`).join(' ')}` : ''));
  if (verbose) {   // „·” = powietrze tuż nad osiągalną pozycją stania (tam są stopy gracza)
    const out = w.M.map((r, y) => r.map((c, x) => w.odw.has(w.klucz(x, y + 1)) && c === ' ' ? '·' : c).join(''));
    console.log(out.join('\n'));
  }
}

function wypiszMape(nr, p) {
  const W = p.mapa[0].length;
  console.log(`=== Poziom ${nr + 1}: ${p.nazwa} (${W}x${p.mapa.length}, motyw ${p.motyw})`);
  for (let s = 0; s < W; s += 100) {
    console.log('     ' + Array.from({ length: Math.min(100, W - s) }, (_, i) => ((s + i) % 10 === 0 ? String(((s + i) / 10) % 10) : ' ')).join(''));
    console.log('     ' + Array.from({ length: Math.min(100, W - s) }, (_, i) => String((s + i) % 10)).join(''));
    console.log(p.mapa.map((r, y) => String(y).padStart(3) + ' |' + r.slice(s, s + 100)).join('\n') + '\n');
  }
}

module.exports = { analizuj, STALE, POLKA, SMIERTELNE };

if (require.main === module) {
  global.window = {};
  new Function(fs.readFileSync(path.join(__dirname, 'poziomy.js'), 'utf8'))();
  const argMapa = process.argv.indexOf('--mapa');
  if (argMapa > -1) {
    const nr = parseInt(process.argv[argMapa + 1]) - 1, p = window.POZIOMY[nr];
    if (!p) { console.error('Nie ma poziomu ' + (nr + 1)); process.exit(2); }
    wypiszMape(nr, p); process.exit(0);
  }
  let wszystkoOk = true;
  for (const [nr, p] of window.POZIOMY.entries()) {
    const w = analizuj(p.mapa);
    if (w.problem) wszystkoOk = false;
    raport(nr, p, w, process.argv.includes('-v'));
  }
  console.log(wszystkoOk ? '\nWYNIK: wszystkie poziomy OK' : '\nWYNIK: SĄ PROBLEMY — napraw mapę w gra/poziomy.js (patrz wyżej)');
  process.exit(wszystkoOk ? 0 : 1);
}
