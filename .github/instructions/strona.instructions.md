---
applyTo: "index.html,swiat.js"
---
# Zasady edycji strony (index.html, swiat.js)

- **Treść tekstowa `index.html` (nagłówki, akapity, lista, obraz) jest nietykalna** — nie zmieniaj, nie poprawiaj literówek, nie przestawiaj. Układ początkowy (przyciski u góry po prawej, potem treść) zostaje.
- Wolno zmieniać: `<style>`, canvasy `#tlo`/`#przod`, stopkę `<footer>`, przyciski, `swiat.js`.
- Grafika strony jest generowana w `swiat.js` (tekstury 16 px, sprite Steve'a 12×32, chmury, pochodnie) — bez plików PNG/JPG (istniejący `z4xmg666.jpg` w treści to wyjątek, nie ruszaj).
- Animacja motywu: `startPrzejscia()` → `aktualizuj()` → `zakonczPrzejscie()`; `toggleTheme` jest nadpisany w swiat.js i wywołuje oryginalny (z index.html) dopiero na końcu animacji, żeby zachować zapis `localStorage.theme` i tekst przycisku.
- Kolor tekstu w trakcie animacji zmienia się przez klon treści (`.klon`) z `clip-path` — jeśli dodajesz elementy do `<main id="tresc">`, muszą być klonowalne (bez `id` wymagających unikalności poza `tresc`).
- Klasa `html.ciemny` ustawiana jest **przed** załadowaniem body (skrypt w `<head>`), żeby nie było mignięcia białym tłem.
- Szanuj `prefers-reduced-motion` (`OGRANICZ_RUCH`) — natychmiastowa zmiana motywu bez animacji.
