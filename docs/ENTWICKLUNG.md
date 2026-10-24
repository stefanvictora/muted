# Entwicklung

## Aufbau

`core/` enthält Domainregeln, Zustandsschema, Nachrichtenvalidierung und die Filterentscheidung.
`services/coordinator.js` besitzt den geladenen Zustand und serialisiert Änderungen. Der Tab-Abgleich
läuft außerhalb dieser Warteschlange, damit ein schlafender Tab weder Popup noch neue Seiten blockiert.
`background.js` verbindet Browserereignisse mit dem Coordinator; `content/` wendet den Filter an.
Popup und Settings teilen sich kleine Helfer in `ui/`. Es gibt kein Framework und keinen Buildschritt.

## Wann Arbeit anfällt

| Anlass | Arbeit |
|---|---|
| Worker wird geweckt | Zustand und Vollzugriff einmal lesen; Alarm und Registrierung abgleichen |
| Registrierung unverändert | Keine erneute Registrierung und keine globale Tab-Suche |
| Registrierung neu/geändert oder Pause inzwischen abgelaufen | Bestehende Tabs abgleichen |
| Status / neues Dokument | Geladenen Zustand auswerten; abgelaufene Pause bei Bedarf nachholen |
| Tab lädt oder wacht auf | Nur diesen Tab abgleichen |
| Bekannter Tab wird aktiviert | Keine erneute Injektion bei bereits bestätigtem Zustand |
| Tab wird geschlossen | Flüchtigen Status entfernen |
| Einstellungen / Pause / Rechte ändern sich | Registrierung und offene Tabs abgleichen |
| Abgleich ist abgeschlossen | Offene Oberflächen benachrichtigen; kein regelmäßiges Polling |

Die globale Freigabe wird beim Worker-Start, bei Berechtigungsereignissen und nach einem expliziten
Freigabeklick geprüft. Einzelne Domainfreigaben werden nicht mehr verwaltet. Ein Feld aus alten
Rechteübergängen wird ausschließlich beim Lesen alter Einstellungen in die gewünschten Listen und
den Modus überführt; die neue Runtime erzeugt solche Übergänge nicht mehr.

Revisionen schützen vor verspäteten Antworten, auch über Worker-Neustarts hinweg. Tab-Operationen
haben eine Deadline und werden in Gruppen von höchstens vier ausgeführt. Bereits versandte
Aktivierungen prüfen beim tatsächlichen Ausführen nochmals den aktuellen Zustand. Bekannte
schlafende/entladene Tabs werden übersprungen. Rechteverlust oder nicht bestätigtes Entfernen
können einen Neuladehinweis auslösen.

## Prüfen

`npm test` führt die Verhaltenstests mit Node aus. Geprüft werden reine Logik, öffentliche
Worker-Befehle und Browserereignisse mit einem Browser-Doppel sowie der Controller an der DOM-Grenze.
Bei geändertem Verhalten zuerst einen passenden fehlschlagenden Test ergänzen. Bestehende Regressionen
behalten; Erwartungen an bewusst entfernte Rechteverwaltung wurden auf das neue Modell umgestellt.

Browserchecks nur bei passenden Änderungen, immer mit getrenntem Testprofil und lokalem Debug-Port:

- `node tools/browser-check.mjs <Port> <Name>`: Options-UI, echter Dateiimport und Export.
- `node tools/browser-render-check.mjs <Port> <Name>`: Controller/CSS mit temporärem activeTab-Zugriff.
- `node tools/browser-responsiveness-check.mjs <Port> --frozen`: schlafender Tab, Schalter/Pause,
  ausgewählter Modus mit Vollzugriff und UI-Benachrichtigungen.

Die ersten beiden nutzen die Extension aus `extension/`. Der letzte nutzt eine getrennte Testkopie
mit festen Hostrechten und ersetzt keinen nativen Zustimmungsdialog. Die Browser benötigen für diese
DevTools-Prüfungen `--enable-unsafe-extension-debugging`; nur eigens gestartete Testprofile verwenden
und nachher schließen. Ergebnisse liegen in `.test-artifacts/`.

Nach einer Änderung genügt eine kurze manuelle Kontrolle des betroffenen Ablaufs. Keine wiederholte
Vollabnahme beider Browser; Sonderfälle gezielt bei passenden Änderungen oder Fehlern prüfen.

## Optionale Pakete

`npm run package` führt Tests aus und erstellt einen neuen versionierten Ordner mit der Runtime,
kurzen Anleitungen und automatisch geprüfter Hashliste. `--zip` erzeugt zusätzlich ein Archiv.
Es erfolgt keine Installation. `node tools/verify.mjs <Paketordner>` bleibt als optionales
Vergleichswerkzeug verfügbar. Historische Prüfprotokolle werden nicht in neue Pakete kopiert.
