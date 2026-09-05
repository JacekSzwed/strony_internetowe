---
description: Dodaj nowego wroga (sprite, AI, hitbox, dźwięki, znak mapy) i umieść go w jednym poziomie testowo.
agent: Emeryk Dev
argument-hint: nazwa wroga, wygląd (kolory/kształt w stylu Minecraft), zachowanie (patrol / goni / strzela / skacze / wybucha), HP
---
Dodaj nowego wroga do gry.

Wejście: ${input:opis:np. „Pająk: czarny, 16×8, biega szybko po ziemi i skacze na gracza z 3 kafli, 1 HP”}

Wykonaj wg checklisty ze skilla `gra-grafika` („Nowy wróg — 5 miejsc”):
1. `gra/grafika.js`: paleta + sprite (2 klatki, `[odbij(c), c]`), eksport w `window.Grafika`. Wymiary sprite'a w px; stopy sprite'a = dolna krawędź hitboxa.
2. `gra/gra.js → nowyWrog()`: `case` z `w`, `h`, `v`, ewent. `hp`.
3. `gra/gra.js → aktualizujWroga()`: `case` z AI (wzorce w skillu). Wykorzystaj istniejące pomocnicze: `podStopami`, `widzi`, `odl`, `P.strzaly.push`, `D.sfx`.
4. `gra/gra.js → sprWroga()`, w razie potrzeby `rysujWroga()` (offset) i `koloryWroga()`.
5. `gra/gra.js → wczytajPoziom()`: nowy **wolny** znak mapy (sprawdź AGENTS.md §5); dopisz go do „znane” w `gra/test-skladnia.js`, do legendy w `AGENTS.md` §5 i `README.md`.
6. Jeśli wróg potrzebuje dźwięku — dodaj SFX w `gra/dzwiek.js` (skill `gra-dzwiek`) i do listy w `test-dzwiek.js`.
7. Umieść 1–2 egzemplarze w sensownym miejscu istniejącego poziomu (`gra/poziomy.js`), uruchom `npm test`, a potem `npm run test:przegladarka` (lub przekaż do Emeryk Tester).
8. Podsumuj: znak mapy, hitbox, zachowanie, jak go pokonać, gdzie występuje.
