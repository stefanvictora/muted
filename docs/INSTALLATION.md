# Installation, Update und Rollback

## Status und Trennung der Ordner

Version 0.1.1 ist ein Prüfkandidat. Vor einer persönlichen Freigabe die offenen Punkte im [Prüfprotokoll](PRUEFPROTOKOLL.md) in beiden Browsern abschließen. Version 0.1.0 kann bei schlafenden Tabs hängen und soll nicht weiter abgenommen werden.

Arbeitsquellcode: `<repository-root>`.
Prüfpakete: `<repository-root>\releases`.
Vorgesehene spätere Installation: `<installation-folder>`.

Der Installationsordner wurde nicht angelegt oder verändert. Es gibt keine automatische Installation, keinen Watcher, keinen automatischen Pull und keinen Build in diesem Ordner. Die automatisierten Browserprüfungen verwenden ausschließlich getrennte Profile unter `.test-artifacts/`.

## Prüfen und lokal laden

1. ZIP in einen neuen Prüf-/Freigabeordner entpacken. Die Hashliste im Paket mit dem geprüften Original vergleichen. Mit `node tools/verify.mjs <entpackter-Paketordner>` können sämtliche Runtime-Dateien und zusätzliche Dateien geprüft werden. Node ist dafür ein Entwicklungswerkzeug; der Browser benötigt es nicht.
2. Für die Abnahme das enthaltene `extension`-Verzeichnis als entpackte Erweiterung laden. Erst nach abgeschlossener Freigabe dessen Inhalt bewusst in den stabilen Installationsordner kopieren. Direkt darin muss `manifest.json` liegen.
3. Edge: `edge://extensions`, Entwicklermodus einschalten, „Entpackte Erweiterung laden“, Ordner auswählen. Chrome: dasselbe unter `chrome://extensions`.
4. Symbol anheften, Popup öffnen. Andere Graustufen-Erweiterungen für die Abnahme deaktivieren, damit sich Filter nicht überlagern.
5. Zunächst ist „Einrichtung: Seitenzugriff fehlt“ zu erwarten. „Seitenzugriff bewusst freigeben“ fordert HTTP-/HTTPS-Zugriff an. Ablehnen bleibt möglich.
6. Alternativ in den Einstellungen zu „Nur ausgewählte Websites grau“ wechseln, Hostnamen eintragen und danach „Ausgewählte Websites freigeben“ klicken. Gespeicherte Regeln ohne Freigabe filtern nicht.

Eine Domain umfasst ihre Subdomains; `docs.google.com` wird niemals automatisch zu `google.com`. IP-Adressen und `localhost` gelten exakt. Bei einer übergeordneten Regel zeigt das Popup deren Namen und verweist für feinere Auswahl auf die Einstellungen.

## Bedienung und Fehlerbehebung

Der Hauptschalter bleibt nach Neustarts erhalten. Ausschalten löscht die Pause. Wiederholtes Pausieren startet die gewählte Dauer ab jetzt. Die absolute Endzeit bleibt bei Standby/Browserneustart gültig; eine verstellte Systemuhr ändert die verbleibende Zeit.

Beim Wechsel von global zu ausgewählt werden die Registrierung und vorhandene Filter bereinigt, anschließend optionale Hostrechte zurückgegeben. Die Listen bleiben erhalten. Verbleibende Regeln müssen danach ausdrücklich erneut freigegeben werden. Auch das Entfernen einer aktiven ausgewählten Regel bereinigt sämtliche Hostfreigaben, um überlappende Rechte sicher zu behandeln.

Bei „Rechtebereinigung ausstehend“: Einstellungen öffnen, tatsächliche Freigaben prüfen, „Seitenrechte bereinigen“ klicken. Der Übergang blockiert widersprechende Änderungen. Bei fehlgeschlagener Anwendung/Bereinigung betroffene Seiten neu laden. Bereits erzeugte isolierte Kontexte können bis zur Navigation existieren.

Bei beschädigtem oder unbekanntem Zustand gibt es keine neue Filterung und kein automatisches Zurücksetzen. Die Einstellungen bieten eine ausdrücklich beschriftete Reset-Aktion an. Sie löscht die Listen, schaltet aus, wählt den ausgewählten Modus und bereinigt Hostrechte. Vorher bei Bedarf den gespeicherten Zustand über Browser-DevTools sichern. Nach Reset betroffene Seiten neu laden. Bei fehlender API-Unterstützung zuerst den Browser aktualisieren.

## Import und Export

Export vor Änderungen als lokale Sicherung speichern. Importdatei wählen, Vorschau kontrollieren und vollständig übernehmen. Modus und beide Listen werden ersetzt; Hauptschalter und Pause bleiben unverändert. Ein globaler Import ohne Zugriff wartet in der Vorschau auf einen gesonderten Freigabeklick. Browserrechte kommen nie aus der Datei. Das Schließen der Einstellungsseite verwirft eine noch nicht übernommene Vorschau.

## Kontrolliertes Update

1. Änderungen, Abnahme und neue Hashliste prüfen; alte Dateien unverändert sichern und Einstellungen in jedem Browser exportieren.
2. Erweiterung in beiden Browsern deaktivieren.
3. Den installierten Dateisatz bewusst vollständig durch den geprüften neuen Satz ersetzen. Keine Altdateien stehen lassen; Pfad beibehalten.
4. In beiden Browsern neu laden/aktivieren. ID, Schema, Rechte und Einstellungen prüfen. Betroffene Tabs neu laden, damit alte Seitenkontexte verschwinden.

Eine bearbeitete lokale Datei kann bereits beim nächsten Öffnen einer Extension-Seite wirksam werden. Entscheidend ist die kontrollierte Dateiübernahme, nicht allein „Neu laden“.

## Rollback

Beide Installationen deaktivieren, gesicherten Dateisatz am gleichen Pfad wiederherstellen, Schemakompatibilität prüfen und gegebenenfalls den vorherigen Export importieren. Anschließend Erweiterungen und betroffene Tabs neu laden. Ein unbekanntes neueres Schema wird nicht still überschrieben. Vor Deinstallation exportieren; lokale Einstellungen können sonst verloren gehen.
