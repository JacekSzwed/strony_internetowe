/* dzwiek.js — 8-bitowa muzyka i efekty dźwiękowe (Web Audio API, bez plików audio).
   Wszystkie utwory to oryginalne kompozycje w klimacie Minecrafta: spokojne arpeggia "pianina",
   mroczna jaskinia, walka z bossem oraz żartobliwy, rockowy "kurczak" na ekranie startowym. */
(() => {
'use strict';

let ctx = null, master = null, muzykaGain = null, sfxGain = null, echo = null, echoGain = null, szumBuf = null;
let wyciszone = localStorage.getItem('gra-wyciszone') === '1';
let aktualna = null, timer = null;

const NUTY = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, H: 11 };
function czest(n) {                                         // "C#4", "Bb3" → Hz
  const m = /^([A-H])([#b]?)(-?\d)$/.exec(n); if (!m) return 0;
  let p = NUTY[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3]) + 1) * 12;
  return 440 * Math.pow(2, (p - 69) / 12);
}

function start() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = wyciszone ? 0 : 1; master.connect(ctx.destination);
  muzykaGain = ctx.createGain(); muzykaGain.gain.value = .55; muzykaGain.connect(master);
  sfxGain = ctx.createGain(); sfxGain.gain.value = .6; sfxGain.connect(master);
  echo = ctx.createDelay(1); echo.delayTime.value = .34;
  echoGain = ctx.createGain(); echoGain.gain.value = .32;
  const echoFiltr = ctx.createBiquadFilter(); echoFiltr.type = 'lowpass'; echoFiltr.frequency.value = 2200;
  echo.connect(echoFiltr); echoFiltr.connect(echoGain); echoGain.connect(echo); echoGain.connect(muzykaGain);
  szumBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = szumBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  if (aktualna) { const n = aktualna; aktualna = null; grajMuzyke(n); }
}

/* ------------------------------------------------------------------ instrumenty */
function ton(czas, hz, dl, { fala = 'square', glos = .15, atak = .005, zanik = .25, cel = null, echoIle = 0, slide = 0 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = fala; o.frequency.setValueAtTime(hz, czas);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, hz * slide), czas + dl);
  const szczyt = czas + atak;
  g.gain.setValueAtTime(0, czas);
  g.gain.linearRampToValueAtTime(glos, szczyt);
  let koniec;
  if (zanik >= dl) { koniec = szczyt + zanik; }                       // "szarpnięcie" — wybrzmiewa niezależnie od długości nuty
  else { g.gain.setValueAtTime(glos, czas + dl); koniec = czas + dl + zanik; } // podtrzymanie + wybrzmienie
  g.gain.exponentialRampToValueAtTime(.0008, koniec);
  o.connect(g); g.connect(cel || sfxGain);
  if (echoIle) { const e = ctx.createGain(); e.gain.value = echoIle; g.connect(e); e.connect(echo); }
  o.start(czas); o.stop(koniec + .02);
}
function szum(czas, dl, { glos = .2, typ = 'bandpass', hz = 1800, q = 1, cel = null, opad = 1 } = {}) {
  const s = ctx.createBufferSource(); s.buffer = szumBuf;
  const f = ctx.createBiquadFilter(); f.type = typ; f.frequency.setValueAtTime(hz, czas); f.Q.value = q;
  if (opad !== 1) f.frequency.exponentialRampToValueAtTime(Math.max(40, hz * opad), czas + dl);
  const g = ctx.createGain(); g.gain.setValueAtTime(glos, czas); g.gain.exponentialRampToValueAtTime(.001, czas + dl);
  s.connect(f); f.connect(g); g.connect(cel || sfxGain); s.start(czas); s.stop(czas + dl + .02);
}
function perkusja(czas, co) {
  if (co === 'k') ton(czas, 150, .12, { fala: 'sine', glos: .5, zanik: .01, slide: .25, cel: muzykaGain });
  else if (co === 's') { szum(czas, .12, { glos: .25, hz: 1800, cel: muzykaGain }); ton(czas, 220, .06, { fala: 'triangle', glos: .2, zanik: .02, cel: muzykaGain }); }
  else if (co === 'h') szum(czas, .04, { glos: .12, typ: 'highpass', hz: 7000, cel: muzykaGain });
  else if (co === 'H') szum(czas, .12, { glos: .1, typ: 'highpass', hz: 6000, cel: muzykaGain });
}

/* ------------------------------------------------------------------ efekty */
const SFX = {
  skok:       t => ton(t, 320, .12, { glos: .18, slide: 2.2, zanik: .05 }),
  szmaragd:   t => { ton(t, 988, .07, { glos: .16, zanik: .04 }); ton(t + .07, 1319, .18, { glos: .16, zanik: .12 }); },
  stomp:      t => { ton(t, 240, .1, { glos: .25, slide: .4, zanik: .05 }); szum(t, .12, { glos: .18, hz: 900, opad: .3 }); },
  obrazenia:  t => { ton(t, 400, .22, { fala: 'sawtooth', glos: .2, slide: .35, zanik: .05 }); szum(t, .15, { glos: .12, hz: 600 }); },
  smierc:     t => { [523, 440, 349, 262, 196].forEach((h, i) => ton(t + i * .12, h, .12, { glos: .18, zanik: .08 })); szum(t + .6, .5, { glos: .2, hz: 400, opad: .2 }); },
  wybuch:     t => { szum(t, .7, { glos: .6, typ: 'lowpass', hz: 1400, opad: .05 }); ton(t, 90, .5, { fala: 'sine', glos: .5, slide: .3, zanik: .1 }); },
  syk:        t => szum(t, 1.1, { glos: .22, typ: 'bandpass', hz: 3000, q: .6, opad: 2.2 }),
  strzala:    t => { szum(t, .12, { glos: .15, typ: 'highpass', hz: 3000 }); ton(t, 900, .08, { glos: .07, slide: .5, zanik: .02 }); },
  luk:        t => ton(t, 180, .1, { fala: 'triangle', glos: .12, slide: 1.8, zanik: .04 }),
  dzwon:      t => { [1046, 1568, 2093, 2637].forEach((h, i) => ton(t, h, 1.8, { fala: 'sine', glos: .28 / (i + 1), atak: .002, zanik: 1.8, echoIle: .4 })); ton(t, 523, 1.4, { fala: 'triangle', glos: .15, zanik: 1.4 }); },
  checkpoint: t => [523, 659, 784, 1046].forEach((h, i) => ton(t + i * .07, h, .1, { glos: .14, zanik: .18 })),
  jablko:     t => [659, 784, 988, 1175, 1319].forEach((h, i) => ton(t + i * .05, h, .08, { fala: 'triangle', glos: .16, zanik: .2 })),
  totem:      t => { [440, 554, 659, 880, 1109, 1319].forEach((h, i) => ton(t + i * .06, h, .3, { fala: 'triangle', glos: .14, zanik: .5 })); szum(t, .5, { glos: .08, typ: 'highpass', hz: 5000 }); },
  menu:       t => ton(t, 660, .06, { glos: .12, zanik: .04 }),
  wybor:      t => { ton(t, 523, .06, { glos: .14, zanik: .04 }); ton(t + .06, 784, .12, { glos: .14, zanik: .08 }); },
  pauza:      t => { ton(t, 784, .08, { glos: .12, zanik: .05 }); ton(t + .1, 523, .12, { glos: .12, zanik: .08 }); },
  kropla:     t => ton(t, 1800 + Math.random() * 900, .25, { fala: 'sine', glos: .1, slide: .45, zanik: .3, echoIle: .5 }),
  slime:      t => ton(t, 180, .14, { fala: 'sine', glos: .2, slide: 1.6, zanik: .06 }),
  kurczak:    t => { ton(t, 880, .06, { glos: .12, slide: 1.4, zanik: .03 }); ton(t + .09, 740, .08, { glos: .12, slide: .7, zanik: .04 }); },
  boss:       t => { ton(t, 110, .6, { fala: 'sawtooth', glos: .2, slide: .5, zanik: .1 }); szum(t, .4, { glos: .15, typ: 'lowpass', hz: 800 }); },
  krok:       t => szum(t, .04, { glos: .05, hz: 500 }),
  ladowanie:  t => szum(t, .07, { glos: .1, hz: 400, opad: .5 }),
  koniecPoziomu: t => [523, 659, 784, 1046, 784, 1046, 1319].forEach((h, i) => ton(t + i * .09, h, .12, { glos: .16, zanik: .25 })),
  gameover:   t => [392, 370, 349, 330, 262].forEach((h, i) => ton(t + i * .25, h, .3, { fala: 'triangle', glos: .2, zanik: .3 })),
  plusk:      t => szum(t, .3, { glos: .15, typ: 'lowpass', hz: 1200, opad: .2 }),
};
function sfx(nazwa) { if (!ctx || !SFX[nazwa]) return; try { SFX[nazwa](ctx.currentTime); } catch (e) { /* ignoruj */ } }

/* ------------------------------------------------------------------ utwory (oryginalne kompozycje) */
/* zapis: "C4:1 E4:.5 -:1" (nuta:czas w bitach; '-' pauza; 'C4+E4' akord); ścieżka perkusji: k s h H */
const UTWORY = {
  /* Ekran startowy — "Kurczak z lawy": szybki, żartobliwy rock-chiptune z gdakaniem */
  tytul: {
    bpm: 152, echo: 0,
    sciezki: [
      { fala: 'square', glos: .13, zanik: .12, nuty:
        'E4:.5 E4:.5 G4:.5 E4:.5 B4:1 A4:.5 G4:.5  E4:.5 E4:.5 G4:.5 E4:.5 D5:1 B4:1 ' +
        'E4:.5 E4:.5 G4:.5 A4:.5 B4:.5 A4:.5 G4:.5 E4:.5  D4:.5 E4:.5 -:1 G4:.5 A4:.5 B4:1 ' +
        'A4:.5 A4:.5 C5:.5 A4:.5 E5:1 D5:.5 C5:.5  A4:.5 A4:.5 C5:.5 A4:.5 G5:1 E5:1 ' +
        'E4:.5 E4:.5 G4:.5 A4:.5 B4:.5 A4:.5 G4:.5 E4:.5  E4:.5 D4:.5 E4:1.5 -:.5 B4:.5 E5:.5' },
      { fala: 'sawtooth', glos: .09, zanik: .08, nuty:
        ('E2:.5 E2:.5 E2:.5 E2:.5 E2:.5 E2:.5 G2:.5 G2:.5 ').repeat(3) + 'D2:.5 D2:.5 D2:.5 D2:.5 E2:.5 E2:.5 E2:.5 E2:.5 ' +
        ('A2:.5 A2:.5 A2:.5 A2:.5 A2:.5 A2:.5 C3:.5 C3:.5 ').repeat(2) + 'E2:.5 E2:.5 E2:.5 E2:.5 E2:.5 E2:.5 G2:.5 G2:.5 ' +
        'E2:.5 E2:.5 D2:.5 D2:.5 E2:.5 E2:.5 B2:.5 B2:.5' },
      { fala: 'square', glos: .07, zanik: .05, nuty: '-:14 D7:.2 B6:.2 -:.6 A6:.2 -:.8  -:14.5 D7:.15 D7:.15 B6:.2 -:1' },
      { perkusja: true, nuty: 'k:.5 h:.5 s:.5 h:.5 k:.5 k:.5 s:.5 H:.5' },
    ],
  },
  /* Wioska / Las — spokojne, nostalgiczne arpeggia "pianina" z pogłosem */
  spokojna: {
    bpm: 66, echo: .5,
    sciezki: [
      { fala: 'triangle', glos: .22, atak: .01, zanik: 1.6, nuty:
        '-:1 A4:1.5 G4:.5 F4:1  E4:2 C4:2  -:1 F4:1 A4:1 C5:1  G4:3 -:1 ' +
        '-:.5 A4:1.5 C5:1 D5:1  E5:2 C5:1 A4:1  G4:1.5 F4:.5 E4:1 F4:1  -:4 ' +
        '-:1 C5:1 D5:1 E5:1  F5:2 E5:1 C5:1  -:1 D5:1 C5:1 A4:1  G4:2 -:2 ' +
        '-:.5 F4:1 G4:1 A4:1.5  C5:2 A4:1 G4:1  F4:1.5 E4:.5 F4:1 G4:1  F4:4' },
      { fala: 'triangle', glos: .11, atak: .4, zanik: 2.5, nuty:
        'F3+A3+C4:4 C3+E3+G3:4 D3+F3+A3:4 Bb2+D3+F3:4  F3+A3+C4:4 A2+C3+E3:4 Bb2+D3+F3:4 C3+E3+G3:4 ' +
        'F3+A3+C4:4 C3+E3+G3:4 D3+F3+A3:4 Bb2+D3+F3:4  D3+F3+A3:4 Bb2+D3+F3:4 C3+E3+G3:4 F3+A3+C4:4' },
      { fala: 'sine', glos: .16, atak: .05, zanik: 2, nuty:
        'F2:4 C2:4 D2:4 Bb1:4  F2:4 A1:4 Bb1:4 C2:4  F2:4 C2:4 D2:4 Bb1:4  D2:4 Bb1:4 C2:4 F2:4' },
      { fala: 'square', glos: .03, atak: .01, zanik: .7, nuty:
        '-:7 C6:.5 -:.5  -:7.5 A5:.5  -:6 F6:.5 E6:.5 -:1  -:7 C6:1  -:8 -:8 -:8 -:8' },
    ],
  },
  /* Jaskinia / Kopalnia — mroczne, powolne, z dużym pogłosem */
  jaskinia: {
    bpm: 58, echo: .65,
    sciezki: [
      { fala: 'triangle', glos: .2, atak: .01, zanik: 2, nuty:
        '-:2 E4:1 D4:1  C4:2 A3:2  -:1 E4:1 F4:1 E4:1  D4:3 -:1 ' +
        '-:2 A4:1 G4:1  E4:2 C4:2  -:1 D4:1 E4:1 D4:1  B3:3 -:1 ' +
        '-:1 C4:1 E4:1 A4:1  G4:2 E4:2  -:2 F4:1 E4:1  D4:2 E4:2  -:4 -:4 A3:4 -:4' },
      { fala: 'triangle', glos: .09, atak: .8, zanik: 3, nuty:
        'A2+E3:8 F2+C3:8 D2+A2:8 E2+B2:8  A2+E3:8 F2+C3:8 D2+A2:8 E2+G#2:8' },
      { fala: 'sine', glos: .14, atak: .1, zanik: 3, nuty: 'A1:8 F1:8 D1:8 E1:8 A1:8 F1:8 D1:8 E1:8' },
    ],
  },
  /* Boss — szybkie, niepokojące, z perkusją */
  boss: {
    bpm: 140, echo: .15,
    sciezki: [
      { fala: 'square', glos: .12, zanik: .1, nuty:
        'D5:.5 -:.5 D5:.5 F5:.5 E5:.5 D5:.5 C5:1  D5:.5 -:.5 A5:.5 G5:.5 F5:.5 E5:.5 D5:1 ' +
        'F5:.5 -:.5 F5:.5 G5:.5 A5:.5 G5:.5 F5:1  E5:.5 D5:.5 C#5:1 D5:1 -:1 ' +
        'D5:.5 -:.5 D5:.5 F5:.5 E5:.5 D5:.5 C5:1  D5:.5 -:.5 A5:.5 G5:.5 F5:.5 E5:.5 D5:1 ' +
        'Bb5:.5 -:.5 A5:.5 G5:.5 F5:.5 E5:.5 F5:1  E5:.5 F5:.5 E5:.5 D5:.5 C#5:2' },
      { fala: 'sawtooth', glos: .1, zanik: .06, nuty:
        ('D2:.5 D2:.5 D3:.5 D2:.5 F2:.5 F2:.5 E2:.5 E2:.5 ').repeat(2) + ('F2:.5 F2:.5 F3:.5 F2:.5 A2:.5 A2:.5 A1:.5 A1:.5 ').repeat(2) +
        ('D2:.5 D2:.5 D3:.5 D2:.5 F2:.5 F2:.5 E2:.5 E2:.5 ').repeat(2) + 'Bb1:.5 Bb1:.5 Bb2:.5 Bb1:.5 A1:.5 A1:.5 A2:.5 A1:.5 A1:.5 A1:.5 A1:.5 A1:.5 A1:.5 A1:.5 A1:.5 A1:.5' },
      { perkusja: true, nuty: 'k:.5 h:.5 s:.5 h:.5 k:.5 k:.5 s:.5 h:.5 k:.5 h:.5 s:.5 h:.5 k:.5 k:.5 s:.5 s:.5' },
    ],
  },
  /* Zwycięstwo — radosna fanfara */
  zwyciestwo: {
    bpm: 120, echo: .3, raz: true,
    sciezki: [
      { fala: 'square', glos: .14, zanik: .3, nuty: 'C5:.25 E5:.25 G5:.25 C6:.75 -:.25 G5:.25 C6:.5 -:.25 E6:.25 D6:.25 C6:.25 G5:.5 A5:.5 C6:2' },
      { fala: 'triangle', glos: .12, atak: .05, zanik: 1.5, nuty: 'C3+E3+G3:2 F3+A3+C4:1 G3+B3+D4:1 C3+E3+G3:2' },
    ],
  },
};

function parsuj(nuty) {
  const out = []; let czas = 0;
  for (const tok of nuty.trim().split(/\s+/)) {
    const [n, d] = tok.split(':'); const dl = d ? parseFloat(d) : 1;
    out.push({ n, start: czas, dl }); czas += dl;
  }
  return { nuty: out, dl: czas };
}

function grajMuzyke(nazwa) {
  if (aktualna === nazwa) return;
  stopMuzyke();
  aktualna = nazwa;
  if (!ctx || !UTWORY[nazwa]) return;
  const u = UTWORY[nazwa], bit = 60 / u.bpm, t0 = ctx.currentTime + .08;
  const stany = u.sciezki.map(s => ({ ...parsuj(s.nuty), sc: s, i: 0, petla: 0 }));
  const petlaDl = Math.max(...stany.map(s => s.dl));
  // krótsze ścieżki (np. perkusja) powtarzamy, aż wypełnią długość najdłuższej
  for (const s of stany) if (s.dl < petlaDl) {
    const k = Math.round(petlaDl / s.dl), bazowe = s.nuty.slice();
    for (let r = 1; r < k; r++) for (const n of bazowe) s.nuty.push({ ...n, start: n.start + r * s.dl });
    s.dl = k * s.dl;
  }
  const krok = () => {
    if (aktualna !== nazwa) return;
    const horyzont = ctx.currentTime + .3;
    for (const s of stany) {
      for (;;) {
        if (s.i >= s.nuty.length) { if (u.raz) break; s.i = 0; s.petla++; }
        const nt = s.nuty[s.i];
        const czas = t0 + (s.petla * s.dl + nt.start) * bit;
        if (czas > horyzont) break;
        const dl = nt.dl * bit * .95;
        if (nt.n !== '-') {
          if (s.sc.perkusja) perkusja(czas, nt.n);
          else for (const n of nt.n.split('+')) ton(czas, czest(n), dl, { fala: s.sc.fala, glos: s.sc.glos, atak: s.sc.atak || .008, zanik: s.sc.zanik, cel: muzykaGain, echoIle: u.echo });
        }
        s.i++;
      }
    }
  };
  krok();
  timer = setInterval(krok, 90);
}
function stopMuzyke() { if (timer) clearInterval(timer); timer = null; aktualna = null; }

function wycisz(stan) {
  wyciszone = stan === undefined ? !wyciszone : stan;
  localStorage.setItem('gra-wyciszone', wyciszone ? '1' : '0');
  if (master) master.gain.setTargetAtTime(wyciszone ? 0 : 1, ctx.currentTime, .02);
  return wyciszone;
}

window.Dzwiek = { start, sfx, grajMuzyke, stopMuzyke, wycisz, czyWyciszone: () => wyciszone, aktualna: () => aktualna };
})();
