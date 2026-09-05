---
applyTo: "gra/dzwiek.js"
---
# Zasady edycji gra/dzwiek.js

- Web Audio bez plików: `ton()`, `szum()`, `perkusja()`. SFX w obiekcie `SFX` jako `nazwa: t => {...}`; utwory w `UTWORY` w formacie tekstowym nut (`A4:1 -:.5 C4+E4:2`, perkusja `k s h H`).
- Kompozycje **oryginalne** — nie przepisuj melodii z Minecrafta/C418 ani innych chronionych utworów. Muzyka gra tylko w grze, nigdy w `index.html`.
- `AudioContext` uruchamia się w `start()` po geście użytkownika — nie dodawaj autoodtwarzania przy ładowaniu.
- Głośności: SFX 0.05–0.3, ścieżki muzyki 0.03–0.22; nie zmieniaj `master`/`muzykaGain`/`sfxGain` bez wyraźnej prośby.
- `exponentialRampToValueAtTime` nigdy do 0 (używaj `.0008`).
- Nowy SFX/utwór → dopisz nazwę do list `SFX`/`UTWORY` w `gra/test-dzwiek.js` i uruchom `node gra/test-dzwiek.js`.
