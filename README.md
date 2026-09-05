# Strona „opis postaci steve” + gra „Emeryk i Skradziony Dzwon”

> Strona internetowa o Stevie z Minecrafta z animowanym tłem 2D w stylu 8-bit oraz pełna platformówka 8-bit po polsku.
> **Zero frameworków, zero bundlera, zero plików graficznych i dźwiękowych** — każda tekstura, sprite i nuta są generowane kodem.
> Działa w każdej nowoczesnej przeglądarce (Chrome, Edge, Firefox, Safari), na komputerze i telefonie.

---

## Spis treści

1. [Szybki start](#1-szybki-start)
2. [Struktura repozytorium](#2-struktura-repozytorium)
3. [Strona (index.html + swiat.js)](#3-strona-indexhtml--swiatjs)
4. [Gra — jak grać](#4-gra--jak-grać)
5. [Gra — poziomy](#5-gra--poziomy)
6. [Gra — jak to działa pod spodem](#6-gra--jak-to-działa-pod-spodem)
7. [Testowanie i narzędzia](#7-testowanie-i-narzędzia)
8. [Jak coś zmienić — przepisy](#8-jak-coś-zmienić--przepisy)
9. [Praca z AI (agenci, skille, prompty)](#9-praca-z-ai-agenci-skille-prompty)
10. [Konwencje i zasady projektu](#10-konwencje-i-zasady-projektu)
11. [Znane, celowe decyzje](#11-znane-celowe-decyzje)
12. [Rozwiązywanie problemów](#12-rozwiązywanie-problemów)
13. [Historia zmian](#13-historia-zmian)
14. [Licencje i prawa autorskie](#14-licencje-i-prawa-autorskie)

---

## 1. Szybki start

**Wymagania:** przeglądarka. Do testów i narzędzi: [Node.js](https://nodejs.org) ≥ 18 i Python 3 (serwer statyczny). Nic nie trzeba instalować, żeby *grać*.

```bash
git clone https://github.com/GigaSigmaEmerald/strony_internetowe.git
cd strony_internetowe
npm start                 # = python -m http.server 8765 --bind 127.0.0.1
```
Otwórz <http://127.0.0.1:8765/index.html> (strona) lub <http://127.0.0.1:8765/gra.html> (gra).

Dlaczego przez serwer, a nie dwuklik na plik? Czcionka Minecraft ładuje się z CDN i przeglądarki traktują `file://` restrykcyjnie (CORS, `localStorage`). Otwarcie `index.html` bezpośrednio też zadziała, ale bez gwarancji czcionki.

Testy (2 sekundy, bez przeglądarki):
```bash
npm test
```

---

## 2. Struktura repozytorium

```
strony_internetowe/
├── index.html              strona o Stevie (treść + CSS + przyciski + canvasy tła)
├── swiat.js                świat 2D strony: tekstury, Steve, chmury, animacja motywu        (~500 linii)
├── z4xmg666.jpg            jedyny plik graficzny — zdjęcie Steve'a w treści strony
├── gra.html                strona gry: canvas 320×180, pasek nawigacji, przyciski dotykowe
├── gra/
│   ├── czcionka.js         bitmapowa czcionka 5×7 z polskimi znakami           → window.Czcionka   (~160 linii)
│   ├── dzwiek.js           Web Audio: 25 efektów + 5 utworów (sekwencer)       → window.Dzwiek     (~220 linii)
│   ├── grafika.js          tekstury kafli, sprite'y, tła parallax, tabela KAFLE → window.Grafika   (~420 linii)
│   ├── poziomy.js          5 poziomów budowanych funkcjami                     → window.POZIOMY    (~330 linii)
│   ├── gra.js              silnik: stan, fizyka, AI wrogów, rysowanie, ekrany  → window.GRA        (~820 linii)
│   ├── analiza.js          narzędzie: osiągalność + wykrywanie pułapek w poziomach (Node)
│   ├── test-skladnia.js    test: składnia plików, struktura poziomów, eksporty modułów
│   ├── test-dzwiek.js      test: utwory i SFX na atrapie Web Audio
│   └── test-przegladarka.js smoke test w Chromium (Playwright) — strona + gra
├── package.json            skrypty npm (start, test, test:przegladarka, mapa)
├── AGENTS.md               kompletny przewodnik po kodzie dla agentów AI (i ludzi, którzy lubią zwięźle)
├── .github/
│   ├── copilot-instructions.md   instrukcje ogólne dla Copilota
│   ├── agents/                   Emeryk Dev / Tester / Recenzent (.agent.md)
│   ├── skills/                   gra-poziomy, gra-grafika, gra-dzwiek, gra-testowanie (SKILL.md)
│   ├── prompts/                  /nowy-poziom, /nowy-wrog, /nowy-dzwiek, /napraw-blad, /sprawdz-wszystko
│   └── instructions/             zasady per plik (applyTo) — poziomy, silnik, grafika, dźwięk, strona
└── .vscode/                tasks.json (test, serwer, mapa poziomu), settings.json
```

Każdy plik JS to IIFE `(() => { 'use strict'; … })()` eksportujące dokładnie jeden obiekt na `window`. Kolejność ładowania w `gra.html` jest istotna: **czcionka → dzwiek → grafika → poziomy → gra**.

---

## 3. Strona (`index.html` + `swiat.js`)

### Co widzi użytkownik

- **Motyw jasny:** pasmowe błękitne niebo, kwadratowe słońce, dwie warstwy dryfujących chmur (parallax), stopka z trawy i dirtu z kępkami trawy, makami i mniszkami.
- **Motyw ciemny:** ściana obsydianu z fioletowymi smugami, pochodnie z migającą poświatą, unoszące się iskry (jak cząstki portalu), stopka z bedrocka.
- **Zmiana motywu** (przycisk „🌙 Ciemny motyw / ☀️ Jasny motyw”): przez ekran przechodzi **Steve** (2 bloki wysokości, 8-bit, z boku):
  - *ciemny → jasny*: idzie od lewej z **diamentowym kilofem**, macha nim (szybkie uderzenie, wolniejszy powrót), bloki obsydianu **pękają w 10 stadiach** jak w Minecraft, sypią się odłamki, przy uderzeniu lecą iskry; ściana znika kaskadowo ukośnym frontem; ziemia zmienia się z bedrocka w trawę z obłokiem pyłu.
  - *jasny → ciemny*: idzie od prawej z **blokiem obsydianu w ręce**, ruch ręką „stawiania”, bloki **wyskakują** (skalowanie 0.3 → 1.15 → 1) i budują ścianę; ziemia zamienia się w bedrock.
  - **Kolor tekstu strony zmienia się dokładnie wzdłuż frontu Steve'a** — technicznie: klon całej treści (`.klon`) w kolorach nowego motywu, przycinany `clip-path: polygon(...)` liczonym z pozycji frontu i opóźnień kaskady wierszy.
- Nagłówki `<h1>` używają czcionki **Minecraft** ładowanej z CDN (`@south-paw/typeface-minecraft`).
- Przycisk **„🎮 Zagraj w grę”** prowadzi do `gra.html`.
- Przy `prefers-reduced-motion: reduce` motyw zmienia się natychmiast, bez animacji.

### Co jest nietykalne

**Treść tekstowa strony** (nagłówki, akapity, lista cech Steve'a, zdjęcie) i **układ początkowy** (przyciski u góry po prawej, potem treść). To była wyraźna decyzja właściciela — poprzedni agent zmienił tekst i to nie zostało dobrze przyjęte. Wolno zmieniać CSS, canvasy, stopkę, przyciski, `swiat.js`.

### Jak to działa (swiat.js)

| Element | Implementacja |
| --- | --- |
| Canvasy | `#tlo` (z-index −1: niebo/obsydian, słońce, chmury, pochodnie, iskry) i `#przod` (z-index 5: ziemia, rośliny, cząstki, Steve). Skala pikseli `S` = 3 (desktop) / 2 (< 640 px). Rozmiar aktualizowany na `resize`. |
| Tekstury | `tekstura(rodzaj, wariant)` — 16×16, generowane per piksel z palet `PAL` i deterministycznego `szum(x, y, seed)`; 4 warianty każdej. |
| Stan ściany | `sciana` (Uint8Array KOL×WIE), `pek` (stadium pęknięcia 0–1), `pop` (skala „wyskoczenia”), `ziemia`/`ziemiaPop` dla stopki. |
| Steve | `rysujSteve(g, x, y, dir, faza, tryb, u)` — sprite z tablic znaków (`GLOWA`, `TULOW`, `NOGA`) + proceduralne ramiona/kilof (`belka()` rysuje obrócony prostokąt pikseli). Kąty: `katKilofa(u)` (190° → 55°), `katStawiania(u)`. |
| Przejście | `startPrzejscia()` tworzy `anim` (kierunek, prędkość `v = (W+80)/czas`, czas 3.2–6 s zależnie od szerokości), `aktualizuj(dt)` przesuwa front, uruchamia pękanie/stawianie kolumn z opóźnieniem `OPOZ_WIERSZA` na wiersz, `ustawKlon()` przelicza `clip-path`, `zakonczPrzejscie()` woła oryginalny `toggleTheme()` z `index.html` (zapis `localStorage.theme`, tekst przycisku). |
| Mignięcie | Skrypt w `<head>` ustawia `html.ciemny` przed renderem, żeby przy odświeżeniu w ciemnym motywie nie było białego błysku. |

---

## 4. Gra — jak grać

**Fabuła.** Pillagerzy napadli na wioskę i ukradli dzwon, który ostrzegał mieszkańców. Dorośli bali się ruszyć w pogoń. Emeryk, młody villager, zabrał worek na szmaragdy i wyruszył przez las, jaskinie i kopalnię aż do posterunku pillagerów, gdzie dzwonu strzeże Kapitan.

### Sterowanie

| Akcja | Klawiatura | Dotyk (telefon/tablet) |
| --- | --- | --- |
| ruch | ← → lub A D | ◄ ► |
| skok (dłużej trzymasz = wyżej) | ↑, Spacja lub Z | ● |
| drabina góra/dół | ↑ ↓ | ▲ ▼ |
| menu: wybór / potwierdzenie | ↑↓ / Enter | ▲▼ / ● |
| pauza | Esc lub P | — (menu przez ● w pauzie) |
| dźwięk wł./wył. | M | opcja w menu / pauzie |

Przyciski dotykowe pokazują się automatycznie na urządzeniach bez myszy (`@media (pointer: coarse)`).

### Zasady

- **3 serca** (HP). Trafienie przez wroga lub strzałę = −1 serce i 1,25 s nietykalności (mruganie). Kaktus rani. **Lawa i nacieki (kolce) zabijają natychmiast.** Spadek poza mapę zabija.
- **Życia** (start: 3, licznik ×N w HUD). Śmierć = −1 życie i powrót do **ostatniego ogniska** (checkpointu) albo startu poziomu. 0 żyć = **Koniec gry** → Enter wznawia poziom z 3 życiami (szmaragdy z tego poziomu przepadają).
- **Skok na głowę** pokonuje zombie, szkielety, slime'y i pillagerów (skok z góry: `vy > 0` i stopy w górnych 10 px wroga). Zderzenie z boku rani.
- **Creeper**: gdy podejdziesz na ~22 px, zaczyna **syczeć i po 1 s wybucha** (promień 30 px, 2 serca, zabija też inne wrogi). Skok na głowę **nie** zabija go — tylko odpala krótszy lont (0,45 s) i odbija Cię wysoko. Uciekaj!
- **Szkielet** strzela łukiem (celuje w Ciebie, zasięg 150 px), **pillager** kuszą (poziomo, zasięg 130 px). Strzały można przeskoczyć.
- **Slime** skacze w Twoją stronę co ~1,3 s.
- **Szmaragdy**: licznik w HUD; **co 50 = dodatkowe życie**. **Złote jabłko** = pełne zdrowie. **Totem** = +1 życie.
- **Ognisko** = punkt kontrolny (zapala się po dotknięciu).
- **Dzwon** = meta poziomu. Dotknij go, żeby ukończyć.
- **Boss — Kapitan Pillagerów** (poziom 5, dach wieży): 3 serca (własny pasek w HUD). Goni, skacze, strzela salwą 3 strzał. **Skocz mu na głowę 3 razy** (po trafieniu 1,5 s nietykalności, mruga na biało). Po pokonaniu pojawia się dzwon.
- Postęp (najwyższy odblokowany poziom) i rekord szmaragdów zapisują się w przeglądarce (`localStorage`). „Kontynuuj” w menu startowym.

### Ekrany

`Tytuł` (Emeryk na łące, kurczak na wysepce w lawie ♥, uciekający pillager z dzwonem w tle, menu w stylu Minecrafta) → `Intro` (tekst fabuły pisany litera po literze) → `Karta poziomu` (numer, nazwa, opis, życia) → **Gra** ⇄ `Pauza` → `Poziom ukończony` (szmaragdy, czas) → … → `Zwycięstwo` (dzwon w wiosce, fajerwerki, rekord) / `Koniec gry`.

---

## 5. Gra — poziomy

| # | Nazwa | Rozmiar (kafle) | Klimat | Muzyka | Wrogowie | Szmaragdy | Nowości |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **Wioska** | 160×14 | dzień, domki w tle, wzgórza | spokojna | 6 zombie, 3 slime | 37 | podstawy: skok, stomp, dziury, płotki, dachy domów |
| 2 | **Ciemny Las** | 190×16 | zmierzch, drzewa (2 warstwy parallax) | spokojna | 3 zombie, 4 creepery, 4 szkielety, 4 slime | 31 | creepery, strzały, platformy z liści, wysoka ścieżka z jabłkiem |
| 3 | **Jaskinia** | 200×20 | ciemność (0.74) z pochodniami | jaskinia | 6 zombie, 4 creepery, 4 szkielety, 2 slime | 30 | oświetlenie, lawa (100 kafli), drabiny, półki, nacieki (10) |
| 4 | **Opuszczona Kopalnia** | 210×20 | półmrok (0.6), belki, tory | jaskinia | 6 zombie, 2 creepery, 3 szkielety, 6 pillagerów | 26 | **8 ruchomych platform** (poziome i pionowa) nad lawą (106 kafli), pillagerzy z kuszami, nacieki (17) |
| 5 | **Posterunek Pillagerów** | 130×30 | noc, gwiazdy, księżyc, wieża | jaskinia → **boss** | 3 zombie, 1 creeper, 4 pillagerów, **Kapitan** | 33 | wieża z 4 piętrami i drabinami (naprzemiennie lewo/prawo), arena bossa na dachu |

Każdy poziom ma NPC **Starszego** na starcie (dymek z podpowiedzią o nowej mechanice) i 1 złote jabłko. Checkpointy: 1 w Wiosce i Lesie, 2 w Jaskini i Kopalni.

Wszystkie poziomy są **automatycznie weryfikowane** (`node gra/analiza.js`): meta osiągalna, 100 % szmaragdów zbieralnych, **0 miejsc, z których nie da się wyjść**.

---

## 6. Gra — jak to działa pod spodem

### Pętla i rozdzielczość

- Canvas logiczny **320×180 px**, skalowany CSS-em do **całkowitej** krotności (1×, 2×, 3×…) — `dopasuj()` w `gra.js`. Skala ułamkowa powodowałaby migotanie krawędzi sprite'ów.
- Stały krok fizyki **60 Hz** (`aktualizuj()`), akumulator czasu, maks. 4 kroki na klatkę (po zwinięciu karty nie ma „teleportu”). Rysowanie co `requestAnimationFrame`.
- `imageSmoothingEnabled = false`, wszystkie pozycje rysowania przez `Math.round()`.

### Fizyka (stałe na górze `gra.js`)

| Stała | Wartość | Znaczenie |
| --- | --- | --- |
| `T` | 16 | rozmiar kafla w px |
| `GRAW` | 0.28 | grawitacja px/klatkę² |
| `MAX_SPAD` | 5 | maks. prędkość spadania |
| `SKOK` | −5 | prędkość początkowa skoku |
| `PREDKOSC` | 1.65 | maks. prędkość biegu |

**Zasięg skoku zmierzony w silniku** (ile pustych kafli da się przeskoczyć):

| lądowanie względem odbicia | +2 w górę | +1 | płasko | −1 | −2 i niżej |
| --- | --- | --- | --- | --- | --- |
| maks. przerwa | 2 | 3 | 3 | 3 | 4 |

Gracz: hitbox 10×21. Przyspieszenie 0.26 (ziemia) / 0.17 (powietrze), tarcie 0.74 / 0.93. **Coyote time** 6 klatek (można skoczyć tuż po zejściu z krawędzi), **bufor skoku** 7 klatek (naciśnięcie chwilę przed lądowaniem działa), **skok zmienny** (puszczenie klawisza obcina `vy` do −1.8).

Kolizje kafelkowe w `ruszX()`/`ruszY()` (wspólne dla gracza i wrogów): najpierw ruch w X z korektą do krawędzi kafla, potem w Y. `ruszY` sprawdza kafel przy krawędzi stóp `e.y + e.h` (nie `-1`) — to eliminuje drganie o 1 px przy staniu. Półki `_` i ruchome platformy trzymają tylko przy spadaniu z góry (`stareDol <= górna krawędź`). Ruchome platformy przenoszą byty (`e.platforma.dx/dy`).

### Mapa poziomu

Tablica stringów, 1 znak = 1 kafel, wiersz 0 = góra. Przy wczytaniu (`wczytajPoziom()`) znaki **kafli** zostają w `P.k[y][x]`, a znaki **bytów** są zamieniane na spację i tworzą obiekty (`P.wrogowie`, `P.przedmioty`, `P.npc`, `P.ogniska`, `P.platformy`, `P.dzwon`).

**Kafle** (definicje w `KAFLE`, `gra/grafika.js`):

| Znak | Kafel | Zachowanie |
| --- | --- | --- |
| `#` `G` `D` `C` `P` `N` `l` `B` `O` | kamień, trawa, dirt, bruk, deski, ciemne deski, liście, cegły, obsydian | pełne bloki |
| `Q` `I` `Y` `E` | rudy: węgiel, żelazo, diament, szmaragd | pełne (dekoracja ścian) |
| `W` `S` `R` `w` `T` `M` `U` `F` | bedrock, piasek, półka z książkami, okno, TNT, mech, trawa ze śniegiem, płotek | pełne |
| `i` | glowstone | pełny, świeci (r = 34) |
| `K` | kaktus | pełny, rani |
| `V` | lawa | **zabija**, świeci, animowana |
| `^` | nacieki / kolce | **zabija** (rysowane u dołu kafla) |
| `H` | drabina | ↑↓ wchodzenie, nie blokuje |
| `_` | półka z desek (pół kafla) | można stać, przeskoczyć od dołu |
| `=` `L` `\|` | tory, pień drzewa, słupek | **tło**, nie blokują |
| `*` | pochodnia | tło, światło (r = 40) |
| `X` | niewidzialna ściana | granice poziomu |

**Byty:** `@` start · `j` NPC Starszy · `h` kurczak · `z` zombie · `c` creeper · `k` szkielet · `s` slime · `p` pillager · `b` boss · `e` szmaragd · `a` złote jabłko · `o` totem · `f` ognisko · `!` dzwon · `m` platforma pozioma · `n` platforma pionowa.

Poziomy w `gra/poziomy.js` są budowane funkcjami (`ziemia`, `fill`, `rzad`, `dom`, `drzewo`, `schody`, `drabina`, `szmaragdy`, `meta`, …) — patrz [`.github/skills/gra-poziomy/SKILL.md`](.github/skills/gra-poziomy/SKILL.md) z szablonem nowego poziomu.

### Wrogowie (AI w `aktualizujWroga()`)

| Typ | Hitbox | Zachowanie |
| --- | --- | --- |
| zombie | 8×23 | patroluje (zawraca przy ścianie/krawędzi), goni gdy gracz < 100 px w poziomie i < 40 px w pionie |
| creeper | 8×21 | jak zombie; < 22 px → lont 1 s → wybuch r = 30 (2 serca, zabija wrogów); stomp = lont 0,45 s |
| szkielet | 8×23 | patroluje; widzi < 150 px → staje i strzela co 1,9 s (celuje, kąt ±0,6 rad) |
| pillager | 10×23 | jak szkielet, zasięg 130 px, strzela poziomo co 2,1 s |
| slime | 12×10 | co ~1,3 s skacze (`vy −3.3`) w stronę gracza; animacja ściskania |
| boss | 12×23, 3 HP | aktywuje się < 150 px; cykl 3,4 s: 2,2 s gonienia (skacze na ściany) + salwa 3 strzał; szybszy z każdym trafieniem |

### Ciemność

`P.def.ciemnosc` (0–1) włącza `rysujCiemnosc()`: czarna warstwa na osobnym canvasie z wycięciami `destination-out` (gradienty radialne) dla gracza (r = 74), pochodni (46 ± migotanie), lawy (24), glowstone (40), ognisk (44) i wybuchów (90). Na wierzch ciepła poświata pochodni (`lighter`).

### Dźwięk (`gra/dzwiek.js`)

Web Audio bez plików. **25 efektów** (`SFX`: skok, szmaragd, stomp, obrażenia, śmierć, wybuch, syk, strzała, łuk, dzwon, checkpoint, jabłko, totem, menu, wybór, pauza, kropla, slime, kurczak, boss, krok, lądowanie, koniec poziomu, game over, plusk) i **5 utworów** w formacie tekstowym nut:

| Utwór | Gdzie | Charakter |
| --- | --- | --- |
| `tytul` | ekran startowy | 152 BPM, energiczny „kurczakowy” rock-chiptune z gdakaniem (square + sawtooth + perkusja) |
| `spokojna` | Wioska, Las | 66 BPM, nostalgiczne arpeggia (triangle) z pogłosem, F-dur |
| `jaskinia` | Jaskinia, Kopalnia, Posterunek | 58 BPM, mroczna, a-moll, duży pogłos, długie pauzy |
| `boss` | walka z Kapitanem | 140 BPM, d-moll, square + sawtooth + perkusja |
| `zwyciestwo` | ekran zwycięstwa | fanfara (jednorazowa) |

Zapis nut: `A4:1` (nazwa+oktawa : długość w bitach), `-:2` pauza, `C4+E4+G4:4` akord, perkusja `k s h H`. Sekwencer planuje nuty 0,3 s do przodu (`setInterval` 90 ms). Echo: delay 0,34 s. `AudioContext` startuje po pierwszym klawiszu/kliknięciu (polityka autoplay). **Muzyka gra tylko w grze, nigdy na stronie.** Wszystkie kompozycje są oryginalne (patrz [§14](#14-licencje-i-prawa-autorskie)).

### Czcionka (`gra/czcionka.js`)

Bitmapowa 5×7, siatka 6 px, wysokość linii 12 px, **pełne polskie znaki** (ą ć ę ł ń ó ś ź ż + wielkie) budowane z liter bazowych + kreska/kropka/ogonek. `Czcionka.tekst(g, s, x, y, kolor, { wyr: 'lewo'|'srodek'|'prawo', cien, skala })`, `lamTekst(s, maxPx)`.

### Zapis (`localStorage`)

| Klucz | Znaczenie |
| --- | --- |
| `gra-postep` | indeks najwyższego odblokowanego poziomu (0–4) — „Kontynuuj” w menu |
| `gra-rekord` | najlepszy wynik szmaragdów za całą grę |
| `gra-wyciszone` | `'1'` = dźwięk wyłączony |
| `theme` | `'dark'`/`'light'` — motyw strony |

Reset: w konsoli przeglądarki `localStorage.clear()`.

### API debugowe

Gra wystawia `window.GRA` — pełna ściągawka w [`.github/skills/gra-testowanie/SKILL.md`](.github/skills/gra-testowanie/SKILL.md). Najczęstsze:
```js
GRA.gra.poziomNr = 3; GRA.startPoziomu(); GRA.gra.stan = 'gra';   // wczytaj Kopalnię
GRA.gracz.x = 100 * 16; GRA.gracz.y = 17 * 16 - 21; GRA.gracz.vy = 0;   // teleport na kolumnę 100
GRA.gracz.nietykalny = 99999;                                      // tryb boga
GRA.poziom.boss                                                    // obiekt bossa (hp, x, y)
```

---

## 7. Testowanie i narzędzia

| Komenda | Co robi | Czas |
| --- | --- | --- |
| `npm test` | **wszystko poniżej bez przeglądarki**: składnia + struktura + poziomy + dźwięk | ~2 s |
| `npm run test:skladnia` | `gra/test-skladnia.js` — parsowanie każdego JS, eksporty modułów, pola i znaki każdego poziomu, polskie znaki czcionki | <1 s |
| `npm run test:poziomy` | `gra/analiza.js` — BFS po pozycjach stania z regułami fizyki: **meta osiągalna**, **100 % przedmiotów zbieralnych**, **brak pułapek** (pozycji bez żadnego ruchu wyjścia) | <1 s |
| `npm run test:dzwiek` | `gra/test-dzwiek.js` — odtwarza 60 s każdego utworu i każdy SFX na atrapie Web Audio; wykrywa puste utwory, ciche efekty, błędne rampy | <1 s |
| `npm run test:przegladarka` | `gra/test-przegladarka.js` — **Chromium (Playwright)**: brak błędów JS na obu stronach, animacja motywu, wczytanie każdego poziomu, stabilne stanie (brak drgania), skok, lawa → śmierć → respawn, dzwon → koniec poziomu, **pomiar zasięgu skoku** (zgodność z tabelą analizatora). Sam uruchamia i zatrzymuje serwer. | ~40 s |
| `npm run mapa -- 3` | wypisuje mapę poziomu 3 z numeracją kolumn i wierszy | — |
| `node gra/analiza.js -v` | jak `test:poziomy` + mapy z kropkami `·` na osiągalnych pozycjach | — |

Test przeglądarkowy wymaga jednorazowo: `npm i -D playwright && npx playwright install chromium` (~120 MB, `node_modules` jest w `.gitignore`).

Każdy skrypt kończy się linią `WYNIK: …` i kodem wyjścia 0/1 — nadaje się do CI.

W VS Code: **Terminal → Run Task** → `test`, `test: przegladarka`, `test: poziomy`, `mapa poziomu`, `serwer`, `playwright: instaluj` (`.vscode/tasks.json`). Domyślne zadanie testowe (`Ctrl+Shift+P` → „Run Test Task”) to `npm test`.

### Jak czytać wynik analizatora

```
BŁĄD Poziom 3 Jaskinia: start 3,18, meta osiągalna: 0/1, pozycji: 204, przedmioty 29/31  NIEOSIĄGALNE: e(145,11)  *** PUŁAPKI (bez wyjścia): (67,12)
```
- `meta osiągalna 0/1` — od startu nie da się dojść do dzwonu; `-v` pokaże, gdzie kończą się kropki.
- `NIEOSIĄGALNE: e(x,y)` — szmaragd za wysoko/za daleko od miejsca, gdzie da się stać (obniż o 1 wiersz).
- `PUŁAPKI (x,y)` — gracz może stanąć w kolumnie x na kaflu y, ale nie ma stamtąd żadnego ruchu (ściany > 2 kafle). Rozwiązanie: **dno `^`/`V`** (śmierć i powrót do checkpointu) albo spłycenie do 2 kafli. **Nie zamykamy dziur** — to decyzja projektowa (pułapki mają zostać, ale być uczciwe).
- `UWAGA trudne skoki (x,y)` — ostrzeżenie (kod wyjścia 0): 1-kaflowy słupek ze śmiertelną przepaścią po obu stronach; wymaga idealnego lądowania i natychmiastowego odbicia. Istniejące w Jaskini/Kopalni (półki nad lawą) są celowe; nowe raczej poszerz do 2 kafli.
- Analizator to przybliżenie (nie liczy pędu ani czasu reakcji) — skalibrowany pomiarami w silniku (tabela w §6), ale trudne miejsca warto sprawdzić w przeglądarce.

---

## 8. Jak coś zmienić — przepisy

Szczegółowe, krok po kroku przepisy są w skillach (`.github/skills/*/SKILL.md`) — działają zarówno dla ludzi, jak i dla AI. Skrót:

| Chcę… | Gdzie | Potem |
| --- | --- | --- |
| **dodać poziom** | `gra/poziomy.js` — skopiuj szablon ze skilla `gra-poziomy`, wstaw blok przed `window.POZIOMY` (poziom z bossem musi zostać ostatni) | `node gra/analiza.js` → 0 pułapek; `npm test`; dopisz do tabeli w §5 |
| **zmienić trudność** | stałe fizyki (`gra.js` góra), prędkości wrogów (`nowyWrog`), zasięgi widzenia (`aktualizujWroga`), HP bossa (`nowyWrog` → `case 'boss'`), życia startowe (`gra.zycia = 3` w `nowaGra`) | `npm run test:przegladarka` |
| **nowego wroga** | 5 miejsc: sprite w `grafika.js`, `nowyWrog`, `aktualizujWroga`, `sprWroga`/`rysujWroga`/`koloryWroga`, znak w `wczytajPoziom` — checklista w skillu `gra-grafika` | dopisz znak do „znane” w `test-skladnia.js`, do legendy w `AGENTS.md` i tu |
| **nowy przedmiot** | `wczytajPoziom` (case) → pętla w `aktualizujGracza` → `rysujSwiat`; sprite w `grafika.js` | jw. |
| **nowy kafel** | `KAFLE` w `grafika.js` (+ `tekstura()` case, paleta w `PAL`) | `STALE`/`SMIERTELNE` w `analiza.js`, „znane” w `test-skladnia.js` |
| **nowy dźwięk / utwór** | `SFX` / `UTWORY` w `gra/dzwiek.js` — recepty i klimaty w skillu `gra-dzwiek` | dopisz do list w `test-dzwiek.js`; `npm run test:dzwiek` |
| **nowe tło (motyw)** | `NIEBO[motyw]` + `case` w `rysujTlo()` w `grafika.js` (funkcje `wzgorza`, `drzewa`, `domki`, `chmury`, `gwiazdy`) | — |
| **tekst UI / ekran** | `gra.js` → `rysujTytul`, `rysujKarte`, `rysujHUD`, … ; nowy stan = `case` w `aktualizuj()` **i** `rysuj()` | — |
| **sterowanie** | `wej` w `gra.js`; przyciski dotykowe w `gra.html` (`#d-lewo` …) | — |
| **wygląd strony** | `index.html` `<style>`; tło i Steve w `swiat.js` | nie ruszaj treści tekstowej |

---

## 9. Praca z AI (agenci, skille, prompty)

Repozytorium jest przygotowane do dalszego rozwoju przez **małe, tanie modele** (np. Claude Haiku 4.5, GPT-5 mini) — cała wiedza o kodzie jest spisana, więc model nie musi czytać źródeł ani dopytywać.

### Warstwy

| Warstwa | Plik | Rola |
| --- | --- | --- |
| **Wiedza** (zawsze wczytana) | [`AGENTS.md`](AGENTS.md) | kompletny przewodnik: mapa plików, stałe fizyki, legenda mapy, API `GRA`, tabela „gdzie co zmienić”, zasady, celowe decyzje |
| | `.github/copilot-instructions.md` | skrót zasad + wskazanie agentów i promptów |
| **Zasady per plik** | `.github/instructions/*.instructions.md` | `applyTo: gra/poziomy.js`, `gra/gra.js`, `gra/grafika.js`, `gra/dzwiek.js`, `index.html,swiat.js` — wczytywane, gdy agent dotyka danego pliku |
| **Skille** (na żądanie) | `.github/skills/gra-poziomy` · `gra-grafika` · `gra-dzwiek` · `gra-testowanie` | szablony, checklisty, palety, receptury dźwięków, diagnozy objawów, skrypty testowe |
| **Agenci** | `.github/agents/*.agent.md` | **Emeryk Dev** (programista — edycja, testy, commity), **Emeryk Tester** (tylko weryfikacja w Chromium, raport), **Emeryk Recenzent** (przegląd diffu wg reguł). Handoffy między nimi. Model: `['Claude Haiku 4.5', 'GPT-5 mini', 'Claude Sonnet 4.5']` (pierwszy dostępny). |
| **Prompty** (slash-komendy) | `.github/prompts/*.prompt.md` | `/nowy-poziom`, `/nowy-wrog`, `/nowy-dzwiek`, `/napraw-blad`, `/sprawdz-wszystko` — gotowe procedury z pytaniem o parametry |
| **Zadania VS Code** | `.vscode/tasks.json` | agent może odpalić `test`, `serwer`, `mapa poziomu` przez `runTasks` |

### Jak używać

1. Otwórz repo w VS Code z Copilot Chat. W selektorze agentów wybierz **Emeryk Dev**.
2. Napisz np. „zombie w Lesie są za szybkie” albo użyj promptu: wpisz `/nowy-poziom` i odpowiedz na pytanie o opis.
3. Agent: lokalizuje miejsce (tabela w AGENTS.md), robi minimalną zmianę, uruchamia `npm test`, podsumowuje. Przy zmianach fizyki/grafiki zaproponuje handoff do **Emeryk Tester** (test w Chromium) lub **Emeryk Recenzent** (przegląd).
4. Commit robi tylko na prośbę (po polsku, z trailerem `Co-authored-by: Copilot …`).

Agent **Emeryk Dev** ma narzędzia: `edit`, `search`, `read`, `runCommands`, `runTasks`, `problems`, `changes`, `testFailure`, `todo`. Tester dodatkowo `openSimpleBrowser`, ale bez `edit`. Recenzent tylko czyta.

Jeśli używasz innego narzędzia (Claude Code, Copilot CLI, Cursor): `AGENTS.md` jest standardem czytanym przez większość z nich; skille są w otwartym formacie [agentskills.io](https://agentskills.io).

### Jak to zostało sprawdzone

Zestaw był testowany na żywo z **Claude Haiku 4.5** (mały, tani model) — dostał wyłącznie pliki z `.github/` + `AGENTS.md` i to samo zadanie dwukrotnie: *„W Ciemnym Lesie dodaj dziurę głęboką 3 z lawą na dnie i 2 szmaragdy nad nią; sprawdź przechodniość”*.

| Próba | Wynik | Wniosek |
| --- | --- | --- |
| 1 (dokumentacja v1) | 4 odczyty plików, `npm test` zielony, ale dziura postawiona **tuż za istniejącą przepaścią** → 1-kaflowy słupek, w praktyce prawie nie do przeskoczenia. Analizator tego nie wykrył. | Luka w narzędziach, nie w modelu. Dodano: pomiar zasięgu skoku w silniku (tabela w AGENTS.md §4), skalibrowaną tabelę w analizatorze, detektor `UWAGA trudne skoki`, regułę „lądowisko ≥ 2 kafle”, przepisy na typowe przeszkody w skillu. |
| 2 (dokumentacja v2) | Lądowisko 2 kafle, lawa 3 kafle przy +1 — **przeskok udaje się przy każdym momencie odbicia**, analizator czysty, 0 pytań do użytkownika. Model sam zgłosił dwie niejasności (czy lawa blokuje; jak układać lawę na dnie) → dopisane. | Zestaw działa dla małego modelu. |

Wniosek praktyczny: **zawsze czytaj linię `UWAGA` z analizatora**, nawet gdy `WYNIK: OK` — to sygnał, że nowa przeszkoda stoi za blisko starej.

---

## 10. Konwencje i zasady projektu

- **Język:** polski — nazwy funkcji, zmiennych, komentarze, teksty UI, komunikaty commitów. Bez wyjątków.
- **Styl:** zwięzły, funkcje krótkie, jednolinijkowe `if` gdzie czytelne, komentarze tylko tam, gdzie coś nie jest oczywiste. Dwie spacje, brak formattera.
- **Zero zależności runtime.** Żadnych frameworków, bundlerów, TypeScriptu, npm-pakietów w kodzie strony/gry. `playwright` jest wyłącznie dev-zależnością testów.
- **Zero plików graficznych i dźwiękowych.** Wszystko z kodu (jedyny wyjątek: `z4xmg666.jpg` w treści strony).
- **Treść tekstowa `index.html` i układ początkowy są nietykalne.**
- **Piksel-perfect:** `Math.round` przed rysowaniem, całkowita skala canvasu, `imageSmoothingEnabled = false`.
- **Poziomy:** przerwa ≤ 3 kafle (płasko / +1), ≤ 2 przy +2 w górę, ≤ 4 przy spadaniu; dziura głębsza niż 2 kafle **musi** mieć na dnie `V`/`^`; lądowisko przy śmierci ≥ 2 kafle; drabina 1 kafel ponad półkę; checkpoint co 60–80 kafli; `sciany()` zawsze; jeden `@`; `meta()` lub `b` na końcu.
- **Testy przed commitem:** `npm test` zielony. Po zmianach poziomów `analiza.js` = `wszystkie poziomy OK`. Po zmianach fizyki/rysowania `test:przegladarka`.
- **Commity:** po polsku, temat + co i dlaczego, trailer `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` gdy pisał agent.
- **Muzyka** tylko w grze; kompozycje oryginalne.

---

## 11. Znane, celowe decyzje

Rzeczy, które wyglądają jak błędy, ale nie są — nie „naprawiaj” ich:

| Co | Dlaczego |
| --- | --- |
| `ruszY` sprawdza kafel przy `e.y + e.h` (nie `e.h - 1`) | inaczej grawitacja „zapada” postać o ułamek px i kolizja cofa ją klatkę później → widoczne drganie 1 px wszystkich postaci |
| skala CSS canvasu tylko całkowita | ułamkowa (np. 1.9×) rozmywa i migocze krawędzie sprite'ów |
| `^` (nacieki) i `V` (lawa) zabijają natychmiast | żeby nie było studni bez wyjścia; właściciel wolał „przepaść i śmierć” od zamykania dziur |
| pnie `L`, tory `=`, słupki `\|` nie blokują | tło; przez pień można przejść, jak w 2D-platformówkach |
| creeper po skoku na głowę nie ginie | jak w Minecraft: syczy i wybucha, trzeba uciec |
| boss odrzuca gracza po trafieniu i ma 90 klatek nietykalności | inaczej dało się „stać na głowie” i wygrać w 1 s |
| dach domów w tle (`domki()`) rysowany od wąskiego szczytu do szerokiej podstawy | wcześniej był odwrócony — to poprawka, nie błąd |
| `toggleTheme` na stronie jest nadpisany w `swiat.js` | oryginał z `index.html` jest wołany na końcu animacji, żeby zachować zapis i tekst przycisku |
| kolejność przycisków: „🎮 Zagraj w grę” przed „🌙 Ciemny motyw” | prośba właściciela |

---

## 12. Rozwiązywanie problemów

| Objaw | Przyczyna / rozwiązanie |
| --- | --- |
| Nagłówek nie ma czcionki Minecraft | strona otwarta z `file://` lub brak internetu — CDN `cdn.jsdelivr.net`; przeglądarka pokazuje monospace jako fallback. Konsola może ostrzegać `OTS parsing error` (woff2) — nieszkodliwe, ładuje się woff. |
| Brak dźwięku w grze | kliknij lub naciśnij klawisz (polityka autoplay) · sprawdź `M` / opcję „Dźwięk” · `localStorage['gra-wyciszone']` |
| Gra „stoi” w tle w VS Code Simple Browser | przeglądarka wstrzymuje `requestAnimationFrame` w niewidocznych kartach; testy uruchamiaj w headless Chromium (`npm run test:przegladarka`) |
| `npm run test:przegladarka` → „Brak pakietu playwright” | `npm i -D playwright && npx playwright install chromium` |
| `Cannot read properties of null (reading 'x')` w `wczytajPoziom` | brak `@` w mapie — `npm run test:skladnia` to wykrywa |
| postać drga o 1 px | ktoś zmienił `ruszY` na `e.h - 1` lub skala CSS nie jest całkowita — patrz §11 |
| gracz utknął w dziurze | `node gra/analiza.js` → `PUŁAPKI (x,y)` → dno `^`/`V` lub spłyć do 2 |
| szmaragd nie do zebrania | `NIEOSIĄGALNE: e(x,y)` → obniż o 1 wiersz |
| wróg spada przez półkę `_` | półki trzymają tylko od góry; wroga stawiaj **na** półce (wiersz nad `_`), nie nad nią w powietrzu |
| muzyka nie zmienia się na bossa | boss aktywuje się, gdy gracz jest < 150 px w poziomie i < 60 px w pionie od niego (`aktualizuj()`) |
| po dodaniu poziomu w środku „Kontynuuj” prowadzi w złe miejsce | `gra-postep` to indeks — wyczyść `localStorage` lub dodawaj poziomy na końcu (przed posterunkiem z bossem) |
| port 8765 zajęty | zmień w `package.json` (`start`) i `gra/test-przegladarka.js` (`PORT`) |

---

## 13. Historia zmian

| Commit | Co |
| --- | --- |
| `09f73b0` | Strona: świat 2D (niebo/obsydian, stopka trawa/bedrock), animacja Steve'a (kopanie / stawianie), czcionka Minecraft, przycisk gry |
| `19b345c` | Gra: silnik, grafika z kodu, czcionka, dźwięk (5 utworów, 25 SFX), 5 poziomów |
| `e7d4594` | Poziomy przeprojektowane pod fizykę (skok 2↑/3→), analizator osiągalności `gra/analiza.js` |
| `b373e1d` | Tylna ściana wieży, hitbox dzwonu, testy mechanik w przeglądarce |
| `7ae8819` | Kurczak w wiosce, układ ekranu tytułowego, README |
| `2bd70c1` | Nacieki `^` śmiertelne (koniec utykania w studniach); **naprawa drgania postaci** (`ruszY` przy krawędzi stóp; całkowita skala) |
| `20cd066` | Dach domków w tle odwrócony → naprawiony; detektor pułapek w analizatorze; studnie (67,12) Wioska i (123,18) Jaskinia → śmiertelne dno |
| *(ten)* | Zestaw dla AI: `AGENTS.md`, 3 agenci (Dev/Tester/Recenzent), 4 skille, 5 promptów, instrukcje per plik, zadania VS Code; testy `npm test` (składnia, poziomy, dźwięk) i `test:przegladarka` (17 testów w Chromium, w tym pomiar zasięgu skoku); analizator skalibrowany pomiarami + ostrzeżenia o trudnych skokach; ten README. Zestaw zweryfikowany na żywo z Haiku 4.5. |

---

## 14. Licencje i prawa autorskie

- Kod (HTML/CSS/JS, grafika i muzyka generowane kodem) — autorstwo właściciela repozytorium; brak osobnej licencji = wszystkie prawa zastrzeżone, chyba że właściciel doda plik `LICENSE`.
- **Minecraft** jest znakiem towarowym Mojang / Microsoft. Projekt to fanowska strona i gra inspirowana stylem; nie zawiera zasobów z gry (tekstur, dźwięków, muzyki). Palety kolorów to przybliżenia.
- **Muzyka** w grze to oryginalne kompozycje chiptune stworzone dla tego projektu. Nie zawiera melodii C418 / Lena Raine ani utworu „Lava Chicken” z filmu — świadomie, ze względu na prawa autorskie. Utwór tytułowy jest jedynie żartobliwą inspiracją klimatem.
- Czcionka **Minecraft** (`@south-paw/typeface-minecraft`) ładowana z CDN jsDelivr na licencji pakietu.
- `z4xmg666.jpg` — zdjęcie Steve'a dostarczone przez właściciela strony.
