# Ownership-Ausbaustufe – Bestandsanalyse, Risiken, Konzept

## 1) Bestandsanalyse
- **Datenbasis Test/Ergebnis**: Einzel- und Partnerergebnisse liegen in `userResults`, `quizResults`, `jointResults` mit `categoryScores` und `stressCategories`.
- **Kategorien/Altersgruppen**: Kategorien sind in `types/quiz.ts` als `QuizCategory` modelliert, altersgruppenspezifisch über den Quizkatalog (`data/questionTemplates.ts`).
- **Ergebnislogik/UI**: Ergebnisseite im persönlichen Bereich läuft über `fetchDashboardBundle` und `ReviewResultsContent`.
- **Admin**: Es gibt Admin-Bereiche für Fragen, Texte, Logik. Kein bestehender Ownership-Vorlagenbereich.
- **i18n**: Projekt nutzt `LocalizedText` (`de/en/nl`) und `lib/i18n`.

## 2) Risiken
### Konzeptionell
- Empfehlung darf nicht wie Bewertung wirken.
- Unterschied zwischen Selbst-/Fremdwahrnehmung darf nicht allein dominieren.
- Ownership darf nicht in To-do-/Done-Logik kippen.

### Technisch
- Neue Datenstrukturen dürfen bestehende Flows nicht brechen.
- Realtime-Sync muss performant bleiben.
- Family-lokale Kopien dürfen globale Vorlagen nicht überschreiben.

## 3) Gewählte Verbesserungen
- **Relevanzberechnung** als Kombination aus Testbelastung + empfundener Belastung, mit Abweichung nur als Verstärker.
- **Lazy Initialization**: Ownership wird beim Start aus Empfehlungen/„alle Kategorien“ aufgebaut.
- **Template-Kopie**: globale `taskPackageTemplates` werden in `families/{familyId}/ownershipCards` kopiert.
- **UI-Logik**:
  - Ergebnisbereich zeigt max. 2 Startempfehlungen + Erklärung + Option „alle Kategorien“.
  - OwnershipDashboard: Kategorien und Karten mit Owner/Fokus, ohne Done-Logik.
  - Home: zeigt nur eigene Karten, erlaubt Bearbeiten, kein Neu/Löschen.

## 4) Umsetzungskern
- Neue Domain-Typen in `types/ownership.ts`.
- Neue Ownership-Services in `services/ownership.service.ts`.
- Erweiterung Dashboard-Bundle um `ageGroupForOwnership`.
- Neue Admin-Maske für Vorlagen von Verantwortlichkeiten.
- Firestore-Rules für Ownership-Subcollections und globale Vorlagen.

## 5) Offene Punkte
- Owner-Auswahl ist aktuell userId-basiert; eine explizite Rolle (`partner1/partner2`) kann als zusätzliche Abstraktion ergänzt werden.
- Für umfassende Regressionstests sollte ein Firestore-Emulator-Test-Setup ergänzt werden.
