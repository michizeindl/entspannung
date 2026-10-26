// Dach-Check (Sammlung „entSPANNUNG“, RSI protect) – Konzept von MZ freigegeben (23.10.2026):
// Suchspiel mit Zeitdruck. Drohnenblick schräg von oben auf ein Flachdach mit Blitzschutzanlage (Fangleitungen, Halter,
// Kreuzverbinder, Fangstangen, Dachaufbauten). Mängel antippen, bevor das Gewitter da ist (25s je Dach). Intaktes antippen
// kostet 2s, leeres Dach antippen kostet nichts. 5 Dächer je Spiel aus einem Pool von 15 (Auswahl und Reihenfolge zufällig,
// „Nochmal“ bevorzugt andere). Mängel je Dach 3/3/4/4/5 (gesamt 19), anfangs auffällige, später unauffälligere; auch die
// Zahl intakter Bauteile steigt.
// Punkte je Dach höchstens 200: jeder gefundene Mangel 100/Anzahl; alle gefunden: Zeitbonus bis 100 (voll ab 13s Restzeit,
// linear bis 0 bei 0s). Zeit abgelaufen: nur die gefundenen zählen. Kein Abbruch, wer durchspielt, hat mindestens 1 Punkt.
//
// Aufbau per Code, jedes Dach neu: Lage in Dachkoordinaten (u quer in „Bodenpixeln“ = Bildpixel der untersten Bildzeile,
// p = Tiefenmaßstab, 1 = unterste Bildzeile, 0 = Fluchtpunkt). Bildpunkt: x = vx + u·p, y = vp + p·(1024 − vp) − z·p
// (z = Höhe über dem Dach in Bodenpixeln). Größe nimmt nach hinten mit p ab. Fangleitungen als Linien in Perspektive.
//
// Testhilfen (Adresse): #ende=sieg-920 | #ende=mittel-640 | #ende=schwach-420 (nach „Los geht's“ sofort das Endbild),
//   #dach=N (Pool-Dach N kommt zuerst), #loesung (Mängel gestrichelt markiert), #ruhig (wie „Bewegung reduzieren“),
//   #schnell (kurze Pausen zwischen den Dächern). window.__dachcheck: Zustand und Bildschirm-Lage der Teile (nur zum Testen).
(function () {
  'use strict';
  const R_ = window.Rahmen;
  const hash = location.hash;
  const TEST = {
    ende: (/(?:^#|&)ende=([a-z]+-)?(\d+)/.exec(hash) || [])[2] || null,
    dach: +((/(?:^#|&)dach=(\d+)/.exec(hash) || [])[1] || 0),
    loesung: /(?:^#|&)loesung(?![a-z])/.test(hash),
    ruhig: /(?:^#|&)ruhig(?![a-z])/.test(hash),
    schnell: /(?:^#|&)schnell(?![a-z])/.test(hash),
  };
  const ruhig = () => TEST.ruhig || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const zufall = (a, b) => a + Math.random() * (b - a);
  const mischen = l => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
  const klemm = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- Regeln ----------
  const ANZAHL = 5;                       // Dächer je Spiel
  const ZEIT = 25;                        // Sekunden je Dach
  const FEHL = 2;                         // Zeitabzug je Fehltipp
  const BONUS_VOLL = 13;                  // Restzeit für den vollen Zeitbonus
  const MAENGEL = [3, 3, 4, 4, 5];        // je Dach in der Runde (gesamt 19)
  // Mischung je Dach: [auffällig, mittel, unauffällig]
  const MISCHUNG = [[3, 0, 0], [2, 1, 0], [1, 2, 1], [1, 2, 1], [1, 2, 2]];
  // Ausstattung je Dach in der Runde (steigt): Fangleitungen quer, Halter, Dachaufbauten, Lichtkuppeln
  const AUSSTATTUNG = [
    // aufbau je +1 (MZ, 24.10.2026: intakte Kanäle/Solarthermie/Dachausstiege/Aufkantungen ähnlich oft wie defekte)
    { quer: 2, halter: 3, aufbau: 2, kuppel: 0 },
    { quer: 2, halter: 4, aufbau: 3, kuppel: 1 },
    { quer: 3, halter: 5, aufbau: 3, kuppel: 1 },
    { quer: 3, halter: 6, aufbau: 4, kuppel: 1 },
    { quer: 3, halter: 7, aufbau: 4, kuppel: 2 },
  ];
  const PAUSE = TEST.schnell ? 0.3 : 1;   // Faktor für Pausen zwischen den Dächern
  // Übersehene Mängel nach „Zeit um“ (MZ, 23.10.2026): ab 0,55s für 3,0s pulsierend mit Namen; Antippen überspringt zum
  // Drohnen-Wechsel, aber erst 0,5s nach Beginn der Anzeige (sonst überspringt man aus Versehen)
  const UEBERSEHEN = { ab: 0.55, dauer: 3.0, sperre: 0.5 };
  // Zeit um, aber alle Mängel gefunden (MZ, 26.10.2026): kein Fehler-Auftritt, nur Schild „Alle Mängel gefunden“
  const VOLLZEIT = { dauer: 1.8, sperre: 0.4 };

  // Die 18 Mangelarten (12 Supervisor 23.10.2026, 5 aus den Bögen d/e, 1 aus Bogen f): stufe 0 auffällig, 1 mittel, 2 unauffällig; wirt = woran der Mangel sitzt
  const MANGEL = {
    'stange-umgekippt': { name: 'Fangstange umgekippt', stufe: 0, wirt: 'stange' },
    'stange-verbogen': { name: 'Fangstange verbogen', stufe: 0, wirt: 'stange' },
    'klima-ohne': { name: 'Klimagerät ohne Fangstange', stufe: 0, wirt: 'aufbau' },
    'draht-lose': { name: 'Draht lose hochgebogen', stufe: 0, wirt: 'halter' },
    'halter-zerbrochen': { name: 'Halter zerbrochen', stufe: 0, wirt: 'halter' },
    'stange-sockel': { name: 'Sockel gebrochen', stufe: 1, wirt: 'stange' },
    'draht-gerissen': { name: 'Draht gerissen', stufe: 1, wirt: 'halter' },
    'halter-umgekippt': { name: 'Halter umgekippt', stufe: 1, wirt: 'halter' },
    'aufbau-ohne': { name: 'ohne Fangstange', stufe: 1, wirt: 'aufbau' },   // Abluftrohr/Dachlüfter/Antenne – Name je Aufbau
    'stange-anschluss': { name: 'Anschluss an der Stange gelöst', stufe: 2, wirt: 'stange' },
    'klemme-fehlt': { name: 'Verbindungsklemme fehlt', stufe: 2, wirt: 'kreuz' },
    'klemme-korrodiert': { name: 'Verbindungsklemme korrodiert', stufe: 2, wirt: 'kreuz' },
    // Bögen d/e (MZ, 23.10.2026): Dreibein, Mess-/Trennstelle, Lüftungskanal, Solarthermie, Dachausstieg – alle kommen auch
    // intakt vor (Ablenkung). Attika-Ableitung aus Bogen d nicht verwendet (Seitenansicht), stattdessen Bogen f (unten).
    'dreibein-umgekippt': { name: 'Dreibein umgekippt', stufe: 0, wirt: 'stange' },
    'kanal-ohne': { name: 'Lüftungskanal ohne Fangstange', stufe: 0, wirt: 'aufbau', aufbau: 'kanal' },
    'trennstelle-offen': { name: 'Trennstelle offen', stufe: 1, wirt: 'halter' },
    'solar-ohne': { name: 'Solarthermie ohne Fangstange', stufe: 1, wirt: 'aufbau', aufbau: 'solar' },
    'ausstieg-ohne': { name: 'Dachausstieg ohne Fangstange', stufe: 1, wirt: 'aufbau', aufbau: 'ausstieg' },
    // Bogen f (MZ, 24.10.2026): Aufkantung/Brandwand-Stück mit Ableitung, steht wie ein Aufbau auf dem Dach
    'attika-ab': { name: 'Ableitung abgerissen', stufe: 1, wirt: 'aufbau', aufbau: 'attika-ab' },
  };
  const AUFBAU_NAME = { abluft: 'Abluftrohr', luefter: 'Dachlüfter', antenne: 'Antenne' };

  // ---------- Bauteile (Bögen dachcheck-teile-a/b/c.png, freigestellt; Maße in Pixeln des Bogens) ----------
  // f = Bodenpixel je Bogenpixel (Fangstangen 0,65 – etwas größer als echt, damit sie die Aufbauten überragen; Leitungsteile
  // 0,535 – deutlich größer als echt, damit Halter und Klemmen antippbar sind; Aufbauten 0,538 → Klimagerät 300 Bodenpixel).
  // fuss = Aufstandspunkt, ansch = Ende des Anschlussdrahts an der Stange, draht = Punkt auf der Leitungsachse,
  // boden = Leitung liegt auf dem Dach (Halter kaputt), bruch = Hauptleitung endet am Bildrand des Teils (Teil bringt sie mit),
  // boxen = Umriss (Anteile [x0, y0, x1, y1]) für Treffer und Abstand.
  const FA = 0.65, FB = 0.535, FC = 0.538, FD = 0.42, FE = 0.42;
  const TEIL = {
    'stange-rund': { f: FA, w: 217, h: 468, fuss: [107, 466], ansch: [197, 325], boxen: [[0, 0.66, 1, 1], [0.38, 0, 0.62, 0.66]] },
    'stange-eckig': { f: FA, w: 255, h: 389, fuss: [128, 383], ansch: [220, 200], boxen: [[0, 0.52, 1, 1], [0.35, 0, 0.65, 0.52]] },
    'stange-umgekippt': { f: FA, w: 466, h: 167, fuss: [105, 165], ansch: [335, 156], boxen: [[0, 0, 1, 1]] },
    'stange-verbogen': { f: FA, w: 263, h: 380, fuss: [107, 378], ansch: [205, 225], boxen: [[0, 0.58, 0.82, 1], [0.3, 0, 1, 0.58]] },
    'stange-sockel': { f: FA, w: 262, h: 456, fuss: [130, 455], ansch: [200, 255], boxen: [[0, 0.62, 1, 1], [0, 0, 0.62, 0.62]] },
    'stange-anschluss': { f: FA, w: 300, h: 456, fuss: [117, 455], ansch: [293, 288], boxen: [[0, 0.62, 0.8, 1], [0.25, 0, 0.55, 0.62], [0.8, 0.58, 1, 0.7]] },
    'halter': { f: FB, w: 352, h: 159, draht: [175, 50], boxen: [[0.28, 0, 0.72, 1]] },
    'halter-umgekippt': { f: FB, w: 354, h: 195, draht: [177, 174], boden: true, bruch: true, boxen: [[0.2, 0, 0.85, 1]] },
    'halter-zerbrochen': { f: FB, w: 352, h: 167, draht: [176, 148], boden: true, bruch: true, boxen: [[0.08, 0, 0.95, 1]] },
    'draht-gerissen': { f: FB, w: 357, h: 51, draht: [178, 25], bruch: true, boxen: [[0.3, 0, 0.7, 1]] },
    'draht-lose': { f: FB, w: 355, h: 210, draht: [177, 105], bruch: true, boxen: [[0.22, 0, 0.78, 1]] },
    'kreuz': { f: FB, w: 361, h: 231, draht: [178, 160], boxen: [[0.36, 0.38, 0.64, 1]] },
    'klemme-fehlt': { f: FB, w: 360, h: 281, draht: [175, 160], boxen: [[0.36, 0.42, 0.62, 0.74]] },
    'klemme-korrodiert': { f: FB, w: 358, h: 229, draht: [180, 160], boxen: [[0.36, 0.38, 0.64, 1]] },
    'klima-gross': { f: FC, w: 558, h: 460, fuss: [279, 452], boxen: [[0, 0, 1, 1]] },
    'klima-klein': { f: FC, w: 376, h: 367, fuss: [188, 360], boxen: [[0, 0, 1, 1]] },
    'abluft': { f: FC, w: 263, h: 425, fuss: [131, 418], boxen: [[0, 0, 1, 1]] },
    'luefter': { f: FC, w: 393, h: 443, fuss: [196, 436], boxen: [[0, 0, 1, 1]] },
    'antenne': { f: FC, w: 387, h: 509, fuss: [200, 495], boxen: [[0, 0, 1, 1]] },
    'lichtkuppel': { f: FC, w: 577, h: 337, fuss: [288, 328], boxen: [[0, 0.1, 1, 1]] },
    // Bogen d (Maße in Pixeln des Bogens, freigestellt): Dreibein-Fangstange im Maßstab der Stangen aus Bogen a (Mast gleich
    // hoch wie „stange-rund“), Anschluss an der rechten Fußklemme. Trennstelle: Kasten auf Gummiplatte, Leitungsstummel
    // abgeschnitten – die Fangleitung (Code) endet an den Kabelverschraubungen ein/aus; Platte steht auf dem Dach (draht =
    // Leitungshöhe 109 Bogenpixel über der Plattenunterkante).
    'dreibein': { f: FA, w: 426, h: 463, fuss: [212, 425], ansch: [339, 386], boxen: [[0, 0.68, 1, 1], [0.18, 0.52, 0.82, 0.68], [0.42, 0, 0.58, 0.52]] },
    'dreibein-umgekippt': { f: FA, w: 493, h: 302, fuss: [190, 250], ansch: [87, 196], boxen: [[0, 0, 0.67, 1], [0.6, 0.36, 1, 0.64]] },
    'trennstelle': { f: FB, w: 294, h: 216, draht: [147, 90], ein: [2, 118], aus: [292, 63], bruch: true, boxen: [[0.02, 0.05, 0.98, 1]] },
    'trennstelle-offen': { f: FB, w: 307, h: 252, draht: [153, 119], ein: [2, 133], aus: [305, 70], bruch: true, boxen: [[0.02, 0.1, 0.98, 1]] },
    // Bogen e (Dachaufbauten wie Klimagerät: intakt mit Fangstange daneben, Mangel ohne)
    // große Aufbauten etwas kleiner (FE = 0,42 statt 0,538), damit sie samt Fangstange auch im Hochformat Platz finden
    'kanal': { f: FE, w: 599, h: 533, fuss: [272, 470], boxen: [[0, 0.4, 0.82, 1], [0.15, 0.3, 0.92, 0.75], [0.76, 0, 1, 0.62]] },
    'solar': { f: FE, w: 572, h: 516, fuss: [250, 480], boxen: [[0, 0, 1, 1]] },
    'ausstieg': { f: FE, w: 450, h: 297, fuss: [225, 262], boxen: [[0, 0, 1, 1]] },
    // Bogen f (Drohnenblick, Dachfläche des Bogens weggeschnitten, dunkle Anschlussbahn bleibt): Aufkantung mit Blechabdeckung,
    // Ableitung mit 2 Haltern; defekt am unteren Halter abgerissen. fuss = Mitte der Wand-Unterkante, ansch = Ende des
    // Drahts auf dem Dach (dort setzt die Leitung aus dem Code an, ableitung: true). Wand ca. 295 Bodenpixel breit.
    'attika': { f: FD, w: 702, h: 597, fuss: [347, 450], ansch: [199, 591], ableitung: true, boxen: [[0, 0, 1, 0.86], [0.26, 0.76, 0.54, 1]] },
    'attika-ab': { f: FD, w: 703, h: 597, fuss: [347, 450], ansch: [225, 591], ableitung: true, boxen: [[0, 0, 1, 0.86], [0.28, 0.76, 0.66, 1]] },
  };
  const HOEHE_LEITUNG = (159 - 50) * FB;   // Fangleitung liegt auf den Haltern ≈ 58 Bodenpixel über dem Dach
  const DRAHT = 30 * FB;                   // Leitungsdicke in Bodenpixeln (wie in den Teilen des Bogens b)
  const MIN_TREFFER = 46;                  // Trefferfläche mindestens so groß (Bildschirmpixel)

  // ---------- Dächer (dachcheck-dach-1…6.png, 1536×1024; Himmel ausgeschnitten) ----------
  // himmel = Zeile, bis zu der der Himmel reicht (dahinter Hügel/Stadt), vp/vx = Fluchtpunkt der Dachfläche (aus den Fugen
  // bzw. dem Plattenweg gemessen; die Bilder sind nicht exakt perspektivisch), rand = vordere Kante der Attika hinten
  // (Teile stehen mindestens 90 Zeilen davor), sperre = Flächen ohne Teile (Bildkoordinaten).
  const DAECHER = [
    { nr: 1, name: 'Bitumendach', bild: 'bilder/dach-1.webp', himmel: 248, vp: 200, vx: 768, rand: 380, sperre: [] },
    { nr: 2, name: 'Foliendach mit Lichtband', bild: 'bilder/dach-2.webp', himmel: 262, vp: 248, vx: 760, rand: 388,
      sperre: [{ poly: [[1050, 360], [1536, 360], [1536, 640], [1370, 610]] }] },
    { nr: 3, name: 'Kiesdach mit Plattenweg', bild: 'bilder/dach-3.webp', himmel: 295, vp: 197, vx: 768, rand: 352,
      wege: [{ u: 0, halb: 121.5 }], sperre: [{ kreis: [115, 495, 80] }, { kreis: [1410, 495, 80] }] },
    { nr: 4, name: 'Dach mit Treppenhaus', bild: 'bilder/dach-4.webp', himmel: 280, vp: 204, vx: 756, rand: 400,
      sperre: [{ rect: [0, 220, 350, 450] }, { rect: [1280, 330, 1536, 480] }] },
    { nr: 5, name: 'Gründach', bild: 'bilder/dach-5.webp', himmel: 250, vp: 200, vx: 768, rand: 365, sperre: [] },
    { nr: 6, name: 'Dach mit PV-Anlage', bild: 'bilder/dach-6.webp', himmel: 246, vp: 101, vx: 763, rand: 415,
      sperre: [{ rect: [40, 310, 1500, 425] }] },
    // 7–15 (MZ, 23.10.2026: Pool 15 Dächer). 7 Kräne, 13 Schornstein, 15 Hochhäuser ragen über den Horizont (bleiben im Bild)
    { nr: 7, name: 'Trapezblechdach', bild: 'bilder/dach-7.webp', himmel: 233, vp: 237, vx: 750, rand: 340, sperre: [] },
    { nr: 8, name: 'Dach mit Shed-Oberlichtern', bild: 'bilder/dach-8.webp', himmel: 192, vp: 200, vx: 768, rand: 350,
      sperre: [{ rect: [0, 270, 1536, 385] }] },
    { nr: 9, name: 'Dach mit Lüftungsanlage', bild: 'bilder/dach-9.webp', himmel: 246, vp: 94, vx: 754, rand: 380,
      sperre: [{ rect: [0, 280, 520, 450] }] },
    { nr: 10, name: 'Schuldach mit heller Folie', bild: 'bilder/dach-10.webp', himmel: 248, vp: 189, vx: 779, rand: 395, sperre: [] },
    { nr: 11, name: 'Dach mit Rückkühlern', bild: 'bilder/dach-11.webp', himmel: 244, vp: 184, vx: 782, rand: 390,
      sperre: [{ rect: [170, 270, 1360, 420] }] },
    { nr: 12, name: 'Kiesdach mit Plattenweg links', bild: 'bilder/dach-12.webp', himmel: 283, vp: 200, vx: 768, rand: 400,
      sperre: [{ poly: [[250, 390], [370, 390], [140, 525], [0, 600], [0, 490]] }] },
    { nr: 13, name: 'Dach mit Ziegelschornstein', bild: 'bilder/dach-13.webp', himmel: 285, vp: 234, vx: 764, rand: 395,
      sperre: [{ rect: [1320, 0, 1490, 430] }] },
    { nr: 14, name: 'Bitumendach am Fluss', bild: 'bilder/dach-14.webp', himmel: 204, vp: 12, vx: 762, rand: 355, sperre: [] },
    { nr: 15, name: 'Bürodach mit Dachterrasse', bild: 'bilder/dach-15.webp', himmel: 287, vp: 200, vx: 768, rand: 414,
      sperre: [{ poly: [[1280, 370], [1536, 370], [1536, 630], [1460, 610]] }] },
  ];

  // ---------- Bilder ----------
  const bilder = {};
  const POSEN = {
    ruhe: { bild: 'bilder/frau-ruhe.webp', blick: 'links', hoehe: 1 },
    daumen: { bild: 'bilder/frau-daumen.webp', blick: 'links', hoehe: 1 },
    jubel: { bild: 'bilder/frau-jubel.webp', blick: 'frontal', hoehe: 0.94 },
    entsetzt: { bild: 'bilder/frau-entsetzt.webp', blick: 'frontal', hoehe: 0.955 },
  };
  function lade(name, datei) { const i = new Image(); i.onload = () => { bilder[name] = i; }; i.src = datei; }
  lade('hell', 'bilder/himmel-hell.webp');
  lade('dunkel', 'bilder/himmel-dunkel.webp');
  // Dachbilder erst bei Bedarf (nur die 5 des Spiels, je ca. 75–300 KB)
  const dachLaden = d => { if (d && !bilder['dach' + d.nr] && !d.laedt) { d.laedt = true; lade('dach' + d.nr, d.bild); } };
  Object.keys(TEIL).forEach(n => lade(n, 'bilder/teil-' + n + '.webp'));
  Object.keys(POSEN).forEach(n => lade(n, POSEN[n].bild));

  // ---------- Lage ----------
  let B = 0, H = 0;
  const hoch = () => H > B * 1.05;
  function figurMasse() {
    const fh = hoch() ? klemm(H * 0.14, 84, 130) : klemm(H * 0.3, 90, 190);
    return { fh, fw: fh * 0.58 };
  }
  // Knopf „Weiter“ unten rechts (MZ, 24.10.2026), Abstand zum Rand inkl. Geräte-Aussparung
  let sonde = null;
  function sicher() {
    if (!sonde) { sonde = document.createElement('div'); sonde.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:0 env(safe-area-inset-right) env(safe-area-inset-bottom) 0'; document.body.appendChild(sonde); }
    const s = getComputedStyle(sonde); return { r: parseFloat(s.paddingRight) || 0, u: parseFloat(s.paddingBottom) || 0 };
  }
  function knopfRect() {
    const sa = sicher(), w = Math.round(klemm(B * 0.32, 112, 170)), h = 46;
    const x = B - w - 14 - sa.r, y = H - h - 14 - sa.u;
    return [x, y, x + w, y + h];
  }
  function figurRect() { const { fh, fw } = figurMasse(); return [0, H - fh - 10, fw + 14, H]; }
  // Standard-Ansicht eines Dachs für das aktuelle Format: Himmelslinie bei 33 % (hoch) bzw. 20 % (quer) der Höhe, Bild
  // deckt Breite und Höhe ab (unten darf das Dach angeschnitten sein)
  function ansichtFuer(d) {
    // Hochformat (Spielertest 24.10.2026): Dachfläche 15 % größer, damit die Mängel am Handy besser zu erkennen sind
    // (Himmelslinie etwas höher, vorne wird das Dach weiter angeschnitten); quer unverändert
    const himmelY = hoch() ? H * 0.25 : Math.max(62, H * 0.2);
    const s = Math.max(B / 1536, (H - himmelY) / (1024 - d.himmel)) * (hoch() ? (d.zoomHoch || ZOOM_HOCH) : 1);
    return { s, ox: (B - 1536 * s) / 2, oy: himmelY - d.himmel * s, deckt: true };
  }
  const OBEN = 76;
  const FUNDTEXT = 2.8;   // s: Mangel-Name nach dem Finden (vorher 1,3s), weich ausgeblendet in den letzten 0,5s
  const ZOOM_HOCH = 1.15;
  // Teile-Maßstab je Format: im Hochformat ist nur ein schmaler Streifen des Dachs zu sehen – Teile dort kleiner als
  // „echt“ zum Dach (sonst passt die Anlage nicht in die Breite); quer volle Größe
  const teileMassstab = () => klemm(B / H + 0.2, 0.62, 1);   // darunter beginnt der Spielbereich (Anzeige + Zeitbalken)
  function groesse(b, h) {
    B = b; H = h;
    if (S && S.szene) S.szene.V = ansichtPassend(S.szene);
  }

  // ---------- Szene: Abbildung ----------
  function abb(sz) {
    const d = sz.d, V = sz.V, D = 1024 - d.vp, ts = sz.ts || 1;
    return {
      // Dachpunkt (u, p, Höhe z) → Bildschirm; Höhen und Teilegrößen mit dem Teile-Maßstab ts des Formats
      P: (u, p, z) => [V.ox + (d.vx + u * p) * V.s, V.oy + (d.vp + p * D - (z || 0) * p * ts) * V.s],
      ts, st: V.s * ts,
      // Bildschirmzeile → Tiefenmaßstab p (Dachfläche)
      pVon: y => ((y - V.oy) / V.s - d.vp) / D,
      uVon: (x, p) => ((x - V.ox) / V.s - d.vx) / p,
      // Bildschirm → Bildkoordinaten
      bild: (x, y) => [(x - V.ox) / V.s, (y - V.oy) / V.s],
      s: V.s,
    };
  }
  // Lage eines Teils auf dem Bildschirm: Zeichenrechteck, Boxen, Anschluss-/Leitungspunkte
  function geo(sz, t, A) {
    A = A || abb(sz);
    const T = TEIL[t.typ], k = T.f * t.p * A.st;
    const anker = T.draht || T.fuss, z = T.draht && !T.boden ? HOEHE_LEITUNG : 0;
    const [X, Y] = A.P(t.u, t.p, z);
    const sp = !!t.spiegel;
    const x0 = sp ? X - (T.w - anker[0]) * k : X - anker[0] * k, y0 = Y - anker[1] * k;
    const boxen = T.boxen.map(([a, b, c, e]) => {
      const bx0 = sp ? 1 - c : a, bx1 = sp ? 1 - a : c;
      return [x0 + bx0 * T.w * k, y0 + b * T.h * k, x0 + bx1 * T.w * k, y0 + e * T.h * k];
    });
    const r = { x: x0, y: y0, w: T.w * k, h: T.h * k, k, X, Y, boxen, spiegel: sp };
    if (T.ansch) r.ansch = [sp ? x0 + (T.w - T.ansch[0]) * k : x0 + T.ansch[0] * k, y0 + T.ansch[1] * k];
    if (T.draht) {   // Leitungsenden des Teils (bruch): eigene Punkte ein/aus (Trennstelle) oder Bildrand auf Leitungshöhe
      const pt = q => [sp ? x0 + (T.w - q[0]) * k : x0 + q[0] * k, y0 + q[1] * k];
      r.links = T.ein ? pt(sp ? T.aus : T.ein) : [x0, Y]; r.rechts = T.aus ? pt(sp ? T.ein : T.aus) : [x0 + T.w * k, Y];
    }
    return r;
  }
  const huelle = boxen => boxen.reduce((m, b) => [Math.min(m[0], b[0]), Math.min(m[1], b[1]), Math.max(m[2], b[2]), Math.max(m[3], b[3])], [1e9, 1e9, -1e9, -1e9]);
  const schneiden = (a, b, rand) => a[0] < b[2] + rand && b[0] < a[2] + rand && a[1] < b[3] + rand && b[1] < a[3] + rand;
  // Trefferfläche: Hülle der Boxen, mindestens MIN_TREFFER breit und hoch
  function treffer(g) {
    const h = huelle(g.boxen), cx = (h[0] + h[2]) / 2, cy = (h[1] + h[3]) / 2;
    const w = Math.max(MIN_TREFFER, h[2] - h[0]), hh = Math.max(MIN_TREFFER, h[3] - h[1]);
    return [cx - w / 2, cy - hh / 2, cx + w / 2, cy + hh / 2];
  }

  // Passt die Szene nicht mehr ins Format (Drehen mitten im Dach), wird die Ansicht verkleinert, bis alle Teile sichtbar sind
  function ansichtPassend(sz) {
    const V = ansichtFuer(sz.d);
    if (!sz.teile || !sz.teile.length) return V;
    const probe = Object.assign({}, sz, { V });
    const A = abb(probe);
    let h = [1e9, 1e9, -1e9, -1e9];
    sz.teile.forEach(t => { const g = geo(probe, t, A); h = huelle([h, [g.x, g.y, g.x + g.w, g.y + g.h]]); });
    const fl = [8, OBEN, B - 8, H - 4];
    if (h[0] >= fl[0] && h[1] >= fl[1] && h[2] <= fl[2] && h[3] <= fl[3]) return V;
    // Bildkoordinaten der Hülle, neu einpassen
    const i0 = [(h[0] - V.ox) / V.s, (h[1] - V.oy) / V.s], i1 = [(h[2] - V.ox) / V.s, (h[3] - V.oy) / V.s];
    const s = Math.min(V.s, (fl[2] - fl[0]) / (i1[0] - i0[0]), (fl[3] - fl[1]) / (i1[1] - i0[1]));
    const ox = (fl[0] + fl[2]) / 2 - (i0[0] + i1[0]) / 2 * s, oy = Math.min(fl[3] - i1[1] * s, Math.max(fl[1] - i0[1] * s, V.oy + (V.s - s) * 400));
    return { s, ox, oy, deckt: false };
  }

  // ---------- Szene: Aufbau ----------
  // Mängel für ein Dach wählen (Mischung nach Stufe), möglichst Arten, die in diesem Spiel noch selten kamen
  function maengelWaehlen(nr, benutzt) {
    const liste = [];
    MISCHUNG[nr].forEach((n, stufe) => {
      const arten = mischen(Object.keys(MANGEL).filter(a => MANGEL[a].stufe === stufe));
      arten.sort((a, b) => (benutzt[a] || 0) - (benutzt[b] || 0));
      for (let i = 0; i < n; i++) liste.push(arten[i % arten.length]);
    });
    return liste;
  }
  function bauen(nr, d, benutzt) {
    let arten = maengelWaehlen(nr, benutzt);
    // bis zu 3 Mängel-Mischungen je 120 Versuche (selten nötig: schmales Hochformat mit Plattenweg); passt es mit dem
    // Hochformat-Zoom nicht (enger Ausschnitt, z. B. Plattenweg in der Mitte), etwas weniger Zoom
    for (const z of [ZOOM_HOCH, 1.07, 1]) {
      d.zoomHoch = z;
      const V = ansichtFuer(d);
      for (let runde = 0; runde < 3; runde++) {
        if (runde) arten = maengelWaehlen(nr, {});
        for (let v = 0; v < 120; v++) {
          const sz = versuch(nr, d, V, arten, v);
          if (sz) return sz;
        }
      }
      if (!hoch()) break;
    }
    const V = ansichtFuer(d);
    console.warn('Dach-Check: Dach ' + d.nr + ' ohne vollständigen Aufbau');
    return versuch(nr, d, V, arten.slice(0, 2), 999) || { nr, d, V, ts: teileMassstab(), teile: [], tief: [], quer: [], laengs: [], maengel: [], M: 0 };
  }
  const GRUENDE = {};   // Testhilfe: woran Aufbau-Versuche scheitern
  const nein = w => { GRUENDE[w] = (GRUENDE[w] || 0) + 1; return null; };
  function versuch(nr, d, V, arten, v) {
    const sz = { nr, d, V, ts: teileMassstab(), teile: [], tief: [], quer: [], laengs: [] };
    const A = abb(sz);
    const aus = Object.assign({}, AUSSTATTUNG[nr]);
    if (v > 50) { aus.halter = Math.max(2, aus.halter - 2); aus.kuppel = 0; }   // eng (z. B. flaches Querformat): weniger Beiwerk
    const fig = figurRect(), knopfR = knopfRect();
    const fl = [10, OBEN, B - 10, H - 6];
    const pFern = Math.max(0.3, (d.rand + 90 - d.vp) / (1024 - d.vp));
    const pNah = Math.min(1.03, A.pVon(H - 10));
    if (pNah - pFern < 0.1) return nein('1');
    const yF = A.P(0, pFern)[1], yN = A.P(0, pNah)[1];
    // Längsleitungen: normal 2; wenn es zu eng wird 1 bzw. keine – dann werden Klemmen-Mängel zu „Anschluss gelöst“
    // (gleiche Stufe, braucht keinen Kreuzverbinder)
    const nL = v < 60 ? 2 : v < 100 ? 1 : 0;
    // ganz eng (Weg im schmalen Hochformat): Halter-Mängel werden zu Stangen-Mängeln derselben Stufe
    const ersatzHalter = ['stange-verbogen', 'stange-sockel'];
    // sehr eng (z. B. PV-Feld, Gullys im Hochformat): große Aufbauten (Kanal, Solarthermie, Dachausstieg) werden zu kleineren
    // Aufbau-Mängeln derselben Stufe (Klimagerät bzw. Abluftrohr/Lüfter/Antenne)
    const maengel = arten.map(a => nL === 0 && MANGEL[a].wirt === 'kreuz' ? 'stange-anschluss'
      : v >= 100 && MANGEL[a].wirt === 'halter' ? ersatzHalter[MANGEL[a].stufe]
      : v >= 105 && MANGEL[a].wirt === 'aufbau' ? ersatzHalter[MANGEL[a].stufe]   // kein Platz für Aufbauten (PV-Feld quer)
      : v >= 90 && MANGEL[a].aufbau ? (MANGEL[a].stufe === 0 ? 'klima-ohne' : 'aufbau-ohne')
      : v >= 90 && a === 'dreibein-umgekippt' ? 'stange-verbogen' : a);   // liegendes Dreibein ist breit
    const nQuer = aus.quer;
    const wirt = w => maengel.filter(a => MANGEL[a].wirt === w);
    const mStange = wirt('stange'), mHalter = wirt('halter'), mKreuz = wirt('kreuz'), mAufbau = wirt('aufbau');
    const nHalter = Math.max(aus.halter, mHalter.length + 2);
    const nAufbau = Math.max(aus.aufbau, mAufbau.length + 1);
    const breitFormat = B / H > 1.2;

    // --- Querleitungen (gleiche Tiefe = waagerecht auf dem Bildschirm). Das Netz ist größer als der Ausschnitt: Enden
    // laufen aus dem Bild oder enden an einer Fangstange (quer meistens, im Hochformat seltener – dort ist es eng).
    const anteile = nQuer === 2 ? [0.3, 0.8] : [0.13, 0.5, 0.87];
    const quer = anteile.map(a => ({ p: A.pVon(yF + (yN - yF) * klemm(a + zufall(-0.05, 0.05), 0.04, 0.96)) }));
    const pVorn = quer[quer.length - 1].p;
    const stH = TEIL['stange-rund'].w * FA * pVorn * A.st;   // Breite eines Sockels vorne
    const vornY = A.P(0, pVorn)[1];
    const figLinks = vornY > fig[1] - 30 ? fig[2] : 0;
    const uL = A.uVon(figLinks + 10 + stH * 0.55 + zufall(4, 30), pVorn), uR = A.uVon(B - 10 - stH * 0.55 - zufall(4, 30), pVorn);
    if (uR - uL < 150) return nein('2');
    const mitte = (uL + uR) / 2;
    // Längsleitungen (zum Fluchtpunkt) mit Kreuzverbindern; nie auf Wegen
    const kreuzRand = (TEIL.kreuz.w * FB * 0.2 * pVorn * A.st + 26) / (pVorn * A.s);
    const sichtL = A.uVon(fl[0] + figLinks, pVorn) + kreuzRand, sichtR = A.uVon(fl[2], pVorn) - kreuzRand;
    const ud = (sichtR - sichtL) / 2 * zufall(0.3, 0.62);
    let laengs = nL === 2 ? [mitte - ud, mitte + ud] : nL === 1 ? [mitte + (sichtR - sichtL) / 2 * zufall(-0.5, 0.5)] : [];
    laengs = laengs.map(u => ausWeg(d, u, 70)).sort((a, b) => a - b);
    if (laengs.some(u => u < sichtL || u > sichtR)) return nein('3');
    if (laengs.length === 2 && (laengs[1] - laengs[0]) * pVorn * A.s < 110) return nein('4');
    // Enden je Querleitung: Fangstange (Anteil je Format) oder aus dem Bild
    const stangeAnteil = breitFormat ? 0.85 : 0.4;
    quer.forEach((q, i) => {
      const wackel = i < quer.length - 1 ? 1 : 0;
      q.uL = uL + wackel * zufall(-30, 80); q.uR = uR - wackel * zufall(-30, 80);
      q.stL = Math.random() < stangeAnteil; q.stR = Math.random() < stangeAnteil;
      q.ausL = A.uVon(-60, q.p); q.ausR = A.uVon(B + 60, q.p);   // Ende außerhalb des Bildes
    });
    sz.tief = laengs.map(u => ({ u, p0: (d.rand + 25 - d.vp) / (1024 - d.vp), p1: 1.25 }));

    const teile = sz.teile;
    const passt = t => {
      const g = geo(sz, t, A);
      const rahmen = TEIL[t.typ].draht ? huelle(g.boxen) : [g.x, g.y, g.x + g.w, g.y + g.h];
      if (rahmen[0] < fl[0] || rahmen[2] > fl[2] || rahmen[1] < fl[1] || rahmen[3] > fl[3]) return false;
      if (g.boxen.some(b => schneiden(b, fig, 4) || schneiden(b, knopfR, 6))) return false;
      for (const o of teile) {
        if ((t.schutzFuer && t.schutzFuer === o) || (o.schutzFuer && o.schutzFuer === t)) continue;   // Stange hinter ihrem Aufbau
        const go = geo(sz, o, A);
        if (g.boxen.some(b => go.boxen.some(c => schneiden(b, c, 7)))) return false;
      }
      return !gesperrt(d, A, g, t);
    };
    // Fangstangen: rund, eckig oder Dreibein (Dreibein ca. 20 %, damit es auch intakt regelmäßig vorkommt)
    const stangenTyp = () => { const r = Math.random(); return r < 0.2 ? 'dreibein' : r < 0.76 ? 'stange-rund' : 'stange-eckig'; };

    // Kreuzverbinder zuerst (feste Lage)
    const kreuze = [];
    quer.forEach(q => laengs.forEach(u => kreuze.push({ typ: 'kreuz', u, p: q.p, leitung: q })));
    mischen(kreuze.slice()).slice(0, mKreuz.length).forEach((k, i) => { k.typ = mKreuz[i]; k.mangel = mKreuz[i]; });
    for (const k of kreuze) { if (!passt(k)) return nein('6'); teile.push(k); }
    // Fangstangen an den Enden (passt eine nicht, läuft die Leitung dort aus dem Bild)
    const stangen = [];
    quer.forEach(q => {
      if (q.stL) { const e = { typ: stangenTyp(), u: q.uL, p: q.p, spiegel: false, leitung: q }; if (passt(e)) { teile.push(e); stangen.push(e); } else q.stL = false; }
      if (q.stR) { const e = { typ: stangenTyp(), u: q.uR, p: q.p, spiegel: true, leitung: q }; if (passt(e)) { teile.push(e); stangen.push(e); } else q.stR = false; }
      if (!q.stL) q.uL = q.ausL;
      if (!q.stR) q.uR = q.ausR;
    });
    // Halter: Plätze gleichmäßig zwischen den Stützpunkten jeder Querleitung (nur im sichtbaren Teil)
    const plaetze = [];
    quer.forEach(q => {
      const st = [q.stL ? q.uL : A.uVon(fl[0], q.p), ...laengs, q.stR ? q.uR : A.uVon(fl[2], q.p)];
      for (let i = 0; i < st.length - 1; i++) {
        const a = st[i], b = st[i + 1], lenPx = (b - a) * q.p * A.s, halterPx = TEIL.halter.w * FB * q.p * A.st;
        const n = Math.max(0, Math.floor((lenPx - halterPx * 0.9) / (halterPx * 1.25)));
        for (let j = 1; j <= n; j++) plaetze.push({ u: a + (b - a) * j / (n + 1), p: q.p, leitung: q });
      }
    });
    mischen(plaetze);
    const halterArten = mischen(mHalter.slice());
    let gesetzt = 0, trennIntakt = Math.random() < 0.5;   // intakte Trennstelle als Ablenkung in ca. jedem 2. Dach
    for (const pl of plaetze) {
      if (gesetzt >= nHalter) break;
      const typ = gesetzt < halterArten.length ? halterArten[gesetzt] : trennIntakt ? 'trennstelle' : 'halter';
      const t = { typ, u: pl.u, p: pl.p, leitung: pl.leitung, mangel: typ !== 'halter' && typ !== 'trennstelle' ? typ : null };
      if (!passt(t)) continue;
      teile.push(t); gesetzt++;
      if (typ === 'trennstelle') trennIntakt = false;
    }
    if (gesetzt < halterArten.length) return nein('7');
    // Freistehende Fangstangen mit Anschluss ans Netz – so viele, dass alle Stangen-Mängel einen Platz haben und es
    // mindestens zwei Fangstangen gibt (Vergleich intakt/mangelhaft)
    const nFrei = Math.max(0, mStange.length + 1 - stangen.length, 2 - stangen.length) + (breitFormat ? 0 : 1);
    for (let i = 0, tr = 0; i < nFrei && tr < 80; tr++) {
      const p = zufall(pFern + 0.03, pNah - 0.02);
      const st = { typ: stangenTyp(), u: A.uVon(zufall(fl[0] + 30, fl[2] - 30), p), p, frei: true };
      const ziel = naechsteLeitung(A, st, quer, laengs);
      const [zx, zy] = A.P(ziel.u, ziel.p), [sx, sy] = A.P(st.u, st.p);
      st.spiegel = zx < sx;
      st.verbindung = ziel;
      if (Math.hypot(zx - sx, zy - sy) > B * 0.35) continue;
      if (!abstandLeitungen(sz, A, st, quer, laengs, sy)) continue;
      if (!passt(st)) continue;
      teile.push(st); stangen.push(st); i++;
    }
    if (stangen.length < mStange.length) return nein('5');
    // Stangen-Mängel verteilen (Mangel-Teil hat einen anderen Umriss: neu prüfen, sonst nächste Stange)
    let vergeben = 0;
    for (const e of mischen(stangen.slice())) {
      if (vergeben >= mStange.length) break;
      const alt = e.typ; e.typ = mStange[vergeben];
      const i = teile.indexOf(e); teile.splice(i, 1);
      if (passt(e)) { e.mangel = e.typ; vergeben++; } else e.typ = alt;
      teile.splice(i, 0, e);
    }
    if (vergeben < mStange.length) return nein('5b');

    // Dachaufbauten mit Fangstange daneben (ohne = Mangel), Lichtkuppeln (nur Beiwerk)
    const aufbauten = [];
    const sonst = mischen(['abluft', 'luefter', 'antenne']);
    let si = 0;
    mAufbau.forEach(a => {
      if (a === 'klima-ohne') aufbauten.push({ typ: Math.random() < 0.5 ? 'klima-gross' : 'klima-klein', mangel: a });
      else if (MANGEL[a].aufbau) aufbauten.push({ typ: MANGEL[a].aufbau, mangel: a });   // Lüftungskanal, Solarthermie, Dachausstieg
      else aufbauten.push({ typ: sonst[si++ % 3], mangel: 'aufbau-ohne' });
    });
    // intakte Aufbauten (Fangstange daneben): zuerst dieselbe Art wie die Aufbau-Mängel dieses Dachs (Vergleich intakt/mangelhaft,
    // sonst wäre z. B. ein Lüftungskanal immer ein Mangel), dann die übrigen Arten zufällig
    const gleich = aufbauten.map(a => a.typ === 'attika-ab' ? 'attika' : a.typ);   // hier stehen erst die Mängel in der Liste
    // danach alle Arten in zufälliger Reihenfolge (MZ, 24.10.2026: alle Arten intakt etwa so oft wie defekt)
    const frei = [...new Set([...mischen(gleich), ...mischen(['kanal', 'solar', 'ausstieg', 'attika', 'klima-gross', 'klima-klein', 'abluft', 'luefter', 'antenne'])])];
    for (let j = 0; aufbauten.length < nAufbau; j++) aufbauten.push({ typ: frei[j % frei.length] });
    for (let i = 0; i < aus.kuppel; i++) aufbauten.push({ typ: 'lichtkuppel', kuppel: true });
    // Mängel zuerst setzen (müssen Platz finden), Beiwerk danach
    aufbauten.sort((a, b) => (!!b.mangel - !!a.mangel) || (!!a.kuppel - !!b.kuppel));
    for (const ab of aufbauten) {
      let ok = false;
      // Mängel und Beiwerk 70 Versuche, intakte Aufbauten mit Fangstange 160 (brauchen zwei freie Plätze nebeneinander)
      const versuche = ab.mangel || ab.kuppel ? 70 : 160;
      for (let tr = 0; tr < versuche && !ok; tr++) {
        const p = zufall(pFern + 0.04, pNah - 0.02);
        const y = A.P(0, p)[1];
        const u = A.uVon(zufall(fl[0] + 30, fl[2] - 30), p);
        const t = { typ: ab.typ, u, p, mangel: ab.mangel || null, aufbau: true };
        if (!abstandLeitungen(sz, A, t, quer, laengs, y)) continue;
        if (!passt(t)) continue;
        let st = null;
        if (TEIL[ab.typ].ableitung) {   // Aufkantung: Draht auf dem Dach an die nächste Leitung anschließen (intakt und defekt)
          const ziel = naechsteLeitung(A, t, quer, laengs), ge = geo(sz, t, A), [zx, zy] = A.P(ziel.u, ziel.p);
          if (Math.hypot(zx - ge.ansch[0], zy - ge.ansch[1]) > B * 0.4) continue;
          t.verbindung = ziel;
        } else if (!ab.mangel && !ab.kuppel) {
          // Fangstange neben dem Aufbau, etwas dahinter (wirkt höher), Seite zum Netz hin; Anschluss zur nächsten Leitung
          const seite = (u > mitte ? -1 : 1) * (tr % 3 === 2 ? -1 : 1), T = TEIL[ab.typ];   // meist zur Mitte, manchmal nach außen
          // jeder 2. Versuch: Stange direkt hinter dem Aufbau (Mast ragt darüber) – passt auch ins schmale Hochformat
          const hinter = tr % 2 === 1;
          const ps = p - (hinter ? 0.045 : 0.025);
          const du = hinter ? seite * T.w * T.f * zufall(0.12, 0.3) * A.ts : seite * ((T.w / 2) * T.f + TEIL['stange-rund'].w * FA * 0.5 + zufall(12, 40)) * A.ts;
          st = { typ: 'stange-rund', u: (u + du) * p / ps, p: ps, spiegel: false, schutz: true, schutzFuer: hinter ? t : null };
          const ziel = naechsteLeitung(A, st, quer, laengs);
          st.spiegel = A.P(ziel.u, ziel.p)[0] < A.P(st.u, st.p)[0];
          st.verbindung = ziel;
          if (!abstandLeitungen(sz, A, st, quer, laengs, A.P(0, ps)[1])) continue;
          teile.push(t);
          const okSt = passt(st);
          teile.pop();
          if (!okSt) continue;
        }
        teile.push(t);
        if (st) teile.push(st);
        ok = true;
      }
      if (!ok && ab.mangel) return nein('8');
    }
    // Bezeichnungen der Mängel
    teile.forEach(t => {
      if (!t.mangel) return;
      t.name = t.mangel === 'aufbau-ohne' ? AUFBAU_NAME[t.typ] + ' ohne Fangstange' : MANGEL[t.mangel].name;
    });
    sz.quer = quer;
    sz.laengs = laengs;
    sz.maengel = teile.filter(t => t.mangel);
    if (sz.maengel.length !== arten.length && v !== 999) return nein('9');
    sz.M = sz.maengel.length;
    return sz;
  }
  // Aufbauten stehen nicht auf Leitungen: Fußbereich frei von Querleitungen, seitlich frei von Längsleitungen
  function abstandLeitungen(sz, A, t, quer, laengs, y) {
    const g = geo(sz, t, A), T = TEIL[t.typ];
    const tiefe = (T.boxen[0][3] - T.boxen[0][1]) * g.h * (t.aufbau ? 0.35 : 0.3);
    for (const q of quer) {
      const yq = A.P(0, q.p)[1];
      if (yq > y - tiefe - 6 && yq < y + 14 + g.h * 0.1) return false;
    }
    for (const u of laengs) {
      const xl = A.P(u, t.p)[0], h = huelle(g.boxen);
      if (xl > h[0] - 12 && xl < h[2] + 12) return false;
    }
    return true;
  }
  // nächster Punkt des Leitungsnetzes (Abstand auf dem Bildschirm): Querleitung in derselben Spalte oder Längsleitung auf gleicher Tiefe
  function naechsteLeitung(A, st, quer, laengs) {
    const [sx, sy] = A.P(st.u, st.p);
    let best = null;
    const nimm = (u, p) => { const [x, y] = A.P(u, p), dd = Math.hypot(x - sx, (y - sy) * 1.6); if (!best || dd < best.dd) best = { u, p, dd }; };
    quer.forEach(q => nimm(klemm(st.u * st.p / q.p, q.uL + 40, q.uR - 40), q.p));
    laengs.forEach(u => nimm(u, st.p));
    return best;
  }
  // Sperrflächen (Lichtband, Plattenweg, Gullys, Treppenhaus, PV): Fußbereich des Teils in Bildkoordinaten prüfen
  function gesperrt(d, A, g, t) {
    const h = huelle(g.boxen), fussY = TEIL[t.typ].draht ? g.Y + g.h * 0.2 : h[3];
    const a = A.bild(h[0], fussY - (h[3] - h[1]) * 0.3), b = A.bild(h[2], fussY);
    const r = [a[0], a[1], b[0], b[1]];
    for (const w of d.wege || []) {   // Wege (Dachkoordinaten: Mitte u, halbe Breite)
      const ym = (r[1] + r[3]) / 2, pm = (ym - d.vp) / (1024 - d.vp), hw = w.halb * pm + 18, wx = d.vx + w.u * pm;
      if (r[0] < wx + hw && r[2] > wx - hw) return true;
    }
    for (const z of d.sperre) {
      if (z.rect && schneiden(r, z.rect, 10)) return true;
      if (z.kreis) {
        const [cx, cy, rr] = z.kreis, nx = klemm(cx, r[0], r[2]), ny = klemm(cy, r[1], r[3]);
        if (Math.hypot(nx - cx, ny - cy) < rr) return true;
      }
      if (z.poly && [[r[0], r[1]], [r[2], r[1]], [r[0], r[3]], [r[2], r[3]], [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2]].some(pt => innen(pt, z.poly))) return true;
    }
    return false;
  }
  // Längsleitung nicht auf einem Weg: zur näheren Wegseite schieben
  function ausWeg(d, u, rand) {
    for (const w of d.wege || []) if (Math.abs(u - w.u) < w.halb + rand) u = u < w.u ? w.u - w.halb - rand : w.u + w.halb + rand;
    return u;
  }
  function innen([x, y], poly) {
    let i = false;
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      const [xa, ya] = poly[a], [xb, yb] = poly[b];
      if ((ya > y) !== (yb > y) && x < (xb - xa) * (y - ya) / (yb - ya) + xa) i = !i;
    }
    return i;
  }

  // ---------- Auswahl der Dächer ----------
  function auswahl() {
    let zuletzt = [];
    try { zuletzt = JSON.parse(localStorage.getItem('mg:dachcheck:zuletzt') || '[]'); } catch (e) { /* privat */ }
    // zuletzt nicht gespielte Dächer zuerst, dann zufällig – 5 von 6, Reihenfolge zufällig
    const g = DAECHER.map(d => ({ d, alt: zuletzt.includes(d.nr) ? 1 : 0, z: Math.random() })).sort((a, b) => (a.alt - b.alt) || (a.z - b.z));
    let wahl = mischen(g.slice(0, ANZAHL).map(e => e.d));
    if (zuletzt.length && wahl[0].nr === zuletzt[0] && wahl.length > 1) wahl.push(wahl.shift());   // nicht mit demselben Dach beginnen
    if (TEST.dach) {
      const f = DAECHER.find(d => d.nr === TEST.dach);
      if (f) wahl = [f, ...wahl.filter(d => d !== f)].slice(0, ANZAHL);
    }
    // Dach 3 (Plattenweg mittig) nie als letztes Dach: dort passen im Hochformat nicht immer 5 Mängel (Probe 24.10.2026)
    const i3 = wahl.findIndex(d => d.nr === 3);
    if (i3 === wahl.length - 1 && wahl.length > 2) [wahl[i3], wahl[i3 - 2]] = [wahl[i3 - 2], wahl[i3]];
    if (R_.zustand === 'spiel') try { localStorage.setItem('mg:dachcheck:zuletzt', JSON.stringify(wahl.map(d => d.nr))); } catch (e) { /* privat */ }
    return wahl;
  }

  // ---------- Zustand ----------
  let S = null;
  function neu() {
    S = { nr: 0, folge: auswahl(), phase: 'herein', phaseT: 0, zeit: 0, uhr: 0, szene: null, alt: null, punkte: 0,
      ergebnisse: [], fehltipps: 0, gefundenGesamt: 0, benutzt: {}, figur: { pose: 'ruhe', bis: 0, hupf: 0 }, klicks: [],
      schilder: [], abzuege: [], hinweis: true, blitz: null, leuchten: null, leuchtenUm: 0, donner: [], testEnde: !!TEST.ende,
      qAlt: 0, front: Math.random() < 0.5 ? 1 : -1, wind: null, gewitter: null };
    if (R_.zustand === 'spiel') S.folge.slice(0, 2).forEach(dachLaden);
    anzeigen();
  }
  function szeneNeu() {
    S.folge.slice(S.nr, S.nr + 2).forEach(dachLaden);
    const sz = bauen(S.nr, S.folge[S.nr], S.benutzt);
    sz.maengel.forEach(t => { S.benutzt[t.mangel] = (S.benutzt[t.mangel] || 0) + 1; });
    sz.gefunden = 0;
    sz.V = ansichtPassend(sz);
    S.szene = sz;
    S.front = -S.front;
    S.donner = [{ q: zufall(0.22, 0.32), ton: 'donnerA' }, { q: zufall(0.5, 0.58), ton: 'donnerB' }, { q: zufall(0.76, 0.84), ton: 'donnerC' }];
    S.leuchtenUm = 0; S.leuchten = null; S.blitz = null;
    anzeigen();
  }
  function anzeigen() {
    const sz = S && S.szene;
    // keine Mängel-Anzahl (MZ, 24.10.2026: nicht verraten, wie viele noch fehlen)
    R_.anzeige('Dach ' + (S.nr + 1) + '/' + ANZAHL, '');
  }
  const q = () => S.phase === 'suchen' || S.phase === 'zeitum' || S.phase === 'geschafft' || S.phase === 'vollzeit' ? Math.min(1, S.uhr / ZEIT) : 0;

  // ---------- Ablauf ----------
  function schritt(dt) {
    if (!B) return;
    if (S.testEnde) { S.testEnde = false; testEnde(); return; }
    if (!S.szene) { szeneNeu(); S.phase = 'herein'; S.phaseT = 0; R_.ton('drohne'); }
    S.zeit += dt; S.phaseT += dt;
    const sz = S.szene;
    // dunkler Himmel je Dach neu gelegt, erst wenn er nicht mehr zu sehen ist (Beginn der Suche)
    const suchen = () => { S.phase = 'suchen'; S.phaseT = 0; S.uhr = 0; S.dachStart = S.zeit; S.dunkelStart = zufall(0, 0.5); };
    if (S.phase === 'herein' && S.phaseT >= 0.9) suchen();
    if (S.phase === 'suchen') {
      S.uhr += dt;
      const qq = q();
      S.donner.forEach(dn => { if (!dn.los && qq >= dn.q) { dn.los = true; R_.ton(dn.ton); } });
      if (S.uhr >= ZEIT) zeitUm();
    } else if (S.phase === 'geschafft' && S.phaseT >= 1.3 * PAUSE + 0.2) weiter();
    else if (S.phase === 'vollzeit' && S.phaseT >= VOLLZEIT.dauer * PAUSE) weiter();
    else if (S.phase === 'zeitum') {
      if (!S.uebersehenTon && S.phaseT >= UEBERSEHEN.ab) { S.uebersehenTon = true; if (sz.maengel.some(t => !t.gefunden)) R_.ton('uebersehen'); }
      if (S.phaseT >= UEBERSEHEN.ab + UEBERSEHEN.dauer * PAUSE + 0.3 * PAUSE) weiter();
    } else if (S.phase === 'wechsel' && S.phaseT >= 1.0) { S.alt = null; suchen(); }
    // Klangteppich: ruhiger Wind am Anfang, mit dem Zuziehen Gewitter
    if (!S.wind) { S.wind = R_.dauerton('wind'); S.gewitter = R_.dauerton('gewitter'); }
    const qq = S.phase === 'wechsel' ? S.qAlt * (1 - Math.min(1, S.phaseT / 0.8)) : q();
    S.wind.stellen(1 - 0.7 * qq);
    S.gewitter.stellen(0.12 + 0.88 * qq);
    S.abzuege = S.abzuege.filter(a => S.zeit - a.t0 < 0.9);
  }
  function gefundenTon() { R_.ton('gefunden'); }
  function zeitUm() {
    const sz = S.szene;
    S.uhr = ZEIT;
    if (sz.gefunden >= sz.M) {   // alles gefunden, nur nicht auf „Weiter“ getippt: 100 Punkte ohne Zeitbonus, kein Fehler-Auftritt
      S.phase = 'vollzeit'; S.phaseT = 0;
      R_.ton('gefunden');
      figur('daumen', 1.6);
      dachWerten(sz, 0);
      return;
    }
    S.phase = 'zeitum'; S.phaseT = 0; S.uebersehenTon = false; S.vorzeitig = false;
    S.blitz = { t0: S.zeit, pfad: blitzPfad() };
    R_.ton('zeitum'); R_.vibrieren([60, 40, 60]);
    figur('entsetzt', 2.2);
    dachWerten(sz, 0);
  }
  // „Weiter“: vollständig → wie bisher geschafft (Zeitbonus aus der Restzeit beim Tippen); sonst übersehene Mängel zeigen,
  // ohne Zeitbonus und ohne zusätzlichen Abzug (Variante a, MZ 24.10.2026)
  function fertigTippen() {
    const sz = S.szene;
    R_.ton('klick');
    if (sz.gefunden >= sz.M) return alleGefunden();
    S.phase = 'zeitum'; S.phaseT = 0; S.uebersehenTon = false; S.vorzeitig = true;
    figur('entsetzt', 1.6);
    dachWerten(sz, 0);
  }
  function alleGefunden() {
    const sz = S.szene;
    S.phase = 'geschafft'; S.phaseT = 0;
    R_.ton('geschafft');
    figur('jubel', 1.4, true);
    dachWerten(sz, Math.max(0, ZEIT - S.uhr));
  }
  function dachWerten(sz, rest) {
    const g = sz.gefunden, M = sz.M || 1;
    const bonus = g === M ? 100 * klemm(rest / BONUS_VOLL, 0, 1) : 0;
    const p = g * 100 / M + bonus;
    S.ergebnisse.push({ dach: sz.d.nr, gefunden: g, M: sz.M, rest: +rest.toFixed(1), punkte: +p.toFixed(1) });
    S.punkte = S.ergebnisse.reduce((a, e) => a + e.punkte, 0);
    S.qAlt = q();
  }
  function weiter() {
    if (S.nr >= ANZAHL - 1) { S.phase = 'fertig'; return endbild(); }
    S.alt = S.szene;
    S.nr++;
    S.hinweis = false;
    szeneNeu();
    S.phase = 'wechsel'; S.phaseT = 0; S.uhr = 0;
    R_.ton('drohne');
  }
  function figur(pose, dauer, hupf) { S.figur.pose = pose; S.figur.bis = S.zeit + dauer; if (hupf) S.figur.hupf = S.zeit; }

  function bewertung(p, alles) {
    // alle Mängel gefunden, aber Zeit abgelaufen statt „Weiter“ (MZ, 26.10.2026): kein „Mängel übersehen“
    if (alles && p < 700) return ['Alles gefunden – zu langsam', 'MIT MÄNGELN', 'mittel', 'daumen'];
    if (p >= 900) return ['Nichts entgeht dir', 'GEPRÜFT', 'gut', 'jubel'];
    if (p >= 800) return ['Scharfer Prüferblick', 'GEPRÜFT', 'gut', 'jubel'];
    if (p >= 700) return ['Gründlich geprüft', 'GEPRÜFT', 'gut', 'daumen'];
    if (p >= 550) return ['Einiges übersehen', 'MIT MÄNGELN', 'mittel', 'daumen'];
    return ['Mängel übersehen', 'MÄNGEL', 'schlecht', 'entsetzt'];
  }
  function endbild() {
    const punkte = Math.max(1, Math.min(1000, Math.round(S.punkte)));
    const gef = S.ergebnisse.reduce((a, e) => a + e.gefunden, 0), ges = S.ergebnisse.reduce((a, e) => a + e.M, 0);
    const [titel, stempel, art, pose] = bewertung(punkte, ges > 0 && gef >= ges);
    const felder = [['Mängel gefunden', gef + ' von ' + ges], ['Fehltipps', String(S.fehltipps)]];
    R_.ende(punkte, { ueberschrift: titel, felder, stempel: { text: stempel, art }, figur: POSEN[pose], verzoegerung: 500 });
  }
  function testEnde() {
    const p = Math.max(1, Math.min(1000, +TEST.ende)), ges = MAENGEL.reduce((a, b) => a + b, 0);
    const gef = Math.round(ges * Math.min(1, 0.35 + p / 1000 * 0.65));
    S.ergebnisse = [{ gefunden: gef, M: ges, punkte: p }];
    S.fehltipps = p >= 900 ? 0 : p >= 600 ? 2 : 5;
    S.punkte = p;
    endbild();
  }

  // ---------- Eingabe ----------
  function runter(x, y) {
    if (!S || !S.szene) return;
    S.klicks.push({ x, y, t0: S.zeit });
    if (S.phase === 'zeitum' && S.phaseT >= UEBERSEHEN.ab + UEBERSEHEN.sperre) { weiter(); return; }   // Anzeige überspringen
    if (S.phase === 'vollzeit' && S.phaseT >= VOLLZEIT.sperre) { weiter(); return; }
    if (S.phase !== 'suchen') return;
    const kr = knopfRect();
    if (x >= kr[0] - 4 && x <= kr[2] + 4 && y >= kr[1] - 4 && y <= kr[3] + 4) { S.knopfDruck = S.zeit; fertigTippen(); return; }
    S.hinweis = false;
    const sz = S.szene, A = abb(sz);
    // nächstes Teil, dessen Trefferfläche die Tippstelle enthält (bei Überlappung das mit der nächsten Mitte)
    let best = null, bd = Infinity;
    sz.teile.forEach(t => {
      const g = geo(sz, t, A), tr = treffer(g);
      if (x < tr[0] - 4 || x > tr[2] + 4 || y < tr[1] - 4 || y > tr[3] + 4) return;
      const h = huelle(g.boxen), dd = Math.hypot(x - (h[0] + h[2]) / 2, y - (h[1] + h[3]) / 2) - (t.mangel && !t.gefunden ? 6 : 0);
      if (dd < bd) { bd = dd; best = t; }
    });
    if (!best) return;                       // leeres Dach: nur der Klick-Ring
    if (best.mangel) {
      if (best.gefunden) return;
      best.gefunden = S.zeit;
      sz.gefunden++; S.gefundenGesamt++;
      // Mangel-Name ca. 2,8s zeigen (MZ, 24.10.2026); höchstens 2 Schilder zugleich – ein drittes lässt das älteste rasch ausblenden
      const offen = S.schilder.filter(s => S.zeit < s.ende);
      if (offen.length >= 2) offen[0].ende = Math.min(offen[0].ende, S.zeit + 0.35);
      S.schilder.push({ t: best, t0: S.zeit, ende: S.zeit + FUNDTEXT });
      gefundenTon();
      anzeigen();
      figur('daumen', 1.0);   // kein automatischer Wechsel mehr, wenn alle gefunden sind (MZ, 24.10.2026)
      return;
    }
    // Intaktes angetippt: 2s Abzug
    S.uhr += FEHL; S.fehltipps++;
    S.abzuege.push({ x, y, t0: S.zeit, t: best });
    R_.ton('fehltipp'); R_.vibrieren(40);
    figur('entsetzt', 0.9);
    if (S.uhr >= ZEIT) zeitUm();
  }

  // ---------- Zeichnen ----------
  function zeichne(g, b, h, zustand, dt) {
    if (b !== B || h !== H) groesse(b, h);
    if (!S) neu();
    const ruh = ruhig(), t = S.zeit;
    g.fillStyle = '#5d6b78'; g.fillRect(0, 0, B, H);
    if (zustand === 'start' || !S.szene) { himmelZeichnen(g, null, 0, t, ruh); return; }
    let qq = q();
    if (S.phase === 'wechsel') qq = S.qAlt * (1 - Math.min(1, S.phaseT / 0.8));
    if (S.phase === 'herein') qq = 0;
    const sz = S.szene;
    himmelZeichnen(g, sz, qq, t, ruh);
    // Dach(er): im Wechsel schwenkt die Drohne – altes Dach gleitet hinaus, neues herein
    // (Drohne fliegt weiter: altes Dach zoomt zur Seite weg, neues kommt von der anderen Seite und blendet darüber)
    if (S.phase === 'wechsel' && S.alt) {
      const e = Math.min(1, S.phaseT / 1.0), w = e * e * (3 - 2 * e);
      szeneZeichnen(g, S.alt, -S.front, 1, ruh ? 1 : 1 + 0.14 * w);
      szeneZeichnen(g, sz, S.front, w, ruh ? 1 : 1 + 0.12 * (1 - w));
    } else if (S.phase === 'herein') {
      const e = Math.min(1, S.phaseT / 0.9), w = e * e * (3 - 2 * e);
      szeneZeichnen(g, sz, S.front, w, ruh ? 1 : 1 + 0.12 * (1 - w));
    } else szeneZeichnen(g, sz, 0, 1, 1);
    // Gewitterlicht: Dach wird mit dem Zuziehen dunkler und fahl
    if (qq > 0.001) {
      g.save(); g.globalCompositeOperation = 'multiply';
      const f = qq * 0.36;
      g.fillStyle = `rgb(${Math.round(255 * (1 - f))},${Math.round(255 * (1 - f * 1.05))},${Math.round(255 * (1 - f * 1.5))})`;
      g.fillRect(0, 0, B, H); g.restore();
    }
    blitzZeichnen(g, sz, t, ruh);
    if (S.phase !== 'wechsel' && S.phase !== 'herein') markenZeichnen(g, sz, t, ruh);
    figurZeichnen(g, zustand);
    if (S.phase === 'suchen' || S.phase === 'geschafft' || S.phase === 'zeitum' || S.phase === 'vollzeit') zeitbalken(g, ruh);
    if (S.phase === 'vollzeit') vollSchild(g, t, ruh);
    if (S.hinweis && S.nr === 0 && S.phase === 'suchen' && S.uhr < 4.5) hinweisZeichnen(g, t, ruh);
    if (zustand === 'spiel' && S.phase === 'suchen') weiterKnopf(g, t);
    abzuegeZeichnen(g);
    klicksZeichnen(g);
    g.canvas.style.cursor = zustand === 'spiel' ? 'pointer' : '';
  }

  // Himmel: heller Mittagshimmel (Quellwolken), von einer Seite schiebt sich der dunkle Gewitterhimmel mit weicher Kante
  // herein (Zeitanzeige); beide Schichten ziehen (hell 10 %, dunkel 14 % der Bildbreite pro Minute), der dunkle brodelt.
  const himmelLeinwand = document.createElement('canvas');
  function himmelZeichnen(g, sz, qq, t, ruh) {
    const linie = z => z.V.oy + (z.d.himmel + 12) * z.V.s;
    const unten = sz ? Math.max(linie(sz), S.alt && S.phase === 'wechsel' ? linie(S.alt) + H * 0.1 : 0) : H * 0.45;
    // Ohne Kacheln/Spiegeln (keine sichtbare Naht): Bild breiter als der Bildschirm, es gleitet langsam zur Seite.
    // hell: über das ganze Spiel (10 %/min, reicht ca. 170s), dunkel: je Dach neu (14 %/min, Startlage zufällig)
    const hh = Math.max(unten, 40), w = Math.max(B * 1.4, hh * 1.5 * 1.04), h = w / 1.5;
    const y0 = hh - h * 0.92;
    const kachel = (img, tempo, wob, zeit, start) => {
      // Brodeln nur vergrößernd (Bild deckt immer ab)
      const ww = w * (wob ? 1 + 0.0075 * (1 + Math.sin(t * 2 * Math.PI / 13 + 1)) : 1), hhh = h * (wob ? 1 + 0.015 * (1 + Math.sin(t * 2 * Math.PI / 9)) : 1);
      const spiel = w - B, weg = ruh ? spiel * 0.3 : Math.min(spiel, spiel * (start || 0) + zeit * tempo * ww / 60);
      return (x, gg) => gg.drawImage(img, x - weg - (ww - w) / 2, y0 + h - hhh, ww, hhh);
    };
    if (bilder.hell) kachel(bilder.hell, 10, false, t, 0)(0, g);
    if (qq > 0.002 && bilder.dunkel) {
      // dunkle Front: Kante wandert von der Startseite über den Himmel (bei q ≈ 0,8 ganz zu), weiche Kante ca. 35 % Breite
      const f = 0.5, c = himmelLeinwand, cw = Math.ceil(B * f), ch = Math.ceil(Math.min(H, hh + 4) * f);
      if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
      const x = c.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, cw, ch);
      x.setTransform(f, 0, 0, f, 0, 0);
      kachel(bilder.dunkel, 14, !ruh, S.zeit - (S.dachStart || 0), S.dunkelStart || 0)(0, x);
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.globalCompositeOperation = 'destination-in';
      const weich = 0.35 * cw, fort = Math.min(1, qq / 0.8), ease = fort * fort * (3 - 2 * fort);
      const kante = -weich + (cw + 2 * weich) * ease;
      const lin = S.front > 0 ? x.createLinearGradient(kante - weich, 0, kante + weich, 0) : x.createLinearGradient(cw - kante + weich, 0, cw - kante - weich, 0);
      lin.addColorStop(0, 'rgba(0,0,0,1)'); lin.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = lin; x.fillRect(0, 0, cw, ch);
      x.globalCompositeOperation = 'source-over';
      g.save(); g.globalAlpha = ruh ? Math.min(1, qq / 0.8) : 1;
      if (ruh) { g.drawImage(bilder.dunkel, 0, y0, w, h); } else g.drawImage(c, 0, 0, B, ch / f);
      g.restore();
    }
    // fernes Wetterleuchten im letzten Drittel – nur im Himmel, nie über dem Dach
    if (sz && qq > 0.62 && S.phase === 'suchen' && !ruh) {
      if (!S.leuchten && t >= S.leuchtenUm) {
        S.leuchtenUm = t + zufall(2.2, 4.2);
        S.leuchten = { t0: t, x: zufall(0.1, 0.9) * B, y: unten * zufall(0.55, 0.85), r: Math.max(B, unten) * zufall(0.25, 0.4) };
      }
      if (S.leuchten) {
        const p = t - S.leuchten.t0;
        if (p > 1.1) S.leuchten = null;
        else {
          const a = 0.32 * Math.max(Math.exp(-p * 8), p > 0.3 ? Math.exp(-(p - 0.3) * 7) * 0.7 : 0), L = S.leuchten;
          const rg = g.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
          rg.addColorStop(0, `rgba(255,245,215,${a})`); rg.addColorStop(1, 'rgba(255,230,190,0)');
          g.save(); g.beginPath(); g.rect(0, 0, B, unten - 10); g.clip();
          g.globalCompositeOperation = 'lighter'; g.fillStyle = rg; g.fillRect(L.x - L.r, L.y - L.r, 2 * L.r, 2 * L.r); g.restore();
        }
      }
    }
  }
  // Blitz bei „Zeit um“: zackiger Blitz im Himmel bis zum Horizont, helles Aufflackern über allem
  function blitzPfad() {
    const sz = S.szene, unten = sz.V.oy + sz.d.himmel * sz.V.s;
    let x = zufall(0.25, 0.75) * B, y = -10;
    const pts = [[x, y]], n = 9;
    for (let i = 1; i <= n; i++) { y = -10 + (unten + 10) * i / n; x += zufall(-0.06, 0.06) * B; pts.push([x, y]); }
    return pts;
  }
  function blitzZeichnen(g, sz, t, ruh) {
    if (!S.blitz) return;
    const p = t - S.blitz.t0;
    if (p > 1.2) return;
    const blitzA = p < 0.45 ? (p < 0.08 || (p > 0.16 && p < 0.3) ? 1 : 0.35) : Math.max(0, 1 - (p - 0.45) / 0.4);
    if (blitzA > 0) {
      g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
      [[9, `rgba(200,220,255,${0.35 * blitzA})`], [3.5, `rgba(255,255,255,${blitzA})`]].forEach(([lw, f]) => {
        g.lineWidth = lw; g.strokeStyle = f; g.beginPath();
        S.blitz.pfad.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
      });
      g.restore();
    }
    const fl = ruh ? 0.25 * Math.max(0, 1 - p / 0.5) : (p < 0.1 ? 0.6 : p < 0.18 ? 0.15 : p < 0.26 ? 0.4 : Math.max(0, 0.4 - (p - 0.26) * 0.8));
    if (fl > 0) { g.fillStyle = `rgba(240,245,255,${fl})`; g.fillRect(0, 0, B, H); }
  }

  // Eine Szene zeichnen: Dachbild, Längsleitungen und Anschlüsse, dann Querleitungen und Teile nach Tiefe (hinten zuerst)
  // seite: Zoom-Mittelpunkt links (−1) oder rechts (+1) – wirkt wie ein Schwenk der Drohne
  function szeneZeichnen(g, sz, seite, alpha, zoom) {
    if (alpha <= 0.002) return;
    const V = sz.V, A = abb(sz);
    g.save();
    g.globalAlpha = alpha;
    if (zoom !== 1) { const zx = B * (0.5 + 0.45 * seite), zy = H * 0.65; g.translate(zx, zy); g.scale(zoom, zoom); g.translate(-zx, -zy); }
    const img = bilder['dach' + sz.d.nr];
    if (!V.deckt) {   // Ansicht verkleinert (Drehen mitten im Dach): Rest mit Dachfarbe füllen
      const y = V.oy + sz.d.himmel * V.s;
      g.fillStyle = '#4c5156'; g.fillRect(0, y, B, H - y);
    }
    if (img) g.drawImage(img, V.ox, V.oy, 1536 * V.s, 1024 * V.s);
    // Längsleitungen (unter allem; Teile stehen nie darauf)
    sz.tief.forEach(l => leitungLaengs(g, A, l));
    // Anschlüsse der Schutz-Fangstangen an das Netz
    sz.teile.forEach(t => { if (t.verbindung) verbindungZeichnen(g, sz, A, t); });
    // Querleitungen und Teile nach Tiefe
    const liste = sz.teile.map(t => ({ p: t.p, t })).concat(sz.quer.map(qu => ({ p: qu.p - 1e-6, quer: qu })));
    liste.sort((a, b) => a.p - b.p);
    liste.forEach(e => {
      if (e.quer) leitungQuer(g, sz, A, e.quer);
      else teilZeichnen(g, sz, A, e.t);
    });
    // Testhilfe #loesung: Mängel gestrichelt
    if (TEST.loesung) sz.maengel.forEach(t => {
      if (t.gefunden) return;
      const tr = treffer(geo(sz, t, A));
      g.save(); g.setLineDash([5, 4]); g.lineWidth = 2; g.strokeStyle = 'rgba(255,80,200,.95)';
      g.strokeRect(tr[0], tr[1], tr[2] - tr[0], tr[3] - tr[1]); g.restore();
    });
    g.restore();
  }
  function drahtStrich(g, pts, dicke, schattenZ) {
    if (pts.length < 2) return;
    const zug = (w, f, dy) => { g.lineWidth = w; g.strokeStyle = f; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y + dy) : g.moveTo(x, y + dy)); g.stroke(); };
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    if (schattenZ) { g.save(); g.lineWidth = dicke * 1.3; g.strokeStyle = 'rgba(0,0,0,.12)'; g.beginPath(); pts.forEach(([x, y], i) => { const yy = y + (schattenZ[i] || 0); i ? g.lineTo(x, yy) : g.moveTo(x, yy); }); g.stroke(); g.restore(); }
    zug(dicke + 1.4, 'rgba(25,28,32,.6)', 0);
    zug(dicke, '#a3a9af', 0);
    zug(Math.max(0.8, dicke * 0.38), 'rgba(240,244,247,.85)', -dicke * 0.18);
    g.restore();
  }
  // Querleitung: Polylinie über Stützpunkte (Stangen-Anschluss, Halter, Kreuze); Teile mit eigener Leitung (bruch) unterbrechen
  function leitungQuer(g, sz, A, qu) {
    const auf = sz.teile.filter(t => t.leitung === qu).map(t => ({ t, g: geo(sz, t, A) })).sort((a, b) => a.t.u - b.t.u);
    const dicke = Math.max(1.2, DRAHT * qu.p * A.st), zH = HOEHE_LEITUNG * qu.p * A.st;
    let strecke = [], schatten = [];
    const fertig = () => { drahtStrich(g, strecke, dicke, schatten); strecke = []; schatten = []; };
    if (!qu.stL) { strecke.push(A.P(qu.uL, qu.p, HOEHE_LEITUNG)); schatten.push(zH); }   // läuft links aus dem Bild
    auf.forEach(({ t, g: ge }) => {
      const T = TEIL[t.typ];
      if (T.fuss) {   // Fangstange am Ende: Leitung beginnt/endet am Anschluss
        if (!t.spiegel) { strecke.push(ge.ansch); schatten.push(ge.Y - ge.ansch[1]); }
        else { strecke.push(ge.ansch); schatten.push(ge.Y - ge.ansch[1]); fertig(); }
        return;
      }
      if (T.bruch) {
        strecke.push(ge.links); schatten.push(T.boden ? 0 : zH); fertig();
        strecke.push(ge.rechts); schatten.push(T.boden ? 0 : zH);
      } else { strecke.push([ge.X, ge.Y]); schatten.push(zH); }
    });
    if (!qu.stR) { strecke.push(A.P(qu.uR, qu.p, HOEHE_LEITUNG)); schatten.push(zH); }   // läuft rechts aus dem Bild
    fertig();
  }
  // Längsleitung: Band in Perspektive (Dicke nimmt nach hinten ab), auf Leitungshöhe, darunter Schatten
  function leitungLaengs(g, A, l) {
    const n = 6, pts = [];
    for (let i = 0; i <= n; i++) { const p = l.p0 + (l.p1 - l.p0) * i / n; pts.push({ p, a: A.P(l.u, p, HOEHE_LEITUNG), s: A.P(l.u, p, 0) }); }
    const band = (dz, breite, f, wahl) => {
      g.beginPath();
      pts.forEach((e, i) => { const [x, y] = e[wahl]; const w = breite * e.p * A.st / 2; i ? g.lineTo(x - w, y + dz * e.p * A.st) : g.moveTo(x - w, y + dz * e.p * A.st); });
      for (let i = pts.length - 1; i >= 0; i--) { const e = pts[i], [x, y] = e[wahl], w = breite * e.p * A.st / 2; g.lineTo(x + w, y + dz * e.p * A.st); }
      g.closePath(); g.fillStyle = f; g.fill();
    };
    band(0, DRAHT * 1.3, 'rgba(0,0,0,.12)', 's');
    band(0, DRAHT + 3, 'rgba(25,28,32,.6)', 'a');
    band(0, DRAHT, '#a3a9af', 'a');
    band(-DRAHT * 0.18, DRAHT * 0.38, 'rgba(240,244,247,.85)', 'a');
  }
  function verbindungZeichnen(g, sz, A, t) {
    const ge = geo(sz, t, A), v = t.verbindung, ziel = A.P(v.u, v.p, HOEHE_LEITUNG);
    const dicke = Math.max(1.1, DRAHT * (t.p + v.p) / 2 * A.st);
    // vom Anschluss senkrecht neben den Sockel aufs Dach, dann zur Leitung
    if (TEIL[t.typ].ableitung) { drahtStrich(g, [ge.ansch, ziel], dicke, [0, HOEHE_LEITUNG * v.p * A.st]); return; }   // Draht liegt auf dem Dach
    const unten = [ge.ansch[0], ge.Y - HOEHE_LEITUNG * 0.4 * t.p * A.st];
    drahtStrich(g, [ge.ansch, unten, ziel], dicke, [0, 0, HOEHE_LEITUNG * v.p * A.st]);
  }
  function teilZeichnen(g, sz, A, t) {
    const img = bilder[t.typ];
    if (!img) return;
    const ge = geo(sz, t, A), T = TEIL[t.typ];
    // weicher Schatten am Fuß (Stangen und Aufbauten)
    if (T.fuss) {
      const fb = T.boxen[0], rx = (fb[2] - fb[0]) * ge.w * 0.55, cx = ge.spiegel ? ge.x + (1 - (fb[0] + fb[2]) / 2) * ge.w : ge.x + (fb[0] + fb[2]) / 2 * ge.w;
      g.save(); g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(cx + rx * 0.08, ge.Y - rx * 0.05, rx, rx * 0.26, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
    if (ge.spiegel) { g.save(); g.translate(ge.x + ge.w, ge.y); g.scale(-1, 1); g.drawImage(img, 0, 0, ge.w, ge.h); g.restore(); }
    else g.drawImage(img, ge.x, ge.y, ge.w, ge.h);
  }

  // Markierungen: gefundene Mängel (Kreis + Haken im Prüfer-Stil, Schild mit Namen ca. 1,2s), übersehene (pulsierend mit Namen)
  function markenZeichnen(g, sz, t, ruh) {
    const A = abb(sz);
    sz.maengel.forEach(m => {
      const ge = geo(sz, m, A), h = huelle(ge.boxen), cx = (h[0] + h[2]) / 2, cy = (h[1] + h[3]) / 2;
      // Ellipse um den Umriss (hohe Stangen: schmal und hoch)
      const rx = Math.max(24, 0.68 * (h[2] - h[0])), ry = Math.max(22, 0.62 * (h[3] - h[1])), r = Math.min(rx, ry);
      if (m.gefunden) {
        const e = Math.min(1, (t - m.gefunden) / 0.28), pop = ruh ? 1 : 1 + 0.35 * (1 - e) * (1 - e);
        g.save();
        g.translate(cx, cy); g.scale(pop, pop);
        g.lineWidth = 4.5; g.strokeStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(0, 0, rx, ry, -0.08, 0.2, Math.PI * 2 - 0.05); g.stroke();
        g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.stroke();
        // Haken-Plakette oben rechts
        const bx = rx * 0.74, by = -ry * 0.68, br = Math.max(10, Math.min(15, r * 0.32));
        g.fillStyle = '#0F9CD8'; g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill();
        g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
        g.lineWidth = Math.max(2.2, br * 0.24); g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(bx - br * 0.45, by + br * 0.02); g.lineTo(bx - br * 0.1, by + br * 0.38); g.lineTo(bx + br * 0.5, by - br * 0.35); g.stroke();
        g.restore();
      } else if (S.phase === 'zeitum' && S.phaseT >= UEBERSEHEN.ab) {
        const p = ruh ? 0.5 : 0.5 + 0.5 * Math.sin((S.phaseT - UEBERSEHEN.ab) * Math.PI * 2 / 0.5);
        g.save(); g.translate(cx, cy);
        g.lineWidth = 3 + 2 * p; g.strokeStyle = `rgba(255,74,53,${0.6 + 0.4 * p})`;
        g.setLineDash([8, 6]); g.beginPath(); g.ellipse(0, 0, rx * (1 + 0.08 * p), ry * (1 + 0.08 * p), 0, 0, Math.PI * 2); g.stroke();
        g.restore();
      }
    });
    // Schilder
    S.schilder = S.schilder.filter(s => t < s.ende && s.t.gefunden && sz.teile.includes(s.t));
    const belegt = [];
    S.schilder.forEach(s => schild(g, sz, A, s.t, Math.min(1, (t - s.t0) / 0.15, (s.ende - t) / 0.5), false, belegt));
    if (S.phase === 'zeitum' && S.phaseT >= UEBERSEHEN.ab) sz.maengel.filter(m => !m.gefunden).forEach(m => schild(g, sz, A, m, Math.min(1, (S.phaseT - UEBERSEHEN.ab) / 0.2), true, belegt));
  }
  function schild(g, sz, A, m, a, uebersehen, belegt) {
    if (a <= 0) return;
    const ge = geo(sz, m, A), h = huelle(ge.boxen);
    g.save();
    g.font = '700 14px "Titillium Web", "Segoe UI", system-ui, sans-serif';
    const tw = g.measureText(m.name).width, w = tw + 22, hh = 28;
    let x = klemm((h[0] + h[2]) / 2 - w / 2, 6, B - w - 6), y = h[1] - hh - 10;
    if (y < OBEN) y = h[3] + 8;
    // nicht über andere Schilder legen
    for (let i = 0; i < 6; i++) {
      const r = [x, y, x + w, y + hh];
      if (!belegt.some(b => schneiden(r, b, 3))) break;
      y += hh + 4;
    }
    y = klemm(y, OBEN, H - hh - 4);
    belegt.push([x, y, x + w, y + hh]);
    g.globalAlpha = a;
    g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
    g.fillStyle = '#fff'; rund(g, x, y, w, hh, 5); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = uebersehen ? '#ff4a35' : '#FFD500'; g.fillRect(x + 6, y + 3, w - 12, 2.5);
    g.fillStyle = uebersehen ? '#b3261e' : '#191919'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillText(m.name, x + 11, y + hh / 2 + 2);
    g.restore();
  }
  // Zeitbalken oben mittig wie bei der Blitzkugel: Balken + Sekunden; letzte 8s bernstein, letzte 5s rot und pulsierend
  function zeitbalken(g, ruh) {
    const rest = Math.max(0, ZEIT - S.uhr), w = Math.min(260, B * 0.42), x = (B - w) / 2, y = 54, h = 10;
    const farbe = rest <= 5 ? '#ff4a35' : rest <= 8 ? '#ffb300' : '#ffffff';
    const puls = rest <= 8 && !ruh && S.phase === 'suchen' ? 0.5 + 0.5 * Math.sin(S.zeit * Math.PI * 2 / (rest <= 5 ? 0.5 : 1)) : 0;
    const abzug = S.abzuege.length ? Math.max(0, 1 - (S.zeit - S.abzuege[S.abzuege.length - 1].t0) / 0.5) : 0;
    g.save();
    if (abzug && !ruh) g.translate(Math.sin(S.zeit * 70) * 3 * abzug, 0);
    g.fillStyle = 'rgba(0,0,0,.45)'; rund(g, x - 2, y - 2, w + 4, h + 4, (h + 4) / 2); g.fill();
    if (puls) { g.shadowColor = farbe; g.shadowBlur = 6 + 8 * puls; }
    g.fillStyle = abzug > 0.5 ? '#ff4a35' : farbe; rund(g, x, y, Math.max(h, w * rest / ZEIT), h, h / 2); g.fill();
    g.shadowBlur = 0;
    g.font = '700 15px "Titillium Web", "Segoe UI", system-ui, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 4; g.fillStyle = farbe;
    g.fillText(Math.ceil(rest) + 's', x + w + 10, y + h / 2 + 1);
    g.restore();
  }
  function weiterKnopf(g, t) {
    const [x0, y0, x1, y1] = knopfRect(), w = x1 - x0, h = y1 - y0, druck = S.knopfDruck && t - S.knopfDruck < 0.12;
    const ein = Math.min(1, S.phaseT / 0.3);
    g.save(); g.globalAlpha = ein;
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 12; g.shadowOffsetY = 4;
    g.fillStyle = '#0F9CD8'; rund(g, x0, y0 + (druck ? 1 : 0), w, h, h / 2); g.fill();
    g.shadowColor = 'transparent';
    g.fillStyle = '#fff'; g.font = '700 18px "Titillium Web", "Segoe UI", system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Weiter', x0 + w / 2, y0 + h / 2 + 1);
    g.restore();
  }
  function hinweisZeichnen(g, t, ruh) {
    const a = Math.min(1, S.uhr / 0.3, (4.5 - S.uhr) / 0.4);
    if (a <= 0) return;
    const text = 'Tippe auf Mängel – dann Weiter';
    g.save(); g.globalAlpha = a * (ruh ? 1 : 0.85 + 0.15 * Math.sin(t * Math.PI * 2 / 1.2));
    g.font = '700 15px "Titillium Web", "Segoe UI", system-ui, sans-serif';
    const tw = g.measureText(text).width + 26, tx = (B - tw) / 2, ty = 78;
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10;
    g.fillStyle = 'rgba(255,255,255,.95)'; rund(g, tx, ty, tw, 30, 15); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = '#191919'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(text, B / 2, ty + 16);
    g.restore();
  }
  // Schild „Alle Mängel gefunden“ (Zeit um ohne Fehler): Stil des Hinweis-Kärtchens, etwas größer, sanft ein- und ausgeblendet
  function vollSchild(g, t, ruh) {
    const d = VOLLZEIT.dauer * PAUSE, a = Math.min(1, S.phaseT / 0.25, (d - S.phaseT) / 0.3);
    if (a <= 0) return;
    const text = 'Alle Mängel gefunden', gr = Math.max(15, Math.min(19, B / 24));
    g.save(); g.globalAlpha = a;
    g.font = `700 ${gr}px "Titillium Web", "Segoe UI", system-ui, sans-serif`;
    const tw = g.measureText(text).width + 34, th = gr + 20, tx = (B - tw) / 2, ty = 78 + (ruh ? 0 : 6 * (1 - Math.min(1, S.phaseT / 0.25)));
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10;
    g.fillStyle = 'rgba(255,255,255,.96)'; rund(g, tx, ty, tw, th, th / 2); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = '#191919'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(text, B / 2, ty + th / 2 + 1);
    g.restore();
  }
  function abzuegeZeichnen(g) {
    S.abzuege.forEach(a => {
      const p = (S.zeit - a.t0) / 0.9;
      g.save(); g.globalAlpha = Math.max(0, 1 - p * p);
      g.font = '800 20px "Titillium Web", "Segoe UI", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText('−2s', a.x, a.y - 22 - 26 * p);
      g.fillStyle = '#ff6a55'; g.fillText('−2s', a.x, a.y - 22 - 26 * p);
      g.restore();
    });
  }
  function figurZeichnen(g, zustand) {
    const f = S.figur, pose = zustand === 'spiel' && S.zeit < f.bis ? f.pose : 'ruhe';
    const img = bilder[pose];
    if (!img) return;
    const { fh } = figurMasse(), hh = fh * POSEN[pose].hoehe, w = hh * img.naturalWidth / img.naturalHeight;
    let x = 6, y = H - hh - 4;
    const seit = S.zeit - f.hupf;
    if (seit < 0.45 && !ruhig()) y -= Math.sin(seit / 0.45 * Math.PI) * hh * 0.1;
    if (pose === 'entsetzt' && !ruhig() && S.zeit < f.bis) x += Math.sin(S.zeit * 60) * 2 * Math.max(0, Math.min(1, f.bis - S.zeit - 0.3));
    const spiegeln = POSEN[pose].blick === (x + w / 2 < B / 2 ? 'links' : 'rechts');   // Blick zur Bildmitte
    g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
    if (spiegeln) { g.translate(x + w, y); g.scale(-1, 1); g.drawImage(img, 0, 0, w, hh); } else g.drawImage(img, x, y, w, hh);
    g.restore();
  }
  function klicksZeichnen(g) {
    S.klicks = S.klicks.filter(c => S.zeit - c.t0 < 0.35);
    S.klicks.forEach(c => {
      const p = (S.zeit - c.t0) / 0.35;
      g.save(); g.globalAlpha = 0.7 * (1 - p); g.strokeStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.arc(c.x, c.y, 8 + 22 * p, 0, Math.PI * 2); g.stroke(); g.restore();
    });
  }
  function rund(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  // ---------- Anmeldung ----------
  R_.spiel({
    id: 'dach-check',
    wertung: 'hoch',
    format: p => p.toLocaleString('de-DE') + ' Punkte',
    hoechst: 1000,
    bereich: 'Blitzschutz',
    hintergrund: { bild: 'bilder/start.webp', position: '50% 55%' },
    figur: POSEN.daumen,
    texte: {
      titel: 'Dach-Check',
      untertitel: 'Findest du jeden Mangel?',
      anleitung: 'Auf jedem Dach stecken Mängel in der Blitzschutzanlage. Schau genau hin und tippe sie an, bevor das Gewitter da ist. Wenn du meinst, alle gefunden zu haben, tippe auf Weiter. Wer Intaktes antippt, verliert 2s. Pro Dach hast du 25s.',   // geschütztes Leerzeichen: „2s“ nicht allein in der letzten Zeile
    },
    // Klänge (Sound Artist, 23.10.2026, alle Sonniss GDC 2026): Einzelklänge in der Abstufung der Lieferung (nicht einzeln
    // normalisiert), die beiden Klangteppiche normalisiert. Wind am Rundenbeginn, mit dem Zuziehen Überblendung zum nahen
    // Gewitter (beide als Dauerton geregelt: Wind 1 → 0,3, Gewitter 0,12 → 1); Donner a/b/c bei ca. 27/54/80 % der Zeit
    klaenge: {
      wind: { datei: 'klaenge/wind.mp3', proben: 573300, pegel: 0.25 },        // normalisiert; im Spiel ca. −28,5 dB RMS (ruhig)
      gewitter: { datei: 'klaenge/gewitter.mp3', proben: 573300, pegel: 0.55 },  // normalisiert; voll −25 dB RMS wie Fangstange/Blitzkugel
      donnerA: { datei: 'klaenge/donner-a.mp3', proben: 81585, pegel: 0.35 },
      donnerB: { datei: 'klaenge/donner-b.mp3', proben: 83790, pegel: 0.5 },
      donnerC: { datei: 'klaenge/donner-c.mp3', proben: 83790, pegel: 0.7 },
      gefunden: { datei: 'klaenge/gefunden.mp3', proben: 9647, pegel: 0.8 },
      fehltipp: { datei: 'klaenge/fehltipp.mp3', proben: 8379, pegel: 0.45 },
      geschafft: { datei: 'klaenge/geschafft.mp3', proben: 18743, pegel: 0.8 },
      zeitum: { datei: 'klaenge/zeitum.mp3', proben: 48510, pegel: 0.9 },
      uebersehen: { datei: 'klaenge/uebersehen.mp3', proben: 8379, pegel: 0.8 },
      drohne: { datei: 'klaenge/drohne.mp3', proben: 23125, pegel: 0.7 },
    },
    neu, schritt, zeichne, runter, groesse,
  });

  // Testhilfe (nur lesen; Bildschirm-Lagen zum Antippen)
  function mitte(sz, t) { const h = huelle(geo(sz, t).boxen); return [Math.round((h[0] + h[2]) / 2), Math.round((h[1] + h[3]) / 2)]; }
  window.__dachcheck = {
    get zustand() {
      const sz = S && S.szene;
      return S && { nr: S.nr, dach: sz && sz.d.nr, phase: S.phase, uhr: +S.uhr.toFixed(2), gefunden: sz && sz.gefunden, M: sz && sz.M,
        punkte: +S.punkte.toFixed(1), fehltipps: S.fehltipps, ergebnisse: S.ergebnisse, folge: S.folge.map(d => d.nr) };
    },
    maengel() { const sz = S.szene; return sz.maengel.filter(t => !t.gefunden).map(t => ({ name: t.name, art: t.mangel, typ: t.typ, xy: mitte(sz, t), treffer: treffer(geo(sz, t)).map(Math.round) })); },
    intakt() { const sz = S.szene; return sz.teile.filter(t => !t.mangel).map(t => ({ typ: t.typ, xy: mitte(sz, t) })); },
    teile() { const sz = S.szene; return sz.teile.map(t => ({ typ: t.typ, mangel: t.mangel || null, u: Math.round(t.u), p: +t.p.toFixed(3), rect: (g => [g.x, g.y, g.x + g.w, g.y + g.h].map(Math.round))(geo(sz, t)) })); },
    // freie Dachstelle (keine Trefferfläche in der Nähe) zum Testen des leeren Tippens
    leer() {
      const sz = S.szene, A = abb(sz), tr = sz.teile.map(t => treffer(geo(sz, t, A)));
      for (let i = 0; i < 400; i++) {
        const x = zufall(20, B - 20), y = zufall(Math.max(OBEN + 10, A.P(0, 0.4)[1]), H - 20);
        if (!tr.some(r => x > r[0] - 10 && x < r[2] + 10 && y > r[1] - 10 && y < r[3] + 10)) return [Math.round(x), Math.round(y)];
      }
      return null;
    },
    gruende: GRUENDE,
    // Aufbau eines Pool-Dachs als Stufe (0–4) im aktuellen Format probieren (ändert das Spiel nicht)
    probe(nr, stufe) {
      Object.keys(GRUENDE).forEach(k => delete GRUENDE[k]);
      const dd = DAECHER.find(d => d.nr === nr); dachLaden(dd);
      const sz = bauen(stufe, dd, {});
      return { M: sz.M, teile: sz.teile.length, laengs: sz.laengs.length, intakt: sz.teile.length - sz.M, gruende: Object.assign({}, GRUENDE),
        typen: sz.teile.map(t => t.typ + (t.mangel ? '!' : '')) };
    },
    get ansicht() { const V = S.szene.V; return { s: +V.s.toFixed(3), ox: Math.round(V.ox), oy: Math.round(V.oy), deckt: V.deckt }; },
  };
})();
