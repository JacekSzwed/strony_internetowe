---
description: Zdiagnozuj i napraw zgłoszony błąd w grze lub na stronie; odtwórz go testem, napraw przyczynę, zweryfikuj.
agent: Emeryk Dev
argument-hint: co się dzieje, gdzie (poziom / ekran / strona), jak odtworzyć
---
Napraw błąd zgłoszony przez użytkownika.

Zgłoszenie: ${input:opis:np. „W Kopalni po skoku na platformę gracz przelatuje przez nią”}

Procedura:
1. **Odtwórz**: jeśli dotyczy poziomu — `node gra/analiza.js` i `npm run mapa -- N`, znajdź współrzędne. Jeśli dotyczy mechaniki/wyglądu — napisz jednorazowy skrypt Playwright wg skilla `gra-testowanie` (Poziom 2), ustaw sytuację przez `window.GRA`, odczytaj stan / zrób zrzut. Zapisz, co dokładnie widzisz (liczby, nie wrażenia).
2. **Znajdź przyczynę**: użyj tabeli „Diagnozy typowych objawów” ze skilla `gra-testowanie` i „Gdzie co zmienić” z AGENTS.md §7. Czytaj tylko wskazane funkcje. Sprawdź, czy to nie jest **celowa decyzja** z AGENTS.md §11 — wtedy nie „naprawiaj”, tylko wyjaśnij użytkownikowi.
3. **Napraw przyczynę**, nie objaw (np. nie dodawaj `if` maskującego stan — popraw logikę, która go tworzy). Minimalna zmiana.
4. **Zweryfikuj**: powtórz odtworzenie z pkt 1 — objaw ma zniknąć. `npm test` zielony. Przy zmianach fizyki/rysowania także `npm run test:przegladarka`.
5. Jeśli błąd był w klasie „poziom bez wyjścia” — pamiętaj: **nie zamykaj dziury**, użyj `^`/`V` na dnie lub spłyć do 2 kafli. Jeśli „nie da się przejść” — sprawdź, co wisi nad korytarzem/trasą skoku (skill `gra-poziomy`, reguła 7).
6. **Test regresji**: błąd poziomu → w `gra/test-analiza.js` (sekcja 7) dopisz test, który cofa Twoją poprawkę na prawdziwej mapie (`podmien(...)`) i oczekuje `problem === true`. Błąd mechaniki → scenariusz w `gra/test-przegladarka.js` (bot `window.__bot`, opis w skillu `gra-testowanie`). Bez testu naprawa jest niekompletna.
7. Usuń tymczasowe skrypty/zrzuty. Podsumuj: przyczyna (1–2 zdania), zmiana (plik → funkcja), dowód (co pokazał test przed/po).
