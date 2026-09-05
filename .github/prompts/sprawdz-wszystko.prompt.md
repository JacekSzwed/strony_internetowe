---
description: Pełna weryfikacja projektu — npm test, smoke test w przeglądarce, raport.
agent: Emeryk Tester
---
Wykonaj pełną weryfikację repozytorium i zgłoś raport wg formatu z Twojej instrukcji:
1. `npm test`
2. `npm run test:przegladarka` (jeśli brak Playwrighta — zainstaluj: `npm i -D playwright && npx playwright install chromium`)
3. Jeśli użytkownik podał konkretną rzecz do sprawdzenia: ${input:dodatkowo:opcjonalnie — co jeszcze sprawdzić ręcznie}, zrób to skryptem Playwright wg skilla `gra-testowanie` i usuń skrypt po użyciu.
4. Raport + werdykt (gotowe / do naprawy z listą).
