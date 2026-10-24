# Local Grayscale

Persönliche, lokale Manifest-V3-Erweiterung für Microsoft Edge und Google Chrome. Deutsche Oberfläche, zwei getrennte Domain-Listen, Hauptschalter, globale Pause für 5/15/30 Minuten sowie lokaler JSON-Import und -Export. Keine Laufzeitabhängigkeiten, keine Fremdupdates, keine Netzwerkfunktionen.

**Version 0.1.1 – Prüfkandidat, noch keine abschließende Freigabe.** Behebt eine in der manuellen Edge-Abnahme gefundene Blockade durch schlafende Tabs. 27 automatisierte Tests bestehen. Die native Zustimmung muss mit dieser Version erneut geprüft werden; weitere manuelle Browserprüfungen sind offen: [Prüfprotokoll](docs/PRUEFPROTOKOLL.md).

## Einstieg

- [Installation, Updates und Rückweg](docs/INSTALLATION.md)
- [Berechtigungen und Sicherheitsgrenzen](docs/SICHERHEIT.md)
- [Architektur und Entwicklung](docs/ENTWICKLUNG.md)
- [Prüfprotokoll mit manueller Abnahmematrix](docs/PRUEFPROTOKOLL.md)
- [Vollständiger übergebener Plan](docs/ANFORDERUNGEN.txt)

Nur `extension/` ist installierbar. Entwicklung und Paketierung ändern niemals den vorgesehenen Installationsordner. Edge und Chrome speichern ihre Einstellungen unabhängig voneinander.

## Entwicklung

Node.js wird ausschließlich für Tests und Paketvorbereitung benötigt; keine Installation von npm-Paketen.

```powershell
node --test
node tools/package.mjs
```

Der zweite Befehl erzeugt einen neuen, versionierten Kandidaten unter `releases/`, eine ZIP-Datei und SHA-256-Listen. Er installiert nichts. Eine neue Paketierung überschreibt keinen bestehenden Kandidaten.

Startzustand: „Alles grau, außer …“, eingeschaltet, beide Listen leer, **ohne Seitenfreigabe**. Erst der bewusste Freigabeklick in der Oberfläche kann Hostrechte hinzufügen.
