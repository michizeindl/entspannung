// Atemkreis (Sammlung „entSPANNUNG“, RSI protect®, Bereich Entspannung) – Konzept von MZ freigegeben (24.10.2026):
// Lotusteich in der blauen Stunde. Ein leuchtender Ring über dem Wasser gibt den Atem vor: wächst er, Finger halten
// (einatmen); steht er, weiter halten; wird er kleiner, loslassen (ausatmen); kurze Pause. Erst ein Probe-Atemzug ohne
// Wertung (mit „Einatmen…“/„Ausatmen…“), dann 10 gewertete. Takt 1–3: 4s ein / 4s aus; 4–6: 4s / 2s halten / 5s;
// 7–10: 4s / 4s halten / 6s. Am PC Maus oder Leertaste halten.
// Punkte je Atemzug (max. 100): 40 Halten-Moment (Beginn des Einatmens), 40 Loslassen-Moment (Beginn des Ausatmens), voll bis
// 0,25s Abweichung, null ab 1,2s; 20 Ruhe (kein Zucken/Nachtippen, kein Loslassen in der Halte-Phase). Kein Abbruch.
// Natur reagiert: je gutem Atemzug (ab 70) öffnet sich eine Lotusblüte, ruhige Atemzüge glätten das Wasser, Glühwürmchen
// werden mehr, Sterne kommen nach und nach.
//
// Testhilfen (Adresse): #ende=sieg-920 | mittel-640 | schwach-420, #atem=N (ohne Probe, ab Atemzug N; frühere gut),
//   #schnell (Takt dreimal so schnell), #ruhig. window.__atemkreis: Zustand, Plan, Bot.
(function () {
  'use strict';
  const R_ = window.Rahmen;
  const hash = location.hash;
  const TEST = {
    ende: (/(?:^#|&)ende=([a-z]+-)?(\d+)/.exec(hash) || [])[2] || null,
    atem: +((/(?:^#|&)atem=(\d+)/.exec(hash) || [])[1] || 0),
    schnell: /(?:^#|&)schnell(?![a-z])/.test(hash),
    ruhig: /(?:^#|&)ruhig(?![a-z])/.test(hash),
  };
  const ruhig = () => TEST.ruhig || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const TEMPO = TEST.schnell ? 3 : 1;

  // ---------- Regeln ----------
  const ATEM = 10;
  const VOLL = 0.25, NULL_AB = 1.2;     // Zeitabweichung (s): volle Punkte bis 0,25s, keine ab 1,2s
  const PUNKTE = { halten: 40, loslassen: 40, ruhe: 20 };
  const GUT = 70;                       // ab hier öffnet sich eine Lotusblüte
  const IM_TAKT = 0.5;                  // „im Takt“: Halten und Loslassen je höchstens 0,5s daneben
  const PAUSE = 1.6, VORLAUF = 2.2;     // Pause nach dem Ausatmen; Ruhe vor dem ersten Atemzug
  const TAKT = n => n < 3 ? [4, 0, 4] : n < 6 ? [4, 2, 5] : [4, 4, 6];   // [ein, halten, aus] je Atemzug (0-basiert)
  // Plan: Probe (Takt 4/4) + 10 Atemzüge; Zeiten in Spielsekunden
  function plan(abNr) {
    const p = []; let t = VORLAUF;
    if (!abNr) { p.push({ nr: -1, probe: true, t0: t, ein: 4, halt: 0, aus: 4 }); t += 8 + PAUSE + 0.6; }
    for (let n = abNr || 0; n < ATEM; n++) {
      const [ein, halt, aus] = TAKT(n);
      p.push({ nr: n, t0: t, ein, halt, aus }); t += ein + halt + aus + PAUSE;
    }
    p.forEach(b => { b.t1 = b.t0 + b.ein + b.halt; b.t2 = b.t1 + b.aus; b.ende = b.t2 + PAUSE; });
    return p;
  }
  const klemme = v => Math.max(0, Math.min(1, v));
  const zeitPunkte = (d, max) => Math.round(max * klemme(1 - (Math.abs(d) - VOLL) / (NULL_AB - VOLL)));
  // Wertung eines Atemzugs aus den Ereignissen [{ t, an: true|false }] im Fenster [t0 − 1,2s, nächster t0 − 1,2s)
  function wertung(b, ev, gehaltenVorher) {
    const downs = ev.filter(e => e.an), ups = ev.filter(e => !e.an);
    let druck = downs.find(e => e.t < b.t1);
    // schon vor dem Fenster gehalten (nicht losgelassen): Halten-Moment zählt als ganz daneben
    const dH = gehaltenVorher ? NULL_AB : druck ? druck.t - b.t0 : NULL_AB;
    const nachDruck = druck ? ups.filter(e => e.t > druck.t) : ups;
    let los = null;
    nachDruck.forEach(e => { if (!los || Math.abs(e.t - b.t1) < Math.abs(los.t - b.t1)) los = e; });
    const dL = los ? los.t - b.t1 : NULL_AB;
    const extra = Math.max(0, ev.length - 2);
    // in der Halte-Phase losgelassen (zwischen Ende Einatmen und Beginn Ausatmen, mit 0,25s Spielraum)
    const halteLos = b.halt > 0 && ups.some(e => e.t > b.t0 + b.ein + VOLL && e.t < b.t1 - VOLL);
    // Ruhe-Punkte nur, wenn in diesem Atemzug überhaupt gedrückt wurde (QA S2, MZ 24.10.2026: nichts tun ≠ ruhig atmen)
    const ruhe = downs.length ? Math.round(PUNKTE.ruhe * klemme(1 - 0.5 * extra - (halteLos ? 0.5 : 0))) : 0;
    const h = zeitPunkte(dH, PUNKTE.halten), l = zeitPunkte(dL, PUNKTE.loslassen);
    return { punkte: h + l + ruhe, halten: h, loslassen: l, ruhe, dH: +dH.toFixed(2), dL: +dL.toFixed(2), extra, halteLos,
      imTakt: Math.abs(dH) <= IM_TAKT && Math.abs(dL) <= IM_TAKT, keine: !downs.length };
  }

  // ---------- Bilder ----------
  const bilder = {};
  function lade(name, datei) { const i = new Image(); i.onload = () => { bilder[name] = i; }; i.src = datei; }
  lade('himmel', 'bilder/himmel.webp');
  lade('teich', 'bilder/teich.webp');
  lade('mond', 'bilder/mond.webp');
  [1, 2, 3].forEach(n => { lade('lotus' + n, 'bilder/lotus-' + n + '.webp'); lade('blatt' + n, 'bilder/blatt-' + n + '.webp'); });
  // Avatar c (Atemkreis): Blick der Pose im Bild; Spiel und Rahmen richten die Figur zur Bildmitte aus
  const POSEN = {
    meditation: { bild: 'bilder/avatar-meditation.webp', blick: 'frontal', hoehe: 0.558 },
    stehend: { bild: 'bilder/avatar-stehend.webp', blick: 'links', hoehe: 1 },
    freude: { bild: 'bilder/avatar-freude.webp', blick: 'frontal', hoehe: 0.974 },
    zucken: { bild: 'bilder/avatar-zucken.webp', blick: 'frontal', hoehe: 0.974 },
  };
  Object.keys(POSEN).forEach(n => lade(n, POSEN[n].bild));
  // Teich (1536×1024): Horizont/Wasserlinie y 300, Wasser bis unten; Felsen rechts vorn (Sitzplatz Avatar)
  const TEICH = { horizont: 300, felsen: [[860, 1024], [890, 800], [1000, 755], [1110, 728], [1200, 710], [1536, 700], [1536, 1024]], sitz: [1290, 772] };
  const imPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c; } return c; };

  // ---------- Lage ----------
  let B = 0, H = 0, L = null;
  function lage() {
    const hoch = H >= B * 0.9;
    // Hoch: Teich deckend, rechts so, dass der Felsen mit dem Avatar unten rechts bleibt.
    // Quer (MZ, 24.10.2026: mehr Himmel samt Mond): Baumlinie (Bild-y 235) bei ca. 38 % der Höhe, Sitzplatz des Avatars
    // (Bild-y 772) noch im Bild; das Teichbild steht rechts bündig (Felsen), oben ist es durchsichtig (Himmel per Code).
    // Reicht die Breite dann nicht, wird links gespiegelt fortgesetzt (Ufer mit Schilf und Seerosenblättern).
    let s, ox, oy;
    if (hoch) {
      s = Math.max(B / 1536, H / 1024);
      ox = Math.max(B - 1536 * s, Math.min(0, B - 1330 * s)); oy = Math.max(H - 1024 * s, Math.min(0, H - 1024 * s));
    } else {
      s = Math.min(Math.max(B / 1536, H / 1024), (0.62 * H - 10) / (772 - 235));
      s = Math.max(s, H / 1024 * 1.05);
      ox = Math.min(0, B - 1536 * s) + Math.max(0, B - 1536 * s);   // rechts bündig
      oy = Math.min(0.38 * H - 235 * s, H - 10 - 772 * s);
    }
    const oben = 56;
    const R = Math.max(60, Math.min(B * (hoch ? 0.36 : 0.26), (H - oben) * (hoch ? 0.24 : 0.32)));
    const ring = { x: hoch ? B * 0.46 : B * 0.43, y: oben + (H - oben) * (hoch ? 0.4 : 0.44), R };
    L = { hoch, s, ox, oy, ring, kurz: Math.min(B, H) };
    if (S) lotusPlaetze();
  }
  function groesse(b, h) { B = b; H = h; lage(); }
  const schirm = (ix, iy) => [L.ox + ix * L.s, L.oy + iy * L.s];
  const imBild = (sx, sy) => [(sx - L.ox) / L.s, (sy - L.oy) / L.s];

  // 10 Plätze für Lotusblüten auf dem sichtbaren Wasser (nicht am Felsen, nicht unter dem Ring, mit Abstand), vorn größer
  function lotusPlaetze() {
    const kand = [], r = L.ring;
    for (let sy = H * 0.5; sy < H - 20; sy += 14) for (let sx = 24; sx < B - 24; sx += 14) {
      const [ix, iy] = imBild(sx, sy);
      if (iy < 520 || iy > 1000 || imPoly([ix, iy], TEICH.felsen)) continue;
      if (Math.hypot((sx - r.x) / 1.1, sy - r.y) < r.R * 1.15) continue;
      if (Math.abs(sx - r.x) < 110 && sy > r.y + r.R && sy < r.y + r.R + 90) continue;   // Platz für „Einatmen…“ usw.
      const av = schirm(...TEICH.sitz);
      if (Math.abs(sx - av[0]) < L.kurz * 0.16 && sy > av[1] - L.kurz * 0.3) continue;
      kand.push([sx, sy, ix, iy]);
    }
    let zz = S.lotusSaat;
    const zufall = () => { zz = (zz * 9301 + 49297) % 233280; return zz / 233280; };
    const plaetze = [];
    const abstand = L.kurz * 0.13;
    for (let v = 0; v < 400 && plaetze.length < ATEM && kand.length; v++) {
      const k = kand[Math.floor(zufall() * kand.length)];
      if (plaetze.every(p => Math.hypot(p[0] - k[0], p[1] - k[1]) > abstand)) plaetze.push(k);
    }
    plaetze.sort((p, q) => p[1] - q[1]);   // hinten zuerst zeichnen
    S.lotus.forEach((lo, i) => { const p = plaetze[i % Math.max(1, plaetze.length)]; if (p) { lo.ix = p[2]; lo.iy = p[3]; } });
  }

  // ---------- Zustand ----------
  let S = null;
  function neu() {
    S = { zeit: 0, phase: 'atmen', plan: plan(R_.zustand === 'spiel' && TEST.atem > 1 ? Math.min(ATEM, TEST.atem) - 1 : 0), idx: 0,
      ev: [], halten: false, gehaltenSeit: 0, ergebnisse: [], punkte: 0, popups: [], text: null,
      figur: { pose: 'meditation', bis: 0, seit: -9, vorher: 'meditation' }, unruhe: 1, offen: 0, stern: 0,
      lotus: [], lotusSaat: Math.floor(Math.random() * 233280), wuermchen: [], testEnde: !!TEST.ende, finaleT: 0, sterne: [] };
    for (let i = 0; i < ATEM; i++) S.lotus.push({ ix: 0, iy: 0, offen: -1, blatt: 1 + (i % 3), w: (Math.random() - 0.5) * 0.5 });
    // Testhilfe #atem=N: frühere Atemzüge gut
    if (R_.zustand === 'spiel' && TEST.atem > 1) for (let n = 0; n < Math.min(ATEM, TEST.atem) - 1; n++) {
      S.ergebnisse.push({ nr: n, punkte: 95, imTakt: true }); S.punkte += 95; S.lotus[n].offen = -10; S.unruhe -= 0.1;
    }
    const st = []; for (let i = 0; i < 70; i++) st.push({ x: Math.random(), y: Math.random() * 0.9, h: 0.4 + Math.random() * 0.6, p: Math.random() * 6, f: 0.6 + Math.random() * 1.4 });
    S.sterne = st;
    if (L) lotusPlaetze();
    anzeigen();
  }
  function anzeigen() {
    const b = S.plan[S.idx], n = b && !b.probe ? b.nr + 1 : 0;
    R_.anzeige(b && b.probe ? 'Probe-Atemzug' : 'Atemzug ' + Math.max(1, Math.min(ATEM, n || ATEM)) + '/' + ATEM, S.punkte.toLocaleString('de-DE') + ' Punkte');
  }

  // ---------- Ablauf ----------
  let atemTon = null;
  function schritt(dt) {
    if (S.testEnde) { S.testEnde = false; testEnde(); return; }
    S.zeit += dt * TEMPO;
    const t = S.zeit;
    if (S.phase === 'atmen') {
      const b = S.plan[S.idx];
      // Klänge zum Atem (leise, weich): Einatmen beim Wachsen, Ausatmen beim Kleinerwerden
      if (b && !b.einTon && t >= b.t0) { b.einTon = true; if (!TEST.schnell) R_.ton('einatmen'); }
      if (b && !b.ausTon && t >= b.t1) { b.ausTon = true; if (!TEST.schnell) R_.ton('ausatmen' + Math.max(4, Math.min(6, b.aus))); }
      // Auswertung, sobald das Fenster für den Loslassen-Moment vorbei ist
      // letzter Atemzug (Spielertest 24.10.2026: kein Leerlauf am Ende): nach dem Loslassen höchstens ca. 1s Ausklang, dann Finale
      const letzter = b && !S.plan[S.idx + 1];
      const los = letzter && !S.halten && S.ev.filter(e => !e.an && e.t > b.t1 - NULL_AB).pop();
      const frueh = letzter && los && t >= Math.max(los.t + 1.0, b.t1 + 0.3);
      if (b && (t >= Math.max(b.t2, b.t1 + NULL_AB) + 0.05 || frueh) && !b.gewertet) auswerten(b);
      if (b && (letzter ? b.gewertet : t >= b.ende && b.gewertet)) {
        S.idx++;
        if (S.idx >= S.plan.length) { S.phase = 'finale'; S.finaleT = 0; R_.ton('fertig'); figur(S.punkte >= 800 ? 'freude' : 'stehend', 3.4); }
        anzeigen();
      }
    } else if (S.phase === 'finale') {
      S.finaleT += dt * TEMPO;
      if (S.finaleT >= 2.2 && !S.endeGerufen) { S.endeGerufen = true; S.phase = 'ende'; endbild(); }
    }
    S.popups.forEach(p => { p.t += dt; }); S.popups = S.popups.filter(p => p.t < 1.8);
    S.lotus.forEach(lo => { if (lo.offen >= 0) lo.offen += dt; });
    const zielStern = S.phase === 'finale' || S.phase === 'ende' ? 1 : (S.idx) / (S.plan.length);
    S.stern += (zielStern - S.stern) * Math.min(1, dt * 0.3);
  }
  function auswerten(b) {
    b.gewertet = true;
    const a = b.t0 - NULL_AB, e = (S.plan[S.idx + 1] ? S.plan[S.idx + 1].t0 : b.ende + 5) - NULL_AB;
    const ev = S.ev.filter(x => x.t >= a && x.t < e);
    const vorher = S.halten && S.gehaltenSeit < a;
    const w = wertung(b, ev, vorher && ev.every(x => !x.an));
    b.w = w;
    // kurze Rückmeldung je Atemzug (MZ, 24.10.2026)
    const grund = w.keine ? 'Nicht mitgedrückt' : w.imTakt ? (w.extra || w.halteLos ? 'Ruhiger halten' : 'Im Takt')
      : Math.abs(w.dH) >= Math.abs(w.dL) ? (w.dH > 0 ? 'Früher einatmen' : 'Später einatmen') : (w.dL > 0 ? 'Früher loslassen' : 'Später loslassen');
    if (b.probe) { S.popups.push({ text: w.imTakt ? 'Gut so' : 'Probe', t: 0, probe: true, grund: w.imTakt ? null : grund }); return; }
    S.ergebnisse.push(Object.assign({ nr: b.nr }, w));
    S.punkte += w.punkte;
    S.popups.push({ text: '+' + w.punkte, t: 0, grund });
    if (w.punkte >= GUT) {
      const lo = S.lotus.find(x => x.offen === -1);   // -1 = Knospe, -10 = schon offen (Testhilfe)
      if (lo) { lo.offen = 0; R_.ton('gelungen'); }
    }
    if (w.ruhe >= 15) S.unruhe = Math.max(0, S.unruhe - 0.1);
    if (w.punkte >= 95) figur('freude', 1.2); else if (w.punkte < 40) figur('zucken', 1.2);
    anzeigen();
  }
  function figur(pose, dauer) { const f = S.figur; f.vorher = aktuellePose(); f.pose = pose; f.bis = S.zeit + dauer * TEMPO; f.seit = S.zeit; }
  function aktuellePose() { const f = S.figur; return S.zeit < f.bis ? f.pose : 'meditation'; }

  function bewertung(p) {
    if (p >= 900) return ['Ganz im Fluss', 'ENTSPANNT', 'gut', 'freude'];
    if (p >= 800) return ['Tief entspannt', 'ENTSPANNT', 'gut', 'freude'];
    if (p >= 700) return ['Gut durchgeatmet', 'ENTSPANNT', 'gut', 'stehend'];
    if (p >= 550) return ['Einfach entspannen', 'UNENTSPANNT', 'mittel', 'stehend'];
    return ['Erst mal durchatmen', 'ANGESPANNT', 'schlecht', 'zucken'];
  }
  function endbild() {
    const punkte = Math.max(1, Math.min(1000, S.punkte));
    const [titel, stempel, art, pose] = bewertung(punkte);
    const takt = S.testTakt != null ? S.testTakt : S.ergebnisse.filter(e => e.imTakt).length;
    const offen = S.testOffen != null ? S.testOffen : S.lotus.filter(l => l.offen >= 0 || l.offen <= -10).length;
    R_.ende(punkte, { ueberschrift: titel, felder: [['Im Takt', takt + ' von ' + ATEM], ['Lotusblüten', offen + ' geöffnet']],
      stempel: { text: stempel, art }, figur: POSEN[pose], verzoegerung: 300 });
  }
  function testEnde() {
    const p = Math.max(1, Math.min(1000, +TEST.ende));
    S.punkte = p; S.testTakt = Math.max(0, Math.min(10, Math.round(p / 100 - 0.5))); S.testOffen = Math.max(0, Math.min(10, Math.round(p / 100)));
    endbild();
  }

  // ---------- Eingabe ----------
  function druecken(an) {
    if (!S || R_.zustand !== 'spiel' || S.phase !== 'atmen' || S.halten === an) return;
    S.halten = an; if (an) S.gehaltenSeit = S.zeit;
    S.ev.push({ t: S.zeit, an });
  }
  const runter = () => druecken(true), hoch = () => druecken(false);
  addEventListener('keydown', e => { if (e.key === ' ' && R_.zustand === 'spiel') { e.preventDefault(); if (!e.repeat) druecken(true); } });
  addEventListener('keyup', e => { if (e.key === ' ' && R_.zustand === 'spiel') { e.preventDefault(); druecken(false); } });
  addEventListener('blur', () => druecken(false));

  // ---------- Zeichnen ----------
  function zeichne(g, b, h, zustand, dt) {
    if (!L || b !== B || h !== H) groesse(b, h);
    if (!S) { neu(); lotusPlaetze(); }
    const ruh = ruhig(), t = S.zeit;
    himmelZeichnen(g, t, ruh);
    sterne(g, t, ruh);
    enten(g, dt, ruh);
    mondZeichnen(g);
    if (bilder.teich) {
      const w = 1536 * L.s, hh = 1024 * L.s;
      g.drawImage(bilder.teich, L.ox, L.oy, w, hh);
      if (L.ox > 0) { g.save(); g.translate(L.ox, L.oy); g.scale(-1, 1); g.drawImage(bilder.teich, 0, 0, w, hh); g.restore(); }
    }
    nacht(g);
    if (zustand === 'start') return;
    wasser(g, t, ruh);
    if (S.phase !== 'ende') ringZeichnen(g, t, ruh, true);
    lotusZeichnen(g, t, ruh);
    wuermchen(g, dt, ruh);
    if (S.phase !== 'ende') ringZeichnen(g, t, ruh, false);
    textZeichnen(g);
    popups(g);
    figurZeichnen(g, zustand);
    g.canvas.style.cursor = zustand === 'spiel' ? 'pointer' : '';
  }
  // Himmel: kachelbar, zieht endlos nach rechts, ruhiger Abend (oben 9 %, am Horizont 5 % der Bildschirmbreite pro Minute)
  const WOLKEN = { nah: 0.09, fern: 0.05 };
  function himmelZeichnen(g, t, ruh) {
    g.fillStyle = '#1d2f63'; g.fillRect(0, 0, B, H);
    const img = bilder.himmel;
    if (!img) return;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const horizont = L.oy + TEICH.horizont * L.s;
    const s = Math.max(B / iw, (horizont + 40) / ih * 1.15), w = iw * s, hh = ih * s, y0 = horizont + 40 - hh;
    const zeit = ruh ? 0 : t / TEMPO, n = ruh ? 1 : 70;
    for (let r = 0; r < n; r++) {
      const v = (WOLKEN.fern + (WOLKEN.nah - WOLKEN.fern) * (1 - (r + 0.5) / n)) * zeit * B / 60;
      const sy = ih * r / n, sh = ih / n, dy = y0 + hh * r / n, dh = hh / n + 0.6;
      for (let x = (v % w) - w; x < B; x += w) g.drawImage(img, 0, sy, iw, sh, x, dy, w, dh);
    }
  }
  // Mondsichel (eigenes Bild, aus dem Himmel herausgelöst): fest an einer freien Stelle im Himmel – unter der Kopfzeile, rechts
  // vom Ring, über der Baumlinie; nie hinter den Knöpfen (MZ, 24.10.2026). Steigt im Lauf des Spiels ganz leicht.
  function mondLage() {
    const baum = L.oy + 235 * L.s, r = L.ring;
    const gr = Math.max(26, Math.min(48, L.kurz * 0.075));
    let x = L.hoch ? B * 0.74 : Math.max(r.x + r.R * 1.25 + gr, B * 0.72);
    x = Math.min(x, B - gr - 24);
    const y = Math.max(74 + gr * 0.6, Math.min(baum - gr * 1.2, 60 + (baum - 60) * 0.4)) - (S ? S.stern * 6 : 0);
    return { x, y, gr };
  }
  function mondZeichnen(g) {
    const img = bilder.mond, m = mondLage();
    S.monde = [[m.x, m.y]];
    if (!img) return;
    const w = m.gr * img.naturalWidth / img.naturalHeight;
    g.save(); g.shadowColor = 'rgba(255,240,200,.55)'; g.shadowBlur = m.gr * 0.5;
    g.drawImage(img, m.x - w / 2, m.y - m.gr / 2, w, m.gr); g.restore();
  }
  // Entenschwarm (MZ, 24.10.2026): 6–12 kleine dunkle Silhouetten in lockerer V- oder Kettenformation ziehen in 20–30s
  // quer über den Himmel oberhalb der Baumlinie – erstmals nach 25–40s, dann alle 60–90s, Richtung abwechselnd. Nie vor dem
  // Ring, nicht im Bereich der Kopfzeile (Knöpfe), nicht vor dem Mond: die Flughöhe wird beim Start so gewählt; passt keine
  // Höhe (z. B. kaum Himmel), fliegt diesmal keiner. Kein Spiegelbild, kein Klang; bei „Bewegung reduzieren“ aus.
  function enten(g, dt, ruh) {
    if (ruh) return;
    if (S.entenUm == null) S.entenUm = 25 + Math.random() * 15;
    S.entenUhr = (S.entenUhr || 0) + dt;
    if (!S.enten && S.entenUhr >= S.entenUm) {
      S.entenUm = S.entenUhr + 60 + Math.random() * 30;
      const oben = 74, baum = L.oy + 235 * L.s - 14, ring = L.ring.y - L.ring.R * 1.4 - 16;
      // über dem Ring, wenn dort Platz ist; sonst irgendwo über der Baumlinie, dann blendet der Schwarm hinter dem Ring aus
      const unten = ring - oben > 24 ? Math.min(baum, ring) : baum;
      const frei = [];
      for (let y = oben; y <= unten; y += 4) if (!(S.monde || []).some(m => Math.abs(m[1] - y) < 34)) frei.push(y);
      if (frei.length) {
        const n = 6 + Math.floor(Math.random() * 7), dir = S.entenDir = -(S.entenDir || -1), v = Math.random() < 0.65;
        const k = Math.max(0.7, Math.min(1.25, L.kurz / 520));
        const voegel = [];
        for (let i = 0; i < n; i++) {
          const reihe = v ? Math.ceil(i / 2) : i, seite = v ? (i % 2 ? -1 : 1) : 0;
          voegel.push({ dx: -reihe * 15 * k, dy: v ? seite * reihe * 6.5 * k : reihe * 2.2 * k + Math.sin(i * 1.7) * 3 * k, p: Math.random() * 6, f: 7 + Math.random() * 2 });
        }
        S.enten = { n, dir, y: frei[Math.floor(Math.random() * frei.length)], t: 0, dauer: 20 + Math.random() * 10, k, voegel };
      }
    }
    const e = S.enten;
    if (!e) return;
    e.t += dt;
    const p = e.t / e.dauer;
    if (p > 1) { S.enten = null; return; }
    const breite = B + 260 * e.k, x0 = e.dir > 0 ? -130 * e.k + breite * p : B + 130 * e.k - breite * p;
    const y0 = e.y + Math.sin(e.t * 0.35) * 4 * e.k;
    // hinter dem Ring (nur, wenn über dem Ring kein Platz war): sanft ausblenden, nie vor dem Ring zu sehen
    const r = L.ring, dr = Math.hypot(x0 - r.x, y0 - r.y) / (r.R * 1.2);
    g.save(); g.globalAlpha = Math.max(0, Math.min(1, (dr - 0.92) / 0.2));
    g.strokeStyle = 'rgba(22,28,52,.78)'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 1.4 * e.k;
    e.voegel.forEach(vg => {
      const x = x0 + vg.dx * e.dir + Math.sin(e.t * 0.6 + vg.p) * 1.5 * e.k, y = y0 + vg.dy + Math.sin(e.t * 0.8 + vg.p * 2) * 1.2 * e.k;
      const fl = Math.sin(e.t * vg.f + vg.p), sp = 4.2 * e.k, h = fl * 2.6 * e.k;
      g.beginPath(); g.moveTo(x - sp, y - h); g.quadraticCurveTo(x - sp * 0.4, y - h * 0.3 - 0.8 * e.k, x, y); g.quadraticCurveTo(x + sp * 0.4, y - h * 0.3 - 0.8 * e.k, x + sp, y - h); g.stroke();
      g.fillStyle = 'rgba(22,28,52,.85)'; g.beginPath(); g.ellipse(x + e.dir * 0.8 * e.k, y + 0.3 * e.k, 1.8 * e.k, 0.9 * e.k, 0, 0, Math.PI * 2); g.fill();
    });
    g.restore();
  }
  // Sterne kommen nach und nach (mit jedem Atemzug mehr), leichtes Funkeln; die Nacht wird etwas dunkler
  function sterne(g, t, ruh) {
    const horizont = L.oy + TEICH.horizont * L.s, n = Math.round(6 + 64 * S.stern);
    g.save(); g.fillStyle = `rgba(8,12,40,${0.32 * S.stern})`; g.fillRect(0, 0, B, horizont + 10);
    g.fillStyle = '#fffbe8';
    for (let i = 0; i < n; i++) {
      const st = S.sterne[i], y = st.y * (horizont - 30);
      if (y < 4) continue;
      const fk = ruh ? 1 : 0.7 + 0.3 * Math.sin(t * st.f + st.p);
      g.globalAlpha = Math.min(1, (S.stern * 70 - i) / 6) * st.h * fk;
      g.beginPath(); g.arc(st.x * B, y, 0.7 + st.h * 1.1, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }
  function nacht(g) {
    if (S.stern <= 0.01) return;
    g.save(); g.fillStyle = `rgba(6,10,32,${0.22 * S.stern})`; g.fillRect(0, 0, B, H); g.restore();
  }
  // Wasser: feines Kräuseln (helle Linien), wird mit jedem ruhigen Atemzug glatter; Spiegelbild des Rings
  function wasser(g, t, ruh) {
    const a = 0.08 + 0.3 * S.unruhe;
    const y0 = L.oy + 420 * L.s;
    g.save(); g.strokeStyle = '#cfe2ff'; g.lineWidth = 1;
    for (let i = 0; i < 26; i++) {
      const y = y0 + (H - y0) * (i / 26) ** 1.3, amp = (1 + 5 * S.unruhe) * (0.4 + (y - y0) / (H - y0));
      const x = ((i * 397) % 1000) / 1000 * B, len = 30 + 60 * ((i * 131) % 7) / 7 * (0.5 + (y - y0) / (H - y0));
      g.globalAlpha = a * (0.5 + 0.5 * Math.sin((ruh ? 0 : t) * 0.9 + i * 1.7));
      g.beginPath();
      for (let k = 0; k <= 12; k++) { const xx = x + len * (k / 12 - 0.5), yy = y + Math.sin(k * 1.4 + (ruh ? 0 : t) * 1.3 + i) * amp * 0.3; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
      g.stroke();
    }
    g.restore();
  }
  // Ring: Radius nach Phase (wächst beim Einatmen, steht beim Halten, schrumpft beim Ausatmen); innen ein Leuchten, solange
  // gehalten wird. spiegel = Spiegelbild im Wasser (flach, blass, unter dem Ring)
  function ringRadius() {
    const b = S.plan[Math.min(S.idx, S.plan.length - 1)], r = L.ring, rMin = r.R * 0.38, t = S.zeit;
    if (!b || S.phase !== 'atmen') return { rad: rMin, phase: 'ruhe' };
    const ease = p => 0.5 - 0.5 * Math.cos(Math.PI * klemme(p));
    if (t < b.t0) return { rad: rMin, phase: 'ruhe', bis: b.t0 - t };
    if (t < b.t0 + b.ein) return { rad: rMin + (r.R - rMin) * ease((t - b.t0) / b.ein), phase: 'ein' };
    if (t < b.t1) return { rad: r.R, phase: 'halt' };
    if (t < b.t2) return { rad: r.R - (r.R - rMin) * ease((t - b.t1) / b.aus), phase: 'aus' };
    return { rad: rMin, phase: 'ruhe' };
  }
  function ringZeichnen(g, t, ruh, spiegel) {
    const r = L.ring, { rad, phase, bis } = ringRadius();
    const fin = S.phase === 'finale' ? Math.max(0, 1 - S.finaleT / 1.5) : 1;
    if (fin <= 0) return;
    const halt = S.halten;
    const atmen = ruh ? 0 : 0.03 * Math.sin(t * 2.2);
    g.save();
    if (spiegel) {
      // Spiegelbild: flache Ellipse unterhalb, blass
      const wy = Math.max(r.y + r.R * 1.05, L.oy + 360 * L.s);
      g.globalAlpha = 0.18 * fin; g.translate(r.x, wy + (wy - r.y) * 0.25); g.scale(1, 0.22);
      g.strokeStyle = '#ffd98a'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, rad, 0, Math.PI * 2); g.stroke();
      g.restore(); return;
    }
    g.globalAlpha = fin;
    // weicher Schein
    const sch = g.createRadialGradient(r.x, r.y, rad * 0.7, r.x, r.y, rad * 1.35);
    sch.addColorStop(0, 'rgba(255,214,140,0)'); sch.addColorStop(0.45, `rgba(255,214,140,${0.22 + 0.08 * (phase === 'halt')})`); sch.addColorStop(1, 'rgba(255,214,140,0)');
    g.fillStyle = sch; g.beginPath(); g.arc(r.x, r.y, rad * 1.35, 0, Math.PI * 2); g.fill();
    // Ring
    // Rückmeldung „jetzt ausatmen“: beim Übergang wechselt der Ring sanft von warmgold zu kühlem Mondweiß, kurzer heller Puls
    const bb = S.plan[Math.min(S.idx, S.plan.length - 1)], seitAus = phase === 'aus' && bb ? S.zeit - bb.t1 : -1;
    const kuehl = seitAus < 0 ? 0 : Math.min(1, seitAus / 0.35), blitz = seitAus < 0 ? 0 : Math.max(0, 1 - seitAus / 0.6);
    const mix = (a, b2) => Math.round(a + (b2 - a) * kuehl);
    g.strokeStyle = `rgb(${mix(255, 214)},${mix(241, 234)},${mix(207, 255)})`;
    g.lineWidth = Math.max(3, r.R * 0.045) * (1 + 0.6 * blitz);
    g.shadowColor = kuehl > 0.5 ? 'rgba(170,210,255,.95)' : 'rgba(255,200,110,.9)'; g.shadowBlur = 18 + 22 * blitz;
    g.beginPath(); g.arc(r.x, r.y, rad * (1 + atmen * (phase === 'ruhe')), 0, Math.PI * 2); g.stroke();
    g.shadowBlur = 0;
    // Zielmarke: gestrichelter Außenkreis (wie groß der Atem wird), blass
    g.globalAlpha = 0.28 * fin; g.setLineDash([3, 7]); g.lineWidth = 1.5; g.strokeStyle = '#fff1cf';
    g.beginPath(); g.arc(r.x, r.y, r.R, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    // innen: Leuchten, solange gehalten wird (sofortige Rückmeldung)
    S.leuchten = (S.leuchten || 0) + ((halt ? 1 : 0) - (S.leuchten || 0)) * 0.18;
    if (S.leuchten > 0.02) {
      const li = g.createRadialGradient(r.x, r.y, 0, r.x, r.y, rad * 0.95);
      li.addColorStop(0, `rgba(255,236,190,${0.55 * S.leuchten})`); li.addColorStop(1, 'rgba(255,220,150,0)');
      g.globalAlpha = fin; g.fillStyle = li; g.beginPath(); g.arc(r.x, r.y, rad * 0.95, 0, Math.PI * 2); g.fill();
    }
    // Vorbereitung: kleiner Punkt pulsiert vor dem nächsten Einatmen
    if (phase === 'ruhe' && bis != null && bis < 1.2 && !ruh) {
      g.globalAlpha = fin * (1 - bis / 1.2) * 0.8; g.fillStyle = '#fff1cf';
      g.beginPath(); g.arc(r.x, r.y, 4 + 3 * Math.sin(t * 8), 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }
  // Text unter dem Ring: beim Probe-Atemzug, beim ersten Halten (Atemzug 4) und beim ersten langen Halten (Atemzug 7)
  function textZeichnen(g) {
    if (S.phase !== 'atmen') return;
    const b = S.plan[S.idx];
    if (!b) return;
    // Probe und die ersten drei gewerteten Atemzüge mit allen Texten (dezent), danach nur „Halten…“ bei Atemzug 4 und 7
    const zeigen = b.probe || b.nr <= 2 || b.nr === 3 || b.nr === 6;
    if (!zeigen) return;
    const { phase } = ringRadius();
    let text = { ein: 'Einatmen…', halt: 'Halten…', aus: 'Ausatmen…' }[phase];
    if (!text && b.probe && S.zeit < b.t0) text = 'Probe-Atemzug';
    if (!text) return;
    if (!b.probe && phase !== 'halt' && b.nr > 2) return;   // ab Atemzug 4/7 nur „Halten…“
    const r = L.ring;
    g.save();
    g.font = `700 ${L.kurz < 500 ? 18 : 21}px "Titillium Web", "Segoe UI", system-ui, sans-serif`;
    const w = g.measureText(text).width + 30, hh = L.kurz < 500 ? 34 : 38, y = Math.min(H - hh - 10, r.y + r.R + 22);
    g.globalAlpha = b.probe ? 0.92 : 0.72; g.fillStyle = 'rgba(255,255,255,.92)'; rund(g, r.x - w / 2, y, w, hh, hh / 2); g.fill();
    g.fillStyle = '#191919'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, r.x, y + hh / 2 + 1);
    g.restore();
  }
  // Lotus: zu Beginn Knospen auf Blättern; je gutem Atemzug öffnet sich eine (Knospe → halb → offen in 2,4s)
  function lotusZeichnen(g, t, ruh) {
    S.lotus.forEach((lo, i) => {
      if (!lo.ix) return;
      const [sx, sy] = schirm(lo.ix, lo.iy), k = L.s * 0.72 * (0.45 + 0.75 * (lo.iy - 500) / 500);
      const bl = bilder['blatt' + lo.blatt];
      const wipp = ruh ? 0 : Math.sin(t * 0.8 + i) * 1.2 * S.unruhe;
      if (bl) { g.save(); g.translate(sx, sy + wipp); g.scale(k * 0.62, k * 0.62 * 0.32); g.rotate(lo.w); g.drawImage(bl, -bl.naturalWidth / 2, -bl.naturalHeight / 2); g.restore(); }
      const p = lo.offen <= -10 ? 1 : lo.offen < 0 ? 0 : klemme(lo.offen / 2.4);
      const stufe = [[1, 1 - klemme(p * 2)], [2, p < 0.5 ? klemme(p * 2) : 1 - klemme((p - 0.5) * 2)], [3, klemme((p - 0.5) * 2)]];
      stufe.forEach(([n, a]) => {
        const img = bilder['lotus' + n];
        if (!img || a <= 0.01) return;
        const f = k * (n === 1 ? 0.42 : n === 2 ? 0.48 : 0.62);
        g.save(); g.globalAlpha = a; g.translate(sx, sy + wipp);
        if (n === 3 && p > 0.5) { g.shadowColor = 'rgba(255,220,240,.6)'; g.shadowBlur = 16 * (p - 0.5); }
        g.drawImage(img, -img.naturalWidth * f / 2, -img.naturalHeight * f * 0.92, img.naturalWidth * f, img.naturalHeight * f);
        g.restore();
      });
    });
  }
  // Glühwürmchen: über Schilf und Ufer, mehr mit jeder geöffneten Blüte (am Ende viele), leises Blinken
  function wuermchen(g, dt, ruh) {
    if (ruh) return;
    const offen = S.lotus.filter(l => l.offen >= 0 || l.offen <= -10).length;
    const n = Math.round(5 + 2.5 * offen + (S.phase === 'finale' || S.phase === 'ende' ? 8 : 0));
    while (S.wuermchen.length < n) {
      const [ix, iy] = [Math.random() < 0.5 ? 40 + Math.random() * 380 : 1080 + Math.random() * 420, 420 + Math.random() * 360];
      S.wuermchen.push({ ix, iy, p: Math.random() * 10, f: 0.4 + Math.random() * 0.5, t: 0, ein: 0 });
    }
    g.save(); g.globalCompositeOperation = 'lighter';
    S.wuermchen.forEach(w => {
      w.t += dt; w.ein = Math.min(1, w.ein + dt / 2);
      const x = w.ix + 30 * Math.sin(w.t * w.f + w.p), y = w.iy + 16 * Math.sin(w.t * w.f * 1.3 + w.p * 2);
      const [sx, sy] = schirm(x, y), blink = 0.5 + 0.5 * Math.sin(w.t * 1.7 + w.p * 3), r = 2 + 7 * L.s;
      const rg = g.createRadialGradient(sx, sy, 0, sx, sy, r * 2.6);
      rg.addColorStop(0, `rgba(255,240,150,${0.9 * blink * w.ein})`); rg.addColorStop(0.25, `rgba(230,220,90,${0.45 * blink * w.ein})`); rg.addColorStop(1, 'rgba(200,200,60,0)');
      g.fillStyle = rg; g.fillRect(sx - r * 2.6, sy - r * 2.6, r * 5.2, r * 5.2);
    });
    g.restore();
  }
  function popups(g) {
    const r = L.ring;
    S.popups.forEach(p => {
      const e = Math.min(1, p.t / 0.35), a = p.t < 1.2 ? e : Math.max(0, 1 - (p.t - 1.2) / 0.5);
      g.save(); g.globalAlpha = a;
      g.font = `700 ${p.probe ? 18 : 22}px "Titillium Web", "Segoe UI", system-ui, sans-serif`;
      const w = g.measureText(p.text).width + 26, hh = 34;
      g.translate(r.x, r.y - p.t * 12); g.scale(0.85 + 0.15 * e, 0.85 + 0.15 * e);
      g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
      g.fillStyle = '#fff'; rund(g, -w / 2, -hh / 2, w, hh, hh / 2); g.fill();
      g.shadowColor = 'transparent';
      if (!p.probe) { g.fillStyle = '#FFD500'; g.fillRect(-w / 2 + 12, hh / 2 - 7, w - 24, 2.5); }
      g.fillStyle = '#191919'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.text, 0, 1);
      if (p.grund) {
        g.font = '600 15px "Titillium Web", "Segoe UI", system-ui, sans-serif';
        const gw = g.measureText(p.grund).width + 20;
        g.fillStyle = 'rgba(20,24,48,.6)'; rund(g, -gw / 2, hh / 2 + 6, gw, 24, 12); g.fill();
        g.fillStyle = '#fff'; g.fillText(p.grund, 0, hh / 2 + 18.5);
      }
      g.restore();
    });
  }
  // Avatar c im Meditationssitz auf dem Felsen rechts vorn (Bildpunkt TEICH.sitz), Blick zur Mitte
  function figurZeichnen(g, zustand) {
    if (zustand !== 'spiel') return;
    const f = S.figur, pose = aktuellePose(), vor = f.vorher || 'meditation';
    const ueber = Math.min(1, (S.zeit - f.seit) / (0.2 * TEMPO)), zurueck = S.zeit < f.bis ? 1 : Math.min(1, (S.zeit - f.bis) / (0.2 * TEMPO));
    const [bx, by] = schirm(...TEICH.sitz);
    const sitzH = Math.max(92, Math.min(L.hoch ? 150 : 170, L.kurz * (L.hoch ? 0.24 : 0.3)));
    const zeichnePose = (name, alpha) => {
      const img = bilder[name];
      if (!img || alpha <= 0) return;
      const hh = sitzH / POSEN.meditation.hoehe * POSEN[name].hoehe, w = hh * img.naturalWidth / img.naturalHeight;
      const x = Math.min(B - w - 4, bx - w / 2), y = Math.min(H - hh - 2, by - hh), mitte = x + w / 2;
      const spiegeln = POSEN[name].blick !== 'frontal' && POSEN[name].blick === (mitte < B / 2 ? 'links' : 'rechts');
      g.save(); g.globalAlpha = alpha; g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
      if (spiegeln) { g.translate(x + w, y); g.scale(-1, 1); g.drawImage(img, 0, 0, w, hh); } else g.drawImage(img, x, y, w, hh);
      g.restore();
    };
    if (S.zeit < f.bis) { if (ueber < 1) zeichnePose(vor, 1 - ueber); zeichnePose(pose, ueber); }
    else { if (zurueck < 1) zeichnePose(f.pose, 1 - zurueck); zeichnePose('meditation', zurueck); }
  }
  function rund(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  // ---------- Anmeldung ----------
  R_.spiel({
    id: 'atemkreis',
    wertung: 'hoch',
    format: p => p.toLocaleString('de-DE') + ' Punkte',
    hoechst: 1000,
    bereich: 'Entspannung',
    hintergrund: { bild: 'bilder/start.webp', position: '62% 60%' },
    figur: POSEN.stehend,
    texte: {
      titel: 'Atemkreis',
      untertitel: 'Findest du deinen Atem?',
      anleitung: 'Halte den Finger, solange der Kreis wächst, und atme dabei ein. Bleibt er stehen, halte weiter. Wird er kleiner, lass los und atme aus. Zehn ruhige Atemzüge.',
    },
    // Klänge (Sound Artist, 24.10.2026): Atmosphäre −20,5 dB RMS, Höhen gedämpft, Pegel 0,6 (wirksam ca. −25 dB);
    // Atem leise und weich (Ausatmen in 4/5/6s passend zum Takt)
    klaenge: {
      atmosphaere: { datei: 'klaenge/atmosphaere.mp3', proben: 595350, pegel: 0.6 },
      einatmen: { datei: 'klaenge/einatmen.mp3', proben: 88200, pegel: 0.38 },
      ausatmen4: { datei: 'klaenge/ausatmen4.mp3', proben: 88200, pegel: 0.38 },
      ausatmen5: { datei: 'klaenge/ausatmen5.mp3', proben: 110250, pegel: 0.38 },
      ausatmen6: { datei: 'klaenge/ausatmen6.mp3', proben: 132300, pegel: 0.38 },
      gelungen: { datei: 'klaenge/gelungen.mp3', proben: 33340, pegel: 0.5 },
      fertig: { datei: 'klaenge/fertig.mp3', proben: 242550, pegel: 0.7 },
    },
    schleife: 'atmosphaere',
    neu, schritt, zeichne, runter, hoch, groesse,
  });

  // ---------- Testhilfe ----------
  // Bot: drückt/lässt los mit zufälliger Zeitabweichung (σ Sekunden, Mittel versatz), zuck = Wahrscheinlichkeit eines
  // zusätzlichen Zuckens je Atemzug, halteLos = Wahrscheinlichkeit, in der Halte-Phase kurz loszulassen
  function botSpiel(sigma, versatz, zuck, halteLos) {
    const p = plan(0).filter(b => !b.probe);
    let summe = 0, takt = 0, offen = 0;
    const rn = () => { let s = 0; for (let i = 0; i < 6; i++) s += Math.random(); return (s - 3) / Math.sqrt(0.5); };
    p.forEach(b => {
      if (sigma < 0) { const w = wertung(b, [], false); summe += w.punkte; return; }   // Test: gar nicht drücken
      const ev = [{ t: b.t0 + versatz + rn() * sigma, an: true }];
      if (b.halt && Math.random() < halteLos) { const m = b.t0 + b.ein + b.halt / 2; ev.push({ t: m, an: false }, { t: m + 0.3, an: true }); }
      ev.push({ t: b.t1 + versatz + rn() * sigma, an: false });
      if (Math.random() < zuck) { const m = b.t1 + 1.5; ev.push({ t: m, an: true }, { t: m + 0.2, an: false }); }
      const w = wertung(b, ev, false);
      summe += w.punkte; if (w.imTakt) takt++; if (w.punkte >= GUT) offen++;
    });
    return { punkte: Math.max(1, summe), takt, offen };
  }
  window.__atemkreis = {
    get zustand() {
      const b = S && S.plan[S.idx];
      return S && { phase: S.phase, zeit: +S.zeit.toFixed(2), idx: S.idx, atem: b ? (b.probe ? 'probe' : b.nr + 1) : null, ring: ringRadius().phase,
        halten: S.halten, punkte: S.punkte, ergebnisse: S.ergebnisse, offen: S.lotus.filter(l => l.offen >= 0 || l.offen <= -10).length, unruhe: +S.unruhe.toFixed(2) };
    },
    // aktueller Atemzug: Zeiten relativ zu jetzt (Sekunden Spielzeit)
    get naechster() { const b = S.plan[S.idx]; return b && { probe: !!b.probe, nr: b.nr, bisEin: +(b.t0 - S.zeit).toFixed(3), bisAus: +(b.t1 - S.zeit).toFixed(3), ende: +(b.ende - S.zeit).toFixed(3) }; },
    get tempo() { return TEMPO; },
    get mond() { return mondLage(); },
    entenJetzt() { S.entenUm = 0; S.enten = null; },   // Test: Entenschwarm gleich starten
    get enten() { return S.enten && { n: S.enten.n, y: Math.round(S.enten.y), dir: S.enten.dir, t: +S.enten.t.toFixed(1) }; },
    get lage() { return { ring: L.ring, lotus: S.lotus.map(l => schirm(l.ix, l.iy).map(Math.round)) }; },
    plan: () => plan(0).map(b => ({ probe: !!b.probe, nr: b.nr, t0: b.t0, t1: b.t1, t2: b.t2, ende: b.ende })),
    bot(sigma, versatz, zuck, halteLos, n) { const r = []; for (let i = 0; i < (n || 20); i++) r.push(botSpiel(sigma || 0, versatz || 0, zuck || 0, halteLos || 0)); return r; },
  };
})();
