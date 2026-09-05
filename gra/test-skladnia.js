// test-skladnia.js — sprawdza, że każdy plik JS gry i strony parsuje się bez błędów składni
// oraz że moduły gry eksportują to, czego oczekuje gra.js. Bez przeglądarki, bez zależności.
// Uruchom: node gra/test-skladnia.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const PLIKI = ['swiat.js', 'gra/czcionka.js', 'gra/dzwiek.js', 'gra/grafika.js', 'gra/poziomy.js', 'gra/gra.js'];
let ok = true;
const test = (nazwa, w, info = '') => { if (!w) ok = false; console.log(`${w ? 'OK  ' : 'BŁĄD'} ${nazwa}${info ? ' — ' + info : ''}`); };

for (const f of PLIKI) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try { new vm.Script(src, { filename: f }); test(`składnia ${f}`, true); }
  catch (e) { test(`składnia ${f}`, false, e.message); }
}

// Sprawdzenie eksportów modułów (uruchamiamy tylko te, które nie potrzebują DOM/canvas)
global.window = {};
try {
  new Function(fs.readFileSync(path.join(ROOT, 'gra/czcionka.js'), 'utf8'))();
  const C = window.Czcionka;
  test('czcionka.js eksportuje Czcionka.{tekst,szerokoscTekstu,lamTekst}', !!(C && C.tekst && C.szerokoscTekstu && C.lamTekst));
  test('czcionka: łamanie tekstu działa', C.lamTekst('aaa bbb ccc', 40).length >= 2);
  test('czcionka: polskie znaki mają szerokość', C.szerokoscTekstu('ąćęłńóśźż') === 9 * C.SZER - 1);
} catch (e) { test('czcionka.js uruchamia się', false, e.message); }

try {
  new Function(fs.readFileSync(path.join(ROOT, 'gra/poziomy.js'), 'utf8'))();
  const P = window.POZIOMY;
  test('poziomy.js eksportuje POZIOMY (tablica ≥ 1)', Array.isArray(P) && P.length >= 1);
  for (const [i, p] of P.entries()) {
    const wym = ['nazwa', 'motyw', 'muzyka', 'mapa', 'opis', 'npc'].filter(k => p[k] === undefined);
    test(`poziom ${i + 1} "${p.nazwa}" ma wymagane pola`, wym.length === 0, wym.length ? 'brak: ' + wym.join(', ') : '');
    test(`poziom ${i + 1} ma równe wiersze`, p.mapa.every(r => r.length === p.mapa[0].length));
    test(`poziom ${i + 1} ma start @`, p.mapa.some(r => r.includes('@')));
    test(`poziom ${i + 1} ma metę ! lub bossa b`, p.mapa.some(r => r.includes('!') || r.includes('b')));
    const znane = new Set(' #GDCPNLlBOQIYEiWSKVH_=*XF|RwTMU^@jzcksb pea ofm!nh'.split(''));
    const obce = [...new Set(p.mapa.join('').split(''))].filter(ch => !znane.has(ch));
    test(`poziom ${i + 1} używa tylko znanych znaków`, obce.length === 0, obce.length ? 'nieznane: ' + obce.join(' ') : '');
  }
} catch (e) { test('poziomy.js uruchamia się', false, e.message); }

console.log(ok ? '\nWYNIK: składnia i struktura OK' : '\nWYNIK: BŁĘDY (patrz wyżej)');
process.exit(ok ? 0 : 1);
