// Kundendaten für die Startseite der Sammlung „entSPANNUNG“ (RSI protect, MZ 23.10.2026).
window.KUNDE = {
  firma: 'RSI Blitzschutzsysteme GmbH',
  titelZusatz: 'RSI protect®',   // Seitentitel „Spielname – RSI protect®“ (MZ 24.10.2026); Footer/Adresse bleiben mit Firmierung
  // Logo „RSI protect“ (grau mit gelben Schrägbalken) – nur auf weißen Flächen (Logo-Balken, Schild)
  logo: 'kunde/logo.png',
  logoAufHell: 'kunde/logo.png',
  // haupt = Gelb (Hauptfarbe), grau = Logo/Icons, dunkel = Schrift, hell = Hellgrau (Entspannung).
  // Blau und Lila nur als Akzent für Knöpfe (MZ, 23.10.2026): knopf = ▶ der Spielzeilen, ton = Ton-Knopf
  farben: { haupt: '#FFD500', grau: '#575757', dunkel: '#191919', hell: '#f2f2f2', knopf: '#0F9CD8', ton: '#951B81' },
  texte: { titel: 'entSPANNUNG' },
  // Ansprache auf der Website: Du
  anrede: 'du',
  web: 'https://www.rsi-protect.de/',
  // Band unten: Adresse in einer Zeile, darunter Impressum und Datenschutz
  adresse: ['RSI Blitzschutzsysteme GmbH', 'Odenwaldstraße 2, 64646 Heppenheim', '06252-68908-0'],
  rechtliches: [
    { text: 'Impressum', link: 'https://www.rsi-protect.de/impressum/' },
    { text: 'Datenschutz', link: 'https://www.rsi-protect.de/datenschutz/' },
  ],
};
