# Installation und Bedienung

## Laden und aktualisieren

1. In Edge `edge://extensions`, in Chrome `chrome://extensions` öffnen und den Entwicklermodus einschalten.
2. „Entpackte Erweiterung laden“ wählen und `<repository-root>\extension` auswählen. Bei einem Sicherungspaket dessen Unterordner `extension` verwenden.
3. Andere Kopien deaktivieren, Symbol anheften und im Popup einmal „Zugriff erlauben“ klicken.

Ist dieser Ordner bereits geladen, genügt nach Änderungen „Neu laden“ in der Erweiterungsverwaltung.
Offene Popups/Einstellungen neu öffnen und bei Bedarf Websites neu laden, damit ältere Seitenskripte
ersetzt werden. Lokale Dateiänderungen können bereits beim erneuten Öffnen der Oberfläche wirksam sein.
Edge und Chrome speichern Einstellungen unabhängig voneinander.

## Bedienung

- **Alle Websites mit Ausnahmen:** Die Liste „Farbig lassen“ enthält die Ausnahmen.
- **Nur ausgewählte Websites:** Die Liste „Grau schalten“ enthält die zu filternden Websites.
- Die jeweils andere Liste bleibt gespeichert. Beide Modi verwenden denselben Vollzugriff.
- Der Hauptschalter bleibt gespeichert. Ausschalten beendet eine laufende Pause.
- Eine neue Pause ersetzt die bisherige Frist durch jetzt plus 5, 15 oder 30 Minuten.
  „Pause beenden“ stellt den normalen Betrieb sofort wieder her.
- Domains umfassen Subdomains. IP-Adressen und localhost gelten exakt.
- Import/Export überträgt Modus und Listen. Schalter, Pause und Browserfreigabe werden nicht importiert.
  Ein Import hat eine Vorschau und wird erst mit „Importieren“ übernommen.

## Bestehende Einstellungen

Beim Update von 0.1.x bleiben Listen, Hauptschalter und Pausen erhalten. Auch alte JSON-Exporte sind
weiter verwendbar. Wer bisher nur einzelne Websites freigegeben hatte, muss einmal den gemeinsamen
Zugriff erlauben. Eine bereits bestehende globale Freigabe wird weiterverwendet.

## Falls etwas nicht stimmt

Bei fehlendem Zugriff erscheint der Freigabeknopf. Browserrechte lassen sich weiterhin in der
Erweiterungsverwaltung entziehen. Bei einem Neuladehinweis die betroffene Website neu laden.
Beschädigte Einstellungen können ausdrücklich zurückgesetzt werden; das löscht beide Listen und
schaltet den Filter aus, behält aber die Browserfreigabe.

Vor größeren Änderungen genügt eine Kopie des funktionierenden Extension-Ordners und optional ein
JSON-Export. Für den Rückweg die alte Kopie am gleichen geladenen Pfad wiederherstellen und die
Erweiterung sowie betroffene Websites neu laden. Vor einer Deinstallation Einstellungen exportieren.
Eine manuelle Hashprüfung oder vollständige Browser-Abnahme ist für die persönliche Nutzung keine Pflicht.
