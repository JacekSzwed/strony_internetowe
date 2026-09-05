---
description: Skomponuj nowy oryginalny utwór 8-bit lub efekt dźwiękowy i podpnij go w grze.
agent: Emeryk Dev
argument-hint: rodzaj (utwór do poziomu X / efekt do zdarzenia Y), klimat lub charakter
---
Dodaj dźwięk do gry.

Wejście: ${input:opis:np. „utwór do poziomu w śniegu: spokojny, zimny, dzwoneczki” lub „efekt otwierania skrzyni”}

Wykonaj wg skilla `gra-dzwiek`:
1. **Utwór**: dodaj wpis w `UTWORY` w `gra/dzwiek.js` — 3–4 ścieżki (melodia, pad akordowy, bas, opcjonalnie perkusja), 16–32 bity, długości ścieżek wielokrotnością 4. Dobierz `bpm`, `echo`, fale wg tabeli klimatów w skillu. **Kompozycja oryginalna** — nie kopiuj melodii z Minecrafta/C418 ani innych utworów.
   **Efekt**: dodaj funkcję w `SFX` (recepty w skillu), głośność 0.05–0.3, długość ≤ 0.6 s (poza fanfarami).
2. Podpnij: utwór → `muzyka: 'nazwa'` w definicji poziomu (`gra/poziomy.js`) lub `D.grajMuzyke('nazwa')`; efekt → `D.sfx('nazwa')` w odpowiednim miejscu `gra/gra.js`.
3. Dopisz nazwę do listy `UTWORY`/`SFX` w `gra/test-dzwiek.js`. Uruchom `node gra/test-dzwiek.js` — wymagane `WYNIK: dźwięk OK` i sensowna liczba nut (utwór spokojny ~60–150 nut/60 s, akcja ~500–800).
4. `npm test`. Podsumuj: nazwa, gdzie gra, charakter (bpm, tonacja, instrumenty), jak przetestować słuchowo (`npm start`, poziom N).
