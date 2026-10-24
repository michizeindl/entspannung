// Messwert „Zeiger stoppen“ (Sammlung „entSPANNUNG“, RSI protect, Bereich Elektroprüfung) – Konzept von MZ freigegeben
// (23.10.2026): Technikraum mit Fenster (eigener Himmel: Hitzegewitter mit Amboss-Wolke), auf dem Tisch groß das gelbe
// Zeiger-Prüfgerät, daneben das Messobjekt. Je Messung zuerst die Prüfspitze an den richtigen Anschlusspunkt setzen
// (2–3 leuchtende Punkte), dann pendelt der Zeiger – Tippen stoppt ihn. Im markierten Sollbereich = bestanden.
// 20 Messungen aus 9 Messarten (jede mindestens einmal), Lernhilfe: beim ersten Auftreten einer Messart ist der richtige
// Punkt leicht hervorgehoben. Steigerung: Pendel 2,4/1,9/1,5/1,1s je Schwung, Sollbereich 25/18/13/10 % der Skala, ab
// Messung 11 zittert der Zeiger leicht, ab 16 manchmal zwei Messungen am selben Objekt direkt hintereinander.
// Punkte je Messung bis 50: 10 richtig angesetzt (beim ersten Tippen), 25 im Sollbereich, bis 15 Mittigkeit (voll im
// inneren Fünftel des Bandes, dann linear bis 0 bei 35 % der Bandbreite von der Mitte – Festlegung Developer nach
// Simulation). Daneben = Fehlmessung: wiederholen (gleiche Art, gleiches Objekt), der Treffer zählt dann ohne
// Mittigkeit. 3 Fehlmessungen = Abbruch mit 0 Punkten. Durchgespielt: mind. 1 Punkt.
//
// Testhilfen (Adresse): #ende=sieg-930 | mittel-640 | schwach-420 | verloren (nach „Los geht's“ sofort das Endbild),
//   #messung=N (mit Messung N beginnen), #art=<id> (erste Messung dieser Art, ids siehe ARTEN), #schnell (kurze Pausen),
//   #ruhig (wie „Bewegung reduzieren“). window.__messwert: Funktionen zum Abfragen (nur Test).
(function () {
  'use strict';
  const R_ = window.Rahmen;
  const hash = location.hash;
  const TEST = {
    ende: (/(?:^#|&)ende=([a-z]+-)?(\d+|verloren)/.exec(hash) || [])[2] || null,
    messung: +((/(?:^#|&)messung=(\d+)/.exec(hash) || [])[1] || 0),
    art: (/(?:^#|&)art=([a-z-]+)/.exec(hash) || [])[1] || null,
    schnell: /(?:^#|&)schnell(?![a-z])/.test(hash),
    ruhig: /(?:^#|&)ruhig(?![a-z])/.test(hash),
  };
  const ruhig = () => TEST.ruhig || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const zufall = (a, b) => a + Math.random() * (b - a);
  const wahl = l => l[Math.floor(Math.random() * l.length)];
  const mischen = l => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
  const klemm = (v, a, b) => Math.max(a, Math.min(b, v));
  const glatt = e => { e = klemm(e, 0, 1); return e * e * (3 - 2 * e); };
  const zahl = (v, d) => v.toFixed(d).replace('.', ',');
  const SCHRIFT = '"Titillium Web", "Segoe UI", system-ui, sans-serif';

  // ---------- Regeln ----------
  const ANZAHL = 20, FEHL_MAX = 3;
  const P_ANSETZEN = 10, P_TREFFER = 25, P_MITTE = 15;
  const VOLL_ANTEIL = 0.1, NULL_ANTEIL = 0.35;   // Abstand von der Bandmitte (Anteil der Bandbreite): bis 0,1 volle, ab 0,35 keine Mittigkeit
  // Stufen (bis Messung): Pendel-Dauer je Schwung (s), Sollbereich als Anteil der Skala, Zittern, Doppelmessungen
  const STUFEN = [
    { bis: 5, pendel: 2.4, band: 0.25, zittern: false },
    { bis: 10, pendel: 1.9, band: 0.18, zittern: false },
    { bis: 15, pendel: 1.5, band: 0.13, zittern: true },
    { bis: 20, pendel: 1.1, band: 0.10, zittern: true, doppel: true },
  ];
  const stufeVon = nr => STUFEN.find(st => nr < st.bis);
  const P = TEST.schnell ? 0.4 : 1;          // Faktor für Pausen
  const T_REIN = 0.42, T_RAUS = 0.34, T_SPRUNG = 0.28, T_ERGEBNIS = 1.2, T_SPERRE = 0.35;
  const KURVE = 0.35;                        // Pendel: an den Enden 0,65-fach, in der Mitte 1,35-fach der mittleren Geschwindigkeit

  // ---------- Messarten ----------
  // typ: unter (Sollbereich links), ueber (rechts), zwischen (Band irgendwo in der Mitte); punkt = richtiger Ansetzpunkt
  // (an der Unterverteilung misst man den FI am FI-Schalter – Festlegung Developer)
  const ARTEN = [
    { id: 'schutzleiterwiderstand', name: 'Schutzleiterwiderstand', typ: 'unter', g: 0.3, einheit: 'Ω', grenz: 'unter 0,3 Ω', objekte: 'metall', punkt: 'gehaeuse' },
    { id: 'isolationswiderstand', name: 'Isolationswiderstand', typ: 'ueber', g: 1, einheit: 'MΩ', grenz: 'über 1 MΩ', objekte: 'geraet', punkt: 'stift' },
    { id: 'schutzleiterstrom', name: 'Schutzleiterstrom', typ: 'unter', g: 3.5, einheit: 'mA', grenz: 'unter 3,5 mA', objekte: 'metall', punkt: 'gehaeuse' },
    { id: 'beruehrungsstrom', name: 'Berührungsstrom', typ: 'unter', g: 0.5, einheit: 'mA', grenz: 'unter 0,5 mA', objekte: 'geraet', punkt: 'gehaeuse' },
    { id: 'fi-zeit', name: 'FI-Auslösezeit', typ: 'unter', g: 300, einheit: 'ms', grenz: 'unter 300 ms', objekte: ['steckdose', 'verteiler'], punkt: 'steckdose' },
    { id: 'fi-strom', name: 'FI-Auslösestrom', typ: 'zwischen', a: 15, b: 30, einheit: 'mA', grenz: '15–30 mA', objekte: ['steckdose', 'verteiler'], punkt: 'steckdose' },
    { id: 'schleifenimpedanz', name: 'Schleifenimpedanz', typ: 'unter', g: 1.4, einheit: 'Ω', grenz: 'unter 1,4 Ω', objekte: ['steckdose'], punkt: 'steckdose' },
    { id: 'spannung', name: 'Steckdosenspannung', typ: 'zwischen', a: 207, b: 253, einheit: 'V', grenz: '207–253 V', objekte: ['steckdose', 'cee'], punkt: 'steckdose' },
    { id: 'erdung', name: 'Erdungswiderstand Blitzschutz', kurz: 'Erdungswiderstand', typ: 'unter', g: 10, einheit: 'Ω', grenz: 'unter 10 Ω', objekte: ['erder'], punkt: 'trennstelle' },
  ];
  const ART = Object.fromEntries(ARTEN.map(a => [a.id, a]));
  // Paare für Doppelmessungen am selben Objekt (ab Messung 16)
  const PAARE = [
    { arten: ['isolationswiderstand', 'beruehrungsstrom'], objekte: 'geraet' },
    { arten: ['schutzleiterwiderstand', 'isolationswiderstand'], objekte: 'metall' },
    { arten: ['schutzleiterstrom', 'isolationswiderstand'], objekte: 'metall' },
    { arten: ['schutzleiterwiderstand', 'schutzleiterstrom'], objekte: 'metall' },
    { arten: ['schleifenimpedanz', 'spannung'], objekte: ['steckdose'] },
    { arten: ['fi-zeit', 'fi-strom'], objekte: ['steckdose', 'verteiler'] },
    { arten: ['spannung', 'fi-zeit'], objekte: ['steckdose'] },
  ];
  const PUNKTNAME = { stift: 'Stift', schutz: 'Schutzkontakt', gehaeuse: 'Gehäuse', steckdose: 'Steckdose', rahmen: 'Rahmen',
    schraube: 'Schraube', klappe: 'Klappe', fi: 'FI-Schalter', ls: 'LS-Schalter', trennstelle: 'Trennstelle',
    ableitung: 'Ableitung', erdeinfuehrung: 'Erdeinführung' };
  const ORT = { gehaeuse: 'am Gehäuse', stift: 'am Stift', steckdose: 'an der Steckdose', fi: 'am FI-Schalter', trennstelle: 'an der Trennstelle' };

  // Standfläche der Geräte (gemeinsame Tabelle mit Prüfplakette und Sicherungskasten, Skript
  // Material/Bilder/pruefplakette-skripte/standlinie.py): [Standlinie, Auflage von, bis] als Anteil des Zuschnitts
  // STANDLINIE-ANFANG (automatisch eingetragen, nicht von Hand ändern)
  const STANDLINIE = {"01-0-0":[0.83,0.1,0.74],"01-0-1":[0.83,0.1,0.74],"01-0-2":[0.83,0.1,0.74],"01-0-3":[0.83,0.1,0.74],"01-1-0":[0.853,0.13,0.646],"01-1-1":[0.853,0.13,0.65],"01-1-2":[0.853,0.13,0.646],"01-1-3":[0.853,0.13,0.646],"02-0-0":[0.724,0.068,0.576],"02-0-1":[0.724,0.068,0.574],"02-0-2":[0.724,0.071,0.577],"02-0-3":[0.724,0.068,0.58],"02-1-0":[0.7,0.4,0.54],"02-1-1":[0.7,0.4,0.54],"02-1-2":[0.7,0.4,0.54],"02-1-3":[0.7,0.4,0.54],"03-0-0":[0.79,0.26,0.4],"03-0-1":[0.79,0.26,0.4],"03-0-2":[0.79,0.26,0.4],"03-0-3":[0.79,0.26,0.4],"03-1-0":[0.67,0.03,0.91],"03-1-1":[0.67,0.03,0.91],"03-1-2":[0.67,0.03,0.91],"03-1-3":[0.67,0.03,0.91],"04-0-0":[0.66,0.05,0.55],"04-0-1":[0.66,0.05,0.55],"04-0-2":[0.66,0.05,0.55],"04-0-3":[0.66,0.05,0.55],"04-1-0":[0.76,0.1,0.92],"04-1-1":[0.76,0.1,0.92],"04-1-2":[0.76,0.1,0.92],"04-1-3":[0.76,0.1,0.92],"05-0-0":[0.72,0.1,0.9],"05-0-1":[0.72,0.1,0.9],"05-0-2":[0.72,0.1,0.9],"05-0-3":[0.72,0.1,0.9],"05-1-0":[0.74,0.08,0.98],"05-1-1":[0.74,0.08,0.98],"05-1-2":[0.76,0.05,0.98],"05-1-3":[0.74,0.08,0.98],"06-0-0":[0.797,0.192,0.766],"06-0-1":[0.8,0.18,0.765],"06-0-2":[0.797,0.192,0.75],"06-0-3":[0.8,0.185,0.757],"06-1-0":[0.62,0.25,0.75],"06-1-1":[0.62,0.25,0.75],"06-1-2":[0.62,0.25,0.75],"06-1-3":[0.62,0.25,0.75],"07-0-0":[0.653,0.225,0.857],"07-0-1":[0.658,0.278,0.852],"07-0-2":[0.666,0.298,0.987],"07-0-3":[0.647,0.202,0.864],"07-1-0":[0.78,0.31,0.85],"07-1-1":[0.78,0.31,0.85],"07-1-2":[0.78,0.31,0.85],"07-1-3":[0.78,0.31,0.85],"08-0-0":[0.813,0.225,0.802],"08-0-1":[0.813,0.22,0.799],"08-0-2":[0.811,0.225,0.833],"08-0-3":[0.811,0.217,0.791],"08-1-0":[0.721,0.1,0.829],"08-1-1":[0.721,0.097,0.829],"08-1-2":[0.721,0.073,0.847],"08-1-3":[0.721,0.095,0.841],"09-0-0":[0.537,0.09,0.854],"09-0-1":[0.534,0.093,0.867],"09-0-2":[0.529,0.092,0.87],"09-0-3":[0.532,0.091,0.864],"09-1-0":[0.67,0.2,0.95],"09-1-1":[0.67,0.2,0.95],"09-1-2":[0.67,0.2,0.95],"09-1-3":[0.67,0.2,0.95],"10-0-0":[0.71,0.09,0.95],"10-0-1":[0.71,0.09,0.95],"10-0-2":[0.71,0.09,0.95],"10-0-3":[0.71,0.09,0.95],"10-1-0":[0.76,0.02,0.75],"10-1-1":[0.76,0.02,0.75],"10-1-2":[0.76,0.02,0.75],"10-1-3":[0.76,0.02,0.75],"leuchte":[0.97,0.02,0.98],"kuehlschrank":[0.985,0.08,0.95]};
  // STANDLINIE-ENDE

  // ---------- Messobjekte ----------
  // Geräte aus Prüfplakette (intakte Variante, bilder/g-BB-R-0.webp) und zwei Geräte aus messwert-objekte.png.
  // Punkte als Anteil des Zuschnitts [x, y] (am Bild abgemessen, 24.10.2026): stift = Steckerstift, schutz = Schutzkontakt
  // am Stecker, gehaeuse = blanke Metallstelle/Schraube bzw. Gehäuse. metall = Gerät mit leitfähigem Gehäuse
  // (Schutzklasse I) – nur diese bekommen Schutzleiterwiderstand und -strom. stecker: Stecker per Code gezeichnet.
  const OBJEKTE = {
    'g-01-0': { name: 'Wasserkocher', metall: true, p: { stift: [0.92, 0.905], schutz: [0.84, 0.95], gehaeuse: [0.40, 0.45] } },
    'g-01-1': { name: 'Kaffeemaschine', metall: true, p: { stift: [0.86, 0.895], schutz: [0.73, 0.95], gehaeuse: [0.78, 0.50] } },
    'g-02-0': { name: 'Toaster', metall: true, p: { stift: [0.15, 0.905], schutz: [0.30, 0.86], gehaeuse: [0.62, 0.45] } },
    'g-02-1': { name: 'Föhn', p: { stift: [0.08, 0.905], schutz: [0.18, 0.84], gehaeuse: [0.55, 0.25] } },
    'g-03-0': { name: 'Bohrmaschine', p: { stift: [0.90, 0.855], schutz: [0.80, 0.90], gehaeuse: [0.55, 0.12] } },
    'g-03-1': { name: 'Akku-Ladegerät', p: { stift: [0.88, 0.865], schutz: [0.78, 0.92], gehaeuse: [0.50, 0.40] } },
    'g-04-0': { name: 'Winkelschleifer', p: { stift: [0.66, 0.86], schutz: [0.55, 0.88], gehaeuse: [0.20, 0.38] } },
    'g-04-1': { name: 'Kabeltrommel', metall: true, p: { stift: [0.30, 0.89], schutz: [0.45, 0.86], gehaeuse: [0.12, 0.70] } },
    'g-05-0': { name: 'Verlängerungskabel', p: { stift: [0.88, 0.795], schutz: [0.73, 0.70], gehaeuse: [0.82, 0.25] } },
    'g-05-1': { name: 'Steckdosenleiste', p: { stift: [0.74, 0.84], schutz: [0.62, 0.74], gehaeuse: [0.62, 0.30] } },
    'g-06-0': { name: 'Monitor', p: { stift: [0.86, 0.895], schutz: [0.68, 0.92], gehaeuse: [0.48, 0.72] } },
    'g-06-1': { name: 'Laptop-Netzteil', p: { stift: [0.50, 0.81], schutz: [0.36, 0.63], gehaeuse: [0.55, 0.30] } },
    'g-07-0': { name: 'Drucker', p: { stift: [0.47, 0.875], schutz: [0.33, 0.84], gehaeuse: [0.70, 0.45] } },
    'g-07-1': { name: 'Schreibtischlampe', metall: true, p: { stift: [0.42, 0.915], schutz: [0.30, 0.88], gehaeuse: [0.62, 0.68] } },
    'g-08-0': { name: 'Ventilator', p: { stift: [0.90, 0.865], schutz: [0.78, 0.85], gehaeuse: [0.35, 0.25] } },
    'g-08-1': { name: 'Heizlüfter', p: { stift: [0.92, 0.86], schutz: [0.80, 0.86], gehaeuse: [0.30, 0.65] } },
    'g-09-0': { name: 'Lötstation', metall: true, p: { stift: [0.78, 0.875], schutz: [0.62, 0.80], gehaeuse: [0.20, 0.25] } },
    'g-09-1': { name: 'Staubsauger', p: { stift: [0.82, 0.88], schutz: [0.68, 0.82], gehaeuse: [0.55, 0.45] } },
    'g-10-0': { name: 'Baustrahler', metall: true, p: { stift: [0.72, 0.87], schutz: [0.58, 0.80], gehaeuse: [0.25, 0.08] } },
    'g-10-1': { name: 'Mini-Kühlschrank', metall: true, p: { stift: [0.90, 0.905], schutz: [0.78, 0.88], gehaeuse: [0.50, 0.30] } },
    leuchte: { name: 'Langfeldleuchte', metall: true, stecker: true, p: { gehaeuse: [0.55, 0.36] } },
    kuehlschrank: { name: 'Getränkekühlschrank', metall: true, stecker: true, p: { gehaeuse: [0.07, 0.42] } },
    // Wandobjekte (auf einer Prüftafel): Steckdose, CEE-Dose, Unterverteilung (Hebel #00FF00 → Kundenfarbe), Erder-Messstelle
    steckdose: { name: 'Steckdose', wand: true, p: { steckdose: [0.50, 0.33], schraube: [0.52, 0.52], rahmen: [0.22, 0.80] } },
    cee: { name: 'CEE-Dose', wand: true, p: { steckdose: [0.56, 0.62], schraube: [0.10, 0.30], klappe: [0.80, 0.15] } },
    verteiler: { name: 'Unterverteilung', wand: true, umfaerben: true, p: { fi: [0.18, 0.47], ls: [0.47, 0.45], gehaeuse: [0.10, 0.88] } },
    erder: { name: 'Erder-Messstelle', wand: true, p: { trennstelle: [0.47, 0.37], ableitung: [0.47, 0.10], erdeinfuehrung: [0.47, 0.90] } },
  };
  Object.keys(OBJEKTE).forEach(k => {
    const o = OBJEKTE[k];
    o.key = k; o.geraet = !o.wand;
    o.bild = 'bilder/' + (k.startsWith('g-') ? k + '-0' : k) + '.webp';
    o.stand = STANDLINIE[k.startsWith('g-') ? k.slice(2) + '-0' : k] || [1, 0.15, 0.85];
  });
  const GERAETE = Object.keys(OBJEKTE).filter(k => OBJEKTE[k].geraet);
  const objektListe = spec => spec === 'geraet' ? GERAETE : spec === 'metall' ? GERAETE.filter(k => OBJEKTE[k].metall) : spec;

  // ---------- Bilder ----------
  const bilder = {};
  let geraetBild = null, wolken = null;
  const POSEN = {
    ruhe: { bild: 'bilder/mann-ruhe.webp', blick: 'links', hoehe: 1 },
    daumen: { bild: 'bilder/mann-daumen.webp', blick: 'links', hoehe: 0.99 },
    jubel: { bild: 'bilder/mann-jubel.webp', blick: 'frontal', hoehe: 0.89 },
    entsetzt: { bild: 'bilder/mann-entsetzt.webp', blick: 'frontal', hoehe: 0.94 },
  };
  function lade(name, datei, fertig) {
    const i = new Image();
    i.onload = () => { bilder[name] = fertig ? fertig(i) || i : i; };
    i.src = datei;
  }
  lade('raum', 'bilder/raum.webp');
  lade('himmel', 'bilder/himmel.webp', i => { wolken = wolkenEbene(i); });
  lade('pruefgeraet', 'bilder/pruefgeraet.webp', i => { geraetBild = R_.umfaerben(i); });
  Object.keys(POSEN).forEach(n => lade(n, POSEN[n].bild));
  const objektLaden = k => { const o = OBJEKTE[k]; if (o && !o.laedt) { o.laedt = true; lade(k, o.bild, o.umfaerben ? i => R_.umfaerben(i) : null); } };
  const objektBild = k => bilder[k];
  const bildMasse = img => [img.naturalWidth || img.width, img.naturalHeight || img.height];

  // Raum-Bild 1536×1024 (am Bild abgemessen): Fenster (Glas, durchsichtig) x 619–1162, y 199–501; Tischplatte hinten
  // y 692, Vorderkante y 1004 (darunter Kante bis 1024)
  const RAUM = { b: 1536, h: 1024, fenster: [619, 199, 1162, 501], hinten: 692, vorne: 1004 };
  // Himmel 1200×800: Feld/Horizont ab y 703; Amboss-Wolke rechts (Kern ca. x 0,6–0,95, y 0,15–0,7)
  const HIMMEL = { b: 1200, h: 800, horizont: 703 };
  // Prüfgerät, Zuschnitt 535×696 (aus messwert-pruefgeraet.png ab x 499, y 157): Skalenfeld (Kuppel) als Ellipse
  // Mitte 267/252, Halbachsen 196/175 (nur obere Hälfte); Zeiger-Achse 267/276 (unter der Kuppel verdeckt), Skalenradius
  // 168, Bogen ±50°; Display x 126–406, y 301–361; Buchsen rot 122/591, schwarz 211/591 (Radius ca. 20)
  const GER = { b: 535, h: 696, kuppel: [267, 252, 196, 175], achse: [267, 276], R: 168, winkel: 50,
    lcd: [126, 301, 280, 60], rot: [122, 591], schwarz: [211, 591] };

  // ---------- Lage ----------
  let B = 0, H = 0, L = null;
  const OBEN = 52;   // unter der Anzeige
  function lage() {
    const hochF = H > B * 1.05;
    const kurz = Math.min(B, H);
    let gW, gH, gx, gy, zone, fig;
    const schildY = 76;
    const schildH = 50;
    if (hochF) {
      gW = Math.min(B * 0.8, H * 0.46 * GER.b / GER.h, 420); gH = gW * GER.h / GER.b;
      gx = (B - gW) / 2; gy = H - 8 - gH;
      const figH = klemm(H * 0.19, 100, 175), figW = figH * 0.45;
      zone = [10, schildY + schildH + 10, B - figW - 16, gy + gH * 0.03];
      fig = { h: figH, x: B - figW - 6, unten: gy + gH * 0.06, rechts: true };
    } else {
      gH = Math.min(H - OBEN - 6, H * 0.76, B * 0.36 * GER.h / GER.b); gW = gH * GER.b / GER.h;
      gx = Math.min(B * 0.69 - gW / 2, B - gW - 10); gy = H - 6 - gH;
      const figH = klemm(H * 0.36, 110, 250), figW = figH * 0.45;
      zone = [figW + 22, schildY + schildH + 8, gx - 18, H - 8];
      fig = { h: figH, x: 6, unten: H - 6, rechts: false };
    }
    const zH = zone[3] - zone[1];
    // Raum: Tischkante hinten etwas über der Standfläche der Objekte; Fenster möglichst mittig
    const s = Math.max(B / RAUM.b, H / RAUM.h);
    const hinten = hochF ? zone[3] - zH * 0.32 : zone[3] - zH * 0.42;
    const oy = Math.min(0, hinten - RAUM.hinten * s);
    const ox = klemm(B / 2 - (RAUM.fenster[0] + RAUM.fenster[2]) / 2 * s, B - RAUM.b * s, 0);
    const fenster = [ox + RAUM.fenster[0] * s, oy + RAUM.fenster[1] * s, (RAUM.fenster[2] - RAUM.fenster[0]) * s, (RAUM.fenster[3] - RAUM.fenster[1]) * s];
    const k = gW / GER.b;
    const aufSchirm = ([x, y]) => [gx + x * k, gy + y * k];
    L = { hochF, kurz, s, ox, oy, fenster, gx, gy, gW, gH, k, zone, fig, schildY, schildH, aufSchirm,
      rot: aufSchirm(GER.rot), schwarz: aufSchirm(GER.schwarz) };
    // Ruhelage der Prüfspitze: zwischen Objekt und Gerät auf dem Tisch
    L.ruhe = hochF ? [gx + 46, gy - 4] : [zone[2] - 60, H - 34];
  }
  function groesse(b, h) { B = b; H = h; lage(); if (S && S.m) S.m.chips = null; }

  // Lage des Objekts im Bild: ganz in der Zone, Geräte gleich groß (gleiche Fläche), Wandobjekte auf einer Prüftafel
  function objektLage(k) {
    const o = OBJEKTE[k], img = objektBild(k);
    if (!img || !L) return null;
    const [w0, h0] = bildMasse(img);
    const [x0, y0, x1, y1] = L.zone;
    const zW = x1 - x0, zH = y1 - y0;
    const steckerPlatz = o.stecker ? klemm(zH * 0.16, 30, 54) : 0;
    const fussPlatz = o.wand ? Math.max(6, zH * 0.035) : 0;
    const rand = o.wand ? 0.06 : 0;   // Rahmen der Tafel
    const maxW = zW * (o.wand ? 0.66 : 0.72), maxH = (zH - steckerPlatz - fussPlatz) * (o.wand ? 0.8 : 0.86);
    const A = Math.pow(Math.min(zW, zH) * (o.wand ? 0.6 : 0.62), 2);
    const kk = Math.min(maxW / (w0 * (1 + 2 * rand)), maxH / (h0 * (1 + 2 * rand)), Math.sqrt(A / (w0 * h0)));
    const w = w0 * kk, h = h0 * kk;
    const x = (x0 + x1) / 2 - w / 2;
    const y = y1 - steckerPlatz - fussPlatz - h - h * rand;
    const fuss = o.wand ? y1 - steckerPlatz : y + h * o.stand[0];
    return { x, y, w, h, fuss, rand: rand * h, steckerPlatz };
  }
  // Anschlusspunkte des Objekts auf dem Schirm; bei per Code gezeichnetem Stecker dessen Lage
  function steckerLage(k, m) {
    const p = klemm(m.steckerPlatz * 0.95, 26, 50);
    return { x: m.x + m.w * 0.62, y: m.fuss + p * 0.5, p };
  }
  function punkteVon(k) {
    const o = OBJEKTE[k], m = objektLage(k);
    if (!m) return [];
    const r = Object.keys(o.p).map(id => ({ id, x: m.x + o.p[id][0] * m.w, y: m.y + o.p[id][1] * m.h }));
    if (o.stecker) {
      const st = steckerLage(k, m);
      r.push({ id: 'stift', x: st.x + st.p * 1.05, y: st.y - st.p * 0.08 });
      r.push({ id: 'schutz', x: st.x + st.p * 0.25, y: st.y - st.p * 0.3 });
    }
    return r;
  }

  // ---------- Ablaufplan ----------
  function plan() {
    let zuletzt = [];
    try { zuletzt = JSON.parse(localStorage.getItem('mg:messwert:zuletzt') || '[]'); } catch (e) { /* privat */ }
    const anzahl = {};
    const zaehle = id => { anzahl[id] = (anzahl[id] || 0) + 1; };
    const npaare = wahl([1, 1, 2]);
    const paare = mischen(PAARE.slice()).slice(0, npaare);
    paare.forEach(pa => pa.arten.forEach(zaehle));
    const erste = mischen(ARTEN.map(a => a.id));
    erste.forEach(zaehle);
    // Zusätzliche Messarten: seltene zuerst, höchstens 3 je Art
    const extra = n => {
      const r = [];
      for (let i = 0; i < n; i++) {
        const k = mischen(ARTEN.map(a => a.id)).filter(id => (anzahl[id] || 0) < 3).sort((a, b) => (anzahl[a] || 0) - (anzahl[b] || 0));
        const id = k[0] || wahl(ARTEN).id; zaehle(id); r.push(id);
      }
      return r;
    };
    const einzelSpaet = 5 - 2 * npaare;
    const ex = extra(6 + einzelSpaet);
    // 1–12: alle 9 Arten + 3 weitere (so lernt man jede Art früh kennen), 13–15: 3 weitere, 16–20: Paare + Einzelne
    const folge = ordnen([...erste, ...ex.slice(0, 3)].map(id => ({ arten: [id] })), null);
    folge.push(...ordnen(ex.slice(3, 6).map(id => ({ arten: [id] })), folge[folge.length - 1]));
    folge.push(...ordnen([...paare.map(pa => ({ arten: pa.arten.slice(), objekte: pa.objekte })), ...ex.slice(6).map(id => ({ arten: [id] }))], folge[folge.length - 1]));
    // Objekte wählen: nie zweimal hintereinander dasselbe, Geräte möglichst einmal je Spiel, zuletzt gespielte nach hinten
    const genutzt = {};
    let vorher = null;
    const liste = [];
    folge.forEach(f => {
      const kandidaten = f.objekte ? objektListe(f.objekte) : f.arten.map(id => objektListe(ART[id].objekte)).reduce((a, b) => a.filter(x => b.includes(x)));
      const k = kandidaten.map(o => ({ o, w: (o === vorher ? 100 : 0) + (genutzt[o] || 0) * 3 + (zuletzt.includes(o) ? 1 : 0) + Math.random() }))
        .sort((a, b) => a.w - b.w)[0].o;
      genutzt[k] = (genutzt[k] || 0) + 1; vorher = k;
      f.arten.forEach((id, i) => liste.push({ art: id, obj: k, doppel: i > 0 }));
    });
    return liste;
  }
  // Reihenfolge: gleiche Art nie direkt hintereinander (auch nicht über Paare hinweg)
  function ordnen(gruppen, davor) {
    let best = gruppen, bestF = 1e9;
    for (let v = 0; v < 200; v++) {
      const l = mischen(gruppen.slice());
      let f = 0, vor = davor ? davor.arten[davor.arten.length - 1] : null;
      l.forEach(g => { if (g.arten[0] === vor) f++; vor = g.arten[g.arten.length - 1]; });
      if (f < bestF) { best = l; bestF = f; }
      if (!f) break;
    }
    return best;
  }

  // ---------- Skala ----------
  // Sollbereich = Anteil f der Skala; der Skalenbereich passt sich an (z. B. „unter 0,3 Ω“: 0–1,2 Ω bei 25 %, 0–3 Ω bei 10 %)
  function skala(art, f) {
    let lo, hi, b0, b1;
    if (art.typ === 'unter') { lo = 0; hi = art.g / f; b0 = 0; b1 = art.g; }
    else if (art.typ === 'ueber') { lo = 0; hi = art.g / (1 - f); b0 = art.g; b1 = hi; }
    else {
      const W = (art.b - art.a) / f, c = (art.a + art.b) / 2;
      lo = Math.max(0, c - zufall(0.4, 0.6) * W); hi = lo + W; b0 = art.a; b1 = art.b;
    }
    const u = v => (v - lo) / (hi - lo);
    // Teilung: „schöne“ Schritte (1, 2, 2,5, 5 × 10^n), 3–6 beschriftete Striche (kleines Gerät: weniger, damit sich die
    // Zahlen nicht berühren)
    const roh = (hi - lo) / (L ? klemm(L.gW / 95, 2.6, 4.5) : 4.5), p10 = Math.pow(10, Math.floor(Math.log10(roh)));
    const schritt = [1, 2, 2.5, 5, 10].map(x => x * p10).find(x => x >= roh * 0.8) || 10 * p10;
    const stellen = Math.max(0, -Math.floor(Math.log10(schritt) + 1e-9) + (Math.abs(schritt / p10 - 2.5) < 1e-6 ? 1 : 0));
    const fein = schritt / (Math.abs(schritt / p10 - 2.5) < 1e-6 ? 5 : schritt / p10 === 2 ? 4 : 5);
    const anzeigeStellen = Math.max(0, Math.ceil(-Math.log10((b1 - b0) / 20)));
    return { lo, hi, b0: u(b0), b1: u(b1), schritt, fein, stellen, anzeigeStellen, wert: x => lo + x * (hi - lo) };
  }

  // ---------- Zustand ----------
  let S = null;
  // Hinweis bei Messung 1 (Spielertest 24.10.2026): solange noch kein Bestwert über 0 gespeichert ist – wer einmal fertig
  // gemessen hat, kennt den Ablauf; wer gescheitert ist (0 Punkte), bekommt die Hilfe beim nächsten Versuch wieder
  function ersteHilfe() {
    try { return !(+localStorage.getItem('mg:best:messwert:' + ((R_.kunde && R_.kunde.firma) || '')) > 0); } catch (e) { return true; }
  }
  function neu() {
    S = {
      zeit: 0, nr: 0, liste: plan(), phase: 'warten', phaseT: 0, punkte: 0, hilfe1: ersteHilfe(),
      fehl: 0, imBereich: 0, angesetzt: 0, voll: 0, gesehen: {}, m: null,
      sonde: { x: 0, y: 0, an: false, sprung: null },
      figur: { pose: 'ruhe', bis: 0, hupf: 0 }, klicks: [], schwebe: [],
      leuchten: null, leuchtenUm: zufall(4, 8), fertig: false, testEnde: !!TEST.ende,
    };
    if (TEST.art && ART[TEST.art]) {
      const i = Math.max(0, TEST.messung - 1), a = ART[TEST.art];
      S.liste[i] = { art: a.id, obj: wahl(objektListe(a.objekte)), doppel: false };
      if (S.liste[i + 1] && S.liste[i + 1].doppel) S.liste[i + 1].doppel = false;
    }
    if (TEST.messung > 1) {
      S.nr = Math.min(ANZAHL - 1, TEST.messung - 1);
      S.liste.slice(0, S.nr).forEach(e => { S.gesehen[e.art] = true; });
      if (S.liste[S.nr].doppel) S.liste[S.nr].doppel = false;
    }
    if (R_.zustand === 'spiel') {
      try { localStorage.setItem('mg:messwert:zuletzt', JSON.stringify([...new Set(S.liste.map(e => e.obj))])); } catch (e) { /* privat */ }
      S.liste.slice(S.nr, S.nr + 4).forEach(e => objektLaden(e.obj));
    }
    S.pendelTon = R_.dauerton('pendel');
    anzeigen();
  }
  function anzeigen() {
    R_.anzeige('Messung ' + Math.min(ANZAHL, S.nr + 1) + '/' + ANZAHL, Math.round(S.punkte).toLocaleString('de-DE') + ' Punkte');
  }
  const eintrag = () => S.liste[S.nr];
  const richtigerPunkt = (artId, obj) => obj === 'verteiler' ? 'fi' : ART[artId].punkt;

  function messungBeginnen(gleichesObjekt) {
    const e = eintrag(), art = ART[e.art], st = stufeVon(S.nr);
    const lernen = !S.gesehen[e.art];
    S.gesehen[e.art] = true;
    S.m = {
      art, obj: e.obj, st, skala: skala(art, st.band), richtig: richtigerPunkt(e.art, e.obj), lernen,
      ansetzOk: null, falsch: null, versuch: 1, t0: S.zeit, stopp: null, chips: null, wiederholen: false,
      start: 0, links: true, hinweisT: -10,
    };
    S.sonde.an = false;
    if (!gleichesObjekt) { S.phase = 'rein'; S.phaseT = 0; }
    else { S.phase = 'ansetzen'; S.phaseT = 0; }
    anzeigen();
  }

  // ---------- Ablauf ----------
  function schritt(dt) {
    if (!L) return;
    if (S.testEnde) { S.testEnde = false; testEnde(); return; }
    S.zeit += dt; S.phaseT += dt;
    if (S.fertig) { S.pendelTon.aus(); return; }
    const e = eintrag();
    if (S.phase === 'warten') {
      S.liste.slice(S.nr, S.nr + 4).forEach(x => objektLaden(x.obj));
      if (objektBild(e.obj) && S.phaseT >= 0.15 * P) messungBeginnen(false);
    } else if (S.phase === 'rein') {
      if (S.phaseT >= T_REIN) { S.phase = 'ansetzen'; S.phaseT = 0; }
    } else if (S.phase === 'sprung') {
      if (S.phaseT >= T_SPRUNG) pendelnBeginnen();
    } else if (S.phase === 'pendeln') {
      S.pendelTon.stellen(1, 1);
    } else if (S.phase === 'ergebnis') {
      if (S.phaseT >= T_ERGEBNIS * P) nachErgebnis();
    } else if (S.phase === 'loesen') {
      if (S.phaseT >= T_SPRUNG) messungBeginnen(true);
    } else if (S.phase === 'raus') {
      if (S.phaseT >= T_RAUS) weiter();
    }
    if (S.phase !== 'pendeln') S.pendelTon.aus();
  }
  function pendelnBeginnen() {
    const m = S.m;
    S.phase = 'pendeln'; S.phaseT = 0;
    // Zeiger beginnt am Ende gegenüber dem Sollbereich (sonst stünde er schon darin)
    const mitte = (m.skala.b0 + m.skala.b1) / 2;
    m.vonLinks = mitte > 0.5;
    m.pendelT0 = S.zeit;
  }
  // Zeigerstellung 0–1 auf der Skala (weich an den Enden, ab Stufe 3 leichtes Zittern)
  function zeigerU(t) {
    const m = S.m;
    if (!m) return 0;
    if (m.stopp) return m.stopp.u;
    const startU = (m.skala.b0 + m.skala.b1) / 2 > 0.5 ? 0 : 1;
    if (S.phase !== 'pendeln') return m.ruheU != null ? m.ruheU : startU;
    const x = Math.max(0, t - m.pendelT0) / m.st.pendel, tri = x % 2 < 1 ? x % 2 : 2 - x % 2;
    let u = tri - KURVE * Math.sin(2 * Math.PI * tri) / (2 * Math.PI);
    if (!m.vonLinks) u = 1 - u;
    if (m.st.zittern && !ruhig()) u += 0.006 * Math.sin(2 * Math.PI * 8.3 * t) + 0.004 * Math.sin(2 * Math.PI * 12.9 * t + 1.3);
    // Wiederholung: vom Stopp-Punkt weich in die Pendelbewegung übergehen
    if (m.ruheU != null && t - m.pendelT0 < 0.3) u = m.ruheU + (u - m.ruheU) * glatt((t - m.pendelT0) / 0.3);
    return klemm(u, -0.012, 1.012);
  }
  function stoppen() {
    const m = S.m, u = zeigerU(S.zeit), sk = m.skala;
    const W = sk.b1 - sk.b0, mitte = (sk.b0 + sk.b1) / 2, d = Math.abs(u - mitte);
    const drin = u >= sk.b0 && u <= sk.b1;
    const voll = drin && d <= VOLL_ANTEIL * W;
    let p = 0;
    if (drin) {
      p = P_TREFFER;
      if (m.versuch === 1) {
        p += voll ? P_MITTE : P_MITTE * klemm(1 - (d - VOLL_ANTEIL * W) / ((NULL_ANTEIL - VOLL_ANTEIL) * W), 0, 1);
        S.imBereich++;
        if (voll) S.voll++;
      }
      if (m.ansetzOk) p += P_ANSETZEN;
    }
    m.stopp = { u, drin, voll, punkte: p, t0: S.zeit, wert: sk.wert(klemm(u, 0, 1)) };
    S.punkte += p;
    R_.ton('stopp');
    if (drin) {
      setTimeout(() => { if (R_.zustand === 'spiel') R_.ton(voll ? 'volltreffer' : 'bestanden'); }, 110);
      if (voll) figur('daumen', 1.0, true);
      if (p > 0) S.schwebe.push({ text: '+' + Math.round(p), t0: S.zeit });
    } else {
      S.fehl++;
      setTimeout(() => { if (R_.zustand === 'spiel') R_.ton('fehlmessung'); }, 110);
      R_.vibrieren([60, 40, 60]);
      figur('entsetzt', 1.5);
    }
    S.phase = 'ergebnis'; S.phaseT = 0;
    anzeigen();
  }
  function nachErgebnis() {
    const m = S.m;
    if (!m.stopp.drin) {
      if (S.fehl >= FEHL_MAX) return beenden(true);
      // Messung wiederholen: gleiche Art, gleiches Objekt
      m.ruheU = m.stopp.u; m.stopp = null; m.versuch++; m.wiederholen = true;
      return pendelnBeginnen();
    }
    const naechster = S.liste[S.nr + 1];
    if (S.nr + 1 >= ANZAHL) { S.nr = ANZAHL - 1; S.phase = 'raus'; S.phaseT = 0; S.ende = true; return; }
    if (naechster.doppel) {
      S.nr++;
      sondeZurueck();
      S.phase = 'loesen'; S.phaseT = 0;
      return;
    }
    sondeZurueck();
    S.phase = 'raus'; S.phaseT = 0;
  }
  function weiter() {
    if (S.ende) { R_.ton('geschafft'); return beenden(false); }
    S.nr++;
    S.m = null;
    S.phase = 'warten'; S.phaseT = 0;
    anzeigen();
  }
  function figur(pose, dauer, hupf) { S.figur.pose = pose; S.figur.bis = S.zeit + dauer; if (hupf) S.figur.hupf = S.zeit; }

  // ---------- Prüfspitze ----------
  function sondeAn(p) {
    const s = S.sonde, von = s.an ? [s.x, s.y] : L.ruhe.slice();
    s.sprung = { von, nach: [p.x, p.y], t0: S.zeit }; s.an = true; s.ziel = p.id;
  }
  function sondeZurueck() {
    const s = S.sonde;
    if (!s.an) return;
    s.sprung = { von: [s.x, s.y], nach: L.ruhe.slice(), t0: S.zeit, zurueck: true }; s.an = false;
  }
  function sondeLage(ruh) {
    const s = S.sonde;
    let x, y;
    if (s.sprung) {
      const q = ruh ? 1 : glatt((S.zeit - s.sprung.t0) / T_SPRUNG);
      x = s.sprung.von[0] + (s.sprung.nach[0] - s.sprung.von[0]) * q;
      y = s.sprung.von[1] + (s.sprung.nach[1] - s.sprung.von[1]) * q - Math.sin(q * Math.PI) * 26;
      if (q >= 1) s.sprung = null;
    } else if (s.an && S.m) {
      const p = punkteVon(S.m.obj).find(pp => pp.id === s.ziel);
      [x, y] = p ? [p.x, p.y] : L.ruhe;
    } else [x, y] = L.ruhe;
    s.x = x; s.y = y;
    return [x, y];
  }

  // ---------- Bewertung und Ende ----------
  function bewertung(p) {
    if (p >= 900) return ['Präzise gemessen', 'GEPRÜFT', 'gut', 'jubel'];
    if (p >= 800) return ['Sauber gemessen', 'GEPRÜFT', 'gut', 'jubel'];
    if (p >= 700) return ['Im Sollbereich', 'GEPRÜFT', 'gut', 'daumen'];
    if (p >= 550) return ['Messung mit Abweichung', 'MIT MÄNGELN', 'mittel', 'daumen'];
    return ['Neu messen', 'MÄNGEL', 'schlecht', 'entsetzt'];
  }
  function beenden(abbruch) {
    S.fertig = true; S.phase = 'fertig';
    S.pendelTon.aus();
    if (abbruch) { setTimeout(() => R_.ton('abbruch'), 250); return endbild(0, true); }
    const p = Math.max(1, Math.min(1000, Math.round(S.punkte)));
    if (p >= 800) figur('jubel', 3, true);
    endbild(p, false);
  }
  function endbild(punkte, abbruch) {
    const [titel, stempel, art, pose] = abbruch ? ['Zu viele Fehlmessungen', 'MÄNGEL', 'schlecht', 'entsetzt'] : bewertung(punkte);
    const fertig = abbruch ? S.nr : ANZAHL;
    const felder = [
      abbruch ? ['Gemessen', fertig + ' von ' + ANZAHL] : ['Im Sollbereich', S.imBereich + ' von ' + ANZAHL],
      ['Richtig angesetzt', S.angesetzt + ' von ' + (abbruch ? S.nr + 1 : ANZAHL)],
      ['Volltreffer', String(S.voll)],
      ['Fehlmessungen', String(S.fehl)],
    ];
    R_.ende(punkte, { ueberschrift: titel, felder, stempel: { text: stempel, art }, figur: POSEN[pose], verzoegerung: abbruch ? 1000 : 1100 });
  }
  function testEnde() {
    S.fertig = true;
    if (TEST.ende === 'verloren') {
      S.nr = 13; S.imBereich = 11; S.angesetzt = 12; S.voll = 4; S.fehl = 3;
      return endbild(0, true);
    }
    const p = Math.max(1, Math.min(1000, +TEST.ende));
    S.fehl = p >= 900 ? 0 : p >= 700 ? 1 : 2;
    S.imBereich = ANZAHL - S.fehl;
    S.angesetzt = Math.min(ANZAHL, Math.max(8, Math.round(ANZAHL * (p - 500) / 480 + 6)));
    S.voll = Math.max(0, Math.round((p - 700) / 18));
    endbild(p, false);
  }

  // ---------- Eingabe ----------
  function chipTreffer(x, y) {
    const m = S.m;
    if (!m || !m.chips) return null;
    let best = null, bd = 1e9;
    m.chips.forEach(c => {
      const ch = Math.max(44, c.h), cy = c.y + c.h / 2;
      const inChip = x >= c.x - 4 && x <= c.x + c.w + 4 && Math.abs(y - cy) <= ch / 2;
      const dPunkt = Math.hypot(x - c.px, y - c.py);
      const d = inChip ? 0 : dPunkt <= 24 ? dPunkt : 1e9;
      if (d < bd) { bd = d; best = c; }
    });
    return best;
  }
  function runter(x, y) {
    if (!L || !S || S.fertig) return;
    S.klicks.push({ x, y, t0: S.zeit });
    const m = S.m;
    if (!m) return;
    if (S.phase === 'ansetzen' || (S.phase === 'rein' && S.phaseT > T_REIN * 0.7)) {
      if (S.phase === 'rein') { S.phase = 'ansetzen'; S.phaseT = 0; }
      const c = chipTreffer(x, y);
      if (!c) return;
      if (c.id === m.richtig) {
        if (m.ansetzOk === null) { m.ansetzOk = true; S.angesetzt++; }
        sondeAn({ id: c.id, x: c.px, y: c.py });
        R_.ton('anschliessen');
        S.phase = 'sprung'; S.phaseT = 0;
      } else {
        if (m.ansetzOk === null) m.ansetzOk = false;
        if (!m.falsch || S.zeit - m.falsch.t0 > 0.6) R_.ton('hinweis');
        m.falsch = { id: c.id, t0: S.zeit };
      }
      return;
    }
    if (S.phase === 'pendeln' && S.phaseT >= T_SPERRE) stoppen();
  }
  function bewegen() { /* nichts */ }
  function hoch() { /* nichts */ }
  addEventListener('keydown', e => {
    if (R_.zustand !== 'spiel' || !S || e.repeat) return;
    if (e.key !== ' ' && e.key !== 'Enter') return;
    if (S.phase === 'pendeln' && S.phaseT >= T_SPERRE) { e.preventDefault(); stoppen(); }
  });

  // ---------- Zeichnen ----------
  function zeichne(g, b, h, zustand, dt) {
    if (b !== B || h !== H || !L) groesse(b, h);
    if (!S) neu();
    const ruh = ruhig(), t = S.zeit;
    S.dtZ = dt;
    if (zustand !== 'spiel') S.zeit += dt;
    g.fillStyle = '#d8d4cc'; g.fillRect(0, 0, B, H);
    himmelZeichnen(g, t, ruh);
    raumZeichnen(g);
    const imSpiel = zustand === 'spiel' || zustand === 'ende';
    if (L.hochF) figurZeichnen(g, zustand, ruh);
    if (imSpiel && S.m) objektZeichnen(g, t, ruh);
    geraetZeichnen(g, t, ruh, imSpiel);
    if (imSpiel) kabelZeichnen(g, t, ruh);
    if (!L.hochF) figurZeichnen(g, zustand, ruh);
    if (zustand === 'spiel' && S.m) {
      if (S.phase === 'ansetzen' || S.phase === 'rein') chipsZeichnen(g, t, ruh);
      schildZeichnen(g, t, ruh);
      hinweisZeichnen(g, t, ruh);
    }
    if (zustand === 'spiel') {
      fehlZeichnen(g);
      schwebeZeichnen(g, ruh);
      klicksZeichnen(g);
    }
    g.canvas.style.cursor = zustand === 'spiel' ? 'pointer' : '';
  }
  // Raum: Bild deckt die Breite; ist es unten zu kurz (Hochformat), wird die Tischplatte nach unten verlängert
  function raumZeichnen(g) {
    const img = bilder.raum;
    if (!img) return;
    const { s, ox, oy } = L;
    if (oy + RAUM.h * s >= H) { g.drawImage(img, ox, oy, RAUM.b * s, RAUM.h * s); return; }
    // Bild bis Zeile 985 normal, dann ein schmaler Streifen der Tischplatte (Zeilen 975–995) gestreckt (nahtlos), ganz
    // unten die Vorderkante (ab 995)
    const nahtY = 985, kante = (RAUM.h - 995) * s, unten = oy + nahtY * s;
    g.drawImage(img, 0, 0, RAUM.b, nahtY, ox, oy, RAUM.b * s, nahtY * s);
    g.drawImage(img, 0, 975, RAUM.b, 20, ox, unten - 1, RAUM.b * s, H - kante - unten + 2);
    g.drawImage(img, 0, 995, RAUM.b, RAUM.h - 995, ox, H - kante, RAUM.b * s, kante);
  }

  // ---------- Himmel im Fenster (eigener Himmel: Hitzegewitter mit Amboss-Wolke) ----------
  // Dezent lebendig: zwei Wolkenschichten ziehen nach links (7 % und 12 % der Bildbreite pro Minute), der Amboss quillt
  // langsam (±2,5 % in 13s), alle 7–13s fernes Wetterleuchten in der Gewitterwolke. Bei „Bewegung reduzieren“ steht alles.
  const SCHICHTEN = [{ tempo: 0.07, groesse: 1.0, deckkraft: 0.2, start: 0.15 }, { tempo: 0.12, groesse: 1.25, deckkraft: 0.25, start: 0.6 }];
  function wolkenEbene(img) {
    const f = 0.5, w = Math.round(img.naturalWidth * f), h = Math.round(HIMMEL.horizont * f);
    const c = document.createElement('canvas');
    c.width = 2 * w; c.height = h;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, img.naturalWidth, HIMMEL.horizont, 0, 0, w, h);
    x.save(); x.translate(2 * w, 0); x.scale(-1, 1); x.drawImage(img, 0, 0, img.naturalWidth, HIMMEL.horizont, 0, 0, w, h); x.restore();
    x.globalCompositeOperation = 'destination-in';
    const v = x.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, '#000'); v.addColorStop(0.75, '#000'); v.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = v; x.fillRect(0, 0, c.width, h);
    return c;
  }
  function himmelZeichnen(g, t, ruh) {
    const img = bilder.himmel;
    if (!img) return;
    const [fx, fy, fw, fh] = L.fenster;
    const w = fw * 1.3, h = w * HIMMEL.h / HIMMEL.b, x0 = fx - (w - fw) * 0.55, y0 = fy + fh + fh * 0.05 - h * HIMMEL.horizont / HIMMEL.h;
    g.save();
    g.beginPath(); g.rect(fx - 4, fy - 4, fw + 8, fh + 8); g.clip();
    g.drawImage(img, x0, y0, w, h);
    if (!ruh) {
      // Amboss quillt: Ausschnitt der Gewitterwolke leicht vergrößert darüber (Anker unten)
      const q = 1 + 0.025 * Math.sin(t * 2 * Math.PI / 13);
      const sx = 0.42, sy = 0.03, sw = 0.58, sh = 0.7;
      const dw = w * sw * q, dh = h * sh * q, ax = x0 + w * (sx + sw / 2), ay = y0 + h * (sy + sh);
      g.globalAlpha = 0.45;
      g.drawImage(img, sx * img.naturalWidth, sy * img.naturalHeight, sw * img.naturalWidth, sh * img.naturalHeight, ax - dw / 2, ay - dh, dw, dh);
      g.globalAlpha = 1;
      if (wolken) {
        SCHICHTEN.forEach(sch => {
          const ww = w * sch.groesse, hh = (HIMMEL.horizont / HIMMEL.h) * h * sch.groesse, breite = 2 * ww;
          const weg = ((sch.start + t * sch.tempo / 60) % 2) * ww;
          g.globalAlpha = sch.deckkraft;
          for (let k = -1; k <= 1; k++) g.drawImage(wolken, x0 - weg + k * breite, y0 - (hh - (HIMMEL.horizont / HIMMEL.h) * h) * 0.7, breite, hh);
        });
        g.globalAlpha = 1;
      }
      // fernes Wetterleuchten in der Gewitterwolke
      if (!S.leuchten && t >= S.leuchtenUm) {
        S.leuchtenUm = t + zufall(7, 13);
        S.leuchten = { t0: t, x: x0 + w * zufall(0.6, 0.85), y: y0 + h * zufall(0.35, 0.6), r: fw * zufall(0.3, 0.45) };
      }
      if (S.leuchten) {
        const p = t - S.leuchten.t0, Lt = S.leuchten;
        if (p > 1.0) S.leuchten = null;
        else {
          const a = 0.3 * Math.max(Math.exp(-p * 9), p > 0.2 ? Math.exp(-(p - 0.2) * 8) * 0.75 : 0);
          const rg = g.createRadialGradient(Lt.x, Lt.y, 0, Lt.x, Lt.y, Lt.r);
          rg.addColorStop(0, `rgba(255,244,225,${a})`); rg.addColorStop(1, 'rgba(255,235,210,0)');
          g.globalCompositeOperation = 'lighter'; g.fillStyle = rg; g.fillRect(Lt.x - Lt.r, Lt.y - Lt.r, 2 * Lt.r, 2 * Lt.r);
          g.globalCompositeOperation = 'source-over';
        }
      }
    }
    g.restore();
  }

  // ---------- Messobjekt ----------
  function objektZeichnen(g, t, ruh) {
    const m = S.m, o = OBJEKTE[m.obj], img = objektBild(m.obj), lg = objektLage(m.obj);
    if (!img || !lg) return;
    let alpha = 1, dy = 0, sk = 1;
    if (S.phase === 'rein') { const q = glatt(S.phaseT / T_REIN); alpha = ruh ? q : Math.min(1, q * 1.5); if (!ruh) { dy = -(1 - q) * 30; sk = 0.9 + 0.1 * q; } }
    if (S.phase === 'raus') { const q = S.phaseT / T_RAUS; alpha = 1 - q; if (!ruh) dy = -q * 16; }
    const cx = lg.x + lg.w / 2;
    g.save();
    g.globalAlpha = alpha;
    g.translate(cx, lg.fuss + dy); g.scale(sk, sk); g.translate(-cx, -lg.fuss);
    if (o.wand) tafelZeichnen(g, lg);
    else schattenZeichnen(g, lg.x + lg.w * o.stand[1], lg.x + lg.w * o.stand[2], lg.fuss);
    if (o.stecker) steckerZeichnen(g, m.obj, lg);
    g.drawImage(img, lg.x, lg.y, lg.w, lg.h);
    g.restore();
  }
  // Kontaktschatten genau an der Auflage (schmal, dunkel) und weicher Schatten dezent dazu
  function schattenZeichnen(g, x0, x1, y) {
    const cx = (x0 + x1) / 2, rw = Math.max(8, (x1 - x0) / 2);
    g.save();
    let rg = g.createRadialGradient(cx, y, 0, cx, y, rw * 1.25);
    rg.addColorStop(0, 'rgba(0,0,0,.2)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.translate(cx, y); g.scale(1, 0.16); g.translate(-cx, -y);
    g.fillStyle = rg; g.fillRect(cx - rw * 1.3, y - rw * 1.3, rw * 2.6, rw * 2.6);
    g.restore();
    g.save();
    rg = g.createRadialGradient(cx, y, 0, cx, y, rw * 1.02);
    rg.addColorStop(0, 'rgba(0,0,0,.55)'); rg.addColorStop(0.7, 'rgba(0,0,0,.4)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.translate(cx, y); g.scale(1, 0.045); g.translate(-cx, -y);
    g.fillStyle = rg; g.fillRect(cx - rw * 1.05, y - rw * 1.05, rw * 2.1, rw * 2.1);
    g.restore();
  }
  // Prüftafel für Wandobjekte: Metallrahmen, zwei Füße, Kontaktschatten
  function tafelZeichnen(g, lg) {
    const r = lg.rand, x = lg.x - r, y = lg.y - r, w = lg.w + 2 * r, h = lg.h + 2 * r;
    const fussH = lg.fuss - (y + h);
    schattenZeichnen(g, x + w * 0.08, x + w * 0.92, lg.fuss);
    g.fillStyle = '#4b4f54';
    [0.18, 0.82].forEach(f => { g.fillRect(x + w * f - w * 0.06, y + h - 2, w * 0.12, fussH + 2); });
    g.save();
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
    const gr = g.createLinearGradient(x, y, x, y + h);
    gr.addColorStop(0, '#b9bec4'); gr.addColorStop(1, '#8e949b');
    g.fillStyle = gr; rund(g, x, y, w, h, Math.max(4, r * 0.6)); g.fill();
    g.restore();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 3, y + 2, w - 6, 1.5);
  }
  // Stecker per Code (Langfeldleuchte, Getränkekühlschrank): Kabel vom Gerät zum liegenden Schukostecker
  function steckerZeichnen(g, k, lg) {
    const st = steckerLage(k, lg), p = st.p;
    const ax = lg.x + lg.w * (OBJEKTE[k].key === 'leuchte' ? 0.9 : 0.85), ay = lg.y + lg.h * 0.92;
    g.save();
    g.lineCap = 'round'; g.strokeStyle = '#1c1c1c'; g.lineWidth = Math.max(2.5, p * 0.12);
    g.beginPath(); g.moveTo(ax, ay);
    g.bezierCurveTo(ax + p * 0.6, ay + p * 0.4, st.x - p * 1.2, st.y + p * 0.3, st.x - p * 0.45, st.y); g.stroke();
    // Körper
    g.fillStyle = '#202224';
    g.beginPath(); g.ellipse(st.x + p * 0.25, st.y, p * 0.5, p * 0.42, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(st.x - p * 0.5, st.y - p * 0.16, p * 0.5, p * 0.32);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(st.x + p * 0.2, st.y - p * 0.18, p * 0.32, p * 0.12, 0, 0, Math.PI * 2); g.fill();
    // Schutzkontakt-Clip oben, Stifte
    g.fillStyle = '#c8a24a'; g.fillRect(st.x + p * 0.12, st.y - p * 0.44, p * 0.26, p * 0.1);
    g.fillStyle = '#d9dde2';
    [-0.08, 0.14].forEach(dy => { rund(g, st.x + p * 0.66, st.y + dy * p - p * 0.05, p * 0.46, p * 0.1, p * 0.05); g.fill(); });
    g.restore();
  }

  // ---------- Anschlusspunkte (Chips mit Namen) ----------
  const MESS = document.createElement('canvas').getContext('2d');
  function chipsBerechnen() {
    const m = S.m, pts = punkteVon(m.obj), lg = objektLage(m.obj);
    if (!pts.length || !lg) return null;
    const fs = L.kurz < 420 ? 13 : 15, ch = fs + 14;
    const g = MESS;
    g.font = '700 ' + fs + 'px ' + SCHRIFT;
    const cx = lg.x + lg.w / 2;
    const geraetR = [L.gx, L.gy, L.gW, L.gH];
    const chips = pts.map(p => {
      const w = Math.max(48, g.measureText(PUNKTNAME[p.id]).width + 22);
      // Geräte: Schild auf der Seite des Punkts; Wandobjekte: alle auf der Seite mit mehr Platz in der Zone.
      // Schilder stehen neben dem Objekt (nicht darauf), damit sie keine anderen Punkte verdecken
      let rechts = OBJEKTE[m.obj].wand ? (L.zone[2] - lg.x - lg.w) > (lg.x - L.zone[0]) : p.x >= cx;
      const lage = r => r ? Math.max(p.x + 20, lg.x + lg.w + 12) : Math.min(p.x - 20 - w, lg.x - 12 - w);
      let x = lage(rechts);
      if (x < 6 || x + w > B - 6 || (rechts && x + w > geraetR[0] - 4 && p.y + ch / 2 > geraetR[1])) {
        const x2 = lage(!rechts);
        if (x2 >= 6 && x2 + w <= B - 6) { rechts = !rechts; x = x2; }
      }
      x = klemm(x, 6, B - w - 6);
      // nicht über das Prüfgerät
      if (x + w > geraetR[0] && x < geraetR[0] + geraetR[2] && p.y + ch / 2 > geraetR[1]) x = Math.max(6, geraetR[0] - w - 4);
      return { id: p.id, px: p.x, py: p.y, x, y: p.y - ch / 2, w, h: ch, fs };
    });
    // Überlappungen auflösen: senkrecht auseinanderschieben (mind. 46 px Abstand der Mitten bei Überschneidung)
    for (let r = 0; r < 12; r++) {
      chips.sort((a, b) => a.y - b.y);
      let ok = true;
      for (let i = 1; i < chips.length; i++) {
        const a = chips[i - 1], b = chips[i];
        const ueberX = a.x < b.x + b.w + 6 && b.x < a.x + a.w + 6;
        const abst = Math.max(46, a.h + 8);
        if (ueberX && b.y - a.y < abst) { const d = (abst - (b.y - a.y)) / 2; a.y -= d; b.y += d; ok = false; }
      }
      chips.forEach(c => { c.y = klemm(c.y, L.schildY + L.schildH + 4, H - c.h - 6); });
      if (ok) break;
    }
    return chips;
  }
  function chipsZeichnen(g, t, ruh) {
    const m = S.m;
    if (!m.chips) m.chips = chipsBerechnen();
    if (!m.chips) return;
    const a = S.phase === 'rein' ? glatt(S.phaseT / T_REIN) : 1;
    const hilfe = m.lernen || m.falsch;
    m.chips.forEach((c, i) => {
      const richtig = c.id === m.richtig, hervor = hilfe && richtig;
      const falschJetzt = m.falsch && m.falsch.id === c.id && S.zeit - m.falsch.t0 < 0.7;
      const ein = ruh ? a : glatt((S.phaseT - i * 0.06) / 0.25) * a;
      if (ein <= 0) return;
      g.save(); g.globalAlpha = ein;
      // leuchtender Punkt am Objekt
      const puls = ruh ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 1.1 + i);
      g.fillStyle = hervor ? 'rgba(255,213,0,.35)' : 'rgba(255,255,255,.28)';
      g.beginPath(); g.arc(c.px, c.py, 9 + 5 * puls, 0, Math.PI * 2); g.fill();
      g.fillStyle = hervor ? '#FFD500' : '#ffffff'; g.strokeStyle = '#191919'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(c.px, c.py, 5, 0, Math.PI * 2); g.fill(); g.stroke();
      if (hervor && !ruh) { g.strokeStyle = 'rgba(255,213,0,.9)'; g.lineWidth = 2.5; g.beginPath(); g.arc(c.px, c.py, 12 + 10 * ((t * 0.9) % 1), 0, Math.PI * 2); g.globalAlpha = ein * (1 - (t * 0.9) % 1); g.stroke(); g.globalAlpha = ein; }
      // Linie zum Schild
      const zx = c.x + (c.px > c.x + c.w ? c.w : c.px < c.x ? 0 : c.w / 2), zy = c.y + c.h / 2;
      g.strokeStyle = 'rgba(25,25,25,.75)'; g.lineWidth = 3; g.beginPath(); g.moveTo(c.px, c.py); g.lineTo(zx, zy); g.stroke();
      g.strokeStyle = hervor ? '#FFD500' : '#ffffff'; g.lineWidth = 1.4; g.stroke();
      // Schild
      let dx = 0;
      if (falschJetzt && !ruh) dx = Math.sin((S.zeit - m.falsch.t0) * 50) * 4 * (1 - (S.zeit - m.falsch.t0) / 0.7);
      g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 8; g.shadowOffsetY = 2;
      g.fillStyle = falschJetzt ? '#d3241c' : hervor ? '#FFD500' : '#ffffff';
      rund(g, c.x + dx, c.y, c.w, c.h, c.h / 2); g.fill();
      g.shadowColor = 'transparent';
      g.fillStyle = falschJetzt ? '#ffffff' : '#191919'; g.font = '700 ' + c.fs + 'px ' + SCHRIFT;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(PUNKTNAME[c.id], c.x + dx + c.w / 2, c.y + c.h / 2 + 1);
      g.restore();
    });
  }

  // ---------- Prüfgerät ----------
  function geraetZeichnen(g, t, ruh, imSpiel) {
    if (!geraetBild) return;
    const { gx, gy, gW, gH, k } = L;
    schattenZeichnen(g, gx + gW * 0.06, gx + gW * 0.94, gy + gH - gW * 0.012);
    g.drawImage(geraetBild, gx, gy, gW, gH);
    g.save();
    g.translate(gx, gy); g.scale(k, k);
    skalaZeichnen(g, t, ruh, imSpiel);
    lcdZeichnen(g, t, ruh, imSpiel);
    g.restore();
  }
  const winkel = u => (-GER.winkel + 2 * GER.winkel * u) * Math.PI / 180;
  const aufBogen = (u, r) => { const w = winkel(u); return [GER.achse[0] + r * Math.sin(w), GER.achse[1] - r * Math.cos(w)]; };
  function skalaZeichnen(g, t, ruh, imSpiel) {
    const m = imSpiel ? S.m : null, [kx, ky, rx, ry] = GER.kuppel, R = GER.R, [ax, ay] = GER.achse;
    const sk = m ? m.skala : { lo: 0, hi: 1, b0: 0, b1: 0, schritt: 0.2, fein: 0.05, stellen: 1 };
    const minPx = 10.5 / L.k;   // Schrift nie kleiner als 10,5 Bildpunkte
    g.save();
    g.beginPath(); g.ellipse(kx, ky, rx, ry, 0, Math.PI, 2 * Math.PI); g.closePath(); g.clip();
    // Sollbereich als markiertes Band außen am Bogen
    if (m && sk.b1 > sk.b0) {
      const w0 = winkel(sk.b0) - Math.PI / 2, w1 = winkel(sk.b1) - Math.PI / 2;
      const glanz = S.phase === 'pendeln' && !ruh ? 0.1 * Math.sin(t * 2 * Math.PI / 1.2) : 0;
      g.fillStyle = `rgba(46,160,67,${0.78 + glanz})`;
      g.beginPath(); g.arc(ax, ay, R + 14, w0, w1); g.arc(ax, ay, R - 1, w1, w0, true); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(20,90,35,.9)'; g.lineWidth = 2; g.stroke();
      // Mitte des Bandes fein markiert
      const [mx0, my0] = aufBogen((sk.b0 + sk.b1) / 2, R + 2), [mx1, my1] = aufBogen((sk.b0 + sk.b1) / 2, R + 13);
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(mx0, my0); g.lineTo(mx1, my1); g.stroke();
    }
    // Bogen und Teilung
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 2;
    g.beginPath(); g.arc(ax, ay, R, winkel(0) - Math.PI / 2, winkel(1) - Math.PI / 2); g.stroke();
    if (m) {
      const n = Math.round((sk.hi - sk.lo) / sk.fein);
      const start = Math.ceil(sk.lo / sk.fein - 1e-6) * sk.fein;
      const fs = Math.max(19, minPx);
      g.font = '700 ' + fs + 'px ' + SCHRIFT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#222';
      for (let i = 0; i <= n + 1; i++) {
        const v = start + i * sk.fein;
        if (v > sk.hi + 1e-9) break;
        const u = (v - sk.lo) / (sk.hi - sk.lo);
        const gross = Math.abs(v / sk.schritt - Math.round(v / sk.schritt)) < 1e-6;
        const [x0, y0] = aufBogen(u, R - (gross ? 13 : 7)), [x1, y1] = aufBogen(u, R);
        g.lineWidth = gross ? 2.4 : 1.3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        if (gross) { const [tx, ty] = aufBogen(u, R - 13 - fs * 0.85); g.fillText(zahl(v, sk.stellen), tx, ty); }
      }
      // Einheit und Messart klein in der Mitte
      g.font = '700 ' + Math.max(30, minPx * 1.6) + 'px ' + SCHRIFT; g.fillStyle = '#333';
      g.fillText(m.art.einheit, kx, ay - R * 0.42);
    }
    // Zeiger
    const u = m ? zeigerU(t) : 0.5 + (ruh ? 0 : 0.04 * Math.sin(t * 0.7));
    const [zx, zy] = aufBogen(u, R + 12);
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 5; g.beginPath(); g.moveTo(ax + 3, ay + 3); g.lineTo(zx + 3, zy + 3); g.stroke();
    g.strokeStyle = '#b3201a'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(ax, ay); g.lineTo(zx, zy); g.stroke();
    g.restore();
  }
  function lcdZeichnen(g, t, ruh, imSpiel) {
    const [x, y, w, h] = GER.lcd, m = imSpiel ? S.m : null;
    const minPx = 10 / L.k;
    let z1 = '', z2 = '', farbe = 'rgba(30,40,30,.85)';
    if (!m) { z1 = 'Bereit'; }
    else if (m.stopp && (S.phase === 'ergebnis' || S.phase === 'raus' || S.phase === 'loesen' || S.fertig)) {
      z1 = zahl(m.stopp.wert, m.skala.anzeigeStellen) + ' ' + m.art.einheit;
      z2 = m.stopp.drin ? 'bestanden' : 'nicht bestanden';
      if (!m.stopp.drin && !ruh && Math.floor((S.zeit - m.stopp.t0) / 0.25) % 2 === 0) farbe = 'rgba(30,40,30,.45)';
    } else if (S.phase === 'pendeln' || S.phase === 'sprung') { z1 = m.wiederholen ? 'Wiederholung…' : 'Messung läuft…'; z2 = m.art.einheit === 'V' ? 'Spannung' : m.art.kurz || m.art.name; }
    else { z1 = 'Prüfspitze'; z2 = 'ansetzen'; }
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = farbe; g.textBaseline = 'middle';
    const f1 = Math.max(26, minPx * 1.15), f2 = Math.max(17, minPx);
    if (z2) {
      g.font = '700 ' + f1 + 'px ' + SCHRIFT; g.textAlign = 'left'; g.fillText(z1, x + 12, y + h * 0.36, w - 24);
      g.font = '600 ' + f2 + 'px ' + SCHRIFT; g.textAlign = 'right'; g.fillText(z2, x + w - 12, y + h * 0.76, w - 24);
    } else { g.font = '700 ' + f1 + 'px ' + SCHRIFT; g.textAlign = 'center'; g.fillText(z1, x + w / 2, y + h / 2, w - 24); }
    g.restore();
  }

  // ---------- Prüfkabel ----------
  function bananenstecker(g, [x, y], farbe, r) {
    g.save();
    g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 4; g.shadowOffsetY = 2;
    g.fillStyle = farbe; rund(g, x - r, y - r * 0.4, 2 * r, r * 2.6, r * 0.6); g.fill();
    g.shadowColor = 'transparent';
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x - r * 0.6, y - r * 0.2, r * 0.35, r * 2);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - r, y + r * 1.2, 2 * r, r * 0.18);
    g.restore();
    return [x, y + r * 2.2];
  }
  function kabelZeichnen(g, t, ruh) {
    const r = Math.max(5, 15 * L.k);
    // schwarzes Kabel: aus der Buchse nach unten vom Tisch
    const s2 = bananenstecker(g, L.schwarz, '#1e1e1e', r);
    g.save(); g.lineCap = 'round'; g.lineWidth = Math.max(2.5, r * 0.55); g.strokeStyle = '#151515';
    g.beginPath(); g.moveTo(s2[0], s2[1]); g.bezierCurveTo(s2[0], s2[1] + 30, s2[0] + 30, H - 10, s2[0] + 50, H + 20); g.stroke(); g.restore();
    // rotes Kabel mit Prüfspitze
    const s1 = bananenstecker(g, L.rot, '#c62018', r);
    const [tx, ty] = sondeLage(ruh);
    const len = klemm(54 * L.k * 1.4, 34, 70);
    // Griff zeigt vom Punkt weg Richtung Gerät/unten
    let dx = (L.rot[0] - tx), dy = (L.rot[1] - ty) + 120;
    if (L.hochF) { dx = -40; dy = 60; }
    const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    const ruhend = !S.sonde.an && !S.sonde.sprung;
    if (ruhend) { dx = L.hochF ? -0.5 : 1; dy = L.hochF ? 0.5 : 0.12; const n = Math.hypot(dx, dy); dx /= n; dy /= n; }
    const ex = tx + dx * len, ey = ty + dy * len;
    g.save(); g.lineCap = 'round';
    g.lineWidth = Math.max(2.5, r * 0.55); g.strokeStyle = '#a91b14';
    g.beginPath(); g.moveTo(s1[0], s1[1]);
    if (L.hochF) g.bezierCurveTo(s1[0] - 30, s1[1] + 40, Math.min(ex, L.gx) - 50, ey + 60, ex, ey);
    else g.bezierCurveTo(s1[0] - 10, s1[1] + 70, ex + dx * 90, ey + dy * 90 + 40, ex, ey);
    g.stroke();
    // Prüfspitze: Griff (rot), Fingerschutz, Metallspitze
    const w = Math.max(7, len * 0.2);
    g.translate(tx, ty); g.rotate(Math.atan2(dy, dx));
    g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 6; g.shadowOffsetY = 3;
    g.fillStyle = '#c62018'; rund(g, len * 0.28, -w / 2, len * 0.72, w, w / 2); g.fill();
    g.shadowColor = 'transparent';
    g.fillStyle = '#8f140e'; rund(g, len * 0.24, -w * 0.75, len * 0.07, w * 1.5, 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(len * 0.34, -w * 0.32, len * 0.55, w * 0.18);
    g.strokeStyle = '#d6d9dd'; g.lineWidth = Math.max(1.8, w * 0.22);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.25, 0); g.stroke();
    g.restore();
  }

  // ---------- Schilder ----------
  // Aufgabe: „Schutzleiterwiderstand – unter 0,3 Ω“ (passt es nicht in eine Zeile: zweizeilig)
  function schildZeichnen(g, t, ruh) {
    const m = S.m;
    let a = 1, dy = 0;
    const seit = S.zeit - m.t0;
    if (!ruh && seit < 0.3) { a = glatt(seit / 0.3); dy = -8 * (1 - a); }
    if (S.phase === 'raus') a = 1 - S.phaseT / T_RAUS;
    const zentrum = L.hochF ? B / 2 : klemm((L.zone[0] + L.zone[2]) / 2, 120, B / 2);
    const maxW = Math.min(B - 24, L.hochF ? B - 24 : (L.zone[2] - L.zone[0]) + 120, 560);
    const fs = L.kurz < 420 ? 16 : 18;
    g.save();
    g.globalAlpha = a;
    g.font = '700 ' + fs + 'px ' + SCHRIFT;
    const einzeilig = m.art.name + ' – ' + m.art.grenz;
    let zeilen = [einzeilig];
    if (g.measureText(einzeilig).width + 32 > maxW) zeilen = [m.art.name, m.art.grenz];
    const breite = Math.min(maxW, Math.max(...zeilen.map((z, i) => { g.font = (i ? '600 ' : '700 ') + fs + 'px ' + SCHRIFT; return g.measureText(z).width; })) + 32);
    const hh = zeilen.length === 1 ? fs + 20 : fs * 2 + 18;
    const x = klemm(zentrum - breite / 2, 8, B - breite - 8), y = L.schildY + dy;
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 12; g.shadowOffsetY = 3;
    g.fillStyle = '#fff'; rund(g, x, y, breite, hh, 6); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = '#FFD500'; g.fillRect(x + 7, y + 4, breite - 14, 3);
    g.fillStyle = '#191919'; g.textAlign = 'center'; g.textBaseline = 'middle';
    zeilen.forEach((z, i) => {
      g.font = (i ? '600 ' : '700 ') + fs + 'px ' + SCHRIFT;
      g.fillText(z, x + breite / 2, y + 4 + (zeilen.length === 1 ? hh / 2 : fs * 0.6 + 6 + i * (fs + 4)), breite - 16);
    });
    m.schildUnten = y + hh;
    g.restore();
  }
  // Hinweis bei falschem Ansetzpunkt bzw. „Messung wiederholen“
  function hinweisZeichnen(g, t, ruh) {
    const m = S.m;
    let text = null, art = 'falsch', seit = 0;
    if (m.falsch && S.phase === 'ansetzen') { text = (m.art.kurz || m.art.name) + ': ' + ORT[m.richtig] + ' messen'; seit = S.zeit - m.falsch.t0; }
    else if (m.wiederholen && S.phase === 'pendeln' && S.phaseT < 1.6) { text = 'Messung wiederholen'; art = 'neutral'; seit = S.phaseT; }
    else if (S.hilfe1 && S.nr === 0 && (S.phase === 'ansetzen' || (S.phase === 'rein' && S.phaseT > T_REIN * 0.6))) { text = 'Tippe auf den leuchtenden Punkt'; art = 'hilfe'; seit = S.phase === 'rein' ? 0.2 : S.phaseT + 0.2; }
    else if (S.hilfe1 && S.nr === 0 && S.phase === 'pendeln') { hilfeGeraet(g, ruh); return; }
    if (!text) return;
    const fs = L.kurz < 420 ? 14 : 16;
    g.save();
    g.font = '700 ' + fs + 'px ' + SCHRIFT;
    const tw = Math.min(g.measureText(text).width, B - 60), w = tw + 30, hh = fs + 18;
    const zentrum = L.hochF ? B / 2 : klemm((L.zone[0] + L.zone[2]) / 2, w / 2 + 8, B - w / 2 - 8);
    const x = klemm(zentrum - w / 2, 8, B - w - 8), y = (m.schildUnten || L.schildY + L.schildH) + 8;
    g.globalAlpha = ruh ? 1 : Math.min(1, seit / 0.15);
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
    g.fillStyle = art === 'falsch' ? '#fff3f2' : '#ffffff'; rund(g, x, y, w, hh, 6); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = art === 'falsch' ? '#d3241c' : art === 'hilfe' ? '#FFD500' : '#9a9a9a'; g.fillRect(x + 7, y + 4, w - 14, 3);
    g.fillStyle = art === 'falsch' ? '#b3261e' : '#191919'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, x + w / 2, y + hh / 2 + 2, w - 16);
    g.restore();
  }
  // Schritt 2 der Hilfe (Messung 1): Schild über dem Prüfgerät, solange der Zeiger pendelt; Pfeil zeigt auf die Skala
  function hilfeGeraet(g, ruh) {
    const text = 'Tippe, wenn der Zeiger im markierten Bereich steht', fs = L.kurz < 420 ? 14 : 16;
    g.save(); g.font = '700 ' + fs + 'px ' + SCHRIFT;
    const tw = Math.min(g.measureText(text).width, B - 40), w = tw + 30, hh = fs + 18;
    const cx = klemm(L.gx + L.gW / 2, w / 2 + 8, B - w / 2 - 8);
    let y = L.gy - hh - 14;
    if (y < 64) y = L.gy + L.gH * 0.62;   // kein Platz darüber: unten auf dem Gerät (unter der Skala)
    const x = klemm(cx - w / 2, 8, B - w - 8);
    const puls = ruh ? 1 : 0.94 + 0.06 * Math.sin(S.zeit * 2 * Math.PI / 1.3);
    g.globalAlpha = Math.min(1, S.phaseT / 0.3) * puls;
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
    g.fillStyle = '#ffffff'; rund(g, x, y, w, hh, 6); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = '#FFD500'; g.fillRect(x + 7, y + 4, w - 14, 3);
    g.fillStyle = '#191919'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x + w / 2, y + hh / 2 + 2, w - 16);
    g.restore();
  }
  // Fehlmessungen unter der Anzeige oben links: drei Symbole (Zeiger im roten Kreis = eingetreten)
  function fehlZeichnen(g) {
    const x = 12, y = 60, r = 8;
    g.save();
    g.font = '700 13px ' + SCHRIFT; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 4;
    g.fillStyle = '#fff'; g.fillText('Fehlmessungen', x, y);
    const x0 = x + g.measureText('Fehlmessungen').width + 10 + r;
    for (let i = 0; i < FEHL_MAX; i++) {
      const cx = x0 + i * (2 * r + 7), voll = i < S.fehl;
      g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 3;
      g.fillStyle = voll ? '#d3241c' : 'rgba(0,0,0,.28)';
      g.beginPath(); g.arc(cx, y, r, 0, Math.PI * 2); g.fill();
      g.shadowColor = 'transparent';
      g.strokeStyle = voll ? '#fff' : 'rgba(255,255,255,.9)'; g.lineWidth = 1.6; g.stroke();
      g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, y + r * 0.45); g.lineTo(cx + r * 0.55, y - r * 0.5); g.stroke();
    }
    g.restore();
  }
  // Punkte steigen kurz am Display auf („+48“)
  function schwebeZeichnen(g, ruh) {
    S.schwebe = S.schwebe.filter(s => S.zeit - s.t0 < 1.0);
    S.schwebe.forEach(s => {
      const p = (S.zeit - s.t0) / 1.0, [lx, ly] = L.aufSchirm([GER.lcd[0] + GER.lcd[2], GER.lcd[1]]);
      g.save(); g.globalAlpha = 1 - p * p;
      g.font = '800 ' + (L.kurz < 420 ? 18 : 22) + 'px ' + SCHRIFT; g.textAlign = 'right'; g.textBaseline = 'bottom';
      g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.55)';
      const y = ly - 6 - (ruh ? 0 : p * 26);
      g.strokeText(s.text, lx, y); g.fillStyle = '#fff'; g.fillText(s.text, lx, y);
      g.restore();
    });
  }
  function figurZeichnen(g, zustand, ruh) {
    const f = S.figur, pose = (zustand === 'spiel' || zustand === 'ende') && S.zeit < f.bis ? f.pose : 'ruhe';
    const img = bilder[pose];
    if (!img) return;
    const h = L.fig.h * POSEN[pose].hoehe, w = h * img.naturalWidth / img.naturalHeight;
    let x = L.fig.rechts ? B - 6 - w : L.fig.x, y = L.fig.unten - h;
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
    id: 'messwert',
    wertung: 'hoch',
    format: p => p.toLocaleString('de-DE') + ' Punkte',
    hoechst: 1000,
    bereich: 'Elektroprüfung',
    hintergrund: { bild: 'bilder/start.webp', position: '50% 62%' },
    figur: POSEN.daumen,
    texte: {
      titel: 'Messwert',
      untertitel: 'Triffst du jeden Messwert?',
      anleitung: 'Setze die Prüfspitze an die richtige Stelle. Dann pendelt der Zeiger: Tippe, wenn er im markierten Sollbereich steht – je mittiger, desto mehr Punkte. Daneben? Messung wiederholen. Drei Fehlmessungen? Ende!',   // MZ-Konzept 23.10.2026 (Ausrufezeichen gewollt)
    },
    // Klänge (Sound Artist, 23.10.2026; Sonniss GDC 2026, Grollen im Raumton Pixabay Universfield): Einzelklänge in der
    // Pegel-Abstufung der Lieferung (lautester = Abbruch auf Spitze 0,89), Schleifen normalisiert und leise gemischt
    klaenge: {
      raum: { datei: 'klaenge/raum.mp3', proben: 573300, pegel: 0.3 },
      pendel: { datei: 'klaenge/pendel.mp3', proben: 35280, pegel: 0.22 },
      stopp: { datei: 'klaenge/stopp.mp3', proben: 2646, pegel: 0.9 },
      bestanden: { datei: 'klaenge/bestanden.mp3', proben: 5263, pegel: 0.8 },
      volltreffer: { datei: 'klaenge/volltreffer.mp3', proben: 10143, pegel: 0.85 },
      fehlmessung: { datei: 'klaenge/fehlmessung.mp3', proben: 9261, pegel: 1 },
      hinweis: { datei: 'klaenge/fehlmessung.mp3', proben: 9261, pegel: 0.4 },
      anschliessen: { datei: 'klaenge/anschliessen.mp3', proben: 5733, pegel: 1 },
      abbruch: { datei: 'klaenge/abbruch.mp3', proben: 22050, pegel: 0.85 },
      geschafft: { datei: 'klaenge/geschafft.mp3', proben: 22050, pegel: 0.9 },
    },
    schleife: 'raum',
    neu, schritt, zeichne, runter, bewegen, hoch, groesse,
  });

  // Testhilfe (nur lesen): als Funktionen aufrufbar
  window.__messwert = {
    zustand() {
      if (!S) return null;
      const m = S.m;
      return { nr: S.nr, phase: S.phase, art: m && m.art.id, objekt: m && m.obj, richtig: m && m.richtig, lernen: m && m.lernen,
        versuch: m && m.versuch, punkte: +S.punkte.toFixed(1), fehl: S.fehl, imBereich: S.imBereich, angesetzt: S.angesetzt,
        voll: S.voll, fertig: S.fertig, stopp: m && m.stopp ? { u: +m.stopp.u.toFixed(4), drin: m.stopp.drin, voll: m.stopp.voll, punkte: +m.stopp.punkte.toFixed(1) } : null };
    },
    plan() { return S && S.liste.map((e, i) => (i + 1) + ': ' + e.art + ' @ ' + e.obj + (e.doppel ? ' (Doppel)' : '')); },
    // Schilder der Anschlusspunkte (Mitte zum Antippen) und der richtige davon
    punkte() { const m = S && S.m; return m && m.chips ? m.chips.map(c => ({ id: c.id, name: PUNKTNAME[c.id], x: Math.round(c.x + c.w / 2), y: Math.round(c.y + c.h / 2), w: Math.round(c.w), h: Math.round(c.h), punkt: [Math.round(c.px), Math.round(c.py)], richtig: c.id === m.richtig })) : null; },
    richtig() { const p = this.punkte(); return p && p.find(c => c.richtig); },
    falsch() { const p = this.punkte(); return p && p.find(c => !c.richtig); },
    // Zeiger: Stellung, Sollbereich (0–1) und Zeit bis zur nächsten Bandmitte (s)
    zeiger() {
      const m = S && S.m; if (!m) return null;
      const mitte = (m.skala.b0 + m.skala.b1) / 2;
      let bis = null;
      if (S.phase === 'pendeln') for (let dt = 0.005; dt < 2 * m.st.pendel + 0.1; dt += 0.002) { const a = zeigerU(S.zeit + dt - 0.002), b = zeigerU(S.zeit + dt); if ((a - mitte) * (b - mitte) <= 0 && dt > 0.01) { bis = +dt.toFixed(3); break; } }
      return { u: +zeigerU(S.zeit).toFixed(4), b0: +m.skala.b0.toFixed(4), b1: +m.skala.b1.toFixed(4), mitte: +mitte.toFixed(4), pendel: m.st.pendel, bisMitte: bis, skala: [m.skala.lo, m.skala.hi] };
    },
    geraet() { return L && { x: Math.round(L.gx), y: Math.round(L.gy), w: Math.round(L.gW), h: Math.round(L.gH) }; },
  };
})();
