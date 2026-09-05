// test-przegladarka.js — smoke test gry i strony w prawdziwej przeglądarce (Chromium przez Playwright).
// Wymaga jednorazowo:  npm i -D playwright  &&  npx playwright install chromium
// Uruchom:             node gra/test-przegladarka.js            (sam startuje serwer na porcie 8765)
//                      node gra/test-przegladarka.js --pelna    (dodatkowo WSZYSTKIE scenariusze skoku z gra/scenariusze-skoku.js — ok. 3 min)
//
// Co sprawdza:
//  1. index.html ładuje się bez błędów JS; przełączenie motywu kończy animację i zapisuje 'theme' w localStorage
//  2. gra.html ładuje się bez błędów JS; każdy poziom da się wczytać; gracz stoi stabilnie (brak drgania);
//     skok działa; dotknięcie lawy zabija i respawnuje; dzwon kończy poziom
//  3. KALIBRACJA: mini-silnik analizatora (gra/analiza.js) daje te same wyroki „da się / nie da się” co prawdziwa fizyka gry
//     (bot steruje graczem w grze na syntetycznych mapach skoku; czas gry jest przewijany zegarem Playwright, więc jest szybko)
//  4. REGRESJE POZIOMÓW: bot przechodzi korytarz na końcu poziomu 2 (kiedyś zablokowany półką pod koroną drzewa) i dochodzi do dzwonu;
//     na starej geometrii ten sam bot utyka — test wykrywa błąd
const { spawn } = require('child_process');
const path = require('path');
const { analizuj } = require('./analiza.js');
const { SCENARIUSZE, mapa: mapaScen, KRAWEDZ } = require('./scenariusze-skoku.js');

let playwright;
try { playwright = require('playwright'); }
catch (e) { console.error('Brak pakietu playwright. Zainstaluj:  npm i -D playwright && npx playwright install chromium'); process.exit(2); }

const PORT = 8765, BASE = `http://127.0.0.1:${PORT}`;
const ROOT = path.join(__dirname, '..');
const PELNA = process.argv.includes('--pelna');
const wyniki = [];
const test = (nazwa, ok, info = '') => { wyniki.push(ok); console.log(`${ok ? 'OK  ' : 'BŁĄD'} ${nazwa}${info ? ' — ' + info : ''}`); };
const czekaj = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const serwer = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  await czekaj(1500);
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const bledyJS = [];
  page.on('pageerror', e => bledyJS.push(e.message));
  try {
    /* ---------- strona ---------- */
    await page.goto(`${BASE}/index.html`); await czekaj(800);
    test('index.html bez błędów JS', bledyJS.length === 0, bledyJS.join('; '));
    await page.evaluate(() => localStorage.setItem('theme', 'light'));
    await page.reload(); await czekaj(500);
    await page.click('button.theme-button');
    await czekaj(7500);
    const motyw = await page.evaluate(() => ({ dark: document.body.classList.contains('dark-mode'), ls: localStorage.getItem('theme'), klony: document.querySelectorAll('.klon').length }));
    test('animacja motywu kończy się (jasny→ciemny)', motyw.dark && motyw.ls === 'dark' && motyw.klony === 0, JSON.stringify(motyw));

    /* ---------- gra (czas sterowany zegarem Playwright: gra() przewija N ms gry natychmiast) ---------- */
    bledyJS.length = 0;
    await page.clock.install();
    await page.goto(`${BASE}/gra.html`); await page.clock.runFor(800);
    test('gra.html bez błędów JS', bledyJS.length === 0, bledyJS.join('; '));
    await page.mouse.click(640, 400);
    const gra = ms => page.clock.runFor(ms);
    const stan = () => page.evaluate(() => { const G = window.GRA, p = G.gracz; return { x: p.x, y: p.y, naZiemi: p.naZiemi, martwy: p.martwy, stan: G.gra.stan, zycia: G.gra.zycia }; });
    // BOT: podmienia funkcje wejścia gry (window.GRA.wej) — gdy window.__bot jest ustawiony, gra czyta klawisze z bota,
    // a bot.tick() jest wywoływany raz na klatkę fizyki (na początku aktualizacji gracza) i może zdecydować, co „wciska”.
    await page.evaluate(() => {
      const w = window.GRA.wej, o = { lewo: w.lewo, prawo: w.prawo, skok: w.skok, skokWc: w.skokWc };
      window.__bot = null;
      w.lewo = () => { const b = window.__bot; if (!b) return o.lewo(); b.tick(); return !!b.lewo; };
      w.prawo = () => { const b = window.__bot; return b ? !!b.prawo : o.prawo(); };
      w.skok = () => { const b = window.__bot; return b ? !!b.skok : o.skok(); };
      w.skokWc = () => { const b = window.__bot; return b ? !!b.skokWc : o.skokWc(); };
      // wczytaj poziom nr n „na czysto” i ewentualnie podmień mapę (tablica wierszy) — bez wrogów, przedmiotów, lawy-obiektów, platform
      window.__poziom = (n, mapa) => {
        const G = window.GRA; G.gra.poziomNr = n; G.gra.zycia = 9; G.startPoziomu(); G.gra.stan = 'gra';
        if (mapa) { const P = G.poziom; P.szer = mapa[0].length; P.wys = mapa.length; P.k = mapa.map(r => r.split('')); P.wrogowie.length = 0; P.przedmioty.length = 0; P.lawa.length = 0; P.platformy.length = 0; P.npc.length = 0; P.dzwon = null; }
      };
      window.__ustaw = (tx, ty) => { const p = window.GRA.gracz; p.x = tx * 16 + 3; p.y = ty * 16 - 21; p.vx = 0; p.vy = 0; p.martwy = 0; p.hp = 3; p.nietykalny = 0; window.GRA.kamera.x = 0; window.GRA.kamera.y = 0; };
    });

    const ile = await page.evaluate(() => window.POZIOMY.length);
    for (let n = 0; n < ile; n++) {
      await page.evaluate(n => window.__poziom(n), n);
      await gra(400);
      const st = await page.evaluate(() => ({ stan: window.GRA.gra.stan, nazwa: window.GRA.poziom.def.nazwa }));
      test(`poziom ${n + 1} (${st.nazwa}) wczytuje się`, st.stan === 'gra' && bledyJS.length === 0, bledyJS.join('; '));
    }
    // stabilność stania (brak drgania): poziom 1, po wylądowaniu y musi być stałe
    await page.evaluate(() => window.__poziom(0)); await gra(800);
    const ys = new Set();
    for (let i = 0; i < 30; i++) { ys.add((await stan()).y); await gra(16); }
    test('gracz stoi stabilnie (brak drgania)', ys.size === 1, 'różnych y: ' + ys.size);
    // skok
    const y0 = (await stan()).y;
    await page.keyboard.down('Space'); await gra(200); await page.keyboard.up('Space');
    const y1 = (await stan()).y;
    await gra(900);
    const y2 = (await stan()).y;
    test('skok działa i gracz wraca na ziemię', y1 < y0 - 8 && Math.abs(y2 - y0) < 1, `y0=${y0} w górze=${y1} po=${y2}`);
    // lawa zabija i respawnuje (wybieramy kafel lawy, nad którym są 2 wolne kafle — żeby gracz naprawdę w nią wpadł)
    await page.evaluate(() => { window.__poziom(2); const G = window.GRA; G.gra.zycia = 3;
      const l = G.poziom.lawa.find(l => G.poziom.k[l.y - 1][l.x] === ' ' && G.poziom.k[l.y - 2][l.x] === ' ');
      const p = G.gracz; p.x = l.x * 16 + 3; p.y = l.y * 16 - 30; p.vy = 0; });
    await gra(400);
    const martwy = (await stan()).martwy > 0;
    await gra(2000);
    const po = await stan();
    test('lawa zabija i respawnuje', martwy && po.zycia === 2 && po.martwy === 0 && po.stan === 'gra', JSON.stringify(po));
    // dzwon kończy poziom
    await page.evaluate(() => { window.__poziom(0); const G = window.GRA, d = G.poziom.dzwon, p = G.gracz; p.x = d.x; p.y = d.y; p.vy = 0; });
    await gra(400);
    test('dzwon kończy poziom', (await stan()).stan === 'koniecPoziomu', 'stan=' + (await stan()).stan);

    /* ---------- 3. KALIBRACJA analizator ↔ silnik na scenariuszach skoku ---------- */
    // Silnik: bot biegnie w prawo z rozbiegu i wciska skok, gdy prawa stopa jest `w` px za krawędzią (w ≤ 9: hitbox jeszcze na podłożu;
    // bez coyote time — tak samo jak analizator), potem biegnie dalej. Sukces = żywy dotarł na drugą stronę przerwy (jak w analizatorze:
    // meta osiągalna, choćby przez lądowanie na bloczku po drodze). Warianty: w co 2 px oraz skok pełny / krótki (puszczony po 4 klatkach).
    // Zgodność: analizator TAK ⇒ silnik TAK (któryś wariant); silnik TAK „pewnie” (≥4 trafień w 5 sąsiednich w, czyli okno ≥ 6 px z
    // jednym pudłem) ⇒ analizator TAK. Rzadsze trafienia silnika przy analizatorze NIE = skok „pixel-perfect”, celowo odrzucany.
    const skokWSilniku = async (mapa, up, d, w, krotki) => {
      await page.evaluate(({ mapa, up, d, w, krotki, KRAWEDZ }) => {
        window.__poziom(0, mapa); window.__ustaw(KRAWEDZ - 4, 10);                       // 4 kafle rozbiegu wystarczają do pełnej prędkości (7 klatek)
        const G = window.GRA; let k = 0, skoczyl = false, kSkoku = 0; window.__wynik = null;
        window.__bot = { prawo: true, skok: false, skokWc: false, tick() {
          const p = G.gracz; k++; this.skokWc = false;
          if (!skoczyl && p.x + 10 >= KRAWEDZ * 16 + w) { skoczyl = true; kSkoku = k; if (p.naZiemi) { this.skok = true; this.skokWc = true; } }
          if (skoczyl && krotki && k >= kSkoku + 4) this.skok = false;
          if (skoczyl && k > kSkoku && p.naZiemi && p.x + 10 >= (KRAWEDZ + d) * 16 + 4) { window.__wynik = true; window.__bot = null; }
          if (k > 150) { window.__wynik = false; window.__bot = null; }
        } };
      }, { mapa, up, d, w, krotki, KRAWEDZ });
      for (let i = 0; i < 8; i++) {
        await gra(600);
        const r = await page.evaluate(() => ({ wynik: window.__wynik, martwy: window.GRA.gracz.martwy }));
        if (r.wynik !== null) return r.wynik;
        if (r.martwy) { await page.evaluate(() => { window.__bot = null; }); return false; }
      }
      await page.evaluate(() => { window.__bot = null; });
      return false;
    };
    const W_LISTA = [-9, -7, -5, -3, -1, 1, 3, 5, 7, 9];
    const scenariusze = PELNA ? SCENARIUSZE : SCENARIUSZE.filter(s => s.brzegowy);   // domyślnie przypadki brzegowe (17), --pelna: wszystkie (41)
    let zgodne = 0, rozne = [];
    for (const s of scenariusze) {
      const m = mapaScen(s);
      const anal = analizuj(m).osiagalne.length === 1;
      const udane = [];
      for (const w of W_LISTA) for (const krotki of [false, true]) if (await skokWSilniku(m, s.up, s.d, w, krotki)) { udane.push(w); break; }
      let maxTrafien = 0;
      for (let i = 0; i + 5 <= W_LISTA.length; i++) maxTrafien = Math.max(maxTrafien, W_LISTA.slice(i, i + 5).filter(w => udane.includes(w)).length);
      const silnik = udane.length > 0, silnikPewnie = maxTrafien >= 4;
      const zgoda = anal ? silnik : !silnikPewnie;
      if (zgoda) zgodne++; else rozne.push(`${s.nazwa}: analizator=${anal ? 'TAK' : 'NIE'} silnik=${silnik ? 'TAK (w=' + udane.join(',') + ')' : 'NIE'}`);
      if (s.oczekiwane !== null && s.oczekiwane !== anal) rozne.push(`${s.nazwa}: analizator=${anal ? 'TAK' : 'NIE'} a tabela zasięgów (AGENTS.md §4) mówi ${s.oczekiwane ? 'TAK' : 'NIE'}`);
      if (PELNA) console.log(`     ${zgoda ? '=' : '≠'} ${s.nazwa.padEnd(48)} analizator=${anal ? 'TAK' : 'NIE'}  silnik=${silnik ? 'TAK' : 'NIE'}${udane.length ? ' (w=' + udane.join(',') + ')' : ''}`);
    }
    test(`kalibracja: analizator zgodny z silnikiem gry (${zgodne}/${scenariusze.length} scenariuszy skoku)`, rozne.length === 0, rozne.join(' | '));

    /* ---------- 4. REGRESJE POZIOMÓW: bot idzie w prawo, skacze gdy uderzy w ścianę; musi dojść do celu ---------- */
    const korytarz = async (n, odX, odY, doX, mapa) => {
      await page.evaluate(({ n, odX, odY, doX, mapa }) => {
        window.__poziom(n, mapa); window.__ustaw(odX, odY);
        const G = window.GRA; let k = 0, ostSkok = -99; window.__wynik = null;
        window.__bot = { prawo: true, skok: false, skokWc: false, tick() {
          const p = G.gracz; k++; this.skokWc = false;
          if (k - ostSkok > 12) this.skok = false;
          if (p.naZiemi && (p.uderzyl || p.vx === 0) && k - ostSkok > 20) { this.skok = true; this.skokWc = true; ostSkok = k; }
          if (p.x >= doX * 16) { window.__wynik = true; window.__bot = null; }
          if (k > 900) { window.__wynik = false; window.__bot = null; }
        } };
      }, { n, odX, odY, doX, mapa });
      for (let i = 0; i < 20; i++) {
        await gra(1000);
        const r = await page.evaluate(() => ({ wynik: window.__wynik, martwy: window.GRA.gracz.martwy, x: window.GRA.gracz.x, stan: window.GRA.gra.stan }));
        if (r.stan === 'koniecPoziomu') { await page.evaluate(() => { window.__bot = null; }); return { ok: true, x: r.x }; }
        if (r.wynik !== null) return { ok: r.wynik, x: r.x };
        if (r.martwy) { await page.evaluate(() => { window.__bot = null; }); return { ok: false, x: r.x, martwy: true }; }
      }
      await page.evaluate(() => { window.__bot = null; });
      return { ok: false };
    };
    const mapa2 = await page.evaluate(() => window.POZIOMY[1].mapa);
    const bezWrogow = m => m.map(r => r.replace(/[zcksp]/g, ' '));                      // sam korytarz, bez potworów (te testuje kto inny)
    const r1 = await korytarz(1, 160, 14, 182, bezWrogow(mapa2));
    test('poziom 2: korytarz 160→182 pod drzewem jest przechodni (bot dochodzi do dzwonu)', r1.ok, `x=${r1.x}`);
    const stara = bezWrogow(mapa2).map((r, y) => y === 12 ? r.slice(0, 170) + 'lll' + r.slice(173) : y === 10 ? r.slice(0, 170) + 'eee' + r.slice(173) : y === 11 || y === 9 ? r.slice(0, 165) + '   ' + r.slice(168) : r);
    const r2 = await korytarz(1, 160, 14, 182, stara);
    test('poziom 2: na STAREJ geometrii (półka lll w wierszu 12 pod koroną) bot utyka — test wykrywa błąd', !r2.ok && r2.x < 174 * 16, `x=${r2.x}`);
    test('brak błędów JS podczas gry', bledyJS.length === 0, bledyJS.join('; '));
  } catch (e) {
    test('wyjątek testu', false, e.stack || e.message);
  } finally {
    await browser.close();
    serwer.kill();
  }
  const ok = wyniki.every(Boolean);
  console.log(ok ? `\nWYNIK: przeglądarka OK (${wyniki.length} testów)` : `\nWYNIK: ${wyniki.filter(w => !w).length} z ${wyniki.length} testów NIE PRZESZŁO`);
  process.exit(ok ? 0 : 1);
})();
