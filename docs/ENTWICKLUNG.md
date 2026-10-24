# Entwicklung

## Modulgrenzen

`core/` enthält pure Domain-, Schema-, Nachrichten- und Policy-Funktionen. `services/coordinator.js` ist die zentrale serialisierte Schreibinstanz. Browserzugriffe sind in State-, Permissions-, Pause- und Filter-Diensten gebündelt. `background.js` registriert Ereignislistener synchron und delegiert an den Coordinator. Die UI fordert Rechte unmittelbar im Klickhandler an und sendet danach typisierte Befehle; der Worker prüft die tatsächlichen Grants erneut.

Seit 0.1.1 wartet der Abgleich vorhandener Tabs außerhalb der Zustandswarteschlange. Ein gemeinsamer Verarbeitungslauf übernimmt jeweils den neuesten angeforderten Stand. Popup-Status und Dokument-Handshakes bleiben dadurch während wartender Renderer-Operationen erreichbar. Ergebnisse werden nur für die aktuelle Revision veröffentlicht. Pro Tab gilt eine Deadline von einer Sekunde; die Timer begrenzen API-Wartezeiten, sie steuern keine Pause. Bereits versandte Browseroperationen sind nicht abbrechbar: Nach einer Deadline werden keine weiteren Schritte dieses Vorgangs gestartet. Ein schon versandter Aktivierungsaufruf holt beim tatsächlichen Ausführen eine neue Worker-Entscheidung ein. Schlafende/entladene Tabs werden übersprungen und beim Aktivieren bzw. Aufwachen erneut abgeglichen.

`content/controller.js` ist eine idempotente klassische IIFE in der isolierten Welt. `content/start.js` fragt den Worker vor der ersten Aktivierung nach dem aktuellen Sollzustand. Dadurch kann auch ein zuvor registriertes Skript keine alte Einstellung eigenständig reaktivieren. Dynamische Registrierungen starten bei `document_start`, sind nicht über Browsersitzungen persistent und werden bei jedem Worker-Start erneut abgeglichen. Die zusätzliche Abfrage kann einen kurzen Farbblitz verursachen.

Ein aktiver Controller setzt genau eine eigene Root-Klasse. CSS ist an diese Klasse gebunden. Beim Deaktivieren werden Beobachter zuerst gestoppt; imperative CSS-Kopien werden mit denselben Dateien und derselben Herkunft entfernt. Ein fehlgeschlagenes oder veraltetes Ergebnis wird nicht als bestätigter Erfolg dargestellt.

Die Revision wird auch beim Abgleich erhöht: Browser-Rechteänderungen können außerhalb gespeicherter UI-Einstellungen entstehen. Diese Speicherung sperrt verspätete Content-Antworten auch nach Worker-Neustarts aus.

## TDD-Nachweis

Die Testgrenzen stammen aus dem übergebenen Plan: öffentliche reine Logik, öffentliche Worker-Befehle/Ereignisse mit Doubles nur für Browser und Uhr sowie Controller-Verhalten an einer minimalen DOM-Grenze.

Die Umsetzung erfolgte in Rot-Grün-Schritten: Domainnamen → Hostvalidierung → Importschema → Policy/Registrierung → Initialisierung und Schalter → Absenderprüfung → Pause → wiederanlaufender Rechteabbau → Listen/Import → bestehende Tabs → Controller/Frühstart → Dokument-Handshake → fehlerhaftes Schema → Worker-Ereignisse → unmittelbare Freigabeaktion → Paketgrenzen. Die jeweiligen Tests wurden vor Implementierung ausgeführt und scheiterten zunächst. Spätere Regressionen ergänzen Rechteverlust, Bestätigung der Bereinigung und eigene Optionsseiten als Browser-Tabs.

Das Browser-Doppel ersetzt ausschließlich `chrome.*`; interne Runtime-Module werden nicht gemockt. DOM-Tests ersetzen die Browser-DOM-Grenze. Reale Browserchecks ergänzen diese Tests und haben einen Fehler in der anfänglich zu strengen Senderprüfung aufgedeckt; dafür wurde zuerst ein reproduzierender Regressionstest angelegt.

```powershell
node --test
node tools/icons.mjs       # Nur bei bewusster Neugenerierung der lokalen Icons
node tools/package.mjs    # Neuer Kandidat; keine Installation
node tools/verify.mjs <Paketordner>
```

## Reale Browserchecks reproduzieren

`tools/browser-check.mjs <Port> <Name>` prüft Laden, UI, Import/Export und Requests des Options-Kontexts. `tools/browser-render-check.mjs <Port> <Name>` prüft echte isolierte Injektion und CSS über temporären `activeTab`-Zugriff. Beide Werkzeuge verwenden nur lokale Browser-/Testserver-Verbindungen. Sie gehören nicht in die Runtime.

Nur ein **separates, leeres Testprofil** mit lokalem Debug-Port verwenden. Die Browserchecks deinstallieren und laden ausschließlich die aus dem aktuellen `extension`-Ordner stammende Testextension neu; Testeinstellungen werden dabei verworfen. Niemals einen Debug-Port eines normalen Benutzerprofils übergeben. Die dokumentierte DevTools-Erweiterungsschnittstelle benötigt den Teststartschalter `--enable-unsafe-extension-debugging`. Diese Einstellung gilt nur für den eigens gestarteten Testprozess und ist keine Runtime-Anforderung. Testbrowser danach schließen.

Die UI-Prüfungen ohne sichtbares Fenster ersetzen keine Abnahme nativer Berechtigungsdialoge. Der Render-Test nutzt temporären Testzugriff und beweist nicht den vollständigen automatischen Betrieb mit dauerhaften Grants. Vollständige manuelle Matrix siehe Prüfprotokoll.

`node tools/browser-responsiveness-check.mjs <Port> --frozen` reproduziert die Blockade aus 0.1.0 und prüft die Korrektur in 0.1.1. Es erzeugt ausschließlich unter `.test-artifacts/responsiveness-fixture/` eine Testkopie mit festen Hostrechten. Damit wird der automatische Runtime-Pfad ohne nativen Freigabedialog geprüft. Diese geänderte Testkopie wird niemals paketiert oder in einem persönlichen Profil installiert. Ein lokaler Tab wird per DevTools eingefroren; Statusantwort, neue/bestehende Seiten, Ausschalten, Aufwachen und Pause werden geprüft. Ohne Flag läuft der Vergleich mit normalen Tabs, mit `--stalled` mit einer langsam ladenden Ressource. Die Produktions-Runtime behält ausschließlich optionale Hosts.
