# Squash Punkte

Großer Squash-Spielstand fürs Tablet (PWA, Deutsch, offline-fähig), gebaut wie Padel Punkte.

- PAR-Zählung bis 11, ab 10:10 zwei Punkte Abstand; 2 aus 3 oder 3 aus 5 Sätze (Standard 3 aus 5)
- Aufschlag-Anzeige mit Seite (rechts/links), Seitenwahl per ⇄, Münzwurf am Matchbeginn
- Zählen: Antippen, Tastatur/Bluetooth-Knopf (Tasten lernbar), Doppelklick = Punkt zurück, Rückgängig
- Stand bleibt beim Neuladen (localStorage), Bildschirm bleibt an, Vollbild per Knopf

Tests: `node ../squash-test/score.test.js`, `node ../squash-test/e2e.js` (Server auf 8801).
