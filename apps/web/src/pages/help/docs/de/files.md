# Dateien

## Der Dateibaum

- Die Schaltflächen in seiner Kopfzeile: neue Datei, neuer Ordner, hochladen und verknüpfte Datei hinzufügen.
- Ziehen Sie eine Datei auf einen Ordner, um sie zu verschieben; ein Doppelklick auf einen Namen benennt ihn um. Dateien, die Sie von Ihrem Computer hineinziehen, werden hochgeladen.
- Ein Rechtsklick auf eine Datei oder einen Ordner bietet Erstellen, Hochladen, Umbenennen und Löschen.
- Ein farbiger Punkt neben einer Datei bedeutet, dass jemand anderes sie geöffnet hat.

Gelöschte Dateien lassen sich aus dem Verlauf zurückholen.

## Verknüpfte Dateien

Eine verknüpfte Datei stammt von anderswo und lässt sich jederzeit aus ihrer Quelle aktualisieren:

- **Aus einem anderen Projekt**: eine beliebige Datei eines anderen Projekts oder dessen kompiliertes PDF (das vorher gebaut wird). Nützlich für gemeinsame Abbildungen oder eine gemeinsame `.bib` oder um das PDF eines Projekts als Abbildung in einem anderen zu verwenden.
- **Von einer URL**: von einer öffentlichen Adresse heruntergeladen (bis 50 MB). Adressen im lokalen oder privaten Netzwerk können nicht verwendet werden.

> Verknüpfte Dateien tragen im Baum ein Link-Symbol; fahren Sie mit der Maus darüber, um zu sehen, woher sie stammen. Rechtsklick und **Verknüpfte Datei aktualisieren** holt sie erneut und ersetzt sie. Zum Hinzufügen oder Aktualisieren brauchen Sie selbst Zugriff auf das Quellprojekt.

## Git

Jedes Projekt lässt sich mit git klonen, pullen und pushen:

1. Erstellen Sie unter **Einstellungen → Synchronisierung** ein Token für Git (es wird nur einmal angezeigt; bewahren Sie es auf). Ein **Schreibgeschützt**-Token kann klonen und pullen, aber nicht pushen.
2. Kopieren Sie die Klon-Adresse aus den Projekteinstellungen und führen Sie `git clone <address>` aus. Wenn git fragt, verwenden Sie einen beliebigen Benutzernamen und das Token als Passwort.
3. Committen Sie lokal und führen Sie `git push` aus: Die Änderungen landen sofort im Projekt, wo die Mitwirkenden sie sehen.

Gut zu wissen:

- Jedes Projekt hat einen Branch, `main`.
- Hat jemand das Projekt seit Ihrem letzten Pull geändert, lehnt git den Push ab: Zuerst `git pull`, dann erneut pushen.
- Bevor ein Push übernommen wird, wird der Stand des Projekts als Version gespeichert.
- Prüfer und Betrachter können nicht pushen.
- Damit Sie das Token nicht jedes Mal eingeben müssen: `git config --global credential.helper store` (oder `osxkeychain` auf einem Mac).
