# AGENTS.md — przewodnik dla agentów AI pracujących nad tym repozytorium

Ten plik jest wczytywany automatycznie do każdej rozmowy. Zawiera **wszystko, co trzeba wiedzieć o kodzie**,
żeby pracować bez czytania całych plików. Czytaj źródła tylko punktowo (konkretne funkcje wg tabel niżej).

## 1. Co to za projekt

Dwie rzeczy w jednym repo, czysty HTML/CSS/JS, **zero frameworków, zero bundlera, zero plików graficznych/audio**
(każda grafika i dźwięk jest generowany kodem):

| Część | Pliki | Opis |
| --- | --- | --- |
| **Strona** | `index.html`, `swiat.js` | „opis postaci steve” — strona dziecka o Stevie z Minecrafta. Tło 2D 8-bit w canvasie, animowana zmiana motywu (Steve kopie/stawia bloki). **Tekst treści strony jest nietykalny** — nie zmieniaj go. |
| **Gra** | `gra.html`, `gra/*.js` | „Emeryk i Skradziony Dzwon” — platformówka 2D 8-bit po polsku (5 poziomów, boss, muzyka). Wejście przyciskiem „🎮 Zagraj w grę” na stronie. |

Język kodu: **polski** (nazwy funkcji, zmiennych, komentarze). Trzymaj się tego. Gracz i tekst UI również po polsku.
Styl: zwięzły, jednolinijkowe `if`, bez semikolonowej pedanterii; komentarze tylko tam, gdzie coś wymaga wyjaśnienia.

## 2. Jak uruchomić i sprawdzić (ZAWSZE przed oddaniem zmian)

```bash
npm test                      # składnia + struktura poziomów + osiągalność/pułapki + testy analizatora + dźwięk (Node, ~10 s, bez przeglądarki)
npm run test:przegladarka     # smoke test w Chromium (wymaga: npm i -D playwright && npx playwright install chromium); --pelna = pełna kalibracja skoków
npm start                     # serwer http://127.0.0.1:8765  (python -m http.server) — otwórz index.html lub gra.html
npm run mapa -- 3             # wypisz mapę poziomu 3 z numeracją kolumn (do projektowania poziomów)
```

Kod wyjścia ≠ 0 = coś jest źle; komunikat mówi co. **Nie commituj, gdy `npm test` nie przechodzi.**
Po zmianie w `gra/poziomy.js` zawsze `node gra/analiza.js`. Po zmianie w `gra/dzwiek.js` zawsze `node gra/test-dzwiek.js`.
Po zmianie fizyki gracza w `gra/gra.js` (stałe, `ruszX/ruszY`, `aktualizujGracza`) **skopiuj zmianę do mini-silnika w `gra/analiza.js` (`krok()`)** i uruchom `npm run test:przegladarka` — test kalibracji musi dać 100 % zgodności.

Debug w przeglądarce: gra wystawia `window.GRA` (patrz §6) — można teleportować gracza, zmienić poziom, odczytać stan.

## 3. Mapa plików

```
index.html          strona; CSS inline; przyciski; <canvas id=tlo> (tło) i <canvas id=przod> (ziemia/Steve); ładuje swiat.js
swiat.js            świat 2D strony: tekstury, sprite Steve'a, chmury, pochodnie, animacja przejścia motywu (~400 linii)
gra.html            strona gry: <canvas id=gra 320x180>, pasek nawigacji, przyciski dotykowe; ładuje gra/*.js w kolejności:
gra/czcionka.js     bitmapowa czcionka 5x7 z polskimi znakami         → window.Czcionka
gra/dzwiek.js       Web Audio: SFX + sekwencer muzyki (utwory w tekście) → window.Dzwiek
gra/grafika.js      tekstury kafli, sprite'y, tła parallax, definicje kafli KAFLE → window.Grafika
gra/poziomy.js      5 poziomów budowanych funkcjami pomocniczymi        → window.POZIOMY
gra/gra.js          silnik: stan, fizyka, wrogowie, rysowanie, ekrany  → window.GRA (debug)
gra/analiza.js      narzędzie: BFS osiągalności z MINI-SILNIKIEM (kopia fizyki gracza) + detektor pułapek (node); eksportuje analizuj()
gra/scenariusze-skoku.js  wspólne syntetyczne scenariusze skoku (dla test-analiza i kalibracji w test-przegladarka)
gra/test-*.js       testy uruchamiane przez npm test / test:przegladarka
README.md           dokumentacja dla ludzi (szczegółowa)
.github/            agenci, skille, prompty, instrukcje dla AI
```

Kolejność ładowania w `gra.html` jest ważna: `czcionka → dzwiek → grafika → poziomy → gra`. Każdy plik to IIFE `(() => { 'use strict'; ... })()` eksportujące jeden obiekt na `window`.

## 4. Gra — kluczowe stałe i konwencje

- Rozdzielczość logiczna **320×180**, kafel **T = 16 px**, skala CSS zawsze całkowita (`dopasuj()` w gra.js) — inaczej sprite'y migoczą.
- Pętla: stały krok **60 Hz** (`aktualizuj()`), rysowanie co klatkę (`rysuj()`); maks. 4 kroki na klatkę.
- Fizyka (gra.js linie ~9): `GRAW=.28`, `MAX_SPAD=5`, `SKOK=-5`, `PREDKOSC=1.65`. Gracz `w=10, h=21`.
  **Zasięg skoku ZMIERZONY w silniku i potwierdzony kalibracją analizator↔silnik** (liczba pustych kafli przerwy, którą da się przeskoczyć bez „pixel-perfect”, zależnie od różnicy wysokości lądowania):

  | lądowanie | +2 w górę | +1 | 0 (płasko) | −1 i niżej |
  | --- | --- | --- | --- | --- |
  | maks. przerwa | **2** | **3** | **3** | **4** |

  Wyższe ściany niż 2 kafle = nie da się wyjść → to jest pułapka. Odbicie z 1-kaflowego słupka między przepaściami jest wykonalne, ale frustrujące — analizator ostrzega (`UWAGA trudne skoki`).
  **Trasa lotu też się liczy**: głowa sięga 2,6 kafla nad stopy w 1.–2. kolumnie za krawędzią. Sufit/korona drzewa/półka 3 lub 4 kafle nad podłożem w pierwszych 3 kolumnach przerwy blokuje skok przez 3 kafle (5 nad podłożem już nie). Półka nad korytarzem, po którym się chodzi, musi być **≥ 3 kafle nad podłożem** (ciało = 2 kafle) — inaczej blokuje przejście.
  Nad i pod mapą jest **powietrze** (`kafel()` zwraca `' '`) — na ścianie/słupku sięgającym wiersza 0 **można stanąć** (poziom 5 miał tak pułapkę: zeskok za wieżę bez powrotu).
- Coyote time 6 klatek, bufor skoku 7 klatek, skok zmienny (puszczenie klawisza obcina `vy` do −1.8).
- Kolizje kafelkowe: `ruszX` / `ruszY` (wspólne dla gracza i wrogów). `ruszY` sprawdza kafel **przy `e.y+e.h`** (krawędź stóp) — nie zmieniaj na `-1`, bo wraca drganie postaci.
- Współrzędne: `x,y` to lewy-górny róg hitboxa w px świata; `kafel(tx,ty)` zwraca znak mapy; `P.k[y][x]` to mapa (tablica tablic znaków, byty już usunięte → `' '`).
- Kamera: `kamera.x/y`, wygładzanie 0.1, wyprzedzenie 18 px w kierunku patrzenia.
- Rysowanie: zawsze `Math.round()` pozycji przed `drawImage` (piksel-perfect). `g.imageSmoothingEnabled = false`.
- Stany gry (`gra.stan`): `tytul` → `intro` → `karta` → `gra` ⇄ `pauza`; `gra` → `koniecPoziomu` → (`karta` | `zwyciestwo`); `gra` → `gameover`. Dodając ekran: case w `aktualizuj()` **i** w `rysuj()`.
- Zapis: `localStorage` klucze `gra-postep` (indeks najwyższego odblokowanego poziomu), `gra-rekord` (szmaragdy), `gra-wyciszone` ('1'/'0'). Strona: `theme` ('dark'/'light').

## 5. Legenda mapy poziomów (gra/poziomy.js ↔ KAFLE w grafika.js)

Mapa = tablica stringów, 1 znak = 1 kafel 16×16. Wiersz 0 = góra. Byty (małe litery i symbole) są zamieniane na `' '` przy wczytaniu.

**Kafle** (definicje w `KAFLE` w grafika.js; flagi: `staly` blokuje ruch, `polka` – można stać i wskoczyć od dołu, `drabina`, `lawa`, `smiertelne`, `rani`, `swiatlo`, `niewidz`):

| Znak | Co | Flagi |
| --- | --- | --- |
| ` ` | powietrze | — |
| `#` kamień, `G` trawa, `D` dirt, `C` bruk, `P` deski, `N` ciemne deski, `l` liście, `B` cegły, `O` obsydian | bloki | `staly` |
| `Q` węgiel, `I` żelazo, `Y` diament, `E` ruda szmaragdu | rudy (dekoracja ścian) | `staly` |
| `i` glowstone | świeci (r=34) | `staly, swiatlo` |
| `W` bedrock, `S` piasek, `R` półka z książkami, `w` okno, `T` tnt, `M` mech, `U` trawa ze śniegiem, `F` płotek | bloki | `staly` |
| `K` kaktus | rani 1 HP | `staly, rani` |
| `V` lawa | zabija natychmiast, świeci. **Nie blokuje ruchu** — to „powietrze, które zabija”: da się nad nią przeskoczyć | `lawa, swiatlo` |
| `^` nacieki/kolce | zabija natychmiast (rysowane u dołu kafla). Nie blokuje | `kolce, smiertelne` |
| `H` drabina | ↑/↓ wchodzenie; nie blokuje | `drabina` |
| `_` półka (deski, pół kafla) | można na niej stać, przeskoczyć od dołu | `polka` |
| `=` tory, `L` pień drzewa, `\|` słupek | **tło**, nie blokuje | — |
| `*` pochodnia | światło r=40, sprite na tle | `pochodnia, swiatlo` |
| `X` niewidzialna ściana | granice poziomu | `staly, niewidz` |

**Byty** (obsługa w `wczytajPoziom()` w gra.js):

| Znak | Co | Uwagi |
| --- | --- | --- |
| `@` | start gracza | dokładnie jeden |
| `j` | NPC Starszy (dymek z `def.npc[x]`, klucz = kolumna x) | tekst w `npc: { 8: '...' }` |
| `h` | kurczak (dekoracja, animowany) | |
| `z` zombie, `c` creeper, `k` szkielet, `s` slime, `p` pillager, `b` boss | wrogowie | `b` tylko raz, w poziomie 5 |
| `e` szmaragd, `a` złote jabłko (pełne HP), `o` totem (+1 życie) | przedmioty | id = `x,y`, nie respawnują po śmierci |
| `f` ognisko | checkpoint (respawn `o.x+2, o.y-22`) | |
| `!` dzwon | meta poziomu (hitbox 12×20 od górnej krawędzi kafla) | |
| `m` / `n` | ruchoma platforma 32×8: pozioma (A=40) / pionowa (A=44) | `x0 = px-8` |

**Funkcje pomocnicze w poziomy.js** (używaj ich zamiast ręcznego pisania stringów):
`nowy(szer,wys)`, `put(x,y,ch)`, `get(x,y)`, `fill(x0,y0,x1,y1,ch)`, `ziemia(x0,x1,y,gora='G',pod='D')`, `dziura(x0,x1)`,
`rzad(x,y,'PPP')` (`.` = pomiń), `sciany()` (X po bokach), `szmaragdy(x,y,ile,krok=1,luk=0)`, `dom(x,y,w,h)`, `drzewo(x,y,h,r)`,
`schody(x,y,ile,ch='C',kier=1)`, `tory(x0,x1,y)`, `meta(x,y,ch='C')` (dzwon pod belką na cokole), `drabina(x,y0,y1)`, `mapa()`.
Definicja poziomu: `{ nazwa, motyw: 'wioska'|'las'|'jaskinia'|'kopalnia'|'posterunek', muzyka: 'spokojna'|'jaskinia'|'boss', muzykaBoss?, mapa, opis, npc: {kolumna: tekst}, ciemnosc?: 0..1, dzwonPoBossie?: {x,y}, tlo?: [[x0,y0,x1,y1,kolor1,kolor2]] }`.
Walidacja na końcu pliku loguje `console.error` przy braku `@` / `!`.

**Reguły projektowe poziomów (obowiązkowe):**
1. Zasięg skoku wg tabeli w §4: przerwa ≤ 3 kafle na płasko/+1, **≤ 2 przy lądowaniu +2 w górę**, ≤ 4 przy spadaniu. Drabina musi sięgać 1 kafel **ponad** półkę, na którą prowadzi.
2. Żadna dziura głębsza niż 2 kafle z pionowymi ścianami po obu stronach — chyba że na dnie jest `V` lub `^` (śmierć + powrót do checkpointu). **Nie zamykaj takich dziur — zrób je śmiertelnymi lub płytszymi (≤2).** Dotyczy też „dziur” szerokich (cały teren bez powrotu, np. za wieżą) — analizator zgłasza je jako `PUŁAPKI`.
3. **Lądowisko i miejsce odbicia ≥ 2 kafle szerokości**, jeśli po obu stronach jest śmierć (lawa/przepaść). 1-kaflowe słupki między przepaściami tylko celowo, w późnych poziomach, i nigdy dwa pod rząd. Analizator wypisuje je jako `UWAGA trudne skoki`.
4. Po każdej zmianie: `node gra/analiza.js` musi dać `WYNIK: wszystkie poziomy OK` (0 pułapek, meta i 100% przedmiotów osiągalne). Analizator symuluje prawdziwą fizykę gracza (kopia `gra.js`: hitbox, grawitacja, kolizje, krótki skok; bez coyote time i bez skoków wymagających okna < 6 px) i jest **skalibrowany z silnikiem** (`test:przegladarka` — 41 scenariuszy skoku, w tym sufity). Nie modeluje wrogów, strzał ani ruchu platform w czasie — to sprawdź w przeglądarce (skill `gra-testowanie`).
5. Checkpoint `f` co ~60–80 kafli. Poziom kończy się `meta(x, wierszPodłoża)`.
6. Nie stawiaj nowej przeszkody bezpośrednio za istniejącą (np. lawy tuż za `dziura()`), bo tworzy to ciąg skoków bez miejsca na wylądowanie. Między dwoma skokami zostaw ≥ 2 kafle płaskiego podłoża.
7. **Nic 1–2 kafle nad korytarzem**, po którym się chodzi (półka `rzad(...)`, liście `l`, belka) — ciało gracza ma 2 kafle, więc to ściana. Półki ze szmaragdami nad ścieżką stawiaj ≥ 3 kafle nad podłożem i wchodź na nie z pagórka/schodów. Nie wsuwaj półek pod korony drzew (`drzewo()` zajmuje `y-h-3 .. y-h` w promieniu `r`).

## 6. API debugowe `window.GRA` (gra.js, ostatnia linia)

```js
GRA.gra            // stan: {stan, poziomNr, zycia, szmaragdy, czas, postep, rekord, menu, ...}
GRA.poziom         // P: {def, szer, wys, k (mapa), wrogowie[], przedmioty[], strzaly[], czastki[], platformy[], npc[], pochodnie[], lawa[], ogniska[], dzwon, boss, bossAktywny, checkpoint, zebrane:Set}
GRA.gracz          // {x,y,w,h,vx,vy,dir,naZiemi,hp,nietykalny,martwy,drabina,platforma,wygrana}
GRA.startPoziomu() // wczytuje GRA.gra.poziomNr i ustawia stan 'karta' → ustaw potem GRA.gra.stan='gra'
GRA.nowaGra(n)     // nowa gra od poziomu n
GRA.kamera         // {x,y}
```
Teleport: `GRA.gracz.x = kolumna*16; GRA.gracz.y = wiersz*16 - 21; GRA.gracz.vy = 0;`
Obiekty wroga: `{typ, x,y,w,h, vx,vy, dir, naZiemi, hp, t, anim, lont(-1 = nie syczy), ranny, martwy}`.

## 7. Gdzie co zmienić (szybka nawigacja)

| Chcę… | Plik → funkcja |
| --- | --- |
| dodać poziom | `gra/poziomy.js` → nowy blok `(() => { nowy(); ...; POZIOMY.push({...}) })()` przed `window.POZIOMY`; motyw tła w `grafika.js → rysujTlo()`; `NIEBO[motyw]` |
| zmienić fizykę | `gra/gra.js` → stałe na górze (`GRAW`, `SKOK`, …) i `aktualizujGracza()`; **tę samą zmianę** w `gra/analiza.js → krok()` (mini-silnik), potem `npm run test:przegladarka` (kalibracja) i ewent. tabela zasięgów w §4 |
| nowy wróg | `gra.js → nowyWrog()` (hitbox, v, hp) + `aktualizujWroga()` (case AI) + `sprWroga()`/`rysujWroga()` + `koloryWroga()`; sprite w `grafika.js` (tablica wierszy + paleta przez `sprite()`), eksport w `window.Grafika`; znak w `wczytajPoziom()`; dopisz znak do „znane” w `gra/test-skladnia.js` |
| nowy przedmiot | `wczytajPoziom()` (case) + `aktualizujGracza()` (pętla po `P.przedmioty`) + `rysujSwiat()`; sprite w grafika.js |
| nowy kafel | `grafika.js → KAFLE` (+ `tekstura()` case, jeśli ma teksturę) + ewent. `gra/analiza.js → STALE` i `test-skladnia.js` „znane” |
| nowy efekt dźwiękowy | `gra/dzwiek.js → SFX` (funkcja `t => ton(...)/szum(...)`); wywołanie `D.sfx('nazwa')`; dopisz do listy w `test-dzwiek.js` |
| nowy utwór | `gra/dzwiek.js → UTWORY` (format nut niżej); podpięcie przez `muzyka:` w definicji poziomu lub `D.grajMuzyke('nazwa')` |
| HUD / ekrany | `gra.js → rysujHUD()`, `rysujTytul()`, `rysujPauza()`, … + logika w `aktualizuj()` |
| tekst UI | szukaj literału w gra.js; czcionka `C.tekst(g, 'tekst', x, y, kolor, {wyr:'srodek', cien:'#000', skala})` |
| sterowanie | `gra.js → wej` (mapowanie klawiszy), `gra.html` (przyciski dotykowe `d-lewo`…) |
| strona: tło/animacja Steve | `swiat.js` — `rysujTlo()`, `rysujPrzod()`, `rysujSteve()`, `startPrzejscia()`/`aktualizuj()` |
| strona: wygląd przycisków/stopki | `index.html` `<style>` |

## 8. Grafika — jak tworzyć sprite'y (grafika.js)

`sprite(wiersze, paleta)` → canvas; `wiersze` to tablica stringów o równej długości, `.` = przezroczysty, inne znaki = klucz palety, np.
```js
const P_X = { h: '#3A2A1E', s: '#C9A07A' };
const X = sprite(['.hh.', 'hssh', '.ss.'], P_X);
```
`odbij(c)` — lustrzane odbicie; `przemaluj(c, '#fff')` — wersja jednokolorowa (błysk trafienia); `plotno(w,h)`; `szum(x,y,seed)` — deterministyczny 0..1.
Tekstury kafli: `tekstura(rodzaj, wariant)` – 16×16, generowane per piksel z palet `PAL`. `TEX[rodzaj] = [3 warianty]`.
Kolory Minecrafta: trawa `#7CBD52`, dirt `#79553A`, kamień `#7F7F7F`, deski `#B08F4F`, lawa `#FF8F1A`/`#FFC23A`, szmaragd `#17DD62`, obsydian `#0F0B1E`.
Postacie: gracz 12×22 (klatki `stoj/krok1/krok2/skok`, `[lewo, prawo]`), zombie/szkielet/pillager 14–11×24, creeper 8×22, slime 12×10, boss = pillager + sztandar.

## 9. Dźwięk — format utworów (dzwiek.js)

```js
UTWORY.nazwa = { bpm: 66, echo: .5, raz?: true, sciezki: [
  { fala: 'triangle'|'square'|'sawtooth'|'sine', glos: .2, atak: .01, zanik: 1.6, nuty: 'A4:1.5 G4:.5 -:1 F3+A3+C4:4' },
  { perkusja: true, nuty: 'k:.5 h:.5 s:.5 h:.5' },   // k=stopa s=werbel h=hi-hat H=otwarty hi-hat
]}
```
Nuta `Nazwa[#|b]Oktawa:czasWBitach`, `-` pauza, `+` akord. Krótsze ścieżki są zapętlane do długości najdłuższej. Wszystko to **oryginalne kompozycje** — nie przepisuj melodii z Minecrafta/C418 ani innych chronionych utworów.
Muzyka gra **tylko w grze** (nie na stronie). `D.start()` musi zostać wywołane po interakcji użytkownika (autoplay policy) — dzieje się to w `keydown`/`pointerdown`.

## 10. Czego NIE robić

- Nie zmieniaj tekstu treści `index.html` (nagłówki, akapity, lista) ani układu początkowego strony. Wolno: style, canvas, przyciski.
- Nie dodawaj plików PNG/JPG/MP3/OGG — wszystko generowane kodem (jedyny wyjątek: istniejący `z4xmg666.jpg` w treści strony).
- Nie dodawaj frameworków, bundlerów, TypeScriptu. Nie zmieniaj polskiego nazewnictwa na angielskie.
- Nie zamykaj celowo zaprojektowanych przepaści — napraw głębokość (≤ 2) lub zrób je śmiertelnymi (`V`/`^`).
- Nie commituj bez zielonego `npm test`. Commity po polsku, z trailerem `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.

## 11. Znane, celowe decyzje (nie „naprawiaj” ich)

- `ruszY` sprawdza `e.y+e.h` (nie `-1`) — celowo, eliminuje drganie.
- Skala canvasu tylko całkowita — celowo (piksel-perfect).
- `^` i `V` zabijają natychmiast — celowo, żeby nie było studni bez wyjścia.
- Nad mapą jest powietrze (`kafel()` → `' '` dla `ty < 0`) — celowo, jak w Mario; projektuj poziomy tak, żeby ze szczytu ściany nie dało się spaść w miejsce bez powrotu.
- Analizator odrzuca skoki z oknem odbicia < 6 px i nie używa coyote time — celowo (dzieci); silnik jest łaskawszy niż analizator, nigdy odwrotnie.
- Pnie drzew `L`, tory `=` i słupki `|` nie blokują — celowo (tło).
- Creeper po skoku na głowę **nie ginie**, tylko odpala lont (0.45 s) — celowo, trzeba uciec.
- Boss: 3 trafienia w głowę, `ranny` = 90 klatek nietykalności, odrzut gracza po trafieniu — celowo.
