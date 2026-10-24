// Zen-Garten (Sammlung „entSPANNUNG“, RSI protect®, Bereich Entspannung) – Konzept von MZ freigegeben (24.10.2026):
// Japanischer Steingarten schräg von oben. Zehn Muster nacheinander: eine blasse Linie mit Startpunkt und Richtungspfeil im
// Kies mit Finger/Maus nachziehen – die Harke zieht 4 Rillen mit Schatten und Glanz. Absetzen ist erlaubt (weiter an der
// Stelle, an der man aufgehört hat). Das Muster ist fertig, wenn der Weg (fast) ganz abgefahren ist; die Rillen bleiben, der
// Garten füllt sich. Ab Muster 7 verblasst die Vorlage nach dem Ansetzen. Am Ende ganzer Garten (Sonne aufgegangen), Endbild.
// Punkte je Muster (max. 100): 70 Genauigkeit (Abstand zur Linie) + 30 Ruhe (gleichmäßiges Tempo, nicht zu schnell;
// zu schnell = Kies spritzt, Rille unscharf). Kein Abbruch, mindestens 1 Punkt.
//
// Boden: je Garten eine einfache Kamera (Horizont yh, Brennweite F, Augenhöhe h – gemessen mit
// Material/Bilder/zengarten-skripte/raster.py). Muster liegen in Boden-Metern; Tempo wird in Bildschirmanteil/s gemessen
// (kürzere Bildschirmseite je Sekunde), damit Handy und PC gleich fair sind.
//
// Testhilfen (Adresse): #ende=sieg-920 | mittel-640 | schwach-420, #muster=N (Muster 1…N−1 schon geharkt), #garten=1–5,
//   #loesung (Vorlage immer kräftig), #schnell, #ruhig. window.__zengarten: Zustand, Pfad in Bildschirm-Punkten, Bot.
(function () {
  'use strict';
  const R_ = window.Rahmen;
  const hash = location.hash;
  const TEST = {
    ende: (/(?:^#|&)ende=([a-z]+-)?(\d+)/.exec(hash) || [])[2] || null,
    muster: +((/(?:^#|&)muster=(\d+)/.exec(hash) || [])[1] || 0),
    garten: +((/(?:^#|&)garten=(\d)/.exec(hash) || [])[1] || 0),
    loesung: /(?:^#|&)loesung(?![a-z])/.test(hash),
    schnell: /(?:^#|&)schnell(?![a-z])/.test(hash),
    ruhig: /(?:^#|&)ruhig(?![a-z])/.test(hash),
  };
  const ruhig = () => TEST.ruhig || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const TEMPO = TEST.schnell ? 3 : 1;

  // ---------- Regeln ----------
  const MUSTER = 10;
  const PUNKTE = { genau: 70, ruhe: 30 };
  const GENAU_VOLL = 0.03, GENAU_NULL = 0.22;   // Abstand Harke–Linie (m): volle Punkte bis 3 cm, keine ab 22 cm
  const FANG = 0.5;          // m: so weit darf die Harke neben der Linie sein, um zu harken (sonst „abgesetzt“)
  const VORAUS = 1.2;        // m: so weit darf man nach dem Absetzen auf der Linie vorgreifen
  const VORAUS_ZUG = 0.35;   // m: Vorgriff während eines Zugs (bei Kreuzungen wie der Acht springt die Harke nicht in die andere Schleife)
  const FERTIG = 0.975;      // Anteil des Wegs, ab dem das Muster fertig ist
  const SCHNELL = 1.25;      // Bildschirmanteil/s (kürzere Seite): darüber spritzt Kies, die Rille wird unscharf
  const RUHE_CV = [0.2, 0.6], RUHE_SCHNELL = 0.3;   // Gleichmaß (Schwankung des Tempos) und Anteil „zu schnell“
  const ZINKEN = [-0.15, -0.05, 0.05, 0.15], RILLE = 0.045;   // Harke: 4 Zinken (m), Rillenbreite (m)
  const VERBLASSEN_AB = 7;   // ab Muster 7 verblasst die Vorlage nach dem Ansetzen

  // ---------- Gärten (Boden-Abbildung je Bild 1536×1024; gaerten.json) ----------
  // yh Horizont, cx Bildmitte, F Brennweite, h Augenhöhe (m), richtung = Achse des Gartens im Boden (Grad),
  // kies = Kiesfläche (Bildpunkte), steine (Mitte m am Fuß, halbe Breite hw), koerper = Bildbereich des Steins (frei halten),
  // sperre = weitere Bildbereiche ohne Muster (Wasserbecken, Geländer), nebel = Bildzeile der Nebelbänke, sonne = Sonnenweg
  const GAERTEN = {"1":{"yh":150,"cx":768,"F":1250,"h":2.2,"richtung":-22.5,"kies":[[40,398],[300,342],[1536,432],[1536,760],[1385,850],[1345,1024],[1185,1024],[70,742]],"steine":[{"m":[470,482],"hw":165,"hh":46,"koerper":[395,262,570,485]},{"m":[777,503],"hw":152,"hh":45,"koerper":[650,440,915,548]},{"m":[327,587],"hw":130,"hh":40,"koerper":[230,540,450,630]}]},"2":{"yh":57,"cx":700,"F":1800,"h":2.2,"richtung":0,"kies":[[200,410],[1235,410],[1536,580],[1536,890],[0,890],[0,550]],"steine":[{"m":[750,560],"hw":292,"hh":60,"koerper":[555,450,985,620]}],"sperre":[[1225,395,1420,480]]},"3":{"yh":150,"cx":768,"F":1500,"h":2.2,"richtung":0,"kies":[[0,368],[160,350],[1370,350],[1536,376],[1536,1024],[600,1024],[0,705]],"steine":[{"m":[360,450],"hw":215,"hh":60,"koerper":[160,300,585,510]},{"m":[1275,370],"hw":130,"hh":30,"koerper":[1150,285,1405,405]}]},"4":{"yh":145,"cx":768,"F":1300,"h":2.2,"richtung":24.7,"kies":[[0,350],[460,320],[1360,278],[1536,325],[1536,725],[440,1024],[0,1024]],"steine":[{"m":[372,648],"hw":270,"hh":88,"koerper":[105,530,640,740]},{"m":[1307,364],"hw":94,"hh":27,"koerper":[1210,330,1405,395]}]},"5":{"yh":-276,"cx":768,"F":2870,"h":4.1,"richtung":-23.3,"kies":[[0,550],[427,282],[1480,376],[1536,600],[1536,1024],[560,1024],[0,840]],"steine":[{"m":[485,375],"hw":62,"hh":20,"koerper":[430,320,545,390]},{"m":[705,450],"hw":100,"hh":30,"koerper":[620,355,785,485]},{"m":[948,550],"hw":118,"hh":34,"koerper":[860,490,1045,590]},{"m":[1255,775],"hw":150,"hh":45,"koerper":[1110,630,1415,815]}],"sperre":[[0,280,270,560]]}};
  const ZWEIGE = {"1":{"box":[1110,0,1536,315],"dreh":[1536,40],"amp":0.8,"k":16,"w":["001211489999999999999999999","000124689999999999999999999","002689999999999999999999669","147999999999999999747999679","389999999877899999778999988","135579764579988999999999999","001133112799999999999999999","000000002699999999999999999","110000026999999999877999999","001111489999999988789999999","000012699987996435999999999","000001277422544789999999999","000000011000369999999999998","000000000002799999999998986","000000000015999999999887899","000000000269999999999886434","011000001699977999999721111","121100001234422899997310110","122110000111000247985111000","012110000111100014633211000"]},"5":{"box":[1170,0,1536,392],"dreh":[1536,215],"amp":1.0,"k":16,"w":["00000000000000000000000","00000000000000000000000","00000000000000000000000","00000000000000000000000","00000000000000000000000","00000000000000000000000","00000000000000000001110","00000001211001111111232","00110001232222332346765","00121111224555434579865","00123322334797668989986","00002455667899989867654","00000367777789889888765","00000157789776679899999","00013358999998789999999","01248899998899999999999","27879999999999998899998","38999999999999643589999","47999999999997115899998","69999999999873138999975","26999997575210289999962","02899852110000399997840","01465210000111599951110","00122111000113898510010","00122111000002432100121"]}};
  const EXTRA = { 1: { nebel: 190, sonne: [1000, 330, 90] }, 2: { nebel: 205, sonne: [880, 300, 70] }, 3: { nebel: 120, sonne: [900, 250, 60] },
    4: { nebel: 130, sonne: [1050, 260, 60] }, 5: { nebel: 160, sonne: [900, 300, 60] } };   // sonne: [x, y unten (hinter Bergen), y oben]
  Object.keys(GAERTEN).forEach(n => {
    const g = GAERTEN[n]; Object.assign(g, EXTRA[n]); g.nr = +n;
    g.sperre = g.sperre || [];
    g.steine.forEach(s => { const [X, Z] = boden(g, s.m[0], s.m[1]); s.X = X; s.Z = Z; s.R = s.hw * Z / g.F; });
    g.kiesB = g.kies.map(([x, y]) => boden(g, x, Math.max(y, g.yh + 5)));
    const r = g.richtung * Math.PI / 180; g.ax = [Math.cos(r), Math.sin(r)];
  });
  function boden(g, x, y) { const Z = g.F * g.h / (y - g.yh); return [(x - g.cx) * Z / g.F, Z]; }
  function aufBild(g, X, Z) { return [g.cx + g.F * X / Z, g.yh + g.F * g.h / Z]; }
  const imPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
  const abstandStrecke = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };

  // ---------- Muster ----------
  // Musterarten (Formen im Boden, Meter). Jede liefert eine Punktfolge; Lage/Drehung wählt die Platzierung.
  // stufe 1 (Muster 1–3): Welle, Bogen, Kreis; stufe 2 (4–6): Ring um Stein, Spirale, S-Kurve, hohe Welle, Halbring um Stein;
  // stufe 3 (7–10): Doppelring um Stein, Ring mit Ausläufer, Acht, Schlange, Spirale mit 3 Windungen, Kreis mit Welle.
  const kreisPunkte = (r0, r1, a0, a1, n) => { const p = []; for (let i = 0; i <= n; i++) { const t = i / n, a = a0 + (a1 - a0) * t, r = r0 + (r1 - r0) * t; p.push([r * Math.cos(a), r * Math.sin(a)]); } return p; };
  const ARTEN = {
    welle: (o) => { const p = []; for (let i = 0; i <= 120; i++) { const u = -o.L / 2 + o.L * i / 120; p.push([u, o.A * Math.sin(u / o.W * 2 * Math.PI)]); } return p; },
    bogen: (o) => kreisPunkte(o.R, o.R, -o.S / 2, o.S / 2, 80),
    kreis: (o) => kreisPunkte(o.R, o.R, 0, 2 * Math.PI * 1.02, 120),
    spirale: (o) => kreisPunkte(o.R0, o.R1, 0, 2 * Math.PI * o.T, 90 * o.T),
    skurve: (o) => [...kreisPunkte(o.R, o.R, Math.PI, 0, 60).map(([x, y]) => [x - o.R, -y]), ...kreisPunkte(o.R, o.R, Math.PI, 2 * Math.PI, 60).slice(1).map(([x, y]) => [x + o.R, -y])],
    acht: (o) => { const p = []; for (let i = 0; i <= 160; i++) { const t = i / 160 * 2 * Math.PI; p.push([o.R * Math.sin(t), o.R * 0.55 * Math.sin(2 * t)]); } return p; },
    schlange: (o) => { const p = []; for (let i = 0; i <= 160; i++) { const u = -o.L / 2 + o.L * i / 160; p.push([u, o.A * Math.sin(u / o.L * 2 * Math.PI * o.B)]); } return p; },
    kreiswelle: (o) => { const k = kreisPunkte(o.R, o.R, Math.PI / 2, Math.PI / 2 + 2 * Math.PI * 0.92, 100); const e = k[k.length - 1]; const w = []; for (let i = 1; i <= 60; i++) { const u = o.L * i / 60; w.push([e[0] + u, e[1] - 0.12 * Math.sin(u / 0.9 * 2 * Math.PI)]); } return [...k, ...w]; },
  };
  // Rezepte (Pool): Art, Stufe, Maße; „stein“ = um einen Stein herum (Mitte = Stein, Radius ab Steinrand)
  const POOL = [];
  [[2.2, 0.12, 1.4], [2.8, 0.15, 1.4], [3.4, 0.15, 1.7], [2.6, 0.2, 1.3]].forEach(([L, A, W]) => POOL.push({ art: 'welle', stufe: 1, L, A, W }));
  [[0.9, 2.6], [1.2, 2.4], [1.5, 2.1], [1.0, 3.1]].forEach(([R, S]) => POOL.push({ art: 'bogen', stufe: 1, R, S }));
  [0.5, 0.62, 0.75, 0.9].forEach(R => POOL.push({ art: 'kreis', stufe: 1, R }));
  [0.4, 0.55, 0.7].forEach(d => POOL.push({ art: 'kreis', stufe: 2, stein: true, d }));
  [[0.45, 3.5], [0.6, 3.8]].forEach(([d, S]) => POOL.push({ art: 'bogen', stufe: 2, stein: true, d, S }));
  [[0.12, 0.8, 2], [0.15, 1.0, 2], [0.1, 0.7, 1.75]].forEach(([R0, R1, T]) => POOL.push({ art: 'spirale', stufe: 2, R0, R1, T }));
  [0.55, 0.7, 0.85].forEach(R => POOL.push({ art: 'skurve', stufe: 2, R }));
  [[2.4, 0.3, 1.0], [3.0, 0.32, 1.2]].forEach(([L, A, W]) => POOL.push({ art: 'welle', stufe: 2, L, A, W }));
  [[0.45, 0.95], [0.4, 0.8]].forEach(([d0, d1]) => POOL.push({ art: 'spirale', stufe: 3, stein: true, d0, d1, T: 2 }));
  [[0.5, 1.4], [0.6, 1.8]].forEach(([d, L]) => POOL.push({ art: 'kreiswelle', stufe: 3, stein: true, d, L }));
  [0.7, 0.9, 1.1, 1.3].forEach(R => POOL.push({ art: 'acht', stufe: 3, R }));
  [[3.0, 0.45, 1.5], [3.4, 0.5, 2], [2.6, 0.4, 1.5], [2.2, 0.35, 1.5]].forEach(([L, A, B]) => POOL.push({ art: 'schlange', stufe: 3, L, A, B }));
  [[0.12, 1.0, 3], [0.15, 1.15, 2.75]].forEach(([R0, R1, T]) => POOL.push({ art: 'spirale', stufe: 3, R0, R1, T }));
  [[0.6, 1.6], [0.7, 2.0]].forEach(([R, L]) => POOL.push({ art: 'kreiswelle', stufe: 3, R, L }));
  POOL.forEach((p, i) => { p.nr = i + 1; });
  const stufeFuer = k => k < 3 ? 1 : k < 6 ? 2 : 3;

  // Punktfolge gleichmäßig nach Weglänge (alle 2 cm)
  function gleichmaessig(p, schritt) {
    const o = [p[0]]; let rest = 0;
    for (let i = 1; i < p.length; i++) {
      const [ax, az] = p[i - 1], [bx, bz] = p[i], l = Math.hypot(bx - ax, bz - az);
      let t = schritt - rest;
      while (t <= l) { o.push([ax + (bx - ax) * t / l, az + (bz - az) * t / l]); t += schritt; }
      rest = l - (t - schritt);
    }
    if (Math.hypot(o[o.length - 1][0] - p[p.length - 1][0], o[o.length - 1][1] - p[p.length - 1][1]) > schritt * 0.3) o.push(p[p.length - 1]);
    return o;
  }
  // Muster für einen Garten erzeugen und prüfen: im Kies (Abstand zum Rand 0,3 m), nicht an Steinen (Fuß + 0,25 m, Bildkörper
  // + Harke frei), nicht in Sperrbereichen, nicht zu klein in der Ferne (Harke ≥ 52 Bildpunkte), Abstand zu früheren Mustern
  // dicht = true: bis zu 90 Lagen probieren und die gültige nehmen, die am engsten an schon gesetzten Mustern bzw. am
  // Kiesrand liegt (dichtes Packen lässt große freie Flächen für die nächsten Muster)
  function platziere(g, rez, frueher, abstand, dicht) {
    let beste = null, besteWert = Infinity;
    for (let versuch = 0; versuch < (dicht ? 90 : 70); versuch++) {
      let form, mx, mz, dreh, sp = 1;
      if (rez.stein) {
        const s = g.steine[Math.floor(Math.random() * g.steine.length)];
        const o = Object.assign({}, rez);
        if (rez.art === 'kreis') o.R = s.R + rez.d;
        if (rez.art === 'bogen') o.R = s.R + rez.d;
        if (rez.art === 'spirale') { o.R0 = s.R + rez.d0; o.R1 = s.R + rez.d1; }
        if (rez.art === 'kreiswelle') o.R = s.R + rez.d;
        form = ARTEN[rez.art](o); mx = s.X; mz = s.Z; dreh = Math.random() * 2 * Math.PI;
        form.stein = s;
      } else {
        const ki = g.kies, xs = ki.map(p => p[0]), ys = ki.map(p => p[1]);
        const ix = Math.min(...xs) + Math.random() * (Math.max(...xs) - Math.min(...xs)), iy = Math.min(...ys) + Math.random() * (Math.max(...ys) - Math.min(...ys));
        if (!imPoly([ix, iy], ki)) continue;
        [mx, mz] = boden(g, ix, iy);
        const achse = Math.atan2(g.ax[1], g.ax[0]);
        dreh = (rez.art === 'welle' || rez.art === 'schlange') ? achse + (Math.random() - 0.5) * 0.4 + (Math.random() < 0.5 ? 0 : Math.PI)
          : Math.random() * 2 * Math.PI;
        form = ARTEN[rez.art](rez);
      }
      if (Math.random() < 0.5) sp = -1;   // Richtung (im/gegen den Uhrzeigersinn bzw. Spiegelbild)
      const c = Math.cos(dreh), s_ = Math.sin(dreh);
      let pts = form.map(([u, v]) => [mx + c * u - s_ * v * sp, mz + s_ * u + c * v * sp]);
      if (!rez.stein && Math.random() < 0.5) pts = pts.reverse();
      pts = gleichmaessig(pts, 0.02);
      if (!pruefe(g, pts, frueher, abstand, form.stein)) continue;
      const kand = { rez, pts, stein: form.stein || null };
      if (!dicht) return kand;
      const wert = abstand > 0 ? enge(g, pts, frueher) : ueberlapp(pts, frueher) * 10 + enge(g, pts, frueher);
      if (wert < besteWert) { besteWert = wert; beste = kand; }
    }
    return beste;
  }
  // Anteil der Musterpunkte, die näher als 0,45 m an einem schon gesetzten Muster liegen (Überlappung)
  function ueberlapp(pts, frueher) {
    let n = 0, k = 0;
    for (let i = 0; i < pts.length; i += 6) { k++; if (frueher.nah(pts[i][0], pts[i][1], 0.45)) n++; }
    return n / Math.max(1, k);
  }
  // mittlerer Abstand (gekappt bei 1,5 m) der Musterpunkte zum nächsten gesetzten Muster bzw. Kiesrand – kleiner = enger
  function enge(g, pts, frueher) {
    let s = 0, n = 0;
    for (let i = 0; i < pts.length; i += 12) {
      const [X, Z] = pts[i];
      let d = frueher.naechst ? frueher.naechst(X, Z, 1.5) : 1.5;
      const kb = g.kiesB;
      for (let j = 0; j < kb.length; j++) d = Math.min(d, abstandStrecke([X, Z], kb[j], kb[(j + 1) % kb.length]));
      g.steine.forEach(st => { d = Math.min(d, Math.max(0, Math.hypot(X - st.X, Z - st.Z) - st.R)); });
      s += d; n++;
    }
    return s / Math.max(1, n);
  }
  function pruefe(g, pts, frueher, abstand, eigenerStein) {
    for (let i = 0; i < pts.length; i += 3) {
      const [X, Z] = pts[i];
      if (Z < 0.8) return false;
      const [x, y] = aufBild(g, X, Z);
      if (x < 25 || x > 1511 || y > 1005) return false;
      if (g.F * 0.36 / Z < 44) return false;            // in der Ferne zu klein (Kamera zoomt nah heran)
      if (!imPoly([x, y], g.kies)) return false;
      const kb = g.kiesB;
      for (let j = 0; j < kb.length; j++) if (abstandStrecke([X, Z], kb[j], kb[(j + 1) % kb.length]) < 0.25) return false;
      for (const s of g.steine) if (Math.hypot(X - s.X, Z - s.Z) < s.R + 0.2) return false;
      const rand = g.F * 0.2 / Z;                       // halbe Harke in Bildpunkten
      for (const s of g.steine) { const [a, b, c, d] = s.koerper; if (x > a - rand && x < c + rand && y > b - rand && y < d + rand * 0.6) return false; }
      for (const [a, b, c, d] of g.sperre) if (x > a - rand && x < c + rand && y > b - rand && y < d + rand) return false;
      if (abstand > 0 && frueher.nah(X, Z, abstand)) return false;
    }
    return true;
  }
  // Raster der schon gesetzten Muster (Zellen 0,25 m) für die Abstandsprüfung
  function belegt() {
    const z = new Map(), C = 0.25, key = (a, b) => a * 10007 + b;
    return {
      add(pts) { for (let k = 0; k < pts.length; k += 3) { const a = Math.floor(pts[k][0] / C), b = Math.floor(pts[k][1] / C), q = key(a, b); if (!z.has(q)) z.set(q, []); z.get(q).push(pts[k]); } },
      naechst(X, Z, d) {
        let best = d;
        const a0 = Math.floor((X - d) / C), a1 = Math.floor((X + d) / C), b0 = Math.floor((Z - d) / C), b1 = Math.floor((Z + d) / C);
        for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) { const l = z.get(key(a, b)); if (l) for (const p of l) { const e = Math.hypot(X - p[0], Z - p[1]); if (e < best) best = e; } }
        return best;
      },
      nah(X, Z, d) {
        const a0 = Math.floor((X - d) / C), a1 = Math.floor((X + d) / C), b0 = Math.floor((Z - d) / C), b1 = Math.floor((Z + d) / C);
        for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) { const l = z.get(key(a, b)); if (l) for (const p of l) if (Math.hypot(X - p[0], Z - p[1]) < d) return true; }
        return false;
      },
    };
  }
  // Komposition (MZ, 24.10.2026: Finale ruhig, ohne Überlagerung): jedes Muster bekommt eine eigene Zone – Mittellinien
  // mindestens 0,6 m von allen früheren Mustern entfernt (Rillenband ±0,2 m → ca. 0,2 m glatter Kies dazwischen).
  // Bis zu 5 Anläufe für das ganze Spiel; nur wenn ein Garten zu eng ist, für die letzten Muster 0,5 m bzw. 0,45 m.
  const ABSTAND = [0.5, 0.45, 0.42];
  // Rezepte für die 10 Muster wählen (Stufen 1–3, nicht zweimal dieselbe Art hintereinander), dann die größten zuerst
  // dicht platzieren; gespielt wird in der Reihenfolge der Stufen
  function rezepteWaehlen(zuletzt) {
    const liste = [];
    for (let k = 0; k < MUSTER; k++) {
      const st = stufeFuer(k), vorher = liste[k - 1];
      const kand = POOL.filter(r => r.stufe === st && !liste.includes(r)).sort((a, b) => (zuletzt.includes(a.nr) - zuletzt.includes(b.nr)) || (Math.random() - 0.5));
      kand.sort((a, b) => ((vorher && a.art === vorher.art) - (vorher && b.art === vorher.art)));
      liste.push(kand[0]);
    }
    return liste;
  }
  const laengeVon = r => { const p = ARTEN[r.art](Object.assign({ R: 0.9, R0: 0.4, R1: 1.2 }, r)); let l = 0; for (let i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return l; };
  function* folgeVersuch(g, plaetze, raster, abstand, rezepte) {
    const reihenfolge = rezepte.map((r, k) => k).filter(k => !plaetze[k]).sort((a, b) => laengeVon(rezepte[b]) - laengeVon(rezepte[a]));
    for (const k of reihenfolge) {
      const st = rezepte[k].stufe;
      let m = platziere(g, rezepte[k], raster, abstand, true); yield;
      // andere Rezepte derselben Stufe, dann leichtere
      if (!m) for (const r of POOL.filter(x => x.stufe === st && x !== rezepte[k] && !rezepte.includes(x)).sort(() => Math.random() - 0.5)) { m = platziere(g, r, raster, abstand, true); yield; if (m) break; }
      if (!m) for (const st2 of [2, 1].filter(x => x < st)) { for (const r of POOL.filter(x => x.stufe === st2 && !rezepte.includes(x))) { m = platziere(g, r, raster, abstand, true); yield; if (m) break; } if (m) break; }
      if (!m) return false;
      plaetze[k] = vorbereiten(g, m); raster.add(m.pts);
    }
    return true;
  }
  // als Generator (yield nach jedem Platzierungsversuch): im Start-/Endbild in kleinen Häppchen gerechnet (kein Ruckeln)
  function* musterFolgeSchritte(g) {
    const zuletzt = zuletztLesen().muster || [];
    let best = null;
    for (let v = 0; v < 4; v++) {
      const rezepte = rezepteWaehlen(zuletzt), plaetze = new Array(MUSTER).fill(null), raster = belegt();
      const ok = yield* folgeVersuch(g, plaetze, raster, ABSTAND[0], rezepte);
      if (ok) { plaetze.abstand = ABSTAND[0]; return plaetze; }
      const n = plaetze.filter(Boolean).length;
      if (!best || n > best.n) best = { plaetze, raster, rezepte, n };
    }
    for (const a of [...ABSTAND.slice(1), 0]) if (yield* folgeVersuch(g, best.plaetze, best.raster, a, best.rezepte)) { best.plaetze.abstand = a; return best.plaetze; }
    const f = best.plaetze.filter(Boolean); f.abstand = 0; return f;
  }
  function musterFolge(g) { const it = musterFolgeSchritte(g); let r; do { r = it.next(); } while (!r.done); return r.value; }
  function vorbereiten(g, m) {
    const p = m.pts, s = [0];
    for (let i = 1; i < p.length; i++) s.push(s[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    m.s = s; m.laenge = s[s.length - 1];
    m.bild = p.map(([X, Z]) => aufBild(g, X, Z));
    const xs = m.bild.map(q => q[0]), ys = m.bild.map(q => q[1]), rand = Math.max(...p.map(q => g.F * 0.25 / q[1]));
    m.box = [Math.min(...xs) - rand, Math.min(...ys) - rand, Math.max(...xs) + rand, Math.max(...ys) + rand];
    m.zMitte = p.reduce((s, q) => s + q[1], 0) / p.length;
    return m;
  }

  // ---------- Wertung ----------
  const klemme = v => Math.max(0, Math.min(1, v));
  // Proben: { d (m), ds (m Fortschritt), v (Bildschirmanteil/s), dt }
  function wertung(proben) {
    let wsum = 0, gsum = 0, schnell = 0;
    proben.forEach(p => { if (p.ds > 0) { wsum += p.ds; gsum += p.ds * klemme(1 - (p.d - GENAU_VOLL) / (GENAU_NULL - GENAU_VOLL)); if (p.v > SCHNELL) schnell += p.ds; } });
    const genau = wsum ? gsum / wsum : 0;
    // Gleichmaß: Tempo in 0,2-s-Fenstern beim Harken (Pausen zählen nicht)
    const fenster = []; let t = 0, w = 0;
    proben.forEach(p => { if (p.ds <= 0 && p.v < 0.05) return; t += p.dt; w += p.v * p.dt; if (t >= 0.2) { fenster.push(w / t); t = 0; w = 0; } });
    let cv = 0;
    if (fenster.length >= 3) { const m = fenster.reduce((a, b) => a + b, 0) / fenster.length; const sd = Math.sqrt(fenster.reduce((a, b) => a + (b - m) * (b - m), 0) / fenster.length); cv = m > 0 ? sd / m : 0; }
    const gleich = klemme(1 - (cv - RUHE_CV[0]) / (RUHE_CV[1] - RUHE_CV[0]));
    const anteil = wsum ? schnell / wsum : 0, langsam = klemme(1 - anteil / RUHE_SCHNELL);
    const ruhe = 0.5 * gleich + 0.5 * langsam;
    return { genau, ruhe, gleich, langsam, punkte: Math.round(PUNKTE.genau * genau + PUNKTE.ruhe * ruhe), cv: +cv.toFixed(2), schnell: +anteil.toFixed(2) };
  }

  // ---------- Bilder ----------
  const bilder = {};
  function lade(name, datei, fertig) {
    if (bilder[name] || bilder[name + ':laedt']) return;
    bilder[name + ':laedt'] = true;
    const i = new Image();
    i.onload = () => { bilder[name] = i; if (fertig) fertig(i); };
    i.src = datei;
  }
  lade('himmel', 'bilder/himmel.webp');
  lade('holz', 'bilder/holz.webp');
  [1, 2, 3].forEach(n => lade('blatt' + n, 'bilder/blatt-' + n + '.webp'));
  let kiesMuster = null;
  lade('kies', 'bilder/kies.webp', i => {
    // dunklere Kies-Kachel für die Rillen (der Grund der Rille liegt im Schatten)
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const x = c.getContext('2d'); x.drawImage(i, 0, 0, 128, 128);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = '#9a98a0'; x.fillRect(0, 0, 128, 128);
    kiesMuster = c;
  });
  // Avatar b (Zen-Garten): Blick der Pose im Bild; Spiel und Rahmen richten die Figur zur Bildmitte aus
  const POSEN = {
    meditation: { bild: 'bilder/avatar-meditation.webp', blick: 'frontal', hoehe: 0.568 },
    stehend: { bild: 'bilder/avatar-stehend.webp', blick: 'links', hoehe: 1 },
    freude: { bild: 'bilder/avatar-freude.webp', blick: 'frontal', hoehe: 0.967 },
    zucken: { bild: 'bilder/avatar-zucken.webp', blick: 'frontal', hoehe: 0.965 },
  };
  Object.keys(POSEN).forEach(n => lade(n, POSEN[n].bild));

  // ---------- Lage ----------
  let B = 0, H = 0, L = null;
  // Ränder der Geräte-Aussparung (Notch, Home-Leiste) aus CSS env(safe-area-inset-*)
  let sonde = null;
  function sicher() {
    if (!sonde) { sonde = document.createElement('div'); sonde.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.body.appendChild(sonde); }
    const s = getComputedStyle(sonde);
    return { l: parseFloat(s.paddingLeft) || 0, r: parseFloat(s.paddingRight) || 0, u: parseFloat(s.paddingBottom) || 0 };
  }
  function lage() {
    const hoch = H >= B * 0.9;
    const sitzH = hoch ? Math.max(84, Math.min(130, Math.round(H * 0.14))) : Math.max(80, Math.min(170, Math.round(H * 0.3)));
    // Spalte für den Avatar: breit genug für die breiteste Pose, mit Randabstand und Notch-Rand (safe-area) – nie angeschnitten
    const rand = sicher(), avW = sitzH * 0.95;
    const avatar = { x: 12 + rand.l, unten: H - 8 - rand.u, h: sitzH, w: avW };
    // Bereich, in den das Muster passen soll (frei von Anzeige und Avatar)
    const feld = hoch ? { x0: 10, x1: B - 10, y0: 64, y1: H - sitzH - 26 } : { x0: avatar.x + avW + 12, x1: B - 16 - rand.r, y0: 62, y1: H - 12 };
    L = { hoch, avatar, feld, kurz: Math.min(B, H) };
  }
  function groesse(b, h) { B = b; H = h; lage(); }

  // Kamera (Bildpunkte des Gartenbilds → Bildschirm): Muster mit Rand passend in den freien Bereich, Bild möglichst deckend
  function kameraZiel() {
    const f = L.feld;
    if (!S.garten) return { z: 1, ox: 0, oy: 0 };
    let z, cx, cy;
    if (S.phase === 'finale' || S.phase === 'ende' || !S.muster[S.nr]) {
      // ganzer Garten mit Himmel: quer bildschirmfüllend oben bündig, hoch unten bündig mit viel Himmel darüber
      const g = S.garten, xs = g.kies.map(p => p[0]), kx = (Math.max(0, Math.min(...xs)) + Math.min(1536, Math.max(...xs))) / 2;
      if (!L.hoch) { z = Math.max(B / 1536, H / 1024); return { z, ox: Math.max(B - 1536 * z, Math.min(0, B / 2 - kx * z)), oy: Math.max(H - 1024 * z, Math.min(0, -0.02 * H)) }; }
      z = B / 1250;
      return { z, ox: Math.max(B - 1536 * z, Math.min(0, B / 2 - kx * z)), oy: H - 1024 * z };
    }
    const m = S.muster[S.nr], b = m.box;
    z = Math.min((f.x1 - f.x0) / (b[2] - b[0]), (f.y1 - f.y0) / (b[3] - b[1]), 1.25);
    // Harke muss gut greifbar bleiben (mind. ca. 64 Bildschirmpunkte breit): sonst näher heran, die Kamera folgt der Harke
    const zRake = 64 / (S.garten.F * 0.36 / m.zMitte);
    if (z < zRake) {
      z = Math.min(1.25, zRake);
      // ruhig: Blickpunkt erst nachführen, wenn die Harke ins äußere Fünftel des Bereichs kommt (sonst steht die Kamera)
      const i = Math.min(m.pts.length - 1, S.fort + 25);
      let ziel = S.blick && S.blick.nr === S.nr ? S.blick : null;
      if (ziel && S.kam) {
        const [sx, sy] = schirm(...m.bild[S.fort]), rx = (f.x1 - f.x0) * 0.2, ry = (f.y1 - f.y0) * 0.2;
        if (sx < f.x0 + rx || sx > f.x1 - rx || sy < f.y0 + ry || sy > f.y1 - ry) ziel = null;
      }
      if (!ziel) ziel = S.blick = { nr: S.nr, p: m.bild[i] };
      const [px, py] = ziel.p;
      return deckend({ z, ox: (f.x0 + f.x1) / 2 - px * z, oy: (f.y0 + f.y1) / 2 - py * z }, null);
    }
    cx = (b[0] + b[2]) / 2; cy = (b[1] + b[3]) / 2;
    return deckend({ z, ox: (f.x0 + f.x1) / 2 - cx * z, oy: (f.y0 + f.y1) / 2 - cy * z }, b);
  }
  // Verschieben, damit das Bild den Bildschirm deckt, soweit das Muster im freien Bereich bleibt
  function deckend(k, box) {
    const f = L.feld, w = 1536 * k.z, h = 1024 * k.z;
    const rein = (o, min, max) => Math.max(min, Math.min(max, o));
    let oxMin = -Infinity, oxMax = Infinity, oyMin = -Infinity, oyMax = Infinity;
    if (box) { oxMin = f.x0 - box[0] * k.z; oxMax = f.x1 - box[2] * k.z; oyMin = f.y0 - box[1] * k.z; oyMax = f.y1 - box[3] * k.z; }
    if (w >= B) k.ox = rein(rein(k.ox, B - w, 0), Math.min(oxMin, oxMax), Math.max(oxMin, oxMax));
    if (h >= H) k.oy = rein(rein(k.oy, H - h, Math.min(0, H - h + 1024 * k.z * 0.85)), Math.min(oyMin, oyMax), Math.max(oyMin, oyMax));
    else k.oy = rein(k.oy, H - h, Math.max(H - h, k.oy));
    return k;
  }
  function kamera(sofort, dt) {
    const k = kameraZiel();
    if (sofort || !S.kam) { S.kam = k; return; }
    const a = Math.min(1, (dt || 0) * (S.phase === 'finale' ? 1.4 : 2.6) * TEMPO);
    S.kam = { z: S.kam.z + (k.z - S.kam.z) * a, ox: S.kam.ox + (k.ox - S.kam.ox) * a, oy: S.kam.oy + (k.oy - S.kam.oy) * a };
  }
  const schirm = (ix, iy) => [S.kam.ox + ix * S.kam.z, S.kam.oy + iy * S.kam.z];
  const imBild = (sx, sy) => [(sx - S.kam.ox) / S.kam.z, (sy - S.kam.oy) / S.kam.z];

  // ---------- Rillen (bleibend, in Bildpunkten des Gartens × RS) ----------
  const RS = 1;
  let rillen = null;
  function rillenNeu() {
    rillen = document.createElement('canvas'); rillen.width = Math.round(1536 * RS); rillen.height = Math.round(1024 * RS);
  }
  // ein Stück Harken von a nach b (Boden), n = Richtung quer (Einheitsvektor im Boden); unscharf = zu schnell
  function harkeStueck(g, a, b, n, unscharf) {
    const x = rillen.getContext('2d');
    const muster = kiesMuster ? x.createPattern(kiesMuster, 'repeat') : 'rgba(110,108,118,.6)';
    // Breite der Rille quer zur Zugrichtung, perspektivisch verkürzt (in der Ferne und längs zur Blickrichtung schmaler)
    const mX = (a[0] + b[0]) / 2, mZ = (a[1] + b[1]) / 2;
    const q0 = aufBild(g, mX - n[0] * RILLE / 2, mZ - n[1] * RILLE / 2), q1 = aufBild(g, mX + n[0] * RILLE / 2, mZ + n[1] * RILLE / 2);
    let qx = (q1[0] - q0[0]) * RS, qy = (q1[1] - q0[1]) * RS;
    const w = Math.max(0.9, Math.hypot(qx, qy)), ql = Math.hypot(qx, qy) || 1;
    qx /= ql; qy /= ql;
    // Licht von hinten oben: die vordere Wand der Rille liegt im Schatten, der aufgeworfene Rand dahinter glänzt
    const vorn = qy >= 0 ? 1 : -1;
    x.lineCap = 'round';
    // ältere Rillen unter der Harke glätten (wie im echten Garten: neu geharkt löscht das Alte)
    {
      const r0 = aufBild(g, mX - n[0] * 0.22, mZ - n[1] * 0.22), r1 = aufBild(g, mX + n[0] * 0.22, mZ + n[1] * 0.22);
      const pa = aufBild(g, a[0], a[1]), pb = aufBild(g, b[0], b[1]);
      x.globalCompositeOperation = 'destination-out'; x.globalAlpha = 1; x.strokeStyle = '#000'; x.lineCap = 'butt';   // nur das neue Stück, nicht die eben gezogenen Rillen
      x.lineWidth = Math.max(2, Math.hypot(r1[0] - r0[0], r1[1] - r0[1]) * RS);
      x.beginPath(); x.moveTo(pa[0] * RS, pa[1] * RS); x.lineTo(pb[0] * RS, pb[1] * RS); x.stroke();
      x.globalCompositeOperation = 'source-over'; x.lineCap = 'round';
      // leichter Kieswall an beiden Rändern des Harkenbands: wo eine ältere Rille gekreuzt wird, endet sie klar daran
      [-1, 1].forEach(sg => {
        const o = sg * 0.235, ea = aufBild(g, a[0] + n[0] * o, a[1] + n[1] * o), eb = aufBild(g, b[0] + n[0] * o, b[1] + n[1] * o);
        const bw = Math.max(0.8, Math.hypot(r1[0] - r0[0], r1[1] - r0[1]) * RS * 0.06);
        x.globalAlpha = 0.16; x.strokeStyle = '#ffffff'; x.lineWidth = bw;
        x.beginPath(); x.moveTo(ea[0] * RS, ea[1] * RS); x.lineTo(eb[0] * RS, eb[1] * RS); x.stroke();
        x.globalAlpha = 0.08; x.strokeStyle = '#3e3c46'; x.lineWidth = bw * 0.8;
        x.beginPath(); x.moveTo(ea[0] * RS, ea[1] * RS + bw); x.lineTo(eb[0] * RS, eb[1] * RS + bw); x.stroke();
      });
      x.globalAlpha = 1;
    }
    ZINKEN.forEach(o => {
      const j = unscharf ? (Math.random() - 0.5) * 0.06 : 0, j2 = unscharf ? (Math.random() - 0.5) * 0.06 : 0;
      const pa = aufBild(g, a[0] + n[0] * (o + j), a[1] + n[1] * (o + j)), pb = aufBild(g, b[0] + n[0] * (o + j2), b[1] + n[1] * (o + j2));
      const ax = pa[0] * RS, ay = pa[1] * RS, bx = pb[0] * RS, by = pb[1] * RS;
      const strich = (alpha, farbe, breite, versatz) => {
        x.globalAlpha = alpha; x.strokeStyle = farbe; x.lineWidth = breite;
        const ox = qx * versatz * vorn, oy = qy * versatz * vorn;
        x.beginPath(); x.moveTo(ax + ox, ay + oy); x.lineTo(bx + ox, by + oy); x.stroke();
      };
      strich(unscharf ? 0.4 : 0.7, muster, w, 0);                         // Rillengrund: dunklerer Kies
      strich(unscharf ? 0.1 : 0.2, '#34323c', w * 0.45, w * 0.25);        // Schattenwand vorn
      strich(unscharf ? 0.14 : 0.3, '#ffffff', Math.max(0.7, w * 0.4), -w * 0.75);   // Glanz am Rand hinten
    });
    x.globalAlpha = 1;
  }

  // ---------- Zustand ----------
  let S = null;
  function zuletztLesen() { try { return JSON.parse(localStorage.getItem('mg:zengarten:zuletzt') || '{}') || {}; } catch (e) { return {}; } }
  // Muster werden im Voraus erzeugt (im Startbild bzw. Endbild, ca. 0,5s Rechnen), damit „Los geht's“ nicht stockt
  let vorrat = null;
  function gartenWahl() {
    const z = zuletztLesen();
    let gNr = TEST.garten >= 1 && TEST.garten <= 5 ? TEST.garten : 0;
    if (!gNr) { const frei = [1, 2, 3, 4, 5].filter(n => n !== z.garten); gNr = frei[Math.floor(Math.random() * frei.length)]; }
    return gNr;
  }
  let rechnet = null;
  function vorrätig(sofort) {
    if (vorrat) return;
    if (!rechnet) { const gNr = gartenWahl(); rechnet = { gNr, it: musterFolgeSchritte(GAERTEN[gNr]) }; lade('garten-' + gNr, 'bilder/garten-' + gNr + '.webp'); }
    const r0 = rechnet, ende = performance.now() + (sofort ? 1e9 : 8);
    let r;
    do { r = r0.it.next(); } while (!r.done && performance.now() < ende);
    if (r.done) { vorrat = { gNr: r0.gNr, folge: r.value }; rechnet = null; }
    else setTimeout(() => { if (rechnet === r0) vorrätig(false); }, 0);
  }
  function neu() {
    const spielt = R_.zustand === 'spiel';
    if (spielt && !vorrat) vorrätig(true);
    const gNr = vorrat ? vorrat.gNr : gartenWahl();
    const garten = GAERTEN[gNr];
    lade('garten-' + gNr, 'bilder/garten-' + gNr + '.webp');
    S = { garten, nr: 0, phase: 'zeigen', phaseT: 0, zeit: 0, punkte: 0, ergebnisse: [], muster: [], kam: null,
      fort: 0, proben: [], angesetzt: false, aktiv: false, finger: null, harke: null, glatt: null, letzt: null,
      figur: { pose: 'meditation', bis: 0, seit: -9, vorher: 'meditation' }, sonne: 0, popups: [], spritzer: [], blaetter: [],
      blattUm: 9 + Math.random() * 8, bambusUm: 6 + Math.random() * 6, hinweis: true, testEnde: !!TEST.ende, finaleT: 0, zugT: 0, fenster: [] };
    rillenNeu();
    if (spielt) {
      S.muster = vorrat.folge; vorrat = null;
      try { localStorage.setItem('mg:zengarten:zuletzt', JSON.stringify({ garten: gNr, muster: S.muster.map(m => m.rez.nr) })); } catch (e) { /* privat */ }
      if (TEST.muster > 1) vorbauen(Math.min(MUSTER, TEST.muster) - 1);
    }
    else setTimeout(vorrätig, 400);
    if (L) kamera(true);
    anzeigen();
  }
  function anzeigen() { R_.anzeige('Muster ' + Math.min(MUSTER, S.nr + 1) + '/' + MUSTER, S.punkte.toLocaleString('de-DE') + ' Punkte'); }
  // Testhilfe #muster=N: frühere Muster sauber vorgeharkt
  function glaetten(m, alpha) {
    const x = rillen.getContext('2d'), g = S.garten, p = m.pts;
    x.save(); x.globalCompositeOperation = 'destination-out'; x.globalAlpha = alpha; x.strokeStyle = '#000'; x.lineCap = 'round'; x.lineJoin = 'round';
    for (let i = 0; i < p.length - 1; i += 4) {
      const j = Math.min(p.length - 1, i + 4), a = aufBild(g, p[i][0], p[i][1]), b = aufBild(g, p[j][0], p[j][1]);
      x.lineWidth = g.F * 0.56 / p[i][1] * RS;
      x.beginPath(); x.moveTo(a[0] * RS, a[1] * RS); x.lineTo(b[0] * RS, b[1] * RS); x.stroke();
    }
    x.restore();
  }
  function vorbauen(n) {
    for (let k = 0; k < n && k < S.muster.length; k++) {
      const m = S.muster[k];
      glaetten(m, 1);
      for (let i = 2; i < m.pts.length; i += 2) harkeStueck(S.garten, m.pts[i - 2], m.pts[i], quer(m, i), false);
      S.ergebnisse.push({ punkte: 100, genau: 1, ruhe: 1 }); S.punkte += 100; S.nr++;
    }
    S.sonne = S.nr / MUSTER;
  }
  function quer(m, i) {
    const a = m.pts[Math.max(0, i - 3)], b = m.pts[Math.min(m.pts.length - 1, i + 3)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  }

  // ---------- Ablauf ----------
  let harkeTon = null;
  function schritt(dt) {
    if (S.testEnde) { S.testEnde = false; testEnde(); return; }
    S.zeit += dt; S.phaseT += dt;
    // Kies im Bereich des neuen Musters erst glätten (wie mit dem Rechenrücken): ältere Rillen enden dort sauber, nichts
    // überlagert sich – im Finale liegen die Muster nebeneinander (MZ, 24.10.2026)
    if (S.phase === 'zeigen' && aktuelles()) glaetten(aktuelles(), Math.min(1, dt * TEMPO * 4));
    if (S.phase === 'zeigen' && S.phaseT >= 0.9 / TEMPO) { if (aktuelles()) glaetten(aktuelles(), 1); S.phase = 'harken'; S.phaseT = 0; }
    if (S.phase === 'fertig' && S.phaseT >= 1.4 / TEMPO) naechstes();
    if (S.phase === 'finale') { S.finaleT += dt * TEMPO; if (S.finaleT >= 3.4 && !S.endeGerufen) { S.endeGerufen = true; S.phase = 'ende'; endbild(); } }
    // Harke-Geräusch nach Tempo
    if (!harkeTon) harkeTon = R_.dauerton('harke');
    const v = S.aktiv && S.zeit - (S.letztBewegt || 0) < 0.12 ? S.tempo || 0 : 0;
    harkeTon.stellen(Math.min(1, v / 0.7), 0.85 + 0.35 * Math.min(1.5, v));
    // Sonne geht im Lauf des Spiels auf (mit jedem Muster), am Ende ganz
    const ziel = S.phase === 'finale' || S.phase === 'ende' ? 1 : S.nr / MUSTER;
    S.sonne += (ziel - S.sonne) * Math.min(1, dt * 0.25);
    // Bambus-Wasserspiel klackt ab und zu leise
    if (S.zeit > S.bambusUm) { S.bambusUm = S.zeit + 14 + Math.random() * 9; R_.ton('bambus'); }
    S.popups.forEach(p => { p.t += dt; }); S.popups = S.popups.filter(p => p.t < 1.6);
    S.spritzer.forEach(p => { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.t += dt; }); S.spritzer = S.spritzer.filter(p => p.t < 0.45);
  }
  function aktuelles() { return S.muster[S.nr]; }
  function naechstes() {
    S.nr++; S.fort = 0; S.proben = []; S.angesetzt = false; S.aktiv = false; S.glatt = null; S.letzt = null;
    if (S.nr >= MUSTER || !aktuelles()) { S.nr = Math.min(S.nr, MUSTER); S.phase = 'finale'; S.phaseT = 0; S.finaleT = 0; R_.ton('fertig');
      figur(S.punkte >= 800 ? 'freude' : 'stehend', 3.2); anzeigen(); return; }
    S.phase = 'zeigen'; S.phaseT = 0;
    anzeigen();
  }
  function musterFertig() {
    const w = wertung(S.proben);
    S.ergebnisse.push({ punkte: w.punkte, genau: w.genau, ruhe: w.ruhe, cv: w.cv, schnell: w.schnell, art: aktuelles().rez.art });
    S.punkte += w.punkte;
    const m = aktuelles(), e = m.bild[m.bild.length - 1];
    // kurze Begründung (MZ, 24.10.2026): nach dem größten Verlust
    const verl = [[PUNKTE.genau * (1 - w.genau), 'Näher an der Linie bleiben'], [PUNKTE.ruhe * 0.5 * (1 - w.gleich), 'Gleichmäßiger ziehen'], [PUNKTE.ruhe * 0.5 * (1 - w.langsam), 'Etwas langsamer']].sort((a, b) => b[0] - a[0]);
    S.popups.push({ text: '+' + w.punkte, x: e[0], y: e[1], t: 0, grund: w.punkte >= 95 ? 'Perfekt gestaltet' : verl[0][1] });
    R_.ton('geschafft');
    if (w.punkte >= 90) figur('freude', 1.2);
    else if (w.punkte < 50) figur('zucken', 1.2);
    S.aktiv = false; S.phase = 'fertig'; S.phaseT = 0;
    anzeigen();
  }
  function figur(pose, dauer) { const f = S.figur; f.vorher = aktuellePose(); f.pose = pose; f.bis = S.zeit + dauer; f.seit = S.zeit; }
  function aktuellePose() { const f = S.figur; return S.zeit < f.bis ? f.pose : 'meditation'; }

  function bewertung(p) {
    if (p >= 900) return ['Makellose Linien', 'ENTSPANNT', 'gut', 'freude'];
    if (p >= 800) return ['Ruhige Harke', 'ENTSPANNT', 'gut', 'freude'];
    if (p >= 700) return ['Schön geharkt', 'ENTSPANNT', 'gut', 'stehend'];
    if (p >= 550) return ['Ein paar Wellen zu viel', 'UNENTSPANNT', 'mittel', 'stehend'];
    return ['Kies in Unruhe', 'ANGESPANNT', 'schlecht', 'zucken'];
  }
  const prozent = v => Math.round(v * 100) + ' %';
  function endbild() {
    const punkte = Math.max(1, Math.min(1000, S.punkte));
    const [titel, stempel, art, pose] = bewertung(punkte);
    const n = Math.max(1, S.ergebnisse.length);
    const genau = S.testGenau != null ? S.testGenau : S.ergebnisse.reduce((a, e) => a + e.genau, 0) / n;
    const ruhe = S.testRuhe != null ? S.testRuhe : S.ergebnisse.reduce((a, e) => a + e.ruhe, 0) / n;
    R_.ende(punkte, { ueberschrift: titel, felder: [['Genauigkeit', prozent(genau)], ['Ruhe', prozent(ruhe)]],
      stempel: { text: stempel, art }, figur: POSEN[pose], verzoegerung: 300 });
    setTimeout(vorrätig, 1600);   // für „Nochmal“ (nach dem Einblenden des Endbilds)
  }
  function testEnde() {
    const p = Math.max(1, Math.min(1000, +TEST.ende));
    S.punkte = p; S.testGenau = Math.min(1, p / 1000 + 0.02); S.testRuhe = Math.min(1, p / 1000 - 0.04);
    endbild();
  }

  // ---------- Eingabe ----------
  // Fingerlage → Boden; nächster Punkt auf der Linie in [fort − 0,2 m, fort + VORAUS]
  function finden(q) {
    const m = aktuelles(), i0 = Math.max(0, S.fort - 10), i1 = Math.min(m.pts.length - 1, S.fort + Math.round((S.aktiv ? VORAUS_ZUG : VORAUS) / 0.02));
    let best = -1, bd = Infinity;
    for (let i = i0; i <= i1; i++) { const d = Math.hypot(q[0] - m.pts[i][0], q[1] - m.pts[i][1]); if (d < bd) { bd = d; best = i; } }
    return { i: best, d: bd };
  }
  function bodenVonSchirm(x, y) {
    const [ix, iy] = imBild(x, y), g = S.garten;
    if (iy <= g.yh + 2) return null;
    return boden(g, ix, iy);
  }
  function runter(x, y) {
    if (!S || S.phase !== 'harken') return;
    S.finger = { x, y, t: S.zeit };
    S.glatt = null; S.letzt = null;
    bewegen(x, y, true);
  }
  function bewegen(x, y, start) {
    if (!S || S.phase !== 'harken' || !S.finger) return;
    const g = S.garten, m = aktuelles();
    const q0 = bodenVonSchirm(x, y);
    if (!q0) return;
    // Tempo (Bildschirmanteil/s), weich
    const jetzt = performance.now() / 1000;
    if (S.fingerAlt && !start) {
      const dtt = Math.max(0.008, jetzt - S.fingerAlt.t), vv = Math.hypot(x - S.fingerAlt.x, y - S.fingerAlt.y) / dtt / L.kurz;
      S.tempo = S.tempo == null ? vv : S.tempo + (vv - S.tempo) * Math.min(1, dtt / 0.08);
    }
    const dtp = S.fingerAlt && !start ? Math.min(0.1, jetzt - S.fingerAlt.t) : 0;
    S.fingerAlt = { x, y, t: jetzt };
    // leichte Glättung der Harkenlage (kein Zittern)
    S.glatt = S.glatt ? [S.glatt[0] + (q0[0] - S.glatt[0]) * 0.6, S.glatt[1] + (q0[1] - S.glatt[1]) * 0.6] : q0;
    const q = S.glatt;
    const f = finden(q);
    S.harke = { q, i: f.i };
    if (f.d > FANG || f.i < 0) { S.aktiv = false; S.letzt = null; return; }
    if (!S.angesetzt) { S.angesetzt = true; S.angesetztT = S.zeit; S.hinweis = false; }
    S.aktiv = true; S.letztBewegt = S.zeit;
    const ds = Math.max(0, m.s[f.i] - m.s[S.fort]);
    if (f.i > S.fort) S.fort = f.i;
    const v = S.tempo || 0, unscharf = v > SCHNELL;
    S.proben.push({ d: f.d, ds, v, dt: dtp });
    if (S.letzt && Math.hypot(q[0] - S.letzt[0], q[1] - S.letzt[1]) > 0.02) {
      harkeStueck(g, S.letzt, q, quer(m, f.i), unscharf);
      if (unscharf && !ruhig()) spritzen(x, y);
    }
    if (!S.letzt || Math.hypot(q[0] - S.letzt[0], q[1] - S.letzt[1]) > 0.02) S.letzt = q;
    if (S.fort >= (m.pts.length - 1) * FERTIG) musterFertig();
  }
  function hoch() { if (!S) return; S.finger = null; S.aktiv = false; S.letzt = null; S.fingerAlt = null; S.tempo = 0; }
  function spritzen(x, y) {
    if (S.zeit - (S.spritzT || 0) > 0.35) { S.spritzT = S.zeit; R_.ton('spritzt'); }
    for (let k = 0; k < 3; k++) S.spritzer.push({ x, y, vx: (Math.random() - 0.5) * 260, vy: -120 - Math.random() * 180, t: 0 });
  }

  // ---------- Zeichnen ----------
  function zeichne(g, b, h, zustand, dt) {
    if (!L || b !== B || h !== H) groesse(b, h);
    if (!S) { neu(); }
    if (!S.kam) kamera(true);
    if (zustand === 'spiel' || S.phase === 'ende') kamera(false, dt);
    const ruh = ruhig(), t = S.zeit;
    himmelZeichnen(g, t, ruh);
    sonneZeichnen(g);
    gartenZeichnen(g);
    nebel(g, t, ruh);
    if (rillen) { const k = S.kam; g.drawImage(rillen, k.ox, k.oy, 1536 * k.z, 1024 * k.z); }
    licht(g);
    if (zustand === 'start') return;
    blaetter(g, dt, ruh);
    S.vorlageDt = dt;
    if (zustand === 'spiel' && (S.phase === 'zeigen' || S.phase === 'harken')) vorlage(g, t, ruh);
    if (S.hinweis && S.nr === 0 && S.phase === 'harken' && zustand === 'spiel') hinweis(g, t, ruh);
    if (zustand === 'spiel' && S.phase === 'harken' && S.finger && S.harke) harkeZeichnen(g, S.harke.q, S.harke.i, S.aktiv);
    spritzerZeichnen(g);
    popups(g);
    figurZeichnen(g, zustand);
    g.canvas.style.cursor = zustand === 'spiel' && S.phase === 'harken' ? 'crosshair' : '';
  }
  // Himmel: kachelbares Bild (Material/Bilder/himmel_kachel.py), zieht endlos und gut sichtbar nach rechts – oben 14 %, am
  // Horizont 6,5 % der Bildschirmbreite pro Minute (Parallaxe in Streifen, wie Steinturm v3; keine Spiegel, kein Skalieren)
  const WOLKEN = { nah: 0.14, fern: 0.065 };
  function himmelZeichnen(g, t, ruh) {
    g.fillStyle = '#e8b49a'; g.fillRect(0, 0, B, H);
    const img = bilder.himmel;
    if (!img) return;
    const iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(H / ih, B / iw) * 1.02, w = iw * s, hh = ih * s;
    const zeit = ruh ? 0 : t, n = ruh ? 1 : 80;
    const y0 = Math.min(0, Math.max(H - hh, (S.kam ? S.kam.oy + (S.garten.yh + 260) * S.kam.z : H * 0.4) - hh * 0.75));
    for (let r = 0; r < n; r++) {
      const v = (WOLKEN.fern + (WOLKEN.nah - WOLKEN.fern) * (1 - (r + 0.5) / n)) * zeit * B / 60;
      const sy = ih * r / n, sh = ih / n, dy = y0 + hh * r / n, dh = hh / n + 0.6;
      for (let x = (v % w) - w; x < B; x += w) g.drawImage(img, 0, sy, iw, sh, x, dy, w, dh);
    }
  }
  // Sonne hinter den Bergen (im Bild des Gartens verankert, das Gartenbild verdeckt sie, bis sie aufgeht)
  function sonneZeichnen(g) {
    const ga = S.garten, [sx, yu, yo] = ga.sonne, p = 1 - Math.pow(1 - S.sonne, 1.6);
    const [x, y] = schirm(sx, yu + (yo - yu) * p), r = 34 * S.kam.z;
    g.save(); g.globalCompositeOperation = 'screen';
    const rg = g.createRadialGradient(x, y, 0, x, y, r * 9);
    rg.addColorStop(0, `rgba(255,236,190,${0.55 + 0.3 * p})`); rg.addColorStop(0.12, `rgba(255,200,130,${0.35 + 0.2 * p})`); rg.addColorStop(1, 'rgba(255,170,110,0)');
    g.fillStyle = rg; g.fillRect(x - r * 9, y - r * 9, r * 18, r * 18);
    const sg = g.createRadialGradient(x, y, 0, x, y, r * 1.25);   // Sonnenscheibe mit weichem Rand (kein harter Kreis)
    sg.addColorStop(0, `rgba(255,250,232,${0.7 + 0.25 * p})`); sg.addColorStop(0.7, `rgba(255,240,205,${0.6 + 0.25 * p})`); sg.addColorStop(1, 'rgba(255,225,180,0)');
    g.fillStyle = sg; g.beginPath(); g.arc(x, y, r * 1.25, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function gartenZeichnen(g) {
    const img = bilder['garten-' + S.garten.nr];
    if (!img) return;
    const k = S.kam, w = 1536 * k.z, hh = 1024 * k.z, zw = ZWEIGE[S.garten.nr];
    if (zw && !ruhig()) {
      // überhängender Zweig wiegt sich im Wind (MZ, 24.10.2026): Bereich ohne den Zweig-Kasten zeichnen, dann den Kasten in
      // 16-px-Kacheln, jede um die Drehung um den Ansatz verschoben – gewichtet mit der Zweig-Karte (Hintergrund bleibt stehen)
      const [bx0, by0, bx1, by1] = zw.box;
      g.save(); g.beginPath(); g.rect(0, 0, B, H); g.rect(k.ox + bx0 * k.z, k.oy + by0 * k.z, (bx1 - bx0) * k.z, (by1 - by0) * k.z); g.clip('evenodd');
      g.drawImage(img, k.ox, k.oy, w, hh); g.restore();
      zweigZeichnen(g, img, zw, k);
    } else g.drawImage(img, k.ox, k.oy, w, hh);
    // Ränder (schmale Formate): Bild gespiegelt fortsetzen – unten die Veranda, seitlich der Garten
    const teile = [];
    if (k.oy + hh < H) teile.push([0, 1]);
    if (k.ox > 0) teile.push([-1, 0]);
    if (k.ox + w < B) teile.push([1, 0]);
    if (k.oy + hh < H && k.ox > 0) teile.push([-1, 1]);
    if (k.oy + hh < H && k.ox + w < B) teile.push([1, 1]);
    teile.forEach(([sx, sy]) => {
      const x = k.ox + sx * w, y = k.oy + sy * hh;
      g.save();
      g.translate(x + (sx ? w : 0), y + (sy ? hh : 0));
      g.scale(sx ? -1 : 1, sy ? -1 : 1);
      g.drawImage(img, 0, 0, w, hh);
      g.restore();
    });
  }
  function zweigZeichnen(g, img, zw, k) {
    const t = S.zeit, [bx0, by0, bx1, by1] = zw.box, [px, py] = zw.dreh, K = zw.k;
    // unregelmäßiger, langsamer Wind: überlagerte Sinus (ca. 4–9s), Grundneigung ±1°
    const th = (0.62 * Math.sin(t * 2 * Math.PI / 7.3) + 0.3 * Math.sin(t * 2 * Math.PI / 4.4 + 1.3) + 0.18 * Math.sin(t * 2 * Math.PI / 9.1 + 2.1)) * zw.amp * Math.PI / 180;
    const dmax = Math.hypot(bx1 - bx0, by1 - by0);
    for (let r = 0; r < zw.w.length; r++) {
      const zeile = zw.w[r], sy = by0 + r * K, sh = Math.min(K, by1 - sy);
      for (let c = 0; c < zeile.length; c++) {
        const sx = bx0 + c * K, sw = Math.min(K, bx1 - sx), wt = (zeile.charCodeAt(c) - 48) / 9;
        let dx = 0, dy = 0;
        if (wt > 0) {
          const ux = sx + sw / 2 - px, uy = sy + sh / 2 - py, f = th * wt * (1 + 0.6 * Math.hypot(ux, uy) / dmax);   // Spitzen stärker
          dx = -uy * f; dy = ux * f;
        }
        g.drawImage(img, sx, sy, sw, sh, k.ox + (sx + dx) * k.z - 0.5, k.oy + (sy + dy) * k.z - 0.5, sw * k.z + 1, sh * k.z + 1);
      }
    }
  }
  // Nebelbänke ziehen langsam vor den fernen Bergen und lösen sich mit der Sonne auf
  function nebel(g, t, ruh) {
    const ga = S.garten, a0 = 0.26 * (1 - 0.65 * S.sonne);
    if (a0 < 0.02) return;
    g.save();
    for (let i = 0; i < 3; i++) {
      const breite = 520 + 160 * i, x = ((i * 610 + (ruh ? 0 : t) * (9 + 4 * i)) % (1536 + breite)) - breite / 2, y = ga.nebel + (i - 1) * 26;
      const [sx, sy] = schirm(x, y), rw = breite * S.kam.z, rh = 46 * S.kam.z;
      const rg = g.createRadialGradient(sx, sy, 0, sx, sy, rw / 2);
      rg.addColorStop(0, `rgba(238,232,240,${a0})`); rg.addColorStop(1, 'rgba(238,232,240,0)');
      g.fillStyle = rg; g.save(); g.translate(sx, sy); g.scale(1, rh / (rw / 2)); g.translate(-sx, -sy);
      g.beginPath(); g.arc(sx, sy, rw / 2, 0, Math.PI * 2); g.fill(); g.restore();
    }
    g.restore();
  }
  // Licht: anfangs kühl und gedämpft (Dämmerung), mit der Sonne wärmer
  function licht(g) {
    const p = S.sonne;
    g.save(); g.globalCompositeOperation = 'soft-light';
    const r = Math.round(90 + 165 * p), gg = Math.round(105 + 85 * p), b = Math.round(170 - 60 * p);
    g.fillStyle = `rgba(${r},${gg},${b},0.5)`; g.fillRect(0, 0, B, H);
    g.restore();
    if (p < 0.6) { g.save(); g.fillStyle = `rgba(20,24,48,${0.16 * (1 - p / 0.6)})`; g.fillRect(0, 0, B, H); g.restore(); }
  }
  // Vorlage: blasse Linie (Harkenbreite), Mittellinie, Startpunkt pulsiert, Pfeile zeigen die Richtung
  let bandPuffer = null;
  function vorlage(g, t, ruh) {
    const m = aktuelles();
    if (!m) return;
    const ein = S.phase === 'zeigen' ? Math.min(1, S.phaseT * TEMPO / 0.6) : 1;
    let a = ein;
    // ab Muster 7: nach dem Ansetzen verblasst die Vorlage beim Harken (bis 25 %); abgesetzt kommt sie langsam zurück (bis 60 %)
    if (S.nr + 1 >= VERBLASSEN_AB && S.angesetzt && !TEST.loesung) {
      const ziel = S.aktiv ? 0.25 : 0.6;
      S.blass = S.blass == null ? 1 : S.blass + (ziel - S.blass) * Math.min(1, (S.vorlageDt || 0.016) * (S.aktiv ? 0.9 : 0.6));
      a *= S.blass;
    } else S.blass = null;
    const pts = m.bild.map(([x, y]) => schirm(x, y)), g0 = S.garten;
    const breite = i => g0.F * 0.34 / m.pts[i][1] * S.kam.z;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    // Band (in Stücken, Breite nach Perspektive, deckend in einen Puffer, dann blass) – bereits geharkter Teil verschwindet
    if (!bandPuffer) bandPuffer = document.createElement('canvas');
    if (bandPuffer.width !== Math.ceil(B) || bandPuffer.height !== Math.ceil(H)) { bandPuffer.width = Math.ceil(B); bandPuffer.height = Math.ceil(H); }
    const c = bandPuffer.getContext('2d');
    c.clearRect(0, 0, bandPuffer.width, bandPuffer.height); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#fff';
    for (let i = Math.max(0, S.fort - 1); i < pts.length - 1; i += 4) {
      const j = Math.min(pts.length - 1, i + 4);
      c.lineWidth = breite(i); c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[j][0], pts[j][1]); c.stroke();
    }
    g.globalAlpha = 0.22 * a; g.drawImage(bandPuffer, 0, 0, B, H);
    // offene Strecke kontrastreicher (Spielertest 24.10.2026): dunkler Schatten unter weißer Strichellinie, auf hellem Kies und
    // neben Rillen gut erkennbar
    const linie = () => { g.beginPath(); g.moveTo(pts[S.fort][0], pts[S.fort][1]); for (let i = S.fort + 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); };
    g.setLineDash([8, 7]);
    g.globalAlpha = 0.55 * a; g.strokeStyle = 'rgba(30,28,40,.9)'; g.lineWidth = 4.5; linie(); g.stroke();
    g.globalAlpha = (TEST.loesung ? 0.95 : 0.92) * a; g.strokeStyle = TEST.loesung ? '#7dffb0' : '#ffffff'; g.lineWidth = 2.4; linie(); g.stroke();
    g.setLineDash([]);
    // Richtungspfeile alle ca. 0,9 m auf dem noch offenen Weg
    g.fillStyle = '#ffffff';
    for (let i = Math.max(S.fort + 20, 20); i < pts.length - 10; i += 45) {
      const p = pts[i], q = pts[Math.min(pts.length - 1, i + 3)], w = Math.atan2(q[1] - p[1], q[0] - p[0]), s = Math.max(5, breite(i) * 0.16);
      g.globalAlpha = 0.85 * a;
      g.save(); g.translate(p[0], p[1]); g.rotate(w);
      g.shadowColor = 'rgba(20,18,30,.7)'; g.shadowBlur = 4; g.shadowOffsetY = 1;
      g.beginPath(); g.moveTo(s, 0); g.lineTo(-s * 0.7, -s * 0.8); g.lineTo(-s * 0.3, 0); g.lineTo(-s * 0.7, s * 0.8); g.closePath(); g.fill();
      g.restore();
    }
    // Startpunkt (bzw. Weiter-Punkt) pulsiert, solange nicht geharkt wird
    if (!S.aktiv) {
      const p = pts[S.fort], puls = ruh ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 1.3), r = Math.max(9, breite(S.fort) * 0.32);
      g.globalAlpha = (0.35 + 0.35 * puls) * Math.max(a, 0.6 * ein);
      g.fillStyle = '#0F9CD8'; g.beginPath(); g.arc(p[0], p[1], r * (1 + 0.25 * puls), 0, Math.PI * 2); g.fill();
      g.globalAlpha = 0.95 * Math.max(a, 0.6 * ein); g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.arc(p[0], p[1], r * 0.6, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
  }
  // Hinweis beim ersten Muster (ohne Text): eine blasse Harke gleitet vom Start ein Stück die Linie entlang
  function hinweis(g, t, ruh) {
    if (S.angesetzt) return;
    const m = aktuelles(), p = ruh ? 0.3 : ((t % 2.6) / 2.0);
    if (p > 1) return;
    const i = Math.min(m.pts.length - 1, Math.round(p * Math.min(m.pts.length - 1, 60)));
    g.save(); g.globalAlpha = Math.sin(Math.PI * p) * 0.75; harkeZeichnen(g, m.pts[i], i, false, true); g.restore();
  }
  // Harke (MZ, 24.10.2026: perspektivisch statt nur gedreht): per Code in 3D gezeichnet und mit der Gartenkamera projiziert –
  // Kamm quer zur Zugrichtung mit 4 Zinken, Stiel schräg nach oben hinter der Zugrichtung und zur Kamera hin (wie von einer
  // Person gezogen, die vorn steht); nie senkrecht. Abgehoben (nicht am Harken) 5 cm über dem Kies.
  function harkeZeichnen(g, q, i, aktiv, geist) {
    const ga = S.garten, m = aktuelles();
    if (!m) return;
    const n = quer(m, Math.max(0, i)), dir = [n[1], -n[0]];
    const P = (X, Z, Y) => schirm(ga.cx + ga.F * X / Z, ga.yh + ga.F * (ga.h - Y) / Z);
    const breite = (Z, d) => Math.max(1, ga.F * d / Z * S.kam.z);
    const lift = aktiv ? 0 : 0.05;
    // Stiel-Richtung am Boden: hinter der Zugrichtung, etwas zur Kamera (Kamera bei X 0, Z 0)
    const dc = Math.hypot(q[0], q[1]) || 1;
    let hx = -dir[0] * 0.6 - q[0] / dc * 0.55, hz = -dir[1] * 0.6 - q[1] / dc * 0.55;
    const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
    let lang = 0.95;
    if (q[1] + hz * lang < 0.7) lang = Math.max(0.2, (q[1] - 0.7) / -hz);
    const yb = lift + 0.08;
    const s0 = [q[0], q[1], yb], s1 = [q[0] + hx * lang, q[1] + hz * lang, yb + 0.62 * lang / 0.95];
    // Holzstück als Rundholz: echte Holz-Textur (bilder/holz.webp, aus dem Harkenbild) entlang der Achse, gerundete Enden,
    // Rundung über Licht/Schatten quer zur Achse (Licht von links oben wie im Garten)
    const holz = (a, b, d0, d1, ton) => {
      const pa = P(a[0], a[1], a[2]), pb = P(b[0], b[1], b[2]), w = (breite(a[1], d0) + breite(b[1], d1)) / 2;
      const dx = pb[0] - pa[0], dy = pb[1] - pa[1], l = Math.hypot(dx, dy), win = Math.atan2(dy, dx);
      g.save(); g.translate(pa[0], pa[1]); g.rotate(win);
      g.beginPath(); g.moveTo(0, -w / 2); g.lineTo(l, -w / 2); g.arc(l, 0, w / 2, -Math.PI / 2, Math.PI / 2); g.lineTo(0, w / 2); g.arc(0, 0, w / 2, Math.PI / 2, Math.PI * 1.5); g.closePath();
      g.clip();
      const tex = bilder.holz;
      if (tex) {
        const k = w / tex.naturalHeight;
        for (let x = -w / 2; x < l + w / 2; x += tex.naturalWidth * k) g.drawImage(tex, x, -w / 2, tex.naturalWidth * k + 0.5, w);
      } else { g.fillStyle = '#c8a679'; g.fillRect(-w, -w, l + 2 * w, 2 * w); }
      if (ton) { g.fillStyle = ton; g.fillRect(-w, -w, l + 2 * w, 2 * w); }
      // welche Seite zeigt nach links oben (Licht)?
      const ny = Math.cos(win), nx = -Math.sin(win), licht = (nx * -0.7 + ny * -0.7) > 0 ? 1 : -1;
      const v = g.createLinearGradient(0, -w / 2 * licht, 0, w / 2 * licht);
      v.addColorStop(0, 'rgba(255,248,232,.45)'); v.addColorStop(0.3, 'rgba(255,248,232,.08)'); v.addColorStop(0.62, 'rgba(60,38,18,.12)'); v.addColorStop(1, 'rgba(40,24,10,.55)');
      g.fillStyle = v; g.fillRect(-w, -w / 2, l + 2 * w, w);
      g.restore();
    };
    // weicher Kontaktschatten (mehrere blasse Ellipsen)
    const schatten = (X, Z, rx, alpha) => {
      const [sx, sy] = P(X, Z, 0), ry = Math.max(2, breite(Z, rx) * 0.35), r = breite(Z, rx);
      const rg = g.createRadialGradient(sx, sy, 0, sx, sy, r);
      rg.addColorStop(0, `rgba(30,26,34,${alpha})`); rg.addColorStop(1, 'rgba(30,26,34,0)');
      g.save(); g.translate(sx, sy); g.scale(1, ry / r); g.translate(-sx, -sy); g.fillStyle = rg; g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.fill(); g.restore();
    };
    g.save();
    if (geist) g.globalAlpha *= 0.85;
    // weicher Schatten am Boden (Kamm, Zinkenspitzen, Stiel leicht versetzt nach rechts hinten – Licht von links)
    if (!geist) {
      schatten(q[0] + 0.03, q[1] + 0.03, 0.28, aktiv ? 0.32 : 0.2);
      for (let k = 1; k <= 4; k++) { const f = k / 5; schatten(s0[0] + (s1[0] - s0[0]) * f + 0.06 + 0.2 * f, s0[1] + (s1[1] - s0[1]) * f + 0.08 + 0.2 * f, 0.07, 0.12 * (1 - f * 0.6)); }
    }
    const stiel = () => holz(s0, s1, 0.03, 0.028);
    const vornStiel = s1[1] < s0[1];   // Stiel zur Kamera hin: vor dem Kamm zeichnen
    if (!vornStiel) stiel();
    // Zinken
    ZINKEN.forEach(o => {
      if (!geist && aktiv) schatten(q[0] + n[0] * o + 0.012, q[1] + n[1] * o + 0.01, 0.025, 0.35);
      holz([q[0] + n[0] * o, q[1] + n[1] * o, lift + 0.005], [q[0] + n[0] * o, q[1] + n[1] * o, lift + 0.09], 0.018, 0.02, 'rgba(90,60,30,.12)');
    });
    // Kamm (Querholz, ca. 4,5 cm)
    holz([q[0] + n[0] * -0.2, q[1] + n[1] * -0.2, lift + 0.1], [q[0] + n[0] * 0.2, q[1] + n[1] * 0.2, lift + 0.1], 0.045, 0.045);
    if (vornStiel) stiel();
    g.restore();
  }
  function spritzerZeichnen(g) {
    g.save(); g.fillStyle = 'rgba(235,232,228,.9)';
    S.spritzer.forEach(p => { g.globalAlpha = 1 - p.t / 0.45; g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); });
    g.restore();
  }
  // Ahornblatt segelt alle 16–28s herab und bleibt kurz im Kies liegen
  function blaetter(g, dt, ruh) {
    if (!ruh && S.zeit > S.blattUm && S.blaetter.length < 2) {
      S.blattUm = S.zeit + 16 + Math.random() * 12;
      const ga = S.garten, ziel = [300 + Math.random() * 936, 500 + Math.random() * 380];
      if (ga.nr === 5) {   // Garten 5: einzelne Kirschblütenblätter vom Zweig (statt Ahorn), öfter und kleiner
        S.blattUm = S.zeit + 6 + Math.random() * 7;
        if (imPoly(ziel, ga.kies)) S.blaetter.push({ bluete: true, x: 1250 + Math.random() * 250, y: 200 + Math.random() * 120, zx: ziel[0], zy: ziel[1], t: 0, dauer: 8 + Math.random() * 3, w0: Math.random() * 6 });
      } else if (imPoly(ziel, ga.kies)) S.blaetter.push({ nr: 1 + Math.floor(Math.random() * 3), x: ziel[0] + 160, y: ziel[1] - 520, zx: ziel[0], zy: ziel[1], t: 0, dauer: 7 + Math.random() * 2, w0: Math.random() * 6 });
    }
    S.blaetter.forEach(b => {
      b.t += dt;
      const p = Math.min(1, b.t / b.dauer), img = bilder['blatt' + b.nr];
      if (!img && !b.bluete) return;
      const x = b.x + (b.zx - b.x) * p + (1 - p) * 60 * Math.sin(b.t * 1.4 + b.w0), y = b.y + (b.zy - b.y) * p;
      const [sx, sy] = schirm(x, y), s = 0.32 * S.kam.z * (0.8 + 0.4 * p);
      const lieg = p >= 1, alpha = lieg ? Math.max(0, 1 - (b.t - b.dauer) / 3) : Math.min(1, b.t / 0.8);
      g.save(); g.globalAlpha = alpha; g.translate(sx, sy);
      g.rotate(lieg ? b.w0 : b.w0 + 0.6 * Math.sin(b.t * 1.4));
      g.scale(s, s * (lieg ? 0.55 : 0.75 + 0.25 * Math.sin(b.t * 2.1)));
      if (b.bluete) { g.fillStyle = '#f6e3e8'; g.beginPath(); g.ellipse(0, 0, 20, 13, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(214,150,170,.6)'; g.beginPath(); g.ellipse(-6, 0, 7, 4, 0, 0, Math.PI * 2); g.fill(); }
      else g.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      g.restore();
    });
    S.blaetter = S.blaetter.filter(b => b.t < b.dauer + 3);
  }
  function popups(g) {
    S.popups.forEach(p => {
      const [x, y0] = schirm(p.x, p.y), e = Math.min(1, p.t / 0.35), y = y0 - 30 - p.t * 16;
      const a = p.t < 1.1 ? e : Math.max(0, 1 - (p.t - 1.1) / 0.5);
      g.save(); g.globalAlpha = a;
      g.font = '700 22px "Titillium Web", "Segoe UI", system-ui, sans-serif';
      const w = g.measureText(p.text).width + 26, hh = 34;
      const wr = Math.max(w, p.grund ? 220 : 0) / 2;
      g.translate(Math.max(wr + 8, Math.min(B - wr - 8, x)), Math.max(80, y)); g.scale(0.85 + 0.15 * e, 0.85 + 0.15 * e);
      g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
      g.fillStyle = '#fff'; rund(g, -w / 2, -hh / 2, w, hh, hh / 2); g.fill();
      g.shadowColor = 'transparent';
      g.fillStyle = '#FFD500'; g.fillRect(-w / 2 + 12, hh / 2 - 7, w - 24, 2.5);
      g.fillStyle = '#191919'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.text, 0, 1);
      if (p.grund) {
        g.font = '600 14px "Titillium Web", "Segoe UI", system-ui, sans-serif';
        const gw = g.measureText(p.grund).width + 18;
        g.fillStyle = 'rgba(25,25,25,.62)'; rund(g, -gw / 2, hh / 2 + 5, gw, 22, 11); g.fill();
        g.fillStyle = '#fff'; g.fillText(p.grund, 0, hh / 2 + 16.5);
      }
      g.restore();
    });
  }
  // Avatar b im Meditationssitz auf einem Sitzkissen unten am Rand (immer auf dem Boden, nie in der Luft)
  function figurZeichnen(g, zustand) {
    if (zustand !== 'spiel') return;
    const a = L.avatar, f = S.figur, pose = aktuellePose(), vor = f.vorher || 'meditation';
    const ueber = Math.min(1, (S.zeit - f.seit) / 0.2), zurueck = S.zeit < f.bis ? 1 : Math.min(1, (S.zeit - f.bis) / 0.2);
    // Sitzkissen (Zafu): rundes Meditationskissen aus dunklem Leinen mit Volumen und weichem Kontaktschatten. Er sinkt etwas
    // ein: die Vorderkante des Kissens wird nach der Figur noch einmal gezeichnet (verdeckt Füße/Sitzfläche unten).
    // Sichtbar, solange er sitzt (bei Freude/Schulterzucken steht er daneben).
    const kw = a.h * 0.86, kh = a.h * 0.21, ry = kh * 0.34, kx = a.x + a.w / 2, kb = a.unten, kt = kb - kh;
    const kA = aktuellePose() === 'meditation' ? (S.zeit < f.bis ? 1 - ueber : zurueck) : (S.zeit < f.bis ? 1 - ueber : 0);
    const seitePfad = () => {
      g.beginPath();
      g.moveTo(kx - kw / 2, kt);
      g.bezierCurveTo(kx - kw * 0.57, kt + kh * 0.35, kx - kw * 0.55, kb - ry * 0.6, kx - kw * 0.4, kb - ry * 0.25);
      g.quadraticCurveTo(kx, kb + ry * 0.35, kx + kw * 0.4, kb - ry * 0.25);
      g.bezierCurveTo(kx + kw * 0.55, kb - ry * 0.6, kx + kw * 0.57, kt + kh * 0.35, kx + kw / 2, kt);
      g.ellipse(kx, kt, kw / 2, ry, 0, 0, Math.PI, false);
      g.closePath();
    };
    const seiteFuellen = () => {
      const s1 = g.createLinearGradient(kx - kw / 2, 0, kx + kw / 2, 0);
      s1.addColorStop(0, '#4f4858'); s1.addColorStop(0.3, '#5d5566'); s1.addColorStop(0.7, '#3b3543'); s1.addColorStop(1, '#25212b');
      g.fillStyle = s1; seitePfad(); g.fill();
      const s2 = g.createLinearGradient(0, kt, 0, kb);   // Wölbung: oben heller, unten im Schatten
      s2.addColorStop(0, 'rgba(255,255,255,.10)'); s2.addColorStop(0.45, 'rgba(255,255,255,0)'); s2.addColorStop(1, 'rgba(0,0,0,.35)');
      g.fillStyle = s2; seitePfad(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1;   // Leinen: feine senkrechte Falten
      for (let k = -4; k <= 4; k++) { const x = kx + k * kw * 0.1; g.beginPath(); g.moveTo(x, kt + ry * 0.9); g.quadraticCurveTo(x + k * 0.6, kt + kh * 0.55, x * 0.98 + kx * 0.02, kb - ry * 0.3); g.stroke(); }
    };
    if (kA > 0.01) {
      g.save(); g.globalAlpha = kA;
      const sg = g.createRadialGradient(kx, kb, 0, kx, kb, kw * 0.75);
      sg.addColorStop(0, 'rgba(0,0,0,.5)'); sg.addColorStop(0.6, 'rgba(0,0,0,.18)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      g.save(); g.translate(kx, kb); g.scale(1, 0.24); g.fillStyle = sg; g.beginPath(); g.arc(0, 0, kw * 0.75, 0, Math.PI * 2); g.fill(); g.restore();
      seiteFuellen();
      const ob = g.createRadialGradient(kx - kw * 0.12, kt - ry * 0.2, 1, kx, kt, kw / 2);
      ob.addColorStop(0, '#6d6476'); ob.addColorStop(1, '#423b4b');
      g.fillStyle = ob; g.beginPath(); g.ellipse(kx, kt, kw / 2, ry, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    const zeichnePose = (name, alpha) => {
      const img = bilder[name];
      if (!img || alpha <= 0) return;
      const hh = a.h / POSEN.meditation.hoehe * POSEN[name].hoehe, w = hh * img.naturalWidth / img.naturalHeight;
      // sitzend auf dem Kissen, stehend daneben auf dem Boden; nie über den Rand hinaus
      const sitzt = name === 'meditation', x = Math.max(a.x - 4, Math.min(B - w - 4, a.x + a.w / 2 - w / 2)), y = (sitzt ? kt + ry * 1.25 : a.unten - 2) - hh, mitte = x + w / 2;
      const spiegeln = POSEN[name].blick !== 'frontal' && POSEN[name].blick === (mitte < B / 2 ? 'links' : 'rechts');
      g.save(); g.globalAlpha = alpha; g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
      if (spiegeln) { g.translate(x + w, y); g.scale(-1, 1); g.drawImage(img, 0, 0, w, hh); } else g.drawImage(img, x, y, w, hh);
      g.restore();
    };
    if (S.zeit < f.bis) { if (ueber < 1) zeichnePose(vor, 1 - ueber); zeichnePose(pose, ueber); }
    else { if (zurueck < 1) zeichnePose(f.pose, 1 - zurueck); zeichnePose('meditation', zurueck); }
    // Vorderkante des Kissens über Füßen/Sitzfläche (er sitzt im Kissen, kein heller Bodenrest sichtbar)
    if (kA > 0.01) {
      g.save(); g.globalAlpha = kA;
      g.beginPath(); g.rect(kx - kw, kt + ry * 0.55, kw * 2, kh * 2); g.clip();
      seiteFuellen();
      g.restore();
    }
  }
  function rund(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  // ---------- Anmeldung ----------
  R_.spiel({
    id: 'zen-garten',
    wertung: 'hoch',
    format: p => p.toLocaleString('de-DE') + ' Punkte',
    hoechst: 1000,
    bereich: 'Entspannung',
    hintergrund: { bild: 'bilder/start.webp', position: '50% 60%' },
    figur: POSEN.stehend,
    texte: {
      titel: 'Zen-Garten',
      untertitel: 'Ziehst du jede Linie in Ruhe?',
      anleitung: 'Zieh mit der Harke langsam die blasse Linie im Sand nach. Bleib genau auf der Linie und zieh gleichmäßig – wer hetzt, verwischt die Rillen. Zehn Muster, keine Eile.',
    },
    // Klänge (Sound Artist, 24.10.2026, Pixabay): Atmosphäre auf −20,5 dB RMS, mit Pegel 0,6 wirksam ca. −25 dB
    klaenge: {
      atmosphaere: { datei: 'klaenge/atmosphaere.mp3', proben: 551250, pegel: 0.6 },
      bambus: { datei: 'klaenge/bambus.mp3', proben: 33075, pegel: 0.35 },
      harke: { datei: 'klaenge/harke.mp3', proben: 74751, pegel: 0.6 },
      spritzt: { datei: 'klaenge/spritzt.mp3', proben: 19845, pegel: 0.6 },
      geschafft: { datei: 'klaenge/geschafft.mp3', proben: 61740, pegel: 0.6 },
      fertig: { datei: 'klaenge/fertig.mp3', proben: 212072, pegel: 0.8 },
    },
    schleife: 'atmosphaere',
    neu, schritt, zeichne, runter, bewegen: (x, y) => bewegen(x, y, false), hoch, groesse,
  });

  // ---------- Testhilfe ----------
  // Bot: zieht Muster mit seitlicher Abweichung σ (m, langsam wechselnd) und Tempo-Schwankung cv; schnell = Anteil der Zeit
  // mit doppeltem Tempo (zu schnell). Gibt Punkte je Spiel zurück (nur Rechnung, ohne Anzeige).
  function botSpiel(sigma, cv, schnell) {
    const g = GAERTEN[1 + Math.floor(Math.random() * 5)];
    const folge = (() => { const alt = S; S = { garten: g }; try { return musterFolge(g); } finally { S = alt; } })();
    let summe = 0, gs = 0, rs = 0;
    folge.forEach(m => {
      const proben = []; let fehl = 0, v = 0.55;
      for (let s = 0; s < m.laenge; s += 0.03) {
        fehl = 0.85 * fehl + 0.15 * (rn() * sigma * 2.4);
        v = 0.55 * Math.exp(rn() * cv) * (Math.random() < schnell ? 2.6 : 1);
        proben.push({ d: Math.abs(fehl), ds: 0.03, v, dt: 0.03 / (v * 1.2) });
      }
      const w = wertung(proben); summe += w.punkte; gs += w.genau; rs += w.ruhe;
    });
    return { punkte: Math.max(1, summe), muster: folge.length, genau: +(gs / folge.length).toFixed(2), ruhe: +(rs / folge.length).toFixed(2), garten: g.nr };
  }
  function rn() { let s = 0; for (let i = 0; i < 6; i++) s += Math.random(); return (s - 3) / Math.sqrt(0.5); }
  window.__zengarten = {
    get zustand() {
      return S && { phase: S.phase, muster: S.nr + 1, punkte: S.punkte, garten: S.garten.nr, fort: S.muster[S.nr] ? +(S.fort / (S.muster[S.nr].pts.length - 1)).toFixed(3) : null,
        art: S.muster[S.nr] && S.muster[S.nr].rez.art, laenge: S.muster[S.nr] && +S.muster[S.nr].laenge.toFixed(2), ergebnisse: S.ergebnisse,
        folge: S.muster.map(m => m.rez.art + (m.stein ? "*" : "")), abstand: S.muster.abstand, sonne: +S.sonne.toFixed(2), kamera: S.kam && { z: +S.kam.z.toFixed(3) } };
    },
    // Pfad des aktuellen Musters in Bildschirm-Punkten (jeder n-te Punkt)
    pfad(n) { const m = S.muster[S.nr]; if (!m) return []; const o = []; for (let i = 0; i < m.bild.length; i += n || 5) o.push(schirm(...m.bild[i]).map(v => Math.round(v * 10) / 10)); return o; },
    get lage() { return { avatar: L.avatar, feld: L.feld, kurz: L.kurz }; },
    punkt(i) { const m = S.muster[S.nr]; return m ? schirm(...m.bild[Math.max(0, Math.min(m.bild.length - 1, i))]) : null; },
    get punkte() { const m = S.muster[S.nr]; return m ? m.bild.length : 0; },
    get fortIndex() { return S.fort; },
    bot(sigma, cv, schnell, n) { const r = []; for (let i = 0; i < (n || 20); i++) r.push(botSpiel(sigma || 0, cv || 0, schnell || 0)); return r; },
    pool: POOL.length,
    // Prüfung: für jeden Garten N Spiele erzeugen – wie viele Muster jeweils gefunden
    probe(n) { const o = {}; Object.values(GAERTEN).forEach(g => { const alt = S; S = { garten: g }; const z = []; for (let i = 0; i < (n || 5); i++) { const f = musterFolge(g); z.push(f.length + "@" + f.abstand); } S = alt; o[g.nr] = z; }); return o; },
  };
})();
