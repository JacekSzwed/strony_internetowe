---
applyTo: "gra/gra.js"
---
# Zasady edycji gra/gra.js (silnik)

- Stały krok 60 Hz w `aktualizuj()`; rysowanie w `rysuj()`. Nowy stan gry = `case` w **obu** funkcjach.
- Kolizje przez `ruszX`/`ruszY` — wspólne dla gracza i wrogów. **Nie zmieniaj** `Math.floor((e.y + e.h) / T)` w `ruszY` (celowe; `-1` powoduje drganie postaci).
- Pozycje do `drawImage` zawsze przez `Math.round`. Skalowanie sprite'ów tylko do całkowitych px.
- Nowy wróg: `nowyWrog` (hitbox `w,h`, `v`, `hp`) → `aktualizujWroga` (case AI) → `sprWroga`/`rysujWroga` → `koloryWroga` → `wczytajPoziom` (znak). Sprite w grafika.js.
- Nowy przedmiot: `wczytajPoziom` (case, z `id` i `P.zebrane`) → pętla w `aktualizujGracza` → `rysujSwiat`.
- Dźwięk: `D.sfx('nazwa')` (musi istnieć w `SFX` w dzwiek.js); muzyka `D.grajMuzyke('nazwa')`.
- Teksty UI po polsku przez `C.tekst(g, s, x, y, kolor, { wyr, cien, skala })`; szerokość ekranu 320 px, znak 6 px → maks. ~52 znaki w linii (`C.lamTekst(s, 280)`).
- `localStorage`: klucze `gra-postep`, `gra-rekord`, `gra-wyciszone`; zawsze z wartością domyślną.
- Nie usuwaj eksportu `window.GRA` (używany przez testy i debug).
- Po zmianach: `npm test`; przy zmianach fizyki/rysowania także `npm run test:przegladarka`.
