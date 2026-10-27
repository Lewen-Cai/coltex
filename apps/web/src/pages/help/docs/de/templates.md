# Vorlagen

## Neue Projekte aus Vorlagen

**Neues Projekt** zeigt eine Liste: die integrierten Vorlagen und die mit Ihnen geteilten. Ein Etikett an jeder sagt, woher sie kommt:

- **Integriert**: gehört zu ColTex.
- **Vom Systemadministrator geteilt**: für alle auf diesem Server.
- **Geteilt in** einem Gruppennamen: mit einer Gruppe geteilt, in der Sie sind.
- **Geteilt von** einem Namen: persönlich mit Ihnen geteilt.

Die Schaltflächen über der Liste (**Alle**, dann die Fachgebiete) zeigen die Vorlagen eines Fachgebiets. Sie sehen nur die Vorlagen, die mit Ihnen geteilt sind. Siehe auch [Erste Schritte](#/help/getting-started).

Das Suchfeld darunter findet Vorlagen nach Name oder Beschreibung.

## Ein Projekt als Vorlage veröffentlichen

Administratoren können ein eigenes Projekt als Vorlage veröffentlichen, etwa das Dissertationsformat einer Arbeitsgruppe:

1. Im Projektmenü (⋯) der Projektliste oder in den Projekteinstellungen **Als Vorlage veröffentlichen…** wählen.
2. Namen, Beschreibung und **Fachgebiet** (wo sie aufgeführt wird) angeben, unter **Geteilt mit** wählen, wer sie bekommt, und auf **Veröffentlichen** klicken.

Für wen sie sein kann:

- Ein Admin: die Gruppen, in denen er ist, und Personen, die er per Name oder E-Mail wählt.
- Der Systemadministrator: zusätzlich **Alle auf diesem Server**.
- Mitglieder können keine Vorlagen veröffentlichen; fragen Sie einen Administrator.

Gut zu wissen:

- Neue Projekte daraus bekommen die Dateien des Projekts so, wie sie **in diesem Moment** sind, seinen Compiler und seine Rechtschreibsprache; nicht seine Mitglieder, seinen Verlauf oder seine Kommentare.
- Die Vorlage folgt dem Projekt: Ändern Sie das Projekt, und spätere neue Projekte bekommen die Änderungen.
- Öffnen Sie **Als Vorlage veröffentlichen…** erneut, um Namen, Fachgebiet oder Empfänger zu ändern oder sie **Zurückziehen**. Der Systemadministrator kann außerdem jede Vorlage im Dialog für neue Projekte entfernen.
- Sie verschwindet, wenn das Projekt gelöscht wird.

## Die Vorlage einer Zeitschrift importieren

Viele Zeitschriften und Konferenzen veröffentlichen LaTeX-Vorlagen, die nicht in ColTex eingebaut sind: Ihre Lizenzen erlauben keine Weitergabe, oder sie gehören nicht zu TeX Live. Dazu gehören NeurIPS, ICML, ICLR, ACL, EMNLP, CVPR, ICCV, AAAI, IJCAI, USENIX, IEEE Access, Springer Nature (`sn-jnl`), PNAS, Science, Cell, eLife, PLOS, Frontiers, MDPI, BMC, Wiley, Taylor & Francis, SAGE, IOP, SIAM, Copernicus, AGU, Astronomy & Astrophysics. Laden Sie die offizielle Vorlage von der Website der Konferenz oder des Verlags herunter und importieren Sie sie als Vorlage:

1. Auf **Neues Projekt** klicken, dann auf **Vorlage importieren** (nur Administratoren).
2. Das Zip wählen, Namen, Beschreibung und **Fachgebiet** angeben, unter **Geteilt mit** wählen, wer sie bekommt, und auf **Importieren** klicken.

Gut zu wissen:

- Für wen sie sein kann, folgt den Regeln fürs Veröffentlichen (oben): Admins teilen mit ihren Gruppen und gewählten Personen, der Systemadministrator auch mit allen.
- Das Zip wird zu einem Projekt von Ihnen, als Vorlage veröffentlicht. Das Hauptdokument wird wie beim Importieren eines Projekts erkannt; Build-Dateien und Systemreste bleiben weg.
- Das ⋯-Menü der Vorlage hat **Projekt öffnen** (um ihre Dateien zu ändern), **Vorlage bearbeiten…** (um sie umzubenennen, die Empfänger zu ändern oder sie zurückzuziehen) und **Vorlage entfernen**.

## In eine Zeitschriftenvorlage umwandeln

**In Vorlage umwandeln…** im Menü eines Projekts (in den Projekteinstellungen: „In eine Zeitschriftenvorlage umwandeln“) schreibt ein Paper für eine andere Zeitschrift oder Konferenz um: IEEE Transactions, IEEE-Konferenz, ACM-Konferenz, ACM-Zeitschrift, Elsevier, Elsevier CAS, Oxford University Press (OUP), Springer LNCS, APS (REVTeX), AMS, APA 7, AAS (AASTeX), MNRAS, ACS oder einen einfachen Artikel. Jede eingebaute Vorlage lässt sich in jede davon umwandeln.

Die Liste ist dieselbe wie unter **Neues Projekt**. Eine eingebaute Vorlage wird nach den Regeln geschrieben, die ColTex für sie hat; jede andere Vorlage (eine geteilte, eines Ihrer Projekte mit **Eines meiner Projekte** oder das Zip einer Zeitschrift mit **Vorlage hochladen (.zip)**) wird auf ihre eigene Weise gefüllt: Titel, Autoren, Affiliationen, Abstract und Schlagwörter des Artikels kommen dorthin, wo die Vorlage ihre Beispiele hat, und der Beispieltext danach wird durch Ihren Artikel ersetzt. Die Klassen- und Stildateien der Vorlage kommen mit, und ihre Beispiel-Hauptdatei bleibt zum Nachschlagen im Projekt.

- Titel, Autoren, Affiliationen, Abstract, Pakete und Literaturverzeichnis werden in einem **neuen Projekt** neu aufgebaut, das anschließend kompiliert wird. Das Original bleibt unverändert.
- Paper in der `sn-jnl`-Vorlage von Springer Nature werden ebenfalls gelesen, ebenso solche von BMC, OUP und Elsevier CAS: Autoren mit Vor- und Nachnamen, Affiliationen, `\abstract{}` und strukturierte Abstracts, Schlüsselwörter und der Schlussteil mit den Erklärungen.
- Ein Bericht listet, was geändert wurde und was zu prüfen ist. Hat der Build Fehler oder der Bericht Warnungen, öffnet **Öffnen und mit KI beheben** das neue Projekt, und der KI-Agent folgt dem eingebauten Skill **template-conversion**: Er fragt zuerst, bei welcher Zeitschrift oder Konferenz Sie einreichen, sucht deren aktuelle Autorenrichtlinien, bringt den Artikel zum Kompilieren und passt ihn an die Richtlinien an, ohne den Inhalt zu ändern. Seine Änderungen warten auf Ihre Prüfung.
