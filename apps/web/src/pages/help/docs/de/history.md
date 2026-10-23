# Verlauf

**Verlauf** oben im Editor öffnet die Verlaufsansicht. Sie funktioniert wie ein git log: Jede Version hat eine kurze ID (etwa `a1b2c3d`), eine Beschreibung, den Zeitpunkt und wer sie erstellt hat.

- Versionen werden nach einer Bearbeitungspause automatisch erfasst, zusammen mit den Personen, die die Änderungen gemacht haben.
- **Version speichern** hält den aktuellen Stand sofort fest, mit Ihrer Beschreibung (wie eine Commit-Nachricht). Hat sich seit der letzten Version nichts geändert, wird die Beschreibung zu einer Markierung an dieser Version.
- Wählen Sie eine Version aus, um zu sehen, welche Dateien sie wie geändert hat, oder vergleichen Sie sie mit dem aktuellen Projekt.
- **Diese Änderungen zurücknehmen** macht nur rückgängig, was diese Version geändert hat, und behält alles, was seitdem geändert wurde (wie `git revert`). Wurde eine Datei seitdem auf eine Weise geändert, die damit kollidiert, wird nichts geändert und die Datei genannt.
- **Projekt wiederherstellen** setzt jede Datei auf den Stand dieser Version zurück; seitdem hinzugefügte Dateien werden entfernt. **Diese Datei wiederherstellen** tut das für eine einzelne Datei.
- Rücknahmen und Wiederherstellungen sind eigene Versionen („Nimmt a1b2c3d zurück“, „Zurück zu a1b2c3d“; ein Klick auf die ID führt zu dieser Version), daher lassen auch sie sich rückgängig machen.
- **Markierung hinzufügen** benennt eine Version (z. B. „Eingereicht“), damit Sie sie später wiederfinden.
- Die Dateien jeder Version lassen sich als .zip herunterladen.

> Eine Version wird außerdem gespeichert, bevor KI-Änderungen übernommen werden, sowie vor einem projektweiten Ersetzen, einem git push, einer Rücknahme und einer Wiederherstellung.
