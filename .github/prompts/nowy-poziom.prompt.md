---
description: Dodaj nowy poziom do gry według szablonu, z fabułą, wrogami, checkpointem i metą; zweryfikuj analizatorem.
agent: Emeryk Dev
argument-hint: nazwa poziomu, klimat (np. śnieg / bagno / nether), pozycja w kolejności (np. po Kopalni), 1–2 nowe wyzwania
---
Dodaj nowy poziom do gry „Emeryk i Skradziony Dzwon”.

Wejście od użytkownika: ${input:opis:np. „Zaśnieżone Góry, po Lesie, dużo szkieletów i wąskie półki”}

Wykonaj:
1. Otwórz skill `gra-poziomy` (`.github/skills/gra-poziomy/SKILL.md`) i użyj szablonu bloku poziomu.
2. Wstaw blok w `gra/poziomy.js` w podanej pozycji (przed `window.POZIOMY = POZIOMY;`, między odpowiednimi blokami). Jeśli pozycja nie jest podana — na końcu, przed posterunkiem bossa (poziom 5 musi zostać ostatni, bo ma bossa i dzwon po bossie).
3. Długość 150–210 kafli, 3 sekcje (nauka → wyzwanie → finał), checkpoint `f` co 60–80 kafli, ~30 szmaragdów, 1 jabłko `a`, `meta()` na końcu. Wrogowie dopasowani do klimatu. NPC `j` na starcie z 1-zdaniową wskazówką o nowej mechanice.
4. Jeśli klimat wymaga nowego motywu tła — dodaj wpis w `NIEBO` i `case` w `rysujTlo()` w `gra/grafika.js` (skill `gra-grafika`). Jeśli wymaga nowego kafla (np. śnieg `U` już istnieje) — patrz skill.
5. Uruchom `node gra/analiza.js`. Napraw wszystkie `BŁĄD`/`PUŁAPKI`/`NIEOSIĄGALNE` (reguły w skillu). Powtarzaj, aż `WYNIK: wszystkie poziomy OK`.
6. Uruchom `npm test`. Zaktualizuj listę poziomów w `README.md` (sekcja „Poziomy”) i w `AGENTS.md` jeśli dodałeś znaki/motywy.
7. Podsumuj: nazwa, długość, wrogowie, nowe mechaniki, wynik analizatora, uwaga o wpływie na `gra-postep` graczy (jeśli wstawiony w środku).
