// Prüfplakette (Sammlung „entSPANNUNG“, RSI protect, Bereich Elektroprüfung) – Konzept von MZ freigegeben (23.10.2026):
// Sichtprüfung nach DGUV V3 in einer Prüfwerkstatt. 30 Elektrogeräte gleiten nacheinander auf den Prüftisch; in Ordnung →
// Plakette (Knopf rechts, Wischen nach rechts, Pfeiltaste rechts), beschädigt → Sperren (links). Die Bedenkzeit läuft als
// Balken unter dem Gerät (letzte Sekunde Tempo-Tick). Defekt mit Plakette oder Bedenkzeit bei einem defekten Gerät
// abgelaufen = Gefahr (Funke am Mangel, Mann entsetzt); 3 Gefahren = Abbruch mit 0 Punkten.
// Steigerung: Gerät 1–10 Bedenkzeit 4,0s, auffällige Mängel, keine Gebrauchsspuren; 11–20 3,0s, mittlere Mängel,
// Gebrauchsspuren mischen sich ein; 21–30 2,0s, unauffällige Mängel, Baustrahler mit Mörtel-Gebrauchsspuren nur hier.
// Je Stufe 4 defekte Geräte (gesamt 12 von 30). Jede Runde 30 aus 80 Varianten (20 Geräte × intakt, Gebrauchsspuren,
// Mangel A, Mangel B), „Nochmal“ bevorzugt andere Varianten (mg:pruefplakette:zuletzt).
// Punkte je Gerät 1000/30: zwei Drittel für die richtige Entscheidung, ein Drittel Tempo (voll bis 40 % der Bedenkzeit,
// danach linear bis 0 am Ende). Falsch gesperrt, zu spät oder Gefahr: 0 für das Gerät. Durchgespielt: mind. 1 Punkt.
//
// Testhilfen (Adresse): #ende=sieg-930 | #ende=mittel-640 | #ende=schwach-420 | #ende=verloren (nach „Los geht's“ sofort
//   das Endbild), #geraet=7 (die 8 Varianten von Bogen 07 zuerst) bzw. #geraet=07-1-2 (diese Variante zuerst),
//   #schnell (kurze Pausen), #ruhig (wie „Bewegung reduzieren“). window.__pruefplakette: Zustand und Knopf-Lagen (nur Test).
(function () {
  'use strict';
  const R_ = window.Rahmen;
  const hash = location.hash;
  const TEST = {
    ende: (/(?:^#|&)ende=([a-z]+-)?(\d+|verloren)/.exec(hash) || [])[2] || null,
    geraet: (/(?:^#|&)geraet=(\d{1,2}(?:-[01]-[0-3])?)/.exec(hash) || [])[1] || null,
    schnell: /(?:^#|&)schnell(?![a-z])/.test(hash),
    ruhig: /(?:^#|&)ruhig(?![a-z])/.test(hash),
  };
  const ruhig = () => TEST.ruhig || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const zufall = (a, b) => a + Math.random() * (b - a);
  const mischen = l => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
  const klemm = (v, a, b) => Math.max(a, Math.min(b, v));
  const glatt = e => { e = klemm(e, 0, 1); return e * e * (3 - 2 * e); };
  const sek = s => s.toFixed(1).replace('.', ',') + 's';
  const SCHRIFT = '"Titillium Web", "Segoe UI", system-ui, sans-serif';

  // ---------- Regeln ----------
  const ANZAHL = 30, JE = 1000 / ANZAHL, GEFAHR_MAX = 3;
  const RICHTIG_ANTEIL = 2 / 3, TEMPO_VOLL = 0.4;
  // Stufen: bis Gerät, Bedenkzeit, Mangel-Auffälligkeit (0 auffällig, 1 mittel, 2 unauffällig), Anzahl defekt/sauber/Spuren
  const STUFEN = [
    { bis: 10, zeit: 4.0, mangel: 0, defekt: 4, sauber: 6, spuren: 0 },
    { bis: 20, zeit: 3.0, mangel: 1, defekt: 4, sauber: 3, spuren: 3 },
    { bis: 30, zeit: 2.0, mangel: 2, defekt: 4, sauber: 2, spuren: 4 },
  ];
  const stufeVon = nr => STUFEN.find(st => nr < st.bis);
  const TICKS = [0.9, 0.6, 0.3];          // Tempo-Tick bei dieser Restzeit (letzte Sekunde)
  const P = TEST.schnell ? 0.4 : 1;      // Faktor für Pausen
  // Ablauf (s): Gerät gleitet herein, Plakette/Anhänger, Halten (Rückmeldung), Gerät gleitet hinaus
  const T_REIN = 0.42, T_RAUS = 0.36;
  const HALTEN = { richtig: 0.5, unnoetig: 0.75, gefahr: 1.15, spaet: 0.7 };
  const SCHILD_DAUER = 0.85;
  const HALTEN_SPERRE = 1.2;

  // ---------- Geräte ----------
  // Bögen pruefplakette-geraete-01…10 (Reihe 0 oben, 1 unten; Spalte 0 intakt, 1 Gebrauchsspuren, 2 Mangel A, 3 Mangel B),
  // freigestellt nach bilder/g-BB-R-S.webp. Punkte als Anteil des Zuschnitts [x, y] (am Bild abgemessen):
  // plakette = Stelle für den Prüfaufkleber (glatte Gehäusefläche), anhaenger = Befestigung des Sperr-Anhängers (Kabel,
  // Griff), ort = Mangel (Funke bei Gefahr). stufe: 0 auffällig, 1 mittel, 2 unauffällig (Einstufung Developer nach Bild).
  const GERAETE = [
    { name: 'Wasserkocher', bogen: 1, reihe: 0, plakette: [0.45, 0.45], anhaenger: [0.75, 0.85],
      maengel: [{ name: 'Kabel eingerissen', stufe: 1, ort: [0.42, 0.91] }, { name: 'Brandspuren', stufe: 0, ort: [0.33, 0.77] }] },
    { name: 'Kaffeemaschine', bogen: 1, reihe: 1, plakette: [0.75, 0.45], anhaenger: [0.6, 0.9],
      maengel: [{ name: 'Gehäuse gebrochen', stufe: 0, ort: [0.75, 0.34] }, { name: 'Kabel geflickt', stufe: 1, ort: [0.42, 0.93] }] },
    { name: 'Toaster', bogen: 2, reihe: 0, plakette: [0.68, 0.35], anhaenger: [0.85, 0.58],
      maengel: [{ name: 'Stecker gebrochen', stufe: 2, ort: [0.36, 0.87] }, { name: 'Zugentlastung fehlt', stufe: 2, ort: [0.88, 0.54] }] },
    { name: 'Föhn', bogen: 2, reihe: 1, plakette: [0.45, 0.22], anhaenger: [0.6, 0.7],
      maengel: [{ name: 'Kabel eingerissen', stufe: 1, ort: [0.4, 0.78] }, { name: 'Gehäuse gebrochen', stufe: 0, ort: [0.78, 0.13] }] },
    { name: 'Bohrmaschine', bogen: 3, reihe: 0, plakette: [0.6, 0.15], anhaenger: [0.8, 0.82],
      maengel: [{ name: 'Gehäuse gebrochen', stufe: 0, ort: [0.87, 0.41] }, { name: 'Kabel gequetscht', stufe: 2, ort: [0.42, 0.88] }] },
    { name: 'Akku-Ladegerät', bogen: 3, reihe: 1, plakette: [0.45, 0.35], anhaenger: [0.8, 0.8],
      maengel: [{ name: 'Gehäuse offen', stufe: 0, ort: [0.62, 0.45] }, { name: 'Brandspuren', stufe: 0, ort: [0.53, 0.41] }] },
    { name: 'Winkelschleifer', bogen: 4, reihe: 0, plakette: [0.55, 0.2], anhaenger: [0.55, 0.75],
      maengel: [{ name: 'Schalter abgebrochen', stufe: 1, ort: [0.37, 0.2] }, { name: 'Kabel geflickt', stufe: 1, ort: [0.71, 0.91], weg: true }] },
    { name: 'Kabeltrommel', bogen: 4, reihe: 1, plakette: [0.22, 0.4], anhaenger: [0.35, 0.9],
      maengel: [{ name: 'Gehäuse gerissen', stufe: 0, ort: [0.66, 0.41] }, { name: 'Kabel eingerissen', stufe: 1, ort: [0.75, 0.89] }] },
    { name: 'Verlängerungskabel', bogen: 5, reihe: 0, plakette: [0.62, 0.22], anhaenger: [0.2, 0.5],
      maengel: [{ name: 'Schutzkontakt verbogen', stufe: 2, ort: [0.82, 0.7] }, { name: 'Kabel geflickt', stufe: 1, ort: [0.26, 0.7] }] },
    { name: 'Steckdosenleiste', bogen: 5, reihe: 1, plakette: [0.5, 0.62], anhaenger: [0.18, 0.4],
      maengel: [{ name: 'Leisten hintereinander', stufe: 0, ort: [0.26, 0.33] }, { name: 'Brandspuren', stufe: 0, ort: [0.78, 0.5] }] },
    { name: 'Monitor', bogen: 6, reihe: 0, plakette: [0.55, 0.83], anhaenger: [0.2, 0.8],
      maengel: [{ name: 'Kabel eingerissen', stufe: 2, ort: [0.4, 0.87] }, { name: 'Gehäuse gebrochen', stufe: 0, ort: [0.9, 0.08] }] },
    { name: 'Laptop-Netzteil', bogen: 6, reihe: 1, plakette: [0.45, 0.2], anhaenger: [0.2, 0.45],
      maengel: [{ name: 'Zugentlastung fehlt', stufe: 2, ort: [0.21, 0.47] }, { name: 'Stecker gebrochen', stufe: 2, ort: [0.37, 0.82] }] },
    { name: 'Drucker', bogen: 7, reihe: 0, plakette: [0.75, 0.45], anhaenger: [0.2, 0.75],
      maengel: [{ name: 'Gehäuse offen', stufe: 0, ort: [0.69, 0.33] }, { name: 'Kabel eingerissen', stufe: 1, ort: [0.62, 0.75] }] },
    { name: 'Schreibtischlampe', bogen: 7, reihe: 1, plakette: [0.72, 0.7], anhaenger: [0.25, 0.9],
      maengel: [{ name: 'Schalter abgebrochen', stufe: 1, ort: [0.5, 0.67] }, { name: 'Kabel geflickt', stufe: 1, ort: [0.4, 0.8] }] },
    { name: 'Ventilator', bogen: 8, reihe: 0, plakette: [0.45, 0.8], anhaenger: [0.3, 0.88],
      maengel: [{ name: 'Schutzgitter gebrochen', stufe: 0, ort: [0.45, 0.28] }, { name: 'Stecker gebrochen', stufe: 2, ort: [0.81, 0.89] }] },
    { name: 'Heizlüfter', bogen: 8, reihe: 1, plakette: [0.75, 0.2], anhaenger: [0.3, 0.85],
      maengel: [{ name: 'Brandspuren', stufe: 0, ort: [0.6, 0.14] }, { name: 'Zugentlastung fehlt', stufe: 2, ort: [0.86, 0.52] }] },
    { name: 'Lötstation', bogen: 9, reihe: 0, plakette: [0.25, 0.25], anhaenger: [0.25, 0.7],
      maengel: [{ name: 'Kabel angeschmort', stufe: 1, ort: [0.63, 0.68] }, { name: 'Schutzkontakt verbogen', stufe: 2, ort: [0.78, 0.78] }] },
    { name: 'Staubsauger', bogen: 9, reihe: 1, plakette: [0.6, 0.5], anhaenger: [0.6, 0.75],
      maengel: [{ name: 'Kabel gequetscht', stufe: 2, ort: [0.7, 0.69] }, { name: 'Gehäuse gebrochen', stufe: 0, ort: [0.56, 0.23] }] },
    { name: 'Baustrahler', bogen: 10, reihe: 0, plakette: [0.17, 0.5], anhaenger: [0.25, 0.75], spurenSpaet: true,
      maengel: [{ name: 'Glas gesprungen', stufe: 0, ort: [0.84, 0.17] }, { name: 'Kabel eingerissen', stufe: 1, ort: [0.81, 0.87] }] },
    { name: 'Mini-Kühlschrank', bogen: 10, reihe: 1, plakette: [0.3, 0.25], anhaenger: [0.6, 0.85],
      maengel: [{ name: 'Stecker gebrochen', stufe: 2, ort: [0.84, 0.92] }, { name: 'Gehäuse offen', stufe: 0, ort: [0.8, 0.35] }] },
  ];
  // Maße der Zuschnitte (Breite, Höhe in Bildpunkten der WebP-Dateien)
  const MASSE = {'01-0-0': [310, 380], '01-0-1': [310, 380], '01-0-2': [313, 380], '01-0-3': [311, 380], '01-1-0': [277, 380], '01-1-1': [277, 380], '01-1-2': [277, 380], '01-1-3': [278, 380], '02-0-0': [309, 380], '02-0-1': [310, 380], '02-0-2': [310, 380], '02-0-3': [307, 380], '02-1-0': [287, 380], '02-1-1': [288, 380], '02-1-2': [289, 380], '02-1-3': [291, 380], '03-0-0': [359, 380], '03-0-1': [360, 380], '03-0-2': [360, 380], '03-0-3': [360, 380], '03-1-0': [360, 380], '03-1-1': [359, 380], '03-1-2': [359, 380], '03-1-3': [359, 380], '04-0-0': [380, 379], '04-0-1': [378, 380], '04-0-2': [375, 380], '04-0-3': [369, 380], '04-1-0': [261, 380], '04-1-1': [261, 380], '04-1-2': [261, 380], '04-1-3': [261, 380], '05-0-0': [364, 380], '05-0-1': [365, 380], '05-0-2': [365, 380], '05-0-3': [364, 380], '05-1-0': [380, 342], '05-1-1': [380, 340], '05-1-2': [348, 380], '05-1-3': [380, 341], '06-0-0': [291, 380], '06-0-1': [289, 380], '06-0-2': [292, 380], '06-0-3': [292, 380], '06-1-0': [380, 354], '06-1-1': [380, 355], '06-1-2': [380, 355], '06-1-3': [380, 360], '07-0-0': [356, 380], '07-0-1': [352, 380], '07-0-2': [373, 380], '07-0-3': [352, 380], '07-1-0': [247, 380], '07-1-1': [246, 380], '07-1-2': [251, 380], '07-1-3': [253, 380], '08-0-0': [253, 380], '08-0-1': [254, 380], '08-0-2': [258, 380], '08-0-3': [253, 380], '08-1-0': [269, 380], '08-1-1': [269, 380], '08-1-2': [274, 380], '08-1-3': [264, 380], '09-0-0': [321, 380], '09-0-1': [323, 380], '09-0-2': [316, 380], '09-0-3': [317, 380], '09-1-0': [302, 380], '09-1-1': [302, 380], '09-1-2': [304, 380], '09-1-3': [305, 380], '10-0-0': [337, 380], '10-0-1': [338, 380], '10-0-2': [339, 380], '10-0-3': [335, 380], '10-1-0': [279, 380], '10-1-1': [278, 380], '10-1-2': [276, 380], '10-1-3': [283, 380]};

  // Varianten (80): sauber, spuren, defekt (mit Mangel); weg = im Bild nicht sicher erkennbar → nicht im Pool
  const VARIANTEN = [];
  GERAETE.forEach((ge, gi) => {
    const kopf = String(ge.bogen).padStart(2, '0') + '-' + ge.reihe + '-';
    VARIANTEN.push({ key: kopf + 0, gi, art: 'sauber' });
    VARIANTEN.push({ key: kopf + 1, gi, art: 'spuren', nurSpaet: !!ge.spurenSpaet });
    ge.maengel.forEach((m, mi) => { if (!m.weg) VARIANTEN.push({ key: kopf + (2 + mi), gi, art: 'defekt', mangel: m }); });
  });
  VARIANTEN.forEach(v => { v.masse = MASSE[v.key]; });

  // ---------- Bilder ----------
  const bilder = {};
  let werkstatt = null;   // Werkstatt mit Prüfgerät in Kundenfarbe (einmal umgefärbt)
  let wolken = null;      // Wolkenschicht für den lebenden Himmel im Fenster
  // Figur (Mann mit Kissen-Weste, Bereich Elektroprüfung): Posen mit Blickrichtung im Bild; hoehe = Maßstab der Pose
  // (am Bild abgemessen, Person in allen Posen gleich groß). Die Figur blickt immer zur Bildmitte (MZ, 23.10.2026).
  const POSEN = {
    ruhe: { bild: 'bilder/mann-ruhe.webp', blick: 'links', hoehe: 1 },
    daumen: { bild: 'bilder/mann-daumen.webp', blick: 'links', hoehe: 0.99 },
    jubel: { bild: 'bilder/mann-jubel.webp', blick: 'frontal', hoehe: 0.89 },
    entsetzt: { bild: 'bilder/mann-entsetzt.webp', blick: 'frontal', hoehe: 0.94 },
  };
  function lade(name, datei, fertig) {
    const i = new Image();
    i.onload = () => { bilder[name] = i; if (fertig) fertig(i); };
    i.src = datei;
  }
  lade('werkstatt', 'bilder/werkstatt.webp', i => { werkstatt = R_.umfaerben(i); });
  lade('himmel', 'bilder/himmel.webp', i => { wolken = wolkenEbene(i); });
  Object.keys(POSEN).forEach(n => lade(n, POSEN[n].bild));
  const geraetLaden = v => { if (v && !bilder[v.key] && !v.laedt) { v.laedt = true; lade(v.key, 'bilder/g-' + v.key + '.webp'); } };

  // Werkstatt-Bild 1536×1024 (am Bild abgemessen): Fenster (Glas) x 447–1083, y 66–451; Tischplatte hinten y 738, vorne
  // y 905; Gerät steht mittig auf der Platte (x 768, Fuß y 850).
  const WERK = { b: 1536, h: 1024, fenster: [447, 66, 1083, 451], fussX: 768, fussY: 850, hinten: 738, vorne: 905 };

  // Standfläche der Geräte (MZ, 24.10.2026: Geräte wirkten schwebend): gemeinsame Tabelle mit Sicherungskasten und
  // Messwert, Skript Material/Bilder/pruefplakette-skripte/standlinie.py – je Variante [Standlinie, Auflage von, bis] als
  // Anteil des Zuschnitts (Unterkante Gehäuse/Füße, nicht Stecker oder Kabel)
  // STANDLINIE-ANFANG (automatisch eingetragen, nicht von Hand ändern)
  const STANDLINIE = {"01-0-0":[0.83,0.1,0.74],"01-0-1":[0.83,0.1,0.74],"01-0-2":[0.83,0.1,0.74],"01-0-3":[0.83,0.1,0.74],"01-1-0":[0.853,0.13,0.646],"01-1-1":[0.853,0.13,0.65],"01-1-2":[0.853,0.13,0.646],"01-1-3":[0.853,0.13,0.646],"02-0-0":[0.724,0.068,0.576],"02-0-1":[0.724,0.068,0.574],"02-0-2":[0.724,0.071,0.577],"02-0-3":[0.724,0.068,0.58],"02-1-0":[0.7,0.4,0.54],"02-1-1":[0.7,0.4,0.54],"02-1-2":[0.7,0.4,0.54],"02-1-3":[0.7,0.4,0.54],"03-0-0":[0.79,0.26,0.4],"03-0-1":[0.79,0.26,0.4],"03-0-2":[0.79,0.26,0.4],"03-0-3":[0.79,0.26,0.4],"03-1-0":[0.67,0.03,0.91],"03-1-1":[0.67,0.03,0.91],"03-1-2":[0.67,0.03,0.91],"03-1-3":[0.67,0.03,0.91],"04-0-0":[0.66,0.05,0.55],"04-0-1":[0.66,0.05,0.55],"04-0-2":[0.66,0.05,0.55],"04-0-3":[0.66,0.05,0.55],"04-1-0":[0.76,0.1,0.92],"04-1-1":[0.76,0.1,0.92],"04-1-2":[0.76,0.1,0.92],"04-1-3":[0.76,0.1,0.92],"05-0-0":[0.72,0.1,0.9],"05-0-1":[0.72,0.1,0.9],"05-0-2":[0.72,0.1,0.9],"05-0-3":[0.72,0.1,0.9],"05-1-0":[0.74,0.08,0.98],"05-1-1":[0.74,0.08,0.98],"05-1-2":[0.76,0.05,0.98],"05-1-3":[0.74,0.08,0.98],"06-0-0":[0.797,0.192,0.766],"06-0-1":[0.8,0.18,0.765],"06-0-2":[0.797,0.192,0.75],"06-0-3":[0.8,0.185,0.757],"06-1-0":[0.62,0.25,0.75],"06-1-1":[0.62,0.25,0.75],"06-1-2":[0.62,0.25,0.75],"06-1-3":[0.62,0.25,0.75],"07-0-0":[0.653,0.225,0.857],"07-0-1":[0.658,0.278,0.852],"07-0-2":[0.666,0.298,0.987],"07-0-3":[0.647,0.202,0.864],"07-1-0":[0.78,0.31,0.85],"07-1-1":[0.78,0.31,0.85],"07-1-2":[0.78,0.31,0.85],"07-1-3":[0.78,0.31,0.85],"08-0-0":[0.813,0.225,0.802],"08-0-1":[0.813,0.22,0.799],"08-0-2":[0.811,0.225,0.833],"08-0-3":[0.811,0.217,0.791],"08-1-0":[0.721,0.1,0.829],"08-1-1":[0.721,0.097,0.829],"08-1-2":[0.721,0.073,0.847],"08-1-3":[0.721,0.095,0.841],"09-0-0":[0.537,0.09,0.854],"09-0-1":[0.534,0.093,0.867],"09-0-2":[0.529,0.092,0.87],"09-0-3":[0.532,0.091,0.864],"09-1-0":[0.67,0.2,0.95],"09-1-1":[0.67,0.2,0.95],"09-1-2":[0.67,0.2,0.95],"09-1-3":[0.67,0.2,0.95],"10-0-0":[0.71,0.09,0.95],"10-0-1":[0.71,0.09,0.95],"10-0-2":[0.71,0.09,0.95],"10-0-3":[0.71,0.09,0.95],"10-1-0":[0.76,0.02,0.75],"10-1-1":[0.76,0.02,0.75],"10-1-2":[0.76,0.02,0.75],"10-1-3":[0.76,0.02,0.75],"leuchte":[0.97,0.02,0.98],"kuehlschrank":[0.985,0.08,0.95]};
  // STANDLINIE-ENDE
  // Himmel 1200×800: Horizont (Häuser) ab y 690, Wolken bis ca. y 600
  const HIMMEL = { b: 1200, h: 800, horizont: 690, wolkenBis: 600 };

  // ---------- Lage ----------
  let B = 0, H = 0, L = null;
  const OBEN = 84;   // Anzeige und Gefahren-Zeile
  function lage() {
    const hochF = H > B * 1.05;
    const s = Math.max(B / WERK.b, H / WERK.h);
    // Knöpfe unten
    const kh = klemm(H * 0.085, 46, 66), unten = Math.max(10, Math.min(22, H * 0.025));
    const ky = H - unten - kh;
    const kb = Math.min(hochF ? (B - 36) / 2 : 250, (B - 60) / 2), lucke = hochF ? 12 : 26;
    const knoepfe = {
      sperren: [B / 2 - lucke / 2 - kb, ky, kb, kh],
      plakette: [B / 2 + lucke / 2, ky, kb, kh],
    };
    // Bild so legen, dass der Fuß des Geräts über den Knöpfen steht (Bild deckt immer ab)
    const fussZiel = ky - Math.max(16, H * (hochF ? 0.06 : 0.05));
    const ox = (B - WERK.b * s) / 2;
    const oy = klemm(fussZiel - WERK.fussY * s, H - WERK.h * s, 0);
    const fussY = oy + WERK.fussY * s;
    // Figur: links, steht auf Höhe der Knöpfe
    const figH = hochF ? klemm(H * 0.16, 96, 150) : klemm(H * 0.34, 110, 240);
    const figW = figH * 0.45;
    const figUnten = hochF ? ky - 6 : H - 6;
    // Gerät: Platz zwischen Anzeige und Fuß, nicht über der Figur
    const maxH = Math.min(fussY - OBEN - 34, H * (hochF ? 0.36 : 0.5));
    let maxW = hochF ? Math.min(B * 0.72, B - figW - 30) : Math.min(B * 0.42, 420);
    let cx = B / 2;
    if (hochF) cx = Math.max(B / 2, figW + 14 + maxW / 2);
    if (cx + maxW / 2 > B - 8) maxW = 2 * (B - 8 - cx);
    const fenster = [ox + WERK.fenster[0] * s, oy + WERK.fenster[1] * s, (WERK.fenster[2] - WERK.fenster[0]) * s, (WERK.fenster[3] - WERK.fenster[1]) * s];
    // Tischplatte auf dem Schirm (Standfläche der Geräte liegt dazwischen); Kabel/Stecker dürfen bis in die Knöpfe hängen
    const hinten = oy + WERK.hinten * s, vorne = oy + WERK.vorne * s, unterGrenze = ky + kh * 0.55;
    L = { hochF, s, ox, oy, knoepfe, fussY, cx, maxW, maxH, figH, figUnten, fenster, kurz: Math.min(B, H), hinten, vorne, unterGrenze };
  }
  function groesse(b, h) { B = b; H = h; lage(); }

  // Darstellungsgröße eines Geräts: einheitlich (gleiche Fläche, begrenzt durch Breite/Höhe), gemessen am intakten Bild
  // des Geräts, damit alle Varianten eines Geräts gleich groß sind
  function geraetMass(v) {
    const ref = MASSE[v.key.slice(0, 5) + '0'] || v.masse;
    const A = Math.pow(Math.min(L.maxW, L.maxH) * 0.86, 2);
    // nie größer als der Platz (z. B. zwei Leisten hintereinander sind höher als die einzelne Leiste)
    let k = Math.min(L.maxW / ref[0], L.maxH / ref[1], Math.sqrt(A / (ref[0] * ref[1])), L.maxW / v.masse[0], L.maxH / v.masse[1]);
    let w = v.masse[0] * k, h = v.masse[1] * k;
    // Gerät steht mit der Standlinie (Unterkante Gehäuse) auf dem Tisch: der unterste Bildpunkt (Stecker, Kabel) liegt
    // vorne an der bisherigen Fußlinie, das Gehäuse steht dahinter – aber nie hinter der Tischkante. Hängt das Kabel zu
    // weit nach vorn (über die Knöpfe hinaus), wird das Gerät etwas kleiner.
    const st = STANDLINIE[v.key] || [1, 0.15, 0.85];
    const minStand = L.hinten + (L.vorne - L.hinten) * 0.12;
    let haengt = h * (1 - st[0]);
    if (minStand + haengt > L.unterGrenze && haengt > 0) {
      const f = (L.unterGrenze - minStand) / haengt;
      k *= f; w *= f; h *= f; haengt *= f;
    }
    const stand = Math.max(minStand, L.fussY - haengt);
    const x = L.cx - w / 2;
    return { k, w, h, x, y: stand - h * st[0], stand, auf0: x + w * st[1], auf1: x + w * st[2] };
  }

  // ---------- Auswahl der 30 Geräte ----------
  function auswahl() {
    let zuletzt = [];
    try { zuletzt = JSON.parse(localStorage.getItem('mg:pruefplakette:zuletzt') || '[]'); } catch (e) { /* privat */ }
    const genutzt = new Set(), proGeraet = {};
    const nimm = (liste, n) => {
      // zuletzt gespielte Varianten nach hinten, dann Geräte, die in dieser Runde noch selten kamen, sonst zufällig
      const k = liste.filter(v => !genutzt.has(v.key)).map(v => ({ v, alt: zuletzt.includes(v.key) ? 1 : 0, oft: proGeraet[v.gi] || 0, z: Math.random() }))
        .sort((a, b) => (a.alt - b.alt) || (a.oft - b.oft) || (a.z - b.z));
      const r = [];
      for (const e of k) {
        if (r.length >= n) break;
        if ((proGeraet[e.v.gi] || 0) >= 2) continue;
        r.push(e.v); genutzt.add(e.v.key); proGeraet[e.v.gi] = (proGeraet[e.v.gi] || 0) + 1;
      }
      return r;
    };
    let folge = [];
    STUFEN.forEach((st, si) => {
      const stufe = [
        ...nimm(VARIANTEN.filter(v => v.art === 'defekt' && v.mangel.stufe === st.mangel), st.defekt),
        ...nimm(VARIANTEN.filter(v => v.art === 'spuren' && (!v.nurSpaet || si === 2)), st.spuren),
      ];
      stufe.push(...nimm(VARIANTEN.filter(v => v.art === 'sauber'), st.bis - (si ? STUFEN[si - 1].bis : 0) - stufe.length));
      folge.push(...ordnen(stufe, folge[folge.length - 1]));
    });
    if (TEST.geraet) {
      const vorn = TEST.geraet.includes('-') ? VARIANTEN.filter(v => v.key === TEST.geraet)
        : VARIANTEN.filter(v => v.key.startsWith(String(+TEST.geraet).padStart(2, '0') + '-'));
      folge = [...vorn, ...folge.filter(v => !vorn.includes(v))].slice(0, ANZAHL);
    }
    if (R_.zustand === 'spiel') try { localStorage.setItem('mg:pruefplakette:zuletzt', JSON.stringify(folge.map(v => v.key))); } catch (e) { /* privat */ }
    return folge;
  }
  // Reihenfolge einer Stufe: gleiche Geräteart nie direkt hintereinander, höchstens 4 gleiche Entscheidungen am Stück
  function ordnen(liste, davor) {
    let best = null, bestFehler = 1e9;
    for (let v = 0; v < 300; v++) {
      const l = mischen(liste.slice());
      let fehler = 0, lauf = 1;
      for (let i = 0; i < l.length; i++) {
        const vor = i ? l[i - 1] : davor;
        if (vor && vor.gi === l[i].gi) fehler += 10;
        if (i && (l[i].art === 'defekt') === (l[i - 1].art === 'defekt')) { lauf++; if (lauf > 4) fehler++; } else lauf = 1;
      }
      if (fehler < bestFehler) { best = l; bestFehler = fehler; }
      if (!fehler) break;
    }
    return best;
  }

  // ---------- Zustand ----------
  let S = null;
  function neu() {
    S = {
      zeit: 0, nr: 0, folge: auswahl(), phase: 'warten', phaseT: 0, uhr: 0, tick: 0, ent: null,
      punkte: 0, richtig: 0, gefahren: 0, unnoetig: 0, spaet: 0, zeiten: [], serie: 0,
      figur: { pose: 'ruhe', bis: 0, hupf: 0 }, klicks: [], wisch: null, zieh: 0, gedrueckt: null,
      leuchten: null, leuchtenUm: zufall(4, 8), fertig: false, testEnde: !!TEST.ende,
    };
    if (R_.zustand === 'spiel') S.folge.slice(0, 6).forEach(geraetLaden);
    anzeigen();
  }
  function anzeigen() {
    R_.anzeige('Gerät ' + Math.min(ANZAHL, S.nr + 1) + '/' + ANZAHL, Math.round(S.punkte).toLocaleString('de-DE') + ' Punkte');
  }
  const aktuell = () => S.folge[S.nr];

  // ---------- Ablauf ----------
  function schritt(dt) {
    if (!L) return;
    if (S.testEnde) { S.testEnde = false; testEnde(); return; }
    S.zeit += dt; S.phaseT += dt;
    if (S.fertig) return;
    const v = aktuell();
    if (S.phase === 'warten') {
      S.folge.slice(S.nr, S.nr + 6).forEach(geraetLaden);
      if (bilder[v.key] && S.phaseT >= 0.12 * P) { S.phase = 'rein'; S.phaseT = 0; S.zieh = 0; R_.ton('kommt'); anzeigen(); }
    } else if (S.phase === 'rein') {
      if (S.phaseT >= T_REIN) pruefen();
    } else if (S.phase === 'pruefen') {
      S.uhr += dt;
      const T = stufeVon(S.nr).zeit, rest = T - S.uhr;
      if (S.tick < TICKS.length && rest <= TICKS[S.tick]) { S.tick++; R_.ton('tempo'); }
      if (S.uhr >= T) entscheiden('zeit');
    } else if (S.phase === 'aktion') {
      const e = S.ent;
      if (e.gefahrUm != null && !e.gefahrLos && S.phaseT >= e.gefahrUm) gefahrAusloesen();
      if (S.phaseT >= e.halten) { S.phase = 'raus'; S.phaseT = 0; }
    } else if (S.phase === 'raus') {
      if (S.phaseT >= T_RAUS) weiter();
    }
  }
  function pruefen() { S.phase = 'pruefen'; S.phaseT = 0; S.uhr = 0; S.tick = 0; }

  // art: 'plakette' | 'sperren' | 'zeit'
  function entscheiden(art) {
    const v = aktuell(), T = stufeVon(S.nr).zeit, t = Math.min(S.uhr, T);
    const defekt = v.art === 'defekt';
    let ergebnis, schild = null, punkte = 0;
    if (art === 'plakette') ergebnis = defekt ? 'gefahr' : 'richtig';
    else if (art === 'sperren') ergebnis = defekt ? 'richtig' : 'unnoetig';
    else ergebnis = defekt ? 'gefahr' : 'spaet';
    if (ergebnis === 'richtig') {
      const tempo = t <= TEMPO_VOLL * T ? 1 : klemm((T - t) / ((1 - TEMPO_VOLL) * T), 0, 1);
      punkte = JE * RICHTIG_ANTEIL + JE * (1 - RICHTIG_ANTEIL) * tempo;
      S.richtig++; S.serie++;
      if (art === 'sperren') schild = { text: v.mangel.name, art: 'mangel' };
      if (S.serie % 3 === 0) figur('daumen', 1.0, true);
    } else {
      S.serie = 0;
      if (ergebnis === 'unnoetig') { S.unnoetig++; schild = { text: v.art === 'spuren' ? 'Nur Gebrauchsspuren' : 'War in Ordnung', art: 'neutral' }; R_.ton('unnoetig'); }
      if (ergebnis === 'spaet') { S.spaet++; schild = { text: 'Zu langsam', art: 'neutral' }; R_.ton('unnoetig'); }
      if (ergebnis === 'gefahr') { S.gefahren++; schild = { text: v.mangel.name, art: 'gefahr' }; }
    }
    if (art !== 'zeit') S.zeiten.push(t);
    if (art === 'plakette') R_.ton('plakette');
    if (art === 'sperren') R_.ton('sperren');
    S.punkte += punkte;
    S.ent = {
      art, ergebnis, t, punkte, schild, t0: S.zeit,
      richtung: art === 'sperren' ? -1 : 1,
      // richtige Sperrung: Mangel-Name länger lesbar (MZ, 24.10.2026: 1,2s statt 0,5s), Antippen überspringt
      halten: (art === 'sperren' && ergebnis === 'richtig' ? HALTEN_SPERRE : HALTEN[ergebnis]) * P,
      // Gefahr: mit Plakette erst, wenn sie klebt (0,22s), bei abgelaufener Zeit sofort
      gefahrUm: ergebnis === 'gefahr' ? (art === 'plakette' ? 0.22 : 0.02) : null, gefahrLos: false,
      funken: [],
    };
    S.phase = 'aktion'; S.phaseT = 0; S.wisch = null;
    anzeigen();
  }
  function gefahrAusloesen() {
    const e = S.ent;
    e.gefahrLos = true; e.gefahrT = S.zeit;
    R_.ton('gefahr'); R_.vibrieren([70, 40, 70]);
    figur('entsetzt', 1.5);
    // Funken am Mangel
    const v = aktuell(), m = geraetMass(v), o = v.mangel.ort;
    const fx = m.x + o[0] * m.w, fy = m.y + o[1] * m.h;
    e.fx = fx; e.fy = fy;
    if (!ruhig()) for (let i = 0; i < 26; i++) {
      const w = zufall(0, Math.PI * 2), sp = zufall(80, 330) * Math.max(0.8, L.kurz / 500);
      e.funken.push({ x: fx, y: fy, vx: Math.cos(w) * sp, vy: Math.sin(w) * sp - 80, t0: S.zeit, dauer: zufall(0.25, 0.6) });
    }
  }
  function weiter() {
    S.ent = null;
    if (S.gefahren >= GEFAHR_MAX) return beenden(true);
    S.nr++;
    if (S.nr >= ANZAHL) {
      S.nr = ANZAHL - 1;
      R_.ton('geschafft');
      return beenden(false);
    }
    S.phase = 'warten'; S.phaseT = 0;
    anzeigen();
  }
  function figur(pose, dauer, hupf) { S.figur.pose = pose; S.figur.bis = S.zeit + dauer; if (hupf) S.figur.hupf = S.zeit; }

  function bewertung(p) {
    if (p >= 900) return ['Alles sicher geprüft', 'GEPRÜFT', 'gut', 'jubel'];
    if (p >= 800) return ['Geprüfte Sicherheit', 'GEPRÜFT', 'gut', 'jubel'];
    if (p >= 700) return ['Gut geprüft', 'GEPRÜFT', 'gut', 'daumen'];
    if (p >= 550) return ['Lückenhaft geprüft', 'MIT MÄNGELN', 'mittel', 'daumen'];
    return ['Nachprüfung nötig', 'MÄNGEL', 'schlecht', 'entsetzt'];
  }
  function beenden(abbruch) {
    S.fertig = true; S.phase = 'fertig';
    if (abbruch) {
      R_.ton('abbruch');
      return endbild(0, true);
    }
    const p = Math.max(1, Math.min(1000, Math.round(S.punkte)));
    if (p >= 800) figur('jubel', 3, true);
    endbild(p, false);
  }
  function endbild(punkte, abbruch) {
    const [titel, stempel, art, pose] = abbruch ? ['Zu viele Gefahren durchgewinkt', 'MÄNGEL', 'schlecht', 'entsetzt'] : bewertung(punkte);
    const geprueft = S.richtig + S.gefahren + S.unnoetig + S.spaet;
    const felder = abbruch ? [['Geprüft', geprueft + ' von ' + ANZAHL]] : [['Richtig entschieden', S.richtig + ' von ' + ANZAHL]];
    felder.push(['Gefahren durchgewinkt', String(S.gefahren)]);
    if (!abbruch || S.unnoetig) felder.push(['Unnötig gesperrt', String(S.unnoetig)]);
    if (S.spaet) felder.push(['Zu langsam', String(S.spaet)]);
    if (S.zeiten.length) felder.push(['Ø Entscheidung', sek(S.zeiten.reduce((a, b) => a + b, 0) / S.zeiten.length)]);
    R_.ende(punkte, { ueberschrift: titel, felder, stempel: { text: stempel, art }, figur: POSEN[pose], verzoegerung: abbruch ? 900 : 1100 });
  }
  // Testhilfe #ende=…: Endbild mit ausgedachten Werten (Bilanz passend zu den Punkten)
  function testEnde() {
    S.fertig = true;
    if (TEST.ende === 'verloren') {
      S.richtig = 11; S.gefahren = 3; S.unnoetig = 0; S.zeiten = [1.7, 1.4, 2.1, 1.2];
      return endbild(0, true);
    }
    const p = Math.max(1, Math.min(1000, +TEST.ende));
    S.richtig = Math.min(ANZAHL, Math.round(ANZAHL * Math.min(1, p / 960)));
    S.gefahren = p >= 900 ? 0 : p >= 550 ? 1 : 2;
    const rest = Math.max(0, ANZAHL - S.richtig - S.gefahren);
    S.unnoetig = Math.ceil(rest / 2); S.spaet = rest - S.unnoetig;
    S.zeiten = [p >= 900 ? 1.1 : p >= 550 ? 1.6 : 2.2];
    endbild(p, false);
  }

  // ---------- Eingabe ----------
  const inKnopf = (x, y, r) => x >= r[0] - 4 && x <= r[0] + r[2] + 4 && y >= r[1] - 6 && y <= r[1] + r[3] + 6;
  function bereit() {
    if (S.fertig) return false;
    if (S.phase === 'rein' && S.phaseT >= T_REIN * 0.6) pruefen();   // kurz vor dem Aufsetzen schon entscheiden
    return S.phase === 'pruefen';
  }
  function runter(x, y) {
    if (!L || !S) return;
    S.klicks.push({ x, y, t0: S.zeit });
    // langes Halten nach richtiger Sperrung: Antippen überspringt
    if (S.phase === 'aktion' && S.ent && S.ent.art === 'sperren' && S.ent.ergebnis === 'richtig' && S.phaseT > 0.3 && S.ent.halten > HALTEN.richtig * P) { S.ent.halten = S.phaseT; return; }
    const k = L.knoepfe;
    const welcher = inKnopf(x, y, k.sperren) ? 'sperren' : inKnopf(x, y, k.plakette) ? 'plakette' : null;
    if (welcher) {
      S.gedrueckt = { welcher, t0: S.zeit };
      if (bereit()) entscheiden(welcher);
      return;
    }
    S.wisch = { x0: x, y0: y };
  }
  function bewegen(x, y) {
    if (!S || !S.wisch) return;
    const dx = x - S.wisch.x0, dy = y - S.wisch.y0;
    S.zieh = S.phase === 'pruefen' || S.phase === 'rein' ? klemm(dx * 0.5, -60, 60) : 0;
    if (Math.abs(dx) > Math.max(46, B * 0.1) && Math.abs(dx) > Math.abs(dy) * 1.2) {
      S.wisch = null;
      if (bereit()) entscheiden(dx < 0 ? 'sperren' : 'plakette');
      else S.zieh = 0;
    }
  }
  function hoch() { if (S) { S.wisch = null; } }
  addEventListener('keydown', e => {
    if (R_.zustand !== 'spiel' || !S || e.repeat) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const welcher = e.key === 'ArrowLeft' ? 'sperren' : 'plakette';
    S.gedrueckt = { welcher, t0: S.zeit };
    if (bereit()) entscheiden(welcher);
  });

  // ---------- Zeichnen ----------
  function zeichne(g, b, h, zustand, dt) {
    if (b !== B || h !== H || !L) groesse(b, h);
    if (!S) neu();
    const ruh = ruhig(), t = S.zeit;
    S.dtZ = dt;
    // Leerlauf der Zeit vor dem Spiel (Himmel lebt auch hinter dem Startbild)
    if (zustand !== 'spiel') S.zeit += dt;
    g.fillStyle = '#2b2f33'; g.fillRect(0, 0, B, H);
    himmelZeichnen(g, t, ruh);
    if (werkstatt) g.drawImage(werkstatt, L.ox, L.oy, WERK.b * L.s, WERK.h * L.s);
    if (zustand === 'spiel' || zustand === 'ende') {
      geraetZeichnen(g, t, ruh);
      if (S.phase === 'pruefen' || S.phase === 'rein') zeitbalken(g, t, ruh);
      schildZeichnen(g, t, ruh);
    }
    figurZeichnen(g, zustand, ruh);
    if (zustand === 'spiel') {
      knoepfeZeichnen(g, t, ruh);
      gefahrenZeichnen(g);
      klicksZeichnen(g);
    }
    g.canvas.style.cursor = zustand === 'spiel' ? 'pointer' : '';
  }

  // ---------- Himmel im Fenster (eigener Gewitter-Himmel: Wall Cloud, blaugrau) ----------
  // Lebendig wie in den anderen Spielen, aber dezent (nur im Fenster): Grundbild ruhig, zwei Wolkenschichten ziehen nach
  // links (hinten 8 %, vorn 14 % der Bildbreite pro Minute, vorn größer), die vordere brodelt leicht; alle 6–12s fernes
  // Wetterleuchten im Fenster, manchmal mit dünnem fernem Blitz. Bei „Bewegung reduzieren“ steht alles.
  const SCHICHTEN = [{ tempo: 0.08, groesse: 1.0, deckkraft: 0.5, start: 0.2 }, { tempo: 0.14, groesse: 1.3, deckkraft: 0.55, start: 0.63 }];
  function wolkenEbene(img) {
    // Wolkenbild mit Spiegelbild nahtlos aneinander (endloses Ziehen), unten weich ausgeblendet (Häuser bleiben ruhig)
    const f = 0.5, w = Math.round(img.naturalWidth * f), h = Math.round(HIMMEL.horizont * f);
    const c = document.createElement('canvas');
    c.width = 2 * w; c.height = h;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, img.naturalWidth, HIMMEL.horizont, 0, 0, w, h);
    x.save(); x.translate(2 * w, 0); x.scale(-1, 1); x.drawImage(img, 0, 0, img.naturalWidth, HIMMEL.horizont, 0, 0, w, h); x.restore();
    x.globalCompositeOperation = 'destination-in';
    const v = x.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, '#000'); v.addColorStop(HIMMEL.wolkenBis * 0.8 / HIMMEL.horizont, '#000'); v.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = v; x.fillRect(0, 0, c.width, h);
    return c;
  }
  function himmelZeichnen(g, t, ruh) {
    const img = bilder.himmel;
    if (!img) return;
    const [fx, fy, fw, fh] = L.fenster;
    // Himmel etwas breiter als das Fenster; Häuser des Bildes unten im Fenster
    const w = fw * 1.18, h = w * HIMMEL.h / HIMMEL.b, x0 = fx - (w - fw) / 2, y0 = fy + fh + fh * 0.04 - h;
    g.save();
    g.beginPath(); g.rect(fx - 4, fy - 4, fw + 8, fh + 8); g.clip();
    g.drawImage(img, x0, y0, w, h);
    if (wolken && !ruh) {
      SCHICHTEN.forEach((sch, i) => {
        const ww = w * sch.groesse * (i ? 1 + 0.012 * Math.sin(t * 2 * Math.PI / 17) : 1);
        const hh = (HIMMEL.horizont / HIMMEL.h) * h * sch.groesse * (i ? 1 + 0.02 * Math.sin(t * 2 * Math.PI / 11 + 1) : 1);
        const breite = 2 * ww;   // Ebene = Bild + Spiegelbild
        const weg = ((sch.start + t * sch.tempo / 60) % 2) * ww;
        g.globalAlpha = sch.deckkraft;
        for (let k = -1; k <= 1; k++) g.drawImage(wolken, x0 - weg + k * breite, y0 - (hh - (HIMMEL.horizont / HIMMEL.h) * h) * 0.6, breite, hh);
      });
      g.globalAlpha = 1;
    }
    // fernes Wetterleuchten / ferner Blitz
    if (!ruh) {
      if (!S.leuchten && t >= S.leuchtenUm) {
        S.leuchtenUm = t + zufall(6, 12);
        const lx = fx + fw * zufall(0.12, 0.88), ly = fy + fh * zufall(0.25, 0.6);
        S.leuchten = { t0: t, x: lx, y: ly, r: fw * zufall(0.35, 0.55), blitz: Math.random() < 0.35 ? blitzPfad(lx, fy + fh * 0.1, fy + fh * 0.88) : null };
      }
      if (S.leuchten) {
        const p = t - S.leuchten.t0, Lt = S.leuchten;
        if (p > 1.0) S.leuchten = null;
        else {
          const a = 0.26 * Math.max(Math.exp(-p * 9), p > 0.22 ? Math.exp(-(p - 0.22) * 8) * 0.7 : 0);
          const rg = g.createRadialGradient(Lt.x, Lt.y, 0, Lt.x, Lt.y, Lt.r);
          rg.addColorStop(0, `rgba(225,232,255,${a})`); rg.addColorStop(1, 'rgba(200,215,255,0)');
          g.globalCompositeOperation = 'lighter'; g.fillStyle = rg; g.fillRect(Lt.x - Lt.r, Lt.y - Lt.r, 2 * Lt.r, 2 * Lt.r);
          if (Lt.blitz && (p < 0.07 || (p > 0.13 && p < 0.2))) {
            g.lineJoin = 'round'; g.lineCap = 'round';
            [[3.2, 'rgba(170,190,255,.25)'], [1.1, 'rgba(240,245,255,.75)']].forEach(([lw, fa]) => {
              g.lineWidth = lw * Math.max(1, L.s * 1.2); g.strokeStyle = fa; g.beginPath();
              Lt.blitz.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke();
            });
          }
          g.globalCompositeOperation = 'source-over';
        }
      }
    }
    g.restore();
  }
  function blitzPfad(x, y0, y1) {
    const pts = [[x, y0]], n = 8;
    for (let i = 1; i <= n; i++) { x += zufall(-0.025, 0.025) * L.fenster[2]; pts.push([x, y0 + (y1 - y0) * i / n]); }
    return pts;
  }

  // ---------- Gerät, Plakette, Anhänger, Funken ----------
  // Prüfaufkleber (Code): rund, Kundenfarbe, „GEPRÜFT“ und nächster Prüftermin MM/JJ (heute + 12 Monate), ohne Logo
  const termin = (() => { const d = new Date(); return String(d.getMonth() + 1).padStart(2, '0') + '/' + String((d.getFullYear() + 1) % 100).padStart(2, '0'); })();
  let plakettenBild = null;
  function plakette() {
    if (plakettenBild) return plakettenBild;
    const n = 160, c = document.createElement('canvas'); c.width = c.height = n;
    const x = c.getContext('2d'), r = n / 2 - 3, gelb = (R_.farben && R_.farben.haupt) || '#FFD500';
    x.translate(n / 2, n / 2);
    x.fillStyle = gelb; x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fill();
    x.lineWidth = 2; x.strokeStyle = 'rgba(0,0,0,.25)'; x.stroke();
    // Monatsring (12 Felder) wie bei echten Prüfplaketten
    x.strokeStyle = '#191919'; x.lineWidth = 2.2; x.beginPath(); x.arc(0, 0, r * 0.8, 0, Math.PI * 2); x.stroke();
    for (let i = 0; i < 12; i++) {
      const w = -Math.PI / 2 + i * Math.PI / 6;
      x.beginPath(); x.moveTo(Math.cos(w) * r * 0.8, Math.sin(w) * r * 0.8); x.lineTo(Math.cos(w) * r * 0.95, Math.sin(w) * r * 0.95); x.stroke();
    }
    x.fillStyle = '#191919'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '700 ' + Math.round(r * 0.3) + 'px ' + SCHRIFT; x.fillText('GEPRÜFT', 0, -r * 0.22);
    x.font = '700 ' + Math.round(r * 0.42) + 'px ' + SCHRIFT; x.fillText(termin, 0, r * 0.25);
    // Glanz
    const gl = x.createLinearGradient(-r, -r, r, r);
    gl.addColorStop(0, 'rgba(255,255,255,.35)'); gl.addColorStop(0.45, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,.08)');
    x.fillStyle = gl; x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fill();
    plakettenBild = c;
    return c;
  }
  function geraetZeichnen(g, t, ruh) {
    if (S.phase === 'warten' || S.phase === 'fertig' && !S.ent) return;
    const v = aktuell(), img = bilder[v.key];
    if (!img) return;
    const m = geraetMass(v), e = S.ent;
    let dx = S.zieh, dy = 0, sk = 1, alpha = 1, sq = 1;
    if (S.phase === 'rein') {
      const q = glatt(S.phaseT / T_REIN);
      if (ruh) alpha = q;
      else { dy = -(1 - q) * Math.min(80, m.h * 0.35); sk = 0.82 + 0.18 * q; alpha = Math.min(1, q * 1.6); }
    }
    if (S.phase === 'raus' && e) {
      const q = S.phaseT / T_RAUS;
      if (ruh) alpha = 1 - q;
      else dx = e.richtung * q * q * (B / 2 + m.w);
    }
    if (S.zieh && S.phase !== 'pruefen' && S.phase !== 'rein') S.zieh *= 0.8;
    // kurzes Einsinken beim Aufkleben der Plakette
    if (e && e.art === 'plakette' && !ruh) { const p = S.zeit - e.t0 - 0.12; if (p > 0 && p < 0.16) sq = 1 - 0.025 * Math.sin(p / 0.16 * Math.PI); }
    const cx = L.cx + dx, fy = m.stand + dy;
    g.save();
    g.globalAlpha = alpha;
    // Schatten an der Standfläche: weicher Schatten dezent, dazu ein schmaler, dunkler Kontaktschatten genau an der Auflage
    const ax0 = m.auf0 + dx, ax1 = m.auf1 + dx, acx = (ax0 + ax1) / 2, arw = Math.max(8, (ax1 - ax0) / 2) * sk;
    g.save(); g.translate(acx, fy); g.scale(1, 0.16);
    let rg = g.createRadialGradient(0, 0, 0, 0, 0, arw * 1.3);
    rg.addColorStop(0, 'rgba(0,0,0,.24)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(-arw * 1.3, -arw * 1.3, arw * 2.6, arw * 2.6); g.restore();
    g.save(); g.translate(acx, fy); g.scale(1, 0.05);
    rg = g.createRadialGradient(0, 0, 0, 0, 0, arw * 1.02);
    rg.addColorStop(0, 'rgba(0,0,0,.6)'); rg.addColorStop(0.7, 'rgba(0,0,0,.42)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(-arw * 1.05, -arw * 1.05, arw * 2.1, arw * 2.1); g.restore();
    // Gerät (skaliert um die Standfläche)
    g.translate(cx, fy); g.scale(sk, sk * sq); g.translate(-L.cx, -m.stand);
    g.drawImage(img, m.x, m.y, m.w, m.h);
    if (e) {
      if (e.art === 'plakette') plaketteZeichnen(g, v, m, e, ruh);
      if (e.art === 'sperren') anhaengerZeichnen(g, v, m, e, ruh);
      if (e.gefahrLos) gefahrZeichnen(g, m, e, ruh);
    }
    g.restore();
  }
  function plaketteZeichnen(g, v, m, e, ruh) {
    const ge = GERAETE[v.gi], [ax, ay] = ge.plakette;
    const x = m.x + ax * m.w, y = m.y + ay * m.h, r = klemm(Math.min(m.w, m.h) * 0.13, 15, 34);
    const p = S.zeit - e.t0, q = ruh ? 1 : glatt(p / 0.16);
    if (p < 0) return;
    const s2 = ruh ? 1 : 1 + 0.9 * (1 - q), a = ruh ? Math.min(1, p / 0.15) : Math.min(1, q * 1.4);
    g.save(); g.globalAlpha *= a;
    g.translate(x, y); g.rotate(-0.14 + 0.06 * (1 - q)); g.scale(s2, s2);
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 6 * (1 - q) + 2; g.shadowOffsetY = 2 + 8 * (1 - q);
    g.drawImage(plakette(), -r, -r, 2 * r, 2 * r);
    g.restore();
    // Stempel-Ring beim Aufsetzen
    if (!ruh && p > 0.14 && p < 0.5) {
      const k = (p - 0.14) / 0.36;
      g.save(); g.globalAlpha *= (1 - k) * 0.7; g.strokeStyle = '#fff'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(x, y, r * (1.05 + 0.7 * k), 0, Math.PI * 2); g.stroke(); g.restore();
    }
  }
  // Sperr-Anhänger mit Kabelbinder: fällt von oben an die Befestigung, pendelt gedämpft aus
  function anhaengerZeichnen(g, v, m, e, ruh) {
    const ge = GERAETE[v.gi], [ax, ay] = ge.anhaenger;
    const x = m.x + ax * m.w, y = m.y + ay * m.h;
    const p = S.zeit - e.t0;
    const tw = klemm(m.w * 0.36, 58, 104), th = tw * 0.46, schnur = tw * 0.32;
    const q = ruh ? 1 : glatt(p / 0.2);
    const winkel = ruh ? 0.08 : 0.08 + 0.45 * Math.exp(-p * 4.5) * Math.sin(p * 13);
    g.save();
    g.globalAlpha *= ruh ? Math.min(1, p / 0.15) : Math.min(1, q * 1.5);
    g.translate(x, y - (1 - q) * 40);
    // Kabelbinder-Schlaufe um die Befestigung
    g.lineWidth = Math.max(2, tw * 0.04); g.strokeStyle = '#f2f2ee';
    g.beginPath(); g.ellipse(0, 0, Math.max(5, tw * 0.09), Math.max(3.5, tw * 0.06), 0.2, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 1; g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke();
    g.rotate(winkel);
    // Schnur zum Anhänger
    g.lineWidth = Math.max(1.6, tw * 0.03); g.strokeStyle = '#f2f2ee';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, schnur); g.stroke();
    // Anhänger
    g.translate(0, schnur);
    g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 6; g.shadowOffsetY = 3;
    g.fillStyle = '#d3241c';
    g.beginPath();
    g.moveTo(-tw * 0.32, 0); g.lineTo(tw * 0.32, 0); g.lineTo(tw / 2, th * 0.3); g.lineTo(tw / 2, th); g.lineTo(-tw / 2, th); g.lineTo(-tw / 2, th * 0.3); g.closePath();
    g.fill();
    g.shadowColor = 'transparent';
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0, th * 0.17, Math.max(2, tw * 0.035), 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = Math.max(1, tw * 0.018);
    g.strokeRect(-tw / 2 + tw * 0.06, th * 0.36, tw * 0.88, th * 0.54);
    g.font = '800 ' + Math.round(tw * 0.15) + 'px ' + SCHRIFT; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('GESPERRT', 0, th * 0.64);
    g.restore();
  }
  function gefahrZeichnen(g, m, e, ruh) {
    const p = S.zeit - e.gefahrT;
    // Lichtblitz am Mangel
    if (p < 0.5) {
      const a = ruh ? 0.5 * (1 - p / 0.5) : (p < 0.06 ? 1 : p < 0.12 ? 0.4 : p < 0.18 ? 0.85 : Math.max(0, 0.85 - (p - 0.18) * 2.6));
      const r = Math.max(40, Math.min(m.w, m.h) * 0.45);
      const rg = g.createRadialGradient(e.fx, e.fy, 0, e.fx, e.fy, r);
      rg.addColorStop(0, `rgba(255,255,255,${a})`); rg.addColorStop(0.25, `rgba(150,195,255,${0.7 * a})`); rg.addColorStop(1, 'rgba(90,140,255,0)');
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg; g.fillRect(e.fx - r, e.fy - r, 2 * r, 2 * r); g.restore();
      // kurze Zickzack-Entladung
      if (!ruh && p < 0.3 && (p < 0.08 || p > 0.14)) {
        g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
        for (let k = 0; k < 3; k++) {
          const w = (k / 3) * Math.PI * 2 + e.gefahrT * 7, l = r * 0.6;
          g.strokeStyle = 'rgba(210,230,255,.9)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(e.fx, e.fy);
          for (let i = 1; i <= 4; i++) g.lineTo(e.fx + Math.cos(w) * l * i / 4 + zufall(-5, 5), e.fy + Math.sin(w) * l * i / 4 + zufall(-5, 5));
          g.stroke();
        }
        g.restore();
      }
    }
    // Funken
    const dt = S.dtZ || 1 / 60;
    e.funken = e.funken.filter(f => S.zeit - f.t0 < f.dauer);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    e.funken.forEach(f => {
      const a = 1 - (S.zeit - f.t0) / f.dauer;
      f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt;
      g.strokeStyle = `rgba(255,${Math.round(200 + 55 * a)},${Math.round(120 * a)},${a})`; g.lineWidth = 2;
      g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x - f.vx * 0.025, f.y - f.vy * 0.025); g.stroke();
    });
    g.restore();
  }

  // Bedenkzeit als Balken unter dem Gerät; letzte Sekunde bernstein und pulsierend (dazu Tempo-Tick)
  function zeitbalken(g, t, ruh) {
    const v = aktuell(), m = geraetMass(v), T = stufeVon(S.nr).zeit;
    const rest = S.phase === 'rein' ? T : Math.max(0, T - S.uhr);
    const w = klemm(m.w * 0.8, 120, 260), h = 8, x = L.cx - w / 2 + S.zieh, y = Math.min(L.fussY + 12, L.knoepfe.sperren[1] - h - 8);
    const knapp = rest <= 1;
    const farbe = knapp ? '#ffb300' : '#ffffff';
    const puls = knapp && !ruh ? 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 0.3) : 0;
    g.save();
    g.globalAlpha = S.phase === 'rein' ? glatt(S.phaseT / T_REIN) : 1;
    g.fillStyle = 'rgba(0,0,0,.5)'; rund(g, x - 2, y - 2, w + 4, h + 4, (h + 4) / 2); g.fill();
    if (puls) { g.shadowColor = farbe; g.shadowBlur = 4 + 8 * puls; }
    g.fillStyle = farbe; rund(g, x, y, Math.max(h, w * rest / T), h, h / 2); g.fill();
    g.restore();
  }
  // Rückmeldung: Schild über dem Gerät (ca. 0,85s)
  function schildZeichnen(g, t, ruh) {
    const e = S.ent;
    if (!e || !e.schild) return;
    const p = S.zeit - e.t0 - (e.ergebnis === 'gefahr' ? e.gefahrUm : 0.08);
    const dauer = e.ergebnis === 'gefahr' ? SCHILD_DAUER + 0.35 : e.art === 'sperren' && e.ergebnis === 'richtig' ? Math.min(e.halten + T_RAUS * 0.5, HALTEN_SPERRE + 0.3) : SCHILD_DAUER;
    if (p < 0 || p > dauer) return;
    const a = Math.min(1, p / 0.12, (dauer - p) / 0.18);
    const v = aktuell(), m = geraetMass(v);
    const fs = L.kurz < 420 ? 15 : 17;
    g.save();
    g.font = '700 ' + fs + 'px ' + SCHRIFT;
    const art = e.schild.art, icon = art === 'gefahr' ? 22 : 0;
    const text = e.schild.text, tw = g.measureText(text).width, w = tw + 28 + icon, hh = fs + 17;
    const x = klemm(L.cx - w / 2, 8, B - w - 8);
    const y = klemm(m.y - hh - 12 - (ruh ? 0 : 6 * (1 - Math.min(1, p / 0.15))), OBEN, L.fussY - hh - 20);
    g.globalAlpha = a;
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 12; g.shadowOffsetY = 3;
    g.fillStyle = '#fff'; rund(g, x, y, w, hh, 6); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = art === 'gefahr' ? '#d3241c' : art === 'mangel' ? '#FFD500' : '#9a9a9a';
    g.fillRect(x + 7, y + 4, w - 14, 3);
    if (icon) warnzeichen(g, x + 19, y + hh / 2 + 2, 9, true);
    g.fillStyle = art === 'gefahr' ? '#b3261e' : '#191919'; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.fillText(text, x + w / 2 + icon / 2, y + hh / 2 + 2);
    g.restore();
  }
  // Warnzeichen „Gefährliche elektrische Spannung“ (Dreieck mit Blitz)
  function warnzeichen(g, x, y, r, voll) {
    g.save(); g.translate(x, y);
    g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 1.05, r * 0.82); g.lineTo(-r * 1.05, r * 0.82); g.closePath();
    g.lineJoin = 'round';
    if (voll) { g.fillStyle = '#FFD500'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = '#191919'; g.stroke(); }
    else { g.fillStyle = 'rgba(0,0,0,.25)'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke(); }
    if (voll) {
      g.fillStyle = '#191919'; g.beginPath();
      g.moveTo(r * 0.12, -r * 0.5); g.lineTo(-r * 0.26, r * 0.18); g.lineTo(-r * 0.02, r * 0.18); g.lineTo(-r * 0.14, r * 0.66);
      g.lineTo(r * 0.28, -r * 0.02); g.lineTo(r * 0.04, -r * 0.02); g.closePath(); g.fill();
    }
    g.restore();
  }
  // Gefahren unter der Anzeige oben links: „Gefahren“ und drei Warnzeichen (eingetreten = gefüllt)
  function gefahrenZeichnen(g) {
    const x = 12, y = 60, r = 8;
    g.save();
    g.font = '700 13px ' + SCHRIFT; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 4;
    g.fillStyle = '#fff'; g.fillText('Gefahren', x, y);
    const x0 = x + g.measureText('Gefahren').width + 10 + r;
    g.shadowColor = 'transparent';
    for (let i = 0; i < GEFAHR_MAX; i++) warnzeichen(g, x0 + i * (2 * r + 7), y, r, i < S.gefahren);
    g.restore();
  }
  // Zwei Knöpfe unten: links „Sperren“ (Lila), rechts „Plakette“ (Blau) – Markenfarben nur als Akzent
  function knoepfeZeichnen(g, t, ruh) {
    const k = L.knoepfe, aktiv = S.phase === 'pruefen' || S.phase === 'rein';
    [['sperren', '‹ Sperren', '#951B81'], ['plakette', 'Plakette ›', '#0F9CD8']].forEach(([name, text, farbe]) => {
      const [x, y, w, h] = k[name];
      const dr = S.gedrueckt && S.gedrueckt.welcher === name ? Math.max(0, 1 - (S.zeit - S.gedrueckt.t0) / 0.18) : 0;
      g.save();
      g.globalAlpha = aktiv ? 1 : 0.55;
      g.translate(x + w / 2, y + h / 2); g.scale(1 - 0.05 * dr, 1 - 0.05 * dr); g.translate(-(x + w / 2), -(y + h / 2));
      g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
      g.fillStyle = farbe; rund(g, x, y, w, h, h / 2); g.fill();
      g.shadowColor = 'transparent';
      g.fillStyle = 'rgba(255,255,255,.14)'; rund(g, x + 2, y + 2, w - 4, h * 0.45, h * 0.4); g.fill();
      g.fillStyle = '#fff'; g.font = '700 ' + Math.round(klemm(h * 0.36, 16, 22)) + 'px ' + SCHRIFT;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, x + w / 2, y + h / 2 + 1);
      g.restore();
    });
  }
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
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
    if (spiegeln) { g.translate(x + w, y); g.scale(-1, 1); g.drawImage(img, 0, 0, w, h); }
    else g.drawImage(img, x, y, w, h);
    g.restore();
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
    id: 'pruefplakette',
    wertung: 'hoch',
    format: p => p.toLocaleString('de-DE') + ' Punkte',
    hoechst: 1000,
    bereich: 'Elektroprüfung',
    hintergrund: { bild: 'bilder/start.webp', position: '50% 60%' },
    figur: POSEN.daumen,
    texte: {
      titel: 'Prüfplakette',
      untertitel: 'Erkennst du jedes defekte Gerät?',
      anleitung: 'Geräte kommen auf den Prüftisch. Ist alles in Ordnung, gib ihm die Plakette. Ist etwas beschädigt, sperre es. Je schneller, desto mehr Punkte. Drei defekte Geräte durchgewinkt? Ende!',   // MZ, 23.10.2026 (Ausrufezeichen gewollt)
    },
    // Klänge (Sound Artist, 23.10.2026, alle Sonniss GDC 2026): Einzelklänge in der Abstufung der Lieferung (nicht einzeln
    // normalisiert), Werkstatt-Schleife normalisiert und per Pegel deutlich unter den Effekten
    klaenge: {
      werkstatt: { datei: 'klaenge/werkstatt.mp3', proben: 573300, pegel: 0.3 },
      kommt: { datei: 'klaenge/kommt.mp3', proben: 13671, pegel: 0.9 },
      plakette: { datei: 'klaenge/plakette.mp3', proben: 9923, pegel: 0.9 },
      sperren: { datei: 'klaenge/sperren.mp3', proben: 17199, pegel: 0.9 },
      gefahr: { datei: 'klaenge/gefahr.mp3', proben: 17640, pegel: 0.85 },
      unnoetig: { datei: 'klaenge/unnoetig.mp3', proben: 6615, pegel: 1 },
      tempo: { datei: 'klaenge/tempo.mp3', proben: 2646, pegel: 1 },
      abbruch: { datei: 'klaenge/abbruch.mp3', proben: 41895, pegel: 0.85 },
      geschafft: { datei: 'klaenge/geschafft.mp3', proben: 26460, pegel: 0.9 },
    },
    schleife: 'werkstatt',
    neu, schritt, zeichne, runter, bewegen, hoch, groesse,
  });

  // Testhilfe (nur lesen): Zustand, Knopf-Mitten zum Antippen
  window.__pruefplakette = {
    get zustand() {
      const v = S && aktuell();
      return S && { nr: S.nr, phase: S.phase, uhr: +S.uhr.toFixed(2), bedenkzeit: stufeVon(S.nr).zeit, variante: v && v.key,
        geraet: v && GERAETE[v.gi].name, art: v && v.art, mangel: v && v.mangel ? v.mangel.name : null,
        punkte: +S.punkte.toFixed(1), richtig: S.richtig, gefahren: S.gefahren, unnoetig: S.unnoetig, spaet: S.spaet,
        zeiten: S.zeiten.slice(), fertig: S.fertig, ergebnis: S.ent && S.ent.ergebnis };
    },
    get folge() { return S && S.folge.map(v => v.key + (v.art === 'defekt' ? '*' : '')); },
    get knoepfe() { return L && Object.fromEntries(Object.entries(L.knoepfe).map(([n, r]) => [n, [Math.round(r[0] + r[2] / 2), Math.round(r[1] + r[3] / 2)]])); },
    get geraetRect() { const v = S && aktuell(); if (!v || !v.masse) return null; const m = geraetMass(v); return [m.x, m.y, m.w, m.h].map(Math.round); },
    varianten: () => VARIANTEN.map(v => ({ key: v.key, geraet: GERAETE[v.gi].name, art: v.art, mangel: v.mangel ? v.mangel.name : null, stufe: v.mangel ? v.mangel.stufe : null })),
  };
})();
