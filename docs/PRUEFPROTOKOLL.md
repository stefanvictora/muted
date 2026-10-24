# Prüfstand 0.2.0 · 24. Oktober 2026

Für die persönliche Nutzung gibt es keine verpflichtende vollständige Abnahmematrix mehr.
Nach Änderungen genügt ein kurzer Check des betroffenen Ablaufs. Der frühere ausführliche Verlauf
bleibt im Arbeitsordner unter PRUEFPROTOKOLL-0.1.x.md als Historie erhalten; seine Freigabebedingungen
und das frühere Modell einzelner Domainfreigaben gelten nicht mehr. ANFORDERUNGEN.txt ist ebenfalls
der ursprüngliche Plan und wird durch die später vereinbarten Vereinfachungen ergänzt.

## Automatisiert

Node-Tests decken Domainregeln, Import/Export, beide Modi mit gemeinsamem Zugriff, Übernahme alter
Einstellungen, Pausen, Senderprüfung, Rechteverlust, Controller und Paketintegrität ab.
Neue Verhaltenstests wurden zuerst fehlschlagend ausgeführt und anschließend implementiert.

Zusätzliche Prüfungen der Hintergrundarbeit:

- Status und Dokumententscheidungen erzeugen nach Initialisierung keine Speicher-, Berechtigungs-,
  Registrierungs-, Alarm- oder Tab-Abfragen, solange keine Pause abgelaufen ist.
- Tab-Ereignisse bearbeiten nur den betroffenen Tab. Ein bestätigter Tab wird beim Aktivieren nicht
  erneut injiziert. Schließen entfernt seinen Status. Einzelne Tab-Fehler bleiben
  im Popup; Icon und Tooltip zeigen weiterhin Ein/Aus/Pause. Fehlende Rechte und
  grundlegende Fehler behalten das Ausrufezeichen (automatisiert geprüft).
- Ein Worker-Neustart mit unveränderter Registrierung durchsucht keine Tabs; eine neue Registrierung
  erreicht dagegen bereits geöffnete Seiten.
- Oberflächen werden nach abgeschlossenen Abgleichen benachrichtigt. Statuslesen löst keine weiteren
  Änderungsnachrichten aus.
- Regressionen gegen blockierende schlafende Tabs und verspätete Aktivierungen bleiben erhalten.

## Reale Browser

In isolierten Testprofilen von Edge 156.0.4314.42 und Chrome 156.0.8078.47 bestanden:

- Manifest, Worker, Options-UI, Moduswahl und Domainvalidierung.
- Echter Dateiimport mit Vorschau sowie Blob-Export unter unveränderter CSP.
- Kein externer Request im beobachteten Options-Kontext.
- Reaktionsfähiger Status bei eingefrorenem Tab; bestehende und neue Websites werden grau.
- Ausschalten, Aufwachen ohne alten Filter, Einschalten, Pause und Fortsetzen.
- Ausgewählter Modus filtert nur passende Hosts trotz Vollzugriff. Entfernen behält die Freigabe.
- Settings zeigen nur die passende Liste und keinen Rechteverwaltungsblock.
- Popup übernimmt Änderungen aus einem anderen Fenster per Nachricht; im ruhenden Prüfintervall
  wurden keine regelmäßigen Statusabfragen ausgelöst.

Die Filterprüfungen verwenden eine isolierte Testkopie mit festen Hostrechten; sie ersetzen keinen
nativen Freigabedialog. Der bestehende unmittelbare Freigabeklick ist automatisiert gegen Zustimmung
und Ablehnung geprüft, aber der native Dialog wurde für 0.2.0 nicht erneut manuell durchgeführt.
Die normale Browserinstallation des Nutzers wurde nicht per Tool bedient.

Nachweise liegen unter .test-artifacts/: edge-simplification-report.json,
chrome-simplification-report.json, responsiveness-9346-frozen.json und
responsiveness-9347-frozen.json. Die Edge-Optionsansicht wurde zusätzlich als Screenshot kontrolliert.

Standby, Video-Vollbild, Picture-in-Picture und umfassende Screenreader-Prüfungen wurden in dieser
Änderung nicht erneut durchgeführt. Daraus entstehen keine zusätzlichen Pflichtschritte für den Nutzer.
