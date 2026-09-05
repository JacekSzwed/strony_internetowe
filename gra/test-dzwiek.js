// test-dzwiek.js — sprawdza dzwiek.js na atrapie Web Audio (bez przeglądarki).
// Uruchom: node gra/test-dzwiek.js
// Wykrywa: błędy składni/parsowania utworów, nuty poza formatem, ujemne/zerowe wartości w rampach,
// efekty SFX bez żadnego dźwięku, utwory bez nut.
const fs = require('fs');
const path = require('path');

let osc = 0, noise = 0, bledy = [], now = 0;
class Param {
  setValueAtTime() {} linearRampToValueAtTime() {} setTargetAtTime() {}
  exponentialRampToValueAtTime(v) { if (!(v > 0)) bledy.push('exponentialRamp do wartości <= 0: ' + v); }
}
const node = () => ({ connect() {}, gain: new Param(), frequency: new Param(), Q: { value: 1 }, delayTime: { value: 0 }, start() {}, stop() {}, type: '' });
global.window = {};
global.localStorage = { getItem: () => null, setItem() {} };
window.AudioContext = class {
  constructor() { this.sampleRate = 44100; this.state = 'running'; this.destination = {}; }
  get currentTime() { return now; }
  createGain() { return node(); } createOscillator() { osc++; return node(); } createBufferSource() { noise++; return node(); }
  createBiquadFilter() { return node(); } createDelay() { return node(); }
  createBuffer() { return { getChannelData: () => new Float32Array(100) }; } resume() {}
};
let interwaly = [];
global.setInterval = fn => { interwaly.push(fn); return interwaly.length; };
global.clearInterval = () => {};

new Function(fs.readFileSync(path.join(__dirname, 'dzwiek.js'), 'utf8'))();
const D = window.Dzwiek;
D.start();

let ok = true;
const UTWORY = ['tytul', 'spokojna', 'jaskinia', 'boss', 'zwyciestwo'];
for (const nazwa of UTWORY) {
  osc = 0; noise = 0; interwaly = []; now = 0;
  D.grajMuzyke(nazwa);
  const krok = interwaly[0];
  for (let t = 0; t < 60; t += .09) { now = t; krok && krok(); }
  const status = osc > 0 ? 'OK ' : 'BRAK NUT';
  if (osc === 0) ok = false;
  console.log(`${status} utwór "${nazwa}": ${osc} nut, ${noise} uderzeń perkusji w 60 s`);
  D.stopMuzyke();
}
const SFX = ['skok', 'szmaragd', 'stomp', 'obrazenia', 'smierc', 'wybuch', 'syk', 'strzala', 'luk', 'dzwon', 'checkpoint', 'jablko', 'totem', 'menu', 'wybor', 'pauza', 'kropla', 'slime', 'kurczak', 'boss', 'krok', 'ladowanie', 'koniecPoziomu', 'gameover', 'plusk'];
const ciche = [];
for (const s of SFX) { osc = 0; noise = 0; D.sfx(s); if (!osc && !noise) ciche.push(s); }
if (ciche.length) { ok = false; console.log('SFX bez dźwięku: ' + ciche.join(', ')); } else console.log(`OK  ${SFX.length} efektów SFX gra`);
if (bledy.length) { ok = false; console.log('Błędy rampy:\n  ' + [...new Set(bledy)].join('\n  ')); } else console.log('OK  brak błędów w rampach głośności');
console.log(ok ? '\nWYNIK: dźwięk OK' : '\nWYNIK: BŁĘDY w dźwięku');
process.exit(ok ? 0 : 1);
