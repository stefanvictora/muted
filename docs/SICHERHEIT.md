# Sicherheitsbeschreibung

## Umfang

Die Runtime besteht ausschließlich aus mitgelieferten JS-, HTML-, CSS- und PNG-Dateien in `extension/`. Sie enthält keinen Updater, keine `update_url`, keine Remote-Konfiguration, keine dynamische Codeauswertung und keine ausgehenden Netzwerkfunktionen. Entwicklungshilfen in `tools/` gehören nicht zur Runtime und werden nicht installiert.

Feste Rechte: `storage`, `scripting`, `activeTab`, `alarms`. Hostrechte für `http://*/*` und `https://*/*` sind optional. Kein `tabs`-, `cookies`-, `history`-, `downloads`-, `debugger`- oder `webRequest`-Recht. Keine Dateimuster, kein privater Modus, keine extern erreichbaren Ressourcen oder externen Nachrichten-Endpunkte.

Die CSP eigener Seiten und des Workers erlaubt nur lokale Scripts, Styles und Bilder. `connect-src 'none'`, `object-src 'none'`, `frame-src 'none'`, `base-uri 'none'`, `form-action 'none'`; keine Inline-Skripte oder externen Fonts. Blob-Export wurde ohne Aufweichen der CSP in Edge und Chrome geprüft.

## Daten und Rechte

`chrome.storage.local` wird vor der Initialisierung auf `TRUSTED_CONTEXTS` beschränkt. Gespeichert werden ausschließlich Schema/Revision, Schalter, Modus, zwei Domain-Listen, Pause und gegebenenfalls das Ziel einer unterbrochenen Rechtebereinigung. Browserrechte werden bei jeder Entscheidung neu aus der Browser-API ermittelt.

Tab-IDs, Hostnamen und aktuelle URLs werden nur flüchtig für Entscheidungen verarbeitet; keine Besuchshistorie oder Seiteninhalte werden gespeichert. Der Seitencode liest die aktuelle Dokumentadresse und den Dokumenttyp, steuert die eigene Root-Klasse und beobachtet ausschließlich deren `class`-Attribut. Beim Frühstart darf er kurz auf das direkte Wurzelelement warten. Keine Formulardaten-, Text- oder Inhaltsbeobachtung.

Nur die eigenen Top-Level-Popup-/Optionsseiten dürfen typisierte Zustandsänderungen senden. Sender-ID, exakter Pfad, Origin und Frame werden geprüft. Der separate Dokument-Handshake erlaubt ausschließlich eine Sollzustandsabfrage aus dem eigenen Top-Level-Content-Kontext. Nachrichten können keinen Code, Skriptpfad oder Funktionsnamen auswählen.

Alle Zustandsänderungen werden seriell verarbeitet. Der Abgleich offener Tabs läuft unabhängig davon mit begrenzten Batches und Wartezeiten, damit schlafende Tabs keine Popup- oder Dokumentantwort blockieren. Ergebnisse werden nur für die aktuelle dauerhaft gespeicherte Revision veröffentlicht. Bereits versandte Aktivierungen prüfen beim tatsächlichen Ausführen erneut den Worker-Zustand. Seitencontroller prüfen zusätzlich ihre aktuelle Adresse. Registrierungen laufen in `ISOLATED`, ausschließlich im Top-Level-Dokument; kein `MAIN`, `allFrames`, `about:`- oder `data:`-Fallback.

Ein Rechteübergang wird vor Seiteneffekten gespeichert. Bei Fehler bleibt der Filter deaktiviert und die UI zeigt verbleibenden Zugriff. Der Rechteabbau betrifft nur optionale Host-Origin-Grants, keine festen API-Rechte. Ausschalten und Pausen behalten erteilte Rechte; Farbausnahmen reduzieren nicht die Browserberechtigung.

## Grenzen

Breite Hostrechte sind technisch mächtig. Der sichtbare Filter ist keine Begrenzung dieser Rechte. Eine lokal schreibberechtigte andere Anwendung kann Dateien verändern. Hashlisten im selben beschreibbaren Ordner sind ein Vergleichswerkzeug, kein fälschungssicherer Schutz.

Bei externem Rechteentzug kann eine bereits injizierte Wirkung bis zum Neuladen verbleiben. Ein CSS-Filter am Wurzelelement kann eigene Seitenfilter überdecken sowie Stacking-, Fixed- und Sticky-Verhalten verändern. Browseroberflächen, Stores, private Fenster, lokale Dateien und PDF-Ansichten sind nicht unterstützt. Picture-in-Picture und YouTube-Vollbild sind nicht freigegeben; eine schmale Top-Level-`:fullscreen`-Regel ist enthalten und noch manuell zu prüfen.

Die Erstfreigabe, Browserstart, Wiederanlauf und Dokument-Handshake können sichtbare Verzögerungen verursachen. Es gibt kein Versprechen vollständig flackerfreier Darstellung. CSP schützt eigene Kontexte; sie ist keine globale Firewall für besuchte Seiten.

## Technische Primärquellen

- [Dynamische Skripte und CSS-Injektion](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [Optionale Berechtigungen](https://developer.chrome.com/docs/extensions/reference/api/permissions)
- [Lokaler Speicher und Zugriffsebenen](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Temporärer activeTab-Zugriff](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Alarme und Wiederanlauf](https://developer.chrome.com/docs/extensions/reference/api/alarms)
- [CSP eigener Extension-Kontexte](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy)
- [Hostmuster](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)
