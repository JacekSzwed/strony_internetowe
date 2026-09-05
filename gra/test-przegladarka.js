// test-przegladarka.js — smoke test gry i strony w prawdziwej przeglądarce (Chromium przez Playwright).
// Wymaga jednorazowo:  npm i -D playwright  &&  npx playwright install chromium
// Uruchom:             node gra/test-przegladarka.js          (sam startuje serwer na porcie 8765)
//
// Co sprawdza:
//  1. index.html ładuje się bez błędów JS; przełączenie motywu kończy animację i zapisuje 'theme' w localStorage
//  2. gra.html ładuje się bez błędów JS; każdy poziom da się wczytać; gracz stoi stabilnie (brak drgania);
//     skok działa; dotknięcie lawy zabija i respawnuje; dzwon kończy poziom
const { spawn } = require('child_process');
const path = require('path');

let playwright;
try { playwright = require('playwright'); }
catch (e) { console.error('Brak pakietu playwright. Zainstaluj:  npm i -D playwright && npx playwright install chromium'); process.exit(2); }

const PORT = 8765, BASE = `http://127.0.0.1:${PORT}`;
const ROOT = path.join(__dirname, '..');
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

    /* ---------- gra ---------- */
    bledyJS.length = 0;
    await page.goto(`${BASE}/gra.html`); await czekaj(800);
    test('gra.html bez błędów JS', bledyJS.length === 0, bledyJS.join('; '));
    await page.mouse.click(640, 400);
    const ile = await page.evaluate(() => window.POZIOMY.length);
    for (let n = 0; n < ile; n++) {
      await page.evaluate(n => { const G = window.GRA; G.gra.poziomNr = n; G.gra.zycia = 3; G.startPoziomu(); G.gra.stan = 'gra'; }, n);
      await czekaj(400);
      const st = await page.evaluate(() => ({ stan: window.GRA.gra.stan, nazwa: window.GRA.poziom.def.nazwa }));
      test(`poziom ${n + 1} (${st.nazwa}) wczytuje się`, st.stan === 'gra' && bledyJS.length === 0, bledyJS.join('; '));
    }
    // stabilność stania (brak drgania): poziom 1, po wylądowaniu y musi być stałe
    await page.evaluate(() => { const G = window.GRA; G.gra.poziomNr = 0; G.startPoziomu(); G.gra.stan = 'gra'; });
    await czekaj(800);
    const ys = new Set();
    for (let i = 0; i < 30; i++) { ys.add(await page.evaluate(() => window.GRA.gracz.y)); await czekaj(16); }
    test('gracz stoi stabilnie (brak drgania)', ys.size === 1, 'różnych y: ' + ys.size);
    // skok
    const y0 = await page.evaluate(() => window.GRA.gracz.y);
    await page.keyboard.down('Space'); await czekaj(200); await page.keyboard.up('Space');
    const y1 = await page.evaluate(() => window.GRA.gracz.y);
    await czekaj(900);
    const y2 = await page.evaluate(() => window.GRA.gracz.y);
    test('skok działa i gracz wraca na ziemię', y1 < y0 - 8 && Math.abs(y2 - y0) < 1, `y0=${y0} w górze=${y1} po=${y2}`);
    // lawa zabija i respawnuje (wybieramy kafel lawy, nad którym są 2 wolne kafle — żeby gracz naprawdę w nią wpadł)
    await page.evaluate(() => { const G = window.GRA; G.gra.poziomNr = 2; G.gra.zycia = 3; G.startPoziomu(); G.gra.stan = 'gra';
      const l = G.poziom.lawa.find(l => G.poziom.k[l.y - 1][l.x] === ' ' && G.poziom.k[l.y - 2][l.x] === ' ');
      const p = G.gracz; p.x = l.x * 16 + 3; p.y = l.y * 16 - 30; p.vy = 0; });
    await czekaj(400);
    const martwy = await page.evaluate(() => window.GRA.gracz.martwy > 0);
    await czekaj(2000);
    const po = await page.evaluate(() => ({ zycia: window.GRA.gra.zycia, martwy: window.GRA.gracz.martwy, stan: window.GRA.gra.stan }));
    test('lawa zabija i respawnuje', martwy && po.zycia === 2 && po.martwy === 0 && po.stan === 'gra', JSON.stringify(po));
    // dzwon kończy poziom
    await page.evaluate(() => { const G = window.GRA; G.gra.poziomNr = 0; G.gra.zycia = 3; G.startPoziomu(); G.gra.stan = 'gra'; const d = G.poziom.dzwon; const p = G.gracz; p.x = d.x; p.y = d.y; p.vy = 0; });
    await czekaj(400);
    const koniec = await page.evaluate(() => window.GRA.gra.stan);
    test('dzwon kończy poziom', koniec === 'koniecPoziomu', 'stan=' + koniec);

    // zasięg skoku: musi zgadzać się z tabelą w gra/analiza.js (płasko 3 kafle TAK, 4 NIE; +2 w górę 2 TAK, 3 NIE)
    const skok = async (up, d) => {
      for (const wyp of [0, 3, 6]) {
        await page.evaluate(({ up, d }) => {
          const G = window.GRA; G.gra.poziomNr = 0; G.gra.zycia = 9; G.startPoziomu(); G.gra.stan = 'gra';
          const P = G.poziom; for (let y = 0; y < P.wys; y++) for (let x = 0; x < P.szer; x++) P.k[y][x] = (x === 0 || x === P.szer - 1) ? 'X' : ' ';
          P.wrogowie.length = 0; P.przedmioty.length = 0; P.lawa.length = 0; P.platformy.length = 0;
          for (let x = 10; x <= 20; x++) P.k[10][x] = '#';
          for (let x = 21 + d; x < 29 + d; x++) P.k[10 - up][x] = '#';
          for (let x = 21; x < 21 + d; x++) P.k[P.wys - 1][x] = 'V';
          const p = G.gracz; p.x = 12 * 16; p.y = 10 * 16 - 21; p.vx = 0; p.vy = 0; p.martwy = 0; p.hp = 3;
        }, { up, d });
        await czekaj(120);
        await page.keyboard.down('ArrowRight');
        let skoczyl = false, ok = false;
        for (let i = 0; i < 160; i++) {
          const p = await page.evaluate(() => ({ x: window.GRA.gracz.x, y: window.GRA.gracz.y, naZiemi: window.GRA.gracz.naZiemi, martwy: window.GRA.gracz.martwy }));
          if (!skoczyl && p.naZiemi && p.x + 10 >= 21 * 16 - wyp) { await page.keyboard.down('Space'); skoczyl = true; }
          if (p.martwy) break;
          if (skoczyl && p.naZiemi && p.x >= (21 + d) * 16 - 6 && Math.round((p.y + 21) / 16) === 10 - up) { ok = true; break; }
          await czekaj(16);
        }
        await page.keyboard.up('Space'); await page.keyboard.up('ArrowRight');
        if (ok) return true;
      }
      return false;
    };
    test('zasięg skoku: płasko 3 kafle — da się', await skok(0, 3));
    test('zasięg skoku: płasko 4 kafle — nie da się', !(await skok(0, 4)));
    test('zasięg skoku: +2 w górę, 2 kafle — da się', await skok(2, 2));
    test('zasięg skoku: +2 w górę, 3 kafle — nie da się', !(await skok(2, 3)));
    test('brak błędów JS podczas gry', bledyJS.length === 0, bledyJS.join('; '));
  } catch (e) {
    test('wyjątek testu', false, e.message);
  } finally {
    await browser.close();
    serwer.kill();
  }
  const ok = wyniki.every(Boolean);
  console.log(ok ? `\nWYNIK: przeglądarka OK (${wyniki.length} testów)` : `\nWYNIK: ${wyniki.filter(w => !w).length} z ${wyniki.length} testów NIE PRZESZŁO`);
  process.exit(ok ? 0 : 1);
})();
