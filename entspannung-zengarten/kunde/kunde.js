// Kundendaten – nur diese Datei und das Logo ändern sich pro Kunde.
// Fehlt ein Eintrag, nimmt das Spiel den Standard.
window.KUNDE = {
  firma: 'RSI Blitzschutzsysteme GmbH',
  titelZusatz: 'RSI protect®',   // Seitentitel „Spielname – RSI protect®“ (MZ 24.10.2026); Footer/Adresse bleiben mit Firmierung

  // Logo „RSI protect“ (grau/gelb, durchsichtiger Grund) – im Start-/Endbild auf weißem Schild
  logo: 'kunde/logo.png',
  logoAufHell: 'kunde/logo.png',

  // Farben als Hex-Code: haupt = Gelb (Linie im Protokoll), dunkel = Hintergrund/Schrift, titel = Spielname und Bewertung
  // (Grau des Logos), knopf = Hauptknopf (Blau der Website, nur als Akzent, MZ 23.10.2026)
  farben: { haupt: '#FFD500', akzent: '#FFD500', dunkel: '#191919', hell: '#ffffff', titel: '#575757', knopf: '#0F9CD8' },

  // Texte überschreiben (alle optional): titel, untertitel, anleitung, ende, endeTitel
  texte: {},

  // Start- und Endbild im Stil „Prüfprotokoll“ (MZ, 23.10.2026; eigener Look der Sammlung „entSPANNUNG“)
  stil: 'protokoll',

  // Startseite mit allen Spielen (Haus-Knopf oben links und Knopf im Start-/Endbild); weglassen, wenn das Spiel allein läuft
  startseite: '../',

  // Knopf am Ende (ohne link wird er nicht gezeigt; Vorlage MZ: nur „Nochmal spielen“ und „Zum Menü“)
  knopf: {},
};
