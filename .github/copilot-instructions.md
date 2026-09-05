# Instrukcje Copilota dla tego repozytorium

Pełny przewodnik po kodzie jest w [AGENTS.md](../AGENTS.md) — przeczytaj go w pierwszej kolejności (wczytuje się automatycznie).
Do pracy nad grą używaj agenta **Emeryk Dev** (`.github/agents/emeryk-dev.agent.md`), do testów **Emeryk Tester**, do przeglądu **Emeryk Recenzent**.
Gotowe zadania: `/nowy-poziom`, `/nowy-wrog`, `/nowy-dzwiek`, `/napraw-blad`, `/sprawdz-wszystko` (pliki w `.github/prompts/`).

Najważniejsze zasady w skrócie:
- Wszystko po polsku (kod, komentarze, UI, commity). Zero frameworków i plików graficznych/audio — grafika i dźwięk z kodu.
- Tekst treści `index.html` jest nietykalny.
- Przed oddaniem zmian: `npm test` musi być zielony. Po zmianach w poziomach: `node gra/analiza.js` → `WYNIK: wszystkie poziomy OK`.
- Poziomy: skok ≤ 2 kafle w górę, przerwa ≤ 3; dziury głębsze niż 2 muszą mieć śmiertelne dno (`V`/`^`) — nie zamykaj ich.
- Nie „naprawiaj” celowych decyzji z AGENTS.md §11.
