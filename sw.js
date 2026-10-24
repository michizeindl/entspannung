// Service Worker der Sammlung „entSPANNUNG“ (wie „Akten & Action“): macht die Sammlung auf Android als App installierbar
// und hält die zuletzt geladenen Dateien für den Fall ohne Netz bereit.
// Strategie „zuerst Netz“: jede Anfrage geht ans Netz (neue Veröffentlichungen kommen sofort an); nur wenn das Netz fehlt,
// antwortet die Kopie aus dem Zwischenspeicher. Nur eigene Dateien, keine fremden Server, kein Tracking.
// Bei Änderungen an dieser Datei VERSION erhöhen – alte Zwischenspeicher dieser Sammlung werden dann gelöscht.
const PREFIX = 'entspannung-';
const VERSION = PREFIX + 'v38';   // v2: Schrift, v3: Blitzkugel, v4: Blitzkugel-Gewitter ohne Regen, v5: Dach-Check, v6: Dach-Check übersehene Mängel 3s, v7: Prüfplakette (23.10.2026) v8: Startseite Ruhe-Animationen, Wortmarke, Bereichssummen; Dach-Check neue Objekte (24.10.2026) v9: Sicherungskasten freigeschaltet (24.10.2026) v10: Kopf quer, Punkte lila Kreise, Summen bündig (24.10.2026) v11: Kopf quer – Punkte mittig, Ton rechts, Höhe wie vorher (24.10.2026) v12: Ton-Knopf blau, Wortmarke quer passt vor die Mitte (24.10.2026) v13: Messwert freigeschaltet, Standfläche Geräte (24.10.2026) v14: Punktzahlen vierstellig (24.10.2026) v15: Seitentitel „entSPANNUNG – RSI protect®“ (24.10.2026) v16: Spieltitel „Spielname – RSI protect®“ (24.10.2026) v17: „Deine RSI protect® Punkte“ (24.10.2026) v18: „RSI protect® Points“ (24.10.2026) v19: Steinturm freigeschaltet (24.10.2026) v20: Steinturm v2 (24.10.2026) v21: Siegerfeier (24.10.2026) v22: Zen-Garten freigeschaltet, Steinturm v3 (24.10.2026) v23: Atemkreis freigeschaltet – alle 9 Spiele (24.10.2026) v24: Spielstand einheitlich „2/10“ (24.10.2026) v25: Zen-Garten v2, Entenschwarm (24.10.2026) v26: Zen-Garten v3, Atemkreis v2 (24.10.2026) v27: geschützte Leerzeichen vor – (QA S1, 24.10.2026) v28: Atemkreis Ruhe-Punkte + Atem-Texte, Messwert-Hinweis (24.10.2026) v29: fünf Korrekturen + Zeit Sicherungskasten (24.10.2026) v30: Atemkreis ab 550 „Einfach entspannen“ (24.10.2026) v31: Reihenfolge Steinturm, Atemkreis, Zen-Garten (24.10.2026) v32: Elektro-Reihenfolge Besichtigen–Messen–Erproben (24.10.2026) v33: Dach-Check Fundtexte 2,8s (24.10.2026) v34: „Zu langer Stromausfall“ (24.10.2026) v35: Sammelauftrag Rückmeldungen, Sicherungskasten hell→dunkel, FI-Hinweis (24.10.2026) v36: Restliste (13 Punkte), Manifest-id (24.10.2026) v37: Kopf Hochformat Vorschlag 6 (24.10.2026) v38: Kopf hoch – Zahl und Ton-Knopf mittig zur Punkte-Anzeige (24.10.2026)

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(namen => Promise.all(namen.filter(n => n.startsWith(PREFIX) && n !== VERSION).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const anfrage = e.request;
  if (anfrage.method !== 'GET' || new URL(anfrage.url).origin !== self.location.origin) return;
  e.respondWith(fetch(anfrage).then(antwort => {
    // nur vollständige eigene Antworten merken (keine Teilantworten von Musik/Klängen, keine Fehlerseiten)
    if (antwort.status === 200 && antwort.type === 'basic' && !anfrage.headers.has('range')) {
      const kopie = antwort.clone();
      e.waitUntil(caches.open(VERSION).then(c => c.put(anfrage, kopie)).catch(() => {}));
    }
    return antwort;
  }).catch(() => caches.open(VERSION).then(c => c.match(anfrage)).then(treffer => treffer || Response.error())));
});
