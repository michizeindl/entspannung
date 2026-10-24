// Sicherungskasten „Stromausfall!“ (Sammlung „entSPANNUNG“, RSI protect, Bereich Elektroprüfung) – Konzept von MZ
// freigegeben (23.10.2026): Bürogebäude im Querschnitt bei Nacht-Gewitter, daneben (quer) bzw. darunter (hoch) der offene
// Verteiler. Fliegt eine Sicherung, wird ein Raum dunkel: zuerst das defekte Gerät im Raum antippen (es wird ausgesteckt
// und gesperrt), dann den passenden Leitungsschutzschalter einschalten. Wer zu früh einschaltet, löst ihn gleich wieder
// aus (−2s). Intaktes Gerät angetippt: „In Ordnung“, −1s (Vorschlag Supervisor). Falscher Schalter: neutraler Klick.
// 15 Ausfälle: 1–5 ein Raum (10s); 6–10 dazu 2× FI (ganzes Haus dunkel, Verursacher irgendwo, FI einschalten; 10s);
// 11–15 dazu 2× Doppelausfall (zwei Räume, 14s) und 1× FI. Zeit um = Panne (Fehler wird gezeigt und behoben),
// 3 Pannen = Abbruch mit 0 Punkten. Punkte je Ausfall 1000/15 (MZ, 24.10.2026, strenger): die Hälfte für „behoben“, die
// Hälfte Tempo (voll bis 2s, FI 3s, Doppel 4s, dann linear bis 0 am Zeitende). Beim ersten FI je Spiel erklärt ein
// Hinweis-Schild den FI (ca. 3s, Tippen schließt, die Zeit steht solange).
// Kamera: Beim Ausfall gleitet die Ansicht auf den dunklen Raum (Geräte groß genug zum Tippen, auch am Handy); beim FI
// bleibt die Übersicht – Raum antippen = hineinsehen, Fassade/Himmel antippen = zurück zur Übersicht. Jeder Ausfall
// beginnt mit einem Funken am Verursacher (bzw. einem Blitz am Himmel); beim FI funkt der Verursacher alle ca. 2s leicht.
//
// Testhilfen (Adresse): #ende=sieg-930 | mittel-640 | schwach-420 | verloren (nach „Los geht's“ sofort das Endbild),
//   #ausfall=N (mit Ausfall N beginnen), #gebaeude=a|b, #loesung (Verursacher und richtigen Schalter markieren),
//   #schnell (kurze Pausen), #ruhig (wie „Bewegung reduzieren“). window.__sicherungskasten: Zustand und Lagen (nur Test).
(function () {
  'use strict';
  const R_ = window.Rahmen;
  const hash = location.hash;
  const TEST = {
    ende: (/(?:^#|&)ende=([a-z]+-)?(\d+|verloren)/.exec(hash) || [])[2] || null,
    ausfall: +((/(?:^#|&)ausfall=(\d+)/.exec(hash) || [])[1] || 0),
    gebaeude: (/(?:^#|&)gebaeude=([ab])/.exec(hash) || [])[1] || null,
    loesung: /(?:^#|&)loesung(?![a-z])/.test(hash),
    schnell: /(?:^#|&)schnell(?![a-z])/.test(hash),
    ruhig: /(?:^#|&)ruhig(?![a-z])/.test(hash),
  };
  const ruhig = () => TEST.ruhig || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const zufall = (a, b) => a + Math.random() * (b - a);
  const wahl = l => l[Math.floor(Math.random() * l.length)];
  const mischen = l => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
  const klemm = (v, a, b) => Math.max(a, Math.min(b, v));
  const glatt = e => { e = klemm(e, 0, 1); return e * e * (3 - 2 * e); };
  const sek = s => s.toFixed(1).replace('.', ',') + 's';
  // Ton mit Verzögerung (Rahmen.ton(name, ab): ab = Startpunkt in der Aufnahme, keine Verzögerung)
  const tonNach = (name, s) => { if (s > 0) setTimeout(() => { if (R_.zustand === 'spiel') R_.ton(name); }, s * 1000); else R_.ton(name); };
  const SCHRIFT = '"Titillium Web", "Segoe UI", system-ui, sans-serif';

  // ---------- Regeln ----------
  const ANZAHL = 15, JE = 1000 / ANZAHL, PANNEN_MAX = 3;
  const BEHOBEN_ANTEIL = 1 / 2;
  const DAUER = { einzel: 13, fi: 14, doppel: 18 };          // Zeit je Ausfall (s) – erhöht (MZ, 24.10.2026; vorher 10/10/14)
  const TEMPO_NULL = { einzel: 10, fi: 10, doppel: 14 };     // Tempo-Punkte fallen wie bisher linear bis 0 bei 10/10/14s
  const VOLL = { einzel: 2, fi: 3, doppel: 4 };               // Tempo-Punkte voll bis hier
  const STRAFE_FRUEH = 2, STRAFE_OK = 1;                      // zu früh eingeschaltet / intaktes Gerät angetippt
  const TICKS = [3, 2, 1.5, 1, 0.6, 0.3];
  // Hinweis beim ersten FI je Spiel (Text MZ, 24.10.2026)
  const FI_HINWEIS = 'Der FI-Schalter hat ausgelöst – das ganze Haus ist dunkel. Tippe einen Raum an, um hineinzusehen, und finde das defekte Gerät. Dann schalte den FI wieder ein.';   // Nachtest 24.10.2026
  const FI_HINWEIS_DAUER = 3;                     // Tempo-Tick bei dieser Restzeit
  const P = TEST.schnell ? 0.35 : 1;                          // Faktor für Pausen
  // Ablauf je Block: Arten mischen (Doppelausfall und FI nie gleich am Blockanfang, damit der Wechsel nicht überrascht)
  function plan() {
    const l = [];
    for (let i = 0; i < 5; i++) l.push('einzel');
    l.push(...ordnenBlock(['fi', 'fi', 'einzel', 'einzel', 'einzel']));
    l.push(...ordnenBlock(['doppel', 'doppel', 'fi', 'einzel', 'einzel']));
    return l;
  }
  function ordnenBlock(b) {
    for (let v = 0; v < 50; v++) {
      mischen(b);
      if (b[0] === 'einzel' && !b.some((a, i) => i && a !== 'einzel' && a === b[i - 1])) break;
    }
    return b;
  }

  // ---------- Geräte (aus Prüfplakette, gleiche Zuschnitte; bilder/g-BB-R-S.webp verkleinert auf 240 px) ----------
  // Spalte 0 intakt, 1 Gebrauchsspuren (gilt hier als intakt), 2/3 Mangel A/B. Verursacher nur mit gut sichtbaren Mängeln
  // (stufe 0 auffällig, 1 mittel). anhaenger = Befestigung des Sperr-Anhängers, ort = Mangel (Funke) – Anteile des Zuschnitts.
  const GERAETE = [
    { name: 'Wasserkocher', bogen: 1, reihe: 0, anhaenger: [0.75, 0.85], maengel: [{ name: 'Kabel eingerissen', stufe: 1, ort: [0.42, 0.91] }, { name: 'Brandspuren', stufe: 0, ort: [0.33, 0.77] }] },
    { name: 'Kaffeemaschine', bogen: 1, reihe: 1, anhaenger: [0.6, 0.9], maengel: [{ name: 'Gehäuse gebrochen', stufe: 0, ort: [0.75, 0.34] }, { name: 'Kabel geflickt', stufe: 1, ort: [0.42, 0.93] }] },
    { name: 'Toaster', bogen: 2, reihe: 0, anhaenger: [0.85, 0.58], maengel: [{ name: 'Stecker gebrochen', stufe: 2, ort: [0.36, 0.87] }, { name: 'Zugentlastung fehlt', stufe: 2, ort: [0.88, 0.54] }] },
    { name: 'Föhn', bogen: 2, reihe: 1, anhaenger: [0.6, 0.7], maengel: [{ name: 'Kabel eingerissen', stufe: 1, ort: [0.4, 0.78] }, { name: 'Gehäuse gebrochen', stufe: 0, ort: [0.78, 0.13] }] },
    { name: 'Bohrmaschine', bogen: 3, reihe: 0, anhaenger: [0.8, 0.82], maengel: [{ name: 'Gehäuse gebrochen', stufe: 0, ort: [0.87, 0.41] }, { name: 'Kabel gequetscht', stufe: 2, ort: [0.42, 0.88] }] },
    { name: 'Akku-Ladegerät', bogen: 3, reihe: 1, anhaenger: [0.8, 0.8], maengel: [{ name: 'Gehäuse offen', stufe: 0, ort: [0.62, 0.45] }, { name: 'Brandspuren', stufe: 0, ort: [0.53, 0.41] }] },
    { name: 'Winkelschleifer', bogen: 4, reihe: 0, anhaenger: [0.55, 0.75], maengel: [{ name: 'Schalter abgebrochen', stufe: 1, ort: [0.37, 0.2] }, { name: 'Kabel geflickt', stufe: 1, ort: [0.71, 0.91], weg: true }] },
    { name: 'Kabeltrommel', bogen: 4, reihe: 1, anhaenger: [0.35, 0.9], maengel: [{ name: 'Gehäuse gerissen', stufe: 0, ort: [0.66, 0.41] }, { name: 'Kabel eingerissen', stufe: 1, ort: [0.75, 0.89] }] },
    { name: 'Verlängerungskabel', bogen: 5, reihe: 0, anhaenger: [0.2, 0.5], maengel: [{ name: 'Schutzkontakt verbogen', stufe: 2, ort: [0.82, 0.7] }, { name: 'Kabel geflickt', stufe: 1, ort: [0.26, 0.7] }] },
    { name: 'Steckdosenleiste', bogen: 5, reihe: 1, anhaenger: [0.18, 0.4], maengel: [{ name: 'Leisten hintereinander', stufe: 0, ort: [0.26, 0.33] }, { name: 'Brandspuren', stufe: 0, ort: [0.78, 0.5] }] },
    { name: 'Monitor', bogen: 6, reihe: 0, anhaenger: [0.2, 0.8], maengel: [{ name: 'Kabel eingerissen', stufe: 2, ort: [0.4, 0.87] }, { name: 'Gehäuse gebrochen', stufe: 0, ort: [0.9, 0.08] }] },
    { name: 'Laptop-Netzteil', bogen: 6, reihe: 1, anhaenger: [0.2, 0.45], maengel: [{ name: 'Zugentlastung fehlt', stufe: 2, ort: [0.21, 0.47] }, { name: 'Stecker gebrochen', stufe: 2, ort: [0.37, 0.82] }] },
    { name: 'Drucker', bogen: 7, reihe: 0, anhaenger: [0.2, 0.75], maengel: [{ name: 'Gehäuse offen', stufe: 0, ort: [0.69, 0.33] }, { name: 'Kabel eingerissen', stufe: 1, ort: [0.62, 0.75] }] },
    { name: 'Schreibtischlampe', bogen: 7, reihe: 1, anhaenger: [0.25, 0.9], maengel: [{ name: 'Schalter abgebrochen', stufe: 1, ort: [0.5, 0.67] }, { name: 'Kabel geflickt', stufe: 1, ort: [0.4, 0.8] }] },
    { name: 'Ventilator', bogen: 8, reihe: 0, anhaenger: [0.3, 0.88], maengel: [{ name: 'Schutzgitter gebrochen', stufe: 0, ort: [0.45, 0.28] }, { name: 'Stecker gebrochen', stufe: 2, ort: [0.81, 0.89] }] },
    { name: 'Heizlüfter', bogen: 8, reihe: 1, anhaenger: [0.3, 0.85], maengel: [{ name: 'Brandspuren', stufe: 0, ort: [0.6, 0.14] }, { name: 'Zugentlastung fehlt', stufe: 2, ort: [0.86, 0.52] }] },
    { name: 'Lötstation', bogen: 9, reihe: 0, anhaenger: [0.25, 0.7], maengel: [{ name: 'Kabel angeschmort', stufe: 1, ort: [0.63, 0.68] }, { name: 'Schutzkontakt verbogen', stufe: 2, ort: [0.78, 0.78] }] },
    { name: 'Staubsauger', bogen: 9, reihe: 1, anhaenger: [0.6, 0.75], maengel: [{ name: 'Kabel gequetscht', stufe: 2, ort: [0.7, 0.69] }, { name: 'Gehäuse gebrochen', stufe: 0, ort: [0.56, 0.23] }] },
    { name: 'Baustrahler', bogen: 10, reihe: 0, anhaenger: [0.25, 0.75], spurenSpaet: true, maengel: [{ name: 'Glas gesprungen', stufe: 0, ort: [0.84, 0.17] }, { name: 'Kabel eingerissen', stufe: 1, ort: [0.81, 0.87] }] },
    { name: 'Mini-Kühlschrank', bogen: 10, reihe: 1, anhaenger: [0.6, 0.85], maengel: [{ name: 'Stecker gebrochen', stufe: 2, ort: [0.84, 0.92] }, { name: 'Gehäuse offen', stufe: 0, ort: [0.8, 0.35] }] },
  ];
  // Seitenverhältnis der Zuschnitte (Breite/Höhe, aus Prüfplakette)
  const MASSE = {'01-0-0': [310, 380], '01-0-1': [310, 380], '01-0-2': [313, 380], '01-0-3': [311, 380], '01-1-0': [277, 380], '01-1-1': [277, 380], '01-1-2': [277, 380], '01-1-3': [278, 380], '02-0-0': [309, 380], '02-0-1': [310, 380], '02-0-2': [310, 380], '02-0-3': [307, 380], '02-1-0': [287, 380], '02-1-1': [288, 380], '02-1-2': [289, 380], '02-1-3': [291, 380], '03-0-0': [359, 380], '03-0-1': [360, 380], '03-0-2': [360, 380], '03-0-3': [360, 380], '03-1-0': [360, 380], '03-1-1': [359, 380], '03-1-2': [359, 380], '03-1-3': [359, 380], '04-0-0': [380, 379], '04-0-1': [378, 380], '04-0-2': [375, 380], '04-0-3': [369, 380], '04-1-0': [261, 380], '04-1-1': [261, 380], '04-1-2': [261, 380], '04-1-3': [261, 380], '05-0-0': [364, 380], '05-0-1': [365, 380], '05-0-2': [365, 380], '05-0-3': [364, 380], '05-1-0': [380, 342], '05-1-1': [380, 340], '05-1-2': [348, 380], '05-1-3': [380, 341], '06-0-0': [291, 380], '06-0-1': [289, 380], '06-0-2': [292, 380], '06-0-3': [292, 380], '06-1-0': [380, 354], '06-1-1': [380, 355], '06-1-2': [380, 355], '06-1-3': [380, 360], '07-0-0': [356, 380], '07-0-1': [352, 380], '07-0-2': [373, 380], '07-0-3': [352, 380], '07-1-0': [247, 380], '07-1-1': [246, 380], '07-1-2': [251, 380], '07-1-3': [253, 380], '08-0-0': [253, 380], '08-0-1': [254, 380], '08-0-2': [258, 380], '08-0-3': [253, 380], '08-1-0': [269, 380], '08-1-1': [269, 380], '08-1-2': [274, 380], '08-1-3': [264, 380], '09-0-0': [321, 380], '09-0-1': [323, 380], '09-0-2': [316, 380], '09-0-3': [317, 380], '09-1-0': [302, 380], '09-1-1': [302, 380], '09-1-2': [304, 380], '09-1-3': [305, 380], '10-0-0': [337, 380], '10-0-1': [338, 380], '10-0-2': [339, 380], '10-0-3': [335, 380], '10-1-0': [279, 380], '10-1-1': [278, 380], '10-1-2': [276, 380], '10-1-3': [283, 380]};
  const gIndex = n => GERAETE.findIndex(g => g.name === n);
  const nutzbar = gi => GERAETE[gi].maengel.map((m, i) => i).filter(i => GERAETE[gi].maengel[i].stufe <= 1 && !GERAETE[gi].maengel[i].weg);
  const schluessel = d => String(GERAETE[d.gi].bogen).padStart(2, '0') + '-' + GERAETE[d.gi].reihe + '-' + (d.mangel != null ? 2 + d.mangel : d.spalte);

  // ---------- Räume (12 Typen, Kacheln aus sicherungskasten-raeume-a/-b, ca. 504×504) ----------
  // tisch = Tischplatte x von–bis, fuss = Bezug für den Bildausschnitt, tiefe = Tischplatte hinten/vorne (Oberfläche,
  // Kachel-Bildpunkte, am Bild abgemessen 24.10.2026) – die Geräte stehen bei 60 % der Tiefe
  // Standfläche der Geräte (MZ, 24.10.2026: Geräte wirkten schwebend): gemeinsame Tabelle mit Prüfplakette und
  // Messwert, Skript Material/Bilder/pruefplakette-skripte/standlinie.py – je Variante [Standlinie, Auflage von, bis]
  // STANDLINIE-ANFANG (automatisch eingetragen, nicht von Hand ändern)
  const STANDLINIE = {"01-0-0":[0.83,0.1,0.74],"01-0-1":[0.83,0.1,0.74],"01-0-2":[0.83,0.1,0.74],"01-0-3":[0.83,0.1,0.74],"01-1-0":[0.853,0.13,0.646],"01-1-1":[0.853,0.13,0.65],"01-1-2":[0.853,0.13,0.646],"01-1-3":[0.853,0.13,0.646],"02-0-0":[0.724,0.068,0.576],"02-0-1":[0.724,0.068,0.574],"02-0-2":[0.724,0.071,0.577],"02-0-3":[0.724,0.068,0.58],"02-1-0":[0.7,0.4,0.54],"02-1-1":[0.7,0.4,0.54],"02-1-2":[0.7,0.4,0.54],"02-1-3":[0.7,0.4,0.54],"03-0-0":[0.79,0.26,0.4],"03-0-1":[0.79,0.26,0.4],"03-0-2":[0.79,0.26,0.4],"03-0-3":[0.79,0.26,0.4],"03-1-0":[0.67,0.03,0.91],"03-1-1":[0.67,0.03,0.91],"03-1-2":[0.67,0.03,0.91],"03-1-3":[0.67,0.03,0.91],"04-0-0":[0.66,0.05,0.55],"04-0-1":[0.66,0.05,0.55],"04-0-2":[0.66,0.05,0.55],"04-0-3":[0.66,0.05,0.55],"04-1-0":[0.76,0.1,0.92],"04-1-1":[0.76,0.1,0.92],"04-1-2":[0.76,0.1,0.92],"04-1-3":[0.76,0.1,0.92],"05-0-0":[0.72,0.1,0.9],"05-0-1":[0.72,0.1,0.9],"05-0-2":[0.72,0.1,0.9],"05-0-3":[0.72,0.1,0.9],"05-1-0":[0.74,0.08,0.98],"05-1-1":[0.74,0.08,0.98],"05-1-2":[0.76,0.05,0.98],"05-1-3":[0.74,0.08,0.98],"06-0-0":[0.797,0.192,0.766],"06-0-1":[0.8,0.18,0.765],"06-0-2":[0.797,0.192,0.75],"06-0-3":[0.8,0.185,0.757],"06-1-0":[0.62,0.25,0.75],"06-1-1":[0.62,0.25,0.75],"06-1-2":[0.62,0.25,0.75],"06-1-3":[0.62,0.25,0.75],"07-0-0":[0.653,0.225,0.857],"07-0-1":[0.658,0.278,0.852],"07-0-2":[0.666,0.298,0.987],"07-0-3":[0.647,0.202,0.864],"07-1-0":[0.78,0.31,0.85],"07-1-1":[0.78,0.31,0.85],"07-1-2":[0.78,0.31,0.85],"07-1-3":[0.78,0.31,0.85],"08-0-0":[0.813,0.225,0.802],"08-0-1":[0.813,0.22,0.799],"08-0-2":[0.811,0.225,0.833],"08-0-3":[0.811,0.217,0.791],"08-1-0":[0.721,0.1,0.829],"08-1-1":[0.721,0.097,0.829],"08-1-2":[0.721,0.073,0.847],"08-1-3":[0.721,0.095,0.841],"09-0-0":[0.537,0.09,0.854],"09-0-1":[0.534,0.093,0.867],"09-0-2":[0.529,0.092,0.87],"09-0-3":[0.532,0.091,0.864],"09-1-0":[0.67,0.2,0.95],"09-1-1":[0.67,0.2,0.95],"09-1-2":[0.67,0.2,0.95],"09-1-3":[0.67,0.2,0.95],"10-0-0":[0.71,0.09,0.95],"10-0-1":[0.71,0.09,0.95],"10-0-2":[0.71,0.09,0.95],"10-0-3":[0.71,0.09,0.95],"10-1-0":[0.76,0.02,0.75],"10-1-1":[0.76,0.02,0.75],"10-1-2":[0.76,0.02,0.75],"10-1-3":[0.76,0.02,0.75],"leuchte":[0.97,0.02,0.98],"kuehlschrank":[0.985,0.08,0.95]};
  // STANDLINIE-ENDE
  const RAEUME = [
    { id: 'teekueche', name: 'Teeküche', tisch: [28, 482], fuss: 295, tiefe: [272, 310], geraete: ['Wasserkocher', 'Kaffeemaschine', 'Toaster', 'Mini-Kühlschrank'] },
    { id: 'buero', name: 'Büro', tisch: [25, 480], fuss: 288, tiefe: [270, 300], geraete: ['Monitor', 'Laptop-Netzteil', 'Schreibtischlampe', 'Drucker', 'Ventilator', 'Heizlüfter', 'Steckdosenleiste'] },
    { id: 'werkstatt', name: 'Werkstatt', tisch: [28, 490], fuss: 300, tiefe: [280, 312], geraete: ['Bohrmaschine', 'Winkelschleifer', 'Kabeltrommel', 'Akku-Ladegerät', 'Lötstation', 'Baustrahler'] },
    { id: 'serverraum', name: 'Serverraum', tisch: [50, 465], fuss: 260, tiefe: [234, 280], geraete: ['Monitor', 'Steckdosenleiste', 'Laptop-Netzteil', 'Ventilator', 'Verlängerungskabel'] },
    { id: 'empfang', name: 'Empfang', tisch: [13, 490], fuss: 245, tiefe: [234, 246], geraete: ['Monitor', 'Schreibtischlampe', 'Drucker', 'Laptop-Netzteil', 'Kaffeemaschine'] },
    { id: 'lager', name: 'Lager', tisch: [43, 470], fuss: 275, tiefe: [245, 290], geraete: ['Kabeltrommel', 'Akku-Ladegerät', 'Staubsauger', 'Baustrahler', 'Verlängerungskabel', 'Heizlüfter'] },
    { id: 'kantine', name: 'Kantine', tisch: [25, 505], fuss: 335, tiefe: [300, 350], geraete: ['Kaffeemaschine', 'Wasserkocher', 'Toaster', 'Mini-Kühlschrank'] },
    { id: 'besprechung', name: 'Besprechung', tisch: [71, 436], fuss: 328, tiefe: [262, 348], geraete: ['Laptop-Netzteil', 'Monitor', 'Steckdosenleiste', 'Kaffeemaschine', 'Ventilator'] },
    { id: 'labor', name: 'Labor', tisch: [11, 491], fuss: 335, tiefe: [300, 345], geraete: ['Lötstation', 'Monitor', 'Laptop-Netzteil', 'Akku-Ladegerät', 'Schreibtischlampe'] },
    { id: 'sozialraum', name: 'Sozialraum', tisch: [40, 470], fuss: 305, tiefe: [272, 345], geraete: ['Wasserkocher', 'Kaffeemaschine', 'Föhn', 'Mini-Kühlschrank', 'Ventilator', 'Heizlüfter', 'Toaster'] },
    { id: 'kopierraum', name: 'Kopierraum', tisch: [43, 461], fuss: 298, tiefe: [258, 335], geraete: ['Drucker', 'Steckdosenleiste', 'Verlängerungskabel', 'Schreibtischlampe'] },
    { id: 'technikraum', name: 'Technikraum', tisch: [40, 447], fuss: 300, tiefe: [262, 310], geraete: ['Kabeltrommel', 'Bohrmaschine', 'Lötstation', 'Baustrahler', 'Verlängerungskabel', 'Heizlüfter', 'Staubsauger'] },
  ];
  RAEUME.forEach(r => { r.gis = r.geraete.map(gIndex); });
  const KACHEL = 504;            // Kachelgröße (vor dem Laden)
  const POS = [0.28, 0.72];      // Gerätplätze auf dem Tisch (Anteil der Tischbreite)
  const GERAET_H = 112, GERAET_F = 94;   // Geräte in Kachel-Bildpunkten: höchstens so hoch, Fläche wie Quadrat dieser Kante

  // ---------- Gebäude (1536×1024, Raumplätze magenta → durchsichtig; am Bild abgemessen) ----------
  // Plätze: OG2 links/Mitte/rechts, OG1 links/Mitte/rechts, EG links/rechts (EG Mitte = Treppenhaus, fest im Bild)
  const GEB = {
    a: { plaetze: [[161, 188, 540, 382], [584, 188, 951, 381], [995, 188, 1375, 382], [161, 443, 540, 640], [584, 443, 951, 640], [995, 443, 1375, 640], [161, 698, 540, 911], [995, 698, 1375, 911]],
      treppe: [584, 698, 951, 922], rahmen: [7, 8, 1527, 968] },
    b: { plaetze: [[167, 194, 548, 408], [578, 194, 958, 408], [989, 194, 1369, 408], [167, 447, 548, 648], [578, 447, 958, 648], [989, 447, 1369, 648], [167, 681, 548, 931], [989, 681, 1369, 931]],
      treppe: [570, 672, 966, 940], rahmen: [30, 21, 1504, 976] },
  };
  // Himmel 1536×1024: Stadtlichter am Horizont ab y 950, Wolken bis ca. y 860
  const HIMMEL = { b: 1536, h: 1024, horizont: 900, wolkenBis: 820 };

  // ---------- Verteiler (bilder/verteiler.webp 684×648: drei Scheiben à 216 aus sicherungskasten-verteiler.png) ----------
  // je Scheibe: Beschriftungsstreifen y 14–61 (x 43–643), Ausschnitt mit Hutschiene y 84–202 (x 50–633)
  const VT = { b: 684, h: 648, scheibe: 216, streifen: [43, 14, 643, 61], ausschnitt: [50, 84, 633, 202] };
  const MOD_H = 112, MOD_Y = 87;                    // Front der Geräte (Höhe, Oberkante in der Scheibe)
  const TE = MOD_H * 107 / 256;                     // Teilungseinheit = Breite eines LS (Front 107×256)
  const TE_X0 = 52 + (579 - 12 * TE) / 2;           // 12 TE je Reihe, mittig auf der Schiene
  // Belegung: Reihe 0 FI (TE 0–3) + 2 LS, Reihen 1/2 je 3 LS; Fach = Trefferfläche (4 TE breit)
  const FAECHER = [[0, 5, 4], [0, 9, 8], [1, 1, 0], [1, 5, 4], [1, 9, 8], [2, 2, 0], [2, 6, 4], [2, 10, 8]];   // [reihe, TE des LS, Fach-Beginn]

  // ---------- Bilder ----------
  const bilder = {};
  function lade(name, datei, fertig) {
    if (bilder[name] || bilder[name + ':l']) return;
    bilder[name + ':l'] = true;
    const i = new Image();
    i.onload = () => { bilder[name] = i; if (fertig) fertig(i); };
    i.src = datei;
  }
  const POSEN = {
    ruhe: { bild: 'bilder/mann-ruhe.webp', blick: 'links', hoehe: 1 },
    daumen: { bild: 'bilder/mann-daumen.webp', blick: 'links', hoehe: 0.99 },
    jubel: { bild: 'bilder/mann-jubel.webp', blick: 'frontal', hoehe: 0.89 },
    entsetzt: { bild: 'bilder/mann-entsetzt.webp', blick: 'frontal', hoehe: 0.94 },
  };
  const schalterBild = {};    // umgefärbt (Hebel #00FF00 → Kundenfarbe)
  let wolken = null;
  lade('himmel', 'bilder/himmel.webp', i => { wolken = wolkenEbene(i); });
  lade('verteiler', 'bilder/verteiler.webp');
  ['ls-ein', 'ls-aus', 'ls-ausgeloest', 'fi-ein', 'fi-aus', 'blind'].forEach(n => lade(n, 'bilder/' + n + '.webp', i => { schalterBild[n] = n === 'blind' ? i : R_.umfaerben(i); }));
  Object.keys(POSEN).forEach(n => lade(n, POSEN[n].bild));
  const gebNacht = {};        // Gebäude nachts (Fassade abgedunkelt), einmal vorbereitet
  function gebaeudeLaden(g) {
    lade('geb-' + g, 'bilder/gebaeude-' + g + '.webp', i => {
      const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight;
      const x = c.getContext('2d'); x.drawImage(i, 0, 0);
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(8,14,32,.46)'; x.fillRect(0, 0, c.width, c.height);
      gebNacht[g] = c;
    });
  }
  const geraetLaden = d => { const k = schluessel(d); lade(k, 'bilder/g-' + k + '.webp'); };

  // ---------- Lage ----------
  let B = 0, H = 0, L = null;
  const OBEN = 82;
  function lage() {
    const hochF = H > B * 1.05;
    let vt, stage, figH, figUnten;
    if (hochF) {
      let s = Math.min((B - 16) / VT.b, 560 / VT.b);
      s = Math.min(s, (H * 0.39) / VT.h);
      const vw = VT.b * s, vh = VT.h * s;
      vt = { x: (B - vw) / 2, y: H - vh - Math.max(10, H * 0.014), s };
      const sy = OBEN, sh = vt.y - 12 - sy;
      figH = klemm(sh * 0.42, 84, 160);
      figUnten = sy + sh;
      const fw = figH * 0.42;
      stage = { x: fw + 10, y: sy, w: B - fw - 16, h: sh };
    } else {
      const vwMax = klemm(B * 0.4, 250, 560);
      const s = Math.min((vwMax - 14) / VT.b, (H - OBEN - 12) / VT.h);
      const vw = VT.b * s, vh = VT.h * s;
      vt = { x: B - vw - 12, y: OBEN + (H - OBEN - 6 - vh) / 2, s };
      figH = klemm(H * 0.34, 100, 240);
      figUnten = H - 6;
      const fw = figH * 0.42;
      stage = { x: fw + 12, y: OBEN - 4, w: vt.x - 16 - (fw + 12), h: H - OBEN - 6 };
    }
    // Schalter-Lagen auf dem Bildschirm
    const s = vt.s, sx = x => vt.x + x * s, sy = (r, y) => vt.y + (r * VT.scheibe + y) * s;
    const schalter = FAECHER.map(([r, te, fach]) => ({
      reihe: r,
      mod: [sx(TE_X0 + te * TE), sy(r, MOD_Y), TE * s, MOD_H * s],
      fach: [sx(TE_X0 + fach * TE), sy(r, VT.streifen[1]), 4 * TE * s, (VT.ausschnitt[3] - VT.streifen[1]) * s],
    }));
    const fi = { mod: [sx(TE_X0), sy(0, MOD_Y), 4 * TE * s, MOD_H * s], fach: [sx(TE_X0), sy(0, VT.streifen[1]), 4 * TE * s, (VT.ausschnitt[3] - VT.streifen[1]) * s] };
    L = { hochF, vt, stage, figH, figUnten, schalter, fi, kurz: Math.min(B, H) };
  }
  function groesse(b, h) { B = b; H = h; lage(); if (S) kameraZiel(true); }

  // ---------- Zustand ----------
  let S = null;
  function zuletztLesen() { try { return JSON.parse(localStorage.getItem('mg:sicherungskasten:zuletzt') || 'null'); } catch (e) { return null; } }
  function neu() {
    const alt = zuletztLesen();
    const geb = TEST.gebaeude || (alt && alt.geb ? (alt.geb === 'a' ? 'b' : 'a') : wahl(['a', 'b']));
    // 8 von 12 Raumtypen: zuletzt nicht gespielte zuerst
    const altR = (alt && alt.raeume) || [];
    const typen = mischen(RAEUME.map((r, i) => i)).sort((x, y) => (altR.includes(RAEUME[x].id) ? 1 : 0) - (altR.includes(RAEUME[y].id) ? 1 : 0)).slice(0, 8);
    mischen(typen);
    const raeume = typen.map((t, platz) => ({ typ: t, platz, licht: true, wechselT: -9, geraete: [] }));
    raeume.forEach(r => { r.geraete = geraeteWaehlen(r); });
    // Schalter: Räume gemischt auf die 8 Fächer (damit man lesen muss)
    const fach = mischen(raeume.map((r, i) => i));
    const schalter = fach.map(ri => ({ raum: ri, ein: true, ausgeloestT: -9, klappT: -9, wackelT: -9, funkT: -9 }));
    raeume.forEach((r, ri) => { r.schalter = schalter.findIndex(s => s.raum === ri); });
    S = {
      zeit: 0, geb, raeume, schalter, fi: { ein: true, ausgeloestT: -9, klappT: -9, wackelT: -9, funkT: -9 },
      plan: plan(), nr: Math.max(0, Math.min(ANZAHL, TEST.ausfall || 1) - 1), A: null, phase: 'pause', phaseT: 0, pause: 1.6,
      punkte: 0, behoben: 0, pannen: 0, zuFrueh: 0, inOrdnung: 0, zeiten: [],
      kam: null, kamZiel: null, fokus: null, fokusManuell: false,
      figur: { pose: 'ruhe', bis: 0, hupf: -9 }, klicks: [], funken: [], schilder: [], blitz: null, glimmen: null, glimmenUm: zufall(1.5, 3.5),
      treppeDunkel: false, fiHinweis: null, fiErklaert: false, fertig: false, testEnde: !!TEST.ende,
    };
    if (R_.zustand === 'spiel') try { localStorage.setItem('mg:sicherungskasten:zuletzt', JSON.stringify({ geb, raeume: raeume.map(r => RAEUME[r.typ].id) })); } catch (e) { /* privat */ }
    gebaeudeLaden(geb);
    raeume.forEach(r => { lade('raum-' + RAEUME[r.typ].id, 'bilder/raum-' + RAEUME[r.typ].id + '.webp'); r.geraete.forEach(d => { geraetLaden(d); vorladenDefekt(d); }); });
    kameraZiel(true);
    anzeigen();
  }
  // Zwei verschiedene Geräte für einen Raum (mindestens eines kann Verursacher sein), Gebrauchsspuren gelten als intakt
  function geraeteWaehlen(r, behalten) {
    const typ = RAEUME[r.typ];
    for (let v = 0; v < 40; v++) {
      const l = mischen(typ.gis.slice());
      let paar = behalten ? [behalten.gi, l.find(g => g !== behalten.gi)] : l.slice(0, 2);
      if (!paar.some(gi => nutzbar(gi).length)) continue;
      return paar.map((gi, i) => (behalten && i === 0) ? behalten : neuesGeraet(gi, i));
    }
    return [neuesGeraet(typ.gis[0], 0), neuesGeraet(typ.gis[1], 1)];
  }
  function neuesGeraet(gi, platz) {
    const spuren = Math.random() < 0.35 && !GERAETE[gi].spurenSpaet;
    return { gi, platz, spalte: spuren ? 1 : 0, mangel: null, steckt: true, sperrT: null, neuT: null, wegT: null };
  }
  const vorladenDefekt = d => nutzbar(d.gi).forEach(m => geraetLaden({ gi: d.gi, mangel: m }));

  function anzeigen() {
    R_.anzeige('Ausfall ' + Math.min(ANZAHL, S.nr + 1) + '/' + ANZAHL, Math.round(S.punkte).toLocaleString('de-DE') + ' Punkte');
  }

  // ---------- Ablauf ----------
  function schritt(dt) {
    if (!L) return;
    if (S.testEnde) { S.testEnde = false; testEnde(); return; }
    S.zeit += dt; S.phaseT += dt;
    if (S.fertig) return;
    const A = S.A;
    if (S.phase === 'pause') {
      if (S.phaseT >= S.pause * P && bereit()) ausfallStarten();
    } else if (S.phase === 'ausfall') {
      if (!A.laeuft) { vorlaufSchritt(A, dt); return; }   // Uhr steht, bis das Licht aus ist
      // FI-Hinweis: Zeit steht, bis er angetippt wird (Nachtest 24.10.2026: stehen lassen)
      if (S.fiHinweis && !S.fiHinweis.zu) return;
      A.t += dt;
      const rest = A.dauer - A.t;
      let tick = false;
      while (A.tick < TICKS.length && rest <= TICKS[A.tick]) { A.tick++; tick = true; }
      if (tick && rest > 0) R_.ton('tempo');
      // FI: Verursacher funkt leicht (Hinweis, wo er steckt)
      // Raum-Ausfall: im Dunkeln funkt und raucht es leicht alle 2–3s am defekten Gerät, bis es ausgesteckt ist
      if (A.art !== 'fi' && S.zeit >= A.funkUm) { A.funkUm = S.zeit + zufall(2, 3); A.verursacher.forEach(v => { if (v.d.steckt) { funkenAmGeraet(v.ri, v.d, 8, 0.55); rauchAmGeraet(v.ri, v.d); } }); }
      if (A.art === 'fi' && S.zeit >= A.funkUm) { A.funkUm = S.zeit + zufall(1.7, 2.5); A.verursacher.forEach(v => { if (v.d.steckt) funkenAmGeraet(v.ri, v.d, 9, 0.6); }); }
      if (A.weiterZu != null && S.zeit >= A.weiterZu) { A.weiterZu = null; fokusNaechster(); }
      if (A.t >= A.dauer) panne();
    } else if (S.phase === 'panne') {
      const p = S.phaseT;
      if (!A.ausgestecktAuto && p >= 1.0 * P + 0.2) { A.ausgestecktAuto = true; A.verursacher.forEach(v => { if (v.d.steckt) ausstecken(v.ri, v.d, true); }); }
      if (!A.eingeschaltetAuto && p >= 1.7 * P + 0.3) { A.eingeschaltetAuto = true; allesEinschalten(); }
      if (p >= 2.5 * P + 0.4) {
        if (S.pannen >= PANNEN_MAX) return beenden(true);
        aufraeumen();
      }
    } else if (S.phase === 'behoben') {
      if (S.phaseT >= 0.85 * P + 0.15) aufraeumen();
    }
  }
  // Bilder des nächsten Ausfalls geladen?
  function bereit() {
    if (!gebNacht[S.geb] || !bilder.verteiler) return false;
    return S.raeume.every(r => bilder['raum-' + RAEUME[r.typ].id] && r.geraete.every(d => bilder[schluessel(d)]));
  }
  // MZ 24.10.2026 („zu leicht“): keine helle Phase mehr – Funke und Flackern sofort, dann dunkel; Uhr startet, wenn es dunkel ist
  const VORLAUF = { funk: 0, aus: 0.02, flackern: 0.42, fiSchritt: 0.06 };
  // Vorlauf eines Ausfalls: Funke am Gerät, dann Licht aus (Schalter fliegt), dann Start der Uhr
  function vorlaufSchritt(A, dt) {
    A.vor += dt;
    if (!A.funkVor && A.vor >= VORLAUF.funk) {
      A.funkVor = true;
      if (A.blitz) blitzAusloesen();
      A.verursacher.forEach(v => funkenAmGeraet(v.ri, v.d, A.blitz ? 16 : 26, 1));
    }
    if (!A.aus && A.vor >= VORLAUF.aus) {
      A.aus = true;
      if (A.art === 'fi') {
        S.fi.ein = false; S.fi.ausgeloestT = S.zeit; S.fi.klappT = S.zeit;
        mischen(S.raeume.slice()).forEach((r, k) => { r.licht = false; r.wechselT = S.zeit + k * VORLAUF.fiSchritt; });
        S.treppeDunkel = true;
        R_.ton('fi');
        A.startBei = A.vor + (S.raeume.length - 1) * VORLAUF.fiSchritt + VORLAUF.flackern;
      } else {
        A.raeume.forEach((ri, k) => {
          const r = S.raeume[ri], sch = S.schalter[r.schalter];
          r.licht = false; r.wechselT = S.zeit + k * 0.16;
          sch.ein = false; sch.ausgeloestT = S.zeit; sch.klappT = S.zeit;
        });
        R_.ton('fliegt');
        if (A.art === 'doppel') tonNach('fliegt', 0.16);
        A.startBei = A.vor + (A.raeume.length - 1) * 0.16 + VORLAUF.flackern;
      }
      R_.vibrieren(30);
    }
    if (A.aus && A.vor >= A.startBei) {
      A.laeuft = true; A.funkUm = S.zeit + (A.art === 'fi' ? 1.2 : zufall(2, 3));
      if (A.art === 'fi' && !S.fiErklaert) { S.fiErklaert = true; S.fiHinweis = { t0: S.zeit, zu: null }; }
    }
  }
  function ausfallStarten() {
    const art = S.plan[S.nr];
    const letzte = S.letzteRaeume || [];
    const kand = mischen(S.raeume.map((r, i) => i)).sort((a, b) => (letzte.includes(a) ? 1 : 0) - (letzte.includes(b) ? 1 : 0));
    const raeume = art === 'doppel' ? kand.slice(0, 2) : kand.slice(0, 1);
    S.letzteRaeume = raeume;
    const verursacher = raeume.map(ri => {
      const r = S.raeume[ri];
      const moegl = r.geraete.filter(d => nutzbar(d.gi).length);
      const d = wahl(moegl);
      d.mangel = wahl(nutzbar(d.gi));
      return { ri, d };
    });
    const blitz = art === 'fi' ? Math.random() < 0.6 : Math.random() < 0.3;
    S.A = { art, raeume, verursacher, t: 0, dauer: DAUER[art], tick: 0, t0: S.zeit, blitz, funkUm: S.zeit + 1.2, vor: 0, laeuft: false, funkVor: false, aus: false, weiterZu: null, ausgestecktAuto: false, eingeschaltetAuto: false };
    S.phase = 'ausfall'; S.phaseT = 0;
    // Schalter-Hilfe (Spielertest 24.10.2026): beim ersten Raum-Ausfall und beim ersten FI-Ausfall je Spiel wird nach dem
    // Ausstecken der passende Schalter kurz hervorgehoben (bis zum Antippen, höchstens 4s)
    const hk = art === 'fi' ? 'hilfeFi' : 'hilfeLs';
    if (!S[hk]) { S[hk] = true; S.A.hilfe = true; }
    // Ausfall erzählen (MZ, 24.10.2026): Raum zuerst ca. 1s hell (Geräte gut zu sehen), dann funkt das defekte Gerät, das Licht
    // flackert und geht aus; erst dann läuft die Uhr. FI: alle Lichter gehen nacheinander aus.
    if (art === 'fi') { S.fokus = null; S.fokusManuell = false; }
    else { S.fokus = raeume[0]; S.fokusManuell = false; }
    kameraZiel();
    anzeigen();
  }
  // Fokus nach dem Ausstecken: nächster Raum mit noch gestecktem Verursacher (Doppelausfall), sonst bleiben
  function fokusNaechster() {
    const A = S.A;
    const offen = A.verursacher.find(v => v.d.steckt);
    if (offen && A.art !== 'fi') { S.fokus = offen.ri; S.fokusManuell = false; kameraZiel(); }
  }
  function ausstecken(ri, d, auto) {
    d.steckt = false; d.sperrT = S.zeit;
    R_.ton('ausstecken');
    schild(ri, d, GERAETE[d.gi].maengel[d.mangel].name, auto ? 'gefahr' : 'mangel', auto ? 1.6 : 1.1);
  }
  function geraetTippen(ri, d) {
    const A = S.A;
    if (!A || S.phase !== 'ausfall' || !A.laeuft) return;
    const v = A.verursacher.find(x => x.d === d);
    if (v && d.steckt) {
      ausstecken(ri, d, false);
      if (A.verursacher.some(x => x.d.steckt)) A.weiterZu = S.zeit + 0.45;
      return;
    }
    if (v && !d.steckt) return;    // schon gesperrt
    A.t += STRAFE_OK; S.inOrdnung++;
    R_.ton('falsch');
    schild(ri, d, 'In Ordnung', 'neutral', 0.9, '−' + STRAFE_OK + 's');
  }
  function schalterTippen(i) {
    const sch = S.schalter[i], A = S.A;
    if (A && S.phase === 'ausfall' && !A.laeuft) return;
    if (S.phase !== 'ausfall' || sch.ein || !A || A.art === 'fi') { sch.wackelT = S.zeit; R_.ton('falsch'); return; }
    const v = A.verursacher.find(x => x.ri === sch.raum);
    if (v && v.d.steckt) return zuFrueh(sch);
    sch.ein = true; sch.klappT = S.zeit;
    const r = S.raeume[sch.raum]; r.licht = true; r.wechselT = S.zeit;
    R_.ton('einschalten');
    pruefeBehoben();
  }
  function fiTippen() {
    const A = S.A, fi = S.fi;
    if (A && S.phase === 'ausfall' && !A.laeuft) return;
    if (S.phase !== 'ausfall' || fi.ein || !A || A.art !== 'fi') { fi.wackelT = S.zeit; R_.ton('falsch'); return; }
    if (A.verursacher.some(v => v.d.steckt)) return zuFrueh(fi);
    fi.ein = true; fi.klappT = S.zeit;
    S.raeume.forEach(r => { r.licht = true; r.wechselT = S.zeit + Math.random() * 0.25; });
    S.treppeDunkel = false;
    R_.ton('einschalten');
    pruefeBehoben();
  }
  function zuFrueh(sch) {
    S.A.t += STRAFE_FRUEH; S.zuFrueh++;
    sch.ausgeloestT = S.zeit; sch.klappT = S.zeit; sch.funkT = S.zeit; sch.frueh = S.zeit;
    R_.ton('zufrueh'); R_.vibrieren([40, 30, 40]);
    figur('entsetzt', 1.2);
    funkenSchalter(sch);
  }
  function pruefeBehoben() {
    const A = S.A;
    const offen = A.art === 'fi' ? !S.fi.ein : A.raeume.some(ri => !S.schalter[S.raeume[ri].schalter].ein);
    if (offen) return;
    const t = Math.min(A.t, A.dauer), voll = VOLL[A.art];
    const tempo = t <= voll ? 1 : klemm((TEMPO_NULL[A.art] - t) / (TEMPO_NULL[A.art] - voll), 0, 1);
    const p = JE * BEHOBEN_ANTEIL + JE * (1 - BEHOBEN_ANTEIL) * tempo;
    S.punkte += p; S.behoben++; S.zeiten.push(t);
    A.ergebnis = { t, punkte: p };
    if (t <= voll) figur('daumen', 1.0, true);
    S.phase = 'behoben'; S.phaseT = 0;
    anzeigen();
  }
  function panne() {
    const A = S.A;
    S.pannen++; A.panne = true;
    S.phase = 'panne'; S.phaseT = 0;
    R_.ton('fehler'); R_.vibrieren([80, 40, 80]);
    figur('entsetzt', 1.8);
    // Verursacher zeigen: Kamera auf den ersten noch gesteckten Verursacher
    const v = A.verursacher.find(x => x.d.steckt) || A.verursacher[0];
    S.fokus = v.ri; S.fokusManuell = false; kameraZiel();
    A.verursacher.forEach(x => { if (x.d.steckt) schild(x.ri, x.d, GERAETE[x.d.gi].maengel[x.d.mangel].name, 'gefahr', 2.4); });
    anzeigen();
  }
  function allesEinschalten() {
    const A = S.A;
    if (A.art === 'fi') {
      S.fi.ein = true; S.fi.klappT = S.zeit; S.treppeDunkel = false;
      S.raeume.forEach(r => { if (!r.licht) { r.licht = true; r.wechselT = S.zeit + Math.random() * 0.25; } });
    } else A.raeume.forEach(ri => {
      const r = S.raeume[ri], sch = S.schalter[r.schalter];
      if (!sch.ein) { sch.ein = true; sch.klappT = S.zeit; }
      if (!r.licht) { r.licht = true; r.wechselT = S.zeit; }
    });
    R_.ton('einschalten');
  }
  // Nach dem Ausfall: gesperrtes Gerät wird abgeholt, ein anderes intaktes Gerät kommt an seinen Platz
  function aufraeumen() {
    const A = S.A;
    A.verursacher.forEach(v => {
      const r = S.raeume[v.ri], alt = v.d;
      alt.wegT = S.zeit;
      const anderes = r.geraete.find(x => x !== alt);
      const kand = RAEUME[r.typ].gis.filter(gi => gi !== anderes.gi && gi !== alt.gi);
      const gi = kand.length ? wahl(kand) : alt.gi;
      const neuD = neuesGeraet(gi, alt.platz);
      neuD.neuT = S.zeit + 0.35;
      // muss ein Verursacher möglich bleiben
      if (!nutzbar(gi).length && !nutzbar(anderes.gi).length) neuD.gi = alt.gi;
      geraetLaden(neuD); vorladenDefekt(neuD);
      r.weg = alt; r.geraete[r.geraete.indexOf(alt)] = neuD;
    });
    S.A = null;
    S.fokus = null; S.fokusManuell = false; kameraZiel();
    S.nr++;
    if (S.nr >= ANZAHL) { S.nr = ANZAHL - 1; R_.ton('geschafft'); return beenden(false); }
    S.phase = 'pause'; S.phaseT = 0; S.pause = zufall(1.2, 2.0);
    anzeigen();
  }
  function figur(pose, dauer, hupf) { S.figur.pose = pose; S.figur.bis = S.zeit + dauer; if (hupf) S.figur.hupf = S.zeit; }

  function bewertung(p) {
    if (p >= 900) return ['Strom sofort zurück', 'GEPRÜFT', 'gut', 'jubel'];
    if (p >= 800) return ['Schnell wieder am Netz', 'GEPRÜFT', 'gut', 'jubel'];
    if (p >= 700) return ['Gut entstört', 'GEPRÜFT', 'gut', 'daumen'];
    if (p >= 550) return ['Mit Verzögerung', 'MIT MÄNGELN', 'mittel', 'daumen'];
    return ['Lange im Dunkeln', 'MÄNGEL', 'schlecht', 'entsetzt'];
  }
  function beenden(abbruch) {
    S.fertig = true; S.phase = 'fertig';
    if (abbruch) { R_.ton('abbruch'); return endbild(0, true); }
    const p = Math.max(1, Math.min(1000, Math.round(S.punkte)));
    if (p >= 800) figur('jubel', 3, true);
    endbild(p, false);
  }
  function endbild(punkte, abbruch) {
    const [titel, stempel, art, pose] = abbruch ? ['Zu langer Stromausfall', 'MÄNGEL', 'schlecht', 'entsetzt'] : bewertung(punkte);
    const felder = [[abbruch ? 'Behoben' : 'Ausfälle behoben', S.behoben + ' von ' + ANZAHL]];
    felder.push(['Zu früh eingeschaltet', String(S.zuFrueh)]);
    if (S.zeiten.length) felder.push(['Ø Zeit', sek(S.zeiten.reduce((a, b) => a + b, 0) / S.zeiten.length)]);
    R_.ende(punkte, { ueberschrift: titel, felder, stempel: { text: stempel, art }, figur: POSEN[pose], verzoegerung: abbruch ? 900 : 1100 });
  }
  function testEnde() {
    S.fertig = true;
    if (TEST.ende === 'verloren') { S.behoben = 6; S.zuFrueh = 2; S.zeiten = [3.9, 5.2, 4.1, 6.0, 3.3, 4.8]; return endbild(0, true); }
    const p = Math.max(1, Math.min(1000, +TEST.ende));
    S.behoben = p >= 800 ? 15 : p >= 550 ? 14 : 13;
    S.zuFrueh = p >= 900 ? 0 : p >= 700 ? 1 : 3;
    S.zeiten = [p >= 900 ? 2.6 : p >= 800 ? 3.4 : p >= 550 ? 5.1 : 6.8];
    endbild(p, false);
  }

  // ---------- Kamera ----------
  function welt() { return GEB[S.geb]; }
  function platzRect(ri) { const p = welt().plaetze[S.raeume[ri].platz]; return [p[0], p[1], p[2] - p[0], p[3] - p[1]]; }
  function kameraZiel(sofort) {
    if (!L || !S) return;
    const st = L.stage;
    let r, rand;
    if (S.fokus == null) { const f = welt().rahmen; r = [f[0], f[1], f[2] - f[0], f[3] - f[1]]; rand = [1.02, 1.02]; }
    else { r = platzRect(S.fokus); rand = L.hochF ? [0.8, 1.25] : [1.1, 1.22]; }   // hoch: Raum seitlich etwas beschnitten, Geräte größer
    const z = Math.min(st.w / (r[2] * rand[0]), st.h / (r[3] * rand[1]));
    S.kamZiel = { x: r[0] + r[2] / 2, y: r[1] + r[3] / 2, z };
    if (sofort || !S.kam || ruhig()) S.kam = Object.assign({}, S.kamZiel);
  }
  function kameraSchritt(dt) {
    const k = S.kam, z = S.kamZiel;
    if (!k || !z) return;
    const f = 1 - Math.exp(-dt * 7);
    k.x += (z.x - k.x) * f; k.y += (z.y - k.y) * f;
    k.z = Math.exp(Math.log(k.z) + (Math.log(z.z) - Math.log(k.z)) * f);
  }
  const zuSchirm = (wx, wy) => { const k = S.kam, st = L.stage; return [st.x + st.w / 2 + (wx - k.x) * k.z, st.y + st.h / 2 + (wy - k.y) * k.z]; };
  const zuWelt = (sx, sy) => { const k = S.kam, st = L.stage; return [(sx - st.x - st.w / 2) / k.z + k.x, (sy - st.y - st.h / 2) / k.z + k.y]; };

  // Raum-Kachel im Platz: wie object-fit: cover, Tisch im unteren Drittel sichtbar
  function raumAbb(ri) {
    const r = S.raeume[ri], typ = RAEUME[r.typ], img = bilder['raum-' + typ.id];
    const [px, py, pw, ph] = platzRect(ri);
    const x = px - 4, y = py - 4, w = pw + 8, h = ph + 8;
    const tw = img ? img.naturalWidth : KACHEL, th = img ? img.naturalHeight : KACHEL;
    const k = Math.max(w / tw, h / th);
    const cw = w / k, ch = h / k;
    const cx = (tw - cw) / 2, cy = klemm(typ.fuss - 0.62 * ch, 0, th - ch);
    return { x, y, w, h, k, cx, cy, img, typ };
  }
  // Gerät in Welt-Koordinaten: steht mit der Standlinie (Unterkante Gehäuse) auf der Tischplatte (60 % der Tiefe),
  // Kabel und Stecker liegen davor bzw. hängen über die Kante. Größe passend zur Tischtiefe: bei flachen Tischen
  // (Büro, Werkstatt, Empfang) kleiner, aber nie unter 75 % (Tippfläche am Handy)
  function geraetAbb(ri, d, abb) {
    abb = abb || raumAbb(ri);
    const m = MASSE[schluessel(d)] || MASSE[schluessel({ gi: d.gi, spalte: 0 })];
    const st = STANDLINIE[schluessel(d)] || [1, 0.15, 0.85];
    const [hinten, vorne] = abb.typ.tiefe;
    const f = klemm((vorne - hinten) / 45, 0.75, 1);
    const a = m[0] / m[1];
    let hT = Math.sqrt(GERAET_F * GERAET_F / a);
    hT = Math.min(hT, GERAET_H, 150 / a) * f;
    const wT = hT * a;
    const tx = abb.typ.tisch[0] + (abb.typ.tisch[1] - abb.typ.tisch[0]) * POS[d.platz];
    const w = wT * abb.k, h = hT * abb.k;
    const standT = hinten + (vorne - hinten) * 0.6;
    const fx = abb.x + (tx - abb.cx) * abb.k, fy = abb.y + (standT - abb.cy) * abb.k;
    const x = fx - w / 2;
    return { x, y: fy - h * st[0], w, h, fx, fy, auf0: x + w * st[1], auf1: x + w * st[2] };
  }
  function geraetSchirm(ri, d) {
    const m = geraetAbb(ri, d), [x0, y0] = zuSchirm(m.x, m.y), [x1, y1] = zuSchirm(m.x + m.w, m.y + m.h);
    return [x0, y0, x1 - x0, y1 - y0];
  }

  // ---------- Effekte ----------
  function funkenAmGeraet(ri, d, n, staerke) {
    const m = geraetAbb(ri, d), o = GERAETE[d.gi].maengel[d.mangel != null ? d.mangel : 0].ort;
    const wx = m.x + o[0] * m.w, wy = m.y + o[1] * m.h;
    S.funken.push({ welt: true, x: wx, y: wy, t0: S.zeit, staerke, teile: funkenTeile(n) });
  }
  // leichter Rauch am defekten Gerät (Raum dunkel): ein paar graue Wölkchen steigen ca. 1,6s auf
  function rauchAmGeraet(ri, d) {
    if (ruhig()) return;
    const m = geraetAbb(ri, d), o = GERAETE[d.gi].maengel[d.mangel != null ? d.mangel : 0].ort;
    S.rauch = (S.rauch || []).concat([0, 0.25, 0.5].map(v => ({ ri, x: m.x + o[0] * m.w + zufall(-4, 4), y: m.y + o[1] * m.h, t0: S.zeit + v, dx: zufall(-8, 8), r: zufall(5, 8) })));
  }
  function rauchZeichnen(g) {
    if (!S.rauch || !S.rauch.length) return;
    S.rauch = S.rauch.filter(q => S.zeit - q.t0 < 1.6);
    const st = L.stage;
    g.save(); g.beginPath(); g.rect(st.x, st.y, st.w, st.h); g.clip();
    S.rauch.forEach(q => {
      const p = (S.zeit - q.t0) / 1.6;
      if (p < 0) return;
      const [x, y] = zuSchirm(q.x + q.dx * p, q.y - 34 * p), r = q.r * (1 + 1.8 * p) * Math.max(0.6, S.kam ? S.kam.z : 1);
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, `rgba(190,190,195,${0.38 * (1 - p)})`); rg.addColorStop(1, 'rgba(190,190,195,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    });
    g.restore();
  }
  function funkenSchalter(sch) {
    const i = sch === S.fi ? -1 : S.schalter.indexOf(sch);
    const r = i < 0 ? L.fi.mod : L.schalter[i].mod;
    S.funken.push({ welt: false, x: r[0] + r[2] * 0.75, y: r[1] + r[3] * 0.5, t0: S.zeit, staerke: 0.9, teile: funkenTeile(18) });
  }
  function funkenTeile(n) {
    const l = [];
    if (ruhig()) return l;
    for (let i = 0; i < n; i++) { const w = zufall(0, Math.PI * 2), sp = zufall(70, 260); l.push({ dx: 0, dy: 0, vx: Math.cos(w) * sp, vy: Math.sin(w) * sp - 70, dauer: zufall(0.22, 0.55) }); }
    return l;
  }
  function blitzAusloesen() {
    const st = L.stage;
    const x = zufall(B * 0.1, B * 0.9), y1 = Math.min(H * 0.85, st.y + st.h * zufall(0.55, 0.85));
    S.blitz = { t0: S.zeit, pfad: blitzPfad(x, -10, y1), ast: blitzPfad(x + zufall(-40, 40), y1 * 0.35, y1 * 0.7) };
    R_.ton('blitz');
  }
  function blitzPfad(x, y0, y1) {
    const pts = [[x, y0]], n = 12;
    for (let i = 1; i <= n; i++) { x += zufall(-0.03, 0.03) * B; pts.push([x, y0 + (y1 - y0) * i / n]); }
    return pts;
  }
  function schild(ri, d, text, art, dauer, zusatz) {
    S.schilder = S.schilder.filter(s => s.d !== d);
    S.schilder.push({ ri, d, text, art, t0: S.zeit, dauer: dauer || 1, zusatz });
  }

  // ---------- Eingabe ----------
  const drin = (x, y, r, p) => x >= r[0] - p && x <= r[0] + r[2] + p && y >= r[1] - p && y <= r[1] + r[3] + p;
  function runter(x, y) {
    if (!L || !S || S.fertig) return;
    S.klicks.push({ x, y, t0: S.zeit });
    // offener FI-Hinweis: Tippen schließt ihn (zählt nicht als Spielzug)
    if (S.fiHinweis && !S.fiHinweis.zu) { S.fiHinweis.zu = S.zeit; return; }
    // Verteiler
    if (drin(x, y, L.fi.fach, 2)) return fiTippen();
    for (let i = 0; i < L.schalter.length; i++) if (drin(x, y, L.schalter[i].fach, 2)) return schalterTippen(i);
    if (S.phase !== 'ausfall') return;
    const st = L.stage;
    if (!drin(x, y, [st.x, st.y, st.w, st.h], 0)) return;
    // Geräte im Raum, auf den die Kamera zeigt (Trefferfläche mindestens 48 px)
    if (S.fokus != null) {
      const r = S.raeume[S.fokus];
      for (const d of r.geraete) {
        const [gx, gy, gw, gh] = geraetSchirm(S.fokus, d);
        const pw = Math.max(0, (48 - gw) / 2), ph = Math.max(0, (48 - gh) / 2);
        if (drin(x, y, [gx, gy, gw, gh], Math.max(4, Math.max(pw, ph)))) return geraetTippen(S.fokus, d);
      }
    }
    // Raum antippen = hineinsehen; Fassade/Himmel = Übersicht
    const [wx, wy] = zuWelt(x, y);
    const ri = S.raeume.findIndex((r, i) => { const p = platzRect(i); return wx >= p[0] && wx <= p[0] + p[2] && wy >= p[1] && wy <= p[1] + p[3]; });
    if (ri >= 0 && ri !== S.fokus) { S.fokus = ri; S.fokusManuell = true; kameraZiel(); }
    else if (ri < 0 && S.fokus != null) { S.fokus = null; S.fokusManuell = true; kameraZiel(); }
  }
  function bewegen() {}
  function hoch() {}

  // ---------- Zeichnen ----------
  function zeichne(g, b, h, zustand, dt) {
    if (b !== B || h !== H || !L) groesse(b, h);
    if (!S) neu();
    const ruh = ruhig();
    if (zustand !== 'spiel') S.zeit += dt;
    S.dtZ = dt;
    kameraSchritt(dt);
    const t = S.zeit;
    g.fillStyle = '#070b16'; g.fillRect(0, 0, B, H);
    himmelZeichnen(g, t, ruh);
    gebaeudeZeichnen(g, t, ruh, zustand);
    funkenZeichnen(g);
    verteilerZeichnen(g, t, ruh, zustand);
    figurZeichnen(g, zustand, ruh);
    if (zustand === 'spiel') {
      schilderZeichnen(g, t, ruh);
      hudZeichnen(g, t, ruh);
      fiHinweisZeichnen(g, t, ruh);
      klicksZeichnen(g);
    }
    blitzLicht(g, t, ruh);
    g.canvas.style.cursor = zustand === 'spiel' ? 'pointer' : '';
  }

  // Nachthimmel (eigener Himmel dieses Spiels): Grundbild unten bündig, zwei Wolkenschichten ziehen nach links
  // (hinten 7 %, vorn 12 % der Bildbreite pro Minute), Wolken leuchten alle 2–5s von innen auf (manchmal doppelt).
  const SCHICHTEN = [{ tempo: 0.07, groesse: 1.0, deckkraft: 0.42, start: 0.3 }, { tempo: 0.12, groesse: 1.25, deckkraft: 0.5, start: 1.1 }];
  function wolkenEbene(img) {
    const f = 0.5, w = Math.round(img.naturalWidth * f), h = Math.round(HIMMEL.horizont * f);
    const c = document.createElement('canvas'); c.width = 2 * w; c.height = h;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, img.naturalWidth, HIMMEL.horizont, 0, 0, w, h);
    x.save(); x.translate(2 * w, 0); x.scale(-1, 1); x.drawImage(img, 0, 0, img.naturalWidth, HIMMEL.horizont, 0, 0, w, h); x.restore();
    x.globalCompositeOperation = 'destination-in';
    const v = x.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, '#000'); v.addColorStop(HIMMEL.wolkenBis * 0.85 / HIMMEL.horizont, '#000'); v.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = v; x.fillRect(0, 0, c.width, h);
    return c;
  }
  function himmelZeichnen(g, t, ruh) {
    const img = bilder.himmel;
    if (!img) return;
    const s = Math.max(B / HIMMEL.b, H / HIMMEL.h) * 1.04;
    const w = HIMMEL.b * s, h = HIMMEL.h * s, x0 = (B - w) / 2, y0 = H - h;
    g.drawImage(img, x0, y0, w, h);
    if (wolken && !ruh) {
      SCHICHTEN.forEach((sch, i) => {
        const ww = w * sch.groesse * (i ? 1 + 0.015 * Math.sin(t * 2 * Math.PI / 19) : 1);
        const hh = HIMMEL.horizont * s * sch.groesse * (i ? 1 + 0.02 * Math.sin(t * 2 * Math.PI / 13 + 1) : 1);
        const weg = ((sch.start + t * sch.tempo / 60) % 2) * ww;
        g.globalAlpha = sch.deckkraft;
        for (let k = -1; k <= 1; k++) g.drawImage(wolken, x0 - weg + k * 2 * ww, y0 - (hh - HIMMEL.horizont * s) * 0.5, 2 * ww, hh);
      });
      g.globalAlpha = 1;
      // Wolken leuchten von innen auf
      if (!S.glimmen && t >= S.glimmenUm) {
        S.glimmenUm = t + zufall(2, 5);
        S.glimmen = { t0: t, x: zufall(0.05, 0.95) * B, y: zufall(0.08, 0.5) * H, r: zufall(0.18, 0.32) * Math.max(B, H), doppelt: Math.random() < 0.45, a: zufall(0.18, 0.3) };
      }
      if (S.glimmen) {
        const G = S.glimmen, p = t - G.t0;
        if (p > 1.1) S.glimmen = null;
        else {
          const a = G.a * Math.max(Math.exp(-p * 7) * Math.min(1, p / 0.04), G.doppelt && p > 0.25 ? Math.exp(-(p - 0.25) * 6) * 0.8 : 0);
          leuchten(g, G.x, G.y, G.r, a);
        }
      }
    }
    // Blitz am Himmel (beim Ausfall manchmal): Leuchten in der Wolke + verzweigter Blitz
    const Bl = S.blitz;
    if (Bl) {
      const p = t - Bl.t0;
      if (p > 0.9) S.blitz = null;
      else {
        leuchten(g, Bl.pfad[0][0], H * 0.15, Math.max(B, H) * 0.45, 0.45 * Math.exp(-p * 4));
        if (!ruh && (p < 0.08 || (p > 0.13 && p < 0.22) || (p > 0.3 && p < 0.36))) {
          g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.lineCap = 'round';
          [[7, 'rgba(150,170,255,.25)'], [2.6, 'rgba(235,240,255,.95)']].forEach(([lw, fa]) => {
            g.lineWidth = lw; g.strokeStyle = fa;
            [Bl.pfad, Bl.ast].forEach(pf => { g.beginPath(); pf.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke(); });
          });
          g.restore();
        }
      }
    }
  }
  function leuchten(g, x, y, r, a) {
    if (a <= 0.003) return;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(200,212,255,${a})`); rg.addColorStop(0.5, `rgba(150,170,240,${a * 0.35})`); rg.addColorStop(1, 'rgba(120,140,220,0)');
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore();
  }
  // heller Bildschirm-Blitz (Aufflackern) über allem
  function blitzLicht(g, t, ruh) {
    const Bl = S.blitz;
    if (!Bl) return;
    const p = t - Bl.t0;
    const a = ruh ? 0.18 * Math.max(0, 1 - p / 0.4) : (p < 0.07 ? 0.5 : p < 0.13 ? 0.08 : p < 0.2 ? 0.32 : Math.max(0, 0.3 - (p - 0.2) * 1.2));
    if (a <= 0) return;
    g.fillStyle = `rgba(220,228,255,${a})`; g.fillRect(0, 0, B, H);
  }

  function gebaeudeZeichnen(g, t, ruh, zustand) {
    const st = L.stage, k = S.kam, G = welt(), img = gebNacht[S.geb];
    g.save();
    g.beginPath(); g.rect(st.x, st.y, st.w, st.h); g.clip();
    g.translate(st.x + st.w / 2 - k.x * k.z, st.y + st.h / 2 - k.y * k.z); g.scale(k.z, k.z);
    // Räume hinter der Fassade
    S.raeume.forEach((r, ri) => raumZeichnen(g, r, ri, t, ruh, zustand));
    if (img) g.drawImage(img, 0, 0);
    // Blitz erhellt kurz die Fassade
    const Bl = S.blitz, tag = bilder['geb-' + S.geb];
    if (Bl && tag) {
      const p = t - Bl.t0, a = p < 0.07 ? 0.55 : p < 0.13 ? 0.1 : p < 0.22 ? 0.35 : Math.max(0, 0.35 - (p - 0.22) * 1.0);
      if (a > 0) { g.globalAlpha = a; g.drawImage(tag, 0, 0); g.globalAlpha = 1; }
    }
    // Treppenhaus beim FI dunkel
    if (S.treppeDunkel) { const tr = G.treppe; g.fillStyle = 'rgba(3,6,18,.74)'; g.fillRect(tr[0], tr[1], tr[2] - tr[0], tr[3] - tr[1]); }
    g.restore();
    // Raumnamen, Markierungen (Bildschirm-Koordinaten, nicht mitskaliert)
    g.save();
    g.beginPath(); g.rect(st.x, st.y, st.w, st.h); g.clip();
    S.raeume.forEach((r, ri) => raumNameZeichnen(g, r, ri));
    if (zustand === 'spiel') markierungen(g, t, ruh);
    g.restore();
  }
  function raumZeichnen(g, r, ri, t, ruh, zustand) {
    const a = raumAbb(ri);
    if (!a.img) { g.fillStyle = '#20242c'; g.fillRect(a.x, a.y, a.w, a.h); return; }
    g.save();
    g.beginPath(); g.rect(a.x, a.y, a.w, a.h); g.clip();
    g.drawImage(a.img, a.cx, a.cy, a.w / a.k, a.h / a.k, a.x, a.y, a.w, a.h);
    // Geräte (auch das abgeholte, das gerade ausblendet)
    if (r.weg && r.weg.wegT != null && t - r.weg.wegT < 0.4) geraetZeichnen(g, ri, r.weg, a, t, ruh);
    r.geraete.forEach(d => geraetZeichnen(g, ri, d, a, t, ruh));
    // Licht: dunkel = Nacht (Tisch etwas heller, damit Geräte erkennbar bleiben); Flackern beim Wechsel
    const p = t - r.wechselT;
    let dunkel = r.licht ? 0 : 1;
    if (p >= 0 && p < 0.4 && !ruh) {
      const an = r.licht;
      const fl = p < 0.06 ? 1 : p < 0.12 ? 0.25 : p < 0.2 ? 0.85 : p < 0.26 ? 0.35 : 1;
      dunkel = an ? (1 - fl) : fl;
    } else if (p >= 0 && p < 0.5 && ruh) dunkel = r.licht ? 1 - p / 0.5 : p / 0.5;   // Bewegung reduzieren: sanft abdunkeln
    else if (p < 0) dunkel = r.licht ? 1 : 0;   // vor dem Wechsel: alter Zustand
    if (dunkel > 0) {
      const mx = a.x + a.w / 2, my = a.y + (a.typ.fuss - a.cy) * a.k - a.h * 0.12;
      const rg = g.createRadialGradient(mx, my, 0, mx, my, a.w * 0.62);
      rg.addColorStop(0, `rgba(4,8,22,${0.5 * dunkel})`); rg.addColorStop(1, `rgba(3,6,18,${0.82 * dunkel})`);
      g.fillStyle = rg; g.fillRect(a.x, a.y, a.w, a.h);
    }
    // defektes Gerät im Dunkeln: dauerhaft schwaches, ruhiges Glimmen (Warnschimmer), zusätzlich zu den Funken (MZ, 24.10.2026)
    const A = S.A;
    if (A && A.laeuft && S.phase === 'ausfall' && dunkel > 0.5) A.verursacher.forEach(v => {
      if (v.ri !== ri || !v.d.steckt) return;
      const m = geraetAbb(ri, v.d, a), o = GERAETE[v.d.gi].maengel[v.d.mangel != null ? v.d.mangel : 0].ort;
      const gx = m.x + o[0] * m.w, gy = m.y + o[1] * m.h, rr = Math.max(14, Math.max(m.w, m.h) * 0.42);
      const al = (ruh ? 0.32 : 0.3 + 0.07 * Math.sin(t * 2 * Math.PI / 3.2)) * Math.min(1, (dunkel - 0.5) * 2);
      const gl = g.createRadialGradient(gx, gy, 0, gx, gy, rr);
      gl.addColorStop(0, `rgba(255,150,60,${al})`); gl.addColorStop(0.45, `rgba(255,110,40,${al * 0.45})`); gl.addColorStop(1, 'rgba(255,90,30,0)');
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.fillRect(gx - rr, gy - rr, 2 * rr, 2 * rr); g.restore();
    });
    g.restore();
  }
  function geraetZeichnen(g, ri, d, a, t, ruh) {
    const img = bilder[schluessel(d)];
    if (!img) return;
    const m = geraetAbb(ri, d, a);
    let alpha = 1, dy = 0;
    if (d.neuT != null && t < d.neuT + 0.4) alpha = t < d.neuT ? 0 : glatt((t - d.neuT) / 0.4);
    if (d.wegT != null) alpha = 1 - glatt((t - d.wegT) / 0.4);
    if (alpha <= 0) return;
    if (d.sperrT != null && !ruh) { const p = t - d.sperrT; if (p < 0.25) dy = -Math.sin(p / 0.25 * Math.PI) * m.h * 0.06; }
    g.save(); g.globalAlpha = alpha;
    // Schatten an der Standfläche: weicher Schatten dezent, dazu ein schmaler, dunkler Kontaktschatten genau an der Auflage
    const acx = (m.auf0 + m.auf1) / 2, arw = Math.max(2, (m.auf1 - m.auf0) / 2);
    g.save(); g.translate(acx, m.fy); g.scale(1, 0.16);
    let rg = g.createRadialGradient(0, 0, 0, 0, 0, arw * 1.3);
    rg.addColorStop(0, 'rgba(0,0,0,.26)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(-arw * 1.3, -arw * 1.3, arw * 2.6, arw * 2.6); g.restore();
    g.save(); g.translate(acx, m.fy); g.scale(1, 0.05);
    rg = g.createRadialGradient(0, 0, 0, 0, 0, arw * 1.02);
    rg.addColorStop(0, 'rgba(0,0,0,.62)'); rg.addColorStop(0.7, 'rgba(0,0,0,.44)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(-arw * 1.05, -arw * 1.05, arw * 2.1, arw * 2.1); g.restore();
    g.drawImage(img, m.x, m.y + dy, m.w, m.h);
    if (d.sperrT != null) anhaengerZeichnen(g, d, m, t - d.sperrT, ruh, dy);
    g.restore();
  }
  // Sperr-Anhänger „GESPERRT“ wie bei Prüfplakette (Kabelbinder, pendelt aus)
  function anhaengerZeichnen(g, d, m, p, ruh, dy) {
    const [ax, ay] = GERAETE[d.gi].anhaenger;
    const x = m.x + ax * m.w, y = m.y + ay * m.h + dy;
    const tw = klemm(m.w * 0.42, 22, 60), th = tw * 0.46, schnur = tw * 0.3;
    const q = ruh ? 1 : glatt(p / 0.2);
    const winkel = ruh ? 0.08 : 0.08 + 0.45 * Math.exp(-p * 4.5) * Math.sin(p * 13);
    g.save();
    g.globalAlpha *= ruh ? Math.min(1, p / 0.15) : Math.min(1, q * 1.5);
    g.translate(x, y - (1 - q) * tw * 0.4);
    g.lineWidth = Math.max(1, tw * 0.05); g.strokeStyle = '#f2f2ee';
    g.beginPath(); g.ellipse(0, 0, tw * 0.09, tw * 0.06, 0.2, 0, Math.PI * 2); g.stroke();
    g.rotate(winkel);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, schnur); g.stroke();
    g.translate(0, schnur);
    g.fillStyle = '#d3241c';
    g.beginPath();
    g.moveTo(-tw * 0.32, 0); g.lineTo(tw * 0.32, 0); g.lineTo(tw / 2, th * 0.3); g.lineTo(tw / 2, th); g.lineTo(-tw / 2, th); g.lineTo(-tw / 2, th * 0.3); g.closePath();
    g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0, th * 0.17, tw * 0.035, 0, Math.PI * 2); g.fill();
    g.font = '800 ' + (tw * 0.15).toFixed(1) + 'px ' + SCHRIFT; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('GESPERRT', 0, th * 0.64);
    g.restore();
  }
  function raumNameZeichnen(g, r, ri) {
    const p = platzRect(ri);
    const [x, y] = zuSchirm(p[0], p[1]), [x2] = zuSchirm(p[0] + p[2], p[1]);
    const w = x2 - x;
    // Raum im Blick: Name groß und bleibt sichtbar, auch wenn der Raum seitlich beschnitten ist (MZ, 24.10.2026)
    const fest = ri === S.fokus;
    const fs = fest ? klemm(w * 0.075, 14, 22) : klemm(w * 0.065, 9, 15);
    const name = RAEUME[r.typ].name;
    g.font = (fest ? '700 ' : '600 ') + fs.toFixed(1) + 'px ' + SCHRIFT;
    const tw = g.measureText(name).width;
    const bx = (fest ? Math.max(x, L.stage.x) : x) + fs * 0.5, by = (fest ? Math.max(y, L.stage.y) : y) + fs * 0.45;
    // andere Räume: Name nur, wenn er ganz im Bild liegt (sonst halbe Schilder am Rand bzw. Überlappung mit dem festen Namen)
    if (!fest && (bx < L.stage.x + 2 || by < L.stage.y + 2 || bx + tw + fs * 0.9 > L.stage.x + L.stage.w - 2)) return;
    if (!fest && S.fokus != null) {
      const fp = platzRect(S.fokus), [fx, fy] = zuSchirm(fp[0], fp[1]);
      const fbx = Math.max(fx, L.stage.x) + fs * 0.5, fby = Math.max(fy, L.stage.y) + fs * 0.45;
      if (Math.abs(fby - by) < fs * 1.6 && Math.abs(fbx - bx) < tw + fs * 6) return;
    }
    g.fillStyle = r.licht ? 'rgba(25,25,25,.55)' : 'rgba(0,0,0,.6)';
    rund(g, bx, by, tw + fs * 0.9, fs * 1.45, fs * 0.35); g.fill();
    g.fillStyle = r.licht ? '#fff' : 'rgba(255,255,255,.75)'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillText(name, bx + fs * 0.45, by + fs * 0.75);
  }
  // FI-Hinweis: Schild im Stil der Mangel-Schilder (weiß, Akzentlinie in Kundenfarbe), mittig über dem Gebäude
  function fiHinweisZeichnen(g, t, ruh) {
    const h = S.fiHinweis;
    if (!h) return;
    const p = t - h.t0, q = h.zu != null ? t - h.zu : -1;
    if (q > 0.25) { S.fiHinweis = null; return; }
    const a = Math.min(1, p / 0.2) * (q >= 0 ? 1 - q / 0.25 : 1);
    const st = L.stage, fs = L.kurz < 420 ? 14 : 16;
    const w = Math.min(st.w - 16, B - 24, 440), pad = fs * 0.9;
    g.save();
    g.font = '700 ' + fs + 'px ' + SCHRIFT;
    // Zeilen umbrechen
    const zeilen = [];
    let z = '';
    FI_HINWEIS.split(' ').forEach(wort => { const v = z ? z + ' ' + wort : wort; if (g.measureText(v).width > w - 2 * pad && z) { zeilen.push(z); z = wort; } else z = v; });
    if (z) zeilen.push(z);
    const lh = fs * 1.32, hh = pad * 2 + zeilen.length * lh + 8 + (h.zu == null ? fs * 0.9 : 0);
    const x = klemm(st.x + st.w / 2 - w / 2, 12, B - w - 12);
    const y = st.y + (L.hochF ? 8 : Math.max(8, (st.h - hh) * 0.3)) + (ruh ? 0 : 8 * (1 - Math.min(1, p / 0.2)));
    g.globalAlpha = a;
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 16; g.shadowOffsetY = 4;
    g.fillStyle = '#fff'; rund(g, x, y, w, hh, 8); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = (R_.farben && R_.farben.haupt) || '#FFD500'; g.fillRect(x + 8, y + 4, w - 16, 4);
    g.fillStyle = '#191919'; g.textAlign = 'left'; g.textBaseline = 'middle';
    zeilen.forEach((zz, i) => g.fillText(zz, x + pad, y + 8 + pad + lh * (i + 0.5)));
    // Restzeit des Hinweises als feine Linie unten
    if (h.zu == null) { g.fillStyle = '#7a7a7a'; g.font = '600 ' + (fs - 3) + 'px ' + SCHRIFT; g.textAlign = 'right'; g.fillText('Tippen zum Schließen', x + w - pad, y + hh - pad * 0.6); }
    g.restore();
  }
  // Panne: Verursacher markiert; #loesung: Verursacher dauernd markiert
  function markierungen(g, t, ruh) {
    const A = S.A;
    if (!A) return;
    const zeigen = A.panne || TEST.loesung;
    if (!zeigen) return;
    A.verursacher.forEach(v => {
      if (v.d.wegT != null) return;
      const [x, y, w, h] = geraetSchirm(v.ri, v.d);
      const r = Math.max(w, h) * 0.62 + 6, puls = ruh ? 0 : Math.sin(t * 8) * 0.06;
      g.save(); g.strokeStyle = A.panne ? '#ff3b30' : '#00e5ff'; g.lineWidth = 3; if (!A.panne) g.setLineDash([6, 4]);
      g.beginPath(); g.arc(x + w / 2, y + h / 2, r * (1 + puls), 0, Math.PI * 2); g.stroke(); g.restore();
    });
  }

  function funkenZeichnen(g) {
    rauchZeichnen(g);
    const dt = S.dtZ || 1 / 60;
    S.funken = S.funken.filter(f => S.zeit - f.t0 < 0.7);
    if (!S.funken.length) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    const st = L.stage;
    S.funken.forEach(f => {
      const [x, y] = f.welt ? zuSchirm(f.x, f.y) : [f.x, f.y];
      if (f.welt) { g.save(); g.beginPath(); g.rect(st.x, st.y, st.w, st.h); g.clip(); }
      const p = S.zeit - f.t0;
      // Lichtblitz
      if (p < 0.35) {
        const a = f.staerke * (p < 0.05 ? 1 : p < 0.1 ? 0.35 : Math.max(0, 0.8 - (p - 0.1) * 3));
        const r = 26 * Math.max(0.7, f.staerke);
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, `rgba(255,255,255,${a})`); rg.addColorStop(0.3, `rgba(255,220,140,${0.6 * a})`); rg.addColorStop(1, 'rgba(255,170,60,0)');
        g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
      f.teile.forEach(s => {
        if (p > s.dauer) return;
        const a = 1 - p / s.dauer;
        s.vy += 700 * dt; s.dx += s.vx * dt; s.dy += s.vy * dt;
        g.strokeStyle = `rgba(255,${Math.round(200 + 55 * a)},${Math.round(120 * a)},${a})`; g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(x + s.dx, y + s.dy); g.lineTo(x + s.dx - s.vx * 0.022, y + s.dy - s.vy * 0.022); g.stroke();
      });
      if (f.welt) g.restore();
    });
    g.restore();
  }

  // ---------- Verteiler ----------
  function verteilerZeichnen(g, t, ruh, zustand) {
    const vt = L.vt, s = vt.s, img = bilder.verteiler;
    const w = VT.b * s, h = VT.h * s;
    // Gehäuse
    const pad = Math.max(5, 9 * s);
    g.save();
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
    g.fillStyle = '#8d9296'; rund(g, vt.x - pad, vt.y - pad, w + 2 * pad, h + 2 * pad, pad * 0.8); g.fill();
    g.shadowColor = 'transparent';
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.stroke();
    if (img) g.drawImage(img, vt.x, vt.y, w, h);
    // Fugen zwischen den Abdeckstreifen
    g.fillStyle = 'rgba(0,0,0,.28)';
    for (let r = 1; r < 3; r++) g.fillRect(vt.x, vt.y + r * VT.scheibe * s - 1, w, 2);
    // Blindabdeckungen auf allen freien TE
    const belegt = new Set(['0-0', '0-1', '0-2', '0-3']);
    FAECHER.forEach(([r, te]) => belegt.add(r + '-' + te));
    const blind = schalterBild.blind;
    if (blind) for (let r = 0; r < 3; r++) for (let te = 0; te < 12; te++) if (!belegt.has(r + '-' + te)) g.drawImage(blind, vt.x + (TE_X0 + te * TE) * s, vt.y + (r * VT.scheibe + MOD_Y) * s, TE * s, MOD_H * s);
    // FI
    modulZeichnen(g, S.fi, L.fi.mod, true, t, ruh);
    // LS
    S.schalter.forEach((sch, i) => modulZeichnen(g, sch, L.schalter[i].mod, false, t, ruh));
    // Beschriftung auf den Streifen
    const fs = klemm((VT.streifen[3] - VT.streifen[1]) * s * 0.58, 9, 18);
    beschriften(g, 'FI-Schalter', L.fi.mod[0] + L.fi.mod[2] / 2, vt.y + (VT.streifen[1] + VT.streifen[3]) / 2 * s, L.fi.fach[2] - 6, fs);
    S.schalter.forEach((sch, i) => {
      const m = L.schalter[i].mod, f = L.schalter[i].fach;
      const cx = klemm(m[0] + m[2] / 2, f[0] + f[2] / 2 - f[2] * 0.25, f[0] + f[2] / 2 + f[2] * 0.25);
      beschriften(g, RAEUME[S.raeume[sch.raum].typ].name, cx, vt.y + (L.schalter[i].reihe * VT.scheibe + (VT.streifen[1] + VT.streifen[3]) / 2) * s, f[2] - 6, fs);
    });
    // Schalter-Hilfe: pulsierender Ring um den passenden Schalter, sobald alle Verursacher ausgesteckt sind
    const A = S.A;
    if (A && A.hilfe && zustand === 'spiel' && S.phase === 'ausfall' && !A.verursacher.some(v => v.d.steckt)) {
      if (A.hilfeT == null) A.hilfeT = S.zeit;
      const seit = S.zeit - A.hilfeT;
      const ziele = A.art === 'fi' ? (S.fi.ein ? [] : [L.fi.fach]) : A.raeume.filter(ri => !S.schalter[S.raeume[ri].schalter].ein).map(ri => L.schalter[S.raeume[ri].schalter].fach);
      if (seit < 4 && ziele.length) {
        const aus = Math.min(1, (4 - seit) / 0.5), p = ruh ? 0.6 : 0.5 + 0.5 * Math.sin(seit * 2 * Math.PI / 0.9);
        g.save(); g.globalAlpha = aus;
        ziele.forEach(f => {
          const cx = f[0] + f[2] / 2, cy = f[1] + f[3] / 2, rx = f[2] / 2 + 6 + 5 * p, ry = f[3] / 2 + 6 + 5 * p;
          g.shadowColor = 'rgba(255,213,0,.9)'; g.shadowBlur = 14 + 10 * p;
          g.strokeStyle = '#FFD500'; g.lineWidth = 3.5;
          rund(g, cx - rx, cy - ry, 2 * rx, 2 * ry, Math.min(rx, ry) * 0.5); g.stroke();
        });
        g.restore();
      }
    }
    // #loesung: richtigen Schalter markieren
    if (TEST.loesung && zustand === 'spiel' && S.A && S.phase === 'ausfall') {
      const ziele = S.A.art === 'fi' ? [L.fi.fach] : S.A.raeume.map(ri => L.schalter[S.raeume[ri].schalter].fach);
      g.save(); g.strokeStyle = '#00e5ff'; g.lineWidth = 2; g.setLineDash([6, 4]);
      ziele.forEach(f => g.strokeRect(f[0], f[1], f[2], f[3])); g.restore();
    }
    g.restore();
  }
  function modulZeichnen(g, sch, r, istFi, t, ruh) {
    const frueh = sch.frueh != null && t - sch.frueh < 0.14;   // kurz eingeschaltet, dann gleich wieder raus
    const ein = sch.ein || frueh;
    const ausgel = !ein && t - sch.ausgeloestT < 1.6;
    const name = istFi ? (ein ? 'fi-ein' : 'fi-aus') : (ein ? 'ls-ein' : ausgel ? 'ls-ausgeloest' : 'ls-aus');
    const img = schalterBild[name];
    if (!img) return;
    let [x, y, w, h] = r;
    if (!ruh) {
      const pw = t - sch.wackelT; if (pw < 0.22) x += Math.sin(pw * 60) * 2 * (1 - pw / 0.22);
      const pk = t - sch.klappT; if (pk < 0.16) { const k = 1 - 0.04 * Math.sin(pk / 0.16 * Math.PI); y += h * (1 - k) / 2; h *= k; }
    }
    g.drawImage(img, x, y, w, h);
    // aus: Hebel unten leicht hervorheben (dunkler Schein über der Front)
    if (!ein) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, y, w, h); }
  }
  function beschriften(g, text, cx, cy, maxW, fs) {
    let f = fs;
    g.font = '700 ' + f.toFixed(1) + 'px ' + SCHRIFT;
    while (g.measureText(text).width > maxW && f > 7) { f -= 0.5; g.font = '700 ' + f.toFixed(1) + 'px ' + SCHRIFT; }
    g.fillStyle = '#3a3a3a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, cx, cy + 0.5);
  }

  // ---------- Figur, Anzeige, Rückmeldungen ----------
  function figurZeichnen(g, zustand, ruh) {
    const f = S.figur, pose = (zustand === 'spiel' || zustand === 'ende') && S.zeit < f.bis ? f.pose : 'ruhe';
    const img = bilder[pose];
    if (!img) return;
    const h = L.figH * POSEN[pose].hoehe, w = h * img.naturalWidth / img.naturalHeight;
    let x = 8, y = L.figUnten - h;
    const seit = S.zeit - f.hupf;
    if (seit < 0.45 && !ruh) y -= Math.sin(seit / 0.45 * Math.PI) * h * 0.08;
    if (pose === 'entsetzt' && !ruh && S.zeit < f.bis) x += Math.sin(S.zeit * 60) * 2 * Math.max(0, Math.min(1, f.bis - S.zeit - 0.6));
    const spiegeln = POSEN[pose].blick === (x + w / 2 < B / 2 ? 'links' : 'rechts');   // Blick zur Bildmitte (MZ, 23.10.2026)
    g.save();
    g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
    if (spiegeln) { g.translate(x + w, y); g.scale(-1, 1); g.drawImage(img, 0, 0, w, h); }
    else g.drawImage(img, x, y, w, h);
    g.restore();
  }
  // Pannen (3 Glühbirnen) und Zeitbalken unter der Anzeige
  function hudZeichnen(g, t, ruh) {
    const y = 58, x = 12;
    g.save();
    g.font = '700 13px ' + SCHRIFT; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 4;
    g.fillStyle = '#fff'; g.fillText('Pannen', x, y);
    const x0 = x + g.measureText('Pannen').width + 14;
    g.shadowColor = 'transparent';
    for (let i = 0; i < PANNEN_MAX; i++) birne(g, x0 + i * 20, y, 7, i < S.pannen);
    // Zeitbalken
    const bx = x0 + PANNEN_MAX * 20 + 8, bw = Math.min(B - 12 - bx, L.hochF ? B : 420), bh = 8;
    const A = S.A;
    const rest = A ? Math.max(0, A.dauer - A.t) : 0, anteil = A ? rest / A.dauer : 0;
    const knapp = A && S.phase === 'ausfall' && rest <= 3;
    const puls = knapp && !ruh ? 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 0.3) : 0;
    g.globalAlpha = S.phase === 'ausfall' ? 1 : 0.45;
    g.fillStyle = 'rgba(0,0,0,.55)'; rund(g, bx - 2, y - bh / 2 - 2, bw + 4, bh + 4, (bh + 4) / 2); g.fill();
    if (A && anteil > 0) {
      const farbe = A.panne ? '#ff3b30' : knapp ? '#ffb300' : '#ffffff';
      if (puls) { g.shadowColor = farbe; g.shadowBlur = 4 + 8 * puls; }
      g.fillStyle = farbe; rund(g, bx, y - bh / 2, Math.max(bh, bw * anteil), bh, bh / 2); g.fill();
    }
    g.restore();
  }
  function birne(g, x, y, r, kaputt) {
    g.save(); g.translate(x, y);
    g.beginPath(); g.arc(0, -r * 0.25, r, Math.PI * 0.8, Math.PI * 2.2); g.lineTo(r * 0.42, r * 0.95); g.lineTo(-r * 0.42, r * 0.95); g.closePath();
    if (kaputt) { g.fillStyle = '#3a3a3a'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = '#ff3b30'; g.stroke(); }
    else { g.fillStyle = 'rgba(255,213,0,.95)'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke(); }
    g.fillStyle = kaputt ? '#ff3b30' : '#d9d9d9'; g.fillRect(-r * 0.42, r * 1.0, r * 0.84, r * 0.45);
    if (kaputt) { g.strokeStyle = '#ff3b30'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-r * 0.5, -r * 0.8); g.lineTo(r * 0.5, r * 0.3); g.moveTo(r * 0.5, -r * 0.8); g.lineTo(-r * 0.5, r * 0.3); g.stroke(); }
    g.restore();
  }
  // Schilder über dem Gerät: Mangel (beim Ausstecken), „In Ordnung −1s“, Panne (rot)
  function schilderZeichnen(g, t, ruh) {
    S.schilder = S.schilder.filter(s => t - s.t0 < s.dauer);
    const st = L.stage;
    S.schilder.forEach(s => {
      const p = t - s.t0;
      const a = Math.min(1, p / 0.12, (s.dauer - p) / 0.2);
      const [gx, gy, gw] = geraetSchirm(s.ri, s.d);
      const fs = L.kurz < 420 ? 13 : 15;
      g.save();
      g.font = '700 ' + fs + 'px ' + SCHRIFT;
      const text = s.text + (s.zusatz ? '  ' + s.zusatz : '');
      const tw = g.measureText(text).width, w = tw + 22, hh = fs + 14;
      const x = klemm(gx + gw / 2 - w / 2, st.x + 4, st.x + st.w - w - 4);
      const y = klemm(gy - hh - 8 - (ruh ? 0 : 6 * (1 - Math.min(1, p / 0.15))), st.y + 4, st.y + st.h - hh - 4);
      g.globalAlpha = a;
      g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
      g.fillStyle = '#fff'; rund(g, x, y, w, hh, 6); g.fill(); g.shadowColor = 'transparent';
      g.fillStyle = s.art === 'gefahr' ? '#d3241c' : s.art === 'mangel' ? '#FFD500' : '#9a9a9a';
      g.fillRect(x + 6, y + 3, w - 12, 3);
      g.fillStyle = s.art === 'gefahr' ? '#b3261e' : '#191919'; g.textBaseline = 'middle'; g.textAlign = 'center';
      g.fillText(text, x + w / 2, y + hh / 2 + 2);
      g.restore();
    });
  }
  function klicksZeichnen(g) {
    S.klicks = S.klicks.filter(k => S.zeit - k.t0 < 0.35);
    S.klicks.forEach(k => {
      const p = (S.zeit - k.t0) / 0.35;
      g.save(); g.globalAlpha = 0.7 * (1 - p); g.strokeStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.arc(k.x, k.y, 8 + 22 * p, 0, Math.PI * 2); g.stroke(); g.restore();
    });
  }
  function rund(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  // ---------- Anmeldung ----------
  R_.spiel({
    id: 'sicherungskasten',
    wertung: 'hoch',
    format: p => p.toLocaleString('de-DE') + ' Punkte',
    hoechst: 1000,
    bereich: 'Elektroprüfung',
    hintergrund: { bild: 'bilder/start.webp', position: '50% 70%' },
    figur: POSEN.daumen,
    texte: {
      titel: 'Sicherungskasten',
      untertitel: 'Bringst du den Strom schnell zurück?',
      anleitung: 'Fliegt eine Sicherung, wird ein Raum dunkel. Tippe zuerst das defekte Gerät im Raum an, dann den passenden Schalter im Verteiler. Wer zu früh einschaltet, löst die Sicherung gleich wieder aus. Jeder behobene Ausfall zählt – je schneller, desto mehr Punkte. Drei Ausfälle zu lang? Ende!',   // MZ, 23.10.2026 (Ausrufezeichen gewollt)
    },
    // Klänge (Sound Artist, 23.10.2026; Sonniss GDC 2026, Blitz mit Pixabay DRAGON-STUDIO): Einzelklänge in der
    // Pegel-Abstufung der Lieferung (lautester auf Spitze 0,89), Gewitter-Schleife normalisiert und leise gemischt
    klaenge: {
      gewitter: { datei: 'klaenge/gewitter.mp3', proben: 573300, pegel: 0.3 },
      blitz: { datei: 'klaenge/blitz.mp3', proben: 48510, pegel: 0.75 },
      fliegt: { datei: 'klaenge/fliegt.mp3', proben: 15435, pegel: 1 },
      fi: { datei: 'klaenge/fi.mp3', proben: 28665, pegel: 0.9 },
      ausstecken: { datei: 'klaenge/ausstecken.mp3', proben: 4851, pegel: 1 },
      einschalten: { datei: 'klaenge/einschalten.mp3', proben: 20948, pegel: 1 },
      zufrueh: { datei: 'klaenge/zufrueh.mp3', proben: 20948, pegel: 0.95 },
      falsch: { datei: 'klaenge/falsch.mp3', proben: 4911, pegel: 1 },
      tempo: { datei: 'klaenge/tempo.mp3', proben: 2205, pegel: 1 },
      abbruch: { datei: 'klaenge/abbruch.mp3', proben: 44100, pegel: 0.85 },
      geschafft: { datei: 'klaenge/geschafft.mp3', proben: 28665, pegel: 0.9 },
    },
    schleife: 'gewitter',
    neu, schritt, zeichne, runter, bewegen, hoch, groesse,
  });

  // Testhilfe (nur lesen): Zustand und Bildschirm-Lagen zum Antippen
  window.__sicherungskasten = {
    get zustand() {
      if (!S) return null;
      const A = S.A;
      return { nr: S.nr, phase: S.phase, art: A && A.art, t: A ? +A.t.toFixed(2) : null, dauer: A && A.dauer, geb: S.geb,
        raeume: A ? A.raeume.map(ri => RAEUME[S.raeume[ri].typ].name) : [], fokus: S.fokus,
        verursacher: A ? A.verursacher.map(v => ({ raum: RAEUME[S.raeume[v.ri].typ].name, ri: v.ri, geraet: GERAETE[v.d.gi].name, mangel: GERAETE[v.d.gi].maengel[v.d.mangel].name, steckt: v.d.steckt })) : [],
        punkte: +S.punkte.toFixed(1), behoben: S.behoben, pannen: S.pannen, zuFrueh: S.zuFrueh, inOrdnung: S.inOrdnung, zeiten: S.zeiten.slice(), fertig: S.fertig, plan: S.plan.slice() };
    },
    // Mitte des Raums ri, der Geräte im Raum ri (Bildschirm), Schalter des Raums ri, FI
    raum(ri) { const p = platzRect(ri), [x, y] = zuSchirm(p[0] + p[2] / 2, p[1] + p[3] * 0.3); return [Math.round(x), Math.round(y)]; },
    geraete(ri) { return S.raeume[ri].geraete.map(d => { const [x, y, w, h] = geraetSchirm(ri, d); return { name: GERAETE[d.gi].name, x: Math.round(x + w / 2), y: Math.round(y + h / 2), w: Math.round(w), h: Math.round(h), steckt: d.steckt }; }); },
    verursacherPunkt(i) { const v = S.A && S.A.verursacher[i || 0]; if (!v) return null; const [x, y, w, h] = geraetSchirm(v.ri, v.d); return [Math.round(x + w / 2), Math.round(y + h / 2), Math.round(w), Math.round(h)]; },
    schalter(ri) { const f = L.schalter[S.raeume[ri].schalter].fach; return [Math.round(f[0] + f[2] / 2), Math.round(f[1] + f[3] / 2)]; },
    get fi() { const f = L.fi.fach; return [Math.round(f[0] + f[2] / 2), Math.round(f[1] + f[3] / 2)]; },
    get faecher() { return L.schalter.map(s => s.fach.map(Math.round)).concat([L.fi.fach.map(Math.round)]); },
    get kamera() { return S.kam && { x: Math.round(S.kam.x), y: Math.round(S.kam.y), z: +S.kam.z.toFixed(3), ziel: +S.kamZiel.z.toFixed(3) }; },
    get stage() { return L.stage; },
  };
})();
