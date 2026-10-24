# Local Grayscale

Persönliche lokale Graustufen-Erweiterung für Edge und Chrome, Version 0.2.0.
Keine Laufzeitabhängigkeiten, Netzwerkfunktionen oder automatischen Fremdupdates.

- Alle Websites mit Farbausnahmen oder nur ausgewählte Websites.
- Hauptschalter und Pause für 5, 15 oder 30 Minuten.
- Getrennte Domainlisten mit Subdomains sowie lokaler JSON-Import/-Export.
- Einmaliger Zugriff auf alle HTTP-/HTTPS-Websites für beide Modi. Die Listen bestimmen, wo der Filter aktiv ist; sie begrenzen nicht die Browserrechte.

## Benutzen und aktualisieren

Den Ordner `extension` als entpackte Erweiterung laden. Bei Änderungen in der
Erweiterungsverwaltung „Neu laden“ und bei Bedarf betroffene Seiten neu laden.
Dafür ist keine neue Paketierung oder Versionsnummer pro Versuch nötig.
Andere geladene Kopien deaktivieren.

[Installation und Bedienung](docs/INSTALLATION.md) · [Berechtigungen und Grenzen](docs/SICHERHEIT.md)

## Entwickeln

Node.js wird nur für Tests und optionale Sicherungspakete benötigt. Keine npm-Abhängigkeiten.

```powershell
npm test
npm run package             # Optionaler versionierter Ordner unter releases/
npm run package -- --zip    # Zusätzlich ZIP und Prüfsumme
```

Pakete überschreiben weder ältere Pakete noch die aktive Installation. Für persönliche Nutzung
reicht nach Änderungen ein kurzer Check des betroffenen Ablaufs; eine vollständige manuelle
Abnahmematrix ist nicht erforderlich.

[Entwicklung](docs/ENTWICKLUNG.md) · [Aktueller Prüfstand](docs/PRUEFPROTOKOLL.md)
