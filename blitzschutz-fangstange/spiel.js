// Fangstange (Sammlung „entSPANNUNG“, RSI protect) – Konzept von MZ freigegeben (23.10.2026):
// Ein Gewitter zieht über die Halle. Über einer der drei Fangstangen lädt sich eine Wolke auf (heller, Flackern, Vorblitz).
// Wer die richtige Stange antippt, lenkt den Blitz hinein: Ableitung glüht bis zur Erde, Punkte nach Reaktionszeit.
// Falsche Stange oder zu spät = Einschlag ins Dach. 20 Blitze à höchstens 50 Punkte, 3 Einschläge = Abbruch.
// Steigerung: Aufladung wird kürzer; ab Blitz 8 Wetterleuchten (Tippen = kleiner Abzug); ab Blitz 14 manchmal zwei Wolken
// kurz nacheinander. Blitze, Leuchten und Funken sind Code-Animation.
//
// Testhilfen (Adresse): #ende=sieg-854 | #ende=mittel-612 | #ende=knapp-560 | #ende=schwach-420 | #ende=verloren
//   (nach „Los geht's“ sofort das Endbild), #schnell (kurze Pausen und Aufladung), #blitz=14 (ab Blitz 14, davor als
//   abgeleitet gezählt), #ruhig (wie „Bewegung reduzieren“). window.__fangstange zeigt den Zustand (für Testläufe).
(function () {
  'use strict';
  const R_ = window.Rahmen;
  const hash = location.hash;
  const TEST = {
    ende: (/(?:^#|&)ende=([a-z]+-)?(\d+|verloren)/.exec(hash) || [])[2] || null,
    schnell: /(?:^#|&)schnell(?![a-z])/.test(hash),
    blitz: +((/(?:^#|&)blitz=(\d+)/.exec(hash) || [])[1] || 0),
    ruhig: /(?:^#|&)ruhig(?![a-z])/.test(hash),
  };
  const ruhig = () => TEST.ruhig || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- Regeln ----------
  const ANZAHL = 20, MAX_JE = 50, EINSCHLAEGE_MAX = 3, ABZUG_WL = 100, ABZUG_EINSCHLAG = 100;   // MZ 24.10.2026: je −100, nie unter 0
  const VOLL_BIS = 0.45;            // bis zu dieser Reaktionszeit (s) volle 50 Punkte, danach linear bis 20 Punkte bei Einschlag
  const MIN_PUNKTE = 20;
  const T_LADEN = [2.3, 1.1];        // Aufladezeit von Blitz 1 bis Blitz 20 (s)
  const PAUSE = [3.8, 2.8];          // Pause zwischen den Blitzen (s), dazu bis 0,6s Zufall – Spieldauer ca. 1,5 min
  const WL_AB = 8, DOPPEL_AB = 14;   // Wetterleuchten ab Blitz 8, zwei Wolken kurz nacheinander ab Blitz 14
  const WL_DAUER = 1.0, DOPPEL_ABSTAND = 0.55;

  // ---------- Maße der Bilder (am Bild abgemessen) ----------
  // dach.webp 1536×1024: Augenhöhe (Skyline) y 640, hintere Dachkante y 678 – Größe auf dem Dach ∝ (y − 640)
  const DACH = { b: 1536, h: 1024, horizont: 640, kante: 678, fokusY: 0.55 };
  // stange.webp 275×937: Achse x 133, Spitze y 4, Unterkante Sockel y 932, Sockel x 4–270, Kabelende der Klemme (244, 750)
  const STANGE = { b: 275, h: 937, achse: 133, spitze: 4, fuss: 932, sockel: 133, kabel: [244, 750] };
  // stange-leuchtend.webp 270×954: gleicher Maßstab, Achse x 132, Unterkante y 953 (unten bündig mit der normalen Stange)
  const LEUCHT = { achse: 132, fuss: 953 };
  // ableitung.webp 497×116: Leitung links (18, 50), rechts (490, 19) – steigt um 3,8°; Füße der Halter y 111
  const ABL = { b: 497, h: 116, links: [18, 50], rechts: [490, 19], fuss: 111, massstab: 0.8 };
  // Stangen: quer als Anteil der Breite, Tiefe als Anteil der sichtbaren Dachfläche (0 = hintere Kante, 1 = unterer Rand);
  // seite = Richtung der Ableitung zum Dachrand. Höhe einer Stange in Bildpixeln des Dachs = HOEHE × (y − Horizont).
  const STANGEN = [{ fx: 0.27, tiefe: 0.42, seite: -1 }, { fx: 0.53, tiefe: 0.18, seite: 1 }, { fx: 0.8, tiefe: 0.7, seite: 1 }];
  const HOEHE = 2.0;

  // ---------- Bilder ----------
  const bilder = {};
  let hell = null;   // aufgehellte Fassung des Dachs (Wolken im Blitzlicht)
  let himmel = null;   // Wolkenschicht für den lebenden Himmel (nur der Himmel, nach unten weich ausgeblendet)
  // Lebender Himmel (MZ, 23.10.2026; v4 deutlicher): Die Wolken des Bildes liegen als zwei zusätzliche Schichten darüber und
  // ziehen gleichmäßig nach links – hinten langsamer (6 % der Bildbreite pro Minute), vorn schneller und größer (10 %/min),
  // dazu leichtes Brodeln. Damit die Schichten endlos ziehen, wird das Wolkenbild mit seinem Spiegelbild nahtlos aneinander-
  // gesetzt. Die Schichten enden weich weit über dem Horizont (Dach-Bild y 380–590, Skyline bei 635): Dach, Horizont und
  // Stangen bleiben ruhig. Halbe Auflösung (Wolken sind weich) – spart Speicher und Zeit auf Handys.
  const HIMMEL = { voll: 380, weg: 590,
    schichten: [{ tempo: 0.06, groesse: 1.0, deckkraft: 0.45, start: 0.13 }, { tempo: 0.10, groesse: 1.25, deckkraft: 0.6, start: 0.61 }] };
  function himmelEbene(img) {
    const f = 0.5, w = Math.round(img.naturalWidth * f), h = Math.round(HIMMEL.weg * f);
    const c = document.createElement('canvas');
    c.width = 2 * w; c.height = h;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, img.naturalWidth, HIMMEL.weg, 0, 0, w, h);
    x.save(); x.translate(2 * w, 0); x.scale(-1, 1); x.drawImage(img, 0, 0, img.naturalWidth, HIMMEL.weg, 0, 0, w, h); x.restore();
    x.globalCompositeOperation = 'destination-in';
    const v = x.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, '#000'); v.addColorStop(HIMMEL.voll / HIMMEL.weg, '#000'); v.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = v; x.fillRect(0, 0, c.width, h);
    return c;
  }
  function lade(name, datei) {
    const i = new Image();
    i.onload = () => { bilder[name] = i; if (name === 'dach') { hell = aufhellen(i); himmel = himmelEbene(i); } };
    i.src = datei;
  }
  lade('dach', 'bilder/dach.webp');
  lade('stange', 'bilder/stange.webp');
  lade('leucht', 'bilder/stange-leuchtend.webp');
  lade('ableitung', 'bilder/ableitung.webp');
  // Figur (Pümpel-Frau): Posen mit Blickrichtung im Bild und Maßstab (am Bild abgemessen: Person in allen Posen gleich groß;
  // jubel und entsetzt sind im Original etwas kleiner gezeichnet). Die Figur blickt immer zur Bildmitte (MZ, 23.10.2026).
  const POSEN = {
    ruhe: { bild: 'bilder/frau-ruhe.webp', blick: 'links', hoehe: 1 },         // entspannt, Blick schräg nach oben links
    daumen: { bild: 'bilder/frau-daumen.webp', blick: 'links', hoehe: 1 },     // Kopf und Daumen nach links
    jubel: { bild: 'bilder/frau-jubel.webp', blick: 'frontal', hoehe: 0.94 },
    entsetzt: { bild: 'bilder/frau-entsetzt.webp', blick: 'frontal', hoehe: 0.955 },
  };
  Object.keys(POSEN).forEach(n => lade(n, POSEN[n].bild));
  // Blitzlicht: Dach-Bild heller und leicht bläulich (einmal nach dem Laden, ohne canvas-filter wegen Safari)
  function aufhellen(img) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      p[i] = Math.min(255, p[i] * 2.2 + 18);
      p[i + 1] = Math.min(255, p[i + 1] * 2.35 + 26);
      p[i + 2] = Math.min(255, p[i + 2] * 2.6 + 40);
    }
    x.putImageData(d, 0, 0);
    return c;
  }

  // ---------- Lage (bei jeder Größenänderung) ----------
  let B = 0, H = 0, L = null;
  function lage() {
    const s = Math.max(B / DACH.b, H / DACH.h);
    const bx = (B - DACH.b * s) / 2, by = (H - DACH.h * s) * DACH.fokusY;
    const yKante = by + DACH.kante * s, dachH = Math.max(40, H - yKante);
    const stangen = STANGEN.map((st, i) => {
      const y = yKante + dachH * st.tiefe;                       // Unterkante des Sockels auf dem Bildschirm
      const yBild = (y - by) / s;
      const hoehe = HOEHE * (yBild - DACH.horizont) * s;         // Bildschirmhöhe der Stange (Spitze bis Sockel)
      const k = hoehe / (STANGE.fuss - STANGE.spitze);            // Bildschirmpixel je Pixel in stange.webp
      const x = B * st.fx;
      return { i, x, y, k, seite: st.seite, spitze: y - hoehe, sockelB: STANGE.sockel * k };
    });
    // Tippen: jede Stange bekommt einen Streifen bis zur Mitte zwischen den Nachbarn (gut antippbar, auch die ferne)
    stangen.forEach((st, i) => {
      st.links = i ? (stangen[i - 1].x + st.x) / 2 : 0;
      st.rechts = i < stangen.length - 1 ? (stangen[i + 1].x + st.x) / 2 : B;
    });
    const wolkeY = Math.max(64, Math.min(H * 0.19, Math.min(...stangen.map(s2 => s2.spitze)) - 70));
    const figurH = Math.max(64, Math.min(170, H * 0.2));
    L = { s, bx, by, yKante, stangen, wolkeY, figurH, kurz: Math.min(B, H) };
  }
  function groesse(b, h) { B = b; H = h; lage(); }

  // ---------- Zustand ----------
  let S = null;
  function neu() {
    S = {
      zeit: 0, punkte: 0, abgeleitet: 0, einschlaege: 0, wlGetippt: 0, nr: 0, fertig: false, endeUm: null,
      plan: planen(), naechsteUm: TEST.schnell ? 0.6 : 1.4, wlUm: null,
      ladungen: [], blitze: [], wl: [], funken: [], rauch: [], flecken: [], texte: [], glut: [0, 0, 0], leitung: [null, null, null],
      blitzlicht: 0, wackeln: 0, figur: { pose: 'ruhe', bis: 0, hupf: 0 }, regen: [], klicks: [], testEnde: !!TEST.ende,
    };
    if (TEST.blitz > 1) {   // Testhilfe: ab Blitz N, die Blitze davor zählen als abgeleitet (je 45 Punkte)
      S.nr = Math.min(ANZAHL, TEST.blitz) - 1;
      S.abgeleitet = S.nr; S.punkte = S.nr * 45;
    }
    anzeigen();
  }
  function planen() {
    const p = [];
    let zuletzt = -1;
    for (let i = 0; i < ANZAHL; i++) {
      const f = i / (ANZAHL - 1);
      let st;
      do { st = Math.floor(Math.random() * 3); } while (st === zuletzt && Math.random() < 0.75);
      const doppel = i + 1 >= DOPPEL_AB && i > 0 && !p[i - 1].doppel && Math.random() < 0.45;
      if (doppel && st === p[i - 1].stange) st = (st + 1 + Math.floor(Math.random() * 2)) % 3;
      zuletzt = st;
      p.push({
        stange: st, doppel,
        laden: (T_LADEN[0] + (T_LADEN[1] - T_LADEN[0]) * f) * (TEST.schnell ? 0.6 : 1),
        pause: (PAUSE[0] + (PAUSE[1] - PAUSE[0]) * f + Math.random() * 0.6) * (TEST.schnell ? 0.3 : 1),
        wl: i + 1 >= WL_AB && Math.random() < 0.5,
      });
    }
    return p;
  }
  function anzeigen() {
    // Einschläge stehen als eigene Zeile unter der Anzeige (siehe einschlaegeZeichnen) – sonst zu lang auf schmalen Handys
    R_.anzeige('Blitz ' + Math.min(ANZAHL, S.nr + (S.ladungen.length ? 0 : 1)) + '/' + ANZAHL, S.punkte.toLocaleString('de-DE') + ' Punkte');
  }

  // ---------- Ablauf ----------
  function schritt(dt) {
    if (S.testEnde) { S.testEnde = false; testEnde(); return; }
    S.zeit += dt;
    const t = S.zeit;
    // Wetterleuchten in der Pause vor einem Blitz
    if (S.wlUm != null && t >= S.wlUm) { S.wlUm = null; wetterleuchten(); }
    // nächste Wolke laden
    if (!S.fertig && S.naechsteUm != null && t >= S.naechsteUm && S.nr < ANZAHL) {
      const wlAktiv = S.wl.some(w => t - w.t0 < WL_DAUER);
      if (!wlAktiv) laden();
    }
    // Ladungen: Aufladeklang zur passenden Zeit, zu spät = Einschlag ins Dach
    S.ladungen.forEach(l => { if (l.tonUm != null && t >= l.tonUm) { l.tonUm = null; l.ton = R_.ton('aufladen'); } });
    S.ladungen.slice().forEach(l => { if (t - l.t0 >= l.dauer) einschlag(l); });
    // Endbild
    if (S.endeUm != null && t >= S.endeUm) { S.endeUm = null; beenden(); }
    // Abklingen
    S.blitzlicht = Math.max(0, S.blitzlicht - dt * 2.6);
    S.wackeln = Math.max(0, S.wackeln - dt * 3);
    S.glut = S.glut.map(g => Math.max(0, g - dt * 0.9));
    S.blitze = S.blitze.filter(b => t - b.t0 < 0.7);
    S.wl = S.wl.filter(w => t - w.t0 < WL_DAUER + 0.2);
    S.texte = S.texte.filter(x => t - x.t0 < 1.1);
    S.funken.forEach(f => { f.vx *= 1 - dt * 1.5; f.vy += 520 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.leben -= dt; });
    S.funken = S.funken.filter(f => f.leben > 0);
    S.rauch.forEach(r => { r.y -= 22 * dt; r.x += r.vx * dt; r.r += 14 * dt; r.leben -= dt; });
    S.rauch = S.rauch.filter(r => r.leben > 0);
  }

  function laden() {
    const p = S.plan[S.nr];
    const l = { nr: S.nr, stange: p.stange, t0: S.zeit, dauer: p.laden, x: L.stangen[p.stange].x,   // genau über der Stange
      vorblitz: null, flacker: 1, ton: null };
    // Aufladeklang (1,3s, Anstieg eingebaut): endet mit der Aufladung – bei kürzerer Aufladung später einsteigen
    const KLANG = 1.3;
    if (l.dauer >= KLANG) l.tonUm = S.zeit + l.dauer - KLANG;
    else l.ton = R_.ton('aufladen', KLANG - l.dauer);
    S.ladungen.push(l);
    S.nr++;
    anzeigen();
    // nächster Blitz: zwei Wolken kurz nacheinander oder nach der Auflösung (siehe aufgeloest)
    const n = S.plan[S.nr];
    if (n && n.doppel) S.naechsteUm = S.zeit + DOPPEL_ABSTAND;
    else S.naechsteUm = null;
  }
  // nach Treffer oder Einschlag: wenn keine Ladung mehr läuft, Pause und ggf. Wetterleuchten planen
  function aufgeloest() {
    if (S.ladungen.length || S.fertig) return;
    if (S.einschlaege >= EINSCHLAEGE_MAX) { S.fertig = true; S.endeUm = S.zeit + 1.5; return; }
    if (S.nr >= ANZAHL) { S.fertig = true; S.endeUm = S.zeit + 1.3; return; }
    if (S.naechsteUm != null && S.naechsteUm > S.zeit) return;   // zweite Wolke ist schon geplant
    const n = S.plan[S.nr];
    S.naechsteUm = S.zeit + n.pause;
    if (n.wl) { S.wlUm = S.zeit + 0.3 + Math.random() * 0.2; S.naechsteUm = Math.max(S.naechsteUm, S.wlUm + WL_DAUER + 0.35); }
  }

  function treffer(l, i) {
    S.ladungen.splice(S.ladungen.indexOf(l), 1);
    if (l.ton) l.ton.aus();
    l.tonUm = null;
    const r = S.zeit - l.t0;
    const p = r <= VOLL_BIS ? MAX_JE : Math.round(MAX_JE - (MAX_JE - MIN_PUNKTE) * Math.min(1, (r - VOLL_BIS) / Math.max(0.1, l.dauer - VOLL_BIS)));
    S.punkte += p; S.abgeleitet++;
    const st = L.stangen[i];
    blitz(l.x, st.x, st.spitze, false);
    S.glut[i] = 1;
    S.leitung[i] = S.zeit;
    text('+' + p, st.x, st.spitze - 14, '#ffffff');
    figur('daumen', 1.0, true);   // kurz Daumen hoch, dann wieder Ruhepose
    R_.ton('treffer');
    anzeigen();
    aufgeloest();
  }
  function einschlag(l) {
    S.ladungen.splice(S.ladungen.indexOf(l), 1);
    if (l.ton) l.ton.aus();
    l.tonUm = null;
    S.einschlaege++;
    const st = L.stangen[l.stange];
    // Einschlag neben der Stange auf dem Dach (Seite zufällig, aber im Bild)
    let seite = Math.random() < 0.5 ? -1 : 1;
    const ab = Math.max(st.sockelB * 1.3, L.kurz * 0.12);
    if (st.x + seite * ab < 20 || st.x + seite * ab > B - 20) seite = -seite;
    const x = st.x + seite * ab, y = Math.min(H - 8, st.y + (Math.random() * 0.4 - 0.1) * (H - L.yKante) * 0.3);
    const sc = Math.max(0.5, st.k / 0.45);
    blitz(l.x, x, y, true);
    S.flecken.push({ x, y, r: 22 * st.k * 3, t0: S.zeit });
    for (let k = 0; k < (ruhig() ? 0 : 26); k++) {
      const w = -Math.PI * (0.1 + Math.random() * 0.8), v = (160 + Math.random() * 260) * Math.min(1.4, sc);
      S.funken.push({ x, y, vx: Math.cos(w) * v, vy: Math.sin(w) * v, leben: 0.5 + Math.random() * 0.5 });
    }
    for (let k = 0; k < 6; k++) S.rauch.push({ x: x + (Math.random() - 0.5) * 20, y: y - 6, vx: (Math.random() - 0.5) * 16, r: 8 + Math.random() * 8, leben: 1.6 + Math.random() * 1.2, l0: 2.8 });
    S.wackeln = ruhig() ? 0 : 1;
    figur('entsetzt', 1.5);
    // Einschlag ins Dach (zu spät oder falsche Stange): −100 Punkte, Punktestand nie unter 0
    S.abzugEinschlag = (S.abzugEinschlag || 0) + Math.min(S.punkte, ABZUG_EINSCHLAG);
    S.punkte = Math.max(0, S.punkte - ABZUG_EINSCHLAG);
    text('−' + ABZUG_EINSCHLAG, Math.max(L.kurz * 0.3, Math.min(B - 40, x)), y - 40, '#ffb4a8');   // nicht unter der Figur
    R_.ton('dach');
    R_.vibrieren([60, 40, 90]);
    anzeigen();
    aufgeloest();
  }
  function wetterleuchten() {
    const x = B * (0.15 + Math.random() * 0.7);
    S.wl.push({ t0: S.zeit, x, y: L.wolkeY * (0.6 + Math.random() * 0.3), r: L.kurz * (0.6 + Math.random() * 0.2) });
    R_.ton('wetterleuchten');
  }
  function blitz(x0, x1, y1, dach) {
    const y0 = L.wolkeY - L.kurz * 0.04;
    S.blitze.push({ t0: S.zeit, pfad: pfad(x0, y0, x1, y1, 1), dach });
    S.blitzlicht = ruhig() ? 0.22 : 0.36;
  }
  function text(t, x, y, farbe) { S.texte.push({ t0: S.zeit, t, x, y, farbe }); }
  function figur(pose, dauer, hupf) { S.figur.pose = pose; S.figur.bis = S.zeit + dauer; if (hupf) S.figur.hupf = S.zeit; }

  function beenden() {
    if (S.einschlaege >= EINSCHLAEGE_MAX) return endbild(0, true);
    endbild(Math.max(1, Math.min(1000, S.punkte)), false);
  }
  function bewertung(p) {
    if (p >= 900) return ['Blitzsicher', 'GEPRÜFT', 'gut', 'jubel'];
    if (p >= 800) return ['Sicher geerdet', 'GEPRÜFT', 'gut', 'jubel'];
    if (p >= 700) return ['Gut abgeleitet', 'GEPRÜFT', 'gut', 'daumen'];
    if (p >= 550) return ['Knapp geschützt', 'MIT MÄNGELN', 'mittel', 'daumen'];
    return ['Nachbessern nötig', 'MÄNGEL', 'schlecht', 'entsetzt'];
  }
  function endbild(punkte, abbruch) {
    const [titel, stempel, art, pose] = abbruch ? ['Zu viele Einschläge', 'MÄNGEL', 'schlecht', 'entsetzt'] : bewertung(punkte);
    const felder = [['Blitze abgeleitet', S.abgeleitet + ' von ' + ANZAHL]];
    if (S.einschlaege) felder.push(['Einschläge', S.einschlaege + (abbruch ? '' : '× (−' + (S.einschlaege * ABZUG_EINSCHLAG).toLocaleString('de-DE') + ' Punkte)')]);
    if (S.wlGetippt) felder.push(['Wetterleuchten angetippt', S.wlGetippt + '× (−' + S.wlGetippt * ABZUG_WL + ' Punkte)']);
    R_.ende(punkte, {
      ueberschrift: titel, felder, stempel: { text: stempel, art }, figur: POSEN[pose],
      verzoegerung: abbruch ? 300 : 500,
    });
  }
  // Testhilfe #ende=…: Endbild mit ausgedachten Werten (Bilanz passend zu den Punkten)
  function testEnde() {
    if (TEST.ende === 'verloren') { S.abgeleitet = 12; S.einschlaege = 3; return endbild(0, true); }
    const p = Math.max(1, Math.min(1000, +TEST.ende));
    S.abgeleitet = Math.min(ANZAHL, Math.max(1, Math.round(p / 47)));
    S.einschlaege = Math.min(2, ANZAHL - S.abgeleitet);
    endbild(p, false);
  }

  // ---------- Eingabe ----------
  function runter(x, y) {
    if (!L || S.fertig) return;
    S.klicks.push({ x, y, t0: S.zeit });
    const i = L.stangen.findIndex(st => x >= st.links && x < st.rechts);
    if (i < 0) return;
    if (S.ladungen.length) {
      const l = S.ladungen.find(l2 => l2.stange === i);
      if (l) treffer(l, i);
      else einschlag(S.ladungen[0]);   // falsche Stange: die älteste Wolke schlägt ins Dach
      return;
    }
    if (S.wl.some(w => S.zeit - w.t0 < WL_DAUER)) {   // Wetterleuchten angetippt: kleiner Abzug
      S.punkte = Math.max(0, S.punkte - ABZUG_WL);
      S.wlGetippt++;
      text('−' + ABZUG_WL, L.stangen[i].x, L.stangen[i].spitze - 14, '#ffb4a8');
      R_.ton('fehler');
      anzeigen();
    }
  }

  // ---------- Zeichnen ----------
  function pfad(x0, y0, x1, y1, staerke) {
    // Zickzack (Mittelpunktverschiebung) mit Ästen
    let p = [[x0, y0], [x1, y1]];
    let rau = Math.hypot(x1 - x0, y1 - y0) * 0.22;
    for (let k = 0; k < 6; k++) {
      const n = [p[0]];
      for (let i = 1; i < p.length; i++) {
        const [ax, ay] = p[i - 1], [bx, by] = p[i];
        n.push([(ax + bx) / 2 + (Math.random() - 0.5) * rau, (ay + by) / 2 + (Math.random() - 0.5) * rau * 0.3], p[i]);
      }
      p = n; rau *= 0.55;
    }
    const aeste = [];
    if (staerke > 0.5) for (let a = 0; a < 3; a++) {
      const i = Math.floor(p.length * (0.15 + Math.random() * 0.5)), [sx, sy] = p[i];
      const lang = Math.hypot(x1 - x0, y1 - y0) * (0.15 + Math.random() * 0.2), w = Math.PI / 2 + (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.5);
      aeste.push(pfad(sx, sy, sx + Math.cos(w) * lang, sy + Math.sin(w) * lang, 0).punkte);
    }
    return { punkte: p, aeste };
  }
  function linie(g, p) { g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.stroke(); }
  function blitzZeichnen(g, pf, a, dicke) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.lineCap = 'round';
    const d = dicke * Math.max(1, L.kurz / 340);
    [[9 * d, `rgba(110,150,255,${0.16 * a})`], [4 * d, `rgba(170,200,255,${0.45 * a})`], [1.7 * d, `rgba(255,255,255,${0.95 * a})`]].forEach(([w, f]) => {
      g.lineWidth = w; g.strokeStyle = f; linie(g, pf.punkte);
      g.lineWidth = w * 0.5; pf.aeste.forEach(ast => linie(g, ast));
    });
    g.restore();
  }
  // Wolke von innen erhellt: aufgehelltes Dach-Bild rund um (x, y), weich ausgeblendet
  const glowC = document.createElement('canvas'), glowG = glowC.getContext('2d');
  function wolkeLeuchten(g, x, y, r, staerke) {
    if (!hell || staerke <= 0.01) return;
    const n = Math.ceil(r * 2);
    if (glowC.width < n) { glowC.width = n; glowC.height = n; }
    glowG.globalCompositeOperation = 'source-over';
    glowG.clearRect(0, 0, glowC.width, glowC.height);
    const rg = glowG.createRadialGradient(r, r, 0, r, r, r);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.45, 'rgba(255,255,255,.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    glowG.fillStyle = rg; glowG.fillRect(0, 0, n, n);
    glowG.globalCompositeOperation = 'source-in';
    glowG.drawImage(hell, (x - r - L.bx) / L.s, (y - r - L.by) / L.s, n / L.s, n / L.s, 0, 0, n, n);
    g.save(); g.globalAlpha = Math.min(1, staerke);
    g.drawImage(glowC, 0, 0, n, n, x - r, y - r, n, n);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'lighter';
    // heller Kern genau über der Stelle (damit klar ist, über welcher Stange es sich auflädt)
    const k = g.createRadialGradient(x, y, 0, x, y, r * 0.5);
    k.addColorStop(0, `rgba(170,200,255,${Math.min(0.55, 0.36 * staerke)})`); k.addColorStop(1, 'rgba(150,180,255,0)');
    g.fillStyle = k; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    g.restore();
  }
  function stangeZeichnen(g, st, glut) {
    const img = bilder.stange;
    if (!img) return;
    const k = st.k;
    g.save(); g.translate(st.x, st.y);
    if (st.seite < 0) g.scale(-1, 1);   // Klemme zeigt zur Ableitung
    // Schatten auf dem Dach
    g.save(); g.scale(1, 0.22); g.fillStyle = 'rgba(0,0,0,.28)';
    g.beginPath(); g.arc(4 * k, -6 * k, STANGE.sockel * k * 1.15, 0, Math.PI * 2); g.fill(); g.restore();
    g.drawImage(img, -STANGE.achse * k, -STANGE.fuss * k, img.naturalWidth * k, img.naturalHeight * k);
    if (glut > 0 && bilder.leucht) {
      g.globalAlpha = Math.min(1, glut * 1.3);
      const li = bilder.leucht;
      g.drawImage(li, -LEUCHT.achse * k, -LEUCHT.fuss * k, li.naturalWidth * k, li.naturalHeight * k);
    }
    g.restore();
  }
  // Ableitung: vom Kabel der Klemme hinunter aufs Dach und seitlich bis zum Dachrand (aus dem Bild); Halter wie im Bild
  function ableitungPunkte(st) {
    const k = st.k, ka = k * ABL.massstab, d = st.seite;
    const kabel = [st.x + d * (STANGE.kabel[0] - STANGE.achse) * k, st.y - (STANGE.fuss - STANGE.kabel[1]) * k];
    const yLeitung = st.y - (ABL.fuss - ABL.links[1]) * ka;
    const knick = [st.x + d * (STANGE.sockel + 14) * k, yLeitung];
    const ende = [d > 0 ? B + 20 : -20, yLeitung];
    return { kabel, knick, ende, ka, yLeitung };
  }
  function ableitungZeichnen(g, st) {
    const img = bilder.ableitung;
    const a = ableitungPunkte(st), d = st.seite, ka = a.ka;
    // Kabelbogen von der Klemme zur Leitung
    g.save(); g.lineCap = 'round';
    g.strokeStyle = '#9ea3a8'; g.lineWidth = Math.max(1.5, 13 * ka);
    g.beginPath(); g.moveTo(a.kabel[0], a.kabel[1]);
    g.quadraticCurveTo(a.knick[0] - d * 6 * st.k, a.kabel[1] + (a.knick[1] - a.kabel[1]) * 0.15, a.knick[0], a.knick[1]); g.stroke();
    g.restore();
    if (!img) return;
    // Leitung in Stücken (Bild 497 px lang), je Stück um 3,8° gedreht, damit sie waagrecht liegt
    const steig = Math.atan2(ABL.rechts[1] - ABL.links[1], ABL.rechts[0] - ABL.links[0]);
    const stueck = (ABL.rechts[0] - ABL.links[0]) * ka;
    const weg = Math.abs(a.ende[0] - a.knick[0]);
    for (let s2 = 0; s2 < weg; s2 += stueck) {
      g.save();
      g.translate(a.knick[0] + d * s2, a.yLeitung);
      if (d < 0) g.scale(-1, 1);
      g.rotate(-steig);
      g.drawImage(img, -ABL.links[0] * ka, -ABL.links[1] * ka, ABL.b * ka, ABL.h * ka);
      g.restore();
    }
  }
  function leitungGluehen(g, st, seit) {
    if (seit == null) return;
    const a = ableitungPunkte(st), lauf = 0.5, aus = 0.8;
    if (seit > lauf + aus) return;
    const p = Math.min(1, seit / lauf), alpha = seit < lauf ? 1 : 1 - (seit - lauf) / aus;
    const punkte = [a.kabel, a.knick, a.ende];
    const ges = Math.hypot(a.knick[0] - a.kabel[0], a.knick[1] - a.kabel[1]) + Math.abs(a.ende[0] - a.knick[0]);
    let rest = ges * p;
    const bis = [punkte[0]];
    for (let i = 1; i < punkte.length && rest > 0; i++) {
      const [ax, ay] = punkte[i - 1], [bx, by] = punkte[i], l = Math.hypot(bx - ax, by - ay), q = Math.min(1, rest / l);
      bis.push([ax + (bx - ax) * q, ay + (by - ay) * q]); rest -= l;
    }
    const w = Math.max(2, 14 * a.ka);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    [[w * 3.2, `rgba(90,140,255,${0.22 * alpha})`], [w * 1.4, `rgba(160,200,255,${0.55 * alpha})`], [w * 0.45, `rgba(255,255,255,${0.9 * alpha})`]].forEach(([lw, f]) => {
      g.lineWidth = lw; g.strokeStyle = f; linie(g, bis);
    });
    // heller Kopf des Laufs
    if (seit < lauf) {
      const [hx, hy] = bis[bis.length - 1], r = w * 4;
      const rg = g.createRadialGradient(hx, hy, 0, hx, hy, r);
      rg.addColorStop(0, 'rgba(255,255,255,.9)'); rg.addColorStop(1, 'rgba(140,180,255,0)');
      g.fillStyle = rg; g.fillRect(hx - r, hy - r, 2 * r, 2 * r);
    }
    g.restore();
  }
  // Einschläge unter der Anzeige oben links: „Einschläge“ und drei Kreise (getroffen = gefüllt)
  function einschlaegeZeichnen(g) {
    const x = 12, y = 60, r = 6;
    g.save();
    g.font = '700 13px "Titillium Web", "Segoe UI", system-ui, sans-serif'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 4;
    g.fillStyle = '#fff'; g.fillText('Einschläge', x, y);
    const x0 = x + g.measureText('Einschläge').width + 10 + r;
    for (let i = 0; i < EINSCHLAEGE_MAX; i++) {
      g.beginPath(); g.arc(x0 + i * (2 * r + 6), y, r, 0, Math.PI * 2);
      if (i < S.einschlaege) { g.fillStyle = '#ff5a45'; g.fill(); }
      g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
    }
    g.restore();
  }
  function figurZeichnen(g, zustand) {
    const f = S.figur, pose = zustand === 'spiel' && S.zeit < f.bis ? f.pose : 'ruhe';
    const img = bilder[pose];
    if (!img) return;
    const h = L.figurH * POSEN[pose].hoehe, w = h * img.naturalWidth / img.naturalHeight;
    let x = 8, y = H - h - 4;
    // steht links unten → blickt nach rechts: Posen, die nach links schauen, gespiegelt
    const spiegeln = POSEN[pose].blick === (x + w / 2 < B / 2 ? 'links' : 'rechts');
    const seit = S.zeit - f.hupf;
    if (seit < 0.45 && !ruhig()) y -= Math.sin(seit / 0.45 * Math.PI) * h * 0.1;
    if (pose === 'entsetzt' && !ruhig() && S.zeit < f.bis) x += Math.sin(S.zeit * 60) * 2 * Math.max(0, f.bis - S.zeit - 0.9);
    g.save();
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
    if (spiegeln) { g.translate(x + w, y); g.scale(-1, 1); g.drawImage(img, 0, 0, w, h); }
    else g.drawImage(img, x, y, w, h);
    g.restore();
  }
  // Rückmeldung bei jedem Klick/Tipp: kleiner Ring an der Stelle (zeigt, dass der Klick angekommen ist)
  function klicksZeichnen(g) {
    S.klicks = S.klicks.filter(k => S.zeit - k.t0 < 0.35);
    S.klicks.forEach(k => {
      const p = (S.zeit - k.t0) / 0.35;
      g.save(); g.globalAlpha = 0.7 * (1 - p); g.strokeStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.arc(k.x, k.y, 8 + 22 * p, 0, Math.PI * 2); g.stroke(); g.restore();
    });
  }

  function zeichne(g, b, h, zustand, dt) {
    if (!L || b !== B || h !== H) groesse(b, h);
    if (!S) neu();
    const t = S.zeit, ruh = ruhig();
    g.save();
    if (S.wackeln > 0) g.translate((Math.random() - 0.5) * 8 * S.wackeln, (Math.random() - 0.5) * 6 * S.wackeln);
    // Dach und Himmel (Ausschnitt wie object-fit: cover)
    g.fillStyle = '#20252d'; g.fillRect(-10, -10, B + 20, H + 20);
    if (bilder.dach) g.drawImage(bilder.dach, L.bx, L.by, DACH.b * L.s, DACH.h * L.s);
    if (zustand !== 'start') himmelZeichnen(g, t, ruh);
    g.fillStyle = 'rgba(8,12,24,.24)'; g.fillRect(-10, -10, B + 20, H + 20);   // etwas dunkler, damit das Licht wirkt
    if (zustand === 'start') { szene(g, t, ruh); g.restore(); return; }
    // Wetterleuchten: breites, fernes Flackern ohne Vorblitz
    S.wl.forEach(w => {
      const s2 = t - w.t0;
      const puls = [0, 0.3, 0.6].reduce((m, p0) => Math.max(m, s2 >= p0 ? Math.exp(-(s2 - p0) * 6) : 0), 0);
      wolkeLeuchten(g, w.x, w.y, w.r, puls * (ruh ? 0.8 : 1.4));
    });
    // Aufladung: Wolke über der Stange wird heller, flackert, Vorblitze
    S.ladungen.forEach(l => {
      const p = Math.min(1, (t - l.t0) / l.dauer);
      if (!ruh && Math.random() < dt * 14) l.flacker = 0.7 + Math.random() * 0.3 + (Math.random() < p * 0.3 ? 0.4 : 0);
      const st = L.stangen[l.stange];
      wolkeLeuchten(g, l.x, L.wolkeY, L.kurz * (0.4 + 0.16 * p), (0.75 + 0.6 * Math.pow(p, 1.1)) * (ruh ? 1 : l.flacker));
      // Vorblitz: kurze, schwache Leitblitze von der Wolke Richtung Stange, häufiger gegen Ende
      if (!l.vorblitz && Math.random() < dt * (3 + 9 * p)) {
        const lang = 0.22 + 0.4 * p;
        const yS = L.wolkeY - L.kurz * 0.03;
        l.vorblitz = { t0: t, pf: pfad(l.x, yS, l.x + (st.x - l.x) * lang + (Math.random() - 0.5) * 20, yS + (st.spitze - yS) * lang, 0) };
      }
      if (l.vorblitz) {
        const s2 = t - l.vorblitz.t0;
        if (s2 > 0.11) l.vorblitz = null;
        else blitzZeichnen(g, l.vorblitz.pf, (0.45 + 0.4 * p) * (1 - s2 / 0.11), 0.55);
      }
    });
    // Blitzlicht: die ganze Szene kurz heller (nicht grell)
    if (S.blitzlicht > 0 && hell) { g.globalAlpha = S.blitzlicht; g.drawImage(hell, L.bx, L.by, DACH.b * L.s, DACH.h * L.s); g.globalAlpha = 1; }
    szene(g, t, ruh);
    zielhinweis(g, t, ruh);
    // Blitze: Hauptschlag, kurze Pause, zweiter Schlag, Ausglühen
    S.blitze.forEach(bl => {
      const s2 = t - bl.t0;
      const a = s2 < 0.08 ? 1 : s2 < 0.13 ? 0.25 : s2 < 0.22 ? (ruh ? 0.6 : 0.95) : Math.max(0, 1 - (s2 - 0.22) / 0.45) * 0.6;
      blitzZeichnen(g, bl.pfad, a, 1);
      if (s2 < 0.25) {   // Lichtfleck am Einschlagpunkt
        const [ex, ey] = bl.pfad.punkte[bl.pfad.punkte.length - 1], r = L.kurz * (bl.dach ? 0.16 : 0.1);
        g.save(); g.globalCompositeOperation = 'lighter';
        const rg = g.createRadialGradient(ex, ey, 0, ex, ey, r);
        rg.addColorStop(0, `rgba(255,250,235,${0.8 * a})`); rg.addColorStop(1, 'rgba(160,190,255,0)');
        g.fillStyle = rg; g.fillRect(ex - r, ey - r, 2 * r, 2 * r); g.restore();
      }
    });
    // Funken und Rauch beim Einschlag
    g.save(); g.globalCompositeOperation = 'lighter';
    S.funken.forEach(f => { g.fillStyle = `rgba(255,${180 + Math.round(60 * f.leben)},120,${Math.min(1, f.leben * 1.6)})`; g.fillRect(f.x - 1.5, f.y - 1.5, 3, 3); });
    g.restore();
    S.rauch.forEach(r => {
      const a = Math.max(0, r.leben / r.l0) * 0.35;
      const rg = g.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.r);
      rg.addColorStop(0, `rgba(60,60,64,${a})`); rg.addColorStop(1, 'rgba(60,60,64,0)');
      g.fillStyle = rg; g.fillRect(r.x - r.r, r.y - r.r, 2 * r.r, 2 * r.r);
    });
    regen(g, dt, ruh);
    g.restore();
    figurZeichnen(g, zustand);
    einschlaegeZeichnen(g);
    klicksZeichnen(g);
    // Mauszeiger als Hand über der Spielfläche (am PC sichtbar, dass man klicken kann)
    const feld = g.canvas;
    if (feld.style.cursor !== (zustand === 'spiel' ? 'pointer' : '')) feld.style.cursor = zustand === 'spiel' ? 'pointer' : '';
    // Punkte über der Stange
    S.texte.forEach(x => {
      const s2 = t - x.t0, a = Math.max(0, 1 - s2 / 1.1);
      g.save(); g.globalAlpha = a; g.fillStyle = x.farbe; g.textAlign = 'center';
      g.font = `700 ${Math.round(Math.max(18, L.kurz * 0.055))}px "Titillium Web", "Segoe UI", system-ui, sans-serif`;
      g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 6;
      g.fillText(x.t, x.x, x.y - s2 * 36); g.restore();
    });
  }
  // Wolkenschichten ziehen gleichmäßig nach links (mit dem Regen) (Werte siehe HIMMEL), die vordere brodelt leicht (Höhe ±1,5 %, ca. 17s);
  // dazu selten ein schwaches, fernes Aufhellen hoch in den Wolken – nie über einer Stange, ohne Flackern und ohne Ton
  // (klar schwächer als Aufladen und Wetterleuchten). Bei „Bewegung reduzieren“ aus.
  function himmelZeichnen(g, t, ruh) {
    if (!himmel || ruh) return;
    const w = DACH.b * L.s, unten = L.by + HIMMEL.weg * L.s;   // Unterkante der Schichten = Ende der Ausblendung
    HIMMEL.schichten.forEach((sch, i) => {
      const brodeln = i ? 1 + 0.015 * Math.sin(t * 2 * Math.PI / 17) : 1;
      const bw = 2 * w * sch.groesse, bh = HIMMEL.weg * L.s * sch.groesse * brodeln;   // Kachel: Bild + Spiegelbild
      const weg = ((sch.start * bw + t * sch.tempo * w / 60) % bw + bw) % bw;
      g.save(); g.globalAlpha = sch.deckkraft;
      for (let x = L.bx - weg - bw; x < B; x += bw) if (x + bw > 0) g.drawImage(himmel, x, unten - bh, bw, bh);
      g.restore();
    });
    // fernes Aufhellen: alle 7–13s, weich an und aus (1,6s), nur wenn gerade nichts lädt oder leuchtet
    if (S.fernUm == null) S.fernUm = t + 4 + Math.random() * 5;
    if (!S.fern && t >= S.fernUm) {
      S.fernUm = t + 7 + Math.random() * 6;
      const frei = [0.1, 0.25, 0.4, 0.66, 0.92].map(f => f * B).filter(x => L.stangen.every(st => Math.abs(st.x - x) > B * 0.12));
      if (frei.length && !S.ladungen.length && !S.wl.length) S.fern = { t0: t, x: frei[Math.floor(Math.random() * frei.length)], y: L.wolkeY * 0.55 };
    }
    if (S.fern) {
      const p = (t - S.fern.t0) / 1.6;
      if (p >= 1) S.fern = null;
      else wolkeLeuchten(g, S.fern.x, S.fern.y, L.kurz * 0.45, 0.3 * Math.sin(p * Math.PI));
    }
  }
  // Zielhinweis nur beim 1. Blitz (MZ, 23.10.2026): während der ersten Aufladung pulsiert ein dezenter Ring um den Sockel
  // der betroffenen Stange und ihre Spitze leuchtet leicht. Ab Blitz 2 kein Hinweis. Bewegung reduziert: ruhig, ohne Pulsieren.
  function zielhinweis(g, t, ruh) {
    const l = S.ladungen.find(l2 => l2.nr === 0);
    if (!l) return;
    const st = L.stangen[l.stange], s2 = t - l.t0;
    const ein = Math.min(1, s2 / 0.3), puls = ruh ? 0.6 : 0.5 + 0.5 * Math.sin(s2 * Math.PI * 2 / 0.9);
    g.save(); g.globalCompositeOperation = 'lighter';
    // Ring auf dem Dach um den Sockel (perspektivisch flach), wird beim Pulsieren etwas größer
    const rx = st.sockelB * (1.35 + (ruh ? 0 : 0.18 * puls)), ry = rx * 0.28;
    g.strokeStyle = `rgba(150,200,255,${(0.35 + 0.35 * puls) * ein})`; g.lineWidth = Math.max(2, st.k * 9);
    g.beginPath(); g.ellipse(st.x, st.y - st.sockelB * 0.12, rx, ry, 0, 0, Math.PI * 2); g.stroke();
    // Spitze leuchtet leicht
    const r = Math.max(14, st.k * 70) * (1 + (ruh ? 0 : 0.25 * puls));
    const rg = g.createRadialGradient(st.x, st.spitze, 0, st.x, st.spitze, r);
    rg.addColorStop(0, `rgba(220,235,255,${(0.45 + 0.3 * puls) * ein})`); rg.addColorStop(1, 'rgba(140,180,255,0)');
    g.fillStyle = rg; g.fillRect(st.x - r, st.spitze - r, 2 * r, 2 * r);
    g.restore();
  }
  // Brandflecken, Stangen und Ableitungen (von hinten nach vorn)
  function szene(g, t, ruh) {
    S.flecken.forEach(f => {
      g.save(); g.translate(f.x, f.y); g.scale(1, 0.3);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, f.r);
      rg.addColorStop(0, 'rgba(15,12,10,.75)'); rg.addColorStop(0.6, 'rgba(25,20,18,.4)'); rg.addColorStop(1, 'rgba(25,20,18,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, f.r, 0, Math.PI * 2); g.fill();
      const glimm = Math.max(0, 1 - (t - f.t0) / 1.5);
      if (glimm > 0) { g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,120,40,${0.5 * glimm})`; g.beginPath(); g.arc(0, 0, f.r * 0.3, 0, Math.PI * 2); g.fill(); }
      g.restore();
    });
    L.stangen.slice().sort((a, b) => a.y - b.y).forEach(st => {
      ableitungZeichnen(g, st);
      leitungGluehen(g, st, S.leitung[st.i] == null ? null : t - S.leitung[st.i]);
      stangeZeichnen(g, st, S.glut[st.i]);
    });
  }
  function regen(g, dt, ruh) {
    if (ruh) return;
    const n = Math.round(Math.min(90, B * H / 9000));
    while (S.regen.length < n) S.regen.push({ x: Math.random() * B, y: Math.random() * H, v: 700 + Math.random() * 400 });
    g.save(); g.strokeStyle = 'rgba(200,215,235,.16)'; g.lineWidth = 1; g.beginPath();
    S.regen.forEach(r => {
      r.y += r.v * dt; r.x -= r.v * dt * 0.12;
      if (r.y > H) { r.y = -20; r.x = Math.random() * (B + 40); }
      g.moveTo(r.x, r.y); g.lineTo(r.x + 2.2, r.y - 16);
    });
    g.stroke(); g.restore();
  }

  // ---------- Anmeldung ----------
  R_.spiel({
    id: 'fangstange',
    wertung: 'hoch',
    format: p => p.toLocaleString('de-DE') + ' Punkte',
    hoechst: 1000,
    bereich: 'Blitzschutz',
    hintergrund: { bild: 'bilder/dach.webp', position: '50% 50%' },
    figur: POSEN.daumen,
    texte: {
      titel: 'Fangstange',
      untertitel: 'Lenkst du jeden Blitz sicher ab?',
      anleitung: 'Ein Blitz lädt sich über einer der drei Fangstangen auf. Tippe schnell auf diese Stange, bevor er ins Dach einschlägt – je schneller, desto mehr Punkte. Flackert es nur, warte ab. Drei Blitze verpasst? Ende!',   // MZ, 23.10.2026 (Ausrufezeichen gewollt)
    },
    // Klänge (Sound Artist, 23.10.2026): Pegel im Verhältnis – Einschlag etwas lauter als Treffer; Gewitter (Wind/Regen +
    // fernes Grollen, MZ 23.10.2026) klar hörbar unter Treffer, Einschlag und Aufladen – deshalb Aufladen lauter als zuvor
    klaenge: {
      aufladen: { datei: 'klaenge/aufladen.mp3', proben: 28665, pegel: 0.8 },
      treffer: { datei: 'klaenge/treffer.mp3', proben: 59535, pegel: 0.7 },
      dach: { datei: 'klaenge/dach.mp3', proben: 49833, pegel: 0.9 },
      wetterleuchten: { datei: 'klaenge/wetterleuchten.mp3', proben: 61740, pegel: 0.55 },
      gewitter: { datei: 'klaenge/gewitter.mp3', proben: 485100, pegel: 0.35 },
    },
    schleife: 'gewitter',   // läuft das ganze Spiel nahtlos, blendet mit dem Endbild weich aus (Rahmen)
    neu, schritt, zeichne, runter, groesse,
  });

  // Testhilfe: Zustand für Testläufe (nur lesen; tippe(i) tippt Stange i wie ein Finger)
  window.__fangstange = {
    get zustand() { return S && { zeit: +S.zeit.toFixed(2), nr: S.nr, punkte: S.punkte, abgeleitet: S.abgeleitet, einschlaege: S.einschlaege,
      wlGetippt: S.wlGetippt, ladungen: S.ladungen.map(l => ({ stange: l.stange, seit: +(S.zeit - l.t0).toFixed(2), dauer: +l.dauer.toFixed(2) })),
      wetterleuchten: S.wl.some(w => S.zeit - w.t0 < WL_DAUER), fernesLeuchten: !!S.fern, fertig: S.fertig }; },
    get stangen() { return L && L.stangen.map(s => ({ x: Math.round(s.x), y: Math.round(s.y), spitze: Math.round(s.spitze), links: Math.round(s.links), rechts: Math.round(s.rechts) })); },
    get plan() { return S && S.plan.map(p => (p.doppel ? 'D' : '') + (p.wl ? 'W' : '') + p.stange); },
  };
})();
