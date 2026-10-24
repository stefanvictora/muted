# Prüfprotokoll · 24. Oktober 2026

**Status: Prüfkandidat 0.1.1. Keine abschließende Freigabe.** Der Nutzer hat die manuelle Edge-Abnahme begonnen. Der in 0.1.0 gefundene Blocker ist in 0.1.1 korrigiert; der wiederholte Zustimmungstest mit bestehenden und neuen Seiten wurde inzwischen vom Nutzer als bestanden bestätigt. Weitere manuelle Prüfungen bleiben offen. Die Freigabekopien wurden nicht automatisch geändert.

## Manuelle Rückmeldungen und Korrektur 0.1.1

Vom Nutzer für Edge 0.1.0 bestätigt: Laden der entpackten Erweiterung, farbige Ausgangsseite, korrekter Host, eingeschalteter Hauptschalter, fehlender Seitenzugriff. Native Freigabe abgelehnt: Website blieb farbig, Fehl-/Zugriffsmeldung korrekt und keine optionalen Seitenfreigaben.

**Zustimmungstest fehlgeschlagen:** Nach Zustimmung weder vorhandene noch neue Seite grau; Popup blieb bei „Bitte warten“. Mehr als 30 offene Tabs; keine sichtbare Fehler-Schaltfläche. Dieser Befund ist ein Kernfehler und keine Darstellungsgrenze.

Reproduktion im isolierten Edge-Profil: normale Tabs funktionieren; eine langsam ladende Ressource ebenfalls. Genau ein per DevTools eingefrorener Tab erzeugt mit 0.1.0 den fehlenden Worker-Status (Timeout nach 2,5 Sekunden). Grund: Der komplette Tab-Abgleich blockierte die Zustandswarteschlange einschließlich Popup und Dokument-Handshakes.

0.1.1 trennt Tab-Abgleich und Zustandswarteschlange, begrenzt Tab-Wartezeiten, überspringt schlafende Tabs und prüft verspätete Aktivierungen gegen den aktuellen Zustand. Regressionen zuerst rot, anschließend grün. Nachprüfung mit eingefrorenem Tab: Edge-Status 79 ms, Chrome-Status 48 ms; bestehende/neue Seiten grau. Ausschalten, Aufwachen ohne alten Filter, Einschalten sowie Pause/Fortsetzen bestanden ebenfalls. Testmanifest hatte ausschließlich in der isolierten Diagnosekopie feste Hosts; damit ist die native Zustimmung im persönlichen Profil **nicht** abgenommen.

Aktueller automatisierter Stand: **27 Tests bestanden** (23 ursprüngliche plus vier Regressionen). Diagnosewerkzeug und Nachweise: `tools/browser-responsiveness-check.mjs`, `docs/evidence/responsiveness-9336-frozen.json`, `docs/evidence/responsiveness-9337-frozen.json`.

**Manuelle Nachprüfung in Edge 0.1.1 bestanden (Nutzerrückmeldung):** Nach dem Wechsel auf 0.1.1 und erneuter Freigabe werden sowohl die bereits geöffnete als auch die neu geöffnete Testseite grau. Das Popup zeigt „Grau aktiv“. Damit ist der zuvor fehlgeschlagene Zustimmungs-/Grundfunktionstest für Edge bestanden; dies ersetzt nicht die noch offenen Rechtewechsel-, Pausen- und Sonderfallprüfungen oder die Chrome-Abnahme.

**Darstellungsbeobachtung:** Der Nutzer sieht die Website zunächst kurz farbig, anschließend schnell grau. Keine Dauer gemessen. Der dokumentierte Dokument-Handshake fragt vor Aktivierung den aktuellen Worker-Zustand ab; eine vollkommen flackerfreie Darstellung wurde nicht zugesichert. Die Beobachtung wird festgehalten, ohne daraus weitere ungemessene Timing-Aussagen abzuleiten.

**Farbausnahmen in Edge 0.1.1 bestanden (Nutzerrückmeldung):** „Farbig lassen“ färbt die aktuelle Website ohne Neuladen zurück, der Popup-Status zeigt „Farbausnahme“, eine andere Website bleibt grau. Ein neuer Tab der ausgenommenen Website bleibt ebenfalls farbig. „Grau schalten“ macht beide bereits geöffneten Tabs wieder grau; die andere Website bleibt grau. Subdomain-Zuordnung wurde durch diesen Schritt noch nicht gesondert geprüft.

**Hauptschalter und manuelle Pausensteuerung in Edge 0.1.1 bestanden (Nutzerrückmeldung):** Ausschalten färbt bestehende und neue Testseiten zurück; nach Schließen und Öffnen des Popups bleibt der Schalter aus und der Status lautet „Ausgeschaltet“. Einschalten macht die Testseiten wieder grau. Eine 5-Minuten-Pause färbt bestehende und neue Seiten zurück und zeigt eine passende Endzeit. Der anschließende 15-Minuten-Klick ersetzt die Frist durch jetzt plus 15 Minuten. „Pause beenden“ stellt die Graustufen wieder her und entfernt den Pausenstatus. Tatsächlicher Fristablauf, 30-Minuten-Auswahl, Browserneustart und Standby sind damit noch nicht abgenommen. Nächster manueller Schritt: global → ausgewählt mit tatsächlichem Rechteabbau und ausdrücklicher enger Freigabe.

**Global → ausgewählt in Edge 0.1.1 bestanden (Nutzerrückmeldung):** Eine Website A wurde in „Graue Websites“ gespeichert. Nach dem Moduswechsel wurden A und B farbig; A blieb als Regel mit fehlendem Zugriff erhalten. Unter den tatsächlichen optionalen Freigaben waren keine Seitenfreigaben mehr vorhanden. Erst nach der gesonderten ausdrücklichen Freigabe wurde A grau, während B farbig blieb; dieses Verhalten galt auch für neue Tabs. Die angezeigten Freigaben waren auf die ausgewählte Domain beschränkt. Nächster manueller Schritt: ausgewählt → global mit Ablehnung und anschließender Zustimmung.

**Ausgewählt → global, bisherige Beobachtung in Edge 0.1.1:** Nach dem bewussten Klick auf „Modus übernehmen“ erschien laut Nutzer kein erneuter Freigabedialog. Der Screenshot zeigt den globalen Modus sowie `http://*/*` und `https://*/*` neben den engeren theverge.com-Freigaben. Das entspricht dokumentiertem Chromium-Verhalten: `permissions.remove()` entfernt aktive Rechte, aber nicht die erinnerte frühere Zustimmung; eine erneute Anforderung kann daher ohne Dialog erfolgreich sein. Die vorherige Testanweisung, einen zwingend erscheinenden Dialog abzulehnen, war falsch und wurde korrigiert. Quelle: https://developer.chrome.com/docs/extensions/reference/api/permissions (Step 5), https://chromium.googlesource.com/chromium/src/+/main/extensions/docs/permissions.md (Optional Permissions). Der Ablehnungsfall beim Moduswechsel ist damit weder fehlgeschlagen noch manuell bestanden; er benötigt einen Zustand ohne frühere globale Zustimmung. Noch zu bestätigen: beide Websites einschließlich neuer Tabs grau und ausgewählte Liste unverändert als aufbewahrt.

**Ausgewählt → global in Edge 0.1.1 funktional bestanden (Nutzerrückmeldung):** Beide Testwebsites werden nach dem bewussten Moduswechsel grau, auch in neuen Tabs. Die ausgewählte Domain bleibt in „Graue Websites“ erhalten; die Liste ist als „aufbewahrt“ markiert. Die erneute Rechteanforderung wurde vom Browser aufgrund früherer Zustimmung ohne zusätzlichen Dialog erfüllt. Der gesonderte Ablehnungsfall beim Moduswechsel bleibt weiterhin offen. Nächster manueller Schritt: 30-Minuten-Auswahl und selbstständiger Ablauf einer anschließend neu gestarteten 5-Minuten-Pause.

**Automatischer Pausenablauf in Edge 0.1.1 bestanden (Nutzerrückmeldung):** Die 30-Minuten-Auswahl zeigte eine passende Endzeit. Ein anschließender 5-Minuten-Klick verkürzte die Frist auf jetzt plus fünf Minuten. Bei geschlossenem Popup, geöffnetem Browser und wachem Rechner wurde die sichtbare Testseite nach Ablauf selbstständig wieder grau, ohne Neuladen oder erneutes Öffnen des Popups. Anschließend zeigte das Popup „Grau aktiv“ ohne laufende Pause. Ein tatsächlicher 30-Minuten-Ablauf wurde nicht abgewartet. Nächster manueller Schritt: ausgeschalteten Zustand und laufende Pausenfrist über ein Neuladen der Erweiterung prüfen; vollständiger Browserneustart und Standby bleiben davon getrennte Prüfungen.

**Neuladen der Erweiterung in Edge 0.1.1 bestanden (Nutzerrückmeldung):** Nach manuellem Ausschalten und Neuladen über die Erweiterungsverwaltung blieben Hauptschalter und Status ausgeschaltet sowie die Testseite farbig. Nach Einschalten, Start einer 5-Minuten-Pause und erneutem Neuladen blieb die Pause mit unveränderter ursprünglicher Endzeit erhalten. Vorzeitiges Beenden stellte die Graustufen wieder her. Dies bestätigt den Neustart der Erweiterung, nicht einen vollständigen Browser-/Windows-Neustart oder Standby. Nächster manueller Schritt: eine Pause während des Energiesparmodus ablaufen lassen und das Verhalten nach dem Aufwachen prüfen.

## Ursprüngliche Basisprüfung 0.1.0

## Tatsächlich verwendete Umgebung

- Windows, Node.js **24.22.1**.
- Google Chrome **156.0.8078.47**, Version über ausführbare Datei und laufendes DevTools-Protokoll ermittelt.
- Microsoft Edge **156.0.4314.42**, ebenso verifiziert.
- Eigene Testprofile unter `.test-artifacts/chrome-profile` und `.test-artifacts/edge-profile`, Betrieb ohne sichtbares Fenster.

## Automatisierte Prüfungen

`node --test`: **23 Tests bestanden**, keine übersprungenen Tests. Abgedeckt sind Domain-/IDN-/IP-Regeln, fehlerhafte Eingaben, Größenlimits, Zustand und Import, beide Modi, Rechteverlust, serialisierte Schaltfolgen, Pause und Uhränderung, Worker-Neustart, unterbrochener Rechteabbau, Ablehnung/Fehler, getrennte Listen, überlappende Rechte, Tab-Fehler, Navigation/Revisionen, Controller-Idempotenz, Frühstart und Deaktivierung, Absenderprüfung, synchroner Worker-Ereignisanschluss, unmittelbare Freigabeanforderung, Manifest-/Runtime-Audit sowie Hash-/Dateilistenprüfung gegen veränderte, fehlende und zusätzliche Dateien.

Die Browser-API-Doubles bestätigen die fachliche Koordination. Native Dialoge, echte dauerhafte Grants und reale Standby-/Browser-Lebenszyklen werden dadurch nicht abgenommen.

## Reale Chrome- und Edge-Prüfungen

In **beiden** oben genannten Versionen bestanden:

| Prüfung | Ergebnis |
|---|---|
| Entpacktes Manifest, Modul-Worker, strenge CSP, Options-UI laden | Bestanden |
| Anfangs keine Hostrechte und keine Filterregistrierung | Bestanden |
| Moduswahl und Hinzufügen über echte UI | Bestanden |
| Ungültiger Host zeigt sichtbaren Fehler | Bestanden |
| Echte Datei-Importvorschau verändert noch keinen Zustand | Bestanden |
| Bestätigter Import normalisiert und ersetzt Listen | Bestanden |
| Lokaler Blob-Export unter unveränderter CSP mit exaktem Feldumfang | Bestanden |
| Options-Kontext während beobachteter Aktionen ohne HTTP-/HTTPS-Requests | Bestanden, beschränkt auf diesen Kontext/Zeitraum |
| Options-Layout ohne horizontalen Überlauf; Chrome-Screenshot visuell kontrolliert | Bestanden |
| Toolbar-Aktion gibt temporären `activeTab`-Zugriff | Bestanden |
| Temporärer Zugriff gilt im Worker nicht als dauerhafte Seitenfreigabe | Bestanden |
| Echte isolierte Injektion von Controller und CSS in lokale Testseite | Bestanden |
| Doppelte Controller-Injektion, Überschreiben der Root-Klasse | Bestanden |
| Berechneter Filter `grayscale(1)`; Chrome-Screenshot visuell kontrolliert | Bestanden |
| Abschalten stellt ursprünglichen Seitenfilter wieder her, Beobachter bleibt aus | Bestanden |
| Exakte IPv4-/IPv6-Muster von Chrome-API akzeptiert | Bestanden in Chrome; Edge offen |

Die lokale Darstellungsfixture enthält Sticky-Inhalt und einen Cross-Origin-Frame. Eine vollständige visuelle Scroll-/Frame-/Vollbildabnahme wurde nicht behauptet. Der Render-Test ruft den Controller über temporären Testzugriff gezielt auf; er ersetzt nicht den vollständigen Freigabe-/Registrierungsablauf.

Maschinenlesbare Nachweise im Arbeitsordner: `.test-artifacts/chrome-report.json`, `edge-report.json`, `chrome-render-report.json`, `edge-render-report.json`; Screenshots `*-options.png`, `*-grayscale.png`. Diese Entwicklungsartefakte sind nicht Teil der Runtime.

## Offene manuelle Abnahme – Freigabebedingung

In **Edge und Chrome** mit dem gepackten Kandidaten durchführen und Ergebnisse ergänzen:

- [ ] Native Freigabe bewusst akzeptieren und ablehnen; keine Hosts vor Zustimmung. Der headless-Test löste eine wartende native Anfrage aus; deren Annahme/Ablehnung ist nicht abgenommen.
- [ ] Globaler Modus: neue und bestehende Seiten grau; Farbausnahmen einschließlich Subdomains; tatsächlicher Popup-Status stimmt.
- [ ] Global → ausgewählt mit echten breiten Grants: Filterbereinigung, vollständiger Rechteentzug, zweiter ausdrücklicher Klick, nur freigegebene Regeln aktiv.
- [ ] Ausgewählt → global; fehlgeschlagene Freigabe/Browserrichtlinie; UI zeigt keinen falschen Erfolg.
- [ ] Entfernen überlappender Regeln; externe Rechteänderung; Neuladehinweis bei unerreichbarem Controller.
- [ ] Ausschalten, 5/15/30-Minuten-Pause, vorzeitiges Ende auf vorhandenen und neuen Tabs.
- [ ] Browser schließen, Worker beenden, reale Pause über Standby und Aufwachen; Worker-DevTools dabei geschlossen.
- [ ] Reddit/old.reddit.com, YouTube einschließlich SPA und Vollbild; Scroll-/Sticky-Verhalten, Cross-Origin-Frame und Picture-in-Picture dokumentieren.
- [ ] Private Fenster, lokale Dateien, Browserseiten, Stores und eingebaute PDF-Ansichten bleiben außerhalb des zugesagten Umfangs.
- [ ] Echtes Action-Popup: Tastatur/Fokus/Screenreader, aktueller Host, bestätigte Darstellung; helles und dunkles Design.
- [ ] Export/Import zwischen beiden Browsern mit laufender Pause und ausgeschaltetem Hauptschalter; keine Übertragung von Pause/Rechten.
- [ ] Netzwerkprüfung sämtlicher Extension-Kontexte bei allen UI-Aktionen, getrennt vom normalen Seitenverkehr.
- [ ] Installierter Freigabedateisatz entspricht Hashliste; Update/Rollback am stabilen Pfad prüfen.

Ohne diese Nachweise bleibt das Archiv ein **Prüfkandidat**. Keine offenen Kernabläufe werden als bloße Darstellungsgrenze freigegeben.
