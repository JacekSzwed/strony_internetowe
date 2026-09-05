---
applyTo: "gra/grafika.js"
---
# Zasady edycji gra/grafika.js

- Cała grafika z kodu: `sprite(wiersze, paleta)`, `tekstura(rodzaj, wariant)`, `plotno`, `odbij`, `przemaluj`. Żadnych `<img>`/PNG.
- Sprite: wiersze o równej długości, `.` = przezroczysty, postać patrzy w prawo; para `[odbij(c), c]` = `[lewo, prawo]`.
- Kolory z palet Minecrafta (`PAL` oraz tabela w `.github/skills/gra-grafika/SKILL.md`). Tekstury 16×16 przez deterministyczny `szum(x, y, seed)` — bez `Math.random()` w teksturach (muszą być stabilne między klatkami).
- Nowy kafel → wpis w `KAFLE` z właściwymi flagami (`staly`, `polka`, `drabina`, `lawa`, `smiertelne`, `rani`, `swiatlo`, `niewidz`); jeśli ma teksturę, `case` w `tekstura()`; `TEX` generuje się automatycznie.
- Każdy nowy sprite/teksturę eksportuj w `window.Grafika` na końcu pliku.
- Tła w `rysujTlo(g, motyw, W, H, camX, camY, t, ziemiaEkran)`; nowy motyw = wpis w `NIEBO` + `case` w `rysujTlo`.
- Rysuj w pikselach całkowitych (`| 0` lub `Math.round`); `imageSmoothingEnabled = false` jest ustawione globalnie.
