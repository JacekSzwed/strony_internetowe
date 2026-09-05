---
name: gra-poziomy
description: Projektowanie, dodawanie i naprawianie poziomów gry „Emeryk i Skradziony Dzwon” w gra/poziomy.js — szablon nowego poziomu, legenda znaków, reguły grywalności, czytanie wyniku analizatora (pułapki, nieosiągalne przedmioty), nowe motywy tła.
---

# Skill: poziomy gry

Plik: `gra/poziomy.js`. Każdy poziom to blok `(() => { ... POZIOMY.push({...}); })()`. Legenda znaków i funkcje pomocnicze: **AGENTS.md §5**.
Po każdej zmianie: `node gra/analiza.js` → musi być `WYNIK: wszystkie poziomy OK`.

## Szablon nowego poziomu (skopiuj przed `window.POZIOMY = POZIOMY;`)

```js
/* ============================================================ 6. NAZWA (ziemia: wiersz 12) */
(() => {
  nowy(150, 14);                         // szerokość, wysokość w kaflach; wysokość ≥ 12 (ekran ma 11.25 kafla)
  ziemia(0, 149, 12);                    // trawa w wierszu 12, dirt niżej. W jaskini: fill(0,0,149,13,'#'); fill(1,3,148,11,' ');
  sciany();                              // niewidzialne X po bokach — ZAWSZE
  put(3, 11, '@');                       // start (wiersz nad ziemią)
  put(8, 11, 'j');                       // NPC z dymkiem — tekst w npc: { 8: '...' } (klucz = kolumna)

  // --- sekcja 1: nauka (0–40) ---
  put(16, 11, 'z');
  szmaragdy(20, 9, 5);                   // 5 szmaragdów w rzędzie, 2 kafle nad ziemią (zbieralne z ziemi skokiem)
  dziura(26, 28);                        // przerwa 3 kafle — maksimum na jeden skok
  rzad(32, 10, 'PPP'); szmaragdy(32, 8, 3);   // platforma 2 kafle nad ziemią (max skok w górę) + nagroda

  // --- sekcja 2: wyzwanie (40–90) ---
  put(45, 11, 'f');                      // checkpoint (co ~60–80 kafli)
  fill(50, 11, 53, 12, 'V');             // lawa: dno dziury; brzegi muszą pozwolić przeskoczyć (≤3 szer.) lub mieć platformę
  put(52, 9, 'm');                       // ruchoma platforma pozioma (A=40 px) nad lawą
  drabina(60, 6, 11); fill(61, 7, 68, 7, '#');   // drabina sięga 1 kafel PONAD półkę (7-1=6)
  put(64, 6, 'k');

  // --- meta ---
  meta(140, 12);                         // dzwon pod belką; x = środek, y = wiersz podłoża
  POZIOMY.push({
    nazwa: 'Nazwa', motyw: 'wioska', muzyka: 'spokojna', mapa: mapa(),
    opis: 'Jedno–dwa zdania fabuły na kartę poziomu (≤ 2 linie po 46 znaków).',
    npc: { 8: 'Wskazówka mechaniki wprowadzanej w tym poziomie.' },
    // ciemnosc: .7,                      // 0..1 — warstwa mroku z oświetleniem od pochodni/lawy (jaskinie)
    // tlo: [[x0, y0, x1, y1, '#1E140C', '#2A1D12']],   // tylna ściana budowli (prostokąt kafli)
    // muzykaBoss: 'boss', dzwonPoBossie: { x, y },     // tylko poziom z bossem 'b'
  });
})();
```

Motywy tła gotowe: `wioska` (dzień, domki), `las` (zmierzch, drzewa), `jaskinia`, `kopalnia` (belki), `posterunek` (noc, wieża).
**Nowy motyw**: `grafika.js` → dodaj wpis w `NIEBO` (3 kolory gradientu) i `case 'nazwa':` w `rysujTlo()` (użyj `wzgorza/drzewa/domki/chmury/gwiazdy` — sygnatury obok w pliku).
Muzyka: `spokojna` (wioska/las), `jaskinia` (mrok), `boss`. Nowy utwór → skill `gra-dzwiek`.

## Reguły grywalności (zasięg skoku ZMIERZONY w silniku)

| Lądowanie względem odbicia | Maks. przerwa (puste kafle) |
| --- | --- |
| +2 w górę | **2** |
| +1 w górę / płasko / −1 | **3** |
| −2 i niżej | **4** |

| Sytuacja | Dobrze | Źle |
| --- | --- | --- |
| Platforma nad ziemią | 1–2 kafle wyżej | 3+ (nieosiągalna) |
| Przerwa do przeskoczenia | wg tabeli wyżej | np. 3 kafle **i** +2 w górę naraz |
| Miejsce odbicia / lądowania przy lawie lub przepaści | ≥ 2 kafle szerokości | 1-kaflowy słupek między dwiema przepaściami (analizator: `UWAGA trudne skoki`) |
| Dwie przeszkody pod rząd | ≥ 2 kafle płaskiego podłoża między nimi | lawa tuż za `dziura()` bez miejsca na wylądowanie |
| Dziura między ścianami | głębokość ≤ 2 **albo** dno `V`/`^` | głębokość 3 z pustym dnem = **pułapka** |
| Drabina `H` | od podłoża do 1 kafla **ponad** półkę | kończy się równo z półką (nie da się zejść z drabiny) |
| Szmaragd | ≤ 2 kafle nad miejscem, gdzie da się stać | nad lawą bez platformy |
| Wrogowie | zombie/slime na płaskim; szkielet/pillager na półkach (strzelają w dół); creeper z miejscem na ucieczkę | creeper w wąskim korytarzu bez wyjścia |
| Lawa `V` | zawsze 2 wiersze (`fill(x0, 17, x1, 18, 'V')`) — świeci i wygląda głęboko | 1 wiersz z kamieniem pod spodem |
| Checkpoint `f` | na płaskim, co 60–80 kafli, przed trudną sekcją | tuż przed metą |

**Zanim dodasz przeszkodę, obejrzyj sąsiedztwo:** `npm run mapa -- N` i spójrz na ±6 kolumn wokół. Najczęstszy błąd: nowa dziura/lawa tuż obok istniejącej `dziura()` tworzy 1-kaflowy słupek.

## Przepisy na typowe przeszkody (wiersz podłoża = `Z`, np. 12 w Wiosce, 14 w Lesie)

```js
// Rzeka lawy na poziomie ziemi, 3 kafle (płasko → maks. przerwa 3):
fill(64, Z, 66, Z + 1, 'V');                       // lawa zastępuje trawę i dirt; brzegi 62–63 i 67+ ≥ 2 kafle
// Dziura głęboka 3 z lawą na dnie (ściany po bokach, dno śmiertelne — dozwolone, bo V):
fill(64, Z, 66, Z + 2, ' '); fill(64, Z + 3, 66, Z + 3, 'V');   // puste Z..Z+2, lawa w Z+3 (dno); wymaga wys ≥ Z+4
// Przepaść bez dna (śmierć przez spadek poza mapę):
dziura(64, 66);                                    // czyści kolumny 64–66 do samego dołu
// Szmaragdy nad przeszkodą (zbieralne w locie): 1 kafel nad linią skoku
szmaragdy(64, Z - 3, 3);                           // Z-3 = 2 kafle nad brzegiem → osiągalne przy przeskoku
```
Lawa i nacieki **nie blokują ruchu** — to „powietrze, które zabija”. Analizator traktuje je jako śmiertelne dno (`spadnij()` → null), więc dziura z `V` na dnie nigdy nie jest raportowana jako pułapka.

## Jak czytać wynik `node gra/analiza.js`

```
BŁĄD Poziom 3 Jaskinia: start 3,18, meta osiągalna: 0/1, pozycji: 204, przedmioty 29/31  NIEOSIĄGALNE: e(145,11) e(149,11)  *** PUŁAPKI (bez wyjścia): (67,12)  UWAGA trudne skoki (1-kaflowy słupek między przepaściami): (62,13)
```
- `meta osiągalna 0/1` → od startu nie da się dojść do `!`/`b`. Uruchom `node gra/analiza.js -v`, znajdź miejsce, gdzie kończą się kropki `·` (osiągalne pozycje) — tam jest za wysoko/za daleko.
- `NIEOSIĄGALNE: e(x,y)` → szmaragd za wysoko (obniż o 1) lub nad przepaścią bez platformy.
- `PUŁAPKI (x,y)` → gracz może stać w (x, y) [y = wiersz podłoża, stopy na górze kafla y], ale nie ma stamtąd żadnego ruchu. Rozwiązania (w tej kolejności preferencji): **(a)** dno na `^` (`put(x, y, '^')`) lub `V` — śmierć i powrót do checkpointu; **(b)** spłyć do 2 (`put(x, y-1, 'C')`); **(c)** dodaj `_` półkę na ścianie jako stopień. **Nie zamykaj dziury** kaflem na górze — użytkownik chce, by pułapki zostały, ale były uczciwe.
- `UWAGA trudne skoki (x,y)` → to **ostrzeżenie** (kod wyjścia nadal 0): 1-kaflowy słupek ze śmiercią po obu stronach. Jeśli sam go właśnie stworzyłeś — poszerz lądowisko do ≥ 2 kafli albo przesuń przeszkodę. Istniejące ostrzeżenia w Jaskini/Kopalni (półki `_` nad lawą) są celowe.
- Analizator jest przybliżeniem (nie liczy pędu ani czasu reakcji). Jeśli twierdzi OK, a w grze coś nie wychodzi, sprawdź w przeglądarce (skill `gra-testowanie`, Poziom 2 — skrypt z teleportem i sterowaniem).

## Podgląd mapy

`npm run mapa -- 3` (lub `node gra/analiza.js --mapa 3`) wypisuje poziom z numeracją kolumn (dziesiątki + jedności) i wierszy — używaj do znajdowania współrzędnych z raportu.

## Fabuła (spójność)

Emeryk (młody villager) ściga pillagerów, którzy ukradli dzwon wioski. Kolejność: Wioska → Ciemny Las → Jaskinia → Opuszczona Kopalnia → Posterunek Pillagerów (boss: Kapitan). Nowe poziomy wstawiaj fabularnie między istniejące lub po posterunku jako „powrót z dzwonem” (np. Zaśnieżone Góry `U`, Bagno z slime'ami, Nether `O`+`V`). Postęp `gra-postep` to indeks — dodanie poziomu w środku przesuwa zapisane postępy graczy (akceptowalne, ale wspomnij o tym).
