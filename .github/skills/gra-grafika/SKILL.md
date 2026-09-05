---
name: gra-grafika
description: Tworzenie i zmiana grafiki gry generowanej kodem w gra/grafika.js i gra/gra.js — sprite'y postaci (nowy wróg, NPC, przedmiot), tekstury kafli, nowe kafle w KAFLE, tła parallax, animacje klatkowe, palety kolorów Minecrafta, ciemność i światło.
---

# Skill: grafika gry (wszystko z kodu, bez plików PNG)

Plik: `gra/grafika.js` (definicje) + `gra/gra.js` (użycie/rysowanie). Podstawy w **AGENTS.md §8**.

## Sprite z tablicy znaków

```js
const P_NOWY = { h: '#3A2A1E', s: '#C9A07A', k: '#111111' };   // paleta: znak → kolor
const NOWY_GORA = ['..hhhh..', '.hsssssh', '.hskssk.', '..ssss..'];  // '.' = przezroczysty
const NOWY = [ /* klatka 0 */ ['..s..s..', '..s..s..'], /* klatka 1 */ ['.s....s.', '.s....s.'] ]
  .map(nogi => { const c = sprite([...NOWY_GORA, ...nogi], P_NOWY); return [odbij(c), c]; });   // [lewo, prawo]
```
- Wszystkie wiersze tej samej długości. Szerokość sprite'a ≠ hitbox (hitbox `w,h` ustawiasz w `nowyWrog`; sprite rysuj z offsetem tak, by stopy = `y+h`).
- Postać patrzy **w prawo** w źródle; `odbij()` daje lewo. Indeks `[dir > 0 ? 1 : 0]`.
- Animacja chodu: 2 klatki, wybór `(w.anim | 0) % 2`; `anim += |vx| * .1` w `aktualizujWroga`.
- Błysk trafienia: `przemaluj(sprite, '#FFFFFF')`.
- Eksport: dopisz do `window.Grafika = { ... }` na końcu pliku.

## Nowy wróg — checklista (5 miejsc)

1. `grafika.js`: sprite (jak wyżej) + eksport w `window.Grafika`.
2. `gra.js → nowyWrog()`: `case 'nazwa': w.w = 8; w.h = 23; w.v = .35; break;` (hitbox, prędkość; `hp` domyślnie 1).
3. `gra.js → aktualizujWroga()`: `case 'nazwa': { ... w.vx = ...; break; }` — wzorce: patrol z zawracaniem przy ścianie/krawędzi `if (w.uderzyl || (w.naZiemi && !podStopami(w))) w.dir *= -1;`, gonienie `widzi && Math.abs(dx) < 100`, strzał `P.strzaly.push({x,y,w:8,h:3,vx,vy,z:0,wroga:true})`, skok `if (w.naZiemi) w.vy = -3.3`.
4. `gra.js → sprWroga()` (zwrot sprite'a) i ewent. `rysujWroga()` (offset, skalowanie), `koloryWroga()` (cząstki po śmierci).
5. `gra.js → wczytajPoziom()`: `case 'x': P.wrogowie.push(nowyWrog('nazwa', px + 3, py + T - 24)); break;` — wybierz **wolny znak** (zajęte: patrz AGENTS.md §5) i dopisz go do stringu „znane” w `gra/test-skladnia.js` oraz do legendy w AGENTS.md §5 i README.

Kolizja z graczem jest wspólna (koniec `aktualizujWroga`): skok z góry = stomp (`hp--`), z boku = `zranGracza(1)`. Wyjątki (creeper, boss) są tam jako `if (w.typ === ...)`.

## Nowy przedmiot

`wczytajPoziom()`: `case 'x': if (!P.zebrane.has(id)) P.przedmioty.push({ typ: 'nazwa', id, x: px+4, y: py+4, w: 8, h: 8, faza: 0 }); break;`
`aktualizujGracza()` (pętla po `P.przedmioty`): `else if (it.typ === 'nazwa') { efekt; D.sfx('...'); napis(p.x, p.y-10, 'Tekst', '#FFE066'); czastki(...); }`
`rysujSwiat()`: `else if (it.typ === 'nazwa') rysujByt(G.NAZWA, it, cx, cy, 0, bob);` — `bob` to unoszenie.

## Nowy kafel

`grafika.js → KAFLE`: `'x': { tex: 'nazwa', staly: true }` (+ flagi: `polka`, `drabina`, `lawa`, `smiertelne`, `rani`, `swiatlo: promień`).
Jeśli ma teksturę: `tekstura()` → `case 'nazwa': k = zTab(PAL.nazwa, n); break;` i paleta w `PAL` (6–8 odcieni bazowego koloru, ±8% jasności).
`TEX[nazwa]` powstaje automatycznie (3 warianty). Analizator: jeśli kafel jest stały, dopisz znak do `STALE` w `gra/analiza.js`; jeśli śmiertelny — do `SMIERTELNE`. Dopisz do „znane” w `test-skladnia.js`.
Jeśli kafel ma świecić w ciemności: w `wczytajPoziom()` dodaj do listy (jak `P.glow`) i w `rysujCiemnosc()` wywołaj `swiatlo(...)`.

## Palety Minecrafta (używaj tych, nie wymyślaj)

| Materiał | Kolory |
| --- | --- |
| trawa | `#7CBD52 #6FB048 #5EA13D #68AA43 #8AC95C` |
| dirt | `#79553A #866043 #6B4A31 #7E5A3D #5B3D26 #8F6B4B` |
| kamień | `#7F7F7F #767676 #8A8A8A #6E6E6E #858585` |
| deski dębowe | `#B08F4F #A6844A #BC9A56 #9E7C43` ; ciemne `#4A3220 #3F2A1A #553A25` |
| liście | `#3E8A2E #347A27 #48993A #2D6B22` |
| lawa | `#FF8F1A #FFC23A #E0621A #FFE96A` |
| obsydian | `#0F0B1E #130E26 #1A1230 #2A1D4C` |
| szmaragd | `#17DD62 #0B9E43 #B4FFD0` ; diament `#5DECD9 #2FBFB0` ; złoto `#F2C23A #FFE066` |
| skóra villagera | `#C9A07A #A87F5A` ; zombie `#4E9A48 #3B7A36` ; creeper `#5DB85D #3F9C3F #2E7D2E` |
| śnieg | `#F4F8FF #E8EEF8` ; piasek `#DBD3A0 #D2C892` ; nether-rack `#6E3535 #5A2B2B #823F3F` |

## Tła parallax (`rysujTlo`)

Pomocnicze: `gradient(g, [k1,k2,k3], W, H)`, `chmury(g,W,H,cam,t,kolor,cien)`, `wzgorza(g,W,H,cam,poziomY,kolor,k2,ampl,okres,wsp,seed)`, `domki(...)`, `drzewa(g,W,H,cam,poziomY,wsp,pien,liscie,skala,seed)`, `gwiazdy(g,W,H,t)`, `ksiezyc(g,x,y)`, `wieza(...)`. `wsp` = współczynnik parallaxu (0.2 daleko … 0.6 blisko). `poziomY` = linia horyzontu w px ekranu (przekazywana z gra.js jako `(P.wys-2)*T - kamera.y`).

## Ciemność i światło

`P.def.ciemnosc` (0..1) włącza `rysujCiemnosc()`: czarna warstwa z wycięciami `swiatlo(x, y, r, sila)` dla gracza (r=74), pochodni (46±mig), lawy (24), glowstone (40), ognisk (44), wybuchów. Ciepła poświata pochodni rysowana `globalCompositeOperation='lighter'`.

## Piksel-perfect

- Zawsze `Math.round()` pozycji przed `drawImage`; skalowanie sprite'ów tylko do liczb całkowitych px.
- Nie używaj `ctx.rotate` dla sprite'ów postaci (rozmywa) — wyjątki: dzwon (`kat`), strzały.
- Kolory tekstu: biały `#FFFFFF` z cieniem `#000`, złoty `#FFE066`, zielony `#B4FFD0`, czerwony `#FF8A8A`, pomarańcz `#FFB347`.
