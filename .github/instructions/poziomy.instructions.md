---
applyTo: "gra/poziomy.js"
---
# Zasady edycji gra/poziomy.js

- Buduj mapę funkcjami pomocniczymi (`fill`, `rzad`, `put`, `ziemia`, `dom`, `drzewo`, `schody`, `drabina`, `szmaragdy`, `meta`), nie ręcznymi stringami.
- Zasięg skoku (zmierzony): przerwa ≤ 3 kafle na płasko lub +1 w górę, **≤ 2 przy +2 w górę**, ≤ 4 przy spadaniu. Platformy maks. 2 kafle nad podłożem.
- Miejsce odbicia i lądowania przy lawie/przepaści: **≥ 2 kafle szerokości**. Między dwiema przeszkodami ≥ 2 kafle płaskiego podłoża. Zanim dodasz przeszkodę: `npm run mapa -- N` i obejrzyj ±6 kolumn.
- Dziura głębsza niż 2 kafle z pionowymi ścianami → dno musi być `V` (lawa) lub `^` (nacieki). Nie zamykaj dziur — spłycaj lub uśmiercaj.
- Drabina `H` sięga 1 kafel **ponad** półkę, na którą prowadzi.
- Każdy poziom: `sciany()`, dokładnie jeden `@`, `meta(x, wierszPodłoża)` lub boss `b`, checkpoint `f` co 60–80 kafli, `npc: {kolumna: tekst}` zgodny z kolumną `j`.
- Po edycji uruchom `node gra/analiza.js` — wymagane `WYNIK: wszystkie poziomy OK` (0 pułapek, meta i wszystkie przedmioty osiągalne). Do znajdowania współrzędnych: `node gra/analiza.js --mapa N`.
- Nowy znak mapy → dodaj do `KAFLE` (grafika.js) lub `wczytajPoziom()` (gra.js), do `STALE`/`SMIERTELNE` w analiza.js, do „znane” w test-skladnia.js i do legendy w AGENTS.md §5.
