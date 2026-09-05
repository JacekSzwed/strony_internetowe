# strony_internetowe

Strona **„opis postaci steve”** w klimacie Minecrafta (2D, 8-bit) oraz gra platformowa **„Emeryk i Skradziony Dzwon”**.

## Strona (`index.html` + `swiat.js`)

- Tło i stopka rysowane w `<canvas>` — bez plików graficznych: niebo z chmurami i słońcem (motyw jasny) albo ściana obsydianu
  z pochodniami i iskrami (motyw ciemny); stopka to trawa + dirt albo bedrock.
- Zmiana motywu to animacja: Steve (2 bloki wysokości) przechodzi przez ekran — kopie bloki kilofem (ciemny → jasny)
  albo je stawia (jasny → ciemny). Kolor tekstu zmienia się dokładnie wzdłuż frontu Steve'a.
- Czcionka *Minecraft* dla nagłówka H1 pobierana z CDN. Treść strony bez zmian.
- Przy `prefers-reduced-motion` motyw przełącza się natychmiast.

## Gra (`gra.html` + katalog `gra/`)

Platformówka 2D w stylu 8-bit. Grasz Emerykiem, młodym villagerem, który odzyskuje dzwon skradziony przez pillagerów.

| Plik | Zawartość |
| --- | --- |
| `gra/gra.js` | silnik: fizyka kafelkowa, kamera, gracz, wrogowie, strzały, ruchome platformy, drabiny, lawa, ciemność ze światłem, HUD, ekrany |
| `gra/grafika.js` | tekstury bloków, sprite'y postaci i przedmiotów, tła parallax — wszystko generowane z kodu |
| `gra/czcionka.js` | bitmapowa czcionka 5×7 z polskimi znakami |
| `gra/dzwiek.js` | 8-bitowe efekty i oryginalne utwory (Web Audio): ekran startowy, spokojny, jaskinia, boss, zwycięstwo |
| `gra/poziomy.js` | 5 poziomów: Wioska, Ciemny Las, Jaskinia, Opuszczona Kopalnia, Posterunek Pillagerów (boss) |
| `gra/analiza.js` | narzędzie: `node gra/analiza.js` sprawdza, czy meta i wszystkie szmaragdy są osiągalne |

**Sterowanie:** ← → / A D – ruch, ↑ / Spacja / Z – skok (dłużej = wyżej), ↑ ↓ – drabiny, Esc / P – pauza, M – dźwięk.
Na ekranach dotykowych pojawiają się przyciski.

**Zasady:** skacz na potwory, unikaj creeperów (po skoku syczą i wybuchają), zbieraj szmaragdy (50 = dodatkowe życie),
złote jabłko leczy, ognisko to punkt kontrolny, dotknij dzwonu, by ukończyć poziom. Postęp zapisuje się w przeglądarce.

## Uruchomienie

Wystarczy otworzyć `index.html` w przeglądarce (najlepiej przez prosty serwer, np. `python -m http.server`).