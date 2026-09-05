---
name: gra-dzwiek
description: Dodawanie i zmiana dźwięku w gra/dzwiek.js (Web Audio, bez plików audio) — nowe efekty SFX (ton/szum, slide, echo), nowe utwory 8-bit w formacie tekstowym nut, perkusja, głośność, podpinanie muzyki do poziomu, test test-dzwiek.js.
---

# Skill: dźwięk gry (Web Audio, 100% z kodu)

Plik: `gra/dzwiek.js`. Podstawy formatu: **AGENTS.md §9**. Test: `node gra/test-dzwiek.js`.
Muzyka gra **tylko w grze** (`gra.html`), nigdy na stronie. Kompozycje muszą być **oryginalne** — inspiruj się klimatem (spokojne arpeggia, pentatonika, dużo pogłosu), ale nie przepisuj melodii C418/Minecraft ani innych chronionych utworów.

## Instrumenty (funkcje wewnętrzne)

```js
ton(czas, hz, dl, { fala: 'square'|'triangle'|'sawtooth'|'sine', glos: .15, atak: .005, zanik: .25, cel: muzykaGain|sfxGain, echoIle: 0..1, slide: mnożnik_czestotliwosci_na_koncu })
szum(czas, dl, { glos: .2, typ: 'bandpass'|'lowpass'|'highpass', hz: 1800, q: 1, cel, opad: mnożnik_hz_na_koncu })
perkusja(czas, 'k'|'s'|'h'|'H')   // stopa, werbel, hi-hat zamknięty, otwarty
```
`czas` = `ctx.currentTime` (dla SFX przekazywany jako `t`). `zanik >= dl` → nuta „szarpnięta” (wybrzmiewa niezależnie od długości); `zanik < dl` → podtrzymanie + wybrzmienie.

## Nowy efekt SFX

W obiekcie `SFX`:
```js
nowy: t => { ton(t, 660, .08, { glos: .14, zanik: .05 }); ton(t + .08, 880, .15, { fala: 'triangle', glos: .14, zanik: .2 }); },
```
Recepty: **zbieranie** = 2 krótkie rosnące tony (square, ~1 kHz); **uderzenie** = ton z `slide: .4` + `szum` bandpass 900 Hz `opad: .3`; **skok** = `slide: 2.2` (w górę); **ranienie** = sawtooth `slide: .35`; **wybuch** = `szum lowpass 1400 opad .05` + `ton sine 90 slide .3`; **magia/bonus** = 4–6 tonów triangle w górę co 50–70 ms z `echoIle`; **syk** = `szum bandpass 3000 q .6 opad 2.2` długi.
Wywołanie: `D.sfx('nowy')` w gra.js. **Dopisz nazwę do listy `SFX` w `gra/test-dzwiek.js`.** Głośność SFX 0.05–0.3.

## Nowy utwór

```js
nazwa: {
  bpm: 72, echo: .45,                     // echo 0 (rock) … .65 (jaskinia); raz: true = bez zapętlenia (fanfary)
  sciezki: [
    { fala: 'triangle', glos: .2, atak: .01, zanik: 1.5, nuty: 'melodia…' },      // prowadząca
    { fala: 'triangle', glos: .1, atak: .4, zanik: 2.5, nuty: 'akordy: F3+A3+C4:4 C3+E3+G3:4 …' },   // pad
    { fala: 'sine', glos: .15, atak: .05, zanik: 2, nuty: 'bas: F2:4 C2:4 …' },
    { perkusja: true, nuty: 'k:.5 h:.5 s:.5 h:.5' },                                // opcjonalnie (rock/boss)
  ],
},
```
Nuta: `A4:1` (nazwa+oktawa : długość w bitach), `-:2` pauza, `C4+E4+G4:4` akord, `Bb3`/`F#4` alteracje. Ścieżki różnej długości: krótsza jest powtarzana do najdłuższej (perkusja może mieć 1 takt). Suma długości melodii powinna być wielokrotnością 4 bitów.
Klimaty: **spokojny** (bpm 60–72, triangle/sine, echo .5, tonacja F/C-dur, akordy całonutowe) · **mrok** (bpm 55–60, a-moll, echo .65, długie pauzy, kropelki `D.sfx('kropla')` z gra.js) · **akcja/boss** (bpm 130–150, square+sawtooth, echo ≤ .15, perkusja, d-moll) · **radość/fanfara** (bpm 120, `raz: true`, tercje w górę).
Podpięcie: `muzyka: 'nazwa'` w definicji poziomu (`gra/poziomy.js`) lub `D.grajMuzyke('nazwa')` w gra.js. Dopisz nazwę do listy `UTWORY` w `test-dzwiek.js`.

## Miksowanie

`muzykaGain = .55`, `sfxGain = .6`, `master` sterowany przez `wycisz()` (klawisz M, zapis `gra-wyciszone`). Echo: `delay .34 s`, feedback .32, lowpass 2200 Hz. Jeśli utwór „mułowaty” — zmniejsz `echo` lub `zanik` padu; jeśli za cichy — `glos` ścieżki, nie master.

## Ograniczenia przeglądarki

`AudioContext` startuje dopiero po gestach użytkownika: `D.start()` wywoływane w `keydown` i `pointerdown` (gra.js). Nie odtwarzaj dźwięku przy ładowaniu strony. `D.grajMuzyke(x)` ignoruje wywołanie, gdy `x` już gra — bezpiecznie wołać co klatkę.
