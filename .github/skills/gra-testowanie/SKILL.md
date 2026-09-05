---
name: gra-testowanie
description: Testowanie i debugowanie gry oraz strony — npm test, analizator poziomów, smoke test Playwright, ręczne sprawdzanie w Chromium przez window.GRA (teleport, zmiana poziomu, wymuszanie stanów), zrzuty ekranu, diagnoza drgań/kolizji/pułapek.
---

# Skill: testowanie i debug

## Poziom 0 — zawsze (~10 s, bez przeglądarki)

```bash
npm test          # = test-skladnia.js && analiza.js && test-analiza.js && test-dzwiek.js
```
Każdy skrypt kończy się linią `WYNIK: …` i kodem 0/1. Czytaj tylko linie `BŁĄD`.
`test-analiza.js` = testy analizatora na syntetycznych mapach (zasięgi skoku, sufity, studnie, drabiny) **i** na prawdziwych poziomach z cofniętymi znanymi poprawkami (stara półka pod koroną w poziomie 2 → meta nieosiągalna; stare półki przy słupkach w poziomie 5 → pułapka). Nowy błąd poziomu naprawiłeś? Dopisz tam test, który go cofa i oczekuje `BŁĄD`.

## Poziom 1 — smoke test w Chromium (~3 min; `--pelna` ~6 min)

```bash
npm i -D playwright && npx playwright install chromium   # jednorazowo
npm run test:przegladarka                                 # sam startuje/zatrzymuje serwer :8765
node gra/test-przegladarka.js --pelna                     # + wszystkie 41 scenariuszy kalibracji skoku
```
Sprawdza: brak błędów JS na obu stronach, animacja motywu, wczytanie każdego poziomu, stabilne stanie (brak drgania), skok, lawa → śmierć → respawn, dzwon → koniec poziomu, **kalibracja analizator ↔ silnik** (bot wykonuje w grze scenariusze z `gra/scenariusze-skoku.js` i porównuje z `analizuj()` — musi być 100 % zgodności; po zmianie fizyki w `gra.js` zaktualizuj `krok()` w `analiza.js`), **korytarz na końcu poziomu 2** (bot dochodzi do dzwonu; na starej geometrii utyka).
Czas gry jest przewijany zegarem Playwright (`page.clock.install()` + `runFor(ms)`), więc 1 s gry trwa ~0,3 s realnie. Uwaga: z zainstalowanym zegarem `waitForTimeout` NIE posuwa gry — używaj `page.clock.runFor()`.

### Bot w grze (do własnych testów sytuacji)
`test-przegladarka.js` podmienia `window.GRA.wej` tak, że gdy `window.__bot` jest ustawiony, gra czyta klawisze z niego, a `bot.tick()` woła raz na klatkę fizyki (przed ruchem gracza):
```js
window.__bot = { prawo: true, skok: false, skokWc: false, tick() { const p = window.GRA.gracz; this.skokWc = false;
  if (p.naZiemi && p.uderzyl) { this.skok = true; this.skokWc = true; }                   // skacz, gdy uderzysz w ścianę
  if (p.x > 182 * 16) window.__bot = null; } };                                             // koniec: zdejmij bota
```
`skokWc` = „wciśnięto w tej klatce” (bufor skoku), `skok` = „trzymany” (puszczenie skraca skok). Pomocnicze: `window.__poziom(n, mapa?)` (wczytaj poziom n, opcjonalnie z podmienioną mapą — bez wrogów/przedmiotów), `window.__ustaw(kol, wierszPodłoża)` (teleport). Skopiuj ten wzór do własnego skryptu.

## Poziom 2 — ręczny test konkretnej sytuacji

Skopiuj szkielet do `tmp-test.js` w katalogu głównym (usuń po użyciu):
```js
const { chromium } = require('playwright'); const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1500));
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => console.log('JS ERROR:', e.message));
  await page.goto('http://127.0.0.1:8765/gra.html'); await page.waitForTimeout(600); await page.mouse.click(640, 400);
  // --- ustaw sytuację ---
  await page.evaluate(() => { const G = window.GRA; G.gra.poziomNr = 2; G.gra.zycia = 3; G.startPoziomu(); G.gra.stan = 'gra';
    const p = G.gracz; p.x = 63 * 16; p.y = 10 * 16; p.vx = 0; p.vy = 0; });          // teleport: kolumna 63, wiersz 10
  // --- steruj ---
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(800); await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Space');
  await page.waitForTimeout(600);
  // --- odczytaj ---
  console.log(await page.evaluate(() => { const G = window.GRA, p = G.gracz; return { stan: G.gra.stan, x: Math.round(p.x / 16), y: Math.round((p.y + p.h) / 16), hp: p.hp, martwy: p.martwy, zycia: G.gra.zycia }; }));
  await page.screenshot({ path: 'tmp-test.png' });     // obejrzyj, potem usuń
  await b.close(); srv.kill();
})();
```
Uruchom: `node tmp-test.js`. Uwaga: gra liczy fizykę tylko, gdy karta jest „widoczna” — headless Chromium jest OK; w VS Code Simple Browser w tle może nie liczyć.

## API `window.GRA` — ściągawka

| Cel | Kod |
| --- | --- |
| wczytaj poziom N (0-indeks) i graj | `G.gra.poziomNr = N; G.startPoziomu(); G.gra.stan = 'gra';` |
| teleport na kafel (kol, wiersz podłoża) | `p.x = kol*16 + 3; p.y = wiersz*16 - 21; p.vy = 0;` |
| pełne HP / nieśmiertelność testowa | `p.hp = 3; p.nietykalny = 99999;` |
| znajdź wroga / przedmiot / dzwon | `G.poziom.wrogowie.find(w => w.typ === 'zombie')`, `G.poziom.przedmioty[0]`, `G.poziom.dzwon` |
| stan bossa | `G.poziom.boss.hp`, `G.poziom.bossAktywny`, `G.poziom.bossPokonany` |
| kafel pod stopami | `G.poziom.k[Math.floor((p.y + p.h) / 16)][Math.floor((p.x + p.w / 2) / 16)]` |
| wymuś ekran | `G.gra.stan = 'gameover' | 'zwyciestwo' | 'pauza' | 'tytul'` |
| wyczyść zapis | `localStorage.clear()` |

Klawisze: `ArrowLeft/Right`, `Space`/`ArrowUp` skok, `ArrowUp/Down` drabina, `Escape` pauza, `Enter` OK, `KeyM` dźwięk.

## Diagnozy typowych objawów

| Objaw | Sprawdź |
| --- | --- |
| postać drga o 1 px | `ruszY` musi testować `Math.floor((e.y + e.h) / T)` (nie `-1`); skala CSS całkowita w `dopasuj()`; pozycje rysowane przez `Math.round` |
| gracz utknął w dziurze / miejscu bez powrotu | `node gra/analiza.js` → `PUŁAPKI`; rozwiązanie w skill `gra-poziomy` (śmiertelne dno, głębokość ≤ 2, uniemożliwić zeskok) |
| gracz nie może przejść korytarza (uderza głową / w półkę) | `node gra/analiza.js -v` → gdzie kończą się `·`; coś stałego 1–2 kafle nad podłożem albo 3–4 nad trasą skoku → przesuń/podnieś (skill `gra-poziomy`, reguła 7) |
| szmaragd nie do zebrania | `NIEOSIĄGALNE: e(x,y)` w analizatorze → obniż o 1 wiersz |
| wróg spada przez platformę `_` | półki `_` trzymają tylko gdy `stareDol <= ty*T + .5` — wrogowie na półkach muszą startować **na** nich, nie nad |
| brak dźwięku | `D.start()` wywołany? (klik/klawisz) — konsola: `Dzwiek.aktualna()`; `localStorage['gra-wyciszone']` |
| muzyka nie zmienia się na bossa | `P.def.muzykaBoss` i warunek aktywacji w `aktualizuj()` (`|dx| < 150 && |dy| < 60`) |
| strona: motyw nie kończy animacji | konsola: `document.querySelectorAll('.klon').length` powinno wrócić do 0; `matchMedia('(prefers-reduced-motion)')` pomija animację |
| błąd „Cannot read properties of null (reading 'x')” w `wczytajPoziom` | brak `@` w mapie (start) — `node gra/test-skladnia.js` to wykrywa |

## Test motywu strony (index.html)

```js
await page.goto('http://127.0.0.1:8765/index.html'); await page.click('button.theme-button'); await page.waitForTimeout(7000);
console.log(await page.evaluate(() => ({ dark: document.body.classList.contains('dark-mode'), klony: document.querySelectorAll('.klon').length })));
```
Animacja trwa 3.2–6 s zależnie od szerokości okna; w trakcie `body.przejscie` jest ustawione, przycisk ignoruje kliknięcia.
