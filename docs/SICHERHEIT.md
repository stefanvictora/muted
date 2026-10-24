# Berechtigungen und Grenzen

Die Extension arbeitet lokal mit mitgelieferten JS-, HTML-, CSS- und PNG-Dateien. Sie enthält keinen
Updater, keine Remote-Konfiguration, keine Netzwerkfunktionen und keine externen Abhängigkeiten.
Die CSP erlaubt ausschließlich lokale Skripte und verbietet ausgehende Verbindungen eigener Kontexte.

## Gemeinsamer Seitenzugriff

Beide Modi benötigen einmalig die optionalen Hostrechte `http://*/*` und `https://*/*`.
Die Listen steuern die Filterwirkung, nicht die technische Zugriffsmöglichkeit. Auch im ausgewählten
Modus könnte entsprechend geänderter Extension-Code auf andere freigegebene Websites zugreifen.
Diese bewusst akzeptierte Vereinfachung ersetzt die frühere Verwaltung einzelner Domainfreigaben.

Feste API-Rechte sind `storage`, `scripting`, `activeTab` und `alarms`. Es gibt keine Cookie-,
Verlaufs-, Debugger- oder Downloadberechtigung. Freigaben können in der Browserverwaltung entzogen
werden. Ausschalten, Pause, Moduswechsel und Listenänderungen behalten die Browserfreigabe.

## Verarbeitung

Dauerhaft gespeichert werden nur Modus, Schalter, Listen, Pausenfrist und Schema/Revision.
Tab-IDs und aktuelle Adressen werden flüchtig für Filterentscheidungen genutzt; Seiteninhalte,
Formulardaten und Besuchsverlauf werden nicht gespeichert. Speicherzugriff ist auf vertrauenswürdige
Extension-Kontexte beschränkt. Zustandsänderungen akzeptiert der Worker nur aus eigenen Popup- und
Optionsseiten. Das Inhaltsskript darf lediglich nach seiner aktuellen Filterentscheidung fragen.

Der Filter läuft isoliert im Hauptdokument. Sein Beobachter überwacht nur die eigene Root-Klasse;
beim Frühstart wartet er begrenzt auf das Wurzelelement. Verspätete Aktivierungen prüfen nochmals
den aktuellen Zustand. Schlafende Tabs können keine unbegrenzte Warteschlange verursachen.

## Grenzen

Browseroberflächen, Stores, private Fenster, lokale Dateien und PDF-Ansichten sind ausgenommen.
Ein Root-CSS-Filter kann Seitenlayout und eigene Filter beeinflussen. Für Picture-in-Picture und
Video-Vollbild gibt es keine Zusicherung. Beim Laden kann die Seite kurz farbig erscheinen.
Pausen verwenden eine absolute Endzeit; Änderungen der Systemuhr beeinflussen ihre Restdauer.
Bei entzogenem Zugriff kann ein vorhandener Filter bis zum Neuladen der Seite sichtbar bleiben.

Eine andere Anwendung mit Schreibrechten kann die lokalen Dateien verändern. Hashlisten helfen
beim Dateivergleich, sind im selben beschreibbaren Ordner aber kein Manipulationsschutz.

Technische Referenzen: [Berechtigungen](https://developer.chrome.com/docs/extensions/reference/api/permissions),
[Scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting),
[Speicher](https://developer.chrome.com/docs/extensions/reference/api/storage),
[Alarme](https://developer.chrome.com/docs/extensions/reference/api/alarms).
