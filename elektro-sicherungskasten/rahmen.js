// Rahmen für alle Mini-Games: Spielfläche, Start- und Endbild, Logo, Kundenfarben, Ton, Vollbild, Bestwert.
// Die Kundendaten stehen in kunde/kunde.js (window.KUNDE). Jedes Spiel meldet sich mit Rahmen.spiel({...}) an.
// Diese Datei nur in gemeinsam/ bearbeiten – aktualisieren.py kopiert sie in alle Spiele.
(function () {
  'use strict';

  const K = window.KUNDE || {};
  const farben = Object.assign({ haupt: '#d32f2f', akzent: '#ffb300', dunkel: '#151922', hell: '#ffffff' }, K.farben);

  // ---------- Farben ----------
  function rgb(hex) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // Text auf einer Farbe: schwarz oder weiß, je nachdem, was besser lesbar ist
  function textFarbe(hex) {
    const [r, g, b] = rgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#111111' : '#ffffff';
  }
  // Farbe aufhellen (f > 0) oder abdunkeln (f < 0), f zwischen -1 und 1
  function toenen(hex, f) {
    const z = f > 0 ? 255 : 0, t = Math.abs(f);
    const [r, g, b] = rgb(hex).map(v => Math.round(v + (z - v) * t));
    return `rgb(${r},${g},${b})`;
  }
  function mitAlpha(hex, a) { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; }

  const wurzel = document.documentElement.style;
  wurzel.setProperty('--haupt', farben.haupt);
  // Schrift auf der Hausfarbe: automatisch schwarz/weiß, außer kunde.js gibt farben.hauptText vor
  // (z. B. Olivgrün, auf dem Weiß zu schwach wäre)
  wurzel.setProperty('--haupt-text', farben.hauptText || textFarbe(farben.haupt));
  wurzel.setProperty('--akzent', farben.akzent);
  wurzel.setProperty('--dunkel', farben.dunkel);
  wurzel.setProperty('--hell', farben.hell);

  // ---------- Logo ----------
  const logo = new Image();
  let logoBereit = false;
  logo.onload = () => { logoBereit = true; };
  logo.src = K.logo || 'kunde/logo.svg';

  // Zweites Logo für helle Flächen im Spiel (z. B. weiße Radnabe), falls der Kunde eins hat (logoAufHell)
  const logoHell = new Image();
  let logoHellBereit = false;
  if (K.logoAufHell) { logoHell.onload = () => { logoHellBereit = true; }; logoHell.src = K.logoAufHell; }

  // Logo in ein Kästchen einpassen (Seitenverhältnis bleibt); aufHell = Fläche ist hell
  function zeichneLogo(g, x, y, w, h, alpha, aufHell) {
    const bild = aufHell && logoHellBereit ? logoHell : logo;
    if (bild === logo && !logoBereit) return;
    if (!bild.naturalWidth) return;
    const f = Math.min(w / bild.naturalWidth, h / bild.naturalHeight);
    const lw = bild.naturalWidth * f, lh = bild.naturalHeight * f;
    g.save();
    if (alpha != null) g.globalAlpha *= alpha;
    g.drawImage(bild, x + (w - lw) / 2, y + (h - lh) / 2, lw, lh);
    g.restore();
  }

  // Gemalte Bilder: grüne Flächen (#00FF00 bzw. kräftiges Grün) in die Kundenfarbe umfärben,
  // Licht und Schatten bleiben erhalten. Gibt eine Leinwand zurück, die wie ein Bild gezeichnet werden kann.
  function umfaerben(img, farbe) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const bild = g.getImageData(0, 0, c.width, c.height), d = bild.data, ziel = rgb(farbe || farben.haupt);
    for (let i = 0; i < d.length; i += 4) {
      const gruen = d[i + 1] - Math.max(d[i], d[i + 2]);
      if (gruen < 16) continue;
      const t = Math.min(1, (gruen - 16) / 36);    // Kanten weich überblenden, auch dunkles Grün ganz erfassen
      const hell = Math.min(1.3, d[i + 1] / 210);    // Licht und Schatten bleiben erhalten
      for (let k = 0; k < 3; k++) d[i + k] += (Math.min(255, ziel[k] * hell) - d[i + k]) * t;
    }
    g.putImageData(bild, 0, 0);
    return c;
  }

  // ---------- Klang ----------
  // Alle Töne werden im Browser erzeugt, es gibt keine Tondateien.
  let ac = null;
  let tonAn = lesen('ton') !== 'aus';
  function audio() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state !== 'running') ac.resume().catch(() => {});
    return ac;
  }
  // Browser geben Ton erst nach einem Tippen frei
  ['pointerup', 'touchend', 'click', 'keydown'].forEach(e =>
    addEventListener(e, () => { if (tonAn) audio(); }, { passive: true }));

  function piep(freq, dauer, art, pegel, bis, start) {
    const a = ac, t = a.currentTime + (start || 0);
    const o = a.createOscillator(), v = a.createGain();
    o.type = art || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (bis) o.frequency.exponentialRampToValueAtTime(bis, t + dauer);
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(pegel || 0.2, t + 0.01);
    v.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(v).connect(a.destination);
    o.start(t); o.stop(t + dauer + 0.02);
  }
  let rauschPuffer = null;
  function rauschen(dauer, filter, freq, pegel, start) {
    const a = ac, t = a.currentTime + (start || 0);
    if (!rauschPuffer) {
      rauschPuffer = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = rauschPuffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const q = a.createBufferSource(); q.buffer = rauschPuffer;
    const f = a.createBiquadFilter(); f.type = filter; f.frequency.value = freq;
    const v = a.createGain();
    v.gain.setValueAtTime(pegel, t);
    v.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    q.connect(f).connect(v).connect(a.destination);
    q.start(t, Math.random() * 0.5); q.stop(t + dauer + 0.02);
  }
  const TOENE = {
    klick: () => piep(880, 0.06, 'sine', 0.15),
    dreh: () => { for (let i = 0; i < 4; i++) rauschen(0.03, 'highpass', 2500, 0.35, i * 0.045); piep(300, 0.12, 'square', 0.04, 600); },
    fehler: () => piep(170, 0.28, 'square', 0.1, 100),
    gut: () => { piep(660, 0.12, 'triangle', 0.2); piep(990, 0.2, 'triangle', 0.2, null, 0.1); },
    sieg: () => [523, 659, 784, 1047].forEach((f, i) => piep(f, i === 3 ? 0.45 : 0.15, 'triangle', 0.2, null, i * 0.12)),
    crash: () => { rauschen(0.5, 'lowpass', 900, 0.8); piep(90, 0.35, 'sawtooth', 0.12, 40); rauschen(0.25, 'highpass', 3000, 0.25, 0.05); },
    wisch: () => rauschen(0.09, 'bandpass', 1800 + Math.random() * 800, 0.12),
    los: () => { piep(440, 0.12, 'square', 0.08); piep(880, 0.25, 'square', 0.08, null, 0.15); },
    motor: () => piep(70, 0.5, 'sawtooth', 0.06, 140),
  };
  // ---------- Aufnahmen ----------
  // Spiele können eigene Tondateien mitbringen (Rahmen.klaenge). Eine Aufnahme ersetzt den erzeugten Ton
  // gleichen Namens; fehlt sie oder lädt sie nicht, bleibt der erzeugte Ton.
  const clips = {}, clipPegel = {};
  function klaenge(liste) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ac) ac = new AC();
    Object.entries(liste).forEach(([name, c]) => {
      clipPegel[name] = c.pegel != null ? c.pegel : 0.5;
      clips[name] = fetch(c.datei)
        .then(r => r.arrayBuffer())
        .then(b => new Promise((ok, nein) => ac.decodeAudioData(b, ok, nein)))
        .then(b => c.proben ? mp3Zuschnitt(b, c.proben) : b)
        .catch(() => null);
      clips[name].then(b => { clips[name + ':fertig'] = b; });
    });
  }
  // MP3 bringt vorn 1105 Proben Stille (bei 22,05 kHz) und hinten Füllstille mit. Manche Browser schneiden sie weg,
  // andere nicht (Chrome nicht). Mit der echten Länge (proben) wird genau auf den Klang zugeschnitten –
  // sonst stocken Dauertöne in der Schleife und kurze Töne kämen 50 ms zu spät.
  function mp3Zuschnitt(b, proben) {
    const RATE = 22050, VORLAUF = 1105;
    const ueber = b.duration * RATE - proben;
    if (ueber < 2) return b;                                  // Browser hat schon zugeschnitten
    const ab = Math.round((ueber >= VORLAUF - 4 ? VORLAUF : 0) / RATE * b.sampleRate);
    const laenge = Math.min(b.length - ab, Math.round(proben / RATE * b.sampleRate));
    const neu = ac.createBuffer(b.numberOfChannels, laenge, b.sampleRate);
    for (let k = 0; k < b.numberOfChannels; k++) neu.getChannelData(k).set(b.getChannelData(k).subarray(ab, ab + laenge));
    return neu;
  }
  // ab = Startpunkt in Sekunden (optional); gibt einen Griff zum vorzeitigen Abbrechen zurück (sonst false)
  function spieleClip(name, ab) {
    const b = clips[name + ':fertig'];
    if (!b) return false;
    const q = ac.createBufferSource(), v = ac.createGain();
    q.buffer = b; v.gain.value = clipPegel[name];
    q.connect(v).connect(ac.destination);
    q.start(0, Math.max(0, Math.min(ab || 0, b.duration - 0.01)));
    return { aus() { try { v.gain.setTargetAtTime(0.0001, ac.currentTime, 0.03); q.stop(ac.currentTime + 0.25); } catch (e) { /* egal */ } } };
  }

  // Hintergrundgeräusch in Endlosschleife (startet mit dem Spiel, endet mit ihm)
  let schleifeName = null, schleifeLaeuft = null;
  async function schleifeStarten() {
    schleifeStoppen();
    if (!schleifeName || !tonAn || !clips[schleifeName]) return;
    const b = await clips[schleifeName];
    if (!b || zustand !== 'spiel' || schleifeLaeuft || !tonAn) return;
    const q = ac.createBufferSource(), v = ac.createGain();
    q.buffer = b; q.loop = true;
    v.gain.setValueAtTime(0.0001, ac.currentTime);
    v.gain.exponentialRampToValueAtTime(clipPegel[schleifeName], ac.currentTime + 0.8);
    q.connect(v).connect(ac.destination);
    q.start(0, Math.random() * b.duration);
    schleifeLaeuft = { q, v };
  }
  function schleifeStoppen() {
    if (!schleifeLaeuft) return;
    const { q, v } = schleifeLaeuft;
    schleifeLaeuft = null;
    try { v.gain.setTargetAtTime(0.0001, ac.currentTime, 0.25); q.stop(ac.currentTime + 1.5); } catch (e) { /* egal */ }
  }

  // Musik im Startbild (Rahmen.spiel({ startMusik: { datei, proben, pegel } }), z. B. die Musik der Sammlungs-Startseite):
  // läuft in Schleife, sobald der Browser Ton erlaubt (erstes Tippen), und endet mit „Los geht's“ (MZ, 21.10.2026)
  // Option startMusik.imSpiel (z. B. 0.45, Sammlung „Akten & Action“, MZ 22.10.2026): die Musik läuft auch im Spiel und im
  // Endbild weiter – bei „Los geht's“ in ca. 1s auf imSpiel × Pegel abgesenkt, im Endbild wieder auf den vollen Pegel.
  // Ohne imSpiel (Autohaus) endet sie wie bisher mit „Los geht's“.
  let startMusikLaeuft = null, startMusikWartet = false;
  const musikImSpiel = () => !!(S && S.startMusik && S.startMusik.imSpiel != null);
  const musikErlaubt = () => zustand === 'start' || musikImSpiel();
  function musikZiel() { const p = clipPegel.startmusik; return zustand === 'spiel' && musikImSpiel() ? p * S.startMusik.imSpiel : p; }
  function musikPegel(dauer) {
    if (!startMusikLaeuft) return;
    const v = startMusikLaeuft.v, t = ac.currentTime;
    v.gain.cancelScheduledValues(t); v.gain.setValueAtTime(Math.max(0.0001, v.gain.value), t);
    v.gain.linearRampToValueAtTime(musikZiel(), t + (dauer != null ? dauer : 1));
  }
  async function startMusikAn() {
    if (!S || !S.startMusik || !musikErlaubt() || !tonAn || startMusikLaeuft || startMusikWartet || !clips.startmusik) return;
    const ua = navigator.userActivation;   // vor dem ersten Tippen nicht versuchen (Browser-Warnung)
    if (ua && !ua.hasBeenActive) return;
    const a = audio();
    if (!a) return;
    startMusikWartet = true;
    const b = await clips.startmusik;
    try { await a.resume(); } catch (e) { /* noch nicht erlaubt */ }
    startMusikWartet = false;
    if (!b || !musikErlaubt() || !tonAn || startMusikLaeuft || a.state !== 'running') return;
    const q = a.createBufferSource(), v = a.createGain();
    q.buffer = b; q.loop = true;
    v.gain.setValueAtTime(0.0001, a.currentTime);
    v.gain.exponentialRampToValueAtTime(musikZiel(), a.currentTime + 1.2);
    q.connect(v).connect(a.destination);
    q.start();
    startMusikLaeuft = { q, v };
  }
  function startMusikAus() {
    if (!startMusikLaeuft) return;
    const { q, v } = startMusikLaeuft;
    startMusikLaeuft = null;
    try { v.gain.setTargetAtTime(0.0001, ac.currentTime, 0.15); q.stop(ac.currentTime + 1); } catch (e) { /* egal */ }
  }
  ['pointerup', 'touchend', 'click', 'keydown'].forEach(e =>
    addEventListener(e, () => { if (tonAn) setTimeout(startMusikAn, 0); }, { passive: true }));

  // Dauertöne (z. B. Motor): laufen in Schleife, das Spiel stellt laufend Lautstärke (0–1) und Tempo ein.
  // Enden mit dem Spiel oder wenn der Ton ausgeschaltet wird.
  const dauertoene = [];
  function dauerton(name) {
    const st = { q: null, v: null };
    const aus = () => {
      if (!st.q) return;
      try { st.v.gain.setTargetAtTime(0.0001, ac.currentTime, 0.15); st.q.stop(ac.currentTime + 1); } catch (e) { /* egal */ }
      st.q = st.v = null;
    };
    const steuer = {
      stellen(pegel, tempo) {
        const b = clips[name + ':fertig'];
        if (!tonAn || zustand !== 'spiel' || !b || !ac || ac.state !== 'running') { aus(); return; }
        if (!st.q) {
          st.q = ac.createBufferSource(); st.v = ac.createGain();
          st.q.buffer = b; st.q.loop = true;
          st.v.gain.value = 0.0001;
          st.q.connect(st.v).connect(ac.destination);
          st.q.start(0, Math.random() * b.duration);
        }
        st.v.gain.setTargetAtTime(Math.max(0.0001, pegel * clipPegel[name]), ac.currentTime, 0.08);
        if (tempo) st.q.playbackRate.setTargetAtTime(tempo, ac.currentTime, 0.12);
      },
      aus,
    };
    dauertoene.push(steuer);
    return steuer;
  }
  function dauertoeneAus() { dauertoene.forEach(d => d.aus()); }

  // Rahmen.ton(name, ab): ab = Startpunkt der Aufnahme in Sekunden (optional, z. B. passend zu einer kürzeren Aufladung).
  // Gibt einen Griff { aus() } zurück, mit dem eine Aufnahme vorzeitig endet (z. B. Aufladen beim Antippen).
  function ton(name, ab) {
    const griff = { g: null, weg: false, aus() { this.weg = true; if (this.g) this.g.aus(); } };
    if (!tonAn) return griff;
    const a = audio();
    if (!a) return griff;
    const spielen = () => { try { if (griff.weg) return; griff.g = spieleClip(name, ab) || null; if (!griff.g && TOENE[name]) TOENE[name](); } catch (e) { /* Ton ist Nebensache */ } };
    if (a.state === 'running') { spielen(); return griff; }
    // Direkt nach dem ersten Tippen ist der Ton oft noch nicht freigegeben (z. B. Countdown beim Spielstart):
    // kurz auf die Freigabe warten, aber nicht nachholen, wenn es zu spät ist
    const seit = performance.now();
    a.resume().then(() => { if (a.state === 'running' && performance.now() - seit < 500) spielen(); }).catch(() => {});
    return griff;
  }

  // Vibration bei Fehlern und Unfällen (nur Android; iPhones erlauben es Webseiten nicht – dort passiert einfach nichts)
  function vibrieren(muster) {
    const ua = navigator.userActivation;   // Browser erlauben Vibration erst nach dem ersten echten Tippen
    if (ua && !ua.hasBeenActive) return;
    try { if (navigator.vibrate) navigator.vibrate(muster); } catch (e) { /* Vibration ist Nebensache */ }
  }

  // ---------- Speicher (Bestwert, Ton an/aus) ----------
  function lesen(k) { try { return localStorage.getItem('mg:' + k); } catch (e) { return null; } }
  function schreiben(k, v) { try { localStorage.setItem('mg:' + k, v); } catch (e) { /* privat / gesperrt */ } }

  // ---------- Seite aufbauen ----------
  const SYM = {
    tonAn: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
    tonAus: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
    voll: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    klein: '<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
    uhr: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/></svg>',
    heim: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>',
  };
  // Zurück zur Startseite mit allen Spielen (nur wenn kunde.js eine startseite nennt)
  const heim = K.startseite ? String(K.startseite).replace(/"/g, '') : '';
  // Stil „Notizzettel“ (kunde.js: stil: 'zettel', Sammlung „Akten & Action“, MZ 20.10.2026): gemaltes Bild bildschirmfüllend,
  // Logo auf eigenem weißen Schild oben links, Texte auf einem schrägen Zettel, Knöpfe unten. Gleiche Klassen wie die Karte,
  // damit Start- und Endbild-Code für beide Stile gilt. Ohne stil bleibt alles wie bisher.
  const zettel = K.stil === 'zettel';
  if (zettel) {
    document.documentElement.classList.add('stil-zettel');
    // Spielname in der Markenfarbe (MZ, 21.10.2026). Auf dem hellen Zettel so weit abdunkeln, dass der Kontrast
    // für große Schrift reicht (mind. 3,2:1 gegen den dunkleren Zettelton #f7efd6); kunde.js kann farben.titel vorgeben.
    const lum = hex => { const [r, g, b] = rgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const papier = lum('#f7efd6');
    let titel = farben.titel || farben.haupt;
    if (!farben.titel) for (let f = 0; f <= 0.8 && (papier + 0.05) / (lum(titel) + 0.05) < 3.2; f += 0.04) {
      titel = '#' + rgb(farben.haupt).map(v => Math.round(v * (1 - f)).toString(16).padStart(2, '0')).join('');
    }
    wurzel.setProperty('--titel-farbe', titel);
  }
  // Stil „Prüfprotokoll“ (kunde.js: stil: 'protokoll', Sammlung „entSPANNUNG“, MZ 23.10.2026): gestaltetes Bild bildschirmfüllend
  // (abgedunkelt), Logo allein auf weißem Schild oben rechts, Texte auf einem Klemmbrett mit Klammer (Kopfzeile „PRÜFPROTOKOLL –
  // <Bereich>“ bzw. „PRÜFERGEBNIS – <Spiel>“ mit Linie in der Hausfarbe), im Endbild ein schräger Stempel je Bewertung, eine
  // Humor-Figur am Rand und Knöpfe unten (Hauptknopf in farben.knopf). Gemeinsamer Aufbau mit dem Zettel-Stil (blatt): Bildpause,
  // Logo-Schild, Knöpfe unten, „⌂ Zum Menü“ – Autohaus (Karte) und „Akten & Action“ (Zettel) bleiben unverändert.
  const protokoll = K.stil === 'protokoll';
  const blatt = zettel || protokoll;
  if (protokoll) {
    document.documentElement.classList.add('stil-protokoll');
    wurzel.setProperty('--titel-farbe', farben.titel || farben.dunkel);
    wurzel.setProperty('--knopf', farben.knopf || farben.haupt);
    wurzel.setProperty('--knopf-text', textFarbe(farben.knopf || farben.haupt));
  }
  const knoepfeStart = `<div class="knoepfe">
        <button class="knopf" id="losKnopf" type="button">Los geht's</button>
        ${heim ? `<a class="knopf zweit" href="${heim}">Zum Menü</a>` : ''}
      </div>`;
  const knoepfeEnde = `<div class="knoepfe">
        <button class="knopf" id="extraKnopf" type="button" hidden></button>
        <a class="knopf" id="kundeKnopf" target="_blank" rel="noopener" hidden></a>
        <button class="knopf zweit" id="nochmalKnopf" type="button">Nochmal spielen</button>
        ${heim ? `<a class="knopf zweit" href="${heim}">Zum Menü</a>` : ''}
      </div>`;
  const schirme = protokoll ? `
    <div class="schirm" id="startSchirm">
      <img class="hintergrund" alt="" hidden><div class="logoebene" aria-hidden="true"></div><div class="abdunkeln" aria-hidden="true"></div>
      <div class="logoschild"><img class="logo" alt=""></div>
      <div class="blatt"><div class="klammer" aria-hidden="true"></div><div class="papier">
        <div class="kopfzeile"><span>Prüfprotokoll</span><span class="bereich"></span></div>
        <h1 class="titel"></h1><p class="unter"></p><p class="anleitung"></p>
        <div class="besttafel" hidden><span class="name">Dein Bestwert</span> <span class="zahl"></span></div>
        <p class="quellen"></p>
      </div></div>
      <div class="figurplatz" aria-hidden="true"><img class="figur" alt="" hidden></div>
      ${knoepfeStart}
    </div>
    <div class="schirm" id="endSchirm" hidden>
      <img class="hintergrund" alt="" hidden><div class="logoebene" aria-hidden="true"></div><div class="abdunkeln" aria-hidden="true"></div>
      <div class="logoschild"><img class="logo" alt=""></div>
      <div class="blatt"><div class="klammer" aria-hidden="true"></div><div class="papier">
        <div class="kopfzeile"><span>Prüfergebnis</span><span class="spielname"></span></div>
        <p class="dachzeile"></p><div class="bewertung"><h1 class="ueberschrift"></h1><div class="stempel" hidden></div></div><img class="bild" alt="" hidden><div class="wert"></div><p class="vonzeile"></p><p class="bilanzzeile"></p><p class="hinweis"></p>
        <div class="zeit" hidden>${SYM.uhr}<span></span></div>
        <div class="felder"></div>
        <div class="auswertung" hidden><p class="kopf"></p><div class="zeilen"></div></div><p class="text"></p><p class="bestwert"></p>
      </div></div>
      <div class="figurplatz" aria-hidden="true"><img class="figur" alt="" hidden></div>
      ${knoepfeEnde}
    </div>` : zettel ? `
    <div class="schirm" id="startSchirm">
      <img class="hintergrund" alt="" hidden><div class="logoebene" aria-hidden="true"></div>
      <div class="logoschild"><img class="logo" alt=""></div>
      <div class="zettel">
        <h1 class="titel"></h1><p class="unter"></p><p class="anleitung"></p>
        <div class="besttafel" hidden><span class="name">Dein Bestwert:</span> <span class="zahl"></span></div>
        <p class="quellen"></p>
      </div>
      <div class="knoepfe">
        <button class="knopf" id="losKnopf" type="button">Los geht's</button>
        ${heim ? `<a class="knopf zweit" href="${heim}">Zum Menü</a>` : ''}
      </div>
    </div>
    <div class="schirm" id="endSchirm" hidden>
      <img class="hintergrund" alt="" hidden><div class="logoebene" aria-hidden="true"></div>
      <div class="logoschild"><img class="logo" alt=""></div>
      <div class="zettel">
        <p class="dachzeile"></p><h1 class="ueberschrift"></h1><img class="bild" alt="" hidden><div class="wert"></div><p class="vonzeile"></p><p class="bilanzzeile"></p><p class="hinweis"></p>
        <div class="zeit" hidden>${SYM.uhr}<span></span></div>
        <div class="auswertung" hidden><p class="kopf"></p><div class="zeilen"></div></div><p class="text"></p><p class="bestwert"></p>
      </div>
      <div class="knoepfe">
        <button class="knopf" id="extraKnopf" type="button" hidden></button>
        <a class="knopf" id="kundeKnopf" target="_blank" rel="noopener" hidden></a>
        <button class="knopf zweit" id="nochmalKnopf" type="button">Nochmal spielen</button>
        ${heim ? `<a class="knopf zweit" href="${heim}">Zum Menü</a>` : ''}
      </div>
    </div>` : `
    <div class="schirm" id="startSchirm"><div class="karte">
      <img class="logo" alt="">
      <h1 class="titel"></h1><p class="unter"></p><p class="anleitung"></p>
      <div class="besttafel" hidden><div class="name">Dein Bestwert</div><div class="zahl"></div></div>
      <button class="knopf" id="losKnopf" type="button">Los geht's</button>
      ${heim ? `<a class="knopf zweit" href="${heim}">Zum Menü</a>` : ''}
      <p class="quellen"></p>
    </div></div>
    <div class="schirm" id="endSchirm" hidden><div class="karte">
      <img class="logo" alt="">
      <h1 class="ueberschrift"></h1><img class="bild" alt="" hidden><div class="wert"></div><div class="zeit" hidden>${SYM.uhr}<span></span></div>
      <div class="auswertung" hidden><p class="kopf"></p><div class="zeilen"></div></div><p class="bestwert"></p><p class="text"></p>
      <a class="knopf" id="kundeKnopf" target="_blank" rel="noopener" hidden></a>
      <button class="knopf zweit" id="nochmalKnopf" type="button">Nochmal spielen</button>
      ${heim ? `<a class="knopf zweit" href="${heim}">Zum Menü</a>` : ''}
    </div></div>`;
  document.body.insertAdjacentHTML('beforeend', `
    <canvas id="feld"></canvas>
    <div id="anzeige">
      ${heim ? `<a id="heimKnopf" href="${heim}" aria-label="Zum Menü">${SYM.heim}${blatt ? '<span class="lang">Zum Menü</span><span class="kurz">Menü</span>' : ''}</a>` : ''}
      <div class="links"></div><div class="rechts"></div>
      <button id="tonKnopf" type="button" aria-label="Ton an oder aus"></button>
      <button id="vollKnopf" type="button" aria-label="Vollbild"></button>
    </div>${schirme}`);

  const $ = s => document.querySelector(s);
  const feld = $('#feld'), g = feld.getContext('2d');
  // Zettel- und Protokoll-Stil: Logo auf weißem Schild → Logo für helle Flächen
  const schirmLogo = blatt && K.logoAufHell ? K.logoAufHell : logo.src;
  document.querySelectorAll('.schirm .logo').forEach(i => { i.src = schirmLogo; i.alt = K.firma || ''; });
  // Hintergrundbild für Start- oder Endbild im Zettel-Stil (z. B. umgefärbtes gemaltes Bild als Adresse);
  // position = sichtbarer Bildausschnitt beim Zuschneiden (CSS object-position, z. B. '25% 50%'), Standard Mitte
  function schirmBild(welcher, adresse, position) {
    const b = $((welcher === 'ende' ? '#endSchirm' : '#startSchirm') + ' .hintergrund');
    if (!b) return;
    b.hidden = !adresse;
    b.style.objectPosition = position || '';
    if (adresse) b.src = adresse; else b.removeAttribute('src');
    ebeneZeichnen(b.parentNode);
  }

  // ---------- Logo auf Mappen im Bild (nur Zettel-Stil, MZ 23.10.2026) ----------
  // Das Kundenlogo ganz in Weiß (kunde.js logoWeiss, sonst logo als weiße Silhouette) liegt als eigene, scharfe Ebene
  // (.logoebene) über dem Hintergrundbild und ist über die vier Ecken einer Fläche perspektivisch eingepasst
  // (Homographie), als wäre es auf den Mappendeckel gedruckt. Nicht ins Bild eingebrannt (das wurde unscharf): gezeichnet
  // wird in Gerätepixeln mit 4×4-Überabtastung, das Licht der Fläche wird übernommen (heller/dunkler wie der Deckel),
  // Deckkraft 0,9. Die Ebene folgt dem Zuschnitt (object-fit: cover, object-position), der Fenstergröße und der
  // Kamerafahrt der Bildpause (gleiche CSS-Animation; danach wird der Zoom fest in die Zeichnung übernommen, damit
  // nichts vergrößert und weich wird).
  // Anmeldung je Bildadresse: Rahmen.bildFlaechen(adresse, { flaechen: [...], ziel: [x, y] }) – vor schirmBild/ende.
  //   flaeche = { ecken: [hinten-links, hinten-rechts, vorne-rechts, vorne-links] in Pixeln des Bildes,
  //               verhaeltnis: echtes Seitenverhältnis Breite:Tiefe des Deckels, breite: Logobreite als Anteil der
  //               Deckelbreite, mitte: [u, v] Logomitte als Anteil (Standard Mitte) }
  //   Schrift läuft parallel zur Vorderkante (vorne-links → vorne-rechts). Ist das Logo auf dem Schirm schmaler als
  //   40 CSS-Pixel, entfällt es (zu klein zum Lesen).
  //   ziel = Bildpunkt, auf den die Kamerafahrt zoomt (transform-origin), sonst Bildmitte.
  const flaechenListe = new Map();
  function bildFlaechen(adresse, angaben) {
    if (!adresse) return;
    flaechenListe.set(adresse, angaben || null);
    document.querySelectorAll('.schirm').forEach(s => ebeneZeichnen(s));
  }
  const logoWeiss = new Image();
  let logoWeissRand = null;   // sichtbarer Bereich des Logos als Anteil [x0, y0, x1, y1] (durchsichtiger Rand weg)
  if (zettel) {
    logoWeiss.onload = () => {
      if (!logoWeiss.naturalWidth) return;
      logoWeissRand = logoRand(logoWeiss);
      document.querySelectorAll('.schirm').forEach(s => ebeneZeichnen(s, true));
    };
    logoWeiss.src = K.logoWeiss || K.logo || 'kunde/logo.svg';
  }
  function logoRand(img) {
    const w = 600, h = Math.max(1, Math.round(w * img.naturalHeight / img.naturalWidth));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (d[(j * w + i) * 4 + 3] > 8) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
    }
    return x1 < 0 ? [0, 0, 1, 1] : [Math.max(0, x0 - 1) / w, Math.max(0, y0 - 1) / h, Math.min(w, x1 + 2) / w, Math.min(h, y1 + 2) / h];
  }
  function logoSeite() {   // Höhe : Breite des sichtbaren Logos
    const r = logoWeissRand;
    return (r[3] - r[1]) * logoWeiss.naturalHeight / ((r[2] - r[0]) * logoWeiss.naturalWidth);
  }
  // Deckkraft des Logos als Raster, breite Pixel breit (Vektorlogo wird dafür in genau dieser Größe gezeichnet)
  const masken = new Map();
  function logoMaske(breite) {
    breite = Math.min(4096, Math.max(64, Math.ceil(breite / 32) * 32));
    if (masken.has(breite)) return masken.get(breite);
    const r = logoWeissRand, nw = logoWeiss.naturalWidth, nh = logoWeiss.naturalHeight;
    const f = breite / ((r[2] - r[0]) * nw), h = Math.max(1, Math.round(breite * logoSeite()));
    const c = document.createElement('canvas'); c.width = breite; c.height = h;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.drawImage(logoWeiss, -r[0] * nw * f, -r[1] * nh * f, nw * f, nh * f);
    const d = x.getImageData(0, 0, breite, h).data, a = new Float32Array(breite * h);
    for (let k = 0; k < a.length; k++) a[k] = d[k * 4 + 3] / 255;
    const m = { w: breite, h, a };
    if (masken.size > 8) masken.clear();
    masken.set(breite, m);
    return m;
  }
  // Helligkeit des Hintergrundbilds (ein Drittel der Auflösung, dadurch leicht geglättet) – für das Licht auf dem Logo
  const lichtKarten = new WeakMap();
  function lichtKarte(hg) {
    let k = lichtKarten.get(hg);
    if (k && k.src === hg.src) return k;
    const w = Math.max(1, Math.round(hg.naturalWidth / 3)), h = Math.max(1, Math.round(hg.naturalHeight / 3));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(hg, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data, l = new Float32Array(w * h);
    for (let i = 0; i < l.length; i++) l[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    k = { src: hg.src, w, h, f: w / hg.naturalWidth, l, ref: new WeakMap() };
    lichtKarten.set(hg, k);
    return k;
  }
  function lichtWert(k, x, y) {
    const i = Math.min(k.w - 1, Math.max(0, Math.round(x * k.f))), j = Math.min(k.h - 1, Math.max(0, Math.round(y * k.f)));
    return k.l[j * k.w + i];
  }
  // Bezugshelligkeit eines Deckels: 90-%-Wert seiner Fläche (heller Teil = reines Weiß des Logos)
  function lichtBezug(k, f) {
    if (k.ref.has(f)) return k.ref.get(f);
    const e = f.ecken.map(p => [p[0] * k.f, p[1] * k.f]), werte = [];
    const innen = (x, y) => { let s = 0; for (let i = 0; i < 4; i++) { const [ax, ay] = e[i], [bx, by] = e[(i + 1) % 4]; const kr = (bx - ax) * (y - ay) - (by - ay) * (x - ax); if (kr !== 0) { if (s && Math.sign(kr) !== s) return false; s = Math.sign(kr); } } return true; };
    const xs = e.map(p => p[0]), ys = e.map(p => p[1]);
    for (let j = Math.floor(Math.min(...ys)); j <= Math.ceil(Math.max(...ys)); j++) for (let i = Math.floor(Math.min(...xs)); i <= Math.ceil(Math.max(...xs)); i++) {
      if (i >= 0 && j >= 0 && i < k.w && j < k.h && innen(i, j)) werte.push(k.l[j * k.w + i]);
    }
    werte.sort((a, b) => a - b);
    const r = werte.length ? Math.max(1, werte[Math.floor(werte.length * 0.9)]) : 128;
    k.ref.set(f, r);
    return r;
  }
  // Homographie (3×3, zeilenweise) aus vier Punktpaaren von[i] → nach[i]
  function homographie(von, nach) {
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = von[i], [u, v] = nach[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    for (let c = 0; c < 8; c++) {
      let p = c;
      for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
      for (let r = 0; r < 8; r++) {
        if (r === c) continue;
        const m = A[r][c] / A[c][c];
        for (let k = c; k < 8; k++) A[r][k] -= m * A[c][k];
        b[r] -= m * b[c];
      }
    }
    return b.map((v, i) => v / A[i][i]).concat(1);
  }
  function abbilden(h, x, y) { const w = h[6] * x + h[7] * y + h[8]; return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]; }

  // Ebene eines Schirms neu zeichnen (bei neuem Bild, Größe, Zuschnitt, Ende der Kamerafahrt)
  function ebeneZeichnen(schirm, immer) {
    const ebene = schirm && schirm.querySelector && schirm.querySelector('.logoebene'), hg = ebene && schirm.querySelector('.hintergrund');
    if (!ebene || !hg) return;
    const B = ebene.clientWidth, H = ebene.clientHeight;
    if (!B || !H) return;   // Schirm verborgen – gezeichnet wird beim Zeigen (ResizeObserver)
    const adresse = hg.hidden ? '' : hg.getAttribute('src') || '';
    const angaben = adresse && hg.complete && hg.naturalWidth ? flaechenListe.get(adresse) : null;
    if (!angaben) {
      if (ebene.firstChild) ebene.textContent = '';
      hg.style.transformOrigin = ebene.style.transformOrigin = '';
      ebene._stand = null;
      return;
    }
    const iw = hg.naturalWidth, ih = hg.naturalHeight, s = Math.max(B / iw, H / ih);
    const pos = getComputedStyle(hg).objectPosition.split(' ');
    const ver = (v, frei) => v && v.endsWith('px') ? parseFloat(v) : frei * (v && v.endsWith('%') ? parseFloat(v) / 100 : 0.5);
    const ox = ver(pos[0], B - iw * s), oy = ver(pos[1], H - ih * s);
    // Kamerafahrt zielt auf die Mappe (Ursprung des Zooms), für Bild und Ebene gleich
    const ursprung = angaben.ziel ? (ox + angaben.ziel[0] * s).toFixed(1) + 'px ' + (oy + angaben.ziel[1] * s).toFixed(1) + 'px' : '';
    hg.style.transformOrigin = ebene.style.transformOrigin = ursprung;
    // Kamerafahrt beendet (Klasse gebacken): Zoom des Bildes fest in die Zeichnung übernehmen
    let z = 1, zx = 0, zy = 0;
    if (ebene.classList.contains('gebacken')) {
      const st = getComputedStyle(hg), m = st.transform;
      if (m && m.startsWith('matrix(')) {
        const v = m.slice(7, -1).split(',').map(Number), o = st.transformOrigin.split(' ').map(parseFloat);
        z = v[0]; zx = o[0] * (1 - z) + v[4]; zy = o[1] * (1 - z) + v[5];
      }
    }
    const a = z * s, bx = z * ox + zx, by = z * oy + zy;
    // Läuft die Kamerafahrt noch (CSS), zählt für „ganz sichtbar“ schon die Lage am Ende der Fahrt
    const fahrt = schirm.classList.contains('fahrt') && z === 1 && !ruhig() ? {
      z: FAHRT_ZOOM, ox: angaben.ziel ? ox + angaben.ziel[0] * s : B / 2, oy: angaben.ziel ? oy + angaben.ziel[1] * s : H / 2 } : null;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const stand = [adresse.length, adresse.slice(-48), B, H, a, bx, by, dpr, !!logoWeissRand, !!fahrt].join('|');
    if (!immer && ebene._stand === stand) return;
    ebene._stand = stand;
    ebene.textContent = '';
    if (!logoWeissRand) return;
    const licht = lichtKarte(hg);
    (angaben.flaechen || []).forEach(f => flaecheZeichnen(ebene, f, a, bx, by, dpr, B, H, licht, fahrt));
  }

  const FAHRT_ZOOM = 1.05;   // Endgröße der Kamerafahrt (rahmen.css: @keyframes kamerafahrt)
  function flaecheZeichnen(ebene, f, a, bx, by, dpr, B, H, licht, fahrt) {
    const D = 1 / (f.verhaeltnis || 1);   // Deckel: Breite 1, Tiefe D
    const geraet = p => [(a * p[0] + bx) * dpr, (a * p[1] + by) * dpr];   // Bildpixel → Gerätepixel der Ebene
    const deckel = homographie([[0, 0], [1, 0], [1, D], [0, D]], f.ecken.map(geraet));
    const lb = f.breite || 0.66, lh = lb * logoSeite(), mitte = f.mitte || [0.5, 0.5];
    const x0 = mitte[0] - lb / 2, y0 = mitte[1] * D - lh / 2;
    const q = [[x0, y0], [x0 + lb, y0], [x0 + lb, y0 + lh], [x0, y0 + lh]].map(p => abbilden(deckel, p[0], p[1]));
    const breitePx = Math.max(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]), Math.hypot(q[2][0] - q[3][0], q[2][1] - q[3][1]));
    if (breitePx < 40 * dpr) return;
    // Nur ganz sichtbare Logos (ein am Bildrand angeschnittenes Logo wirkt wie ein Fehler) – auch am Ende der Kamerafahrt
    const lagen = [q];
    if (fahrt) lagen.push(q.map(p => [(fahrt.ox + fahrt.z * (p[0] / dpr - fahrt.ox)) * dpr, (fahrt.oy + fahrt.z * (p[1] / dpr - fahrt.oy)) * dpr]));
    if (lagen.some(l => l.some(p => p[0] < -1 || p[1] < -1 || p[0] > B * dpr + 1 || p[1] > H * dpr + 1))) return;
    const xs = q.map(p => p[0]), ys = q.map(p => p[1]);
    const gx0 = Math.max(0, Math.floor(Math.min(...xs)) - 1), gy0 = Math.max(0, Math.floor(Math.min(...ys)) - 1);
    const gx1 = Math.min(Math.ceil(B * dpr), Math.ceil(Math.max(...xs)) + 1), gy1 = Math.min(Math.ceil(H * dpr), Math.ceil(Math.max(...ys)) + 1);
    const bw = gx1 - gx0, bh = gy1 - gy0;
    if (bw <= 0 || bh <= 0) return;
    const M = logoMaske(breitePx * 2), mw = M.w, mh = M.h, ma = M.a;
    const inv = homographie(q, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    const bezug = lichtBezug(licht, f), deckkraft = f.deckkraft || 0.9, N = 4;
    const c = document.createElement('canvas');
    c.width = bw; c.height = bh;
    Object.assign(c.style, { left: gx0 / dpr + 'px', top: gy0 / dpr + 'px', width: bw / dpr + 'px', height: bh / dpr + 'px' });
    const g2 = c.getContext('2d'), bild = g2.createImageData(bw, bh), d = bild.data;
    for (let j = 0; j < bh; j++) {
      for (let i = 0; i < bw; i++) {
        let summe = 0;
        for (let sj = 0; sj < N; sj++) {
          const Y = gy0 + j + (sj + 0.5) / N;
          for (let si = 0; si < N; si++) {
            const X = gx0 + i + (si + 0.5) / N;
            const w = inv[6] * X + inv[7] * Y + inv[8];
            const u = (inv[0] * X + inv[1] * Y + inv[2]) / w, v = (inv[3] * X + inv[4] * Y + inv[5]) / w;
            if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
            // bilinear aus der Logo-Maske
            const mx = u * mw - 0.5, my = v * mh - 0.5, px = Math.floor(mx), py = Math.floor(my), fx = mx - px, fy = my - py;
            const p00 = px >= 0 && py >= 0 ? ma[py * mw + px] : 0, p10 = px + 1 < mw && py >= 0 ? ma[py * mw + px + 1] : 0;
            const p01 = px >= 0 && py + 1 < mh ? ma[(py + 1) * mw + px] : 0, p11 = px + 1 < mw && py + 1 < mh ? ma[(py + 1) * mw + px + 1] : 0;
            summe += (p00 * (1 - fx) + p10 * fx) * (1 - fy) + (p01 * (1 - fx) + p11 * fx) * fy;
          }
        }
        if (summe <= 0) continue;
        const ix = ((gx0 + i + 0.5) / dpr - bx) / a, iy = ((gy0 + j + 0.5) / dpr - by) / a;
        const hell = Math.min(1.1, Math.max(0.5, lichtWert(licht, ix, iy) / bezug));
        const k = (j * bw + i) * 4, ton = Math.min(255, Math.round(245 * hell));
        d[k] = d[k + 1] = d[k + 2] = ton;
        d[k + 3] = Math.round(Math.min(1, summe / (N * N)) * deckkraft * 255);
      }
    }
    g2.putImageData(bild, 0, 0);
    ebene.append(c);
  }
  // Neu zeichnen bei Größe/Zeigen (ResizeObserver), Klassenwechsel (Kamerafahrt an/aus), neuem Bild und Ende der Fahrt
  document.querySelectorAll('.schirm').forEach(schirm => {
    const ebene = schirm.querySelector('.logoebene'), hg = schirm.querySelector('.hintergrund');
    if (!ebene || !hg) return;
    if (window.ResizeObserver) new ResizeObserver(() => ebeneZeichnen(schirm)).observe(ebene);
    else addEventListener('resize', () => ebeneZeichnen(schirm));
    new MutationObserver(() => {
      if (schirm.hidden || !schirm.classList.contains('fahrt')) ebene.classList.remove('gebacken');
      ebeneZeichnen(schirm);
    }).observe(schirm, { attributes: true, attributeFilter: ['class', 'hidden'] });
    ebene.addEventListener('animationend', e => {
      if (e.animationName !== 'kamerafahrt' || schirm.hidden) return;
      ebene.classList.add('gebacken');
      ebeneZeichnen(schirm);
    });
    hg.addEventListener('load', () => ebeneZeichnen(schirm));
  });

  // Bildpause (nur Zettel-Stil, MZ 23.10.2026): Start- und Endbild zeigen zuerst nur das gestaltete Bild mit langsamer
  // Kamerafahrt (Start ca. 1,5s, Ende ca. 1s), dann legt sich der Zettel hinein, die Knöpfe kommen mit. Tippen oder eine
  // Taste überspringt. Start- und Endbild haben die Pause nur einmal je Seitenaufruf (bei „Nochmal“/„Weiter“ startet das
  // Spiel direkt, weitere Endbilder kommen sofort). Die Pause zählt erst, wenn das Bild da ist (höchstens 2,5s warten). Bei „Bewegung reduzieren“ keine Pause.
  let pause = null, endPauseGehabt = false;   // Endbild-Pause nur beim ersten Endbild je Seitenaufruf (MZ, 23.10.2026)
  function ruhig() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function bildpauseEnde() {
    if (!pause) return;
    clearTimeout(pause.uhr);
    pause.hg.removeEventListener('load', pause.bereit);
    pause.schirm.classList.remove('bildpause');
    pause = null;
  }
  function bildpause(schirm, dauer, aufBildWarten) {
    bildpauseEnde();
    schirm.classList.remove('fahrt');
    const hg = schirm.querySelector('.hintergrund');
    if (!blatt || !hg || ruhig() || (hg.hidden && !aufBildWarten)) return;
    const p = pause = { schirm, hg, uhr: 0 };
    p.bereit = () => { if (pause !== p) return; clearTimeout(p.uhr); p.uhr = setTimeout(bildpauseEnde, dauer); };
    schirm.classList.add('bildpause', 'fahrt');
    if (!hg.hidden && hg.complete && hg.naturalWidth) p.bereit();
    else { hg.addEventListener('load', p.bereit); p.uhr = setTimeout(bildpauseEnde, 2500); }
  }
  document.querySelectorAll('.schirm').forEach(s => s.addEventListener('pointerdown', () => { if (pause && pause.schirm === s) bildpauseEnde(); }));
  addEventListener('keydown', () => { if (pause && !pause.schirm.hidden) bildpauseEnde(); });

  const tonKnopf = $('#tonKnopf');
  function tonSymbol() { tonKnopf.innerHTML = tonAn ? SYM.tonAn : SYM.tonAus; }
  tonKnopf.addEventListener('click', () => {
    tonAn = !tonAn; schreiben('ton', tonAn ? 'an' : 'aus'); tonSymbol();
    if (tonAn) { audio(); ton('klick'); if (zustand === 'spiel') schleifeStarten(); startMusikAn(); } else { schleifeStoppen(); dauertoeneAus(); startMusikAus(); }
  });
  tonSymbol();

  // Vollbild gibt es nicht überall (iPhone, eingebettet ohne allow="fullscreen")
  const vollKnopf = $('#vollKnopf');
  const vollGeht = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  if (!vollGeht) vollKnopf.hidden = true;
  function istVoll() { return document.fullscreenElement || document.webkitFullscreenElement; }
  function vollSymbol() { vollKnopf.innerHTML = istVoll() ? SYM.klein : SYM.voll; }
  vollKnopf.addEventListener('click', () => {
    const d = document, el = d.documentElement;
    if (istVoll()) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
  });
  document.addEventListener('fullscreenchange', vollSymbol);
  document.addEventListener('webkitfullscreenchange', vollSymbol);
  vollSymbol();

  // ---------- Spiel ----------
  let S = null;                 // das angemeldete Spiel
  let zustand = 'start';        // start → spiel → ende
  let B = 0, H = 0, dpr = 1;
  let texte = {};

  function zahl(p) { return S.format ? S.format(p) : String(p); }
  function bestKey() { return 'best:' + S.id + ':' + (K.firma || ''); }
  function besser(a, b) { return b == null || (S.wertung === 'niedrig' ? a < b : a > b); }

  function startSchirm() {
    $('#startSchirm .titel').textContent = texte.titel || '';
    $('#startSchirm .unter').textContent = texte.untertitel || '';
    $('#startSchirm .anleitung').textContent = texte.anleitung || '';
    const b = lesen(bestKey());
    // Bestwert als Tafel: Zahl groß, Rest klein („854/1.000 Punkte“). Noch nicht gespielt: bei Punkten 0, bei Zeiten nichts
    const tafel = $('#startSchirm .besttafel'), tz = tafel.querySelector('.zahl');
    tafel.hidden = b == null && S.wertung === 'niedrig';
    if (!tafel.hidden) {
      const text = zahl(b == null ? 0 : +b), lz = text.indexOf(' ');
      tz.textContent = lz < 0 ? text : text.slice(0, lz);
      const e = document.createElement('small');
      e.textContent = S.hoechst ? '/' + zahl(S.hoechst) : (lz < 0 ? '' : ' ' + text.slice(lz + 1));
      tz.append(e);
    }
    $('#startSchirm .quellen').textContent = S.quellen || '';
    if (protokoll) {
      // Kopfzeile „PRÜFPROTOKOLL – <Bereich>“ (Rahmen.spiel({ bereich })), Hintergrund und Humor-Figur des Spiels
      $('#startSchirm .bereich').textContent = S.bereich || '';
      if (S.hintergrund) schirmBild('start', S.hintergrund.bild, S.hintergrund.position);
      figurSetzen('start', S.figur);
    }
    $('#startSchirm').hidden = false;
    $('#endSchirm').hidden = true;
  }

  function starten() {
    bildpauseEnde();
    $('#startSchirm').hidden = true;
    $('#endSchirm').hidden = true;
    audio();
    zustand = 'spiel';
    if (musikImSpiel()) musikPegel(1); else startMusikAus();   // läuft weiter, leiser (imSpiel) – sonst wie bisher aus
    anzeige('', '');
    S.neu && S.neu();
    schleifeStarten();
  }

  function ende(punkte, extra) {
    if (zustand !== 'spiel') return;
    zustand = 'ende';
    musikPegel(1);   // Endbild: Musik (falls sie im Spiel weiterläuft) wieder auf vollen Pegel
    schleifeStoppen();
    dauertoeneAus();
    extra = extra || {};
    const alt = lesen(bestKey());
    // 0 Punkte (z. B. Spiel nach Unfall beendet) zählen nie als Bestwert
    const neu = !(S.wertung !== 'niedrig' && punkte <= 0) && besser(punkte, alt == null ? null : +alt);
    if (neu) schreiben(bestKey(), punkte);
    $('#endSchirm .ueberschrift').textContent = extra.ueberschrift || texte.endeTitel || 'Geschafft';
    // Optional ein Bild im Endbild (extra.bild = Adresse, z. B. Sieger- oder Verlierer-Szene)
    const bild = $('#endSchirm .bild');
    bild.hidden = !extra.bild;
    if (extra.bild) bild.src = extra.bild; else bild.removeAttribute('src');
    // Zahl groß, Einheit klein dahinter („536 Punkte“); darunter optional die Zeit als Plakette.
    // extra.wert ersetzt die Zahl durch einen kurzen Text (z. B. Bilanz bei Abbruch)
    const wert = $('#endSchirm .wert'), text = zahl(punkte), lz = text.indexOf(' ');
    wert.classList.toggle('bilanz', extra.wert != null);
    if (extra.wert != null) wert.textContent = extra.wert;
    else {
      wert.textContent = lz < 0 ? text : text.slice(0, lz);
      if (lz >= 0) { const e = document.createElement('small'); e.textContent = text.slice(lz + 1); wert.append(e); }
    }
    const zeit = $('#endSchirm .zeit');
    zeit.hidden = !extra.zusatz;
    zeit.querySelector('span').textContent = extra.zusatz || '';
    if (blatt) {
      // Zettel (und Protokoll, dort danach protokollEnde): nur die Zahl groß, darunter „von 1.000 Punkten – 84,3s“; Szene als Hintergrund statt im Zettel
      bild.hidden = true;
      schirmBild('ende', extra.bild || '', extra.bildPosition);
      if (extra.wert == null) wert.textContent = lz < 0 ? text : text.slice(0, lz);
      const von = extra.wert == null && S.hoechst ? 'von ' + S.hoechst.toLocaleString('de-DE') + ' Punkten' : '';
      $('#endSchirm .vonzeile').textContent = [von, extra.wert == null ? extra.zusatz : ''].filter(Boolean).join(' – ');
      zeit.hidden = true;
      $('#endSchirm .bilanzzeile').textContent = extra.zeile || '';   // kleine Zusatzzeile unter Punkten/Zeit (z. B. Bilanz)
      $('#endSchirm .dachzeile').textContent = extra.dach || '';      // kleine Zeile über der Bewertung (z. B. „Level 1 – Fristen“)
      $('#endSchirm .hinweis').textContent = extra.hinweis || '';     // hervorgehobener Hinweis (z. B. „Level 2 freigeschaltet“)
    }
    if (protokoll) protokollEnde(punkte, extra, neu, alt, wert, text, lz);
    auswertung(extra.auswertung);
    const bw = $('#endSchirm .bestwert');
    // ohne Ausrufezeichen (MZ, 20.10.2026)
    bw.textContent = neu ? (alt == null ? 'Dein erster Bestwert' : 'Neuer Bestwert') : 'Dein Bestwert: ' + zahl(alt == null ? 0 : +alt);
    if (protokoll) {   // als Zeile des Protokolls: links die Bezeichnung, rechts „854/1.000“
      const b = neu ? punkte : (alt == null ? 0 : +alt), feld = document.createElement('b');
      feld.textContent = b.toLocaleString('de-DE') + (S.hoechst ? '/' + S.hoechst.toLocaleString('de-DE') : '');
      bw.textContent = neu ? (alt == null ? 'Dein erster Bestwert' : 'Neuer Bestwert') : 'Dein Bestwert';
      bw.append(feld);
    }
    bw.classList.toggle('neu', neu);
    $('#endSchirm .text').textContent = extra.text || texte.ende || '';
    const kk = $('#kundeKnopf'), kn = K.knopf || {};
    kk.hidden = !kn.link;
    if (kn.link) { kk.href = kn.link; kk.textContent = kn.text || 'Mehr erfahren'; }
    // extra.nochmalZuerst (z. B. bei Abbruch): „Nochmal spielen“ als Hauptknopf ganz oben, Kundenknopf darunter
    // Protokoll-Stil ohne Kundenknopf: „Nochmal spielen“ ist der Hauptknopf (Vorlage MZ, 23.10.2026)
    const nk = $('#nochmalKnopf'), zuerst = !!extra.nochmalZuerst || (protokoll && !kn.link);
    if (zuerst) kk.before(nk); else nk.before(kk);
    nk.classList.toggle('zweit', !zuerst);
    kk.classList.toggle('zweit', zuerst);
    // extra.extraKnopf = { text, klick } (nur Zettel-Stil): zusätzlicher Hauptknopf ganz oben, z. B. „Weiter zu Level 2“;
    // klick() wird vor dem Start des neuen Spiels aufgerufen
    const xk = $('#extraKnopf');
    if (xk) {
      extraAktion = extra.extraKnopf ? extra.extraKnopf.klick : null;
      xk.hidden = !extra.extraKnopf;
      xk.textContent = extra.extraKnopf ? extra.extraKnopf.text : '';
      if (extra.extraKnopf) { kk.classList.add('zweit'); nk.classList.add('zweit'); }
    }
    setTimeout(() => {
      if (!endPauseGehabt) { endPauseGehabt = true; bildpause($('#endSchirm'), 1000); } else $('#endSchirm').classList.remove('fahrt');
      $('#endSchirm').hidden = false;
      if (neu && alt != null) ton('bestwert');
    }, extra.verzoegerung != null ? extra.verzoegerung : 900);
  }

  // ---------- Prüfprotokoll (nur stil: 'protokoll') ----------
  // Humor-Figur am Rand. Angabe: Adresse eines freigestellten Bildes oder { bild, blick, hoehe } (leer = keine).
  // Start: links, kommt kurz ins Bild und bleibt dann am Rand; Ende: rechts (Querformat: rechte Spalte).
  // blick = wohin die Pose im Bild schaut ('links', 'rechts', 'frontal'); die Figur blickt immer zur Bildmitte (MZ,
  // 23.10.2026): steht sie links, schaut sie nach rechts, steht sie rechts, nach links – sonst wird sie waagerecht
  // gespiegelt (gespiegelte Kopie des Bildes, damit die Auftritts-Animation unverändert bleibt). Frontal: nie gespiegelt.
  // hoehe = Maßstab der Pose gegenüber den anderen (1 = volle Höhe), damit die Person in allen Posen gleich groß ist.
  function figurSetzen(welcher, angabe) {
    const f = $((welcher === 'ende' ? '#endSchirm' : '#startSchirm') + ' .figur');
    if (!f) return;
    const a = typeof angabe === 'string' ? { bild: angabe } : angabe || {};
    f.hidden = !a.bild;
    f.dataset.bild = a.bild || '';
    f.dataset.blick = a.blick || 'frontal';
    f.style.setProperty('--figur-f', a.hoehe || 1);
    if (a.bild) f.src = a.bild; else f.removeAttribute('src');
    figurAusrichten(f);
  }
  const spiegelBilder = new Map();
  function spiegelBild(adresse) {
    if (!spiegelBilder.has(adresse)) spiegelBilder.set(adresse, new Promise(ok => {
      const i = new Image();
      i.onload = () => {
        const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight;
        const x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(i, 0, 0);
        c.toBlob(b => ok(b ? URL.createObjectURL(b) : adresse), 'image/png');
      };
      i.onerror = () => ok(adresse);
      i.src = adresse;
    }));
    return spiegelBilder.get(adresse);
  }
  function figurAusrichten(f) {
    const bild = f.dataset.bild, blick = f.dataset.blick;
    if (!bild || f.hidden) return;
    const platz = f.parentNode, schirm = f.closest('.schirm');
    if (!platz || !schirm || schirm.hidden || !f.offsetWidth) return;   // wird beim Zeigen bzw. nach dem Laden nachgeholt
    const mitte = platz.getBoundingClientRect().left + f.offsetLeft + f.offsetWidth / 2;
    const seite = mitte < innerWidth / 2 ? 'links' : 'rechts';
    const spiegeln = blick !== 'frontal' && blick === seite;
    f.dataset.seite = seite;
    if (!spiegeln) { if (f.getAttribute('src') !== bild) f.src = bild; return; }
    spiegelBild(bild).then(u => { if (f.dataset.bild === bild && f.dataset.seite === seite && f.getAttribute('src') !== u) f.src = u; });
  }
  const alleFiguren = () => document.querySelectorAll('.schirm .figur');
  alleFiguren().forEach(f => f.addEventListener('load', () => figurAusrichten(f)));
  addEventListener('resize', () => alleFiguren().forEach(figurAusrichten));
  document.querySelectorAll('.schirm').forEach(s2 => new MutationObserver(() => { if (!s2.hidden) requestAnimationFrame(() => s2.querySelectorAll('.figur').forEach(figurAusrichten)); })
    .observe(s2, { attributes: true, attributeFilter: ['hidden'] }));
  // Endbild: Punkte groß mit „/1.000 Punkte“ klein dahinter, Bilanz-Zeilen (extra.felder = [[Bezeichnung, Wert], …]),
  // schräger Stempel (extra.stempel = { text: 'GEPRÜFT', art: 'gut' | 'mittel' | 'schlecht' }), Figur (extra.figur),
  // Hintergrund (extra.bild, sonst der des Startbilds), Kopfzeile „PRÜFERGEBNIS – <Spiel>“
  function protokollEnde(punkte, extra, neu, alt, wert, text, lz) {
    $('#endSchirm .spielname').textContent = texte.titel || '';
    if (!extra.bild && S.hintergrund) schirmBild('ende', S.hintergrund.bild, S.hintergrund.position);
    if (extra.wert == null) {
      wert.textContent = lz < 0 ? text : text.slice(0, lz);
      if (S.hoechst) { const e = document.createElement('small'); e.textContent = '/' + zahl(S.hoechst); wert.append(e); }
    }
    $('#endSchirm .vonzeile').textContent = extra.wert == null ? extra.zusatz || '' : '';
    const felder = $('#endSchirm .felder');
    felder.textContent = '';
    (extra.felder || []).forEach(([name, w]) => {
      const z = document.createElement('p'), n = document.createElement('span'), b = document.createElement('b');
      z.className = 'feld'; n.textContent = name; b.textContent = w;
      z.append(n, b); felder.append(z);
    });
    const st = $('#endSchirm .stempel');
    st.hidden = !extra.stempel;
    st.textContent = extra.stempel ? extra.stempel.text : '';
    st.className = 'stempel' + (extra.stempel ? ' ' + (extra.stempel.art || 'gut') : '');
    figurSetzen('ende', extra.figur || '');
  }

  // Auswertung im Endbild: eine Zeile je Runde mit Balken, die schwächste Runde rot.
  // a = { kopf: 'Deine Lücken', zeilen: [{ name, zusatz, anteil (0–1, null = nicht gespielt), wert, max, schlecht }] }
  function auswertung(a) {
    const box = $('#endSchirm .auswertung'), liste = box.querySelector('.zeilen');
    box.hidden = !(a && a.zeilen && a.zeilen.length);
    liste.textContent = '';
    if (box.hidden) return;
    box.querySelector('.kopf').textContent = a.kopf || '';
    const gespielt = a.zeilen.filter(z => z.anteil != null);
    const schwach = gespielt.length > 1 ? gespielt.reduce((m, z) => z.anteil < m.anteil ? z : m) : null;
    const el = (tag, klasse, text) => { const e = document.createElement(tag); if (klasse) e.className = klasse; if (text != null) e.textContent = text; return e; };
    a.zeilen.forEach(z => {
      const zeile = el('div', 'zeile' + (z.anteil == null ? ' offen' : '') + (z.schlecht || z === schwach ? ' schlecht' : ''));
      const name = el('span', 'name', z.name);
      if (z.zusatz) name.append(' ', el('small', '', z.zusatz));
      const balken = el('span', 'balken'), fuell = el('i');
      fuell.style.width = Math.round(Math.max(0, Math.min(1, z.anteil || 0)) * 100) + '%';
      balken.append(fuell);
      const wert = el('span', 'zahl', z.wert);
      if (z.max) wert.append(el('small', '', z.max));
      zeile.append(name, balken, wert);
      liste.append(zeile);
    });
  }

  $('#losKnopf').addEventListener('click', starten);
  let extraAktion = null;
  if ($('#extraKnopf')) $('#extraKnopf').addEventListener('click', () => { if (extraAktion) extraAktion(); starten(); });
  $('#nochmalKnopf').addEventListener('click', starten);

  function anzeige(links, rechts) {
    $('#anzeige .links').textContent = links;
    $('#anzeige .rechts').textContent = rechts;
    anzeigeEng();
  }
  // Zettel-Stil: Passen Spielstand und Punkte nicht in eine Zeile neben „⌂ Zum Menü“ und die Knöpfe, stehen sie
  // zweizeilig übereinander (Klasse eng). Geprüft wird mit dem längsten Punktestand („1.000 Punkte“), damit die
  // Kopfzeile nicht mitten im Spiel umspringt.
  function anzeigeEng() {
    if (!blatt) return;
    const a = $('#anzeige'), l = $('#anzeige .links'), r = $('#anzeige .rechts'), text = r.textContent;
    if (!l.textContent) { a.classList.remove('eng'); return; }
    a.classList.remove('eng');
    r.textContent = text.replace(/\d[\d.]*/, '1.000');
    const eng = l.scrollWidth > l.clientWidth + 1;
    r.textContent = text;
    a.classList.toggle('eng', eng);
  }
  addEventListener('resize', () => { if (zustand === 'spiel') anzeigeEng(); });

  // ---------- Größe ----------
  function groesse() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    B = innerWidth; H = innerHeight;
    feld.width = Math.round(B * dpr); feld.height = Math.round(H * dpr);
    S && S.groesse && S.groesse(B, H);
  }
  addEventListener('resize', groesse);

  // ---------- Eingabe ----------
  let finger = null;
  function punkt(e) { const r = feld.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  // Ein Druck, dessen Loslassen verloren ging (z. B. Maus außerhalb des Fensters losgelassen, Fenster verlor den Fokus),
  // darf die Eingabe nicht dauerhaft sperren (Fangstange, MZ 23.10.2026: „nicht klickbar“): kommt wieder ein Druck desselben
  // Zeigers oder ein neuer Hauptzeiger (Maus, erster Finger), gilt der alte als beendet. Ein zweiter Finger bleibt ohne
  // Wirkung wie bisher. Im Prüfprotokoll-Stil zählt bei der Maus nur die linke Taste (Rechtsklick ist dort kein Tipp);
  // die anderen Stile bleiben dabei wie bisher (Spieltest 23.10.2026).
  feld.addEventListener('pointerdown', e => {
    if (zustand !== 'spiel') return;
    if (protokoll && e.pointerType === 'mouse' && e.button !== 0) return;
    if (finger !== null && e.pointerId !== finger && !e.isPrimary) return;
    finger = e.pointerId;
    try { feld.setPointerCapture(e.pointerId); } catch (x) { /* egal */ }
    S.runter && S.runter(...punkt(e));
    e.preventDefault();
  });
  feld.addEventListener('pointermove', e => {
    if (e.pointerId !== finger || zustand !== 'spiel') return;
    S.bewegen && S.bewegen(...punkt(e));
  });
  function los(e) {
    if (e.pointerId !== finger) return;
    finger = null;
    if (zustand === 'spiel') S.hoch && S.hoch(...punkt(e));
  }
  feld.addEventListener('pointerup', los);
  feld.addEventListener('pointercancel', los);
  feld.addEventListener('lostpointercapture', e => { if (e.pointerId === finger) finger = null; });

  // ---------- Schleife ----------
  let zuletzt = performance.now();
  function bild(jetzt) {
    const dt = Math.min(0.05, (jetzt - zuletzt) / 1000);
    zuletzt = jetzt;
    if (zustand === 'spiel' && S.schritt) S.schritt(dt);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, B, H);
    S.zeichne(g, B, H, zustand, dt);
    requestAnimationFrame(bild);
  }

  // ---------- Schnittstelle für die Spiele ----------
  window.Rahmen = {
    kunde: K, farben, textFarbe, toenen, mitAlpha, umfaerben,
    zeichneLogo, get logoBereit() { return logoBereit; },
    ton, dauerton, vibrieren, ende, anzeige, schirmBild, bildFlaechen, zettel, protokoll,
    get musik() { return startMusikLaeuft ? { laeuft: true, pegel: +startMusikLaeuft.v.gain.value.toFixed(4) } : { laeuft: false }; },   // Testhilfe
    get zustand() { return zustand; },
    // Startbild neu aufbauen (z. B. nach Level-Wahl: anderer Bestwert-Schlüssel S.id, andere Texte)
    startbildAktualisieren(neueTexte) {
      if (neueTexte) texte = Object.assign({}, S.texte, neueTexte, K.texte);
      if (zustand === 'start') startSchirm();
    },
    // eigenes Element ins Startbild (Zettel bzw. Karte), vor die Bestwert-Tafel – z. B. Level-Wahl
    startElement(el) { const t = $('#startSchirm .besttafel'); t.parentNode.insertBefore(el, t); },
    spiel(def) {
      S = def;
      if (def.klaenge) klaenge(def.klaenge);
      if (def.startMusik) klaenge({ startmusik: def.startMusik });
      schleifeName = def.schleife || null;
      texte = Object.assign({}, def.texte, K.texte);
      // Seitentitel „Spielname – Zusatz“; titelZusatz z. B. Marke statt Firmenname (RSI: „RSI protect®“, MZ 24.10.2026)
      const zusatz = K.titelZusatz || K.firma;
      document.title = (texte.titel || 'Spiel') + (zusatz ? ' – ' + zusatz : '');
      groesse();
      S.neu && S.neu();
      startSchirm();
      bildpause($('#startSchirm'), 1500, true);
      startMusikAn();   // klappt nur, wenn der Browser Ton schon erlaubt; sonst beim ersten Tippen
      requestAnimationFrame(bild);
    },
  };
})();
