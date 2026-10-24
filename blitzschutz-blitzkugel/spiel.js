// Blitzkugel (Sammlung „entSPANNUNG“, RSI protect) – Ablauf von MZ freigegeben (23.10.2026), Denkspiel ohne Zeitdruck:
// Gebäude in Seitenansicht, Fangstangen aufs Dach tippen (nochmal tippen = entfernen, Höchstzahl = Minimum + 2), dann
// „Kugel rollen“: Die Blitzkugel (Blitzkugelverfahren) rollt von links nach rechts über Gebäude und Stangen. Berührt sie nur
// Stangenspitzen, ist das Gebäude geschützt (grün); jede Berührung am Gebäude ist eine Lücke (roter Funke, bleibende Marke).
// 5 Gebäude à höchstens 200 Punkte: lückenlos mit Mindestzahl = 200, je Stange über dem Minimum −25, je Lücke −60, je Gebäude
// mindestens 0, gesamt mindestens 1. Je Gebäude 30s zum Setzen (ab 20s Zeitabzug bis Faktor 0,5); Zeit abgelaufen = Spielende
// mit 0 Punkten (MZ, 23.10.2026). 20 Gebäude im Pool, je Runde 5 (erstes: Einstieg mit 2 Stangen, dann nach Stufe).
//
// Prüfung (gleich wie im Skript, das die Mindestzahlen bestimmt hat): Dachkontur alle 2 Welt-Pixel abgetastet, Kugelmitte für
// jede Lage x (Schritt 1) = höchster Stützpunkt aus Boden, Dachpunkten und Stangenspitzen. Ein Dachpunkt ist berührt, wenn er die
// Kugel trägt (Toleranz 0,3). Nahe Berührungen (≤ 40 Welt-Pixel) gelten als eine Lücke, je angefangene 150 Welt-Pixel
// berührtes Dach zählt eine weitere.
//
// Testhilfen (Adresse): #ende=sieg-854 | #ende=mittel-612 | #ende=schwach-420 (nach „Los geht's“ sofort das Endbild),
//   #ende=zeit (Zeit abgelaufen), #gebaeude=N (Pool-Gebäude N kommt als erstes), #loesung (zeigt die Mindestlösung als Umriss), #ruhig.
//   window.__blitzkugel: Zustand, Bildschirm-Lage der Lösung/Rastpunkte, pruefen() – nur zum Testen.
(function () {
  'use strict';
  const R_ = window.Rahmen;
  const hash = location.hash;
  const TEST = {
    ende: (/(?:^#|&)ende=([a-z]+-)?(\d+|zeit)/.exec(hash) || [])[2] || null,
    gebaeude: +((/(?:^#|&)gebaeude=(\d+)/.exec(hash) || [])[1] || 0),
    loesung: /(?:^#|&)loesung(?![a-z])/.test(hash),
    ruhig: /(?:^#|&)ruhig(?![a-z])/.test(hash),
  };
  const ruhig = () => TEST.ruhig || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- Regeln und Maße (Welt-Pixel = Pixel der Gebäudebilder, gemeinsamer Maßstab: Hallenhöhe ca. 166) ----------
  const KUGEL_R = 300;          // Radius der Blitzkugel (Kugel deutlich größer als die Gebäude)
  const STANGE_H = 40;          // feste Höhe einer Fangstange über dem Dach
  const TOL = 0.3, LUECKE_ABSTAND = 40, LUECKE_LAENGE = 150, RASTER = 2, FANG = 20;
  const PUNKTE_MAX = 200, ABZUG_STANGE = 25, ABZUG_LUECKE = 60;
  const ROLL_DAUER = 3.6;
  // Countdown je Gebäude (MZ, 23.10.2026): 30s zum Setzen, ab „Gebäude steht“ bis „Kugel rollen“. Bis 20s volle Punkte,
  // danach Faktor linear von 1,0 (20s) auf 0,5 (30s) auf das Gebäude-Ergebnis. Bei 30s: Zeit abgelaufen = Spielende (0 Punkte).
  const ZEIT = { gesamt: 30, voll: 20, rest: 0.5, warnung: 5 };
  const zeitFaktor = t => t <= ZEIT.voll ? 1 : Math.max(ZEIT.rest, 1 - (1 - ZEIT.rest) * (t - ZEIT.voll) / (ZEIT.gesamt - ZEIT.voll));
  // Gebäude-Pool (MZ, 23.10.2026: „Opulenz“ – Pool von ca. 12 Gebäuden, je Spiel 5 zufällig, nach Schwierigkeit sortiert).
  // Neue Gebäude einfach anhängen: nr (Pool-Nummer, für #gebaeude=N), name, stufe 1–3 (leicht–schwer), Bild, Kontur, Rastpunkte,
  // Mindestzahl und Mindestlösung (per Skript, siehe Bericht).
  // 20 Gebäude, ausgeschnitten aus blitzkugel-gebaeude-a…g.png und auf gemeinsamen Maßstab gebracht (Hallenhöhe ≈ 166 ≈ 8 m):
  // a ×1,0 – b ×0,95 – c ×1,13 – d ×1,08 – e ×0,6 (kleine Bauten) – f ×0,96 – g ×0,85.
  // Stufe: 0 Einstieg (kleine Bauten, genau 2 Stangen nötig – jede Runde beginnt mit einem davon, MZ 23.10.2026),
  // 1 einfache Dachform, 2 Aufbauten/Höhensprung, 3 viele Spitzen, hohe oder schmale Aufbauten (Schornstein, Mast, Turm, Hochhaus).
  // x0/boden = Lage der linken unteren Gebäudeecke im Bild, kontur = Dachkontur (Welt, y nach oben, inkl. Aufbauten),
  // rast = Ecken der Kontur [x, Höhe], an denen Stangen einrasten (an Wänden genau auf der Außenkante); minimum/loesung
  // ([x, Höhe] je Stange) per Skript ermittelt – nur mit Plätzen, die man im Spiel auch erreichen kann (siehe Bericht 23.10.2026).
  const POOL = [
    {"nr":1,"mass":1,"name":"flache Halle","stufe":1,"bild":"bilder/gebaeude-1.webp","b":502,"h":171,"x0":2,"boden":168,"breite":497,"hoehe":166,"kontur":[[0,0],[0,166],[497,166],[497,0]],"rast":[[0,166],[497,166]],"minimum":3,"loesung":[[0,166],[200,166],[497,166]]},
    {"nr":2,"mass":1,"name":"Halle mit Klimageräten","stufe":2,"bild":"bilder/gebaeude-2.webp","b":415,"h":207,"x0":3,"boden":204,"breite":409,"hoehe":202,"kontur":[[0,0],[0,163],[82,163],[83,202],[145,202],[146,163],[239,163],[240,202],[301,202],[302,163],[347,163],[348,191],[353,195],[359,194],[361,190],[362,163],[409,162],[409,0]],"rast":[[0,163],[83,202],[145,202],[240,202],[301,202],[348,191],[353,195],[361,194],[409,162]],"minimum":4,"loesung":[[0,163],[83,202],[240,202],[409,162]]},
    {"nr":3,"mass":1,"name":"Halle mit Treppenturm","stufe":2,"bild":"bilder/gebaeude-3.webp","b":494,"h":345,"x0":3,"boden":342,"breite":488,"hoehe":339,"kontur":[[0,0],[0,166],[350,166],[351,333],[355,339],[488,339],[488,0]],"rast":[[0,166],[351,339],[488,339]],"minimum":3,"loesung":[[0,166],[351,339],[488,339]]},
    {"nr":4,"mass":0.95,"name":"Sheddach","stufe":3,"bild":"bilder/gebaeude-4.webp","b":703,"h":266,"x0":1,"boden":263,"breite":696,"hoehe":261,"kontur":[[0,0],[9,1],[10,186],[21,187],[150,261],[155,189],[280,261],[284,189],[292,192],[410,261],[414,189],[416,189],[539,261],[544,188],[669,261],[673,190],[674,187],[686,186],[687,1],[696,0]],"rast":[[10,186],[21,187],[150,261],[155,189],[280,261],[292,192],[410,261],[539,261],[544,188],[669,261],[686,186]],"minimum":4,"loesung":[[10,186],[150,261],[410,261],[669,261]]},
    {"nr":5,"mass":0.95,"name":"Bürotrakt mit Schornstein","stufe":3,"bild":"bilder/gebaeude-5.webp","b":689,"h":497,"x0":5,"boden":494,"breite":679,"hoehe":492,"kontur":[[0,0],[9,1],[10,258],[304,258],[305,170],[309,169],[310,485],[313,492],[352,492],[353,169],[479,169],[480,211],[486,216],[493,216],[496,218],[564,218],[567,216],[575,216],[577,169],[669,169],[670,1],[679,0]],"rast":[[10,258],[310,492],[352,492],[480,211],[486,216],[496,218],[564,218],[575,216],[669,169]],"minimum":4,"loesung":[[10,258],[310,492],[352,492],[669,169]]},
    {"nr":6,"mass":1.13,"name":"Satteldach-Halle","stufe":1,"bild":"bilder/gebaeude-6.webp","b":409,"h":247,"x0":3,"boden":241,"breite":403,"hoehe":238,"kontur":[[0,0],[0,161],[201,238],[224,231],[228,228],[250,221],[275,210],[402,162],[403,0]],"rast":[[0,161],[201,238],[224,231],[250,221],[275,210],[402,162]],"minimum":3,"loesung":[[0,161],[201,238],[402,162]]},
    {"nr":7,"mass":1.13,"name":"Tonnendach-Halle","stufe":1,"bild":"bilder/gebaeude-7.webp","b":397,"h":234,"x0":2,"boden":229,"breite":392,"hoehe":227,"kontur":[[0,0],[0,153],[17,169],[32,180],[70,201],[90,209],[124,219],[177,227],[229,226],[274,218],[302,209],[320,202],[349,187],[377,167],[392,153],[392,0]],"rast":[[0,153],[17,169],[32,180],[70,201],[90,209],[124,219],[177,227],[229,226],[274,218],[302,209],[320,202],[349,187],[377,167],[392,153]],"minimum":3,"loesung":[[0,153],[177,227],[377,167]]},
    {"nr":8,"mass":1.13,"name":"Hochregallager mit Ladehalle","stufe":2,"bild":"bilder/gebaeude-8.webp","b":391,"h":571,"x0":2,"boden":568,"breite":386,"hoehe":566,"kontur":[[0,0],[0,556],[1,564],[3,566],[176,565],[177,169],[385,169],[386,0]],"rast":[[0,566],[176,565],[385,169]],"minimum":3,"loesung":[[0,566],[176,565],[385,169]]},
    {"nr":9,"mass":1.13,"name":"Flachdach mit Lichtkuppeln","stufe":2,"bild":"bilder/gebaeude-9.webp","b":417,"h":231,"x0":2,"boden":228,"breite":412,"hoehe":226,"kontur":[[0,0],[0,169],[30,169],[31,175],[34,176],[40,183],[55,189],[66,188],[75,184],[81,176],[85,175],[86,169],[106,169],[107,175],[110,176],[117,184],[129,189],[137,189],[147,186],[160,174],[161,169],[182,169],[183,174],[191,182],[206,189],[213,189],[225,185],[233,176],[236,175],[238,169],[257,169],[259,175],[263,176],[271,185],[282,189],[291,189],[301,185],[310,176],[312,176],[314,169],[335,169],[336,223],[340,226],[352,226],[355,223],[357,169],[372,169],[373,202],[374,204],[382,205],[386,203],[388,169],[412,168],[412,0]],"rast":[[0,169],[34,176],[40,183],[55,189],[66,188],[75,184],[81,176],[110,176],[117,184],[129,189],[137,189],[147,186],[160,174],[183,174],[191,182],[206,189],[213,189],[225,185],[233,176],[263,176],[271,185],[282,189],[291,189],[301,185],[310,176],[336,226],[355,226],[373,204],[386,205],[412,168]],"minimum":4,"loesung":[[0,169],[34,176],[336,226],[412,168]]},
    {"nr":10,"mass":1.08,"name":"Bürogebäude mit Gittermast","stufe":3,"bild":"bilder/gebaeude-10.webp","b":497,"h":531,"x0":2,"boden":528,"breite":492,"hoehe":526,"kontur":[[0,0],[0,234],[27,234],[28,241],[31,242],[33,526],[36,526],[39,523],[57,523],[60,526],[65,525],[66,241],[68,241],[69,235],[492,234],[492,0]],"rast":[[0,234],[33,526],[60,526],[65,525],[492,234]],"minimum":4,"loesung":[[0,234],[33,526],[65,525],[492,234]]},
    {"nr":11,"mass":1.08,"name":"Pultdach-Halle","stufe":1,"bild":"bilder/gebaeude-11.webp","b":462,"h":245,"x0":2,"boden":242,"breite":457,"hoehe":240,"kontur":[[0,0],[1,240],[86,225],[94,222],[162,211],[176,207],[233,198],[241,195],[311,184],[331,179],[457,159],[457,0]],"rast":[[1,240],[86,225],[94,222],[162,211],[176,207],[233,198],[241,195],[311,184],[331,179],[457,159]],"minimum":3,"loesung":[[1,240],[162,211],[457,159]]},
    {"nr":12,"mass":1.08,"name":"Halle mit zwei Silos","stufe":2,"bild":"bilder/gebaeude-12.webp","b":579,"h":369,"x0":2,"boden":365,"breite":573,"hoehe":363,"kontur":[[0,0],[0,167],[401,167],[403,168],[404,322],[436,353],[438,362],[440,363],[448,363],[450,361],[451,354],[484,322],[485,3],[488,3],[489,323],[520,353],[522,362],[524,363],[532,363],[536,354],[568,323],[569,3],[573,3],[573,0]],"rast":[[0,167],[404,322],[436,363],[451,363],[489,323],[520,363],[536,363],[573,323]],"minimum":4,"loesung":[[0,167],[404,322],[436,363],[573,323]]},
    {"nr":13,"mass":0.6,"name":"Werkstatt/Garage","stufe":0,"bild":"bilder/gebaeude-13.webp","b":172,"h":76,"x0":1,"boden":74,"breite":169,"hoehe":73,"kontur":[[0,0],[1,73],[168,73],[169,0]],"rast":[[1,73],[168,73]],"minimum":2,"loesung":[[1,73],[168,73]]},
    {"nr":14,"mass":0.6,"name":"Trafostation","stufe":0,"bild":"bilder/gebaeude-14.webp","b":132,"h":74,"x0":2,"boden":72,"breite":128,"hoehe":71,"kontur":[[0,0],[0,71],[127,71],[128,0]],"rast":[[0,71],[127,71]],"minimum":2,"loesung":[[0,71],[127,71]]},
    {"nr":15,"mass":0.6,"name":"Pförtnerhaus mit Vordach","stufe":0,"bild":"bilder/gebaeude-15.webp","b":174,"h":68,"x0":1,"boden":66,"breite":171,"hoehe":65,"kontur":[[0,0],[0,64],[23,65],[171,63],[171,0]],"rast":[[0,64],[23,65],[171,63]],"minimum":2,"loesung":[[0,64],[171,63]]},
    {"nr":16,"mass":0.96,"name":"Logistikhalle mit PV-Anlage","stufe":2,"bild":"bilder/gebaeude-16.webp","b":541,"h":200,"x0":2,"boden":197,"breite":536,"hoehe":195,"kontur":[[0,0],[0,168],[17,168],[18,172],[36,188],[64,194],[66,180],[74,188],[101,194],[102,181],[110,188],[138,194],[139,181],[147,188],[174,194],[175,182],[182,188],[210,194],[211,182],[218,188],[245,194],[246,179],[256,188],[279,194],[283,194],[284,180],[293,188],[322,194],[323,179],[333,188],[360,195],[362,180],[371,188],[399,195],[401,178],[411,188],[440,195],[442,195],[443,178],[452,187],[475,194],[476,168],[480,168],[482,192],[515,192],[516,168],[536,168],[536,0]],"rast":[[0,168],[18,172],[36,188],[64,194],[74,188],[101,194],[110,188],[138,194],[147,188],[174,194],[182,188],[210,194],[218,188],[245,194],[256,188],[283,194],[293,188],[322,194],[333,188],[360,195],[371,188],[399,195],[411,188],[442,195],[452,187],[475,194],[515,192],[536,168]],"minimum":4,"loesung":[[0,168],[18,172],[245,194],[515,192]]},
    {"nr":17,"mass":0.96,"name":"Wohnhochhaus","stufe":3,"bild":"bilder/gebaeude-17.webp","b":254,"h":705,"x0":2,"boden":702,"breite":249,"hoehe":700,"kontur":[[0,0],[0,557],[2,610],[7,610],[8,636],[90,637],[91,690],[172,690],[173,637],[188,637],[189,691],[192,700],[194,691],[195,637],[240,637],[241,610],[246,611],[247,609],[249,557],[249,0]],"rast":[[0,610],[8,636],[91,690],[172,690],[192,700],[240,637],[249,611]],"minimum":4,"loesung":[[0,610],[91,690],[172,690],[249,611]]},
    {"nr":18,"mass":0.96,"name":"Klinik mit Hubschrauber-Landeplatz","stufe":3,"bild":"bilder/gebaeude-18.webp","b":540,"h":290,"x0":2,"boden":287,"breite":535,"hoehe":285,"kontur":[[0,0],[0,221],[43,221],[44,283],[67,283],[78,285],[450,284],[459,283],[460,261],[520,261],[521,221],[535,221],[535,0]],"rast":[[0,221],[44,283],[67,283],[78,285],[450,284],[459,283],[520,261],[535,221]],"minimum":5,"loesung":[[0,221],[44,283],[100,285],[392,284],[535,221]]},
    {"nr":19,"mass":0.85,"name":"Rathaus mit Uhrturm","stufe":3,"bild":"bilder/gebaeude-19.webp","b":613,"h":548,"x0":2,"boden":545,"breite":608,"hoehe":542,"kontur":[[0,0],[0,229],[3,229],[16,237],[87,285],[262,285],[263,383],[275,383],[276,431],[278,431],[283,438],[301,509],[305,538],[307,542],[309,539],[312,514],[331,438],[332,435],[338,431],[339,383],[351,383],[352,285],[522,285],[594,236],[605,229],[608,229],[608,0]],"rast":[[0,229],[16,237],[87,285],[263,383],[276,431],[283,438],[307,542],[331,438],[338,431],[351,383],[522,285],[594,236],[608,229]],"minimum":5,"loesung":[[0,229],[16,237],[307,542],[338,431],[608,229]]},
    {"nr":20,"mass":0.85,"name":"Hallen mit Förderbrücke","stufe":2,"bild":"bilder/gebaeude-20.webp","b":613,"h":334,"x0":2,"boden":331,"breite":608,"hoehe":329,"kontur":[[0,0],[0,176],[204,176],[205,198],[369,198],[370,212],[384,234],[559,234],[560,244],[564,245],[565,328],[567,329],[584,328],[585,245],[589,244],[590,234],[608,234],[608,0]],"rast":[[0,176],[205,198],[370,212],[384,234],[565,329],[584,328],[608,234]],"minimum":4,"loesung":[[0,176],[264,198],[584,328],[608,234]]},
  ];
  // himmel.webp 1536×1024: Horizont (Bodenlinie, auf der die Gebäude stehen) bei y 824
  const HIMMEL_BILD = { b: 1536, h: 1024, horizont: 824 };

  // ---------- Prüfung (Blitzkugelverfahren) ----------
  function profil(k, x) {
    let best = 0;
    for (let i = 1; i < k.length; i++) {
      const [ax, ay] = k[i - 1], [bx, by] = k[i];
      if (x < Math.min(ax, bx) || x > Math.max(ax, bx)) continue;
      const y = ax === bx ? Math.max(ay, by) : ay + (by - ay) * (x - ax) / (bx - ax);
      if (y > best) best = y;
    }
    return best;
  }
  function vorbereiten(geb) {
    const k = geb.kontur, P = [];
    for (let i = 1; i < k.length; i++) {
      const [ax, ay] = k[i - 1], [bx, by] = k[i], n = Math.max(1, Math.floor(Math.hypot(bx - ax, by - ay) / 2));
      for (let j = 0; j <= n; j++) { const x = ax + (bx - ax) * j / n, y = ay + (by - ay) * j / n; if (y > 0.5) P.push([x, y]); }
    }
    const x0 = -KUGEL_R - 20, n = Math.ceil(geb.breite + 2 * KUGEL_R + 40);
    const bmax = new Float64Array(n).fill(-1e9), bidx = new Int32Array(n).fill(-1);
    P.forEach(([px, py], j) => {
      const a = Math.max(0, Math.ceil(px - KUGEL_R - x0)), e = Math.min(n - 1, Math.floor(px + KUGEL_R - x0));
      for (let i = a; i <= e; i++) {
        const d = x0 + i - px, v = py + Math.sqrt(Math.max(0, KUGEL_R * KUGEL_R - d * d));
        if (v > bmax[i]) { bmax[i] = v; bidx[i] = j; }
      }
    });
    geb.P = P; geb.xa = x0; geb.n = n; geb.bmax = bmax; geb.bidx = bidx;
  }
  // Absicherung (MZ, 23.10.2026): Bei keinem Gebäude darf eine Stange reichen – Gebäude mit Minimum < 2 nicht in den Pool
  for (let i = POOL.length - 1; i >= 0; i--) if (!(POOL[i].minimum >= 2)) {
    console.info('Blitzkugel: Gebäude ' + POOL[i].nr + ' (' + POOL[i].name + ') nicht im Pool – Minimum ' + POOL[i].minimum + ' < 2');
    POOL.splice(i, 1);
  }
  POOL.forEach(vorbereiten);
  const ANZAHL = Math.min(5, POOL.length);   // Gebäude je Spiel
  // Auswahl für ein Spiel: nie doppelt; bei „Nochmal“ möglichst andere als zuletzt (gemerkt in mg:blitzkugel:zuletzt);
  // zuerst ein Einstiegs-Gebäude (Stufe 0, genau 2 Stangen), mindestens ein leichtes und ein schweres; Reihenfolge nach Stufe (leicht zuerst, das schwierigste zuletzt), innerhalb der Stufe
  // nach Mindestzahl. Testhilfe #gebaeude=N: Pool-Gebäude N ist dabei und kommt zuerst.
  function auswahl() {
    let zuletzt = [];
    try { zuletzt = JSON.parse(localStorage.getItem('mg:blitzkugel:zuletzt') || '[]'); } catch (e) { /* privat */ }
    const gemischt = POOL.map((g, i) => ({ i, g, alt: zuletzt.includes(g.nr), z: Math.random() })).sort((a, b) => (a.alt - b.alt) || (a.z - b.z));
    const wahl = [];
    const fest = TEST.gebaeude ? gemischt.find(e => e.g.nr === TEST.gebaeude) : null;
    if (fest) wahl.push(fest);
    // Einstieg: genau ein Gebäude der Stufe 0 (braucht 2 Stangen), dann mindestens ein leichtes (1) und ein schweres (3)
    const einstieg = gemischt.find(e => e.g.stufe === 0 && !wahl.includes(e));
    if (einstieg && !wahl.some(e => e.g.stufe === 0)) wahl.push(einstieg);
    [1, 3].forEach(st => {
      const e = gemischt.find(x => x.g.stufe === st && !wahl.includes(x));
      if (e && !wahl.some(x => x.g.stufe === st) && wahl.length < ANZAHL) wahl.push(e);
    });
    gemischt.forEach(e => { if (wahl.length < ANZAHL && !wahl.includes(e) && e.g.stufe > 0) wahl.push(e); });
    const sortiert = wahl.filter(e => e !== fest).sort((a, b) => (a.g.stufe - b.g.stufe) || (a.g.minimum - b.g.minimum) || (a.z - b.z));
    const folge = (fest ? [fest, ...sortiert] : sortiert).map(e => e.i);
    // nur merken, wenn wirklich gespielt wird (neu() läuft auch schon für das Startbild)
    if (R_.zustand === 'spiel') try { localStorage.setItem('mg:blitzkugel:zuletzt', JSON.stringify(folge.map(i => POOL[i].nr))); } catch (e) { /* privat */ }
    return folge;
  }
  // Ergebnis für eine Stangen-Belegung: Kugelbahn, berührte Stangen und Lücken (je Lücke Ort, Punkte und Zeitpunkt)
  function pruefen(geb, stangen) {
    const n = geb.n, env = new Float64Array(n), sMax = new Float64Array(n).fill(KUGEL_R), sIdx = new Int32Array(n).fill(-1);
    stangen.forEach((s, j) => {
      const tx = s.x, ty = (s.basis != null ? s.basis : profil(geb.kontur, s.x)) + STANGE_H;
      const a = Math.max(0, Math.ceil(tx - KUGEL_R - geb.xa)), e = Math.min(n - 1, Math.floor(tx + KUGEL_R - geb.xa));
      for (let i = a; i <= e; i++) {
        const d = geb.xa + i - tx, v = ty + Math.sqrt(Math.max(0, KUGEL_R * KUGEL_R - d * d));
        if (v > sMax[i]) { sMax[i] = v; sIdx[i] = j; }
      }
    });
    const getroffen = new Map(), stangeBeruehrt = new Map();
    for (let i = 0; i < n; i++) {
      env[i] = Math.max(sMax[i], geb.bmax[i]);
      if (geb.bmax[i] > sMax[i] - TOL && geb.bmax[i] > KUGEL_R + TOL && !getroffen.has(geb.bidx[i])) getroffen.set(geb.bidx[i], i);
      if (sIdx[i] >= 0 && sMax[i] >= env[i] - TOL && !stangeBeruehrt.has(sIdx[i])) stangeBeruehrt.set(sIdx[i], i);
    }
    // Berührte Dachpunkte zu Lücken zusammenfassen (nach Lage auf dem Dach)
    // Lange berührte Strecken zählen mehrfach: je angefangene LUECKE_LAENGE eine Lücke (sonst wäre ein Dach ganz ohne
    // Stangen nur „1 Lücke“)
    const pkt = [...getroffen.keys()].sort((a, b) => geb.P[a][0] - geb.P[b][0]), gruppen = [];
    pkt.forEach(j => {
      const gr = gruppen[gruppen.length - 1], p = geb.P[j];
      if (gr && p[0] - gr[gr.length - 1].p[0] <= LUECKE_ABSTAND) gr.push({ p, i: getroffen.get(j) });
      else gruppen.push([{ p, i: getroffen.get(j) }]);
    });
    const luecken = [];
    gruppen.forEach(gr => {
      const a = gr[0].p[0], e = gr[gr.length - 1].p[0], m = Math.max(1, Math.ceil((e - a) / LUECKE_LAENGE));
      for (let q = 0; q < m; q++) {
        const teil = gr.filter(z => m === 1 || (z.p[0] >= a + (e - a) * q / m && (q === m - 1 ? z.p[0] <= e : z.p[0] < a + (e - a) * (q + 1) / m)));
        if (!teil.length) continue;
        const mitte = teil[Math.floor(teil.length / 2)].p;
        luecken.push({ punkte: teil.map(z => z.p), i: Math.min(...teil.map(z => z.i)), x: mitte[0], y: mitte[1] });
      }
    });
    return { env, luecken, stangen: [...stangeBeruehrt.entries()].map(([j, i]) => ({ j, i })) };
  }
  function punkteFuer(geb, anzahl, luecken) {
    return Math.max(0, PUNKTE_MAX - ABZUG_STANGE * Math.max(0, anzahl - geb.minimum) - ABZUG_LUECKE * luecken);
  }

  // ---------- Bilder ----------
  const bilder = {};
  let himmel = null;
  const POSEN = {
    ruhe: { bild: 'bilder/frau-ruhe.webp', blick: 'links', hoehe: 1 },
    daumen: { bild: 'bilder/frau-daumen.webp', blick: 'links', hoehe: 1 },
    jubel: { bild: 'bilder/frau-jubel.webp', blick: 'frontal', hoehe: 0.94 },
    entsetzt: { bild: 'bilder/frau-entsetzt.webp', blick: 'frontal', hoehe: 0.955 },
  };
  function lade(name, datei) {
    const i = new Image();
    i.onload = () => { bilder[name] = i; if (name === 'himmel') himmel = himmelEbene(i); };
    i.src = datei;
  }
  lade('himmel', 'bilder/himmel.webp');
  POOL.forEach((g, i) => lade('g' + i, g.bild));
  Object.keys(POSEN).forEach(n => lade(n, POSEN[n].bild));
  // Lebender Himmel wie Fangstange v4: zwei Wolkenschichten (Bild + Spiegelbild nahtlos), ziehen nach links, weich vor dem
  // Horizont ausgeblendet (Bild-y 620–800, Horizont 824)
  const HIMMEL = { voll: 620, weg: 800,
    // v2 (MZ „bitte Himmel animieren“): deutlicher – vorn 13 %, hinten 7 % der Bildbreite pro Minute, vorn Brodeln
    schichten: [{ tempo: 0.07, groesse: 1.0, deckkraft: 0.5, start: 0.13 }, { tempo: 0.13, groesse: 1.25, deckkraft: 0.6, start: 0.61 }] };
  function himmelEbene(img) {
    const f = 0.5, w = Math.round(img.naturalWidth * f), h = Math.round(HIMMEL.weg * f);
    const c = document.createElement('canvas'); c.width = 2 * w; c.height = h;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, img.naturalWidth, HIMMEL.weg, 0, 0, w, h);
    x.save(); x.translate(2 * w, 0); x.scale(-1, 1); x.drawImage(img, 0, 0, img.naturalWidth, HIMMEL.weg, 0, 0, w, h); x.restore();
    x.globalCompositeOperation = 'destination-in';
    const v = x.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, '#000'); v.addColorStop(HIMMEL.voll / HIMMEL.weg, '#000'); v.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = v; x.fillRect(0, 0, c.width, h);
    return c;
  }

  // ---------- Lage ----------
  let B = 0, H = 0, L = null;
  // Aufteilung (v2, Supervisor 23.10.2026):
  // Hochformat – Boden tief (unten bleibt nur ein Streifen für Figur und Knopf), Gebäude groß über fast die volle Breite;
  //   unten links die Figur, rechts daneben Ergebnis-Zettel und Knopf (nie überlappend).
  // Querformat – Figur groß unten links (wie Fangstange quer, ganz sichtbar), Gebäude in der Fläche rechts davon,
  //   Knopf mittig darunter, Ergebnis-Zettel links neben dem Knopf, rechts von der Figur.
  const FIGUR_BREITE = 0.58;   // breiteste Pose (jubel) im Verhältnis zur Höhe – Platz für die Figur
  let sonde = null;
  function sicherUnten() {
    if (!sonde) { sonde = document.createElement('div'); sonde.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom)'; document.body.appendChild(sonde); }
    return parseFloat(getComputedStyle(sonde).paddingBottom) || 0;
  }
  function lage() {
    const hoch = H > B;
    const streifen = hoch ? Math.max(150, Math.round(H * 0.2)) : Math.round(H * 0.2);
    const gy = H - streifen;                                              // Bodenlinie = Horizont des Himmelsbildes
    const s = Math.max(B / HIMMEL_BILD.b, gy / HIMMEL_BILD.horizont);
    const bx = (B - HIMMEL_BILD.b * s) / 2, by = gy - HIMMEL_BILD.horizont * s;
    const figurH = hoch ? Math.min(170, streifen - 12) : Math.max(70, Math.min(230, H * 0.34));
    const figR = 8 + figurH * FIGUR_BREITE * 0.75;                         // ruhe/daumen sind schmaler als jubel
    const knopfH = Math.max(40, Math.min(50, streifen * 0.32));
    let knopf;
    if (hoch) {
      const x = Math.max(figR + 12, (B - 240) / 2), w = Math.min(240, B - x - 12);
      knopf = { x, y: H - knopfH - Math.max(10, (streifen - knopfH - 92) / 2), w, h: knopfH };
    } else {
      const links = figR + 12, w = Math.min(240, (B - links) * 0.5);
      // Abstand zum unteren Rand mindestens 24 px plus Geräte-Aussparung (Home-Leiste), Spielertest 24.10.2026
      knopf = { x: links + (B - links - w) / 2, y: Math.min(gy + (streifen - knopfH) / 2, H - knopfH - 24 - sicherUnten()), w, h: knopfH };
    }
    L = { gy, s, bx, by, hoch, streifen, kurz: Math.min(B, H), figurH, figR, knopf, bauLinks: hoch ? 8 : figR + 12 };
    if (S) ansicht();
  }
  // Maßstab je Gebäude: so groß wie möglich (Breite mit Rand, Höhe inkl. Stangen unter der Anzeige), höchstens 1,25;
  // die Kugel darf oben angeschnitten sein
  function ansicht() {
    const geb = POOL[S.folge[S.nr]];
    const oben = 86;   // Anzeige + Zeile „Stangen“
    const breit = B - L.bauLinks - 8;
    const kBreite = breit * (L.hoch ? 0.95 : 0.86) / geb.breite;
    // höchstens 1,25-fache Bildauflösung (mass = Welt-Pixel je Bildpixel; kleine Bauten liegen in voller Auflösung vor → größer)
    let k = Math.min(kBreite, (L.gy - oben) / (geb.hoehe + STANGE_H + 6), 1.25 / (geb.mass || 1));
    // Sehr hohe Gebäude im flachen Querformat (Hochhaus, Rathausturm): Dach muss genau antippbar bleiben – dann mindestens
    // Maßstab 0,5; das Gebäude reicht unten aus dem Bild (Boden des Gebäudes unter dem Bildrand), die Kugel rollt trotzdem richtig
    S.boden = L.gy;
    if (!L.hoch && k < 0.5) {
      // … aber alle Rastpunkte (auch niedrige Dachteile) bleiben über dem Streifen mit Knopf und Figur
      const tiefste = Math.min(...geb.rast.map(r => r[1]));
      const kMax = (L.gy - 10 - oben) / Math.max(1, geb.hoehe + STANGE_H + 6 - tiefste);
      const k2 = Math.min(kBreite, 0.5, kMax);
      if (k2 > k) { k = k2; S.boden = oben + (geb.hoehe + STANGE_H + 6) * k; }
    }
    S.k = k; S.ox = L.bauLinks + (breit - geb.breite * k) / 2;
  }
  function groesse(b, h) { B = b; H = h; lage(); }
  const welt = (x, y) => [(x - S.ox - S.einfahrt) / S.k, (S.boden - y) / S.k];
  const bild = (x, y) => [S.ox + S.einfahrt + x * S.k, S.boden - y * S.k];

  // ---------- Zustand ----------
  let S = null;
  function neu() {
    S = { nr: 0, folge: auswahl(), phase: 'herein', phaseT: 0, zeit: 0, uhr: 0, boden: L ? L.gy : 0, stangen: [], ergebnisse: [], punkte: 0, k: 1, ox: 0, einfahrt: 0,
      roll: null, funken: [], blitze: [], figur: { pose: 'ruhe', bis: 0, hupf: 0 }, klicks: [], regen: [], testEnde: !!TEST.ende,
      hinweis: true, fern: null, fernUm: null };
    if (L) ansicht();
    anzeigen();
  }
  function anzeigen() { R_.anzeige('Gebäude ' + (S.nr + 1) + '/' + ANZAHL, S.punkte.toLocaleString('de-DE') + ' Punkte'); }
  const geb = () => POOL[S.folge[S.nr]];
  const hoechst = () => geb().minimum + 2;

  // ---------- Ablauf ----------
  let kugelTon = null;
  function schritt(dt) {
    if (S.testEnde) { S.testEnde = false; testEnde(); return; }
    S.zeit += dt; S.phaseT += dt;
    if (S.phase === 'herein') {
      const p = Math.min(1, S.phaseT / 0.7);
      S.einfahrt = (1 - (1 - Math.pow(1 - p, 3))) * B;
      if (p >= 1) { S.einfahrt = 0; S.phase = 'setzen'; S.phaseT = 0; S.uhr = 0; }   // Countdown startet, sobald das Gebäude steht
    }
    if (S.phase === 'setzen') {
      S.uhr += dt;
      if (S.uhr >= ZEIT.gesamt) { zeitAbgelaufen(); return; }
    }
    if (S.phase === 'rollen') rollen(dt);
    S.funken.forEach(f => { f.vx *= 1 - dt * 1.5; f.vy += 420 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.leben -= dt; });
    S.funken = S.funken.filter(f => f.leben > 0);
    S.blitze = S.blitze.filter(b => S.zeit - b.t0 < 0.8);
  }
  function rollen(dt) {
    const r = S.roll, g = geb();
    if (!kugelTon) kugelTon = R_.dauerton('kugel');
    kugelTon.stellen(1, 1);
    r.i = Math.min(g.n - 1, Math.floor(S.phaseT / ROLL_DAUER * (g.n - 1)));
    // Berührungen auslösen, sobald die Kugel dort ist
    r.ergebnis.stangen.forEach(s => {
      if (!s.gezeigt && r.i >= s.i) { s.gezeigt = true; S.blitze.push({ t0: S.zeit, x: S.stangen[s.j].x, y: S.stangen[s.j].basis + STANGE_H, gruen: true }); R_.ton('beruehrt'); }
    });
    r.ergebnis.luecken.forEach(l => {
      if (!l.gezeigt && r.i >= l.i) {
        l.gezeigt = true; R_.ton('luecke'); R_.vibrieren(60);
        const [sx, sy] = bild(l.x, l.y);
        for (let k = 0; k < (ruhig() ? 0 : 18); k++) {
          const w = -Math.PI * (0.1 + Math.random() * 0.8), v = 120 + Math.random() * 200;
          S.funken.push({ x: sx, y: sy, vx: Math.cos(w) * v, vy: Math.sin(w) * v, leben: 0.4 + Math.random() * 0.4 });
        }
        figur('entsetzt', 1.5);
      }
    });
    if (S.phaseT >= ROLL_DAUER) {
      if (kugelTon) { kugelTon.aus(); kugelTon = null; }
      const lu = r.ergebnis.luecken.length, extra = Math.max(0, S.stangen.length - g.minimum), roh = punkteFuer(g, S.stangen.length, lu);
      const p = Math.round(roh * zeitFaktor(S.uhr));
      S.ergebnisse.push({ punkte: p, luecken: lu, extra, zeitabzug: p < roh, sekunden: +S.uhr.toFixed(1) });
      S.punkte += p;
      r.punkte = p;
      if (!lu) { R_.ton('lueckenlos'); figur('daumen', 1.4, true); }
      S.phase = 'ergebnis'; S.phaseT = 0;
      anzeigen();
    }
  }
  function rollenStarten() {
    S.hinweis = false;
    S.roll = { i: 0, ergebnis: pruefen(geb(), S.stangen) };
    S.phase = 'rollen'; S.phaseT = 0;
    R_.ton('setzen');
  }
  function weiter() {
    if (S.nr >= ANZAHL - 1) { S.phase = 'fertig'; return endbild(); }
    S.nr++; S.stangen = []; S.roll = null; S.phase = 'herein'; S.phaseT = 0;
    ansicht(); anzeigen();
  }
  function zeitAbgelaufen() {
    S.phase = 'fertig'; S.zeitAus = true;
    figur('entsetzt', 3);
    const geprueft = S.ergebnisse.length;
    R_.ende(0, { ueberschrift: 'Zeit abgelaufen', stempel: { text: 'MÄNGEL', art: 'schlecht' }, figur: POSEN.entsetzt, verzoegerung: 700,
      felder: [['Gebäude geprüft', geprueft + ' von ' + ANZAHL], ['Zeit abgelaufen', 'bei Gebäude ' + (geprueft + 1)]] });
  }
  function figur(pose, dauer, hupf) { S.figur.pose = pose; S.figur.bis = S.zeit + dauer; if (hupf) S.figur.hupf = S.zeit; }

  function bewertung(p) {
    if (p >= 900) return ['Lückenlos geplant', 'GEPRÜFT', 'gut', 'jubel'];
    if (p >= 800) return ['Sauber geschützt', 'GEPRÜFT', 'gut', 'jubel'];
    if (p >= 700) return ['Gut abgedeckt', 'GEPRÜFT', 'gut', 'daumen'];
    if (p >= 550) return ['Lückenhaft', 'MIT MÄNGELN', 'mittel', 'daumen'];
    return ['Nachplanen nötig', 'MÄNGEL', 'schlecht', 'entsetzt'];
  }
  function endbild() {
    const punkte = Math.max(1, Math.min(1000, S.punkte));
    const [titel, stempel, art, pose] = bewertung(punkte);
    const lueckenlos = S.ergebnisse.filter(e => !e.luecken).length, extra = S.ergebnisse.reduce((a, e) => a + e.extra, 0);
    const luecken = S.ergebnisse.reduce((a, e) => a + e.luecken, 0);
    const felder = [['Gebäude lückenlos', lueckenlos + ' von ' + ANZAHL]];
    if (extra) felder.push(['Stangen zu viel', String(extra)]);
    if (luecken) felder.push(['Lücken', String(luecken)]);
    R_.ende(punkte, { ueberschrift: titel, felder, stempel: { text: stempel, art }, figur: POSEN[pose], verzoegerung: 400 });
  }
  function testEnde() {
    if (TEST.ende === 'zeit') { S.ergebnisse = [{ punkte: 200, luecken: 0, extra: 0 }, { punkte: 140, luecken: 1, extra: 0 }]; S.nr = 2; return zeitAbgelaufen(); }
    const p = Math.max(1, Math.min(1000, +TEST.ende));
    S.ergebnisse = S.folge.map((g, i) => {
      const anteil = p / 1000, voll = i < Math.round(anteil * 5 - 0.2);
      return { punkte: 0, luecken: voll ? 0 : 1 + (i % 2), extra: i === 0 ? 1 : 0 };
    });
    S.punkte = p;
    endbild();
  }

  // ---------- Eingabe ----------
  const knopfGetroffen = (x, y) => { const k = L.knopf; return x >= k.x - 6 && x <= k.x + k.w + 6 && y >= k.y - 6 && y <= k.y + k.h + 6; };
  function runter(x, y) {
    if (!L) return;
    S.klicks.push({ x, y, t0: S.zeit });
    if (S.phase === 'ergebnis' && S.phaseT > 0.3) {
      if (knopfGetroffen(x, y)) { R_.ton('klick'); weiter(); }
      return;
    }
    if (S.phase !== 'setzen') return;
    if (knopfGetroffen(x, y)) { rollenStarten(); return; }
    const g = geb(), [wx, wy] = welt(x, y), k = S.k;
    // Abstand zur nächsten Stange (Strecke Fuß–Spitze) in Bildschirm-Pixeln
    const zuStange = s => {
      const [bx, by] = bild(s.x, s.basis), ty = by - STANGE_H * k, cy = Math.max(ty, Math.min(by, y));
      return Math.hypot(bx - x, cy - y);
    };
    let nah = -1, dS = Infinity;
    S.stangen.forEach((s, i) => { const d = zuStange(s); if (d < dS) { dS = d; nah = i; } });
    // Rastpunkt: liegt die Tippstelle waagrecht höchstens FANG Welt-Pixel neben einer Ecke, rastet die Stange dort ein
    // (dieselbe Regel nutzt das Skript für die Mindestzahl – Plätze näher als FANG an einer Ecke sind sonst nicht erreichbar)
    let ziel = null, dP = Infinity;
    g.rast.forEach(([rx, ry]) => {
      if (Math.abs(wx - rx) > FANG || S.stangen.some(s => s.x === rx)) return;
      if (wy > ry + 70 / k || wy < -10 / k) return;
      const [sx, sy] = bild(rx, ry), d = Math.hypot(sx - x, sy - y);
      if (d < dP) { dP = d; ziel = [rx, ry]; }
    });
    // vorhandene Stange antippen = entfernen – außer ein freier Rastpunkt liegt näher (z. B. zwei Ecken eines schmalen Schornsteins)
    if (nah >= 0 && dS <= 22 && dS <= dP) { S.stangen.splice(nah, 1); R_.ton('entfernen'); return; }
    // neue Stange: am Rastpunkt (Ecken, Aufbauten, Spitzen), sonst frei auf der Dachkontur
    if (wx < -24 / k || wx > g.breite + 24 / k || wy < -10 / k) return;
    if (ziel == null) {
      const fx = Math.max(0, Math.min(g.breite, Math.round(wx / RASTER) * RASTER));
      if (wy > profil(g.kontur, fx) + 70 / k) return;   // zu weit über dem Dach
      if (g.rast.some(([rx]) => Math.abs(fx - rx) <= FANG)) return;   // Ecke daneben ist schon belegt
      ziel = [fx, profil(g.kontur, fx)];
    }
    if (S.stangen.some(s => Math.abs(s.x - ziel[0]) < 2)) return;
    if (S.stangen.length >= hoechst()) { S.voll = S.zeit; R_.ton('fehler'); return; }
    S.stangen.push({ x: ziel[0], basis: ziel[1], t0: S.zeit });
    S.hinweis = false;
    R_.ton('setzen');
  }

  // ---------- Zeichnen ----------
  function zeichne(g, b, h, zustand, dt) {
    if (!L || b !== B || h !== H) groesse(b, h);
    if (!S) { neu(); ansicht(); }
    const ruh = ruhig(), t = S.zeit;
    // Himmel und Ebene
    g.fillStyle = '#2b2430'; g.fillRect(0, 0, B, H);
    if (bilder.himmel) g.drawImage(bilder.himmel, L.bx, L.by, HIMMEL_BILD.b * L.s, HIMMEL_BILD.h * L.s);
    const unten = L.by + HIMMEL_BILD.h * L.s;
    if (unten < H) {   // unter dem Bild: Ebene weiterführen
      const v = g.createLinearGradient(0, unten - 2, 0, H); v.addColorStop(0, '#2c2832'); v.addColorStop(1, '#1d1a21');
      g.fillStyle = v; g.fillRect(0, unten - 1, B, H - unten + 1);
    }
    if (zustand !== 'start') himmelZeichnen(g, t, ruh);
    g.fillStyle = 'rgba(10,8,20,.18)'; g.fillRect(0, 0, B, H);
    if (zustand === 'start') return;
    const gb = geb(), k = S.k;
    // Gebäude
    const img = bilder['g' + S.folge[S.nr]];
    if (img) { const [x0, y0] = bild(-gb.x0, gb.boden); g.drawImage(img, x0, y0, gb.b * k, gb.h * k); }
    // Lücken-Marken (bleibend, sobald die Kugel dort war)
    const r = S.roll;
    if (r) r.ergebnis.luecken.forEach(l => {
      if (!l.gezeigt) return;
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      const pts = l.punkte.map(p => bild(p[0], p[1]));
      [[10, 'rgba(255,60,40,.35)'], [4, '#ff4a35']].forEach(([w, f]) => {
        g.lineWidth = w; g.strokeStyle = f; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        pts.forEach(p => g.lineTo(p[0], p[1])); if (pts.length === 1) g.lineTo(pts[0][0] + 0.1, pts[0][1]); g.stroke();
      });
      g.restore();
      // nach dem Rollen: kleine rote Markierung bleibt bis „Weiter“ (Spielertest 24.10.2026)
      if (S.phase === 'ergebnis') {
        const [mx, my] = bild(l.x, l.y), pu = ruhig() ? 0.5 : 0.5 + 0.5 * Math.sin(S.zeit * 2 * Math.PI / 1.2), rr = 9 + 3 * pu;
        g.save(); g.shadowColor = 'rgba(255,60,40,.8)'; g.shadowBlur = 8;
        g.strokeStyle = '#ff4a35'; g.lineWidth = 2.5; g.beginPath(); g.arc(mx, my, rr, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#ff4a35'; g.beginPath(); g.arc(mx, my, 3.5, 0, Math.PI * 2); g.fill(); g.restore();
      }
    });
    // Mindestlösung (Testhilfe #loesung): Umrisse
    if (TEST.loesung && S.phase === 'setzen') gb.loesung.forEach(([x, y]) => {
      const [sx, sy] = bild(x, y), hh = STANGE_H * k;
      g.save(); g.setLineDash([4, 4]); g.strokeStyle = 'rgba(120,255,160,.9)'; g.lineWidth = 2;
      g.strokeRect(sx - 4, sy - hh, 8, hh); g.restore();
    });
    // Stangen
    S.stangen.forEach(s => stangeZeichnen(g, gb, s, k));
    // Hinweis beim ersten Gebäude: pulsierender Punkt auf dem Dach + kurzer Text
    if (S.hinweis && S.nr === 0 && S.phase === 'setzen') hinweisZeichnen(g, gb, t, ruh);
    // Kugel
    if (r && (S.phase === 'rollen' || S.phase === 'ergebnis')) kugelZeichnen(g, gb, r, k);
    // Aufleuchten an Stangenspitzen (grün) und Funken bei Lücken
    S.blitze.forEach(bl => {
      const [sx, sy] = bild(bl.x, bl.y), a = 1 - (t - bl.t0) / 0.8, rr = Math.max(14, 40 * k);
      g.save(); g.globalCompositeOperation = 'lighter';
      const rg = g.createRadialGradient(sx, sy, 0, sx, sy, rr);
      rg.addColorStop(0, `rgba(170,255,190,${0.9 * a})`); rg.addColorStop(1, 'rgba(60,220,110,0)');
      g.fillStyle = rg; g.fillRect(sx - rr, sy - rr, 2 * rr, 2 * rr); g.restore();
    });
    g.save(); g.globalCompositeOperation = 'lighter';
    S.funken.forEach(f => { g.fillStyle = `rgba(255,${120 + Math.round(80 * f.leben)},80,${Math.min(1, f.leben * 2)})`; g.fillRect(f.x - 1.5, f.y - 1.5, 3, 3); });
    g.restore();
    regen(g, dt, ruh);
    figurZeichnen(g, zustand);
    stangenZeile(g);
    if (S.phase === 'setzen') countdownZeichnen(g, ruh);
    if (S.phase === 'setzen') knopf(g, 'Kugel rollen', t);
    if (S.phase === 'ergebnis') ergebnisZeichnen(g, t);
    klicksZeichnen(g);
    g.canvas.style.cursor = zustand === 'spiel' ? 'pointer' : '';
  }
  function stangeZeichnen(g, gb, s, k) {
    const basis = s.basis, [sx, sy] = bild(s.x, basis), hh = STANGE_H * k, w = Math.max(2.6, 4.5 * k);
    const neu = Math.min(1, (S.zeit - s.t0) / 0.25);
    g.save();
    g.translate(sx, sy); g.scale(1, 0.6 + 0.4 * neu);
    g.fillStyle = '#4a4d52'; g.fillRect(-w * 2.2, -w * 1.4, w * 4.4, w * 1.4);              // Fuß
    const v = g.createLinearGradient(-w / 2, 0, w / 2, 0); v.addColorStop(0, '#8a9097'); v.addColorStop(0.5, '#e8edf2'); v.addColorStop(1, '#7c838a');
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(-w / 2 - 1, -hh - 1, w + 2, hh + 1);              // dunkle Kante (vor hellem Himmel)
    g.fillStyle = v; g.fillRect(-w / 2, -hh, w, hh);                                          // Stange
    g.beginPath(); g.moveTo(-w / 2, -hh); g.lineTo(0, -hh - w * 2.2); g.lineTo(w / 2, -hh); g.fill();   // Spitze
    g.restore();
  }
  function kugelZeichnen(g, gb, r, k) {
    const i = r.i, cxw = gb.xa + i, cyw = r.ergebnis.env[i], [cx, cy] = bild(cxw, cyw), rr = KUGEL_R * k;
    const a = S.phase === 'ergebnis' ? Math.max(0, 1 - S.phaseT / 0.6) : Math.min(1, S.phaseT / 0.3);
    if (a <= 0) return;
    g.save(); g.globalAlpha = a;
    const f = g.createRadialGradient(cx, cy, rr * 0.2, cx, cy, rr);
    f.addColorStop(0, 'rgba(150,190,255,.06)'); f.addColorStop(0.85, 'rgba(160,200,255,.14)'); f.addColorStop(1, 'rgba(200,225,255,.28)');
    g.fillStyle = f; g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(150,200,255,.25)'; g.lineWidth = 10; g.stroke();
    g.strokeStyle = 'rgba(220,240,255,.85)'; g.lineWidth = 2; g.stroke();
    g.restore();
  }
  function hinweisZeichnen(g, gb, t, ruh) {
    const [x, y0] = gb.loesung[0], [sx, sy] = bild(x, y0), p = ruh ? 0.5 : 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 1.1);
    g.save();
    g.fillStyle = `rgba(15,156,216,${0.35 + 0.4 * p})`; g.beginPath(); g.arc(sx, sy, 8 + 6 * p, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(sx, sy, 6, 0, Math.PI * 2); g.stroke();
    const text = 'Tippe aufs Dach: Fangstangen setzen';   // Mehrzahl (MZ, 23.10.2026)
    g.font = '700 14px "Titillium Web", "Segoe UI", system-ui, sans-serif';
    const tw = g.measureText(text).width + 22, tx = Math.max(10, Math.min(B - tw - 10, sx - 12)), ty = Math.max(78, sy - STANGE_H * S.k - 54);   // unter dem Countdown (y 52–66)
    g.fillStyle = 'rgba(255,255,255,.95)'; rund(g, tx, ty, tw, 30, 15); g.fill();
    g.fillStyle = '#191919'; g.textBaseline = 'middle'; g.fillText(text, tx + 11, ty + 15);
    g.restore();
  }
  // Countdown oben mittig unter der Anzeige: Balken + Sekunden; ab 20s bernstein und dezent pulsierend, letzte 5s rot
  function countdownZeichnen(g, ruh) {
    const rest = Math.max(0, ZEIT.gesamt - S.uhr), w = Math.min(260, B * 0.42), x = (B - w) / 2, y = 54, h = 10;
    const farbe = S.uhr >= ZEIT.gesamt - ZEIT.warnung ? '#ff4a35' : S.uhr >= ZEIT.voll ? '#ffb300' : '#ffffff';
    const puls = S.uhr >= ZEIT.voll && !ruh ? 0.5 + 0.5 * Math.sin(S.zeit * Math.PI * 2 / (S.uhr >= ZEIT.gesamt - ZEIT.warnung ? 0.5 : 1)) : 0;
    g.save();
    g.fillStyle = 'rgba(0,0,0,.45)'; rund(g, x - 2, y - 2, w + 4, h + 4, (h + 4) / 2); g.fill();
    if (puls) { g.shadowColor = farbe; g.shadowBlur = 6 + 8 * puls; }
    g.fillStyle = farbe; rund(g, x, y, Math.max(h, w * rest / ZEIT.gesamt), h, h / 2); g.fill();
    g.shadowBlur = 0;
    g.font = '700 15px "Titillium Web", "Segoe UI", system-ui, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 4; g.fillStyle = farbe;
    g.fillText(Math.ceil(rest) + 's', x + w + 10, y + h / 2 + 1);
    g.restore();
  }
  function stangenZeile(g) {
    const voll = S.voll && S.zeit - S.voll < 0.6;
    g.save();
    g.font = '700 13px "Titillium Web", "Segoe UI", system-ui, sans-serif'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 4;
    g.fillStyle = voll ? '#ffb4a8' : '#fff';
    g.fillText('Stangen ' + S.stangen.length + '/' + hoechst(), 12 + (voll ? Math.sin(S.zeit * 50) * 2 : 0), 60);
    g.restore();
  }
  function knopf(g, text, t) {
    const k = L.knopf;
    g.save();
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 12; g.shadowOffsetY = 4;
    g.fillStyle = '#0F9CD8'; rund(g, k.x, k.y, k.w, k.h, k.h / 2); g.fill();
    g.shadowColor = 'transparent';
    g.fillStyle = '#fff'; g.font = `700 ${Math.round(k.h * 0.4)}px "Titillium Web", "Segoe UI", system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, k.x + k.w / 2, k.y + k.h / 2 + 1);
    g.restore();
  }
  // Ergebnis des Gebäudes auf einem kleinen Protokoll-Zettel (weiß, Linie in Gelb), darunter „Weiter“
  function ergebnisZeichnen(g, t) {
    const e = S.ergebnisse[S.ergebnisse.length - 1], ein = Math.min(1, S.phaseT / 0.35);
    // „2 Lücken – 80 Punkte“ (Spielertest 24.10.2026: „− 80“ las sich wie ein Abzug); geschütztes Leerzeichen vor „–“
    const z1 = (e.luecken ? (e.luecken === 1 ? '1 Lücke' : e.luecken + ' Lücken') : 'Lückenlos') + ' – ' + e.punkte + (e.punkte === 1 ? ' Punkt' : ' Punkte') + (e.zeitabzug ? ' (Zeitabzug)' : '');
    const z2 = e.extra ? (e.extra === 1 ? '1 Stange zu viel' : e.extra + ' Stangen zu viel') : '';
    // Hochformat: im unteren Streifen über dem Knopf, rechts von der Figur; Querformat: links neben „Weiter“, rechts von der Figur
    const kb = L.knopf;
    let w = kb.w, hh = z2 ? 70 : 52, x = kb.x, y = kb.y - hh - 8;
    if (!L.hoch) {
      w = Math.min(240, kb.x - L.figR - 26); x = kb.x - 14 - w; y = kb.y + kb.h / 2 - hh / 2;
      if (w < 150) { w = Math.min(300, B - 40); x = (B - w) / 2; y = 78; }   // sehr schmal: oben
    }
    const z1y = z2 ? hh * 0.42 : hh * 0.56, z2y = hh * 0.78;
    g.save(); g.globalAlpha = ein; g.translate(0, (1 - ein) * -14);
    g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
    g.fillStyle = '#fff'; rund(g, x, y, w, hh, 6); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = '#FFD500'; g.fillRect(x + 14, y + 10, w - 28, 2);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = e.luecken ? '#c62828' : '#2e9a44'; g.font = `700 ${e.zeitabzug && w < 260 ? 17 : 22}px "Titillium Web", "Segoe UI", system-ui, sans-serif`;
    g.fillText(z1, x + w / 2, y + z1y);
    if (z2) { g.fillStyle = '#575757'; g.font = '600 14px "Titillium Web", "Segoe UI", system-ui, sans-serif'; g.fillText(z2, x + w / 2, y + z2y); }
    g.restore();
    if (S.phaseT > 0.3) knopf(g, 'Weiter', t);
  }
  function figurZeichnen(g, zustand) {
    const f = S.figur, pose = zustand === 'spiel' && S.zeit < f.bis ? f.pose : 'ruhe';
    const img = bilder[pose];
    if (!img) return;
    const hh = L.figurH * POSEN[pose].hoehe, w = hh * img.naturalWidth / img.naturalHeight;
    let x = 8, y = H - hh - 6;
    const seit = S.zeit - f.hupf;
    if (seit < 0.45 && !ruhig()) y -= Math.sin(seit / 0.45 * Math.PI) * hh * 0.1;
    if (pose === 'entsetzt' && !ruhig() && S.zeit < f.bis) x += Math.sin(S.zeit * 60) * 2 * Math.max(0, f.bis - S.zeit - 0.9);
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
  // Lebender Abendhimmel: zwei Wolkenschichten ziehen nach links (vorn brodelnd: Höhe ±3 % in 9s, Breite ±1,5 % in 13s),
  // der orange Glanz über dem Horizont pulsiert langsam (ca. ±6 %, Takt 10s), selten ein schwaches, fernes Wetterleuchten
  // im Regen rechts (ohne Ton, nie während die Kugel rollt). Gebäude, Boden und Kugel bleiben ruhig; bei „Bewegung
  // reduzieren“ alles still.
  function himmelZeichnen(g, t, ruh) {
    if (!himmel || ruh) return;
    const w = HIMMEL_BILD.b * L.s, unten = L.by + HIMMEL.weg * L.s;
    HIMMEL.schichten.forEach((sch, i) => {
      const hoehe = i ? 1 + 0.03 * Math.sin(t * 2 * Math.PI / 9) : 1, breite = i ? 1 + 0.015 * Math.sin(t * 2 * Math.PI / 13 + 1) : 1;
      const bw = 2 * w * sch.groesse * breite, bh = HIMMEL.weg * L.s * sch.groesse * hoehe;
      const weg = ((sch.start * bw + t * sch.tempo * w / 60) % bw + bw) % bw;
      g.save(); g.globalAlpha = sch.deckkraft;
      for (let x = L.bx - weg - bw; x < B; x += bw) if (x + bw > 0) g.drawImage(himmel, x, unten - bh, bw, bh);
      g.restore();
    });
    // Horizont-Glanz pulsiert (nur im Himmel, läuft zum Horizont hin weich aus)
    const glanz = 0.07 + 0.06 * Math.sin(t * 2 * Math.PI / 10);
    const gh = L.gy * 0.45, v = g.createLinearGradient(0, L.gy - gh, 0, L.gy);
    v.addColorStop(0, 'rgba(255,120,40,0)'); v.addColorStop(0.7, `rgba(255,130,40,${glanz})`); v.addColorStop(1, `rgba(255,150,60,${glanz * 0.6})`);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = v; g.fillRect(0, L.gy - gh, B, gh); g.restore();
    // fernes Wetterleuchten im Regen rechts: alle 8–14s, zwei schwache Pulse
    if (S.wlUm == null) S.wlUm = t + 3 + Math.random() * 4;
    if (!S.wl && t >= S.wlUm && S.phase !== 'rollen') {
      S.wlUm = t + 8 + Math.random() * 6;
      const xr = L.bx + (0.76 + Math.random() * 0.14) * w;
      S.wl = { t0: t, x: Math.max(B * 0.6, Math.min(B * 0.95, xr)), y: L.gy * (0.45 + Math.random() * 0.15) };
    }
    if (S.wl) {
      const p = t - S.wl.t0;
      if (p > 1.2 || S.phase === 'rollen') S.wl = null;
      else {
        const a = 0.2 * Math.max(Math.exp(-p * 7), p > 0.35 ? Math.exp(-(p - 0.35) * 6) * 0.8 : 0), r = L.kurz * 0.4;
        const rg = g.createRadialGradient(S.wl.x, S.wl.y, 0, S.wl.x, S.wl.y, r);
        rg.addColorStop(0, `rgba(255,220,240,${a})`); rg.addColorStop(1, 'rgba(200,150,255,0)');
        g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg; g.fillRect(S.wl.x - r, S.wl.y - r, 2 * r, 2 * r); g.restore();
      }
    }
  }
  function regen(g, dt, ruh) {
    if (ruh) return;
    const n = Math.round(Math.min(60, B * H / 14000));
    while (S.regen.length < n) S.regen.push({ x: Math.random() * B, y: Math.random() * H, v: 650 + Math.random() * 350 });
    g.save(); g.strokeStyle = 'rgba(230,200,220,.12)'; g.lineWidth = 1; g.beginPath();
    S.regen.forEach(r => {
      r.y += r.v * dt; r.x -= r.v * dt * 0.12;
      if (r.y > H) { r.y = -20; r.x = Math.random() * (B + 40); }
      g.moveTo(r.x, r.y); g.lineTo(r.x + 2.2, r.y - 15);
    });
    g.stroke(); g.restore();
  }
  function rund(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  // ---------- Anmeldung ----------
  R_.spiel({
    id: 'blitzkugel',
    wertung: 'hoch',
    format: p => p.toLocaleString('de-DE') + ' Punkte',
    hoechst: 1000,
    bereich: 'Blitzschutz',
    hintergrund: { bild: 'bilder/himmel.webp', position: '50% 70%' },
    figur: POSEN.daumen,
    texte: {
      titel: 'Blitzkugel',
      untertitel: 'Planst du den Blitzschutz lückenlos?',
      anleitung: 'Setze Fangstangen aufs Dach. Dann rollt die Blitzkugel darüber: Berührt sie nur die Stangen, ist das Gebäude geschützt. Jede Berührung am Gebäude gilt als Lücke. Je weniger Stangen, desto mehr Punkte. Du hast 30s je Gebäude – ab 20s gibt es weniger. Zeit abgelaufen? Ende!',   // MZ, 23.10.2026
    },
    // Klänge (Sound Artist, 23.10.2026): Abstufung der Lieferung bleibt (Dateien nicht einzeln normalisiert)
    klaenge: {
      gewitter: { datei: 'klaenge/gewitter.mp3', proben: 529200, pegel: 0.7 },   // ohne Regen, fast nur Bass: Lautheit auf Fangstange abgeglichen
      setzen: { datei: 'klaenge/setzen.mp3', proben: 3748, pegel: 0.9 },
      entfernen: { datei: 'klaenge/entfernen.mp3', proben: 2315, pegel: 0.9 },
      kugel: { datei: 'klaenge/kugel.mp3', proben: 88200, pegel: 0.2 },
      beruehrt: { datei: 'klaenge/beruehrt.mp3', proben: 7056, pegel: 0.9 },
      luecke: { datei: 'klaenge/luecke.mp3', proben: 13230, pegel: 0.9 },
      lueckenlos: { datei: 'klaenge/lueckenlos.mp3', proben: 20947, pegel: 0.9 },
    },
    schleife: 'gewitter',
    neu, schritt, zeichne, runter, groesse,
  });

  // Testhilfe (nur lesen; Bildschirm-Lagen zum Antippen)
  window.__blitzkugel = {
    get zustand() { return S && { nr: S.nr, phase: S.phase, phaseT: +S.phaseT.toFixed(2), stangen: S.stangen.map(s => s.x), hoechst: hoechst(), punkte: S.punkte,
      stangenGenau: S.stangen.map(s => [s.x, s.basis]), ergebnisse: S.ergebnisse, luecken: S.roll ? S.roll.ergebnis.luecken.length : null, uhr: +S.uhr.toFixed(2) }; },
    get knopf() { const k = L.knopf; return [Math.round(k.x + k.w / 2), Math.round(k.y + k.h / 2)]; },
    lage(x, y) { const g = geb(); return bild(x, y != null ? y : profil(g.kontur, x)).map(Math.round); },
    get loesung() { return geb().loesung; },
    get rast() { return geb().rast; },
    pruefen(nr, xs) { const g = POOL.find(p => p.nr === nr); const e = pruefen(g, xs.map(q => Array.isArray(q) ? { x: q[0], basis: q[1] } : { x: q })); return { luecken: e.luecken.length, stangenBeruehrt: e.stangen.length }; },
    minima: POOL.map(g => g.minimum), get folge() { return S && S.folge.map(i => POOL[i].nr); },
  };
})();
